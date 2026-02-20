'use strict';

/**
 * DIAH-7M Concurrency Utilities — 동시접속 + 장애 자동 복구
 * ═══════════════════════════════════════════════════════════
 *
 * 1) RequestCoalescer — 동일 키 중복 요청 결합 (thundering herd 방지)
 * 2) Semaphore — 동시 실행 제한 (외부 API 레이트리밋 보호)
 * 3) RateLimiter — 토큰 버킷 기반 호출 제한
 * 4) withTimeout — Promise 타임아웃 래퍼
 * 5) SingletonRefresh — Crumb 같은 싱글톤 토큰 갱신 보호
 * 6) CircuitBreaker — API 장애 자동감지 + 자동복구 (3-state FSM)
 * 7) HealthMonitor — 전체 API 소스 통합 건강 현황판
 */

// ── 1. RequestCoalescer ────────────────────────────────
// 동일 key로 동시 요청이 오면, 첫 번째만 실행하고 나머지는 같은 Promise 공유
// TSLA 50명 동시 → Yahoo 1회 호출, 50명 같은 결과

function RequestCoalescer() {
  this._pending = {};
}

RequestCoalescer.prototype.run = function(key, fn) {
  if (this._pending[key]) return this._pending[key];

  var self = this;
  this._pending[key] = fn().then(
    function(result) { delete self._pending[key]; return result; },
    function(err)    { delete self._pending[key]; throw err; }
  );
  return this._pending[key];
};

// ── 2. Semaphore ──────────────────────────────────────
// 동시 실행 N개로 제한. GEE 10개, Yahoo 5개 등.

function Semaphore(max) {
  this._max = max;
  this._running = 0;
  this._queue = [];
}

Semaphore.prototype.acquire = function() {
  var self = this;
  return new Promise(function(resolve) {
    if (self._running < self._max) {
      self._running++;
      resolve();
    } else {
      self._queue.push(resolve);
    }
  });
};

Semaphore.prototype.release = function() {
  if (this._queue.length > 0) {
    var next = this._queue.shift();
    next(); // _running stays the same (one exits, one enters)
  } else {
    this._running--;
  }
};

Semaphore.prototype.run = function(fn) {
  var self = this;
  return this.acquire().then(function() {
    return fn().then(
      function(r) { self.release(); return r; },
      function(e) { self.release(); throw e; }
    );
  });
};

// ── 3. RateLimiter (Token Bucket) ────────────────────
// 초당/분당 최대 N회 호출 제한

function RateLimiter(maxTokens, refillPerSec) {
  this._max = maxTokens;
  this._tokens = maxTokens;
  this._refillPerSec = refillPerSec;
  this._lastRefill = Date.now();
  this._queue = [];
}

RateLimiter.prototype._refill = function() {
  var now = Date.now();
  var elapsed = (now - this._lastRefill) / 1000;
  this._tokens = Math.min(this._max, this._tokens + elapsed * this._refillPerSec);
  this._lastRefill = now;
};

RateLimiter.prototype.acquire = function() {
  this._refill();
  var self = this;

  if (this._tokens >= 1) {
    this._tokens--;
    return Promise.resolve();
  }

  // 토큰 없으면 대기
  return new Promise(function(resolve) {
    self._queue.push(resolve);
  });
};

RateLimiter.prototype._drainQueue = function() {
  this._refill();
  while (this._queue.length > 0 && this._tokens >= 1) {
    this._tokens--;
    var next = this._queue.shift();
    next();
  }
};

// 주기적으로 큐 드레인 (100ms 간격)
RateLimiter.prototype.startDrain = function() {
  var self = this;
  this._drainTimer = setInterval(function() { self._drainQueue(); }, 100);
};

RateLimiter.prototype.stop = function() {
  if (this._drainTimer) clearInterval(this._drainTimer);
};

// ── 4. withTimeout ───────────────────────────────────
// Promise에 타임아웃 강제. GEE callback 무응답 방지.

function withTimeout(promise, ms, label) {
  return new Promise(function(resolve, reject) {
    var timer = setTimeout(function() {
      reject(new Error('Timeout: ' + (label || 'operation') + ' exceeded ' + ms + 'ms'));
    }, ms);

    promise.then(
      function(r) { clearTimeout(timer); resolve(r); },
      function(e) { clearTimeout(timer); reject(e); }
    );
  });
}

// ── 5. SingletonRefresh ──────────────────────────────
// Crumb 같은 싱글톤 토큰 갱신 시, 동시 1000명이 갱신 요청해도 1회만 실행

function SingletonRefresh() {
  this._refreshing = null;
}

SingletonRefresh.prototype.refresh = function(fn) {
  if (this._refreshing) return this._refreshing;

  var self = this;
  this._refreshing = fn().then(
    function(r) { self._refreshing = null; return r; },
    function(e) { self._refreshing = null; throw e; }
  );
  return this._refreshing;
};

// ── 6. CircuitBreaker (3-state FSM) ─────────────────
// CLOSED(정상) → OPEN(차단) → HALF_OPEN(시험) → CLOSED
//
// 설계 근거:
// - failThreshold=5: ECOS 월 1회 점검, Yahoo 간헐 429 → 5연속이면 실제 장애
// - resetTimeout=60s: Render free tier 90-120s deploy → 60s면 재배포 중 대기 충분
// - halfOpenMax=2: 시험 호출 2개 성공하면 완전 복구 (단일 성공은 fluke 가능)
// - successThreshold=2: 2연속 성공 → CLOSED 복귀
//
// 사용법:
//   var cb = new CircuitBreaker('ECOS', { failThreshold: 5, resetTimeout: 60000 });
//   var result = await cb.run(function() { return fetchECOS(params); });
//   // 장애시: CircuitBreakerOpen 에러 throw → 호출자가 캐시 fallback

var CB_STATE = { CLOSED: 'CLOSED', OPEN: 'OPEN', HALF_OPEN: 'HALF_OPEN' };

function CircuitBreaker(name, opts) {
  opts = opts || {};
  this.name = name;
  this.state = CB_STATE.CLOSED;
  this.failCount = 0;
  this.successCount = 0;
  this.failThreshold = opts.failThreshold || 5;
  this.successThreshold = opts.successThreshold || 2;
  this.resetTimeout = opts.resetTimeout || 60000; // 60초
  this.halfOpenMax = opts.halfOpenMax || 2;       // HALF_OPEN 동시 시험 수
  this._halfOpenRunning = 0;
  this._openedAt = 0;
  // ignoreStatus: HTTP 상태코드 배열 — 이 코드는 failure로 카운트하지 않음
  // 예: [429] → rate limit은 서버 장애가 아님
  this.ignoreStatus = opts.ignoreStatus || [];
  // Escalation: HALF_OPEN→OPEN 반복 = 자동복구 실패
  this._reopenCount = 0;                        // HALF_OPEN→OPEN 반복 횟수
  this.escalateThreshold = opts.escalateThreshold || 3; // 3회 반복 시 SMS 발송
  this._escalated = false;                       // 이미 알림 발송했는지 (중복 방지)
  this.onEscalate = opts.onEscalate || null;     // function(breakerName, stats)
  // 통계
  this.stats = {
    totalCalls: 0,
    totalSuccess: 0,
    totalFailures: 0,
    totalRejected: 0,   // OPEN 상태에서 거부된 호출
    totalReopens: 0,     // HALF_OPEN→OPEN 재진입 횟수
    escalated: false,    // SMS 발송 여부
    lastFailure: null,   // { time, error }
    lastSuccess: null,   // { time }
    lastStateChange: null,
    stateHistory: [],     // 최근 10개 상태 변경 이력
  };
}

CircuitBreaker.prototype._changeState = function(newState) {
  var prev = this.state;
  this.state = newState;
  var entry = { from: prev, to: newState, at: new Date().toISOString() };
  this.stats.lastStateChange = entry;
  this.stats.stateHistory.push(entry);
  if (this.stats.stateHistory.length > 10) this.stats.stateHistory.shift();
  console.log('[CB:' + this.name + '] ' + prev + ' → ' + newState);
};

CircuitBreaker.prototype._onSuccess = function() {
  this.stats.totalSuccess++;
  this.stats.lastSuccess = { time: new Date().toISOString() };

  if (this.state === CB_STATE.HALF_OPEN) {
    this._halfOpenRunning--;
    this.successCount++;
    if (this.successCount >= this.successThreshold) {
      this.failCount = 0;
      this.successCount = 0;
      this._reopenCount = 0;    // 복구 성공 → escalation 카운터 리셋
      this._escalated = false;
      this.stats.escalated = false;
      this._changeState(CB_STATE.CLOSED);
    }
  } else {
    // CLOSED 상태: 연속 실패 카운터 리셋
    this.failCount = 0;
  }
};

CircuitBreaker.prototype._onFailure = function(err) {
  this.stats.totalFailures++;
  this.stats.lastFailure = { time: new Date().toISOString(), error: String(err && err.message || err) };

  if (this.state === CB_STATE.HALF_OPEN) {
    this._halfOpenRunning--;
    // 시험 실패 → 다시 OPEN (자동복구 실패)
    this.successCount = 0;
    this._openedAt = Date.now();
    this._reopenCount++;
    this.stats.totalReopens++;
    this._changeState(CB_STATE.OPEN);

    // Escalation: 3회 반복 복구 실패 → SMS 발송
    if (this._reopenCount >= this.escalateThreshold && !this._escalated) {
      this._escalated = true;
      this.stats.escalated = true;
      console.error('[CB:' + this.name + '] ESCALATE — 자동복구 ' + this._reopenCount + '회 실패, SMS 발송');
      if (typeof this.onEscalate === 'function') {
        try { this.onEscalate(this.name, this.getStatus()); } catch(e) {
          console.error('[CB:' + this.name + '] onEscalate error:', e.message);
        }
      }
    }
  } else if (this.state === CB_STATE.CLOSED) {
    this.failCount++;
    if (this.failCount >= this.failThreshold) {
      this._openedAt = Date.now();
      this._changeState(CB_STATE.OPEN);
    }
  }
};

CircuitBreaker.prototype.run = function(fn) {
  this.stats.totalCalls++;
  var self = this;

  // OPEN 상태: resetTimeout 경과 확인
  if (this.state === CB_STATE.OPEN) {
    if (Date.now() - this._openedAt >= this.resetTimeout) {
      this._changeState(CB_STATE.HALF_OPEN);
      this.successCount = 0;
      this._halfOpenRunning = 0;
    } else {
      this.stats.totalRejected++;
      return Promise.reject(new Error('[CB:' + this.name + '] OPEN — 호출 차단 (남은 대기: ' +
        Math.round((this.resetTimeout - (Date.now() - this._openedAt)) / 1000) + '초)'));
    }
  }

  // HALF_OPEN 상태: 동시 시험 수 초과 → 거부
  if (this.state === CB_STATE.HALF_OPEN && this._halfOpenRunning >= this.halfOpenMax) {
    this.stats.totalRejected++;
    return Promise.reject(new Error('[CB:' + this.name + '] HALF_OPEN — 시험 중 추가 호출 차단'));
  }

  if (this.state === CB_STATE.HALF_OPEN) {
    this._halfOpenRunning++;
  }

  return fn().then(
    function(r) { self._onSuccess(); return r; },
    function(e) {
      // ignoreStatus 코드는 failure 카운트 없이 그냥 throw
      var status = e && e.response && e.response.status;
      if (status && self.ignoreStatus.indexOf(status) >= 0) {
        throw e; // CB failure 카운트 없이 통과
      }
      self._onFailure(e); throw e;
    }
  );
};

CircuitBreaker.prototype.getStatus = function() {
  return {
    name: this.name,
    state: this.state,
    failCount: this.failCount,
    reopenCount: this._reopenCount,
    escalated: this._escalated,
    stats: this.stats,
  };
};

// 수동 리셋 (관리자 API용)
CircuitBreaker.prototype.reset = function() {
  this.failCount = 0;
  this.successCount = 0;
  this._halfOpenRunning = 0;
  this._changeState(CB_STATE.CLOSED);
};

// ── 7. HealthMonitor — 전체 API 소스 통합 건강판 ────
// 모든 CircuitBreaker를 등록하고 통합 상태를 제공
//
// 사용법:
//   var monitor = new HealthMonitor();
//   monitor.register('ECOS', ecosCB);
//   monitor.register('YAHOO', yahooCB);
//   var status = monitor.getStatus(); // 전체 현황
//   var alerts = monitor.getAlerts(); // 경보만

function HealthMonitor() {
  this._breakers = {};
}

HealthMonitor.prototype.register = function(name, breaker) {
  this._breakers[name] = breaker;
};

HealthMonitor.prototype.getStatus = function() {
  var sources = {};
  var names = Object.keys(this._breakers);
  var healthy = 0;
  var degraded = 0;
  var down = 0;

  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var status = this._breakers[name].getStatus();
    sources[name] = status;
    if (status.state === CB_STATE.CLOSED) healthy++;
    else if (status.state === CB_STATE.HALF_OPEN) degraded++;
    else down++;
  }

  var overall = down > 0 ? 'DEGRADED' : (degraded > 0 ? 'RECOVERING' : 'HEALTHY');
  // 전체 API 중 50% 이상 down이면 CRITICAL
  if (names.length > 0 && down / names.length >= 0.5) overall = 'CRITICAL';

  return {
    overall: overall,
    summary: { total: names.length, healthy: healthy, degraded: degraded, down: down },
    sources: sources,
    checkedAt: new Date().toISOString(),
  };
};

HealthMonitor.prototype.getAlerts = function() {
  var alerts = [];
  var names = Object.keys(this._breakers);
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var status = this._breakers[name].getStatus();
    if (status.state !== CB_STATE.CLOSED) {
      alerts.push({
        source: name,
        state: status.state,
        failCount: status.failCount,
        lastFailure: status.stats.lastFailure,
        lastSuccess: status.stats.lastSuccess,
      });
    }
  }
  return alerts;
};

// 전체 수동 리셋 (비상용)
HealthMonitor.prototype.resetAll = function() {
  var names = Object.keys(this._breakers);
  for (var i = 0; i < names.length; i++) {
    this._breakers[names[i]].reset();
  }
};

// 글로벌 싱글톤 HealthMonitor
var _globalMonitor = new HealthMonitor();

// ── Exports ──────────────────────────────────────────

module.exports = {
  RequestCoalescer: RequestCoalescer,
  Semaphore: Semaphore,
  RateLimiter: RateLimiter,
  withTimeout: withTimeout,
  SingletonRefresh: SingletonRefresh,
  CircuitBreaker: CircuitBreaker,
  HealthMonitor: HealthMonitor,
  globalMonitor: _globalMonitor,
};
