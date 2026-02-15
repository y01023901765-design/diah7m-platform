/**
 * DIAH-7M Admin Auth v1.0
 * RBAC + 2FA ready + IP whitelist
 */
const ROLES = {
  viewer: { level: 0, permissions: ['read:dashboard'] },
  editor: { level: 1, permissions: ['read:dashboard','edit:content','view:users'] },
  admin:  { level: 2, permissions: ['read:dashboard','edit:content','view:users','manage:users','manage:billing','view:logs'] },
  superadmin: { level: 3, permissions: ['*'] },
};

const IP_WHITELIST = (process.env.ADMIN_IP_WHITELIST || '').split(',').filter(Boolean);
const sessions = new Map();

function checkRole(userRole, requiredPermission) {
  const role = ROLES[userRole];
  if (!role) return false;
  if (role.permissions.includes('*')) return true;
  return role.permissions.includes(requiredPermission);
}

function checkIP(ip) {
  if (IP_WHITELIST.length === 0) return true;
  return IP_WHITELIST.includes(ip) || IP_WHITELIST.includes('*');
}

function requireAdmin(requiredPermission = 'read:dashboard') {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !user.role) return res.status(401).json({ error: 'Not authenticated' });
    if (!checkRole(user.role, requiredPermission)) return res.status(403).json({ error: 'Insufficient permissions' });
    if (IP_WHITELIST.length > 0 && !checkIP(req.ip)) return res.status(403).json({ error: 'IP not allowed' });
    next();
  };
}

function createAdminSession(userId, role, ip) {
  const token = require('crypto').randomBytes(32).toString('hex');
  sessions.set(token, { userId, role, ip, createdAt: new Date().toISOString(), expiresAt: Date.now() + 8 * 3600000 });
  return token;
}

function validateSession(token) {
  const s = sessions.get(token);
  if (!s || Date.now() > s.expiresAt) { sessions.delete(token); return null; }
  return s;
}

const MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, role TEXT,
  ip TEXT, token_hash TEXT, created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT
)`;

module.exports = { ROLES, checkRole, checkIP, requireAdmin, createAdminSession, validateSession, MIGRATION_SQL };
