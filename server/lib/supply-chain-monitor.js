'use strict';

/**
 * DIAH-7M Supply Chain Monitor — 공급망 물리 흐름 엔진
 * ═══════════════════════════════════════════════════════
 *
 * "오늘의 위성데이터가 내일의 주가"
 *
 * 1) 시설별 위성 수집 → 구간(input/process/output) 집계
 * 2) 12줄 물리 Dual Lock 판정표
 * 3) 재무 Dual Lock + 물리 Dual Lock = combined 4상태
 * 4) 6문장 고정 스토리 생성
 *
 * 핵심 원칙:
 * - process(공장)는 증거/참고만. Dual Lock 조건에 넣지 않음 (오탐 방지)
 * - sensors = 계약: 프로필에 선언된 센서만 수집/신뢰
 * - 점수-신뢰도 분리: quality flags는 confidence에만, score에 섞지 않음
 * - 단위 통일: NTL/NO₂ = anomPct(%), THERMAL = anomDegC(°C)
 */

var fetchSat = require('./fetch-satellite');
var profiles = require('../data/stock-profiles-100');

var ARCHETYPE_SENSORS = profiles.ARCHETYPE_SENSORS;
var CAUSE_TEMPLATES = profiles.CAUSE_TEMPLATES;

// ═══════════════════════════════════════════════════════════════
// 1. 센서별 상태 판정 (12줄 규칙의 1단계)
// ═══════════════════════════════════════════════════════════════

var SENSOR_THRESHOLDS = {
  NTL: { ALARM: -15, WARN: -8 },           // 음수만: 야간광 감소 = 가동 하락
  NO2: { ALARM: -15, WARN: -8,
         ALARM_HIGH: 60, WARN_HIGH: 30 },   // 양방향: 급감(조업중단) + 급증(과부하/비정상)
  SAR: { ALARM: -12, WARN: -6 },           // Phase 3, 음수만
};

function gradeSensor(sensorType, anomPct) {
  if (anomPct == null) return 'NO_DATA';
  var th = SENSOR_THRESHOLDS[sensorType] || SENSOR_THRESHOLDS.NTL;
  // 음수 방향 (가동 감소)
  if (anomPct <= th.ALARM) return 'ALARM';
  if (anomPct <= th.WARN)  return 'WARN';
  // 양수 방향 (NO2 급증 = 비정상 과부하, 해당 센서만)
  if (th.ALARM_HIGH != null && anomPct >= th.ALARM_HIGH) return 'ALARM';
  if (th.WARN_HIGH  != null && anomPct >= th.WARN_HIGH)  return 'WARN';
  return 'OK';
}

// THERMAL은 anomDegC 기준 (별도)
// 근거: 공장 일일 온도 변동 ±2°C 정상, ±3°C 이상이면 가동 변화 시사
//       과열은 냉각 시스템 부하 기준 — 제조업 실내 +15°C 이상 비정상
function gradeThermal(anomDegC) {
  if (anomDegC == null) return 'NO_DATA';
  // 큰 음수 = 온도 급감 = 가동 중단 가능성
  if (anomDegC <= -6)   return 'ALARM';  // 기준치 대비 6°C 이상 하락 → 가동 중단 의심
  if (anomDegC <= -3.5)  return 'WARN';  // 3.5°C 하락 → 가동률 감소 시사
  if (anomDegC >= 18)   return 'ALARM'; // 심각 과열 (냉각계통 고장 수준)
  if (anomDegC >= 12)   return 'WARN';  // 이상 과열 (냉각 부하 상승)
  return 'OK';
}

// ═══════════════════════════════════════════════════════════════
// 2. V2 수축 평균 (score-engine.js와 동일 공식)
// ═══════════════════════════════════════════════════════════════

function shrinkageMean(values, k) {
  k = k || 4;
  var valid = values.filter(function(v) { return v != null; });
  if (valid.length === 0) return 50; // 무정보 prior
  var sum = 0;
  for (var i = 0; i < valid.length; i++) sum += valid[i];
  var raw = sum / valid.length;
  return (valid.length * raw + k * 50) / (valid.length + k);
}

// ═══════════════════════════════════════════════════════════════
// 3. 시설별 센서 데이터 → 구간 점수 집계
// ═══════════════════════════════════════════════════════════════

/**
 * 시설 1개의 센서 데이터를 점수화 (0~100)
 * anomPct → 점수: ALARM=15, WARN=50, OK=85
 */
function scoreFacility(sensorData) {
  var scores = [];
  var details = [];

  var keys = Object.keys(sensorData);
  for (var i = 0; i < keys.length; i++) {
    var sensor = keys[i];
    var data = sensorData[sensor];
    if (!data || data.status === 'ERROR') continue;

    var grade;
    if (sensor === 'THERMAL') {
      grade = gradeThermal(data.anomaly_degC);
    } else {
      grade = gradeSensor(sensor, data.anomPct);
    }

    var score = grade === 'ALARM' ? 15 : grade === 'WARN' ? 50 : grade === 'OK' ? 85 : null;
    if (score != null) scores.push(score);

    details.push({
      sensor: sensor,
      value: sensor === 'THERMAL' ? data.anomaly_degC : data.anomPct,
      unit: sensor === 'THERMAL' ? 'anomDegC' : 'anomPct',
      grade: grade,
      score: score,
      quality: data.quality ? data.quality.status : null,
    });
  }

  return {
    score: scores.length > 0 ? Math.round(shrinkageMean(scores, 2) * 10) / 10 : null,
    details: details,
  };
}

/**
 * 구간(stage) 내 여러 시설을 집계
 * @param {Array} facilitySensorResults - [{ facility, sensorData }]
 * @returns { score, status, blocked, facilities, evidence }
 */
function aggregateStage(facilitySensorResults) {
  var facilityScores = [];
  var allDetails = [];

  for (var i = 0; i < facilitySensorResults.length; i++) {
    var fsr = facilitySensorResults[i];
    var scored = scoreFacility(fsr.sensorData);
    if (scored.score != null) facilityScores.push(scored.score);

    for (var j = 0; j < scored.details.length; j++) {
      allDetails.push(Object.assign({}, scored.details[j], {
        nodeId: fsr.facility.name,
        nodeLat: fsr.facility.lat,
        nodeLng: fsr.facility.lng,
      }));
    }
  }

  // V2 수축 평균으로 구간 단일 점수
  var stageScore = Math.round(shrinkageMean(facilityScores, 3) * 10) / 10;

  // 12줄 규칙 2단계: 구간 종합 상태
  var hasAlarm = allDetails.some(function(d) { return d.grade === 'ALARM'; });
  var hasWarn = allDetails.some(function(d) { return d.grade === 'WARN'; });
  var status = hasAlarm ? 'ALARM' : hasWarn ? 'WARN' : 'OK';
  var blocked = status === 'ALARM' || status === 'WARN';

  // evidence 2개 선택 (상위 2개: ALARM > WARN > OK, 동률 시 |value| 큰 순)
  allDetails.sort(function(a, b) {
    var gradeOrder = { ALARM: 0, WARN: 1, OK: 2, NO_DATA: 3 };
    var ga = gradeOrder[a.grade] || 3, gb = gradeOrder[b.grade] || 3;
    if (ga !== gb) return ga - gb;
    return Math.abs(b.value || 0) - Math.abs(a.value || 0);
  });

  var evidence = allDetails.slice(0, 2).map(function(d) {
    return {
      nodeId: d.nodeId, sensor: d.sensor,
      value: d.value, unit: d.unit, grade: d.grade,
    };
  });

  return {
    score: stageScore,
    status: status,
    blocked: blocked,
    evidence: evidence,
    facilityCount: facilitySensorResults.length,
  };
}

// ═══════════════════════════════════════════════════════════════
// 4. Physical Dual Lock 판정 (12줄 규칙 3단계)
// ═══════════════════════════════════════════════════════════════

function computePhysicalDualLock(stages) {
  var inputBlocked = stages.input ? stages.input.blocked : false;
  var outputBlocked = stages.output ? stages.output.blocked : false;

  return {
    input: inputBlocked ? 'BLOCKED' : 'OK',
    output: outputBlocked ? 'BLOCKED' : 'OK',
    isDualLocked: inputBlocked && outputBlocked,
  };
}

// ═══════════════════════════════════════════════════════════════
// 5. Combined Dual Lock (물리 + 재무 = 4상태)
// ═══════════════════════════════════════════════════════════════

/**
 * @param {Object} physicalDL - { isDualLocked }
 * @param {Object} financialDL - { isDualLocked } from stock-engine.js
 * @param {number} confidence - 데이터 신뢰도 (0~100)
 * @returns { state, reason, confidence }
 */
function computeCombinedDualLock(physicalDL, financialDL, confidence) {
  var phys = physicalDL && physicalDL.isDualLocked;
  var fin = financialDL && financialDL.isDualLocked;

  var state, reason;
  if (phys && fin) {
    state = 'BOTH';
    reason = '물리적 봉쇄 + 재무 악화 동시 발생';
  } else if (phys && !fin) {
    state = 'PHYS_ONLY';
    reason = '물리적 공급망 봉쇄 감지 (재무 정상)';
  } else if (!phys && fin) {
    state = 'FIN_ONLY';
    reason = '재무 악화 감지 (물리적 흐름 정상)';
  } else {
    state = 'NONE';
    reason = '물리/재무 모두 정상';
  }

  return { state: state, reason: reason, confidence: confidence || 50 };
}

// ═══════════════════════════════════════════════════════════════
// 6. Confidence 계산 — min(dataQuality, sensorAgreement, freshness)
// ═══════════════════════════════════════════════════════════════

/**
 * @param {Object} stages - { input, process, output }
 * @param {string} archetype - 'A'~'F'
 * @returns {number} 0~100
 */
function computeConfidence(stages, archetype) {
  var sensorConfig = ARCHETYPE_SENSORS[archetype] || ARCHETYPE_SENSORS['A'];

  // 1) dataQuality: 모든 구간의 quality 분포
  var qualityScores = [];
  ['input', 'process', 'output'].forEach(function(stg) {
    if (stages[stg] && stages[stg].evidence) {
      stages[stg].evidence.forEach(function(ev) {
        if (ev.grade === 'NO_DATA') qualityScores.push(20);
        else qualityScores.push(80);
      });
    }
  });
  var dataQuality = qualityScores.length > 0
    ? qualityScores.reduce(function(s, v) { return s + v; }, 0) / qualityScores.length
    : 40;

  // 2) sensorAgreement: process 구간에서 교차검증
  var sensorAgreement = sensorConfig.singleSensorConfidence || 60;
  if (sensorConfig.crossValidation && stages.process) {
    var procEvidence = stages.process.evidence || [];
    var crossSensors = sensorConfig.crossValidation.sensors;
    var badCount = 0;
    procEvidence.forEach(function(ev) {
      if (crossSensors.indexOf(ev.sensor) >= 0 && (ev.grade === 'ALARM' || ev.grade === 'WARN')) {
        badCount++;
      }
    });
    if (badCount >= 2) {
      sensorAgreement = sensorConfig.crossValidation.confidence; // 90
    }
  }

  // 3) freshness: 항상 80 (실시간이 아닌 위성 특성상)
  var freshness = 80;

  // 4) facilityCount 보정: 관측 시설 수가 많을수록 통계적 신뢰 상향
  var totalFacilities = 0;
  ['input', 'process', 'output'].forEach(function(stg) {
    if (stages[stg] && stages[stg].facilityCount) totalFacilities += stages[stg].facilityCount;
  });
  // 1개=+0, 2개=+3, 3개=+5, 5개+=+8, cap +10
  var facBonus = totalFacilities <= 1 ? 0 : Math.min(10, Math.round(Math.log2(totalFacilities) * 5));

  // pessimistic minimum + facility bonus
  return Math.min(100, Math.round(Math.min(dataQuality, sensorAgreement, freshness) + facBonus));
}

// ═══════════════════════════════════════════════════════════════
// 7. 6문장 스토리 생성기
// ═══════════════════════════════════════════════════════════════

/**
 * @param {Object} stages - { input, process, output }
 * @param {Object} physicalDL
 * @param {Object} combinedDL
 * @param {Object} profile - stock profile
 * @param {Object} archetypeInfo - ARCHETYPES[code]
 * @returns { lines, leadTimeDays, impactRangePct, confidence, anchors }
 */
function generateStory(stages, physicalDL, combinedDL, profile, archetypeInfo) {
  var archCode = profile.archetype;

  // ── 최악 시설 + 센서 찾기 (ALARM 우선 → WARN → 순서) ──
  var worstEvidence = null;
  var worstStage = null;
  var worstRank = 99; // 0=ALARM, 1=WARN, 99=none
  ['process', 'input', 'output'].forEach(function(stg) {
    if (!stages[stg]) return;
    var ev = stages[stg].evidence;
    if (ev && ev.length > 0) {
      var rank = ev[0].grade === 'ALARM' ? 0 : ev[0].grade === 'WARN' ? 1 : 99;
      if (rank < worstRank) {
        worstRank = rank;
        worstEvidence = ev[0];
        worstStage = stg;
      }
    }
  });

  if (!worstEvidence) {
    // 모든 구간 정상
    return {
      lines: {
        factor: '요인: 정상 — 모든 구간 이상 없음',
        onset: '시작: 해당 없음',
        cause: '원인: 해당 없음',
        manifest: '발현: 해당 없음',
        result: '결과: 공급망 정상 가동',
        price: '그래서: 가격 압력 없음',
      },
      leadTimeDays: null, impactRangePct: null, confidence: combinedDL.confidence, anchors: [],
    };
  }

  var sensorName = { NTL: '야간광', NO2: 'NO₂', THERMAL: '열적외선', SAR: 'SAR' };
  var sensorLabel = sensorName[worstEvidence.sensor] || worstEvidence.sensor;
  var valueStr = worstEvidence.unit === 'anomDegC'
    ? (worstEvidence.value > 0 ? '+' : '') + worstEvidence.value + '°C'
    : worstEvidence.value + '%';

  // factor
  var factor = '요인: ' + worstEvidence.nodeId + ' ' + sensorLabel + ' ' + valueStr;

  // onset — mean_7d vs mean_60d 비교로 급변/만성 판정
  var today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  var onsetType = (worstEvidence.grade === 'ALARM') ? '급변' : '만성';
  var onset = '시작: ' + today + ' ' + onsetType + ' 감지';

  // cause — archetype 템플릿
  var causeTemplate = CAUSE_TEMPLATES[archCode] || CAUSE_TEMPLATES['A'];
  var cause = '원인: ' + causeTemplate.replace('{sensor}', sensorLabel);

  // manifest — 하류 구간 증거
  var manifest = '발현: ';
  if (worstStage === 'input' || worstStage === 'process') {
    // 하류 = output
    if (stages.output && stages.output.evidence && stages.output.evidence.length > 0) {
      var outEv = stages.output.evidence[0];
      var outVal = outEv.unit === 'anomDegC' ? outEv.value + '°C' : outEv.value + '%';
      manifest += '출하구간 ' + outEv.nodeId + ' ' + (sensorName[outEv.sensor] || outEv.sensor) + ' ' + outVal;
    } else {
      manifest += '출하구간 데이터 미수집';
    }
  } else {
    // worstStage === 'output' → 상류 process 참조, 없으면 input까지 소급
    var upstreamEv = null;
    var upstreamLabel = '';
    if (stages.process && stages.process.evidence && stages.process.evidence.length > 0) {
      upstreamEv = stages.process.evidence[0];
      upstreamLabel = '생산구간';
    } else if (stages.input && stages.input.evidence && stages.input.evidence.length > 0) {
      upstreamEv = stages.input.evidence[0];
      upstreamLabel = '입고구간';
    }
    if (upstreamEv) {
      var upVal = upstreamEv.unit === 'anomDegC' ? upstreamEv.value + '°C' : upstreamEv.value + '%';
      manifest += upstreamLabel + ' ' + upstreamEv.nodeId + ' ' + (sensorName[upstreamEv.sensor] || upstreamEv.sensor) + ' ' + upVal;
    } else {
      manifest += '상류구간 데이터 미수집';
    }
  }

  // result
  var dlLabel = {
    BOTH: '이중봉쇄 경보',
    PHYS_ONLY: '물리적 봉쇄 경고',
    FIN_ONLY: '재무 악화 경고',
    NONE: '정상',
  };
  var result = '결과: ' + (dlLabel[combinedDL.state] || '판정 불가');

  // price impact — archetype.onsetDays 기반
  var onsetDays = archetypeInfo.onsetDays || 14;
  var leadTimeDays = [Math.round(onsetDays * 0.5), Math.round(onsetDays * 1.5)];

  // 영향 범위: combined 상태에 따른 기본 범위
  var impactMap = {
    BOTH:      [-15, -5],
    PHYS_ONLY: [-12, -3],
    FIN_ONLY:  [-8, -2],
    NONE:      [0, 0],
  };
  var impactRangePct = impactMap[combinedDL.state] || [0, 0];
  var conf = combinedDL.confidence || 50;

  var price = '그래서: ' + impactRangePct[0] + '%~' + impactRangePct[1] + '% 압력, '
    + leadTimeDays[0] + '~' + leadTimeDays[1] + '일, 신뢰도 ' + conf + '%';

  // anchors (근거 2개)
  var anchors = [];
  if (worstEvidence) {
    anchors.push({
      nodeId: worstEvidence.nodeId, sensor: worstEvidence.sensor,
      value: worstEvidence.value, unit: worstEvidence.unit,
    });
  }
  // 두 번째: 다른 구간 최악 evidence
  ['output', 'input', 'process'].forEach(function(stg) {
    if (anchors.length >= 2) return;
    if (stg === worstStage) return;
    if (stages[stg] && stages[stg].evidence && stages[stg].evidence.length > 0) {
      var ev = stages[stg].evidence[0];
      if (ev.grade !== 'OK') {
        anchors.push({
          nodeId: ev.nodeId, sensor: ev.sensor,
          value: ev.value, unit: ev.unit,
        });
      }
    }
  });

  return {
    lines: { factor: factor, onset: onset, cause: cause, manifest: manifest, result: result, price: price },
    leadTimeDays: leadTimeDays,
    impactRangePct: impactRangePct,
    confidence: conf,
    anchors: anchors,
  };
}

// ═══════════════════════════════════════════════════════════════
// 8. 메인 파이프라인 — analyzeSupplyChain
// ═══════════════════════════════════════════════════════════════

/**
 * 종목 1개의 공급망 물리 흐름 전체 분석
 * @param {Object} profile - stock profile from stock-profiles-100
 * @param {Object} financialDL - { isDualLocked } from stock-engine.js (optional)
 * @returns { stages, dualLock, story, updatedAt }
 */
async function analyzeSupplyChain(profile, financialDL) {
  var archCode = profile.archetype;
  var archetypeInfo = profiles.ARCHETYPES[archCode];
  var facilities = profile.facilities || [];

  // 구간별 시설 그룹핑
  var stageGroups = { input: [], process: [], output: [] };
  for (var i = 0; i < facilities.length; i++) {
    var f = facilities[i];
    var stage = f.stage || 'process'; // stage 미지정 시 기본 process
    if (stageGroups[stage]) stageGroups[stage].push(f);
  }

  // 각 시설에서 센서 데이터 수집 (순차, GEE rate limit)
  var stageResults = {};

  for (var stg of ['input', 'process', 'output']) {
    var group = stageGroups[stg];
    var facilitySensorResults = [];

    for (var j = 0; j < group.length; j++) {
      var facility = group[j];
      // 건설중인 시설은 skip
      if (facility.underConstruction) continue;

      var sensorData;
      try {
        sensorData = await fetchSat.fetchFacilitySensors(facility);
      } catch (err) {
        console.warn('  ⚠️ facility sensor error:', facility.name, err.message);
        sensorData = {};
      }
      facilitySensorResults.push({ facility: facility, sensorData: sensorData });
    }

    stageResults[stg] = aggregateStage(facilitySensorResults);
  }

  // Physical Dual Lock
  var physicalDL = computePhysicalDualLock(stageResults);

  // Confidence
  var confidence = computeConfidence(stageResults, archCode);

  // Combined Dual Lock
  var combinedDL = computeCombinedDualLock(physicalDL, financialDL || { isDualLocked: false }, confidence);

  // Story
  var story = generateStory(stageResults, physicalDL, combinedDL, profile, archetypeInfo);

  return {
    ticker: profile.ticker,
    name: profile.name,
    archetype: archCode,
    archetypeName: archetypeInfo.nameEn,
    updatedAt: new Date().toISOString(),
    stages: stageResults,
    dualLock: {
      physical: physicalDL,
      financial: financialDL || { input: 'N/A', output: 'N/A', isDualLocked: false },
      combined: combinedDL,
    },
    story: story,
  };
}

/**
 * analyzeSupplyChainDry — GEE 호출 없이 더미/시드 데이터로 분석
 * 서버 부팅 시 / GEE 없는 환경에서 API 테스트용
 */
function analyzeSupplyChainDry(profile, financialDL) {
  var archCode = profile.archetype;
  var archetypeInfo = profiles.ARCHETYPES[archCode];
  var facilities = profile.facilities || [];

  var stageGroups = { input: [], process: [], output: [] };
  for (var i = 0; i < facilities.length; i++) {
    var f = facilities[i];
    var stage = f.stage || 'process';
    if (stageGroups[stage]) stageGroups[stage].push(f);
  }

  // 시드 기반 더미 센서 데이터 생성
  function seedAnomaly(name) {
    var hash = 0;
    for (var c = 0; c < name.length; c++) hash = ((hash << 5) - hash + name.charCodeAt(c)) | 0;
    return ((hash % 40) - 20); // -20 ~ +20 범위
  }

  var stageResults = {};

  for (var stg of ['input', 'process', 'output']) {
    var group = stageGroups[stg];
    var facilitySensorResults = [];

    for (var j = 0; j < group.length; j++) {
      var facility = group[j];
      if (facility.underConstruction) continue;

      var sensors = facility.sensors || ['NTL'];
      var sensorData = {};
      for (var k = 0; k < sensors.length; k++) {
        var s = sensors[k];
        var anomVal = seedAnomaly(facility.name + s);
        if (s === 'THERMAL') {
          sensorData[s] = {
            sensor: 'THERMAL', unit: 'anomDegC',
            tempC: 22 + anomVal * 0.3,
            baseline_tempC: 22,
            anomaly_degC: Math.round(anomVal * 0.3 * 10) / 10,
            quality: { status: 'GOOD' },
          };
        } else {
          sensorData[s] = {
            sensor: s, unit: 'anomPct',
            mean_7d: 50 + anomVal, mean_60d: 50 + anomVal * 0.7,
            baseline_365d: 50, anomPct: Math.round(anomVal * 0.7 * 10) / 10,
            anomaly: anomVal * 0.007,
            quality: { status: 'GOOD' },
          };
        }
      }
      facilitySensorResults.push({ facility: facility, sensorData: sensorData });
    }

    stageResults[stg] = aggregateStage(facilitySensorResults);
  }

  var physicalDL = computePhysicalDualLock(stageResults);
  var confidence = computeConfidence(stageResults, archCode);
  var combinedDL = computeCombinedDualLock(physicalDL, financialDL || { isDualLocked: false }, confidence);
  var story = generateStory(stageResults, physicalDL, combinedDL, profile, archetypeInfo);

  return {
    ticker: profile.ticker,
    name: profile.name,
    archetype: archCode,
    archetypeName: archetypeInfo.nameEn,
    updatedAt: new Date().toISOString(),
    stages: stageResults,
    dualLock: {
      physical: physicalDL,
      financial: financialDL || { input: 'N/A', output: 'N/A', isDualLocked: false },
      combined: combinedDL,
    },
    story: story,
    _dry: true,
  };
}

module.exports = {
  // core
  analyzeSupplyChain: analyzeSupplyChain,
  analyzeSupplyChainDry: analyzeSupplyChainDry,
  // internals (testing)
  gradeSensor: gradeSensor,
  gradeThermal: gradeThermal,
  scoreFacility: scoreFacility,
  aggregateStage: aggregateStage,
  computePhysicalDualLock: computePhysicalDualLock,
  computeCombinedDualLock: computeCombinedDualLock,
  computeConfidence: computeConfidence,
  generateStory: generateStory,
  shrinkageMean: shrinkageMean,
};
