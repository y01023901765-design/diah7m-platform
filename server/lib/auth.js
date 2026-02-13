/**
 * DIAH-7M Auth Module
 * ═══════════════════════════════════════════
 * JWT 토큰 · bcrypt 비밀번호 · RBAC 티어 권한
 */

const crypto = require('crypto');

// JWT 간이 구현 (jsonwebtoken 패키지 없이도 동작)
const SECRET = process.env.JWT_SECRET || 'diah7m-dev-secret-change-in-production';
const EXPIRES = 24 * 60 * 60 * 1000; // 24h

function base64url(str) {
  return Buffer.from(str).toString('base64url');
}

function sign(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + EXPIRES }));
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verify(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

// 비밀번호 해싱 (bcrypt 없이 sha256 + salt)
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(pw, salt, 64).toString('hex');
  return hash === test;
}

// RBAC 티어 권한
const TIER_ACCESS = {
  FREE: { gauges: 7, systems: 1, satellite: false, api: false },
  BASIC: { gauges: 21, systems: 3, satellite: false, api: false },
  PRO: { gauges: 59, systems: 9, satellite: true, api: false },
  ENTERPRISE: { gauges: 59, systems: 9, satellite: true, api: true },
};

// 인증 미들웨어
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token required' });
  }
  const payload = verify(authHeader.slice(7));
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  req.user = payload;
  next();
}

// 관리자 미들웨어
function adminMiddleware(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// 티어 미들웨어
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
