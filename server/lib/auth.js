/**
 * DIAH-7M Auth Module
 * ═══════════════════════════════════════════
 * jsonwebtoken 기반 JWT · scrypt 비밀번호 · RBAC 티어 권한
 *
 * [B1] jsonwebtoken 패키지 사용 (커스텀 JWT 제거)
 * [B5] timing-safe 비교 + scrypt 명시적 cost 파라미터
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// ── JWT 설정 ──
const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32) {
  console.error('  ❌ JWT_SECRET must be set (min 32 chars). Auth will reject all tokens.');
}
const EXPIRES_IN = '24h';

function sign(payload) {
  if (!SECRET) throw new Error('JWT_SECRET not configured');
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN, algorithm: 'HS256' });
}

function verify(token) {
  try {
    if (!SECRET) return null;
    return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
  } catch { return null; }
}

// ── 비밀번호 (scrypt + 명시적 파라미터 + timing-safe) ──
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function hashPassword(pw) {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64, SCRYPT_PARAMS).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(pw, stored) {
  try {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const test = crypto.scryptSync(pw, salt, 64, SCRYPT_PARAMS).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
  } catch { return false; }
}

// ── RBAC 티어 ──
const TIER_ACCESS = {
  FREE: { gauges: 7, systems: 1, satellite: false, api: false },
  BASIC: { gauges: 21, systems: 3, satellite: false, api: false },
  PRO: { gauges: 59, systems: 9, satellite: true, api: false },
  ENTERPRISE: { gauges: 59, systems: 9, satellite: true, api: true },
};

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token required' });
  const payload = verify(authHeader.slice(7));
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = payload;
  next();
}

function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

function tierMiddleware(minTier) {
  const tierOrder = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
  return (req, res, next) => {
    const userTier = req.user?.plan || 'FREE';
    if (tierOrder.indexOf(userTier) < tierOrder.indexOf(minTier)) {
      return res.status(403).json({ error: `${minTier} plan required` });
    }
    next();
  };
}

module.exports = {
  sign, verify, hashPassword, verifyPassword,
  TIER_ACCESS, authMiddleware, adminMiddleware, tierMiddleware,
};
