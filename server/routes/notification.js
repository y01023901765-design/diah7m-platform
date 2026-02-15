/**
 * DIAH-7M Notification Routes — /api/v1/notifications/*
 * 경보 알림 읽음/안읽음 관리
 *
 * Endpoints:
 *   GET    /notifications           — 내 알림 목록 (최근 50건)
 *   GET    /notifications/unread    — 안읽은 알림 수
 *   PATCH  /notifications/:id/read  — 개별 읽음 처리
 *   PATCH  /notifications/read-all  — 전체 읽음 처리
 *   DELETE /notifications/:id       — 알림 삭제
 */
const express = require('express');
const router = express.Router();

module.exports = function createNotificationRouter({ db, auth }) {
  const requireAuth = auth?.authMiddleware || ((req, res, next) => next());

  // ── 알림 목록 ──
  router.get('/notifications', requireAuth, async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const filter = req.query.filter; // alert|caution|watch|all

    if (db) {
      try {
        let sql = 'SELECT * FROM notifications WHERE user_id = ?';
        const params = [req.user.id];
        if (filter && filter !== 'all') {
          sql += ' AND severity = ?';
          params.push(filter);
        }
        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);
        const rows = await db.all(sql, params);
        return res.json({ notifications: rows, total: rows.length });
      } catch (e) {
        // 테이블이 없으면 데모
      }
    }

    // 데모 데이터 (DB 없을 때)
    const demo = [
      { id: 1, severity: 'alert', gauge: 'D1', message: 'Household debt ratio exceeds threshold', date: '2026-01-15', read: false },
      { id: 2, severity: 'alert', gauge: 'D3', message: 'Government debt growth accelerating', date: '2026-01-15', read: false },
      { id: 3, severity: 'alert', gauge: 'L3', message: 'Youth unemployment rate rising', date: '2026-01-12', read: false },
      { id: 4, severity: 'caution', gauge: 'R2', message: 'Housing price index showing instability', date: '2026-01-10', read: true },
      { id: 5, severity: 'caution', gauge: 'C2', message: 'Consumer confidence declining', date: '2026-01-08', read: true },
      { id: 6, severity: 'watch', gauge: 'I4', message: 'Construction investment contraction trend', date: '2026-01-05', read: true },
    ];
    const filtered = filter && filter !== 'all' ? demo.filter(n => n.severity === filter) : demo;
    res.json({ notifications: filtered.slice(0, limit), total: filtered.length });
  });

  // ── 안읽은 알림 수 ──
  router.get('/notifications/unread', requireAuth, async (req, res) => {
    if (db) {
      try {
        const row = await db.get('SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND read = 0', [req.user.id]);
        return res.json({ unreadCount: row?.cnt || 0 });
      } catch (e) {}
    }
    res.json({ unreadCount: 3 }); // 데모
  });

  // ── 개별 읽음 처리 ──
  router.patch('/notifications/:id/read', requireAuth, async (req, res) => {
    const { id } = req.params;
    if (db) {
      try {
        await db.run('UPDATE notifications SET read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [id, req.user.id]);
        return res.json({ ok: true });
      } catch (e) {}
    }
    res.json({ ok: true }); // 데모
  });

  // ── 전체 읽음 처리 ──
  router.patch('/notifications/read-all', requireAuth, async (req, res) => {
    if (db) {
      try {
        const result = await db.run('UPDATE notifications SET read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read = 0', [req.user.id]);
        return res.json({ ok: true, updated: result?.changes || 0 });
      } catch (e) {}
    }
    res.json({ ok: true, updated: 3 }); // 데모
  });

  // ── 알림 삭제 ──
  router.delete('/notifications/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    if (db) {
      try {
        await db.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, req.user.id]);
        return res.json({ ok: true });
      } catch (e) {}
    }
    res.json({ ok: true }); // 데모
  });

  return router;
};
