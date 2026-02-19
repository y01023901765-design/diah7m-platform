/**
 * DIAH-7M Stock Routes — /api/v1/stock/*
 * Phase 2: 주식종목 위성감시 API
 *
 * Endpoints:
 *   GET  /stock/list              — 100종목 목록 (+score, severity)
 *   GET  /stock/search?q=         — 종목 검색
 *   GET  /stock/stats/summary     — 종목 통계
 *   GET  /stock/aggregate?country=KR — 국가별 주식 건강도 평균+섹터 분해
 *   GET  /stock/:ticker           — 종목 상세 (+health)
 *   GET  /stock/:ticker/gauges    — 15게이지 값+등급 (GaugeRow 바인딩)
 *   GET  /stock/:ticker/facilities — 시설별 위성 메트릭
 *   GET  /stock/:ticker/delta     — 위성 vs 시장 Delta 분석
 *   GET  /stock/:ticker/flow      — 공급망 플로우
 *   GET  /stock/:ticker/signals   — 4-Flag 시그널
 *   POST /stock/refresh           — 관리자 일괄 수집
 */
const express = require('express');
const router = express.Router();

module.exports = function createStockRouter({ db, auth, stockStore, stockPipeline }) {
  // stock-profiles-100.js 로드
  let PROFILES = [];
  let ARCHETYPES = {};
  try {
    const mod = require('../data/stock-profiles-100');
    PROFILES = mod.PROFILES || mod.STOCKS || mod.profiles || [];
    ARCHETYPES = mod.ARCHETYPES || {};
  } catch (e) {
    console.error('  ⚠️  stock-profiles-100 load failed:', e.message);
  }

  const byTicker = {};
  PROFILES.forEach(p => { byTicker[p.ticker] = p; });

  // stock-engine 로드
  let stockEngine = null;
  try {
    stockEngine = require('../lib/stock-engine');
  } catch (e) {
    console.warn('  ⚠️  stock-engine load failed:', e.message);
  }

  // stock-thresholds (축 정보)
  let stockThresholds = null;
  try {
    stockThresholds = require('../lib/stock-thresholds');
  } catch (e) {
    console.warn('  ⚠️  stock-thresholds load failed:', e.message);
  }

  // supply-chain-monitor (공급망 물리 흐름)
  let supplyChainMonitor = null;
  try {
    supplyChainMonitor = require('../lib/supply-chain-monitor');
  } catch (e) {
    console.warn('  ⚠️  supply-chain-monitor load failed:', e.message);
  }

  // Auth middleware (optional — 토큰 있으면 파싱, 없으면 통과)
  const optAuth = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token && auth?.authMiddleware) {
      auth.authMiddleware(req, res, () => next());
    } else {
      next();
    }
  };

  // Admin auth (POST /refresh 용)
  const adminAuth = (req, res, next) => {
    const key = req.query.key || req.headers['x-admin-key'] || req.body?.key;
    if (process.env.NODE_ENV === 'production') {
      if (!key || key !== process.env.ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Admin key required' });
      }
    }
    next();
  };

  // ── 헬퍼: 캐시에서 health 조회 (빠름) ──
  function getHealthFromCache(ticker, profile) {
    if (!stockStore || !stockEngine) return null;
    var gaugeData = stockStore.toGaugeData(ticker);
    if (!gaugeData || Object.keys(gaugeData).length === 0) return null;
    try {
      return stockEngine.buildStockHealth(profile, gaugeData, null);
    } catch (e) {
      return null;
    }
  }

  // ── 100종목 목록 (+score, severity) ──
  router.get('/stock/list', (req, res) => {
    const { sector, country, archetype, tier } = req.query;
    let list = PROFILES.map(p => {
      const health = getHealthFromCache(p.ticker, p);
      return {
        ticker: p.ticker,
        name: p.name,
        country: p.country,
        sector: p.sector,
        archetype: p.archetype,
        facilityCount: p.facilities?.length || 0,
        tier: p.id <= 10 ? 'KILLER' : p.id <= 50 ? 'SECTOR' : 'GLOBAL',
        score: health ? health.score : null,
        severity: health ? health.severity : null,
        lastUpdate: stockStore ? (stockStore.lastFetch[p.ticker] ? new Date(stockStore.lastFetch[p.ticker]).toISOString() : null) : null,
      };
    });
    if (sector) list = list.filter(s => s.sector.toLowerCase().includes(sector.toLowerCase()));
    if (country) list = list.filter(s => s.country === country.toUpperCase());
    if (archetype) list = list.filter(s => s.archetype === archetype.toUpperCase());
    if (tier) list = list.filter(s => s.tier === tier.toUpperCase());
    res.json({ total: list.length, stocks: list });
  });

  // ── 종목 검색 ──
  router.get('/stock/search', (req, res) => {
    const q = (req.query.q || '').toLowerCase();
    if (!q || q.length < 1) return res.json({ results: [] });
    const results = PROFILES
      .filter(p => p.ticker.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .slice(0, 10)
      .map(p => ({ ticker: p.ticker, name: p.name, sector: p.sector, country: p.country }));
    res.json({ results });
  });

  // ── 종목 통계 ──
  router.get('/stock/stats/summary', (req, res) => {
    const sectors = {};
    const countries = {};
    PROFILES.forEach(p => {
      sectors[p.sector] = (sectors[p.sector] || 0) + 1;
      countries[p.country] = (countries[p.country] || 0) + 1;
    });
    res.json({
      totalStocks: PROFILES.length,
      totalFacilities: PROFILES.reduce((sum, p) => sum + (p.facilities?.length || 0), 0),
      sectors,
      countries,
      archetypes: Object.fromEntries(
        Object.entries(ARCHETYPES).map(([k, v]) => [k, { name: v.nameEn, count: PROFILES.filter(p => p.archetype === k).length }])
      ),
    });
  });

  // ── 국가별 주식 건강도 Aggregate ──
  router.get('/stock/aggregate', (req, res) => {
    var country = (req.query.country || '').toUpperCase();
    if (!country) return res.status(400).json({ error: 'country query required' });

    var filtered = PROFILES.filter(function (p) { return p.country === country; });
    if (filtered.length === 0) return res.json({ country: country, total: 0, avgScore: null, sectors: {} });

    var scoreSum = 0;
    var scoreCount = 0;
    var sectors = {};

    for (var i = 0; i < filtered.length; i++) {
      var p = filtered[i];
      var health = getHealthFromCache(p.ticker, p);
      var score = health ? health.score : null;
      var severity = health ? health.severity : null;

      if (score != null) { scoreSum += score; scoreCount++; }

      var sec = p.sector || 'Other';
      if (!sectors[sec]) sectors[sec] = { count: 0, facilities: 0, scores: [], avgScore: null };
      sectors[sec].count++;
      sectors[sec].facilities += (p.facilities ? p.facilities.length : 0);
      if (score != null) sectors[sec].scores.push(score);
    }

    // 섹터별 평균 계산
    var secKeys = Object.keys(sectors);
    for (var j = 0; j < secKeys.length; j++) {
      var s = sectors[secKeys[j]];
      if (s.scores.length > 0) {
        s.avgScore = Math.round(s.scores.reduce(function (a, b) { return a + b; }, 0) / s.scores.length);
      }
      delete s.scores; // 내부용 제거
    }

    res.json({
      country: country,
      total: filtered.length,
      scored: scoreCount,
      avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
      facilities: filtered.reduce(function (sum, p) { return sum + (p.facilities ? p.facilities.length : 0); }, 0),
      sectors: sectors,
    });
  });

  // ── 전체 종목 가격 배치 (반드시 :ticker 앞에 정의) ──
  router.get('/stock/prices', async (req, res) => {
    if (!stockPipeline || !stockPipeline.fetchStockPrices) {
      return res.json({ prices: {}, error: 'Pipeline unavailable' });
    }
    const profiles = PROFILES.map(function (p) { return { ticker: p.ticker, country: p.country }; });
    try {
      const prices = await stockPipeline.fetchStockPrices(profiles);
      res.json({ total: Object.keys(prices).length, prices });
    } catch (e) {
      res.json({ prices: {}, error: e.message });
    }
  });

  // ── 종목 상세 프로필 (+health) ──
  router.get('/stock/:ticker', (req, res) => {
    const profile = byTicker[req.params.ticker.toUpperCase()];
    if (!profile) return res.status(404).json({ error: 'Stock not found' });
    const arch = ARCHETYPES[profile.archetype] || {};
    const health = getHealthFromCache(profile.ticker, profile);

    res.json({
      ...profile,
      tier: profile.id <= 10 ? 'KILLER' : profile.id <= 50 ? 'SECTOR' : 'GLOBAL',
      archetypeInfo: {
        id: arch.id || profile.archetype,
        name: arch.name,
        nameEn: arch.nameEn,
        essence: arch.essence,
        sensors: arch.sensors,
        onsetDays: arch.onsetDays,
      },
      health: health || null,
    });
  });

  // ── 15게이지 값+등급 (GaugeRow 바인딩) ──
  router.get('/stock/:ticker/gauges', optAuth, async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    const profile = byTicker[ticker];
    if (!profile) return res.status(404).json({ error: 'Stock not found' });

    // 캐시 조회 (stale이면 백그라운드 갱신)
    let gaugeData = stockStore ? stockStore.toGaugeData(ticker) : {};
    const isStale = !stockStore || stockStore.isStale(ticker);

    // stale이면 실시간 수집 시도
    if (isStale && stockPipeline) {
      try {
        const pipeResult = await stockPipeline.fetchAllStockGauges(ticker);
        if (stockStore) await stockStore.storeBatch(pipeResult);
        gaugeData = stockStore ? stockStore.toGaugeData(ticker) : pipeResult.gauges;
      } catch (e) {
        console.warn('[Stock] gauge fetch error for', ticker, ':', e.message);
      }
    }

    // 엔진으로 등급 계산
    const axes = stockThresholds ? stockThresholds.STOCK_AXES : {};
    const thresholdTable = stockThresholds ? stockThresholds.STOCK_GAUGE_THRESHOLDS : {};
    let gradeGauge = null;
    try { gradeGauge = require('../lib/score-engine').gradeGauge; } catch (e) { /* */ }

    const gauges = [];
    const axKeys = Object.keys(axes);
    for (let a = 0; a < axKeys.length; a++) {
      const axId = axKeys[a];
      const ax = axes[axId];
      const axGauges = ax.gauges || [];
      for (let g = 0; g < axGauges.length; g++) {
        const gId = axGauges[g];
        const cached = gaugeData[gId];
        const value = cached ? cached.value : null;
        const gradeResult = (gradeGauge && value != null) ? gradeGauge(gId, value, thresholdTable) : { score: null, grade: null };
        gauges.push({
          id: gId,
          axis: axId,
          value: value,
          prevValue: cached ? cached.prevValue : null,
          status: cached ? cached.status : 'NO_DATA',
          score: gradeResult.score,
          grade: gradeResult.grade,
          updatedAt: cached ? cached.updatedAt : null,
        });
      }
    }

    res.json({
      ticker,
      total: gauges.length,
      stale: isStale,
      gauges,
    });
  });

  // ── 종목 가격 (실시간) ──
  router.get('/stock/:ticker/price', async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    const profile = byTicker[ticker];
    if (!profile) return res.status(404).json({ error: 'Stock not found' });
    if (!stockPipeline || !stockPipeline.fetchStockPrice) {
      return res.json({ ticker, price: null, error: 'Pipeline unavailable' });
    }
    try {
      const p = await stockPipeline.fetchStockPrice(ticker, profile.country);
      res.json({ ticker, ...p });
    } catch (e) {
      res.json({ ticker, price: null, error: e.message });
    }
  });

  // ── 시설별 위성 메트릭 (Tab1 진단) ──
  router.get('/stock/:ticker/facilities', optAuth, (req, res) => {
    const profile = byTicker[req.params.ticker.toUpperCase()];
    if (!profile) return res.status(404).json({ error: 'Stock not found' });

    const facilities = (profile.facilities || []).map((f, i) => {
      // seed 기반 결정적 메트릭 (GEE 실데이터 연결 전 fallback)
      const seed = profile.ticker.charCodeAt(0) + i * 7;
      const viirs = ((seed * 13) % 31) - 15;
      const no2 = ((seed * 17) % 41) - 20;
      const therm = ((seed * 11) % 21) - 10;
      const status = f.underConstruction ? 'construction'
        : viirs < -10 && no2 < -10 ? 'warning' : 'normal';
      return {
        name: f.name,
        lat: f.lat,
        lng: f.lng,
        type: f.type || 'general',
        stage: f.stage || null,
        sensors: f.sensors || [],
        radiusKm: f.radiusKm || null,
        note: f.note || null,
        underConstruction: f.underConstruction || false,
        metrics: { viirs, no2, therm },
        status,
        lastObserved: '2026-01-15T06:00:00Z',
      };
    });

    // 구간별 요약
    const byStage = { input: 0, process: 0, output: 0 };
    facilities.forEach(f => { if (f.stage && byStage[f.stage] != null) byStage[f.stage]++; });

    const warnings = facilities.filter(f => f.status === 'warning').length;
    const normals = facilities.filter(f => f.status === 'normal').length;

    res.json({
      ticker: profile.ticker,
      name: profile.name,
      totalFacilities: facilities.length,
      summary: { normal: normals, warning: warnings, byStage },
      facilities,
    });
  });

  // ── Delta 분석 (Tab2 위성) ──
  router.get('/stock/:ticker/delta', optAuth, (req, res) => {
    const profile = byTicker[req.params.ticker.toUpperCase()];
    if (!profile) return res.status(404).json({ error: 'Stock not found' });

    // 엔진에서 실계산 (캐시 데이터 있을 때)
    const health = getHealthFromCache(profile.ticker, profile);
    if (health && health.delta) {
      return res.json({
        ticker: profile.ticker,
        gap: health.delta.gap,
        state: health.delta.state,
        flag: health.delta.flag,
        ssScore: health.systemScores?.SS?.score || null,
        smScore: health.systemScores?.SM?.score || null,
        description: health.delta.state === 'ALIGNED' ? 'Satellite and market signals are aligned'
          : health.delta.state === 'POS_GAP' ? 'Satellite shows stronger activity than market price reflects'
          : 'Market price leads satellite activity signals',
        lastUpdated: new Date().toISOString(),
      });
    }

    // Fallback: seed 기반
    const seed = profile.ticker.charCodeAt(0) + profile.ticker.charCodeAt(1);
    const satIdx = 50 + (seed % 40);
    const mktIdx = 50 + ((seed * 3) % 45);
    const gap = satIdx - mktIdx;
    const state = Math.abs(gap) <= 5 ? 'ALIGNED'
      : gap > 0 ? 'POS_GAP'
      : gap < -15 ? 'CONFLICT'
      : 'NEG_GAP';

    res.json({
      ticker: profile.ticker,
      gap,
      state,
      flag: null,
      ssScore: null,
      smScore: null,
      description: state === 'ALIGNED' ? 'Satellite and market signals are aligned'
        : state === 'POS_GAP' ? 'Satellite shows stronger activity than market price reflects'
        : state === 'NEG_GAP' ? 'Market price leads satellite activity signals'
        : 'Significant conflict between satellite and market signals',
      lastUpdated: '2026-01-15T06:00:00Z',
    });
  });

  // ── 공급망 플로우 (Tab3 플로우) — 실 위성 + DualLock + 스토리 ──
  router.get('/stock/:ticker/flow', optAuth, async (req, res) => {
    const profile = byTicker[req.params.ticker.toUpperCase()];
    if (!profile) return res.status(404).json({ error: 'Stock not found' });

    // 재무 Dual Lock (엔진에서)
    const health = getHealthFromCache(profile.ticker, profile);
    const financialDL = health && health.dualLock ? health.dualLock : { isDualLocked: false };

    if (!supplyChainMonitor) {
      return res.status(503).json({ error: 'Supply chain monitor not available' });
    }

    // live GEE vs dry 모드 선택
    const mode = req.query.mode || 'dry'; // ?mode=live 로 GEE 실호출
    let result;

    if (mode === 'live') {
      try {
        result = await supplyChainMonitor.analyzeSupplyChain(profile, financialDL);
      } catch (e) {
        console.warn('[Flow] live analysis failed, falling back to dry:', e.message);
        result = supplyChainMonitor.analyzeSupplyChainDry(profile, financialDL);
      }
    } else {
      result = supplyChainMonitor.analyzeSupplyChainDry(profile, financialDL);
    }

    res.json(result);
  });

  // ── 4-Flag 시그널 (Tab4 시그널) ──
  router.get('/stock/:ticker/signals', optAuth, (req, res) => {
    const profile = byTicker[req.params.ticker.toUpperCase()];
    if (!profile) return res.status(404).json({ error: 'Stock not found' });

    const health = getHealthFromCache(profile.ticker, profile);

    // 엔진 데이터가 있으면 실계산
    if (health) {
      const flags = [
        {
          id: 'CROSS_SIGNAL',
          name: 'Cross Signal',
          active: (health.alertGauges || []).length >= 3,
          desc: 'Multiple gauge alerts detected (3+ alert-grade gauges)',
        },
        {
          id: 'DUAL_LOCK',
          name: 'Dual Lock',
          active: health.dualLock ? health.dualLock.isDualLocked : false,
          desc: 'Both input and output stages show contraction',
        },
        {
          id: 'DELTA_DIVERGENCE',
          name: 'Delta Divergence',
          active: health.delta ? (health.delta.state !== 'ALIGNED') : false,
          desc: 'Satellite index and market index gap exceeds threshold',
        },
        {
          id: 'TREND_REVERSAL',
          name: 'Trend Reversal',
          active: health.severity >= 3.5,
          desc: 'High severity indicates potential trend reversal',
        },
      ];
      const activeCount = flags.filter(f => f.active).length;

      return res.json({
        ticker: profile.ticker,
        flags,
        activeFlags: activeCount,
        riskLevel: activeCount >= 3 ? 'HIGH' : activeCount >= 2 ? 'MEDIUM' : activeCount >= 1 ? 'LOW' : 'NONE',
        severity: health.severity,
        contextNote: health.contextNote || null,
        lastUpdated: new Date().toISOString(),
      });
    }

    // Fallback: seed 기반
    const seed = profile.ticker.charCodeAt(0);
    const flags = [
      { id: 'CROSS_SIGNAL', name: 'Cross Signal', active: seed % 3 === 0, desc: 'Satellite metrics from 2+ sensors confirm same direction' },
      { id: 'DUAL_LOCK', name: 'Dual Lock', active: seed % 5 === 0, desc: 'Both input and output stages show contraction' },
      { id: 'DELTA_DIVERGENCE', name: 'Delta Divergence', active: seed % 4 === 0, desc: 'Satellite index and market index gap exceeds threshold' },
      { id: 'TREND_REVERSAL', name: 'Trend Reversal', active: seed % 7 === 0, desc: '30-day satellite trend direction has reversed' },
    ];
    const activeCount = flags.filter(f => f.active).length;

    res.json({
      ticker: profile.ticker,
      flags,
      activeFlags: activeCount,
      riskLevel: activeCount >= 3 ? 'HIGH' : activeCount >= 2 ? 'MEDIUM' : activeCount >= 1 ? 'LOW' : 'NONE',
      severity: null,
      contextNote: null,
      lastUpdated: '2026-01-15T06:00:00Z',
    });
  });

  // ── 관리자 일괄 수집 ──
  router.post('/stock/refresh', adminAuth, async (req, res) => {
    if (!stockPipeline) return res.status(503).json({ error: 'Stock pipeline not available' });

    const tier = (req.body?.tier || req.query.tier || 'KILLER').toUpperCase();
    let tickers = [];

    if (tier === 'KILLER') {
      tickers = PROFILES.filter(p => p.id <= 10).map(p => p.ticker);
    } else if (tier === 'SECTOR') {
      tickers = PROFILES.filter(p => p.id <= 50).map(p => p.ticker);
    } else {
      tickers = PROFILES.map(p => p.ticker);
    }

    const start = Date.now();
    try {
      const batchResult = await stockPipeline.fetchStockBatch(tickers);
      let ok = 0, errors = 0;

      const tickerKeys = Object.keys(batchResult);
      for (let i = 0; i < tickerKeys.length; i++) {
        const t = tickerKeys[i];
        const r = batchResult[t];
        if (stockStore) await stockStore.storeBatch(r);
        ok += r.summary.ok;
        errors += r.summary.errors;
      }

      const duration = Date.now() - start;
      if (stockStore) await stockStore.logFetch(tickers.length, ok, errors, duration);

      res.json({
        tier,
        tickerCount: tickers.length,
        totalGauges: ok + errors,
        ok,
        errors,
        durationMs: duration,
      });
    } catch (e) {
      res.status(500).json({ error: e.message, durationMs: Date.now() - start });
    }
  });

  return router;
};
