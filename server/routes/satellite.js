/**
 * DIAH-7M Satellite Routes — 수집/조회 분리
 * ═══════════════════════════════════════════
 * 
 * /api/admin/satellite/collect — 관리자 전용, 배치 수집 트리거
 * /api/v1/satellite/latest     — 읽기 전용, 캐시된 스냅샷 반환
 * 
 * GPT 설계 원칙:
 * - collect는 job_id 반환 (동기 응답 금지)
 * - latest는 캐시만 읽기 (실시간 호출 금지)
 * - 위성 스냅샷도 관측성 메타(run_id, asof_kst) 동일 형식
 */

'use strict';

const express = require('express');
const router = express.Router();

// 위성 스냅샷 인메모리 캐시
let satSnapshot = {
  S2:  null, // VIIRS 야간광
  R5:  null, // Sentinel-1 SAR
  R6:  null, // Landsat-9 열적외선
  meta: {
    last_collect_asof: null,
    last_success_asof: null,
    last_run_id: null,
    status: 'NOT_COLLECTED',
  },
};

// ── 수집 트리거 (관리자 전용) ──
// POST /api/admin/satellite/collect
// ── 중복 실행 방지 (GPT 요구: 같은 job 겹침 방지) ──
let _collectRunning = false;
let _collectJobId = null;

// ── baseline365 캐시 (주 1회 재생성) ──
let _baselineCache = { asof: null, maxAgeDays: 7 };

router.post('/collect', async (req, res) => {
  // 중복 실행 방지
  if (_collectRunning) {
    return res.status(409).json({ 
      error: 'Collection already running', 
      running: true, 
      job_id: _collectJobId 
    });
  }

  const jobId = `sat_${Date.now()}`;
  _collectRunning = true;
  _collectJobId = jobId;
  
  // 즉시 job_id 반환 (동기 응답 금지 — Render 타임아웃 방지)
  res.json({ 
    accepted: true, 
    job_id: jobId,
    message: 'Satellite collection started. Check /api/v1/satellite/latest for results.',
  });

  // 비동기 수집 (응답 후 백그라운드 실행)
  try {
    const { fetchAllSatellite, REGIONS } = require('../lib/fetch-satellite');
    const region = req.body?.region || req.query?.region || 'KR';
    if (!REGIONS[region]) throw new Error(`Unknown region: ${region}. Available: ${Object.keys(REGIONS).join(',')}`);
    const lastSuccessMap = {};
    if (satSnapshot.S2?.date) lastSuccessMap.S2 = satSnapshot.S2.date;
    if (satSnapshot.R6?.date) lastSuccessMap.R6 = satSnapshot.R6.date;

    const { results, meta } = await fetchAllSatellite(region, lastSuccessMap);
    
    // 성공한 결과만 스냅샷에 저장
    for (const [id, data] of Object.entries(results)) {
      if (data.status === 'OK') satSnapshot[id] = data;
    }

    satSnapshot.meta = {
      last_collect_asof: meta.asof_kst,
      last_success_asof: meta.collected > 0 ? meta.asof_kst : satSnapshot.meta.last_success_asof,
      last_run_id: meta.run_id,
      status: meta.collected > 0 ? 'COLLECTED' : (meta.failed > 0 ? 'PARTIAL' : 'NO_CHANGE'),
      duration_ms: meta.duration_ms,
      collected: meta.collected,
      skipped: meta.skipped,
      failed: meta.failed,
      failures: meta.failures,
    };

    console.log(`[Satellite] ${jobId}: ${meta.collected} collected, ${meta.skipped} skipped, ${meta.failed} failed (${meta.duration_ms}ms)`);
  } catch (e) {
    satSnapshot.meta.status = 'FAILED';
    satSnapshot.meta.last_collect_asof = new Date().toISOString();
    console.error(`[Satellite] ${jobId} failed:`, e.message);
  } finally {
    _collectRunning = false;
    _collectJobId = null;
  }
});

// ── 스냅샷 조회 (읽기 전용) ──
// GET /api/v1/satellite/latest
router.get('/latest', (req, res) => {
  const { meta, ...gauges } = satSnapshot;
  const hasData = Object.values(gauges).some(v => v !== null);
  
  res.json({
    available: hasData,
    gauges: hasData ? gauges : {},
    meta,
    _note: hasData ? undefined : 'No satellite data collected yet. Trigger collection via POST /api/admin/satellite/collect',
  });
});

// ── 상태 확인 ──
// GET /api/v1/satellite/status
router.get('/status', (req, res) => {
  res.json(satSnapshot.meta);
});

module.exports = router;
module.exports._snapshot = satSnapshot; // 테스트/cron에서 접근용
