/**
 * DIAH-7M Entitlement Cache v1.0
 * tier별 접근 권한 캐시 + 즉시 무효화
 */
const cache = new Map();
const TTL = 5 * 60 * 1000; // 5분
let cleanupInterval = null;

function set(userId, tier, extras = {}) {
  cache.set(userId, { tier, extras, expiresAt: Date.now() + TTL, updatedAt: new Date().toISOString() });
}

function get(userId) {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { cache.delete(userId); return null; }
  return entry;
}

function invalidate(userId) { cache.delete(userId); }
function invalidateAll() { cache.clear(); }

function check(userId, requiredTier) {
  const order = ['free', 'basic', 'pro', 'premium', 'enterprise', 'admin'];
  const entry = get(userId);
  if (!entry) return false;
  return order.indexOf(entry.tier) >= order.indexOf(requiredTier);
}

function init() { cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache) { if (now > v.expiresAt) cache.delete(k); }
}, 60000); }

function destroy() { if (cleanupInterval) clearInterval(cleanupInterval); }
function stats() { return { size: cache.size, entries: [...cache.keys()] }; }

module.exports = { set, get, invalidate, invalidateAll, check, init, destroy, stats };
