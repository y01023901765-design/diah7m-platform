'use strict';

/**
 * DIAH-7M Score Engine — Country / Continent / World scoring
 * ═══════════════════════════════════════════════════════════
 * Pure computation module. No I/O, no Express, no side effects.
 */

const CRITICAL_GAUGE_IDS = ['G_D1', 'G_L1', 'G_P1', 'G_S1', 'G_R2', 'G_F2'];

// ── Individual gauge scoring ────────────────────────────

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

// ── Country score ───────────────────────────────────────

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
  scoreGauge: scoreGauge,
  computeCountryScore: computeCountryScore,
  computeGdpWeightedScore: computeGdpWeightedScore,
  computeContinentScores: computeContinentScores,
  computeWorldScore: computeWorldScore,
};
