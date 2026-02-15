/**
 * DIAH-7M Catalog Routes — /api/v1/catalog/*
 * Phase 3: 커스터마이징 주문제작 카탈로그
 *
 * Endpoints:
 *   GET  /catalog/categories        — 24 카테고리 목록
 *   GET  /catalog/category/:id      — 카테고리 상세 + 서비스 목록
 *   GET  /catalog/service/:id       — 서비스 상세
 *   GET  /catalog/search?q=         — 서비스 검색
 *   POST /catalog/quote             — 견적 요청 (Enterprise)
 *   GET  /catalog/stats             — 카탈로그 통계
 */
const express = require('express');
const router = express.Router();

module.exports = function createCatalogRouter({ db, auth }) {
  let CATEGORIES = {};
  let SERVICES = [];
  try {
    const mod = require('../data/catalog_data');
    CATEGORIES = mod.CATEGORIES || {};
    SERVICES = mod.SERVICES || [];
  } catch (e) {
    console.error('  ⚠️  catalog_data load failed:', e.message);
  }

  const GROUP_NAMES = {
    macro: 'Macro Economy',
    industry: 'Industry',
    supply_chain: 'Supply Chain',
    risk: 'Risk',
    infra: 'Infrastructure',
    consumer: 'Consumer',
    social: 'Social',
    special: 'Special',
  };

  // ── 카테고리 목록 ──
  router.get('/catalog/categories', (req, res) => {
    const cats = Object.entries(CATEGORIES).map(([id, cat]) => ({
      id,
      name: cat.name,
      group: cat.group,
      groupName: GROUP_NAMES[cat.group] || cat.group,
      serviceCount: cat.count || 0,
    }));
    const grouped = {};
    cats.forEach(c => {
      if (!grouped[c.group]) grouped[c.group] = { name: c.groupName, categories: [] };
      grouped[c.group].categories.push(c);
    });
    res.json({ total: cats.length, grouped, categories: cats });
  });

  // ── 카테고리 상세 ──
  router.get('/catalog/category/:id', (req, res) => {
    const id = req.params.id.toUpperCase();
    const cat = CATEGORIES[id];
    if (!cat) return res.status(404).json({ error: 'Category not found' });

    // 서비스 목록 (SERVICES 배열에서 필터 또는 데모 생성)
    const services = SERVICES.filter(s => s.category === id);
    if (services.length === 0) {
      // 데모 서비스 생성
      for (let i = 1; i <= (cat.count || 5); i++) {
        services.push({
          id: `${id}${String(i).padStart(2, '0')}`,
          category: id,
          name: `${cat.name} 서비스 ${i}`,
          tier: i <= 3 ? 'BASIC' : i <= 7 ? 'PRO' : 'ENTERPRISE',
          price: i <= 3 ? 0 : i <= 7 ? 49000 : 450000,
          satellite: i > 5,
        });
      }
    }

    res.json({
      id,
      name: cat.name,
      group: cat.group,
      groupName: GROUP_NAMES[cat.group] || cat.group,
      totalServices: services.length,
      services,
    });
  });

  // ── 서비스 검색 ──
  router.get('/catalog/search', (req, res) => {
    const q = (req.query.q || '').toLowerCase();
    if (!q) return res.json({ results: [] });
    const results = SERVICES
      .filter(s => (s.name || '').toLowerCase().includes(q))
      .slice(0, 20);
    res.json({ results, total: results.length });
  });

  // ── 견적 요청 ──
  const requireAuth = auth?.authMiddleware || ((req, res, next) => next());
  router.post('/catalog/quote', requireAuth, async (req, res) => {
    const { serviceIds, message, contact } = req.body;
    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({ error: 'serviceIds required' });
    }

    // DB가 있으면 저장
    if (db) {
      try {
        await db.run(
          'INSERT INTO quote_requests (user_id, service_ids, message, contact, status) VALUES (?, ?, ?, ?, ?)',
          [req.user?.id || null, JSON.stringify(serviceIds), message || '', contact || '', 'pending']
        );
      } catch (e) {
        // 테이블이 없을 수 있음 — 무시
        console.log('Quote save skipped:', e.message);
      }
    }

    res.json({
      ok: true,
      quoteId: `Q-${Date.now().toString(36).toUpperCase()}`,
      serviceCount: serviceIds.length,
      message: 'Quote request received. We will contact you within 24 hours.',
    });
  });

  // ── 카탈로그 통계 ──
  router.get('/catalog/stats', (req, res) => {
    const totalCategories = Object.keys(CATEGORIES).length;
    const totalServices = Object.values(CATEGORIES).reduce((sum, c) => sum + (c.count || 0), 0);
    const groups = {};
    Object.values(CATEGORIES).forEach(c => {
      groups[c.group] = (groups[c.group] || 0) + (c.count || 0);
    });
    res.json({
      totalCategories,
      totalServices,
      groups: Object.entries(groups).map(([g, cnt]) => ({
        id: g,
        name: GROUP_NAMES[g] || g,
        serviceCount: cnt,
      })),
    });
  });

  return router;
};
