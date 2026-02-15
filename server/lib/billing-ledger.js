/**
 * DIAH-7M Billing Ledger v1.0
 * 이벤트 소싱 기반 거래 원장
 * 모든 결제 이벤트를 불변 로그로 기록
 */
const events = [];

function record(event) {
  const entry = {
    id: events.length + 1, type: event.type, userId: event.userId,
    amount: event.amount || 0, currency: event.currency || 'USD',
    metadata: event.metadata || {}, timestamp: new Date().toISOString(),
  };
  events.push(entry);
  return entry;
}

function getByUser(userId) { return events.filter(e => e.userId === userId); }
function getByType(type) { return events.filter(e => e.type === type); }
function getAll() { return [...events]; }

function getBalance(userId) {
  return getByUser(userId).reduce((sum, e) => {
    if (e.type === 'charge' || e.type === 'subscription') return sum - e.amount;
    if (e.type === 'refund') return sum + e.amount;
    return sum;
  }, 0);
}

function getSummary(startDate, endDate) {
  const filtered = events.filter(e => (!startDate || e.timestamp >= startDate) && (!endDate || e.timestamp <= endDate));
  return {
    total_events: filtered.length,
    total_revenue: filtered.filter(e => e.type !== 'refund').reduce((s, e) => s + e.amount, 0),
    total_refunds: filtered.filter(e => e.type === 'refund').reduce((s, e) => s + e.amount, 0),
    by_type: filtered.reduce((m, e) => { m[e.type] = (m[e.type] || 0) + 1; return m; }, {}),
  };
}

const MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS billing_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, user_id TEXT,
  amount REAL DEFAULT 0, currency TEXT DEFAULT 'USD', metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`;

module.exports = { record, getByUser, getByType, getAll, getBalance, getSummary, MIGRATION_SQL };
