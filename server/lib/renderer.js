/**
 * DIAH-7M Report Renderer v1.0
 * 3채널: Web(JSON) / PDF / Word
 * tierMask 적용 — guest→최소, enterprise→전부
 */
const TIER_ORDER = ['guest', 'free', 'pay_per_report', 'standard', 'professional', 'enterprise'];
const SECTION_TIERS = {
  header: 'guest', systems: 'pay_per_report', gauges: 'standard',
  summary: 'standard', action_signals: 'professional', satellite: 'professional',
  causal_analysis: 'enterprise',
};

function tierIndex(tier) { return Math.max(0, TIER_ORDER.indexOf(tier)); }

function applyTierMask(report, userTier) {
  const userIdx = tierIndex(userTier || 'guest');
  const filtered = {};
  for (const [section, minTier] of Object.entries(SECTION_TIERS)) {
    if (userIdx >= tierIndex(minTier)) {
      filtered[section] = report[section];
    } else {
      filtered[section] = { locked: true, required_tier: minTier, preview: `Upgrade to ${minTier} to unlock` };
    }
  }
  filtered.report_id = report.report_id;
  filtered.product_type = report.product_type;
  filtered.frequency = report.frequency;
  filtered.context = report.context;
  filtered.metadata = report.metadata;
  filtered.overall = report.overall;
  return filtered;
}

function renderWeb(report, userTier) {
  return { channel: 'web', content_type: 'application/json', data: applyTierMask(report, userTier) };
}

function renderPDF(report, userTier) {
  const masked = applyTierMask(report, userTier);
  return {
    channel: 'pdf', content_type: 'application/pdf',
    sections: Object.entries(masked).filter(([,v]) => v && !v.locked).map(([k,v]) => ({ section: k, content: v })),
    metadata: { generated_at: new Date().toISOString(), tier: userTier, page_estimate: estimatePages(masked) },
  };
}

/**
 * 실제 PDF 파일 Buffer 생성 (pdfkit)
 * renderPDF()의 JSON 구조를 받아 PDF로 변환
 * @returns {Promise<Buffer>}
 */
async function renderPDFBuffer(report, userTier) {
  let PDFDocument;
  try { PDFDocument = require('pdfkit'); } catch(e) { throw new Error('pdfkit not installed'); }

  const masked = applyTierMask(report, userTier);
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header ──
    doc.fontSize(24).font('Helvetica-Bold').text('DIAH-7M', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Economic Diagnosis Report', { align: 'center' });
    doc.moveDown(0.5);
    const ctx = report.context || {};
    doc.fontSize(10).fillColor('#666')
       .text(`${ctx.country_name || 'Korea'} · ${ctx.period_label || ctx.date || ''} · Tier: ${userTier}`, { align: 'center' });
    doc.moveDown(1);

    // ── Overall Score ──
    const ov = report.overall || {};
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#111').text('Overall Status');
    doc.fontSize(11).font('Helvetica').fillColor('#333')
       .text(`Score: ${ov.score || '-'}/5 · Level: ${ov.level || '-'} · Stage: ${ov.causal_stage || '-'}`)
       .moveDown(1);

    // ── Systems ──
    if (masked.systems && !masked.systems.locked) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111').text('9 Systems Diagnosis');
      doc.moveDown(0.3);
      const sys = report.systems || {};
      for (const [key, s] of Object.entries(sys)) {
        const sevColor = s.severity <= 2 ? '#059669' : s.severity <= 3 ? '#D97706' : '#DC2626';
        doc.fontSize(10).font('Helvetica-Bold').fillColor(sevColor)
           .text(`${s.name || key}: severity ${s.severity}/5`, { continued: false });
      }
      doc.moveDown(1);
    }

    // ── Actions ──
    if (masked.action_signals && !masked.action_signals.locked && report.actions?.length) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111').text('Action Signals');
      doc.moveDown(0.3);
      for (const a of report.actions) {
        const prefix = a.type === 'observation' ? '📍' : a.type === 'watch' ? '👁' : 'ℹ';
        doc.fontSize(9).font('Helvetica').fillColor('#333')
           .text(`${prefix} [${a.type}] ${a.text}`, { indent: 10 });
      }
      doc.moveDown(1);
    }

    // ── Locked sections ──
    for (const [section, val] of Object.entries(masked)) {
      if (val?.locked) {
        doc.fontSize(9).fillColor('#999').text(`[${section}] — Requires ${val.required_tier} tier to unlock`);
      }
    }

    // ── Footer ──
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#aaa')
       .text('DIAH-7M provides observation-based measurement, not prediction.', { align: 'center' })
       .text(`Generated: ${new Date().toISOString()} · Engine v1.1`, { align: 'center' });

    doc.end();
  });
}

function renderWord(report, userTier) {
  const masked = applyTierMask(report, userTier);
  return {
    channel: 'word', content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sections: Object.entries(masked).filter(([,v]) => v && !v.locked).map(([k,v]) => ({ section: k, content: v })),
    metadata: { generated_at: new Date().toISOString(), tier: userTier },
  };
}

function estimatePages(report) {
  let p = 1; // header
  if (report.systems && !report.systems.locked) p += 1;
  if (report.gauges && !report.gauges.locked) p += 2;
  if (report.summary && !report.summary.locked) p += 1;
  if (report.action_signals && !report.action_signals.locked) p += 1;
  if (report.satellite && !report.satellite.locked) p += 1;
  if (report.causal_analysis && !report.causal_analysis.locked) p += 2;
  return p;
}

function render(report, userTier, channel = 'web') {
  const renderers = { web: renderWeb, pdf: renderPDF, word: renderWord };
  return (renderers[channel] || renderers.web)(report, userTier);
}

module.exports = { render, renderWeb, renderPDF, renderPDFBuffer, renderWord, applyTierMask, TIER_ORDER, SECTION_TIERS };
