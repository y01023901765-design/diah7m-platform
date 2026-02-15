/**
 * DIAH-7M Security v1.0
 * 3등급 보안: public / restricted / confidential
 * Rate Limit + CORS + Input validation
 */
const ACCESS_LEVELS = { public: 0, restricted: 1, confidential: 2 };
const ROLE_ACCESS = { guest: 'public', free: 'public', basic: 'restricted', pro: 'confidential', enterprise: 'confidential', admin: 'confidential' };
const RATE_LIMITS = {
  free: { windowMs: 900000, max: 30 }, basic: { windowMs: 900000, max: 100 },
  pro: { windowMs: 900000, max: 300 }, enterprise: { windowMs: 900000, max: 1000 },
  admin: { windowMs: 900000, max: 2000 },
};

const rateLimitStore = new Map();

function getAccessLevel(role) { return ROLE_ACCESS[role] || 'public'; }

function filterByAccess(data, role) {
  const level = ACCESS_LEVELS[getAccessLevel(role)] || 0;
  if (level >= 2) return data; // confidential: all
  if (level >= 1) { // restricted: axes + summary, no gauge detail
    const { gauges, cross_signals, dual_lock, ...rest } = data || {};
    return { ...rest, gauges: (gauges || []).map(g => ({ id: g.id, name: g.name, severity: g.severity })) };
  }
  // public: overall + status only
  return { overall: data?.overall, state: data?.state, generated_at: data?.generated_at };
}

function rateLimit(role) {
  const config = RATE_LIMITS[role] || RATE_LIMITS.free;
  return (req, res, next) => {
    const key = `${req.ip}:${role}`;
    const now = Date.now();
    let entry = rateLimitStore.get(key);
    if (!entry || now - entry.start > config.windowMs) { entry = { start: now, count: 0 }; }
    entry.count++;
    rateLimitStore.set(key, entry);
    if (entry.count > config.max) { return res.status(429).json({ error: 'Rate limit exceeded' }); }
    res.set('X-RateLimit-Limit', config.max);
    res.set('X-RateLimit-Remaining', Math.max(0, config.max - entry.count));
    next();
  };
}

function corsConfig() {
  const origins = [process.env.FRONTEND_URL || 'https://diah7m.com', 'http://localhost:5173', 'http://localhost:3000'];
  return { origin: (o, cb) => cb(null, !o || origins.includes(o)), credentials: true, methods: ['GET','POST','PUT','DELETE','OPTIONS'] };
}

function sanitizeInput(str) { return typeof str === 'string' ? str.replace(/[<>"'&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;','&':'&amp;'}[c])) : str; }

module.exports = { ACCESS_LEVELS, ROLE_ACCESS, RATE_LIMITS, getAccessLevel, filterByAccess, rateLimit, corsConfig, sanitizeInput };
