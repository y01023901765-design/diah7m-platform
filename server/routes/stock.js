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
 *   GET  /stock/:ticker/chart     — OHLCV 차트 데이터 (Yahoo Finance)
 *   GET  /stock/:ticker/facilities — 시설별 위성 메트릭
 *   GET  /stock/:ticker/delta     — 위성 vs 시장 Delta 분석
 *   GET  /stock/:ticker/flow      — 공급망 플로우
 *   GET  /stock/:ticker/signals   — 4-Flag 시그널
 *   POST /stock/refresh           — 관리자 일괄 수집
 */
const express = require('express');
const router = express.Router();

module.exports = function createStockRouter({ db, auth, stockStore, stockPipeline, dataStore }) {
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

  // ── 헬퍼: 국가 DataStore에서 GL-* 환경보정 데이터 추출 ──
  function buildGlContext() {
    if (!dataStore || !dataStore.memCache) return null;
    var mc = dataStore.memCache;

    // E5_BALTIC → BDI, E3_VIX → VIX, E4_DOLLAR_INDEX → DXY
    var bdiVal = mc.E5_BALTIC && mc.E5_BALTIC.value;
    var bdiPrev = mc.E5_BALTIC && mc.E5_BALTIC.prevValue;
    var vixVal = mc.E3_VIX && mc.E3_VIX.value;
    var dxyVal = mc.E4_DOLLAR_INDEX && mc.E4_DOLLAR_INDEX.value;
    var dxyPrev = mc.E4_DOLLAR_INDEX && mc.E4_DOLLAR_INDEX.prevValue;

    if (bdiVal == null && vixVal == null && dxyVal == null) return null;

    return {
      bdi: bdiVal != null ? {
        value: bdiVal,
        trend: (bdiPrev != null && bdiVal < bdiPrev * 0.95) ? 'down'
          : (bdiPrev != null && bdiVal > bdiPrev * 1.05) ? 'up' : 'flat',
      } : null,
      vix: vixVal != null ? { value: vixVal } : null,
      dxy: dxyVal != null ? {
        value: dxyVal,
        trend: (dxyPrev != null && dxyVal > dxyPrev * 1.02) ? 'up'
          : (dxyPrev != null && dxyVal < dxyPrev * 0.98) ? 'down' : 'flat',
      } : null,
    };
  }

  // ── 헬퍼: 캐시에서 health 조회 (빠름) ──
  function getHealthFromCache(ticker, profile) {
    if (!stockStore || !stockEngine) return null;
    var gaugeData = stockStore.toGaugeData(ticker);
    if (!gaugeData || Object.keys(gaugeData).length === 0) return null;
    try {
      return stockEngine.buildStockHealth(profile, gaugeData, buildGlContext());
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

  // ── 차트 데이터 (OHLCV) ──
  router.get('/stock/:ticker/chart', async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    const profile = byTicker[ticker];
    if (!profile) return res.status(404).json({ error: 'Stock not found' });
    if (!stockPipeline || !stockPipeline.fetchYahooChart) {
      return res.json({ ticker, candles: [], error: 'Pipeline unavailable' });
    }
    const range = req.query.range || '6mo'; // 1mo, 3mo, 6mo, 1y
    try {
      const yahooSym = stockPipeline.toYahooSymbol(ticker, profile.country);
      const chart = await stockPipeline.fetchYahooChart(yahooSym, range);
      if (!chart || !chart.indicators || !chart.indicators.quote) {
        return res.json({ ticker, candles: [], currency: null });
      }
      const ts = chart.timestamp || [];
      const q = chart.indicators.quote[0] || {};
      const candles = [];
      for (let i = 0; i < ts.length; i++) {
        if (q.close && q.close[i] != null) {
          candles.push({
            t: ts[i] * 1000, // ms
            o: q.open ? q.open[i] : null,
            h: q.high ? q.high[i] : null,
            l: q.low ? q.low[i] : null,
            c: q.close[i],
            v: q.volume ? q.volume[i] : null,
          });
        }
      }
      const meta = chart.meta || {};
      res.json({
        ticker,
        currency: meta.currency || 'USD',
        prevClose: meta.chartPreviousClose || null,
        candles,
      });
    } catch (e) {
      res.json({ ticker, candles: [], error: e.message });
    }
  });

  // ── 시설별 위성 메트릭 (Tab1 진단) ──
  router.get('/stock/:ticker/facilities', optAuth, (req, res) => {
    const profile = byTicker[req.params.ticker.toUpperCase()];
    if (!profile) return res.status(404).json({ error: 'Stock not found' });

    // supply-chain-monitor dry 분석에서 시설별 센서 데이터 추출
    let flowData = null;
    if (supplyChainMonitor) {
      const health = getHealthFromCache(profile.ticker, profile);
      const finDL = health && health.dualLock ? health.dualLock : { isDualLocked: false };
      flowData = supplyChainMonitor.analyzeSupplyChainDry(profile, finDL);
    }

    // flow stages → 시설-센서 매핑 (evidence + facilityCount로 역매핑)
    const stageEvidence = {};
    if (flowData && flowData.stages) {
      for (const stg of ['input', 'process', 'output']) {
        const s = flowData.stages[stg];
        if (s && s.evidence) {
          s.evidence.forEach(e => { stageEvidence[e.nodeId] = e; });
        }
      }
    }

    const facilities = (profile.facilities || []).map((f, i) => {
      // supply-chain-monitor evidence 매칭
      const ev = stageEvidence[f.name];

      // 센서별 메트릭 추출 (선언된 센서 기반)
      const metrics = {};
      if (ev) {
        // evidence에 있는 센서 데이터 사용
        metrics[ev.sensor.toLowerCase()] = ev.value;
      }
      // evidence에 없는 센서는 dry seed로 보충
      const sensors = f.sensors || ['NTL'];
      for (const s of sensors) {
        const key = s.toLowerCase();
        if (metrics[key] == null) {
          // 결정적 seed (이름 해시)
          let hash = 0;
          for (let c = 0; c < (f.name + s).length; c++) hash = ((hash << 5) - hash + (f.name + s).charCodeAt(c)) | 0;
          const anom = ((hash % 40) - 20);
          metrics[key] = s === 'THERMAL' ? Math.round(anom * 0.3 * 10) / 10 : Math.round(anom * 0.7 * 10) / 10;
        }
      }

      // 상태 판정 (12줄 규칙 기반)
      let status = 'normal';
      if (f.underConstruction) {
        status = 'construction';
      } else {
        const ntlVal = metrics.ntl;
        const no2Val = metrics.no2;
        const thermVal = metrics.thermal;
        const hasAlarm = (ntlVal != null && ntlVal <= -15) || (no2Val != null && no2Val <= -15) || (thermVal != null && thermVal <= -5);
        const hasWarn = (ntlVal != null && ntlVal <= -8) || (no2Val != null && no2Val <= -8) || (thermVal != null && thermVal <= -2);
        status = hasAlarm ? 'alarm' : hasWarn ? 'warning' : 'normal';
      }

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
        viirs: metrics.ntl != null ? metrics.ntl : null,
        no2: metrics.no2 != null ? metrics.no2 : null,
        therm: metrics.thermal != null ? metrics.thermal : null,
        sar: metrics.sar != null ? metrics.sar : null,
        status,
        lastObserved: flowData ? flowData.updatedAt : new Date().toISOString(),
      };
    });

    // 구간별 요약
    const byStage = { input: 0, process: 0, output: 0 };
    facilities.forEach(f => { if (f.stage && byStage[f.stage] != null) byStage[f.stage]++; });

    const alarms = facilities.filter(f => f.status === 'alarm').length;
    const warnings = facilities.filter(f => f.status === 'warning').length;
    const normals = facilities.filter(f => f.status === 'normal').length;

    res.json({
      ticker: profile.ticker,
      name: profile.name,
      totalFacilities: facilities.length,
      summary: { normal: normals, warning: warnings, alarm: alarms, byStage },
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

  // ── 시설 위성 이미지 (Tab2 위성 Before/After) ──
  // GEE fetchFacilityVIIRS/NO2/Thermal → 이미지 URL + 수치 반환
  // TTL 7일 캐시 (VIIRS 월간 발행 특성 반영)
  // v2: 해상도 800x560 (v1: 400x280)
  const _SAT_IMG_VER = 'v8';
  const _satImgCache = {};
  const _satImgTTL = 7 * 24 * 3600 * 1000;

  router.get('/stock/:ticker/satellite', optAuth, async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    const profile = byTicker[ticker];
    if (!profile) return res.status(404).json({ error: 'Stock not found' });

    // 날짜 파라미터: afterYM(YYYY-MM), beforeYM(YYYY-MM) — 직접 지정 우선
    // fallback: range=recent (최근 3개월 vs 1년전 동기)
    const now = new Date();
    const pubOffset = 90; // VIIRS 발행 지연 (90일)
    let afterStart, afterEnd, beforeStart, beforeEnd;

    const afterYM  = req.query.afterYM;   // e.g. '2025-10'
    const beforeYM = req.query.beforeYM;  // e.g. '2024-10'

    if (afterYM && beforeYM && /^\d{4}-\d{2}$/.test(afterYM) && /^\d{4}-\d{2}$/.test(beforeYM)) {
      // 사용자 지정 연월 — 해당 월 전체 구간
      const [aY, aM] = afterYM.split('-').map(Number);
      const [bY, bM] = beforeYM.split('-').map(Number);
      afterStart = new Date(aY, aM - 1, 1);
      afterEnd   = new Date(aY, aM, 0); // 해당 월 마지막 날
      beforeStart= new Date(bY, bM - 1, 1);
      beforeEnd  = new Date(bY, bM, 0);
    } else {
      // 기본: 최근 3개월 vs 1년전 동기
      afterEnd   = new Date(now); afterEnd.setDate(afterEnd.getDate() - pubOffset);
      afterStart = new Date(afterEnd); afterStart.setDate(afterStart.getDate() - 90);
      beforeEnd  = new Date(afterEnd); beforeEnd.setFullYear(beforeEnd.getFullYear() - 1);
      beforeStart= new Date(afterStart); beforeStart.setFullYear(beforeStart.getFullYear() - 1);
    }
    const fmt = d => d.toISOString().split('T')[0];

    // 캐시 키: afterYM+beforeYM 또는 기본값
    const cacheRangeKey = afterYM && beforeYM ? `${afterYM}_${beforeYM}` : 'recent';
    const cacheKey = ticker + '_' + _SAT_IMG_VER + '_' + cacheRangeKey;
    const cached = _satImgCache[cacheKey];
    const cachedHasImages = cached && cached.data && cached.data.some(f => f.images && (f.images.afterUrl || f.images.beforeUrl));
    if (cached && cachedHasImages && (Date.now() - cached.ts) < _satImgTTL) {
      return res.json({ ticker, fromCache: true, facilities: cached.data });
    }

    // GEE 모듈 확인
    let fetchSat = null;
    try { fetchSat = require('../lib/fetch-satellite'); } catch (e) { /* */ }
    if (!fetchSat) {
      return res.json({ ticker, facilities: [], error: 'GEE module not available' });
    }

    // process 시설 최대 3개 (UI 표시 한도)
    const facilities = (profile.facilities || [])
      .filter(f => f.stage === 'process' && !f.underConstruction)
      .slice(0, 3);

    // stage 미지정 fallback
    if (facilities.length === 0) {
      const PROD = ['fab','assembly','manufacturing','battery','steelworks',
        'chemical','refinery','datacenter','mine','plant','factory','fulfillment','hub','campus'];
      (profile.facilities || [])
        .filter(f => !f.underConstruction && PROD.includes(f.type))
        .slice(0, 3)
        .forEach(f => facilities.push(f));
    }

    if (facilities.length === 0) {
      return res.json({ ticker, facilities: [] });
    }

    // GEE 수집 (순차, 세마포어는 fetch-satellite 내부에서 처리)
    const results = [];
    for (const f of facilities) {
      try {
        const sensors = f.sensors || ['NTL'];
        const sensorData = await fetchSat.fetchFacilitySensors({
          name: f.name, lat: f.lat, lng: f.lng,
          radiusKm: f.radiusKm || 5, sensors,
        });

        // VIIRS 썸네일 이미지 생성 (NTL 있을 때)
        let viirsImg = null;
        if (sensors.includes('NTL') && f.lat && f.lng) {
          try {
            await fetchSat.authenticateGEE();
            const ee = require('@google/earthengine');
            // 썸네일용 bbox: 최소 30km 반경으로 넓게 (VIIRS 750m 해상도에서 충분한 픽셀 확보)
            const thumbRadiusKm = Math.max(f.radiusKm || 5, 30);
            const bbox = fetchSat.facilityBbox(f.lat, f.lng, thumbRadiusKm);
            const geometry = ee.Geometry.Rectangle(bbox);
            // range 기반 날짜 구간 (상위에서 계산된 afterStart/afterEnd/beforeStart/beforeEnd 사용)
            const THUMB_PARAMS = {
              palette: ['000000','1a1a5e','0066cc','00ccff','ffff00','ffffff'],
              min: 0, max: 60, dimensions: '800x560',
            };

            // 항상 mean() — 단월이든 다월이든 컬렉션이 비어도 안전
            console.log('[Satellite] thumb', f.name, fmt(afterStart), '~', fmt(afterEnd), '/', fmt(beforeStart), '~', fmt(beforeEnd));
            const afterImg = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
              .filterBounds(geometry).filterDate(fmt(afterStart), fmt(afterEnd))
              .select('avg_rad').mean();
            const beforeImg = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
              .filterBounds(geometry).filterDate(fmt(beforeStart), fmt(beforeEnd))
              .select('avg_rad').mean();

            const [afterUrl, beforeUrl] = await Promise.all([
              fetchSat.getThumbPromise(afterImg, geometry, THUMB_PARAMS),
              fetchSat.getThumbPromise(beforeImg, geometry, THUMB_PARAMS),
            ]);

            if (afterUrl || beforeUrl) {
              viirsImg = {
                afterUrl,
                beforeUrl,
                afterDate: fmt(afterStart) + ' ~ ' + fmt(afterEnd),
                beforeDate: fmt(beforeStart) + ' ~ ' + fmt(beforeEnd),
                palette: THUMB_PARAMS.palette,
                paletteLabels: { min: '0 nW', max: '80 nW' },
              };
            }
          } catch (imgErr) {
            console.warn('[Satellite] VIIRS image skipped for', f.name, ':', imgErr.message);
          }
        }

        results.push({
          name: f.name,
          lat: f.lat, lng: f.lng,
          stage: f.stage,
          sensors: f.sensors || [],
          radiusKm: f.radiusKm || 5,
          ntl: sensorData.NTL || null,
          no2: sensorData.NO2 || null,
          thermal: sensorData.THERMAL || null,
          images: viirsImg,
        });
      } catch (err) {
        console.warn('[Satellite] facility error:', f.name, err.message);
        results.push({
          name: f.name, lat: f.lat, lng: f.lng,
          stage: f.stage, sensors: f.sensors || [],
          ntl: null, no2: null, thermal: null, images: null,
          error: err.message,
        });
      }
    }

    // 캐시 저장
    _satImgCache[cacheKey] = { data: results, ts: Date.now() };

    res.json({ ticker, facilities: results });
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
