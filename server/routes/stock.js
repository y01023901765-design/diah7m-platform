/**
 * DIAH-7M Stock Routes — /api/v1/stock/*
 * Phase 2 핵심: 주식종목 위성감시 API
 *
 * Endpoints:
 *   GET  /stock/list          — 100종목 목록 (ticker, name, sector, archetype)
 *   GET  /stock/search?q=     — 종목 검색
 *   GET  /stock/:ticker       — 종목 상세 프로필
 *   GET  /stock/:ticker/facilities — 시설별 위성 메트릭 (→ Tab1 진단)
 *   GET  /stock/:ticker/delta — 위성 vs 시장 Delta 분석 (→ Tab2 위성)
 *   GET  /stock/:ticker/flow  — 공급망 플로우 (→ Tab3 플로우)
 *   GET  /stock/:ticker/signals — 4-Flag 시그널 (→ Tab4 시그널)
 */
const express = require('express');
const router = express.Router();

module.exports = function createStockRouter({ db, auth }) {
  // stock-profiles-100.js 로드
  let PROFILES = [];
  let ARCHETYPES = {};
  try {
    const mod = require('../data/stock-profiles-100');
    PROFILES = mod.STOCKS || mod.profiles || [];
    ARCHETYPES = mod.ARCHETYPES || {};
  } catch (e) {
    console.error('  ⚠️  stock-profiles-100 load failed:', e.message);
  }

  const byTicker = {};
  PROFILES.forEach(p => { byTicker[p.ticker] = p; });

  // Auth middleware (optional - some endpoints are public for demo)
  const optAuth = auth?.authMiddleware
    ? (req, res, next) => { auth.authMiddleware(req, res, () => next()); }
    : (req, res, next) => next();

  // ── 100종목 목록 ──
  router.get('/stock/list', (req, res) => {
    const { sector, country, archetype, tier } = req.query;
    let list = PROFILES.map(p => ({
      ticker: p.ticker,
      name: p.name,
      country: p.country,
      sector: p.sector,
      archetype: p.archetype,
      facilityCount: p.facilities?.length || 0,
      tier: p.id <= 10 ? 'KILLER' : p.id <= 50 ? 'SECTOR' : 'GLOBAL',
    }));
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

  // ── 종목 상세 프로필 ──
  router.get('/stock/:ticker', (req, res) => {
    const profile = byTicker[req.params.ticker.toUpperCase()];
    if (!profile) return res.status(404).json({ error: 'Stock not found' });
    const arch = ARCHETYPES[profile.archetype] || {};
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
    });
  });

  // ── 시설별 위성 메트릭 (Tab1 진단) ──
  // 실데이터 연결 전 → 데모 데이터 생성
  router.get('/stock/:ticker/facilities', optAuth, (req, res) => {
    const profile = byTicker[req.params.ticker.toUpperCase()];
    if (!profile) return res.status(404).json({ error: 'Stock not found' });

    const facilities = (profile.facilities || []).map((f, i) => {
      // 데모: 시드 기반 결정적 메트릭 생성
      const seed = profile.ticker.charCodeAt(0) + i * 7;
      const viirs = ((seed * 13) % 31) - 15;
      const no2 = ((seed * 17) % 41) - 20;
      const therm = ((seed * 11) % 21) - 10;
      const status = viirs < -10 && no2 < -10 ? 'warning' : viirs > 15 ? 'construction' : 'normal';
      return {
        name: f.name,
        lat: f.lat,
        lng: f.lng,
        type: f.type || 'general',
        note: f.note || null,
        metrics: { viirs, no2, therm },
        status,
        lastObserved: '2026-01-15T06:00:00Z',
      };
    });

    const warnings = facilities.filter(f => f.status === 'warning').length;
    const normals = facilities.filter(f => f.status === 'normal').length;

    res.json({
      ticker: profile.ticker,
      name: profile.name,
      totalFacilities: facilities.length,
      summary: { normal: normals, warning: warnings },
      facilities,
    });
  });

  // ── Delta 분석 (Tab2 위성) ──
  router.get('/stock/:ticker/delta', optAuth, (req, res) => {
    const profile = byTicker[req.params.ticker.toUpperCase()];
    if (!profile) return res.status(404).json({ error: 'Stock not found' });

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
      satellite_index: satIdx,
      market_index: mktIdx,
      gap,
      state,
      description: state === 'ALIGNED' ? 'Satellite and market signals are aligned'
        : state === 'POS_GAP' ? 'Satellite shows stronger activity than market price reflects'
        : state === 'NEG_GAP' ? 'Market price leads satellite activity signals'
        : 'Significant conflict between satellite and market signals',
      period: '30d',
      lastUpdated: '2026-01-15T06:00:00Z',
    });
  });

  // ── 공급망 플로우 (Tab3 플로우) ──
  const FLOW_TEMPLATES = {
    A: ['rawInput','inspect','feed','process','assemble','test','pack','ship','transport','deliver','install'],
    B: ['booking','pickup','load','depart','transit','customs','unload','sort','deliver','confirm','return'],
    C: ['receive','inspect','store','pick','pack','label','load','route','deliver','confirm','return'],
    D: ['ingest','validate','transform','compute','aggregate','analyze','render','cache','serve','monitor','archive'],
    E: ['survey','permit','excavate','foundation','structure','install','finish','inspect','commission','handover','maintain'],
    F: ['explore','drill','extract','crush','sort','wash','transport','refine','store','ship','deliver'],
  };

  router.get('/stock/:ticker/flow', optAuth, (req, res) => {
    const profile = byTicker[req.params.ticker.toUpperCase()];
    if (!profile) return res.status(404).json({ error: 'Stock not found' });

    const arch = profile.archetype || 'A';
    const steps = (FLOW_TEMPLATES[arch] || FLOW_TEMPLATES.A).map((step, i) => {
      const seed = profile.ticker.charCodeAt(0) + i * 5;
      const bottleneck = (seed % 11 === 0 && i > 2 && i < 9); // 특정 스텝에 병목
      return {
        step: i + 1,
        id: step,
        status: bottleneck ? 'warning' : 'normal',
        throughput: bottleneck ? Math.round(40 + (seed % 30)) : Math.round(70 + (seed % 25)),
      };
    });

    const dualLock = steps.filter(s => s.status === 'warning').length >= 2;

    res.json({
      ticker: profile.ticker,
      archetype: arch,
      archetypeName: ARCHETYPES[arch]?.nameEn || arch,
      totalSteps: steps.length,
      steps,
      dualLock,
      dualLockDesc: dualLock
        ? (ARCHETYPES[arch]?.dualLock || 'Input + Output contraction detected')
        : null,
    });
  });

  // ── 4-Flag 시그널 (Tab4 시그널) ──
  router.get('/stock/:ticker/signals', optAuth, (req, res) => {
    const profile = byTicker[req.params.ticker.toUpperCase()];
    if (!profile) return res.status(404).json({ error: 'Stock not found' });

    const seed = profile.ticker.charCodeAt(0);
    const flags = [
      {
        id: 'CROSS_SIGNAL',
        name: 'Cross Signal',
        active: seed % 3 === 0,
        desc: 'Satellite metrics from 2+ sensors confirm same direction',
      },
      {
        id: 'DUAL_LOCK',
        name: 'Dual Lock',
        active: seed % 5 === 0,
        desc: 'Both input and output stages show contraction',
      },
      {
        id: 'DELTA_DIVERGENCE',
        name: 'Delta Divergence',
        active: seed % 4 === 0,
        desc: 'Satellite index and market index gap exceeds threshold',
      },
      {
        id: 'TREND_REVERSAL',
        name: 'Trend Reversal',
        active: seed % 7 === 0,
        desc: '30-day satellite trend direction has reversed',
      },
    ];

    const activeCount = flags.filter(f => f.active).length;

    res.json({
      ticker: profile.ticker,
      flags,
      activeFlags: activeCount,
      riskLevel: activeCount >= 3 ? 'HIGH' : activeCount >= 2 ? 'MEDIUM' : activeCount >= 1 ? 'LOW' : 'NONE',
      lastUpdated: '2026-01-15T06:00:00Z',
    });
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

  return router;
};
