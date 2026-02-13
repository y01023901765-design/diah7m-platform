/**
 * DIAH-7M Data Store — 수집 데이터 캐시 계층
 * ═══════════════════════════════════════════
 * Pipeline → Store (캐시) → Engine (진단)
 * 
 * - SQLite에 최신 데이터 캐시
 * - TTL 기반 자동 만료 (기본 6시간)
 * - 수동 refresh 지원
 */

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6시간

class DataStore {
  constructor(db) {
    this.db = db;
    this.memCache = {};    // 인메모리 1차 캐시
    this.lastFetch = null;
    this.fetching = false;
  }

  async init() {
    if (!this.db) return;
    try {
      await this.db.run(`CREATE TABLE IF NOT EXISTS gauge_cache (
        gauge_id TEXT PRIMARY KEY,
        value REAL,
        prev_value REAL,
        unit TEXT,
        source TEXT,
        date TEXT,
        status TEXT DEFAULT 'OK',
        updated_at TEXT DEFAULT (datetime('now'))
      )`);
      await this.db.run(`CREATE TABLE IF NOT EXISTS fetch_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total INTEGER,
        ok INTEGER,
        errors INTEGER,
        duration_ms INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
      await this._loadFromDB();
    } catch (e) {
      console.warn('[DataStore] init error (non-fatal):', e.message);
    }
  }

  async _loadFromDB() {
    if (!this.db) return;
    try {
      const rows = await this.db.all('SELECT * FROM gauge_cache');
      for (const r of rows) {
        this.memCache[r.gauge_id] = {
          value: r.value,
          prevValue: r.prev_value,
          unit: r.unit,
          source: r.source,
          date: r.date,
          status: r.status,
          updatedAt: r.updated_at,
        };
      }
      this.lastFetch = rows.length > 0 ? rows[0]?.updated_at : null;
    } catch (e) {
      console.warn('[DataStore] DB load failed:', e.message);
    }
  }

  // 파이프라인 결과를 캐시에 저장
  async store(pipelineResults) {
    const start = Date.now();
    let okCount = 0;

    for (const [id, data] of Object.entries(pipelineResults)) {
      if (data.status === 'OK' && data.value !== null && data.value !== undefined) {
        this.memCache[id] = {
          value: data.value,
          prevValue: data.prevValue || null,
          unit: data.unit || '',
          source: data.source || 'unknown',
          date: data.date || new Date().toISOString().slice(0, 10),
          status: 'OK',
          updatedAt: new Date().toISOString(),
        };
        okCount++;

        // DB 저장
        if (this.db) {
          try {
            await this.db.run(
              `INSERT OR REPLACE INTO gauge_cache (gauge_id, value, prev_value, unit, source, date, status, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, 'OK', datetime('now'))`,
              [id, data.value, data.prevValue || null, data.unit || '', data.source || '', data.date || '']
            );
          } catch (e) { /* ignore individual save errors */ }
        }
      }
    }

    const duration = Date.now() - start;
    this.lastFetch = new Date().toISOString();

    // 로그 기록
    if (this.db) {
      try {
        await this.db.run(
          'INSERT INTO fetch_log (total, ok, errors, duration_ms) VALUES (?, ?, ?, ?)',
          [Object.keys(pipelineResults).length, okCount, Object.keys(pipelineResults).length - okCount, duration]
        );
      } catch (e) { /* ignore */ }
    }

    return { stored: okCount, duration };
  }

  // 엔진 입력 형식으로 변환: { I1: 2.5, I2: 87.4, ... }
  toGaugeData() {
    const data = {};
    for (const [id, cached] of Object.entries(this.memCache)) {
      if (cached.status === 'OK' && cached.value !== null) {
        data[id] = cached.value;
      }
    }
    return data;
  }

  // 전체 캐시 상태 (프론트 표시용)
  getStatus() {
    const entries = Object.entries(this.memCache);
    const ok = entries.filter(([, v]) => v.status === 'OK').length;
    const stale = this.isStale();
    return {
      total: entries.length,
      ok,
      stale,
      lastFetch: this.lastFetch,
      ttlMs: DEFAULT_TTL_MS,
      ttlLabel: `${DEFAULT_TTL_MS / 3600000}h`,
    };
  }

  // TTL 만료 여부
  isStale() {
    if (!this.lastFetch) return true;
    return (Date.now() - new Date(this.lastFetch).getTime()) > DEFAULT_TTL_MS;
  }

  // 개별 게이지 조회
  get(gaugeId) {
    return this.memCache[gaugeId] || null;
  }

  // 전체 캐시 (프론트용 상세 데이터)
  getAll() {
    return { ...this.memCache };
  }
}

module.exports = DataStore;
