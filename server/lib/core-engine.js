/**
 * DIAH-7M Core Diagnosis Engine v1.1
 * ═══════════════════════════════════
 * schema.json MASTER 계약 준수
 * 59게이지 × 9축 → schema-compliant JSON 출력
 */

// ── 9축 시스템 정의 (schema SystemDiagnosis 준수) ──
const SYSTEMS = {
  C: { name:'통화·자금', body:'순환계', metaphor:'금리·환율·외환 = 혈액순환',
       keys:['I1','I2','I3','I4','I5','I6'] },
  R: { name:'무역·수출입', body:'호흡계', metaphor:'수출·수입·물동량 = 호흡',
       keys:['E1','E2','E3','E4','E5','E6'] },
  D: { name:'소비·내수', body:'소화계', metaphor:'소매·카드·서비스 = 영양분 흡수',
       keys:['C1','C2','C3','C4','C5','C6'] },
  N: { name:'정책·규제', body:'신경계', metaphor:'BSI·선행·정부지출 = 두뇌 명령',
       keys:['S1','S2','S3','S4','S5','S6'] },
  E: { name:'금융안정', body:'면역계', metaphor:'신용·스프레드·연체 = 면역 방어',
       keys:['F1','F2','F3','F4','F5','F6','F7'] },
  I: { name:'물가·재정', body:'내분비계', metaphor:'CPI·PPI·세수·채무 = 호르몬 균형',
       keys:['P1','P2','P3','P4','P5','P6'] },
  M: { name:'생산·산업', body:'근골격계', metaphor:'산업생산·PMI·건설 = 근력 활동',
       keys:['O1','O2','O3','O4','O5','O6'] },
  G: { name:'제조·재고', body:'대사계', metaphor:'가동률·재고율·수주 = 에너지 대사',
       keys:['M1','M2_G','M3_G'] },
  O: { name:'인구·가계', body:'생식·재생계', metaphor:'출산·고령화·부채 = 세대 재생',
       keys:['D1','D2','D3','L1','L2','L3','L4','R1','R2','R5','R6','G1','G6'] },
};

// ── 교차신호 15쌍 ──
const CROSS_SIGNALS = [
  ['I1','E1'], ['I2','F7'], ['E1','C1'], ['E3','O1'],
  ['C2','F1'], ['C4','P3'], ['F2','I1'], ['F4','G1'],
  ['P2','S1'], ['P5','G6'], ['I3','M1'], ['F5','S5'],
  ['O2','G1'], ['G1','S4'], ['S2','R5'],
];

// ── 상태 매핑 ──
const STATUS_MAP = { 1:'정상', 2:'관측', 3:'트리거', 4:'봉쇄', 5:'위기' };
const GAUGE_STATUS = { 1:'양호', 2:'양호', 3:'주의', 4:'경보', 5:'경보' };

// ── 심각도 계산 ──
function severity(val, thresholds) {
  if (!thresholds || val == null) return 2;
  const { good, warn, danger } = thresholds;
  if (danger !== undefined && val >= danger) return 5;
  if (warn !== undefined && val >= warn) return 3;
  if (good !== undefined && val <= good) return 1;
  return 2;
}

// ── Schema-compliant 보고서 생성 ──
// ── 금지어 가드: 예측/매수/매도 표현 차단 ──
const PROHIBITION_WORDS = ['예측','전망','매수','매도','추천','확정','반드시','것이다','될 것','할 것','상승할','하락할','predict','forecast','buy','sell','recommend','will rise','will fall'];

function filterProhibited(text) {
  for (const w of PROHIBITION_WORDS) {
    if (text.includes(w)) return text.replace(new RegExp(w, 'g'), '[관측 언어 위반 — 제거됨]');
  }
  return text;
}

// ── N09: 행동시그널 생성 ──
// 3층 구조: observation(관찰) / watch(추적) / context(맥락)
// 예측 금지 원칙: evidence 기반 기계적 생성만
function generateActions(systems, crossSignals, dualLockActive, causalStage, overallLevel) {
  const actions = [];

  // 1. 교차신호 기반 observation
  for (const cs of crossSignals) {
    const [sysA, sysB] = cs.pair;
    actions.push({
      type: 'observation',
      pattern: 'cross_signal',
      evidence: { systems: [sysA, sysB], severity: cs.severity },
      text: filterProhibited(`${SYSTEMS[sysA]?.name || sysA}과(와) ${SYSTEMS[sysB]?.name || sysB}에서 동시 악화 신호가 관측되었습니다.`),
      confidence: Math.min(cs.severity / 5, 1),
    });
  }

  // 2. 이중봉쇄 감지 시 observation
  if (dualLockActive) {
    actions.push({
      type: 'observation',
      pattern: 'dual_lock',
      evidence: { dual_lock: true, causal_stage: causalStage },
      text: filterProhibited('투입(통화·무역)과 산출(생산·고용) 양쪽에서 동시 위축 상태가 관측되었습니다. 5단계 분석 중 "원인" 단계에 해당합니다.'),
      confidence: 0.9,
    });
  }

  // 3. 시스템별 severity 기반 watch
  for (const [key, sys] of Object.entries(systems)) {
    if (sys.severity >= 4) {
      actions.push({
        type: 'watch',
        pattern: 'high_severity',
        evidence: { system: key, severity: sys.severity, gauge_count: sys.gauges?.length || 0 },
        text: filterProhibited(`${SYSTEMS[key]?.name || key} 시스템이 심각(${sys.severity}/5) 수준입니다. 다음 업데이트에서 변화 추이 확인이 필요합니다.`),
        confidence: sys.gauges ? (sys.gauges.filter(g => g.value != null).length / Math.max(sys.gauges.length, 1)) : 0.5,
      });
    } else if (sys.severity >= 3) {
      actions.push({
        type: 'watch',
        pattern: 'elevated_severity',
        evidence: { system: key, severity: sys.severity },
        text: filterProhibited(`${SYSTEMS[key]?.name || key} 시스템이 주의(${sys.severity}/5) 수준입니다. 추세 방향 확인이 필요합니다.`),
        confidence: 0.6,
      });
    }
  }

  // 4. 종합 수준 기반 context
  if (overallLevel >= 4) {
    actions.push({
      type: 'context',
      pattern: 'overall_alert',
      evidence: { overall_level: overallLevel, causal_stage: causalStage },
      text: filterProhibited('이 진단은 현재 관측된 지표 조합의 상태 표시이며, 원인 규명이나 향후 방향을 단정하지 않습니다.'),
      confidence: 1,
    });
  } else {
    actions.push({
      type: 'context',
      pattern: 'disclaimer',
      evidence: { overall_level: overallLevel },
      text: 'DIAH-7M은 관측 기반 측정을 제공하며, 투자 조언이나 예측이 아닙니다.',
      confidence: 1,
    });
  }

  return actions;
}

function generateReport(gaugeData, options = {}) {
  const {
    thresholds = {},
    countryCode = 'KR',
    countryName = '대한민국',
    productType = 'national',
    frequency = 'monthly',
    tier = 'PRO',
    language = 'ko',
    channel = 'web',
  } = options;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  // ── 9축 진단 ──
  const systems = [];
  let totalScore = 0, totalCount = 0;

  for (const [sysKey, sys] of Object.entries(SYSTEMS)) {
    let sum = 0, cnt = 0;
    for (const key of sys.keys) {
      if (gaugeData[key] !== undefined) {
        sum += severity(gaugeData[key], thresholds[key]);
        cnt++;
      }
    }
    const avg = cnt > 0 ? sum / cnt : 2;
    const level = avg <= 1.5 ? 1 : avg <= 2.0 ? 2 : avg <= 2.5 ? 3 : avg <= 3.0 ? 4 : 5;
    systems.push({
      system_id: sysKey,
      system_name: sys.name,
      body_name: sys.body,
      body_metaphor: sys.metaphor,
      score: Math.round(avg * 100) / 100,
      level,
      status: STATUS_MAP[level],
      gauge_count: cnt,
      tier_min: 'FREE',
    });
    totalScore += sum;
    totalCount += cnt;
  }

  // ── 게이지 배열 ──
  const gauges = [];
  for (const [key, val] of Object.entries(gaugeData)) {
    const sev = severity(val, thresholds[key]);
    gauges.push({
      gauge_id: key,
      name: key,
      system_id: Object.entries(SYSTEMS).find(([,s]) => s.keys.includes(key))?.[0] || '?',
      value: val,
      unit: '',
      status: GAUGE_STATUS[sev] || '양호',
      severity_score: sev,
      tier_min: sev <= 2 ? 'FREE' : 'BASIC',
    });
  }

  // ── 교차신호 ──
  const crossSignals = [];
  for (const [a, b] of CROSS_SIGNALS) {
    if (gaugeData[a] !== undefined && gaugeData[b] !== undefined) {
      const sevA = severity(gaugeData[a], thresholds[a]);
      const sevB = severity(gaugeData[b], thresholds[b]);
      if (sevA >= 3 && sevB >= 3) {
        crossSignals.push({ pair: [a, b], severity: Math.max(sevA, sevB) });
      }
    }
  }

  // ── 이중봉쇄 ──
  const sealedSystems = systems.filter(s => s.level >= 4).map(s => s.system_id);
  const inputSealed = sealedSystems.some(s => ['R','D'].includes(s));
  const outputSealed = sealedSystems.some(s => ['C','M'].includes(s));
  const dualLockActive = inputSealed && outputSealed;

  // ── 종합 ──
  const overallScore = totalCount > 0 ? Math.round(totalScore / totalCount * 100) / 100 : 2;
  const overallLevel = overallScore <= 1.5 ? 1 : overallScore <= 2.0 ? 2 : overallScore <= 2.5 ? 3 : overallScore <= 3.0 ? 4 : 5;

  // ── 5단계 인과 판정 ──
  let causalStage = 'normal';
  if (dualLockActive) causalStage = 'cause';
  else if (crossSignals.length >= 5) causalStage = 'onset';
  else if (crossSignals.length >= 2) causalStage = 'factor';
  if (overallLevel >= 5) causalStage = 'result';
  else if (overallLevel >= 4 && dualLockActive) causalStage = 'manifest';

  // ── Report ID ──
  const reportId = `RPT-${countryCode}-${dateStr.replace(/-/g,'')}-${frequency.charAt(0).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;

  return {
    report_id: reportId,
    product_type: productType,
    frequency,
    frequency_window: {
      frequency,
      delta_only: frequency === 'daily',
      trend_kernel_days: frequency === 'monthly' ? 30 : frequency === 'quarterly' ? 90 : null,
      full_diagnosis: ['monthly','quarterly','annual'].includes(frequency),
      include_history: ['quarterly','annual'].includes(frequency),
      include_forecast: frequency === 'annual',
    },
    context: {
      country_code: countryCode,
      country_name: countryName,
      date: dateStr,
      period_label: `${now.getFullYear()}년 ${now.getMonth()+1}월`,
      tier_min: tier,
      cross_level: productType === 'national' ? 'L4' : 'L2',
    },
    systems,
    gauges,
    cross_signals: crossSignals,
    dual_lock: {
      active: dualLockActive,
      input_sealed: inputSealed,
      output_sealed: outputSealed,
      sealed_systems: sealedSystems,
    },
    delta: {
      satellite_index: null,
      market_index: null,
      gap: null,
      state: 'HOLD',
      type: null,
    },
    actions: generateActions(systems, crossSignals, dualLockActive, causalStage, overallLevel),
    verdict: '',
    overall: {
      score: overallScore,
      level: overallLevel,
      status: STATUS_MAP[overallLevel],
      causal_stage: causalStage,
    },
    satellite_evidence: [],
    metadata: {
      generated_at: now.toISOString(),
      engine_version: '1.1.0',
      schema_version: '1.1',
      data_freshness: dateStr,
      channel,
      language,
      compliance: {
        prediction_prohibited: true,
        observation_only: true,
        disclaimer: 'DIAH-7M provides observation-based measurement, not prediction. Past satellite data verification and lead signal tracking only.',
      },
    },
  };
}

// ── 하위 호환: 기존 diagnose() 유지 ──
function diagnose(gaugeData, thresholds = {}) {
  const report = generateReport(gaugeData, { thresholds });
  return {
    overall: report.overall,
    systems: Object.fromEntries(report.systems.map(s => [s.system_id, {
      name: s.system_name, score: s.score, level: s.level, gaugeCount: s.gauge_count,
    }])),
    crossSignals: report.cross_signals,
    dualLock: report.dual_lock.active,
    gaugeCount: report.gauges.length,
    timestamp: report.metadata.generated_at,
  };
}

module.exports = { diagnose, generateReport, SYSTEMS, CROSS_SIGNALS };
