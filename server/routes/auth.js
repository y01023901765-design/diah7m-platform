/**
 * DIAH-7M Auth Routes — /api/v1/auth/*, /api/v1/me/*
 * 🟢 창3 소유
 */
const express = require('express');
const router = express.Router();

module.exports = function createAuthRouter({ db, auth }) {
  if (!db || !auth) {
    router.all('*', (req, res) => res.status(503).json({ error: 'Auth service unavailable' }));
    return router;
  }

  const requireAuth = auth.authMiddleware || ((req, res) => res.status(503).json({ error: 'Auth unavailable' }));

  // -- 회원가입 --
  router.post('/auth/register', async (req, res) => {
    try {
      const { email, password, name, plan } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

      const exists = await db.get('SELECT id FROM users WHERE email = ?', [email]);
      if (exists) return res.status(409).json({ error: 'Email already registered' });

      const hash = auth.hashPassword(password);
      const result = await db.run(
        'INSERT INTO users (email, password_hash, name, plan, mileage) VALUES (?, ?, ?, ?, 500)',
        [email, hash, name || '', plan || 'FREE']
      );

      await db.run(
        'INSERT INTO mileage_log (user_id, delta, reason, balance_after) VALUES (?, 500, ?, 500)',
        [result.lastID, 'signup_bonus']
      );

      await db.run(
        'INSERT INTO audit_logs (actor, action, target, detail) VALUES (?, ?, ?, ?)',
        ['system', 'user_register', `user:${result.lastID}`, email]
      );

      const token = auth.sign({ id: result.lastID, email, plan: plan || 'FREE', role: 'user' });
      res.status(201).json({ token, user: { id: result.lastID, email, name, plan: plan || 'FREE', mileage: 500 } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // -- 로그인 --
  router.post('/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });
      if (!auth.verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = auth.sign({ id: user.id, email, plan: user.plan, role: user.role });
      res.json({ token, user: { id: user.id, email, name: user.name, plan: user.plan, mileage: user.mileage } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // -- 프로필 조회 --
  router.get('/me', requireAuth, async (req, res) => {
    try {
      const user = await db.get('SELECT id, email, name, plan, mileage, lang, status, created_at FROM users WHERE id = ?', [req.user.id]);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // -- 프로필 수정 --
  router.put('/me', requireAuth, async (req, res) => {
    try {
      const { name, lang } = req.body;
      await db.run('UPDATE users SET name = ?, lang = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name || '', lang || 'ko', req.user.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // -- 비밀번호 변경 --
  router.post('/me/password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
      if (!auth.verifyPassword(currentPassword, user.password_hash)) {
        return res.status(401).json({ error: 'Current password incorrect' });
      }
      const hash = auth.hashPassword(newPassword);
      await db.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hash, req.user.id]);
      await db.run('INSERT INTO audit_logs (actor, action, target) VALUES (?, ?, ?)',
        [`user:${req.user.id}`, 'password_change', `user:${req.user.id}`]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // -- 마일리지 조회 --
  router.get('/me/mileage', requireAuth, async (req, res) => {
    try {
      const user = await db.get('SELECT mileage FROM users WHERE id = ?', [req.user.id]);
      const log = await db.all('SELECT * FROM mileage_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [req.user.id]);
      res.json({ balance: user?.mileage || 0, history: log });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
