#!/usr/bin/env node
/**
 * DIAH-7M E2E 통합 테스트
 * 가입→로그인→진단→이력조회→관리자 전체 파이프라인
 */

const http = require('http');
const BASE = 'http://localhost:3700';
let token = null, adminToken = null;
let passed = 0, failed = 0;

function req(method, path, body = null, tok = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const headers = { 'Content-Type': 'application/json' };
    if (tok) headers.Authorization = `Bearer ${tok}`;
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname, method, headers };
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function assert(name, cond) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

async function run() {
  console.log('\n🧪 DIAH-7M E2E Test\n');

  // 1. Health
  const h = await req('GET', '/api/health');
  assert('Health check', h.status === 200 && h.body.status === 'ok');
  assert('Modules loaded', h.body.modules?.db === 'loaded');

  // 2. Register
  const r = await req('POST', '/api/v1/auth/register', {
    email: `test${Date.now()}@test.com`, password: 'Test1234!', name: 'Test User'
  });
  assert('Register 201', r.status === 201);
  assert('Token returned', !!r.body.token);
  assert('Mileage 500P', r.body.user?.mileage === 500);
  token = r.body.token;

  // 3. Duplicate register
  const dup = await req('POST', '/api/v1/auth/register', {
    email: r.body.user.email, password: 'Test1234!'
  });
  assert('Duplicate 409', dup.status === 409);

  // 4. Login
  const l = await req('POST', '/api/v1/auth/login', {
    email: r.body.user.email, password: 'Test1234!'
  });
  assert('Login 200', l.status === 200);
  assert('Login token', !!l.body.token);

  // 5. Wrong password
  const wp = await req('POST', '/api/v1/auth/login', {
    email: r.body.user.email, password: 'wrong'
  });
  assert('Wrong pw 401', wp.status === 401);

  // 6. Profile
  const me = await req('GET', '/api/v1/me', null, token);
  assert('Profile 200', me.status === 200);
  assert('Email match', me.body.email === r.body.user.email);

  // 7. Profile update
  const upd = await req('PUT', '/api/v1/me', { name: 'Updated', lang: 'en' }, token);
  assert('Update 200', upd.status === 200);

  // 8. Diagnose
  const gauges = {
    C1:580,C2:45,C3:1450,C4:102,C5:49,
    R1:2.1,R2:98,R3:78,R4:102,R5:8.5,R6:3.2,R7:18,
    D1:0.8,D2:62,D3:1.8,D4:105,D5:45,D6:-2.3,
    N1:2580,N2:1.8,N3:92,N4:1350,N5:22,N6:38,
    E1:2.0,E2:2.5,E3:42,E4:1100,E5:58,E6:0.8,
    I1:6.8,I2:0.35,I3:142,I4:4.2,I5:5800,I6:1.5,I7:980,I8:12,I9:35,
    M1:104,M2:-3.2,M3:62,M4:780,M5:3200,
    G1:1.2,G2:0.8,G3:106,G4:48,G5:82,G6:24,
    O1:3.5,O2:520,O3:0.42,O4:68,O5:0.92,O6:55,
  };
  const diag = await req('POST', '/api/v1/diagnose', { gauges, country: 'KR', period: '2026-01' }, token);
  assert('Diagnose 200', diag.status === 200);
  assert('9 systems', Object.keys(diag.body.systems || {}).length === 9);
  assert('Overall level', diag.body.overall?.level >= 1);
  assert('Gauge count', diag.body.gaugeCount > 50);

  // 9. Diagnosis history
  const hist = await req('GET', '/api/v1/diagnoses', null, token);
  assert('History 200', hist.status === 200);
  assert('Has records', Array.isArray(hist.body) && hist.body.length > 0);

  // 10. Mileage
  const mil = await req('GET', '/api/v1/me/mileage', null, token);
  assert('Mileage 200', mil.status === 200);
  assert('Balance 500', mil.body.balance === 500);

  // 11. No auth
  const noAuth = await req('GET', '/api/v1/me');
  assert('No token 401', noAuth.status === 401);

  // 12. Admin login
  const adm = await req('POST', '/api/v1/auth/login', {
    email: 'admin@diah7m.com', password: 'diah7m-admin-2026'
  });
  assert('Admin login', adm.status === 200);
  adminToken = adm.body.token;

  // 13. Admin KPI
  const kpi = await req('GET', '/api/v1/admin/kpi', null, adminToken);
  assert('Admin KPI 200', kpi.status === 200);
  assert('Has totalUsers', kpi.body.totalUsers >= 1);

  // 14. Admin users
  const users = await req('GET', '/api/v1/admin/users', null, adminToken);
  assert('Admin users', users.status === 200 && Array.isArray(users.body));

  // 15. Admin audit
  const audit = await req('GET', '/api/v1/admin/audit', null, adminToken);
  assert('Audit log', audit.status === 200 && Array.isArray(audit.body));

  // 16. Admin engine
  const eng = await req('GET', '/api/v1/admin/engine', null, adminToken);
  assert('Engine status', eng.status === 200 && eng.body.engineLoaded === true);

  // Summary
  console.log(`\n${'═'.repeat(40)}`);
  console.log(`  ✅ ${passed} passed  ❌ ${failed} failed  (${passed + failed} total)`);
  console.log(`${'═'.repeat(40)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Test error:', e); process.exit(1); });
