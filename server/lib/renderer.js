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

module.exports = { render, renderWeb, renderPDF, renderWord, applyTierMask, TIER_ORDER, SECTION_TIERS };
