/**
 * DIAH-7M Global Indicator Mapping
 * ═══════════════════════════════════════════
 * 
 * 한국: 59게이지 (ECOS 심층)
 * 글로벌 42개국: 20게이지 (World Bank + OECD + IMF 라이트)
 * 
 * 각 게이지는 9축 인체시스템에 매핑됨
 * 
 * 데이터 소스 우선순위:
 *   1. OECD (38개국, 월간/분기, 최신)
 *   2. World Bank (200+국, 연간/분기, 약간 지연)
 *   3. IMF (190+국, 연간/분기, 백업)
 */

'use strict';

// ═══════════════════════════════════════════
// 글로벌 게이지 정의 (20개 — 라이트 버전)
// ═══════════════════════════════════════════
const GLOBAL_GAUGES = {

  // ── AX1: 순환계 (Financial Flow) ──
  G_I1: {
    axis: 'AX1', name: { en: 'Policy Interest Rate', ko: '기준금리' },
    bodyMetaphor: 'heart_rate',
    sources: [
      { provider: 'OECD', dataset: 'OECD.SDD.STES,DSD_STES@DF_FINMARK', measure: 'IR3TIB', freq: 'M' },
      { provider: 'WB', indicator: 'FR.INR.RINR', freq: 'A' },
      { provider: 'IMF', indicator: 'NGDP_RPCH', freq: 'A' }, // fallback
    ],
    unit: '%', direction: 'neutral', // 높다고 나쁜 게 아님
  },
  G_I2: {
    axis: 'AX1', name: { en: 'Exchange Rate (vs USD)', ko: '대미달러 환율' },
    bodyMetaphor: 'blood_pressure',
    sources: [
      { provider: 'WB', indicator: 'PA.NUS.FCRF', freq: 'A' },
      { provider: 'OECD', dataset: 'OECD.SDD.STES,DSD_STES@DF_FINMARK', measure: 'CCUSMA02', freq: 'M' },
    ],
    unit: 'LCU/USD', direction: 'neutral',
  },
  G_I3: {
    axis: 'AX1', name: { en: 'Broad Money (M2/M3)', ko: '통화량' },
    bodyMetaphor: 'blood_volume',
    sources: [
      { provider: 'WB', indicator: 'FM.LBL.BMNY.GD.ZS', freq: 'A' },
    ],
    unit: '% of GDP', direction: 'higher_cautious',
  },

  // ── AX2: 호흡계 (Trade) ──
  G_E1: {
    axis: 'AX2', name: { en: 'Exports of Goods & Services', ko: '수출' },
    bodyMetaphor: 'exhale',
    sources: [
      { provider: 'WB', indicator: 'NE.EXP.GNFS.CD', freq: 'A' },
      { provider: 'OECD', dataset: 'OECD.SDD.TPS,DSD_BOP@DF_BOP', measure: 'XTOT', freq: 'Q' },
    ],
    unit: 'USD', direction: 'higher_better',
  },
  G_E2: {
    axis: 'AX2', name: { en: 'Imports of Goods & Services', ko: '수입' },
    bodyMetaphor: 'inhale',
    sources: [
      { provider: 'WB', indicator: 'NE.IMP.GNFS.CD', freq: 'A' },
    ],
    unit: 'USD', direction: 'neutral',
  },
  G_E3: {
    axis: 'AX2', name: { en: 'Current Account Balance', ko: '경상수지' },
    bodyMetaphor: 'oxygen_balance',
    sources: [
      { provider: 'WB', indicator: 'BN.CAB.XOKA.CD', freq: 'A' },
      { provider: 'OECD', dataset: 'OECD.SDD.TPS,DSD_BOP@DF_BOP', measure: 'B1', freq: 'Q' },
      { provider: 'IMF', indicator: 'BCA', freq: 'A' },
    ],
    unit: 'USD', direction: 'higher_better',
  },

  // ── AX3: 소화계 (Consumption) ──
  G_C1: {
    axis: 'AX3', name: { en: 'Household Consumption', ko: '가계소비' },
    bodyMetaphor: 'digestion',
    sources: [
      { provider: 'WB', indicator: 'NE.CON.PRVT.ZS', freq: 'A' },
    ],
    unit: '% of GDP', direction: 'neutral',
  },
  G_C2: {
    axis: 'AX3', name: { en: 'Consumer Confidence', ko: '소비자신뢰지수' },
    bodyMetaphor: 'appetite',
    sources: [
      { provider: 'OECD', dataset: 'OECD.SDD.STES,DSD_STES@DF_STES', measure: 'CSCICP03', freq: 'M' },
    ],
    unit: 'index', direction: 'higher_better',
  },

  // ── AX4: 신경계 (Policy/Leading) ──
  G_S1: {
    axis: 'AX4', name: { en: 'Composite Leading Indicator', ko: '경기선행지수' },
    bodyMetaphor: 'nerve_signal',
    sources: [
      { provider: 'OECD', dataset: 'OECD.SDD.STES,DSD_STES@DF_CLI', measure: 'LI', freq: 'M' },
    ],
    unit: 'index (100=trend)', direction: 'higher_better',
    critical: true, // 핵심 선행지표
  },
  G_S2: {
    axis: 'AX4', name: { en: 'Government Expenditure', ko: '정부지출' },
    bodyMetaphor: 'brain_command',
    sources: [
      { provider: 'WB', indicator: 'NE.CON.GOVT.ZS', freq: 'A' },
      { provider: 'IMF', indicator: 'GGX_NGDP', freq: 'A' },
    ],
    unit: '% of GDP', direction: 'neutral',
  },

  // ── AX5: 면역계 (Financial Stability) ──
  G_F1: {
    axis: 'AX5', name: { en: 'Stock Market Index', ko: '주가지수' },
    bodyMetaphor: 'immune_strength',
    sources: [
      { provider: 'OECD', dataset: 'OECD.SDD.STES,DSD_STES@DF_FINMARK', measure: 'SPASTT01', freq: 'M' },
    ],
    unit: 'index', direction: 'higher_better',
  },
  G_F2: {
    axis: 'AX5', name: { en: 'Government Debt', ko: '정부부채' },
    bodyMetaphor: 'immune_burden',
    sources: [
      { provider: 'WB', indicator: 'GC.DOD.TOTL.GD.ZS', freq: 'A' },
      { provider: 'IMF', indicator: 'GGXWDG_NGDP', freq: 'A' },
    ],
    unit: '% of GDP', direction: 'lower_better',
    critical: true,
  },

  // ── AX6: 내분비계 (Prices) ──
  G_P1: {
    axis: 'AX6', name: { en: 'CPI Inflation', ko: '소비자물가 상승률' },
    bodyMetaphor: 'hormone_level',
    sources: [
      { provider: 'WB', indicator: 'FP.CPI.TOTL.ZG', freq: 'A' },
      { provider: 'OECD', dataset: 'OECD.SDD.STES,DSD_STES@DF_STES', measure: 'CPALTT01', freq: 'M' },
      { provider: 'IMF', indicator: 'PCPIPCH', freq: 'A' },
    ],
    unit: '%', direction: 'target_2pct', // 2% 목표
    critical: true,
  },
  G_P2: {
    axis: 'AX6', name: { en: 'Producer Price Index', ko: '생산자물가' },
    bodyMetaphor: 'thyroid',
    sources: [
      { provider: 'OECD', dataset: 'OECD.SDD.STES,DSD_STES@DF_STES', measure: 'PIEAMP01', freq: 'M' },
    ],
    unit: '% YoY', direction: 'neutral',
  },

  // ── AX7: 근골격계 (Production) ──
  G_R1: {
    axis: 'AX7', name: { en: 'Industrial Production', ko: '산업생산지수' },
    bodyMetaphor: 'muscle_output',
    sources: [
      { provider: 'OECD', dataset: 'OECD.SDD.STES,DSD_STES@DF_STES', measure: 'PRINTO01', freq: 'M' },
      { provider: 'WB', indicator: 'NV.IND.TOTL.ZS', freq: 'A' },
    ],
    unit: 'index / % of GDP', direction: 'higher_better',
  },
  G_R2: {
    axis: 'AX7', name: { en: 'Manufacturing PMI', ko: '제조업 PMI' },
    bodyMetaphor: 'bone_density',
    sources: [
      { provider: 'OECD', dataset: 'OECD.SDD.STES,DSD_STES@DF_STES', measure: 'BSCICP03', freq: 'M' },
    ],
    unit: 'index (50=neutral)', direction: 'higher_better',
    critical: true,
  },

  // ── AX8: 비뇨계 (Labor) ──
  G_L1: {
    axis: 'AX8', name: { en: 'Unemployment Rate', ko: '실업률' },
    bodyMetaphor: 'waste_accumulation',
    sources: [
      { provider: 'WB', indicator: 'SL.UEM.TOTL.ZS', freq: 'A' },
      { provider: 'OECD', dataset: 'OECD.SDD.TPS,DSD_LFS@DF_IALFS_UNE_M', measure: 'UNE_LF_M', freq: 'M' },
      { provider: 'IMF', indicator: 'LUR', freq: 'A' },
    ],
    unit: '%', direction: 'lower_better',
    critical: true,
  },
  G_L2: {
    axis: 'AX8', name: { en: 'Labor Force Participation', ko: '경제활동참가율' },
    bodyMetaphor: 'kidney_function',
    sources: [
      { provider: 'WB', indicator: 'SL.TLF.CACT.ZS', freq: 'A' },
    ],
    unit: '%', direction: 'higher_better',
  },

  // ── AX9: 생식계 (Growth) ──
  G_D1: {
    axis: 'AX9', name: { en: 'GDP Growth Rate', ko: 'GDP 성장률' },
    bodyMetaphor: 'growth_vitality',
    sources: [
      { provider: 'WB', indicator: 'NY.GDP.MKTP.KD.ZG', freq: 'A' },
      { provider: 'OECD', dataset: 'OECD.SDD.NAD,DSD_NAAG@DF_NAAG_I', measure: 'B1GQ', freq: 'Q' },
      { provider: 'IMF', indicator: 'NGDP_RPCH', freq: 'A' },
    ],
    unit: '%', direction: 'higher_better',
    critical: true,
  },
  G_D2: {
    axis: 'AX9', name: { en: 'Gross Fixed Capital Formation', ko: '총고정자본형성' },
    bodyMetaphor: 'reproduction',
    sources: [
      { provider: 'WB', indicator: 'NE.GDI.FTOT.ZS', freq: 'A' },
    ],
    unit: '% of GDP', direction: 'higher_better',
  },
};


// ═══════════════════════════════════════════
// 세계 경제 공통지표 (Global Shared Indicators)
// ═══════════════════════════════════════════
const GLOBAL_COMMODITIES = {
  // 에너지
  OIL_WTI:    { name: 'WTI Crude Oil',    fredId: 'DCOILWTICO',     unit: '$/barrel' },
  OIL_BRENT:  { name: 'Brent Crude Oil',  fredId: 'DCOILBRENTEU',   unit: '$/barrel' },
  NATGAS:     { name: 'Natural Gas',       fredId: 'DHHNGSP',        unit: '$/MMBtu' },

  // 금속
  GOLD:       { name: 'Gold',              fredId: 'PGOLDUSDM', unit: '$/oz' },
  COPPER:     { name: 'Copper',            fredId: 'PCOPPUSDM',      unit: '$/mt' },

  // 곡물 (World Bank Commodity)
  WHEAT:      { name: 'Wheat',             wbCommodity: 'wheat',     unit: '$/mt' },
  CORN:       { name: 'Corn',              wbCommodity: 'maize',     unit: '$/mt' },

  // 글로벌 금융
  VIX:        { name: 'VIX (Fear Index)',  fredId: 'VIXCLS',         unit: 'index' },
  DXY:        { name: 'US Dollar Index',   fredId: 'DTWEXBGS',       unit: 'index' },
  US10Y:      { name: 'US 10Y Treasury',   fredId: 'DGS10',          unit: '%' },

  // 물류
  BDI:        { name: 'Baltic Dry Index',  source: 'manual',         unit: 'index' },
};


// ═══════════════════════════════════════════
// 축(Axis) → 게이지 매핑
// ═══════════════════════════════════════════
const AXIS_MAP = {
  AX1: { name: { en: 'Circulatory', ko: '순환계' }, bodyPart: 'heart', gauges: ['G_I1','G_I2','G_I3'] },
  AX2: { name: { en: 'Respiratory', ko: '호흡계' }, bodyPart: 'lungs', gauges: ['G_E1','G_E2','G_E3'] },
  AX3: { name: { en: 'Digestive', ko: '소화계' }, bodyPart: 'stomach', gauges: ['G_C1','G_C2'] },
  AX4: { name: { en: 'Nervous', ko: '신경계' }, bodyPart: 'brain', gauges: ['G_S1','G_S2'] },
  AX5: { name: { en: 'Immune', ko: '면역계' }, bodyPart: 'shield', gauges: ['G_F1','G_F2'] },
  AX6: { name: { en: 'Endocrine', ko: '내분비계' }, bodyPart: 'glands', gauges: ['G_P1','G_P2'] },
  AX7: { name: { en: 'Musculoskeletal', ko: '근골격계' }, bodyPart: 'muscle', gauges: ['G_R1','G_R2'] },
  AX8: { name: { en: 'Urinary', ko: '비뇨계' }, bodyPart: 'kidneys', gauges: ['G_L1','G_L2'] },
  AX9: { name: { en: 'Reproductive', ko: '생식계' }, bodyPart: 'growth', gauges: ['G_D1','G_D2'] },
};

/** 게이지 ID 목록 */
const GAUGE_IDS = Object.keys(GLOBAL_GAUGES);
const GAUGE_COUNT = GAUGE_IDS.length;

/** 특정 소스 타입의 게이지만 필터 */
function getGaugesByProvider(provider) {
  return Object.entries(GLOBAL_GAUGES)
    .filter(([, g]) => g.sources.some(s => s.provider === provider))
    .map(([id]) => id);
}

/** 핵심(critical) 게이지 */
const CRITICAL_GAUGES = Object.entries(GLOBAL_GAUGES)
  .filter(([, g]) => g.critical)
  .map(([id]) => id);

module.exports = {
  GLOBAL_GAUGES,
  GLOBAL_COMMODITIES,
  AXIS_MAP,
  GAUGE_IDS,
  GAUGE_COUNT,
  CRITICAL_GAUGES,
  getGaugesByProvider,
};
