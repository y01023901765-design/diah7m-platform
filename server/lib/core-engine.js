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

// ═══ 9축 정의 (인체국가경제론) ═══
const AXES = {
  A1: { name: '순환계', metaphor: '통화/자금', gaugePrefix: ['I'] },
  A2: { name: '호흡계', metaphor: '무역/수출입', gaugePrefix: ['E'] },
  A3: { name: '소화계', metaphor: '소비/내수', gaugePrefix: ['C'] },
  A4: { name: '신경계', metaphor: '심리/정책', gaugePrefix: ['S'] },
  A5: { name: '면역계', metaphor: '금융안정', gaugePrefix: ['F'] },
  A6: { name: '내분비계', metaphor: '물가/재정', gaugePrefix: ['P'] },
  A7: { name: '근골격계', metaphor: '산업/생산', gaugePrefix: ['M', 'O'] },
  A8: { name: '인구/취약', metaphor: '인구/가계', gaugePrefix: ['D', 'L'] },
  A9: { name: '재생/대외', metaphor: '부동산/대외', gaugePrefix: ['R', 'G'] },
};

// ═══ 게이지별 정규화 임계값 ═══
// { gaugeId: { min, max, invert, unit } }
// invert=true: 값이 높을수록 나쁨 (실업률, 부채비율 등)
const GAUGE_THRESHOLDS = {
  // A1 순환계 (통화)
  I1: { min: 0, max: 5, invert: false, unit: '%', name: '기준금리' },
  I2: { min: -10, max: 10, invert: false, unit: '억$', name: '경상수지' },
  I3: { min: 3000, max: 5000, invert: false, unit: '억$', name: '외환보유고' },
  I4: { min: 1100, max: 1500, invert: true, unit: '원/$', name: '환율' },
  I5: { min: 0, max: 10, invert: false, unit: '%', name: 'M2증가율' },
  I6: { min: 0, max: 5, invert: false, unit: '%', name: '국채금리(3Y)' },

  // A2 호흡계 (무역)
  E1: { min: 400, max: 700, invert: false, unit: '억$', name: '수출' },
  E2: { min: 400, max: 700, invert: true, unit: '억$', name: '수입' },
  E3: { min: -50, max: 100, invert: false, unit: '억$', name: '무역수지' },
  E4: { min: 50, max: 200, invert: false, unit: 'TEU', name: '컨테이너물동량' },
  E5: { min: 40, max: 120, invert: true, unit: '$/bbl', name: '유가' },
  E6: { min: 1, max: 5, invert: false, unit: '%', name: '수출증가율' },

  // A3 소화계 (소비)
  C1: { min: -5, max: 10, invert: false, unit: '%', name: '소매판매증감' },
  C2: { min: 80, max: 120, invert: false, unit: 'pt', name: '소비자심리' },
  C3: { min: 20, max: 70, invert: false, unit: '조원', name: '카드매출' },
  C4: { min: -5, max: 10, invert: false, unit: '%', name: '설비투자증감' },
  C5: { min: 0, max: 5, invert: false, unit: '%', name: '민간소비증가율' },
  C6: { min: -3, max: 5, invert: false, unit: '%', name: '서비스업생산' },

  // A4 신경계 (심리/정책)
  S1: { min: 60, max: 120, invert: false, unit: 'pt', name: 'BSI(기업경기)' },
  S2: { min: 80, max: 130, invert: false, unit: '%', name: '야간광량지수' },
  S3: { min: 95, max: 110, invert: false, unit: 'pt', name: '경기선행지수' },
  S4: { min: -5, max: 5, invert: false, unit: '%', name: '정부지출증감' },
  S5: { min: 0, max: 2, invert: true, unit: '%', name: '정책불확실성' },
  S6: { min: 90, max: 110, invert: false, unit: 'pt', name: '경기동행지수' },

  // A5 면역계 (금융안정)
  F1: { min: 0, max: 3, invert: true, unit: '%', name: '신용스프레드' },
  F2: { min: 0, max: 3, invert: true, unit: '%p', name: 'CD-국고채스프레드' },
  F3: { min: 3000, max: 6000, invert: false, unit: 'pt', name: 'KOSPI' },
  F4: { min: 10, max: 40, invert: true, unit: 'pt', name: 'V-KOSPI(변동성)' },
  F5: { min: 0, max: 5, invert: true, unit: '%', name: '연체율' },
  F6: { min: 0, max: 3, invert: true, unit: '%p', name: '회사채스프레드' },
  F7: { min: 800, max: 1200, invert: false, unit: 'pt', name: 'KOSDAQ' },

  // A6 내분비계 (물가/재정)
  P1: { min: 0, max: 5, invert: true, unit: '%', name: 'CPI(소비자물가)' },
  P2: { min: -2, max: 5, invert: true, unit: '%', name: 'PPI(생산자물가)' },
  P3: { min: -5, max: 5, invert: false, unit: '%', name: '국세수입증감' },
  P4: { min: 0, max: 70, invert: true, unit: '%GDP', name: '국가채무비율' },
  P5: { min: -5, max: 5, invert: false, unit: '%', name: '재정수지' },
  P6: { min: 0, max: 5, invert: true, unit: '%', name: '근원물가' },

  // A7 근골격계 (산업/생산)
  M1: { min: 60, max: 85, invert: false, unit: '%', name: '제조업가동률' },
  M2: { min: 90, max: 130, invert: true, unit: '%', name: '제조업재고율' },
  M3: { min: -15, max: 15, invert: false, unit: '%', name: '신규수주증감' },
  O1: { min: -5, max: 10, invert: false, unit: '%', name: '산업생산증감' },
  O2: { min: 45, max: 60, invert: false, unit: 'pt', name: 'PMI(제조업)' },
  O3: { min: -10, max: 10, invert: false, unit: '%', name: '건설기성증감' },
  O4: { min: -5, max: 10, invert: false, unit: '%', name: '제조업생산증감' },
  O5: { min: -5, max: 10, invert: false, unit: '%', name: '서비스업생산증감' },
  O6: { min: -5, max: 10, invert: false, unit: '%', name: '소비증감(전년비)' },

  // A8 인구/취약 (D=Demographics, L=Labor)
  D1: { min: 0.7, max: 2.1, invert: false, unit: '', name: '합계출산율' },
  D2: { min: 10, max: 25, invert: true, unit: '%', name: '고령화율' },
  D3: { min: 3000, max: 3700, invert: false, unit: '만명', name: '생산가능인구' },
  L1: { min: 55, max: 70, invert: false, unit: '%', name: '고용률' },
  L2: { min: 2, max: 6, invert: true, unit: '%', name: '실업률' },
  L3: { min: 1500, max: 2200, invert: true, unit: '조원', name: '가계부채' },
  L4: { min: 0.2, max: 5, invert: true, unit: '%', name: '가계대출연체율' },

  // A9 재생/대외
  R1: { min: -10, max: 10, invert: false, unit: '%', name: '주택가격증감' },
  R2: { min: 10000, max: 80000, invert: true, unit: '호', name: '미분양주택' },
  R5: { min: -0.05, max: 0.1, invert: false, unit: 'm', name: 'SAR해수면' },
  R6: { min: 50, max: 150, invert: false, unit: '지수', name: '열섬지수' },
  G1: { min: -10, max: 30, invert: false, unit: '억$', name: '외국인직접투자' },
  G6: { min: 10, max: 50, invert: false, unit: '㎍/m³', name: 'PM2.5' },
};

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
 * 축별 평균 severity 계산
 */
function calculateAxisScore(axisId, gaugeData) {
  const axis = AXES[axisId];
  if (!axis) return null;

  const severities = [];

  for (const [gId, raw] of Object.entries(gaugeData)) {
    const prefix = gId.replace(/[0-9]/g, '');
    if (axis.gaugePrefix.includes(prefix)) {
      const sev = normalizeSeverity(gId, raw);
      if (sev !== null) {
        severities.push({ gaugeId: gId, raw, severity: sev });
      }
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
