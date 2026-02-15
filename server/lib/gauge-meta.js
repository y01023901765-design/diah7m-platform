/**
 * DIAH-7M Gauge Meta — 59 게이지 판정 메타 SSOT
 * ═══════════════════════════════════════════════════
 * 
 * polarity: HIGH_BAD | LOW_BAD | BAND_BAD
 * thresholds.mode: RANGE (구간 포함 판정)
 * 
 * severity()는 polarity를 보지 않고, 구간만 본다.
 * 역방향/밴드 문제는 "구간 정의"에서 해결.
 *
 * v1 원칙: 절대기준 가능 → 절대값, 아니면 → 분위수 추정
 */

'use strict';

const THRESHOLDS_VERSION = '2026-02-v1';

// ── 구간 헬퍼 ──
// { min: 포함, max: 미포함(half-open) }
// null = 무한

const GAUGE_META = {

  // ═══ AX1: 순환계 (Financial Flow) ═══
  I1: { id:'I1', name:'기준금리', unit:'%', polarity:'BAND_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:1.5, max:3.5 }, warn:{ min:3.5, max:5.0 }, danger:{ min:5.0, max:null },
      warn_low:{ min:0.5, max:1.5 }, danger_low:{ min:null, max:0.5 } }},
  I2: { id:'I2', name:'경상수지(상품)', unit:'억$', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:20, max:null }, warn:{ min:0, max:20 }, danger:{ min:null, max:0 } }},
  I3: { id:'I3', name:'외환보유고', unit:'억$', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:400, max:null }, warn:{ min:350, max:400 }, danger:{ min:null, max:350 } }},
  I4: { id:'I4', name:'환율(원/달러)', unit:'원/$', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:1050, max:1300 }, warn:{ min:1300, max:1450 }, danger:{ min:1450, max:null },
      warn_low:{ min:950, max:1050 }, danger_low:{ min:null, max:950 } }},
  I5: { id:'I5', name:'본원통화', unit:'십억원', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:150000, max:220000 }, warn:{ min:220000, max:260000 }, danger:{ min:260000, max:null } }},
  I6: { id:'I6', name:'정부대출금금리', unit:'%', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:4.0 }, warn:{ min:4.0, max:6.0 }, danger:{ min:6.0, max:null } }},

  // ═══ AX2: 호흡계 (Trade/Export) ═══
  E1: { id:'E1', name:'수출', unit:'백만$', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:50000, max:null }, warn:{ min:40000, max:50000 }, danger:{ min:null, max:40000 } }},
  E2: { id:'E2', name:'수입', unit:'백만$', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:55000 }, warn:{ min:55000, max:65000 }, danger:{ min:65000, max:null } }},
  E3: { id:'E3', name:'무역수지', unit:'백만$', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:2000, max:null }, warn:{ min:0, max:2000 }, danger:{ min:null, max:0 } }},
  E4: { id:'E4', name:'수출금액지수', unit:'2020=100', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:100, max:null }, warn:{ min:85, max:100 }, danger:{ min:null, max:85 } }},
  E5: { id:'E5', name:'수입금액지수', unit:'2020=100', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:115 }, warn:{ min:115, max:135 }, danger:{ min:135, max:null } }},
  E6: { id:'E6', name:'수출증가율', unit:'%', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:5, max:null }, warn:{ min:-5, max:5 }, danger:{ min:null, max:-5 } }},

  // ═══ AX3: 소화계 (Consumption/Domestic) ═══
  C1: { id:'C1', name:'서비스업생산', unit:'2020=100', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:100, max:null }, warn:{ min:90, max:100 }, danger:{ min:null, max:90 } }},
  C2: { id:'C2', name:'소매판매액지수', unit:'2020=100', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:100, max:null }, warn:{ min:90, max:100 }, danger:{ min:null, max:90 } }},
  C3: { id:'C3', name:'소비자심리지수', unit:'pt', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:100, max:null }, warn:{ min:85, max:100 }, danger:{ min:null, max:85 } }},
  C4: { id:'C4', name:'카드승인액', unit:'십억원', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:80000, max:null }, warn:{ min:65000, max:80000 }, danger:{ min:null, max:65000 } }},
  C5: { id:'C5', name:'대형마트판매액지수', unit:'2020=100', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:95, max:null }, warn:{ min:80, max:95 }, danger:{ min:null, max:80 } }},
  C6: { id:'C6', name:'백화점판매액지수', unit:'2020=100', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:100, max:null }, warn:{ min:85, max:100 }, danger:{ min:null, max:85 } }},

  // ═══ AX4: 근골격계 (Production/Industry) ═══
  M1: { id:'M1', name:'산업생산지수', unit:'2020=100', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:100, max:null }, warn:{ min:90, max:100 }, danger:{ min:null, max:90 } }},
  M2_G: { id:'M2_G', name:'GDP성장률', unit:'%', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:2.0, max:null }, warn:{ min:0, max:2.0 }, danger:{ min:null, max:0 } }},
  M3_G: { id:'M3_G', name:'GNI증가율', unit:'%', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:2.0, max:null }, warn:{ min:0, max:2.0 }, danger:{ min:null, max:0 } }},

  // ═══ AX5: 신경계 (Sentiment/Leading) ═══
  S1: { id:'S1', name:'BSI(전산업)', unit:'pt', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:100, max:null }, warn:{ min:80, max:100 }, danger:{ min:null, max:80 } }},
  S2: { id:'S2', name:'야간광(VIIRS)', unit:'nW/cm²/sr', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:30, max:null }, warn:{ min:20, max:30 }, danger:{ min:null, max:20 } }},
  S3: { id:'S3', name:'경기선행지수', unit:'2020=100', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:100, max:null }, warn:{ min:95, max:100 }, danger:{ min:null, max:95 } }},
  S4: { id:'S4', name:'경기동행지수', unit:'2020=100', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:100, max:null }, warn:{ min:95, max:100 }, danger:{ min:null, max:95 } }},
  S5: { id:'S5', name:'OECD선행지수', unit:'pt', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:100, max:null }, warn:{ min:98, max:100 }, danger:{ min:null, max:98 } }},
  S6: { id:'S6', name:'경제심리지수', unit:'pt', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:100, max:null }, warn:{ min:85, max:100 }, danger:{ min:null, max:85 } }},

  // ═══ AX6: 면역계 (Price/Inflation) ═══
  P1: { id:'P1', name:'CPI(소비자물가)', unit:'%YoY', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:2.5 }, warn:{ min:2.5, max:4.0 }, danger:{ min:4.0, max:null },
      warn_low:{ min:-0.5, max:0 }, danger_low:{ min:null, max:-0.5 } }},
  P2: { id:'P2', name:'PPI(생산자물가)', unit:'%YoY', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:3.0 }, warn:{ min:3.0, max:6.0 }, danger:{ min:6.0, max:null } }},
  P3: { id:'P3', name:'국세수입', unit:'십억원', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:25000, max:null }, warn:{ min:20000, max:25000 }, danger:{ min:null, max:20000 } }},
  P4: { id:'P4', name:'국가채무비율', unit:'%GDP', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:45 }, warn:{ min:45, max:55 }, danger:{ min:55, max:null } }},
  P5: { id:'P5', name:'재정수지', unit:'십억원', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:0, max:null }, warn:{ min:-15000, max:0 }, danger:{ min:null, max:-15000 } }},
  P6: { id:'P6', name:'근원물가', unit:'%YoY', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:2.5 }, warn:{ min:2.5, max:4.0 }, danger:{ min:4.0, max:null } }},

  // ═══ AX7: 피부계 (Real Estate/Construction) ═══
  D1: { id:'D1', name:'주택가격지수', unit:'2021.06=100', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:95, max:105 }, warn:{ min:105, max:115 }, danger:{ min:115, max:null },
      warn_low:{ min:85, max:95 }, danger_low:{ min:null, max:85 } }},
  D2: { id:'D2', name:'건설수주', unit:'십억원', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:10000, max:null }, warn:{ min:7000, max:10000 }, danger:{ min:null, max:7000 } }},
  D3: { id:'D3', name:'주택거래량', unit:'건', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:50000, max:null }, warn:{ min:30000, max:50000 }, danger:{ min:null, max:30000 } }},

  // ═══ AX8: 배설계 (Labor/Employment) ═══
  L1: { id:'L1', name:'고용률', unit:'%', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:62, max:null }, warn:{ min:58, max:62 }, danger:{ min:null, max:58 } }},
  L2: { id:'L2', name:'실업률', unit:'%', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:3.5 }, warn:{ min:3.5, max:5.0 }, danger:{ min:5.0, max:null } }},
  L3: { id:'L3', name:'경활참가율', unit:'%', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:64, max:null }, warn:{ min:61, max:64 }, danger:{ min:null, max:61 } }},
  L4: { id:'L4', name:'취업자증감', unit:'만명', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:20, max:null }, warn:{ min:0, max:20 }, danger:{ min:null, max:0 } }},

  // ═══ AX9: 순환2 (Financial Markets/Stock) ═══
  F1: { id:'F1', name:'KOSPI', unit:'pt', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:2500, max:null }, warn:{ min:2200, max:2500 }, danger:{ min:null, max:2200 } }},
  F2: { id:'F2', name:'국고채3년', unit:'%', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:3.5 }, warn:{ min:3.5, max:5.0 }, danger:{ min:5.0, max:null } }},
  F3: { id:'F3', name:'KOSPI시총', unit:'조원', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:2000, max:null }, warn:{ min:1700, max:2000 }, danger:{ min:null, max:1700 } }},
  F4: { id:'F4', name:'VKOSPI', unit:'pt', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:20 }, warn:{ min:20, max:30 }, danger:{ min:30, max:null } }},
  F5: { id:'F5', name:'CD금리(91일)', unit:'%', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:3.5 }, warn:{ min:3.5, max:5.0 }, danger:{ min:5.0, max:null } }},
  F6: { id:'F6', name:'사채금리', unit:'%', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:12 }, warn:{ min:12, max:18 }, danger:{ min:18, max:null } }},
  F7: { id:'F7', name:'KOSDAQ', unit:'pt', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:750, max:null }, warn:{ min:600, max:750 }, danger:{ min:null, max:600 } }},

  // ═══ 인프라·환경 ═══
  G1: { id:'G1', name:'운송수지', unit:'백만$', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:0, max:null }, warn:{ min:-2000, max:0 }, danger:{ min:null, max:-2000 } }},
  G6: { id:'G6', name:'PM2.5(대기질)', unit:'㎍/m³', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:35 }, warn:{ min:35, max:75 }, danger:{ min:75, max:null } }},

  // ═══ 종합·후행 ═══
  O1: { id:'O1', name:'인구증가율', unit:'%', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:0.5, max:null }, warn:{ min:0, max:0.5 }, danger:{ min:null, max:0 } }},
  O2: { id:'O2', name:'제조업출하지수(PMI대리)', unit:'2020=100', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:100, max:null }, warn:{ min:90, max:100 }, danger:{ min:null, max:90 } }},
  O3: { id:'O3', name:'생산가능인구비율', unit:'%', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:70, max:null }, warn:{ min:65, max:70 }, danger:{ min:null, max:65 } }},
  O4: { id:'O4', name:'노년부양비', unit:'%', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:25 }, warn:{ min:25, max:35 }, danger:{ min:35, max:null } }},
  O5: { id:'O5', name:'합계출산율', unit:'명', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:1.5, max:null }, warn:{ min:1.0, max:1.5 }, danger:{ min:null, max:1.0 } }},
  O6: { id:'O6', name:'조출생률', unit:'‰', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:8, max:null }, warn:{ min:5, max:8 }, danger:{ min:null, max:5 } }},
  R1: { id:'R1', name:'후행종합지수', unit:'2020=100', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:100, max:null }, warn:{ min:95, max:100 }, danger:{ min:null, max:95 } }},
  R2: { id:'R2', name:'경상수지(계절조정)', unit:'백만$', polarity:'LOW_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:3000, max:null }, warn:{ min:0, max:3000 }, danger:{ min:null, max:0 } }},

  // ═══ 위성 (잔여) ═══
  R5: { id:'R5', name:'해수면상승', unit:'mm/yr', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:3.0 }, warn:{ min:3.0, max:5.0 }, danger:{ min:5.0, max:null } }},
  R6: { id:'R6', name:'도시열섬(서울)', unit:'°C', polarity:'HIGH_BAD',
    thresholds:{ mode:'RANGE',
      good:{ min:null, max:2.0 }, warn:{ min:2.0, max:4.0 }, danger:{ min:4.0, max:null } }},
};

module.exports = { GAUGE_META, THRESHOLDS_VERSION };

// ── Delta 설정 추가 (급변 민감 게이지) ──
// enabled: false = 구조만 고정, 데이터 쌓이면 true로 전환
const DELTA_CONFIG = {
  I1: { enabled: false, metric: 'MoM', warn_abs: 15, danger_abs: 30 },  // 기준금리 급변
  I4: { enabled: false, metric: 'WoW', warn_abs: 3, danger_abs: 5 },    // 환율 급변
  F1: { enabled: false, metric: 'WoW', warn_abs: 5, danger_abs: 10 },   // KOSPI 급락
  F4: { enabled: false, metric: 'WoW', warn_abs: 20, danger_abs: 40 },  // VIX 급등
  F7: { enabled: false, metric: 'WoW', warn_abs: 5, danger_abs: 10 },   // KOSDAQ 급락
  P1: { enabled: false, metric: 'MoM', warn_abs: 20, danger_abs: 40 },  // CPI 급등
  E1: { enabled: false, metric: 'MoM', warn_abs: 10, danger_abs: 20 },  // 수출 급변
  E6: { enabled: false, metric: 'MoM', warn_abs: 30, danger_abs: 50 },  // 수출증가율 급변
  L2: { enabled: false, metric: 'MoM', warn_abs: 15, danger_abs: 30 },  // 실업률 급변
  D1: { enabled: false, metric: 'MoM', warn_abs: 3, danger_abs: 5 },    // 주택가격 급변
  S2: { enabled: false, metric: 'MoM', warn_abs: 10, danger_abs: 20 },  // 야간광 급변
};

// gauge-meta에 delta 병합
for (const [id, delta] of Object.entries(DELTA_CONFIG)) {
  if (GAUGE_META[id]) GAUGE_META[id].delta = delta;
}
