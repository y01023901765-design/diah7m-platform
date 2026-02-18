/**
 * DIAH-7M HTTP Response Utilities
 * 
 * GPT 피드백 반영:
 * - 표준 응답 포맷 (success/data/meta)
 * - demo/stale/degraded 플래그
 * - 404 금지 원칙
 */

/**
 * 성공 응답 (200 OK)
 */
function ok(res, data, meta = {}) {
  return res.status(200).json({
    success: true,
    data,
    ...meta, // demo, stale, degraded, warnings, cached 등
  });
}

/**
 * 실패 응답 (4xx/5xx)
 */
function fail(res, status, code, message, detail = null) {
  return res.status(status).json({
    success: false,
    code,
    message,
    detail,
  });
}

module.exports = { ok, fail };
