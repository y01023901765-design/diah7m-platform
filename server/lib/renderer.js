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
const ALERT_COLORS  = [C.lv0, C.lv1, C.lv2, C.lv3];
const ALERT_LABELS  = ['0단계: 정상', '1단계: 주의', '2단계: 경계', '3단계: 위험'];
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
    p([t('진단 엔진: 판정 v5.1 / 서사 v2.8', { size: S.sm, color: C.light })],
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

// ── 물리흐름 진단 — 위성데이터 종합 ─────────────────────
function buildSatelliteOverview(d) {
  const sat = d.satellite || {};
  return [
    ...sectionHeader('위성.', '물리흐름 진단 — 위성데이터 종합',
                     '정부 통계가 아닌 물리적 증거로 경제를 본다'),
    diagBox([
      p([t('DIAH-7M은 정부 발표 통계만으로 진단하지 않는다. 위성이 촬영한 물리적 증거—불빛, 대기오염, 지표면 온도, 건축물 변화—를 경제 활력의 객관적 실측치로 사용한다.',
          { size: S.body, bold: true, color: C.navy })], { after: 0 }),
    ], C.bgBox),

    p([t('인체비유: 환자의 자기 보고(정부 통계)만 듣는 것이 아니라, CT/MRI/혈액검사(위성 실측)로 몸 속을 직접 들여다본다.',
        { size: S.body, color: C.mid })], { after: 200 }),

    subHeader('투입 위성 데이터'),
    tbl([
      rw([hcl('위성/센서', 1400), hcl('측정 대상', 1600), hcl('인체 비유', 1400), hcl('적용 게이지', 900), hcl('현재 판독', 3326)]),
      ...[
        ['NASA VIIRS DNB',      '야간 인공광 방사량',     '뇌활동 (경제활동 강도)',    'S3_NL',    sat.viirs || '(데이터 수집 중)'],
        ['GEMS 환경위성',        'NO₂ 농도',              '폐점막 (대기오염·산업)',     'S3',       sat.gems  || '(순차 확대 예정)'],
        ['Landsat-9 TIR',       '지표면 열적외선 온도',   '체온·체표온도 (열환경)',     'R6, R8',   sat.lst   || '(데이터 수집 중)'],
        ['Sentinel-1 SAR',      '레이더 후방산란',        '근육·뼈 (구조변화·건설)',    'R5',       sat.sar   || '(순차 확대 예정)'],
        ['Sentinel-2 광학',     '다중분광 반사율',        '피부·조직 (토지이용 변화)',   'R7',       sat.s2    || '(순차 확대 예정)'],
        ['Sentinel-5P TROPOMI', 'PM2.5 추정 농도',        '폐·혈액 (대기 환경 부하)',   'G6',       sat.s5p   || '(순차 확대 예정)'],
      ].map((r, i) => rw([
        cl(r[0], { w: 1400, bold: true, fs: S.sm, bg: altBg(i) }),
        cl(r[1], { w: 1600, fs: S.sm, bg: altBg(i) }),
        cl(r[2], { w: 1400, fs: S.sm, fc: C.accent, bg: altBg(i) }),
        cl(r[3], { w: 900,  fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
        cl(r[4], { w: 3326, fs: S.sm, bg: altBg(i) }),
      ])),
    ], [1400, 1600, 1400, 900, 3326]),

    subHeader('물리 실측 vs 정부 통계 — 괴리 진단'),
    p([t('위성 데이터의 가장 강력한 기능은 정부 통계와의 괴리를 감지하는 것이다. 통계는 정상인데 위성은 이상을 보이면, 아직 통계에 잡히지 않은 변화가 물리적으로 시작된 것이다.',
        { size: S.body })], { after: 120 }),

    tbl([
      rw([hcl('비교 항목', 2000), hcl('정부 통계', 2400), hcl('위성 실측', 2400), hcl('괴리 판정', 2226)]),
      ...[
        ['산업활동·대기질', sat.factoryStat || '(통계 수치)', sat.factorySat || '(NO₂ 실측)', sat.factoryGap || '(괴리 판정)'],
        ['부동산 공정률',   sat.realEstateStat || '(분양 공정률)', sat.realEstateSat || '(SAR 높이 실측)', sat.realEstateGap || '(괴리 판정)'],
        ['신축 입주율',     sat.moveInStat || '(입주 보고)', sat.moveInSat || '(야간광 실측)', sat.moveInGap || '(괴리 판정)'],
        ['지역 경제 활력',  sat.regionStat || '(GRDP 통계)', sat.regionSat || '(야간광+NO₂)', sat.regionGap || '(괴리 판정)'],
      ].map((r, i) => rw([
        cl(r[0], { w: 2000, bold: true, fs: S.sm, bg: altBg(i) }),
        cl(r[1], { w: 2400, fs: S.sm, bg: altBg(i) }),
        cl(r[2], { w: 2400, fs: S.sm, bg: altBg(i) }),
        cl(r[3], { w: 2226, fs: S.sm, bold: true, fc: C.navy, align: AlignmentType.CENTER, bg: altBg(i) }),
      ])),
    ], [2000, 2400, 2400, 2226]),

    subHeader('위성 종합 판독'),
    diagBox([
      p([t(sat.overallVerdict || '현재 위성 데이터와 정부 통계 간 유의미한 괴리는 감지되지 않았다.',
          { size: S.body, bold: true, color: C.navy })], { after: 40 }),
      p([t(sat.overallDetail || 'A4축(부동산) R5~R9 위성 실측은 분기별 업데이트 주기를 가지므로, 직전 분기 대비 변동을 기준으로 판독한다.',
          { size: S.sm, color: C.mid })], { after: 0 }),
    ], C.bgBox),
  ];
}

// ── 종합 판정 ─────────────────────────────────────────────
function buildOverallVital(d) {
  const axes9 = [
    { id: '축1', name: '순환계/심장폐', organ: '심폐계', gauges: 12 },
    { id: '축2', name: '무역/제조',     organ: '동맥혈류', gauges: 6 },
    { id: '축3', name: '골목시장',      organ: '미세혈관', gauges: 5 },
    { id: '축4', name: '부동산',        organ: '뼈',       gauges: 9 },
    { id: '축5', name: '고용/가계',     organ: '근육신경', gauges: 5 },
    { id: '축6', name: '지역균형',      organ: '좌우대칭', gauges: 7 },
    { id: '축7', name: '금융스트레스',  organ: '혈액의질', gauges: 5 },
    { id: '축8', name: '에너지/자원',   organ: '산소공급', gauges: 5 },
    { id: '축9', name: '인구/노화',     organ: '신체나이', gauges: 5 },
  ];

  return [
    ...sectionHeader('1.', '종합 판정 (Overall Vital Sign)', '전체 게이지 채점 결과'),
    subHeader('9축 대시보드'),

    tbl([
      rw([hcl('축', 500), hcl('이름', 1400), hcl('장기비유', 1100), hcl('게이지', 600), hcl('상태', 700), hcl('경보', 900), hcl('한줄 소견', 3826)]),
      ...axes9.map((ax, i) => {
        const ad  = (d.axes || {})[ax.id] || {};
        const sc  = STATUS_COLOR[ad.status]  || C.mid;
        const sl  = { normal: '정상', caution: '주의', alert: '경보' }[ad.status] || '—';
        return rw([
          cl(ax.id,   { w: 500,  fs: S.sm, align: AlignmentType.CENTER, bold: true, bg: altBg(i) }),
          cl(ax.name, { w: 1400, bold: true, fs: S.sm, bg: altBg(i) }),
          cl(ax.organ,{ w: 1100, fs: S.sm, fc: C.accent, bg: altBg(i) }),
          cl(`${ad.gaugeCount || ax.gauges}개`, { w: 600, fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
          cl(sl,      { w: 700,  fs: S.sm, align: AlignmentType.CENTER, bold: true, fc: sc, bg: altBg(i) }),
          cl(`${ad.stars || 0}★ / ${ad.cautions || 0}●`, { w: 900, fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
          cl(ad.oneLiner || '—', { w: 3826, fs: S.sm, bg: altBg(i) }),
        ]);
      }),
    ], [500, 1400, 1100, 600, 700, 900, 3826]),

    subHeader('경보 판정'),
    p([t(d.alertSummary || '• Input★ 합계: 0개  •  Output★ 합계: 0개', { size: S.body })],
      { after: 80 }),
    diagBox([
      p([t(`→ 경보 단계: ${d.alertLabel || '0단계 — 정상'}`, { size: S.t3, bold: true, color: C.navy })],
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
  for (const g of gauges) {
    elements.push(gaugeTitle(g.code, g.name, g.value || '—', g.organMetaphor || '—'));
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
        p([t(path.body,  { size: S.body })], { after: 0 }),
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
      p([t(rx.body,  { size: S.body })], { after: 120 }),
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
      ...sources.map((s, i) => rw([
        cl(s[0], { w: 600,  fs: S.sm, align: AlignmentType.CENTER, bg: altBg(i) }),
        cl(s[1], { w: 1600, fs: S.sm, bg: altBg(i) }),
        cl(s[2], { w: 1800, fs: S.sm, bg: altBg(i) }),
        cl(s[3], { w: 1600, fs: S.sm, bg: altBg(i) }),
        cl(s[4], { w: 3426, fs: S.sm, bg: altBg(i) }),
      ])),
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

  // 경보 레벨 매핑 (0~3단계)
  const rawLevel = overall.level ?? overall.stage ?? 0;
  const alertLevel = Math.min(Math.max(parseInt(rawLevel) || 0, 0), 3);

  // CAM/DLT 상태
  const dualLock = diagnosis.dualLock || {};
  const camStatus = dualLock.cam?.status || (dualLock.active ? '봉쇄' : '정상');
  const dltStatus = dualLock.dlt?.status || (dualLock.active ? '봉쇄' : '정상');

  // DIAH 상태
  const diah = diagnosis.diah || {};
  const diahTrigger = (diah.activatedLetters || []).length > 0
    ? (diah.activatedLetters || []).join('/') + ' 활성'
    : '전원 비활성';

  // 9축 상태 매핑
  const axesData = {};
  const axes = diagnosis.axes || {};
  const axMap = { A1:'축1', A2:'축2', A3:'축3', A4:'축4', A5:'축5', A6:'축6', A7:'축7', A8:'축8', A9:'축9' };
  for (const [key, axId] of Object.entries(axMap)) {
    const ax = axes[key] || axes[axId] || {};
    axesData[axId] = {
      gaugeCount: ax.count || ax.gaugeCount || 0,
      status:     ax.status || 'normal',
      stars:      ax.stars  || ax.alertCount   || 0,
      cautions:   ax.cautions || ax.cautionCount || 0,
      oneLiner:   ax.oneLiner || ax.summary || '—',
    };
  }

  // ── 서사엔진 D 객체 → d 매핑 (실제 D 키 기준) ──────────
  const d = {
    // 기본 메타
    country:      '대한민국',
    baseMonth:    period.replace('-', '년 ') + '월',
    writeDate:    now.toLocaleDateString('ko-KR'),
    alertLevel,
    alertLabel:   `${alertLevel}단계 — ${['정상','주의','경계','위험'][alertLevel]}`,
    alertSubtitle: D?.alertLevel != null ? `경보 ${D.alertLevel}단계` : '전체 게이지 종합판정',
    camStatus:    D?.camStatus  || camStatus,
    dltStatus:    D?.dltStatus  || dltStatus,
    camDetail:    D?.camStatus  || camStatus,
    dltDetail:    D?.dltStatus  || dltStatus,
    camExplain:   '',
    dltExplain:   '',
    dualBlockade: D?.dualBlockade || (dualLock.active ? '이중봉쇄 발동' : '없음'),
    dualBlockadeDetail: D?.dualBlockade || (dualLock.active ? '이중봉쇄 발동' : '없음'),
    diahTrigger,

    // 임상 소견 — D.oneLiner / D.sec1_alertNarrative / D.sec1_detail
    clinicalTitle:    D?.oneLiner || '',
    clinicalOneLiner: D?.oneLiner || '',
    clinicalBody:     D?.sec1_detail || '',
    clinicalPathology:D?.sec1_alertNarrative || '',

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
    trendWarning:     D?.sec7_monthly   || '',

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
  if (gaugeArr.length > 0) return gaugeArr;

  // fallback: diagnosis.axes 원본
  const axData = (diagnosis.axes || {})[axisKey] || {};
  const gauges = axData.gauges || [];
  return gauges.map(g => ({
    code:          g.code || g.id || '—',
    name:          g.name || '—',
    value:         g.value != null ? String(g.value) : '—',
    change:        g.change || '—',
    grade:         g.grade || '—',
    status:        g.status || 'normal',
    organMetaphor: g.organMetaphor || g.metaphor || '—',
    narrative:     g.narrative || [],
    diagnosis:     g.diagnosis || '—',
  }));
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

async function renderDOCX(diagnosis, meta = {}) {
  // 1) 서사엔진 실행
  let D = null;
  if (narrativeEngine && narrativeEngine.generateNarrative) {
    try {
      D = narrativeEngine.generateNarrative(
        diagnosis,
        {},
        {
          month:         meta.month || diagnosis.period || new Date().toISOString().slice(0, 7),
          writeDate:     new Date().toLocaleDateString('ko-KR'),
          engineVersion: 'DIAH-7M v5.1 + 서사엔진 v2.8',
        }
      );
    } catch (ne) {
      console.warn('[renderer] generateNarrative 실패:', ne.message);
    }
  }

  // 2) d 객체 빌드
  const d = _buildDataObject(diagnosis, D, meta);

  // 3) 9축 게이지 데이터 빌드
  const AX_DEF = [
    { key:'A1', num:'A1.', name:'순환계 — 심장/폐', organ:'심폐계',    q:'심장과 폐가 정상인가?' },
    { key:'A2', num:'A2.', name:'무역/제조업',        organ:'동맥 혈류', q:'대동맥에 피가 잘 흐르는가?' },
    { key:'A3', num:'A3.', name:'골목시장',            organ:'미세혈관', q:'손끝 세포까지 산소가 가는가?' },
    { key:'A4', num:'A4.', name:'부동산 X-ray',        organ:'뼈',       q:'뼈에 금이 갔는가?' },
    { key:'A5', num:'A5.', name:'고용/가계',            organ:'근육+신경',q:'근육에 힘이 있는가?' },
    { key:'A6', num:'A6.', name:'지역균형',             organ:'좌우 대칭',q:'한쪽이 마비되지 않았는가?' },
    { key:'A7', num:'A7.', name:'금융스트레스',         organ:'혈액의 질',q:'피가 탁하지 않은가?' },
    { key:'A8', num:'A8.', name:'에너지/자원',          organ:'산소 공급원',q:'산소통에 산소가 남아있는가?' },
    { key:'A9', num:'A9.', name:'인구/노화',            organ:'신체 나이',q:'이 몸은 몇 살인가?' },
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

function _pdfSectionTitle(doc, text) {
  doc.moveDown(1.2);
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#1e293b').text(text);
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').fillColor('#334155');
}

function _pdfBodyText(doc, text) {
  if (!text) return;
  doc.fontSize(10).font('Helvetica').fillColor('#334155').text(String(text), { lineGap: 3 });
  doc.moveDown(0.3);
}

function _pdfAddFooter(doc, pageNum) {
  const bottom = doc.page.height - 35;
  doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
     .text('DIAH-7M | 인체국가경제론 | 참고용 진단 보고서', 50, bottom, { align: 'left', width: 400 })
     .text(`${pageNum}`, 50, bottom, { align: 'right', width: 495 });
}

async function renderPDF(diagnosis, outputStream) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 60, left: 50, right: 50 },
        bufferPages: true,
        ownerPassword: process.env.PDF_OWNER_PASSWORD || 'diah7m-admin-2026',
        permissions: {
          printing: 'highResolution',
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: false,
          contentAccessibility: true,
          documentAssembly: false,
        },
      });
      doc.pipe(outputStream);

      let D = null;
      if (narrativeEngine && narrativeEngine.generateNarrative) {
        try {
          D = narrativeEngine.generateNarrative(diagnosis, {}, {
            month:    diagnosis.period || new Date().toISOString().slice(0, 7),
            writeDate:new Date().toLocaleDateString('ko-KR'),
            engineVersion: 'DIAH-7M v5.1 + 서사엔진 v2.8',
          });
        } catch (ne) { console.warn('[renderer/pdf] generateNarrative 실패:', ne.message); }
      }

      const overall = diagnosis.overall || {};
      const axes    = diagnosis.axes    || {};
      const cross   = diagnosis.crossSignals || [];
      const dualLock= diagnosis.dualLock || {};
      const period  = diagnosis.period || new Date().toISOString().slice(0, 7);
      const lvColor = LEVEL_COLORS_HEX[overall.level] || '#64748b';
      let pageNum = 1;

      // 표지
      doc.fontSize(22).font('Helvetica-Bold').fillColor('#0f172a')
         .text('DIAH-7M 경제 건강검진 보고서', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(13).font('Helvetica').fillColor('#475569')
         .text(`대한민국 | ${period}`, { align: 'center' });
      doc.moveDown(1.5);
      const bx = 150, bw = 295, bh = 80;
      doc.roundedRect(bx, doc.y, bw, bh, 8).fillColor(lvColor + '18').fill();
      const boxTop = doc.y + 12;
      doc.fontSize(26).font('Helvetica-Bold').fillColor(lvColor)
         .text(`L${overall.level || '?'} ${LEVEL_NAMES[overall.level] || '미판정'}`,
                bx, boxTop, { width: bw, align: 'center' });
      doc.moveDown(2);
      doc.fontSize(9).font('Helvetica').fillColor('#94a3b8')
         .text(`생성일: ${new Date().toLocaleDateString('ko-KR')} | DIAH-7M v5.1 + 서사엔진 v2.8`, { align: 'center' });
      _pdfAddFooter(doc, pageNum++);
      doc.addPage();

      // 9축 채점표
      _pdfSectionTitle(doc, '1. 9축 종합 채점표');
      Object.entries(axes).forEach(([axId, ax]) => {
        const meta = AXIS_META[axId] || { eco: axId, body: '' };
        const lvC  = LEVEL_COLORS_HEX[ax.level?.level] || '#64748b';
        const sc   = typeof ax.score === 'number' ? ax.score.toFixed(2) : 'N/A';
        const rowY = doc.y;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b')
           .text(`${axId} ${meta.eco}`, 50, rowY, { width: 220 });
        doc.fontSize(9).font('Helvetica').fillColor('#64748b')
           .text(`(${meta.body})`, 50, rowY + 14, { width: 220 });
        doc.fontSize(10).font('Helvetica-Bold').fillColor(lvC)
           .text(sc, 290, rowY + 5, { width: 120 });
        doc.moveDown(1.4);
        if (doc.y > 720) { _pdfAddFooter(doc, pageNum++); doc.addPage(); }
      });

      // 이중봉쇄
      if (doc.y > 650) { _pdfAddFooter(doc, pageNum++); doc.addPage(); }
      _pdfSectionTitle(doc, '2. 이중봉쇄 (CAM + DLT)');
      _pdfBodyText(doc, `상태: ${dualLock.active ? '이중봉쇄 발동' : '이중봉쇄 해제'}`);
      _pdfBodyText(doc, `경계축: ${(dualLock.criticalAxes||[]).join(', ') || '없음'}`);

      // 서사엔진 섹션들
      if (D) {
        if (doc.y > 600) { _pdfAddFooter(doc, pageNum++); doc.addPage(); }
        _pdfSectionTitle(doc, '4. DIAH 트리거 분석');
        if (D.sec4_triggers) D.sec4_triggers.forEach(tr => {
          doc.fontSize(11).font('Helvetica-Bold').fillColor('#475569').text(`${tr.code} — ${tr.name}`);
          _pdfBodyText(doc, tr.text);
          if (doc.y > 720) { _pdfAddFooter(doc, pageNum++); doc.addPage(); }
        });
        if (D.sec4_summary) _pdfBodyText(doc, D.sec4_summary);

        if (doc.y > 650) { _pdfAddFooter(doc, pageNum++); doc.addPage(); }
        _pdfSectionTitle(doc, '5. 7M 기전 분석');
        _pdfBodyText(doc, `현재 기전: ${D.sec5_current || '0M'} — ${D.sec5_currentName || '정상'}`);
        _pdfBodyText(doc, D.sec5_currentText);

        if (D.sec6_paths && D.sec6_paths.length > 0) {
          if (doc.y > 650) { _pdfAddFooter(doc, pageNum++); doc.addPage(); }
          _pdfSectionTitle(doc, '6. 예후 3경로');
          D.sec6_paths.forEach(p => {
            doc.fontSize(11).font('Helvetica-Bold').text(`${p.label} (${p.prob || ''})`);
            _pdfBodyText(doc, p.text);
            if (doc.y > 720) { _pdfAddFooter(doc, pageNum++); doc.addPage(); }
          });
        }

        if (doc.y > 650) { _pdfAddFooter(doc, pageNum++); doc.addPage(); }
        _pdfSectionTitle(doc, '8. 경제 가족력');
        _pdfBodyText(doc, D.sec8_narrative1997);
        _pdfBodyText(doc, D.sec8_narrative2008);
        _pdfBodyText(doc, D.sec8_common);

        if (D.sec9_prescriptions && D.sec9_prescriptions.length > 0) {
          if (doc.y > 650) { _pdfAddFooter(doc, pageNum++); doc.addPage(); }
          _pdfSectionTitle(doc, '9. 명의 처방');
          _pdfBodyText(doc, D.sec9_intro);
          D.sec9_prescriptions.forEach(p => {
            doc.fontSize(11).font('Helvetica-Bold').text(p.title);
            _pdfBodyText(doc, p.text);
            if (doc.y > 720) { _pdfAddFooter(doc, pageNum++); doc.addPage(); }
          });
        }
      }

      // 면책
      if (doc.y > 680) { _pdfAddFooter(doc, pageNum++); doc.addPage(); }
      _pdfSectionTitle(doc, '10. 면책 고지');
      _pdfBodyText(doc, D?.sec10_disclaimer ||
        '본 보고서는 DIAH-7M 경제건강검진 시스템에 의해 자동 생성된 진단 결과서입니다. 투자 권유나 정책 제안이 아닙니다.');
      _pdfBodyText(doc, '© 인체국가경제론 / DIAH-7M / 윤종원');

      _pdfAddFooter(doc, pageNum);
      doc.end();
      doc.on('end', () => { console.log('[renderer/pdf] PDF 생성 완료'); resolve(); });
      doc.on('error', reject);
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
