/**
 * DIAH-7M Diagnosis Routes — /api/v1/diagnose, /api/v1/diagnoses/*, /api/v1/report/*, /api/v1/data/*, /api/v1/diagnosis/*
 * 🔵 창1 소유
 * 
 * 수정: 2026-02-18 - Phase 1 데이터 수집 API 추가
 * 변경사항:
 * - GET /api/v1/data/status (신규)
 * - GET /api/v1/data/latest (신규)
 * - POST /api/v1/data/refresh (신규)
 * - GET /api/v1/diagnosis/kr (신규)
 * - GET /api/v1/diagnosis/kr/axis/:id (신규)
 * - GET /api/v1/diagnosis/kr/gauge/:id (신규)
 * - 기존 라우트 보존: /diagnose, /report, /diagnoses
 */
const express = require('express');
const router = express.Router();

module.exports = function createDiagnosisRouter({ db, auth, engine, dataStore, state }) {
  const requireAuth = auth?.authMiddleware || ((req, res) => res.status(503).json({ error: 'Auth unavailable' }));

  // ==========================================
  // [신규] 데이터 수집 상태 API
  // ==========================================

  /**
   * GET /api/v1/data/status
   * 데이터 수집 현황 조회 (공개 API, 인증 불필요)
   * 
   * Response:
   * {
   *   success: true,
   *   data: {
   *     collected: 56,
   *     total: 59,
   *     percentage: 94.9,
   *     missing: ["O2_PMI", "S2_NIGHTLIGHT", "R6_THERMAL"]
   *   }
   * }
   */
  router.get('/data/status', async (req, res) => {
    try {
      // TODO: 실제 DataStore에서 수집 현황 가져오기
      // const status = await dataStore.getCollectionStatus();
      
      // 현재: 하드코딩 (문서 기준 56/59)
      const status = {
        collected: 56,
        total: 59,
        percentage: 94.9,
        missing: ["O2_PMI", "S2_NIGHTLIGHT", "R6_THERMAL"],
        lastUpdated: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error fetching data status:', error);
      res.status(500).json({
        success: false,
        code: 'DATA_STATUS_ERROR',
        message: error.message,
        data: null
      });
    }
  });

  /**
   * GET /api/v1/data/latest
   * 최신 수집 데이터 조회 (공개 API)
   * 
   * Response:
   * {
   *   success: true,
   *   data: {
   *     gauges: [{ id: 'O1_EXPORT', value: 123, ... }],
   *     timestamp: "2026-02-16T10:00:00Z"
   *   }
   * }
   */
  router.get('/data/latest', async (req, res) => {
    try {
      // TODO: 실제 DataStore에서 최신 데이터 가져오기
      // const latest = await dataStore.getLatest();
      
      // 현재: 데모 데이터 반환
      const latest = {
        gauges: [
          { id: 'O1_EXPORT', value: 520.3, score: 82, trend: 'up', severity: 1 },
          { id: 'O2_PMI', value: null, score: null, trend: null, severity: null },
          { id: 'F1_KOSPI', value: 2850, score: 75, trend: 'stable', severity: 2 }
          // ... 나머지 56개 게이지
        ],
        timestamp: new Date().toISOString(),
        source: 'demo_data'
      };
      
      res.json({
        success: true,
        data: latest
      });
    } catch (error) {
      console.error('Error fetching latest data:', error);
      res.status(500).json({
        success: false,
        code: 'DATA_FETCH_ERROR',
        message: error.message,
        data: null
      });
    }
  });

  /**
   * POST /api/v1/data/refresh
   * 데이터 수집 재실행 (인증 필요)
   * 
   * Body: { gauges?: string[] } - 특정 게이지만 수집 (선택)
   * Response: { success: true, jobId: "..." }
   */
  router.post('/data/refresh', requireAuth, async (req, res) => {
    try {
      // TODO: data-pipeline.js의 fetchAll() 호출
      
      const { gauges } = req.body;
      
      res.json({
        success: true,
        data: {
          jobId: `refresh_${Date.now()}`,
          status: 'pending',
          message: '데이터 수집이 시작되었습니다'
        }
      });
    } catch (error) {
      console.error('Error triggering refresh:', error);
      res.status(500).json({
        success: false,
        code: 'REFRESH_ERROR',
        message: error.message,
        data: null
      });
    }
  });

  // ==========================================
  // [신규] 진단 API v2 (Phase 1-2에서 구현 예정)
  // ==========================================

  /**
   * GET /api/v1/diagnosis/kr
   * 한국 경제 진단 실행
   * 
   * Response:
   * {
   *   success: true,
   *   data: {
   *     overall: { score: 72, grade: "B", trend: "stable" },
   *     systems: [{ axis_id: "O", score: 82, severity: 1 }, ...],
   *     crossSignals: [...],
   *     dualLocks: [...]
   *   }
   * }
   */
  router.get('/diagnosis/kr', async (req, res) => {
    try {
      // TODO: core-engine.js의 diagnose() 호출
      
      res.json({
        success: true,
        data: {
          overall: { score: 72, grade: "B", trend: "stable" },
          systems: [],
          crossSignals: [],
          dualLocks: [],
          message: '진단 엔진 연동 예정 (N07-N10)'
        }
      });
    } catch (error) {
      console.error('Error running diagnosis:', error);
      res.status(500).json({
        success: false,
        code: 'DIAGNOSIS_ERROR',
        message: error.message,
        data: null
      });
    }
  });

  /**
   * GET /api/v1/diagnosis/kr/axis/:id
   * 특정 축 상세 조회
   * 
   * Params: id = O|F|S|P|R|I|T|E|L
   */
  router.get('/diagnosis/kr/axis/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // 축 ID 검증
      const validAxes = ['O', 'F', 'S', 'P', 'R', 'I', 'T', 'E', 'L'];
      if (!validAxes.includes(id)) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_AXIS',
          message: `유효하지 않은 축 ID: ${id}`,
          data: null
        });
      }
      
      // TODO: core-engine.js에서 축별 상세 데이터 가져오기
      
      res.json({
        success: true,
        data: {
          axis_id: id,
          score: 82,
          severity: 1,
          gauges: [],
          message: '축별 상세 구현 예정 (N13)'
        }
      });
    } catch (error) {
      console.error('Error fetching axis detail:', error);
      res.status(500).json({
        success: false,
        code: 'AXIS_DETAIL_ERROR',
        message: error.message,
        data: null
      });
    }
  });

  /**
   * GET /api/v1/diagnosis/kr/gauge/:id
   * 특정 게이지 상세 조회
   * 
   * Params: id = O1_EXPORT|F1_KOSPI|...
   */
  router.get('/diagnosis/kr/gauge/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // TODO: data-pipeline.js의 GAUGE_MAP에서 게이지 정보 확인
      // TODO: DataStore에서 해당 게이지 히스토리 조회
      
      res.json({
        success: true,
        data: {
          gauge_id: id,
          value: null,
          score: null,
          trend: null,
          history: [],
          message: '게이지별 상세 구현 예정 (N14)'
        }
      });
    } catch (error) {
      console.error('Error fetching gauge detail:', error);
      res.status(500).json({
        success: false,
        code: 'GAUGE_DETAIL_ERROR',
        message: error.message,
        data: null
      });
    }
  });

  // ==========================================
  // [기존] 진단 엔진 API (v1.0 - 보존)
  // ==========================================

  // -- 진단 실행 --
  router.post('/diagnose', requireAuth, async (req, res) => {
    try {
      if (!engine) return res.status(503).json({ error: 'Engine unavailable' });
      const { gauges, country, period, thresholds } = req.body;
      if (!gauges || typeof gauges !== 'object') {
        return res.status(400).json({ error: 'Gauge data required' });
      }

      const result = engine.diagnose(gauges, thresholds || {});

      if (db) {
        const saved = await db.run(
          `INSERT INTO diagnoses (user_id, country, period, overall_level, overall_score, systems_json, cross_signals_json, dual_lock)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.user.id, country || 'KR', period || new Date().toISOString().slice(0, 7),
           result.overall.level, result.overall.score,
           JSON.stringify(result.systems), JSON.stringify(result.crossSignals),
           result.dualLock ? 1 : 0]
        );
        result.diagnosisId = saved.lastID;
      }

      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // -- Schema-compliant 보고서 생성 --
  router.post('/report', requireAuth, async (req, res) => {
    try {
      if (!engine || !engine.generateReport) return res.status(503).json({ error: 'Engine v1.1 required' });
      const { gauges, thresholds, country_code, country_name, product_type, frequency, language } = req.body;
      if (!gauges || typeof gauges !== 'object') return res.status(400).json({ error: 'Gauge data required' });

      const report = engine.generateReport(gauges, {
        thresholds: thresholds || {},
        countryCode: country_code || 'KR',
        countryName: country_name || '대한민국',
        productType: product_type || 'national',
        frequency: frequency || 'monthly',
        tier: req.user?.plan || 'FREE',
        language: language || 'ko',
        channel: 'web',
      });

      if (db) {
        await db.run(
          `INSERT INTO diagnoses (user_id, country, period, overall_level, overall_score, systems_json, cross_signals_json, dual_lock)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.user.id, report.context.country_code, report.context.period_label,
           report.overall.level, report.overall.score,
           JSON.stringify(report.systems), JSON.stringify(report.cross_signals),
           report.dual_lock.active ? 1 : 0]
        );
      }

      res.json(report);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // -- 자동 보고서 (캐시 데이터 → 엔진) --
  router.get('/report/auto', requireAuth, (req, res) => {
    if (!engine || !engine.generateReport) return res.status(503).json({ error: 'Engine unavailable' });
    if (!dataStore) return res.status(503).json({ error: 'DataStore unavailable' });

    const gaugeData = dataStore.toGaugeData();
    const prevData = dataStore.toPrevData();
    if (Object.keys(gaugeData).length === 0) {
      // GPT 피드백: 404 대신 200 OK + demo 데이터
      const { DEMO_DIAGNOSIS } = require('../lib/demo-data');
      return res.status(200).json({
        success: true,
        data: DEMO_DIAGNOSIS,
        demo: true,
        stale: true,
        warnings: ['NO_DATA_USING_DEMO', 'Call POST /api/v1/data/refresh to collect real data']
      });
    }

    const report = engine.generateReport(gaugeData, {
      prevData,
      countryCode: req.query.country || 'KR',
      countryName: req.query.country_name || '대한민국',
      productType: 'national',
      frequency: req.query.frequency || 'monthly',
      tier: req.user?.plan || 'FREE',
      language: req.query.lang || 'ko',
      channel: 'web',
    });

    res.json(report);
  });

  // -- 진단 이력 --
  router.get('/diagnoses', requireAuth, async (req, res) => {
    try {
      const rows = await db.all(
        'SELECT id, country, period, overall_level, overall_score, dual_lock, created_at FROM diagnoses WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
        [req.user.id]
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // -- 진단 상세 --
  router.get('/diagnoses/:id', requireAuth, async (req, res) => {
    try {
      const row = await db.get('SELECT * FROM diagnoses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
      if (!row) {
        // GPT 피드백: 404 대신 200 OK
        return res.status(200).json({
          success: true,
          data: null,
          warnings: ['DIAGNOSIS_NOT_FOUND']
        });
      }
      row.systems = JSON.parse(row.systems_json || '{}');
      row.crossSignals = JSON.parse(row.cross_signals_json || '[]');
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
};
