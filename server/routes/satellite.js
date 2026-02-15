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
router.post('/collect', async (req, res) => {
  const jobId = `sat_${Date.now()}`;
  
  // 즉시 job_id 반환 (동기 응답 금지 — Render 타임아웃 방지)
  res.json({ 
    accepted: true, 
    job_id: jobId,
    message: 'Satellite collection started. Check /api/v1/satellite/latest for results.',
  });

  // 비동기 수집 (응답 후 백그라운드 실행)
  try {
    const asof = new Date(Date.now() + 9 * 3600000).toISOString().replace('T', ' ').slice(0, 19) + ' KST';
    
    // TODO: 실제 GEE 수집 로직 (Phase A-2에서 구현)
    // const s2 = await fetchVIIRS();
    // const r5 = await fetchSentinel1();
    // const r6 = await fetchLandsat9();
    
    satSnapshot.meta = {
      last_collect_asof: asof,
      last_success_asof: asof,
      last_run_id: jobId,
      status: 'COLLECTED',
    };

    console.log(`[Satellite] Collection ${jobId} completed at ${asof}`);
  } catch (e) {
    satSnapshot.meta.status = 'FAILED';
    satSnapshot.meta.last_collect_asof = new Date().toISOString();
    console.error(`[Satellite] Collection ${jobId} failed:`, e.message);
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
