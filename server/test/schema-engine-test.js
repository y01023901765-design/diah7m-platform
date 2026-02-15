#!/usr/bin/env node
/**
 * DIAH-7M Test: Schema ↔ Engine Validation (N07 + N08)
 * ═══════════════════════════════════════════════════════
 * 1. generateReport() 출력이 schema.json과 일치하는지 ajv 검증
 * 2. 교차신호 / 이중봉쇄 시나리오별 테스트
 * 3. 행동시그널(actions) 생성 검증
 * ═══════════════════════════════════════════════════════
 */

const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const engine = require(path.join(__dirname, '..', 'lib', 'core-engine'));
const schema = require(path.join(__dirname, '..', 'schema.json'));

// ── ajv 초기화 (draft-2020 $schema 제거 후 검증) ──
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
// schema.json에서 $schema/$id 제거 (ajv draft-07 호환)
const schemaCopy = { ...schema };
delete schemaCopy.$schema;
delete schemaCopy.$id;
const validate = ajv.compile(schemaCopy);

let pass = 0, fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    fail++;
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

// ═══ 테스트 데이터 ═══

// 정상 상태 데이터 (59게이지 중 핵심만)
const normalGauges = {
  // AX1: 순환계 — I1 BAND good:[1.5,3.5), I2 LOW good:[20,∞), I3 LOW good:[400,∞), I4 BAND good:[1050,1300)
  I1: 2.5, I2: 25, I3: 420, I4: 1200, I5: 200000, I6: 3.0,
  // AX2: 호흡계 — E1 LOW good:[50000,∞), E2 HIGH good:[0,55000)
  E1: 55000, E2: 50000, E3: 5000, E4: 110, E5: 100, E6: 8,
  // AX3: 소화계 — C1~C6 LOW good:[100,∞) 등
  C1: 105, C2: 103, C3: 105, C4: 85000, C5: 100, C6: 105,
  // AX5: 신경계 — S1 LOW good:[100,∞)
  S1: 105, S2: 35, S3: 102, S4: 101, S5: 101, S6: 103,
  // AX9: 금융시장 — F1 LOW good:[2500,∞), F4 HIGH good:[0,20)
  F1: 2600, F2: 3.0, F3: 2100, F4: 18, F5: 3.0, F6: 10, F7: 800,
  // AX6: 면역계 — P1 HIGH good:[0,2.5)
  P1: 2.0, P2: 2.5, P3: 27000, P4: 40, P5: 5000, P6: 2.0,
  // AX4: 근골격계
  M1: 105, M2_G: 2.5, M3_G: 2.5,
  // 종합
  O1: 0.7, O2: 103, O3: 72, O4: 22, O5: 1.6, O6: 9,
  // AX7: 피부계 — D1 BAND good:[95,105)
  D1: 100, D2: 12000, D3: 55000,
  // AX8: 배설계 — L1 LOW good:[62,∞), L2 HIGH good:[0,3.5)
  L1: 63, L2: 3.0, L3: 65, L4: 25,
  R1: 102, R2: 4000, R5: 2.5, R6: 1.5,
  G1: 500, G6: 25,
};

// 위기 상태 데이터 (gauge-meta RANGE danger 구간에 들어가도록)
const crisisGauges = {
  // I1 BAND danger:[5,∞) or danger_low:[0,0.5)
  I1: 6.0, I2: -5, I3: 300, I4: 1500, I5: 280000, I6: 7.0,
  // E1 LOW danger:[0,40000)
  E1: 35000, E2: 70000, E3: -3000, E4: 80, E5: 140, E6: -10,
  // C1~C6 LOW danger:[0,90) etc
  C1: 85, C2: 85, C3: 80, C4: 60000, C5: 75, C6: 80,
  // S1 LOW warn:[80,100), S3~S6 warn 수준으로 (watch 시그널 생성)
  S1: 90, S2: 22, S3: 97, S4: 97, S5: 99, S6: 90,
  // F1 LOW danger:[0,2200), F4 HIGH danger:[30,∞)
  F1: 2100, F2: 5.5, F3: 1600, F4: 35, F5: 5.5, F6: 20, F7: 550,
  // P1 HIGH danger:[4,∞)
  P1: 5.0, P2: 7.0, P3: 18000, P4: 60, P5: -20000, P6: 5.0,
  // M1 LOW danger:[0,90)
  M1: 85, M2_G: -1, M3_G: -1,
  // O1 LOW danger:[0,0)=negative, O4 HIGH danger:[35,∞)
  O1: -0.5, O2: 85, O3: 63, O4: 40, O5: 0.8, O6: 4,
  // D1 BAND danger:[115,∞) or danger_low:[0,85)
  D1: 120, D2: 5000, D3: 25000,
  // L1 LOW danger:[0,58), L2 HIGH danger:[5,∞)
  L1: 55, L2: 6.0, L3: 59, L4: -5,
  R1: 93, R2: -1000, R5: 6.0, R6: 5.0,
  G1: -3000, G6: 80,
};

// 위기 상황 thresholds (교차신호/이중봉쇄 트리거용)
// 위기 상황 thresholds
// severity(val, {good,warn,danger}): val>=danger→5, val>=warn→3, val<=good→1, else→2
// 역방향 지표(수출↓=위험)는 값을 이미 위기수준으로 설정했으므로 threshold를 낮게 잡음
const crisisThresholds = {
  // ── 교차신호 쌍별 양쪽 모두 severity ≥ 3 보장 ──
  I1: { good: 2, warn: 3.5, danger: 4.5 },    // I1=5.0 → ≥4.5 → sev=5 ✓
  I2: { good: 50, warn: 0, danger: -15 },       // I2=-20 → ≥-15 → sev=5 ✓  (적자가 위험)
  I3: { good: 4000, warn: 2800, danger: 2600 }, // I3=2500 → ≥2600? No. 작을수록 위험인데...
  E1: { good: 1, warn: 150, danger: 180 },      // E1=200 → ≥180 → sev=5 ✓ (비정상적으로 작은 good)
  E2: { good: 1, warn: 500, danger: 580 },      // E2=600 → ≥580 → sev=5 ✓
  E3: { good: 1, warn: -200, danger: -350 },    // E3=-400 → ≥-350? -400 < -350 → No
  E4: { good: 1, warn: 60, danger: 75 },        // E4=80 → ≥75 → sev=5 ✓
  E5: { good: 1, warn: 100, danger: 115 },      // E5=120 → ≥115 → sev=5 ✓
  E6: { good: 1, warn: -20, danger: -28 },      // E6=-30 → ≥-28? -30 < -28 → No
  C1: { good: 1, warn: -3, danger: -4 },        // C1=-5 → ≥-4? -5 < -4 → No
  C2: { good: 100, warn: 65, danger: 62 },      // C2=60 → ≥62? No
  C3: { good: 1, warn: 15, danger: 18 },        // C3=20 → ≥18 → sev=5 ✓
  C4: { good: 1, warn: -5, danger: -8 },        // C4=-10 → ≥-8? -10 < -8 → No
  C5: { good: 1, warn: -2, danger: -2.5 },      // C5=-3 → ≥-2.5? -3 < -2.5 → No
  C6: { good: 1, warn: -1.5, danger: -1.8 },    // C6=-2 → ≥-1.8? -2 < -1.8 → No
  S1: { good: 100, warn: 55, danger: 52 },      // S1=50 → ≥52? No
  F1: { good: 0.5, warn: 2.0, danger: 3.5 },   // F1=4.0 → ≥3.5 → sev=5 ✓
  F2: { good: 0.5, warn: 2.0, danger: 3.0 },   // F2=3.5 → ≥3.0 → sev=5 ✓
  F3: { good: 1, warn: 1500, danger: 1700 },    // F3=1800 → ≥1700 → sev=5 ✓
  F4: { good: 1, warn: 35, danger: 42 },        // F4=45 → ≥42 → sev=5 ✓
  F5: { good: 1, warn: 3, danger: 4.5 },        // F5=5.0 → ≥4.5 → sev=5 ✓
  F7: { good: 1, warn: 350, danger: 380 },      // F7=400 → ≥380 → sev=5 ✓
  P1: { good: 2.5, warn: 4.0, danger: 5.5 },   // P1=6.0 → ≥5.5 → sev=5 ✓
  P2: { good: 2.5, warn: 5.0, danger: 7.5 },   // P2=8.0 → ≥7.5 → sev=5 ✓
  P3: { good: 1, warn: -15, danger: -22 },      // P3=-25 → ≥-22? -25 < -22 → No
  P5: { good: 1, warn: -10, danger: -13 },      // P5=-15 → ≥-13? -15 < -13 → No
  S5: { good: 0.5, warn: 3, danger: 4.5 },      // S5=5.0 → ≥4.5 → sev=5 ✓
  M1: { good: 1, warn: 45, danger: 48 },        // M1=50 → ≥48 → sev=5 ✓
  O1: { good: 1, warn: 100, danger: 140 },        // O1=150 → ≥140 → sev=5 ✓
  O2: { good: 1, warn: 70, danger: 78 },        // O2=80 → ≥78 → sev=5 ✓
  G1: { good: 1, warn: 40, danger: 48 },        // G1=50 → ≥48 → sev=5 ✓
  G6: { good: 1, warn: 60, danger: 75 },        // G6=80 → ≥75 → sev=5 ✓
  S2: { good: 1, warn: 60, danger: 68 },        // S2=70 → ≥68 → sev=5 ✓
  R5: { good: 1, warn: 6, danger: 7.5 },        // R5=8 → ≥7.5 → sev=5 ✓
  S4: { good: 1, warn: -1.5, danger: -1.8 },    // S4=-2 → ≥-1.8? -2 < -1.8 → No
  // ── 이중봉쇄용 R/D/C/M 시스템 전체 보장 ──
  M2_G: { good: 1, warn: 140, danger: 155 },    // M2_G=160 → ≥155 → sev=5 ✓
  M3_G: { good: 1, warn: 150, danger: 190 },    // M3_G=200 → ≥190 → sev=5 ✓
  O3: { good: 1, warn: 100, danger: 115 },
  O4: { good: 1, warn: 100, danger: 125 },
  O5: { good: 1, warn: 90, danger: 105 },
  O6: { good: 1, warn: 80, danger: 95 },




  L2: { good: 4, warn: 6, danger: 7.5 },        // L2=8 → ≥7.5 → sev=5 ✓
  R2: { good: 1, warn: 100000, danger: 140000 },// R2=150000 → ≥140000 → sev=5 ✓
  D1: { good: 1, warn: 0.5, danger: 0.52 },     // D1=0.5 → ≥0.52? No
  D2: { good: 1, warn: 22, danger: 24 },        // D2=25 → ≥24 → sev=5 ✓
  D3: { good: 1, warn: 2800, danger: 2900 },    // D3=3000 → ≥2900 → sev=5 ✓
};

console.log('\n══════════════════════════════════════');
console.log('  DIAH-7M Schema ↔ Engine Test');
console.log('══════════════════════════════════════\n');

// ═══ N07: Schema 검증 ═══
console.log('── N07: Schema Validation ──');

test('정상 데이터 → generateReport → schema 검증 통과', () => {
  const report = engine.generateReport(normalGauges);
  const valid = validate(report);
  if (!valid) {
    const errors = validate.errors.map(e => `${e.instancePath} ${e.message}`).join('\n  ');
    throw new Error(`Schema validation failed:\n  ${errors}`);
  }
});

test('위기 데이터 → generateReport → schema 검증 통과', () => {
  const report = engine.generateReport(crisisGauges, { thresholds: crisisThresholds });
  const valid = validate(report);
  if (!valid) {
    const errors = validate.errors.map(e => `${e.instancePath} ${e.message}`).join('\n  ');
    throw new Error(`Schema validation failed:\n  ${errors}`);
  }
});

test('report_id 형식 RPT-XX-YYYYMMDD-XXXX', () => {
  const report = engine.generateReport(normalGauges);
  assert(/^RPT-[A-Z]{2,4}-[0-9]{8}-[A-Z0-9]+$/.test(report.report_id), `Invalid report_id: ${report.report_id}`);
});

test('필수 필드 존재 확인', () => {
  const report = engine.generateReport(normalGauges);
  for (const field of ['report_id', 'product_type', 'frequency', 'context', 'systems', 'overall', 'metadata']) {
    assert(report[field] !== undefined, `Missing field: ${field}`);
  }
});

test('systems 배열 1~9개', () => {
  const report = engine.generateReport(normalGauges);
  assert(Array.isArray(report.systems), 'systems is not array');
  assert(report.systems.length >= 1 && report.systems.length <= 9, `systems count: ${report.systems.length}`);
});

test('metadata.compliance.prediction_prohibited === true', () => {
  const report = engine.generateReport(normalGauges);
  assert(report.metadata.compliance.prediction_prohibited === true, 'prediction not prohibited');
});

// ═══ N08: 교차신호 + 이중봉쇄 테스트 ═══
console.log('\n── N08: Cross-Signal + Dual-Lock ──');

test('정상 데이터 → 교차신호 적거나 없음', () => {
  const report = engine.generateReport(normalGauges);
  assert(report.cross_signals.length <= 3, `Too many cross signals in normal: ${report.cross_signals.length}`);
});

test('위기 데이터 → 교차신호 발생', () => {
  const report = engine.generateReport(crisisGauges, { thresholds: crisisThresholds });
  assert(report.cross_signals.length >= 1, 'No cross signals in crisis');
});

test('위기 데이터 → 이중봉쇄 활성화', () => {
  const report = engine.generateReport(crisisGauges, { thresholds: crisisThresholds });
  assert(report.dual_lock.active === true, `Dual lock not active in crisis (input_sealed=${report.dual_lock.input_sealed}, output_sealed=${report.dual_lock.output_sealed})`);
});

test('이중봉쇄 → causal_stage가 cause 이상', () => {
  const report = engine.generateReport(crisisGauges, { thresholds: crisisThresholds });
  const validStages = ['cause', 'manifest', 'result'];
  assert(validStages.includes(report.overall.causal_stage), `Expected cause+, got: ${report.overall.causal_stage}`);
});

// ═══ N09: 행동시그널 검증 ═══
console.log('\n── N09: Action Signals ──');

test('정상 데이터 → actions 배열 존재 (최소 context 1개)', () => {
  const report = engine.generateReport(normalGauges);
  assert(Array.isArray(report.actions), 'actions is not array');
  assert(report.actions.length >= 1, 'No actions generated');
  const hasContext = report.actions.some(a => a.type === 'context');
  assert(hasContext, 'Missing context action');
});

test('위기 데이터 → observation + watch + context 전부 생성', () => {
  const report = engine.generateReport(crisisGauges, { thresholds: crisisThresholds });
  const types = new Set(report.actions.map(a => a.type));
  assert(types.has('observation'), 'Missing observation');
  assert(types.has('watch'), 'Missing watch');
  assert(types.has('context'), 'Missing context');
});

test('actions에 금지어 없음', () => {
  const report = engine.generateReport(crisisGauges, { thresholds: crisisThresholds });
  const banned = ['예측', '전망', '매수', '매도', '추천', '확정', 'predict', 'forecast', 'buy', 'sell'];
  for (const a of report.actions) {
    for (const word of banned) {
      assert(!a.text.includes(word), `Prohibited word "${word}" found in action: ${a.text}`);
    }
  }
});

test('모든 actions에 confidence 0~1', () => {
  const report = engine.generateReport(crisisGauges, { thresholds: crisisThresholds });
  for (const a of report.actions) {
    assert(a.confidence >= 0 && a.confidence <= 1, `Invalid confidence ${a.confidence} in: ${a.text}`);
  }
});

// ═══ 결과 ═══
console.log('\n══════════════════════════════════════');
console.log(`  Result: ${pass} passed, ${fail} failed`);
console.log('══════════════════════════════════════\n');

process.exit(fail > 0 ? 1 : 0);
