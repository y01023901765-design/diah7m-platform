/**
 * DIAH-7M API Server v1.1 — 라우트 분리판
 * ═══════════════════════════════════════════════════════
 * v1.0(924줄 단일) → v1.1(~260줄 + routes/4파일)
 * 변경 없는 것: API 경로, 응답 shape, 미들웨어 순서
 * 변경된 것: 라우트가 routes/로 분리, fail-fast 2단
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
  version: '1.1',
};

// ═══ 2. safeRequire ═══
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
const globalPipeline = safeRequire('global-pipeline', './lib/global-pipeline');
const { checkBootEnv } = require('./lib/env-check');

let dataStore = null;
async function initDataStore() {
  if (DataStore && db && db.connected) {
    dataStore = new DataStore(db);
    await dataStore.init();
    console.log('  ✅ DataStore initialized');
  } else if (DataStore) {
    dataStore = new DataStore(null);
    console.log('  ⚠️  DataStore (memory-only, no DB)');
  }
}

// ═══ 4. 글로벌 미들웨어 (순서 유지!) ═══
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS — production에서는 Vercel 도메인만 허용
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? ['https://diah7m-platform.vercel.app', 'https://diah7m.com', 'https://www.diah7m.com']
  : ['*'];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
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
app.use((req, res, next) => { state.totalRequests++; next(); });

// Rate Limit (간이 + 메모리 정리)
const rateMap = new Map();
setInterval(() => { const now = Date.now(); for (const [ip, hits] of rateMap) { const fresh = hits.filter(t => now - t < 60000); if (fresh.length === 0) rateMap.delete(ip); else rateMap.set(ip, fresh); } }, 5 * 60 * 1000);
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const hits = rateMap.get(ip) || [];
  const recent = hits.filter(t => now - t < 60000);
  if (recent.length >= 100) return res.status(429).json({ error: 'Too many requests' });
  recent.push(now);
  rateMap.set(ip, recent);
  next();
});

// ═══ 5. 정적 파일 ═══
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) app.use(express.static(distPath));

// ═══ 6. 코어 라우트 (server.js 유지 — 변경 금지) ═══

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>DIAH-7M API</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:50px auto;padding:20px;">
<h1>🛰️ DIAH-7M API Server</h1>
<p>상태: <strong style="color:green">정상 작동 중</strong></p>
<p>버전: ${state.version} · 가동시간: ${Math.round((Date.now() - state.startedAt) / 1000)}초</p>
<p>빌드: ${process.env.RENDER_GIT_COMMIT?.slice(0, 7) || 'local'}</p>
<hr>
<h3>주요 엔드포인트:</h3>
<ul>
  <li><a href="/api/health">/api/health</a> — 서버 상태</li>
  <li><a href="/api/trigger-refresh?key=YOUR_PASSWORD">/api/trigger-refresh</a> — 데이터 갱신</li>
  <li>/api/v1/data/test-gauge/:id — 게이지 테스트</li>
</ul>
<p style="color:#666;font-size:0.9em;">프론트엔드: <a href="https://diah7m-platform.vercel.app">Vercel</a></p>
</body></html>`);
});

// Health + 라우트 스냅샷 (동작 동일성 확인용)
app.get('/api/health', (req, res) => {
  const routeList = [];
  app._router.stack.forEach(layer => {
    if (layer.route) {
      routeList.push(`${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle.stack) {
      layer.handle.stack.forEach(r => {
        if (r.route) routeList.push(`${Object.keys(r.route.methods).join(',').toUpperCase()} ${r.route.path}`);
      });
    }
  });

  res.json({
    status: 'ok',
    version: state.version,
    uptime: Math.round((Date.now() - state.startedAt) / 1000),
    buildCommit: process.env.RENDER_GIT_COMMIT || 'local',
    modules: state.modules,
    requests: state.totalRequests,
    dataStore: dataStore ? dataStore.getStatus() : null,
    env: {
      ECOS_API_KEY: process.env.ECOS_API_KEY ? 'SET' : 'MISSING',
      KOSIS_API_KEY: process.env.KOSIS_API_KEY ? 'SET' : 'MISSING',
      FRED_API_KEY: process.env.FRED_API_KEY ? 'SET' : 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
    },
    routeCount: routeList.length,
    routes: routeList.filter(r => r.includes('/api/')),
  });
});

// ═══ 디버그 라우트 (production에서는 관리자 인증 필요) ═══
const debugAuth = process.env.NODE_ENV === 'production'
  ? (req, res, next) => {
      const key = req.query.key || req.headers['x-admin-key'];
      if (!key || key !== process.env.ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Debug routes require admin key in production' });
      }
      next();
    }
  : (req, res, next) => next();

app.get('/api/test/:id', debugAuth, async (req, res) => {
  try {
    if (!pipeline || !pipeline.testGauge) return res.status(503).json({ error: 'Pipeline unavailable' });
    const result = await pipeline.testGauge(req.params.id, process.env.ECOS_API_KEY, process.env.KOSIS_API_KEY);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/ecos-items/:stat', debugAuth, async (req, res) => {
  const ecosKey = process.env.ECOS_API_KEY;
  if (!ecosKey) return res.json({ error: 'ECOS_API_KEY not set' });
  const { stat } = req.params;
  const url = `https://ecos.bok.or.kr/api/StatisticItemList/${ecosKey}/json/kr/1/100/${stat}`;
  try {
    const r = await new Promise((resolve, reject) => {
      require('https').get(url, { timeout: 8000 }, (resp) => {
        let d = ''; resp.on('data', c => d += c);
        resp.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({ parseError: d.slice(0,200) }); } });
      }).on('error', reject);
    });
    const items = r?.StatisticItemList?.row || [];
    res.json({ stat, total: items.length, items: items.slice(0,50).map(i => ({
      code: i.ITEM_CODE, name: i.ITEM_NAME, cycle: i.CYCLE, start: i.START_TIME, end: i.END_TIME,
    }))});
  } catch (e) { res.json({ error: e.message }); }
});

app.get('/api/ecos-items', debugAuth, async (req, res) => {
  const ecosKey = process.env.ECOS_API_KEY;
  if (!ecosKey) return res.json({ error: 'ECOS_API_KEY not set' });
  const stats = (req.query.stats || '721Y001,901Y009').split(',');
  const results = {};
  for (const stat of stats) {
    const url = `https://ecos.bok.or.kr/api/StatisticItemList/${ecosKey}/json/kr/1/100/${stat.trim()}`;
    try {
      const r = await new Promise((resolve, reject) => {
        require('https').get(url, { timeout: 8000 }, (resp) => {
          let d = ''; resp.on('data', c => d += c);
          resp.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve(null); } });
        }).on('error', reject);
      });
      results[stat.trim()] = (r?.StatisticItemList?.row || []).map(i => ({ code: i.ITEM_CODE, name: i.ITEM_NAME, cycle: i.CYCLE }));
    } catch (e) { results[stat.trim()] = { error: e.message }; }
  }
  res.json(results);
});

app.get('/api/ecos-probe', debugAuth, async (req, res) => {
  const ecosKey = process.env.ECOS_API_KEY;
  if (!ecosKey) return res.json({ error: 'ECOS_API_KEY not set' });
  const { stat } = req.query;
  const item = req.query.item || '';
  const cycle = req.query.cycle || 'M';
  if (!stat) return res.json({ error: 'stat param required' });
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${ecosKey}/json/kr/1/5/${stat}/${cycle}/202401/202602/${item}`;
  try {
    const r = await new Promise((resolve, reject) => {
      require('https').get(url, { timeout: 8000 }, (resp) => {
        let d = ''; resp.on('data', c => d += c);
        resp.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve({ parseError: d.slice(0,200) }); } });
      }).on('error', reject);
    });
    res.json(r?.StatisticSearch || r);
  } catch (e) { res.json({ error: e.message }); }
});

// 기존 /api/trigger-refresh 호환 (프록시)
app.get('/api/trigger-refresh', (req, res) => {
  // routes/data.js의 /trigger-refresh로 전달
  req.url = '/api/v1/trigger-refresh' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  app.handle(req, res);
});

// ═══ 7. 라우트 모듈 마운트 (routes/index.js) ═══
const mountRoutes = require('./routes');
// deps는 start() 안에서 dataStore 초기화 후 마운트

// ═══ 8. 글로벌 43개국 ═══
if (globalPipeline && globalPipeline.createGlobalRouter) {
  app.use('/api/v1/global', globalPipeline.createGlobalRouter(express));
  console.log('  ✅ Global router mounted (43 countries)');
}

// ═══ 8.5. 위성 라우트 (수집/조회 분리) ═══
try {
  const satRouter = require('./routes/satellite');
  const adminAuth = auth?.authMiddleware && auth?.adminMiddleware
    ? [auth.authMiddleware, auth.adminMiddleware]
    : [(req, res) => res.status(401).json({ error: 'Auth required' })];
  app.use('/api/admin/satellite', ...adminAuth, satRouter);
  app.use('/api/v1/satellite', satRouter);
  console.log('  ✅ Satellite routes mounted (collect + latest)');
} catch (e) {
  console.warn('  ⚠️ Satellite routes failed:', e.message);
}

// TEMP: 인증 없는 fetchAll 트리거 (검증 후 제거)
app.get('/api/temp-refresh', async (req, res) => {
  try {
    const pipeline = require('./lib/data-pipeline');
    const t0 = Date.now();
    const result = await pipeline.fetchAll();
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const gauges = result.gauges || [];
    const ok = gauges.filter(g => g.status === 'OK');
    const noData = gauges.filter(g => g.status === 'NO_DATA');
    const err = gauges.filter(g => g.status === 'ERROR');
    const derived = gauges.filter(g => g.status === 'NEEDS_CALC');
    res.json({
      time: `${elapsed}s`,
      total: gauges.length,
      ok: ok.length,
      noData: noData.length,
      error: err.length,
      needsCalc: derived.length,
      noDataList: noData.map(g => g.id),
      errorList: err.map(g => `${g.id}: ${g.error}`),
      needsCalcList: derived.map(g => g.id),
      s4_credit: gauges.find(g => g.id === 'S4_CREDIT'),
    });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// ═══ 9. SPA Fallback ═══
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API not found' });
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ═══ 10. 에러 핸들러 (맨 끝 위치 유지!) ═══
app.use((err, req, res, _next) => {
  console.error('Server Error:', err.message);
  const status = err.status || (
    err.message.includes('not found') ? 404 :
    err.message.includes('Invalid') || err.message.includes('required') ? 400 :
    err.message.includes('denied') ? 403 : 500
  );
  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({ error: isProd ? 'Internal server error' : err.message });
});

// ═══ 11. 서버 시작 ═══
const PORT = process.env.PORT || 3700;

async function start() {
  try {
    console.log('\n══════════════════════════════════════');
    console.log('  🛰️  DIAH-7M API Server v1.1');
    console.log('══════════════════════════════════════\n');

    // 1단 fail-fast
    checkBootEnv();

    console.log('\n  Loading modules...');

    // DB 연결
    if (db) {
      await db.connect();
      await db.initSchema();

      if (auth) {
        const admin = await db.get("SELECT id FROM users WHERE email = 'admin@diah7m.com'");
        if (!admin) {
          const adminPw = process.env.ADMIN_PASSWORD;
          if (!adminPw) { console.log('  ⚠️  ADMIN_PASSWORD not set — skip admin seed'); return; }
          const hash = auth.hashPassword(adminPw);
          await db.run(
            "INSERT INTO users (email, password_hash, name, plan, role, mileage) VALUES ('admin@diah7m.com', ?, 'Admin', 'ENTERPRISE', 'admin', 99999)",
            [hash]
          );
          console.log('  ✅ Admin account created');
        }
      }
    }

    // DataStore 초기화
    await initDataStore();
    
    // 첫 시작 시 데이터 수집 (Demo 방지)
    if (pipeline && dataStore) {
      try {
        console.log('  📊 Initial data collection...');
        const results = await pipeline.fetchAll();
        if (results && results.gauges) {
          const gaugeMap = results.gauges.reduce((acc, g) => {
            acc[g.id] = g;
            return acc;
          }, {});
          await dataStore.store(gaugeMap);
          if (results.summary) {
            dataStore.setLastRun(results.summary);
          }
          console.log(`  ✅ Initial collection: ${results.summary?.success || 0}/${results.summary?.total || 0} OK`);
        }
      } catch (e) {
        console.log('  ⚠️  Initial collection failed:', e.message);
      }
    }

    // 라우트 마운트 (dataStore 초기화 후)
    const deps = { db, auth, engine, pipeline, dataStore, state };
    mountRoutes(app, deps);

    console.log(`\n  Modules: ${JSON.stringify(state.modules)}`);
    console.log(`  Engine: ${engine ? '✅' : '❌'}`);
    console.log(`  DB: ${db?.connected ? '✅' : '❌'}`);

    const server = app.listen(PORT, () => {
      console.log(`\n  🚀 http://localhost:${PORT}`);
      console.log(`  📡 API: http://localhost:${PORT}/api/health`);
      console.log(`  🔖 Commit: ${process.env.RENDER_GIT_COMMIT || 'local'}`);

      // ── N06: Cron 스케줄러 — 매일 06:00 KST 자동 수집 ──
      try {
        const cron = require('node-cron');
        const ecosKey = process.env.ECOS_API_KEY;
        const kosisKey = process.env.KOSIS_API_KEY;
        if (pipeline && dataStore && ecosKey) {
          // 21:00 UTC = 06:00 KST
          cron.schedule('0 6 * * *', async () => {
            console.log(`[Cron] ${new Date().toISOString()} — Daily refresh started`);
            try {
              const { results, stats } = await pipeline.fetchAll(ecosKey, kosisKey || '');
              await dataStore.store(results);
              dataStore.setLastRun(stats);
              console.log(`[Cron] Done: ${stats.ok}/${stats.total} OK`);
            } catch(e) {
              console.error(`[Cron] Failed: ${e.message}`);
            }
          }, { timezone: 'Asia/Seoul' });
          console.log('  ⏰ Cron: daily 06:00 KST refresh scheduled');
        } else {
          console.log('  ⚠️ Cron: skipped (missing pipeline/dataStore/ECOS_API_KEY)');
        }
      } catch(e) {
        console.log('  ⚠️ Cron: node-cron not available —', e.message);
      }

      // ── 위성 데이터 자동 수집 (부팅 60초 후) ──
      setTimeout(async () => {
        try {
          const { fetchAllSatellite } = require('./lib/fetch-satellite');
          const satRouter = require('./routes/satellite');
          const snapshot = satRouter._snapshot;
          if (!fetchAllSatellite || !snapshot) {
            console.log('[Satellite] Auto-collect skipped: module not available');
            return;
          }
          console.log('[Satellite] Auto-collect started...');
          const { results, meta } = await fetchAllSatellite('KR', {});
          for (const [id, data] of Object.entries(results)) {
            if (data.status === 'OK') snapshot[id] = data;
          }
          snapshot.meta = {
            last_collect_asof: meta.asof_kst,
            last_success_asof: meta.collected > 0 ? meta.asof_kst : null,
            last_run_id: meta.run_id,
            status: meta.collected > 0 ? 'COLLECTED' : (meta.failed > 0 ? 'PARTIAL' : 'NO_CHANGE'),
            duration_ms: meta.duration_ms,
            collected: meta.collected,
            skipped: meta.skipped,
            failed: meta.failed,
            failures: meta.failures,
          };
          console.log(`[Satellite] Auto-collect done: ${meta.collected} collected, ${meta.failed} failed (${meta.duration_ms}ms)`);
        } catch (e) {
          console.log(`[Satellite] Auto-collect failed: ${e.message}`);
        }
      }, 60000);

      console.log('══════════════════════════════════════\n');
    });

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

if (require.main === module) {
  start();
} else {
  module.exports = { app, start, state };
}
