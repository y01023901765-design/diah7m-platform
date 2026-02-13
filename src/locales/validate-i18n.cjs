#!/usr/bin/env node
/**
 * DIAH-7M i18n Validator
 * ═══════════════════════════════════════════
 * keys.snapshot.json (SSOT) 기준으로 모든 로케일 검증
 * 
 * 검증 항목:
 *   1. 누락 키 (missing)
 *   2. 여분 키 (extra) 
 *   3. 빈값/비문자 (empty)
 *   4. placeholder 불일치 ({tier} 등)
 *   5. 배열 길이 불일치
 *   6. 따옴표/줄바꿈 깨짐 (parse 실패)
 * 
 * 사용: node validate-i18n.cjs [--fix] [--lang=ko,en]
 * 종료코드: 0=통과, 1=실패 (CI용)
 */

const fs = require('fs');
const path = require('path');

// ── 인자 파싱 ──
const args = process.argv.slice(2);
const fixMode = args.includes('--fix');
const langFilter = args.find(a => a.startsWith('--lang='))?.split('=')[1]?.split(',');

// ── SSOT 로드 ──
const snapshotPath = path.join(__dirname, 'keys.snapshot.json');
if (!fs.existsSync(snapshotPath)) {
  console.error('❌ keys.snapshot.json not found. Run key extraction first.');
  process.exit(1);
}
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
const EXPECTED_KEYS = new Set(snapshot.keys);
const SCHEMA = snapshot.schema;
const TOTAL = snapshot._meta.count;

console.log(`\n🔑 SSOT: ${TOTAL} keys (source: ${snapshot._meta.source})\n`);

// ── 로케일 파일 탐색 ──
const localeDir = __dirname;
const files = fs.readdirSync(localeDir)
  .filter(f => f.endsWith('.js') && !['index.js','generate.cjs','validate-i18n.cjs'].includes(f))
  .filter(f => !langFilter || langFilter.includes(f.replace('.js','')))
  .sort();

let totalErrors = 0;
let totalWarnings = 0;
const results = [];

for (const file of files) {
  const lang = file.replace('.js','');
  const errors = [];
  const warnings = [];

  // 로드 시도
  let locale;
  try {
    delete require.cache[require.resolve(path.join(localeDir, file))];
    locale = require(path.join(localeDir, file));
    if (locale.default) locale = locale.default;
  } catch (e) {
    errors.push(`PARSE_FAIL: ${e.message}`);
    results.push({ lang, errors, warnings, keys: 0 });
    totalErrors += errors.length;
    continue;
  }

  const localeKeys = new Set(Object.keys(locale));

  // 1. 누락 키
  const missing = [...EXPECTED_KEYS].filter(k => !localeKeys.has(k));
  if (missing.length > 0) {
    errors.push(`MISSING(${missing.length}): ${missing.slice(0,5).join(', ')}${missing.length > 5 ? '...' : ''}`);
  }

  // 2. 여분 키
  const extra = [...localeKeys].filter(k => !EXPECTED_KEYS.has(k));
  if (extra.length > 0) {
    warnings.push(`EXTRA(${extra.length}): ${extra.slice(0,5).join(', ')}${extra.length > 5 ? '...' : ''}`);
  }

  // 3. 빈값/비문자
  const empty = [];
  for (const k of EXPECTED_KEYS) {
    if (!localeKeys.has(k)) continue;
    const v = locale[k];
    if (v === '' || v === null || v === undefined) empty.push(k);
  }
  if (empty.length > 0) {
    warnings.push(`EMPTY(${empty.length}): ${empty.slice(0,5).join(', ')}${empty.length > 5 ? '...' : ''}`);
  }

  // 4. placeholder 불일치
  const phMismatch = [];
  for (const k of EXPECTED_KEYS) {
    if (!localeKeys.has(k) || !SCHEMA[k]) continue;
    const spec = SCHEMA[k];
    if (spec.type === 'string' && spec.placeholders.length > 0) {
      const v = locale[k];
      if (typeof v !== 'string') continue;
      const found = (v.match(/\{[^}]+\}/g) || []);
      const expectedPH = spec.placeholders.sort().join(',');
      const foundPH = found.sort().join(',');
      if (expectedPH !== foundPH) {
        phMismatch.push(`${k}: expected ${expectedPH} got ${foundPH || '(none)'}`);
      }
    }
  }
  if (phMismatch.length > 0) {
    warnings.push(`PH_MISMATCH(${phMismatch.length}): ${phMismatch.slice(0,3).join('; ')}${phMismatch.length > 3 ? '...' : ''}`);
  }

  // 5. 배열 길이 불일치
  const arrMismatch = [];
  for (const k of EXPECTED_KEYS) {
    if (!localeKeys.has(k) || !SCHEMA[k]) continue;
    const spec = SCHEMA[k];
    if (spec.type === 'array') {
      const v = locale[k];
      if (!Array.isArray(v)) {
        arrMismatch.push(`${k}: expected array, got ${typeof v}`);
      } else if (v.length !== spec.length) {
        arrMismatch.push(`${k}: expected ${spec.length} items, got ${v.length}`);
      }
    }
  }
  if (arrMismatch.length > 0) {
    errors.push(`ARRAY_MISMATCH(${arrMismatch.length}): ${arrMismatch.join('; ')}`);
  }

  // 결과 집계
  const coverage = Math.round((localeKeys.size - extra.length) / TOTAL * 100);
  results.push({ lang, errors, warnings, keys: localeKeys.size, missing: missing.length, coverage });
  totalErrors += errors.length;
  totalWarnings += warnings.length;
}

// ── 결과 출력 ──
console.log('─'.repeat(60));
console.log(`${'Lang'.padEnd(6)} ${'Keys'.padStart(5)} ${'Miss'.padStart(5)} ${'Cov%'.padStart(5)}  Status`);
console.log('─'.repeat(60));

for (const r of results) {
  const status = r.errors.length > 0 ? '❌ FAIL' : r.warnings.length > 0 ? '⚠️  WARN' : '✅ PASS';
  console.log(`${r.lang.padEnd(6)} ${String(r.keys||0).padStart(5)} ${String(r.missing||0).padStart(5)} ${String(r.coverage||0).padStart(4)}%  ${status}`);
  for (const e of r.errors) console.log(`       ❌ ${e}`);
  for (const w of r.warnings) console.log(`       ⚠️  ${w}`);
}

console.log('─'.repeat(60));
console.log(`\n📊 ${results.length} locales checked | ❌ ${totalErrors} errors | ⚠️  ${totalWarnings} warnings`);

if (totalErrors > 0) {
  console.log('\n🚫 VALIDATION FAILED — fix errors before deploy\n');
  process.exit(1);
} else if (totalWarnings > 0) {
  console.log('\n⚠️  PASSED with warnings\n');
  process.exit(0);
} else {
  console.log('\n✅ ALL PASSED\n');
  process.exit(0);
}
