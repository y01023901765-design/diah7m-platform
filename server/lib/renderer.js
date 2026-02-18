/**
 * DIAH-7M Report Renderer
 * 
 * GPT 피드백 반영 (2026-02-16):
 * - PDFKit 사용 (Puppeteer 금지)
 * - Standard 디자인 (텍스트 + 표)
 * - Stream 전송 (파일 저장 X)
 */

const PDFDocument = require('pdfkit');

// ==========================================
// N10: PDF 렌더링 (GPT 피드백)
// ==========================================

/**
 * PDF 보고서 생성 (Standard 디자인)
 * 
 * @param {Object} diagnosis - 진단 결과
 * @param {Stream} outputStream - 출력 스트림 (res 또는 파일)
 */
async function renderPDF(diagnosis, outputStream) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });
      
      // Stream 연결
      doc.pipe(outputStream);
      
      // 1. 헤더
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('DIAH-7M 경제 진단 보고서', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(10)
         .font('Helvetica')
         .text(`생성일시: ${diagnosis.metadata.generated_at}`, { align: 'center' });
      
      doc.moveDown(2);
      
      // 2. 종합 요약 박스
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('종합 점수');
      
      doc.moveDown(0.5);
      
      doc.fontSize(14)
         .font('Helvetica')
         .text(`점수: ${diagnosis.overall.score}/100`)
         .text(`등급: ${diagnosis.overall.grade}`)
         .text(`추세: ${diagnosis.overall.trend}`);
      
      doc.moveDown(2);
      
      // 3. 9축 진단 표
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('9축 진단 결과');
      
      doc.moveDown(1);
      
      // 표 헤더
      const tableTop = doc.y;
      const colWidths = [60, 200, 80, 80, 80];
      
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('축', 50, tableTop, { width: colWidths[0] });
      doc.text('이름', 50 + colWidths[0], tableTop, { width: colWidths[1] });
      doc.text('점수', 50 + colWidths[0] + colWidths[1], tableTop, { width: colWidths[2] });
      doc.text('Severity', 50 + colWidths[0] + colWidths[1] + colWidths[2], tableTop, { width: colWidths[3] });
      doc.text('추세', 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], tableTop, { width: colWidths[4] });
      
      doc.moveDown(0.5);
      
      // 표 데이터
      doc.font('Helvetica');
      diagnosis.systems.forEach((system, index) => {
        const y = doc.y;
        doc.text(system.axis_id, 50, y, { width: colWidths[0] });
        doc.text(system.name, 50 + colWidths[0], y, { width: colWidths[1] });
        doc.text(system.score !== null ? system.score.toString() : 'N/A', 50 + colWidths[0] + colWidths[1], y, { width: colWidths[2] });
        doc.text(system.severity !== null ? system.severity.toString() : 'N/A', 50 + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] });
        doc.text(system.trend || 'N/A', 50 + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4] });
        doc.moveDown(0.3);
      });
      
      doc.moveDown(2);
      
      // 4. 교차신호 (있으면)
      if (diagnosis.crossSignals && diagnosis.crossSignals.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold')
           .text('교차신호 (상위 3개)');
        
        doc.moveDown(1);
        
        diagnosis.crossSignals.slice(0, 3).forEach((signal, index) => {
          doc.fontSize(10).font('Helvetica')
             .text(`${index + 1}. ${signal.description} (Severity: ${signal.severity})`);
          doc.moveDown(0.5);
        });
        
        doc.moveDown(1);
      }
      
      // 5. 이중봉쇄 (있으면)
      if (diagnosis.dualLocks && diagnosis.dualLocks.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold')
           .text('이중봉쇄 감지');
        
        doc.moveDown(1);
        
        diagnosis.dualLocks.forEach((lock, index) => {
          doc.fontSize(10).font('Helvetica')
             .text(`⚠️  ${lock.description} (Severity: ${lock.severity})`);
          doc.moveDown(0.5);
        });
        
        doc.moveDown(1);
      }
      
      // 6. 행동시그널 (관찰 언어)
      if (diagnosis.actionSignals && diagnosis.actionSignals.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold')
           .text('관찰 시그널');
        
        doc.moveDown(1);
        
        diagnosis.actionSignals.slice(0, 10).forEach((signal, index) => {
          doc.fontSize(10).font('Helvetica')
             .text(`• ${signal.description}`);
          if (signal.detail) {
            doc.fontSize(9).font('Helvetica').fillColor('#666666')
               .text(`  ${signal.detail}`);
            doc.fillColor('#000000');
          }
          doc.moveDown(0.3);
        });
      }
      
      // 7. 푸터
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').fillColor('#999999')
         .text('본 보고서는 DIAH-7M 진단 엔진에 의해 자동 생성되었습니다.', { align: 'center' })
         .text('관찰 시그널은 사실 기반 현상 설명이며, 투자 조언이 아닙니다.', { align: 'center' });
      
      // 완료
      doc.end();
      
      doc.on('end', () => {
        console.log('✅ PDF generated successfully');
        resolve();
      });
      
      doc.on('error', (error) => {
        console.error('❌ PDF generation error:', error);
        reject(error);
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * JSON 렌더링 (간단)
 */
function renderJSON(diagnosis) {
  return JSON.stringify(diagnosis, null, 2);
}

/**
 * HTML 렌더링 (선택)
 */
function renderHTML(diagnosis) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DIAH-7M 진단 보고서</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>DIAH-7M 경제 진단 보고서</h1>
  <p>생성일시: ${diagnosis.metadata.generated_at}</p>
  
  <h2>종합 점수</h2>
  <p>점수: ${diagnosis.overall.score}/100</p>
  <p>등급: ${diagnosis.overall.grade}</p>
  
  <h2>9축 진단</h2>
  <table>
    <tr>
      <th>축</th>
      <th>이름</th>
      <th>점수</th>
      <th>Severity</th>
      <th>추세</th>
    </tr>
    ${diagnosis.systems.map(s => `
      <tr>
        <td>${s.axis_id}</td>
        <td>${s.name}</td>
        <td>${s.score !== null ? s.score : 'N/A'}</td>
        <td>${s.severity !== null ? s.severity : 'N/A'}</td>
        <td>${s.trend || 'N/A'}</td>
      </tr>
    `).join('')}
  </table>
  
  ${diagnosis.crossSignals && diagnosis.crossSignals.length > 0 ? `
    <h2>교차신호</h2>
    <ul>
      ${diagnosis.crossSignals.slice(0, 3).map(s => `
        <li>${s.description} (Severity: ${s.severity})</li>
      `).join('')}
    </ul>
  ` : ''}
  
  ${diagnosis.actionSignals && diagnosis.actionSignals.length > 0 ? `
    <h2>관찰 시그널</h2>
    <ul>
      ${diagnosis.actionSignals.slice(0, 10).map(s => `
        <li>${s.description}</li>
      `).join('')}
    </ul>
  ` : ''}
  
  <p style="color: #999; font-size: 12px; margin-top: 40px;">
    본 보고서는 DIAH-7M 진단 엔진에 의해 자동 생성되었습니다.<br>
    관찰 시그널은 사실 기반 현상 설명이며, 투자 조언이 아닙니다.
  </p>
</body>
</html>
  `;
}

module.exports = {
  renderPDF,
  renderJSON,
  renderHTML,
};
