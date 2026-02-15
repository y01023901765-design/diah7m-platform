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
  I1: 2.5, I2: 87.4, I3: 4259, I4: 1453, I5: 6.2, I6: 2.95,
  E1: 658, E2: 571, E3: 87, E4: 142, E5: 63, E6: 33.9,
  C1: 1.2, C2: 92.4, C3: 38.2, C4: 3.8, C5: 1.6, C6: 1.8,
  S1: 88.5, S2: 108, S3: 100.2, S4: 4.2, S5: 1.2, S6: 99.8,
  F1: 0.62, F2: 0.45, F3: 5302, F4: 22.5, F5: 0.85, F6: 0.55, F7: 1128,
  P1: 2.0, P2: 1.5, P3: -5.2, P4: 55, P5: -2.1, P6: 2.2,
  M1: 73.5, M2_G: 115.2, M3_G: 2.8,
  O1: 2.5, O2: 102, O3: 3.2, O4: 2.1, O5: 1.8, O6: 1.2,
  D1: 0.68, D2: 19.2, D3: 3580,
  L1: 62.1, L2: 3.5, L3: 1900, L4: 0.85,
  R1: 1.2, R2: 72500, R5: 3.2, R6: 2.1,
  G1: 180, G6: 35,
};

// 위기 상태 데이터 (교차신호/이중봉쇄 트리거)
const crisisGauges = {
  I1: 5.0, I2: -20, I3: 2500, I4: 1800, I5: 12, I6: 8.0,
  E1: 200, E2: 600, E3: -400, E4: 80, E5: 120, E6: -30,
  C1: -5, C2: 60, C3: 20, C4: -10, C5: -3, C6: -2,
  S1: 50, S2: 70, S3: 85, S4: -2, S5: 5.0, S6: 90,
  F1: 4.0, F2: 3.5, F3: 1800, F4: 45, F5: 5.0, F6: 3.5, F7: 400,
  P1: 6.0, P2: 8.0, P3: -25, P4: 80, P5: -15, P6: 5.5,
  M1: 50, M2_G: 160, M3_G: 200,
  O1: 150, O2: 80, O3: 120, O4: 130, O5: 110, O6: 100,
  D1: 0.5, D2: 25, D3: 3000,
  L1: 55, L2: 8, L3: 2500, L4: 4.0,
  R1: -5, R2: 150000, R5: 8, R6: 5,
  G1: 50, G6: 80,
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
