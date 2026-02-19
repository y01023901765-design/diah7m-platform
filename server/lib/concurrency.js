'use strict';

/**
 * DIAH-7M Concurrency Utilities — 1000명 동시접속 대비
 * ═══════════════════════════════════════════════════════
 *
 * 1) RequestCoalescer — 동일 키 중복 요청 결합 (thundering herd 방지)
 * 2) Semaphore — 동시 실행 제한 (외부 API 레이트리밋 보호)
 * 3) RateLimiter — 토큰 버킷 기반 호출 제한
 * 4) withTimeout — Promise 타임아웃 래퍼
 * 5) SingletonRefresh — Crumb 같은 싱글톤 토큰 갱신 보호
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

// ── Exports ──────────────────────────────────────────

module.exports = {
  RequestCoalescer: RequestCoalescer,
  Semaphore: Semaphore,
  RateLimiter: RateLimiter,
  withTimeout: withTimeout,
  SingletonRefresh: SingletonRefresh,
};
