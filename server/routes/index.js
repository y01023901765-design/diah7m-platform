/**
 * DIAH-7M Route Registry — 등록 순서 보장
 * ═══════════════════════════════════════════
 * server.js는 이 파일만 import.
 * 각 창은 자기 라우트 파일만 수정 → 충돌 Zero.
 *
 * 순서 중요: Express는 등록 순서가 곧 동작.
 * ═══════════════════════════════════════════
 */

const createAuthRouter = require('./auth');         // 🟢 창3
const createDiagnosisRouter = require('./diagnosis'); // 🔵 창1
const createDataRouter = require('./data');           // 🔵 창1
const createAdminRouter = require('./admin');         // 🟢 창3

/**
 * 모든 라우트를 app에 마운트
 * @param {Express} app - Express 앱
 * @param {Object} deps - { db, auth, engine, pipeline, dataStore, state }
 */
function mountRoutes(app, deps) {
  const mounted = [];

  function mount(name, factory) {
    try {
      const router = factory(deps);
      app.use('/api/v1', router);
      mounted.push(name);
    } catch (e) {
      console.error(`  ⚠️  ${name}: ${e.message}`);
    }
  }

  // 순서 유지: auth → diagnosis → data → admin (원본 server.js와 동일)
  mount('routes/auth', createAuthRouter);
  mount('routes/diagnosis', createDiagnosisRouter);
  mount('routes/data', createDataRouter);
  mount('routes/admin', createAdminRouter);

  console.log(`  ✅ Routes mounted: ${mounted.join(', ')}`);
  return mounted;
}

module.exports = mountRoutes;
