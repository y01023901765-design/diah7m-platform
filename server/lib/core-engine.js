/**
 * DIAH-7M 코어 엔진 v5.1 — 정본
 * ═══════════════════════════════════════════════════════
 * 59게이지 → 9축 severity → 교차신호 → 이중봉쇄 → 5단계 판정
 *
 * 이 파일은 이전 세션들의 core_engine.js를 통합한 정본입니다.
 * © 인체국가경제론 / DIAH-7M / 윤종원
 */

const fs = require('fs');
const path = require('path');
const { GAUGE_RULES } = require('./gauge-rules');

// ═══ 9축 정의 — 실제 게이지 ID 기준 ═══
// gaugeIds: data-pipeline의 실제 ID 목록
const AXES = {
  A1: { name: '순환계',   metaphor: '통화/자금',    gaugeIds: ['T1_TRADE_BALANCE','T2_CURRENT_ACCOUNT','T4_RESERVES','F4_EXCHANGE','F6_M2','F5_INTEREST'] },
  A2: { name: '호흡계',   metaphor: '무역/수출입',  gaugeIds: ['O1_EXPORT','T1_TRADE_BALANCE','T6_CONTAINER','E1_CHINA_PMI','E2_US_PMI','E5_BALTIC'] },
  A3: { name: '소화계',   metaphor: '소비/내수',    gaugeIds: ['S6_RETAIL','S2_CSI','O6_SHIPMENT','O7_ORDER','S7_HOUSING','O5_INVENTORY'] },
  A4: { name: '신경계',   metaphor: '심리/정책',    gaugeIds: ['S1_BSI','S3_NIGHTLIGHT','S4_CREDIT','S5_EMPLOY','E3_VIX','E4_DOLLAR_INDEX'] },
  A5: { name: '면역계',   metaphor: '금융안정',     gaugeIds: ['F1_KOSPI','F2_KOSDAQ','F3_KOSPI_VOL','F7_KOSDAQ_VOL','F8_FOREIGN','S4_CREDIT'] },
  A6: { name: '내분비계', metaphor: '물가/재정',    gaugeIds: ['P1_CPI','P2_PPI','P3_OIL','P4_COMMODITY','P5_IMPORT','P6_EXPORT_PRICE'] },
  A7: { name: '근골격계', metaphor: '산업/생산',    gaugeIds: ['O2_PMI','O3_IP','O4_CAPACITY','I1_CONSTRUCTION','I2_CEMENT','I3_STEEL','I4_VEHICLE','I6_AIRPORT','I7_RAILROAD'] },
  A8: { name: '인구/취약', metaphor: '고용/가계',   gaugeIds: ['L1_UNEMPLOYMENT','L2_PARTICIPATION','L3_WAGE','L4_HOURS','L5_YOUTH_UNEMP'] },
  A9: { name: '재생/대외', metaphor: '에너지/대외', gaugeIds: ['R1_ELECTRICITY','R2_WATER','R3_GAS','R4_COAL','R6_UHI','T3_FDI','T5_SHIPPING','R7_WASTE','R8_FOREST'] },
};

// ═══ 게이지별 정규화 임계값 — gauge-rules.js에서 자동 생성 (SSOT) ═══
// 이 객체를 직접 수정하지 마세요. gauge-rules.js의 threshold를 수정하세요.
const GAUGE_THRESHOLDS = Object.fromEntries(
  Object.entries(GAUGE_RULES)
    .filter(([, r]) => r.threshold)
    .map(([id, r]) => [id, { ...r.threshold, unit: r.unit, name: r.name }])
);

// ═══ 교차신호 정의 (15쌍) ═══
const CROSS_SIGNALS = [
  { a: 'A1', b: 'A5', name: '통화↔금융', desc: '금리 인상 시 금융시장 압박' },
  { a: 'A1', b: 'A3', name: '통화↔소비', desc: '금리 인상 시 소비 위축' },
  { a: 'A2', b: 'A7', name: '무역↔산업', desc: '수출 둔화 시 생산 감소' },
  { a: 'A3', b: 'A7', name: '소비↔산업', desc: '내수 부진 시 서비스업 타격' },
  { a: 'A4', b: 'A3', name: '심리↔소비', desc: '심리 위축 시 소비 감소' },
  { a: 'A5', b: 'A8', name: '금융↔가계', desc: '금융 불안 시 가계 부담 증가' },
  { a: 'A6', b: 'A1', name: '물가↔통화', desc: '물가 상승 시 금리 인상 압박' },
  { a: 'A6', b: 'A3', name: '물가↔소비', desc: '물가 상승 시 소비 위축' },
  { a: 'A7', b: 'A8', name: '산업↔고용', desc: '생산 감소 시 고용 악화' },
  { a: 'A8', b: 'A9', name: '인구↔부동산', desc: '인구 감소 시 부동산 수요 감소' },
  { a: 'A2', b: 'A6', name: '무역↔물가', desc: '수입물가 영향' },
  { a: 'A4', b: 'A5', name: '심리↔금융', desc: '불안 심리 → 금융시장 변동' },
  { a: 'A1', b: 'A9', name: '통화↔부동산', desc: '금리 → 부동산 가격' },
  { a: 'A5', b: 'A9', name: '금융↔대외', desc: '금융 불안 → 외국인 자금 이탈' },
  { a: 'A3', b: 'A8', name: '소비↔가계', desc: '소비 패턴 ↔ 가계 건전성' },
];

// ═══ 5단계 상태 ═══
const LEVELS = [
  { level: 1, name: '안정', color: '#22c55e', threshold: 1.5 },
  { level: 2, name: '주의', color: '#eab308', threshold: 2.0 },
  { level: 3, name: '경계', color: '#f97316', threshold: 2.5 },
  { level: 4, name: '심각', color: '#ef4444', threshold: 3.5 },
  { level: 5, name: '위기', color: '#991b1b', threshold: 5.0 },
];

// ═══ 정규화 함수 ═══

/**
 * 게이지 값을 0~5 severity로 정규화
 * 0 = 최적, 5 = 최악
 */
function normalizeSeverity(gaugeId, rawValue) {
  const t = GAUGE_THRESHOLDS[gaugeId];
  if (!t) return null;

  const val = parseFloat(rawValue);
  if (isNaN(val)) return null;

  const range = t.max - t.min;
  if (range === 0) return 2.5;

  let position;
  if (t.invert) {
    // 높을수록 나쁨: max에 가까울수록 severity 높음
    position = (val - t.min) / range;
  } else {
    // 높을수록 좋음: min에 가까울수록 severity 높음
    position = 1 - (val - t.min) / range;
  }

  // 범위 벗어나면 클램핑
  position = Math.max(0, Math.min(1, position));

  // 0~5 스케일
  return Math.round(position * 5 * 100) / 100;
}

/**
 * 축별 평균 severity 계산 — gaugeIds 기준
 */
function calculateAxisScore(axisId, gaugeData) {
  const axis = AXES[axisId];
  if (!axis) return null;

  const severities = [];

  // gaugeIds 명시 목록으로 매핑
  const ids = axis.gaugeIds || [];
  for (const gId of ids) {
    if (!(gId in gaugeData)) continue;
    const raw = gaugeData[gId];
    const sev = normalizeSeverity(gId, raw);
    if (sev !== null) {
      const th = GAUGE_THRESHOLDS[gId] || {};
      severities.push({ gaugeId: gId, name: th.name || gId, raw, severity: sev, unit: th.unit || '' });
    }
  }

  if (severities.length === 0) return { score: 2.5, gauges: [], count: 0 };

  const avg = severities.reduce((s, g) => s + g.severity, 0) / severities.length;
  return {
    score: Math.round(avg * 100) / 100,
    gauges: severities,
    count: severities.length,
  };
}

/**
 * severity → 5단계 레벨 변환
 */
function scoreToLevel(score) {
  for (let i = 0; i < LEVELS.length; i++) {
    if (score < LEVELS[i].threshold) return LEVELS[i];
  }
  return LEVELS[LEVELS.length - 1];
}

// ═══ 교차신호 분석 ═══

function analyzeCrossSignals(axisScores) {
  const signals = [];

  for (const cs of CROSS_SIGNALS) {
    const scoreA = axisScores[cs.a]?.score ?? 2.5;
    const scoreB = axisScores[cs.b]?.score ?? 2.5;

    // 양쪽 모두 경계(2.0) 이상이면 교차신호 발동
    if (scoreA >= 2.0 && scoreB >= 2.0) {
      const combined = (scoreA + scoreB) / 2;
      signals.push({
        pair: `${cs.a}↔${cs.b}`,
        name: cs.name,
        desc: cs.desc,
        scoreA: Math.round(scoreA * 100) / 100,
        scoreB: Math.round(scoreB * 100) / 100,
        combined: Math.round(combined * 100) / 100,
        level: scoreToLevel(combined),
      });
    }
  }

  return signals.sort((a, b) => b.combined - a.combined);
}

// ═══ 이중봉쇄 판정 ═══

function checkDualLock(axisScores, crossSignals) {
  // 조건 1: 3개 이상 축이 경계(2.5) 이상
  const criticalAxes = Object.entries(axisScores)
    .filter(([, v]) => v.score >= 2.5)
    .map(([k]) => k);

  // 조건 2: 5개 이상 교차신호 발동
  const activeSignals = crossSignals.length;

  const locked = criticalAxes.length >= 3 && activeSignals >= 5;

  return {
    locked,
    criticalAxes,
    activeSignals,
    reason: locked
      ? `${criticalAxes.length}축 경계 + ${activeSignals}개 교차신호 → 이중봉쇄 발동`
      : `조건 미충족 (경계축 ${criticalAxes.length}/3, 교차신호 ${activeSignals}/5)`,
  };
}

// ═══ 메인 진단 함수 ═══

/**
 * 전체 진단 실행
 * @param {Object} gaugeData - { gaugeId: rawValue, ... } 59개 게이지 값
 * @param {Object} options - { profileId, period }
 * @returns {Object} 진단 결과
 */
function diagnose(gaugeData, options = {}) {
  const { profileId = 'KR-ECON-NAT-MOEF-M', period = new Date().toISOString().slice(0, 7) } = options;

  // 1. 축별 점수 계산
  const axisScores = {};
  for (const axisId of Object.keys(AXES)) {
    axisScores[axisId] = calculateAxisScore(axisId, gaugeData);
  }

  // 2. 전체 점수 (9축 평균)
  const axisValues = Object.values(axisScores).map(a => a.score);
  const overallScore = axisValues.length > 0
    ? Math.round((axisValues.reduce((s, v) => s + v, 0) / axisValues.length) * 100) / 100
    : 2.5;

  // 3. 전체 레벨
  const overallLevel = scoreToLevel(overallScore);

  // 4. 교차신호
  const crossSignals = analyzeCrossSignals(axisScores);

  // 5. 이중봉쇄
  const dualLock = checkDualLock(axisScores, crossSignals);

  // 6. 경보 생성
  const alerts = [];
  for (const [axisId, axis] of Object.entries(axisScores)) {
    if (axis.score >= 2.5) {
      alerts.push({
        type: 'AXIS_WARNING',
        axisId,
        axisName: AXES[axisId].name,
        score: axis.score,
        level: scoreToLevel(axis.score),
        topGauges: axis.gauges.sort((a, b) => b.severity - a.severity).slice(0, 3),
      });
    }
  }
  if (dualLock.locked) {
    alerts.unshift({ type: 'DUAL_LOCK', ...dualLock });
  }

  // ─── Layer A: 급성 쇼크 판정 (acute-engine v5.0 CAM+DLT) ───
  let acuteLayer = null;
  let layerPriority = null;
  try {
    const acuteEngine = require('./acute-engine');
    acuteLayer = acuteEngine.evaluateAcute(gaugeData, options.prevData || null);
    layerPriority = acuteEngine.resolveLayerPriority(
      acuteLayer,
      { level: overallLevel.level },
      null  // 위성 교차검증: 향후 연결
    );
  } catch (e) {
    // acute-engine 오류는 무시하고 Layer B 결과만 반환
    console.warn('[core-engine] acute-engine 로드 실패:', e.message);
  }

  return {
    profileId,
    period,
    timestamp: new Date().toISOString(),
    overall: {
      score: overallScore,
      level: overallLevel.level,
      levelName: overallLevel.name,
      color: overallLevel.color,
    },
    axes: Object.fromEntries(
      Object.entries(axisScores).map(([id, data]) => [id, {
        ...AXES[id],
        ...data,
        level: scoreToLevel(data.score),
      }])
    ),
    crossSignals,
    dualLock,
    alerts,
    gaugeCount: Object.keys(gaugeData).length,
    // ─── 3레이어 구조 ───
    layerA: acuteLayer,         // 급성 쇼크 (Master Alarm, v5.0 CAM+DLT)
    layerB: {                   // 구조적 침체 (Chronic, 59게이지 9축)
      layer: 'B',
      layerName: 'Chronic (Structural)',
      description: '59게이지 9축 구조적 침체 — 장기 경제 체력 지도',
      overallSeverity: overallScore,
      level: overallLevel.level,
      levelName: overallLevel.name,
    },
    layerPriority,              // 최종 통합 판정 (A우선 → B Hold → 정상)
  };
}

// ═══ 프로파일에서 게이지 데이터 추출 ═══

function extractGaugeData(profileOrData) {
  const result = {};

  // data.json 형식 (배열 안에 게이지 객체들)
  for (const [key, val] of Object.entries(profileOrData)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item?.code) {
          const gId = item.code.split(' ')[0];
          if (GAUGE_THRESHOLDS[gId]) {
            const v = parseFloat(item.value ?? item.raw);
            if (!isNaN(v)) result[gId] = v;
          }
        }
      }
    }
  }

  // 직접 { gaugeId: value } 형태
  for (const [k, v] of Object.entries(profileOrData)) {
    if (GAUGE_THRESHOLDS[k] && typeof v === 'number') {
      result[k] = v;
    }
  }

  return result;
}

module.exports = {
  AXES, GAUGE_THRESHOLDS, CROSS_SIGNALS, LEVELS,
  normalizeSeverity, calculateAxisScore, scoreToLevel,
  analyzeCrossSignals, checkDualLock,
  diagnose, extractGaugeData,
};
