// DIAH-7M API Client — 프론트↔백엔드 연결 계층
// Vercel(프론트) ↔ Render(백엔드) 구조 대응

const API_BASE = import.meta.env.VITE_API_URL || '';

// ── Token 관리 ──
let _token = null;
const getToken = () => _token || localStorage.getItem('diah7m-token');
const setToken = (t) => { _token = t; if(t) localStorage.setItem('diah7m-token', t); else localStorage.removeItem('diah7m-token'); };

// ── 공통 fetch ──
async function api(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || data.message || `API ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ── Auth ──
export async function register(name, email, password) {
  const data = await api('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function login(email, password) {
  const data = await api('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (data.token) setToken(data.token);
  return data;
}

export function logout() {
  setToken(null);
  localStorage.removeItem('diah7m-user');
}

// ── Profile ──
export async function getMe() {
  return api('/api/v1/me');
}

export async function updateMe(updates) {
  return api('/api/v1/me', {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function changePassword(currentPassword, newPassword) {
  return api('/api/v1/me/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

// ── Diagnosis ──
export async function diagnose(gauges, thresholds, options = {}) {
  return api('/api/v1/diagnose', {
    method: 'POST',
    body: JSON.stringify({ gauges, thresholds, ...options })
  });
}

export async function generateReport(options = {}) {
  return api('/api/v1/report', {
    method: 'POST',
    body: JSON.stringify(options)
  });
}

export async function getDiagnoses(limit = 20) {
  return api(`/api/v1/diagnoses?limit=${limit}`);
}

export async function getDiagnosis(id) {
  return api(`/api/v1/diagnoses/${id}`);
}

// ── Mileage ──
export async function getMileage() {
  return api('/api/v1/me/mileage');
}

// ── Admin ──
export async function adminKPI() {
  return api('/api/v1/admin/kpi');
}

export async function adminUsers(page = 1) {
  return api(`/api/v1/admin/users?page=${page}`);
}

export async function adminAudit(limit = 50) {
  return api(`/api/v1/admin/audit?limit=${limit}`);
}

export async function adminEngine() {
  return api('/api/v1/admin/engine');
}

// ── Health check ──
export async function healthCheck() {
  return api('/api/health');
}

// ── Data Pipeline ──
export async function dataStatus() {
  return api('/api/v1/data/status');
}

export async function dataLatest() {
  return api('/api/v1/data/latest');
}

export async function dataRefresh() {
  return api('/api/v1/data/refresh', { method: 'POST' });
}

export async function autoReport(opts = {}) {
  const params = new URLSearchParams(opts).toString();
  return api(`/api/v1/report/auto${params ? '?' + params : ''}`);
}

export async function dataMapping() {
  return api('/api/v1/data/mapping');
}

// ── Connection state ──
export function isAuthenticated() {
  return !!getToken();
}

export function getStoredUser() {
  try {
    const u = localStorage.getItem('diah7m-user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

export function storeUser(user) {
  localStorage.setItem('diah7m-user', JSON.stringify(user));
}

export { setToken, getToken, API_BASE };
