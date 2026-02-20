'use strict';

/**
 * DIAH-7M Stock Pipeline — 주식 데이터 수집
 * ═══════════════════════════════════════════════════
 * Yahoo Finance quoteSummary + chart API (무료)
 * + 위성 데이터 (GEE, 추후 연결)
 * + DERIVED 계산 (RSI, 52W 강도, 거래량 추세, OPM 추세)
 *
 * data-pipeline.js의 fetchAll 패턴 재사용:
 *   STOCK_GAUGE_MAP → fetchStockGauge() → fetchAllStockGauges()
 */

var axios = require('axios');
var http = require('http');
var https = require('https');
var fetchSat = require('./fetch-satellite');
var profilesMod = require('../data/stock-profiles-100');
var conc = require('./concurrency');
var alerter = require('./alerter');

var YAHOO_TIMEOUT = 8000;
var YAHOO_BASE = 'https://query1.finance.yahoo.com';

// ── HTTP 커넥션 풀링 (EMFILE 방지, keep-alive 재사용) ──
var httpAgent = new http.Agent({ keepAlive: true, maxSockets: 20 });
var httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 20 });

// ── 전역 Rate Limiter: 초당 0.5 req, burst 2 ──
// 429 반복의 구조적 원인 제거 — 배치/사용자 요청 모두 이 제한을 통과
var _yahooRL = new conc.RateLimiter(2, 0.5);
_yahooRL.startDrain();

// ── 동시접속 보호: coalescer + semaphore + singleton crumb ──
var _yahooSem = new conc.Semaphore(3);       // Yahoo 동시 3개 제한 (기존 5→3)
var _summaryCoalescer = new conc.RequestCoalescer(); // 동일 종목 중복 방지
var _chartCoalescer = new conc.RequestCoalescer();
var _gaugeCoalescer = new conc.RequestCoalescer();
var _crumbSingleton = new conc.SingletonRefresh();   // crumb 갱신 1회 보호

// ── CircuitBreaker — Yahoo Stock + GEE Stock ──
// Yahoo Stock: crumb 만료 + 429 빈번 → 3연속 실패 = 장애
// GEE Stock: callback 무응답 → 3연속 실패 = 장애
var _escalate = alerter.onCBEscalate;
var _cbYahooStock = new conc.CircuitBreaker('YAHOO_STOCK', { failThreshold: 3, resetTimeout: 45000, onEscalate: _escalate });
var _cbGEEStock = new conc.CircuitBreaker('GEE_STOCK', { failThreshold: 3, resetTimeout: 60000, onEscalate: _escalate });
conc.globalMonitor.register('YAHOO_STOCK', _cbYahooStock);
conc.globalMonitor.register('GEE_STOCK', _cbGEEStock);

// ── 캐시 크기 제한 유틸 (메모리 누수 방지) ──
var MAX_CACHE_SIZE = 150; // 100종목 + 여유분
function _pruneCache(cache) {
  var keys = Object.keys(cache);
  if (keys.length <= MAX_CACHE_SIZE) return;
  // 오래된 50% 제거
  keys.sort(function(a, b) { return (cache[a].ts || 0) - (cache[b].ts || 0); });
  var removeCount = Math.floor(keys.length / 2);
  for (var i = 0; i < removeCount; i++) delete cache[keys[i]];
}

// ── 게이지 → 데이터소스 매핑 ─────────────────────────

var STOCK_GAUGE_MAP = {
  // SV: 밸류에이션 (Yahoo quoteSummary)
  SG_V1: { source: 'YAHOO_SUMMARY', module: 'defaultKeyStatistics', field: 'trailingPE' },
  SG_V2: { source: 'YAHOO_SUMMARY', module: 'defaultKeyStatistics', field: 'priceToBook' },
  SG_V3: { source: 'YAHOO_SUMMARY', module: 'defaultKeyStatistics', field: 'enterpriseToEbitda' },
  SG_V4: { source: 'YAHOO_SUMMARY', module: 'summaryDetail', field: 'dividendYield', multiply: 100 },

  // SG: 성장 (Yahoo financialData)
  SG_G1: { source: 'YAHOO_SUMMARY', module: 'financialData', field: 'revenueGrowth', multiply: 100 },
  SG_G2: { source: 'YAHOO_SUMMARY', module: 'financialData', field: 'earningsGrowth', multiply: 100 },
  SG_G3: { source: 'DERIVED', calc: 'opmTrend' },

  // SQ: 재무건전성 (Yahoo financialData)
  SG_Q1: { source: 'YAHOO_SUMMARY', module: 'financialData', field: 'returnOnEquity', multiply: 100 },
  SG_Q2: { source: 'YAHOO_SUMMARY', module: 'financialData', field: 'debtToEquity' },
  SG_Q3: { source: 'YAHOO_SUMMARY', module: 'financialData', field: 'freeCashflow', transform: 'fcfMargin' },

  // SM: 모멘텀 (Yahoo chart DERIVED)
  SG_M1: { source: 'DERIVED', calc: 'rsi14' },
  SG_M2: { source: 'DERIVED', calc: 'relativeStrength52w' },
  SG_M3: { source: 'DERIVED', calc: 'volumeTrend' },

  // SS: 위성 (GEE → 추후 연결)
  SG_S1: { source: 'SATELLITE', api: 'fetchVIIRS' },
  SG_S2: { source: 'SATELLITE', api: 'fetchLandsat' },
};

// ── Yahoo crumb 인증 (quoteSummary fallback용) ────────

var _crumb = null;
var _crumbCookies = null;
var _crumbTs = 0;
var _crumbTTL = 3600 * 1000; // 1시간 유효

// User-Agent 풀 — Render IP 차단 회피용
var _UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
];
var _uaIdx = 0;
function _nextUA() {
  var ua = _UA_POOL[_uaIdx % _UA_POOL.length];
  _uaIdx++;
  return ua;
}

async function _doFetchCrumb() {
  try {
    var ua = _nextUA();
    // 1) fc.yahoo.com → Set-Cookie 수집
    var cookieRes = await axios.get('https://fc.yahoo.com', {
      timeout: 5000,
      headers: { 'User-Agent': ua },
      httpsAgent: httpsAgent,
      maxRedirects: 0,
      validateStatus: function (s) { return s < 400 || s === 404; },
    });
    var setCookies = cookieRes.headers['set-cookie'] || [];
    _crumbCookies = setCookies.map(function (c) { return c.split(';')[0]; }).join('; ');

    // 2) crumb 토큰 가져오기
    var crumbRes = await axios.get('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      timeout: 5000,
      httpsAgent: httpsAgent,
      headers: { 'User-Agent': ua, 'Cookie': _crumbCookies },
    });
    if (crumbRes.data && typeof crumbRes.data === 'string' && crumbRes.data.length > 0) {
      _crumb = crumbRes.data;
      _crumbTs = Date.now();
      console.log('[StockPipeline] crumb refreshed OK');
    } else {
      throw new Error('crumb empty response');
    }
  } catch (err) {
    console.error('[StockPipeline] crumb fetch error:', err.message);
    _crumb = null;
    _crumbCookies = null;
  }
}

async function ensureCrumb() {
  var now = Date.now();
  if (_crumb && _crumbCookies && (now - _crumbTs < _crumbTTL)) return;
  await _crumbSingleton.refresh(_doFetchCrumb);
}

// ── Yahoo quoteSummary API ──────────────────────────
// 전략: query1 v11 (crumb 불필요) → 실패 시 query2 v10 + crumb fallback
// 401/404는 CB failure 카운트에서 제외 (crumb 문제이지 서버 장애가 아님)

var _summaryCache = {};
var _summaryTTL = 24 * 3600 * 1000; // 24h

// query2 v10 + crumb — CB 바깥에서 직접 호출 (CB OPEN 루프 방지)
// Rate Limiter 통과 후 실행 (초당 0.5 req 전역 제한)
async function _fetchSummaryWithCrumb(ticker) {
  await ensureCrumb();
  if (!_crumb) throw new Error('crumb unavailable');
  // 전역 Rate Limiter 대기 (429 구조적 방어)
  await _yahooRL.acquire();
  var modules = 'defaultKeyStatistics,financialData,summaryDetail';
  var url = 'https://query2.finance.yahoo.com/v10/finance/quoteSummary/' + encodeURIComponent(ticker);
  var headers = { 'User-Agent': _nextUA() };
  if (_crumbCookies) headers['Cookie'] = _crumbCookies;
  var res = await axios.get(url, {
    params: { modules: modules, crumb: _crumb },
    timeout: YAHOO_TIMEOUT,
    headers: headers,
    httpsAgent: httpsAgent,
  });
  var result = res.data && res.data.quoteSummary && res.data.quoteSummary.result;
  return (result && result[0]) || null;
}

// 429 발생 시 지수 백오프 대기 (CB failure 카운트 제외)
async function _wait429(attempt) {
  var ms = Math.min(60000, 5000 * Math.pow(2, attempt)) + Math.random() * 3000;
  console.warn('[StockPipeline] 429 rate limit — waiting', Math.round(ms / 1000) + 's before retry');
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function _doFetchYahooSummary(ticker) {
  var now = Date.now();
  var cached = _summaryCache[ticker];
  // TTL 내 캐시: 바로 반환
  if (cached && (now - cached.ts < _summaryTTL)) return cached.data;

  return _yahooSem.run(async function() {
    var data = null;

    // CB OPEN 확인 — OPEN이면 바로 Last Good 반환 (crumb 갱신은 이미 동작 중)
    if (_cbYahooStock.state === 'OPEN') {
      _crumb = null; _crumbTs = 0;
      try {
        data = await _fetchSummaryWithCrumb(ticker);
        if (data && _cbYahooStock.reset) _cbYahooStock.reset();
        if (data) { _summaryCache[ticker] = { data: data, ts: now }; _pruneCache(_summaryCache); }
        return data;
      } catch (e) {
        return cached ? cached.data : null;
      }
    }

    // 429 발생 시 최대 2회 재시도 — CB 바깥에서 429 감지 후 처리
    // 전략: _fetchSummaryWithCrumb 직접 호출 → 429 감지 → 백오프 후 재시도
    //       성공/실패(429 제외)만 CB에 카운트
    for (var attempt = 0; attempt <= 2; attempt++) {
      try {
        // 먼저 CB 바깥에서 직접 호출 (429 선감지용)
        data = await _fetchSummaryWithCrumb(ticker);
        // 성공 → CB에 성공 카운트 (수동)
        _cbYahooStock._onSuccess && _cbYahooStock._onSuccess();
        break;
      } catch (err) {
        var status = err.response && err.response.status;
        var is429 = status === 429;
        var is401 = status === 401;

        if (is429) {
          // 429: CB failure 카운트 없이 백오프 후 재시도
          if (attempt < 2) { await _wait429(attempt); continue; }
          console.warn('[StockPipeline] 429 persists for', ticker, '— returning last good');
          return cached ? cached.data : null;
        } else if (is401) {
          // crumb 만료 → 갱신 후 1회 재시도
          _crumb = null; _crumbTs = 0;
          try {
            data = await _fetchSummaryWithCrumb(ticker);
            _cbYahooStock._onSuccess && _cbYahooStock._onSuccess();
          } catch (e3) {
            _cbYahooStock._onFailure && _cbYahooStock._onFailure(e3);
            return cached ? cached.data : null;
          }
          break;
        } else {
          // 그 외 실패 → CB failure 카운트
          _cbYahooStock._onFailure && _cbYahooStock._onFailure(err);
          console.error('[StockPipeline] Yahoo summary error for', ticker, ':', err.message);
          return cached ? cached.data : null;
        }
      }
    }

    if (data) {
      _summaryCache[ticker] = { data: data, ts: now };
      _pruneCache(_summaryCache);
    }
    return data;
  });
}

// coalescer: TSLA 50명 동시 → Yahoo 1회 호출
async function fetchYahooSummary(ticker) {
  return _summaryCoalescer.run('summary:' + ticker, function() {
    return _doFetchYahooSummary(ticker);
  });
}

// ── Yahoo chart API (가격 히스토리) ──────────────────

var _chartCache = {};
var _chartTTL = 15 * 60 * 1000; // 15분

async function _doFetchYahooChart(ticker, range) {
  var rng = range || '1y';
  var cKey = ticker + ':' + rng;
  var now = Date.now();
  var cached = _chartCache[cKey];
  if (cached && (now - cached.ts < _chartTTL)) return cached.data;

  var url = YAHOO_BASE + '/v8/finance/chart/' + encodeURIComponent(ticker);

  return _yahooSem.run(async function() {
    try {
      var data = await _cbYahooStock.run(async function() {
        await _yahooRL.acquire(); // chart도 Rate Limiter 통과
        var res = await axios.get(url, {
          params: { interval: '1d', range: rng },
          timeout: YAHOO_TIMEOUT,
          headers: { 'User-Agent': _nextUA() },
          httpsAgent: httpsAgent,
        });

        var chart = res.data && res.data.chart && res.data.chart.result;
        return (chart && chart[0]) || null;
      });

      if (data) {
        _chartCache[cKey] = { data: data, ts: now };
        _pruneCache(_chartCache);
      }
      return data;
    } catch (err) {
      console.error('[StockPipeline] Yahoo chart error for', ticker, ':', err.message);
      return null;
    }
  });
}

async function fetchYahooChart(ticker, range) {
  var rng = range || '1y';
  return _chartCoalescer.run('chart:' + ticker + ':' + rng, function() {
    return _doFetchYahooChart(ticker, rng);
  });
}

// ── DERIVED 계산 함수들 ─────────────────────────────

function extractCloses(chartData) {
  if (!chartData || !chartData.indicators || !chartData.indicators.quote) return [];
  var q = chartData.indicators.quote[0];
  return (q && q.close) ? q.close.filter(function (v) { return v != null; }) : [];
}

function extractVolumes(chartData) {
  if (!chartData || !chartData.indicators || !chartData.indicators.quote) return [];
  var q = chartData.indicators.quote[0];
  return (q && q.volume) ? q.volume.filter(function (v) { return v != null; }) : [];
}

// RSI 14일
function calcRSI14(closes) {
  if (closes.length < 15) return null;
  var recent = closes.slice(-15);
  var gains = 0, losses = 0;
  for (var i = 1; i < recent.length; i++) {
    var diff = recent[i] - recent[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  var avgGain = gains / 14;
  var avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  var rs = avgGain / avgLoss;
  return Math.round((100 - (100 / (1 + rs))) * 10) / 10;
}

// 52주 상대강도 (현재가 위치 0~100%)
function calcRelativeStrength52w(closes) {
  if (closes.length < 20) return null;
  var recent = closes.slice(-252); // 최대 1년
  var lo = Math.min.apply(null, recent);
  var hi = Math.max.apply(null, recent);
  if (hi === lo) return 50;
  var cur = recent[recent.length - 1];
  return Math.round(((cur - lo) / (hi - lo)) * 100 * 10) / 10;
}

// 거래량 추세 (20d avg / 60d avg, %)
function calcVolumeTrend(volumes) {
  if (volumes.length < 60) return null;
  var v20 = volumes.slice(-20);
  var v60 = volumes.slice(-60);
  var avg20 = v20.reduce(function (s, v) { return s + v; }, 0) / v20.length;
  var avg60 = v60.reduce(function (s, v) { return s + v; }, 0) / v60.length;
  if (avg60 === 0) return null;
  return Math.round((avg20 / avg60) * 100 * 10) / 10;
}

// OPM 추세 (영업이익률 변화, bps) — summaryData에서 추출
// 전략: earningsGrowth - revenueGrowth 로 마진 방향 추정
//   양수 = 이익성장 > 매출성장 → 마진 확대 (긍정)
//   음수 = 이익성장 < 매출성장 → 마진 축소 (부정)
//   둘 다 없으면 operatingMargins 현재값 bps 반환 (fallback)
function calcOpmTrend(summaryData) {
  if (!summaryData || !summaryData.financialData) return null;
  var fd = summaryData.financialData;

  var earnGr = (fd.earningsGrowth && fd.earningsGrowth.raw != null) ? fd.earningsGrowth.raw : null;
  var revGr = (fd.revenueGrowth && fd.revenueGrowth.raw != null) ? fd.revenueGrowth.raw : null;

  // 두 성장률 모두 있으면 차이로 마진 방향 추정 (bps 단위)
  if (earnGr != null && revGr != null) {
    return Math.round((earnGr - revGr) * 10000); // 예: 0.15 - 0.10 = 500bps
  }

  // fallback: 현재 영업이익률 bps (추세 대신 수준)
  var opm = (fd.operatingMargins && fd.operatingMargins.raw != null) ? fd.operatingMargins.raw : null;
  if (opm != null) return Math.round(opm * 10000);
  return null;
}

// FCF 마진 (%) — freeCashflow / totalRevenue
function calcFcfMargin(summaryData) {
  if (!summaryData || !summaryData.financialData) return null;
  var fcf = summaryData.financialData.freeCashflow;
  var rev = summaryData.financialData.totalRevenue;
  var fcfVal = (fcf && fcf.raw != null) ? fcf.raw : null;
  var revVal = (rev && rev.raw != null) ? rev.raw : null;
  if (fcfVal == null || revVal == null || revVal === 0) return null;
  return Math.round((fcfVal / revVal) * 100 * 10) / 10;
}

// ── Yahoo raw 값 추출 헬퍼 ──────────────────────────

function extractYahooValue(summaryData, moduleKey, fieldKey, multiply) {
  if (!summaryData || !summaryData[moduleKey]) return null;
  var field = summaryData[moduleKey][fieldKey];
  if (!field) return null;
  var val = (field.raw != null) ? field.raw : field;
  if (typeof val !== 'number' || isNaN(val)) return null;
  if (multiply) val = val * multiply;
  return Math.round(val * 100) / 100;
}

// ── 개별 게이지 수집 ────────────────────────────────

async function fetchStockGauge(gaugeId, ticker, summaryData, chartData) {
  var map = STOCK_GAUGE_MAP[gaugeId];
  if (!map) return { id: gaugeId, value: null, status: 'UNKNOWN_GAUGE' };

  try {
    if (map.source === 'YAHOO_SUMMARY') {
      if (map.transform === 'fcfMargin') {
        var fcm = calcFcfMargin(summaryData);
        return { id: gaugeId, value: fcm, status: fcm != null ? 'OK' : 'NO_DATA' };
      }
      var val = extractYahooValue(summaryData, map.module, map.field, map.multiply);
      return { id: gaugeId, value: val, status: val != null ? 'OK' : 'NO_DATA' };
    }

    if (map.source === 'DERIVED') {
      var closes = extractCloses(chartData);
      var volumes = extractVolumes(chartData);
      var derived = null;

      if (map.calc === 'rsi14') derived = calcRSI14(closes);
      else if (map.calc === 'relativeStrength52w') derived = calcRelativeStrength52w(closes);
      else if (map.calc === 'volumeTrend') derived = calcVolumeTrend(volumes);
      else if (map.calc === 'opmTrend') derived = calcOpmTrend(summaryData);

      return { id: gaugeId, value: derived, status: derived != null ? 'OK' : 'NO_DATA' };
    }

    if (map.source === 'SATELLITE') {
      // 위성 데이터는 fetchSatelliteGauges()로 별도 수집
      // 개별 gauge 단위로는 수집하지 않음 (facility 단위 배치)
      return { id: gaugeId, value: null, status: 'NEEDS_SATELLITE' };
    }

    return { id: gaugeId, value: null, status: 'UNKNOWN_SOURCE' };
  } catch (err) {
    return { id: gaugeId, value: null, status: 'ERROR', error: err.message };
  }
}

// ── 종목 전체 게이지 수집 ────────────────────────────

async function _doFetchAllStockGauges(ticker, opts) {
  opts = opts || {};
  var summaryData = await fetchYahooSummary(ticker);
  var chartData = await fetchYahooChart(ticker, '1y');

  var gaugeIds = Object.keys(STOCK_GAUGE_MAP);
  var results = {};
  var ok = 0, errors = 0;

  for (var i = 0; i < gaugeIds.length; i++) {
    var gId = gaugeIds[i];
    var result = await fetchStockGauge(gId, ticker, summaryData, chartData);
    results[gId] = result;
    if (result.status === 'OK') ok++;
    else errors++;
  }

  // 위성 게이지 병합 (GEE 인증 가능 시)
  if (opts.includeSatellite !== false) {
    try {
      var satGauges = await fetchSatelliteGauges(ticker);
      if (satGauges.SG_S1 && satGauges.SG_S1.status === 'OK') {
        results.SG_S1 = satGauges.SG_S1;
        ok++; errors--; // NEEDS_SATELLITE → OK 전환
      }
      if (satGauges.SG_S2 && satGauges.SG_S2.status === 'OK') {
        results.SG_S2 = satGauges.SG_S2;
        ok++; errors--;
      }
    } catch (err) {
      console.warn('[StockPipeline] satellite gauge merge skipped for', ticker, ':', err.message);
    }
  }

  return {
    ticker: ticker,
    gauges: results,
    summary: { total: gaugeIds.length, ok: ok, errors: errors },
    timestamp: new Date().toISOString(),
  };
}

// coalescer: 동일 종목 동시 요청 → 1회만 수집
async function fetchAllStockGauges(ticker, opts) {
  return _gaugeCoalescer.run('gauges:' + ticker, function() {
    return _doFetchAllStockGauges(ticker, opts);
  });
}

// ── 배치 수집 (Killer 10 / All) ──────────────────────

async function fetchStockBatch(tickers) {
  var results = {};
  for (var i = 0; i < tickers.length; i++) {
    var t = tickers[i];
    try {
      results[t] = await fetchAllStockGauges(t);
      console.log('[StockPipeline]', t, ':', results[t].summary.ok + '/' + results[t].summary.total, 'OK');
    } catch (err) {
      console.error('[StockPipeline] Batch error for', t, ':', err.message);
      results[t] = { ticker: t, gauges: {}, summary: { total: 15, ok: 0, errors: 15 }, error: err.message };
    }
    // 종목 간 2초 간격 (서버 재시작 후 burst 방지)
    if (i < tickers.length - 1) {
      await new Promise(function(r) { setTimeout(r, 2000); });
    }
  }
  return results;
}

// ── ticker → Yahoo symbol 매핑 ───────────────────────

// 한국(.KS), 일본(.T), 홍콩(.HK), 사우디(.SR), 대만(.TW), 중국(.SS/.SZ)
var SUFFIX_MAP = { KR:'.KS', JP:'.T', HK:'.HK', SA:'.SR', TW:'.TW' };
// 중국은 6/0으로 시작하는 숫자 → .SS(상해)/.SZ(심천)
function toYahooSymbol(ticker, country) {
  if (!country) return ticker;
  // 이미 접미사 있으면 그대로
  if (ticker.includes('.')) return ticker;
  // 알파벳만(ADR/미국상장)이면 접미사 안 붙임 (TSM, BYD, NIO, LI 등)
  if (/^[A-Za-z]+$/.test(ticker)) return ticker;
  // 숫자 포함 ticker → 로컬 거래소
  // 한국 6자리: 005930.KS
  if (country === 'KR' && /^\d{6}$/.test(ticker)) return ticker + '.KS';
  // 일본 4자리: 7203.T
  if (country === 'JP' && /^\d{4}$/.test(ticker)) return ticker + '.T';
  // 홍콩 4자리: 9866.HK
  if ((country === 'HK' || country === 'CN') && /^\d{4}$/.test(ticker)) return ticker + '.HK';
  // 중국 본토 6자리: 601857.SS / 300750.SZ
  if (country === 'CN' && /^\d{6}$/.test(ticker)) {
    return ticker.startsWith('6') ? ticker + '.SS' : ticker + '.SZ';
  }
  // 대만 4자리: 2330.TW
  if (country === 'TW' && /^\d{4}$/.test(ticker)) return ticker + '.TW';
  // 사우디: 2222.SR
  if (country === 'SA' && /^\d{4}$/.test(ticker)) return ticker + '.SR';
  return ticker;
}

// ── 종목 가격 수집 (chart meta에서 추출) ──────────────

var _priceCache = {};
var _priceTTL = 5 * 60 * 1000; // 5분

async function fetchStockPrice(ticker, country) {
  var now = Date.now();
  var cached = _priceCache[ticker];
  if (cached && (now - cached.ts < _priceTTL)) return cached.data;

  var yahooSym = toYahooSymbol(ticker, country);
  var chartData = await fetchYahooChart(yahooSym, '5d');
  if (!chartData || !chartData.meta) return null;

  var meta = chartData.meta;
  var price = meta.regularMarketPrice;
  var prevClose = meta.chartPreviousClose || meta.previousClose;
  var currency = meta.currency || 'USD';

  if (price == null) return null;

  var change = (prevClose && prevClose > 0)
    ? Math.round(((price - prevClose) / prevClose) * 10000) / 100
    : null;

  var result = {
    price: price,
    prevClose: prevClose || null,
    change: change,
    currency: currency,
    marketState: meta.currentTradingPeriod ? 'open' : 'closed',
    updatedAt: new Date().toISOString(),
  };

  _priceCache[ticker] = { data: result, ts: now };
  _pruneCache(_priceCache);
  return result;
}

// 배치 가격 수집 — profiles 배열 [{ticker, country}, ...]
async function fetchStockPrices(profiles) {
  var results = {};
  for (var i = 0; i < profiles.length; i++) {
    var p = profiles[i];
    var t = (typeof p === 'string') ? p : p.ticker;
    var c = (typeof p === 'string') ? null : p.country;
    try {
      results[t] = await fetchStockPrice(t, c);
    } catch (err) {
      results[t] = null;
    }
  }
  return results;
}

// ── 위성 게이지 수집 (SG_S1/SG_S2 = facility V2 수축 평균) ──

/**
 * V2 수축 평균 (score-engine.js와 동일)
 */
function _shrinkageMean(values, k) {
  k = k || 4;
  var valid = values.filter(function(v) { return v != null; });
  if (valid.length === 0) return null;
  var sum = 0;
  for (var i = 0; i < valid.length; i++) sum += valid[i];
  var raw = sum / valid.length;
  return Math.round(((valid.length * raw + k * 0) / (valid.length + k)) * 100) / 100;
}

/**
 * fetchSatelliteGauges — 종목의 process 시설에서 위성 데이터 수집
 * SG_S1 = NTL anomPct의 V2 수축 평균 (%)
 * SG_S2 = THERMAL anomaly_degC의 V2 수축 평균 (°C)
 *
 * @param {string} ticker - 종목 ticker
 * @returns {{ SG_S1: {id, value, status}, SG_S2: {id, value, status} }}
 */
async function fetchSatelliteGauges(ticker) {
  var profile = profilesMod.getProfile(ticker);
  if (!profile) return {
    SG_S1: { id: 'SG_S1', value: null, status: 'NO_PROFILE' },
    SG_S2: { id: 'SG_S2', value: null, status: 'NO_PROFILE' },
  };

  // process 시설만 (공장/정유/데이터센터 등 — 실제 생산 활동 발생 지점)
  var processFacilities = (profile.facilities || []).filter(function(f) {
    return f.stage === 'process' && !f.underConstruction;
  });

  if (processFacilities.length === 0) {
    // stage 미지정 fallback: 생산형 시설 타입만 허용 (port/terminal 제외)
    // → SG_S1/S2는 "생산 가동률" 지표이므로, 항만 야간광을 섞으면 오염됨
    var PRODUCTION_TYPES = ['fab','assembly','manufacturing','battery','steelworks',
      'chemical','refinery','datacenter','mine','plant','factory','fulfillment','hub','campus'];
    processFacilities = (profile.facilities || []).filter(function(f) {
      return !f.underConstruction && PRODUCTION_TYPES.indexOf(f.type) >= 0;
    });
  }

  var ntlAnomalies = [];
  var thermalAnomalies = [];

  for (var i = 0; i < processFacilities.length; i++) {
    var f = processFacilities[i];
    try {
      // CircuitBreaker: GEE 장애 시 빠른 실패 (30s 타임아웃 대기 대신 즉시 거부)
      var sensorData = await _cbGEEStock.run(function() {
        return fetchSat.fetchFacilitySensors(f);
      });

      if (sensorData.NTL && sensorData.NTL.anomPct != null) {
        ntlAnomalies.push(sensorData.NTL.anomPct);
      }
      if (sensorData.THERMAL && sensorData.THERMAL.anomaly_degC != null) {
        thermalAnomalies.push(sensorData.THERMAL.anomaly_degC);
      }
    } catch (err) {
      console.warn('[StockPipeline] satellite gauge error for', f.name, ':', err.message);
    }
  }

  // V2 수축 평균으로 단일 값 산출
  var s1Val = _shrinkageMean(ntlAnomalies, 3);
  var s2Val = _shrinkageMean(thermalAnomalies, 3);

  return {
    SG_S1: { id: 'SG_S1', value: s1Val, status: s1Val != null ? 'OK' : 'NO_DATA' },
    SG_S2: { id: 'SG_S2', value: s2Val, status: s2Val != null ? 'OK' : 'NO_DATA' },
  };
}

module.exports = {
  STOCK_GAUGE_MAP: STOCK_GAUGE_MAP,
  toYahooSymbol: toYahooSymbol,
  fetchYahooSummary: fetchYahooSummary,
  fetchYahooChart: fetchYahooChart,
  fetchStockGauge: fetchStockGauge,
  fetchAllStockGauges: fetchAllStockGauges,
  fetchStockBatch: fetchStockBatch,
  fetchStockPrice: fetchStockPrice,
  fetchStockPrices: fetchStockPrices,
  fetchSatelliteGauges: fetchSatelliteGauges,
  _circuitBreakers: { YAHOO_STOCK: _cbYahooStock, GEE_STOCK: _cbGEEStock },
};
