/**
 * DIAH-7M Core Diagnosis Engine v2.0
 * ═══════════════════════════════════
 * schema.json v1.2 완전 준수
 * 
 * N07: Schema ↔ Engine 출력 매칭
 * N08: 교차신호 + 이중봉쇄
 * N09: 행동시그널 (관찰 언어)
 */

const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const fs = require('fs/promises');
const path = require('path');

// ==========================================
// Schema 검증 (N07)
// ==========================================

let SCHEMA = null;
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);

async function loadSchema() {
  if (SCHEMA) return SCHEMA;
  try {
    const schemaPath = path.join(__dirname, '..', 'schema.json');
    const schemaData = await fs.readFile(schemaPath, 'utf-8');
    SCHEMA = JSON.parse(schemaData);
    ajv.addSchema(SCHEMA, 'DiagnosisReport');
    console.log('✅ Schema v1.2 loaded');
    return SCHEMA;
  } catch (error) {
    console.error('❌ Schema load error:', error.message);
    throw error;
  }
}

function validateDiagnosisResult(result) {
  const validate = ajv.getSchema('DiagnosisReport');
  if (!validate) throw new Error('Schema not loaded');

  const valid = validate(result);

  if (!valid) {
    const errors = validate.errors;
    const criticalFields = ['overall', 'systems', 'report_id'];
    const hasCriticalError = errors.some(err =>
      criticalFields.some(field => err.instancePath.includes(field))
    );

    if (hasCriticalError || process.env.NODE_ENV !== 'production') {
      console.error('❌ Validation errors:', errors.length);
      errors.slice(0, 5).forEach(e => console.error('  ', e.instancePath, '→', e.message));
      throw new Error(`Schema validation failed (${errors.length} errors): ${errors[0].message}`);
    } else {
      console.warn('⚠️  Soft validation errors:', errors.length);
      return { valid: false, errors, degraded: true };
    }
  }

  return { valid: true };
}

// ==========================================
// 9축 시스템 정의
// ==========================================

const BODY_MAP = {
  O: { name: 'Output',         body_name: '심장',     body_metaphor: '경제의 펌프 — 생산·수출이 혈액을 순환시킨다' },
  F: { name: 'Finance',        body_name: '혈관',     body_metaphor: '자금 흐름의 통로 — 막히면 경색이 온다' },
  S: { name: 'Sentiment',      body_name: '신경계',   body_metaphor: '경제 심리의 전기 신호 — 소비와 투자를 제어한다' },
  P: { name: 'Price',          body_name: '체온',     body_metaphor: '물가는 경제의 체온 — 과열도 저체온도 위험하다' },
  R: { name: 'Resource',       body_name: '폐',       body_metaphor: '에너지·자원의 호흡 — 산소 공급이 끊기면 전신이 멈춘다' },
  I: { name: 'Infrastructure', body_name: '골격',     body_metaphor: '건설·물류 인프라 — 경제를 지탱하는 뼈대' },
  T: { name: 'Trade',          body_name: '소화기',   body_metaphor: '수출입의 소화 — 영양분(외화)을 흡수한다' },
  E: { name: 'External',       body_name: '면역계',   body_metaphor: '외부 충격 방어 — 글로벌 리스크에 대한 저항력' },
  L: { name: 'Labor',          body_name: '근육',     body_metaphor: '노동력은 경제의 근육 — 움직임의 원천' },
};

const SYSTEMS = {
  O: { id: 'O', name: 'Output',         weight: 1.2, gauges: ['O1_EXPORT', 'O2_PMI', 'O3_IP', 'O4_CAPACITY', 'O5_INVENTORY', 'O6_SHIPMENT', 'O7_ORDER'] },
  F: { id: 'F', name: 'Finance',        weight: 1.1, gauges: ['F1_KOSPI', 'F2_KOSDAQ', 'F3_KOSPI_VOL', 'F4_EXCHANGE', 'F5_INTEREST', 'F6_M2', 'F7_KOSDAQ_VOL', 'F8_FOREIGN'] },
  S: { id: 'S', name: 'Sentiment',      weight: 1.0, gauges: ['S1_BSI', 'S2_CSI', 'S3_NIGHTLIGHT', 'S4_CREDIT', 'S5_EMPLOY', 'S6_RETAIL', 'S7_HOUSING'] },
  P: { id: 'P', name: 'Price',          weight: 1.0, gauges: ['P1_CPI', 'P2_PPI', 'P3_OIL', 'P4_COMMODITY', 'P5_IMPORT', 'P6_EXPORT_PRICE'] },
  R: { id: 'R', name: 'Resource',       weight: 0.9, gauges: ['R1_ELECTRICITY', 'R2_WATER', 'R3_GAS', 'R4_COAL', 'R6_UHI', 'R7_WASTE', 'R8_FOREST'] },
  I: { id: 'I', name: 'Infrastructure', weight: 1.0, gauges: ['I1_CONSTRUCTION', 'I2_CEMENT', 'I3_STEEL', 'I4_VEHICLE', 'I5_CARGO', 'I6_AIRPORT', 'I7_RAILROAD'] },
  T: { id: 'T', name: 'Trade',          weight: 1.1, gauges: ['T1_TRADE_BALANCE', 'T2_CURRENT_ACCOUNT', 'T3_FDI', 'T4_RESERVES', 'T5_SHIPPING', 'T6_CONTAINER'] },
  E: { id: 'E', name: 'External',       weight: 1.0, gauges: ['E1_CHINA_PMI', 'E2_US_PMI', 'E3_VIX', 'E4_DOLLAR_INDEX', 'E5_BALTIC'] },
  L: { id: 'L', name: 'Labor',          weight: 1.0, gauges: ['L1_UNEMPLOYMENT', 'L2_PARTICIPATION', 'L3_WAGE', 'L4_HOURS', 'L5_YOUTH_UNEMP'] },
};

const STATUS_MAP = ['정상', '관측', '트리거', '봉쇄', '위기'];
const SEVERITY_THRESHOLD = 3;

// ==========================================
// 점수 변환
// ==========================================

function rawToScore5(rawScore) {
  return Math.round((rawScore / 20) * 100) / 100;
}

function scoreToLevel(score5) {
  if (score5 >= 4) return 1;
  if (score5 >= 3) return 2;
  if (score5 >= 2) return 3;
  if (score5 >= 1) return 4;
  return 5;
}

function levelToStatus(level) {
  return STATUS_MAP[level - 1] || '위기';
}

// ==========================================
// 시스템 진단
// ==========================================

function diagnoseSystem(systemId, gaugeData) {
  const system = SYSTEMS[systemId];
  const body = BODY_MAP[systemId];
  if (!system || !body) return null;

  const matchedGauges = system.gauges
    .map(gid => gaugeData.find(g => g.id === gid))
    .filter(Boolean);

  const values = matchedGauges
    .map(g => g.value)
    .filter(v => v !== null && v !== undefined);

  const gaugeCount = matchedGauges.length;

  if (values.length === 0) {
    // 게이지 데이터 없는 축 → 완전 제외 (null 반환)
    // 강제로 2.5/트리거 채우면 하위 행정구역 보고서에서 오진단 발생
    return null;
  }

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const rawScore = Math.max(0, Math.min(100, 50 + avg));
  const score5 = rawToScore5(rawScore);
  const level = scoreToLevel(score5);

  return {
    system_id: systemId,
    system_name: body.name,
    body_name: body.body_name,
    body_metaphor: body.body_metaphor,
    score: score5,
    level,
    status: levelToStatus(level),
    gauge_count: gaugeCount,
    tier_min: 'FREE',
  };
}

// Internal helper: get weight and level for cross-signal detection
function _getSystemMeta(systemId) {
  return { weight: SYSTEMS[systemId]?.weight || 1.0 };
}

// ==========================================
// N08: 교차신호
// ==========================================

function detectCrossSignals(systems) {
  const signals = [];
  const sm = {};
  systems.forEach(s => { sm[s.system_id] = s; });

  const pairs = [
    { a: 'O', b: 'F', desc: '수출 감소와 금융시장 위축 동조' },
    { a: 'S', b: 'P', desc: '심리 악화와 물가 상승 동시 발생' },
    { a: 'O', b: 'T', desc: '생산 감소와 무역 위축 패턴' },
    { a: 'F', b: 'E', desc: '금융시장 불안과 외부 충격 중첩' },
    { a: 'P', b: 'R', desc: '물가 압력과 자원 부족 신호' },
    { a: 'I', b: 'L', desc: '인프라 둔화와 고용 약화' },
  ];

  for (const { a, b, desc } of pairs) {
    const sA = sm[a], sB = sm[b];
    if (sA && sB && sA.level >= SEVERITY_THRESHOLD && sB.level >= SEVERITY_THRESHOLD) {
      signals.push({
        pair: [a, b],
        severity: Math.min(5, Math.max(sA.level, sB.level)),
        description: desc,
      });
    }
  }

  if (signals.length >= 3) {
    signals.forEach(s => { if (s.severity < 5) s.severity += 1; });
  }

  return signals;
}

// ==========================================
// N08: 이중봉쇄
// ==========================================

function detectDualLock(systems) {
  const sm = {};
  systems.forEach(s => { sm[s.system_id] = s; });

  const lockPairs = [
    { inp: 'T', out: 'O', desc: '수출입 동시 위축 — 경제 순환 차단' },
    { inp: 'E', out: 'F', desc: '외부 자금 유출과 내부 금융 경색' },
    { inp: 'L', out: 'S', desc: '고용 위축과 소비심리 악화 악순환' },
  ];

  let inputSealed = false;
  let outputSealed = false;
  const sealedSystems = [];

  for (const { inp, out } of lockPairs) {
    if (sm[inp]?.level >= 4 && sm[out]?.level >= 4) {
      inputSealed = true;
      outputSealed = true;
      if (!sealedSystems.includes(inp)) sealedSystems.push(inp);
      if (!sealedSystems.includes(out)) sealedSystems.push(out);
    }
  }

  return {
    active: sealedSystems.length > 0,
    input_sealed: inputSealed,
    output_sealed: outputSealed,
    sealed_systems: sealedSystems,
    description: sealedSystems.length > 0
      ? sealedSystems.join('+') + ' 축 봉쇄 감지 — 경제 순환 차단 가능성'
      : '이중봉쇄 미감지',
  };
}

// ==========================================
// N09: 행동시그널 (관찰 언어)
// ==========================================

function generateActionSignals(systems, crossSignals, dualLock) {
  crossSignals = crossSignals || [];
  dualLock = dualLock || { active: false };
  const signals = [];

  systems.forEach(function(system) {
    if (system.level >= 4) {
      signals.push({
        type: 'observation',
        pattern: 'high_severity',
        evidence: { system_id: system.system_id, level: system.level, score: system.score },
        text: system.body_name + '(' + system.system_name + ') 지표 약화 관찰됨 — 점수 ' + system.score + '/5, ' + system.status + ' 단계',
        confidence: 0.8,
      });
    } else if (system.level >= 3) {
      signals.push({
        type: 'watch',
        pattern: 'elevated_severity',
        evidence: { system_id: system.system_id, level: system.level },
        text: system.body_name + '(' + system.system_name + ') 주의 관찰 — ' + system.status + ' 단계',
        confidence: 0.6,
      });
    }
  });

  crossSignals.forEach(function(signal) {
    signals.push({
      type: 'watch',
      pattern: 'cross_signal',
      evidence: { pair: signal.pair, severity: signal.severity },
      text: signal.description,
      confidence: 0.7,
    });
  });

  if (dualLock.active) {
    signals.push({
      type: 'observation',
      pattern: 'dual_lock',
      evidence: { sealed_systems: dualLock.sealed_systems },
      text: dualLock.description,
      confidence: 0.9,
    });
  }

  signals.push({
    type: 'context',
    pattern: 'disclaimer',
    text: 'DIAH-7M은 관찰 기반 진단 도구이며, 투자 조언이 아닙니다. 모든 수치는 과거 데이터에 기반한 관찰입니다.',
    confidence: 1.0,
  });

  return signals.slice(0, 10);
}

// ==========================================
// 5단계 인과사슬
// ==========================================

function determineCausalStage(overallLevel, dualLock, crossSignals) {
  if (overallLevel <= 1) return 'normal';
  if (overallLevel === 2 && crossSignals.length === 0) return 'factor';
  if (overallLevel === 2 && crossSignals.length > 0) return 'onset';
  if (overallLevel === 3 || dualLock.active) return 'cause';
  if (overallLevel === 4) return 'manifest';
  return 'result';
}

// ==========================================
// Delta (위성 vs 시장)
// ==========================================

function computeDelta(gaugeData) {
  var satGauges = gaugeData.filter(function(g) {
    return ['S3_NIGHTLIGHT', 'R6_UHI'].includes(g.id) && g.value !== null;
  });
  var satIndex = satGauges.length > 0
    ? satGauges.reduce(function(s, g) { return s + g.value; }, 0) / satGauges.length
    : null;

  var mktGauges = gaugeData.filter(function(g) {
    return ['F1_KOSPI', 'F2_KOSDAQ'].includes(g.id) && g.value !== null;
  });
  var mktIndex = mktGauges.length > 0
    ? mktGauges.reduce(function(s, g) { return s + g.value; }, 0) / mktGauges.length
    : null;

  var gap = (satIndex !== null && mktIndex !== null) ? +(satIndex - mktIndex).toFixed(2) : null;

  var state = 'HOLD';
  var type = null;
  if (gap !== null) {
    if (Math.abs(gap) < 5) state = 'ALIGNED';
    else if (gap > 15) { state = 'POS_GAP'; type = 'PHYSICAL_OK_MARKET_BAD'; }
    else if (gap > 5) { state = 'POS_GAP'; type = 'COMPENSATION'; }
    else if (gap < -15) { state = 'NEG_GAP'; type = 'MARKET_BUY_PHYSICAL_BAD'; }
    else if (gap < -5) { state = 'NEG_GAP'; type = 'PHYSICAL_BAD_DISCLOSURE_OK'; }
    else state = 'CONFLICT';
  }

  return {
    satellite_index: satIndex,
    market_index: mktIndex,
    gap: gap,
    state: state,
    type: type,
    description: gap !== null
      ? '위성 ' + (satIndex ? satIndex.toFixed(1) : 'N/A') + ' vs 시장 ' + (mktIndex ? mktIndex.toFixed(1) : 'N/A') + ' — 괴리 ' + (gap > 0 ? '+' : '') + gap
      : '위성 데이터 미수집 — Delta 산출 보류',
  };
}

// ==========================================
// Verdict
// ==========================================

function generateVerdict(score, level, causalStage, crossSignals, dualLock) {
  var stageNames = {
    normal: '정상 범위', factor: '요인 감지', onset: '초기 징후',
    cause: '원인 형성', manifest: '증상 발현', result: '결과 고착',
  };

  var v = '종합 점수 ' + score + '/5.0 (' + levelToStatus(level) + '). ';
  v += '인과사슬 단계: ' + (stageNames[causalStage] || causalStage) + '. ';
  if (crossSignals.length > 0) v += crossSignals.length + '건의 교차신호 관찰됨. ';
  if (dualLock.active) v += '이중봉쇄 감지: ' + dualLock.sealed_systems.join('+') + ' 축. ';
  v += '본 진단은 관찰 데이터에 기반하며, 미래 예측이 아닙니다.';
  return v;
}

// ==========================================
// 메인 진단 함수
// ==========================================

async function diagnose(gaugeData, options) {
  await loadSchema();
  options = options || {};

  var countryCode = options.countryCode || 'KR';
  var countryName = options.countryName || '대한민국';
  var productType = options.productType || 'national';
  var frequency = options.frequency || 'daily';
  // 엔티티 컨텍스트: 국가/광역시도/시군구 공통 파라미터
  var entityType = options.entityType || 'country'; // country | province | district
  var entityName = options.entityName || countryName;
  var entityCode = options.entityCode || countryCode;
  var parentName = options.parentName || null; // 상위 행정구역 (예: "서울특별시")
  var today = new Date().toISOString().split('T')[0];

  // 9축 진단
  var systems = Object.keys(SYSTEMS)
    .map(function(id) { return diagnoseSystem(id, gaugeData); })
    .filter(Boolean);

  // 교차신호 + 이중봉쇄
  var crossSignals = detectCrossSignals(systems);
  var dualLock = detectDualLock(systems);

  // 종합 점수
  var validSystems = systems.filter(function(s) { return s.score !== null; });
  var weightedSum = validSystems.reduce(function(sum, s) {
    return sum + s.score * (_getSystemMeta(s.system_id).weight);
  }, 0);
  var weightSum = validSystems.reduce(function(sum, s) {
    return sum + _getSystemMeta(s.system_id).weight;
  }, 0);
  var overallScore5 = Math.round((weightedSum / weightSum) * 100) / 100;
  var overallLevel = scoreToLevel(overallScore5);
  var causalStage = determineCausalStage(overallLevel, dualLock, crossSignals);

  // 행동시그널 + Delta
  var actionSignals = generateActionSignals(systems, crossSignals, dualLock);
  var delta = computeDelta(gaugeData);

  // report_id
  var reportId = 'RPT-' + countryCode + '-' + today.replace(/-/g, '') + '-' + frequency.charAt(0).toUpperCase() + Date.now().toString(36).slice(-4).toUpperCase();

  var result = {
    report_id: reportId,
    product_type: productType,
    frequency: frequency,
    context: {
      country_code: countryCode,
      country_name: countryName,
      entity_type: entityType,
      entity_name: entityName,
      entity_code: entityCode,
      parent_name: parentName,
      date: today,
      period_label: today + ' ' + frequency,
      tier_min: 'FREE',
      cross_level: 'L4',
    },
    systems: systems,
    cross_signals: crossSignals,
    dual_lock: dualLock,
    delta: delta,
    actions: actionSignals,
    overall: {
      score: overallScore5,
      level: overallLevel,
      status: levelToStatus(overallLevel),
      causal_stage: causalStage,
    },
    verdict: generateVerdict(overallScore5, overallLevel, causalStage, crossSignals, dualLock),
    metadata: {
      generated_at: new Date().toISOString(),
      engine_version: '2.0.0',
      schema_version: '1.2',
      thresholds_version: '1.0',
      data_freshness: today,
      channel: 'web',
      language: 'ko',
      compliance: {
        prediction_prohibited: true,
        observation_only: true,
        disclaimer: 'DIAH-7M은 관찰 기반 진단 도구이며, 투자 조언이 아닙니다.',
      },
    },
  };

  // Schema 검증
  try {
    validateDiagnosisResult(result);
    console.log('✅ Diagnosis passed schema validation');
  } catch (err) {
    console.error('⚠️  Schema validation issue:', err.message);
    if (process.env.NODE_ENV === 'production') {
      result._validation = { valid: false, error: err.message };
    } else {
      throw err;
    }
  }

  return result;
}

module.exports = {
  SYSTEMS,
  BODY_MAP,
  diagnose,
  diagnoseSystem,
  detectCrossSignals,
  detectDualLock,
  generateActionSignals,
  loadSchema,
  validateDiagnosisResult,
  rawToScore5,
  scoreToLevel,
  levelToStatus,
};
