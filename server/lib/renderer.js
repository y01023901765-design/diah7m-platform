/**
 * DIAH-7M Report Renderer v3.0
 *
 * - renderDOCX : docx-js 기반 Word 보고서 (v3.0 양식 전면 적용)
 * - renderPDF  : PDFKit 기반 PDF (기존 유지 — 구독자 PDF 엔드포인트)
 * - renderJSON : JSON (기존 유지)
 * - renderHTML : HTML (기존 유지)
 *
 * v3.0 설계 원칙
 *  1. 3색만 쓴다 (Navy + White + Silver). 경보도 네이비 농도.
 *  2. 이모지/아이콘 금지. 텍스트만.
 *  3. 위성데이터가 차별점. 상단 종합 섹션 + 각 게이지 상세.
 *  4. 서사엔진 v2.8 이 산문을 채운다. 양식은 슬롯만 제공.
 *  5. 페이지 경계: sectionHeader는 Paragraph, diagBox는 border 없는 테이블.
 *  6. 간격은 요소 자체 spacing으로. 빈 줄(empty) 금지, 강제 pb() 금지.
 *
 * © 인체국가경제론 / 윤종원 | 개발총괄: Claude
 */

'use strict';

// ── docx-js ──────────────────────────────────────────────
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageBreak,
} = require('docx');

// ── PDFKit (기존 renderPDF 유지) ──────────────────────────
const PDFDocument = require('pdfkit');

// ── 서사엔진 안전 로드 ─────────────────────────────────────
let narrativeEngine = null;
try {
  narrativeEngine = require('./narrative-engine');
} catch (e) {
  console.warn('[renderer] narrative-engine 로드 실패:', e.message);
}

// ── 게이지 어댑터 안전 로드 ──────────────────────────────────
let gaugeAdapter = null;
try {
  gaugeAdapter = require('./gauge-adapter');
} catch (e) {
  console.warn('[renderer] gauge-adapter 로드 실패:', e.message);
}

// ── diagnosis → narrative-engine result.gauges 딕셔너리 변환 ──
// gauge-adapter.ID_MAP 역방향: 파이프라인ID → ssot코드 매핑
// narrative-engine이 기대하는 { I1:{value,grade,change}, ... } 형태로 변환
//
// ★ 핵심: narrative-engine fmtValue(code)가 `${v}단위` 템플릿을 쓰므로
//   value는 적절한 소수점으로 반올림된 숫자여야 함.
//   각 ssot코드별 기대 소수점:
//   - 억$ 계열 (I1,I3): toFixed(2)
//   - % 계열 (I2,I4,I6,O1~O3,O5,O6,S2,S3,T3,L1~L5,G2,G5,G6,F2,F3,F4,E2,E5,A2,A3,A4,A5): toFixed(2)
//   - bp 계열 (I5,F1,F5): toFixed(2)
//   - pt 계열 (T2,L5,E5,F4): toFixed(1)
//   - 만TEU,만명,조원,만원 등 큰 숫자: toFixed(2)
//   - 일 (S1): toFixed(1)
function _buildNarrativeGauges(diagnosis) {
  if (!gaugeAdapter || !gaugeAdapter.ID_MAP) return {};
  const ID_MAP = gaugeAdapter.ID_MAP;

  // severity(0~5) → narrative-engine grade 문자열
  function sevToGrade(sev) {
    if (sev == null) return '양호 ○';
    if (sev >= 4.0) return '경보 ★';
    if (sev >= 2.5) return '주의 ●';
    return '양호 ○';
  }

  // ssot코드별 소수점 자릿수 (narrative-engine fmtValue 기대치 맞춤)
  const DECIMAL_MAP = {
    I1:2, I2:2, I3:2, I4:2, I5:2, I6:2,
    O1:2, O2:1, O3:2, O4:1, O5:2, O6:2, O7:2,
    S1:1, S2:2, S3:2,
    T1:2, T2:1, T3:2,
    M1:2, M2:2, M3:2, M4:2, M5:1,
    R1:1, R2:1, R3:2, R4:1, R5:2, R6:2, R7:2, R8:2, R9:1,
    L1:1, L2:2, L3:2, L4:2, L5:1,
    G1:1, G2:2, G3:2, G4:2, G5:2, G6:2, G7:1,
    F1:3, F2:2, F3:2, F4:2, F5:1,
    E1:2, E2:2, E3:2, E4:2, E5:2,
    A1:3, A2:2, A3:2, A4:2, A5:2,
  };

  // diagnosis.axes에서 게이지 평탄화: { pipelineId: {raw, severity} }
  const flatGauges = {};
  if (diagnosis && diagnosis.axes) {
    for (const ax of Object.values(diagnosis.axes)) {
      const gauges = ax.gauges || [];
      for (const g of gauges) {
        const pid = g.gaugeId || g.code || g.id;
        if (pid) flatGauges[pid] = { raw: g.raw, severity: g.severity };
      }
    }
  }

  // 파이프라인ID → ssot코드로 변환하여 게이지 딕셔너리 생성
  const result = {};
  for (const [pid, mapping] of Object.entries(ID_MAP)) {
    const gData = flatGauges[pid];
    if (!gData) continue;
    const code = mapping.code;
    if (result[code]) continue;  // 중복 ssot코드 방지

    const rawVal = gData.raw;
    const numVal = (rawVal != null && !isNaN(Number(rawVal))) ? Number(rawVal) : null;

    // 소수점 반올림 (narrative-engine fmtValue 기대치 맞춤)
    const dec = DECIMAL_MAP[code] ?? 2;
    const roundedVal = (numVal !== null) ? parseFloat(numVal.toFixed(dec)) : null;

    result[code] = {
      available: roundedVal !== null,
      value: roundedVal,
      change: null,  // 변화량 없음 — fmtChange가 빈 문자열 반환
      grade: sevToGrade(gData.severity),
      name: mapping.name || pid,
    };
  }
  return result;
}

// ══════════════════════════════════════════════════════════
// DESIGN TOKENS
// ══════════════════════════════════════════════════════════

const C = {
  // 3색 팔레트: Navy + White + Silver
  navy:    '1B2A4A',   // 제목, 강조, 표 헤더
  blue:    '2C4A7C',   // 섹션 구분, 서브헤더, 좌측바
  accent:  '4A6A9A',   // 장기비유 텍스트, 보조 강조

  // 경보 4단계: 네이비 농도
  lv0:     '4A6A9A',   // 0단계 정상
  lv1:     '2C4A7C',   // 1단계 주의
  lv2:     '1B2A4A',   // 2단계 경계
  lv3:     '0D1B2E',   // 3단계 위험

  // 배경: 화이트~실버
  bgLight: 'F7F8FA',   // 표 교대행
  bgBox:   'EFF2F7',   // 진단 박스
  bgWarn:  'E4E8EF',   // 경고 박스
  bgCrit:  'D8DDE6',   // 위험 박스

  // 텍스트
  dark:    '1A1F2E',   // 본문
  mid:     '5A6070',   // 보조/설명
  light:   '8A90A0',   // 메타 정보
  white:   'FFFFFF',   // 반전 텍스트
  line:    'D0D4DC',   // 테두리, 구분선
};

const FONT = '맑은 고딕';
const S = { t1: 36, t2: 28, t3: 24, body: 22, sm: 18, xs: 16 };
const PG = { w: 11906, h: 16838, mT: 1440, mB: 1440, mL: 1440, mR: 1440, cw: 9026 };

// ── border 단축 ───────────────────────────────────────────
const bThin = { style: BorderStyle.SINGLE, size: 1,  color: C.line };
const bNone = { style: BorderStyle.NONE,   size: 0,  color: C.white };
const b4    = { top: bThin, bottom: bThin, left: bThin, right: bThin };
const bNone4= { top: bNone, bottom: bNone, left: bNone, right: bNone };
const pad   = { top: 60, bottom: 60, left: 100, right: 100 };

// ── 경보 레이블 ───────────────────────────────────────────
const ALERT_COLORS  = [C.lv0, C.lv1, C.lv2, C.lv3, C.lv3, C.lv3]; // 0~5단계 (lv4/lv5 미정의 → lv3 폴백)
const ALERT_LABELS  = ['0단계: 정상', '1단계: 안정', '2단계: 주의', '3단계: 경계', '4단계: 심각', '5단계: 위기'];
const STATUS_MARK   = { normal: '○ 정상', caution: '● 주의', alert: '★ 경보' };
const STATUS_COLOR  = { normal: C.lv0,   caution: C.lv1,    alert: C.lv2 };

// ══════════════════════════════════════════════════════════
// PRIMITIVE HELPERS
// ══════════════════════════════════════════════════════════

function t(str, o = {}) {
  return new TextRun({
    text:    String(str ?? ''),
    font:    o.font  || FONT,
    size:    o.size  || S.body,
    bold:    o.bold  || false,
    italics: o.it    || false,
    color:   o.color || C.dark,
  });
}

function p(children, o = {}) {
  if (!Array.isArray(children)) children = [children];
  return new Paragraph({
    children,
    alignment: o.align || AlignmentType.LEFT,
    spacing: {
      before: o.before || 0,
      after:  o.after  !== undefined ? o.after : 120,
      line:   o.line   || 276,
    },
    indent: o.indent ? { left: o.indent } : undefined,
    ...(o.border        ? { border: o.border }               : {}),
    ...(o.pageBreakBefore ? { pageBreakBefore: true }         : {}),
    ...(o.shading       ? { shading: o.shading }             : {}),
  });
}

function pb() {
  return new Paragraph({ children: [new PageBreak()] });
}

function cl(content, o = {}) {
  const ch = typeof content === 'string'
    ? [p([t(content, { size: o.fs || S.body, bold: o.bold, color: o.fc || C.dark })],
        { align: o.align || AlignmentType.LEFT, after: 20, before: 0 })]
    : Array.isArray(content) ? content : [content];
  return new TableCell({
    children: ch,
    width:          { size: o.w || 1000, type: WidthType.DXA },
    shading:        o.bg ? { fill: o.bg, type: ShadingType.CLEAR } : undefined,
    borders:        o.borders || b4,
    margins:        o.margins || pad,
    verticalAlign:  o.vAlign  || VerticalAlign.CENTER,
    columnSpan:     o.colSpan,
    rowSpan:        o.rowSpan,
  });
}

function rw(cells) {
  return new TableRow({ children: cells });
}

function tbl(rows, cw) {
  return new Table({
    width: { size: cw.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: cw,
    rows,
  });
}

function hcl(txt, w, o = {}) {
  return cl(txt, {
    w, bg: C.navy, bold: true, fc: C.white, fs: S.xs,
    align: o.align || AlignmentType.CENTER, ...o,
  });
}

function altBg(i) { return i % 2 === 0 ? C.white : C.bgLight; }

// ── diagBox: border 없는 1행1열 테이블 + 셀 shading ─────
function diagBox(contentArray, bg = C.bgBox) {
  if (!Array.isArray(contentArray)) contentArray = [contentArray];
  return tbl([rw([
    cl(contentArray, {
      w: PG.cw, bg,
      margins: { top: 120, bottom: 120, left: 300, right: 200 },
      borders: bNone4,
    }),
  ])], [PG.cw]);
}

// ── sectionHeader: Paragraph (좌측 border 없음) ───────────
function sectionHeader(num, title, subtitle) {
  const els = [
    p(
      [t(`${num}`, { size: S.t2, bold: true, color: C.blue }),
       t(`  ${title}`, { size: S.t2, bold: true, color: C.navy })],
      { before: 480, after: subtitle ? 20 : 120, indent: 200 }
    ),
  ];
  if (subtitle) {
    els.push(
      p([t(subtitle, { size: S.body, it: true, color: C.mid })],
        { after: 120, indent: 200 })
    );
  }
  return els;
}

function subHeader(txt) {
  return p([t(txt, { size: S.t3, bold: true, color: C.blue })], { before: 300, after: 120 });
}

function gaugeTitle(code, name, value, metaphor) {
  return p([
    t(`${code} ${name}: ${value}`, { size: S.t3, bold: true, color: C.navy }),
    t(` — "${metaphor}"`, { size: S.t3, color: C.mid }),
  ], { before: 280, after: 80 });
}

function diagLine(txt) {
  return p([t(`→ 진단: ${txt}`, { size: S.body, bold: true, color: C.navy })],
           { before: 100, after: 200 });
}

// ══════════════════════════════════════════════════════════
// SECTION BUILDERS
// ══════════════════════════════════════════════════════════

// ── 표지 ─────────────────────────────────────────────────
function buildCover(d) {
  const ac = ALERT_COLORS[d.alertLevel] || C.lv0;
  const al = ALERT_LABELS[d.alertLevel] || '0단계: 정상';

  return [
    p([t('')], { after: 0, line: 240 }),
    p([t('')], { after: 0, line: 240 }),
    p([t('')], { after: 0, line: 240 }),
    p([t('')], { after: 0, line: 240 }),
    p([t('')], { after: 0, line: 240 }),
    p([t('')], { after: 0, line: 240 }),

    p([t('DIAH-7M', { size: 60, bold: true, color: C.navy })],
      { align: AlignmentType.CENTER, after: 200 }),
    p([t('국가경제 정밀진단 보고서', { size: 34, bold: true, color: C.navy })],
      { align: AlignmentType.CENTER, after: 160 }),
    p([t('— 막히면 죽는다: 인체국가경제론에 의한 순환경로 진단 —', { size: S.sm, it: true, color: C.mid })],
      { align: AlignmentType.CENTER, after: 360 }),

    p([t(`${d.country || '대한민국'} 경제`, { size: S.t2, color: C.mid })],
      { align: AlignmentType.CENTER, after: 60 }),
    p([t(d.baseMonth || '2026년 2월', { size: 32, bold: true, color: C.navy })],
      { align: AlignmentType.CENTER, after: 400 }),

    p([t('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', { size: S.body, color: C.line })],
      { align: AlignmentType.CENTER, after: 240 }),

    // 경보 박스
    tbl([rw([
      cl([
        p([t(al, { size: 30, bold: true, color: C.white })],
          { align: AlignmentType.CENTER, after: 40 }),
        p([t(d.alertSubtitle || '전체 게이지 종합판정', { size: S.sm, color: C.white })],
          { align: AlignmentType.CENTER, after: 0 }),
      ], { w: PG.cw, bg: ac, borders: bNone4, margins: { top: 160, bottom: 160, left: 100, right: 100 } }),
    ])], [PG.cw]),

    p([
      t(`CAM (자본대사): ${d.camStatus || '정상'}`, { size: S.body, bold: true }),
      t(`  |  DLT (말단순환): ${d.dltStatus || '정상'}`, { size: S.body, bold: true }),
    ], { align: AlignmentType.CENTER, before: 160, after: 40 }),
    p([
      t(`이중봉쇄: ${d.dualBlockade || '없음'}`, { size: S.body }),
      t(`  |  DIAH: ${d.diahTrigger || '전원 비활성'}`, { size: S.body }),
    ], { align: AlignmentType.CENTER, after: 240 }),

    p([t('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', { size: S.body, color: C.line })],
      { align: AlignmentType.CENTER, after: 280 }),

    p([t(`기준월: ${d.baseMonth || ''}  |  작성일: ${d.writeDate || ''}`, { size: S.body, color: C.mid })],
      { align: AlignmentType.CENTER, after: 40 }),
    p([t('진단 엔진: 판정 v5.1 / 서사 v2.9 / 위성 통합', { size: S.sm, color: C.light })],
      { align: AlignmentType.CENTER, after: 40 }),
    p([t('세계최초 위성 물리흐름 + 공공 수치지표 통합 진단 시스템', { size: S.sm, bold: true, color: C.accent })],
      { align: AlignmentType.CENTER, after: 40 }),
    p([t('인체국가경제론 / 윤종원', { size: S.sm, color: C.light })],
      { align: AlignmentType.CENTER }),

    pb(),
  ];
}

// ── 섹션 0: 작동 원리 ────────────────────────────────────
function buildSection0(d) {
  return [
    ...sectionHeader('0.', '이 보고서의 작동 원리', ''),
    diagBox([
      p([t('DIAH-7M은 경제를 인체처럼 보는 비유가 아니라, 흐름의 붕괴를 규칙(누적+복합)으로 판정하는 진단 시스템이다.',
          { size: S.body, bold: true, color: C.navy })], { after: 0 }),
    ], C.bgBox),

    p([t('경제는 인체와 같은 흐름 시스템이다. 외부에서 자본(혈액)이 유입되고, 금융→기업→가계로 흘러 소비로 빠져나간다. 이 흐름이 막히면 경제가 죽는다. DIAH-7M은 이 막힘을 탐지한다.',
        { size: S.body })], { after: 200 }),

    p([t('▶ 핵심 규칙: 단발이 아닌 누적과 복합이 확인될 때만 경보', { size: S.body, bold: true, color: C.navy })],
      { after: 80 }),
    p([t('한 달의 소비 둔화는 손끝이 잠깐 시린 것일 수 있다. 그러나 소비 둔화가 연속 확인되고, 동시에 환율까지 급등하면—이것은 경보다. DIAH-7M은 누적과 복합이라는 두 조건이 충족될 때만 경보를 올린다.',
        { size: S.body })], { after: 200 }),

    p([t('▶ 다축 게이지 체계: 전신 정밀 진단', { size: S.body, bold: true, color: C.navy })],
      { after: 80 }),
    p([t('v3.0은 9축 게이지 체계로 전신을 검사한다. 심장뿐 아니라 동맥(무역), 미세혈관(골목), 뼈(부동산), 근육(고용), 좌우균형(지역), 혈액(금융), 산소통(에너지), 신체나이(인구)까지.',
        { size: S.body })], { after: 100 }),

    tbl([
      rw([hcl('축', 500), hcl('타이틀', 1600), hcl('장기 비유', 1200), hcl('간단 설명', 5726)]),
      ...[
        ['A1', '순환계 — 심장/폐',   '심폐계',     '자본 유입부터 소비 도달까지의 전신 순환'],
        ['A2', '무역/제조업',         '동맥 혈류',  '핵심 수출 동맥의 유속과 강도'],
        ['A3', '골목시장',            '미세혈관',   '자영업·소상공인·전통시장 등 최말단 경제 활력'],
        ['A4', '부동산 X-ray',        '뼈',         '실거래가·미분양·위성실측으로 보는 골격 건전성'],
        ['A5', '고용/가계',           '근육+신경',  '고용·실업급여·가계부채·연체율로 측정하는 근력'],
        ['A6', '지역균형',            '좌우 대칭',  '수도권 vs 비수도권 격차, 지방소멸, 위성 실측'],
        ['A7', '금융스트레스',        '혈액의 질',  '회사채·CP·BIS·변동성으로 보는 자금 흐름의 질'],
        ['A8', '에너지/자원',         '산소 공급원','유가·전력예비율·LNG재고 등 에너지 공급 안정성'],
        ['A9', '인구/노화',           '신체 나이',  '출산율·고령화·생산인구 감소 등 비가역적 구조 노화'],
      ].map((r, i) => rw([
        cl(r[0], { w: 500, bold: true, fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
        cl(r[1], { w: 1600, bold: true, fs: S.sm, fc: C.navy, bg: altBg(i) }),
        cl(r[2], { w: 1200, fs: S.sm, fc: C.accent, bg: altBg(i) }),
        cl(r[3], { w: 5726, fs: S.sm, fc: C.mid, bg: altBg(i) }),
      ])),
    ], [500, 1600, 1200, 5726]),

    p([t('▶ 두 개의 길: CAM(동맥)과 DLT(정맥)', { size: S.body, bold: true, color: C.navy })],
      { after: 80 }),
    p([t('CAM(자본대사)은 심장으로 들어오는 동맥 혈류다. DLT(말단순환)는 손끝까지 도달하는 정맥 환류다.',
        { size: S.body })], { after: 100 }),
    diagBox([
      p([t('이중봉쇄: CAM과 DLT가 동시에 막히면 경제는 급사한다. 1997년과 2008년이 그랬다.',
          { size: S.body, bold: true, color: C.navy })], { after: 0 }),
    ], C.bgCrit),

    p([t('▶ 위성데이터 확진: 통계가 놓치는 것을 물리적으로 확인', { size: S.body, bold: true, color: C.navy })],
      { after: 80 }),
    p([t('v3.0은 위성데이터를 통해 통계 수치만으로 보이지 않는 것을 물리적으로 확진한다. 야간 불빛(VIIRS)은 세포의 생사를, 대기오염(GEMS NO₂)은 대사 활동량을, 지표면 온도(Landsat)는 체표 열을, 레이더(Sentinel SAR)는 건축 활동을 실측한다.',
        { size: S.body })], {}),

    p([t('▶ 0단계 정상은 건강이 아니다', { size: S.body, bold: true, color: C.navy })],
      { after: 80 }),
    diagBox([
      p([t(d.section0Incubation || '0단계 정상은 질병이 없다는 뜻이 아니다. 기초 체력이 병증을 억제하고 있다는 뜻이다. 불균형이 지속되면 억제력이 한계에 도달하는 순간 DIAH 스위치가 갑자기 점등될 수 있다.',
          { size: S.body })], { after: 0 }),
    ], C.bgWarn),
  ];
}

// ── 심층 임상 소견 ────────────────────────────────────────
function buildClinicalInsight(d) {
  return [
    ...sectionHeader('진단.', '심층 임상 소견', d.clinicalTitle || ''),
    diagBox([
      p([t(d.clinicalOneLiner || '(서사엔진이 생성하는 한 줄 종합 소견)',
          { size: S.t3, bold: true, color: C.navy })], { after: 0 }),
    ], C.bgBox),
    p([t(d.clinicalBody || '(서사엔진이 생성하는 심층 임상 소견 — 각 축의 상태를 인체 전체 관점에서 통합 해석)',
        { size: S.body })], { after: 200 }),

    p([t('▶ 병리적 연결고리', { size: S.body, bold: true, color: C.navy })], { after: 80 }),
    p([t(d.clinicalPathology || '(서사엔진 생성: 축 간 연결고리를 인체비유로 설명)',
        { size: S.body })], {}),
  ];
}

// ── 물리흐름 진단 — 위성데이터 종합 (v2.9 전면 강화) ────────
function buildSatelliteOverview(d) {
  const sat  = d.satellite || {};
  const SI   = (narrativeEngine && narrativeEngine.SATELLITE_INTRO) || {};
  const GN   = (narrativeEngine && narrativeEngine.GAUGE_NARRATIVE) || {};

  // ── 위성 게이지 실측값 추출 (진단 데이터에서) ──
  const _satVal = (code) => {
    const ax = d.axes || {};
    for (const axData of Object.values(ax)) {
      const gauges = axData.gauges || [];
      const found = gauges.find(g => g.code === code);
      if (found) return { value: found.value || '—', grade: found.grade || '—', status: found.status || '—' };
    }
    return { value: '—', grade: '—', status: '수집 중' };
  };
  const s2v  = _satVal('S2');
  const r5v  = _satVal('R5');
  const r6v  = _satVal('R6');
  const g6v  = _satVal('G6');

  // ── 위성 게이지 physicsFlow 텍스트 ──
  const _pf = (code) => GN[code]?.satellite?.physicsFlow || '';
  const _chain = (code) => GN[code]?.satellite?.physicsChain || '';

  const elements = [];

  // ════ 섹션 헤더 ════
  elements.push(...sectionHeader('위성.', '물리흐름 진단 — 위성데이터 종합',
    '세계최초 위성 물리흐름 + 공공 수치지표 통합 진단'));

  // ════ [1] 세계 최초 선언문 박스 ════
  elements.push(diagBox([
    p([t('[ 세계최초 선언 ]', { size: S.sm, bold: true, color: C.mid })], { after: 60 }),
    ...(SI.declaration || `DIAH-7M은 세계최초로 위성 물리흐름과 공공 수치지표로 통합 진단한다.\n정부 통계는 사람이 보고한다. 위성은 물리 신호를 조작 없이 포착한다.\n통계가 거짓말을 해도, 위성은 하지 못한다.`)
      .split('\n').filter(l => l.trim()).map(line =>
        p([t(line.trim(), { size: S.body, bold: line.includes('세계최초') || line.includes('위성은 하지'), color: line.includes('세계최초') ? C.navy : C.dark })], { after: 40 })
      ),
    p([t(SI.bodyAnalogy || '환자의 자기 보고(정부 통계)만 믿지 않는다. CT·MRI·혈액검사(위성 실측)로 몸 속을 직접 확인한다.',
        { size: S.body, it: true, color: C.accent })], { after: 0 }),
  ], C.bgBox));

  // ════ [2] 위성의 3대 강점 ════
  elements.push(subHeader('위성 진단의 3대 강점'));
  const strengths = SI.coreStrengths || [
    { title: '조작 불가능', body: '통계는 보고자가 수치를 바꿀 수 있다. 위성이 포착한 빛·열·레이더 신호는 바꿀 수 없다.' },
    { title: '통계 2~3개월 선행', body: '야간광이 감소하기 시작하면, 공식 통계 발표보다 2~3개월 앞서 경기 둔화를 포착한다.' },
    { title: '통계 vs 위성 교차검증', body: '정부 통계와 위성 실측이 다른 방향이면 — 통계에 잡히지 않은 변화가 이미 물리적으로 시작된 것이다.' },
  ];
  elements.push(tbl([
    rw([hcl('강점', 1200), hcl('설명', 7826)]),
    ...strengths.map((s, i) => rw([
      cl(s.title, { w: 1200, bold: true, fs: S.sm, fc: C.navy, bg: altBg(i) }),
      cl(s.body,  { w: 7826, fs: S.sm, bg: altBg(i) }),
    ])),
  ], [1200, 7826]));

  // ════ [3] 물리 흐름도 — 활동 → 신호 → 위성 → 경제 해석 ════
  elements.push(subHeader('물리 흐름도 — 경제활동이 위성 신호로 변환되는 원리'));
  elements.push(p([t('경제 활동은 물리 신호를 만든다. 위성은 이 신호를 포착한다. DIAH-7M은 이 신호를 경제 언어로 번역한다.',
    { size: S.body, color: C.mid })], { after: 100 }));

  const flowRows = SI.physicsFlowTable || [
    { activity: '공장·항만 가동',   signal: '야간 빛 (nW/cm²/sr)',     sensor: 'NASA VIIRS DNB',          interpretation: '가동률 (S2) — 통계 2~3개월 선행' },
    { activity: '사람 거주·생활',   signal: '빛 + 표면열 (°C)',         sensor: 'VIIRS + Landsat-9 TIR',   interpretation: '실입주율 (R6) — 유령단지 적발' },
    { activity: '건물 골조 성장',   signal: '레이더 후방산란 (mm)',     sensor: 'ESA Sentinel-1 SAR',      interpretation: '공정률 (R5) — 공사 은폐 적발' },
    { activity: '지역 경제 활동',   signal: '지역별 야간광 비율 (%)',   sensor: 'NASA VIIRS DNB (지역 비교)', interpretation: '지역 활력 격차 (G6) — 편마비 확증' },
  ];
  elements.push(tbl([
    rw([hcl('경제 활동', 1600), hcl('물리 신호 발생', 1800), hcl('위성·센서', 2000), hcl('경제 해석', 3626)]),
    ...flowRows.map((r, i) => rw([
      cl(r.activity,       { w: 1600, bold: true, fs: S.sm, fc: C.navy, bg: altBg(i) }),
      cl(r.signal,         { w: 1800, fs: S.sm, fc: C.accent, bg: altBg(i) }),
      cl(r.sensor,         { w: 2000, fs: S.sm, it: true, bg: altBg(i) }),
      cl(r.interpretation, { w: 3626, fs: S.sm, bg: altBg(i) }),
    ])),
  ], [1600, 1800, 2000, 3626]));

  // ════ [4] 위성 게이지별 물리원리 + 현재 판독값 ════
  elements.push(subHeader('위성 게이지 실측 현황'));
  const satGaugeRows = [
    { code: 'S2', label: '야간광량 (항만·공단 가동률)', data: s2v, pf: _pf('S2'), tag: '운영 중' },
    { code: 'R6', label: '신축야간광량 (실입주 검증)',   data: r6v, pf: _pf('R6'), tag: '운영 중' },
    { code: 'R5', label: 'SAR 공정률 (건설 은폐 탐지)', data: r5v, pf: _pf('R5'), tag: '순차 확대' },
    { code: 'G6', label: '지역야간광량 (편마비 확증)',   data: g6v, pf: _pf('G6'), tag: '운영 중' },
  ];
  elements.push(tbl([
    rw([hcl('코드', 500), hcl('게이지명', 1800), hcl('현재값', 900), hcl('등급', 700), hcl('상태', 700), hcl('물리 원리', 4426)]),
    ...satGaugeRows.map((r, i) => {
      const gc = r.data.grade === '경보 ★' ? C.lv3 : r.data.grade === '주의 ●' ? C.lv1 : C.lv0;
      return rw([
        cl(r.code,          { w: 500,  bold: true, fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
        cl(r.label,         { w: 1800, fs: S.sm, bg: altBg(i) }),
        cl(r.data.value,    { w: 900,  fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
        cl(r.data.grade,    { w: 700,  fs: S.sm, bold: true, fc: gc, align: AlignmentType.CENTER, bg: altBg(i) }),
        cl(r.tag,           { w: 700,  fs: S.sm, align: AlignmentType.CENTER, fc: C.mid, bg: altBg(i) }),
        cl(r.pf || '(물리원리 로딩 중)', { w: 4426, fs: S.sm, fc: C.mid, bg: altBg(i) }),
      ]);
    }),
  ], [500, 1800, 900, 700, 700, 4426]));

  // ════ [5] 통계 vs 위성 괴리 진단 ════
  elements.push(subHeader('물리 실측 vs 정부 통계 — 괴리 진단'));
  elements.push(p([t('위성 데이터의 가장 강력한 기능은 통계와의 괴리를 먼저 감지하는 것이다. 통계는 정상인데 위성은 이상을 보이면 — 아직 통계에 잡히지 않은 변화가 물리적으로 이미 시작된 것이다.',
      { size: S.body })], { after: 120 }));
  elements.push(tbl([
    rw([hcl('비교 항목', 1800), hcl('정부 통계', 2200), hcl('위성 실측', 2200), hcl('괴리 판정', 2826)]),
    ...[
      ['산업생산·공단 가동', sat.factoryStat || '통계청 산업생산지수', sat.factorySat || `S2 야간광: ${s2v.value}`, sat.factoryGap || (s2v.grade === '경보 ★' ? '괴리 경보 — 위성이 먼저 포착' : '일치 확인')],
      ['신축 입주율',        sat.moveInStat  || '건설사 입주율 보고',  sat.moveInSat  || `R6 야간광: ${r6v.value}`, sat.moveInGap  || (r6v.grade === '경보 ★' ? '유령단지 의심 — 위성 경보' : '이상 없음')],
      ['부동산 공정률',      sat.realEstateStat || '분양 공정률 보고', sat.realEstateSat || `R5 SAR: ${r5v.value}`, sat.realEstateGap || (r5v.grade === '경보 ★' ? '공정 허위 의심 — 레이더 불일치' : '이상 없음')],
      ['지역 경제 활력',     sat.regionStat  || 'GRDP 통계 (분기)',   sat.regionSat  || `G6 야간광: ${g6v.value}`, sat.regionGap  || (g6v.grade === '경보 ★' ? '편마비 진행 — 위성 확증' : '균형 유지')],
    ].map((r, i) => rw([
      cl(r[0], { w: 1800, bold: true, fs: S.sm, bg: altBg(i) }),
      cl(r[1], { w: 2200, fs: S.sm, fc: C.mid, bg: altBg(i) }),
      cl(r[2], { w: 2200, fs: S.sm, fc: C.accent, bg: altBg(i) }),
      cl(r[3], { w: 2826, fs: S.sm, bold: true, fc: C.navy, bg: altBg(i) }),
    ])),
  ], [1800, 2200, 2200, 2826]));

  // ════ [6] 위성 3중 교차검증 서사 ════
  const cv = SI.crossValidation || {};
  if (cv.scenarios && cv.scenarios.length > 0) {
    elements.push(subHeader(cv.title || '위성 3중 교차검증'));
    elements.push(p([t(cv.intro || '세 가지 위성이 같은 방향을 가리키면 — 이것은 오차가 아니라 실물이다.',
        { size: S.body, it: true, color: C.mid })], { after: 100 }));
    elements.push(tbl([
      rw([hcl('검증 시나리오', 1600), hcl('위성 신호 3종', 4200), hcl('종합 판정', 3226)]),
      ...cv.scenarios.map((sc, i) => rw([
        cl(sc.label,             { w: 1600, bold: true, fs: S.sm, fc: C.navy, bg: altBg(i) }),
        cl((sc.signals || []).join(' / '), { w: 4200, fs: S.sm, bg: altBg(i) }),
        cl(sc.verdict,           { w: 3226, fs: S.sm, bold: true, fc: C.accent, bg: altBg(i) }),
      ])),
    ], [1600, 4200, 3226]));
  }

  // ════ [7] 위성 종합 판독 ════
  elements.push(subHeader('위성 종합 판독'));
  elements.push(diagBox([
    p([t(sat.overallVerdict || '현재 운영 중인 위성 게이지(S2, R6, G6)와 정부 통계 간 유의미한 괴리는 감지되지 않았다.',
        { size: S.body, bold: true, color: C.navy })], { after: 40 }),
    p([t(sat.overallDetail || 'R5(SAR 공정률)는 순차 확대 예정. 위성 데이터가 추가될수록 진단 정밀도가 높아진다.',
        { size: S.sm, color: C.mid })], { after: 40 }),
    p([t(SI.disclaimer || '위성 데이터는 기상 조건·해상도 한계 등으로 오차를 포함할 수 있습니다. 복수 지표 교차검증으로 판정합니다.',
        { size: S.sm, it: true, color: C.light })], { after: 0 }),
  ], C.bgBox));

  return elements;
}

// ── 종합 판정 ─────────────────────────────────────────────
function buildOverallVital(d) {
  const axes9 = [
    { id: '축1', name: '순환계/심장폐', organ: '심폐계',   axKey: 'A1' },
    { id: '축2', name: '무역/호흡계',   organ: '동맥혈류', axKey: 'A2' },
    { id: '축3', name: '소화계/내수',   organ: '미세혈관', axKey: 'A3' },
    { id: '축4', name: '신경계/심리',   organ: '신경계',   axKey: 'A4' },
    { id: '축5', name: '면역계/금융',   organ: '혈액의질', axKey: 'A5' },
    { id: '축6', name: '내분비/물가',   organ: '호르몬',   axKey: 'A6' },
    { id: '축7', name: '근골격/산업',   organ: '근육뼈',   axKey: 'A7' },
    { id: '축8', name: '인구/취약계층', organ: '신체나이', axKey: 'A8' },
    { id: '축9', name: '재생/에너지',   organ: '산소공급', axKey: 'A9' },
  ];

  const LEVEL_COLORS_DOCX = { 1: C.lv0, 2: C.lv1, 3: C.lv2, 4: C.lv3, 5: C.lv3 };

  return [
    ...sectionHeader('1.', '종합 판정 (Overall Vital Sign)', '전체 게이지 채점 결과'),
    subHeader('9축 대시보드'),

    tbl([
      rw([hcl('축', 500), hcl('이름', 1400), hcl('장기비유', 900), hcl('게이지수', 600), hcl('점수', 700), hcl('단계', 700), hcl('한줄 소견', 3226)]),
      ...axes9.map((ax, i) => {
        const ad  = (d.axes || {})[ax.id] || {};
        const lvC = LEVEL_COLORS_DOCX[ad.level] || C.mid;
        const sc  = typeof ad.score === 'number' ? ad.score.toFixed(2) : '—';
        const lname = ad.levelName || '—';
        return rw([
          cl(ax.id,    { w: 500,  fs: S.sm, align: AlignmentType.CENTER, bold: true, bg: altBg(i) }),
          cl(ax.name,  { w: 1400, bold: true, fs: S.sm, bg: altBg(i) }),
          cl(ax.organ, { w: 900,  fs: S.sm, fc: C.accent, bg: altBg(i) }),
          cl(`${ad.gaugeCount || 0}개`, { w: 600, fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
          cl(sc,       { w: 700,  fs: S.sm, align: AlignmentType.CENTER, bold: true, fc: lvC, bg: altBg(i) }),
          cl(lname,    { w: 700,  fs: S.sm, align: AlignmentType.CENTER, bold: true, fc: lvC, bg: altBg(i) }),
          cl(ad.oneLiner || '—', { w: 3226, fs: S.sm, bg: altBg(i) }),
        ]);
      }),
    ], [500, 1400, 900, 600, 700, 700, 3226]),

    subHeader('경보 판정'),
    p([t(d.alertSummary || '', { size: S.body })], { after: 80 }),
    diagBox([
      p([t(`→ 경보 단계: ${d.alertLabel || '미판정'}`, { size: S.t3, bold: true, color: C.navy })],
        { after: 0 }),
    ], C.bgBox),

    subHeader('이중봉쇄 판정'),
    p([t(`• CAM (자본대사): ${d.camDetail || '정상'}`, { size: S.body, bold: true })], { after: 40 }),
    p([t(d.camExplain || '동맥 혈류(자본 유입)에 막힘 없음.', { size: S.body, color: C.mid })],
      { indent: 400, after: 80 }),
    p([t(`• DLT (말단순환): ${d.dltDetail || '정상'}`, { size: S.body, bold: true })], { after: 40 }),
    p([t(d.dltExplain || '정맥 환류(실물 전달) 원활.', { size: S.body, color: C.mid })],
      { indent: 400, after: 80 }),
    p([t(`→ 이중봉쇄: ${d.dualBlockadeDetail || '없음'}`, { size: S.body, bold: true, color: C.navy })],
      { after: 200 }),

    subHeader('위성데이터 확진 요약'),
    p([t('통계 수치만으로 보이지 않는 것을 위성이 확진합니다.', { size: S.body, it: true, color: C.mid })],
      { after: 100 }),

    tbl([
      rw([hcl('데이터소스', 1800), hcl('인체비유', 1400), hcl('측정 대상', 2200), hcl('현재 판독', 3626)]),
      ...[
        ['VIIRS 야간광',  '세포 활력/괴사',   '상가·공장 불빛 변동',      (d.satellite || {}).viirs || '(수집 중)'],
        ['GEMS NO₂',     '대사 활동량',      '산업·교통 활동 실측',       (d.satellite || {}).gems  || '(예정)'],
        ['Landsat LST',  '체표 온도',        '산업단지·도심 열 변동',     (d.satellite || {}).lst   || '(수집 중)'],
        ['Sentinel SAR', '건축 활동',        '신축·철거 물리적 변동',     (d.satellite || {}).sar   || '(예정)'],
      ].map((r, i) => rw([
        cl(r[0], { w: 1800, bold: true, fs: S.sm, bg: altBg(i) }),
        cl(r[1], { w: 1400, fs: S.sm, fc: C.accent, bg: altBg(i) }),
        cl(r[2], { w: 2200, fs: S.sm, bg: altBg(i) }),
        cl(r[3], { w: 3626, fs: S.sm, bg: altBg(i) }),
      ])),
    ], [1800, 1400, 2200, 3626]),
  ];
}

// ── 축별 정밀 진단 ────────────────────────────────────────
function buildAxisDetail(num, name, organ, question, gauges, axSummary) {
  const elements = [];
  elements.push(...sectionHeader(`${num}`, `[${organ}] ${name}`, question));

  // 게이지 채점 요약표
  elements.push(tbl([
    rw([hcl('코드', 550), hcl('지표명', 1800), hcl('원자료', 1300), hcl('변동', 1200),
        hcl('등급', 800), hcl('판정', 600), hcl('장기비유', 2776)]),
    ...gauges.map((g, i) => {
      const sc = STATUS_COLOR[g.status];
      const sl = STATUS_MARK[g.status];
      return rw([
        cl(g.code,           { w: 550,  bold: true, fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
        cl(g.name,           { w: 1800, fs: S.sm, bg: altBg(i) }),
        cl(g.value  || '—',  { w: 1300, fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
        cl(g.change || '—',  { w: 1200, fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
        cl(g.grade  || '—',  { w: 800,  fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
        cl(sl       || '—',  { w: 600,  fs: S.sm, align: AlignmentType.CENTER, bold: true, fc: sc, bg: altBg(i) }),
        cl(g.organMetaphor || '—', { w: 2776, fs: S.sm, fc: C.accent, bg: altBg(i) }),
      ]);
    }),
  ], [550, 1800, 1300, 1200, 800, 600, 2776]));

  // 게이지별 산문 서사
  const _GN = (narrativeEngine && narrativeEngine.GAUGE_NARRATIVE) || {};
  for (const g of gauges) {
    elements.push(gaugeTitle(g.code, g.name, g.value || '—', g.organMetaphor || '—'));

    // 위성 게이지인 경우 physicsFlow 물리원리 1줄 먼저 표시
    const _gnEntry = _GN[g.code];
    if (_gnEntry && _gnEntry.satelliteTag && _gnEntry.satellite && _gnEntry.satellite.physicsFlow) {
      elements.push(p([
        t('[위성 실측] ', { size: S.sm, bold: true, color: C.accent }),
        t(_gnEntry.satellite.physicsFlow, { size: S.sm, it: true, color: C.mid }),
      ], { after: 60, indent: 200 }));
    }

    if (g.narrative && g.narrative.length > 0) {
      for (const para of g.narrative) {
        elements.push(p([t(para, { size: S.body })], { after: 80 }));
      }
    } else {
      elements.push(p([t('(서사엔진 v2.8이 생성하는 게이지별 산문 해석)', { size: S.body, color: C.mid })],
                      { after: 80 }));
    }
    elements.push(diagLine(g.diagnosis || '(진단문)'));
  }

  // 축 종합 판정 박스
  const axColor = STATUS_COLOR[axSummary.status] || C.lv0;
  elements.push(
    diagBox([
      p([t(`▶ ${organ} 종합: ${axSummary.title || name}`, { size: S.t3, bold: true, color: C.navy })],
        { after: 60 }),
      p([t(axSummary.text || '(축 종합 소견)', { size: S.body })], { after: 0 }),
    ], C.bgBox)
  );

  return elements;
}

// ── 교차신호 분석 ─────────────────────────────────────────
function buildCrossSignal(d) {
  const pairs = d.crossSignals || [];
  return [
    ...sectionHeader('교차.', '교차신호 분석 (Cross-Signal)',
                     '단일 축에서 보이지 않는 전신 위기 징후를 축간 연동으로 포착'),
    p([t('인체비유: 심장(축1)이 약해지면 근육(축5)에 피가 안 가고, 혈액의 질(축7)이 나빠지면 모든 장기가 영향을 받는다.',
        { size: S.body, color: C.mid })], { after: 200 }),

    tbl([
      rw([hcl('교차 쌍', 1600), hcl('장기 연결', 1400), hcl('방향', 700),
          hcl('강도', 700), hcl('리드타임', 800), hcl('진단', 3826)]),
      ...pairs.map((pr, i) => {
        const sc = { high: C.lv2, medium: C.lv1, low: C.lv0 }[pr.severity] || C.mid;
        return rw([
          cl(pr.pair,      { w: 1600, bold: true, fs: S.sm, bg: altBg(i) }),
          cl(pr.organLink, { w: 1400, fs: S.sm, fc: C.accent, bg: altBg(i) }),
          cl(pr.direction, { w: 700,  fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
          cl(pr.severity || '—', { w: 700, fs: S.sm, align: AlignmentType.CENTER, bold: true, fc: sc, bg: altBg(i) }),
          cl(pr.leadMonths ? `${pr.leadMonths}개월` : '—', { w: 800, fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
          cl(pr.diagnosis, { w: 3826, fs: S.sm, bg: altBg(i) }),
        ]);
      }),
    ], [1600, 1400, 700, 700, 800, 3826]),

    subHeader('캐스케이드 경보 (연쇄 전이 경로)'),
    diagBox([
      p([t(d.cascadeAlert || '현재 감지된 연쇄 전이 경로 없음', { size: S.body, bold: true, color: C.navy })],
        { after: 40 }),
      p([t('캐스케이드: 한 축의 악화가 2개 이상 다른 축으로 전이되는 전신 감염 패턴',
          { size: S.sm, color: C.mid })], { after: 0 }),
    ], C.bgLight),
  ];
}

// ── DIAH 트리거 분석 ──────────────────────────────────────
function buildDIAHTrigger(d) {
  return [
    ...sectionHeader('DIAH.', 'DIAH 트리거 분석', '잠복기 경고'),
    p([t(d.diahIntro || '4대 스위치 모두 비활성이다. 그러나 이것은 질병이 없다는 뜻이 아니라, 기초 체력이 병증을 억제하고 있다는 뜻이다.',
        { size: S.body })], { after: 200 }),

    ...(d.diahTriggers || [
      { code: 'H', title: 'H(저산소/유동성함정)의 그림자 — 가장 위험한 잠복 요인', body: '(서사엔진 생성)', scenario: '(점등 시나리오)' },
      { code: 'A', title: 'A(산증/인플레압력)의 잠재적 축적', body: '(서사엔진 생성)', scenario: '' },
      { code: 'D', title: 'D(결핍/유동성부족)', body: '(서사엔진 생성)', scenario: '' },
      { code: 'I', title: 'I(염증/사회마찰)', body: '(서사엔진 생성)', scenario: '' },
    ]).flatMap(tr => [
      p([t(tr.title, { size: S.body, bold: true, color: C.navy })], { before: 200, after: 80 }),
      p([t(tr.body, { size: S.body })], { after: 80 }),
      ...(tr.scenario ? [p([t(tr.scenario, { size: S.body, bold: true, color: C.mid })], { after: 120 })] : []),
    ]),

    diagBox([
      p([t(d.diahConclusion || '→ DIAH 종합: 전원 비활성. 그러나 건강이 아니라 잠복기.',
          { size: S.body, bold: true, color: C.navy })], { after: 0 }),
    ], C.bgWarn),
  ];
}

// ── 7M 기전 분석 ──────────────────────────────────────────
function build7M(d) {
  const stages = [
    ['0M', '정상', '순환 정상',    '흐름 원활',               d.current7Mstage === 0 ? '◀ 현재' : '—'],
    ['1M', '폐열', '내강 폐쇄',    '급성 파산, 뱅크런',        '—'],
    ['2M', '둔화', '관절 기능 저하','경기 침체, 성장 둔화',     d.current7Mstage === 2 ? '진입 직전' : '—'],
    ['3M', '피폐', '수용체 차단',   '정책 무력화',             '—'],
    ['4M', '경화', '섬유화',        '제도 경직, 좀비기업',      '—'],
    ['5M', '범파', '세포 과증식',   '버블 팽창',               '—'],
    ['6M', '단절', '신경 폐쇄',     '공급망 붕괴',             '—'],
    ['7M', '붕괴', '뼈 구조 붕괴',  '국가 디폴트',             '—'],
  ];

  return [
    ...sectionHeader('7M.', '7M 기전 분석', '현재 위치와 진행 경로'),
    p([t('DIAH 스위치가 켜지면 경제는 7M 기전을 따라 붕괴한다. 0M(정상)에서 7M(붕괴)까지, 각 단계는 이전 단계의 결과이자 다음 단계의 원인이다.',
        { size: S.body })], { after: 200 }),

    subHeader('7M 진행도'),
    tbl([
      rw([hcl('단계', 700), hcl('명칭', 800), hcl('인체 증상', 2200), hcl('경제 현상', 2800), hcl('현재', 2526)]),
      ...stages.map((s, i) => {
        const isCurrent = s[4].includes('현재') || s[4].includes('직전');
        const bg = isCurrent ? C.bgBox : altBg(i);
        return rw([
          cl(s[0], { w: 700,  bold: true, fs: S.sm, align: AlignmentType.CENTER, bg, fc: isCurrent ? C.blue : C.dark }),
          cl(s[1], { w: 800,  bold: true, fs: S.sm, bg }),
          cl(s[2], { w: 2200, fs: S.sm, bg }),
          cl(s[3], { w: 2800, fs: S.sm, bg }),
          cl(s[4], { w: 2526, fs: S.sm, bold: isCurrent, fc: isCurrent ? C.blue : C.mid, bg }),
        ]);
      }),
    ], [700, 800, 2200, 2800, 2526]),

    p([t(d.mStageExplain || '(서사엔진 생성: 현재 위치 해석)', { size: S.body })], {}),
    p([t(d.mStageProgression || '(서사엔진 생성: 진입 조건 설명)', { size: S.body })], {}),
  ];
}

// ── 예후 3경로 ────────────────────────────────────────────
function buildPrognosis(d) {
  const paths = d.prognosisPaths || [
    { label: '경로 A: 개선', color: C.lv0, body: '(서사엔진 생성)' },
    { label: '경로 B: 유지', color: C.lv1, body: '(서사엔진 생성)' },
    { label: '경로 C: 악화', color: C.lv2, body: '(서사엔진 생성)' },
  ];

  return [
    ...sectionHeader('예후.', '예후 (Prognosis)', '향후 3개월 내 가능한 경로'),
    p([t(d.prognosisIntro || '향후 3개월 내 이 유기체가 갈 수 있는 경로는 3가지다.',
        { size: S.body })], { after: 200 }),

    ...paths.flatMap(path => [
      diagBox([
        p([t(path.label, { size: S.t3, bold: true, color: path.color })], { after: 60 }),
        p([t(path.body ?? path.text ?? '',  { size: S.body })], { after: 0 }),
      ], C.bgLight),
    ]),

    p([t(d.prognosisKeyVar || '→ 핵심 관찰 변수: (서사엔진 생성)',
        { size: S.body, bold: true, color: C.navy })], {}),
  ];
}

// ── 시계열 추이 ───────────────────────────────────────────
function buildTimeSeries(d) {
  const rows   = d.timeSeriesRows   || [['I1 경상수지', '—', '—', '—', '→', '추이 추가 예정']];
  const months = d.timeSeriesMonths || ['전전월', '전월', '기준월'];

  return [
    ...sectionHeader('추이.', '시계열 추이', `${months.join(' → ')} 변화`),
    p([t('"지속"을 판단하려면 추세를 봐야 한다. 단월 수치가 아니라 방향이 중요하다.',
        { size: S.body, it: true, color: C.mid })], { after: 200 }),

    tbl([
      rw([hcl('게이지', 2000), hcl(months[0], 1300), hcl(months[1], 1300), hcl(months[2], 1300), hcl('추세', 700), hcl('판단', 2426)]),
      ...rows.map((r, i) => {
        const tc = r[4].includes('↓↓') ? C.lv2 : r[4].includes('↑↑') ? C.lv1 : C.mid;
        return rw([
          cl(r[0], { w: 2000, bold: true, fs: S.sm, bg: altBg(i) }),
          cl(r[1], { w: 1300, fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
          cl(r[2], { w: 1300, fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
          cl(r[3], { w: 1300, fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
          cl(r[4], { w: 700,  fs: S.body, align: AlignmentType.CENTER, bold: true, fc: tc, bg: altBg(i) }),
          cl(r[5], { w: 2426, fs: S.sm, bg: altBg(i) }),
        ]);
      }),
    ], [2000, 1300, 1300, 1300, 700, 2426]),

    subHeader('추세 해석'),
    p([t(d.trendAnalysis || '(서사엔진이 생성하는 추세별 해석)', { size: S.body })], {}),
    p([t(d.trendWarning  || '→ 핵심 경고: (서사엔진 생성)', { size: S.body, bold: true, color: C.lv2 })], {}),
  ];
}

// ── 경제 가족력 비교 ──────────────────────────────────────
function buildFamilyHistory(d) {
  const rows = d.familyRows || [
    ['경상수지',    '-26억$ 적자',    '-4.1억$ 적자',   '흑자'],
    ['외환보유고',  '-20% 급감',      '-11.4% 급감',    '소폭 감소'],
    ['환율',        '+11.3% 폭등',    '+17.4% 폭등',    '고공행진'],
    ['금리',        '+3%p 급등',      '+0.25%p',        '동결'],
    ['물가',        '+4.6%',          '+5.1%',          '+2.0%'],
    ['주가',        '-27.2% 폭락',    '-23.1% 폭락',    '상승'],
    ['DIAH',       'D+H 동시 활성',  'H+A 동시 활성',  '전원 비활성(잠복)'],
    ['진단명',      '급성 심근경색',  '패혈증 쇼크',    d.currentDiagName || '(현재 진단명)'],
  ];

  return [
    ...sectionHeader('가족력.', '경제 가족력 비교 (Family History)', '과거 위기와 현재의 구조적 차이'),

    tbl([
      rw([hcl('지표', 1800), hcl('1997년 11월', 2200), hcl('2008년 10월', 2200), hcl('현재', 2826)]),
      ...rows.map((r, i) => {
        const is97 = String(r[1]).includes('급') || String(r[1]).includes('폭') || String(r[1]).includes('적자');
        const is08 = String(r[2]).includes('급') || String(r[2]).includes('폭') || String(r[2]).includes('적자');
        return rw([
          cl(r[0], { w: 1800, bold: true, fs: S.sm, bg: altBg(i) }),
          cl(r[1], { w: 2200, fs: S.sm, align: AlignmentType.CENTER, fc: is97 ? C.lv2 : C.dark, bg: altBg(i) }),
          cl(r[2], { w: 2200, fs: S.sm, align: AlignmentType.CENTER, fc: is08 ? C.lv2 : C.dark, bg: altBg(i) }),
          cl(r[3], { w: 2826, fs: S.sm, align: AlignmentType.CENTER, fc: C.lv0, bg: altBg(i) }),
        ]);
      }),
    ], [1800, 2200, 2200, 2826]),

    ...(d.familyNarratives && d.familyNarratives.length > 0
      ? d.familyNarratives
      : [
          { year: '1997', text: '' },
          { year: '2008', text: '' },
          { year: '공통', text: '' },
        ]
    ).flatMap(fn => {
      // { year, text } 구조와 { title, body } 구조 모두 지원
      const title = fn.title || `▶ ${fn.year}년`;
      const body  = fn.body  || fn.text || '';
      if (!body) return [];
      return [
        p([t(title, { size: S.body, bold: true, color: C.navy })], { before: 200, after: 80 }),
        p([t(body,  { size: S.body })], { after: 120 }),
      ];
    }),
  ];
}

// ── 명의의 처방 ───────────────────────────────────────────
function buildPrescription(d) {
  return [
    ...sectionHeader('처방.', '명의의 처방', d.prescriptionSubtitle || ''),
    p([t(d.prescriptionIntro || '(서사엔진 생성: 현재 유기체에게 필요한 것이 무엇인지 인체비유로 설명)',
        { size: S.body })], { after: 200 }),

    ...(d.prescriptions || [
      { title: '처방 1: (제목)', body: '(서사엔진 생성)' },
      { title: '처방 2: (제목)', body: '(서사엔진 생성)' },
      { title: '처방 3: (제목)', body: '(서사엔진 생성)' },
    ]).flatMap(rx => [
      p([t(rx.title, { size: S.body, bold: true, color: C.navy })], { before: 160, after: 80 }),
      p([t(rx.body ?? rx.text ?? '',  { size: S.body })], { after: 120 }),
    ]),

    subHeader('경보 상향 규칙'),
    p([t('단발이 아닌 누적과 복합이 확인될 때만 격상한다:', { size: S.body, bold: true })], { after: 100 }),
    tbl([
      rw([hcl('상황', 3500), hcl('판정 원칙', 5526)]),
      ...[
        ['Input 게이지 단기 급변(경보 수준)',        'CAM 봉쇄 가능성 점검'],
        ['Output 게이지 연속 확인(재확인 후 격상)',  'DLT 봉쇄 가능성 점검'],
        ['누적 + 복합 동시 확인',                   '이중봉쇄 가능성 재검토'],
        ...(d.extraEscalation || []),
      ].map((r, i) => rw([
        cl(r[0], { w: 3500, fs: S.sm, bold: true, bg: altBg(i) }),
        cl(r[1], { w: 5526, fs: S.sm, bg: altBg(i) }),
      ])),
    ], [3500, 5526]),
  ];
}

// ── 데이터 출처 + 면책 ────────────────────────────────────
function buildSourcesDisclaimer(d) {
  const sources = d.sources || [
    ['I1',  '경상수지',       'ECOS',              '한국은행',     '최신월'],
    ['I3',  '외환보유고',     'ECOS',              '한국은행',     '최신월'],
    ['I4',  '환율',           '서울외국환중개',     '한국은행',     '월평균'],
    ['I6',  '기준금리',       '한국은행',           '한국은행',     '최신월'],
    ['O2',  '소비자물가',     '국가데이터처',       '통계청',       '최신월'],
    ['O4',  '코스피',         'KRX',               '한국거래소',   '종가'],
    ['O6',  '소매판매',       'KOSIS',             '통계청',       '최신월'],
    ['G6',  'PM2.5 추정',     'Sentinel-5P TROPOMI','ESA/Copernicus','일간/주간'],
    ['—',   'NO₂ 농도',      'GEMS',               '환경부/NIER',  '일간 합성'],
    ['—',   '지표면 온도',    'Landsat-9 TIR',      'USGS/NASA',    '16일 주기'],
    ['—',   'SAR 변화탐지',  'Sentinel-1',         'ESA',          '12일 주기'],
  ];

  return [
    ...sectionHeader('출처.', '데이터 출처 및 면책', ''),
    subHeader('데이터 출처'),
    tbl([
      rw([hcl('코드', 600), hcl('데이터', 1600), hcl('출처', 1800), hcl('발표기관', 1600), hcl('기준시점', 3426)]),
      ...sources.map((s, i) => {
        // s가 객체(narrative-engine 반환)이면 필드명으로, 배열이면 인덱스로 접근
        const v = (obj, key, idx) => Array.isArray(obj) ? (obj[idx] ?? '—') : (obj[key] ?? obj[idx] ?? '—');
        return rw([
          cl(v(s,'code',0),   { w: 600,  fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
          cl(v(s,'name',1),   { w: 1600, fs: S.sm, bg: altBg(i) }),
          cl(v(s,'source',2), { w: 1800, fs: S.sm, bg: altBg(i) }),
          cl(v(s,'org',3),    { w: 1600, fs: S.sm, bg: altBg(i) }),
          cl(v(s,'period',4), { w: 3426, fs: S.sm, bg: altBg(i) }),
        ]);
      }),
    ], [600, 1600, 1800, 1600, 3426]),
    p([t('※ 일부 지표는 발표 시차로 후행한다. 이 시스템은 그 한계를 전제로 오경보를 줄이는 규칙을 적용한다.',
        { size: S.sm, color: C.mid })], { after: 200 }),

    subHeader('면책 조항'),
    diagBox([
      p([t('이 보고서는 예측이 아니라 진단이다. DIAH-7M은 막힘이 누적+복합으로 굳어지는 구간을 탐지하는 시스템이며, 외부 충격(전쟁, 팬데믹, 테러)은 진단 범위에 포함되지 않는다.',
          { size: S.sm, color: C.mid })], { after: 60 }),
      p([t('위성 데이터는 기상 조건, 해상도 한계 등으로 인한 오차가 포함될 수 있다.',
          { size: S.sm, color: C.mid })], { after: 0 }),
    ], C.bgLight),
  ];
}

// ── 부록 ──────────────────────────────────────────────────
function buildAppendix() {
  const sections = [
    { title: '1. 기존 경제학의 한계', body: '1929년 대공황, 1997년 아시아 외환위기, 2008년 글로벌 금융위기—경제학자들은 이 위기들을 예측하지 못했다. 왜 실패했는가? 양(量)만 보았기 때문이다. GDP가 성장 중이었고, 통화량이 충분했으며, 외환보유고가 있었다. 그런데 터졌다. 양은 충분했는데 흐름이 막혀 있었다.' },
    { title: '2. DIAH-7M의 질문', body: 'DIAH-7M은 질문을 바꾼다. "어디가 막혔는가?" 이 질문 하나가 경제를 보는 눈을 완전히 바꾼다. GDP는 좋아 보여도 어딘가 막혀 있으면 위기가 온다. GDP가 낮아도 흐름이 살아 있으면 버틴다.' },
    { title: '3. 신체와 경제는 같은 법칙을 따른다', body: 'DIAH-7M 노화·만성질환 경로시스템은 원래 인체를 위해 개발되었다. 37조 개 세포의 흐름 시스템을 설명하고, 202개 질병을 4가지 트리거(D, I, A, H)와 7가지 기전(1M~7M)으로 통합한 체계다. 그런데 놀라운 발견이 있었다. 이 원리가 경제에도 그대로 작동한다.' },
    { title: '4. 구조적 동형(Structural Isomorphism)', body: '이것은 비유가 아니다. 구조적 동형이다. 신체와 경제는 다른 재료로 만들어졌지만 같은 설계도를 따른다. 신체: 37조 세포 → 혈액 순환 → 막히면 질병 → 이중봉쇄면 사망. 경제: 수천만 경제 주체 → 자본 순환 → 막히면 위기 → 이중봉쇄면 붕괴.' },
    { title: '5. DIAH 트리거의 동일성', body: 'D(결핍): 신체—칼슘·영양 결핍 / 경제—유동성 부족. I(염증): 신체—만성 염증 / 경제—사회적 마찰. A(산증): 신체—대사성 산증 / 경제—인플레이션 압력. H(저산소): 신체—조직 저산소 / 경제—유동성 함정.' },
    { title: '6. 7M 기전의 동일성', body: '1M(폐열): 혈관 폐쇄/파열 / 급성 파산·뱅크런. 2M(둔화): 관절 기능 저하 / 경기 침체. 3M(피폐): 수용체 차단 / 정책 무력화. 4M(경화): 섬유화 / 좀비기업. 5M(범파): 세포 과증식 / 버블. 6M(단절): 신경 폐쇄 / 공급망 붕괴. 7M(붕괴): 뼈 구조 붕괴 / 국가 디폴트.' },
    { title: '7. 이중봉쇄의 동일성', body: '가장 결정적인 증거다. 신체에서 이중봉쇄가 사망을 초래하듯, 경제에서도 이중봉쇄(CAM+DLT)가 시스템 붕괴를 초래한다. 1997년: D+H → 이중봉쇄 → IMF. 2008년: H+A → 이중봉쇄 → 금융위기.' },
    { title: '8. 자연의 보편 법칙', body: '뉴턴이 사과와 달이 같은 법칙(중력)을 따른다는 것을 발견했듯, DIAH-7M은 신체와 경제가 같은 법칙(흐름)을 따른다는 것을 발견했다.' },
    { title: '9. 본 보고서의 의의', body: '본 보고서는 이 원리에 기반하여 경제를 진단한다. 기존 경제학이 "얼마나 성장했는가"를 물을 때, 본 보고서는 "어디가 막혔는가"를 묻는다. DIAH-7M 경제건강검진은 예측이 아니라 진단이다.' },
  ];

  return [
    ...sectionHeader('부록.', '왜 DIAH-7M을 경제 진단에 적용하는가', ''),
    ...sections.flatMap(sec => [
      p([t(sec.title, { size: S.body, bold: true, color: C.navy })], { before: 200, after: 80 }),
      p([t(sec.body,  { size: S.body })], { after: 120 }),
    ]),
    p([t('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', { size: S.body, color: C.line })],
      { align: AlignmentType.CENTER, after: 120 }),
    p([t('DIAH-7M 노화·만성질환 경로시스템', { size: S.body, color: C.mid })],
      { align: AlignmentType.CENTER, after: 40 }),
    p([t('© 윤종원 / 인체국가경제론', { size: S.body, color: C.mid })],
      { align: AlignmentType.CENTER }),
  ];
}

// ══════════════════════════════════════════════════════════
// generateReport — 서사엔진 데이터를 d 객체에 주입 후 조립
// ══════════════════════════════════════════════════════════

function _buildDataObject(diagnosis, D, meta) {
  const overall = diagnosis.overall || {};
  const period  = meta?.month || diagnosis.period || new Date().toISOString().slice(0, 7);
  const now     = new Date();

  // 경보 레벨 매핑 (1~5단계 → 표시용)
  const rawLevel = overall.level ?? overall.stage ?? 0;
  const alertLevel = Math.min(Math.max(parseInt(rawLevel) || 0, 0), 5);

  // CAM/DLT 상태
  const dualLock = diagnosis.dualLock || {};
  const camStatus = dualLock.cam?.status || (dualLock.active ? '봉쇄' : '정상');
  const dltStatus = dualLock.dlt?.status || (dualLock.active ? '봉쇄' : '정상');

  // DIAH 상태
  const diah = diagnosis.diah || {};
  const diahTrigger = (diah.activatedLetters || []).length > 0
    ? (diah.activatedLetters || []).join('/') + ' 활성'
    : '전원 비활성';

  // 9축 상태 매핑 — core-engine 점수 + narrative-engine 서사 결합
  const axesData = {};
  const axes = diagnosis.axes || {};
  const axMap = { A1:'축1', A2:'축2', A3:'축3', A4:'축4', A5:'축5', A6:'축6', A7:'축7', A8:'축8', A9:'축9' };
  // D의 각 축 summary 키 매핑
  const axSumKeyMap = {
    A1: 'sec2_summary',   A2: 'axis2_summary', A3: 'axis3_summary',
    A4: 'axis4_summary',  A5: 'axis5_summary', A6: 'axis6_summary',
    A7: 'axis7_summary',  A8: 'axis8_summary', A9: 'axis9_summary',
  };
  const axNarKeyMap = {
    A1: 'sec2_summaryNarrative',   A2: 'axis2_summaryNarrative', A3: 'axis3_summaryNarrative',
    A4: 'axis4_summaryNarrative',  A5: 'axis5_summaryNarrative', A6: 'axis6_summaryNarrative',
    A7: 'axis7_summaryNarrative',  A8: 'axis8_summaryNarrative', A9: 'axis9_summaryNarrative',
  };
  const LEVEL_LABELS = { 1:'안정', 2:'주의', 3:'경계', 4:'심각', 5:'위기' };
  for (const [key, axId] of Object.entries(axMap)) {
    const ax = axes[key] || {};
    const lv = ax.level?.level || 0;
    // 경보 카운트 계산 (severity >= 4.0 이면 경보, 3.0~3.99면 주의)
    const gs = ax.gauges || [];
    const stars    = gs.filter(g => g.severity >= 4.0).length;
    const cautions = gs.filter(g => g.severity >= 3.0 && g.severity < 4.0).length;
    // 점수 표시
    const scoreStr = typeof ax.score === 'number' ? ax.score.toFixed(2) + '점' : '—';
    // 서사 — D 우선, 없으면 점수+등급
    const narrative = (D && D[axNarKeyMap[key]]) || (D && D[axSumKeyMap[key]])
      || (lv ? `${LEVEL_LABELS[lv] || ''} (${scoreStr})` : scoreStr);
    axesData[axId] = {
      gaugeCount: ax.count || gs.length || 0,
      score:      ax.score,
      level:      lv,
      levelName:  LEVEL_LABELS[lv] || '—',
      status:     lv >= 4 ? 'alert' : lv >= 3 ? 'caution' : 'normal',
      stars,
      cautions,
      oneLiner:   narrative || '—',
    };
  }

  // ── 서사엔진 D 객체 → d 매핑 (실제 D 키 기준) ──────────
  const d = {
    // 기본 메타
    country:      '대한민국',
    baseMonth:    period.replace('-', '년 ') + '월',
    writeDate:    now.toLocaleDateString('ko-KR'),
    alertLevel,
    alertLabel:   `${alertLevel}단계 — ${['정상','안정','주의','경계','심각','위기'][alertLevel] || '미판정'}`,
    alertSubtitle: '전체 게이지 종합판정',
    camStatus:    D?.camStatus  || camStatus,
    dltStatus:    D?.dltStatus  || dltStatus,
    camDetail:    D?.camStatus  || camStatus,
    dltDetail:    D?.dltStatus  || dltStatus,
    camExplain:   '',
    dltExplain:   '',
    dualBlockade: D?.dualBlockade || (dualLock.active ? '이중봉쇄 발동' : '없음'),
    dualBlockadeDetail: D?.dualBlockade || (dualLock.active ? '이중봉쇄 발동' : '없음'),
    diahTrigger,

    // 임상 소견 — D.oneLiner / D.sec1_alertNarrative / D.sec1_detail / D.sec1_pathology
    clinicalTitle:    D?.sec1_alertNarrative || D?.oneLiner || '',  // 병명 (예: "하한 증후군")
    clinicalOneLiner: D?.oneLiner || '',
    clinicalBody:     D?.sec1_detail || '',
    clinicalPathology:D?.sec1_pathology || D?.sec1_alertNarrative || '', // 병리 연결고리 우선

    // 위성 데이터 (파이프라인 주입)
    satellite: diagnosis.satellite || {},

    // 9축 대시보드
    axes: axesData,
    alertSummary: D ? `경보 ${D.alertLevel ?? 0}단계 | ${D._v28_gradeDisplay || ''}` : '',

    // 섹션 0 잠복기 메시지 — D.sec1_detail 재활용
    section0Incubation: D?.sec1_detail || '',

    // DIAH 트리거 — D.sec4_verdict / D.sec4_triggers / D.sec4_summary
    diahIntro:     D?.sec4_verdict  || '',
    diahTriggers:  D?.sec4_triggers || [],
    diahConclusion:D?.sec4_summary  || '',

    // 7M 기전 — D.sec5_current / D.sec5_currentName / D.sec5_currentText
    current7Mstage:   parseInt((D?.sec5_current || '0').replace(/\D/g,'')) || 0,
    mStageName:       D?.sec5_currentName || '',
    mStageExplain:    D?.sec5_currentText || '',
    mStageNext:       D?.sec5_nextM       || '',
    mStageNextName:   D?.sec5_nextName    || '',
    mStageProgression:D?.sec5_nextText    || '',

    // 예후 — D.sec6_intro / D.sec6_paths / D.sec6_watchVars
    prognosisIntro:   D?.sec6_intro     || '',
    prognosisPaths:   D?.sec6_paths     || [],
    prognosisKeyVar:  Array.isArray(D?.sec6_watchVars)
                        ? D.sec6_watchVars.join(', ')
                        : (D?.sec6_watchVars || ''),

    // 시계열 — D.sec7_narrative / D.sec7_monthly
    timeSeriesRows:   diagnosis.timeSeries?.rows   || [],
    timeSeriesMonths: D?.sec7_months || diagnosis.timeSeries?.months || [],
    trendAnalysis:    D?.sec7_narrative || '',
    trendWarning:     typeof D?.sec7_monthly === 'string' ? D.sec7_monthly : (D?.sec7_narrative || ''),

    // 가족력 — D.sec8_narrative1997 / D.sec8_narrative2008 / D.sec8_common
    familyNarratives: D ? [
      { year:'1997', text: D.sec8_narrative1997 || '' },
      { year:'2008', text: D.sec8_narrative2008 || '' },
      { year:'공통', text: D.sec8_common        || '' },
    ].filter(r => r.text) : [],
    currentDiagName: D?.sec5_currentName || '',

    // 처방 — D.sec9_intro / D.sec9_prescriptions / D.sec9_rules
    prescriptionSubtitle: D?.sec9_title  || '',
    prescriptionIntro:    D?.sec9_intro  || '',
    prescriptions:        D?.sec9_prescriptions || [],
    prescriptionRules:    D?.sec9_rules  || [],

    // 출처/면책 — D.sec10_sources / D.sec10_disclaimer
    sources:     D?.sec10_sources     || null,
    disclaimer:  D?.sec10_disclaimer  || null,
  };

  // 교차신호 변환 — D._v28_crossSignals 우선
  const crossSignalsRaw = D?._v28_crossSignals?.length
    ? D._v28_crossSignals
    : (() => {
        const raw = diagnosis.crossSignals || {};
        return Array.isArray(raw) ? raw : (raw.active || []);
      })();
  d._crossSignals = crossSignalsRaw.map(cs => ({
    pair:       cs.pair       || cs.axes || '—',
    organLink:  cs.organLink  || cs.organ || '—',
    direction:  cs.direction  || '—',
    severity:   cs.severity   || 'low',
    leadMonths: cs.leadMonths || null,
    diagnosis:  cs.diagnosis  || cs.description || cs.text || '—',
  }));

  return d;
}

// ── 9축 게이지 배열 빌드 (서사엔진 METAPHOR + diagnosis 결합) ──
function _buildAxisGauges(axisKey, diagnosis, D) {
  // D 객체에서 해당 축 게이지 배열 추출 (sec2_gauges ~ axis9_gauges)
  const axKeyMap = {
    A1: 'sec2_gauges', A2: 'axis2_gauges', A3: 'axis3_gauges',
    A4: 'axis4_gauges', A5: 'axis5_gauges', A6: 'axis6_gauges',
    A7: 'axis7_gauges', A8: 'axis8_gauges', A9: 'axis9_gauges',
  };
  const gaugeArr = (D && D[axKeyMap[axisKey]]) || [];
  if (gaugeArr.length > 0) return gaugeArr.map(function(g) {
    // narrative-engine gauge: code="I1 무역수지(경상)", value=formatted string
    // buildAxisDetail expects: code, name, value, change, grade, status, organMetaphor, narrative, diagnosis
    var codeParts = (g.code || "").split(" ");
    var shortCode = codeParts[0] || "—";
    var nameStr = codeParts.slice(1).join(" ") || g.name || "—";
    var gradeStr = g.grade || "—";
    var status = gradeStr.includes("경보") ? "alert" : gradeStr.includes("주의") ? "caution" : "normal";
    var narr = Array.isArray(g.narrative) ? g.narrative : (g.narrative ? [g.narrative] : []);
    return {
      code: shortCode,
      name: nameStr,
      value: g.value || "—",
      change: g.change || "—",
      grade: gradeStr,
      status: status,
      organMetaphor: g.metaphor || g.organMetaphor || "—",
      narrative: narr,
      diagnosis: g.diagnosis || "—",
    };
  });

  // fallback: diagnosis.axes 원본 — 실제 구조: { gaugeId, name, raw, severity, unit }
  const axData = (diagnosis.axes || {})[axisKey] || {};
  const gauges = axData.gauges || [];
  const SEV_GRADE = (sev) => {
    if (sev >= 4.5) return '★★★ 경보';
    if (sev >= 4.0) return '★★ 경보';
    if (sev >= 3.0) return '★ 주의';
    if (sev >= 2.0) return '● 관찰';
    return '○ 정상';
  };
  const SEV_STATUS = (sev) => sev >= 4.0 ? 'alert' : sev >= 3.0 ? 'caution' : 'normal';

  // gauge-adapter ID_MAP에서 올바른 단위 가져오기 (core-engine unit보다 우선)
  const idMapRef = (gaugeAdapter && gaugeAdapter.ID_MAP) ? gaugeAdapter.ID_MAP : {};

  return gauges.map(g => {
    const pid = g.gaugeId || g.code || g.id;
    // gauge-adapter 단위 우선, 없으면 core-engine 단위
    const correctUnit = (idMapRef[pid] && idMapRef[pid].unit) ? idMapRef[pid].unit : (g.unit || '');

    // 소수점 포맷: raw + unit → "값단위" 형태
    let valStr = '—';
    if (g.raw != null) {
      const n = typeof g.raw === 'number' ? g.raw : Number(g.raw);
      if (!isNaN(n)) {
        const dec = Math.abs(n) >= 1000 ? 0 : Math.abs(n) >= 100 ? 1 : 2;
        valStr = correctUnit ? `${n.toFixed(dec)}${correctUnit}` : n.toFixed(dec);
      } else {
        valStr = String(g.raw);
      }
    }
    return {
      code:          g.gaugeId || g.code || g.id || '—',
      name:          g.name || '—',
      value:         valStr,
      change:        '—',    // 변화량 미수집 — 항상 —
      grade:         SEV_GRADE(g.severity),
      status:        SEV_STATUS(g.severity),
      organMetaphor: g.organMetaphor || g.metaphor || '—',
      narrative:     g.narrative || [],
      diagnosis:     g.diagnosis || `심각도 ${(g.severity||0).toFixed(2)} / 5.00`,
    };
  });
}

function _axisSum(axisKey, diagnosis, D) {
  // D 키: A1=sec2_summary/sec2_summaryNarrative, A2~A9=axis{N}_summary/axis{N}_summaryNarrative
  const sumKeyMap = {
    A1: ['sec2_summary',  'sec2_summaryNarrative'],
    A2: ['axis2_summary', 'axis2_summaryNarrative'],
    A3: ['axis3_summary', 'axis3_summaryNarrative'],
    A4: ['axis4_summary', 'axis4_summaryNarrative'],
    A5: ['axis5_summary', 'axis5_summaryNarrative'],
    A6: ['axis6_summary', 'axis6_summaryNarrative'],
    A7: ['axis7_summary', 'axis7_summaryNarrative'],
    A8: ['axis8_summary', 'axis8_summaryNarrative'],
    A9: ['axis9_summary', 'axis9_summaryNarrative'],
  };
  const [titleKey, textKey] = sumKeyMap[axisKey] || [];
  if (D && titleKey && (D[titleKey] || D[textKey])) {
    return {
      title:  D[titleKey] || '',
      text:   D[textKey]  || '',
      status: 'normal',
    };
  }
  const ax = (diagnosis.axes || {})[axisKey] || {};
  return { title: ax.summary || '', text: ax.summaryText || '', status: ax.status || 'normal' };
}

// ══════════════════════════════════════════════════════════
// renderDOCX — 메인 (v3.0)
// ══════════════════════════════════════════════════════════

// ── diagnosis 데이터 기반 D 보완 (narrative-engine이 구 ID 체계라 서사 생성 못할 때) ──
function _buildFallbackD(diagnosis, meta) {
  const overall  = diagnosis.overall || {};
  const axes     = diagnosis.axes    || {};
  const dualLock = diagnosis.dualLock|| {};
  const cross    = Array.isArray(diagnosis.crossSignals)
    ? diagnosis.crossSignals : (diagnosis.crossSignals?.active || []);
  const period   = meta?.month || new Date().toISOString().slice(0,7);
  const LNAMES   = { 1:'안정', 2:'주의', 3:'경계', 4:'심각', 5:'위기' };
  const LCOLORS  = { 1:'#22c55e', 2:'#eab308', 3:'#f97316', 4:'#ef4444', 5:'#7f1d1d' };

  // 축별 한줄 서사 생성
  function axOneLiner(axId, ax) {
    const lv = ax.level?.level || 0;
    const sc = typeof ax.score === 'number' ? ax.score.toFixed(2) : '—';
    const lname = LNAMES[lv] || '미판정';
    const gs = ax.gauges || [];
    const worst = gs.reduce((a,b) => (b.severity||0) > (a.severity||0) ? b : a, gs[0] || {});
    const wname = worst?.name || '';
    const wsev  = worst?.severity || 0;
    if (lv >= 4) return `${lname} (${sc}점) — ${wname} 심각도 ${wsev.toFixed(1)}로 위험 수준`;
    if (lv >= 3) return `${lname} (${sc}점) — ${wname} 경계 수준 주시 필요`;
    if (lv >= 2) return `${lname} (${sc}점) — 일부 지표 주의 관찰`;
    return `${lname} (${sc}점) — 안정적 범위 유지`;
  }

  // 게이지 배열 생성
  const SEV_GRADE = sev => sev >= 4.5 ? '★★★ 경보' : sev >= 4.0 ? '★★ 경보' : sev >= 3.0 ? '★ 주의' : sev >= 2.0 ? '● 관찰' : '○ 정상';
  const SEV_STATUS = sev => sev >= 4 ? 'alert' : sev >= 3 ? 'caution' : 'normal';
  // 소수점 2자리 반올림 + 단위 붙이기 (단위가 있으면)
  function fmtRaw(raw, unit) {
    if (raw == null) return '—';
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (isNaN(n)) return String(raw);
    // 소수점 자릿수 결정: 정수에 가까우면 0, 소수 있으면 2자리
    const dec = Math.abs(n) >= 100 ? 1 : Math.abs(n) >= 10 ? 2 : 2;
    const formatted = n.toFixed(dec);
    return unit ? `${formatted}${unit}` : formatted;
  }
  // gauge-adapter 단위 우선 사용
  const idMapRef2 = (gaugeAdapter && gaugeAdapter.ID_MAP) ? gaugeAdapter.ID_MAP : {};
  function buildGaugeArr(ax) {
    return (ax.gauges||[]).map(g => {
      const pid = g.gaugeId || g.code || g.id;
      const correctUnit = (idMapRef2[pid] && idMapRef2[pid].unit) ? idMapRef2[pid].unit : (g.unit || '');
      return {
        code: pid || '—',
        name: g.name || '—',
        value: fmtRaw(g.raw, correctUnit),
        change: '—',   // 변화량 미수집 — 항상 —
        grade: SEV_GRADE(g.severity||0),
        status: SEV_STATUS(g.severity||0),
        organMetaphor: '—',
        narrative: [],
        diagnosis: `심각도 ${(g.severity||0).toFixed(2)} / 5.00`,
      };
    });
  }

  const AX_KEYS = ['A1','A2','A3','A4','A5','A6','A7','A8','A9'];
  const sumMap = {
    A1:'sec2_summary', A2:'axis2_summary', A3:'axis3_summary', A4:'axis4_summary',
    A5:'axis5_summary', A6:'axis6_summary', A7:'axis7_summary', A8:'axis8_summary', A9:'axis9_summary'
  };
  const narMap = {
    A1:'sec2_summaryNarrative', A2:'axis2_summaryNarrative', A3:'axis3_summaryNarrative',
    A4:'axis4_summaryNarrative', A5:'axis5_summaryNarrative', A6:'axis6_summaryNarrative',
    A7:'axis7_summaryNarrative', A8:'axis8_summaryNarrative', A9:'axis9_summaryNarrative'
  };
  const gaugeMap = {
    A1:'sec2_gauges', A2:'axis2_gauges', A3:'axis3_gauges', A4:'axis4_gauges',
    A5:'axis5_gauges', A6:'axis6_gauges', A7:'axis7_gauges', A8:'axis8_gauges', A9:'axis9_gauges'
  };

  const D = {
    month: period, writeDate: new Date().toLocaleDateString('ko-KR'),
    engineVersion: 'DIAH-7M v5.1',
    alertLevel: overall.level || 0,
    alertColor:  LCOLORS[overall.level] || '#64748b',
    oneLiner: `종합 ${LNAMES[overall.level]||'미판정'} — 57개 게이지 종합 점수 ${typeof overall.score==='number'?overall.score.toFixed(2):'—'}/5.00`,
    camStatus:    dualLock.locked ? '봉쇄' : '정상',
    dltStatus:    dualLock.locked ? '봉쇄' : '정상',
    dualBlockade: dualLock.locked ? '이중봉쇄 발동' : '해제',
    sec1_alertNarrative: `${LNAMES[overall.level]||'미판정'} 단계 — 종합점수 ${typeof overall.score==='number'?overall.score.toFixed(2):'—'}/5.00`,
    sec1_detail: dualLock.reason || (dualLock.locked ? '이중봉쇄 발동 상태입니다.' : '이중봉쇄 미발동 상태입니다.'),
    sec4_triggers: [],
    sec4_summary: `교차신호 ${cross.length}개 감지`,
    sec5_current: '0M', sec5_currentName: '정상', sec5_currentText: '현재 기전 분석 대기 중입니다.',
    sec6_paths: [],
    sec8_narrative1997: '', sec8_narrative2008: '', sec8_common: '',
    sec9_prescriptions: [],
    sec10_disclaimer: '본 보고서는 DIAH-7M 시스템이 자동 생성한 진단 참고자료입니다.',
    _v28_crossSignals: cross.map(cs => ({
      pair:       cs.pair || cs.axes || '—',
      organLink:  cs.organ || cs.organLink || '—',
      direction:  cs.direction || (cs.positive ? '↑' : cs.negative ? '↓' : '→'),
      severity:   cs.severity || 'medium',
      leadMonths: cs.leadMonths || null,
      diagnosis:  cs.desc || cs.description || cs.text || cs.name || '—',
    })),
  };

  // 축별 서사/게이지 주입
  for (const axId of AX_KEYS) {
    const ax = axes[axId] || {};
    const oneLiner = axOneLiner(axId, ax);
    D[sumMap[axId]]  = ax.name ? `${ax.name} 축` : axId;
    D[narMap[axId]]  = oneLiner;
    D[gaugeMap[axId]] = buildGaugeArr(ax);
  }

  return D;
}

async function renderDOCX(diagnosis, meta = {}) {
  // 1) 서사엔진 실행 시도 (구 ID 체계라 서사는 비어있을 수 있음)
  let D = null;
  if (narrativeEngine && narrativeEngine.generateNarrative) {
    try {
      // gauge-adapter로 변환된 { I1:{value,grade}, ... } 딕셔너리 생성
      const narGauges = _buildNarrativeGauges(diagnosis);
      // ── diagnosis 데이터에서 DIAH·7M·blockade 실제 값 추출 ──
      const _ovLevel  = diagnosis.overall?.level || 0;
      const _ovScore  = diagnosis.overall?.score || 0;
      const _ovName   = diagnosis.overall?.levelName || '정상';
      const _dl       = diagnosis.dualLock || {};

      // CAM/DLT 판정: axes의 input축(A1)·output축(A3) 기반 추정
      const _camAxes  = ['A1','A2'];  // 순환계/무역 = 동맥(CAM)
      const _dltAxes  = ['A3','A5']; // 소화계/면역 = 말단(DLT)
      const _camLevel = Math.max(..._camAxes.map(k => diagnosis.axes?.[k]?.level?.level || 0));
      const _dltLevel = Math.max(..._dltAxes.map(k => diagnosis.axes?.[k]?.level?.level || 0));
      const _camLabel = _camLevel >= 4 ? '경보' : _camLevel >= 3 ? '주의' : '양호';
      const _dltLabel = _dltLevel >= 4 ? '경보' : _dltLevel >= 3 ? '주의' : '양호';

      // DIAH 트리거 — diagnosis.dualLock + axes 기반 추정
      const _diahActive = [];
      if (_dl.active) {
        if (_dl.criticalAxes?.includes('A1') || _camLevel >= 4) _diahActive.push('H'); // 돈맥경화
        if (_ovLevel >= 4) _diahActive.push('D'); // 소득절벽
      } else {
        if (_camLevel >= 3) _diahActive.push('H');
        if (_dltLevel >= 4) _diahActive.push('I');
      }

      // 7M 현재 단계 — overall.level → M 단계 매핑
      const _m7Map = { 0:'0M', 1:'0M', 2:'1M', 3:'2M', 4:'3M', 5:'4M' };
      const _curM  = _m7Map[_ovLevel] || '0M';
      const _curN  = parseInt(_curM) || 0;
      const _nxtM  = `${Math.min(_curN + 1, 7)}M`;

      const narResult = {
        gauges: narGauges,
        alert: {
          level: Math.min(2, Math.max(0, Math.round(_ovScore / 2))),
          label: `Lv.${Math.min(2, Math.round(_ovScore / 2))} 경보`,
        },
        blockade: {
          type: _dl.active ? '이중봉쇄' : (_camLevel >= 3 ? 'CAM 신호봉쇄' : '미발동'),
          label: _dl.active ? 'CAM+DLT 이중봉쇄' : (_camLevel >= 3 ? 'CAM 주의' : '봉쇄 미발동'),
          cam: _camLabel,
          dlt: _dltLabel,
          dual: !!_dl.active,
        },
        diah: {
          label: _diahActive.length > 0 ? _diahActive.join('+') + ' 활성' : '미발동',
          active: _diahActive,
        },
        m7: { current: _curM, next: _nxtM },
        overallGrade: {
          level: _ovName,
          code: _ovLevel,
          display: _ovName,
        },
        crossSignals: diagnosis.crossSignals || [],
      };
      // ── oneLiner 자동생성: 가장 나쁜 축 + 가장 좋은 축 조합 ──
      const _axEntries = Object.entries(diagnosis.axes || {});
      const _sorted = _axEntries.sort((a,b) => (b[1]?.level?.level||0)-(a[1]?.level?.level||0));
      const _worstAx = _sorted[0];
      const _bestAx  = _sorted[_sorted.length - 1];
      const _axNames = { A1:'순환계',A2:'무역·수출',A3:'소화계·내수',A4:'신경계',A5:'면역·금융',A6:'내분비·물가',A7:'근골격·산업',A8:'인구·취약',A9:'재생·에너지' };
      const _lvNames = ['정상','안정','주의','경계','심각','위기'];
      const _autoOneLiner = _worstAx
        ? `${_axNames[_worstAx[0]]||_worstAx[0]} ${_lvNames[_worstAx[1]?.level?.level||0]||'주의'} — ${_ovName} 단계 (${_ovScore?.toFixed ? _ovScore.toFixed(1) : _ovScore}점)`
        : `${_ovName} 단계 종합 판정`;

      // ── 가족력 현재값 주입 — diagnosis.axes 최신 게이지 기반 ──
      const _i1 = narGauges['I1'];
      const _i3 = narGauges['I3'];
      const _i4 = narGauges['I4'];
      const _i6 = narGauges['I6'];
      const _o2 = narGauges['O2'];
      const _o4 = narGauges['O4'];
      const _o6 = narGauges['O6'];
      const _familyNow = {
        경상수지:     _i1 ? `${_i1.value > 0 ? '+' : ''}${Number(_i1.value).toFixed(1)}억$` : '—',
        외환보유고:   _i3 ? `${Number(_i3.value).toFixed(0)}억$` : '—',
        환율:         _i4 ? `${Number(_i4.value).toFixed(0)}원` : '—',
        국채금리:     _i6 ? `${Number(_i6.value).toFixed(2)}%` : '—',
        물가:         _o2 ? `+${Number(_o2.value).toFixed(1)}%` : '—',
        주가:         _o4 ? `${Number(_o4.value).toFixed(0)}pt` : '—',
        'DIAH 트리거': _diahActive.length > 0 ? _diahActive.join('+') + ' 활성' : '미발동',
        진단명:       _ovName,
      };

      const narMeta = {
        month:           meta.month || diagnosis.period || new Date().toISOString().slice(0, 7),
        writeDate:       new Date().toLocaleDateString('ko-KR'),
        engineVersion:   'DIAH-7M v5.1 + 서사엔진 v2.8',
        oneLiner:        meta.oneLiner || _autoOneLiner,
        familyHistoryNow: _familyNow,
        baseRate:        _i6 ? `${Number(_i6.value).toFixed(2)}%` : '미확인',
      };
      console.log(`[renderer] narrative-engine 호출: ${Object.keys(narGauges).length}개 게이지 주입 (${Object.keys(narGauges).join(', ').slice(0,60)}...)`);
      D = narrativeEngine.generateNarrative(narResult, {}, narMeta);
    } catch (ne) {
      console.warn('[renderer] generateNarrative 실패:', ne.message);
    }
  }

  // fallback D 항상 생성 후 D가 없거나 게이지/서사가 비어있으면 보완
  const fallback = _buildFallbackD(diagnosis, meta);
  if (!D) {
    D = fallback;
  } else {
    // narrative-engine D가 있어도 게이지/서사가 비어있거나 "미입력" 문구면 fallback으로 덮어씀
    const gaugeKeys = {
      A1:'sec2_gauges', A2:'axis2_gauges', A3:'axis3_gauges', A4:'axis4_gauges',
      A5:'axis5_gauges', A6:'axis6_gauges', A7:'axis7_gauges', A8:'axis8_gauges', A9:'axis9_gauges'
    };
    const narKeys = {
      A1:'sec2_summaryNarrative', A2:'axis2_summaryNarrative', A3:'axis3_summaryNarrative',
      A4:'axis4_summaryNarrative', A5:'axis5_summaryNarrative', A6:'axis6_summaryNarrative',
      A7:'axis7_summaryNarrative', A8:'axis8_summaryNarrative', A9:'axis9_summaryNarrative'
    };
    for (const key of Object.values(gaugeKeys)) {
      if (!D[key] || D[key].length === 0) D[key] = fallback[key] || [];
    }
    for (const key of Object.values(narKeys)) {
      if (!D[key] || D[key].includes('미입력') || D[key].includes('meta에서 입력')) {
        D[key] = fallback[key] || '';
      }
    }
  }

  // 2) d 객체 빌드
  const d = _buildDataObject(diagnosis, D, meta);

  // 3) 9축 게이지 데이터 빌드
  // AX_DEF: axes9와 완전히 일치 (buildOverallVital 기준)
  const AX_DEF = [
    { key:'A1', num:'A1.', name:'순환계/심장폐',  organ:'심폐계',    q:'심장과 폐가 정상인가?' },
    { key:'A2', num:'A2.', name:'무역/호흡계',    organ:'동맥 혈류', q:'대동맥에 피가 잘 흐르는가?' },
    { key:'A3', num:'A3.', name:'소화계/내수',    organ:'미세혈관',  q:'손끝 세포까지 산소가 가는가?' },
    { key:'A4', num:'A4.', name:'신경계/심리',    organ:'신경계',    q:'뼈에 금이 갔는가?' },
    { key:'A5', num:'A5.', name:'면역계/금융',    organ:'혈액의 질', q:'혈액이 탁하지 않은가?' },
    { key:'A6', num:'A6.', name:'내분비/물가',    organ:'호르몬',    q:'체내 호르몬이 균형인가?' },
    { key:'A7', num:'A7.', name:'근골격/산업',    organ:'근육뼈',    q:'근육과 뼈가 튼튼한가?' },
    { key:'A8', num:'A8.', name:'인구/취약계층',  organ:'신체 나이', q:'경제의 나이는 몇 살인가?' },
    { key:'A9', num:'A9.', name:'재생/에너지',    organ:'산소 공급원',q:'산소통에 산소가 남아있는가?' },
  ];

  // 4) 문서 조립
  const children = [
    ...buildCover(d),
    ...buildSection0(d),
    ...buildClinicalInsight(d),
    ...buildSatelliteOverview(d),
    ...buildOverallVital(d),
    ...AX_DEF.flatMap(ax => buildAxisDetail(
      ax.num, ax.name, ax.organ, ax.q,
      _buildAxisGauges(ax.key, diagnosis, D),
      _axisSum(ax.key, diagnosis, D)
    )),
    ...buildCrossSignal({ crossSignals: d._crossSignals, cascadeAlert: D?.cascadeAlert }),
    ...buildDIAHTrigger(d),
    ...build7M(d),
    ...buildPrognosis(d),
    ...buildTimeSeries(d),
    ...buildFamilyHistory(d),
    ...buildPrescription(d),
    ...buildSourcesDisclaimer(d),
    ...buildAppendix(),
  ];

  // 5) Document 생성
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: S.body, color: C.dark } },
      },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: S.t2, bold: true, font: FONT, color: C.navy },
          paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: S.t3, bold: true, font: FONT, color: C.blue },
          paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 } },
      ],
    },
    sections: [{
      properties: {
        page: {
          size:   { width: PG.w, height: PG.h },
          margin: { top: PG.mT, bottom: PG.mB, left: PG.mL, right: PG.mR },
        },
      },
      children,
    }],
  });

  return await Packer.toBuffer(doc);
}

// ══════════════════════════════════════════════════════════
// renderPDF — 기존 유지 (PDFKit, 구독자 PDF 엔드포인트)
// ══════════════════════════════════════════════════════════

const LEVEL_NAMES = { 1: '안정', 2: '주의', 3: '경계', 4: '심각', 5: '위기' };
const LEVEL_COLORS_HEX = { 1: '#22c55e', 2: '#eab308', 3: '#f97316', 4: '#ef4444', 5: '#991b1b' };
const AXIS_META = {
  A1: { eco: '순환계/심장폐',  body: '심폐계' },
  A2: { eco: '무역/제조업',    body: '동맥혈류' },
  A3: { eco: '골목시장',       body: '미세혈관' },
  A4: { eco: '부동산 X-ray',   body: '뼈' },
  A5: { eco: '고용/가계',      body: '근육+신경' },
  A6: { eco: '지역균형',       body: '좌우대칭' },
  A7: { eco: '금융스트레스',   body: '혈액의질' },
  A8: { eco: '에너지/자원',    body: '산소공급원' },
  A9: { eco: '인구/노화',      body: '신체나이' },
};

// ── 한글 폰트 경로 ──────────────────────────────────────────
const _FONT_PATH = require('path').join(__dirname, '..', 'fonts', 'NanumGothic.ttf');
const _HAS_KR_FONT = require('fs').existsSync(_FONT_PATH);
const _F  = _HAS_KR_FONT ? _FONT_PATH : 'Helvetica';
const _FB = _HAS_KR_FONT ? _FONT_PATH : 'Helvetica-Bold';

// ── 순수 flow 헬퍼 (절대좌표 일절 사용 안 함) ───────────────

// 페이지 여백 한계 (A4 841pt, 하단 margin 60pt → 781pt)
const PAGE_BOTTOM = 781;
const MARGIN_L = 50;
const PAGE_W   = 495; // 595 - 50*2

function _needPage(doc) {
  return doc.y > PAGE_BOTTOM - 40;
}

function _secTitle(doc, text) {
  if (_needPage(doc)) doc.addPage();
  doc.moveDown(0.8);
  doc.fontSize(13).font(_FB).fillColor('#1e293b')
     .text(text, MARGIN_L, doc.y, { width: PAGE_W });
  doc.moveDown(0.2);
  // 구분선: save → stroke → restore로 커서 보존
  const lineY = doc.y;
  doc.save()
     .moveTo(MARGIN_L, lineY).lineTo(MARGIN_L + PAGE_W, lineY)
     .strokeColor('#cbd5e1').lineWidth(0.5).stroke()
     .restore();
  doc.moveDown(0.5);
  doc.fontSize(10).font(_F).fillColor('#334155');
}

function _body(doc, text) {
  if (!text) return;
  if (_needPage(doc)) doc.addPage();
  doc.fontSize(10).font(_F).fillColor('#334155')
     .text(String(text), MARGIN_L, doc.y, { width: PAGE_W, lineGap: 2 });
  doc.moveDown(0.3);
}

function _bold(doc, text) {
  if (!text) return;
  if (_needPage(doc)) doc.addPage();
  doc.fontSize(10).font(_FB).fillColor('#1e293b')
     .text(String(text), MARGIN_L, doc.y, { width: PAGE_W });
  doc.moveDown(0.2);
}

async function renderPDF(diagnosis, outputStream) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 60, left: MARGIN_L, right: MARGIN_L },
        autoFirstPage: true,
        bufferPages: false,   // bufferPages OFF — 순서대로 단순 출력
      });

      doc.on('end',   () => { console.log('[renderer/pdf] PDF 생성 완료'); resolve(); });
      doc.on('error', reject);
      doc.pipe(outputStream);

      // ── 데이터 준비 ──────────────────────────────────────
      let D = null;
      if (narrativeEngine && narrativeEngine.generateNarrative) {
        try {
          D = narrativeEngine.generateNarrative(diagnosis, {}, {
            month:      diagnosis.period || new Date().toISOString().slice(0, 7),
            writeDate:  new Date().toLocaleDateString('ko-KR'),
            engineVersion: 'DIAH-7M v5.1 + 서사엔진 v2.8',
          });
        } catch (ne) { console.warn('[renderer/pdf] generateNarrative 실패:', ne.message); }
      }

      const overall  = diagnosis.overall  || {};
      const axes     = diagnosis.axes     || {};
      const dualLock = diagnosis.dualLock || {};
      const period   = diagnosis.period   || new Date().toISOString().slice(0, 7);
      const lvColor  = LEVEL_COLORS_HEX[overall.level] || '#64748b';
      const lvName   = LEVEL_NAMES[overall.level]       || '미판정';

      // ── 1. 표지 ──────────────────────────────────────────
      doc.moveDown(3);
      doc.fontSize(22).font(_FB).fillColor('#0f172a')
         .text('DIAH-7M 경제 건강검진 보고서', MARGIN_L, doc.y, { width: PAGE_W, align: 'center' });
      doc.moveDown(0.4);
      doc.fontSize(13).font(_F).fillColor('#475569')
         .text(`대한민국  |  ${period}`, MARGIN_L, doc.y, { width: PAGE_W, align: 'center' });
      doc.moveDown(2);
      doc.fontSize(28).font(_FB).fillColor(lvColor)
         .text(`L${overall.level || '?'}  ${lvName}`, MARGIN_L, doc.y, { width: PAGE_W, align: 'center' });
      doc.moveDown(0.6);
      doc.fontSize(14).font(_F).fillColor('#64748b')
         .text(`종합점수 ${typeof overall.score === 'number' ? overall.score.toFixed(1) : 'N/A'} / 100`, MARGIN_L, doc.y, { width: PAGE_W, align: 'center' });
      doc.moveDown(3);
      doc.fontSize(9).font(_F).fillColor('#94a3b8')
         .text(`생성일: ${new Date().toLocaleDateString('ko-KR')}  |  DIAH-7M v5.1 + 서사엔진 v2.8`, MARGIN_L, doc.y, { width: PAGE_W, align: 'center' });

      // ── 2. 9축 채점표 ────────────────────────────────────
      doc.addPage();
      _secTitle(doc, '1. 9축 종합 채점표');

      const axEntries = Object.entries(axes);
      if (axEntries.length === 0) {
        _body(doc, '(진단 데이터 없음 — 게이지 수집 후 재시도하세요)');
      } else {
        axEntries.forEach(([axId, ax]) => {
          if (_needPage(doc)) doc.addPage();
          const meta = AXIS_META[axId] || { eco: axId, body: '' };
          const lvC  = LEVEL_COLORS_HEX[ax.level?.level] || '#64748b';
          const sc   = typeof ax.score === 'number' ? ax.score.toFixed(2) : 'N/A';
          const lv   = ax.level?.level   ? `L${ax.level.level}` : '';
          const lname= ax.level?.levelName || '';
          doc.fontSize(10).font(_FB).fillColor('#1e293b')
             .text(`${axId}  ${meta.eco}`, MARGIN_L, doc.y, { width: 260, continued: false });
          const savedY = doc.y;
          // 점수/등급을 같은 행 오른쪽에 — moveUp으로 한 줄 올린 뒤 오른쪽 쓰기
          doc.fontSize(10).font(_FB).fillColor(lvC)
             .text(`${sc}점  ${lv} ${lname}`.trim(), MARGIN_L + 270, savedY - doc.currentLineHeight(true), { width: 220 });
          doc.fontSize(9).font(_F).fillColor('#94a3b8')
             .text(`(${meta.body})`, MARGIN_L, doc.y, { width: PAGE_W });
          doc.moveDown(0.5);
        });
      }

      // ── 3. 이중봉쇄 ──────────────────────────────────────
      _secTitle(doc, '2. 이중봉쇄 진단 (CAM + DLT)');
      const dlActive = dualLock.locked || dualLock.active || false;
      _bold(doc, `상태: ${dlActive ? '● 이중봉쇄 발동' : '○ 이중봉쇄 해제'}`);
      _body(doc, `경계축: ${(dualLock.criticalAxes||[]).join(', ') || '없음'}`);
      if (dualLock.reason) _body(doc, `사유: ${dualLock.reason}`);

      // ── 4~9. 서사엔진 섹션 ───────────────────────────────
      if (D) {
        _secTitle(doc, '3. DIAH 트리거 분석');
        if (D.sec4_triggers && D.sec4_triggers.length > 0) {
          D.sec4_triggers.forEach(tr => {
            if (_needPage(doc)) doc.addPage();
            _bold(doc, `${tr.code}  ${tr.name}`);
            _body(doc, tr.text);
          });
        } else {
          _body(doc, 'DIAH 트리거 없음 (정상 범위)');
        }
        if (D.sec4_summary) _body(doc, D.sec4_summary);

        _secTitle(doc, '4. 7M 기전 분석');
        _body(doc, `현재 기전: ${D.sec5_current || '0M'} — ${D.sec5_currentName || '정상'}`);
        _body(doc, D.sec5_currentText);

        if (D.sec6_paths && D.sec6_paths.length > 0) {
          _secTitle(doc, '5. 예후 3경로');
          D.sec6_paths.forEach(p => {
            if (_needPage(doc)) doc.addPage();
            _bold(doc, `${p.label}  ${p.prob ? '(' + p.prob + ')' : ''}`);
            _body(doc, p.text);
          });
        }

        _secTitle(doc, '6. 경제 가족력');
        _body(doc, D.sec8_narrative1997);
        _body(doc, D.sec8_narrative2008);
        _body(doc, D.sec8_common);

        if (D.sec9_prescriptions && D.sec9_prescriptions.length > 0) {
          _secTitle(doc, '7. 명의 처방');
          _body(doc, D.sec9_intro);
          D.sec9_prescriptions.forEach(p => {
            if (_needPage(doc)) doc.addPage();
            _bold(doc, p.title);
            _body(doc, p.text);
          });
        }
      }

      // ── 10. 면책 고지 ────────────────────────────────────
      _secTitle(doc, '8. 면책 고지');
      _body(doc, D?.sec10_disclaimer ||
        '본 보고서는 DIAH-7M 경제건강검진 시스템에 의해 자동 생성된 진단 결과서입니다. 투자 권유나 정책 제안이 아닙니다.');
      doc.moveDown(0.5);
      doc.fontSize(9).font(_F).fillColor('#94a3b8')
         .text('© 인체국가경제론 / DIAH-7M / 윤종원', MARGIN_L, doc.y, { width: PAGE_W, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ══════════════════════════════════════════════════════════
// renderJSON / renderHTML — 기존 유지
// ══════════════════════════════════════════════════════════

function renderJSON(diagnosis) {
  return JSON.stringify(diagnosis, null, 2);
}

function renderHTML(diagnosis) {
  const overall = diagnosis.overall || {};
  const axes    = diagnosis.axes    || {};
  const lvColor = LEVEL_COLORS_HEX[overall.level] || '#64748b';
  const lvName  = LEVEL_NAMES[overall.level] || '미판정';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>DIAH-7M 경제건강검진 보고서</title>
  <style>
    body{font-family:'Malgun Gothic',Arial,sans-serif;margin:40px;color:#334155;background:#f8fafc}
    h1{color:#0f172a;font-size:22px}
    h2{color:#1e293b;font-size:15px;border-bottom:2px solid #e2e8f0;padding-bottom:6px}
    .badge{display:inline-block;padding:4px 12px;border-radius:6px;color:#fff;font-weight:700;font-size:13px}
    table{border-collapse:collapse;width:100%;margin:12px 0}
    th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:left;font-size:13px}
    th{background:#f1f5f9;font-weight:700}
    tr:nth-child(even){background:#f8fafc}
    .footer{color:#94a3b8;font-size:11px;margin-top:40px;border-top:1px solid #e2e8f0;padding-top:12px}
  </style>
</head>
<body>
  <h1>DIAH-7M 국가경제 정밀진단 보고서</h1>
  <p>대한민국 | ${diagnosis.period || ''} | 생성: ${new Date().toLocaleDateString('ko-KR')}</p>

  <h2>종합 판정</h2>
  <p>
    <span class="badge" style="background:${lvColor}">L${overall.level || '?'} ${lvName}</span>
    &nbsp; 점수: <strong>${typeof overall.score === 'number' ? overall.score.toFixed(2) : 'N/A'}</strong> / 5.0
  </p>

  <h2>9축 진단</h2>
  <table>
    <tr><th>축</th><th>경제용어 (인체명칭)</th><th>점수</th><th>판정</th><th>게이지</th></tr>
    ${Object.entries(axes).map(([axId, ax]) => {
      const meta = AXIS_META[axId] || { eco: axId, body: '' };
      const lvC  = LEVEL_COLORS_HEX[ax.level?.level] || '#64748b';
      const lvN  = LEVEL_NAMES[ax.level?.level] || '';
      const sc   = typeof ax.score === 'number' ? ax.score.toFixed(2) : 'N/A';
      const gc   = ax.gauges ? ax.gauges.length : (ax.count || 0);
      return `<tr>
        <td><strong>${axId}</strong></td>
        <td>${meta.eco}<br><small style="color:#94a3b8">(${meta.body})</small></td>
        <td>${sc}</td>
        <td><span class="badge" style="background:${lvC};font-size:11px">${lvN}</span></td>
        <td>${gc}개</td>
      </tr>`;
    }).join('')}
  </table>

  <h2>이중봉쇄 (CAM+DLT)</h2>
  <p>${(diagnosis.dualLock || {}).active ? '이중봉쇄 발동' : '이중봉쇄 해제'} — ${(diagnosis.dualLock || {}).reason || ''}</p>

  <div class="footer">
    본 보고서는 DIAH-7M 경제건강검진 시스템에 의해 자동 생성된 진단 결과서입니다.<br>
    투자 권유나 정책 제안이 아니며, 참고용으로만 활용하시기 바랍니다.<br>
    © 인체국가경제론 / DIAH-7M / 윤종원
  </div>
</body>
</html>`;
}

module.exports = { renderDOCX, renderPDF, renderJSON, renderHTML };
