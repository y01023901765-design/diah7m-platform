'use strict';

/**
 * DIAH-7M Stock Store — 주식 게이지 캐시 계층
 * ═══════════════════════════════════════════════════
 * Pipeline → Store (캐시) → Engine (진단)
 *
 * 복합키: (ticker, gauge_id)
 * TTL 계층: 재무 24h / 모멘텀 15m / 위성 7d
 * DataStore 패턴 재사용 (memCache + SQLite)
 */

var TTL = {
  FUNDAMENTAL: 24 * 3600 * 1000,  // 24시간
  MOMENTUM: 15 * 60 * 1000,       // 15분
  SATELLITE: 7 * 24 * 3600 * 1000, // 7일 (VIIRS 월간 발행, 2-3개월 지연)
};

// 게이지 → TTL 그룹 매핑
var GAUGE_TTL_GROUP = {
  SG_V1: 'FUNDAMENTAL', SG_V2: 'FUNDAMENTAL', SG_V3: 'FUNDAMENTAL', SG_V4: 'FUNDAMENTAL',
  SG_G1: 'FUNDAMENTAL', SG_G2: 'FUNDAMENTAL', SG_G3: 'FUNDAMENTAL',
  SG_Q1: 'FUNDAMENTAL', SG_Q2: 'FUNDAMENTAL', SG_Q3: 'FUNDAMENTAL',
  SG_M1: 'MOMENTUM', SG_M2: 'MOMENTUM', SG_M3: 'MOMENTUM',
  SG_S1: 'SATELLITE', SG_S2: 'SATELLITE',
};

class StockStore {
  constructor(db) {
    this.db = db;
    this.memCache = {};   // { 'TSLA:SG_V1': { value, prevValue, status, updatedAt } }
    this.lastFetch = {};  // { 'TSLA': timestamp }
  }

  async init() {
    if (!this.db) return;
    try {
      await this.db.run(
        'CREATE TABLE IF NOT EXISTS stock_gauge_cache (' +
        '  ticker TEXT NOT NULL,' +
        '  gauge_id TEXT NOT NULL,' +
        '  value REAL,' +
        '  prev_value REAL,' +
        '  status TEXT DEFAULT \'OK\',' +
        '  updated_at TEXT DEFAULT (datetime(\'now\')),' +
        '  PRIMARY KEY (ticker, gauge_id)' +
        ')'
      );
      await this.db.run(
        'CREATE TABLE IF NOT EXISTS stock_fetch_log (' +
        '  id INTEGER PRIMARY KEY AUTOINCREMENT,' +
        '  ticker_count INTEGER,' +
        '  ok INTEGER,' +
        '  errors INTEGER,' +
        '  duration_ms INTEGER,' +
        '  created_at TEXT DEFAULT (datetime(\'now\'))' +
        ')'
      );
      await this._loadFromDB();
    } catch (e) {
      console.warn('[StockStore] init error (non-fatal):', e.message);
    }
  }

  async _loadFromDB() {
    if (!this.db) return;
    try {
      var rows = await this.db.all('SELECT * FROM stock_gauge_cache');
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var key = r.ticker + ':' + r.gauge_id;
        this.memCache[key] = {
          value: r.value,
          prevValue: r.prev_value,
          status: r.status,
          updatedAt: r.updated_at,
        };
      }
      console.log('[StockStore] Loaded', rows.length, 'cached gauge values');
    } catch (e) {
      console.warn('[StockStore] load error:', e.message);
    }
  }

  // 게이지 저장 (smart merge — prev_value 보존)
  async store(ticker, gaugeId, value, status) {
    var key = ticker + ':' + gaugeId;
    var existing = this.memCache[key];
    var prevValue = existing ? existing.value : null;
    var now = new Date().toISOString();

    this.memCache[key] = {
      value: value,
      prevValue: prevValue,
      status: status || 'OK',
      updatedAt: now,
    };

    if (this.db) {
      try {
        await this.db.run(
          'INSERT OR REPLACE INTO stock_gauge_cache (ticker, gauge_id, value, prev_value, status, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          [ticker, gaugeId, value, prevValue, status || 'OK', now]
        );
      } catch (e) {
        // non-fatal
      }
    }
  }

  // 파이프라인 결과 일괄 저장
  async storeBatch(pipelineResult) {
    var ticker = pipelineResult.ticker;
    var gauges = pipelineResult.gauges;
    var gIds = Object.keys(gauges);

    for (var i = 0; i < gIds.length; i++) {
      var g = gauges[gIds[i]];
      if (g.value != null) {
        await this.store(ticker, gIds[i], g.value, g.status);
      }
    }

    this.lastFetch[ticker] = Date.now();
  }

  // 종목의 전체 게이지 데이터 반환 (엔진 입력용)
  toGaugeData(ticker) {
    var result = {};
    var prefix = ticker + ':';
    var keys = Object.keys(this.memCache);

    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(prefix) === 0) {
        var gaugeId = keys[i].substring(prefix.length);
        var cached = this.memCache[keys[i]];
        result[gaugeId] = {
          value: cached.value,
          prevValue: cached.prevValue,
          status: cached.status,
          updatedAt: cached.updatedAt,
        };
      }
    }

    return result;
  }

  // TTL 기반 만료 확인
  isStale(ticker) {
    var lastTs = this.lastFetch[ticker];
    if (!lastTs) return true;

    // 가장 짧은 TTL(모멘텀 15분) 기준으로 판별
    return (Date.now() - lastTs) > TTL.MOMENTUM;
  }

  // fetch 로그 기록
  async logFetch(tickerCount, ok, errors, durationMs) {
    if (!this.db) return;
    try {
      await this.db.run(
        'INSERT INTO stock_fetch_log (ticker_count, ok, errors, duration_ms) VALUES (?, ?, ?, ?)',
        [tickerCount, ok, errors, durationMs]
      );
    } catch (e) {
      // non-fatal
    }
  }
}

module.exports = StockStore;
