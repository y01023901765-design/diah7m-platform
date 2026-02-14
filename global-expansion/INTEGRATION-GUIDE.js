/**
 * DIAH-7M Global Integration
 * ═══════════════════════════════════════════
 * 
 * 기존 server.js에 글로벌 API 추가하는 방법
 * 
 * 이 파일의 내용을 server.js에 추가하면:
 *   /api/v1/global/countries      → 43개국 목록
 *   /api/v1/global/country/:iso3  → 국가별 20게이지
 *   /api/v1/global/overview       → 전체 글로벌 오버뷰
 *   /api/v1/global/commodities    → 원자재/VIX/DXY
 *   /api/v1/global/compare/:list  → 국가 비교
 *   /api/v1/global/refresh        → 전체 갱신 (관리자)
 */

'use strict';

// ═══════════════════════════════════════════
// server.js에 추가할 코드
// ═══════════════════════════════════════════

/*
  기존 server.js의 require 섹션에 추가:
  
  const { createGlobalRouter } = require('./lib/global-pipeline');
  
  기존 라우트 마운트 섹션에 추가:
  
  app.use('/api/v1/global', createGlobalRouter(express));
  
  끝! 이것만으로 6개 글로벌 엔드포인트가 활성화됩니다.
*/


// ═══════════════════════════════════════════
// server.js 수정 예시 (병합 가이드)
// ═══════════════════════════════════════════

/*
  === 기존 코드 (변경 없음) ===
  
  const express = require('express');
  const app = express();
  const pipeline = require('./lib/data-pipeline');   // 한국 ECOS
  
  === 추가할 코드 (1줄) ===
  
  const { createGlobalRouter } = require('./lib/global-pipeline');  // 글로벌 43개국
  
  === 기존 라우트 (변경 없음) ===
  
  app.use('/api/v1/data', dataRouter);       // 한국 59게이지
  app.use('/api/v1/auth', authRouter);       // 인증
  
  === 추가할 코드 (1줄) ===
  
  app.use('/api/v1/global', createGlobalRouter(express));  // 글로벌 43개국
  
  === 기존 서버 시작 (변경 없음) ===
  
  app.listen(PORT, () => { ... });
*/


// ═══════════════════════════════════════════
// 파일 배치 구조
// ═══════════════════════════════════════════

/*
  server/
  ├── server.js                    ← 기존 (수정: 2줄 추가)
  ├── lib/
  │   ├── data-pipeline.js         ← 기존 (한국 ECOS 59게이지)
  │   ├── country-profiles.js      ← 신규 (43개국 정의)
  │   ├── global-indicators.js     ← 신규 (20게이지 매핑)
  │   └── global-pipeline.js       ← 신규 (WB/OECD/IMF 커넥터)
  ├── .env
  │   └── (기존 + FRED_API_KEY 추가)
  └── test/
      └── test-global.js           ← 신규 (관통 테스트)
*/


// ═══════════════════════════════════════════
// .env 추가 항목
// ═══════════════════════════════════════════

/*
  # 기존
  ECOS_API_KEY=...
  
  # 추가 (선택 — 원자재 데이터용)
  FRED_API_KEY=...
  
  # World Bank, OECD, IMF는 API 키 불필요
*/


// ═══════════════════════════════════════════
// API 엔드포인트 상세
// ═══════════════════════════════════════════

/*
  1. GET /api/v1/global/countries
     → 43개국 목록 (코드, 이름, 지역, 티어, 통화)
     → 인증 불필요
     → 응답 예시:
     {
       "total": 43,
       "countries": [
         { "code": "USA", "name": { "en": "United States", "ko": "미국" }, 
           "region": "north_america", "tier": "deep_ready", ... },
         ...
       ]
     }

  2. GET /api/v1/global/country/USA
     → 미국의 20게이지 데이터
     → World Bank + OECD 자동 선택
     → 응답 예시:
     {
       "country": "USA",
       "tier": "deep_ready",
       "gauges": {
         "G_D1": { "name": "GDP Growth", "value": 2.5, "date": "2024", ... },
         "G_P1": { "name": "CPI Inflation", "value": 3.2, "date": "2024-11", ... },
         ...
       },
       "coverageRate": "85%"
     }

  3. GET /api/v1/global/overview
     → 42개국 전체 오버뷰 (6시간 캐시)
     → 글로벌 경제 건강 지도용

  4. GET /api/v1/global/commodities
     → WTI, Brent, Gold, Copper, VIX, DXY 등

  5. GET /api/v1/global/compare/KOR;USA;JPN
     → 최대 5개국 비교

  6. POST /api/v1/global/refresh
     → 전체 데이터 갱신 (관리자 전용, 2-5분 소요)
*/

module.exports = {};
