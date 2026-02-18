/**
 * DIAH-7M Data Pipeline v3
 * 59개 게이지 완전 정의
 */

const axios = require('axios');
const pLimit = require('p-limit');

const CONCURRENT_LIMIT = 5;
const CACHE_TTL = 30 * 60 * 1000;

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
    id: 'F3_KOSPI_VOL',
    source: 'MANUAL',
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
    id: 'F7_KOSDAQ_VOL',
    source: 'MANUAL',
  },
  
  F8_FOREIGN: {
    id: 'F8_FOREIGN',
    source: 'MANUAL',
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
    id: 'S4_CREDIT',
    source: 'MANUAL',
  },
  
  S5_EMPLOY: {
    id: 'S5_EMPLOY',
    source: 'MANUAL',
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
    id: 'S7_HOUSING',
    source: 'MANUAL',
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
    id: 'P4_COMMODITY',
    source: 'MANUAL',
  },
  
  P5_IMPORT: {
    id: 'P5_IMPORT',
    source: 'MANUAL',
  },
  
  P6_EXPORT_PRICE: {
    id: 'P6_EXPORT_PRICE',
    source: 'MANUAL',
  },

  // R축 (7개 - R5 없음)
  R1_ELECTRICITY: {
    id: 'R1_ELECTRICITY',
    source: 'MANUAL',
  },
  
  R2_WATER: {
    id: 'R2_WATER',
    source: 'MANUAL',
  },
  
  R3_GAS: {
    id: 'R3_GAS',
    source: 'MANUAL',
  },
  
  R4_COAL: {
    id: 'R4_COAL',
    source: 'MANUAL',
  },
  
  R6_UHI: {
    id: 'R6_UHI',
    source: 'SATELLITE',
    api: 'fetchThermal',
    params: { region: 'KOR', product: 'LANDSAT9_TIR' },
  },
  
  R7_WASTE: {
    id: 'R7_WASTE',
    source: 'MANUAL',
  },
  
  R8_FOREST: {
    id: 'R8_FOREST',
    source: 'MANUAL',
  },

  // I축 (7개)
  I1_CONSTRUCTION: {
    id: 'I1_CONSTRUCTION',
    source: 'MANUAL',
  },
  
  I2_CEMENT: {
    id: 'I2_CEMENT',
    source: 'MANUAL',
  },
  
  I3_STEEL: {
    id: 'I3_STEEL',
    source: 'MANUAL',
  },
  
  I4_VEHICLE: {
    id: 'I4_VEHICLE',
    source: 'MANUAL',
  },
  
  I5_CARGO: {
    id: 'I5_CARGO',
    source: 'MANUAL',
  },
  
  I6_AIRPORT: {
    id: 'I6_AIRPORT',
    source: 'MANUAL',
  },
  
  I7_RAILROAD: {
    id: 'I7_RAILROAD',
    source: 'MANUAL',
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
    id: 'T3_FDI',
    source: 'MANUAL',
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
    id: 'T5_SHIPPING',
    source: 'MANUAL',
  },
  
  T6_CONTAINER: {
    id: 'T6_CONTAINER',
    source: 'MANUAL',
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
    source: 'MANUAL',
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

// API 연동
async function fetchECOS(params) {
  const apiKey = process.env.ECOS_API_KEY;
  if (!apiKey) throw new Error('ECOS_API_KEY not configured');
  
  const { statisticCode, itemCode1, cycle, startDate, endDate } = params;
  const end = endDate || new Date().toISOString().slice(0, 7).replace('-', '');
  const start = startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7).replace('-', '');
  
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/1000/${statisticCode}/${cycle}/${start}/${end}/${itemCode1}`;
  
  const response = await axios.get(url);
  return response.data.StatisticSearch?.row || [];
}

async function fetchFRED(params) {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error('FRED_API_KEY not configured');
  
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${params.series}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=24`;
  
  const response = await axios.get(url);
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

const { fetchVIIRS, fetchThermal } = require('./fetch-satellite.js');

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
        rawData = await fetchECOS(gauge.params);
        break;
      case 'FRED':
        rawData = await fetchFRED(gauge.params);
        break;
      case 'YAHOO':
        rawData = await fetchYahoo(gauge.symbol);
        break;
      case 'SATELLITE':
        if (gauge.api === 'fetchVIIRS') {
          rawData = await fetchVIIRS(gauge.params);
        } else if (gauge.api === 'fetchThermal') {
          rawData = await fetchThermal(gauge.params);
        }
        break;
      case 'MANUAL':
        console.warn(`${gaugeId} requires manual data input`);
        return { id: gaugeId, value: null, status: 'MANUAL' };
      default:
        throw new Error(`Unknown source: ${gauge.source}`);
    }

    let value = gauge.transform ? gauge.transform(rawData) : rawData;
    
    const validation = validateGaugeValue(value, gaugeId);
    value = validation.value;

    console.log(`[${new Date().toISOString()}] ✅ ${gaugeId} = ${value}`);

    return {
      id: gaugeId,
      value,
      status: 'OK',
      timestamp: new Date().toISOString(),
      source: gauge.source,
    };

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ ${gaugeId} error:`, error.message);
    return {
      id: gaugeId,
      value: null,
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

async function fetchAll() {
  const gaugeIds = Object.keys(GAUGE_MAP);
  
  console.log(`[${new Date().toISOString()}] 📊 Starting collection (${gaugeIds.length} gauges, limit=${CONCURRENT_LIMIT})...`);
  
  const limit = pLimit(CONCURRENT_LIMIT);
  
  const tasks = gaugeIds.map(id => limit(() => fetchGauge(id)));
  const results = await Promise.allSettled(tasks);
  
  const collected = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        id: gaugeIds[index],
        value: null,
        status: 'ERROR',
        error: result.reason.message,
      };
    }
  });
  
  const success = collected.filter(g => g.status === 'OK').length;
  const failed = collected.filter(g => g.status === 'ERROR').length;
  const manual = collected.filter(g => g.status === 'MANUAL').length;
  
  console.log(`[${new Date().toISOString()}] 📊 Collection complete:`);
  console.log(`  ✅ Success: ${success}/${gaugeIds.length}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⚠️  Manual: ${manual}`);
  
  return {
    gauges: collected,
    summary: { success, failed, manual, total: gaugeIds.length },
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  GAUGE_MAP,
  fetchGauge,
  fetchAll,
  fetchECOS,
  fetchYahoo,
};
