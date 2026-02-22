/**
 * DIAH-7M Data Pipeline v3
 * 59개 게이지 완전 정의 — 새 ID 체계 (O1_EXPORT, F1_KOSPI, ...)
 *
 * 호환성 레이어:
 *   fetchAll()             → { gauges, summary, timestamp } (신규)
 *   fetchAll(ecosKey, ...) → { results, stats, errors }     (기존 호환)
 *   testGauge, diagnoseMapping, diagnoseAll — 기존 호환 스텁
 */

const axios = require('axios');
const pLimit = require('p-limit');
const conc = require('./concurrency');
const alerter = require('./alerter');
const { validateGauge } = require('./gauge-rules');

const CONCURRENT_LIMIT = 5;
const CACHE_TTL = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15000;

// ── CircuitBreaker per API source ──
// ECOS: 월 1회 점검, 간헐 타임아웃 → 5연속 실패 = 실제 장애
// FRED: 안정적이지만 API키 만료/서버 장애 가능 → 5연속
// Yahoo: 429 빈번, crumb 만료 → 3연속 (더 민감)
// TE: 스크래핑이라 차단 가능성 높음 → 3연속
// GEE: callback 무응답 빈번 → 3연속
var _escalate = alerter.onCBEscalate;
var _cbECOS = new conc.CircuitBreaker('ECOS', { failThreshold: 5, resetTimeout: 60000, onEscalate: _escalate });
var _cbFRED = new conc.CircuitBreaker('FRED', { failThreshold: 5, resetTimeout: 60000, onEscalate: _escalate });
var _cbYahoo = new conc.CircuitBreaker('YAHOO_NAT', { failThreshold: 3, resetTimeout: 45000, onEscalate: _escalate });
var _cbTE = new conc.CircuitBreaker('TRADING_ECON', { failThreshold: 3, resetTimeout: 90000, onEscalate: _escalate });
var _cbGEE = new conc.CircuitBreaker('GEE_NAT', { failThreshold: 3, resetTimeout: 60000, onEscalate: _escalate });

// 글로벌 모니터에 등록
conc.globalMonitor.register('ECOS', _cbECOS);
conc.globalMonitor.register('FRED', _cbFRED);
conc.globalMonitor.register('YAHOO_NAT', _cbYahoo);
conc.globalMonitor.register('TRADING_ECON', _cbTE);
conc.globalMonitor.register('GEE_NAT', _cbGEE);

const cache = new Map();

// ── Fallback 캐시 참조 ──
// 서버 부팅 시 setFallbackStore(dataStore)로 등록하면
// CB OPEN 에러 시 이전 캐시 값을 자동 반환 (isFallback: true)
var _fallbackStore = null;
function setFallbackStore(store) { _fallbackStore = store; }

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// validateGaugeValue → gauge-rules.js validateGauge()로 위임
// hardRange 포함 완전 검증: null/NaN/Infinity/타입오류/범위이탈 모두 차단
function validateGaugeValue(value, gaugeId) {
  const result = validateGauge(gaugeId, value);
  return { valid: result.ok, value: result.value };
}

// 59개 게이지 정의
const GAUGE_MAP = {
  // O축 (7개)
  O1_EXPORT: {
    id: 'O1_EXPORT',
    source: 'ECOS',
    params: { statisticCode: '301Y017', itemCode1: 'SA110', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  O2_PMI: {
    id: 'O2_PMI',
    source: 'TRADINGECONOMICS',
    teSlug: 'south-korea/manufacturing-pmi',
    transform: (val) => val,
    name: '한국 제조업 PMI',
    unit: 'pt',
  },

  O3_IP: {
    id: 'O3_IP',
    source: 'ECOS',
    params: { statisticCode: '901Y033', itemCode1: 'A00', itemCode2: '1', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  O4_CAPACITY: {
    id: 'O4_CAPACITY',
    source: 'ECOS',
    params: { statisticCode: '901Y035', itemCode1: 'I32A', itemCode2: 'I11B', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  O5_INVENTORY: {
    id: 'O5_INVENTORY',
    source: 'ECOS',
    params: { statisticCode: '901Y032', itemCode1: 'I11A', itemCode2: '5', cycle: 'M' },
    name: '재고지수(총지수)', unit: '2020=100',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  O6_SHIPMENT: {
    id: 'O6_SHIPMENT',
    source: 'ECOS',
    params: { statisticCode: '901Y032', itemCode1: 'I11A', itemCode2: '3', cycle: 'M' },
    name: '출하지수(총지수)', unit: '2020=100',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  O7_ORDER: {
    id: 'O7_ORDER',
    source: 'ECOS',
    params: { statisticCode: '901Y032', itemCode1: 'I11A', itemCode2: '1', cycle: 'M' },
    name: '생산지수(총지수)', unit: '2020=100',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  // F축 (8개)
  F1_KOSPI: {
    id: 'F1_KOSPI',
    source: 'ECOS',
    params: { statisticCode: '802Y001', itemCode1: '0001000', cycle: 'D' },
    name: 'KOSPI종합지수', unit: 'pt',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  F2_KOSDAQ: {
    id: 'F2_KOSDAQ',
    source: 'ECOS',
    params: { statisticCode: '802Y001', itemCode1: '0089000', cycle: 'D' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  F3_KOSPI_VOL: {
    id: 'F3_KOSPI_VOL', source: 'ECOS', stat: '802Y001', item: '0087000', cycle: 'D', name: 'KOSPI거래량', unit: '천주',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  F4_EXCHANGE: {
    id: 'F4_EXCHANGE',
    source: 'ECOS',
    params: { statisticCode: '731Y004', itemCode1: '0000001', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  F5_INTEREST: {
    id: 'F5_INTEREST',
    source: 'ECOS',
    params: { statisticCode: '722Y001', itemCode1: '0101000', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return latest - prev;
    }
  },

  F6_M2: {
    id: 'F6_M2',
    source: 'ECOS',
    params: { statisticCode: '102Y004', itemCode1: 'ABA1', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  F7_KOSDAQ_VOL: {
    id: 'F7_KOSDAQ_VOL', source: 'ECOS', stat: '802Y001', item: '0090000', cycle: 'D', name: 'KOSDAQ거래량', unit: '천주',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  F8_FOREIGN: {
    id: 'F8_FOREIGN', source: 'ECOS', stat: '802Y001', item: '0030000', cycle: 'D', name: '외국인순매수(유가증권)', unit: '백만원',
    transform: (data) => {
      if (!data || data.length === 0) return null;
      return parseFloat(data[0].DATA_VALUE);
    }
  },

  // S축 (7개)
  S1_BSI: {
    id: 'S1_BSI',
    source: 'ECOS',
    params: { statisticCode: '901Y067', itemCode1: 'I16A', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length === 0) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      return latest - 100;
    }
  },

  S2_CSI: {
    id: 'S2_CSI',
    source: 'ECOS',
    params: { statisticCode: '511Y002', itemCode1: 'FME', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return latest - prev;
    }
  },

  S3_NIGHTLIGHT: {
    id: 'S3_NIGHTLIGHT',
    source: 'SATELLITE',
    api: 'fetchVIIRS',
    params: { region: 'KOR', product: 'VNP46A1' },
    name: '야간광량', unit: 'nW/cm²/sr',
    transform: (data) => {
      // fetchVIIRS → { value, mean_60d, baseline_365d, anomaly, status }
      if (!data || data.status !== 'OK') return null;
      return data.anomaly != null ? data.anomaly * 100 : data.value;
    }
  },

  S3_NO2: {
    id: 'S3_NO2',
    source: 'SATELLITE',
    api: 'fetchSentinel5P',
    params: { region: 'KR' },
    name: 'NO₂ 공단가동', unit: '×10⁻⁵ mol/m²',
    transform: (data) => {
      // fetchSentinel5P → { anomPct, value, status }
      // anomPct: (mean_30d - mean_90d) / mean_90d × 100
      if (!data || data.status !== 'OK') return null;
      return data.anomPct != null ? data.anomPct : null;
    }
  },

  S4_CREDIT: {
    id: 'S4_CREDIT', source: 'DERIVED', deps: ['F5_INTEREST','F1_KOSPI'], calc: (a,b) => +(a-b).toFixed(2), name: '신용스프레드', unit: '%p',
  },

  S5_EMPLOY: {
    id: 'S5_EMPLOY', source: 'ECOS', stat: '901Y027', item: 'I61BA', item2: 'I28A', cycle: 'M', name: '취업자수', unit: '천명',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return latest - prev;
    }
  },

  S6_RETAIL: {
    id: 'S6_RETAIL',
    source: 'ECOS',
    params: { statisticCode: '901Y033', itemCode1: 'AC00', itemCode2: '1', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  S7_HOUSING: {
    id: 'S7_HOUSING', source: 'ECOS', stat: '901Y064', item: 'P65A', cycle: 'M', name: '주택매매가격지수(전국)', unit: '2021.06=100',
    transform: (data) => {
      // 전년비(YoY%): data[0]=최신, data[12]=1년 전 동월 — 전월비 불가(지수라 변동 0.x%)
      if (!data || data.length < 13) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const yearAgo = parseFloat(data[12].DATA_VALUE);
      if (isNaN(latest) || isNaN(yearAgo) || yearAgo === 0) return null;
      return ((latest - yearAgo) / yearAgo) * 100;
    }
  },

  // P축 (6개)
  P1_CPI: {
    id: 'P1_CPI',
    source: 'ECOS',
    params: { statisticCode: '901Y009', itemCode1: '0', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 13) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const yearAgo = parseFloat(data[12].DATA_VALUE);
      return ((latest - yearAgo) / yearAgo) * 100;
    }
  },

  P2_PPI: {
    id: 'P2_PPI',
    source: 'ECOS',
    params: { statisticCode: '404Y014', itemCode1: '*AA', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 13) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const yearAgo = parseFloat(data[12].DATA_VALUE);
      return ((latest - yearAgo) / yearAgo) * 100;
    }
  },

  P3_OIL: {
    id: 'P3_OIL',
    source: 'FRED',
    params: { series: 'DCOILWTICO' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].value);
      const prev = parseFloat(data[1].value);
      return ((latest - prev) / prev) * 100;
    }
  },

  P4_COMMODITY: {
    id: 'P4_COMMODITY', source: 'ECOS', stat: '301Y016', item: '100', cycle: 'M', name: '수출물가지수(전년비%)', unit: '%',
    transform: (data) => {
      // 수출물가지수 전년비(%) — ECOS 301Y016/100, data[0]=최신, data[12]=1년 전
      if (!data || data.length < 13) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const yearAgo = parseFloat(data[12].DATA_VALUE);
      if (isNaN(latest) || isNaN(yearAgo) || yearAgo === 0) return null;
      return ((latest - yearAgo) / yearAgo) * 100;
    }
  },

  P5_IMPORT: {
    id: 'P5_IMPORT', source: 'ECOS', stat: '403Y003', item: '*AA', cycle: 'M', name: '수입물가지수', unit: '2020=100',
    transform: (data) => {
      if (!data || data.length < 13) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const yearAgo = parseFloat(data[12].DATA_VALUE);
      return ((latest - yearAgo) / yearAgo) * 100;
    }
  },

  P6_EXPORT_PRICE: {
    id: 'P6_EXPORT_PRICE', source: 'ECOS', stat: '403Y001', item: '*AA', cycle: 'M', name: '수출물가지수', unit: '2020=100',
    transform: (data) => {
      if (!data || data.length < 13) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const yearAgo = parseFloat(data[12].DATA_VALUE);
      return ((latest - yearAgo) / yearAgo) * 100;
    }
  },

  // R축 (7개 - R5 없음)
  R1_ELECTRICITY: {
    id: 'R1_ELECTRICITY', source: 'ECOS', stat: '901Y032', item: 'I11AD', item2: '1', cycle: 'M', name: '전기가스수도업생산', unit: '2020=100',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  R2_WATER: {
    id: 'R2_WATER', source: 'ECOS', stat: '901Y038', item: 'I51AAC', item2: '1', cycle: 'M', name: '수도업생산', unit: '2020=100',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  R3_GAS: {
    id: 'R3_GAS', source: 'ECOS', stat: '901Y032', item: 'I11ADA', item2: '1', cycle: 'M', name: '전기가스증기공급업생산', unit: '2020=100',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  R4_COAL: {
    id: 'R4_COAL', source: 'ECOS', stat: '901Y032', item: 'I11ABA', item2: '1', cycle: 'M', name: '석탄원유천연가스광업생산', unit: '2020=100',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  R6_UHI: {
    id: 'R6_UHI',
    source: 'SATELLITE',
    api: 'fetchLandsat',
    params: { region: 'KOR', product: 'LANDSAT9_TIR' },
    name: '도시열섬', unit: '°C',
    transform: (data) => {
      // fetchLandsat → { anomaly_degC, value, quality, status }
      // 판정값 = anomaly_degC (전년 동기 대비 °C 차이)
      // quality.status === 'HOLD' → null 반환 (판정 보류)
      if (!data || data.status !== 'OK') return null;
      if (data.quality && data.quality.status === 'HOLD') return null;
      return data.anomaly_degC != null ? data.anomaly_degC : data.value;
    }
  },

  R7_WASTE: {
    id: 'R7_WASTE', source: 'ECOS', stat: '901Y038', item: 'I51AAB', item2: '1', cycle: 'M', name: '폐기물수집운반처리업생산', unit: '2020=100',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  R8_FOREST: {
    id: 'R8_FOREST', source: 'ECOS', stat: '901Y027', item: 'I61BAAA', item2: 'I28A', cycle: 'M', name: '농림어업취업자', unit: '천명',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  // I축 (7개)
  I1_CONSTRUCTION: {
    id: 'I1_CONSTRUCTION', source: 'ECOS', stat: '901Y033', item: 'AD00', item2: '1', cycle: 'M', name: '건설업생산', unit: '2020=100',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  I2_CEMENT: {
    id: 'I2_CEMENT', source: 'ECOS', stat: '901Y032', item: 'I11ACN', item2: '1', cycle: 'M', name: '비금속광물제품생산', unit: '2020=100',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  I3_STEEL: {
    id: 'I3_STEEL', source: 'ECOS', stat: '901Y032', item: 'I11ACO', item2: '1', cycle: 'M', name: '1차금속생산', unit: '2020=100',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  I4_VEHICLE: {
    id: 'I4_VEHICLE', source: 'ECOS', stat: '901Y032', item: 'I11ACU', item2: '1', cycle: 'M', name: '자동차및트레일러생산', unit: '2020=100',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  I5_CARGO: {
    id: 'I5_CARGO', source: 'ECOS', stat: '301Y014', item: 'SC0000', cycle: 'M', name: '운송수지(화물)', unit: '백만$',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  I6_AIRPORT: {
    id: 'I6_AIRPORT', source: 'ECOS', stat: '301Y014', item: 'SCB000', cycle: 'M', name: '항공운송수지', unit: '백만$',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  I7_RAILROAD: {
    id: 'I7_RAILROAD', source: 'ECOS', stat: '901Y027', item: 'I61BAAEB', item2: 'I28A', cycle: 'M', name: '운수창고업취업자', unit: '천명',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  // T축 (6개)
  T1_TRADE_BALANCE: {
    id: 'T1_TRADE_BALANCE',
    source: 'ECOS',
    params: { statisticCode: '301Y017', itemCode1: 'SA000', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  T2_CURRENT_ACCOUNT: {
    id: 'T2_CURRENT_ACCOUNT',
    source: 'ECOS',
    params: { statisticCode: '301Y014', itemCode1: '000', cycle: 'M' },
    transform: (data) => {
      // 경상수지 억$ 원본값 — 정론 doctrine-gauges.md 301Y014/000
      if (!data || data.length === 0) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      return isNaN(latest) ? null : latest;
    }
  },

  T3_FDI: {
    id: 'T3_FDI', source: 'ECOS', stat: '301Y014', item: 'S00000', cycle: 'M', name: '서비스수지(FDI대리)', unit: '백만$',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  T4_RESERVES: {
    id: 'T4_RESERVES',
    source: 'ECOS',
    params: { statisticCode: '732Y001', itemCode1: '99', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE) / 1000;
      const prev = parseFloat(data[1].DATA_VALUE) / 1000;
      return ((latest - prev) / prev) * 100;
    }
  },

  T5_SHIPPING: {
    // 해상운송수지(해객+화물 합계) — ECOS 301Y014/SCA000
    // I5_CARGO(SC0000 화물운송)와 소스 중복 해소: SCA000(해상운송 전체)으로 교체
    id: 'T5_SHIPPING', source: 'ECOS', stat: '301Y014', item: 'SCA000', cycle: 'M', name: '해상운송수지', unit: '백만$',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  T6_CONTAINER: {
    // 선박 수출액 — ECOS 301Y017/SA200
    // O1_EXPORT(SA110 전체수출)와 소스 중복 해소: SA200(선박)으로 교체
    id: 'T6_CONTAINER', source: 'ECOS', stat: '301Y017', item: 'SA200', cycle: 'M', name: '선박수출액(전월비%)', unit: '%',
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  // E축 (5개)
  E1_CHINA_PMI: {
    id: 'E1_CHINA_PMI',
    source: 'TRADINGECONOMICS',
    teSlug: 'china/manufacturing-pmi',
    transform: (val) => val,
    name: '중국 제조업 PMI',
    unit: 'pt',
  },

  E2_US_PMI: {
    id: 'E2_US_PMI',
    source: 'TRADINGECONOMICS',
    teSlug: 'united-states/manufacturing-pmi',
    transform: (val) => val,
    name: '미국 제조업 PMI',
    unit: 'pt',
  },

  E3_VIX: {
    id: 'E3_VIX',
    source: 'FRED',
    params: { series: 'VIXCLS' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].value);
      const prev = parseFloat(data[1].value);
      return ((latest - prev) / prev) * 100;
    }
  },

  E4_DOLLAR_INDEX: {
    id: 'E4_DOLLAR_INDEX',
    source: 'FRED',
    params: { series: 'DTWEXBGS' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].value);
      const prev = parseFloat(data[1].value);
      return ((latest - prev) / prev) * 100;
    }
  },

  E5_BALTIC: {
    id: 'E5_BALTIC',
    source: 'TRADINGECONOMICS',
    teSlug: 'commodity/baltic',
    transform: (val) => val,
    name: '발틱건화물지수(BDI)',
    unit: 'pt',
  },

  // L축 (5개)
  L1_UNEMPLOYMENT: {
    id: 'L1_UNEMPLOYMENT',
    source: 'ECOS',
    params: { statisticCode: '901Y027', itemCode1: 'I61BC', itemCode2: 'I28A', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return latest - prev;
    }
  },

  L2_PARTICIPATION: {
    id: 'L2_PARTICIPATION',
    source: 'ECOS',
    params: { statisticCode: '901Y027', itemCode1: 'I61D', itemCode2: 'I28A', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return latest - prev;
    }
  },

  L3_WAGE: {
    id: 'L3_WAGE',
    source: 'ECOS',
    params: { statisticCode: '901Y027', itemCode1: 'I61BACB', itemCode2: 'I28A', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  L4_HOURS: {
    id: 'L4_HOURS',
    source: 'ECOS',
    params: { statisticCode: '901Y027', itemCode1: 'I61E', itemCode2: 'I28A', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  L5_YOUTH_UNEMP: {
    id: 'L5_YOUTH_UNEMP',
    source: 'ECOS',
    params: { statisticCode: '901Y027', itemCode1: 'I61BB', itemCode2: 'I28A', cycle: 'M' },
    transform: (data) => {
      // 청년실업자수(천명) 절대값 — ECOS I61BB=청년실업자수, threshold min:200 max:800
      if (!data || data.length === 0) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      return isNaN(latest) ? null : latest;
    }
  },
};

// ═══════════════════════════════════════════════════════════════
// API 연동
// ═══════════════════════════════════════════════════════════════
// ── 원본 fetch 함수들 (CB 없는 raw 버전) ──

async function _doFetchECOS(params) {
  const apiKey = process.env.ECOS_API_KEY;
  if (!apiKey) throw new Error('ECOS_API_KEY not configured');

  const { statisticCode, itemCode1, itemCode2, cycle, startDate, endDate } = params;
  let end, start;
  if (cycle === 'D') {
    end = endDate || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
  } else {
    end = endDate || new Date().toISOString().slice(0, 7).replace('-', '');
    start = startDate || new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7).replace('-', '');
  }

  let url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/1000/${statisticCode}/${cycle}/${start}/${end}/${itemCode1}`;
  if (itemCode2) url += `/${itemCode2}`;

  const response = await axios.get(url, { timeout: FETCH_TIMEOUT_MS });
  const rows = response.data.StatisticSearch?.row;
  const errMsg = response.data.RESULT?.MESSAGE;
  if (!rows && errMsg) {
    console.warn(`[ECOS] ${statisticCode}/${itemCode1}: ${errMsg}`);
  }
  return rows || [];
}

async function _doFetchFRED(params) {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error('FRED_API_KEY not configured');

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${params.series}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=24`;

  const response = await axios.get(url, { timeout: FETCH_TIMEOUT_MS });
  return response.data.observations || [];
}

async function _doFetchYahoo(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
  const response = await axios.get(url, {
    params: { interval: '1d', range: '1mo' },
    timeout: 5000,
  });
  return response.data;
}

async function _doFetchTE(slug) {
  const url = `https://tradingeconomics.com/${slug}`;
  const response = await axios.get(url, {
    timeout: FETCH_TIMEOUT_MS,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  const html = response.data;
  let value = null;

  // Strategy 1: id="p" element (commodity pages)
  const pMatch = html.match(/id="p"[^>]*>\s*([0-9.,]+)/);
  if (pMatch) {
    value = parseFloat(pMatch[1].replace(/,/g, ''));
  }

  // Strategy 2: meta description fallback (indicator pages)
  if (value === null || isNaN(value)) {
    const metaMatch = html.match(/(?:increased|decreased|unchanged|remained|fell|rose|dropped)\s+to\s+([0-9.,]+)/i);
    if (metaMatch) {
      value = parseFloat(metaMatch[1].replace(/,/g, ''));
    }
  }

  if (value !== null && !isNaN(value)) return value;
  throw new Error('Could not parse value from ' + slug);
}

// ── CircuitBreaker 래핑 fetch 함수들 ──
// 장애 시: CB가 에러 throw → fetchGauge의 catch가 ERROR 상태로 처리
// 캐시 히트: CB 우회 (불필요한 CB 카운트 방지)

async function fetchECOS(params) {
  return _cbECOS.run(function() { return _doFetchECOS(params); });
}

async function fetchFRED(params) {
  return _cbFRED.run(function() { return _doFetchFRED(params); });
}

async function fetchYahoo(symbol) {
  const cached = getCached(`yahoo:${symbol}`);
  if (cached) return cached;

  try {
    const data = await _cbYahoo.run(function() { return _doFetchYahoo(symbol); });
    setCache(`yahoo:${symbol}`, data);
    return data;
  } catch (error) {
    console.error(`[Yahoo] Error fetching ${symbol}:`, error.message);
    return null;
  }
}

async function fetchTradingEconomics(slug) {
  const cached = getCached(`te:${slug}`);
  if (cached) return cached;

  try {
    const value = await _cbTE.run(function() { return _doFetchTE(slug); });
    setCache(`te:${slug}`, value);
    return value;
  } catch (error) {
    console.error(`[TE] Error fetching ${slug}:`, error.message);
    return null;
  }
}

// 위성 모듈 안전 로드 + CircuitBreaker 래핑
let _rawFetchVIIRS, _rawFetchLandsat, _rawFetchSentinel5P;
try {
  const sat = require('./fetch-satellite.js');
  _rawFetchVIIRS      = sat.fetchVIIRS;
  _rawFetchLandsat    = sat.fetchLandsat;
  _rawFetchSentinel5P = sat.fetchSentinel5P;
} catch (e) {
  console.warn('  ⚠️ fetch-satellite.js 로드 실패:', e.message);
  _rawFetchVIIRS      = async () => null;
  _rawFetchLandsat    = async () => null;
  _rawFetchSentinel5P = async () => null;
}

async function fetchVIIRS(region) {
  return _cbGEE.run(function() { return _rawFetchVIIRS(region); });
}
async function fetchLandsat(region) {
  return _cbGEE.run(function() { return _rawFetchLandsat(region); });
}

// ═══════════════════════════════════════════════════════════════
// 단일 게이지 수집
// ═══════════════════════════════════════════════════════════════
async function fetchGauge(gaugeId) {
  const gauge = GAUGE_MAP[gaugeId];
  if (!gauge) {
    console.error(`${gaugeId} not found in GAUGE_MAP`);
    return { id: gaugeId, value: null, status: 'ERROR', error: 'Not found' };
  }

  try {
    let rawData = null;

    switch (gauge.source) {
      case 'ECOS':
        if (gauge.params) {
          rawData = await fetchECOS(gauge.params);
        } else if (gauge.stat) {
          // stat/item/cycle 형태 게이지 → fetchECOS에 위임 (날짜는 fetchECOS 내부에서 cycle 기반 자동 생성)
          rawData = await fetchECOS({
            statisticCode: gauge.stat,
            itemCode1: gauge.item,
            itemCode2: gauge.item2 || undefined,
            cycle: gauge.cycle,
          });
        }
        break;
      case 'FRED':
        if (gauge.params) {
          rawData = await fetchFRED(gauge.params);
        } else if (gauge.series) {
          rawData = await fetchFRED({ series: gauge.series });
        }
        break;
      case 'YAHOO':
        rawData = await fetchYahoo(gauge.symbol);
        break;
      case 'TRADINGECONOMICS':
        rawData = await fetchTradingEconomics(gauge.teSlug);
        break;
      case 'SATELLITE':
        if (gauge.api === 'fetchVIIRS') {
          // fetchVIIRS(regionCode, lookbackDays) — params.region='KOR'→'KR' 변환
          const viirRegion = gauge.params?.region === 'KOR' ? 'KR' : (gauge.params?.region || 'KR');
          rawData = await fetchVIIRS(viirRegion);
        } else if (gauge.api === 'fetchLandsat') {
          const lstRegion = gauge.params?.region === 'KOR' ? 'KR' : (gauge.params?.region || 'KR');
          rawData = await fetchLandsat(lstRegion);
        } else if (gauge.api === 'fetchSentinel5P') {
          const s5pRegion = gauge.params?.region || 'KR';
          rawData = await _cbGEE.run(function() { return _rawFetchSentinel5P(s5pRegion); });
        }
        break;
      case 'DERIVED':
        return { id: gaugeId, value: null, status: 'NEEDS_CALC', source: 'DERIVED', deps: gauge.deps };
      case 'MANUAL':
        console.warn(`${gaugeId} requires manual data input`);
        return { id: gaugeId, value: null, status: 'MANUAL' };
      default:
        throw new Error(`Unknown source: ${gauge.source}`);
    }

    // 원시 데이터 길이 기록 (진단용)
    const rawLen = Array.isArray(rawData) ? rawData.length : (rawData ? 1 : 0);
    const rawFirstTime = Array.isArray(rawData) && rawData.length > 0 ? (rawData[0]?.TIME || rawData[0]?.date || '') : '';
    const rawLastTime = Array.isArray(rawData) && rawData.length > 1 ? (rawData[rawData.length-1]?.TIME || rawData[rawData.length-1]?.date || '') : '';

    let value = gauge.transform ? gauge.transform(rawData) : rawData;

    const validation = validateGaugeValue(value, gaugeId);
    value = validation.value;

    // value가 null이면 NO_DATA로 분류 (수집 성공이지만 유효 데이터 없음)
    if (value === null || value === undefined) {
      console.log(`[${new Date().toISOString()}] ⚠️  ${gaugeId} = null (rawLen=${rawLen}, range=${rawFirstTime}~${rawLastTime})`);
      return {
        id: gaugeId,
        gaugeId,
        value: null,
        status: 'NO_DATA',
        source: gauge.source,
        name: gauge.name || gaugeId,
        unit: gauge.unit || '',
        timestamp: new Date().toISOString(),
        _debug: { rawLen, rawFirstTime, rawLastTime },
      };
    }

    console.log(`[${new Date().toISOString()}] ✅ ${gaugeId} = ${value} (rawLen=${rawLen})`);

    return {
      id: gaugeId,
      gaugeId,
      value,
      status: 'OK',
      timestamp: new Date().toISOString(),
      source: gauge.source,
      name: gauge.name || gaugeId,
      unit: gauge.unit || '',
      _debug: { rawLen, rawFirstTime, rawLastTime },
    };

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ ${gaugeId} error:`, error.message);

    // CB OPEN 에러 시 fallback: 이전 캐시 값 반환 (점수 급변 방지)
    if (_fallbackStore && error.message && error.message.includes('[CB:')) {
      var cached = _fallbackStore.get(gaugeId);
      if (cached && cached.value !== null && cached.value !== undefined) {
        console.log(`[${new Date().toISOString()}] 🔄 ${gaugeId} fallback = ${cached.value} (CB OPEN → 이전 캐시 사용)`);
        return {
          id: gaugeId,
          gaugeId,
          value: cached.value,
          prevValue: cached.prevValue || null,
          status: 'OK',
          isFallback: true,
          fallbackReason: error.message,
          fallbackAge: cached.updatedAt || null,
          source: cached.source || gauge.source,
          name: gauge.name || gaugeId,
          unit: cached.unit || gauge.unit || '',
          timestamp: new Date().toISOString(),
        };
      }
    }

    return {
      id: gaugeId,
      gaugeId,
      value: null,
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 전체 수집 — 듀얼 인터페이스
// ═══════════════════════════════════════════════════════════════
async function fetchAll(ecosKey, kosisKey) {
  const gaugeIds = Object.keys(GAUGE_MAP);
  const isLegacyCall = (ecosKey !== undefined);

  console.log(`[${new Date().toISOString()}] 📊 Starting collection (${gaugeIds.length} gauges, limit=${CONCURRENT_LIMIT})...`);

  const limit = pLimit(CONCURRENT_LIMIT);

  const tasks = gaugeIds.map(id => limit(() => fetchGauge(id)));
  const rawResults = await Promise.allSettled(tasks);

  const collected = rawResults.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        id: gaugeIds[index],
        gaugeId: gaugeIds[index],
        value: null,
        status: 'ERROR',
        error: result.reason?.message || 'unknown',
      };
    }
  });

  // DERIVED 게이지 계산
  const gaugeValues = {};
  for (const g of collected) {
    gaugeValues[g.id || g.gaugeId] = g;
  }
  for (const g of collected) {
    const spec = GAUGE_MAP[g.id || g.gaugeId];
    if (spec && spec.source === 'DERIVED' && spec.calc && spec.deps) {
      const depVals = spec.deps.map(d => gaugeValues[d]?.value);
      if (depVals.every(v => v !== null && v !== undefined)) {
        g.value = spec.calc(...depVals);
        g.status = 'OK';
        g.name = spec.name;
        g.unit = spec.unit;
      }
    }
  }

  const success = collected.filter(g => g.status === 'OK').length;
  const fallback = collected.filter(g => g.isFallback).length;
  const failed = collected.filter(g => g.status === 'ERROR').length;
  const noData = collected.filter(g => g.status === 'NO_DATA').length;
  const manual = collected.filter(g => g.status === 'MANUAL').length;

  // CB 상태 요약 로그
  const cbAlerts = conc.globalMonitor.getAlerts();
  const cbSummary = cbAlerts.length > 0
    ? cbAlerts.map(function(a) { return a.source + '=' + a.state; }).join(', ')
    : 'all CLOSED';

  console.log(`[${new Date().toISOString()}] 📊 Collection complete:`);
  console.log(`  ✅ Success: ${success}/${gaugeIds.length}` + (fallback > 0 ? ` (${fallback} fallback)` : ''));
  console.log(`  ⚠️  No Data: ${noData}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⚠️  Manual: ${manual}`);
  console.log(`  🔌 CB: ${cbSummary}`);

  // 기존 호환: fetchAll(ecosKey, kosisKey) → { results, stats, errors }
  if (isLegacyCall) {
    const results = {};
    for (const g of collected) {
      results[g.id || g.gaugeId] = g;
    }
    const errors = collected.filter(g => g.status === 'ERROR').map(g => ({ id: g.id || g.gaugeId, error: g.error }));
    return {
      results,
      stats: {
        total: gaugeIds.length,
        ok: success,
        pending: collected.filter(g => g.status === 'PENDING').length,
        noData: collected.filter(g => g.status === 'NO_DATA').length,
        apiError: failed,
        errors: errors.length,
        satellite: collected.filter(g => GAUGE_MAP[g.id]?.source === 'SATELLITE').length,
        timestamp: new Date().toISOString(),
      },
      errors,
    };
  }

  // 신규: fetchAll() → { gauges, summary, timestamp }
  return {
    gauges: collected,
    summary: { success, fallback, failed, noData, manual, total: gaugeIds.length },
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// 호환성 스텁 — diagnoseMapping, testGauge, diagnoseAll
// ═══════════════════════════════════════════════════════════════
function diagnoseMapping() {
  const breakdown = { ECOS:[], FRED:[], YAHOO:[], SATELLITE:[], DERIVED:[], MANUAL:[] };
  for (const [id, spec] of Object.entries(GAUGE_MAP)) {
    const cat = spec.source || 'MANUAL';
    (breakdown[cat] || (breakdown[cat] = [])).push({ id, name: spec.name || id });
  }
  return {
    total: Object.keys(GAUGE_MAP).length,
    breakdown: Object.fromEntries(
      Object.entries(breakdown).filter(([,v]) => v.length > 0).map(([k,v]) => [k, { count:v.length, gauges:v }])
    ),
    readyForAPI: (breakdown.ECOS?.length || 0) + (breakdown.FRED?.length || 0) + (breakdown.YAHOO?.length || 0),
    needsSatellite: breakdown.SATELLITE?.length || 0,
    needsManual: breakdown.MANUAL?.length || 0,
  };
}

async function testGauge(gaugeId) {
  const spec = GAUGE_MAP[gaugeId];
  if (!spec) return { error: `Unknown gauge: ${gaugeId}` };

  const t0 = Date.now();
  const result = await fetchGauge(gaugeId);
  const latency = Date.now() - t0;

  return {
    gaugeId,
    source: spec.source,
    name: spec.name || gaugeId,
    unit: spec.unit || '',
    latency,
    ...result,
  };
}

async function diagnoseAll() {
  const ids = Object.keys(GAUGE_MAP);
  const results = {};
  const summary = { ok:0, noData:0, apiError:0, notApi:0, httpError:0 };

  for (let i = 0; i < ids.length; i += 5) {
    const batch = ids.slice(i, i + 5);
    const batchResults = await Promise.allSettled(batch.map(id => testGauge(id)));
    batchResults.forEach((r, j) => {
      const id = batch[j];
      const data = r.status === 'fulfilled' ? r.value : { error: r.reason?.message };
      results[id] = data;
      if (data.status === 'OK') summary.ok++;
      else if (data.status === 'ERROR') summary.apiError++;
      else summary.noData++;
    });
    if (i + 5 < ids.length) await new Promise(r => setTimeout(r, 200));
  }
  return { total: ids.length, summary, gauges: results };
}

// ═══════════════════════════════════════════════════════════════
// 준실시간 수집 — Yahoo Finance 시장 데이터 (15분 주기)
// 대상: F1_KOSPI(^KS11), F2_KOSDAQ(^KQ11), F4_EXCHANGE(KRW=X)
// ═══════════════════════════════════════════════════════════════

// Yahoo quote API — regularMarketPrice + chartPreviousClose → MoM%
async function _fetchYahooQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
  const resp = await axios.get(url, {
    params: { interval: '1d', range: '5d' },
    timeout: 8000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DIAH7M/1.0)' },
  });
  const result = resp.data?.chart?.result?.[0];
  if (!result) throw new Error(`No chart result for ${symbol}`);

  const meta = result.meta || {};
  const current = meta.regularMarketPrice;
  const prev    = meta.chartPreviousClose || meta.previousClose;
  if (current == null || prev == null || prev === 0) throw new Error(`Missing price data for ${symbol}`);

  return { current, prev, pctChange: +((current - prev) / prev * 100).toFixed(3) };
}

// REALTIME_GAUGES: Yahoo 심볼 → 게이지 ID 매핑
const REALTIME_GAUGES = [
  { id: 'F1_KOSPI',    symbol: '^KS11',  desc: 'KOSPI 종합지수' },
  { id: 'F2_KOSDAQ',   symbol: '^KQ11',  desc: 'KOSDAQ 종합지수' },
  { id: 'F4_EXCHANGE', symbol: 'KRW=X',  desc: '원/달러 환율' },
];

/**
 * fetchRealtimeGauges() — Yahoo Finance 준실시간 수집
 * @returns {{ id, value, unit, source, timestamp, current, prev }[]}
 */
async function fetchRealtimeGauges() {
  const results = [];
  const now = new Date().toISOString();

  await Promise.allSettled(
    REALTIME_GAUGES.map(async ({ id, symbol, desc }) => {
      try {
        const { current, prev, pctChange } = await _cbYahoo.run(() => _fetchYahooQuote(symbol));
        const spec = GAUGE_MAP[id] || {};
        results.push({
          id,
          value:     pctChange,   // MoM% — core-engine 기대값 형식
          unit:      spec.unit || '%',
          source:    `YAHOO_RT:${symbol}`,
          timestamp: now,
          current,
          prev,
          name:      spec.name || desc,
          status:    'OK',
        });
        console.log(`[RT] ${id}(${symbol}): ${current} (${pctChange > 0 ? '+' : ''}${pctChange}%)`);
      } catch (e) {
        console.warn(`[RT] ${id}(${symbol}) 실패:`, e.message);
        results.push({ id, value: null, status: 'ERROR', error: e.message, timestamp: now });
      }
    })
  );

  // S4_CREDIT DERIVED 재계산: F5_INTEREST - F1_KOSPI
  const f1 = results.find(r => r.id === 'F1_KOSPI' && r.status === 'OK');
  if (f1 && _fallbackStore) {
    const f5Val = _fallbackStore.get('F5_INTEREST');
    if (f5Val != null) {
      results.push({
        id: 'S4_CREDIT',
        value: +(f5Val - f1.value).toFixed(2),
        unit: '%p',
        source: 'DERIVED_RT',
        timestamp: now,
        status: 'OK',
      });
    }
  }

  return results;
}

module.exports = {
  GAUGE_MAP,
  fetchGauge,
  fetchAll,
  fetchRealtimeGauges,
  REALTIME_GAUGES,
  fetchECOS,
  fetchYahoo,
  fetchTradingEconomics,
  diagnoseMapping,
  testGauge,
  diagnoseAll,
  setFallbackStore,
  // CircuitBreaker 접근 (서버 health 엔드포인트용)
  _circuitBreakers: { ECOS: _cbECOS, FRED: _cbFRED, YAHOO_NAT: _cbYahoo, TRADING_ECON: _cbTE, GEE_NAT: _cbGEE },
};
