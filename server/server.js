/**
 * DIAH-7M API Server v1.0 — 정본
 * ═══════════════════════════════════════════════════════
 * safeRequire 패턴 · 모듈 없으면 stub 반환 · 서버 항상 동작
 * 2/11 정본 확정 (E2E 39/39 통과) 기반 재구축
 * ═══════════════════════════════════════════════════════
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// ═══ 1. 서버 상태 ═══
const state = {
  startedAt: new Date(),
  totalRequests: 0,
  modules: {},
};

// ═══ 2. safeRequire — 모듈 안전 로드 ═══
function safeRequire(name, modulePath) {
  try {
    const fullPath = path.resolve(__dirname, modulePath);
    if (fs.existsSync(fullPath) || fs.existsSync(fullPath + '.js')) {
      const mod = require(fullPath);
      state.modules[name] = 'loaded';
      return mod;
    }
    state.modules[name] = 'not_found';
    return null;
  } catch (e) {
    state.modules[name] = `error: ${e.message}`;
    console.error(`  ⚠️  ${name}: ${e.message}`);
    return null;
  }
}

// ═══ 3. 모듈 로드 ═══
const db = safeRequire('db', './lib/db');
const auth = safeRequire('auth', './lib/auth');
const engine = safeRequire('core-engine', './lib/core-engine');
const pipeline = safeRequire('data-pipeline', './lib/data-pipeline');
const DataStore = safeRequire('data-store', './lib/data-store');

// ═══ 3.1 데이터 스토어 초기화 (서버 시작 시 호출) ═══
let dataStore = null;
async function initDataStore() {
  if (DataStore && db && db.connected) {
    dataStore = new DataStore(db);
    await dataStore.init();
    console.log('  ✅ DataStore initialized');
  } else if (DataStore) {
    // DB 없이 메모리 캐시만 사용
    dataStore = new DataStore(null);
    console.log('  ⚠️  DataStore (memory-only, no DB)');
  }
}

// ═══ 4. 글로벌 미들웨어 ═══
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// 보안 헤더
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// 요청 카운터
app.use((req, res, next) => {
  state.totalRequests++;
  next();
});

// Rate Limit (간이)
const rateMap = new Map();
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const window = 60000; // 1분
  const limit = 100;
  const hits = rateMap.get(ip) || [];
  const recent = hits.filter(t => now - t < window);
  if (recent.length >= limit) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  recent.push(now);
  rateMap.set(ip, recent);
  next();
});

// ═══ 5. 정적 파일 (Vite 빌드) ═══
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// ═══ 6. API 라우트 ═══

// -- 헬스체크 --
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round((Date.now() - state.startedAt) / 1000),
    modules: state.modules,
    requests: state.totalRequests,
    dataStore: dataStore ? dataStore.getStatus() : null,
  });
});

// -- 회원가입 --
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    if (!db || !auth) return res.status(503).json({ error: 'Auth service unavailable' });
    const { email, password, name, plan } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const exists = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const hash = auth.hashPassword(password);
    const result = await db.run(
      'INSERT INTO users (email, password_hash, name, plan, mileage) VALUES (?, ?, ?, ?, 500)',
      [email, hash, name || '', plan || 'FREE']
    );

    // 마일리지 로그
    await db.run(
      'INSERT INTO mileage_log (user_id, delta, reason, balance_after) VALUES (?, 500, ?, 500)',
      [result.lastID, 'signup_bonus']
    );

    // 감사 로그
    await db.run(
      'INSERT INTO audit_logs (actor, action, target, detail) VALUES (?, ?, ?, ?)',
      ['system', 'user_register', `user:${result.lastID}`, email]
    );

    const token = auth.sign({ id: result.lastID, email, plan: plan || 'FREE', role: 'user' });
    res.status(201).json({ token, user: { id: result.lastID, email, name, plan: plan || 'FREE', mileage: 500 } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- 로그인 --
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    if (!db || !auth) return res.status(503).json({ error: 'Auth service unavailable' });
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });
    if (!auth.verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = auth.sign({ id: user.id, email, plan: user.plan, role: user.role });
    res.json({ token, user: { id: user.id, email, name: user.name, plan: user.plan, mileage: user.mileage } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- 프로필 조회 --
app.get('/api/v1/me', auth?.authMiddleware || ((req, res) => res.status(503).json({ error: 'Auth unavailable' })), async (req, res) => {
  try {
    const user = await db.get('SELECT id, email, name, plan, mileage, lang, status, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- 프로필 수정 --
app.put('/api/v1/me', auth?.authMiddleware || ((req, res) => res.status(503).json({ error: 'Auth unavailable' })), async (req, res) => {
  try {
    const { name, lang } = req.body;
    await db.run('UPDATE users SET name = ?, lang = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name || '', lang || 'ko', req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- 비밀번호 변경 --
app.post('/api/v1/me/password', auth?.authMiddleware || ((req, res) => res.status(503).json({ error: 'Auth unavailable' })), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!auth.verifyPassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }
    const hash = auth.hashPassword(newPassword);
    await db.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hash, req.user.id]);
    await db.run('INSERT INTO audit_logs (actor, action, target) VALUES (?, ?, ?)',
      [`user:${req.user.id}`, 'password_change', `user:${req.user.id}`]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- 진단 실행 --
app.post('/api/v1/diagnose', auth?.authMiddleware || ((req, res) => res.status(503).json({ error: 'Auth unavailable' })), async (req, res) => {
  try {
    if (!engine) return res.status(503).json({ error: 'Engine unavailable' });
    const { gauges, country, period, thresholds } = req.body;
    if (!gauges || typeof gauges !== 'object') {
      return res.status(400).json({ error: 'Gauge data required' });
    }

    const result = engine.diagnose(gauges, thresholds || {});

    // DB 저장
    if (db) {
      const saved = await db.run(
        `INSERT INTO diagnoses (user_id, country, period, overall_level, overall_score, systems_json, cross_signals_json, dual_lock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, country || 'KR', period || new Date().toISOString().slice(0, 7),
         result.overall.level, result.overall.score,
         JSON.stringify(result.systems), JSON.stringify(result.crossSignals),
         result.dualLock ? 1 : 0]
      );
      result.diagnosisId = saved.lastID;
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- 진단 이력 조회 --

// ── Schema-compliant 보고서 생성 ──
app.post('/api/v1/report', auth?.authMiddleware || ((req, res) => res.status(503).json({ error: 'Auth unavailable' })), async (req, res) => {
  try {
    if (!engine || !engine.generateReport) return res.status(503).json({ error: 'Engine v1.1 required' });
    const { gauges, thresholds, country_code, country_name, product_type, frequency, language } = req.body;
    if (!gauges || typeof gauges !== 'object') return res.status(400).json({ error: 'Gauge data required' });

    const report = engine.generateReport(gauges, {
      thresholds: thresholds || {},
      countryCode: country_code || 'KR',
      countryName: country_name || '대한민국',
      productType: product_type || 'national',
      frequency: frequency || 'monthly',
      tier: req.user?.plan || 'FREE',
      language: language || 'ko',
      channel: 'web',
    });

    // DB 저장
    if (db) {
      await db.run(
        `INSERT INTO diagnoses (user_id, country, period, overall_level, overall_score, systems_json, cross_signals_json, dual_lock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, report.context.country_code, report.context.period_label,
         report.overall.level, report.overall.score,
         JSON.stringify(report.systems), JSON.stringify(report.cross_signals),
         report.dual_lock.active ? 1 : 0]
      );
    }

    res.json(report);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- 진단 이력 조회 --
app.get('/api/v1/diagnoses', auth?.authMiddleware || ((req, res) => res.status(503).json({ error: 'Auth unavailable' })), async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT id, country, period, overall_level, overall_score, dual_lock, created_at FROM diagnoses WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- 진단 상세 --
app.get('/api/v1/diagnoses/:id', auth?.authMiddleware || ((req, res) => res.status(503).json({ error: 'Auth unavailable' })), async (req, res) => {
  try {
    const row = await db.get('SELECT * FROM diagnoses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    row.systems = JSON.parse(row.systems_json || '{}');
    row.crossSignals = JSON.parse(row.cross_signals_json || '[]');
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- 마일리지 조회 --
app.get('/api/v1/me/mileage', auth?.authMiddleware || ((req, res) => res.status(503).json({ error: 'Auth unavailable' })), async (req, res) => {
  try {
    const user = await db.get('SELECT mileage FROM users WHERE id = ?', [req.user.id]);
    const log = await db.all('SELECT * FROM mileage_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.id]);
    res.json({ balance: user?.mileage || 0, history: log });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══ 7. 관리자 API ═══
// ═══ DATA PIPELINE ENDPOINTS ═══

// -- 캐시 상태 조회 (인증 불필요) --
app.get('/api/v1/data/status', (req, res) => {
  if (!dataStore) return res.json({ available: false, reason: 'DataStore not initialized' });
  res.json({ available: true, ...dataStore.getStatus() });
});

// -- 최신 캐시 데이터 조회 --
app.get('/api/v1/data/latest', auth?.authMiddleware || ((req, res) => res.status(503).json({ error: 'Auth unavailable' })), (req, res) => {
  if (!dataStore) return res.status(503).json({ error: 'DataStore unavailable' });
  const cached = dataStore.getAll();
  const status = dataStore.getStatus();
  res.json({ data: cached, status });
});

// -- 데이터 수동 새로고침 (관리자 전용) --
app.post('/api/v1/data/refresh', auth?.authMiddleware || ((req, res, next) => next()), auth?.adminMiddleware || ((req, res, next) => next()), async (req, res) => {
  if (!pipeline || !dataStore) return res.status(503).json({ error: 'Pipeline/Store unavailable' });
  if (dataStore.fetching) return res.status(429).json({ error: 'Fetch already in progress' });

  const ecosKey = process.env.ECOS_API_KEY;
  const kosisKey = process.env.KOSIS_API_KEY;
  if (!ecosKey && !kosisKey) return res.status(400).json({ error: 'API keys not configured. Set ECOS_API_KEY and KOSIS_API_KEY in .env' });

  dataStore.fetching = true;
  try {
    console.log('[Pipeline] Refresh started...');
    const t0 = Date.now();
    const { results, stats, errors } = await pipeline.fetchAll(ecosKey, kosisKey);
    console.log(`[Pipeline] Fetch done: ${stats.ok}/${stats.total} OK (${Date.now()-t0}ms)`);
    
    const stored = await dataStore.store(results);
    console.log(`[Pipeline] Store done: ${stored.stored} stored, ${stored.preserved} preserved`);
    
    dataStore.fetching = false;
    res.json({ ok: true, stats, stored, errors: errors.slice(0, 10) });
  } catch (e) {
    dataStore.fetching = false;
    console.error('[Pipeline] Refresh error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// -- 자동 보고서 (캐시 데이터 → 엔진 진단) --
app.get('/api/v1/report/auto', auth?.authMiddleware || ((req, res) => res.status(503).json({ error: 'Auth unavailable' })), (req, res) => {
  if (!engine || !engine.generateReport) return res.status(503).json({ error: 'Engine unavailable' });
  if (!dataStore) return res.status(503).json({ error: 'DataStore unavailable' });

  const gaugeData = dataStore.toGaugeData();
  if (Object.keys(gaugeData).length === 0) {
    return res.status(404).json({ error: 'No cached data. Call POST /api/v1/data/refresh first', hint: 'Set ECOS_API_KEY and KOSIS_API_KEY then refresh' });
  }

  const report = engine.generateReport(gaugeData, {
    countryCode: req.query.country || 'KR',
    countryName: req.query.country_name || '대한민국',
    productType: 'national',
    frequency: req.query.frequency || 'monthly',
    tier: req.user?.plan || 'FREE',
    language: req.query.lang || 'ko',
    channel: 'web',
  });

  res.json(report);
});

// -- 파이프라인 매핑 진단 --
app.get('/api/v1/data/mapping', (req, res) => {
  if (!pipeline) return res.status(503).json({ error: 'Pipeline unavailable' });
  res.json(pipeline.diagnoseMapping());
});

// -- 개별 게이지 API 테스트 (디버그용, 임시 공개) --
app.get('/api/v1/data/test-gauge/:id', async (req, res) => {
  if (!pipeline) return res.status(503).json({ error: 'Pipeline unavailable' });
  const ecosKey = process.env.ECOS_API_KEY;
  const kosisKey = process.env.KOSIS_API_KEY;
  const result = await pipeline.testGauge(req.params.id, ecosKey, kosisKey);
  res.json(result);
});

// -- 전체 게이지 API 원시 응답 진단 --
app.get('/api/v1/data/diagnose',
  auth?.authMiddleware || ((req, res, next) => next()),
  auth?.adminMiddleware || ((req, res, next) => next()),
  async (req, res) => {
  if (!pipeline) return res.status(503).json({ error: 'Pipeline unavailable' });
  const ecosKey = process.env.ECOS_API_KEY;
  const kosisKey = process.env.KOSIS_API_KEY;
  const results = await pipeline.diagnoseAll(ecosKey, kosisKey);
  res.json(results);
});

// ═══ ADMIN ═══
const adminAuth = [
  auth?.authMiddleware || ((req, res, next) => next()),
  auth?.adminMiddleware || ((req, res, next) => next()),
];

// -- 관리자 KPI --
app.get('/api/v1/admin/kpi', ...adminAuth, async (req, res) => {
  try {
    const users = await db.get('SELECT COUNT(*) as cnt FROM users');
    const active = await db.get("SELECT COUNT(*) as cnt FROM users WHERE status = 'active'");
    const diagnoses = await db.get('SELECT COUNT(*) as cnt FROM diagnoses');
    const payments = await db.get("SELECT SUM(amount) as total FROM payments WHERE status = 'completed'");
    res.json({
      totalUsers: users?.cnt || 0,
      activeUsers: active?.cnt || 0,
      totalDiagnoses: diagnoses?.cnt || 0,
      totalRevenue: payments?.total || 0,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- 회원 목록 --
app.get('/api/v1/admin/users', ...adminAuth, async (req, res) => {
  try {
    const users = await db.all('SELECT id, email, name, plan, mileage, status, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- 회원 티어 변경 --
app.patch('/api/v1/admin/users/:id/plan', ...adminAuth, async (req, res) => {
  try {
    const { plan } = req.body;
    await db.run('UPDATE users SET plan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [plan, req.params.id]);
    await db.run('INSERT INTO audit_logs (actor, action, target, detail) VALUES (?, ?, ?, ?)',
      [req.user.email, 'plan_change', `user:${req.params.id}`, `→ ${plan}`]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- 회원 정지/활성화 --
app.patch('/api/v1/admin/users/:id/status', ...adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    await db.run('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
    await db.run('INSERT INTO audit_logs (actor, action, target, detail) VALUES (?, ?, ?, ?)',
      [req.user.email, 'status_change', `user:${req.params.id}`, `→ ${status}`]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- 감사 로그 --
app.get('/api/v1/admin/audit', ...adminAuth, async (req, res) => {
  try {
    const logs = await db.all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- 엔진 상태 --
app.get('/api/v1/admin/engine', ...adminAuth, (req, res) => {
  res.json({
    engineLoaded: !!engine,
    dbConnected: db?.connected || false,
    modules: state.modules,
    uptime: Math.round((Date.now() - state.startedAt) / 1000),
    totalRequests: state.totalRequests,
  });
});

// ═══ 8. SPA Fallback ═══
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API not found' });
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ═══ 9. 에러 핸들러 ═══
app.use((err, req, res, _next) => {
  console.error('Server Error:', err.message);
  const status = err.status || (
    err.message.includes('not found') ? 404 :
    err.message.includes('Invalid') || err.message.includes('required') ? 400 :
    err.message.includes('denied') ? 403 : 500
  );
  res.status(status).json({ error: err.message });
});

// ═══ 10. 서버 시작 ═══
const PORT = process.env.PORT || 3700;

async function start() {
  try {
    console.log('\n══════════════════════════════════════');
    console.log('  🛰️  DIAH-7M API Server v1.0');
    console.log('══════════════════════════════════════\n');
    console.log('  Loading modules...');

    // DB 연결
    if (db) {
      await db.connect();
      await db.initSchema();

      // 관리자 계정 생성 (없으면)
      if (auth) {
        const admin = await db.get("SELECT id FROM users WHERE email = 'admin@diah7m.com'");
        if (!admin) {
          const hash = auth.hashPassword(process.env.ADMIN_PASSWORD || 'diah7m-admin-2026');
          await db.run(
            "INSERT INTO users (email, password_hash, name, plan, role, mileage) VALUES ('admin@diah7m.com', ?, 'Admin', 'ENTERPRISE', 'admin', 99999)",
            [hash]
          );
          console.log('  ✅ Admin account created');
        }
      }
    }

    console.log(`\n  Modules: ${JSON.stringify(state.modules)}`);
    console.log(`  Engine: ${engine ? '✅' : '❌'}`);
    console.log(`  DB: ${db?.connected ? '✅' : '❌'}`);

    // DataStore 초기화 (DB 연결 후)
    await initDataStore();

    // 서버 시작
    const server = app.listen(PORT, () => {
      console.log(`\n  🚀 http://localhost:${PORT}`);
      console.log(`  📡 API: http://localhost:${PORT}/api/health`);
      console.log('══════════════════════════════════════\n');
    });

    // Graceful Shutdown
    const shutdown = async (signal) => {
      console.log(`\n  ${signal} — shutting down...`);
      server.close(async () => {
        if (db) await db.disconnect();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    console.error('  ❌ Start failed:', err.message);
    process.exit(1);
  }
}

// 직접 실행 시 서버 시작, require 시 app export
if (require.main === module) {
  start();
} else {
  module.exports = { app, start, state };
}
