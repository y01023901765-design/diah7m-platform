/**
 * DIAH-7M Member State Machine v1.0
 * 회원 상태 FSM: 전이 규칙 + 로그
 * States: ANONYMOUS → REGISTERED → EMAIL_VERIFIED → ACTIVE → SUSPENDED → CHURNED
 */
const STATES = ['ANONYMOUS','REGISTERED','EMAIL_VERIFIED','ACTIVE','SUSPENDED','CHURNED','DELETED'];
const TRANSITIONS = {
  ANONYMOUS:      { register: 'REGISTERED' },
  REGISTERED:     { verify_email: 'EMAIL_VERIFIED', delete: 'DELETED' },
  EMAIL_VERIFIED: { subscribe: 'ACTIVE', delete: 'DELETED' },
  ACTIVE:         { suspend: 'SUSPENDED', cancel: 'EMAIL_VERIFIED', churn: 'CHURNED', delete: 'DELETED' },
  SUSPENDED:      { reactivate: 'ACTIVE', churn: 'CHURNED', delete: 'DELETED' },
  CHURNED:        { reactivate: 'ACTIVE', delete: 'DELETED' },
  DELETED:        {},
};

const stateLog = [];

function transition(userId, currentState, action) {
  const allowed = TRANSITIONS[currentState];
  if (!allowed || !allowed[action]) {
    return { success: false, error: `Cannot ${action} from ${currentState}`, currentState };
  }
  const newState = allowed[action];
  const entry = { userId, from: currentState, to: newState, action, at: new Date().toISOString() };
  stateLog.push(entry);
  return { success: true, newState, entry };
}

function canTransition(currentState, action) {
  return !!(TRANSITIONS[currentState] && TRANSITIONS[currentState][action]);
}

function getHistory(userId) { return stateLog.filter(e => e.userId === userId); }
function getAllowedActions(currentState) { return Object.keys(TRANSITIONS[currentState] || {}); }

const MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS member_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL,
  from_state TEXT, to_state TEXT, action TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`;

module.exports = { STATES, TRANSITIONS, transition, canTransition, getHistory, getAllowedActions, MIGRATION_SQL };
