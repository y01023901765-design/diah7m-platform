'use strict';

/**
 * DIAH-7M Score Engine — Country / Continent / World scoring
 * ═══════════════════════════════════════════════════════════
 * Pure computation module. No I/O, no Express, no side effects.
 *
 * V2: Bayesian shrinkage + direction-aware grading + score-alert separation
 */

const CRITICAL_GAUGE_IDS = ['G_D1', 'G_L1', 'G_P1', 'G_S1', 'G_R2', 'G_F2'];

// ── V2: 20-gauge threshold table ─────────────────────────
// dir: higher_better | lower_better | target_2pct | neutral
// good/warn/alarm: [low, high] ranges
// Score mapping: 양호=85, 주의=50, 경보=15

const GAUGE_THRESHOLDS = {
  G_I1: { dir: 'neutral',        good: [0, 8] },
  G_I2: { dir: 'neutral' },
  G_I3: { dir: 'neutral',        good: [40, 120] },
  G_E1: { dir: 'higher_better' },
  G_E2: { dir: 'neutral' },
  G_E3: { dir: 'higher_better' },
  G_C1: { dir: 'neutral',        good: [45, 75] },
  G_C2: { dir: 'higher_better',  good: [100, 110], warn: [98, 100], alarm: [0, 96] },
  G_S1: { dir: 'higher_better',  good: [100.5, 105], warn: [99.5, 100.5], alarm: [0, 99.5] },
  G_S2: { dir: 'neutral' },
  G_F1: { dir: 'higher_better' },
  G_F2: { dir: 'lower_better',   good: [0, 60], warn: [60, 100], alarm: [100, 300] },
  G_P1: { dir: 'target_2pct',    good: [1, 3], warn: [0, 5], alarm: [-1, 8] },
  G_P2: { dir: 'neutral',        good: [-2, 3], warn: [-5, 6] },
  G_R1: { dir: 'higher_better' },
  G_R2: { dir: 'higher_better',  good: [52, 65], warn: [48, 52], alarm: [0, 48] },
  G_L1: { dir: 'lower_better',   good: [0, 4], warn: [4, 8], alarm: [8, 30] },
  G_L2: { dir: 'higher_better',  good: [65, 90], warn: [55, 65], alarm: [0, 55] },
  G_D1: { dir: 'higher_better',  good: [3, 15], warn: [0, 3], alarm: [-5, 0] },
  G_D2: { dir: 'higher_better',  good: [22, 45], warn: [18, 22], alarm: [0, 18] },
};

// ── V2: Direction-aware gauge grading ────────────────────
// thresholdsTable 파라미터: 주식/국가 등 엔진별 다른 threshold 주입 가능

function gradeGauge(gaugeId, value, thresholdsTable) {
  if (value == null || isNaN(value)) return { score: null, grade: null };
  var th = (thresholdsTable || GAUGE_THRESHOLDS)[gaugeId];
  if (!th) return { score: 50, grade: 'caution' };
  if (!th.good) return { score: 50, grade: 'good' }; // no thresholds → neutral=good

  var gL = th.good[0], gH = th.good[1];
  var wL = th.warn ? th.warn[0] : gL;
  var wH = th.warn ? th.warn[1] : gH;

  if (th.dir === 'lower_better') {
    if (value <= gH) return { score: 85, grade: 'good' };
    if (value <= wH) return { score: 50, grade: 'caution' };
    return { score: 15, grade: 'alert' };
  }
  if (th.dir === 'target_2pct') {
    if (value >= gL && value <= gH) return { score: 85, grade: 'good' };
    if (value >= wL && value <= wH) return { score: 50, grade: 'caution' };
    return { score: 15, grade: 'alert' };
  }
  if (th.dir === 'neutral') {
    if (value >= gL && value <= gH) return { score: 85, grade: 'good' };
    if (value >= wL && value <= wH) return { score: 50, grade: 'caution' };
    return { score: 15, grade: 'alert' };
  }
  // higher_better (default)
  if (value >= gL) return { score: 85, grade: 'good' };
  if (value >= wL) return { score: 50, grade: 'caution' };
  return { score: 15, grade: 'alert' };
}

// ── V2: Bayesian shrinkage ───────────────────────────────
// adjusted = (n * raw + k * 50) / (n + k)
// n = actual gauge count (NOT weight sum!) → prevents overconfidence

var SHRINK_K = 4;

function shrinkScore(rawAvg, gaugeCount, k) {
  var kk = (k != null) ? k : SHRINK_K;
  return Math.round((gaugeCount * rawAvg + kk * 50) / (gaugeCount + kk));
}

// ── V2: 범용 스코어링 (국가/주식 공용) ─────────────────
// opts.thresholds — threshold 테이블 (기본: GAUGE_THRESHOLDS)
// opts.criticals — critical 게이지 목록 (기본: CRITICAL_GAUGE_IDS)
// opts.k         — 수축 강도 (기본: 4)

function computeScoreV2(gauges, opts) {
  var thresholds = (opts && opts.thresholds) || null;
  var criticals = (opts && opts.criticals) || CRITICAL_GAUGE_IDS;
  var k = (opts && opts.k != null) ? opts.k : SHRINK_K;

  var gaugeScores = {};
  var byAxis = {};

  var gIds = Object.keys(gauges);
  for (var i = 0; i < gIds.length; i++) {
    var gId = gIds[i];
    var g = gauges[gId];
    if (!g || g.value == null) continue;

    var val = typeof g.value === 'string' ? parseFloat(g.value) : g.value;
    if (isNaN(val)) continue;

    var result = gradeGauge(gId, val, thresholds);
    if (!result.grade) continue;

    var isCritical = criticals.indexOf(gId) !== -1;
    var weight = isCritical ? 2 : 1;
    gaugeScores[gId] = { score: result.score, grade: result.grade, weight: weight };

    var ax = g.axis || 'unknown';
    if (!byAxis[ax]) byAxis[ax] = [];
    byAxis[ax].push({ gaugeId: gId, score: result.score, grade: result.grade, weight: weight });
  }

  // System scores: weighted mean (importance) → shrink (n=actual count)
  var systemScores = {};
  var axKeys = Object.keys(byAxis);
  for (var a = 0; a < axKeys.length; a++) {
    var ax = axKeys[a];
    var items = byAxis[ax];
    var tw = 0, ws = 0;
    var hasAlert = false;
    var alertCount = 0;
    for (var j = 0; j < items.length; j++) {
      tw += items[j].weight;
      ws += items[j].score * items[j].weight;
      if (items[j].grade === 'alert') {
        hasAlert = true;
        alertCount++;
      }
    }
    var rawAvg = ws / tw;
    var sc = shrinkScore(rawAvg, items.length, k);
    systemScores[ax] = {
      score: sc,
      grade: sc >= 70 ? 'good' : sc >= 40 ? 'caution' : 'alert',
      count: items.length,
      hasAlert: hasAlert,
      alertCount: alertCount,
    };
  }

  // Overall: weighted mean (importance) → shrink (n=actual count)
  var allItems = [];
  for (var kk = 0; kk < axKeys.length; kk++) {
    var axItems = byAxis[axKeys[kk]];
    for (var m = 0; m < axItems.length; m++) {
      allItems.push(axItems[m]);
    }
  }
  var totalW = 0, totalS = 0;
  for (var p = 0; p < allItems.length; p++) {
    totalW += allItems[p].weight;
    totalS += allItems[p].score * allItems[p].weight;
  }
  var overallRaw = totalW > 0 ? totalS / totalW : 50;
  var score = shrinkScore(overallRaw, allItems.length, k);
  var confidence = allItems.length / (Object.keys(thresholds || GAUGE_THRESHOLDS).length || 20);

  var alertGaugeIds = [];
  var gsKeys = Object.keys(gaugeScores);
  for (var q = 0; q < gsKeys.length; q++) {
    if (gaugeScores[gsKeys[q]].grade === 'alert') {
      alertGaugeIds.push(gsKeys[q]);
    }
  }

  return {
    score: score,
    confidence: confidence,
    gaugeScores: gaugeScores,
    systemScores: systemScores,
    alertGauges: alertGaugeIds,
  };
}

// ── V2: Country score (기존 래퍼 — 하위호환) ──────────

function computeCountryScoreV2(gauges) {
  var gaugeScores = {};
  var byAxis = {};

  var gIds = Object.keys(gauges);
  for (var i = 0; i < gIds.length; i++) {
    var gId = gIds[i];
    var g = gauges[gId];
    if (!g || g.value == null) continue;

    var val = typeof g.value === 'string' ? parseFloat(g.value) : g.value;
    if (isNaN(val)) continue;

    var result = gradeGauge(gId, val);
    if (!result.grade) continue;

    var isCritical = CRITICAL_GAUGE_IDS.indexOf(gId) !== -1;
    var weight = isCritical ? 2 : 1;
    gaugeScores[gId] = { score: result.score, grade: result.grade, weight: weight };

    var ax = g.axis || 'unknown';
    if (!byAxis[ax]) byAxis[ax] = [];
    byAxis[ax].push({ gaugeId: gId, score: result.score, grade: result.grade, weight: weight });
  }

  // System scores: weighted mean (importance) → shrink (n=actual count, confidence)
  var systemScores = {};
  var axKeys = Object.keys(byAxis);
  for (var a = 0; a < axKeys.length; a++) {
    var ax = axKeys[a];
    var items = byAxis[ax];
    var tw = 0, ws = 0;
    var hasAlert = false;
    var alertCount = 0;
    for (var j = 0; j < items.length; j++) {
      tw += items[j].weight;
      ws += items[j].score * items[j].weight;
      if (items[j].grade === 'alert') {
        hasAlert = true;
        alertCount++;
      }
    }
    var rawAvg = ws / tw;                          // importance in raw only
    var sc = shrinkScore(rawAvg, items.length);    // n = actual gauge count!
    systemScores[ax] = {
      score: sc,
      grade: sc >= 70 ? 'good' : sc >= 40 ? 'caution' : 'alert',
      count: items.length,
      hasAlert: hasAlert,
      alertCount: alertCount,
    };
  }

  // Overall: weighted mean (importance) → shrink (n=actual count)
  var allItems = [];
  for (var k = 0; k < axKeys.length; k++) {
    var axItems = byAxis[axKeys[k]];
    for (var m = 0; m < axItems.length; m++) {
      allItems.push(axItems[m]);
    }
  }
  var totalW = 0, totalS = 0;
  for (var p = 0; p < allItems.length; p++) {
    totalW += allItems[p].weight;
    totalS += allItems[p].score * allItems[p].weight;
  }
  var overallRaw = totalW > 0 ? totalS / totalW : 50;
  var score = shrinkScore(overallRaw, allItems.length);
  var confidence = allItems.length / 20; // display only, no penalty

  // Collect alert gauge IDs
  var alertGaugeIds = [];
  var gsKeys = Object.keys(gaugeScores);
  for (var q = 0; q < gsKeys.length; q++) {
    if (gaugeScores[gsKeys[q]].grade === 'alert') {
      alertGaugeIds.push(gsKeys[q]);
    }
  }

  return {
    score: score,
    confidence: confidence,
    gaugeScores: gaugeScores,
    systemScores: systemScores,
    alertGauges: alertGaugeIds,
  };
}

// ── V1: Individual gauge scoring (legacy) ────────────────

function scoreGauge(gaugeId, value) {
  if (value === null || value === undefined || isNaN(value)) return 0;

  switch (gaugeId) {
    case 'G_D1': // GDP Growth (%), higher_better
      if (value > 3) return 10;
      if (value > 1) return 5;
      if (value < -2) return -10;
      if (value < 0) return -5;
      return 0;

    case 'G_L1': // Unemployment (%), lower_better
      if (value < 4) return 10;
      if (value < 6) return 5;
      if (value > 12) return -10;
      if (value > 8) return -5;
      return 0;

    case 'G_P1': // CPI (%), target ~2%
      if (value >= 1 && value <= 3) return 5;
      if (value > 8 || value < -1) return -10;
      if (value > 5 || value < 0) return -5;
      return 0;

    case 'G_S1': // CLI (index, 100 = trend)
      if (value > 100.5) return 5;
      if (value < 99.5) return -5;
      return 0;

    case 'G_R2': // PMI (index, 50 = neutral)
      if (value > 52) return 5;
      if (value < 48) return -5;
      return 0;

    case 'G_F2': // Gov Debt (% of GDP), lower_better
      if (value < 60) return 5;
      if (value > 120) return -10;
      if (value > 100) return -5;
      return 0;

    default:
      return 0;
  }
}

// ── V1: Country score (legacy, kept for hierarchy.js compat) ──

function computeCountryScore(gauges) {
  var BASE = 50;
  var total = 0;
  var available = 0;
  var breakdown = {};

  for (var i = 0; i < CRITICAL_GAUGE_IDS.length; i++) {
    var gid = CRITICAL_GAUGE_IDS[i];
    var gauge = gauges[gid];

    if (!gauge || gauge.value === null || gauge.value === undefined) {
      breakdown[gid] = { value: null, contribution: 0, available: false };
      continue;
    }

    var val = typeof gauge.value === 'string' ? parseFloat(gauge.value) : gauge.value;
    if (isNaN(val)) {
      breakdown[gid] = { value: gauge.value, contribution: 0, available: false };
      continue;
    }

    var contribution = scoreGauge(gid, val);
    total += contribution;
    available++;
    breakdown[gid] = { value: val, contribution: contribution, available: true };
  }

  var raw = BASE + total;
  var score = Math.max(0, Math.min(100, raw));
  var confidence = available / CRITICAL_GAUGE_IDS.length;

  return { score: score, breakdown: breakdown, confidence: confidence };
}

// ── GDP-weighted average ────────────────────────────────

function computeGdpWeightedScore(countryScores, gdpWeights) {
  var weightedSum = 0;
  var totalGdp = 0;
  var memberCount = 0;

  for (var i = 0; i < countryScores.length; i++) {
    var cs = countryScores[i];
    if (cs.confidence === 0) continue; // skip no-data countries

    var gdp = gdpWeights[cs.iso3] || 0;
    if (gdp === 0) continue;

    weightedSum += cs.score * gdp;
    totalGdp += gdp;
    memberCount++;
  }

  var score = totalGdp > 0 ? Math.round((weightedSum / totalGdp) * 10) / 10 : 0;
  return { score: score, memberCount: memberCount, totalGdp: totalGdp };
}

// ── Continent scores ────────────────────────────────────

function computeContinentScores(allCountryScores, continentsMap, gdpWeights) {
  var lookup = {};
  for (var i = 0; i < allCountryScores.length; i++) {
    lookup[allCountryScores[i].iso3] = allCountryScores[i];
  }

  var result = {};
  var codes = Object.keys(continentsMap);

  for (var c = 0; c < codes.length; c++) {
    var code = codes[c];
    if (code.startsWith('_')) continue; // skip _source, _comment

    var continent = continentsMap[code];
    var members = continent.members || [];
    var memberScores = [];

    for (var m = 0; m < members.length; m++) {
      if (lookup[members[m]]) memberScores.push(lookup[members[m]]);
    }

    var agg = computeGdpWeightedScore(memberScores, gdpWeights);

    // Find top country
    var topCountry = null;
    var topScore = -1;
    for (var j = 0; j < memberScores.length; j++) {
      if (memberScores[j].confidence > 0 && memberScores[j].score > topScore) {
        topScore = memberScores[j].score;
        topCountry = memberScores[j].iso3;
      }
    }

    result[code] = {
      name: continent.name,
      score: agg.score,
      memberCount: agg.memberCount,
      totalGdp: agg.totalGdp,
      topCountry: topCountry,
      members: memberScores.map(function (ms) {
        return { iso3: ms.iso3, score: ms.score, confidence: ms.confidence };
      }),
    };
  }

  return result;
}

// ── World score ─────────────────────────────────────────

function computeWorldScore(allCountryScores, gdpWeights) {
  return computeGdpWeightedScore(allCountryScores, gdpWeights);
}

// ── Exports ─────────────────────────────────────────────

module.exports = {
  CRITICAL_GAUGE_IDS: CRITICAL_GAUGE_IDS,
  GAUGE_THRESHOLDS: GAUGE_THRESHOLDS,
  scoreGauge: scoreGauge,
  gradeGauge: gradeGauge,
  shrinkScore: shrinkScore,
  computeScoreV2: computeScoreV2,
  computeCountryScore: computeCountryScore,
  computeCountryScoreV2: computeCountryScoreV2,
  computeGdpWeightedScore: computeGdpWeightedScore,
  computeContinentScores: computeContinentScores,
  computeWorldScore: computeWorldScore,
};
