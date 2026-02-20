/**
 * DIAH-7M DB Adapter
 * ═══════════════════════════════════════════
 * SQLite (개발) / PostgreSQL (운영) 자동 전환
 * 2/11 정본 — lastID/all 버그 수정 반영
 */

const path = require('path');

class DBAdapter {
  constructor(config = {}) {
    this.type = config.type || process.env.DB_TYPE || 'sqlite';
    this.connected = false;
    this.db = null;
  }

  async connect() {
    if (this.type === 'pg') {
      const { Pool } = require('pg');
      this.db = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
      });
      await this.db.query('SELECT 1');
    } else {
      const initSqlJs = require('sql.js');
      const SQL = await initSqlJs();
      const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'diah7m.db');
      const fs = require('fs');
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(dbPath)) {
        const buf = fs.readFileSync(dbPath);
        this.db = new SQL.Database(buf);
      } else {
        this.db = new SQL.Database();
      }
      this._dbPath = dbPath;
    }
    this.connected = true;
    console.log(`  ✅ DB connected (${this.type})`);
  }

  async initSchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT DEFAULT '',
        plan TEXT DEFAULT 'FREE',
        role TEXT DEFAULT 'user',
        mileage INTEGER DEFAULT 500,
        lang TEXT DEFAULT 'ko',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS diagnoses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        country TEXT DEFAULT 'KR',
        period TEXT,
        overall_level INTEGER,
        overall_score REAL,
        systems_json TEXT,
        cross_signals_json TEXT,
        dual_lock INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        diagnosis_id INTEGER,
        user_id INTEGER,
        format TEXT DEFAULT 'json',
        file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(diagnosis_id) REFERENCES diagnoses(id)
      );
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        amount INTEGER,
        currency TEXT DEFAULT 'KRW',
        plan TEXT,
        status TEXT DEFAULT 'pending',
        provider TEXT DEFAULT 'stripe',
        provider_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor TEXT,
        action TEXT,
        target TEXT,
        detail TEXT,
        ip TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS mileage_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        delta INTEGER,
        reason TEXT,
        balance_after INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE,
        discount_type TEXT,
        discount_value REAL,
        scope TEXT,
        max_uses INTEGER DEFAULT 100,
        used INTEGER DEFAULT 0,
        expires_at DATETIME,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        token TEXT UNIQUE,
        expires_at DATETIME,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        severity TEXT DEFAULT 'watch',
        gauge TEXT,
        message TEXT,
        read INTEGER DEFAULT 0,
        read_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS quote_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        service_ids TEXT,
        message TEXT,
        contact TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `;
    if (this.type === 'pg') {
      await this.db.query(schema.replace(/AUTOINCREMENT/g, 'GENERATED ALWAYS AS IDENTITY')
        .replace(/INTEGER PRIMARY KEY GENERATED/g, 'SERIAL PRIMARY KEY'));
    } else {
      this.db.run(schema);
      this._save();
    }

    // ── SMS 서비스 스키마 (v2) ──
    const smsSchema = `
      CREATE TABLE IF NOT EXISTS sms_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        code TEXT NOT NULL,
        purpose TEXT DEFAULT 'signup',
        attempts INTEGER DEFAULT 0,
        verified INTEGER DEFAULT 0,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sms_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        phone TEXT,
        message TEXT,
        type TEXT DEFAULT 'general',
        provider TEXT,
        status TEXT DEFAULT 'sent',
        cost REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sms_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE,
        title TEXT,
        body TEXT,
        type TEXT DEFAULT 'SMS',
        lang TEXT DEFAULT 'ko',
        active INTEGER DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
    if (this.type === 'pg') {
      await this.db.query(smsSchema.replace(/AUTOINCREMENT/g, 'GENERATED ALWAYS AS IDENTITY')
        .replace(/INTEGER PRIMARY KEY GENERATED/g, 'SERIAL PRIMARY KEY'));
    } else {
      this.db.run(smsSchema);
      this._save();
    }

    // users 테이블에 phone 컬럼 추가 (이미 존재하면 무시)
    const alterCols = [
      'ALTER TABLE users ADD COLUMN phone TEXT DEFAULT \'\'',
      'ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN sms_opt_in INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN country_code TEXT DEFAULT \'KR\'',
    ];
    for (const sql of alterCols) {
      try { await this.run(sql); } catch (e) { /* column already exists */ }
    }

    // 기본 SMS 템플릿 seed
    const templates = [
      ['verify', '인증코드', '[DIAH-7M] 인증코드: {code} (3분 유효)', 'SMS', 'ko'],
      ['welcome', '가입환영', '[DIAH-7M] {name}님 가입을 환영합니다! 500P가 적립되었습니다.', 'SMS', 'ko'],
      ['subscribe', '구독시작', '[DIAH-7M] {plan} 구독이 시작되었습니다. 감사합니다!', 'SMS', 'ko'],
      ['cancel', '구독해지', '[DIAH-7M] {plan} 구독이 해지되었습니다. 재가입은 언제든 가능합니다.', 'SMS', 'ko'],
      ['alert', '경보알림', '[DIAH-7M] 경보: {gauge} 게이지가 {grade} 상태입니다. 점수: {score}', 'SMS', 'ko'],
      ['report', '리포트', '[DIAH-7M] {name}님의 월간 경제진단 리포트가 준비되었습니다.', 'SMS', 'ko'],
      ['payment_ok', '결제완료', '[DIAH-7M] {plan} {amount}원 결제가 완료되었습니다.', 'SMS', 'ko'],
      ['payment_fail', '결제실패', '[DIAH-7M] {plan} 결제가 실패했습니다. 결제수단을 확인해주세요.', 'SMS', 'ko'],
    ];
    for (const [code, title, body, type, lang] of templates) {
      try {
        await this.run(
          'INSERT OR IGNORE INTO sms_templates (code, title, body, type, lang) VALUES (?, ?, ?, ?, ?)',
          [code, title, body, type, lang]
        );
      } catch (e) { /* ignore duplicates */ }
    }

    console.log('  ✅ Schema initialized');
  }

  // ── pg helper: ? → $1, $2, ... ──
  _pgSQL(sql) {
    let n = 0;
    return sql.replace(/\?/g, () => `$${++n}`);
  }

  // ── Query Interface ──
  async run(sql, params = []) {
    if (this.type === 'pg') {
      const result = await this.db.query(this._pgSQL(sql), params);
      return { lastID: result.rows?.[0]?.id || 0, changes: result.rowCount };
    }
    this.db.run(sql, params);
    const lastID = this.db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] || 0;
    this._save();
    return { lastID, changes: this.db.getRowsModified() };
  }

  async get(sql, params = []) {
    if (this.type === 'pg') {
      const result = await this.db.query(this._pgSQL(sql), params);
      return result.rows[0] || null;
    }
    const stmt = this.db.prepare(sql);
    if (params.length) stmt.bind(params);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
  }

  async all(sql, params = []) {
    if (this.type === 'pg') {
      const result = await this.db.query(this._pgSQL(sql), params);
      return result.rows;
    }
    const results = [];
    const stmt = this.db.prepare(sql);
    if (params.length) stmt.bind(params);
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
    return results;
  }

  _save() {
    if (this.type === 'sqlite' && this._dbPath) {
      const data = this.db.export();
      const fs = require('fs');
      fs.writeFileSync(this._dbPath, Buffer.from(data));
    }
  }

  async disconnect() {
    if (this.type === 'pg') await this.db.end();
    else { this._save(); this.db.close(); }
    this.connected = false;
    console.log('  DB disconnected');
  }
}

module.exports = new DBAdapter();
