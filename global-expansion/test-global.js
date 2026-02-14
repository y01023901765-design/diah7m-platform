/**
 * DIAH-7M Global Pipeline Test Script
 * ═══════════════════════════════════════════
 * 
 * 사용법:
 *   node test-global.js              → 전체 테스트
 *   node test-global.js wb           → World Bank만
 *   node test-global.js country USA  → 미국 단일 테스트
 * 
 * Render 서버에서 실행:
 *   https://diah7m-platform.onrender.com/api/v1/global/countries
 */

'use strict';

const { COUNTRIES, COUNTRY_COUNT, OECD_MEMBERS, WB_COUNTRIES, DEEP_COUNTRIES } = require('./lib/country-profiles');
const { GLOBAL_GAUGES, GLOBAL_COMMODITIES, GAUGE_IDS, GAUGE_COUNT, CRITICAL_GAUGES, AXIS_MAP } = require('./lib/global-indicators');

// ═══════════════════════════════════════════
// 1. 구조 검증 (오프라인 — API 호출 없음)
// ═══════════════════════════════════════════

function testStructure() {
  console.log('═══ STRUCTURE TESTS ═══\n');
  let pass = 0, fail = 0;

  // 국가 수 확인
  const countryCount = Object.keys(COUNTRIES).length;
  assert(countryCount === 43, `국가 수: ${countryCount} (expected 43)`);

  // OECD 38개국
  assert(OECD_MEMBERS.length === 38, `OECD: ${OECD_MEMBERS.length} (expected 38)`);

  // World Bank 코드 보유국 (대만 제외 = 42)
  assert(WB_COUNTRIES.length === 42, `WB: ${WB_COUNTRIES.length} (expected 42)`);

  // 게이지 수 (20개)
  assert(GAUGE_COUNT === 20, `게이지: ${GAUGE_COUNT} (expected 20)`);

  // 9축 전부 커버
  const axesCovered = new Set(Object.values(GLOBAL_GAUGES).map(g => g.axis));
  assert(axesCovered.size === 9, `축 커버: ${axesCovered.size}/9`);

  // 핵심 게이지 확인 (GDP, CPI, 실업률, 정부부채, CLI)
  const criticalIds = ['G_D1', 'G_P1', 'G_L1', 'G_F2', 'G_S1'];
  for (const id of criticalIds) {
    assert(GLOBAL_GAUGES[id], `핵심 게이지 ${id} 존재`);
  }

  // 모든 게이지에 최소 1개 소스
  for (const [id, gauge] of Object.entries(GLOBAL_GAUGES)) {
    assert(gauge.sources.length > 0, `${id}: 소스 ${gauge.sources.length}개`);
  }

  // 모든 국가에 ISO 코드
  for (const [code, country] of Object.entries(COUNTRIES)) {
    assert(country.iso2, `${code}: iso2 존재`);
    assert(country.iso3, `${code}: iso3 존재`);
    assert(country.name.en, `${code}: 영문 이름`);
    assert(country.name.ko, `${code}: 한글 이름`);
    assert(country.satellite, `${code}: 위성 좌표`);
  }

  // 중국 위성전용 확인
  assert(COUNTRIES.CHN.tier === 'satellite_only', '중국: satellite_only');

  // 한국 deep 확인
  assert(COUNTRIES.KOR.tier === 'deep', '한국: deep');

  // 원자재 지표 확인
  const commodityCount = Object.keys(GLOBAL_COMMODITIES).length;
  assert(commodityCount >= 10, `원자재: ${commodityCount}개`);

  console.log(`\n✅ PASS: ${pass}  ❌ FAIL: ${fail}`);
  return fail === 0;

  function assert(condition, msg) {
    if (condition) {
      console.log(`  ✅ ${msg}`);
      pass++;
    } else {
      console.log(`  ❌ ${msg}`);
      fail++;
    }
  }
}


// ═══════════════════════════════════════════
// 2. API 연결 테스트 (온라인 — 실제 API 호출)
// ═══════════════════════════════════════════

async function testAPIConnection() {
  console.log('\n═══ API CONNECTION TESTS ═══\n');

  const { fetchWorldBank, fetchOECD, fetchIMF } = require('./lib/global-pipeline');
  let pass = 0, fail = 0;

  // World Bank — GDP 성장률 (한국)
  console.log('  [WB] Testing GDP growth for Korea...');
  try {
    const data = await fetchWorldBank('NY.GDP.MKTP.KD.ZG', ['KOR']);
    if (data.length > 0) {
      console.log(`  ✅ WB Korea GDP: ${data.length} records, latest=${data[0].value}% (${data[0].date})`);
      pass++;
    } else {
      console.log('  ❌ WB Korea GDP: no data');
      fail++;
    }
  } catch (e) {
    console.log(`  ❌ WB Korea GDP: ${e.message}`);
    fail++;
  }

  // World Bank — 다국가 CPI
  console.log('  [WB] Testing CPI for 5 countries...');
  try {
    const data = await fetchWorldBank('FP.CPI.TOTL.ZG', ['USA', 'JPN', 'DEU', 'GBR', 'KOR']);
    const countries = new Set(data.map(d => d.country));
    console.log(`  ✅ WB CPI: ${data.length} records, ${countries.size} countries`);
    pass++;
  } catch (e) {
    console.log(`  ❌ WB CPI: ${e.message}`);
    fail++;
  }

  // OECD — CLI (경기선행지수)
  console.log('  [OECD] Testing CLI...');
  try {
    const data = await fetchOECD(
      'OECD.SDD.STES,DSD_STES@DF_CLI',
      ['USA', 'JPN', 'KOR'],
      'LI',
      'M',
    );
    if (data.length > 0) {
      console.log(`  ✅ OECD CLI: ${data.length} records`);
      pass++;
    } else {
      console.log(`  ⚠️ OECD CLI: 0 records (might need different measure code)`);
      fail++;
    }
  } catch (e) {
    console.log(`  ❌ OECD CLI: ${e.message}`);
    fail++;
  }

  // IMF — GDP 성장 전망
  console.log('  [IMF] Testing GDP growth forecast...');
  try {
    const data = await fetchIMF('NGDP_RPCH');
    const countries = new Set(data.map(d => d.country));
    console.log(`  ✅ IMF GDP growth: ${data.length} records, ${countries.size} countries`);
    pass++;
  } catch (e) {
    console.log(`  ❌ IMF GDP: ${e.message}`);
    fail++;
  }

  console.log(`\n✅ PASS: ${pass}  ❌ FAIL: ${fail}`);
  return fail === 0;
}


// ═══════════════════════════════════════════
// 3. 단일 국가 전체 테스트
// ═══════════════════════════════════════════

async function testCountry(iso3 = 'USA') {
  console.log(`\n═══ COUNTRY TEST: ${iso3} ═══\n`);

  const { fetchCountryData } = require('./lib/global-pipeline');

  try {
    const data = await fetchCountryData(iso3, {
      fredApiKey: process.env.FRED_API_KEY,
    });

    console.log(`  국가: ${data.countryName?.en} (${data.country})`);
    console.log(`  티어: ${data.tier}`);
    console.log(`  게이지: ${data.gaugeCount}/${data.totalGauges} (${data.coverageRate})`);
    console.log(`  에러: ${data.errors.length}건`);

    console.log('\n  ── 수집된 게이지 ──');
    for (const [id, gauge] of Object.entries(data.gauges)) {
      console.log(`  ${id} | ${gauge.name.en.padEnd(30)} | ${gauge.value} ${gauge.unit || ''} | ${gauge.date} | ${gauge.provider}`);
    }

    if (data.errors.length > 0) {
      console.log('\n  ── 에러 ──');
      for (const err of data.errors) {
        console.log(`  ${err.gaugeId} | ${err.provider} | ${err.error}`);
      }
    }

    return data.gaugeCount > 0;
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    return false;
  }
}


// ═══════════════════════════════════════════
// 실행
// ═══════════════════════════════════════════
async function main() {
  const mode = process.argv[2] || 'all';

  console.log('╔═══════════════════════════════════════╗');
  console.log('║  DIAH-7M Global Pipeline Test         ║');
  console.log('╚═══════════════════════════════════════╝\n');

  // 항상 구조 테스트
  const structOk = testStructure();

  if (mode === 'all' || mode === 'wb' || mode === 'api') {
    await testAPIConnection();
  }

  if (mode === 'all' || mode === 'country') {
    const country = process.argv[3] || 'USA';
    await testCountry(country);
  }

  if (!structOk) {
    console.log('\n⚠️ 구조 테스트 실패 — 코드 수정 필요');
    process.exit(1);
  }

  console.log('\n✅ 테스트 완료');
}

main().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
