/**
 * DIAH-7M Stock Profiles — 100종목 / 6 Archetype / 21개국
 *
 * 선정 기준: 위성 직접성 × 시장 관심 × 무료 데이터
 * 롤아웃: Killer 10 → Sector 40 → Global 50
 *
 * Archetype:
 *   A: MANUFACTURING (변환형) — 원자재→제품, NO₂+열+야간광
 *   B: LOGISTICS (이동형)     — 출발→도착, AIS+SAR
 *   C: DISTRIBUTION (분배형)  — 창고→고객, 야간광+SAR+광학
 *   D: PROCESSING (처리형)    — 데이터→결과, 열+야간광
 *   E: SITE_BASED (현장형)    — 자재→구조물, SAR+광학
 *   F: EXTRACTION (추출형)    — 지하→원자재, SAR+광학+NO₂
 */

const ARCHETYPES = {
  A: {
    id: 'MANUFACTURING', name: '변환형', nameEn: 'Manufacturing',
    essence: '원자재→제품', dualLock: '입고+출고 막힘',
    sensors: ['VIIRS', 'S5P_NO2', 'MODIS_LST'],
    gaugeMap: ['nightlight_intensity', 'no2_concentration', 'surface_temperature'],
    onsetDays: 14,
  },
  B: {
    id: 'LOGISTICS', name: '이동형', nameEn: 'Logistics',
    essence: '출발→도착', dualLock: '출발+도착 막힘',
    sensors: ['AIS', 'S1_SAR'],
    gaugeMap: ['vessel_count', 'port_activity', 'sar_change'],
    onsetDays: 7,
  },
  C: {
    id: 'DISTRIBUTION', name: '분배형', nameEn: 'Distribution',
    essence: '창고→고객', dualLock: '입고+판매 막힘',
    sensors: ['VIIRS', 'S1_SAR', 'S2_OPTICAL'],
    gaugeMap: ['nightlight_intensity', 'parking_density', 'sar_change'],
    onsetDays: 10,
  },
  D: {
    id: 'PROCESSING', name: '처리형', nameEn: 'Processing',
    essence: '데이터→결과', dualLock: '전력+트래픽 감소',
    sensors: ['MODIS_LST', 'VIIRS'],
    gaugeMap: ['surface_temperature', 'nightlight_intensity'],
    onsetDays: 3,
  },
  E: {
    id: 'SITE_BASED', name: '현장형', nameEn: 'Site-Based',
    essence: '자재→구조물', dualLock: '자재+인력 감소',
    sensors: ['S1_SAR', 'S2_OPTICAL'],
    gaugeMap: ['sar_change', 'ndvi_change', 'construction_progress'],
    onsetDays: 30,
  },
  F: {
    id: 'EXTRACTION', name: '추출형', nameEn: 'Extraction',
    essence: '지하→원자재', dualLock: '장비+운송 감소',
    sensors: ['S1_SAR', 'S2_OPTICAL', 'S5P_NO2'],
    gaugeMap: ['sar_change', 'pit_expansion', 'no2_concentration'],
    onsetDays: 21,
  },
};

// ── Archetype별 구간(stage) 센서 매핑 ─────────────────────────
// sensors = 계약: 이 archetype의 각 구간에서 어떤 센서를 수집/신뢰할지 선언
// MVP 센서: NTL(VIIRS), NO2(Sentinel-5P), THERMAL(Landsat)
// Phase 3 센서: SAR(Sentinel-1) — MVP에서는 보조/confidence 상향용
const ARCHETYPE_SENSORS = {
  A: { // 제조: 공장 NTL+NO₂+열, 항만 NTL
    input:   ['NTL'],
    process: ['NTL', 'NO2', 'THERMAL'],
    output:  ['NTL'],
    crossValidation: { sensors: ['NTL', 'NO2'], confidence: 90 },
    singleSensorConfidence: 60,
  },
  B: { // 물류: 모든 구간 NTL (항만/허브)
    input:   ['NTL'],
    process: ['NTL'],
    output:  ['NTL'],
    crossValidation: null, // 단일 센서 체계, SAR 추가 시 Phase 3
    singleSensorConfidence: 65,
  },
  C: { // 유통: 모든 구간 NTL (창고/배송허브)
    input:   ['NTL'],
    process: ['NTL'],
    output:  ['NTL'],
    crossValidation: null,
    singleSensorConfidence: 65,
  },
  D: { // 처리: THERMAL 주력 + NTL 보조
    input:   ['NTL'],
    process: ['THERMAL', 'NTL'],
    output:  ['NTL'],
    crossValidation: { sensors: ['THERMAL', 'NTL'], confidence: 90 },
    singleSensorConfidence: 60,
  },
  E: { // 현장: NTL 야간공사 추적
    input:   ['NTL'],
    process: ['NTL'],
    output:  ['NTL'],
    crossValidation: null,
    singleSensorConfidence: 60,
  },
  F: { // 추출: NTL + NO₂ (중장비 배기)
    input:   ['NTL', 'NO2'],
    process: ['NTL'],
    output:  ['NTL'],
    crossValidation: { sensors: ['NTL', 'NO2'], confidence: 90 },
    singleSensorConfidence: 60,
  },
};

// ── Archetype별 스토리 cause 템플릿 ───────────────────────────
const CAUSE_TEMPLATES = {
  A: '{sensor}↓ → 생산라인 가동률 하락 추정',
  B: '{sensor}↓ → 항만 물동량 감소, 항로 지연 추정',
  C: '{sensor}↓ → 물류센터 처리량 감소, 배송 지연 추정',
  D: '{sensor}↓ → 서버 가동률 하락, 서비스 용량 감소 추정',
  E: '{sensor}↓ → 공사 활동 둔화, 공정 지연 추정',
  F: '{sensor}↓ → 채굴/정제 활동 감소, 공급 차질 추정',
};

// ── 시설 타입별 기본 radiusKm ──────────────────────────────────
const FACILITY_RADIUS = {
  fab: 5, assembly: 5, battery: 5, manufacturing: 5,
  steelworks: 8, chemical: 8, refinery: 8, distillery: 5,
  processing: 5,
  port: 10, hub: 3, sortcenter: 3,
  fulfillment: 3, distribution: 3,
  mine: 15, oilfield: 15, solar: 10,
  datacenter: 3, office: 2, design: 2,
  construction: 10, theme_park: 5,
};

const PROFILES = [
  // ═══════════════════════════════════════════════
  // KILLER 10 (첫 영상 대상)
  // ═══════════════════════════════════════════════
  { id:1,  ticker:'TSLA',  name:'Tesla',           country:'US', archetype:'A', sector:'EV',
    facilities:[
      { name:'Port of Long Beach',  lat:33.7540,lng:-118.2160, type:'port',     stage:'input',   sensors:['NTL'], radiusKm:10, desc:'부품·원자재 입항 — 미국 최대 컨테이너항' },
      { name:'Port of Shanghai',    lat:30.6300,lng:122.0700,  type:'port',     stage:'input',   sensors:['NTL'], radiusKm:10, desc:'아시아 원자재 입항 — 세계 1위 컨테이너항' },
      { name:'Fremont Factory',     lat:37.4945,lng:-121.9441, type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, desc:'Model S/3/X/Y 완성차 조립 — 연산 50만대' },
      { name:'Gigafactory Texas',   lat:30.2218,lng:-97.6170,  type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, desc:'Model Y·Cybertruck 조립 + 4680 배터리 — 연산 25만대' },
      { name:'Gigafactory Nevada',  lat:39.5380,lng:-118.4454, type:'battery',  stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, desc:'2170 배터리셀 + 에너지스토리지 생산 — Panasonic 합작' },
      { name:'Gigafactory Shanghai',lat:30.8910,lng:121.8133,  type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, desc:'Model 3/Y 아시아 조립 — 연산 75만대 (최대 단일공장)' },
      { name:'Gigafactory Berlin',  lat:52.3950,lng:13.7878,   type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, desc:'Model Y 유럽 조립 + 4680 배터리 — 연산 37.5만대' },
      { name:'Port of LA (출하)',    lat:33.7405,lng:-118.2723, type:'port',     stage:'output',  sensors:['NTL'], radiusKm:10, desc:'완성차 북미 출하 — LA/Long Beach 복합항만' },
      { name:'Bremerhaven (출하)',   lat:53.5396,lng:8.5809,    type:'port',     stage:'output',  sensors:['NTL'], radiusKm:10, desc:'완성차 유럽 출하 — 독일 최대 자동차 수출항' },
    ]},
  { id:2,  ticker:'TSM',   name:'TSMC',            country:'TW', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'Kaohsiung Port (입고)', lat:22.6133,lng:120.2867, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Fab 18 Tainan',     lat:23.0570,lng:120.2970,  type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, note:'3nm' },
      { name:'Fab 15 Taichung',   lat:24.2070,lng:120.6180,  type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, note:'7nm' },
      { name:'Arizona Fab (건설중)', lat:33.6670,lng:-112.0060, type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, note:'4nm, 2025 가동예정', underConstruction:true },
      { name:'Kaohsiung Port (출하)', lat:22.6133,lng:120.2867, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:3,  ticker:'005930', name:'삼성전자',        country:'KR', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'부산항 (입고)',       lat:35.1028,lng:129.0403,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'인천항 (입고)',       lat:37.4563,lng:126.5963,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'평택 캠퍼스',        lat:36.9920,lng:127.1120,  type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'화성 캠퍼스',        lat:37.2340,lng:126.9780,  type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'기흥 캠퍼스',        lat:37.2280,lng:127.0530,  type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Taylor Texas (건설중)', lat:30.5710,lng:-97.4080, type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, underConstruction:true },
      { name:'부산항 (출하)',       lat:35.1028,lng:129.0403,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
      { name:'인천항 (출하)',       lat:37.4563,lng:126.5963,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:4,  ticker:'AMZN',  name:'Amazon',          country:'US', archetype:'C', sector:'E-Commerce',
    facilities:[
      { name:'LA Fulfillment (입고)', lat:33.9275,lng:-118.2500, type:'fulfillment', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'JFK8 Staten Island', lat:40.5900,lng:-74.1670,  type:'fulfillment', stage:'process', sensors:['NTL'], radiusKm:3 },
      { name:'BFI4 Kent WA',      lat:47.4160,lng:-122.2540,  type:'fulfillment', stage:'process', sensors:['NTL'], radiusKm:3 },
      { name:'DFW7 Dallas',       lat:32.8960,lng:-97.0440,   type:'fulfillment', stage:'process', sensors:['NTL'], radiusKm:3 },
      { name:'JFK Hub (출하)',     lat:40.6413,lng:-73.7781,   type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:5,  ticker:'AAPL',  name:'Apple',           country:'US', archetype:'A', sector:'Tech Hardware',
    facilities:[
      { name:'Shanghai Port (입고)', lat:30.6300,lng:122.0700, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Foxconn Zhengzhou',  lat:34.7190,lng:113.8550,  type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, operator:'Foxconn' },
      { name:'Foxconn Shenzhen',   lat:22.6600,lng:114.0580,  type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, operator:'Foxconn' },
      { name:'Tata Chennai (건설중)', lat:12.8050,lng:80.2270, type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, operator:'Tata', underConstruction:true },
      { name:'Shenzhen Yantian Port (출하)', lat:22.5750,lng:114.2860, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:6,  ticker:'NVDA',  name:'NVIDIA',          country:'US', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'Kaohsiung Port (입고)', lat:22.6133,lng:120.2867, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'TSMC Fab 18 (위탁)',  lat:23.0570,lng:120.2970, type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, note:'위탁생산' },
      { name:'Santa Clara HQ',    lat:37.3700,lng:-121.9630,  type:'design', stage:'process', sensors:['NTL'], radiusKm:2, note:'R&D only' },
      { name:'Kaohsiung Port (출하)', lat:22.6133,lng:120.2867, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:7,  ticker:'BYD',   name:'BYD',             country:'CN', archetype:'A', sector:'EV',
    facilities:[
      { name:'Shenzhen Yantian (입고)', lat:22.5750,lng:114.2860, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Shenzhen HQ Factory',lat:22.6530,lng:114.0300,  type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Changsha Factory',   lat:28.2920,lng:113.0070,  type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Hefei Factory',      lat:31.8200,lng:117.2270,  type:'battery',  stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Shanghai Port (출하)', lat:30.6300,lng:122.0700, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:8,  ticker:'VALE',  name:'Vale',            country:'BR', archetype:'F', sector:'Mining',
    facilities:[
      { name:'Carajás Mine',       lat:-6.0750,lng:-50.1530,  type:'mine', stage:'input', sensors:['NTL','NO2'], radiusKm:15, note:'세계 최대 철광석' },
      { name:'Itabira Complex',    lat:-19.6190,lng:-43.2260, type:'mine', stage:'input', sensors:['NTL','NO2'], radiusKm:15 },
      { name:'Tubarão Complex',    lat:-20.2863,lng:-40.2387, type:'refinery', stage:'process', sensors:['NTL'], radiusKm:8 },
      { name:'Tubarão Port (출하)', lat:-20.2863,lng:-40.2387, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
      { name:'Qingdao Port (도착)', lat:36.0671,lng:120.3826, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:9,  ticker:'MAERSK', name:'Maersk',         country:'DK', archetype:'B', sector:'Shipping',
    facilities:[
      { name:'Port of Rotterdam (출발)', lat:51.9530,lng:4.0600, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Port of Shanghai (출발)',  lat:30.6300,lng:122.0700, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Port of Singapore (환적)', lat:1.2640,lng:103.8170, type:'port', stage:'process', sensors:['NTL'], radiusKm:10 },
      { name:'Port of Busan (도착)',     lat:35.1028,lng:129.0403, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
      { name:'Port of LA (도착)',        lat:33.7405,lng:-118.2723, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:10, ticker:'2222.SR',name:'Saudi Aramco',   country:'SA', archetype:'F', sector:'Oil & Gas',
    facilities:[
      { name:'Ghawar Oil Field',   lat:24.3000,lng:49.3000,   type:'oilfield', stage:'input', sensors:['NTL','NO2'], radiusKm:15, note:'세계 최대 유전' },
      { name:'Ras Tanura Refinery',lat:26.6400,lng:50.1500,   type:'refinery', stage:'process', sensors:['NTL'], radiusKm:8 },
      { name:'Ras Tanura Port (출하)', lat:26.6540,lng:50.1610, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // ═══════════════════════════════════════════════
  // SECTOR 40 (산업별 핵심)
  // ═══════════════════════════════════════════════

  // --- Semiconductor ---
  { id:11, ticker:'000660', name:'SK하이닉스',      country:'KR', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'부산항 (입고)',       lat:35.1028,lng:129.0403,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'이천 캠퍼스',        lat:37.2750,lng:127.4340,  type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'청주 캠퍼스',        lat:36.6270,lng:127.4790,  type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'부산항 (출하)',       lat:35.1028,lng:129.0403,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:12, ticker:'INTC',  name:'Intel',           country:'US', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'Port of Portland (입고)', lat:45.6310,lng:-122.6750, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Oregon Fab D1X',    lat:45.5390,lng:-122.9540,  type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Arizona Fab 52/62', lat:33.3540,lng:-111.9440,  type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Ohio Fab (건설중)',  lat:40.1090,lng:-82.6900,  type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, underConstruction:true },
      { name:'Port of Long Beach (출하)', lat:33.7540,lng:-118.2160, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:13, ticker:'ASML',  name:'ASML',            country:'NL', archetype:'A', sector:'Semiconductor Equipment',
    facilities:[
      { name:'Port of Rotterdam (입고)', lat:51.9530,lng:4.0600, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Veldhoven HQ',      lat:51.4100,lng:5.4870, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of Rotterdam (출하)', lat:51.9530,lng:4.0600, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:14, ticker:'MU',    name:'Micron',          country:'US', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'Port of Tacoma (입고)', lat:47.2670,lng:-122.4130, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Boise HQ Fab',     lat:43.6020,lng:-116.2870,  type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Hiroshima Fab',    lat:34.4520,lng:132.4900,   type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of Tacoma (출하)', lat:47.2670,lng:-122.4130, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:15, ticker:'QCOM',  name:'Qualcomm',        country:'US', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'Kaohsiung Port (입고)', lat:22.6133,lng:120.2867, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'San Diego HQ',     lat:32.8990,lng:-117.1950, type:'design', stage:'process', sensors:['NTL'], radiusKm:2 },
      { name:'TSMC Fab (위탁)',   lat:23.0570,lng:120.2970, type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, note:'위탁생산' },
      { name:'Kaohsiung Port (출하)', lat:22.6133,lng:120.2867, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- EV / Battery ---
  { id:16, ticker:'300750', name:'CATL',            country:'CN', archetype:'A', sector:'Battery',
    facilities:[
      { name:'Ningde Port (입고)', lat:26.6700,lng:119.6600, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Ningde Factory',    lat:26.6580,lng:119.5540,  type:'battery', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Liyang Factory',    lat:31.4310,lng:119.4820,  type:'battery', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Shanghai Port (출하)', lat:30.6300,lng:122.0700, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:17, ticker:'LI',    name:'Li Auto',         country:'CN', archetype:'A', sector:'EV',
    facilities:[
      { name:'Shanghai Port (입고)', lat:30.6300,lng:122.0700, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Changzhou Factory', lat:31.7940,lng:119.9690, type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Shanghai Port (출하)', lat:30.6300,lng:122.0700, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:18, ticker:'NIO',   name:'NIO',             country:'CN', archetype:'A', sector:'EV',
    facilities:[
      { name:'Shanghai Port (입고)', lat:30.6300,lng:122.0700, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Hefei NeoPark',     lat:31.8730,lng:117.2530, type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Shanghai Port (출하)', lat:30.6300,lng:122.0700, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:19, ticker:'373220', name:'LG에너지솔루션',  country:'KR', archetype:'A', sector:'Battery',
    facilities:[
      { name:'인천항 (입고)',       lat:37.4563,lng:126.5963,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'오창 공장',          lat:36.7200,lng:127.4290,  type:'battery', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Poland Wroclaw',    lat:51.0670,lng:16.8840,   type:'battery', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'부산항 (출하)',       lat:35.1028,lng:129.0403,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:20, ticker:'RIVN',  name:'Rivian',          country:'US', archetype:'A', sector:'EV',
    facilities:[
      { name:'Port of Savannah (입고)', lat:32.0810,lng:-81.0840, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Normal IL Plant',   lat:40.5100,lng:-88.9900, type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of Savannah (출하)', lat:32.0810,lng:-81.0840, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- Tech Giants (D: Processing) ---
  { id:21, ticker:'GOOGL', name:'Alphabet',        country:'US', archetype:'D', sector:'Tech',
    facilities:[
      { name:'Pacific NW Grid (입고)', lat:45.5960,lng:-121.1690, type:'hub', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'The Dalles DC Oregon', lat:45.5960,lng:-121.1690, type:'datacenter', stage:'process', sensors:['THERMAL','NTL'], radiusKm:3 },
      { name:'Council Bluffs DC',    lat:41.2780,lng:-95.8380,  type:'datacenter', stage:'process', sensors:['THERMAL','NTL'], radiusKm:3 },
      { name:'Ashburn IX (출력)',   lat:39.0440,lng:-77.4880,  type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:22, ticker:'MSFT',  name:'Microsoft',       country:'US', archetype:'D', sector:'Tech',
    facilities:[
      { name:'Quincy Grid (입고)',  lat:47.2340,lng:-119.8520, type:'hub', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'Quincy DC WA',      lat:47.2340,lng:-119.8520,  type:'datacenter', stage:'process', sensors:['THERMAL','NTL'], radiusKm:3 },
      { name:'San Antonio DC',    lat:29.4190,lng:-98.4890,   type:'datacenter', stage:'process', sensors:['THERMAL','NTL'], radiusKm:3 },
      { name:'Ashburn IX (출력)',  lat:39.0440,lng:-77.4880,   type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:23, ticker:'META',  name:'Meta',            country:'US', archetype:'D', sector:'Tech',
    facilities:[
      { name:'Oregon Grid (입고)', lat:44.3090,lng:-120.8570, type:'hub', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'Prineville DC OR',  lat:44.3090,lng:-120.8570,  type:'datacenter', stage:'process', sensors:['THERMAL','NTL'], radiusKm:3 },
      { name:'Lulea DC Sweden',   lat:65.5840,lng:22.1570,    type:'datacenter', stage:'process', sensors:['THERMAL','NTL'], radiusKm:3 },
      { name:'Ashburn IX (출력)', lat:39.0440,lng:-77.4880,    type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},

  // --- Oil & Gas (F: Extraction) ---
  { id:24, ticker:'XOM',   name:'ExxonMobil',      country:'US', archetype:'F', sector:'Oil & Gas',
    facilities:[
      { name:'Permian Basin',     lat:31.9700,lng:-102.0780, type:'oilfield', stage:'input', sensors:['NTL','NO2'], radiusKm:15 },
      { name:'Baytown Refinery TX',lat:29.7510,lng:-94.9810,  type:'refinery', stage:'process', sensors:['NTL'], radiusKm:8 },
      { name:'Beaumont Refinery', lat:30.0620,lng:-94.0820,   type:'refinery', stage:'process', sensors:['NTL'], radiusKm:8 },
      { name:'Houston Ship Channel (출하)', lat:29.7370,lng:-95.0130, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:25, ticker:'CVX',   name:'Chevron',         country:'US', archetype:'F', sector:'Oil & Gas',
    facilities:[
      { name:'Permian Basin',     lat:31.8500,lng:-102.3200, type:'oilfield', stage:'input', sensors:['NTL','NO2'], radiusKm:15 },
      { name:'Pascagoula Refinery',lat:30.3570,lng:-88.5150,  type:'refinery', stage:'process', sensors:['NTL'], radiusKm:8 },
      { name:'El Segundo Refinery',lat:33.9100,lng:-118.4120, type:'refinery', stage:'process', sensors:['NTL'], radiusKm:8 },
      { name:'Port of Long Beach (출하)', lat:33.7540,lng:-118.2160, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:26, ticker:'SHEL',  name:'Shell',           country:'GB', archetype:'F', sector:'Oil & Gas',
    facilities:[
      { name:'North Sea Fields',  lat:57.5000,lng:1.5000,    type:'oilfield', stage:'input', sensors:['NTL','NO2'], radiusKm:15 },
      { name:'Pernis Refinery Rotterdam', lat:51.8800,lng:4.3890, type:'refinery', stage:'process', sensors:['NTL'], radiusKm:8, note:'유럽 최대' },
      { name:'Port of Rotterdam (출하)', lat:51.9530,lng:4.0600, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- Steel / Materials (A: Manufacturing) ---
  { id:27, ticker:'005490', name:'POSCO홀딩스',     country:'KR', archetype:'A', sector:'Steel',
    facilities:[
      { name:'광양항 (입고)',       lat:34.7500,lng:127.6900,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'포항제철소',         lat:36.0190,lng:129.3640,  type:'steelworks', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:8 },
      { name:'광양제철소',         lat:34.7610,lng:127.7350,  type:'steelworks', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:8 },
      { name:'포항항 (출하)',       lat:36.0300,lng:129.3800,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:28, ticker:'MT',    name:'ArcelorMittal',   country:'LU', archetype:'A', sector:'Steel',
    facilities:[
      { name:'Port of Ghent (입고)', lat:51.0570,lng:3.7350,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Ghent Works Belgium', lat:51.0280,lng:3.7510, type:'steelworks', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:8 },
      { name:'Port of Ghent (출하)', lat:51.0570,lng:3.7350,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- Automotive (A: Manufacturing) ---
  { id:29, ticker:'TM',    name:'Toyota',          country:'JP', archetype:'A', sector:'Auto',
    facilities:[
      { name:'Nagoya Port (입고)', lat:35.0770,lng:136.8820,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Toyota City Plant', lat:35.0540,lng:137.1540,  type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Georgetown KY',    lat:38.2310,lng:-84.5090,   type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Nagoya Port (출하)', lat:35.0770,lng:136.8820,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:30, ticker:'VWAGY', name:'Volkswagen',      country:'DE', archetype:'A', sector:'Auto',
    facilities:[
      { name:'Port of Emden (입고)', lat:53.3290,lng:7.1900,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Wolfsburg Plant',   lat:52.4300,lng:10.7870, type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, note:'세계 최대 자동차 공장' },
      { name:'Port of Emden (출하)', lat:53.3290,lng:7.1900,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:31, ticker:'BMW',   name:'BMW',             country:'DE', archetype:'A', sector:'Auto',
    facilities:[
      { name:'Port of Bremerhaven (입고)', lat:53.5396,lng:8.5809, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Munich Plant',     lat:48.1790,lng:11.5570,   type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Spartanburg SC',   lat:34.9560,lng:-82.0490,  type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of Charleston (출하)', lat:32.7820,lng:-79.9250, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:32, ticker:'F',     name:'Ford',            country:'US', archetype:'A', sector:'Auto',
    facilities:[
      { name:'Port of Detroit (입고)', lat:42.3260,lng:-83.0880, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Rouge Complex MI',  lat:42.2970,lng:-83.1510, type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of Baltimore (출하)', lat:39.2520,lng:-76.5780, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:33, ticker:'005380', name:'현대자동차',      country:'KR', archetype:'A', sector:'Auto',
    facilities:[
      { name:'울산항 (입고)',       lat:35.5100,lng:129.3800,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'울산 공장',          lat:35.5390,lng:129.2770,  type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, note:'세계 최대 단일 자동차 공장' },
      { name:'Alabama Plant',    lat:32.5020,lng:-86.3890,   type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'울산항 (출하)',       lat:35.5100,lng:129.3800,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- Logistics (B) ---
  { id:34, ticker:'FDX',   name:'FedEx',           country:'US', archetype:'B', sector:'Logistics',
    facilities:[
      { name:'Guangzhou Baiyun (출발)', lat:23.3900,lng:113.2990, type:'hub', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'Memphis SuperHub',  lat:35.0420,lng:-89.9830,  type:'hub', stage:'process', sensors:['NTL'], radiusKm:3 },
      { name:'Indianapolis Hub',  lat:39.7170,lng:-86.2940,  type:'hub', stage:'process', sensors:['NTL'], radiusKm:3 },
      { name:'Newark EWR (도착)', lat:40.6895,lng:-74.1745,  type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:35, ticker:'UPS',   name:'UPS',             country:'US', archetype:'B', sector:'Logistics',
    facilities:[
      { name:'Shanghai Pudong (출발)', lat:31.1480,lng:121.8050, type:'hub', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'Louisville Worldport', lat:38.1740,lng:-85.7360, type:'hub', stage:'process', sensors:['NTL'], radiusKm:3, note:'세계 최대 화물 터미널' },
      { name:'Cologne DHL Hub (도착)', lat:50.8660,lng:7.1430, type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:36, ticker:'ZTO',   name:'ZTO Express',     country:'CN', archetype:'B', sector:'Logistics',
    facilities:[
      { name:'Guangzhou Sort (출발)', lat:23.1760,lng:113.2790, type:'sortcenter', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'Shanghai Sort Center', lat:31.1180,lng:121.3500, type:'sortcenter', stage:'process', sensors:['NTL'], radiusKm:3 },
      { name:'Beijing Sort (도착)',  lat:39.7670,lng:116.5710, type:'sortcenter', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},

  // --- Retail / Distribution (C) ---
  { id:37, ticker:'WMT',   name:'Walmart',         country:'US', archetype:'C', sector:'Retail',
    facilities:[
      { name:'Port of Houston (입고)', lat:29.7370,lng:-95.0130, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Bentonville DC',   lat:36.3730,lng:-94.2090,   type:'distribution', stage:'process', sensors:['NTL'], radiusKm:3 },
      { name:'Brooksville DC FL',lat:28.5550,lng:-82.3880,   type:'distribution', stage:'process', sensors:['NTL'], radiusKm:3 },
      { name:'Atlanta DC (배송)',lat:33.7490,lng:-84.3880,    type:'distribution', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:38, ticker:'COST',  name:'Costco',          country:'US', archetype:'C', sector:'Retail',
    facilities:[
      { name:'Port of Tacoma (입고)', lat:47.2670,lng:-122.4130, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Issaquah HQ/DC',   lat:47.5360,lng:-122.0390, type:'distribution', stage:'process', sensors:['NTL'], radiusKm:3 },
      { name:'Mira Loma DC (배송)', lat:34.0020,lng:-117.5180, type:'distribution', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:39, ticker:'JD',    name:'JD.com',          country:'CN', archetype:'C', sector:'E-Commerce',
    facilities:[
      { name:'Shanghai Port (입고)', lat:30.6300,lng:122.0700, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Asia No.1 Shanghai',lat:31.2810,lng:121.1760,  type:'fulfillment', stage:'process', sensors:['NTL'], radiusKm:3 },
      { name:'Beijing HQ DC',    lat:39.8780,lng:116.5670,   type:'fulfillment', stage:'process', sensors:['NTL'], radiusKm:3 },
      { name:'Guangzhou DC (배송)', lat:23.0490,lng:113.3940, type:'fulfillment', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},

  // --- Pharma (A: Manufacturing) ---
  { id:40, ticker:'PFE',   name:'Pfizer',          country:'US', archetype:'A', sector:'Pharma',
    facilities:[
      { name:'Port of NY/NJ (입고)', lat:40.6840,lng:-74.0450, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Kalamazoo MI Plant', lat:42.2850,lng:-85.5630, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of NY/NJ (출하)', lat:40.6840,lng:-74.0450, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:41, ticker:'JNJ',   name:'Johnson & Johnson',country:'US', archetype:'A', sector:'Pharma',
    facilities:[
      { name:'Port of Rotterdam (입고)', lat:51.9530,lng:4.0600, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Janssen Leiden NL', lat:52.1640,lng:4.4920, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of Rotterdam (출하)', lat:51.9530,lng:4.0600, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- Aerospace (A: Manufacturing) ---
  { id:42, ticker:'BA',    name:'Boeing',          country:'US', archetype:'A', sector:'Aerospace',
    facilities:[
      { name:'Port of Tacoma (입고)', lat:47.2670,lng:-122.4130, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Everett Factory WA', lat:47.9240,lng:-122.2710, type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, note:'세계 최대 건물' },
      { name:'North Charleston SC',lat:32.8990,lng:-80.0390,  type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Paine Field (출하)', lat:47.9064,lng:-122.2816, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:43, ticker:'AIR.PA',name:'Airbus',          country:'FR', archetype:'A', sector:'Aerospace',
    facilities:[
      { name:'Port of Hamburg (입고)', lat:53.5330,lng:9.9670, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Toulouse FAL',     lat:43.6280,lng:1.3730,     type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Hamburg FAL',      lat:53.5350,lng:9.8310,     type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Toulouse-Blagnac (출하)', lat:43.6290,lng:1.3640, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- Construction Equipment (A) ---
  { id:44, ticker:'CAT',   name:'Caterpillar',     country:'US', archetype:'A', sector:'Construction Equipment',
    facilities:[
      { name:'Port of Houston (입고)', lat:29.7370,lng:-95.0130, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'East Peoria IL',    lat:40.6590,lng:-89.5440, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of Savannah (출하)', lat:32.0810,lng:-81.0840, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- Mining (F: Extraction) ---
  { id:45, ticker:'BHP',   name:'BHP',             country:'AU', archetype:'F', sector:'Mining',
    facilities:[
      { name:'Olympic Dam',      lat:-30.4440,lng:136.8850,  type:'mine', stage:'input', sensors:['NTL','NO2'], radiusKm:15 },
      { name:'Escondida Chile',  lat:-24.2680,lng:-69.0720,  type:'mine', stage:'input', sensors:['NTL','NO2'], radiusKm:15, note:'세계 최대 구리 광산' },
      { name:'Port Hedland (정제)', lat:-20.3100,lng:118.5760, type:'refinery', stage:'process', sensors:['NTL'], radiusKm:8 },
      { name:'Port Hedland (출하)', lat:-20.3100,lng:118.5760, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:46, ticker:'RIO',   name:'Rio Tinto',       country:'AU', archetype:'F', sector:'Mining',
    facilities:[
      { name:'Pilbara Iron WA',  lat:-22.7230,lng:118.2840, type:'mine', stage:'input', sensors:['NTL','NO2'], radiusKm:15 },
      { name:'Dampier Processing', lat:-20.6600,lng:116.7130, type:'refinery', stage:'process', sensors:['NTL'], radiusKm:8 },
      { name:'Dampier Port (출하)', lat:-20.6600,lng:116.7130, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:47, ticker:'ALB',   name:'Albemarle',       country:'US', archetype:'F', sector:'Lithium',
    facilities:[
      { name:'Salar Atacama Chile', lat:-23.5000,lng:-68.2500, type:'mine', stage:'input', sensors:['NTL','NO2'], radiusKm:15 },
      { name:'La Negra Processing', lat:-23.7700,lng:-70.3200, type:'refinery', stage:'process', sensors:['NTL'], radiusKm:8 },
      { name:'Antofagasta Port (출하)', lat:-23.6340,lng:-70.4050, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:48, ticker:'SQM',   name:'SQM',             country:'CL', archetype:'F', sector:'Lithium',
    facilities:[
      { name:'Salar Atacama',    lat:-23.4200,lng:-68.3300, type:'mine', stage:'input', sensors:['NTL','NO2'], radiusKm:15 },
      { name:'Antofagasta Processing', lat:-23.6500,lng:-70.3900, type:'refinery', stage:'process', sensors:['NTL'], radiusKm:8 },
      { name:'Antofagasta Port (출하)', lat:-23.6340,lng:-70.4050, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:49, ticker:'GLEN',  name:'Glencore',        country:'CH', archetype:'F', sector:'Mining/Trading',
    facilities:[
      { name:'Collahuasi Chile',  lat:-20.9800,lng:-68.6900, type:'mine', stage:'input', sensors:['NTL','NO2'], radiusKm:15 },
      { name:'Iquique Processing', lat:-20.2200,lng:-70.1300, type:'refinery', stage:'process', sensors:['NTL'], radiusKm:8 },
      { name:'Iquique Port (출하)', lat:-20.2130,lng:-70.1500, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:50, ticker:'FCX',   name:'Freeport-McMoRan',country:'US', archetype:'F', sector:'Copper',
    facilities:[
      { name:'Grasberg Indonesia', lat:-4.0530,lng:137.1160, type:'mine', stage:'input', sensors:['NTL','NO2'], radiusKm:15, note:'세계 최대 금/구리 광산' },
      { name:'Amamapare Smelter', lat:-4.8500,lng:136.9200,  type:'refinery', stage:'process', sensors:['NTL'], radiusKm:8 },
      { name:'Amamapare Port (출하)', lat:-4.8500,lng:136.9200, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // ═══════════════════════════════════════════════
  // GLOBAL 50 (글로벌 확장)
  // ═══════════════════════════════════════════════

  // --- Semiconductor Extended (A) ---
  { id:51, ticker:'LRCX',  name:'Lam Research',    country:'US', archetype:'A', sector:'Semiconductor Equipment',
    facilities:[
      { name:'Port of Oakland (입고)', lat:37.7950,lng:-122.2790, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Fremont CA',        lat:37.5210,lng:-121.9560, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of Oakland (출하)', lat:37.7950,lng:-122.2790, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:52, ticker:'AMAT',  name:'Applied Materials',country:'US', archetype:'A', sector:'Semiconductor Equipment',
    facilities:[
      { name:'Port of Oakland (입고)', lat:37.7950,lng:-122.2790, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Santa Clara CA',    lat:37.3830,lng:-121.9720, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of Oakland (출하)', lat:37.7950,lng:-122.2790, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:53, ticker:'TXN',   name:'Texas Instruments',country:'US', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'Port of Houston (입고)', lat:29.7370,lng:-95.0130, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'RFAB Richardson TX', lat:32.9380,lng:-96.7430, type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of Houston (출하)', lat:29.7370,lng:-95.0130, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:54, ticker:'ADI',   name:'Analog Devices',  country:'US', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'Port of Boston (입고)', lat:42.3520,lng:-71.0480, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Wilmington MA',     lat:42.5570,lng:-71.1510, type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of Boston (출하)', lat:42.3520,lng:-71.0480, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- EV / Battery Extended (A) ---
  { id:55, ticker:'XPEV',  name:'XPeng',           country:'CN', archetype:'A', sector:'EV',
    facilities:[
      { name:'Guangzhou Port (입고)', lat:23.0800,lng:113.5000, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Zhaoqing Factory',  lat:23.0470,lng:112.4570, type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Guangzhou Port (출하)', lat:23.0800,lng:113.5000, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:56, ticker:'9866',  name:'NIO (HK)',        country:'CN', archetype:'A', sector:'EV',
    facilities:[
      { name:'Shanghai Port (입고)', lat:30.6300,lng:122.0700, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Hefei F2',          lat:31.8730,lng:117.2530, type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Shanghai Port (출하)', lat:30.6300,lng:122.0700, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:57, ticker:'051910', name:'LG화학',          country:'KR', archetype:'A', sector:'Chemical',
    facilities:[
      { name:'여수항 (입고)',       lat:34.7400,lng:127.7400,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'여수 공장',          lat:34.7310,lng:127.7420, type:'chemical', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:8 },
      { name:'여수항 (출하)',       lat:34.7400,lng:127.7400,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:58, ticker:'006400', name:'삼성SDI',         country:'KR', archetype:'A', sector:'Battery',
    facilities:[
      { name:'인천항 (입고)',       lat:37.4563,lng:126.5963,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'천안 공장',          lat:36.8200,lng:127.1540, type:'battery', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Göd Hungary',       lat:47.6870,lng:19.1280, type:'battery', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'부산항 (출하)',       lat:35.1028,lng:129.0403,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- Tech Data Centers (D: Processing) ---
  { id:59, ticker:'ORCL',  name:'Oracle',          country:'US', archetype:'D', sector:'Cloud',
    facilities:[
      { name:'Phoenix Grid (입고)', lat:33.4480,lng:-112.0740, type:'hub', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'Phoenix DC',        lat:33.4480,lng:-112.0740, type:'datacenter', stage:'process', sensors:['THERMAL','NTL'], radiusKm:3 },
      { name:'Ashburn IX (출력)', lat:39.0440,lng:-77.4880,   type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:60, ticker:'CRM',   name:'Salesforce',      country:'US', archetype:'D', sector:'Cloud',
    facilities:[
      { name:'SF Grid (입고)',     lat:37.7900,lng:-122.3970, type:'hub', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'SF HQ',             lat:37.7900,lng:-122.3970, type:'office', stage:'process', sensors:['THERMAL','NTL'], radiusKm:2 },
      { name:'Ashburn IX (출력)', lat:39.0440,lng:-77.4880,   type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},

  // --- Food & Agriculture (A: Manufacturing) ---
  { id:61, ticker:'ADM',   name:'ADM',             country:'US', archetype:'A', sector:'Agri',
    facilities:[
      { name:'Port of New Orleans (입고)', lat:29.9340,lng:-90.0280, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Decatur IL Complex', lat:39.8440,lng:-88.9540, type:'processing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of New Orleans (출하)', lat:29.9340,lng:-90.0280, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:62, ticker:'BG',    name:'Bunge',           country:'US', archetype:'A', sector:'Agri',
    facilities:[
      { name:'Port of New Orleans (입고)', lat:29.9340,lng:-90.0280, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Council Bluffs IA',  lat:41.2290,lng:-95.8510, type:'processing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of New Orleans (출하)', lat:29.9340,lng:-90.0280, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- Energy (F: Extraction / A: Manufacturing) ---
  { id:63, ticker:'NEE',   name:'NextEra Energy',  country:'US', archetype:'F', sector:'Renewables',
    facilities:[
      { name:'FPL Solar FL',      lat:26.9820,lng:-80.1180, type:'solar', stage:'input', sensors:['NTL','NO2'], radiusKm:10 },
      { name:'Juno Beach Grid',   lat:26.8810,lng:-80.0590, type:'hub', stage:'process', sensors:['NTL'], radiusKm:3 },
      { name:'Miami Grid (출력)', lat:25.7617,lng:-80.1918,  type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:64, ticker:'ENPH',  name:'Enphase Energy',  country:'US', archetype:'A', sector:'Solar',
    facilities:[
      { name:'Port of LA (입고)',  lat:33.7405,lng:-118.2723, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Peoria AZ',         lat:33.5810,lng:-112.2370, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of LA (출하)',  lat:33.7405,lng:-118.2723, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:65, ticker:'FSLR',  name:'First Solar',     country:'US', archetype:'A', sector:'Solar',
    facilities:[
      { name:'Port of Houston (입고)', lat:29.7370,lng:-95.0130, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Perrysburg OH',     lat:41.5460,lng:-83.6420, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of Houston (출하)', lat:29.7370,lng:-95.0130, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- Japan (A: Manufacturing) ---
  { id:66, ticker:'7203',  name:'Toyota (JP)',     country:'JP', archetype:'A', sector:'Auto',
    facilities:[
      { name:'Nagoya Port (입고)', lat:35.0770,lng:136.8820,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Tahara Plant',      lat:34.6470,lng:137.0670, type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Nagoya Port (출하)', lat:35.0770,lng:136.8820,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:67, ticker:'6758',  name:'Sony',            country:'JP', archetype:'A', sector:'Electronics',
    facilities:[
      { name:'Kumamoto Port (입고)', lat:32.7480,lng:130.6930, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Kumamoto Fab',      lat:32.7820,lng:130.7410, type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Kumamoto Port (출하)', lat:32.7480,lng:130.6930, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:68, ticker:'6861',  name:'Keyence',         country:'JP', archetype:'A', sector:'Factory Automation',
    facilities:[
      { name:'Osaka Port (입고)', lat:34.6540,lng:135.4170,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Osaka HQ',          lat:34.7690,lng:135.4940, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Osaka Port (출하)', lat:34.6540,lng:135.4170,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- Germany (A: Manufacturing) ---
  { id:69, ticker:'SIE.DE',name:'Siemens',         country:'DE', archetype:'A', sector:'Industrial',
    facilities:[
      { name:'Port of Hamburg (입고)', lat:53.5330,lng:9.9670, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Amberg Factory',    lat:49.4430,lng:11.8520, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, note:'디지털 트윈 공장' },
      { name:'Port of Hamburg (출하)', lat:53.5330,lng:9.9670, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:70, ticker:'BAS.DE',name:'BASF',            country:'DE', archetype:'A', sector:'Chemical',
    facilities:[
      { name:'Port of Mannheim (입고)', lat:49.4880,lng:8.4660, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Ludwigshafen',      lat:49.4940,lng:8.4320, type:'chemical', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:8, note:'세계 최대 화학 단지' },
      { name:'Port of Antwerp (출하)', lat:51.2280,lng:4.4020, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- India (D/F) ---
  { id:71, ticker:'TCS',   name:'TCS',             country:'IN', archetype:'D', sector:'IT Services',
    facilities:[
      { name:'Mumbai Grid (입고)', lat:19.0760,lng:72.8780,  type:'hub', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'Mumbai HQ',         lat:19.0760,lng:72.8780, type:'office', stage:'process', sensors:['THERMAL','NTL'], radiusKm:2 },
      { name:'Chennai IX (출력)', lat:13.0827,lng:80.2707,   type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:72, ticker:'RELIANCE',name:'Reliance Industries',country:'IN', archetype:'F', sector:'Conglomerate',
    facilities:[
      { name:'KG Basin Offshore', lat:16.5000,lng:82.0000,  type:'oilfield', stage:'input', sensors:['NTL','NO2'], radiusKm:15 },
      { name:'Jamnagar Refinery', lat:22.3340,lng:70.0190, type:'refinery', stage:'process', sensors:['NTL'], radiusKm:8, note:'세계 최대 정유소' },
      { name:'Sikka Port (출하)', lat:22.4210,lng:69.8400,   type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- Korea Extended ---
  { id:73, ticker:'035420', name:'NAVER',           country:'KR', archetype:'D', sector:'Tech',
    facilities:[
      { name:'춘천 Grid (입고)',   lat:37.9110,lng:127.7350, type:'hub', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'춘천 데이터센터',     lat:37.9110,lng:127.7350, type:'datacenter', stage:'process', sensors:['THERMAL','NTL'], radiusKm:3 },
      { name:'판교 IX (출력)',     lat:37.3940,lng:127.1110,  type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:74, ticker:'035720', name:'카카오',           country:'KR', archetype:'D', sector:'Tech',
    facilities:[
      { name:'판교 Grid (입고)',   lat:37.3940,lng:127.1110, type:'hub', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'판교 오피스',        lat:37.3940,lng:127.1110, type:'office', stage:'process', sensors:['THERMAL','NTL'], radiusKm:2 },
      { name:'제주 DC (출력)',     lat:33.4500,lng:126.5700,  type:'datacenter', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:75, ticker:'066570', name:'LG전자',          country:'KR', archetype:'A', sector:'Electronics',
    facilities:[
      { name:'부산항 (입고)',       lat:35.1028,lng:129.0403,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'창원 공장',          lat:35.2280,lng:128.6710, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'부산항 (출하)',       lat:35.1028,lng:129.0403,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:76, ticker:'000270', name:'기아',            country:'KR', archetype:'A', sector:'Auto',
    facilities:[
      { name:'광양항 (입고)',       lat:34.7500,lng:127.6900,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'화성 공장',          lat:37.1390,lng:126.8220, type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'광주 공장',          lat:35.1570,lng:126.7930, type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'광양항 (출하)',       lat:34.7500,lng:127.6900,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:77, ticker:'028260', name:'삼성물산',         country:'KR', archetype:'E', sector:'Construction',
    facilities:[
      { name:'인천항 (자재 입고)',  lat:37.4563,lng:126.5963,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'서울 사무소',        lat:37.5305,lng:127.0019, type:'office', stage:'process', sensors:['NTL'], radiusKm:2 },
      { name:'송도 현장 (완성)',   lat:37.3800,lng:126.6600,  type:'construction', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:78, ticker:'034730', name:'SK Inc.',         country:'KR', archetype:'A', sector:'Conglomerate',
    facilities:[
      { name:'인천항 (입고)',       lat:37.4563,lng:126.5963,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'서울 종로',          lat:37.5700,lng:126.9830, type:'office', stage:'process', sensors:['NTL'], radiusKm:2 },
      { name:'부산항 (출하)',       lat:35.1028,lng:129.0403,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:79, ticker:'012330', name:'현대모비스',       country:'KR', archetype:'A', sector:'Auto Parts',
    facilities:[
      { name:'울산항 (입고)',       lat:35.5100,lng:129.3800,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'울산 모듈공장',      lat:35.5350,lng:129.3120, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'울산항 (출하)',       lat:35.5100,lng:129.3800,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:80, ticker:'096770', name:'SK이노베이션',     country:'KR', archetype:'A', sector:'Battery',
    facilities:[
      { name:'인천항 (입고)',       lat:37.4563,lng:126.5963,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'서산 공장',          lat:36.7980,lng:126.4590, type:'battery', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'인천항 (출하)',       lat:37.4563,lng:126.5963,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:81, ticker:'003670', name:'포스코퓨처엠',     country:'KR', archetype:'A', sector:'Materials',
    facilities:[
      { name:'광양항 (입고)',       lat:34.7500,lng:127.6900,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'광양 공장',          lat:34.7600,lng:127.7130, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'광양항 (출하)',       lat:34.7500,lng:127.6900,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:82, ticker:'009150', name:'삼성전기',         country:'KR', archetype:'A', sector:'Electronics',
    facilities:[
      { name:'부산항 (입고)',       lat:35.1028,lng:129.0403,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'부산 공장',          lat:35.1120,lng:129.0260, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'부산항 (출하)',       lat:35.1028,lng:129.0403,  type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- China Extended (C/A) ---
  { id:83, ticker:'BABA',  name:'Alibaba',         country:'CN', archetype:'C', sector:'E-Commerce',
    facilities:[
      { name:'Ningbo Port (입고)', lat:29.8680,lng:121.5440,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Hangzhou HQ',       lat:30.2740,lng:120.0220, type:'office', stage:'process', sensors:['NTL'], radiusKm:2 },
      { name:'Cainiao Wuxi',      lat:31.4920,lng:120.3120, type:'fulfillment', stage:'process', sensors:['NTL'], radiusKm:3 },
      { name:'Shanghai DC (배송)', lat:31.2300,lng:121.4740,  type:'fulfillment', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:84, ticker:'PDD',   name:'PDD / Temu',      country:'CN', archetype:'C', sector:'E-Commerce',
    facilities:[
      { name:'Guangzhou Port (입고)', lat:23.0800,lng:113.5000, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Guangzhou Warehouse', lat:23.0490,lng:113.3940, type:'fulfillment', stage:'process', sensors:['NTL'], radiusKm:3 },
      { name:'Shenzhen DC (배송)', lat:22.5430,lng:114.0580,  type:'fulfillment', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:85, ticker:'600519', name:'Moutai',          country:'CN', archetype:'A', sector:'Liquor',
    facilities:[
      { name:'Chongqing Port (입고)', lat:29.5630,lng:106.5510, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Maotai Town',       lat:27.8540,lng:106.3880, type:'distillery', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Chongqing Port (출하)', lat:29.5630,lng:106.5510, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- Taiwan Extended (A) ---
  { id:86, ticker:'2317',  name:'Hon Hai/Foxconn', country:'TW', archetype:'A', sector:'EMS',
    facilities:[
      { name:'Kaohsiung Port (입고)', lat:22.6133,lng:120.2867, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Zhengzhou Campus',  lat:34.7190,lng:113.8550, type:'assembly', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, note:'iPhone City' },
      { name:'Shenzhen Yantian Port (출하)', lat:22.5750,lng:114.2860, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:87, ticker:'2330',  name:'TSMC (TW)',       country:'TW', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'Kaohsiung Port (입고)', lat:22.6133,lng:120.2867, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Fab 18 Phase 7',    lat:23.0570,lng:120.2970, type:'fab', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Kaohsiung Port (출하)', lat:22.6133,lng:120.2867, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- European (A/D) ---
  { id:88, ticker:'NESN',  name:'Nestlé',          country:'CH', archetype:'A', sector:'Food',
    facilities:[
      { name:'Port of Genoa (입고)', lat:44.4050,lng:8.9330, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Vevey HQ',          lat:46.4620,lng:6.8440, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of Genoa (출하)', lat:44.4050,lng:8.9330, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:89, ticker:'MC.PA', name:'LVMH',            country:'FR', archetype:'A', sector:'Luxury',
    facilities:[
      { name:'Port of Le Havre (입고)', lat:49.4810,lng:0.1080, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Asnières Workshop Paris', lat:48.9140,lng:2.2840, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'CDG Airport (출하)', lat:49.0097,lng:2.5479,    type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:90, ticker:'SAP',   name:'SAP',             country:'DE', archetype:'D', sector:'Enterprise SW',
    facilities:[
      { name:'Frankfurt IX (입고)', lat:50.1109,lng:8.6821, type:'hub', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'Walldorf HQ',       lat:49.2940,lng:8.6420, type:'office', stage:'process', sensors:['THERMAL','NTL'], radiusKm:2 },
      { name:'Frankfurt IX (출력)', lat:50.1109,lng:8.6821, type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},

  // --- Others ---
  { id:91, ticker:'DIS',   name:'Disney',          country:'US', archetype:'E', sector:'Entertainment',
    facilities:[
      { name:'Port of Tampa (자재)', lat:27.9380,lng:-82.4450, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Walt Disney World FL', lat:28.3852,lng:-81.5639, type:'theme_park', stage:'process', sensors:['NTL'], radiusKm:5 },
      { name:'Orlando Area (완성)', lat:28.5383,lng:-81.3792,  type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:92, ticker:'NKE',   name:'Nike',            country:'US', archetype:'A', sector:'Apparel',
    facilities:[
      { name:'Ho Chi Minh Port (입고)', lat:10.7600,lng:106.7400, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Vietnam Factory',   lat:10.9780,lng:106.6300, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5, operator:'contracted' },
      { name:'Port of Long Beach (출하)', lat:33.7540,lng:-118.2160, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:93, ticker:'SBUX',  name:'Starbucks',       country:'US', archetype:'C', sector:'Food & Beverage',
    facilities:[
      { name:'Port of Seattle (입고)', lat:47.5810,lng:-122.3460, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Kent Roasting WA',  lat:47.3810,lng:-122.2350, type:'processing', stage:'process', sensors:['NTL'], radiusKm:5 },
      { name:'Seattle DC (배송)', lat:47.6062,lng:-122.3321,  type:'distribution', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:94, ticker:'V',     name:'Visa',            country:'US', archetype:'D', sector:'Fintech',
    facilities:[
      { name:'Ashburn Grid (입고)', lat:39.0440,lng:-77.4880, type:'hub', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'Ashburn DC VA',     lat:39.0440,lng:-77.4880, type:'datacenter', stage:'process', sensors:['THERMAL','NTL'], radiusKm:3 },
      { name:'Equinix Ashburn (출력)', lat:39.0460,lng:-77.4870, type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
  { id:95, ticker:'JPM',   name:'JPMorgan Chase',  country:'US', archetype:'D', sector:'Banking',
    facilities:[
      { name:'Plano Grid (입고)', lat:33.0750,lng:-96.7450,  type:'hub', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'Plano TX DC',      lat:33.0750,lng:-96.7450, type:'datacenter', stage:'process', sensors:['THERMAL','NTL'], radiusKm:3 },
      { name:'Ashburn IX (출력)', lat:39.0440,lng:-77.4880,   type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},

  // --- Construction Under Observation (E) ---
  { id:96, ticker:'NEOM',  name:'NEOM (비상장)',    country:'SA', archetype:'E', sector:'Megaproject',
    facilities:[
      { name:'Duba Port (자재)',  lat:27.3500,lng:35.6900,  type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'NEOM The Line',     lat:28.0070,lng:35.1470, type:'construction', stage:'process', sensors:['NTL'], radiusKm:10, underConstruction:true, note:'세계 최대 건설 프로젝트' },
      { name:'NEOM Bay (완성)',   lat:27.9800,lng:35.2000,  type:'construction', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},

  // --- Life Sciences / Industrial (A) ---
  { id:97, ticker:'DHR',   name:'Danaher',         country:'US', archetype:'A', sector:'Life Sciences',
    facilities:[
      { name:'Port of Baltimore (입고)', lat:39.2520,lng:-76.5780, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Washington DC HQ',  lat:38.9050,lng:-77.0370, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of Baltimore (출하)', lat:39.2520,lng:-76.5780, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:98, ticker:'LIN',   name:'Linde',           country:'IE', archetype:'A', sector:'Industrial Gas',
    facilities:[
      { name:'Port of Rotterdam (입고)', lat:51.9530,lng:4.0600, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Leuna Germany',     lat:51.3170,lng:12.0150, type:'chemical', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:8 },
      { name:'Port of Rotterdam (출하)', lat:51.9530,lng:4.0600, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:99, ticker:'DE',    name:'Deere & Company',  country:'US', archetype:'A', sector:'Agriculture Equipment',
    facilities:[
      { name:'Port of New Orleans (입고)', lat:29.9340,lng:-90.0280, type:'port', stage:'input', sensors:['NTL'], radiusKm:10 },
      { name:'Waterloo IA',       lat:42.4930,lng:-92.3430, type:'manufacturing', stage:'process', sensors:['NTL','NO2','THERMAL'], radiusKm:5 },
      { name:'Port of New Orleans (출하)', lat:29.9340,lng:-90.0280, type:'port', stage:'output', sensors:['NTL'], radiusKm:10 },
    ]},
  { id:100,ticker:'GRAB',  name:'Grab',            country:'SG', archetype:'D', sector:'Super App',
    facilities:[
      { name:'Singapore Grid (입고)', lat:1.2930,lng:103.8560, type:'hub', stage:'input', sensors:['NTL'], radiusKm:3 },
      { name:'Singapore HQ',      lat:1.2930,lng:103.8560, type:'office', stage:'process', sensors:['THERMAL','NTL'], radiusKm:2 },
      { name:'Singapore IX (출력)', lat:1.3200,lng:103.8910, type:'hub', stage:'output', sensors:['NTL'], radiusKm:3 },
    ]},
];

// ─── 유틸 ────────────────────────────────────────────────
function getProfile(ticker) {
  return PROFILES.find(p => p.ticker === ticker);
}

function getByArchetype(archetypeCode) {
  return PROFILES.filter(p => p.archetype === archetypeCode);
}

function getByCountry(countryCode) {
  return PROFILES.filter(p => p.country === countryCode);
}

function getBySector(sector) {
  return PROFILES.filter(p => p.sector.toLowerCase().includes(sector.toLowerCase()));
}

function getUnderConstruction() {
  return PROFILES.filter(p => p.facilities.some(f => f.underConstruction));
}

function getAllFacilities() {
  return PROFILES.flatMap(p => p.facilities.map(f => ({ ...f, ticker: p.ticker, company: p.name })));
}

// ─── 통계 ────────────────────────────────────────────────
const STATS = {
  totalStocks: PROFILES.length,
  totalFacilities: PROFILES.reduce((s, p) => s + p.facilities.length, 0),
  countries: [...new Set(PROFILES.map(p => p.country))].length,
  archetypeDistribution: Object.fromEntries(
    Object.keys(ARCHETYPES).map(k => [ARCHETYPES[k].id, PROFILES.filter(p => p.archetype === k).length])
  ),
  countryDistribution: Object.fromEntries(
    [...new Set(PROFILES.map(p => p.country))].map(c => [c, PROFILES.filter(p => p.country === c).length])
      .sort((a, b) => b[1] - a[1])
  ),
  underConstruction: PROFILES.filter(p => p.facilities.some(f => f.underConstruction)).length,
};

// ── stage별 시설 추출 유틸 ──────────────────────────────────
function getFacilitiesByStage(ticker, stage) {
  const p = getProfile(ticker);
  if (!p) return [];
  return p.facilities.filter(f => f.stage === stage);
}

module.exports = {
  ARCHETYPES,
  ARCHETYPE_SENSORS,
  CAUSE_TEMPLATES,
  FACILITY_RADIUS,
  PROFILES,
  STATS,
  getProfile,
  getByArchetype,
  getByCountry,
  getBySector,
  getUnderConstruction,
  getAllFacilities,
  getFacilitiesByStage,
};
