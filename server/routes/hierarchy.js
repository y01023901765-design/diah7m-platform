'use strict';

/**
 * DIAH-7M Hierarchy Routes — World / Continent / Country scoring
 * ══════════════════════════════════════════════════════════════
 *
 * Phase 1 backend: read-only consumption of fetchCountryData()
 *
 * Endpoints (mounted at /api/v1/global):
 *   GET /world              — World aggregate + continent breakdown
 *   GET /continent/:code    — Continent detail + member countries
 *
 * Non-conflicting with existing global routes:
 *   /countries, /country/:iso3, /overview, /commodities, /compare, /refresh
 */

var express = require('express');
var pLimit = require('p-limit');

var globalPipeline = require('../lib/global-pipeline');
var countryProfiles = require('../lib/country-profiles');
var scoreEngine = require('../lib/score-engine');

var continentsMap = require('../config/continents.json');
var gdpWeights = require('../config/gdp-weights.json');

var COUNTRIES = countryProfiles.COUNTRIES;
var fetchCountryData = globalPipeline.fetchCountryData;

// ═══════════════════════════════════════════
// Cache
// ═══════════════════════════════════════════

var CACHE_TTL = 6 * 3600 * 1000; // 6 hours

var cache = {
  worldScore: null,
  continentScores: null,
  countryScores: null,
  lastUpdated: null,
  collecting: false,
  error: null,
};

function isCacheValid() {
  return cache.lastUpdated && (Date.now() - cache.lastUpdated < CACHE_TTL);
}

// ═══════════════════════════════════════════
// Background score collection
// ═══════════════════════════════════════════

async function collectAllScores() {
  if (cache.collecting) {
    console.log('[Hierarchy] Collection already in progress, skipping');
    return;
  }

  cache.collecting = true;
  var t0 = Date.now();
  var iso3List = Object.keys(COUNTRIES);
  var limit = pLimit(3);

  console.log('[Hierarchy] Starting score collection for ' + iso3List.length + ' countries...');

  var allCountryScores = [];
  var errors = [];

  var tasks = iso3List.map(function (iso3) {
    return limit(async function () {
      try {
        var data = await fetchCountryData(iso3, {
          fredApiKey: process.env.FRED_API_KEY,
        });
        var result = scoreEngine.computeCountryScoreV2(data.gauges || {});
        return {
          iso3: iso3,
          name: COUNTRIES[iso3].name,
          score: result.score,
          confidence: result.confidence,
          breakdown: result.breakdown,
          tier: COUNTRIES[iso3].tier,
        };
      } catch (e) {
        errors.push({ iso3: iso3, error: e.message });
        return {
          iso3: iso3,
          name: COUNTRIES[iso3] ? COUNTRIES[iso3].name : { en: iso3 },
          score: 50,
          confidence: 0,
          breakdown: {},
          tier: COUNTRIES[iso3] ? COUNTRIES[iso3].tier : 'unknown',
        };
      }
    });
  });

  var results = await Promise.allSettled(tasks);
  for (var i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled' && results[i].value) {
      allCountryScores.push(results[i].value);
    }
  }

  // Compute aggregates
  var continentScores = scoreEngine.computeContinentScores(allCountryScores, continentsMap, gdpWeights);
  var worldScore = scoreEngine.computeWorldScore(allCountryScores, gdpWeights);

  // Update cache atomically
  cache = {
    worldScore: worldScore,
    continentScores: continentScores,
    countryScores: allCountryScores,
    lastUpdated: Date.now(),
    collecting: false,
    error: errors.length > 0 ? errors.length + ' countries failed' : null,
  };

  var elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('[Hierarchy] Collection done: ' + allCountryScores.length + ' countries, ' + errors.length + ' errors (' + elapsed + 's)');
  if (errors.length > 0) {
    console.log('[Hierarchy] Failed: ' + errors.map(function (e) { return e.iso3; }).join(', '));
  }
}

// ═══════════════════════════════════════════
// Router
// ═══════════════════════════════════════════

function createHierarchyRouter() {
  var router = express.Router();

  function ensureFresh() {
    if (!isCacheValid() && !cache.collecting) {
      collectAllScores().catch(function (e) {
        console.error('[Hierarchy] Background collection error:', e.message);
        cache.collecting = false;
      });
    }
  }

  // GET /api/v1/global/world
  router.get('/world', function (req, res) {
    ensureFresh();

    if (!cache.worldScore) {
      return res.json({
        entityType: 'world',
        score: null,
        status: cache.collecting ? 'COLLECTING' : 'NO_DATA',
        message: cache.collecting
          ? 'Score collection in progress. Retry in 2-3 minutes.'
          : 'Score data not yet available.',
        lastUpdated: null,
      });
    }

    var continentSummary = {};
    var codes = Object.keys(cache.continentScores || {});
    for (var i = 0; i < codes.length; i++) {
      var code = codes[i];
      var data = cache.continentScores[code];
      continentSummary[code] = {
        name: data.name,
        score: data.score,
        memberCount: data.memberCount,
        topCountry: data.topCountry,
      };
    }

    res.json({
      entityType: 'world',
      score: cache.worldScore.score,
      continents: continentSummary,
      memberCount: cache.worldScore.memberCount,
      totalGdp: cache.worldScore.totalGdp,
      lastUpdated: new Date(cache.lastUpdated).toISOString(),
      cacheAge: Math.round((Date.now() - cache.lastUpdated) / 1000),
    });
  });

  // GET /api/v1/global/continent/:code
  router.get('/continent/:code', function (req, res) {
    var code = req.params.code.toUpperCase();

    // Validate continent code
    var validCodes = Object.keys(continentsMap).filter(function (k) { return !k.startsWith('_'); });
    if (validCodes.indexOf(code) === -1) {
      return res.status(400).json({
        error: 'Unknown continent code: ' + code,
        validCodes: validCodes,
      });
    }

    ensureFresh();

    if (!cache.continentScores || !cache.continentScores[code]) {
      return res.json({
        entityType: 'continent',
        code: code,
        score: null,
        status: cache.collecting ? 'COLLECTING' : 'NO_DATA',
        message: cache.collecting
          ? 'Score collection in progress. Retry in 2-3 minutes.'
          : 'Score data not yet available.',
        lastUpdated: null,
      });
    }

    var continent = cache.continentScores[code];
    var countries = (continent.members || [])
      .map(function (m) {
        return {
          iso3: m.iso3,
          name: COUNTRIES[m.iso3] ? COUNTRIES[m.iso3].name : { en: m.iso3 },
          score: m.score,
          confidence: m.confidence,
          tier: COUNTRIES[m.iso3] ? COUNTRIES[m.iso3].tier : 'unknown',
        };
      })
      .sort(function (a, b) { return b.score - a.score; });

    res.json({
      entityType: 'continent',
      code: code,
      name: continent.name,
      score: continent.score,
      countries: countries,
      totalGdp: continent.totalGdp,
      memberCount: continent.memberCount,
      topCountry: continent.topCountry,
      lastUpdated: new Date(cache.lastUpdated).toISOString(),
    });
  });

  return router;
}

// ═══════════════════════════════════════════
// Startup scheduler
// ═══════════════════════════════════════════
// 120s delay: after satellite auto-collect (60s) and data-pipeline boot collection
setTimeout(function () {
  console.log('[Hierarchy] Scheduling initial score collection...');
  collectAllScores().catch(function (e) {
    console.error('[Hierarchy] Initial collection failed:', e.message);
    cache.collecting = false;
  });
}, 120000);

module.exports = {
  createHierarchyRouter: createHierarchyRouter,
  collectAllScores: collectAllScores,
};
