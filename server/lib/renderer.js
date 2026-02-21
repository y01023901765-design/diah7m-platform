/**
 * DIAH-7M Report Renderer v2.0
 *
 * - PDFKit 사용 (Puppeteer 금지)
 * - narrative-engine v2.8 연결 → 인체비유 서사 포함
 * - 10섹션 구조 (워드 보고서 정본 기준)
 * - 한글 폰트: Helvetica 대체 (영문자만 PDFKit 기본 폰트)
 * - Stream 전송 (파일 저장 X)
 */

'use strict';

const PDFDocument = require('pdfkit');
const path = require('path');

// narrative-engine 안전 로드
let narrativeEngine = null;
try {
  narrativeEngine = require('./narrative-engine');
} catch (e) {
  console.warn('[renderer] narrative-engine 로드 실패 — 서사 없이 숫자만 출력:', e.message);
}

// ── 레벨명 매핑 ──
const LEVEL_NAMES = {
  1: '안정', 2: '주의', 3: '경계', 4: '심각', 5: '위기',
};
const LEVEL_COLORS_HEX = {
  1: '#22c55e', 2: '#eab308', 3: '#f97316', 4: '#ef4444', 5: '#991b1b',
};

// ── 9축 경제용어(인체명칭) ──
const AXIS_META = {
  A1: { eco: '통화/자금',   body: '순환계' },
  A2: { eco: '무역/수출입', body: '호흡계' },
  A3: { eco: '소비/내수',   body: '소화계' },
  A4: { eco: '심리/정책',   body: '신경계' },
  A5: { eco: '금융안정',    body: '면역계' },
  A6: { eco: '물가/재정',   body: '내분비계' },
  A7: { eco: '산업/생산',   body: '근골격계' },
  A8: { eco: '인구/가계',   body: '인구/취약' },
  A9: { eco: '부동산/대외', body: '재생/대외' },
};

// ── PDF 헬퍼 ──
function sectionTitle(doc, text) {
  doc.moveDown(1.2);
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#1e293b').text(text);
  doc.moveDown(0.3);
  // 구분선
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').fillColor('#334155');
}

function subTitle(doc, text) {
  doc.moveDown(0.8);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#475569').text(text);
  doc.moveDown(0.3);
  doc.fontSize(10).font('Helvetica').fillColor('#334155');
}

function bodyText(doc, text) {
  if (!text) return;
  doc.fontSize(10).font('Helvetica').fillColor('#334155').text(String(text), { lineGap: 3 });
  doc.moveDown(0.3);
}

function badge(doc, x, y, text, color) {
  const w = 60, h = 18;
  doc.roundedRect(x, y, w, h, 4).fillColor(color || '#64748b').fill();
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff')
     .text(text, x, y + 4, { width: w, align: 'center' });
  doc.fillColor('#334155');
}

// 페이지 번호 + 푸터
function addFooter(doc, pageNum) {
  const bottom = doc.page.height - 35;
  doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
     .text('DIAH-7M 경제건강검진 | 인체국가경제론 | 참고용 진단 보고서', 50, bottom, { align: 'left', width: 400 })
     .text(`${pageNum}`, 50, bottom, { align: 'right', width: 495 });
}

// ══════════════════════════════════════════════════════════
// 메인: renderPDF
// ══════════════════════════════════════════════════════════
async function renderPDF(diagnosis, outputStream) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 60, left: 50, right: 50 },
        bufferPages: true,
        // ── PDF 권한 잠금 (구독자 배포용) ──
        // 인쇄: 허용 / 복사·편집·주석: 차단
        userPassword: undefined,        // 열람 암호 없음 (자유 열람)
        ownerPassword: process.env.PDF_OWNER_PASSWORD || 'diah7m-admin-2026',
        permissions: {
          printing: 'highResolution',   // 인쇄 허용
          modifying: false,             // 편집 차단
          copying: false,               // 복사 차단
          annotating: false,            // 주석 차단
          fillingForms: false,          // 양식 차단
          contentAccessibility: true,   // 화면 낭독기 허용
          documentAssembly: false,      // 문서 조합 차단
        },
      });

      doc.pipe(outputStream);

      // narrative-engine D 객체 생성 (가능하면)
      let D = null;
      if (narrativeEngine && narrativeEngine.generateNarrative) {
        try {
          D = narrativeEngine.generateNarrative(
            diagnosis,
            {},
            {
              month: diagnosis.period || new Date().toISOString().slice(0, 7),
              writeDate: new Date().toLocaleDateString('ko-KR'),
              engineVersion: 'DIAH-7M v5.1 + 서사엔진 v2.8',
            }
          );
        } catch (ne) {
          console.warn('[renderer] generateNarrative 실패:', ne.message);
        }
      }

      const overall = diagnosis.overall || {};
      const axes    = diagnosis.axes || {};
      const cross   = diagnosis.crossSignals || [];
      const dualLock= diagnosis.dualLock || {};
      const period  = diagnosis.period || new Date().toISOString().slice(0, 7);
      const lvName  = overall.levelName || LEVEL_NAMES[overall.level] || '미판정';
      const lvColor = LEVEL_COLORS_HEX[overall.level] || '#64748b';
      let pageNum = 1;

      // ── 섹션 0: 표지 ────────────────────────────────────
      doc.fontSize(9).font('Helvetica').fillColor('#94a3b8')
         .text('DIAH-7M ECONOMIC HEALTH REPORT', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(22).font('Helvetica-Bold').fillColor('#0f172a')
         .text('경제 건강검진 보고서', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(13).font('Helvetica').fillColor('#475569')
         .text(`대한민국 | ${period}`, { align: 'center' });
      doc.moveDown(1.5);

      // 종합판정 박스
      const bx = 150, bw = 295, bh = 80;
      doc.roundedRect(bx, doc.y, bw, bh, 8).fillColor(lvColor + '18').fill();
      doc.roundedRect(bx, doc.y - bh, bw, bh, 8).strokeColor(lvColor).lineWidth(2).stroke();
      const boxTop = doc.y - bh + 12;
      doc.fontSize(11).font('Helvetica').fillColor('#64748b')
         .text('종합판정', bx, boxTop, { width: bw, align: 'center' });
      doc.fontSize(26).font('Helvetica-Bold').fillColor(lvColor)
         .text(`L${overall.level || '?'} ${lvName}`, bx, boxTop + 18, { width: bw, align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#94a3b8')
         .text(`점수 ${typeof overall.score === 'number' ? overall.score.toFixed(2) : 'N/A'} / 5.0`, bx, boxTop + 52, { width: bw, align: 'center' });

      doc.moveDown(2);
      doc.fontSize(9).font('Helvetica').fillColor('#94a3b8')
         .text(`생성일: ${new Date().toLocaleDateString('ko-KR')} | 엔진: DIAH-7M v5.1`, { align: 'center' });

      addFooter(doc, pageNum++);
      doc.addPage();

      // ── 섹션 1: 게이지 채점표 (9축 요약) ────────────────
      sectionTitle(doc, '1. 9축 종합 채점표');

      const axEntries = Object.entries(axes);
      axEntries.forEach(([axId, ax]) => {
        const meta = AXIS_META[axId] || { eco: ax.metaphor || axId, body: ax.name || axId };
        const lv = ax.level || {};
        const lvN = lv.name || LEVEL_NAMES[lv.level] || '미판정';
        const lvC = lv.color || LEVEL_COLORS_HEX[lv.level] || '#64748b';
        const sc = typeof ax.score === 'number' ? ax.score.toFixed(2) : 'N/A';

        const rowY = doc.y;
        // 배지
        badge(doc, 50, rowY, `${axId}`, lvC);
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b')
           .text(`${meta.eco}`, 118, rowY + 2, { width: 160 });
        doc.fontSize(9).font('Helvetica').fillColor('#64748b')
           .text(`(${meta.body})`, 118, rowY + 14, { width: 160 });
        doc.fontSize(10).font('Helvetica-Bold').fillColor(lvC)
           .text(`${lvN}  ${sc}pt`, 310, rowY + 5, { width: 120 });

        // 게이지 수
        const gc = ax.gauges ? ax.gauges.length : (ax.count || 0);
        doc.fontSize(9).font('Helvetica').fillColor('#94a3b8')
           .text(`게이지 ${gc}개`, 440, rowY + 5, { width: 100 });

        doc.moveDown(1.4);
        if (doc.y > 720) { addFooter(doc, pageNum++); doc.addPage(); }
      });

      // ── 섹션 2: 이중봉쇄 + 교차신호 ─────────────────────
      if (doc.y > 650) { addFooter(doc, pageNum++); doc.addPage(); }
      sectionTitle(doc, '2. 이중봉쇄 (CAM + DLT)');

      const isLocked = dualLock.locked || false;
      const lockColor = isLocked ? '#ef4444' : '#22c55e';
      bodyText(doc, `상태: ${isLocked ? '⚠ 이중봉쇄 발동' : '✓ 이중봉쇄 해제'}`);
      bodyText(doc, `경계축(${(dualLock.criticalAxes||[]).length}/3): ${(dualLock.criticalAxes||[]).join(', ') || '없음'}`);
      bodyText(doc, `교차신호(${dualLock.activeSignals||0}/5): ${dualLock.reason || ''}`);

      if (cross.length > 0) {
        sectionTitle(doc, '3. 교차신호 목록');
        cross.slice(0, 10).forEach((cs, i) => {
          const sev = cs.severity || cs.level || '';
          bodyText(doc, `${i+1}. ${cs.pair || cs.axes || ''} — severity ${sev}`);
          if (doc.y > 720) { addFooter(doc, pageNum++); doc.addPage(); }
        });
      }

      // ── 섹션 3~4: 서사 (narrative-engine 연결) ──────────
      if (D) {
        if (doc.y > 600) { addFooter(doc, pageNum++); doc.addPage(); }
        sectionTitle(doc, '4. DIAH 트리거 분석');

        if (D.sec4_triggers) {
          D.sec4_triggers.forEach(tr => {
            subTitle(doc, `${tr.code} — ${tr.name}`);
            bodyText(doc, tr.text);
            if (doc.y > 720) { addFooter(doc, pageNum++); doc.addPage(); }
          });
        }
        if (D.sec4_summary) bodyText(doc, D.sec4_summary);

        // 섹션 5: 7M 기전
        if (doc.y > 650) { addFooter(doc, pageNum++); doc.addPage(); }
        sectionTitle(doc, '5. 7M 기전 분석');
        bodyText(doc, `현재 기전: ${D.sec5_current || '0M'} — ${D.sec5_currentName || '정상'}`);
        bodyText(doc, D.sec5_currentText);
        bodyText(doc, `다음 경로: ${D.sec5_nextM || '1M'} (${D.sec5_nextName || ''})`);
        bodyText(doc, D.sec5_nextText);

        // 섹션 6: 예후 3경로
        if (D.sec6_paths && D.sec6_paths.length > 0) {
          if (doc.y > 650) { addFooter(doc, pageNum++); doc.addPage(); }
          sectionTitle(doc, '6. 예후 3경로');
          D.sec6_paths.forEach(p => {
            subTitle(doc, `${p.label} (${p.prob})`);
            bodyText(doc, p.text);
            if (doc.y > 720) { addFooter(doc, pageNum++); doc.addPage(); }
          });
        }

        // 섹션 8: 경제 가족력
        if (doc.y > 650) { addFooter(doc, pageNum++); doc.addPage(); }
        sectionTitle(doc, '8. 경제 가족력');
        bodyText(doc, D.sec8_narrative1997);
        bodyText(doc, D.sec8_narrative2008);
        bodyText(doc, D.sec8_common);

        // 섹션 9: 처방
        if (D.sec9_prescriptions && D.sec9_prescriptions.length > 0) {
          if (doc.y > 650) { addFooter(doc, pageNum++); doc.addPage(); }
          sectionTitle(doc, '9. 명의 처방');
          bodyText(doc, D.sec9_intro);
          D.sec9_prescriptions.forEach(p => {
            subTitle(doc, p.title);
            bodyText(doc, p.text);
            if (doc.y > 720) { addFooter(doc, pageNum++); doc.addPage(); }
          });
        }
      }

      // ── 섹션 10: 면책고지 ─────────────────────────────────
      if (doc.y > 680) { addFooter(doc, pageNum++); doc.addPage(); }
      sectionTitle(doc, '10. 면책 고지');
      const disclaimer = D?.sec10_disclaimer ||
        '본 보고서는 DIAH-7M 경제건강검진 시스템에 의해 자동 생성된 진단 결과서입니다. ' +
        '투자 권유나 정책 제안이 아니며, 참고용으로만 활용하시기 바랍니다. ' +
        '개별 경제 주체의 의사결정에 대한 책임은 본인에게 있습니다.';
      bodyText(doc, disclaimer);
      bodyText(doc, '© 인체국가경제론 / DIAH-7M / 윤종원');

      addFooter(doc, pageNum);

      doc.end();
      doc.on('end', () => { console.log('[renderer] PDF 생성 완료'); resolve(); });
      doc.on('error', reject);

    } catch (err) {
      reject(err);
    }
  });
}

// ── JSON / HTML (기존 유지) ──────────────────────────────
function renderJSON(diagnosis) {
  return JSON.stringify(diagnosis, null, 2);
}

function renderHTML(diagnosis) {
  const overall = diagnosis.overall || {};
  const axes    = diagnosis.axes || {};
  const lvName  = overall.levelName || LEVEL_NAMES[overall.level] || '미판정';
  const lvColor = LEVEL_COLORS_HEX[overall.level] || '#64748b';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>DIAH-7M 경제건강검진 보고서</title>
  <style>
    body{font-family:'Malgun Gothic',Arial,sans-serif;margin:40px;color:#334155;background:#f8fafc}
    h1{color:#0f172a;font-size:22px} h2{color:#1e293b;font-size:15px;border-bottom:2px solid #e2e8f0;padding-bottom:6px}
    .badge{display:inline-block;padding:4px 12px;border-radius:6px;color:#fff;font-weight:700;font-size:13px}
    table{border-collapse:collapse;width:100%;margin:12px 0}
    th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:left;font-size:13px}
    th{background:#f1f5f9;font-weight:700} tr:nth-child(even){background:#f8fafc}
    .footer{color:#94a3b8;font-size:11px;margin-top:40px;border-top:1px solid #e2e8f0;padding-top:12px}
  </style>
</head>
<body>
  <h1>DIAH-7M 경제 건강검진 보고서</h1>
  <p>대한민국 | ${diagnosis.period || ''} | 생성: ${new Date().toLocaleDateString('ko-KR')}</p>

  <h2>종합 판정</h2>
  <p>
    <span class="badge" style="background:${lvColor}">L${overall.level || '?'} ${lvName}</span>
    &nbsp; 점수: <strong>${typeof overall.score==='number'?overall.score.toFixed(2):'N/A'}</strong> / 5.0
  </p>

  <h2>9축 진단</h2>
  <table>
    <tr><th>축</th><th>경제용어(인체명칭)</th><th>점수</th><th>판정</th><th>게이지</th></tr>
    ${Object.entries(axes).map(([axId, ax]) => {
      const meta = AXIS_META[axId] || { eco: ax.metaphor||axId, body: ax.name||axId };
      const lv = ax.level || {};
      const lvN = lv.name || LEVEL_NAMES[lv.level] || '';
      const lvC = lv.color || LEVEL_COLORS_HEX[lv.level] || '#64748b';
      const sc = typeof ax.score==='number' ? ax.score.toFixed(2) : 'N/A';
      const gc = ax.gauges ? ax.gauges.length : (ax.count||0);
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
  <p>${(diagnosis.dualLock||{}).locked ? '⚠ 이중봉쇄 발동' : '✓ 이중봉쇄 해제'} — ${(diagnosis.dualLock||{}).reason||''}</p>

  ${(diagnosis.crossSignals||[]).length > 0 ? `
  <h2>교차신호 (${(diagnosis.crossSignals||[]).length}건)</h2>
  <ul>${(diagnosis.crossSignals||[]).slice(0,10).map(cs=>
    `<li>${cs.pair||cs.axes||''} — severity ${cs.severity||''}</li>`
  ).join('')}</ul>` : ''}

  <div class="footer">
    본 보고서는 DIAH-7M 경제건강검진 시스템에 의해 자동 생성된 진단 결과서입니다.<br>
    투자 권유나 정책 제안이 아니며, 참고용으로만 활용하시기 바랍니다.<br>
    © 인체국가경제론 / DIAH-7M / 윤종원
  </div>
</body>
</html>`;
}

module.exports = { renderPDF, renderJSON, renderHTML };
