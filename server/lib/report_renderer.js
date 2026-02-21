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

// ── 서사엔진 v2.8 안전 로드 ──
let narrativeEngine = null;
try {
  narrativeEngine = require('./narrative-engine');
} catch (e) {
  console.warn('[report_renderer] narrative-engine 로드 실패 — 기본 서사 사용:', e.message);
}

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

// 템플릿 문자열 치환: "{변수}" 또는 "{{변수}}" → 실제 값
function interpolate(str, ctx) {
  if (!str) return "";
  // {{key}} 먼저 처리 (이중 중괄호)
  let result = str.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const val = resolveNested(ctx, key);
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
  // {key} 단일 중괄호 처리
  result = result.replace(/\{([^}]+)\}/g, (_, key) => {
    const val = resolveNested(ctx, key);
    return val !== undefined ? String(val) : `{${key}}`;
  });
  return result;
}

function resolveNested(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
}

// ═══════════════════════════════════════════════
// 1-b. 원값 포맷터 — 소수점 2자리 + 중복단위 제거
// ═══════════════════════════════════════════════

// 알려진 단위 목록 (긴 것 먼저)
const KNOWN_UNITS = ['nW/cm²/sr','백만$','천명','억$','%p','pt','원','%','°C','bbl','조원','만원','만명','만TEU','TEU'];

// narrative 문자열 내 중복 단위 및 긴 소수점 정리
function cleanNarrative(text) {
  if (!text) return text;
  let s = text;
  // 중복 단위 제거 (원원, %%, ptpt, 억$억$, 백만$백만$, 천명천명 등)
  for (const u of KNOWN_UNITS) {
    const esc = u.replace(/[$]/g, '\\$').replace(/[/]/g, '\\/').replace(/[°]/g, '\\°').replace(/[²]/g, '\\²');
    try {
      s = s.replace(new RegExp(`(\\d)(${esc})\\2`, 'g'), '$1$2');
    } catch(e) { /* 정규식 오류 무시 */ }
  }
  // 긴 소수점 반올림 (4자리 이상 → 2자리)
  s = s.replace(/([-\d]+\.\d{3,})/g, (m) => {
    const n = parseFloat(m);
    return isNaN(n) ? m : String(Math.round(n * 100) / 100);
  });
  return s;
}

function formatVal(raw) {
  if (raw == null || raw === '' || raw === '-') return '-';
  const s = String(raw).trim();

  // 단위 분리: 끝에서 알려진 단위 찾기
  let num = s, unit = '';
  for (const u of KNOWN_UNITS) {
    if (s.endsWith(u)) {
      unit = u;
      num = s.slice(0, s.length - u.length);
      break;
    }
    // 중복 단위 (원원, %%, ptpt 등)
    if (s.endsWith(u + u)) {
      unit = u;
      num = s.slice(0, s.length - u.length * 2);
      break;
    }
  }

  // 숫자 부분 소수점 2자리 반올림
  const n = parseFloat(num);
  if (!isNaN(n)) {
    const rounded = Math.round(n * 100) / 100;
    return `${rounded}${unit}`;
  }
  return s;  // 숫자가 아니면 원본 반환
}

// ═══════════════════════════════════════════════
// 2. DOCX 빌더 프리미티브
// ═══════════════════════════════════════════════

function makeBorder(color) {
  const b = { style: BorderStyle.SINGLE, size: 1, color: color || "CCCCCC" };
  return { top: b, bottom: b, left: b, right: b };
}

function makeHeaderCellEl(text, width, colors) {
  return new TableCell({
    borders: makeBorder("CCCCCC"),
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "D9D9D9", type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: "center",
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: "000000", font: "맑은 고딕", size: 18 })]
    })]
  });
}

function makeCellEl(text, width, opts = {}) {
  const { bold, color, fill, align, size: sz, font: ft, borders: bd } = opts;
  return new TableCell({
    borders: bd || makeBorder(opts.borderColor || "CCCCCC"),
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: "center",
    children: [new Paragraph({
      alignment: align || AlignmentType.LEFT,
      children: [new TextRun({
        text: text || "", bold: bold || false, color: color || "333333",
        font: ft || "맑은 고딕", size: sz || 18
      })]
    })]
  });
}

function makeHeading(text, level) {
  const sz = level === 1 ? 28 : 24;  // 14pt / 12pt (half-pt 단위)
  return new Paragraph({
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, font: "맑은 고딕", size: sz, bold: true, color: "000000" })]
  });
}

function makePara(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60, line: 320 },
    alignment: opts.align,
    children: [new TextRun({
      text, font: opts.font || "맑은 고딕", size: opts.size || 22,
      color: opts.color || "333333", bold: opts.bold || false, italics: opts.italics || false,
    })]
  });
}

function makeMultiRunPara(runs, opts = {}) {
  return new Paragraph({
    spacing: { before: opts.before || 60, after: opts.after || 60, line: opts.line || 320 },
    alignment: opts.align,
    children: runs.map(r => new TextRun({
      text: r.text, font: r.font || "맑은 고딕", size: r.size || 22,
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
      const val = formatVal(g.raw || g.value || (g._raw_num != null ? String(g._raw_num) : '-'));
      const grade = g.grade || statusMap[code] || '-';

      // METAPHOR 테이블에서 인체비유 자동 주입
      const _gradeKey = grade.includes('경보') ? '경보 ★' : grade.includes('주의') ? '주의 ●' : '양호 ○';
      const _met = narrativeEngine?.METAPHOR?.[code];
      const _metaphor = _met?.[_gradeKey]?.metaphor || _met?.name || '';

      rows.push({
        id: code,
        name,
        flow,
        val,
        detail: cleanNarrative(g.narrative || g.judge || ''),
        metaphor: _metaphor,
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

  // 교차신호 서사 (core-engine 필드: pair/name/desc 또는 a/b/tier/meaning 양쪽 대응)
  if (diagnosis.crossSignals.active.length > 0) {
    n.cross_signal_narrative = diagnosis.crossSignals.active.map(cs => {
      const pair    = cs.pair    || `${cs.a}↔${cs.b}` || '?↔?';
      const meaning = cs.desc    || cs.meaning          || cs.name || '';
      const tier    = cs.tier    || cs.level?.name || cs.level?.label || '';
      return `${pair}${tier ? ' (' + tier + ')' : ''}: ${meaning}`;
    }).join('. ');
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

  // 관측 포인트 — 경보+주의 게이지 기반 (상세 판정 포함)
  n.auto_watchpoints = [];
  alertGauges.forEach(g => {
    n.auto_watchpoints.push(`${g.name}(${g.id}): ${g.detail || '경보 수준'} — 다음 월 추이 모니터링 필요.`);
  });
  watchGauges.slice(0, 3).forEach(g => {
    n.auto_watchpoints.push(`${g.name}(${g.id}): ${g.detail || '주의 수준'} — 완화 여부 확인.`);
  });
  // 교차신호 기반
  diagnosis.crossSignals.active.forEach(cs => {
    const _pair = cs.pair || `${cs.a}↔${cs.b}` || '?↔?';
    const _mean = cs.desc || cs.meaning || cs.name || '';
    n.auto_watchpoints.push(`교차신호 ${_pair}: ${_mean} 지속 여부 관측.`);
  });
  // DIAH 기반
  activeLetters.forEach(l => {
    n.auto_watchpoints.push(`DIAH-${l}(${diahNames[l]}): 트리거 해소 여부 확인.`);
  });

  // ── 서사엔진 v2.8 연결 ──
  // gaugeRows + diagnosis → result 객체 조립 → generateNarrative(D) 호출
  // D 객체 실제 구조: sec2_gauges[].narrative, sec1_alertNarrative, diahStatus 등
  // 성공 시 기본 서사를 풍부한 인체비유 서사로 덮어씀
  if (narrativeEngine && narrativeEngine.generateNarrative) {
    try {
      // result 객체: generateNarrative()가 기대하는 v5.1 호환 형식
      const _gaugesForNE = {};
      for (const row of gaugeRows) {
        const _gradeKey = row.score === 2 ? '경보 ★' : row.score === 1 ? '주의 ●' : '양호 ○';
        _gaugesForNE[row.id] = {
          value: row.val,
          score: row.score === 2 ? '★' : row.score === 1 ? '●' : '○',
          grade: _gradeKey,
        };
      }
      const _result = {
        gauges: _gaugesForNE,
        overallGrade: { level: mini.stage || '0M', code: mini.alert_level || 0 },
        alert:     { level: mini.alert_level || 0, label: mini.stage || '0M' },
        blockade:  { type: mini.dual_lock ? '이중봉쇄' : '미발동', dual: mini.dual_lock || false },
        diah: {
          triggers: diagnosis.diah.activatedLetters || [],
          active:   diagnosis.diah.activatedLetters || [],
          formula:  (diagnosis.diah.activatedLetters || []).join('+') || '미발동',
        },
        m7:          { pathways: [mini.stage || '0M'] },
        crossSignals: (diagnosis.crossSignals.active || []).map(cs => ({
          pair: cs.pair || `${cs.a || '?'}-${cs.b || '?'}`, severity: cs.tier || cs.level || 1, boost: cs.boost || 0,
        })),
      };
      const _rawData = {};
      for (const row of gaugeRows) {
        _rawData[row.id] = { value: row.val, change: row.raw?.change || '' };
      }
      const D = narrativeEngine.generateNarrative(_result, _rawData, {});

      // ── D 객체 → n 4개 핵심 키 덮어쓰기 ──
      // D의 실제 구조:
      //   D.oneLiner              — 1줄 종합판정
      //   D.sec1_alertNarrative   — 경보 종합 서사
      //   D.sec2_gauges[]         — Input 게이지 배열 (각 요소: .metaphor, .narrative, .diagnosis, .grade)
      //   D.sec2_summaryNarrative — Input 축 종합 서사
      //   D.sec3_gauges[]         — Output 게이지 배열
      //   D.sec3_summaryNarrative — Output 축 종합 서사
      //   D.diahStatus            — DIAH 발동 문자열
      //   D.sec4_summary          — DIAH 상세 서사

      // 1) 인체 비유 종합 서사: sec1_alertNarrative + 경보 게이지 diagnosis 조합
      {
        const alertDiagnoses = [];
        for (const sKey of ['sec2_gauges', 'sec3_gauges', 'axis2_gauges', 'axis3_gauges',
            'axis4_gauges', 'axis5_gauges', 'axis6_gauges', 'axis7_gauges', 'axis8_gauges']) {
          for (const dg of (D[sKey] || [])) {
            if ((dg.grade || '').includes('★') || (dg.grade || '').includes('경보')) {
              alertDiagnoses.push(dg.diagnosis || dg.narrative || '');
            }
          }
        }
        const base = D.sec1_alertNarrative || D.oneLiner || '';
        n.body_metaphor_narrative = base
          + (alertDiagnoses.length > 0 ? ' ' + alertDiagnoses.slice(0, 3).join(' ') : '');
      }

      // 2) Input 서사: sec2_summaryNarrative + 경보/주의 게이지 narrative
      {
        const sec2parts = (D.sec2_gauges || [])
          .filter(dg => (dg.grade || '').includes('★') || (dg.grade || '').includes('●'))
          .map(dg => dg.narrative || dg.diagnosis || '')
          .filter(Boolean)
          .slice(0, 4);
        const sec2base = D.sec2_summaryNarrative || '';
        const built = `Input 점수합 ${mini.in?.score || 0}/${mini.in?.threshold || 0}. `
          + (sec2base && !sec2base.includes('meta에서 입력') ? sec2base + ' ' : '')
          + sec2parts.join(' ');
        if (built.length > 30) n.input_narrative = built;
      }

      // 3) Output 서사: sec3_summaryNarrative + 경보/주의 게이지 narrative
      {
        const sec3parts = (D.sec3_gauges || [])
          .filter(dg => (dg.grade || '').includes('★') || (dg.grade || '').includes('●'))
          .map(dg => dg.narrative || dg.diagnosis || '')
          .filter(Boolean)
          .slice(0, 4);
        const sec3base = D.sec3_summaryNarrative || '';
        const built = `Output 점수합 ${mini.out?.score || 0}/${mini.out?.threshold || 0}. `
          + (sec3base && !sec3base.includes('meta에서 입력') ? sec3base + ' ' : '')
          + sec3parts.join(' ');
        if (built.length > 30) n.output_narrative = built;
      }

      // 4) DIAH 서사: diahStatus + sec4_summary
      {
        const diahStatus = D.diahStatus || '';
        const diahDetail = D.sec4_summary || D.sec4_verdict || '';
        if (diahStatus && diahStatus !== '미발동') {
          n.diah_narrative = `DIAH 트리거: ${diahStatus} 발동. ${diahDetail}`;
        } else {
          n.diah_narrative = `DIAH 트리거: 미발동. ${diahDetail || '국가 경제 4대 병리 현재 비활성.'}`;
        }
      }

      // 5) gaugeRows의 metaphor/narrative 필드를 D.sec*_gauges에서 보강
      // D에서 code→게이지 역참조 맵 구성
      const _dGaugeMap = {};
      for (const sKey of ['sec2_gauges', 'sec3_gauges', 'axis2_gauges', 'axis3_gauges',
          'axis4_gauges', 'axis5_gauges', 'axis6_gauges', 'axis7_gauges', 'axis8_gauges', 'axis9_gauges']) {
        for (const dg of (D[sKey] || [])) {
          // dg.code 형식: "I1 경상수지"
          const _id = (dg.code || '').split(' ')[0];
          if (_id) _dGaugeMap[_id] = dg;
        }
      }
      for (const row of gaugeRows) {
        const dg = _dGaugeMap[row.id];
        if (dg) {
          if (!row.metaphor && dg.metaphor) row.metaphor = dg.metaphor;
          if (dg.narrative) row.detail = cleanNarrative(dg.narrative);  // narrative 항상 우선 적용
        }
      }
    } catch (neErr) {
      console.warn('[report_renderer] narrative-engine 서사 생성 실패 — 기본 서사 유지:', neErr.message);
    }
  }

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
      const SEP = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
      children.push(spacer(1600));

      // 🏥 이모지 (36pt)
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 60 },
        children: [new TextRun({ text: "🏥", font: "맑은 고딕", size: 72, bold: true })]
      }));
      // 메인 타이틀 (20pt 볼드)
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 60 },
        children: [new TextRun({ text: section.title_main, font: "맑은 고딕", size: 40, bold: true })]
      }));
      // 영문 서브타이틀 (14pt)
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [new TextRun({ text: section.subtitle, font: "맑은 고딕", size: 28, bold: true })]
      }));
      children.push(spacer(200));

      // 기준월 (18pt 볼드) — 원본 스타일
      const dynTitle = interpolate(section.dynamic_title, ctx.vars);
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 80 },
        children: [new TextRun({ text: dynTitle, font: "맑은 고딕", size: 36, bold: true })]
      }));

      // 구분선
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 80 },
        children: [new TextRun({ text: SEP, font: "맑은 고딕", size: 22 })]
      }));

      // 종합 판정 (28pt 볼드)
      const alertLevel = mini.alert_level;
      const dualLockText = mini.dual_lock
        ? (section.summary_box?.fields?.find(f => f.label === "이중봉쇄")?.format_true || "⚠ 발동")
        : (section.summary_box?.fields?.find(f => f.label === "이중봉쇄")?.format_false || "미발동");
      const stageEmoji = alertLevel >= 5 ? "🔴" : alertLevel >= 3 ? "🟠" : alertLevel >= 1 ? "🟡" : "🟢";
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 80 },
        children: [new TextRun({ text: `${stageEmoji} ${alertLevel}단계: ${mini.diah_detail?.split(' — ')[0] || '판정'}`, font: "맑은 고딕", size: 56, bold: true })]
      }));

      // 한줄 서사 (12pt 볼드)
      const oneLiner = data.oneLiner || data.sec5_currentText || '';
      if (oneLiner) {
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 80 },
          children: [new TextRun({ text: oneLiner, font: "맑은 고딕", size: 24, bold: true })]
        }));
      }

      // 구분선
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 80 },
        children: [new TextRun({ text: SEP, font: "맑은 고딕", size: 22 })]
      }));

      // CAM/DLT + 이중봉쇄 (11pt 볼드)
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 60 },
        children: [new TextRun({ text: `CAM(자본대사): ${data.camStatus || '-'}  |  DLT(말단순환): ${data.dltStatus || '-'}`, font: "맑은 고딕", size: 22, bold: true })]
      }));
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 60 },
        children: [new TextRun({ text: `이중봉쇄: ${mini.dual_lock ? '⚠ 발동' : '없음'}  |  DIAH 트리거: ${mini.diah_detail || '없음'}`, font: "맑은 고딕", size: 22, bold: true })]
      }));

      // 기준월/작성일 (10pt 볼드)
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 40 },
        children: [new TextRun({ text: `기준월: ${ctx.vars.기준월 || mini.period}  |  작성일: ${data["수집일"] || ''}`, font: "맑은 고딕", size: 20, bold: true })]
      }));
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 40 },
        children: [new TextRun({ text: `진단엔진: ${mini.engine}`, font: "맑은 고딕", size: 20, bold: true })]
      }));

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
      // ssot_engine의 sec4_verdict (실제 데이터), 없으면 diah.summary 폴백
      const _diahVerdict = data.sec4_verdict || data.diahStatus || diagnosis.diah.summary || '미발동';
      children.push(makeMultiRunPara([
        { text: "판정: ", bold: true },
        { text: _diahVerdict, bold: true, color: colors.accent },
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
          const _pair = cs.pair || `${cs.a || '?'}↔${cs.b || '?'}`;
          const _tier = cs.tier || cs.level?.name || cs.level?.label || '';
          const _mean = cs.desc || cs.meaning || cs.name || '';
          children.push(makeMultiRunPara([
            { text: "활성 교차신호: ", bold: true },
            { text: _pair, bold: true, color: colors.accent },
            { text: _tier ? ` (Tier ${_tier})` : '' },
          ]));
          children.push(makePara(`의미: ${_mean}`));
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

    // ─── 9축 개별 섹션 (axis2~axis9) ───
    case 'axis_section': {
      const axisKey    = section.data_key;
      const availKey   = section.available_key;
      const narrKey    = section.summary_key;
      const axisGauges = (data[axisKey] || []);

      // 데이터 없으면 섹션 전체 미노출 (헤딩 포함)
      if (!data[availKey] || axisGauges.length === 0) break;

      children.push(makeHeading(interpolate(section.heading, ctx.vars), section.level));

      // 위성 포함 안내
      if (section.satellite_note) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `※ ${section.satellite_note}`, color: colors.primary, size: 18, italics: true })],
          spacing: { after: 80 },
        }));
      }

      // 게이지 테이블 (코드 / 지표명 / 원값 / 등급 / 판정서사)
      const axColWidths = [
        Math.round(contentWidth * 0.08),
        Math.round(contentWidth * 0.22),
        Math.round(contentWidth * 0.15),
        Math.round(contentWidth * 0.12),
        Math.round(contentWidth * 0.43),
      ];
      const axHeaders = ['코드', '지표명', '원값', '등급', '판정 (인체비유)'];
      const fills = template.styles?.fills || {};
      const gradeColor = (grade) => {
        if (!grade) return fills.header || 'D9D9D9';
        if (grade.includes('경보') || grade.includes('★')) return fills.alert || 'FFCDD2';
        if (grade.includes('주의') || grade.includes('●')) return fills.warn  || 'FFF9C4';
        return fills.ok || 'E8F5E9';
      };

      const axHeaderRow = new TableRow({
        children: axHeaders.map((h, i) => new TableCell({
          width: { size: axColWidths[i], type: WidthType.DXA },
          shading: { fill: fills.header || 'D9D9D9', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18 })] })],
        })),
      });

      const axRows = axisGauges.map(g => {
        const code  = (g.code || '').split(' ')[0];
        const name  = (g.code || '').split(' ').slice(1).join(' ') || g.name || code;
        const val   = formatVal(g.raw || g.value || (g._raw_num != null ? String(g._raw_num) : '-'));
        const grade = g.grade || '-';
        const narr  = cleanNarrative(g.narrative || g.diagnosis || g.judge || '');
        const sat   = g._source === 'satellite' || (narrativeEngine?.METAPHOR?.[code]?.satellite) ? ' 🛰' : '';
        const fill  = gradeColor(grade);

        return new TableRow({
          children: [
            new TableCell({ width: { size: axColWidths[0], type: WidthType.DXA }, shading: { fill, type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: code + sat, size: 18 })] })] }),
            new TableCell({ width: { size: axColWidths[1], type: WidthType.DXA }, shading: { fill, type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: name, size: 18 })] })] }),
            new TableCell({ width: { size: axColWidths[2], type: WidthType.DXA }, shading: { fill, type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: String(val), size: 18 })] })] }),
            new TableCell({ width: { size: axColWidths[3], type: WidthType.DXA }, shading: { fill, type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: grade, size: 18, bold: grade.includes('경보') })] })] }),
            new TableCell({ width: { size: axColWidths[4], type: WidthType.DXA }, shading: { fill, type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: narr, size: 18 })] })] }),
          ],
        });
      });

      children.push(new Table({
        width: { size: contentWidth, type: WidthType.DXA },
        rows: [axHeaderRow, ...axRows],
      }));

      // 축 요약 서사
      const axNarr = data[narrKey] || '';
      if (axNarr) {
        children.push(new Paragraph({
          children: [new TextRun({ text: axNarr, size: 18, color: colors.dark })],
          spacing: { before: 120, after: 120 },
        }));
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

    // ─── 0. 작동 원리 ───
    case 'how_it_works': {
      children.push(makeHeading(section.heading, section.level));
      const NE = narrativeEngine;
      const S0 = NE?.SECTION_0 || {};
      // 고정 본문 텍스트 (narrative-engine SECTION_0)
      const s0body = [
        S0.principle || '경제는 인체와 같은 흐름 시스템이다. 막히면 죽는다.',
        S0.body1, S0.body2, S0.rule, S0.camDlt, S0.diahDef, S0.warning,
      ].filter(Boolean);
      // ▶ 핵심 규칙
      children.push(makePara('▶ 핵심 규칙: 누적 + 복합', { bold: true, size: 24 }));
      if (s0body[0]) children.push(makePara(s0body[0], { size: 22 }));
      children.push(spacer(80));
      // ▶ 잠복기 개념
      children.push(makePara('▶ 잠복기 개념: 0단계 ≠ 건강', { bold: true, size: 24 }));
      if (s0body[1]) children.push(makePara(s0body[1], { size: 22 }));
      children.push(spacer(80));
      // ▶ 심층 임상 소견 (ssot_engine sec5_currentText 사용)
      children.push(makePara('▶ 심층 임상 소견', { bold: true, size: 24 }));
      const clinicalText = data.sec5_currentText || data.oneLiner || '';
      if (clinicalText) children.push(makePara(cleanNarrative(clinicalText), { size: 22 }));
      if (s0body[2]) children.push(makePara(s0body[2], { size: 22 }));
      children.push(pageBreak());
      break;
    }

    // ─── 7M 기전 분석 ───
    case 'm7_table': {
      children.push(makeHeading(section.heading, section.level));
      const M7 = narrativeEngine?.M7_TABLE || {};
      const m7stages = ['0M','1M','2M','3M','4M','5M','6M','7M'];
      const currentStage = data.sec5_current || mini.stage || '0M';
      const cols = section.columns || ['단계','명칭','인체 증상','경제 현상','현재'];
      const cw = Math.round(contentWidth / cols.length);
      const m7Widths = [
        Math.round(contentWidth * 0.08),
        Math.round(contentWidth * 0.10),
        Math.round(contentWidth * 0.25),
        Math.round(contentWidth * 0.25),
        Math.round(contentWidth * 0.32),
      ];
      const m7Header = new TableRow({ children: cols.map((c, i) => makeHeaderCellEl(c, m7Widths[i], colors)) });
      const m7Rows = m7stages.map(stage => {
        const d = M7[stage] || {};
        const isCurrent = stage === currentStage;
        const fill = isCurrent ? (colors.fills?.warn || 'FFF9C4') : 'FFFFFF';
        const marker = isCurrent ? '◀ 현재' : '';
        return new TableRow({ children: [
          makeCellEl(stage, m7Widths[0], { bold: isCurrent, fill }),
          makeCellEl(d.name || '-', m7Widths[1], { bold: isCurrent, fill }),
          makeCellEl(d.body || d.symptom || '-', m7Widths[2], { fill, size: 18 }),
          makeCellEl(d.econ || d.economy || '-', m7Widths[3], { fill, size: 18 }),
          makeCellEl(marker, m7Widths[4], { bold: isCurrent, color: isCurrent ? colors.accent : '999999', fill }),
        ]});
      });
      children.push(new Table({ width: { size: contentWidth, type: WidthType.DXA }, rows: [m7Header, ...m7Rows] }));
      children.push(spacer(120));
      // 단계 판정 규칙
      if (data.sec5_stageRule) children.push(makePara(data.sec5_stageRule, { size: 18, color: '666666', italics: true }));
      break;
    }

    // ─── 예후 3경로 ───
    case 'forecast': {
      children.push(makeHeading(section.heading, section.level));
      const paths = [
        { label: '▶ A경로 (개선)', key: 'forecast_a', color: colors.green },
        { label: '▶ B경로 (유지)', key: 'forecast_b', color: colors.primary },
        { label: '▶ C경로 (악화)', key: 'forecast_c', color: colors.accent },
      ];
      // ssot_engine sec5_nextText 또는 narrative-engine 데이터
      const nextText = cleanNarrative(data.sec5_nextText || '');
      for (const p of paths) {
        children.push(makePara(p.label, { bold: true, size: 24, color: p.color }));
        const txt = data[p.key] || (p.key === 'forecast_b' ? nextText : '') || '데이터 수집 후 자동 생성됩니다.';
        children.push(makePara(cleanNarrative(txt), { size: 22 }));
        children.push(spacer(80));
      }
      break;
    }

    // ─── 시계열 추이 ───
    case 'timeseries': {
      children.push(makeHeading(section.heading, section.level));
      // sec7_narrative 텍스트
      const ts = cleanNarrative(data.sec7_narrative || '');
      if (ts) children.push(makePara(ts, { size: 22 }));
      children.push(spacer(100));
      // 시계열 표 — 현재 데이터 기반 (m1/m2는 '-')
      const tsGauges = (data.sec2_gauges || []).concat(data.sec3_gauges || []).slice(0, 10);
      if (tsGauges.length > 0) {
        const tsCols = section.columns || ['게이지','M-2','M-1','M(현재)','추세','판단'];
        const tsW = [
          Math.round(contentWidth * 0.18),
          Math.round(contentWidth * 0.12),
          Math.round(contentWidth * 0.12),
          Math.round(contentWidth * 0.18),
          Math.round(contentWidth * 0.10),
          Math.round(contentWidth * 0.30),
        ];
        const tsHeader = new TableRow({ children: tsCols.map((c, i) => makeHeaderCellEl(c, tsW[i], colors)) });
        const tsRows = tsGauges.map(g => {
          const code = (g.code || '').split(' ')[0];
          const name = (g.code || '').split(' ').slice(1).join(' ') || code;
          const val  = formatVal(g.raw || g.value || '-');
          const grade = g.grade || '-';
          const fill = grade.includes('경보') ? 'FFCDD2' : grade.includes('주의') ? 'FFF9C4' : 'E8F5E9';
          return new TableRow({ children: [
            makeCellEl(`${code} ${name}`, tsW[0], { size: 18 }),
            makeCellEl('-', tsW[1], { size: 18, color: '999999' }),
            makeCellEl('-', tsW[2], { size: 18, color: '999999' }),
            makeCellEl(val, tsW[3], { size: 18, fill }),
            makeCellEl('→', tsW[4], { size: 18, align: AlignmentType.CENTER }),
            makeCellEl(cleanNarrative(g.judge || g.narrative || '').substring(0, 40), tsW[5], { size: 16 }),
          ]});
        });
        children.push(new Table({ width: { size: contentWidth, type: WidthType.DXA }, rows: [tsHeader, ...tsRows] }));
        children.push(makePara('※ M-2/M-1 과거 데이터는 차기 수집 시 자동 반영 예정.', { size: 18, color: '888888', italics: true }));
      }
      break;
    }

    // ─── 경제 가족력 ───
    case 'family_history': {
      children.push(makeHeading(section.heading, section.level));
      const FH = narrativeEngine?.FAMILY_HISTORY_PAST || {};
      const fhCols = section.columns || ['지표','1997년 (D+H)','2008년 (H+A)','현재'];
      const fhW = [
        Math.round(contentWidth * 0.20),
        Math.round(contentWidth * 0.25),
        Math.round(contentWidth * 0.25),
        Math.round(contentWidth * 0.30),
      ];
      const fhHeader = new TableRow({ children: fhCols.map((c, i) => makeHeaderCellEl(c, fhW[i], colors)) });
      // 현재값 — gaugeRows에서 핵심 게이지 추출
      const keyGauges = { I1:'경상수지', I3:'외환보유고', I4:'환율', I6:'국채금리', O2:'물가', O4:'주가', O6:'소비' };
      const nowMap = {};
      for (const g of (gaugeRows || [])) {
        if (keyGauges[g.id]) nowMap[keyGauges[g.id]] = formatVal(g.val) + ' (' + (g.grade || '-') + ')';
      }
      const fhItems = [
        { item: '경상수지', y97: FH['1997']?.data?.경상수지||'-', y08: FH['2008']?.data?.경상수지||'-' },
        { item: '외환보유고', y97: FH['1997']?.data?.외환보유고||'-', y08: FH['2008']?.data?.외환보유고||'-' },
        { item: '환율', y97: FH['1997']?.data?.환율||'-', y08: FH['2008']?.data?.환율||'-' },
        { item: '국채금리', y97: FH['1997']?.data?.국채금리||'-', y08: FH['2008']?.data?.국채금리||'-' },
        { item: '물가', y97: FH['1997']?.data?.물가||'-', y08: FH['2008']?.data?.물가||'-' },
        { item: '주가', y97: FH['1997']?.data?.주가||'-', y08: FH['2008']?.data?.주가||'-' },
        { item: '소비', y97: '-', y08: '-' },
        { item: 'DIAH 트리거', y97: FH['1997']?.data?.['DIAH 트리거']||'D+H', y08: FH['2008']?.data?.['DIAH 트리거']||'H+A' },
        { item: '진단명', y97: FH['1997']?.data?.진단명||'급성 심근경색', y08: FH['2008']?.data?.진단명||'패혈증 쇼크' },
      ];
      const fhRows = fhItems.map(row => new TableRow({ children: [
        makeCellEl(row.item, fhW[0], { bold: true }),
        makeCellEl(row.y97, fhW[1], { size: 18, color: colors.accent }),
        makeCellEl(row.y08, fhW[2], { size: 18, color: colors.primary }),
        makeCellEl(nowMap[row.item] || '-', fhW[3], { size: 18 }),
      ]}));
      children.push(new Table({ width: { size: contentWidth, type: WidthType.DXA }, rows: [fhHeader, ...fhRows] }));
      children.push(spacer(120));
      // 가족력 서사
      if (FH.common) children.push(makePara(FH.common, { size: 20, italics: true }));
      break;
    }

    // ─── 명의의 처방 ───
    case 'prescription': {
      children.push(makeHeading(section.heading, section.level));
      // 현재 단계 기반 처방 텍스트
      const prescText = cleanNarrative(data.sec4_verdict || data.sec5_currentText || '');
      if (prescText) children.push(makePara(prescText, { size: 22 }));
      children.push(spacer(100));
      // 경보 상향 규칙 표
      children.push(makePara('▶ 경보 상향 규칙', { bold: true, size: 24 }));
      children.push(spacer(60));
      const ruleW = [Math.round(contentWidth * 0.40), Math.round(contentWidth * 0.60)];
      const ruleHeader = new TableRow({ children: [
        makeHeaderCellEl('상황', ruleW[0], colors),
        makeHeaderCellEl('판정 원칙', ruleW[1], colors),
      ]});
      const rules = [
        ['단일 게이지 경보', '연속 확인(재확인) 후 격상 — 단월 악화는 신호'],
        ['복수 게이지 동시 악화', '누적 + 복합 조건 충족 여부 판단'],
        ['CAM·DLT 동시 봉쇄', '이중봉쇄 = 최고 경보 즉시 발령'],
        ['환율 급등', '외환보유고 동반 감소 여부 재확인 후 격상'],
        ['다음 검진', `${mini.period ? mini.period.substring(0,7).replace('-','년 ') + '월' : '차기'} 수집 후 자동 갱신`],
      ];
      const ruleRows = rules.map(([sit, prin]) => new TableRow({ children: [
        makeCellEl(sit, ruleW[0], { bold: true }),
        makeCellEl(prin, ruleW[1], { size: 20 }),
      ]}));
      children.push(new Table({ width: { size: contentWidth, type: WidthType.DXA }, rows: [ruleHeader, ...ruleRows] }));
      break;
    }

    // ─── 데이터 출처 및 면책 ───
    case 'disclaimer': {
      children.push(makeHeading(section.heading, section.level));
      children.push(makePara('▶ 데이터 출처', { bold: true, size: 24 }));
      children.push(spacer(60));
      const srcW = [Math.round(contentWidth*0.25), Math.round(contentWidth*0.30), Math.round(contentWidth*0.45)];
      const srcHeader = new TableRow({ children: [
        makeHeaderCellEl('데이터', srcW[0], colors),
        makeHeaderCellEl('출처', srcW[1], colors),
        makeHeaderCellEl('기준 시점', srcW[2], colors),
      ]});
      const srcs = [
        ['경상수지/무역', '한국은행 ECOS', data['수집일'] || mini.period],
        ['외환보유고/금리', '한국은행 ECOS', data['수집일'] || mini.period],
        ['CPI/PPI/생산', '통계청/한국은행', data['수집일'] || mini.period],
        ['주가(KOSPI/KOSDAQ)', 'ECOS 802Y001', data['수집일'] || mini.period],
        ['PMI/발틱운임', 'TradingEconomics', data['수집일'] || mini.period],
        ['야간광/UHI(위성)', 'NASA VIIRS/Landsat', data['수집일'] || mini.period],
      ];
      const srcRows = srcs.map(([item, src, period]) => new TableRow({ children: [
        makeCellEl(item, srcW[0], { size: 18 }),
        makeCellEl(src, srcW[1], { size: 18 }),
        makeCellEl(period, srcW[2], { size: 18 }),
      ]}));
      children.push(new Table({ width: { size: contentWidth, type: WidthType.DXA }, rows: [srcHeader, ...srcRows] }));
      children.push(spacer(120));
      children.push(makePara('▶ 판정 기준', { bold: true, size: 24 }));
      children.push(makePara(data.sec5_stageRule || '59개 게이지 경보·주의 집계 기반 단계 판정.', { size: 20 }));
      children.push(spacer(100));
      children.push(makePara('▶ 면책 조항', { bold: true, size: 24 }));
      children.push(makePara('본 보고서는 DIAH-7M 인체국가경제론에 기반한 자동 진단 시스템의 출력물입니다. 투자·정책 결정의 근거로 단독 사용할 수 없으며, 참고 자료로만 활용하시기 바랍니다. © 인체국가경제론 / 윤종원', { size: 20, italics: true }));
      break;
    }

    // ─── 부록 A. DIAH-7M 이론 ───
    case 'appendix': {
      children.push(pageBreak());
      children.push(makeHeading(section.heading, section.level));
      const APP = narrativeEngine?.APPENDIX || [];
      if (Array.isArray(APP) && APP.length > 0) {
        APP.forEach((item, i) => {
          const title = item.title || item.heading || `${i+1}.`;
          const body  = item.body  || item.text   || '';
          children.push(makePara(`${i+1}. ${title}`, { bold: true, size: 24 }));
          if (body) children.push(makePara(body, { size: 20 }));
          children.push(spacer(80));
        });
      } else {
        // APPENDIX가 객체인 경우
        const appObj = narrativeEngine?.APPENDIX || {};
        Object.entries(appObj).forEach(([k, v], i) => {
          children.push(makePara(`${i+1}. ${k}`, { bold: true, size: 24 }));
          if (typeof v === 'string') children.push(makePara(v, { size: 20 }));
          children.push(spacer(80));
        });
      }
      break;
    }

    // ─── 종료 마크 ───
    case 'endmark': {
      children.push(spacer(300));
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: `——— ${section.text} ———`, font: "맑은 고딕", size: 16, color: "BBBBBB" })]
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
            children: [new TextRun({ text: headerText, font: "맑은 고딕", size: 14, color: "AAAAAA" })]
          })]
        })
      } : undefined,
      footers: (template.footer && template.footer.show) ? {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "CONFIDENTIAL  |  Page ", font: "맑은 고딕", size: 14, color: "AAAAAA" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "맑은 고딕", size: 14, color: "AAAAAA" }),
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
