/**
 * DIAH-7M Data Pipeline v2
 * 
 * GPT 피드백 반영 (2026-02-16):
 * - node-cron 제거 → 외부 Trigger API
 * - p-limit 적용 (동시 5개 제한)
 * - 데이터 검증 강화 (null/NaN/타입)
 * - Yahoo API 분리 (캐싱)
 * 
 * 59개 게이지 수집 파이프라인
 */

import axios from 'axios';
import pLimit from 'p-limit'; // GPT 피드백: 병렬도 제한

// ==========================================
// 설정
// ==========================================

const CONCURRENT_LIMIT = 5; // 동시 API 호출 제한
const CACHE_TTL = 30 * 60 * 1000; // 30분 캐시

// ==========================================
// 캐시 (메모리)
// ==========================================

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
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

// ==========================================
// 데이터 검증 (GPT 피드백)
// ==========================================

/**
 * 게이지 값 검증 (null/NaN/타입 체크)
 */
function validateGaugeValue(value, gaugeId) {
  // null/undefined 허용 (데이터 없음)
  if (value === null || value === undefined) {
    return { valid: true, value: null };
  }
  
  // NaN 체크
  if (typeof value === 'number' && isNaN(value)) {
    console.warn(`[${gaugeId}] NaN detected, returning null`);
    return { valid: true, value: null };
  }
  
  // Infinity 체크
  if (!isFinite(value)) {
    console.warn(`[${gaugeId}] Infinity detected, returning null`);
    return { valid: true, value: null };
  }
  
  // 타입 체크 (숫자만 허용)
  if (typeof value !== 'number') {
    console.warn(`[${gaugeId}] Invalid type: ${typeof value}, expected number`);
    return { valid: true, value: null };
  }
  
  return { valid: true, value };
}

// ==========================================
// 59 GAUGE_MAP
// ==========================================

export const GAUGE_MAP = {
  // O축 (7개)
  O1_EXPORT: {
    id: 'O1_EXPORT',
    name: '수출액',
    source: 'KOSIS',
    // ... (기존 로직)
  },
  
  O2_PMI: {
    id: 'O2_PMI',
    name: '제조업출하지수 (PMI 대체)', // GPT 피드백: 명칭 명시
    source: 'ECOS',
    params: {
      statisticCode: 'I31A',
      itemCode1: '10101',
      cycle: 'M',
    },
    transform: (data) => {
      if (!data || data.length < 6) return null;
      const recent3 = data.slice(0, 3).reduce((sum, d) => sum + parseFloat(d.DATA_VALUE), 0) / 3;
      const prev3 = data.slice(3, 6).reduce((sum, d) => sum + parseFloat(d.DATA_VALUE), 0) / 3;
      return ((recent3 - prev3) / prev3) * 100;
    }
  },
  
  // ... 나머지 O축 게이지
  
  // F축 (8개)
  F1_KOSPI: {
    id: 'F1_KOSPI',
    name: 'KOSPI',
    source: 'YAHOO',
    symbol: '^KS11',
    // GPT 피드백: 캐싱 필수, 직접 호출 금지
    transform: (data) => {
      if (!data || !data.chart) return null;
      const prices = data.chart.result[0].indicators.quote[0].close;
      if (!prices || prices.length < 2) return null;
      const latest = prices[prices.length - 1];
      const prev = prices[prices.length - 2];
      return ((latest - prev) / prev) * 100;
    }
  },
  
  // ... 나머지 F축 게이지
  
  // S축 (7개)
  S1_BSI: {
    id: 'S1_BSI',
    name: '기업경기실사지수',
    source: 'ECOS',
    params: {
      statisticCode: 'B01',
      itemCode1: '10101',
      cycle: 'M',
    },
    transform: (data) => {
      if (!data || data.length === 0) return null;
      const latest = parseFloat(data[0].DATA_VALUE);
      return latest - 100;
    },
    validate: (value) => {
      if (value === null) return { valid: false, reason: 'No data' };
      if (value < -50 || value > 50) return { valid: false, reason: 'Out of range' };
      return { valid: true };
    }
  },
  
  S3_NIGHTLIGHT: {
    id: 'S3_NIGHTLIGHT',
    name: '야간광도',
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
  
  // ... 나머지 축들 (P, R, I, T, E, L)
};

// ==========================================
// API 연동 함수
// ==========================================

export async function fetchECOS(params) {
  const apiKey = process.env.ECOS_API_KEY;
  if (!apiKey) throw new Error('ECOS_API_KEY not configured');
  
  const { statisticCode, itemCode1, cycle, startDate, endDate } = params;
  const end = endDate || new Date().toISOString().slice(0, 7).replace('-', '');
  const start = startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7).replace('-', '');
  
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/1000/${statisticCode}/${cycle}/${start}/${end}/${itemCode1}`;
  
  const response = await axios.get(url);
  return response.data.StatisticSearch?.row || [];
}

export async function fetchKOSIS(params) {
  // ... (기존 로직)
}

/**
 * GPT 피드백: Yahoo Finance는 Cron에서만 호출, 캐싱 필수
 */
export async function fetchYahoo(symbol) {
  // 캐시 확인
  const cached = getCached(`yahoo:${symbol}`);
  if (cached) {
    console.log(`[Yahoo] Using cached data for ${symbol}`);
    return cached;
  }
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
  
  try {
    const response = await axios.get(url, {
      params: { interval: '1d', range: '1mo' },
      timeout: 5000,
    });
    
    const data = response.data;
    setCache(`yahoo:${symbol}`, data);
    console.log(`[Yahoo] Fetched and cached ${symbol}`);
    return data;
  } catch (error) {
    console.error(`[Yahoo] Error fetching ${symbol}:`, error.message);
    return null;
  }
}

// 위성 데이터 (Mock 유지)
import { fetchVIIRS, fetchThermal } from './fetch-satellite.js';

// ==========================================
// 개별 게이지 수집
// ==========================================

export async function fetchGauge(gaugeId) {
  const gauge = GAUGE_MAP[gaugeId];
  if (!gauge) throw new Error(`Unknown gauge: ${gaugeId}`);
  
  console.log(`[${new Date().toISOString()}] Fetching ${gaugeId} from ${gauge.source}...`);
  
  let rawData;
  
  try {
    switch (gauge.source) {
      case 'ECOS':
        rawData = await fetchECOS(gauge.params);
        break;
      case 'KOSIS':
        rawData = await fetchKOSIS(gauge.params);
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
    
    // 변환
    let value = gauge.transform ? gauge.transform(rawData) : rawData;
    
    // GPT 피드백: 데이터 검증 강화
    const validation = validateGaugeValue(value, gaugeId);
    value = validation.value;
    
    // 게이지별 검증 (있으면)
    if (gauge.validate && value !== null) {
      const gaugeValidation = gauge.validate(value);
      if (!gaugeValidation.valid) {
        console.error(`${gaugeId} validation failed: ${gaugeValidation.reason}`);
        return { id: gaugeId, value, status: 'INVALID', reason: gaugeValidation.reason };
      }
    }
    
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

// ==========================================
// GPT 피드백: p-limit 적용
// ==========================================

export async function fetchAll() {
  const gaugeIds = Object.keys(GAUGE_MAP);
  
  console.log(`[${new Date().toISOString()}] 📊 Starting collection (${gaugeIds.length} gauges, limit=${CONCURRENT_LIMIT})...`);
  
  // p-limit 적용
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
  
  // 통계
  const success = collected.filter(g => g.status === 'OK').length;
  const failed = collected.filter(g => g.status === 'ERROR').length;
  const manual = collected.filter(g => g.status === 'MANUAL').length;
  const invalid = collected.filter(g => g.status === 'INVALID').length;
  
  console.log(`[${new Date().toISOString()}] 📊 Collection complete:`);
  console.log(`  ✅ Success: ${success}/${gaugeIds.length}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⚠️  Manual: ${manual}`);
  console.log(`  🚫 Invalid: ${invalid}`);
  
  return {
    gauges: collected,
    summary: { success, failed, manual, invalid, total: gaugeIds.length },
    timestamp: new Date().toISOString(),
  };
}

// ==========================================
// GPT 피드백: node-cron 제거, 외부 Trigger API로 변경
// ==========================================

// 스케줄러 제거됨
// 대신 POST /api/v1/data/collect 엔드포인트로 외부 트리거 사용

export default {
  GAUGE_MAP,
  fetchGauge,
  fetchAll,
  fetchECOS,
  fetchKOSIS,
  fetchYahoo,
};
