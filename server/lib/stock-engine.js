'use strict';

/**
 * DIAH-7M Stock Engine — 주식 종합 진단
 * ═══════════════════════════════════════════════════
 * score-engine.js V2의 computeScoreV2()를 감싸는 thin wrapper.
 * + Archetype별 severity 계산
 * + 위성-시장 Delta Divergence
 * + 이중봉쇄(Dual Lock) 판별
 * + GL-* 환경보정 contextNote
 *
 * Pure computation. No I/O.
 */

var scoreEngine = require('./score-engine');
var thresholds = require('./stock-thresholds');

var STOCK_GAUGE_THRESHOLDS = thresholds.STOCK_GAUGE_THRESHOLDS;
var STOCK_CRITICAL_GAUGE_IDS = thresholds.STOCK_CRITICAL_GAUGE_IDS;
var STOCK_AXES = thresholds.STOCK_AXES;
var ARCHETYPE_WEIGHTS = thresholds.ARCHETYPE_WEIGHTS;
var AXIS_TO_SEVERITY_DIM = thresholds.AXIS_TO_SEVERITY_DIM;

// ── 주식 점수 계산 ─────────────────────────────────

function computeStockScore(stockGauges, opts) {
  return scoreEngine.computeScoreV2(stockGauges, {
    thresholds: STOCK_GAUGE_THRESHOLDS,
    criticals: STOCK_CRITICAL_GAUGE_IDS,
    k: (opts && opts.k != null) ? opts.k : 3, // 주식은 k=3 (국가 k=4보다 민감)
  });
}

// ── Archetype별 Severity 계산 (0~5 스케일) ──────────
// 5축 점수를 archetype 가중치로 가중평균하여 severity 산출
// severity = 5 - (가중평균점수 / 100 * 5)
// 0 = 건강, 5 = 위험

function computeSeverity(archetype, systemScores) {
  var weights = ARCHETYPE_WEIGHTS[archetype] || ARCHETYPE_WEIGHTS['A'];
  var totalWeight = 0;
  var weightedScore = 0;

  var axKeys = Object.keys(AXIS_TO_SEVERITY_DIM);
  for (var i = 0; i < axKeys.length; i++) {
    var axKey = axKeys[i];
    var dim = AXIS_TO_SEVERITY_DIM[axKey];
    var w = weights[dim] || 0;
    var axScore = (systemScores[axKey] && systemScores[axKey].score != null)
      ? systemScores[axKey].score : 50; // 데이터 없으면 중립 50
    weightedScore += axScore * w;
    totalWeight += w;
  }

  var avg = totalWeight > 0 ? weightedScore / totalWeight : 50;
  // 0~100 점수를 0~5 severity로 반전 (높은 점수 = 낮은 severity)
  var sev = Math.round((5 - (avg / 100 * 5)) * 10) / 10;
  return Math.max(0, Math.min(5, sev));
}

// ── Delta Divergence (위성 vs 시장) ─────────────────
// satScore: SS축 점수, mktScore: SM축 점수

function computeDeltaDivergence(satScore, mktScore) {
  var ss = (satScore != null) ? satScore : 50;
  var mm = (mktScore != null) ? mktScore : 50;
  var gap = ss - mm;

  var state = 'ALIGNED';
  var flag = null;

  if (gap <= -20) {
    state = 'NEG_GAP';
    flag = 'satDownMktUp'; // 위성 악화 but 시장 양호 → 선행 하락 위험
  } else if (gap >= 20) {
    state = 'POS_GAP';
    flag = 'satUpMktDown'; // 위성 양호 but 시장 부진 → 선행 턴어라운드
  }

  return { gap: Math.round(gap), state: state, flag: flag };
}

// ── 이중봉쇄 (Dual Lock) ───────────────────────────
// Input 막힘: 재무건전성(SQ) 경보
// Output 막힘: 위성물리(SS) 경보

function computeDualLock(systemScores) {
  var sqScore = systemScores.SQ ? systemScores.SQ.score : 50;
  var ssScore = systemScores.SS ? systemScores.SS.score : 50;

  var inputBlocked = sqScore < 40;  // 재무 악화 → 투입(자금/재고) 막힘
  var outputBlocked = ssScore < 40; // 위성 악화 → 산출(생산/출하) 막힘

  return {
    input: inputBlocked ? 'BLOCKED' : 'OK',
    output: outputBlocked ? 'BLOCKED' : 'OK',
    isDualLocked: inputBlocked && outputBlocked,
  };
}

// ── GL-* 환경보정 contextNote ───────────────────────
// glContext: { bdi: { value, trend }, vix: { value, trend }, ... }
// 점수를 가감하지 않고 '문장(note)'으로만 제공 — 수축 엔진 순수성 유지

function buildContextNote(alertGauges, glContext) {
  if (!glContext || !alertGauges || alertGauges.length === 0) return null;

  var notes = [];

  // 위성 경보 + BDI 하락 → 글로벌 물류 침체 영향
  if (alertGauges.indexOf('SG_S1') !== -1 && glContext.bdi && glContext.bdi.trend === 'down') {
    notes.push('글로벌 물류 침체(BDI 하락) 영향으로 실물 출하 둔화 정상참작');
  }
  // 성장 경보 + VIX 급등 → 글로벌 공포 확산
  if (alertGauges.indexOf('SG_G2') !== -1 && glContext.vix && glContext.vix.value > 30) {
    notes.push('글로벌 공포 확산(VIX ' + glContext.vix.value + ') 환경에서 성장 둔화');
  }
  // 모멘텀 경보 + DXY 급등 → 달러 강세 압력
  if (alertGauges.indexOf('SG_M2') !== -1 && glContext.dxy && glContext.dxy.trend === 'up') {
    notes.push('달러 강세(DXY 상승) 환경에서 신흥시장 자금유출 가능성');
  }

  if (notes.length === 0 && alertGauges.length > 0) {
    notes.push('글로벌 환경은 정상이나 해당 기업 고유 이슈 감지');
  }

  return notes.join(' | ');
}

// ── 종합 건강도 (모든 것 합치기) ────────────────────

function buildStockHealth(profile, gaugeValues, glContext) {
  // 1. 게이지에 axis 매핑 추가
  var gauges = {};
  var gIds = Object.keys(gaugeValues);
  for (var i = 0; i < gIds.length; i++) {
    var gId = gIds[i];
    var gv = gaugeValues[gId];
    // axis 자동 판별
    var axis = 'unknown';
    var axKeys = Object.keys(STOCK_AXES);
    for (var j = 0; j < axKeys.length; j++) {
      if (STOCK_AXES[axKeys[j]].gauges.indexOf(gId) !== -1) {
        axis = axKeys[j];
        break;
      }
    }
    gauges[gId] = {
      value: (gv && gv.value != null) ? gv.value : (typeof gv === 'number' ? gv : null),
      axis: axis,
    };
  }

  // 2. 점수 계산
  var scoreResult = computeStockScore(gauges);

  // 3. Severity
  var severity = computeSeverity(profile.archetype || 'A', scoreResult.systemScores);

  // 4. Delta Divergence
  var ssScore = scoreResult.systemScores.SS ? scoreResult.systemScores.SS.score : null;
  var smScore = scoreResult.systemScores.SM ? scoreResult.systemScores.SM.score : null;
  var delta = computeDeltaDivergence(ssScore, smScore);

  // 5. Dual Lock
  var dualLock = computeDualLock(scoreResult.systemScores);

  // 6. GL-* 환경보정 contextNote
  var contextNote = buildContextNote(scoreResult.alertGauges, glContext);

  return {
    score: scoreResult.score,
    confidence: scoreResult.confidence,
    severity: severity,
    gaugeScores: scoreResult.gaugeScores,
    systemScores: scoreResult.systemScores,
    alertGauges: scoreResult.alertGauges,
    delta: delta,
    dualLock: dualLock,
    contextNote: contextNote,
  };
}

module.exports = {
  computeStockScore: computeStockScore,
  computeSeverity: computeSeverity,
  computeDeltaDivergence: computeDeltaDivergence,
  computeDualLock: computeDualLock,
  buildContextNote: buildContextNote,
  buildStockHealth: buildStockHealth,
};
