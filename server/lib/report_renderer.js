/**
 * DIAH-7M L4 Renderer v1.0
 * ══════════════════════════════════════════════
 * 
 * Layer 4 — 출력 형식 모듈
 * 
 * 이 파일은 레이아웃/양식을 하드코딩하지 않는다.
 * 모든 구조는 report_template.json에서 온다.
 * 모든 데이터는 miniJSON + profile + 수집데이터에서 온다.
 * 
 * 양식을 바꾸려면? → report_template.json을 수정한다.
 * 새 보고서 유형? → 새 template JSON을 만든다.
 * 새 도메인/국가? → 새 profile + template 조합.
 * 
 * 입력:
 *   1. template    - report_template.json (양식 정의)
 *   2. miniJSON    - 코어 엔진 출력
 *   3. diagnosis   - 전체 진단 결과 (dualLock, diah, crossSignals 등)
 *   4. profile     - Profile JSON (게이지 정의, 인체 비유 등)
 *   5. data        - 수집데이터 JSON (원시 값, 비고 등)
 * 
 * 출력: .docx 파일
 * 
 * 코어 금지규칙 준수:
 *   - Renderer는 scoring.thresholds 숫자를 출력하지 않는다 (security_filter)
 *   - Renderer는 confidential 필드를 자동 제외한다
 */

const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak
} = require('docx');

// ═══════════════════════════════════════════════
// 1. 유틸리티 — 템플릿에서 읽은 설정을 docx 요소로 변환
// ═══════════════════════════════════════════════

const PAGE_SIZES = {
  A4: { width: 11906, height: 16838 },
  LETTER: { width: 12240, height: 15840 },
};

// 기본 색상 팔레트 — template.styles.colors 없을 때 폴백
const DEFAULT_COLORS = {
  primary: "2C5F8A", accent: "D4463A", dark: "1B2A4A",
  green: "2E7D32", red: "C62828", border: "BDBDBD",
  gray: "757575", white: "FFFFFF",
};

function getColors(template) {
  return (template && template.styles && template.styles.colors) || DEFAULT_COLORS;
}

function getContentWidth(template) {
  const ps = PAGE_SIZES[(template.page && template.page.size)] || PAGE_SIZES.A4;
  const margin = (template.page && template.page.margin) || { left: 1440, right: 1440 };
  return ps.width - margin.left - margin.right;
}

function resolveColor(key, colors) {
  return colors[key] || key || "333333";
}

function statusColor(status, template) {
  const sm = template.styles && template.styles.status_map;
  if (!sm) return "333333";
  const entry = sm[status];
  if (entry) return resolveColor(entry.color_key, getColors(template));
  return "333333";
}

function statusScore(status, template) {
  const sm = template.styles.status_map;
  return sm[status] ? sm[status].score : 0;
}

// 템플릿 문자열 치환: "{변수}" → 실제 값
function interpolate(str, ctx) {
  if (!str) return "";
  return str.replace(/\{([^}]+)\}/g, (_, key) => {
    const val = resolveNested(ctx, key);
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

function resolveNested(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
}

// ═══════════════════════════════════════════════
// 2. DOCX 빌더 프리미티브
// ═══════════════════════════════════════════════

function makeBorder(color) {
  const b = { style: BorderStyle.SINGLE, size: 1, color: color || "BFC9D9" };
  return { top: b, bottom: b, left: b, right: b };
}

function makeHeaderCellEl(text, width, colors) {
  return new TableCell({
    borders: makeBorder(colors.border),
    width: { size: width, type: WidthType.DXA },
    shading: { fill: colors.primary, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: "center",
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: "FFFFFF", font: "Arial", size: 18 })]
    })]
  });
}

function makeCellEl(text, width, opts = {}) {
  const { bold, color, fill, align, size: sz, font: ft, borders: bd } = opts;
  return new TableCell({
    borders: bd || makeBorder(opts.borderColor || "BFC9D9"),
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: "center",
    children: [new Paragraph({
      alignment: align || AlignmentType.LEFT,
      children: [new TextRun({
        text: text || "", bold: bold || false, color: color || "333333",
        font: ft || "Arial", size: sz || 18
      })]
    })]
  });
}

function makeHeading(text, level) {
  const lvl = level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2;
  return new Paragraph({ heading: lvl, spacing: { before: 280, after: 120 }, children: [new TextRun({ text, font: "Arial" })] });
}

function makePara(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60, line: 320 },
    alignment: opts.align,
    children: [new TextRun({
      text, font: opts.font || "Arial", size: opts.size || 20,
      color: opts.color || "333333", bold: opts.bold || false, italics: opts.italics || false,
    })]
  });
}

function makeMultiRunPara(runs, opts = {}) {
  return new Paragraph({
    spacing: { before: opts.before || 60, after: opts.after || 60, line: opts.line || 320 },
    alignment: opts.align,
    children: runs.map(r => new TextRun({
      text: r.text, font: r.font || "Arial", size: r.size || 20,
      color: r.color || "333333", bold: r.bold || false, italics: r.italics || false,
    }))
  });
}

function spacer(h) { return new Paragraph({ spacing: { before: h || 100, after: 0 }, children: [] }); }
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

// ═══════════════════════════════════════════════
// 3. 데이터 추출기 — 수집데이터에서 게이지 행 자동 생성
// ═══════════════════════════════════════════════

function extractGaugeRows(data, profile, diagnosis) {
  const rows = [];
  const summary = data["수집완료_요약"] || {};

  // 판정_양호/주의/경보에서 code→상태 매핑 (ssot_engine 코드 기준)
  const statusMap = {};
  for (const g of (summary["판정_양호"] || [])) statusMap[g] = "양호";
  for (const g of (summary["판정_주의"] || [])) statusMap[g] = "주의";
  for (const g of (summary["판정_경보"] || [])) statusMap[g] = "경보";

  // ssot_engine 출력 배열 키 순서대로 수집
  const sectionKeys = [
    'sec2_gauges', 'sec3_gauges',
    'axis2_gauges', 'axis3_gauges', 'axis4_gauges',
    'axis5_gauges', 'axis6_gauges', 'axis7_gauges',
    'axis8_gauges', 'axis9_gauges',
  ];

  for (const sectionKey of sectionKeys) {
    const gaugeArr = data[sectionKey];
    if (!Array.isArray(gaugeArr)) continue;

    for (const g of gaugeArr) {
      // code 형식: "I1 무역수지(경상)" or "I1"
      const codeFull = g.code || '';
      const code = codeFull.split(' ')[0];
      const name = codeFull.split(' ').slice(1).join(' ') || g.name || code;
      const flow = g.cat || (sectionKey === 'sec2_gauges' ? 'Input' : sectionKey === 'sec3_gauges' ? 'Output' : 'Axis');
      const val = g.raw || g.value || (g._raw_num != null ? String(g._raw_num) : '-');
      const grade = g.grade || statusMap[code] || '-';

      rows.push({
        id: code,
        name,
        flow,
        val,
        detail: g.judge || g.narrative || '',
        metaphor: '',
        status: grade,
        score: grade.includes('경보') ? 2 : grade.includes('주의') ? 1 : 0,
        source: g._source || '',
        raw: g,
      });
    }
  }

  // 구형 "축" 접두사 형식 폴백 (레거시 호환)
  if (rows.length === 0) {
    for (const sectionKey of Object.keys(data)) {
      if (sectionKey.startsWith("축") && typeof data[sectionKey] === 'object') {
        for (const [gaugeKey, gaugeData] of Object.entries(data[sectionKey])) {
          const id = gaugeKey.split('_')[0];
          const name = gaugeKey.split('_').slice(1).join('_');
          const val = gaugeData["값"] || '-';
          rows.push({
            id, name, flow: '-', val, detail: gaugeData["비고"] || '',
            metaphor: '', status: statusMap[id] || '-',
            score: statusMap[id] === "양호" ? 0 : statusMap[id] === "주의" ? 1 : 2,
            source: gaugeData["출처"] || '', raw: gaugeData,
          });
        }
      }
    }
  }

  return rows;
}

function extractAuxRows(data) {
  const aux = data["보조정보"];
  if (!aux) return [];
  const rows = [];

  for (const [key, val] of Object.entries(aux)) {
    if (typeof val === 'string') {
      rows.push({ name: key, value: val });
    } else if (typeof val === 'object') {
      // 중첩 객체 → 주요 필드 합산
      const parts = [];
      for (const [k, v] of Object.entries(val)) {
        if (k !== '비고') parts.push(`${v}`);
      }
      const extra = val['비고'] ? ` (${val['비고']})` : '';
      rows.push({ name: key, value: parts.join(' / ') + extra });
    }
  }
  return rows;
}

// ═══════════════════════════════════════════════
// 4. 서사 자동 생성기 — miniJSON + profile + data → 텍스트
// ═══════════════════════════════════════════════

function generateNarratives(mini, diagnosis, gaugeRows, profile, data) {
  const n = {};
  const colors = { accent: "D4463A", dark: "1B2A4A", green: "2E7D32", primary: "2C5F8A" };

  // ── 방어적 초기화: 누락 필드 보강 ──
  if (!mini.in)  mini.in  = { score: 0, threshold: 0 };
  if (!mini.out) mini.out = { score: 0, threshold: 0 };
  if (!diagnosis.dualLock) diagnosis.dualLock = { active: false, contributors: { input_top3: [], output_top3: [] } };
  if (!diagnosis.dualLock.contributors) diagnosis.dualLock.contributors = { input_top3: [], output_top3: [] };
  if (!diagnosis.diah) diagnosis.diah = { activatedLetters: [], activated: {}, summary: '미발동' };
  if (!diagnosis.diah.activatedLetters) diagnosis.diah.activatedLetters = [];
  if (!diagnosis.diah.activated) diagnosis.diah.activated = {};
  if (!diagnosis.crossSignals) diagnosis.crossSignals = { active: [], inactive: [] };
  if (Array.isArray(diagnosis.crossSignals)) diagnosis.crossSignals = { active: diagnosis.crossSignals, inactive: [] };
  if (!diagnosis.crossSignals.active) diagnosis.crossSignals.active = [];

  // 단계 라벨
  const stageLabels = {
    factor: '요인 관측', trigger: '트리거 발동', dual_lock: '이중봉쇄(Dual Lock) 확정',
    manifestation: '발현 단계', result: '결과 확정'
  };
  n.stage_label = stageLabels[mini.stage] || mini.stage || '0M';

  // Input 서사
  const inContribs = diagnosis.dualLock.contributors.input_top3 || [];
  const inParts = inContribs.map(c => {
    const gr = gaugeRows.find(g => g.id === c.id);
    const statusLabel = gr ? gr.status : '';
    const detail = gr ? gr.detail : '';
    return `${c.name}(${c.id}, ${c.score}점 [${statusLabel}]): ${detail}`;
  });
  n.input_narrative = `Input 점수합 ${mini.in.score}/${mini.in.threshold}. ` + inParts.join('. ');

  // Output 서사
  const outContribs = diagnosis.dualLock.contributors.output_top3 || [];
  const outParts = outContribs.map(c => {
    const gr = gaugeRows.find(g => g.id === c.id);
    const statusLabel = gr ? gr.status : '';
    const detail = gr ? gr.detail : '';
    return `${c.name}(${c.id}, ${c.score}점 [${statusLabel}]): ${detail}`;
  });
  n.output_narrative = `Output 점수합 ${mini.out.score}/${mini.out.threshold}. ` + outParts.join('. ');

  // DIAH 서사
  const diahNames = { D: "결핍/유동성부족", I: "염증/사회마찰", A: "산증/인플레압력", H: "저산소/유동성함정" };
  const activeLetters = diagnosis.diah.activatedLetters || [];
  if (activeLetters.length > 0) {
    const parts = activeLetters.map(l => {
      const items = diagnosis.diah.activated[l] || [];
      const gaugeNames = items.map(i => `${i.name}(${i.gauge})`).join(', ');
      return `${l}(${diahNames[l]}): ${gaugeNames}`;
    });
    n.diah_narrative = `DIAH 트리거: ${diagnosis.diah.summary} 동시 발동. ` + parts.join('. ');
  } else {
    n.diah_narrative = "DIAH 트리거: 미발동.";
  }

  // 교차신호 서사
  if (diagnosis.crossSignals.active.length > 0) {
    n.cross_signal_narrative = diagnosis.crossSignals.active.map(cs =>
      `${cs.a}↔${cs.b} (Tier ${cs.tier}): ${cs.meaning}`
    ).join('. ');
  } else {
    n.cross_signal_narrative = "활성 교차신호 없음.";
  }

  // 인체 비유 서사 — 경보 게이지의 body_metaphor 자동 조합
  const alertGauges = gaugeRows.filter(g => g.score === 2);
  const watchGauges = gaugeRows.filter(g => g.score === 1);
  const normalGauges = gaugeRows.filter(g => g.score === 0);

  const metaphorParts = [];
  if (normalGauges.length > 0) {
    metaphorParts.push(normalGauges.map(g => `${g.metaphor || g.name}`).join(', ') + '은(는) 정상 범위');
  }
  if (alertGauges.length > 0) {
    metaphorParts.push(alertGauges.map(g => `${g.metaphor || g.name}`).join(', ') + ' 경보 수준');
  }
  if (watchGauges.length > 0) {
    metaphorParts.push(watchGauges.map(g => g.metaphor || g.name).slice(0, 3).join(', ') + ' 등 주의 필요');
  }
  n.body_metaphor_narrative = "인체 비유: " + metaphorParts.join('. ') + ".";

  // 위험/긍정/관측 포인트 자동 생성
  n.auto_risks = alertGauges.map(g =>
    `${g.name}(${g.id}) 경보: ${g.detail}`
  );
  // 주의 게이지 중 점수 높은 것도 추가
  watchGauges.slice(0, 3).forEach(g => {
    n.auto_risks.push(`${g.name}(${g.id}) 주의: ${g.detail}`);
  });

  n.auto_positives = normalGauges.map(g =>
    `${g.name}(${g.id}) 양호: ${g.detail}`
  );

  // 관측 포인트 — 경보 게이지 기반
  n.auto_watchpoints = [];
  alertGauges.forEach(g => {
    n.auto_watchpoints.push(`${g.name}: 다음 월 개선 여부 모니터링 필요.`);
  });
  // 교차신호 기반
  diagnosis.crossSignals.active.forEach(cs => {
    n.auto_watchpoints.push(`교차신호 ${cs.a}↔${cs.b}: ${cs.meaning} 지속 여부 관측.`);
  });
  // DIAH 기반
  activeLetters.forEach(l => {
    n.auto_watchpoints.push(`DIAH-${l}(${diahNames[l]}): 트리거 해소 여부 확인.`);
  });

  return n;
}

// ═══════════════════════════════════════════════
// 5. 섹션 렌더러 — template.sections 순회하며 docx children 생성
// ═══════════════════════════════════════════════

function renderSection(section, ctx) {
  const { template, mini, diagnosis, profile, data, gaugeRows, auxRows, narratives, colors } = ctx;
  const contentWidth = getContentWidth(template);
  const children = [];

  if (section.page_break_before) children.push(pageBreak());

  switch (section.type) {

    // ─── 표지 ───
    case 'cover': {
      children.push(spacer(2000));
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 100 },
        children: [new TextRun({ text: section.title_main, font: "Arial", size: 56, bold: true, color: colors.primary })]
      }));
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 60 },
        children: [new TextRun({ text: section.subtitle, font: "Arial", size: 24, color: "666666" })]
      }));
      children.push(spacer(200));

      const dynTitle = interpolate(section.dynamic_title, ctx.vars);
      const dynSub = interpolate(section.dynamic_subtitle, ctx.vars);
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 80 },
        children: [new TextRun({ text: dynTitle, font: "Arial", size: 36, bold: true, color: colors.dark })]
      }));
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 40 },
        children: [new TextRun({ text: dynSub, font: "Arial", size: 22, color: "888888" })]
      }));

      // 요약 박스
      if (section.summary_box && section.summary_box.show) {
        children.push(spacer(300));
        const alertLevel = mini.alert_level;
        const dualLockText = mini.dual_lock
          ? interpolate(section.summary_box.fields.find(f => f.label === "이중봉쇄")?.format_true || '', ctx.vars)
          : interpolate(section.summary_box.fields.find(f => f.label === "이중봉쇄")?.format_false || '', ctx.vars);

        const bigBorder = { style: BorderStyle.SINGLE, size: 3, color: colors.primary };
        children.push(new Table({
          width: { size: contentWidth, type: WidthType.DXA },
          columnWidths: [contentWidth],
          rows: [new TableRow({
            children: [new TableCell({
              borders: { top: bigBorder, bottom: bigBorder, left: bigBorder, right: bigBorder },
              width: { size: contentWidth, type: WidthType.DXA },
              shading: { fill: "EBF0F7", type: ShadingType.CLEAR },
              margins: { top: 200, bottom: 200, left: 300, right: 300 },
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
                  children: [new TextRun({ text: `경보 ${alertLevel}단계 — ${dualLockText}`, font: "Arial", size: 28, bold: true, color: colors.accent })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
                  children: [
                    new TextRun({ text: `Input ${mini.in.score}/${mini.in.threshold}`, font: "Arial", size: 20, color: colors.dark }),
                    new TextRun({ text: "  |  ", font: "Arial", size: 20, color: "AAAAAA" }),
                    new TextRun({ text: `Output ${mini.out.score}/${mini.out.threshold}`, font: "Arial", size: 20, color: colors.dark }),
                    new TextRun({ text: "  |  ", font: "Arial", size: 20, color: "AAAAAA" }),
                    new TextRun({ text: `DIAH: ${mini.diah_detail}`, font: "Arial", size: 20, bold: true, color: colors.accent }),
                  ] }),
                new Paragraph({ alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `양호 ${ctx.vars.양호} / 주의 ${ctx.vars.주의} / 경보 ${ctx.vars.경보}`, font: "Arial", size: 20, color: "555555" })] }),
              ]
            })]
          })]
        }));
      }

      // 메타 라인
      if (section.meta_line && section.meta_line.show) {
        children.push(spacer(300));
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `Engine: ${mini.engine}  |  Profile: ${mini.profile_hash}  |  Repro: ${mini.repro_key}`, font: "Arial", size: 14, color: "999999" }),
          ]
        }));
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 100 },
          children: [
            new TextRun({ text: `수집일: ${data["수집일"]}  |  신뢰도: ${mini.confidence} (축1 ${data["수집상태"]})`, font: "Arial", size: 14, color: "999999" }),
          ]
        }));
      }
      children.push(pageBreak());
      break;
    }

    // ─── 서사 섹션 ───
    case 'narrative': {
      children.push(makeHeading(interpolate(section.heading, ctx.vars), section.level));
      for (const p of section.paragraphs) {
        if (p.type === 'template') {
          children.push(makePara(interpolate(p.text, { ...ctx.vars, ...narratives, alert_level: mini.alert_level, stage_label: narratives.stage_label })));
        } else if (p.type === 'auto') {
          const text = narratives[p.source] || '';
          const label = p.label ? interpolate(p.label, { in_score: mini.in.score, in_threshold: mini.in.threshold, out_score: mini.out.score, out_threshold: mini.out.threshold }) : '';
          if (label) {
            children.push(makeMultiRunPara([
              { text: label + ": ", bold: true, color: colors.dark },
              { text, color: p.style === 'italic' ? "555555" : "333333", italics: p.style === 'italic' },
            ]));
          } else {
            children.push(makePara(text, { italics: p.style === 'italic', color: p.style === 'italic' ? "555555" : "333333" }));
          }
        }
      }
      break;
    }

    // ─── 게이지 테이블 ───
    case 'gauge_table': {
      children.push(makeHeading(interpolate(section.heading, ctx.vars), section.level));
      const cols = section.columns;
      const colWidths = cols.map(c => Math.round(contentWidth * c.width_pct / 100));

      // 헤더
      const headerRow = new TableRow({
        children: cols.map((c, i) => makeHeaderCellEl(c.label, colWidths[i], colors))
      });

      // 데이터 행
      const dataRows = gaugeRows.map(g => {
        const sc = statusColor(g.status, template);
        return new TableRow({
          children: [
            makeCellEl(g.id, colWidths[0], { bold: true, align: AlignmentType.CENTER, size: 16 }),
            makeCellEl(g.name, colWidths[1], { bold: true, size: 16 }),
            makeCellEl(g.flow, colWidths[2], { align: AlignmentType.CENTER, size: 16, color: g.flow === 'Input' ? colors.primary : "7B5EA7" }),
            makeCellEl(g.val, colWidths[3], { size: 16 }),
            makeCellEl(g.status, colWidths[4], { bold: true, align: AlignmentType.CENTER, color: sc, size: 16 }),
            makeCellEl(g.detail, colWidths[5], { size: 15, color: "555555" }),
          ]
        });
      });

      children.push(new Table({
        width: { size: contentWidth, type: WidthType.DXA },
        columnWidths: colWidths,
        rows: [headerRow, ...dataRows]
      }));
      break;
    }

    // ─── 이중봉쇄 분석 ───
    case 'dual_lock_analysis': {
      children.push(makeHeading(interpolate(section.heading, ctx.vars), section.level));
      children.push(makeMultiRunPara([
        { text: "판정 결과: ", bold: true },
        { text: diagnosis.dualLock.action, bold: true, color: colors.accent },
      ]));

      // 요약 테이블
      if (section.summary_table && section.summary_table.show) {
        children.push(spacer(100));
        const dlCols = section.summary_table.columns;
        const dlW = Math.round(contentWidth / dlCols.length);
        const dlWidths = dlCols.map(() => dlW);

        children.push(new Table({
          width: { size: contentWidth, type: WidthType.DXA },
          columnWidths: dlWidths,
          rows: [
            new TableRow({ children: dlCols.map((c, i) => makeHeaderCellEl(c, dlWidths[i], colors)) }),
            new TableRow({ children: [
              makeCellEl("Input (유입)", dlWidths[0], { bold: true }),
              makeCellEl(String(mini.in.score), dlWidths[1], { align: AlignmentType.CENTER, bold: true, color: colors.accent }),
              makeCellEl(String(mini.in.threshold), dlWidths[2], { align: AlignmentType.CENTER }),
              makeCellEl(mini.in.down ? "YES" : "NO", dlWidths[3], { align: AlignmentType.CENTER, bold: true, color: mini.in.down ? colors.red : colors.green }),
            ]}),
            new TableRow({ children: [
              makeCellEl("Output (배출)", dlWidths[0], { bold: true }),
              makeCellEl(String(mini.out.score), dlWidths[1], { align: AlignmentType.CENTER, bold: true, color: colors.accent }),
              makeCellEl(String(mini.out.threshold), dlWidths[2], { align: AlignmentType.CENTER }),
              makeCellEl(mini.out.down ? "YES" : "NO", dlWidths[3], { align: AlignmentType.CENTER, bold: true, color: mini.out.down ? colors.red : colors.green }),
            ]}),
          ]
        }));
      }

      // 기여 게이지
      for (const cs of (section.contributor_sections || [])) {
        children.push(spacer(100));
        children.push(makeHeading(cs.heading, cs.level));
        const key = cs.flow === 'input' ? 'input_top3' : 'output_top3';
        const contribs = diagnosis.dualLock.contributors[key] || [];
        contribs.slice(0, cs.top_n).forEach((c, i) => {
          const gr = gaugeRows.find(g => g.id === c.id);
          const statusLabel = gr ? gr.status : '';
          const detail = gr ? gr.detail : '';
          children.push(makePara(`${i + 1}위: ${c.name} (${c.id}) — ${c.score}점 [${statusLabel}]: ${detail}`));
        });
      }
      break;
    }

    // ─── DIAH 트리거 ───
    case 'diah_analysis': {
      children.push(makeHeading(interpolate(section.heading, ctx.vars), section.level));
      children.push(makeMultiRunPara([
        { text: "발동 코드: ", bold: true },
        { text: diagnosis.diah.summary, bold: true, color: colors.accent },
      ]));
      children.push(spacer(80));

      const diahNames = { D: "결핍/유동성부족", I: "염증/사회마찰", A: "산증/인플레압력", H: "저산소/유동성함정" };
      const diahCols = section.table_columns;
      const dW = Math.round(contentWidth / diahCols.length);
      const diahWidths = [dW, dW, dW, contentWidth - 3 * dW];

      const diahHeaderRow = new TableRow({ children: diahCols.map((c, i) => makeHeaderCellEl(c, diahWidths[i], colors)) });
      const diahDataRows = [];

      for (const letter of ['D', 'I', 'A', 'H']) {
        const items = diagnosis.diah.activated[letter] || [];
        const active = items.length > 0;

        if (active) {
          items.forEach(item => {
            const gr = gaugeRows.find(g => g.id === item.gauge);
            diahDataRows.push(new TableRow({ children: [
              makeCellEl(`${letter} (${diahNames[letter].split('/')[0]})`, diahWidths[0], { bold: true, color: colors.amber }),
              makeCellEl(item.code, diahWidths[1], { align: AlignmentType.CENTER }),
              makeCellEl(`${item.gauge} ${item.name}`, diahWidths[2]),
              makeCellEl(gr ? gr.detail : '', diahWidths[3], { size: 16 }),
            ]}));
          });
        } else if (section.show_inactive) {
          diahDataRows.push(new TableRow({ children: [
            makeCellEl(`${letter} (${diahNames[letter].split('/')[0]})`, diahWidths[0], { color: "999999" }),
            makeCellEl("-", diahWidths[1], { align: AlignmentType.CENTER, color: "999999" }),
            makeCellEl("-", diahWidths[2], { color: "999999" }),
            makeCellEl(section.inactive_label || "미발동", diahWidths[3], { color: "999999", size: 16 }),
          ]}));
        }
      }

      children.push(new Table({
        width: { size: contentWidth, type: WidthType.DXA },
        columnWidths: diahWidths,
        rows: [diahHeaderRow, ...diahDataRows]
      }));
      break;
    }

    // ─── 교차신호 ───
    case 'cross_signal_analysis': {
      children.push(makeHeading(interpolate(section.heading, ctx.vars), section.level));

      if (diagnosis.crossSignals.active.length > 0) {
        for (const cs of diagnosis.crossSignals.active) {
          children.push(makeMultiRunPara([
            { text: "활성 교차신호: ", bold: true },
            { text: `${cs.a} ↔ ${cs.b}`, bold: true, color: colors.accent },
            { text: ` (Tier ${cs.tier})` },
          ]));
          children.push(makePara(`의미: ${cs.meaning}`));
        }
      } else {
        children.push(makePara("활성 교차신호 없음."));
      }

      // 비활성 쌍 표시
      if (section.show_inactive_pairs) {
        children.push(spacer(80));
        children.push(makePara("주요 비활성 쌍:", { bold: true, color: "666666" }));
        const allPairs = [...(diagnosis.crossSignals.active || [])];
        const activePairKeys = new Set(allPairs.map(p => `${p.a}-${p.b}`));
        const inactivePairs = (profile.cross_signal_pairs || [])
          .filter(p => p.tier === 'A' && !activePairKeys.has(`${p.a}-${p.b}`))
          .slice(0, section.max_inactive || 3);
        for (const p of inactivePairs) {
          children.push(makePara(`${p.a}↔${p.b}: ${p.meaning} — 미발동.`, { color: "777777" }));
        }
      }
      break;
    }

    // ─── 보조지표 ───
    case 'auxiliary_table': {
      children.push(makeHeading(interpolate(section.heading, ctx.vars), section.level));
      const auxCols = section.columns;
      const auxWidths = auxCols.map(c => Math.round(contentWidth * c.width_pct / 100));

      const auxHeaderRow = new TableRow({ children: auxCols.map((c, i) => makeHeaderCellEl(c.label, auxWidths[i], colors)) });
      const auxDataRows = auxRows.map(r => new TableRow({
        children: [
          makeCellEl(r.name, auxWidths[0], { bold: true }),
          makeCellEl(r.value, auxWidths[1], { size: 16 }),
        ]
      }));

      children.push(new Table({
        width: { size: contentWidth, type: WidthType.DXA },
        columnWidths: auxWidths,
        rows: [auxHeaderRow, ...auxDataRows]
      }));
      break;
    }

    // ─── 종합 판정 ───
    case 'verdict': {
      children.push(makeHeading(interpolate(section.heading, ctx.vars), section.level));
      children.push(makeMultiRunPara([
        { text: "종합 판정: ", bold: true, color: colors.dark },
        { text: `경보 ${mini.alert_level}단계`, bold: true, color: colors.accent },
        { text: mini.dual_lock ? " (이중봉쇄 확정)" : "" },
      ]));

      for (const sub of (section.subsections || [])) {
        children.push(spacer(100));
        const labelColor = sub.style === 'accent' ? colors.accent : sub.style === 'green' ? colors.green : colors.primary;
        children.push(makePara(`${sub.label}:`, { bold: true, color: labelColor }));

        const items = narratives[sub.source] || [];
        items.forEach((item, i) => {
          children.push(makePara(`${i + 1}) ${item}`));
        });
      }
      break;
    }

    // ─── 미니 JSON 원문 ───
    case 'raw_json': {
      children.push(makeHeading(interpolate(section.heading, ctx.vars), section.level));
      const json = JSON.stringify(mini, null, 2);
      for (const line of json.split('\n')) {
        children.push(new Paragraph({
          spacing: { before: 0, after: 0, line: 240 },
          children: [new TextRun({ text: line, font: template.styles.fonts.mono, size: 16, color: "444444" })]
        }));
      }
      break;
    }

    // ─── 종료 마크 ───
    case 'endmark': {
      children.push(spacer(300));
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `——— ${section.text} ———`, font: "Arial", size: 16, color: "BBBBBB" })]
      }));
      if (section.show_meta) {
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { before: 60 },
          children: [
            new TextRun({ text: `DIAH-7M Core Engine v${(profile.meta && profile.meta.version) || '5.1'}  |  Profile: ${mini.profile_hash}  |  Repro: ${mini.repro_key}`, font: "Courier New", size: 14, color: "CCCCCC" }),
          ]
        }));
      }
      break;
    }
  }

  return children;
}

// ═══════════════════════════════════════════════
// 6. 메인 렌더 함수 — 외부에서 호출하는 유일한 진입점
// ═══════════════════════════════════════════════

/**
 * 보고서 렌더링 메인 함수
 * 
 * @param {Object} opts
 * @param {Object} opts.template     - report_template.json
 * @param {Object} opts.miniJSON     - 코어 엔진 미니 JSON 출력
 * @param {Object} opts.diagnosis    - 전체 진단 결과
 * @param {Object} opts.profile      - Profile JSON
 * @param {Object} opts.data         - 수집데이터 JSON
 * @param {string} opts.outputPath   - 출력 파일 경로
 * @returns {Promise<Buffer>}
 */
async function render(opts) {
  const { template, miniJSON: mini, diagnosis, profile, data, outputPath } = opts;

  // ── 데이터 추출 ──
  const gaugeRows = extractGaugeRows(data, profile, diagnosis);
  const auxRows = extractAuxRows(data);
  const summary = data["수집완료_요약"];

  // ── 변수 맵 (템플릿 치환용) ──
  const vars = {
    기준월: data["기준월"],
    수집일: data["수집일"],
    총게이지: summary["총게이지"],
    양호: (summary["판정_양호"] || []).length,
    주의: (summary["판정_주의"] || []).length,
    경보: (summary["판정_경보"] || []).length,
    engine_id: mini.engine,
    profile_hash: mini.profile_hash,
    repro_key: mini.repro_key,
  };

  // ── 서사 자동 생성 ──
  const narratives = generateNarratives(mini, diagnosis, gaugeRows, profile, data);

  // ── 색상 맵 ──
  const colors = getColors(template);

  // ── 컨텍스트 객체 ──
  const ctx = { template, mini, diagnosis, profile, data, gaugeRows, auxRows, narratives, colors, vars };

  // ── 섹션 순회하며 children 생성 ──
  const allChildren = [];
  for (const section of template.sections) {
    const sectionChildren = renderSection(section, ctx);
    allChildren.push(...sectionChildren);
  }

  // ── 문서 생성 ──
  const ps = PAGE_SIZES[(template.page && template.page.size)] || PAGE_SIZES.A4;
  const _fonts = (template.styles && template.styles.fonts) || { body: "Malgun Gothic", heading: "Malgun Gothic" };
  const _header = (template.header && template.header.format) || 'DIAH-7M | {{기준월}}';
  const headerText = interpolate(_header, { engine_id: mini.engine, 기준월: data["기준월"] || '' });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: _fonts.body || "Malgun Gothic", size: 20 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 32, bold: true, font: _fonts.heading || "Malgun Gothic", color: colors.dark },
          paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 26, bold: true, font: template.styles.fonts.heading, color: colors.primary },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: ps.width, height: ps.height },
          margin: (template.page && template.page.margin) || { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: (template.header && template.header.show) ? {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: headerText, font: "Arial", size: 14, color: "AAAAAA" })]
          })]
        })
      } : undefined,
      footers: (template.footer && template.footer.show) ? {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "CONFIDENTIAL  |  Page ", font: "Arial", size: 14, color: "AAAAAA" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 14, color: "AAAAAA" }),
            ]
          })]
        })
      } : undefined,
      children: allChildren
    }]
  });

  const buffer = await Packer.toBuffer(doc);

  if (outputPath) {
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ 보고서 생성 완료: ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  }

  return buffer;
}

// ═══════════════════════════════════════════════
// 내보내기
// ═══════════════════════════════════════════════

module.exports = { render, extractGaugeRows, extractAuxRows, generateNarratives };
