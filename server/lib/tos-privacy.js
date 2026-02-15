/**
 * DIAH-7M Terms & Privacy v1.0
 * 약관 동의 추적 + GDPR export/delete
 */
const TOS_VERSION = '1.0.0';
const PRIVACY_VERSION = '1.0.0';
const consents = new Map();

function recordConsent(userId, type, version, accepted) {
  const key = `${userId}:${type}`;
  consents.set(key, { userId, type, version, accepted, recordedAt: new Date().toISOString(), ip: null });
  return consents.get(key);
}

function getConsent(userId, type) { return consents.get(`${userId}:${type}`) || null; }

function hasValidConsent(userId) {
  const tos = getConsent(userId, 'tos');
  const privacy = getConsent(userId, 'privacy');
  return tos?.accepted && tos?.version === TOS_VERSION && privacy?.accepted && privacy?.version === PRIVACY_VERSION;
}

async function exportUserData(userId, db) {
  if (!db) return { userId, data: 'DB not available' };
  const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]).catch(() => null);
  return { userId, exported_at: new Date().toISOString(), personal: user, consents: [...consents.values()].filter(c => c.userId === userId) };
}

async function deleteUserData(userId, db) {
  if (!db) return { deleted: false, reason: 'DB not available' };
  await db.run('UPDATE users SET email = ?, name = ?, deleted_at = datetime("now") WHERE id = ?', ['[deleted]', '[deleted]', userId]).catch(() => {});
  consents.delete(`${userId}:tos`); consents.delete(`${userId}:privacy`);
  return { deleted: true, userId, deletedAt: new Date().toISOString() };
}

const MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL,
  type TEXT NOT NULL, version TEXT, accepted INTEGER DEFAULT 0,
  ip TEXT, created_at TEXT DEFAULT (datetime('now'))
)`;

module.exports = { recordConsent, getConsent, hasValidConsent, exportUserData, deleteUserData, TOS_VERSION, PRIVACY_VERSION, MIGRATION_SQL };
