#!/usr/bin/env node
/**
 * DIAH-7M Locale Generator v2
 * ═══════════════════════════════════════════
 * 전략: EN 전체 329키를 베이스로 복사 → 기존 번역 오버라이드
 * 결과: 모든 언어 파일이 329키 완전 보장
 * 누락 = 0, 빌드 실패 = 불가능
 */
const fs = require('fs');
const path = require('path');

const en = require('./en.js').default || require('./en.js');
const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, 'keys.snapshot.json'), 'utf-8'));
const EXPECTED = snapshot.keys;

// ── 기존 index.js에서 인라인 정의된 번역 추출 ──
// 이 데이터는 index.js의 const es={...} 등에서 가져온 것
const EXISTING = {};

// index.js를 읽어서 각 언어의 기존 번역을 파싱
try {
  const indexSrc = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf-8');
  // const xx={...}; 패턴 추출
  const langPattern = /const\s+(\w+)\s*=\s*(\{[^;]+\});/g;
  let match;
  while ((match = langPattern.exec(indexSrc)) !== null) {
    const code = match[1];
    if (['ko','en','ja','zh','LOCALES'].includes(code)) continue;
    try {
      // 간접 eval로 객체 파싱 (보안: 로컬 빌드 스크립트)
      const obj = new Function(`return ${match[2]}`)();
      EXISTING[code] = obj;
    } catch (e) {
      console.warn(`⚠️ Parse failed for ${code}: ${e.message}`);
    }
  }
} catch (e) {
  console.warn('⚠️ Could not read index.js:', e.message);
}

console.log(`📦 EN base: ${EXPECTED.length} keys`);
console.log(`📦 Existing translations found: ${Object.keys(EXISTING).join(', ')}`);

// ── 언어별 전체 번역 (이전 generate.cjs에서 es/fr/de/pt 가져옴) ──
// 이미 별도 파일로 존재하는 완전 번역은 건드리지 않음
const SKIP = ['ko','en','ja','zh']; // 이미 완전
const existingFiles = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.js') && !['index.js','generate.cjs','generate-v2.cjs','validate-i18n.cjs'].includes(f))
  .map(f => f.replace('.js',''));

function escapeStr(s) {
  return s.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n');
}

function generateLocale(code, overrides = {}) {
  const lines = [`// DIAH-7M ${code.toUpperCase()} locale — 329 keys (EN base + ${code} overrides)`, 'export default {'];
  
  let translated = 0;
  let fallback = 0;
  
  for (const k of EXPECTED) {
    const v = overrides[k] !== undefined ? overrides[k] : en[k];
    const isTranslated = overrides[k] !== undefined;
    
    if (Array.isArray(v)) {
      lines.push(`  ${k}:${JSON.stringify(v)},`);
    } else if (typeof v === 'string') {
      lines.push(`  ${k}:'${escapeStr(v)}',`);
    } else {
      lines.push(`  ${k}:${JSON.stringify(v)},`);
    }
    
    if (isTranslated) translated++;
    else fallback++;
  }
  
  lines.push('};');
  return { content: lines.join('\n'), translated, fallback };
}

// ── 생성 ──
let generated = 0;
const report = [];

for (const [code, data] of Object.entries(EXISTING)) {
  if (SKIP.includes(code)) continue;
  if (existingFiles.includes(code)) {
    // 이미 별도 파일 존재 — 329키 완전한지 확인
    try {
      delete require.cache[require.resolve(path.join(__dirname, `${code}.js`))];
      const existing = require(path.join(__dirname, `${code}.js`));
      const obj = existing.default || existing;
      if (Object.keys(obj).length === EXPECTED.length) {
        report.push({ code, status: 'SKIP', translated: Object.keys(obj).length, reason: 'already complete' });
        continue;
      }
    } catch (e) { /* regenerate */ }
  }
  
  const { content, translated, fallback } = generateLocale(code, data);
  fs.writeFileSync(path.join(__dirname, `${code}.js`), content);
  report.push({ code, status: 'GENERATED', translated, fallback });
  generated++;
}

// ── 보고 ──
console.log('\n' + '─'.repeat(50));
console.log(`${'Lang'.padEnd(6)} ${'Status'.padEnd(12)} ${'Translated'.padStart(10)} ${'EN fallback'.padStart(11)}`);
console.log('─'.repeat(50));
for (const r of report.sort((a,b) => a.code.localeCompare(b.code))) {
  console.log(`${r.code.padEnd(6)} ${r.status.padEnd(12)} ${String(r.translated).padStart(10)} ${String(r.fallback||'').padStart(11)}`);
}
console.log('─'.repeat(50));
console.log(`\n✅ Generated: ${generated} files | Skipped: ${report.filter(r=>r.status==='SKIP').length}`);
