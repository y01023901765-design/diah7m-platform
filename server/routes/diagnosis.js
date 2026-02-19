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
      // DataStore에서 실제 수집 현황 가져오기
      const status = dataStore ? dataStore.getStatus() : {
        available: false,
        total: 59,
        ok: 0,
        stale: 0,
        expired: true,
        lastFetch: null,
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
      // DataStore에서 최신 데이터 가져오기
      if (!dataStore) {
        return res.status(503).json({
          success: false,
          code: 'DATASTORE_UNAVAILABLE',
          message: 'DataStore not initialized',
          data: null
        });
      }
      
      const gaugeData = dataStore.toGaugeData();
      const status = dataStore.getStatus();
      
      // 데이터 없으면 Demo 반환
      if (Object.keys(gaugeData).length === 0) {
        const { DEMO_DIAGNOSIS } = require('../lib/demo-data');
        return res.json({
          success: true,
          data: {
            gauges: Object.entries(DEMO_DIAGNOSIS.systems || {}).flatMap(([axis, sys]) => 
              (sys.gauges || []).map(g => ({ id: g.id, value: g.value, axis }))
            ),
            timestamp: new Date().toISOString(),
            source: 'demo_data'
          },
          demo: true,
          stale: true,
          warnings: ['NO_DATA_USING_DEMO']
        });
      }
      
      // 실제 데이터 반환
      const gauges = Object.entries(gaugeData).map(([id, value]) => ({
        id,
        value,
        ...dataStore.get(id)
      }));
      
      res.json({
        success: true,
        data: {
          gauges,
          timestamp: status.lastFetch || new Date().toISOString(),
          source: 'datastore',
          stale: status.expired
        }
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
      const pipeline = require('../lib/data-pipeline');
      const jobStore = require('../lib/job-store');
      
      const { gauges } = req.body;
      
      // Job 생성 (백그라운드 실행)
      const job = jobStore.createJob(async (updateProgress) => {
        updateProgress(10);
        
        // fetchAll 실행
        const results = await pipeline.fetchAll();
        updateProgress(80);
        
        // DataStore에 저장
        if (dataStore) {
          await dataStore.store(results.gauges.reduce((acc, g) => {
            acc[g.id] = g;
            return acc;
          }, {}));
        }
        updateProgress(100);
        
        return results;
      });
      
      res.json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          message: '데이터 수집이 시작되었습니다',
          pollUrl: `/api/v1/data/job/${job.id}`
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
  
  // Job 상태 조회
  router.get('/data/job/:jobId', (req, res) => {
    const jobStore = require('../lib/job-store');
    const job = jobStore.getJob(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        code: 'JOB_NOT_FOUND',
        message: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      data: job
    });
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
      if (!engine) {
        return res.status(503).json({
          success: false,
          code: 'ENGINE_UNAVAILABLE',
          message: 'Diagnosis engine not initialized',
          data: null
        });
      }
      
      if (!dataStore) {
        return res.status(503).json({
          success: false,
          code: 'DATASTORE_UNAVAILABLE',
          message: 'DataStore not initialized',
          data: null
        });
      }
      
      // DataStore에서 최신 데이터 가져오기
      const gaugeData = dataStore.toGaugeData();
      const prevData = dataStore.toPrevData();
      
      // 데이터 없으면 Demo 반환
      if (Object.keys(gaugeData).length === 0) {
        const { DEMO_DIAGNOSIS } = require('../lib/demo-data');
        return res.json({
          success: true,
          data: DEMO_DIAGNOSIS,
          demo: true,
          stale: true,
          warnings: ['NO_DATA_USING_DEMO', 'Call POST /api/v1/data/refresh to collect real data']
        });
      }
      
      // core-engine으로 진단 실행
      const diagnosis = await engine.diagnose(gaugeData, { prevData });
      
      res.json({
        success: true,
        data: diagnosis
      });
    } catch (error) {
      console.error('Error running diagnosis:', error);
      
      // 에러 시 Demo 폴백
      const { DEMO_DIAGNOSIS } = require('../lib/demo-data');
      res.json({
        success: true,
        data: DEMO_DIAGNOSIS,
        demo: true,
        degraded: true,
        warnings: ['DIAGNOSIS_ERROR', error.message]
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
      
      if (!engine || !dataStore) {
        return res.status(503).json({
          success: false,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Engine or DataStore not initialized',
          data: null
        });
      }
      
      // 전체 진단 실행
      const gaugeData = dataStore.toGaugeData();
      
      if (Object.keys(gaugeData).length === 0) {
        const { DEMO_DIAGNOSIS } = require('../lib/demo-data');
        const demoAxis = DEMO_DIAGNOSIS.systems.find(s => s.axis_id === id);
        return res.json({
          success: true,
          data: demoAxis || { axis_id: id, score: 0, gauges: [] },
          demo: true
        });
      }
      
      const diagnosis = await engine.diagnose(gaugeData, { prevData: dataStore.toPrevData() });
      
      // 해당 축만 추출
      const axisData = diagnosis.systems.find(s => s.system_id === id || s.axis_id === id);
      
      if (!axisData) {
        return res.status(404).json({
          success: false,
          code: 'AXIS_NOT_FOUND',
          message: `Axis ${id} not found in diagnosis result`,
          data: null
        });
      }
      
      res.json({
        success: true,
        data: axisData
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
      
      if (!dataStore) {
        return res.status(503).json({
          success: false,
          code: 'DATASTORE_UNAVAILABLE',
          message: 'DataStore not initialized',
          data: null
        });
      }
      
      // GAUGE_MAP에서 게이지 정보 확인
      const pipeline = require('../lib/data-pipeline');
      const gaugeInfo = pipeline.GAUGE_MAP[id];
      
      if (!gaugeInfo) {
        return res.status(404).json({
          success: false,
          code: 'GAUGE_NOT_FOUND',
          message: `Gauge ${id} not found in GAUGE_MAP`,
          data: null
        });
      }
      
      // DataStore에서 현재 값과 이력 조회
      const current = dataStore.get(id);
      
      // 이력 데이터 (향후 확장)
      const history = [];
      
      res.json({
        success: true,
        data: {
          gauge_id: id,
          name: gaugeInfo.name || gaugeInfo.id,
          value: current?.value || null,
          prevValue: current?.prevValue || null,
          unit: current?.unit || gaugeInfo.unit || '',
          source: current?.source || gaugeInfo.source || 'unknown',
          date: current?.date || null,
          status: current?.status || 'UNKNOWN',
          stale: current?.stale || false,
          history,
          metadata: {
            api: gaugeInfo.api || null,
            params: gaugeInfo.params || null
          }
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

      const result = await engine.diagnose(gauges, thresholds || {});

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
      if (!engine || !engine.diagnose) return res.status(503).json({ error: 'Engine v2.0 required' });
      const { gauges, thresholds, country_code, country_name, product_type, frequency, language } = req.body;
      if (!gauges || typeof gauges !== 'object') return res.status(400).json({ error: 'Gauge data required' });

      const report = await engine.diagnose(
        Array.isArray(gauges) ? gauges : Object.entries(gauges).map(([id, v]) => ({ id, value: v })),
        {
          countryCode: country_code || 'KR',
          countryName: country_name || '대한민국',
          productType: product_type || 'national',
          frequency: frequency || 'monthly',
        }
      );

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
  router.get('/report/auto', requireAuth, async (req, res) => {
    try {
      if (!engine || !engine.diagnose) return res.status(503).json({ error: 'Engine unavailable' });
      if (!dataStore) return res.status(503).json({ error: 'DataStore unavailable' });

      const gaugeData = dataStore.toGaugeData();
      if (Object.keys(gaugeData).length === 0) {
        const { DEMO_DIAGNOSIS } = require('../lib/demo-data');
        return res.status(200).json({
          success: true,
          data: DEMO_DIAGNOSIS,
          demo: true,
          stale: true,
          warnings: ['NO_DATA_USING_DEMO', 'Call POST /api/v1/data/refresh to collect real data']
        });
      }

      const report = await engine.diagnose(
        Array.isArray(gaugeData) ? gaugeData : Object.entries(gaugeData).map(([id, v]) => ({ id, value: typeof v === 'object' ? v.value : v })),
        {
          countryCode: req.query.country || 'KR',
          countryName: req.query.country_name || '대한민국',
          productType: 'national',
          frequency: req.query.frequency || 'monthly',
        }
      );

      res.json(report);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
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
