// ══════════════════════════════════════════════════════════════
// DIAH-7M 경제건강검진 보고서생성기 v4.0
// 이중봉쇄론(CAM·DLT) 기반 자동 진단 보고서 생성
//
// v3.1 → v4.0 변경:
//   1. SSOT 판정엔진 통합 (60개 게이지 등급·서사 자동 산출)
//   2. Trust Guard D-0~D-13 (판정 신뢰도 투명화)
//   3. M-Flow 골목시장 실질흐름 판정
//   4. 이중봉쇄 자동판정 (CAM + DLT)
//   5. 데이터 외부화 (data.json → ssot_engine → renderer)
//   6. 버그 수정: L1 단위, O4 fallback, M1 임계값, I4 undefined
//
// 파일 구조:
//   DIAH-7M_보고서생성기_v4.0.js  ← 이 파일 (진입점)
//   ssot_engine.js                ← SSOT 판정엔진
//   renderer.js                   ← docx 렌더러
//   template.json                 ← 보고서 구조 템플릿
//   data.json                     ← 원천 데이터
//
// 실행:
//   node DIAH-7M_보고서생성기_v4.0.js
//   → data.json 읽기
//   → ssot_engine 판정 (등급·서사·Trust Guard·이중봉쇄)
//   → renderer.js + template.json으로 docx 생성
//   → DIAH-7M_monthly_YYYY-MM-DD.docx 출력
//
// 양식 출처: DIAH-7M_경제건강검진_2026년1월.docx (종원님 확정본)
// 이론 출처: 인체국가경제론 / 이중봉쇄론 / 윤종원
// ══════════════════════════════════════════════════════════════

const fs = require("fs");
const path = require("path");

// ━━━ 경로 설정 ━━━
const BASE_DIR = __dirname;
const DATA_PATH = path.join(BASE_DIR, "data.json");
const TEMPLATE_PATH = path.join(BASE_DIR, "template.json");
const ENGINE_PATH = path.join(BASE_DIR, "ssot_engine.js");
const RENDERER_PATH = path.join(BASE_DIR, "renderer.js");

// 출력 경로: 로컬 실행 시 같은 폴더, Claude 환경이면 outputs
const OUTPUT_DIR = fs.existsSync("/mnt/user-data/outputs")
  ? "/mnt/user-data/outputs"
  : BASE_DIR;

// ━━━ 파일 존재 확인 ━━━
const required = [DATA_PATH, TEMPLATE_PATH, ENGINE_PATH, RENDERER_PATH];
for (const f of required) {
  if (!fs.existsSync(f)) {
    console.error(`❌ 필수 파일 없음: ${f}`);
    console.error("   필요 파일: data.json, template.json, ssot_engine.js, renderer.js");
    process.exit(1);
  }
}

// ━━━ 모듈 로드 ━━━
const { transform } = require(ENGINE_PATH);
const { render } = require(RENDERER_PATH);

async function generate() {
  const startTime = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  console.log("══════════════════════════════════════════════");
  console.log("  DIAH-7M 경제건강검진 보고서생성기 v4.0");
  console.log("  이중봉쇄론(CAM·DLT) 기반 자동 진단");
  console.log("══════════════════════════════════════════════");
  console.log();

  // ── 1단계: 데이터 로드 ──
  console.log("① 데이터 로드...");
  const rawData = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  console.log(`   원천: ${DATA_PATH}`);
  console.log();

  // ── 2단계: SSOT 판정엔진 실행 ──
  console.log("② SSOT 판정엔진 실행...");
  console.log("   ├─ GRADE_RULES: 60개 게이지 임계값 자동 산출");
  console.log("   ├─ Trust Guard: D-0~D-13 판정 신뢰도 보강");
  console.log("   ├─ M-Flow: 골목시장 실질흐름 판정");
  console.log("   └─ 이중봉쇄: CAM + DLT 자동판정");
  
  const ssotData = transform(rawData);
  
  // 중간 산출물 저장
  const ssotPath = path.join(BASE_DIR, "data_ssot.json");
  fs.writeFileSync(ssotPath, JSON.stringify(ssotData, null, 2));
  console.log(`   산출물 저장: ${ssotPath}`);
  console.log();

  // ── 3단계: 판정 결과 요약 ──
  console.log("③ 판정 결과:");
  console.log(`   경보 단계: ${ssotData.alertLevel}`);
  
  // 등급 집계
  const arrays = [
    "sec2_gauges", "sec3_gauges", "axis2_gauges", "axis3_gauges",
    "axis4_gauges", "axis5_gauges", "axis6_gauges", "axis7_gauges",
    "axis8_gauges", "axis9_gauges"
  ];
  let ok = 0, warn = 0, alert = 0;
  for (const key of arrays) {
    if (!ssotData[key]) continue;
    for (const g of ssotData[key]) {
      const gr = g.grade || "";
      if (gr.includes("양호")) ok++;
      else if (gr.includes("주의")) warn++;
      else if (gr.includes("경보")) alert++;
    }
  }
  console.log(`   게이지: ${ok}양호 / ${warn}주의 / ${alert}경보 (총 ${ok + warn + alert}개)`);
  
  // M-Flow
  if (ssotData.mFlowAnalysis) {
    const mf = ssotData.mFlowAnalysis;
    console.log(`   M-Flow: ${mf.flowGrade} — ${mf.mIn?.status || "?"} / ${mf.mOut?.status || "?"}`);
  }
  console.log();

  // ── 4단계: docx 렌더링 ──
  console.log("④ docx 렌더링...");
  const template = JSON.parse(fs.readFileSync(TEMPLATE_PATH, "utf-8"));
  const outputPath = path.join(OUTPUT_DIR, `DIAH-7M_monthly_${today}.docx`);
  
  const result = await render({ data: ssotData, template, outputPath });
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log();
  console.log("══════════════════════════════════════════════");
  console.log(`  ✅ 보고서 생성 완료`);
  console.log(`  파일: ${outputPath}`);
  console.log(`  크기: ${(result.size / 1024).toFixed(1)}KB`);
  console.log(`  소요: ${elapsed}초`);
  console.log(`  엔진: DIAH-7M 판정엔진 v5.0 + SSOT Engine v1.0`);
  console.log("══════════════════════════════════════════════");
}

// ━━━ 실행 ━━━
generate().catch(err => {
  console.error("❌ 생성 실패:", err.message);
  console.error(err.stack);
  process.exit(1);
});
