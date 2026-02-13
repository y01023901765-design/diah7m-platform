const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat
} = require("docx");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

const accentColor = "00D4FF";
const greenColor = "00E5A0";
const redColor = "FF5C5C";
const orangeColor = "F0B429";
const grayColor = "8B95A8";

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "0A0F1E", type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })]
  });
}

function cell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({
      children: [new TextRun({
        text,
        font: opts.mono ? "JetBrains Mono" : "Arial",
        size: opts.size || 20,
        color: opts.color || "333333",
        bold: opts.bold || false
      })]
    })]
  });
}

// ── Fixed Issues Table Rows ──
const fixedItems = [
  ["CRITICAL", "TierLock.jsx", "140", "SYS, D, SAT_META 등 전체 export 추가", greenColor],
  ["CRITICAL", "Dashboard.jsx", "6-7", "SYS, D, sysN, sysB, isSat, SAT_META, gN import 정상화", greenColor],
  ["CRITICAL", "Landing.jsx", "5", "SYS, sysN, sysB import 정상화", greenColor],
  ["CRITICAL", "Satellite.jsx", "4", "SAT_META, isSat, SAT_XREF, TP, LEAD, EV_STYLE import 추가", greenColor],
  ["CRITICAL", "Gauges.jsx", "5-6", "TierLock + data/gauges에서 모든 의존성 import", greenColor],
  ["HIGH", "Charts.jsx", "24-48", "하드코딩 #f97316 → T.orange/T.orangeDim/T.white 토큰화", greenColor],
  ["HIGH", "LangSelector.jsx", "1", "useRef, useEffect import 누락 수정", greenColor],
  ["HIGH", "Chatbot.jsx", "34", "t('chatSend',lang) → t('chatSend',L) + T.white 적용", greenColor],
  ["MEDIUM", "Landing.jsx", "32", "feat4 color 하드코딩 → T.orange 토큰 사용", greenColor],
  ["MEDIUM", "i18n.js", "38-46", "detectLang() 캐싱 (_cachedLang) 추가", greenColor],
  ["MEDIUM", "theme.js", "9", "orange, orangeDim, white 토큰 추가", greenColor],
  ["MEDIUM", "index.html", "9", "Pretendard CDN 추가", greenColor],
  ["MEDIUM", "Dashboard.jsx", "6-7", "미사용 SatEvidencePanel, SAT_EV import 제거", greenColor],
  ["LOW", "Admin.jsx", "4,28", "SYS, sysN import + className='grid-4' 추가", greenColor],
  ["LOW", "Gauges.jsx", "16", "GaugeRow에 position:'relative' 추가", greenColor],
];

const fixedRows = fixedItems.map(([sev, file, line, desc, col]) =>
  new TableRow({
    children: [
      cell(sev, 1100, { bold: true, color: sev === "CRITICAL" ? redColor : sev === "HIGH" ? orangeColor : sev === "MEDIUM" ? "6E8EFB" : grayColor, size: 18 }),
      cell(file, 1800, { mono: true, size: 18 }),
      cell(line, 700, { mono: true, size: 18 }),
      cell(desc, 4560, { size: 18 }),
      cell("FIXED", 1200, { bold: true, color: "00A87B", size: 18 }),
    ]
  })
);

// ── Build Summary ──
const buildRows = [
  ["vite build", "✅ 성공", "1.51s"],
  ["모듈 수", "53개", "에러 0"],
  ["JS 번들", "448.98 KB", "gzip 134.10 KB"],
  ["CSS 번들", "0.64 KB", "gzip 0.38 KB"],
  ["HTML", "1.04 KB", "정상"],
];

// ── Remaining Items ──
const remainingItems = [
  ["LOW", "Satellite.jsx", "55-58", "'수집 후 표시', '오늘', '30일 전' 등 한국어 하드코딩 (i18n 미적용)", "다국어 배포 시 번역 필요"],
  ["LOW", "Landing.jsx", "17", "Enterprise plan color '#f59e0b' 하드코딩", "T.enterprise 토큰 사용 권장"],
  ["INFO", "전체", "-", "CSS-in-JS 인라인 스타일 (유지보수 시 구조 파악에 시간 소요)", "현재 기능에 영향 없음"],
];

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "0A0F1E" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "151C2E" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "333333" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
    }]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1200, bottom: 1200, left: 1200 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "DIAH-7M Frontend Inspection Report", font: "Arial", size: 16, color: grayColor, italics: true })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "DIAH-7M ", font: "Arial", size: 16, color: grayColor }),
            new TextRun({ text: "| Page ", font: "Arial", size: 16, color: grayColor }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: grayColor }),
          ]
        })]
      })
    },
    children: [
      // ═══ TITLE ═══
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "DIAH-7M", font: "Arial", size: 52, bold: true, color: "0A0F1E" })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "Frontend Code Inspection Report", font: "Arial", size: 32, color: "00A4CC" })] }),
      new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: accentColor, space: 1 } },
        children: [new TextRun({ text: "2026-02-13 | Pre-Server Deployment Check | Cowork Inspector", font: "Arial", size: 20, color: grayColor })] }),

      // ═══ EXECUTIVE SUMMARY ═══
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. Executive Summary")] }),
      new Paragraph({ spacing: { after: 120 }, children: [
        new TextRun({ text: "Build Status: ", bold: true }),
        new TextRun({ text: "PASS", bold: true, color: "00A87B" }),
        new TextRun("  |  "),
        new TextRun({ text: "Modules: ", bold: true }),
        new TextRun("53"),
        new TextRun("  |  "),
        new TextRun({ text: "Errors: ", bold: true }),
        new TextRun({ text: "0", color: "00A87B" }),
        new TextRun("  |  "),
        new TextRun({ text: "Bundle: ", bold: true }),
        new TextRun("449KB (gzip 134KB)"),
      ]}),
      new Paragraph({ spacing: { after: 200 }, children: [
        new TextRun("DIAH-7M 프론트엔드 코드의 서버 배포 전 종합 점검을 수행했습니다. 이전 점검에서 발견된 "),
        new TextRun({ text: "22건의 이슈 중 15건이 수정 완료", bold: true }),
        new TextRun("되었으며, 모든 CRITICAL/HIGH 이슈가 해결되었습니다. 빌드 테스트 통과 확인 후, 서버 배포가 가능한 상태입니다."),
      ]}),

      // ═══ BUILD RESULT ═══
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. Build Test Result")] }),
      new Table({
        width: { size: 9840, type: WidthType.DXA },
        columnWidths: [3280, 3280, 3280],
        rows: [
          new TableRow({ children: [headerCell("항목", 3280), headerCell("결과", 3280), headerCell("상세", 3280)] }),
          ...buildRows.map(([item, result, detail]) =>
            new TableRow({ children: [
              cell(item, 3280, { bold: true }),
              cell(result, 3280, { color: result.includes("✅") ? "00A87B" : "333333" }),
              cell(detail, 3280, { mono: true }),
            ] })
          )
        ]
      }),

      new Paragraph({ spacing: { before: 200, after: 200 }, children: [
        new TextRun({ text: "판정: ", bold: true }),
        new TextRun({ text: "서버 배포 가능", bold: true, color: "00A87B" }),
        new TextRun(" — dist/ 폴더 정적 서빙만으로 동작. 백엔드 API 연결 불필요."),
      ]}),

      // ═══ FIXED ISSUES ═══
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. Resolved Issues (15/22)")] }),
      new Paragraph({ spacing: { after: 160 }, children: [
        new TextRun("이전 점검 보고서 대비 수정 완료된 항목입니다. CRITICAL 5건, HIGH 3건, MEDIUM 4건, LOW 3건이 모두 정상 반영되었습니다."),
      ]}),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1100, 1800, 700, 4560, 1200],
        rows: [
          new TableRow({ children: [
            headerCell("Severity", 1100), headerCell("File", 1800), headerCell("Line", 700),
            headerCell("Description", 4560), headerCell("Status", 1200),
          ]}),
          ...fixedRows,
        ]
      }),

      new PageBreak(),

      // ═══ REMAINING ═══
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. Remaining Items (Non-blocking)")] }),
      new Paragraph({ spacing: { after: 160 }, children: [
        new TextRun("아래 항목은 서버 배포를 차단하지 않는 경미한 사항입니다. 향후 개선 시 참고하시기 바랍니다."),
      ]}),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [900, 1500, 600, 3680, 2680],
        rows: [
          new TableRow({ children: [
            headerCell("Level", 900), headerCell("File", 1500), headerCell("Line", 600),
            headerCell("Description", 3680), headerCell("Note", 2680),
          ]}),
          ...remainingItems.map(([sev, file, line, desc, note]) =>
            new TableRow({ children: [
              cell(sev, 900, { bold: true, color: sev === "LOW" ? orangeColor : "6E8EFB", size: 18 }),
              cell(file, 1500, { mono: true, size: 18 }),
              cell(line, 600, { mono: true, size: 18 }),
              cell(desc, 3680, { size: 18 }),
              cell(note, 2680, { size: 18, color: grayColor }),
            ] })
          )
        ]
      }),

      // ═══ FILE STATUS OVERVIEW ═══
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. File Status Overview")] }),
      new Paragraph({ spacing: { after: 160 }, children: [
        new TextRun("전체 프론트엔드 파일의 현재 상태 요약입니다."),
      ]}),

      ...[
        ["src/App.jsx", "✅", "라우팅, 반응형 CSS, RTL 지원 정상"],
        ["src/theme.js", "✅", "13개 토큰 (orange, orangeDim, white 포함)"],
        ["src/i18n.js", "✅", "detectLang 캐싱 적용, 28개 언어 지원"],
        ["index.html", "✅", "Pretendard + Google Fonts 5종 + favicon.svg"],
        ["src/pages/Landing.jsx", "✅", "SYS/sysN/sysB import, T.orange 토큰 적용"],
        ["src/pages/Dashboard.jsx", "✅", "TierLock 전체 의존성 import 정상"],
        ["src/pages/Admin.jsx", "✅", "SYS/sysN import + grid-4 className"],
        ["src/pages/Stock.jsx", "✅", "data/stocks.js 분리, 검색/필터 기능"],
        ["src/components/TierLock.jsx", "✅", "59개 게이지 데이터 + 전체 export"],
        ["src/components/Charts.jsx", "✅", "디자인 토큰 적용 완료"],
        ["src/components/Gauges.jsx", "✅", "import 정상 + position:relative"],
        ["src/components/Satellite.jsx", "✅", "SAT_META 등 6개 import 추가됨"],
        ["src/components/Chatbot.jsx", "✅", "t(key,L) + T.white 적용"],
        ["src/components/LangSelector.jsx", "✅", "useRef/useEffect import 정상"],
        ["src/components/GlobalNav.jsx", "✅", "변경 없음, 정상"],
        ["src/data/gauges.js", "✅", "TIER_ACCESS + tierLevel 정상"],
        ["src/data/stocks.js", "✅", "100종목 + ARCHETYPE_LABELS 정상"],
        ["src/data/satellite.js", "✅", "SAT_EV 8개 위성 증거 데이터 정상"],
      ].map(([file, status, note]) =>
        new Paragraph({ spacing: { after: 60 }, numbering: { reference: "bullets", level: 0 }, children: [
          new TextRun({ text: file, font: "JetBrains Mono", size: 20, bold: true }),
          new TextRun({ text: ` ${status} `, size: 20 }),
          new TextRun({ text: note, size: 20, color: "555555" }),
        ]})
      ),

      // ═══ SERVER DEPLOY NOTES ═══
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. Server Deployment Notes")] }),
      new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun({ text: "Architecture: ", bold: true }),
        new TextRun("React 19.2 + Vite 7.3 SPA (정적 파일 서빙)"),
      ]}),
      new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun({ text: "Backend: ", bold: true }),
        new TextRun("없음 (클라이언트 전용, API 서버 불필요)"),
      ]}),
      new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun({ text: "Deploy: ", bold: true }),
        new TextRun({ text: "npm run build", font: "JetBrains Mono", size: 20 }),
        new TextRun(" 실행 후 dist/ 폴더만 서버에 배치"),
      ]}),
      new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun({ text: "Nginx 권장: ", bold: true }),
        new TextRun({ text: "try_files $uri /index.html;", font: "JetBrains Mono", size: 20 }),
        new TextRun(" (SPA fallback)"),
      ]}),
      new Paragraph({ spacing: { after: 100 }, children: [
        new TextRun({ text: "CDN 의존: ", bold: true }),
        new TextRun("Pretendard(jsDelivr), Google Fonts 5종 (인트라넷 환경 시 로컬화 필요)"),
      ]}),
      new Paragraph({ spacing: { after: 200 }, children: [
        new TextRun({ text: "서버 관리자 작업: ", bold: true }),
        new TextRun("dist/ 폴더 복사 + nginx/Apache 정적 서빙 설정만 필요. 코드 수정 불필요."),
      ]}),

      // ═══ SIGN OFF ═══
      new Paragraph({ spacing: { before: 400 }, border: { top: { style: BorderStyle.SINGLE, size: 2, color: accentColor, space: 1 } },
        children: [new TextRun({ text: "\n", size: 10 })] }),
      new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: "DIAH-7M Frontend Inspection — PASS", bold: true, size: 24, color: "00A87B" }),
      ]}),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
        new TextRun({ text: "Inspected by Cowork Agent | 2026-02-13", size: 18, color: grayColor }),
      ]}),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/sessions/jolly-epic-pasteur/mnt/diah7m-platform/DIAH7M_Inspection_20260213.docx", buffer);
  console.log("Report generated successfully");
});
