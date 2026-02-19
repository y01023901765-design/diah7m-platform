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

const CONCURRENT_LIMIT = 5;
const CACHE_TTL = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15000;

const cache = new Map();

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

function validateGaugeValue(value, gaugeId) {
  if (value === null || value === undefined) return { valid: true, value: null };
  if (typeof value === 'number' && isNaN(value)) {
    console.warn(`[${gaugeId}] NaN detected`);
    return { valid: true, value: null };
  }
  if (!isFinite(value)) {
    console.warn(`[${gaugeId}] Infinity detected`);
    return { valid: true, value: null };
  }
  if (typeof value !== 'number') {
    console.warn(`[${gaugeId}] Invalid type: ${typeof value}`);
    return { valid: true, value: null };
  }
  return { valid: true, value };
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
    source: 'FRED',
    params: { series: 'KORSPPCOREPCEPM' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].value);
      const prev = parseFloat(data[1].value);
      return latest - prev;
    }
  },

  O3_IP: {
    id: 'O3_IP',
    source: 'ECOS',
    params: { statisticCode: '901Y033', itemCode1: 'A00', cycle: 'M' },
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
    params: { statisticCode: '901Y035', itemCode1: 'I32A', cycle: 'M' },
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
    params: { statisticCode: '901Y033', itemCode1: 'AA00', cycle: 'M' },
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
    params: { statisticCode: '901Y033', itemCode1: 'BA00', cycle: 'M' },
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
    params: { statisticCode: '901Y033', itemCode1: 'CA00', cycle: 'M' },
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
    source: 'YAHOO',
    symbol: '^KS11',
    transform: (data) => {
      if (!data || !data.chart) return null;
      const prices = data.chart.result[0].indicators.quote[0].close;
      if (!prices || prices.length < 2) return null;
      const latest = prices[prices.length - 1];
      const prev = prices[prices.length - 2];
      return ((latest - prev) / prev) * 100;
    }
  },

  F2_KOSDAQ: {
    id: 'F2_KOSDAQ',
    source: 'ECOS',
    params: { statisticCode: '802Y001', itemCode1: '0002000', cycle: 'D' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  F3_KOSPI_VOL: {
    id: 'F3_KOSPI_VOL', source: 'ECOS', stat: '802Y001', item: '0001000', cycle: 'D', name: 'KOSPI', unit: 'pt',
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
    id: 'F7_KOSDAQ_VOL', source: 'ECOS', stat: '802Y001', item: '0002000', cycle: 'D', name: 'KOSDAQ', unit: 'pt',
  },

  F8_FOREIGN: {
    id: 'F8_FOREIGN', source: 'ECOS', stat: '802Y001', item: '0001000', cycle: 'D', name: '외국인KOSPI순매수', unit: 'pt',
  },

  // S축 (7개)
  S1_BSI: {
    id: 'S1_BSI',
    source: 'ECOS',
    params: { statisticCode: '512Y006', itemCode1: 'FBB', cycle: 'M' },
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
    transform: (data) => {
      if (!data || !data.radiance) return null;
      const radiance = data.radiance;
      if (radiance.length < 60) return null;
      const recent = radiance.slice(0, 30).reduce((a, b) => a + b, 0) / 30;
      const prev = radiance.slice(30, 60).reduce((a, b) => a + b, 0) / 30;
      return ((recent - prev) / prev) * 100;
    }
  },

  S4_CREDIT: {
    id: 'S4_CREDIT', source: 'DERIVED', deps: ['F5_INTEREST','F1_KOSPI'], calc: (a,b) => +(a-b).toFixed(2), name: '신용스프레드', unit: '%p',
  },

  S5_EMPLOY: {
    id: 'S5_EMPLOY', source: 'ECOS', stat: '901Y065', item: 'I12A', cycle: 'M', name: '취업자수', unit: '천명',
  },

  S6_RETAIL: {
    id: 'S6_RETAIL',
    source: 'ECOS',
    params: { statisticCode: '901Y033', itemCode1: 'AC00', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return ((latest - prev) / prev) * 100;
    }
  },

  S7_HOUSING: {
    id: 'S7_HOUSING', source: 'ECOS', stat: '901Y068', item: '1010', cycle: 'M', name: '건축허가', unit: '동',
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
    id: 'P4_COMMODITY', source: 'ECOS', stat: '301Y013', item: '100000', cycle: 'M', name: '상품수지', unit: '백만$',
  },

  P5_IMPORT: {
    id: 'P5_IMPORT', source: 'ECOS', stat: '403Y003', item: '*AA', cycle: 'M', name: '수입물가지수', unit: '2020=100',
  },

  P6_EXPORT_PRICE: {
    id: 'P6_EXPORT_PRICE', source: 'ECOS', stat: '403Y001', item: '*AA', cycle: 'M', name: '수출물가지수', unit: '2020=100',
  },

  // R축 (7개 - R5 없음)
  R1_ELECTRICITY: {
    id: 'R1_ELECTRICITY', source: 'ECOS', stat: '901Y033', item: 'BD', cycle: 'M', name: '전기가스업생산', unit: '2020=100',
  },

  R2_WATER: {
    id: 'R2_WATER', source: 'ECOS', stat: '901Y033', item: 'BE36', cycle: 'M', name: '수도업생산', unit: '2020=100',
  },

  R3_GAS: {
    id: 'R3_GAS', source: 'ECOS', stat: '901Y033', item: 'BD35', cycle: 'M', name: '가스업생산', unit: '2020=100',
  },

  R4_COAL: {
    id: 'R4_COAL', source: 'ECOS', stat: '901Y033', item: 'BB05', cycle: 'M', name: '석탄광업생산', unit: '2020=100',
  },

  R6_UHI: {
    id: 'R6_UHI',
    source: 'SATELLITE',
    api: 'fetchLandsat',
    params: { region: 'KOR', product: 'LANDSAT9_TIR' },
  },

  R7_WASTE: {
    id: 'R7_WASTE', source: 'ECOS', stat: '901Y033', item: 'BE37', cycle: 'M', name: '환경복원업생산', unit: '2020=100',
  },

  R8_FOREST: {
    id: 'R8_FOREST', source: 'ECOS', stat: '901Y033', item: 'BA', cycle: 'M', name: '농림어업생산', unit: '2020=100',
  },

  // I축 (7개)
  I1_CONSTRUCTION: {
    id: 'I1_CONSTRUCTION', source: 'ECOS', stat: '901Y033', item: 'BF', cycle: 'M', name: '건설업생산', unit: '2020=100',
  },

  I2_CEMENT: {
    id: 'I2_CEMENT', source: 'ECOS', stat: '901Y033', item: 'BC22', cycle: 'M', name: '시멘트생산', unit: '2020=100',
  },

  I3_STEEL: {
    id: 'I3_STEEL', source: 'ECOS', stat: '901Y033', item: 'BC24', cycle: 'M', name: '철강생산', unit: '2020=100',
  },

  I4_VEHICLE: {
    id: 'I4_VEHICLE', source: 'ECOS', stat: '901Y033', item: 'BC29', cycle: 'M', name: '자동차생산', unit: '2020=100',
  },

  I5_CARGO: {
    id: 'I5_CARGO', source: 'ECOS', stat: '301Y014', item: 'SC0000', cycle: 'M', name: '운송수지(화물)', unit: '백만$',
  },

  I6_AIRPORT: {
    id: 'I6_AIRPORT', source: 'ECOS', stat: '901Y033', item: 'BH49', cycle: 'M', name: '항공운송', unit: '2020=100',
  },

  I7_RAILROAD: {
    id: 'I7_RAILROAD', source: 'ECOS', stat: '901Y033', item: 'BH', cycle: 'M', name: '운수업생산', unit: '2020=100',
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
    params: { statisticCode: '301Y013', itemCode1: '100000', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE) / 100;
      const prev = parseFloat(data[1].DATA_VALUE) / 100;
      return ((latest - prev) / prev) * 100;
    }
  },

  T3_FDI: {
    id: 'T3_FDI', source: 'ECOS', stat: '301Y014', item: 'S00000', cycle: 'M', name: '서비스수지(FDI대리)', unit: '백만$',
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
    id: 'T5_SHIPPING', source: 'ECOS', stat: '301Y014', item: 'SC0000', cycle: 'M', name: '해운운송수지', unit: '백만$',
  },

  T6_CONTAINER: {
    id: 'T6_CONTAINER', source: 'ECOS', stat: '301Y017', item: 'SA110', cycle: 'M', name: '해상수출(컨테이너대리)', unit: '백만$',
  },

  // E축 (5개)
  E1_CHINA_PMI: {
    id: 'E1_CHINA_PMI',
    source: 'FRED',
    params: { series: 'CHNPMIMFGM' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].value);
      const prev = parseFloat(data[1].value);
      return latest - prev;
    }
  },

  E2_US_PMI: {
    id: 'E2_US_PMI',
    source: 'FRED',
    params: { series: 'KOREPUINDXM' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].value);
      const prev = parseFloat(data[1].value);
      return latest - prev;
    }
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
    source: 'YAHOO',
    symbol: '^BDI',
    transform: (data) => {
      const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
      if (!quotes?.close || quotes.close.length < 2) return null;
      const closes = quotes.close.filter(v => v !== null);
      return closes[closes.length - 1];
    },
    name: '발틱건화물지수(BDI)',
    unit: 'pt',
  },

  // L축 (5개)
  L1_UNEMPLOYMENT: {
    id: 'L1_UNEMPLOYMENT',
    source: 'ECOS',
    params: { statisticCode: '200Y001', itemCode1: '1', cycle: 'M' },
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
    params: { statisticCode: '200Y001', itemCode1: '2', cycle: 'M' },
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
    params: { statisticCode: '200Y023', itemCode1: '10', cycle: 'M' },
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
    params: { statisticCode: '200Y023', itemCode1: '20', cycle: 'M' },
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
    params: { statisticCode: '200Y001', itemCode1: '3', cycle: 'M' },
    transform: (data) => {
      if (!data || data.length < 2) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      const prev = parseFloat(data[1].DATA_VALUE);
      return latest - prev;
    }
  },
};

// ═══════════════════════════════════════════════════════════════
// API 연동
// ═══════════════════════════════════════════════════════════════
async function fetchECOS(params) {
  const apiKey = process.env.ECOS_API_KEY;
  if (!apiKey) throw new Error('ECOS_API_KEY not configured');

  const { statisticCode, itemCode1, cycle, startDate, endDate } = params;
  const end = endDate || new Date().toISOString().slice(0, 7).replace('-', '');
  const start = startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7).replace('-', '');

  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/1000/${statisticCode}/${cycle}/${start}/${end}/${itemCode1}`;

  const response = await axios.get(url, { timeout: FETCH_TIMEOUT_MS });
  return response.data.StatisticSearch?.row || [];
}

async function fetchFRED(params) {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error('FRED_API_KEY not configured');

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${params.series}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=24`;

  const response = await axios.get(url, { timeout: FETCH_TIMEOUT_MS });
  return response.data.observations || [];
}

async function fetchYahoo(symbol) {
  const cached = getCached(`yahoo:${symbol}`);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

  try {
    const response = await axios.get(url, {
      params: { interval: '1d', range: '1mo' },
      timeout: 5000,
    });

    const data = response.data;
    setCache(`yahoo:${symbol}`, data);
    return data;
  } catch (error) {
    console.error(`[Yahoo] Error fetching ${symbol}:`, error.message);
    return null;
  }
}

// 위성 모듈 안전 로드
let fetchVIIRS, fetchLandsat;
try {
  const sat = require('./fetch-satellite.js');
  fetchVIIRS = sat.fetchVIIRS;
  fetchLandsat = sat.fetchLandsat;
} catch (e) {
  console.warn('  ⚠️ fetch-satellite.js 로드 실패:', e.message);
  fetchVIIRS = async () => null;
  fetchLandsat = async () => null;
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
          // stat/item/cycle 형태 게이지 → params 형태로 변환
          const end = new Date().toISOString().slice(0, 7).replace('-', '');
          const start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7).replace('-', '');
          rawData = await fetchECOS({
            statisticCode: gauge.stat,
            itemCode1: gauge.item,
            cycle: gauge.cycle,
            startDate: start,
            endDate: end,
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
      case 'SATELLITE':
        if (gauge.api === 'fetchVIIRS') {
          // fetchVIIRS(regionCode, lookbackDays) — params.region='KOR'→'KR' 변환
          const viirRegion = gauge.params?.region === 'KOR' ? 'KR' : (gauge.params?.region || 'KR');
          rawData = await fetchVIIRS(viirRegion);
        } else if (gauge.api === 'fetchLandsat') {
          const lstRegion = gauge.params?.region === 'KOR' ? 'KR' : (gauge.params?.region || 'KR');
          rawData = await fetchLandsat(lstRegion);
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

    let value = gauge.transform ? gauge.transform(rawData) : rawData;

    const validation = validateGaugeValue(value, gaugeId);
    value = validation.value;

    // value가 null이면 NO_DATA로 분류 (수집 성공이지만 유효 데이터 없음)
    if (value === null || value === undefined) {
      console.log(`[${new Date().toISOString()}] ⚠️  ${gaugeId} = null (API 응답은 있으나 값 산출 불가)`);
      return {
        id: gaugeId,
        gaugeId,
        value: null,
        status: 'NO_DATA',
        source: gauge.source,
        name: gauge.name || gaugeId,
        unit: gauge.unit || '',
        timestamp: new Date().toISOString(),
      };
    }

    console.log(`[${new Date().toISOString()}] ✅ ${gaugeId} = ${value}`);

    return {
      id: gaugeId,
      gaugeId,
      value,
      status: 'OK',
      timestamp: new Date().toISOString(),
      source: gauge.source,
      name: gauge.name || gaugeId,
      unit: gauge.unit || '',
    };

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ ${gaugeId} error:`, error.message);
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
  const failed = collected.filter(g => g.status === 'ERROR').length;
  const noData = collected.filter(g => g.status === 'NO_DATA').length;
  const manual = collected.filter(g => g.status === 'MANUAL').length;

  console.log(`[${new Date().toISOString()}] 📊 Collection complete:`);
  console.log(`  ✅ Success: ${success}/${gaugeIds.length}`);
  console.log(`  ⚠️  No Data: ${noData}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⚠️  Manual: ${manual}`);

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
    summary: { success, failed, noData, manual, total: gaugeIds.length },
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

module.exports = {
  GAUGE_MAP,
  fetchGauge,
  fetchAll,
  fetchECOS,
  fetchYahoo,
  diagnoseMapping,
  testGauge,
  diagnoseAll,
};
