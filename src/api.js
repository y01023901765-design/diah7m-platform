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

// ── Global (43국) ──
export async function globalCountries() {
  return api('/api/v1/global/countries');
}

export async function globalCountry(iso3) {
  return api(`/api/v1/global/country/${iso3}`);
}

export async function globalOverview() {
  return api('/api/v1/global/overview');
}

export async function globalCompare(iso3list) {
  return api(`/api/v1/global/compare/${iso3list}`);
}

export async function globalCommodities() {
  return api('/api/v1/global/commodities');
}

// ── Connection state ──
export function isAuthenticated() {
  return !!getToken();
}

// ── Stock (Phase 2) ──
export async function stockList(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api(`/api/v1/stock/list${qs ? '?' + qs : ''}`);
}
export async function stockSearch(q) {
  return api(`/api/v1/stock/search?q=${encodeURIComponent(q)}`);
}
export async function stockProfile(ticker) {
  return api(`/api/v1/stock/${ticker}`);
}
export async function stockFacilities(ticker) {
  return api(`/api/v1/stock/${ticker}/facilities`);
}
export async function stockDelta(ticker) {
  return api(`/api/v1/stock/${ticker}/delta`);
}
export async function stockFlow(ticker) {
  return api(`/api/v1/stock/${ticker}/flow`);
}
export async function stockSignals(ticker) {
  return api(`/api/v1/stock/${ticker}/signals`);
}

// ── Catalog (Phase 3) ──
export async function catalogCategories() {
  return api('/api/v1/catalog/categories');
}
export async function catalogCategory(id) {
  return api(`/api/v1/catalog/category/${id}`);
}
export async function catalogSearch(q) {
  return api(`/api/v1/catalog/search?q=${encodeURIComponent(q)}`);
}
export async function catalogQuote(serviceIds, message, contact) {
  return api('/api/v1/catalog/quote', {
    method: 'POST',
    body: JSON.stringify({ serviceIds, message, contact }),
  });
}

// ── Notifications ──
export async function getNotifications(filter = 'all', limit = 50) {
  return api(`/api/v1/notifications?filter=${filter}&limit=${limit}`);
}
export async function getUnreadCount() {
  return api('/api/v1/notifications/unread');
}
export async function markNotificationRead(id) {
  return api(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
}
export async function markAllNotificationsRead() {
  return api('/api/v1/notifications/read-all', { method: 'PATCH' });
}
export async function deleteNotification(id) {
  return api(`/api/v1/notifications/${id}`, { method: 'DELETE' });
}

// ── Satellite (위성 데이터) ──
export async function satelliteLatest() {
  return api('/api/v1/satellite/latest');
}
export async function satelliteStatus() {
  return api('/api/v1/satellite/status');
}
export async function satelliteCollect() {
  return api('/api/admin/satellite/collect', { method: 'POST' });
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
