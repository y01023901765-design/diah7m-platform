#!/usr/bin/env node
/**
 * DIAH-7M Pipeline Throughput Test
 * ═══════════════════════════════════════════
 * 실데이터 1회 관통: 수집 → 캐시 → 엔진 → 보고서
 * 각 구간의 입력/출력/누락/latency를 로그로 출력
 * 
 * 사용법:
 *   ECOS_API_KEY=xxx KOSIS_API_KEY=xxx node test/pipeline-test.js
 *   
 *   또는 서버 실행 중일 때:
 *   node test/pipeline-test.js --via-api
 */

const path = require('path');

const VIA_API = process.argv.includes('--via-api');
const BASE = process.env.API_URL || 'http://localhost:3700';

// ─── 색상 헬퍼 ───
const C = {
  r: s => `\x1b[31m${s}\x1b[0m`,
  g: s => `\x1b[32m${s}\x1b[0m`,
  y: s => `\x1b[33m${s}\x1b[0m`,
  c: s => `\x1b[36m${s}\x1b[0m`,
  b: s => `\x1b[1m${s}\x1b[0m`,
};

function section(title) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  ${C.b(title)}`);
  console.log(`${'═'.repeat(50)}`);
}

function metric(label, value, unit = '') {
  console.log(`  ${label.padEnd(30)} ${C.c(String(value))} ${unit}`);
}

function bar(ok, total, label) {
  const pct = total > 0 ? Math.round(ok / total * 100) : 0;
  const filled = Math.round(pct / 5);
  const barStr = '█'.repeat(filled) + '░'.repeat(20 - filled);
  const color = pct >= 80 ? C.g : pct >= 50 ? C.y : C.r;
  console.log(`  ${label.padEnd(20)} ${color(barStr)} ${pct}% (${ok}/${total})`);
}

// ─── API 모드 (서버 실행 중) ───
async function testViaAPI() {
  const http = require('http');

  function apiReq(method, path, body, token) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE);
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const opts = { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers };
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

  section('1. HEALTH CHECK');
  const health = await apiReq('GET', '/api/health');
  metric('Server status', health.body.status);
  metric('Uptime', health.body.uptime, 'sec');
  metric('Modules', JSON.stringify(health.body.modules));
  if (health.body.dataStore) {
    metric('DataStore cached', health.body.dataStore.total, 'gauges');
  }

  section('2. ADMIN LOGIN');
  const login = await apiReq('POST', '/api/v1/auth/login', {
    email: 'admin@diah7m.com',
    password: process.env.ADMIN_PASSWORD || 'diah7m-admin-2026',
  });
  if (login.status !== 200) {
    console.log(C.r(`  ❌ Admin login failed: ${login.status}`));
    return;
  }
  const token = login.body.token;
  console.log(C.g('  ✅ Admin authenticated'));

  section('3. DATA MAPPING');
  const mapping = await apiReq('GET', '/api/v1/data/mapping');
  metric('Total gauges', mapping.body.total);
  metric('API-ready (ECOS+KOSIS)', mapping.body.readyForAPI);
  metric('Satellite (pending)', mapping.body.needsSatellite);
  metric('Manual/External', mapping.body.needsManual);
  if (mapping.body.breakdown) {
    for (const [src, data] of Object.entries(mapping.body.breakdown)) {
      metric(`  ${src}`, data.count);
    }
  }

  section('4. DATA REFRESH (실수집)');
  const t0 = Date.now();
  const refresh = await apiReq('POST', '/api/v1/data/refresh', {}, token);
  const totalTime = Date.now() - t0;
  if (refresh.status !== 200) {
    console.log(C.r(`  ❌ Refresh failed: ${refresh.status} — ${JSON.stringify(refresh.body)}`));
    console.log(C.y('  💡 ECOS_API_KEY / KOSIS_API_KEY 설정 확인'));
    return;
  }
  metric('Total time', totalTime, 'ms');
  if (refresh.body.stats) {
    const s = refresh.body.stats;
    metric('Total attempted', s.total);
    bar(s.ok, s.total, 'OK');
    metric('Pending (satellite)', s.pending);
    metric('No data', s.noData);
    metric('API errors', s.apiError || 0);
    metric('Errors', s.errors);
    if (s.latency) {
      metric('Avg latency', s.latency.avg, 'ms');
      metric('Max latency', s.latency.max, 'ms');
    }
  }
  if (refresh.body.stored) {
    metric('Stored to cache', refresh.body.stored.stored || refresh.body.stored);
    metric('Preserved (stale)', refresh.body.stored.preserved || 0);
  }
  if (refresh.body.errors?.length > 0) {
    console.log(`\n  ${C.y('⚠️  Errors (first 5):')}`);
    refresh.body.errors.slice(0, 5).forEach(e => console.log(`    ${e.id}: ${e.error}`));
  }

  section('5. CACHE STATUS');
  const cacheStatus = await apiReq('GET', '/api/v1/data/status');
  metric('Cached gauges', cacheStatus.body.total || 0);
  metric('OK entries', cacheStatus.body.ok || 0);
  metric('Stale entries', cacheStatus.body.stale || 0);
  metric('Last fetch', cacheStatus.body.lastFetch || 'never');

  section('6. AUTO REPORT (캐시 → 엔진)');
  const t1 = Date.now();
  const report = await apiReq('GET', '/api/v1/report/auto?country=KR&lang=ko', null, token);
  const reportTime = Date.now() - t1;
  if (report.status !== 200) {
    console.log(C.r(`  ❌ Report failed: ${report.status} — ${JSON.stringify(report.body)}`));
    return;
  }
  metric('Report time', reportTime, 'ms');
  metric('Report ID', report.body.report_id);
  metric('Country', report.body.context?.country_code);
  metric('Period', report.body.context?.period_label);
  metric('Overall score', report.body.overall?.score);
  metric('Overall status', report.body.overall?.status);
  metric('Causal stage', report.body.overall?.causal_stage);
  metric('Systems', report.body.systems?.length);
  metric('Gauges', report.body.gauges?.length);
  metric('Cross signals', report.body.cross_signals?.length);
  metric('Dual lock', report.body.dual_lock?.active);

  if (report.body.systems) {
    console.log('\n  ── 9축 시스템 ──');
    for (const sys of report.body.systems) {
      const icon = sys.level <= 2 ? '🟢' : sys.level <= 3 ? '🟡' : '🔴';
      console.log(`  ${icon} ${sys.system_name.padEnd(12)} ${sys.body_name.padEnd(8)} L${sys.level} (${sys.score})`);
    }
  }

  section('7. SUMMARY');
  console.log(`
  수집    → ${refresh.body.stats?.ok || '?'}/${refresh.body.stats?.total || '?'} OK  (${totalTime}ms)
  캐시    → ${cacheStatus.body.ok || '?'} entries, ${cacheStatus.body.stale || 0} stale
  엔진    → L${report.body.overall?.level} ${report.body.overall?.status}  (${reportTime}ms)
  보고서  → ${report.body.report_id}
  `);
  console.log(C.g('  ✅ PIPELINE THROUGHPUT TEST COMPLETE'));
  console.log(`${'═'.repeat(50)}\n`);
}

// ─── 직접 모듈 호출 모드 (서버 없이) ───
async function testDirect() {
  const ecosKey = process.env.ECOS_API_KEY;
  const kosisKey = process.env.KOSIS_API_KEY;

  if (!ecosKey && !kosisKey) {
    console.log(C.r('\n  ❌ API 키 없음'));
    console.log(C.y('  ECOS_API_KEY=xxx KOSIS_API_KEY=xxx node test/pipeline-test.js'));
    console.log(C.y('  또는 서버 실행 후: node test/pipeline-test.js --via-api\n'));
    process.exit(1);
  }

  const pipeline = require(path.join(__dirname, '..', 'lib', 'data-pipeline'));
  const engine = require(path.join(__dirname, '..', 'lib', 'core-engine'));
  const DataStore = require(path.join(__dirname, '..', 'lib', 'data-store'));

  section('1. MAPPING');
  const mapping = pipeline.diagnoseMapping();
  metric('Total gauges', mapping.total);
  metric('API-ready', mapping.readyForAPI);
  metric('Satellite', mapping.needsSatellite);

  section('2. FETCH (실수집)');
  const t0 = Date.now();
  const { results, stats, errors } = await pipeline.fetchAll(ecosKey, kosisKey);
  metric('Total time', Date.now() - t0, 'ms');
  bar(stats.ok, stats.total, 'OK');
  metric('Pending', stats.pending);
  metric('No data', stats.noData);
  metric('API errors', stats.apiError || 0);
  if (stats.latency) {
    metric('Avg latency', stats.latency.avg, 'ms');
    metric('Max latency', stats.latency.max, 'ms');
  }

  section('3. CACHE');
  const store = new DataStore(null); // 메모리 전용
  const stored = await store.store(results);
  metric('Stored', stored.stored);
  metric('Preserved', stored.preserved);

  section('4. ENGINE');
  const gaugeData = store.toGaugeData();
  metric('Gauge data keys', Object.keys(gaugeData).length);
  const t1 = Date.now();
  const report = engine.generateReport(gaugeData, { countryCode: 'KR', countryName: '대한민국' });
  metric('Engine time', Date.now() - t1, 'ms');
  metric('Report ID', report.report_id);
  metric('Overall', `L${report.overall.level} ${report.overall.status}`);
  metric('Causal stage', report.overall.causal_stage);
  metric('Systems', report.systems.length);
  metric('Gauges', report.gauges.length);

  section('SUMMARY');
  bar(stats.ok, stats.total, 'Pipeline');
  bar(Object.keys(gaugeData).length, stats.total, 'Engine input');
  console.log(C.g('\n  ✅ DIRECT THROUGHPUT TEST COMPLETE\n'));
}

// ─── 실행 ───
(VIA_API ? testViaAPI() : testDirect()).catch(e => {
  console.error(C.r(`\n  ❌ Test error: ${e.message}\n`));
  process.exit(1);
});
