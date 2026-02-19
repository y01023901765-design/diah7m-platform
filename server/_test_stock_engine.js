'use strict';
/**
 * DIAH-7M Stock Engine 회귀 테스트
 * 1. score-engine.js V2 하위호환 (국가 엔진 불변)
 * 2. stock-engine.js 동작 확인 (주식 엔진)
 * 3. stock-thresholds.js 로드 확인
 * 4. stock-pipeline.js 모듈 로드 확인
 * 5. stock-store.js 모듈 로드 확인
 */

var pass = 0, fail = 0;
function assert(name, condition) {
  if (condition) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name); }
}

console.log('\n══════════════════════════════════════');
console.log('  DIAH-7M Stock Engine Regression Test');
console.log('══════════════════════════════════════\n');

// ── 1. score-engine.js 로드 + 하위호환 ──
console.log('── 1. score-engine.js V2 backward compat ──');
var scoreEngine = require('./lib/score-engine');

assert('computeCountryScoreV2 exists', typeof scoreEngine.computeCountryScoreV2 === 'function');
assert('computeScoreV2 exists', typeof scoreEngine.computeScoreV2 === 'function');
assert('gradeGauge exists', typeof scoreEngine.gradeGauge === 'function');
assert('shrinkScore exists', typeof scoreEngine.shrinkScore === 'function');

// 국가 엔진 V2 동작: 기존 게이지로 기존 결과 나와야 함
var testGauges = {
  G_D1: { value: 2.5, axis: 'A1' },
  G_L1: { value: 3.5, axis: 'A2' },
  G_P1: { value: 2.0, axis: 'A3' },
  G_S1: { value: 101, axis: 'A4' },
  G_R2: { value: 53, axis: 'A5' },
  G_F2: { value: 55, axis: 'A6' },
};
var countryResult = scoreEngine.computeCountryScoreV2(testGauges);
assert('Country score is number', typeof countryResult.score === 'number');
assert('Country score > 50 (all good data)', countryResult.score > 50);
assert('Country has gaugeScores', Object.keys(countryResult.gaugeScores).length === 6);
assert('Country has systemScores', Object.keys(countryResult.systemScores).length > 0);
assert('Country has alertGauges array', Array.isArray(countryResult.alertGauges));

// gradeGauge 기본 (국가 thresholds)
var g1 = scoreEngine.gradeGauge('G_D1', 5);
assert('gradeGauge G_D1=5 → good', g1.grade === 'good');
var g2 = scoreEngine.gradeGauge('G_D1', -3);
assert('gradeGauge G_D1=-3 → alert', g2.grade === 'alert');

// gradeGauge with custom thresholds (주식용)
var customTh = { TEST: { dir: 'higher_better', good: [10, 100], warn: [5, 100] } };
var g3 = scoreEngine.gradeGauge('TEST', 15, customTh);
assert('gradeGauge custom TEST=15 → good', g3.grade === 'good');
var g4 = scoreEngine.gradeGauge('TEST', 7, customTh);
assert('gradeGauge custom TEST=7 → caution', g4.grade === 'caution');
var g5 = scoreEngine.gradeGauge('TEST', 2, customTh);
assert('gradeGauge custom TEST=2 → alert', g5.grade === 'alert');

// computeScoreV2 with custom opts
var stockGauges = {
  SG_V1: { value: 18, axis: 'SV' },
  SG_V2: { value: 2.5, axis: 'SV' },
  SG_G1: { value: 12, axis: 'SG' },
  SG_Q1: { value: 20, axis: 'SQ' },
  SG_M1: { value: 50, axis: 'SM' },
};
var stockTh = require('./lib/stock-thresholds');
var v2Result = scoreEngine.computeScoreV2(stockGauges, {
  thresholds: stockTh.STOCK_GAUGE_THRESHOLDS,
  criticals: stockTh.STOCK_CRITICAL_GAUGE_IDS,
  k: 3,
});
assert('computeScoreV2 returns score', typeof v2Result.score === 'number');
assert('computeScoreV2 score 0-100', v2Result.score >= 0 && v2Result.score <= 100);
assert('computeScoreV2 has gaugeScores', Object.keys(v2Result.gaugeScores).length > 0);

// ── 2. stock-thresholds.js ──
console.log('\n── 2. stock-thresholds.js ──');
assert('STOCK_AXES has 5 axes', Object.keys(stockTh.STOCK_AXES).length === 5);
assert('STOCK_GAUGE_THRESHOLDS has 15 entries', Object.keys(stockTh.STOCK_GAUGE_THRESHOLDS).length === 15);
assert('STOCK_CRITICAL_GAUGE_IDS has 3', stockTh.STOCK_CRITICAL_GAUGE_IDS.length === 3);
assert('ARCHETYPE_WEIGHTS has 6', Object.keys(stockTh.ARCHETYPE_WEIGHTS).length === 6);
assert('AXIS_TO_SEVERITY_DIM has 5', Object.keys(stockTh.AXIS_TO_SEVERITY_DIM).length === 5);

// ── 3. stock-engine.js ──
console.log('\n── 3. stock-engine.js ──');
var stockEngine = require('./lib/stock-engine');
assert('computeStockScore exists', typeof stockEngine.computeStockScore === 'function');
assert('computeSeverity exists', typeof stockEngine.computeSeverity === 'function');
assert('computeDeltaDivergence exists', typeof stockEngine.computeDeltaDivergence === 'function');
assert('computeDualLock exists', typeof stockEngine.computeDualLock === 'function');
assert('buildStockHealth exists', typeof stockEngine.buildStockHealth === 'function');

// buildStockHealth 통합 테스트
var profile = { archetype: 'A' };
var gaugeValues = {
  SG_V1: { value: 15 },
  SG_V2: { value: 2 },
  SG_V3: { value: 10 },
  SG_V4: { value: 3 },
  SG_G1: { value: 12 },
  SG_G2: { value: 20 },
  SG_G3: { value: 500 },
  SG_Q1: { value: 18 },
  SG_Q2: { value: 60 },
  SG_Q3: { value: 15 },
  SG_M1: { value: 55 },
  SG_M2: { value: 65 },
  SG_M3: { value: 100 },
};
var health = stockEngine.buildStockHealth(profile, gaugeValues, null);
assert('health.score is number', typeof health.score === 'number');
assert('health.score 0-100', health.score >= 0 && health.score <= 100);
assert('health.severity is number', typeof health.severity === 'number');
assert('health.severity 0-5', health.severity >= 0 && health.severity <= 5);
assert('health.delta exists', health.delta != null);
assert('health.dualLock exists', health.dualLock != null);
assert('health.gaugeScores populated', Object.keys(health.gaugeScores).length >= 10);
assert('health.systemScores has axes', Object.keys(health.systemScores).length >= 3);

// severity with different archetypes
var sevA = stockEngine.computeSeverity('A', health.systemScores);
var sevD = stockEngine.computeSeverity('D', health.systemScores);
assert('severity A is number', typeof sevA === 'number');
assert('severity D is number', typeof sevD === 'number');

// delta divergence
var delta1 = stockEngine.computeDeltaDivergence(80, 40);
assert('delta POS_GAP (sat=80, mkt=40)', delta1.state === 'POS_GAP');
var delta2 = stockEngine.computeDeltaDivergence(30, 70);
assert('delta NEG_GAP (sat=30, mkt=70)', delta2.state === 'NEG_GAP');
var delta3 = stockEngine.computeDeltaDivergence(50, 55);
assert('delta ALIGNED (sat=50, mkt=55)', delta3.state === 'ALIGNED');

// dual lock
var dl1 = stockEngine.computeDualLock({ SQ: { score: 30 }, SS: { score: 30 } });
assert('dualLock both blocked', dl1.isDualLocked === true);
var dl2 = stockEngine.computeDualLock({ SQ: { score: 60 }, SS: { score: 60 } });
assert('dualLock both OK', dl2.isDualLocked === false);

// ── 4. stock-pipeline.js 모듈 로드 ──
console.log('\n── 4. stock-pipeline.js ──');
var stockPipeline = require('./lib/stock-pipeline');
assert('STOCK_GAUGE_MAP has 15 entries', Object.keys(stockPipeline.STOCK_GAUGE_MAP).length === 15);
assert('fetchAllStockGauges exists', typeof stockPipeline.fetchAllStockGauges === 'function');
assert('fetchStockBatch exists', typeof stockPipeline.fetchStockBatch === 'function');

// ── 5. stock-store.js 모듈 로드 ──
console.log('\n── 5. stock-store.js ──');
var StockStore = require('./lib/stock-store');
var store = new StockStore(null); // memory-only
assert('StockStore constructor works', store != null);
assert('StockStore.store is function', typeof store.store === 'function');
assert('StockStore.toGaugeData is function', typeof store.toGaugeData === 'function');
assert('StockStore.isStale is function', typeof store.isStale === 'function');

// store + retrieve
(async function() {
  await store.init();
  await store.store('TSLA', 'SG_V1', 25.5, 'OK');
  await store.store('TSLA', 'SG_V2', 8.3, 'OK');
  var data = store.toGaugeData('TSLA');
  assert('store+retrieve TSLA has SG_V1', data.SG_V1 != null);
  assert('store+retrieve value correct', data.SG_V1.value === 25.5);
  assert('isStale before fetch', store.isStale('TSLA') === true);
  store.lastFetch['TSLA'] = Date.now();
  assert('isStale after fetch', store.isStale('TSLA') === false);

  // ── 6. 국가 엔진 완전 격리 검증 ──
  console.log('\n── 6. Country engine isolation check ──');
  // 국가 엔진이 주식 thresholds에 영향 받지 않는지
  var countryResult2 = scoreEngine.computeCountryScoreV2(testGauges);
  assert('Country score unchanged after stock load', countryResult2.score === countryResult.score);
  // computeScoreV2 없이 국가 계산 가능
  // G_D1=2.5, threshold good:[3,15] → caution (between warn[0,3])
  assert('Country V2 independent', countryResult2.gaugeScores.G_D1.grade === 'caution');

  // ── Summary ──
  console.log('\n══════════════════════════════════════');
  console.log('  TOTAL: ' + (pass + fail) + ' tests');
  console.log('  ✅ PASS: ' + pass);
  console.log('  ❌ FAIL: ' + fail);
  console.log('══════════════════════════════════════\n');

  if (fail > 0) process.exit(1);
})();
