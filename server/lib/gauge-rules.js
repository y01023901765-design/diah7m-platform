'use strict';
/**
 * DIAH-7M 게이지 규칙 사전 (SSOT)
 * ════════════════════════════════════════════════════════════════
 * 이 파일이 모든 게이지의 단일 진실 공급원(Single Source of Truth)입니다.
 *
 * 각 게이지 항목:
 *   source       — 데이터 출처 (ECOS/FRED/TRADINGECONOMICS/SATELLITE/DERIVED)
 *   statCode     — ECOS statCode (ECOS 전용)
 *   itemCode     — ECOS itemCode1 (ECOS 전용)
 *   itemCode2    — ECOS itemCode2 (2레벨 통계 전용)
 *   series       — FRED series ID (FRED 전용)
 *   teSlug       — TradingEconomics URL slug (TE 전용)
 *   transformType — 변환 방식
 *     'MoM_pct'   : (latest - prev) / prev * 100  (전월비%)
 *     'YoY_pct'   : (latest - yearAgo) / yearAgo * 100  (전년비%, data[12])
 *     'MoM_diff'  : latest - prev  (전월차, 포인트 차이)
 *     'absolute'  : 원본값 그대로
 *     'derived'   : 다른 게이지 계산값
 *     'satellite' : 위성 수집값
 *     'te_direct' : TradingEconomics 직접값
 *   unit         — 판정에 사용되는 값의 단위
 *   hardRange    — [min, max] 물리적으로 불가능한 값 차단 범위
 *                  이 범위를 벗어나면 NO_DATA 처리
 *   threshold    — { min, max, invert } 정규화 기준 (core-engine용)
 *     invert:false = 높을수록 좋음 (min이 최악, max가 최적)
 *     invert:true  = 높을수록 나쁨 (max가 최악, min이 최적)
 *   name         — 한글 표시명
 *
 * 수정 규칙:
 *   1. 소스 변경 → statCode/itemCode/series/teSlug 여기서 수정
 *   2. 단위 변경 → unit + hardRange + threshold 동시 수정
 *   3. transform 방식 변경 → transformType 수정 후 data-pipeline.js transform 함수도 수정
 *   4. data-pipeline.js / core-engine.js 는 이 파일을 참조만 함
 *
 * © DIAH-7M / 2026
 */

const GAUGE_RULES = {

  // ══════════════════════════════════════════════════════
  // O축 — 산업/생산 (7개)
  // ══════════════════════════════════════════════════════
  O1_EXPORT: {
    source: 'ECOS', statCode: '301Y017', itemCode: 'SA110', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '수출(전월비%)',
    hardRange: [-50, 100],
    threshold: { min: -10, max: 15, invert: false },
  },
  O2_PMI: {
    source: 'TRADINGECONOMICS', teSlug: 'south-korea/manufacturing-pmi',
    transformType: 'te_direct', unit: 'pt', name: '한국 제조업 PMI',
    hardRange: [0, 100],
    threshold: { min: 45, max: 56, invert: false },
  },
  O3_IP: {
    source: 'ECOS', statCode: '901Y033', itemCode: 'A00', itemCode2: '1', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '산업생산(전월비%)',
    hardRange: [-50, 50],
    threshold: { min: -15, max: 10, invert: false },
  },
  O4_CAPACITY: {
    source: 'ECOS', statCode: '901Y035', itemCode: 'I32A', itemCode2: 'I11B', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '가동률(전월비%)',
    hardRange: [-30, 30],
    threshold: { min: -15, max: 5, invert: false },
  },
  O5_INVENTORY: {
    source: 'ECOS', statCode: '901Y032', itemCode: 'I11A', itemCode2: '5', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '재고(전월비%)',
    hardRange: [-30, 50],
    threshold: { min: -10, max: 10, invert: true },
  },
  O6_SHIPMENT: {
    source: 'ECOS', statCode: '901Y032', itemCode: 'I11A', itemCode2: '3', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '출하(전월비%)',
    hardRange: [-50, 50],
    threshold: { min: -15, max: 10, invert: false },
  },
  O7_ORDER: {
    source: 'ECOS', statCode: '901Y032', itemCode: 'I11A', itemCode2: '1', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '수주(전월비%)',
    hardRange: [-50, 50],
    threshold: { min: -15, max: 10, invert: false },
  },

  // ══════════════════════════════════════════════════════
  // F축 — 금융안정 (8개)
  // ══════════════════════════════════════════════════════
  F1_KOSPI: {
    source: 'ECOS', statCode: '802Y001', itemCode: '0001000', cycle: 'D',
    transformType: 'MoM_pct', unit: '%', name: 'KOSPI(전일비%)',
    hardRange: [-30, 30],
    threshold: { min: -15, max: 15, invert: false },
  },
  F2_KOSDAQ: {
    source: 'ECOS', statCode: '802Y001', itemCode: '0089000', cycle: 'D',
    transformType: 'MoM_pct', unit: '%', name: 'KOSDAQ(전일비%)',
    hardRange: [-30, 30],
    threshold: { min: -15, max: 15, invert: false },
  },
  F3_KOSPI_VOL: {
    source: 'ECOS', statCode: '802Y001', itemCode: '0087000', cycle: 'D',
    transformType: 'MoM_pct', unit: '%', name: 'KOSPI거래량(전일비%)',
    hardRange: [-80, 200],
    threshold: { min: -20, max: 50, invert: true },
  },
  F4_EXCHANGE: {
    source: 'ECOS', statCode: '731Y004', itemCode: '0000001', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '환율변화율(전월비%)',
    hardRange: [-20, 20],
    threshold: { min: -5, max: 5, invert: true },
  },
  F5_INTEREST: {
    source: 'ECOS', statCode: '722Y001', itemCode: '0101000', cycle: 'M',
    transformType: 'MoM_diff', unit: '%p', name: '금리변화(%p)',
    hardRange: [-3, 3],
    threshold: { min: -2, max: 2, invert: false },
  },
  F6_M2: {
    source: 'ECOS', statCode: '102Y004', itemCode: 'ABA1', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: 'M2증가율(전월비%)',
    hardRange: [-10, 20],
    threshold: { min: -5, max: 10, invert: false },
  },
  F7_KOSDAQ_VOL: {
    source: 'ECOS', statCode: '802Y001', itemCode: '0090000', cycle: 'D',
    transformType: 'MoM_pct', unit: '%', name: 'KOSDAQ거래량(전일비%)',
    hardRange: [-80, 200],
    threshold: { min: -20, max: 50, invert: true },
  },
  F8_FOREIGN: {
    source: 'ECOS', statCode: '802Y001', itemCode: '0030000', cycle: 'D',
    transformType: 'absolute', unit: '백만원', name: '외국인순매수',
    hardRange: [-200000, 200000],
    threshold: { min: -20000, max: 20000, invert: false },
  },

  // ══════════════════════════════════════════════════════
  // S축 — 심리/정책 (7개)
  // ══════════════════════════════════════════════════════
  S1_BSI: {
    source: 'ECOS', statCode: '901Y067', itemCode: 'I16A', cycle: 'M',
    transformType: 'MoM_diff', unit: 'pt차', name: 'BSI(100 기준 편차)',
    // transform: latest - 100 (전월차 아니라 100 기준 편차)
    hardRange: [-60, 60],
    threshold: { min: -10, max: 20, invert: false },
  },
  S2_CSI: {
    source: 'ECOS', statCode: '511Y002', itemCode: 'FME', cycle: 'M',
    transformType: 'MoM_diff', unit: 'pt차', name: '소비자심리(전월차)',
    hardRange: [-30, 30],
    threshold: { min: -5, max: 5, invert: false },
  },
  S3_NIGHTLIGHT: {
    source: 'SATELLITE', api: 'fetchVIIRS',
    transformType: 'satellite', unit: '%', name: '야간광(anomaly%)',
    hardRange: [-80, 80],
    threshold: { min: -20, max: 20, invert: false },
  },
  S4_CREDIT: {
    source: 'DERIVED', deps: ['F5_INTEREST', 'F1_KOSPI'],
    transformType: 'derived', unit: '%p', name: '신용스프레드',
    hardRange: [-10, 10],
    threshold: { min: -1, max: 2, invert: true },
  },
  S5_EMPLOY: {
    source: 'ECOS', statCode: '901Y027', itemCode: 'I61BA', itemCode2: 'I28A', cycle: 'M',
    transformType: 'MoM_diff', unit: '천명', name: '취업자증감(전월차)',
    hardRange: [-1000, 1000],
    threshold: { min: -500, max: 500, invert: false },
  },
  S6_RETAIL: {
    source: 'ECOS', statCode: '901Y033', itemCode: 'AC00', itemCode2: '1', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '소매판매(전월비%)',
    hardRange: [-30, 30],
    threshold: { min: -10, max: 10, invert: false },
  },
  S7_HOUSING: {
    source: 'ECOS', statCode: '901Y064', itemCode: 'P65A', cycle: 'M',
    transformType: 'YoY_pct', unit: '%', name: '주택매매가격(전년비%)',
    hardRange: [-30, 30],
    threshold: { min: -10, max: 5, invert: false },
  },

  // ══════════════════════════════════════════════════════
  // P축 — 물가/재정 (6개)
  // ══════════════════════════════════════════════════════
  P1_CPI: {
    source: 'ECOS', statCode: '901Y009', itemCode: '0', cycle: 'M',
    transformType: 'YoY_pct', unit: '%', name: 'CPI(전년비%)',
    hardRange: [-5, 15],
    threshold: { min: -3, max: 5, invert: true },
  },
  P2_PPI: {
    source: 'ECOS', statCode: '404Y014', itemCode: '*AA', cycle: 'M',
    transformType: 'YoY_pct', unit: '%', name: 'PPI(전년비%)',
    hardRange: [-10, 20],
    threshold: { min: -5, max: 5, invert: true },
  },
  P3_OIL: {
    source: 'FRED', series: 'DCOILWTICO',
    transformType: 'MoM_pct', unit: '%', name: '유가(전월비%)',
    hardRange: [-50, 100],
    threshold: { min: -30, max: 30, invert: true },
  },
  P4_COMMODITY: {
    // 수출물가지수 전년비% — ECOS 301Y016/100
    // (구 P4는 T2_CURRENT_ACCOUNT와 같은 소스였으나 2026-02 교체)
    source: 'ECOS', statCode: '301Y016', itemCode: '100', cycle: 'M',
    transformType: 'YoY_pct', unit: '%', name: '수출물가지수(전년비%)',
    hardRange: [-30, 30],
    threshold: { min: -20, max: 20, invert: false },
  },
  P5_IMPORT: {
    source: 'ECOS', statCode: '403Y003', itemCode: '*AA', cycle: 'M',
    transformType: 'YoY_pct', unit: '%', name: '수입물가(전년비%)',
    hardRange: [-30, 50],
    threshold: { min: -5, max: 5, invert: true },
  },
  P6_EXPORT_PRICE: {
    source: 'ECOS', statCode: '403Y001', itemCode: '*AA', cycle: 'M',
    transformType: 'YoY_pct', unit: '%', name: '수출물가(전년비%)',
    hardRange: [-30, 30],
    threshold: { min: -5, max: 5, invert: false },
  },

  // ══════════════════════════════════════════════════════
  // R축 — 에너지/대외 (7개, R5 없음)
  // ══════════════════════════════════════════════════════
  R1_ELECTRICITY: {
    source: 'ECOS', statCode: '901Y032', itemCode: 'I11AD', itemCode2: '1', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '전기가스수도업생산(전월비%)',
    hardRange: [-30, 30],
    threshold: { min: -5, max: 5, invert: false },
  },
  R2_WATER: {
    source: 'ECOS', statCode: '901Y038', itemCode: 'I51AAC', itemCode2: '1', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '수도업생산(전월비%)',
    hardRange: [-40, 40],
    threshold: { min: -10, max: 5, invert: false },
  },
  R3_GAS: {
    source: 'ECOS', statCode: '901Y032', itemCode: 'I11ADA', itemCode2: '1', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '전기가스증기공급업생산(전월비%)',
    hardRange: [-30, 30],
    threshold: { min: -5, max: 5, invert: false },
  },
  R4_COAL: {
    source: 'ECOS', statCode: '901Y032', itemCode: 'I11ABA', itemCode2: '1', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '석탄원유천연가스광업생산(전월비%)',
    hardRange: [-50, 50],
    threshold: { min: -20, max: 10, invert: false },
  },
  R6_UHI: {
    source: 'SATELLITE', api: 'fetchLandsat',
    transformType: 'satellite', unit: '°C', name: '도시열섬(전년동기비 °C)',
    hardRange: [-5, 5],
    threshold: { min: -2, max: 0.15, invert: true },
  },
  R7_WASTE: {
    source: 'ECOS', statCode: '901Y038', itemCode: 'I51AAB', itemCode2: '1', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '폐기물처리업생산(전월비%)',
    hardRange: [-50, 50],
    threshold: { min: -20, max: 5, invert: false },
  },
  R8_FOREST: {
    source: 'ECOS', statCode: '901Y027', itemCode: 'I61BAAA', itemCode2: 'I28A', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '농림어업취업(전월비%)',
    hardRange: [-30, 30],
    threshold: { min: -10, max: 5, invert: false },
  },

  // ══════════════════════════════════════════════════════
  // I축 — 건설/제조 (7개)
  // ══════════════════════════════════════════════════════
  I1_CONSTRUCTION: {
    source: 'ECOS', statCode: '901Y033', itemCode: 'AD00', itemCode2: '1', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '건설업생산(전월비%)',
    hardRange: [-50, 50],
    threshold: { min: -15, max: 10, invert: false },
  },
  I2_CEMENT: {
    source: 'ECOS', statCode: '901Y032', itemCode: 'I11ACN', itemCode2: '1', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '비금속광물제품생산(전월비%)',
    hardRange: [-50, 50],
    threshold: { min: -20, max: 10, invert: false },
  },
  I3_STEEL: {
    source: 'ECOS', statCode: '901Y032', itemCode: 'I11ACO', itemCode2: '1', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '1차금속생산(전월비%)',
    hardRange: [-50, 50],
    threshold: { min: -15, max: 10, invert: false },
  },
  I4_VEHICLE: {
    source: 'ECOS', statCode: '901Y032', itemCode: 'I11ACU', itemCode2: '1', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '자동차및트레일러생산(전월비%)',
    hardRange: [-50, 50],
    threshold: { min: -15, max: 15, invert: false },
  },
  I5_CARGO: {
    source: 'ECOS', statCode: '301Y014', itemCode: 'SC0000', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '화물운송수지(전월비%)',
    hardRange: [-80, 500],
    threshold: { min: -20, max: 300, invert: false },
  },
  I6_AIRPORT: {
    source: 'ECOS', statCode: '301Y014', itemCode: 'SCB000', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '항공운송수지(전월비%)',
    hardRange: [-80, 200],
    threshold: { min: -30, max: 30, invert: false },
  },
  I7_RAILROAD: {
    source: 'ECOS', statCode: '901Y027', itemCode: 'I61BAAEB', itemCode2: 'I28A', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '운수창고업취업(전월비%)',
    hardRange: [-30, 30],
    threshold: { min: -10, max: 10, invert: false },
  },

  // ══════════════════════════════════════════════════════
  // T축 — 대외거래 (6개)
  // ══════════════════════════════════════════════════════
  T1_TRADE_BALANCE: {
    source: 'ECOS', statCode: '301Y017', itemCode: 'SA000', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '무역수지(전월비%)',
    hardRange: [-200, 200],
    threshold: { min: -20, max: 20, invert: false },
  },
  T2_CURRENT_ACCOUNT: {
    // 경상수지 억$ 원본값 — ECOS 301Y014/000 (정론 기준)
    source: 'ECOS', statCode: '301Y014', itemCode: '000', cycle: 'M',
    transformType: 'absolute', unit: '억$', name: '경상수지(억$)',
    hardRange: [-200, 500],
    threshold: { min: -30, max: 100, invert: false },
  },
  T3_FDI: {
    source: 'ECOS', statCode: '301Y014', itemCode: 'S00000', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '서비스수지(전월비%)',
    hardRange: [-100, 200],
    threshold: { min: -30, max: 30, invert: false },
  },
  T4_RESERVES: {
    source: 'ECOS', statCode: '732Y001', itemCode: '99', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '외환보유고(전월비%)',
    // transform: (latest/1000 - prev/1000) / (prev/1000) * 100
    hardRange: [-10, 10],
    threshold: { min: -5, max: 5, invert: false },
  },
  T5_SHIPPING: {
    // 해상운송수지(전월비%) — ECOS 301Y014/SCA000
    // (I5_CARGO SC0000 중복 해소: SCA000 해상운송 전체로 교체)
    source: 'ECOS', statCode: '301Y014', itemCode: 'SCA000', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '해상운송수지(전월비%)',
    hardRange: [-80, 500],
    threshold: { min: -20, max: 300, invert: false },
  },
  T6_CONTAINER: {
    // 선박수출액(전월비%) — ECOS 301Y017/SA200
    // (O1_EXPORT SA110 중복 해소: SA200 선박 품목으로 교체)
    source: 'ECOS', statCode: '301Y017', itemCode: 'SA200', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '선박수출액(전월비%)',
    hardRange: [-80, 300],
    threshold: { min: -10, max: 15, invert: false },
  },

  // ══════════════════════════════════════════════════════
  // E축 — 글로벌 외부 (5개)
  // ══════════════════════════════════════════════════════
  E1_CHINA_PMI: {
    source: 'TRADINGECONOMICS', teSlug: 'china/manufacturing-pmi',
    transformType: 'te_direct', unit: 'pt', name: '중국 제조업 PMI',
    hardRange: [0, 100],
    threshold: { min: 48, max: 54, invert: false },
  },
  E2_US_PMI: {
    source: 'TRADINGECONOMICS', teSlug: 'united-states/manufacturing-pmi',
    transformType: 'te_direct', unit: 'pt', name: '미국 제조업 PMI',
    hardRange: [0, 100],
    threshold: { min: 45, max: 60, invert: false },
  },
  E3_VIX: {
    source: 'FRED', series: 'VIXCLS',
    transformType: 'MoM_pct', unit: '%', name: 'VIX변화율(전월비%)',
    hardRange: [-80, 300],
    threshold: { min: -10, max: 20, invert: true },
  },
  E4_DOLLAR_INDEX: {
    source: 'FRED', series: 'DTWEXBGS',
    transformType: 'MoM_pct', unit: '%', name: '달러인덱스변화(전월비%)',
    hardRange: [-15, 15],
    threshold: { min: -3, max: 3, invert: true },
  },
  E5_BALTIC: {
    source: 'TRADINGECONOMICS', teSlug: 'commodity/baltic',
    transformType: 'te_direct', unit: 'pt', name: '발틱건화물지수(BDI)',
    hardRange: [0, 15000],
    threshold: { min: 500, max: 3000, invert: false },
  },

  // ══════════════════════════════════════════════════════
  // L축 — 고용/가계 (5개)
  // ══════════════════════════════════════════════════════
  L1_UNEMPLOYMENT: {
    source: 'ECOS', statCode: '901Y027', itemCode: 'I61BC', itemCode2: 'I28A', cycle: 'M',
    transformType: 'MoM_diff', unit: '%p', name: '실업률변화(%p)',
    hardRange: [-3, 3],
    threshold: { min: -1, max: 2, invert: true },
  },
  L2_PARTICIPATION: {
    source: 'ECOS', statCode: '901Y027', itemCode: 'I61D', itemCode2: 'I28A', cycle: 'M',
    transformType: 'MoM_diff', unit: '%p', name: '경활률변화(%p)',
    hardRange: [-3, 3],
    threshold: { min: -2, max: 2, invert: false },
  },
  L3_WAGE: {
    source: 'ECOS', statCode: '901Y027', itemCode: 'I61BACB', itemCode2: 'I28A', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '임금(전월비%)',
    hardRange: [-20, 30],
    threshold: { min: -3, max: 5, invert: false },
  },
  L4_HOURS: {
    source: 'ECOS', statCode: '901Y027', itemCode: 'I61E', itemCode2: 'I28A', cycle: 'M',
    transformType: 'MoM_pct', unit: '%', name: '근로시간(전월비%)',
    hardRange: [-20, 20],
    threshold: { min: -5, max: 3, invert: false },
  },
  L5_YOUTH_UNEMP: {
    // 청년실업자수 절대값(천명) — ECOS 901Y027/I61BB
    source: 'ECOS', statCode: '901Y027', itemCode: 'I61BB', itemCode2: 'I28A', cycle: 'M',
    transformType: 'absolute', unit: '천명', name: '청년실업자수(천명)',
    hardRange: [0, 2000],
    threshold: { min: 200, max: 800, invert: true },
  },
};

// ══════════════════════════════════════════════════════
// validateGauge() — pipeline 공통 검문 함수
// ══════════════════════════════════════════════════════

/**
 * 게이지 값을 검증하고 표준화된 결과를 반환합니다.
 *
 * 검증 순서:
 *   1. null/undefined → NO_DATA (missing)
 *   2. NaN/Infinity → NO_DATA (non_finite)
 *   3. 숫자가 아닌 타입 → NO_DATA (invalid_type)
 *   4. hardRange 이탈 → NO_DATA (range_violation)
 *   5. 통과 → OK
 *
 * @param {string} id - 게이지 ID
 * @param {*} value - transform 결과값
 * @returns {{ ok: boolean, status: 'OK'|'NO_DATA', reason: string|null, value: number|null, rawValue: *|null }}
 */
function validateGauge(id, value) {
  // 1. null/undefined
  if (value == null) {
    return { ok: false, status: 'NO_DATA', reason: 'missing', value: null, rawValue: value };
  }

  // 2. NaN / Infinity
  const num = Number(value);
  if (!Number.isFinite(num)) {
    console.warn(`[validateGauge] ${id}: non_finite (${value})`);
    return { ok: false, status: 'NO_DATA', reason: 'non_finite', value: null, rawValue: value };
  }

  // 3. 숫자가 아닌 타입 (위 Number() 변환 실패 케이스 포함)
  if (typeof value !== 'number' && typeof value !== 'string') {
    console.warn(`[validateGauge] ${id}: invalid_type (${typeof value})`);
    return { ok: false, status: 'NO_DATA', reason: 'invalid_type', value: null, rawValue: value };
  }

  // 4. hardRange 검사
  const rule = GAUGE_RULES[id];
  if (rule && rule.hardRange) {
    const [min, max] = rule.hardRange;
    if (num < min || num > max) {
      console.warn(`[validateGauge] ${id}: range_violation (${num} not in [${min}, ${max}])`);
      return { ok: false, status: 'NO_DATA', reason: 'range_violation', value: null, rawValue: num };
    }
  }

  // 5. 통과
  return { ok: true, status: 'OK', reason: null, value: num, rawValue: num };
}

module.exports = { GAUGE_RULES, validateGauge };
