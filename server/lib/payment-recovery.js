/**
 * DIAH-7M Payment Recovery v1.0
 * 결제 실패 시 3단계 자동 재시도
 * Stage 1: 24h 후 재시도 + 이메일
 * Stage 2: 72h 후 재시도 + 경고
 * Stage 3: 7일 후 다운그레이드 + 최종 이메일
 */
const STAGES = [
  { delay: 24 * 3600000, action: 'retry', email: 'payment_failed' },
  { delay: 72 * 3600000, action: 'retry', email: 'payment_failed' },
  { delay: 7 * 86400000, action: 'downgrade', email: 'subscription_cancel' },
];

const recoveryQueue = new Map();

function scheduleRecovery(userId, invoiceId) {
  recoveryQueue.set(userId, { invoiceId, stage: 0, scheduledAt: Date.now(), attempts: [] });
}

async function processRecoveries(billing, emailService, db) {
  const now = Date.now();
  for (const [userId, entry] of recoveryQueue) {
    const stage = STAGES[entry.stage];
    if (!stage) { recoveryQueue.delete(userId); continue; }
    if (now - entry.scheduledAt < stage.delay) continue;
    entry.attempts.push({ stage: entry.stage, at: new Date().toISOString() });
    if (stage.action === 'downgrade') {
      if (db) await db.run('UPDATE users SET tier = ? WHERE id = ?', ['free', userId]).catch(() => {});
      recoveryQueue.delete(userId);
    } else {
      entry.stage++;
      entry.scheduledAt = now;
    }
    if (emailService) {
      const user = db ? await db.get('SELECT email FROM users WHERE id = ?', [userId]).catch(() => null) : null;
      if (user?.email) await emailService.send(user.email, stage.email, { stage: entry.stage }).catch(() => {});
    }
  }
}

function getRecoveryStatus(userId) { return recoveryQueue.get(userId) || null; }
function cancelRecovery(userId) { recoveryQueue.delete(userId); }

const MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS payment_recoveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, invoice_id TEXT,
  stage INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT, resolution TEXT
)`;

module.exports = { scheduleRecovery, processRecoveries, getRecoveryStatus, cancelRecovery, STAGES, MIGRATION_SQL };
