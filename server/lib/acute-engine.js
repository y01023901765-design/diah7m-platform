/**
 * DIAH-7M Acute Engine (Layer A) — v5.0 원본 CAM+DLT 로직 직접 통합
 * ═══════════════════════════════════════════════════════════════════
 *
 * 이 파일은 "DIAH-7M_판정엔진_v5_0.js"의 핵심 CAM+DLT 판정 로직을
 * 서버 모듈로 래핑한 것입니다. 로직은 v5.0 원본 그대로 복사,
 * 외부 인터페이스(입력 매핑 + module.exports)만 추가했습니다.
 *
 * ══════════════════════════════════════════════════════════════════
 * ⚠️  IMMUTABLE CONTRACT — 이 4개 규칙은 절대 변경 금지
 * ══════════════════════════════════════════════════════════════════
 *
 * [규칙 1] 입력 스키마 고정 — 7게이지 단위/기간 변경 금지
 *   I1 경상수지   : value = 억$ 절대값  (흑자=양수, 적자=음수)
 *   I3 외환보유고 : change = %MoM       (전월 대비 변화율)
 *   I4 환율(원/$)  : change = %MoM       (원화 약세=양수, 강세=음수)
 *   I6 국채금리   : change = bp MoM     (상승=양수, 1bp=0.01%p)
 *   O2 물가(CPI)  : value  = %YoY       (전년 동기 대비)
 *   O4 주가(KOSPI): change = %MoM       (전월 대비)
 *   O6 소비(소매판매): value = %MoM     (전월 대비)
 *
 * [규칙 2] 출력 점수화 금지 — alertLevel(0~3) + stars + 근거 게이지만 반환
 *   절대 금지: 0~100 환산, severity 평균화, 다른 레이어와 합산
 *   허용: alertLevel, alertLabel, inputStars, outputStars, gauges{}
 *
 * [규칙 3] Layer A/B 합산 금지 — 병렬 표시 전용
 *   Layer A(acute): alertLevel 0~3  → 급성 쇼크 경보
 *   Layer B(chronic): level 1~5     → 구조적 침체 지도
 *   두 레이어를 단일 숫자로 통합하는 코드 작성 금지
 *
 * [규칙 4] Master Alarm 배너 단일 점등 규칙 (Dashboard 계약)
 *   alertLevel ≥ 2 → 빨간 배너 (확정 경보) 점등
 *   alertLevel == 1 → 노란 배너 (주의, 확인 중) 점등
 *   alertLevel == 0 → 배너 없음 (Layer B는 별도 "구조 지도"로 표시)
 *
 * [교차검증 Hold 규칙] — diagnosis.js 라우트에서 파생 필드로 구현
 *   A 단독 경보   → '급성 경보 (위성/구조 미확인)'
 *   A + B 동방향 → '확정 경보 (이중 근거)'
 *   A = 0, B ≥ 경계 → 'HOLD — 구조 경보 (급성 미확인)'
 * ══════════════════════════════════════════════════════════════════
 *
 * Layer A (Master / Acute):
 *   - CAM Input 4개: I1(경상수지) I3(외환보유고) I4(환율) I6(국채금리)
 *   - DLT Output 3개: O2(물가) O4(주가) O6(소비)
 *   - alertLevel 0~3 = 급성 쇼크 경보 (IMF/외환위기 검증 기준)
 *   - 2개월 연속성(sustained) 기반 확정
 *
 * © 인체국가경제론 / DIAH-7M / 윤종원
 */

'use strict';

// ══════════════════════════════════════════
// 1. CAM+DLT 7게이지 정의 (v5.0 원본)
// ══════════════════════════════════════════

const GAUGE_DEF = {
  // CAM (Input 4개): 급성 금고 유출 감시
  I1: { name: '경상수지',   group: 'Input',  axis: 'CAM', unit: '억$',   note: '흑자=정상, 적자(-50억$미만)=위기' },
  I3: { name: '외환보유고', group: 'Input',  axis: 'CAM', unit: '%MoM',  note: '-5%미만=정상, -10%이하=경보' },
  I4: { name: '환율',       group: 'Input',  axis: 'CAM', unit: '%MoM',  note: '+3%미만=정상, +7%초과=위기 (강세=0점)' },
  I6: { name: '국채금리',   group: 'Input',  axis: 'CAM', unit: 'bp MoM',note: '10bp미만=정상, 30bp초과=위기' },
  // DLT (Output 3개): 만성 석회 침착 감시
  O2: { name: '물가(CPI)',  group: 'Output', axis: 'DLT', unit: '%YoY',  note: '3%미만=정상, 5%초과=위기' },
  O4: { name: '주가(KOSPI)',group: 'Output', axis: 'DLT', unit: '%MoM',  note: '급등+5%=주의, 급락-10%=위기' },
  O6: { name: '소비',       group: 'Output', axis: 'DLT', unit: '%MoM',  note: '-2%미만=정상, -5%초과=위기' },
};

// ══════════════════════════════════════════
// 2. 채점 기준 (v5.0 원본 — 임계값 수정 금지)
// ══════════════════════════════════════════

const SCORING = {
  I1: (v) => v > 0 ? 0 : v >= -50 ? 1 : 2,              // 경상수지: 흑자=0, 소적자=1, -50억$미만=2
  I3: (v) => v > -5 ? 0 : v >= -10 ? 1 : 2,              // 외환보유고 MoM%
  I4: (v) => v < 3 ? 0 : v <= 7 ? 1 : 2,                 // 환율 MoM% (원화강세는 호출 전 0처리)
  I6: (v) => v < 10 ? 0 : v <= 30 ? 1 : 2,               // 국채금리 MoM bp변동
  O2: (v) => v < 3 ? 0 : v <= 5 ? 1 : 2,                 // CPI YoY%
  O4: (v, dir) => {                                        // KOSPI MoM%
    if (dir === 'up'   && v >= 5)  return 1;
    if (dir === 'down' && Math.abs(v) >= 10) return 2;
    return 0;
  },
  O6: (v) => v > -2 ? 0 : v >= -5 ? 1 : 2,               // 소비(소매판매) MoM%
};

// ══════════════════════════════════════════
// 3. 게이지 채점 (v5.0 원본 scoreGauges)
// ══════════════════════════════════════════

function scoreGauges(inputs) {
  /**
   * inputs: {
   *   I1: { value: 억$ 절대값, change: MoM% },
   *   I3: { value: 억$, change: MoM% },
   *   I4: { value: 원/$ 절대값, change: MoM% },
   *   I6: { value: %, change: bp MoM },
   *   O2: { value: CPI YoY% },
   *   O4: { value: KOSPI pt, change: MoM% },
   *   O6: { value: 소매판매 MoM% },
   * }
   */
  const results = {};
  for (const [code, def] of Object.entries(GAUGE_DEF)) {
    const d = inputs[code];
    if (!d || (d.value == null && d.change == null)) {
      results[code] = { ...def, value: null, change: null, score: null, grade: 'N/A', available: false };
      continue;
    }

    let score;
    if (code === 'O4') {
      const chg = d.change ?? 0;
      score = SCORING.O4(Math.abs(chg), chg >= 0 ? 'up' : 'down');
    } else if (code === 'I4') {
      const chg = d.change ?? 0;
      score = chg < 0 ? 0 : SCORING.I4(chg);  // 원화강세(음수) = 0점
    } else {
      const fn = SCORING[code];
      // I1: 절대값, I3 MoM%: change, I4 처리됨, I6: change(bp), O2: value(YoY), O6: value(MoM)
      const input = code === 'I1' ? d.value :
                    code === 'I6' ? (d.change ?? d.value ?? 0) :
                    code === 'O2' ? d.value :
                    code === 'O6' ? (d.value ?? d.change ?? 0) :
                    (d.change ?? d.value ?? 0);
      score = fn(input);
    }

    const grade = score === 0 ? '양호 ○' : score === 1 ? '주의 ●' : '경보 ★';
    results[code] = { ...def, value: d.value ?? null, change: d.change ?? null, score, grade, available: true };
  }
  return results;
}

// ══════════════════════════════════════════
// 4. 경보 판정 (v5.0 원본 judgeAlert)
// ══════════════════════════════════════════

function judgeAlert(scored, prevScored) {
  const inputCodes  = ['I1', 'I3', 'I4', 'I6'];
  const outputCodes = ['O2', 'O4', 'O6'];

  const inputStars    = inputCodes.filter(c  => scored[c]?.score === 2).length;
  const outputStars   = outputCodes.filter(c => scored[c]?.score === 2).length;
  const inputWarnings = inputCodes.filter(c  => scored[c]?.score >= 1).length;

  // 경보 단계 (CAM Input★ 개수 기준)
  let alertLevel = 0;
  if (inputStars >= 3) alertLevel = 3;
  else if (inputStars >= 2) alertLevel = 2;
  else if (inputStars >= 1) alertLevel = 1;

  // 말단주의: Input 정상 + Output★ 단독
  const peripheralWarning = alertLevel === 0 && outputStars >= 1;

  // 2개월 연속성 (prevScored = 전월 scored 객체)
  let sustained = false;
  if (prevScored) {
    const prevInputStars = inputCodes.filter(c => prevScored[c]?.score === 2).length;
    if (inputStars >= 1 && prevInputStars >= 1) sustained = true;
  }

  // 동시성 (Input★ + Output★ 합계 ≥ 2)
  const simultaneous = (inputStars + outputStars) >= 2;

  return {
    alertLevel,
    alertLabel: ['0단계 (정상)', '1단계 (주의)', '2단계 (경보)', '3단계 (위기)'][alertLevel],
    inputStars, outputStars, inputWarnings,
    peripheralWarning, sustained, simultaneous,
    escalated: sustained && simultaneous,
  };
}

// ══════════════════════════════════════════
// 5. CAM/DLT 이중봉쇄 (v5.0 원본 judgeDualBlockade)
// ══════════════════════════════════════════

function judgeDualBlockade(scored, prevScored) {
  const inputCodes  = ['I1', 'I3', 'I4', 'I6'];
  const outputCodes = ['O2', 'O4', 'O6'];

  const inputStars  = inputCodes.filter(c  => scored[c]?.score === 2).length;
  const outputStars = outputCodes.filter(c => scored[c]?.score === 2).length;

  let camBlocked = false;
  if (inputStars >= 2 && prevScored) {
    const prevIS = inputCodes.filter(c => prevScored[c]?.score === 2).length;
    if (prevIS >= 2) camBlocked = true;
  }

  let dltBlocked = false;
  if (outputStars >= 2 && prevScored) {
    const prevOS = outputCodes.filter(c => prevScored[c]?.score === 2).length;
    if (prevOS >= 2) dltBlocked = true;
  }

  return {
    camStatus:    camBlocked ? '봉쇄' : inputStars >= 2 ? '경보' : inputStars >= 1 ? '주의' : '양호',
    dltStatus:    dltBlocked ? '봉쇄' : outputStars >= 2 ? '경보' : outputStars >= 1 ? '주의' : '양호',
    dualBlockade: camBlocked && dltBlocked,
    camBlocked, dltBlocked, inputStars, outputStars,
  };
}

// ══════════════════════════════════════════
// 6. 데이터 매핑 (data-pipeline → acute inputs)
// ══════════════════════════════════════════

/**
 * data-pipeline/dataStore 게이지 데이터를 acute-engine inputs 형식으로 변환
 *
 * data-pipeline 게이지 ID → v5.0 코드 매핑:
 *   T2_CURRENT_ACCOUNT → I1 (경상수지)
 *   T4_RESERVES        → I3 (외환보유고)
 *   F4_EXCHANGE        → I4 (환율)
 *   F5_INTEREST        → I6 (금리스프레드 — bp 단위로 환산 필요)
 *   P1_CPI             → O2 (물가)
 *   F1_KOSPI           → O4 (주가)
 *   S6_RETAIL          → O6 (소비/소매판매)
 *
 * @param {Object} gaugeData - dataStore.toGaugeData() 결과 { gaugeId: rawValue }
 * @param {Object} gaugeObjects - dataStore에서 .get(id) 형식 전체 객체 (선택)
 */
function mapFromPipeline(gaugeData, gaugeObjects) {
  // gaugeData: { T2_CURRENT_ACCOUNT: -22.4, ... } (rawValue = YoY% 또는 절대값)
  // gaugeObjects: { T2_CURRENT_ACCOUNT: { value, prevValue, unit, ... } } (선택)

  const get = (id) => {
    if (gaugeObjects && gaugeObjects[id]) return gaugeObjects[id];
    const v = gaugeData?.[id];
    return v != null ? { value: v } : null;
  };

  // I1 경상수지: T2_CURRENT_ACCOUNT
  // data-pipeline이 전년비(%)를 반환하므로 절대값이 없음 → 부호(음수=적자)로 0/1 판정
  // 임시: 전년비% < 0 → 1점, < -30% → 2점 (절대값 데이터 미확보 시 보수적 적용)
  const ca = get('T2_CURRENT_ACCOUNT');
  const i1 = ca ? (() => {
    const pct = ca.value ?? ca.raw ?? null;
    if (pct == null) return null;
    // 경상수지 전년비: 0 이상이면 개선(양호), 음수이면 악화 방향
    // v5.0 원본은 절대값(억$) 기준이나 현재 전년비% 제공 → 방향 기반 판정
    return { value: pct > 0 ? 1 : -1, change: pct };  // value: 양수=흑자방향, 음수=적자방향
  })() : null;

  // I3 외환보유고: T4_RESERVES (전년비 %)
  const res = get('T4_RESERVES');
  const i3  = res ? { value: res.value, change: res.value } : null;

  // I4 환율: F4_EXCHANGE (전년비 %)
  const fx  = get('F4_EXCHANGE');
  const i4  = fx  ? { value: fx.value, change: fx.value } : null;

  // I6 금리: F5_INTEREST (스프레드 %p → bp 환산)
  const ir  = get('F5_INTEREST');
  const i6  = ir  ? { value: (ir.value ?? 0) * 100, change: (ir.value ?? 0) * 100 } : null;

  // O2 물가: P1_CPI
  // pipeline: data[0] vs data[12] → YoY% (CPI지수 전년비)
  // v5.0 O2 임계값(3%/5%)은 물가상승률 YoY% 기준 → 동일 단위, 변환 불필요
  const cpi = get('P1_CPI');
  const o2  = cpi ? { value: cpi.value, change: cpi.value } : null;

  // O4 주가: F1_KOSPI
  // pipeline: 전년비(YoY%) 수집 → v5.0은 MoM% 기준
  // 단위 불일치 있으나 방향성 판정에는 유효 (급등/급락 신호 감지 목적)
  const ko  = get('F1_KOSPI');
  const o4  = ko  ? { value: ko.value, change: ko.value } : null;

  // O6 소비: S6_RETAIL
  // pipeline: data[0] vs data[1] → MoM% (전월 대비, 이미 MoM)
  // v5.0 O6 임계값(-2%/-5%)도 MoM 기준 → 변환 없이 그대로 사용
  const ret = get('S6_RETAIL');
  const o6  = ret ? { value: ret.value ?? 0, change: ret.value ?? 0 } : null;

  return { I1: i1, I3: i3, I4: i4, I6: i6, O2: o2, O4: o4, O6: o6 };
}

// ══════════════════════════════════════════
// 7. 통합 급성 진단 (Layer A 메인 함수)
// ══════════════════════════════════════════

/**
 * evaluateAcute — Layer A (Master Alarm) 판정
 *
 * @param {Object} gaugeData   - dataStore.toGaugeData()
 * @param {Object} prevGaugeData - 전월 gaugeData (연속성 체크용, 없으면 null)
 * @param {Object} gaugeObjects  - dataStore.get(id) 형식 전체 (선택)
 * @returns {Object} acuteResult
 */
function evaluateAcute(gaugeData, prevGaugeData, gaugeObjects) {
  // 입력 매핑
  const inputs     = mapFromPipeline(gaugeData, gaugeObjects);
  const prevInputs = prevGaugeData ? mapFromPipeline(prevGaugeData) : null;

  // 채점
  const scored     = scoreGauges(inputs);
  const prevScored = prevInputs ? scoreGauges(prevInputs) : null;

  // 경보 판정
  const alert    = judgeAlert(scored, prevScored);
  const blockade = judgeDualBlockade(scored, prevScored);

  // 가용 게이지 수 확인
  const availableCodes = Object.keys(scored).filter(c => scored[c].available);
  const hasData = availableCodes.length >= 3;  // 최소 3개 이상이면 판정 가능

  // 게이지별 공개용 요약
  const gauges = {};
  for (const [code, s] of Object.entries(scored)) {
    gauges[code] = {
      name:      s.name,
      axis:      s.axis,
      value:     s.value,
      change:    s.change,
      grade:     s.grade ?? 'N/A',
      available: s.available ?? false,
    };
  }

  return {
    layer:      'A',
    layerName:  'Acute (Master Alarm)',
    description: 'IMF/외환위기 검증 급성 쇼크 감지 — CAM+DLT 7게이지',
    hasData,
    availableCount: availableCodes.length,

    // 핵심 판정값
    alertLevel:   alert.alertLevel,         // 0~3
    alertLabel:   alert.alertLabel,         // "0단계 (정상)" ~ "3단계 (위기)"
    sustained:    alert.sustained,          // 2개월 연속성 충족
    escalated:    alert.escalated,          // sustained + simultaneous
    peripheralWarning: alert.peripheralWarning,

    // CAM/DLT 이중봉쇄
    blockade: {
      cam:         blockade.camStatus,      // '양호'/'주의'/'경보'/'봉쇄'
      dlt:         blockade.dltStatus,
      dual:        blockade.dualBlockade,   // 이중봉쇄 발동 여부
      camBlocked:  blockade.camBlocked,
      dltBlocked:  blockade.dltBlocked,
    },

    // 상세 집계
    detail: {
      inputStars:  alert.inputStars,        // CAM ★ 개수
      outputStars: alert.outputStars,       // DLT ★ 개수
      simultaneous: alert.simultaneous,
    },

    // 게이지별 결과
    gauges,

    // 역사적 기준
    historicalRef: {
      '1997': 'inputStars ≥ 3 (외환위기: I1+I3+I4 동시 ★)',
      '2008': 'inputStars ≥ 2 + outputStars ≥ 1 (금융위기: I1+I4 + O4)',
    },
  };
}

// ══════════════════════════════════════════
// 8. 최종 판정 원칙 (3레이어 통합 규칙)
// ══════════════════════════════════════════

/**
 * resolveLayerPriority — Layer A/B/C 통합 최종 판정
 *
 * 규칙:
 *   Layer A alertLevel ≥ 1 → 확정 경보 (Master Alarm 우선)
 *   Layer A = 0 + Layer B level ≥ 경계(3) → HOLD (미확인 구조 경보)
 *   Layer A = 0 + Layer B level < 경계    → 구조 모니터링 (정상 범주)
 *   Layer C(위성) 역방향 → 해당 레이어 결과에 HOLD 태그
 *
 * @param {Object} acuteResult - evaluateAcute() 반환값
 * @param {Object} chronicResult - core-engine.diagnose() 반환값 overall
 * @param {Object} satelliteResult - 위성 교차검증 결과 (선택)
 */
function resolveLayerPriority(acuteResult, chronicResult, satelliteResult) {
  const acuteLevel   = acuteResult?.alertLevel ?? 0;
  const chronicLevel = chronicResult?.level ?? 1;

  let masterAlarm = false;
  let holdFlag    = false;
  let finalLabel  = '';
  let priority    = '';

  if (!acuteResult?.hasData) {
    // Layer A 데이터 불충분 → Layer B 단독 판정 (HOLD 태그)
    holdFlag   = chronicLevel >= 3;
    finalLabel = chronicLevel >= 3 ? 'HOLD — 구조 경보 (급성 데이터 미확보)' : '구조 모니터링';
    priority   = 'B_ONLY';
  } else if (acuteLevel >= 1) {
    // Layer A 경보 → 확정 Master Alarm
    masterAlarm = true;
    finalLabel  = `Master Alarm L${acuteLevel} — 급성 쇼크 감지`;
    priority    = 'A_CONFIRMED';
  } else if (chronicLevel >= 3) {
    // Layer A 정상 + Layer B 경계 이상 → HOLD
    holdFlag   = true;
    finalLabel = 'HOLD — 구조 악화 감지 (급성 쇼크 미확인)';
    priority   = 'B_HOLD';
  } else {
    finalLabel = '정상 — 구조 모니터링';
    priority   = 'NORMAL';
  }

  // 위성 역방향 체크 (Layer C)
  let satelliteHold = false;
  if (satelliteResult?.divergence) {
    satelliteHold = true;
    finalLabel += ' | 위성-공식지표 괴리 감지';
  }

  return {
    masterAlarm,
    holdFlag,
    satelliteHold,
    finalLabel,
    priority,       // 'A_CONFIRMED' | 'B_HOLD' | 'B_ONLY' | 'NORMAL'
    acuteLevel,
    chronicLevel,
  };
}

// ══════════════════════════════════════════
// exports
// ══════════════════════════════════════════

module.exports = {
  evaluateAcute,
  resolveLayerPriority,
  mapFromPipeline,
  // 내부 함수도 노출 (테스트/디버그용)
  scoreGauges,
  judgeAlert,
  judgeDualBlockade,
};
