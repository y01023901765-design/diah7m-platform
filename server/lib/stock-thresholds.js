'use strict';

/**
 * DIAH-7M Stock Thresholds — 주식 엔진 게이지 정의
 * ═══════════════════════════════════════════════════
 * score-engine.js V2와 동일한 threshold 형식:
 *   dir: higher_better | lower_better | neutral
 *   good: [lo, hi], warn: [lo, hi] — 범위 배열
 *   Score mapping: 양호=85, 주의=50, 경보=15
 *
 * 5축 × 15게이지 + 6종 Archetype 가중치
 */

// ── 5축 정의 ──────────────────────────────────────

var STOCK_AXES = {
  SV: {
    id: 'SV',
    name: { en: 'Valuation', ko: '밸류에이션' },
    icon: '💰',
    gauges: ['SG_V1', 'SG_V2', 'SG_V3', 'SG_V4'],
  },
  SG: {
    id: 'SG',
    name: { en: 'Growth', ko: '성장성' },
    icon: '📈',
    gauges: ['SG_G1', 'SG_G2', 'SG_G3'],
  },
  SQ: {
    id: 'SQ',
    name: { en: 'Quality', ko: '재무건전성' },
    icon: '🏗️',
    gauges: ['SG_Q1', 'SG_Q2', 'SG_Q3'],
  },
  SM: {
    id: 'SM',
    name: { en: 'Momentum', ko: '모멘텀' },
    icon: '⚡',
    gauges: ['SG_M1', 'SG_M2', 'SG_M3'],
  },
  SS: {
    id: 'SS',
    name: { en: 'Satellite', ko: '위성물리' },
    icon: '🛰️',
    gauges: ['SG_S1', 'SG_S2'],
  },
};

// ── 15게이지 임계값 ────────────────────────────────
// score-engine.js gradeGauge()와 동일 계약:
//   good: [lo, hi] 범위 안 → 85점
//   warn: [lo, hi] 범위 안 → 50점
//   그 밖 → 15점

var STOCK_GAUGE_THRESHOLDS = {
  // ── SV: 밸류에이션 ──
  SG_V1: { // PER (배)
    dir: 'lower_better',
    good: [0, 20],
    warn: [0, 35],
    alarm: [0, 500],
  },
  SG_V2: { // PBR (배)
    dir: 'lower_better',
    good: [0, 3],
    warn: [0, 6],
    alarm: [0, 100],
  },
  SG_V3: { // EV/EBITDA (배)
    dir: 'lower_better',
    good: [0, 12],
    warn: [0, 20],
    alarm: [0, 200],
  },
  SG_V4: { // 배당수익률 (%)
    dir: 'higher_better',
    good: [2.5, 100],
    warn: [1, 100],
  },

  // ── SG: 성장성 ──
  SG_G1: { // 매출성장률 YoY (%)
    dir: 'higher_better',
    good: [10, 500],
    warn: [0, 500],
  },
  SG_G2: { // 순이익성장률 YoY (%) ★CRITICAL
    dir: 'higher_better',
    good: [15, 1000],
    warn: [0, 1000],
  },
  SG_G3: { // 영업이익률 추세 (bps, + = 개선)
    dir: 'higher_better',
    good: [0, 5000],
    warn: [-200, 5000],
  },

  // ── SQ: 재무건전성 ──
  SG_Q1: { // ROE (%) ★CRITICAL
    dir: 'higher_better',
    good: [15, 200],
    warn: [8, 200],
  },
  SG_Q2: { // 부채비율 (%)
    dir: 'lower_better',
    good: [0, 80],
    warn: [0, 150],
    alarm: [0, 1000],
  },
  SG_Q3: { // FCF 마진 (%)
    dir: 'higher_better',
    good: [10, 200],
    warn: [0, 200],
  },

  // ── SM: 모멘텀 ──
  SG_M1: { // RSI 14일 (0~100, 30~70 정상)
    dir: 'neutral',
    good: [30, 70],
    warn: [20, 80],
  },
  SG_M2: { // 52주 상대강도 (%, 0~100)
    dir: 'higher_better',
    good: [40, 100],
    warn: [20, 100],
  },
  SG_M3: { // 거래량 추세 (20d avg / 60d avg, %)
    dir: 'neutral',
    good: [80, 150],
    warn: [50, 200],
  },

  // ── SS: 위성물리 ──
  SG_S1: { // NTL 야간광 이상률 (%, 기준선 대비) ★CRITICAL
    dir: 'higher_better',
    good: [-5, 200],
    warn: [-15, 200],
  },
  SG_S2: { // 열적외선 이상 (°C, 기준선 대비)
    dir: 'neutral',
    good: [-3, 5],
    warn: [-8, 8],
  },
};

// ── CRITICAL 게이지 (2배 가중) ──────────────────────

var STOCK_CRITICAL_GAUGE_IDS = ['SG_G2', 'SG_Q1', 'SG_S1'];

// ── 6종 Archetype 가중치 (severity 계산용) ─────────
// physical: 위성물리 점수 가중치
// market: 모멘텀/시장 점수 가중치
// quality: 재무건전성 점수 가중치
// growth: 성장성 점수 가중치
// valuation: 밸류에이션 점수 가중치

var ARCHETYPE_WEIGHTS = {
  A: { physical: 0.50, market: 0.20, quality: 0.10, growth: 0.10, valuation: 0.10 }, // 변환 (제조)
  B: { physical: 0.35, market: 0.25, quality: 0.10, growth: 0.15, valuation: 0.15 }, // 이동 (물류)
  C: { physical: 0.30, market: 0.25, quality: 0.15, growth: 0.15, valuation: 0.15 }, // 분배 (유통)
  D: { physical: 0.30, market: 0.25, quality: 0.10, growth: 0.20, valuation: 0.15 }, // 처리 (데이터센터)
  E: { physical: 0.55, market: 0.15, quality: 0.15, growth: 0.10, valuation: 0.05 }, // 현장 (건설)
  F: { physical: 0.45, market: 0.20, quality: 0.10, growth: 0.10, valuation: 0.15 }, // 추출 (자원)
};

// ── 축 ↔ severity 차원 매핑 ────────────────────────
// severity 계산 시 5축 점수를 archetype 가중치 차원에 매핑

var AXIS_TO_SEVERITY_DIM = {
  SS: 'physical',
  SM: 'market',
  SQ: 'quality',
  SG: 'growth',
  SV: 'valuation',
};

module.exports = {
  STOCK_AXES: STOCK_AXES,
  STOCK_GAUGE_THRESHOLDS: STOCK_GAUGE_THRESHOLDS,
  STOCK_CRITICAL_GAUGE_IDS: STOCK_CRITICAL_GAUGE_IDS,
  ARCHETYPE_WEIGHTS: ARCHETYPE_WEIGHTS,
  AXIS_TO_SEVERITY_DIM: AXIS_TO_SEVERITY_DIM,
};
