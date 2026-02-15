/**
 * DIAH-7M Environment Check — 2단 Fail-fast
 * ═══════════════════════════════════════════
 * 1단(부팅): 없으면 서버 시작 금지
 * 2단(기능): 특정 기능 호출 시 해당 env 체크
 * ═══════════════════════════════════════════
 */

// 1단: 부팅 시 필수 (없으면 서버 종료)
const BOOT_REQUIRED = [
  // Phase 1에서는 없어도 서버 자체는 뜸 (safeRequire 패턴)
  // 운영 환경에서만 강제
];

// 1단: 부팅 시 경고 (없으면 기능 제한되지만 서버는 뜸)
const BOOT_WARN = [
  { key: 'ECOS_API_KEY', msg: 'data collection disabled' },
  { key: 'JWT_SECRET', msg: 'auth using default secret (INSECURE)' },
  { key: 'KOSIS_API_KEY', msg: 'KOSIS gauges unavailable' },
  { key: 'FRED_API_KEY', msg: 'FRED gauges unavailable' },
];

// 2단: 기능별 (라우트/잡 실행 시 체크)
const FEATURE_ENVS = {
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  email: ['SENDGRID_API_KEY'],
  gee: ['GEE_SERVICE_ACCOUNT', 'GEE_KEY_FILE'],
  database: ['DATABASE_URL'],
};

/**
 * 1단: 서버 부팅 시 호출
 * - BOOT_REQUIRED 누락 → process.exit(1)
 * - BOOT_WARN 누락 → 경고만
 */
function checkBootEnv() {
  console.log('\n  ── Environment Check ──');

  // 필수 체크
  const missing = BOOT_REQUIRED.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`  ❌ FATAL: Missing required env: ${missing.join(', ')}`);
    console.error('  서버를 시작할 수 없습니다. .env 파일을 확인하세요.');
    process.exit(1);
  }

  // 경고 체크
  let warnCount = 0;
  for (const { key, msg } of BOOT_WARN) {
    if (!process.env[key]) {
      console.log(`  ⚠️  ${key} not set — ${msg}`);
      warnCount++;
    } else {
      console.log(`  ✅ ${key} — set`);
    }
  }

  if (warnCount === 0) console.log('  ✅ All environment variables configured');
  return warnCount;
}

/**
 * 2단: 특정 기능 사용 시 호출
 * @param {string} feature - 'stripe' | 'email' | 'gee' | 'database'
 * @returns {{ ok: boolean, missing: string[] }}
 */
function checkFeatureEnv(feature) {
  const keys = FEATURE_ENVS[feature] || [];
  const missing = keys.filter(k => !process.env[k]);
  return { ok: missing.length === 0, missing };
}

/**
 * Express 미들웨어: 특정 기능 라우트 앞에 배치
 * @param {string} feature
 */
function requireFeature(feature) {
  return (req, res, next) => {
    const { ok, missing } = checkFeatureEnv(feature);
    if (!ok) {
      return res.status(503).json({
        error: `${feature} feature not configured`,
        missing,
        hint: `Set ${missing.join(', ')} in environment variables`,
      });
    }
    next();
  };
}

module.exports = { checkBootEnv, checkFeatureEnv, requireFeature, FEATURE_ENVS };
