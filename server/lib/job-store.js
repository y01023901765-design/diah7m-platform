/**
 * DIAH-7M Job Store
 * 
 * 백그라운드 작업 관리 (Render 30초 timeout 대응)
 * - 비동기 작업을 job으로 등록
 * - 진행률 추적
 * - 폴링으로 상태 확인
 */

const jobs = new Map();

/**
 * 새 작업 생성
 * @param {Function} fn - 실행할 비동기 함수 (progress 콜백 받음)
 * @returns {Object} job 정보
 */
function createJob(fn) {
  const id = `job_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const job = {
    id,
    status: 'running',
    startedAt: Date.now(),
    progress: 0,
    summary: null,
    error: null,
    finishedAt: null,
  };
  
  jobs.set(id, job);
  
  // 백그라운드 실행
  (async () => {
    try {
      const result = await fn((p) => { job.progress = p; });
      job.status = 'done';
      job.summary = result.summary || result;
      job.finishedAt = Date.now();
    } catch (e) {
      job.status = 'error';
      job.error = e.message;
      job.finishedAt = Date.now();
    }
  })();
  
  return job;
}

/**
 * 작업 상태 조회
 * @param {string} id - Job ID
 * @returns {Object|null} job 정보
 */
function getJob(id) {
  return jobs.get(id);
}

/**
 * 완료된 작업 정리 (1시간 이상 지난 것)
 */
function cleanupOldJobs() {
  const oneHourAgo = Date.now() - 3600 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.finishedAt && job.finishedAt < oneHourAgo) {
      jobs.delete(id);
    }
  }
}

// 1시간마다 자동 정리
setInterval(cleanupOldJobs, 3600 * 1000);

module.exports = {
  createJob,
  getJob,
  cleanupOldJobs,
};
