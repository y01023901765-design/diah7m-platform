/**
 * DIAH-7M Data Pipeline Routes — /api/v1/data/*, /api/trigger-refresh
 * 🔵 창1 소유
 */
const express = require('express');
const router = express.Router();

module.exports = function createDataRouter({ auth, pipeline, dataStore }) {
  const requireAuth = auth?.authMiddleware || ((req, res) => res.status(503).json({ error: 'Auth unavailable' }));
  const adminAuth = [
    auth?.authMiddleware || ((req, res, next) => next()),
    auth?.adminMiddleware || ((req, res, next) => next()),
  ];

  // -- 캐시 상태 조회 (인증 불필요) --
  router.get('/data/status', (req, res) => {
    if (!dataStore) return res.json({ available: false, reason: 'DataStore not initialized' });
    res.json({ available: true, ...dataStore.getStatus() });
  });

  // -- 최신 캐시 데이터 조회 --
  router.get('/data/latest', requireAuth, (req, res) => {
    if (!dataStore) return res.status(503).json({ error: 'DataStore unavailable' });
    const cached = dataStore.getAll();
    const status = dataStore.getStatus();
    // gauges 배열: Dashboard mergeGaugeData 호환 형식
    const gauges = Object.entries(cached).map(([id, entry]) => ({
      id,
      value: entry.value,
      status: entry.status || 'OK',
      unit: entry.unit || '',
      source: entry.source || '',
      date: entry.date || '',
      note: entry.source ? `${entry.source} ${entry.date || ''}`.trim() : '',
      isFallback: !!entry.isFallback,
      stale: !!entry.stale,
      fallbackAge: entry.fallbackAge || null,
    }));
    res.json({ data: { ...cached, gauges }, status });
  });

  // -- refresh (Header 인증 방식) --
  router.get('/trigger-refresh', async (req, res) => {
    const adminPw = process.env.ADMIN_PASSWORD;
    const key = req.headers['x-admin-key'];
    if (!adminPw || key !== adminPw) {
      return res.status(403).json({ error: 'Admin key required (x-admin-key header)' });
    }
    if (!pipeline || !dataStore) return res.json({ error: 'Pipeline/Store unavailable' });
    if (dataStore.fetching) return res.json({ error: 'Already running, wait...' });

    const ecosKey = process.env.ECOS_API_KEY;
    if (!ecosKey) return res.json({ error: 'ECOS_API_KEY not set' });

    dataStore.fetching = true;
    try {
      const t0 = Date.now();
      const { results, stats, errors } = await pipeline.fetchAll(ecosKey, '');
      const stored = await dataStore.store(results);
      dataStore.setLastRun(stats);
      dataStore.fetching = false;
      res.json({
        success: true,
        time: `${((Date.now()-t0)/1000).toFixed(1)}s`,
        fetched: `${stats.ok}/${stats.total}`,
        stored,
        errors: errors?.length || 0,
        details: stats
      });
    } catch (e) {
      dataStore.fetching = false;
      res.json({ error: e.message });
    }
  });

  // -- POST 방식 refresh --
  router.post('/data/refresh', async (req, res) => {
    const adminPw = process.env.ADMIN_PASSWORD;
    const bodyPw = req.body?.adminPassword;
    const headerPw = (req.headers.authorization || '').replace('Bearer ', '');
    
    let authorized = false;
    if (adminPw && (bodyPw === adminPw || headerPw === adminPw)) {
      authorized = true;
    } else if (auth?.authMiddleware) {
      try {
        await new Promise((resolve, reject) => {
          auth.authMiddleware(req, res, (err) => err ? reject(err) : resolve());
        });
        if (req.user?.role === 'admin') authorized = true;
      } catch (e) { /* not authorized via JWT */ }
    }
    
    if (!authorized) return res.status(403).json({ error: 'Admin access required. Send adminPassword in body.' });
    if (!pipeline || !dataStore) return res.status(503).json({ error: 'Pipeline/Store unavailable' });
    if (dataStore.fetching) return res.status(429).json({ error: 'Fetch already in progress' });

    const ecosKey = process.env.ECOS_API_KEY;
    const kosisKey = process.env.KOSIS_API_KEY;
    if (!ecosKey && !kosisKey) return res.status(400).json({ error: 'API keys not configured. Set ECOS_API_KEY and KOSIS_API_KEY in .env' });

    dataStore.fetching = true;
    try {
      console.log('[Pipeline] Refresh started...');
      const t0 = Date.now();
      const { results, stats, errors } = await pipeline.fetchAll(ecosKey, kosisKey);
      console.log(`[Pipeline] Fetch done: ${stats.ok}/${stats.total} OK (${Date.now()-t0}ms)`);
      
      const stored = await dataStore.store(results);
      dataStore.setLastRun(stats);
      console.log(`[Pipeline] Store done: ${stored.stored} stored, ${stored.preserved} preserved`);
      
      dataStore.fetching = false;
      res.json({ ok: true, stats, stored, errors: errors.slice(0, 10) });
    } catch (e) {
      dataStore.fetching = false;
      console.error('[Pipeline] Refresh error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // -- 파이프라인 매핑 진단 --
  router.get('/data/mapping', (req, res) => {
    if (!pipeline) return res.status(503).json({ error: 'Pipeline unavailable' });
    res.json(pipeline.diagnoseMapping());
  });

  // -- 일괄 진단 --
  router.get('/data/debug-all', async (req, res) => {
    const ecosKey = process.env.ECOS_API_KEY;
    if (!ecosKey) return res.json({ error: 'ECOS_API_KEY not set' });

    const results = {};
    const errorGauges = ['S1','S5','O2','G6'];
    for (const id of errorGauges) {
      results[id] = await pipeline.testGauge(id, ecosKey, '');
    }

    const bsiItems = ['FBB','FBE','FBB01','FBE01','FBA','FAB','FA','FB','FC','FD','FMB','FME'];
    const bsiProbe = {};
    for (const item of bsiItems) {
      const url = `https://ecos.bok.or.kr/api/StatisticSearch/${ecosKey}/json/kr/1/5/512Y006/M/202401/202602/${item}`;
      try {
        const r = await fetch(url);
        const json = await r.json();
        const rows = json?.StatisticSearch?.row;
        bsiProbe[item] = rows ? { ok: true, count: rows.length, latest: rows[rows.length-1]?.TIME, name: rows[0]?.ITEM_NAME1, value: rows[rows.length-1]?.DATA_VALUE } : { ok: false, msg: json?.RESULT?.MESSAGE || 'no data' };
      } catch(e) { bsiProbe[item] = { ok: false, msg: e.message }; }
    }
    results._bsiProbe = bsiProbe;

    results._fredKey = process.env.FRED_API_KEY ? 'SET' : 'MISSING';
    results._airkoreaKey = process.env.AIRKOREA_API_KEY ? 'SET' : 'MISSING';
    // 환경변수 키 노출 금지 (보안)

    res.json(results);
  });

  // -- 개별 게이지 테스트 --
  router.get('/data/test-gauge/:id', async (req, res) => {
    if (!pipeline) return res.status(503).json({ error: 'Pipeline unavailable' });
    const ecosKey = process.env.ECOS_API_KEY;
    const kosisKey = process.env.KOSIS_API_KEY;
    const result = await pipeline.testGauge(req.params.id, ecosKey, kosisKey);
    res.json(result);
  });

  // -- KOSIS 검색 --
  router.get('/data/kosis-search', async (req, res) => {
    const kosisKey = process.env.KOSIS_API_KEY;
    const keywords = (req.query.q || '수출입,소비자물가,산업생산,소매판매,실업률,고용률,경기종합지수,설비투자,주택가격,출산,제조업가동률,미분양,생산자물가,경상수지,국가채무,건설기성,컨테이너,외국인직접투자,서비스업생산,신규수주,제조업재고').split(',');
    const results = {};
    
    for (const kw of keywords) {
      try {
        const url = `https://kosis.kr/openapi/statisticsList.do?method=getList&vwCd=MT_ZTITLE&parentListId=&apiKey=${encodeURIComponent(kosisKey)}&format=json&jsonVD=Y&searchNm=${encodeURIComponent(kw.trim())}`;
        const r = await new Promise((resolve, reject) => {
          require('https').get(url, { timeout: 8000 }, (resp) => {
            let d = ''; resp.on('data', c => d += c);
            resp.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve({ parseError: d.slice(0, 200) }); } });
          }).on('error', reject);
        });
        if (Array.isArray(r)) {
          results[kw.trim()] = r.slice(0, 3).map(x => {
            const entry = {};
            for (const [k, v] of Object.entries(x)) {
              if (v && v !== '') entry[k] = v;
            }
            return entry;
          });
        } else {
          results[kw.trim()] = r;
        }
      } catch (e) {
        results[kw.trim()] = { error: e.message };
      }
      await new Promise(r => setTimeout(r, 200));
    }
    
    res.json({ total: keywords.length, results });
  });

  // -- 전체 진단 --
  router.get('/data/diagnose', ...adminAuth, async (req, res) => {
    if (!pipeline) return res.status(503).json({ error: 'Pipeline unavailable' });
    const ecosKey = process.env.ECOS_API_KEY;
    const kosisKey = process.env.KOSIS_API_KEY;
    const results = await pipeline.diagnoseAll(ecosKey, kosisKey);
    res.json(results);
  });

  return router;
};
