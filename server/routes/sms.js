/**
 * DIAH-7M SMS Routes — /api/v1/sms/*, /api/v1/admin/sms/*
 * 인증코드 발송/확인 + 관리자 SMS 관리
 */
const express = require('express');
const router = express.Router();

module.exports = function createSmsRouter({ db, auth }) {
  const smsService = require('../lib/sms-service');

  // DB 연결
  if (db) smsService.setSmsDB(db);

  const requireAuth = auth?.authMiddleware || ((req, res) => res.status(503).json({ error: 'Auth unavailable' }));
  const adminAuth = [
    auth?.authMiddleware || ((req, res, next) => next()),
    auth?.adminMiddleware || ((req, res, next) => next()),
  ];

  // ══════════════════════════════════════
  // 사용자 — 인증코드
  // ══════════════════════════════════════

  // POST /sms/verify/send — 인증코드 발송
  router.post('/sms/verify/send', async (req, res) => {
    try {
      const { phone, purpose } = req.body;
      if (!phone) return res.status(400).json({ error: '전화번호가 필요합니다' });

      // 간단한 전화번호 형식 검증
      const cleaned = phone.replace(/[\s\-]/g, '');
      if (cleaned.length < 9 || cleaned.length > 15) {
        return res.status(400).json({ error: '올바른 전화번호 형식이 아닙니다' });
      }

      const result = await smsService.sendVerification(cleaned, purpose || 'signup');
      if (result.ok) {
        res.json({ ok: true, expiresAt: result.expiresAt, message: '인증코드가 발송되었습니다' });
      } else {
        res.status(500).json({ ok: false, error: result.error });
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /sms/verify/check — 인증코드 확인
  router.post('/sms/verify/check', async (req, res) => {
    try {
      const { phone, code, purpose } = req.body;
      if (!phone || !code) return res.status(400).json({ error: '전화번호와 인증코드가 필요합니다' });

      const result = await smsService.checkVerification(phone.replace(/[\s\-]/g, ''), code, purpose || 'signup');
      if (result.ok) {
        res.json({ ok: true, message: '인증이 완료되었습니다' });
      } else {
        res.status(400).json(result);
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ══════════════════════════════════════
  // 사용자 — 전화번호 저장
  // ══════════════════════════════════════

  // PUT /me/phone — 전화번호 + SMS 수신동의 저장
  router.put('/me/phone', requireAuth, async (req, res) => {
    try {
      const { phone, sms_opt_in, country_code } = req.body;
      if (!db) return res.status(503).json({ error: 'DB unavailable' });

      const cleaned = phone ? phone.replace(/[\s\-]/g, '') : '';

      // phone 변경 시 인증 여부 확인
      if (cleaned) {
        const current = await db.get('SELECT phone, phone_verified FROM users WHERE id = ?', [req.user.id]);
        const needVerify = current?.phone !== cleaned;

        await db.run(
          'UPDATE users SET phone = ?, phone_verified = ?, sms_opt_in = ?, country_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [cleaned, needVerify ? 0 : (current?.phone_verified || 0), sms_opt_in ? 1 : 0, country_code || 'KR', req.user.id]
        );

        res.json({ ok: true, needVerify });
      } else {
        // 전화번호 제거
        await db.run(
          'UPDATE users SET phone = \'\', phone_verified = 0, sms_opt_in = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [sms_opt_in ? 1 : 0, req.user.id]
        );
        res.json({ ok: true, needVerify: false });
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /me/phone/verify — 전화번호 인증 완료 처리
  router.post('/me/phone/verify', requireAuth, async (req, res) => {
    try {
      const { phone, code } = req.body;
      if (!phone || !code) return res.status(400).json({ error: '전화번호와 인증코드가 필요합니다' });

      const cleaned = phone.replace(/[\s\-]/g, '');
      const result = await smsService.checkVerification(cleaned, code, 'phone_change');
      if (!result.ok) return res.status(400).json(result);

      // 인증 성공 → phone_verified = 1
      await db.run('UPDATE users SET phone_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND phone = ?',
        [req.user.id, cleaned]);

      res.json({ ok: true, message: '전화번호 인증이 완료되었습니다' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ══════════════════════════════════════
  // 관리자 — SMS 관리
  // ══════════════════════════════════════

  // POST /admin/sms/send — 개별/대량 발송
  router.post('/admin/sms/send', ...adminAuth, async (req, res) => {
    try {
      const { phones, templateCode, vars, message } = req.body;
      if (!phones || !phones.length) return res.status(400).json({ error: '수신번호가 필요합니다' });

      const results = [];
      for (const phone of phones.slice(0, 100)) { // 최대 100건
        let r;
        if (templateCode) {
          r = await smsService.sendTemplate(phone, templateCode, vars || {}, { userId: req.user?.id, type: 'admin' });
        } else if (message) {
          r = await smsService.sendSMS(phone, message, { userId: req.user?.id, type: 'admin' });
        } else {
          r = { ok: false, error: '메시지 또는 템플릿코드가 필요합니다' };
        }
        results.push({ phone, ...r });
      }

      const sent = results.filter(r => r.ok).length;
      const failed = results.filter(r => !r.ok).length;
      res.json({ ok: true, sent, failed, total: results.length, results });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /admin/sms/log — 발송 이력
  router.get('/admin/sms/log', ...adminAuth, async (req, res) => {
    try {
      if (!db) return res.json({ logs: [], total: 0 });

      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const offset = (page - 1) * limit;
      const type = req.query.type || '';
      const status = req.query.status || '';

      let where = '1=1';
      const params = [];
      if (type) { where += ' AND type = ?'; params.push(type); }
      if (status) { where += ' AND status = ?'; params.push(status); }

      const total = await db.get(`SELECT COUNT(*) as cnt FROM sms_log WHERE ${where}`, params);
      const logs = await db.all(
        `SELECT * FROM sms_log WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      res.json({ logs, total: total?.cnt || 0, page, limit });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /admin/sms/balance — 아이코드 잔액
  router.get('/admin/sms/balance', ...adminAuth, async (req, res) => {
    try {
      const balance = await smsService.getIcodeBalance();
      const stats = await smsService.getStats(30);
      res.json({ balance, stats });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /admin/sms/stats — 발송 통계
  router.get('/admin/sms/stats', ...adminAuth, async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const stats = await smsService.getStats(days);
      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /admin/sms/templates — 템플릿 목록
  router.get('/admin/sms/templates', ...adminAuth, async (req, res) => {
    try {
      if (!db) return res.json({ templates: [] });
      const templates = await db.all('SELECT * FROM sms_templates ORDER BY code');
      res.json({ templates });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // PUT /admin/sms/templates/:code — 템플릿 수정
  router.put('/admin/sms/templates/:code', ...adminAuth, async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: 'DB unavailable' });
      const { title, body, type, active } = req.body;
      const code = req.params.code;

      const existing = await db.get('SELECT id FROM sms_templates WHERE code = ?', [code]);
      if (!existing) return res.status(404).json({ error: 'Template not found: ' + code });

      await db.run(
        'UPDATE sms_templates SET title = ?, body = ?, type = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE code = ?',
        [title || '', body || '', type || 'SMS', active !== undefined ? (active ? 1 : 0) : 1, code]
      );

      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /admin/sms/users — SMS 수신 동의 회원 목록
  router.get('/admin/sms/users', ...adminAuth, async (req, res) => {
    try {
      if (!db) return res.json({ users: [], total: 0 });

      const plan = req.query.plan || '';
      const country = req.query.country || '';
      const optIn = req.query.opt_in;

      let where = '1=1';
      const params = [];
      if (plan) { where += ' AND plan = ?'; params.push(plan); }
      if (country) { where += ' AND country_code = ?'; params.push(country); }
      if (optIn !== undefined) { where += ' AND sms_opt_in = ?'; params.push(optIn === 'true' ? 1 : 0); }

      const users = await db.all(
        `SELECT id, name, email, phone, phone_verified, sms_opt_in, plan, country_code FROM users WHERE ${where} AND phone != '' ORDER BY id`,
        params
      );

      res.json({ users, total: users.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
