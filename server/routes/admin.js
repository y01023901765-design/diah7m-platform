/**
 * DIAH-7M Admin Routes — /api/v1/admin/*
 * 🟢 창3 소유
 */
const express = require('express');
const router = express.Router();

module.exports = function createAdminRouter({ db, auth, engine, state }) {
  const denyAll = (req, res) => res.status(401).json({ error: 'Auth module not available' });
  const adminAuth = [
    auth?.authMiddleware || denyAll,
    auth?.adminMiddleware || denyAll,
  ];

  // -- KPI --
  router.get('/admin/kpi', ...adminAuth, async (req, res) => {
    try {
      const users = await db.get('SELECT COUNT(*) as cnt FROM users');
      const active = await db.get("SELECT COUNT(*) as cnt FROM users WHERE status = 'active'");
      const diagnoses = await db.get('SELECT COUNT(*) as cnt FROM diagnoses');
      const payments = await db.get("SELECT SUM(amount) as total FROM payments WHERE status = 'completed'");
      res.json({
        totalUsers: users?.cnt || 0,
        activeUsers: active?.cnt || 0,
        totalDiagnoses: diagnoses?.cnt || 0,
        totalRevenue: payments?.total || 0,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // -- 회원 목록 --
  router.get('/admin/users', ...adminAuth, async (req, res) => {
    try {
      const users = await db.all('SELECT id, email, name, plan, mileage, status, created_at FROM users ORDER BY created_at DESC');
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // -- 회원 티어 변경 --
  router.patch('/admin/users/:id/plan', ...adminAuth, async (req, res) => {
    try {
      const { plan } = req.body;
      await db.run('UPDATE users SET plan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [plan, req.params.id]);
      await db.run('INSERT INTO audit_logs (actor, action, target, detail) VALUES (?, ?, ?, ?)',
        [req.user.email, 'plan_change', `user:${req.params.id}`, `→ ${plan}`]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // -- 회원 정지/활성화 --
  router.patch('/admin/users/:id/status', ...adminAuth, async (req, res) => {
    try {
      const { status } = req.body;
      await db.run('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
      await db.run('INSERT INTO audit_logs (actor, action, target, detail) VALUES (?, ?, ?, ?)',
        [req.user.email, 'status_change', `user:${req.params.id}`, `→ ${status}`]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // -- 감사 로그 --
  router.get('/admin/audit', ...adminAuth, async (req, res) => {
    try {
      const logs = await db.all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
      res.json(logs);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // -- 엔진 상태 --
  router.get('/admin/engine', ...adminAuth, (req, res) => {
    res.json({
      engineLoaded: !!engine,
      dbConnected: db?.connected || false,
      modules: state.modules,
      uptime: Math.round((Date.now() - state.startedAt) / 1000),
      totalRequests: state.totalRequests,
    });
  });

  return router;
};
