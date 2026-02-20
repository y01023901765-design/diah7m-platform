/**
 * DIAH-7M Narrative Engine v1.0
 * ═══════════════════════════════
 * diagnosis 출력 → 한국어 서사 산문 변환
 *
 * 규칙:
 * - 관찰 언어만 사용 (예측 금지)
 * - 1단락 ≤ 80자 (모바일 가독성)
 * - 면책 조항 항상 포함
 */

const { BODY_MAP } = require('./core-engine');

// ==========================================
// 상태 → 서사 표현
// ==========================================

const LEVEL_DESC = {
  1: { adj: '안정적인', color: 'good',  icon: '🟢', label: '정상' },
  2: { adj: '소폭 둔화된', color: 'warn',  icon: '🟡', label: '관측' },
  3: { adj: '약화 징후를 보이는', color: 'warn',  icon: '🟠', label: '트리거' },
  4: { adj: '위축된', color: 'danger', icon: '🔴', label: '봉쇄' },
  5: { adj: '심각하게 위축된', color: 'danger', icon: '🔴', label: '위기' },
};

const CAUSAL_STAGE_DESC = {
  normal:   '대한민국 경제는 전반적으로 정상 범위에서 운용되고 있습니다.',
  factor:   '일부 선행 요인이 감지되었으나, 아직 구조적 영향은 제한적입니다.',
  onset:    '초기 징후가 복수의 축에서 관찰되며, 확산 여부를 주시할 필요가 있습니다.',
  cause:    '원인 요소들이 형성 단계에 있습니다. 교차 신호가 축적되고 있습니다.',
  manifest: '증상이 주요 지표에서 발현되고 있습니다. 면밀한 모니터링이 필요합니다.',
  result:   '복수의 축에서 결과가 고착화되는 패턴이 관찰됩니다.',
};

const DELTA_DESC = {
  ALIGNED:               '위성(야간광·열섬) 지수와 시장 지수가 유사한 수준을 보이고 있어, 실물과 시장이 균형을 유지하는 것으로 관찰됩니다.',
  POS_GAP_COMPENSATION:  '위성 지수가 시장 지수를 소폭 상회합니다. 실물 경제가 시장 평가를 다소 앞서는 패턴으로 관찰됩니다.',
  POS_GAP_PHYSICAL_OK_MARKET_BAD: '위성 지수가 시장 지수보다 현저히 높습니다. 실물 활동은 유지되는 반면 시장 심리는 과도하게 위축된 것으로 관찰됩니다.',
  NEG_GAP_PHYSICAL_BAD_DISCLOSURE_OK: '시장 지수가 위성 지수를 소폭 상회합니다. 실물 활동이 시장 공시 대비 다소 약화된 것으로 관찰됩니다.',
  NEG_GAP_MARKET_BUY_PHYSICAL_BAD:    '시장 지수가 위성 지수보다 현저히 높습니다. 실물 기반 대비 시장이 과열 평가될 가능성이 관찰됩니다.',
  CONFLICT: '위성 지수와 시장 지수 간 방향이 일치하지 않습니다. 추가 데이터 축적 후 재평가가 권고됩니다.',
  HOLD:     '위성 데이터가 아직 수집되지 않아 Delta 분석을 보류합니다.',
};

// ==========================================
// 섹션 생성 함수들
// ==========================================

/** 섹션1: 종합 현황 (2-3문장) */
function buildOverview(diag) {
  const { overall, systems, cross_signals } = diag;
  const lvl = LEVEL_DESC[overall.level] || LEVEL_DESC[3];
  const stageDesc = CAUSAL_STAGE_DESC[overall.causal_stage] || '';

  const topAlert = systems
    .filter(s => s.level >= 3)
    .sort((a, b) => b.level - a.level)
    .slice(0, 2);

  let text = `대한민국 경제는 종합 점수 ${overall.score}/5.0 (${overall.status}) 수준에서 관찰됩니다. `;
  text += stageDesc;

  if (topAlert.length > 0) {
    const names = topAlert.map(s => {
      const b = BODY_MAP[s.system_id];
      return b ? `${b.body_name}(${s.system_name})` : s.system_name;
    });
    text += ` 현재 ${names.join(', ')} 축에서 주의 신호가 감지됩니다.`;
  }

  if (cross_signals && cross_signals.length > 0) {
    text += ` ${cross_signals.length}건의 교차 신호가 축 간에 관찰되고 있습니다.`;
  }

  return {
    id: 'overview',
    title: '종합 현황',
    icon: lvl.icon,
    color: lvl.color,
    text,
    score: overall.score,
    level: overall.level,
    status: overall.status,
  };
}

/** 섹션2: 9축 상세 분석 (축별 1문장) */
function buildSystemsAnalysis(diag) {
  const { systems } = diag;
  const items = systems.map(s => {
    const b = BODY_MAP[s.system_id];
    const lvl = LEVEL_DESC[s.level] || LEVEL_DESC[3];
    const metaphor = b?.body_metaphor || '';
    let text = `${b?.body_name || s.system_id}(${s.system_name || s.system_id}) 축은 ${lvl.adj} 상태로, ${s.score}/5.0 수준에서 관찰됩니다.`;
    if (metaphor) text += ` ${metaphor.split('—')[0].trim()}.`;
    return {
      system_id: s.system_id,
      system_name: s.system_name,
      body_name: b?.body_name,
      score: s.score,
      level: s.level,
      status: s.status,
      icon: lvl.icon,
      color: lvl.color,
      text,
    };
  });

  return {
    id: 'systems',
    title: '9축 진단',
    items,
  };
}

/** 섹션3: 교차신호 & 이중봉쇄 */
function buildCrossSignals(diag) {
  const { cross_signals, dual_lock } = diag;

  if ((!cross_signals || cross_signals.length === 0) && !dual_lock?.active) {
    return {
      id: 'cross',
      title: '교차신호',
      active: false,
      text: '현재 관찰된 교차신호 및 이중봉쇄 징후는 없습니다.',
      signals: [],
      dualLock: null,
    };
  }

  const signals = (cross_signals || []).map(cs => {
    const pairNames = cs.pair.map(p => BODY_MAP[p]?.body_name || p);
    return {
      pair: cs.pair,
      pairNames,
      severity: cs.severity,
      description: cs.description,
      text: `${pairNames.join('·')} 축 동조 현상이 관찰됩니다. (${cs.description})`,
    };
  });

  let dualLockDesc = null;
  if (dual_lock?.active) {
    const sysNames = (dual_lock.sealed_systems || []).map(id => BODY_MAP[id]?.body_name || id);
    dualLockDesc = `${sysNames.join('·')} 축에서 이중봉쇄 패턴이 감지되었습니다. 경제 순환 흐름의 차단 가능성이 관찰됩니다.`;
  }

  return {
    id: 'cross',
    title: '교차신호',
    active: true,
    signals,
    dualLock: dualLockDesc,
    text: signals.map(s => s.text).join(' ') + (dualLockDesc ? ' ' + dualLockDesc : ''),
  };
}

/** 섹션4: 위성 Delta 분석 */
function buildDelta(diag) {
  const { delta } = diag;
  if (!delta) {
    return { id: 'delta', title: 'Delta 분석', text: DELTA_DESC.HOLD, state: 'HOLD', gap: null };
  }

  const key = delta.type
    ? `${delta.state}_${delta.type}`
    : delta.state;

  const text = DELTA_DESC[key] || DELTA_DESC[delta.state] || DELTA_DESC.HOLD;

  return {
    id: 'delta',
    title: 'Delta 분석 (위성 vs 시장)',
    text,
    state: delta.state,
    gap: delta.gap,
    satelliteIndex: delta.satellite_index,
    marketIndex: delta.market_index,
    description: delta.description,
  };
}

/** 섹션5: 행동 시그널 요약 */
function buildActions(diag) {
  const { actions } = diag;
  const relevant = (actions || []).filter(a => a.type !== 'context');
  return {
    id: 'actions',
    title: '관찰 시그널',
    items: relevant.map(a => ({
      type: a.type,
      text: a.text,
      confidence: a.confidence,
    })),
  };
}

/** 섹션6: 면책 조항 (항상 포함) */
function buildDisclaimer(diag) {
  const date = diag.context?.date || new Date().toISOString().split('T')[0];
  return {
    id: 'disclaimer',
    title: '면책 조항',
    text: `본 보고서는 ${date} 기준 관찰 데이터에 기반한 진단입니다. DIAH-7M은 관찰 기반 도구이며, 투자 조언이나 미래 예측을 제공하지 않습니다. 모든 수치는 과거 데이터의 관찰 결과이며, 실제 경제 상황은 다를 수 있습니다.`,
    reportId: diag.report_id,
    generatedAt: diag.metadata?.generated_at,
    engineVersion: diag.metadata?.engine_version,
  };
}

// ==========================================
// 메인 서사 생성 함수
// ==========================================

/**
 * diagnosis 결과 → narrative 구조체
 * @param {Object} diag - core-engine.diagnose() 출력
 * @returns {Object} narrative - ReportPanel이 소비하는 구조체
 */
function buildNarrative(diag) {
  if (!diag || !diag.overall) {
    return {
      error: true,
      text: '진단 데이터를 불러올 수 없습니다.',
      sections: [],
    };
  }

  const overview = buildOverview(diag);
  const systems = buildSystemsAnalysis(diag);
  const cross = buildCrossSignals(diag);
  const delta = buildDelta(diag);
  const actions = buildActions(diag);
  const disclaimer = buildDisclaimer(diag);

  return {
    report_id: diag.report_id,
    date: diag.context?.date,
    country: diag.context?.country_name || '대한민국',
    engineVersion: diag.metadata?.engine_version || '2.0',
    overview,
    sections: [systems, cross, delta, actions],
    disclaimer,
    // 원본 verdict (1-2문장) 유지
    verdict: diag.verdict,
    // 메타
    causal_stage: diag.overall?.causal_stage,
    overall_level: diag.overall?.level,
    overall_score: diag.overall?.score,
    overall_status: diag.overall?.status,
  };
}

module.exports = { buildNarrative };
