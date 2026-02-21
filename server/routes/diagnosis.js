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
  const requireAuth  = auth?.authMiddleware || ((req, res) => res.status(503).json({ error: 'Auth unavailable' }));
  const requireAdmin = auth?.requireRole ? auth.requireRole('admin') : [requireAuth, (req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: '관리자 전용 기능입니다.' });
    next();
  }];

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
      
      // core-engine으로 진단 실행 (Layer B: 59게이지 구조적 침체)
      const diagnosis = await engine.diagnose(gaugeData, { prevData });

      // ── Layer A/B 교차검증 Hold 파생 필드 (엔진 외부, 표시 정책)
      // [CONTRACT] Hold는 계산이 아닌 표시 정책 → 라우트에서만 파생
      const acuteLevel   = diagnosis.layerA?.alertLevel ?? 0;
      const chronicLevel = diagnosis.overall?.level ?? 1;
      let holdSignal = null;
      if (acuteLevel >= 1 && chronicLevel >= 3) {
        holdSignal = { type: 'CONFIRMED', label: '확정 경보 — 급성+구조 이중 근거', acuteLevel, chronicLevel };
      } else if (acuteLevel >= 1) {
        holdSignal = { type: 'ACUTE_ONLY', label: '급성 경보 (구조 미확인)', acuteLevel, chronicLevel };
      } else if (chronicLevel >= 3) {
        holdSignal = { type: 'HOLD', label: 'HOLD — 구조 경보 (급성 미확인)', acuteLevel, chronicLevel };
      }

      res.json({
        success: true,
        data: { ...diagnosis, holdSignal }
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

  // ── DOCX 보고서 다운로드 ──
  // GET /api/v1/report/docx?country=KR&mode=M&period=2026-01
  // mode: D(일별) | W(주별) | M(월별, 기본) | Q(분기별) | A(연별)
  // country: KR(기본), US, 서울특별시, ...
  // period: 없으면 현재 기간 자동 산출
  // DOCX — 관리자 전용 (편집 가능 원본)
  router.get('/report/docx', ...requireAdmin, async (req, res) => {
    try {
      const mode    = (req.query.mode    || 'M').toUpperCase();
      const country = req.query.country  || 'KR';
      let   period  = req.query.period   || '';

      if (!['D','W','M','Q','A'].includes(mode)) {
        return res.status(400).json({ error: `mode must be D|W|M|Q|A, got: ${mode}` });
      }

      // 기간 자동산출
      if (!period) {
        const now = new Date();
        if (mode === 'D') period = now.toISOString().slice(0, 10);
        else if (mode === 'W') {
          const d = new Date(now); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
          const wk = Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
          period = `${d.getFullYear()}-W${String(wk).padStart(2, '0')}`;
        } else if (mode === 'Q') {
          const q = Math.ceil((now.getMonth() + 1) / 3);
          period = `${now.getFullYear()}-Q${q}`;
        } else if (mode === 'A') {
          period = `${now.getFullYear()}`;
        } else {
          period = now.toISOString().slice(0, 7);
        }
      }

      // 파일명 패턴 (마스터설계도 v2.7 기준)
      const MODE_LABEL = { D:'일간속보', W:'주간검진', M:'경제건강검진', Q:'분기진단', A:'연간진단' };
      const label = MODE_LABEL[mode] || '보고서';
      const safeCountry = country.replace(/[^\w가-힣]/g, '');
      const filename = `${label}_${period}_${safeCountry}.docx`;

      // 게이지 데이터 수집
      let gaugeData = {};
      if (dataStore) {
        // 스냅샷 우선 → 없으면 현재 캐시
        if (dataStore.getSnapshot) {
          gaugeData = await dataStore.getSnapshot(country, mode, period);
        }
        if (Object.keys(gaugeData).length === 0 && dataStore.toGaugeData) {
          gaugeData = dataStore.toGaugeData();
        }
      }

      // ── v3.0 파이프라인: core-engine → renderer.renderDOCX ──
      const renderer = require('../lib/renderer');

      // 1) diagnosis 객체 빌드 (core-engine.diagnose)
      let diagnosis = {
        overall: { stage: '0M', score: 0, label: '정상' },
        dualLock: { active: false, contributors: { input_top3: [], output_top3: [] } },
        diah: { activatedLetters: [], activated: {}, summary: '미발동' },
        crossSignals: { active: [], inactive: [] },
        axes: {},
      };
      if (Object.keys(gaugeData).length > 0 && engine && engine.diagnose) {
        try {
          const numericMap = {};
          for (const [k, v] of Object.entries(gaugeData)) {
            const num = typeof v === 'number' ? v : (typeof v === 'object' && v !== null ? (v.value ?? null) : null);
            if (num !== null) numericMap[k] = num;
          }
          diagnosis = engine.diagnose(numericMap);
        } catch (_) { /* ignore */ }
      }
      // 누락 필드 안전 보강
      if (!diagnosis.dualLock) diagnosis.dualLock = { active: false, contributors: { input_top3: [], output_top3: [] } };
      if (!diagnosis.dualLock.contributors) diagnosis.dualLock.contributors = { input_top3: [], output_top3: [] };
      if (!diagnosis.diah) diagnosis.diah = { activatedLetters: [], activated: {}, summary: '미발동' };
      if (!diagnosis.diah.activatedLetters) diagnosis.diah.activatedLetters = [];
      if (!diagnosis.diah.activated) diagnosis.diah.activated = {};
      if (!diagnosis.crossSignals) diagnosis.crossSignals = { active: [], inactive: [] };
      if (Array.isArray(diagnosis.crossSignals)) {
        diagnosis.crossSignals = { active: diagnosis.crossSignals, inactive: [] };
      }
      if (!diagnosis.crossSignals.active) diagnosis.crossSignals.active = [];

      // 2) 위성 게이지 데이터 주입 (dataStore에서 직접)
      if (dataStore && dataStore.getSatelliteData) {
        try {
          const sat = await dataStore.getSatelliteData();
          if (sat && Object.keys(sat).length > 0) {
            diagnosis.satellite = sat;
          }
        } catch (_) { /* ignore */ }
      }

      // 3) renderer.renderDOCX() → DOCX 버퍼
      const buf = await renderer.renderDOCX(diagnosis, { month: period, mode, country });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Content-Length', buf.length);
      res.end(buf);

    } catch (e) {
      console.error('[DOCX] 생성 오류:', e.message, e.stack);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  });

  // ── 스냅샷 목록 조회 (GET /api/v1/report/snapshots?country=KR&mode=M) ──
  router.get('/report/snapshots', async (req, res) => {
    const country = req.query.country || 'KR';
    const mode    = (req.query.mode || 'M').toUpperCase();
    const list    = dataStore?.listSnapshots ? await dataStore.listSnapshots(country, mode) : [];
    res.json({ success: true, data: list });
  });

  // ── PDF 보고서 다운로드 (GET /api/v1/diagnosis/kr/pdf) ──
  // 실제로는 DOCX를 반환 — PDFKit 한글 렌더링 이슈 우회
  // Word/LibreOffice에서 열어 PDF로 저장 가능
  router.get('/diagnosis/kr/pdf', requireAuth, async (req, res) => {
    const plan = req.user?.plan || 'FREE';
    const role = req.user?.role || 'user';
    if (plan === 'FREE' && role !== 'admin') {
      return res.status(403).json({ error: 'BASIC 이상 구독이 필요합니다.' });
    }
    try {
      if (!engine || !engine.diagnose) {
        return res.status(503).json({ error: 'Engine unavailable' });
      }

      const period = new Date().toISOString().slice(0, 7);

      // 1) 게이지 데이터 수집
      let gaugeData = {};
      if (dataStore) {
        if (dataStore.getSnapshot) gaugeData = await dataStore.getSnapshot('KR', 'M', period);
        if (Object.keys(gaugeData).length === 0 && dataStore.toGaugeData) gaugeData = dataStore.toGaugeData();
      }

      // 2) core-engine 진단
      let diagnosis = {
        overall: { stage: '0M', score: 0, label: '정상' },
        dualLock: { active: false, contributors: { input_top3: [], output_top3: [] } },
        diah: { activatedLetters: [], activated: {}, summary: '미발동' },
        crossSignals: { active: [], inactive: [] },
        axes: {},
      };
      if (Object.keys(gaugeData).length > 0) {
        try {
          const numericMap = {};
          for (const [k, v] of Object.entries(gaugeData)) {
            const num = typeof v === 'number' ? v : (typeof v === 'object' && v !== null ? (v.value ?? null) : null);
            if (num !== null) numericMap[k] = num;
          }
          diagnosis = engine.diagnose(numericMap);
        } catch (_) { /* ignore */ }
      }
      // 누락 필드 보강 (renderDOCX 와 동일)
      if (!diagnosis.dualLock) diagnosis.dualLock = { active: false, contributors: { input_top3: [], output_top3: [] } };
      if (!diagnosis.dualLock.contributors) diagnosis.dualLock.contributors = { input_top3: [], output_top3: [] };
      if (!diagnosis.diah) diagnosis.diah = { activatedLetters: [], activated: {}, summary: '미발동' };
      if (!diagnosis.diah.activatedLetters) diagnosis.diah.activatedLetters = [];
      if (!diagnosis.diah.activated) diagnosis.diah.activated = {};
      if (!diagnosis.crossSignals) diagnosis.crossSignals = { active: [], inactive: [] };
      if (Array.isArray(diagnosis.crossSignals)) diagnosis.crossSignals = { active: diagnosis.crossSignals, inactive: [] };
      if (!diagnosis.crossSignals.active) diagnosis.crossSignals.active = [];

      // 위성 데이터 주입
      if (dataStore && dataStore.getSatelliteData) {
        try {
          const sat = await dataStore.getSatelliteData();
          if (sat && Object.keys(sat).length > 0) diagnosis.satellite = sat;
        } catch (_) { /* ignore */ }
      }

      // 3) DOCX Buffer 생성 후 전송 (PDF 버튼이지만 DOCX 반환 — 한글 완벽 지원)
      const renderer = require('../lib/renderer');
      const buf = await renderer.renderDOCX(diagnosis, { month: period, mode: 'M', country: 'KR' });
      const filename = `경제건강검진_${period}_KR.docx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Content-Length', buf.length);
      res.end(buf);

    } catch (e) {
      console.error('[PDF→DOCX] 생성 오류:', e.message, e.stack);
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  });

  return router;
};
