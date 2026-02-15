/**
 * DIAH-7M Stock Profiles — 100종목 / 276시설 / 6 Archetype / 21개국
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

// flow_11: Input→Process→Output 11단계 흐름
const FLOW_TEMPLATES = {
  A: ['원자재입고','검수','투입','가공','조립','테스트','포장','출하','운송','납품','설치'],
  B: ['주문접수','픽업','상차','간선운송','환적','최종운송','하차','검수','배달','서명','완료'],
  C: ['입고','검수','보관','피킹','포장','분류','상차','배송','도착','수령','반품처리'],
  D: ['요청','인증','라우팅','처리','연산','저장','동기화','캐시','응답','로깅','정산'],
  E: ['설계','허가','터파기','기초','골조','마감','설비','검사','준공','인도','운영'],
  F: ['탐사','시추','채굴','파쇄','선별','세척','운송','정제','저장','출하','배달'],
};

const PROFILES = [
  // ═══════════════════════════════════════════════
  // KILLER 10 (첫 영상 대상)
  // ═══════════════════════════════════════════════
  { id:1,  ticker:'TSLA',  name:'Tesla',           country:'US', archetype:'A', sector:'EV',
    facilities:[
      { name:'Fremont Factory',    lat:37.4945,lng:-121.9441, type:'assembly' },
      { name:'Gigafactory Texas',  lat:30.2218,lng:-97.6170,  type:'assembly' },
      { name:'Gigafactory Nevada', lat:39.5380,lng:-118.4454, type:'battery' },
      { name:'Gigafactory Shanghai',lat:30.8910,lng:121.8133, type:'assembly' },
      { name:'Gigafactory Berlin', lat:52.3950,lng:13.7878,   type:'assembly' },
    ]},
  { id:2,  ticker:'TSM',   name:'TSMC',            country:'TW', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'Fab 18 Tainan',     lat:23.0570,lng:120.2970,  type:'fab', note:'3nm' },
      { name:'Fab 15 Taichung',   lat:24.2070,lng:120.6180,  type:'fab', note:'7nm' },
      { name:'Arizona Fab (건설중)', lat:33.6670,lng:-112.0060, type:'fab', note:'4nm, 2025 가동예정', underConstruction:true },
    ]},
  { id:3,  ticker:'005930', name:'삼성전자',        country:'KR', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'평택 캠퍼스',        lat:36.9920,lng:127.1120,  type:'fab' },
      { name:'화성 캠퍼스',        lat:37.2340,lng:126.9780,  type:'fab' },
      { name:'기흥 캠퍼스',        lat:37.2280,lng:127.0530,  type:'fab' },
      { name:'Taylor Texas (건설중)', lat:30.5710,lng:-97.4080, type:'fab', underConstruction:true },
    ]},
  { id:4,  ticker:'AMZN',  name:'Amazon',          country:'US', archetype:'C', sector:'E-Commerce',
    facilities:[
      { name:'JFK8 Staten Island', lat:40.5900,lng:-74.1670,  type:'fulfillment' },
      { name:'BFI4 Kent WA',      lat:47.4160,lng:-122.2540,  type:'fulfillment' },
      { name:'DFW7 Dallas',       lat:32.8960,lng:-97.0440,   type:'fulfillment' },
    ]},
  { id:5,  ticker:'AAPL',  name:'Apple',           country:'US', archetype:'A', sector:'Tech Hardware',
    facilities:[
      { name:'Foxconn Zhengzhou',  lat:34.7190,lng:113.8550,  type:'assembly', operator:'Foxconn' },
      { name:'Foxconn Shenzhen',   lat:22.6600,lng:114.0580,  type:'assembly', operator:'Foxconn' },
      { name:'Tata Chennai (건설중)', lat:12.8050,lng:80.2270, type:'assembly', operator:'Tata', underConstruction:true },
    ]},
  { id:6,  ticker:'NVDA',  name:'NVIDIA',          country:'US', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'TSMC Fab 18 (위탁)',  lat:23.0570,lng:120.2970, type:'fab', note:'위탁생산' },
      { name:'Santa Clara HQ',    lat:37.3700,lng:-121.9630,  type:'design', note:'R&D only' },
    ]},
  { id:7,  ticker:'BYD',   name:'BYD',             country:'CN', archetype:'A', sector:'EV',
    facilities:[
      { name:'Shenzhen HQ Factory',lat:22.6530,lng:114.0300,  type:'assembly' },
      { name:'Changsha Factory',   lat:28.2920,lng:113.0070,  type:'assembly' },
      { name:'Hefei Factory',      lat:31.8200,lng:117.2270,  type:'battery' },
    ]},
  { id:8,  ticker:'VALE',  name:'Vale',            country:'BR', archetype:'F', sector:'Mining',
    facilities:[
      { name:'Carajás Mine',       lat:-6.0750,lng:-50.1530,  type:'mine', note:'세계 최대 철광석' },
      { name:'Itabira Complex',    lat:-19.6190,lng:-43.2260, type:'mine' },
    ]},
  { id:9,  ticker:'MAERSK', name:'Maersk',         country:'DK', archetype:'B', sector:'Shipping',
    facilities:[
      { name:'Port of Rotterdam',  lat:51.9530,lng:4.0600,    type:'port' },
      { name:'Port of Shanghai',   lat:30.6300,lng:122.0700,  type:'port' },
      { name:'Port of Singapore',  lat:1.2640,lng:103.8170,   type:'port' },
    ]},
  { id:10, ticker:'2222.SR',name:'Saudi Aramco',   country:'SA', archetype:'F', sector:'Oil & Gas',
    facilities:[
      { name:'Ghawar Oil Field',   lat:24.3000,lng:49.3000,   type:'oilfield', note:'세계 최대 유전' },
      { name:'Ras Tanura Refinery',lat:26.6400,lng:50.1500,   type:'refinery' },
    ]},

  // ═══════════════════════════════════════════════
  // SECTOR 40 (산업별 핵심)
  // ═══════════════════════════════════════════════
  // --- Semiconductor ---
  { id:11, ticker:'000660', name:'SK하이닉스',      country:'KR', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'이천 캠퍼스',        lat:37.2750,lng:127.4340,  type:'fab' },
      { name:'청주 캠퍼스',        lat:36.6270,lng:127.4790,  type:'fab' },
    ]},
  { id:12, ticker:'INTC',  name:'Intel',           country:'US', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'Oregon Fab D1X',    lat:45.5390,lng:-122.9540,  type:'fab' },
      { name:'Arizona Fab 52/62', lat:33.3540,lng:-111.9440,  type:'fab' },
      { name:'Ohio Fab (건설중)',  lat:40.1090,lng:-82.6900,  type:'fab', underConstruction:true },
    ]},
  { id:13, ticker:'ASML',  name:'ASML',            country:'NL', archetype:'A', sector:'Semiconductor Equipment',
    facilities:[{ name:'Veldhoven HQ',  lat:51.4100,lng:5.4870, type:'manufacturing' }]},
  { id:14, ticker:'MU',    name:'Micron',          country:'US', archetype:'A', sector:'Semiconductor',
    facilities:[
      { name:'Boise HQ Fab',     lat:43.6020,lng:-116.2870,  type:'fab' },
      { name:'Hiroshima Fab',    lat:34.4520,lng:132.4900,   type:'fab' },
    ]},
  { id:15, ticker:'QCOM',  name:'Qualcomm',        country:'US', archetype:'A', sector:'Semiconductor',
    facilities:[{ name:'San Diego HQ', lat:32.8990,lng:-117.1950, type:'design' }]},

  // --- EV / Battery ---
  { id:16, ticker:'300750', name:'CATL',            country:'CN', archetype:'A', sector:'Battery',
    facilities:[
      { name:'Ningde Factory',    lat:26.6580,lng:119.5540,  type:'battery' },
      { name:'Liyang Factory',    lat:31.4310,lng:119.4820,  type:'battery' },
    ]},
  { id:17, ticker:'LI',    name:'Li Auto',         country:'CN', archetype:'A', sector:'EV',
    facilities:[{ name:'Changzhou Factory', lat:31.7940,lng:119.9690, type:'assembly' }]},
  { id:18, ticker:'NIO',   name:'NIO',             country:'CN', archetype:'A', sector:'EV',
    facilities:[{ name:'Hefei NeoPark', lat:31.8730,lng:117.2530, type:'assembly' }]},
  { id:19, ticker:'373220', name:'LG에너지솔루션',  country:'KR', archetype:'A', sector:'Battery',
    facilities:[
      { name:'오창 공장',          lat:36.7200,lng:127.4290,  type:'battery' },
      { name:'Poland Wroclaw',    lat:51.0670,lng:16.8840,   type:'battery' },
    ]},
  { id:20, ticker:'RIVN',  name:'Rivian',          country:'US', archetype:'A', sector:'EV',
    facilities:[{ name:'Normal IL Plant', lat:40.5100,lng:-88.9900, type:'assembly' }]},

  // --- Tech Giants ---
  { id:21, ticker:'GOOGL', name:'Alphabet',        country:'US', archetype:'D', sector:'Tech',
    facilities:[
      { name:'The Dalles DC Oregon', lat:45.5960,lng:-121.1690, type:'datacenter' },
      { name:'Council Bluffs DC',    lat:41.2780,lng:-95.8380,  type:'datacenter' },
    ]},
  { id:22, ticker:'MSFT',  name:'Microsoft',       country:'US', archetype:'D', sector:'Tech',
    facilities:[
      { name:'Quincy DC WA',      lat:47.2340,lng:-119.8520,  type:'datacenter' },
      { name:'San Antonio DC',    lat:29.4190,lng:-98.4890,   type:'datacenter' },
    ]},
  { id:23, ticker:'META',  name:'Meta',            country:'US', archetype:'D', sector:'Tech',
    facilities:[
      { name:'Prineville DC OR',  lat:44.3090,lng:-120.8570,  type:'datacenter' },
      { name:'Lulea DC Sweden',   lat:65.5840,lng:22.1570,    type:'datacenter' },
    ]},

  // --- Oil & Gas ---
  { id:24, ticker:'XOM',   name:'ExxonMobil',      country:'US', archetype:'F', sector:'Oil & Gas',
    facilities:[
      { name:'Baytown Refinery TX',lat:29.7510,lng:-94.9810,  type:'refinery' },
      { name:'Beaumont Refinery', lat:30.0620,lng:-94.0820,   type:'refinery' },
    ]},
  { id:25, ticker:'CVX',   name:'Chevron',         country:'US', archetype:'F', sector:'Oil & Gas',
    facilities:[
      { name:'Pascagoula Refinery',lat:30.3570,lng:-88.5150,  type:'refinery' },
      { name:'El Segundo Refinery',lat:33.9100,lng:-118.4120, type:'refinery' },
    ]},
  { id:26, ticker:'SHEL',  name:'Shell',           country:'GB', archetype:'F', sector:'Oil & Gas',
    facilities:[{ name:'Pernis Refinery Rotterdam', lat:51.8800,lng:4.3890, type:'refinery', note:'유럽 최대' }]},

  // --- Steel / Materials ---
  { id:27, ticker:'005490', name:'POSCO홀딩스',     country:'KR', archetype:'A', sector:'Steel',
    facilities:[
      { name:'포항제철소',         lat:36.0190,lng:129.3640,  type:'steelworks' },
      { name:'광양제철소',         lat:34.7610,lng:127.7350,  type:'steelworks' },
    ]},
  { id:28, ticker:'MT',    name:'ArcelorMittal',   country:'LU', archetype:'A', sector:'Steel',
    facilities:[{ name:'Ghent Works Belgium', lat:51.0280,lng:3.7510, type:'steelworks' }]},

  // --- Automotive ---
  { id:29, ticker:'TM',    name:'Toyota',          country:'JP', archetype:'A', sector:'Auto',
    facilities:[
      { name:'Toyota City Plant', lat:35.0540,lng:137.1540,  type:'assembly' },
      { name:'Georgetown KY',    lat:38.2310,lng:-84.5090,   type:'assembly' },
    ]},
  { id:30, ticker:'VWAGY', name:'Volkswagen',      country:'DE', archetype:'A', sector:'Auto',
    facilities:[{ name:'Wolfsburg Plant', lat:52.4300,lng:10.7870, type:'assembly', note:'세계 최대 자동차 공장' }]},
  { id:31, ticker:'BMW',   name:'BMW',             country:'DE', archetype:'A', sector:'Auto',
    facilities:[
      { name:'Munich Plant',     lat:48.1790,lng:11.5570,   type:'assembly' },
      { name:'Spartanburg SC',   lat:34.9560,lng:-82.0490,  type:'assembly' },
    ]},
  { id:32, ticker:'F',     name:'Ford',            country:'US', archetype:'A', sector:'Auto',
    facilities:[{ name:'Rouge Complex MI', lat:42.2970,lng:-83.1510, type:'assembly' }]},
  { id:33, ticker:'005380', name:'현대자동차',      country:'KR', archetype:'A', sector:'Auto',
    facilities:[
      { name:'울산 공장',          lat:35.5390,lng:129.2770,  type:'assembly', note:'세계 최대 단일 자동차 공장' },
      { name:'Alabama Plant',    lat:32.5020,lng:-86.3890,   type:'assembly' },
    ]},

  // --- Logistics ---
  { id:34, ticker:'FDX',   name:'FedEx',           country:'US', archetype:'B', sector:'Logistics',
    facilities:[
      { name:'Memphis SuperHub',  lat:35.0420,lng:-89.9830,  type:'hub' },
      { name:'Indianapolis Hub',  lat:39.7170,lng:-86.2940,  type:'hub' },
    ]},
  { id:35, ticker:'UPS',   name:'UPS',             country:'US', archetype:'B', sector:'Logistics',
    facilities:[{ name:'Louisville Worldport', lat:38.1740,lng:-85.7360, type:'hub', note:'세계 최대 화물 터미널' }]},
  { id:36, ticker:'ZTO',   name:'ZTO Express',     country:'CN', archetype:'B', sector:'Logistics',
    facilities:[{ name:'Shanghai Sort Center', lat:31.1180,lng:121.3500, type:'sortcenter' }]},

  // --- Retail / Distribution ---
  { id:37, ticker:'WMT',   name:'Walmart',         country:'US', archetype:'C', sector:'Retail',
    facilities:[
      { name:'Bentonville DC',   lat:36.3730,lng:-94.2090,   type:'distribution' },
      { name:'Brooksville DC FL',lat:28.5550,lng:-82.3880,   type:'distribution' },
    ]},
  { id:38, ticker:'COST',  name:'Costco',          country:'US', archetype:'C', sector:'Retail',
    facilities:[{ name:'Issaquah HQ/DC', lat:47.5360,lng:-122.0390, type:'distribution' }]},
  { id:39, ticker:'JD',    name:'JD.com',          country:'CN', archetype:'C', sector:'E-Commerce',
    facilities:[
      { name:'Asia No.1 Shanghai',lat:31.2810,lng:121.1760,  type:'fulfillment' },
      { name:'Beijing HQ DC',    lat:39.8780,lng:116.5670,   type:'fulfillment' },
    ]},

  // --- Pharma ---
  { id:40, ticker:'PFE',   name:'Pfizer',          country:'US', archetype:'A', sector:'Pharma',
    facilities:[{ name:'Kalamazoo MI Plant', lat:42.2850,lng:-85.5630, type:'manufacturing' }]},
  { id:41, ticker:'JNJ',   name:'Johnson & Johnson',country:'US', archetype:'A', sector:'Pharma',
    facilities:[{ name:'Janssen Leiden NL', lat:52.1640,lng:4.4920, type:'manufacturing' }]},

  // --- Aerospace ---
  { id:42, ticker:'BA',    name:'Boeing',          country:'US', archetype:'A', sector:'Aerospace',
    facilities:[
      { name:'Everett Factory WA', lat:47.9240,lng:-122.2710, type:'assembly', note:'세계 최대 건물' },
      { name:'North Charleston SC',lat:32.8990,lng:-80.0390,  type:'assembly' },
    ]},
  { id:43, ticker:'AIR.PA',name:'Airbus',          country:'FR', archetype:'A', sector:'Aerospace',
    facilities:[
      { name:'Toulouse FAL',     lat:43.6280,lng:1.3730,     type:'assembly' },
      { name:'Hamburg FAL',      lat:53.5350,lng:9.8310,     type:'assembly' },
    ]},

  // --- Construction ---
  { id:44, ticker:'CAT',   name:'Caterpillar',     country:'US', archetype:'A', sector:'Construction Equipment',
    facilities:[{ name:'East Peoria IL', lat:40.6590,lng:-89.5440, type:'manufacturing' }]},

  // --- Mining ---
  { id:45, ticker:'BHP',   name:'BHP',             country:'AU', archetype:'F', sector:'Mining',
    facilities:[
      { name:'Olympic Dam',      lat:-30.4440,lng:136.8850,  type:'mine' },
      { name:'Escondida Chile',  lat:-24.2680,lng:-69.0720,  type:'mine', note:'세계 최대 구리 광산' },
    ]},
  { id:46, ticker:'RIO',   name:'Rio Tinto',       country:'AU', archetype:'F', sector:'Mining',
    facilities:[{ name:'Pilbara Iron WA', lat:-22.7230,lng:118.2840, type:'mine' }]},
  { id:47, ticker:'ALB',   name:'Albemarle',       country:'US', archetype:'F', sector:'Lithium',
    facilities:[{ name:'Salar Atacama Chile', lat:-23.5000,lng:-68.2500, type:'mine' }]},
  { id:48, ticker:'SQM',   name:'SQM',             country:'CL', archetype:'F', sector:'Lithium',
    facilities:[{ name:'Salar Atacama', lat:-23.4200,lng:-68.3300, type:'mine' }]},
  { id:49, ticker:'GLEN',  name:'Glencore',        country:'CH', archetype:'F', sector:'Mining/Trading',
    facilities:[{ name:'Collahuasi Chile', lat:-20.9800,lng:-68.6900, type:'mine' }]},
  { id:50, ticker:'FCX',   name:'Freeport-McMoRan',country:'US', archetype:'F', sector:'Copper',
    facilities:[{ name:'Grasberg Indonesia', lat:-4.0530,lng:137.1160, type:'mine', note:'세계 최대 금/구리 광산' }]},

  // ═══════════════════════════════════════════════
  // GLOBAL 50 (글로벌 확장)
  // ═══════════════════════════════════════════════
  // --- Semiconductor Extended ---
  { id:51, ticker:'LRCX',  name:'Lam Research',    country:'US', archetype:'A', sector:'Semiconductor Equipment', facilities:[{name:'Fremont CA',lat:37.5210,lng:-121.9560,type:'manufacturing'}]},
  { id:52, ticker:'AMAT',  name:'Applied Materials',country:'US', archetype:'A', sector:'Semiconductor Equipment', facilities:[{name:'Santa Clara CA',lat:37.3830,lng:-121.9720,type:'manufacturing'}]},
  { id:53, ticker:'TXN',   name:'Texas Instruments',country:'US', archetype:'A', sector:'Semiconductor', facilities:[{name:'RFAB Richardson TX',lat:32.9380,lng:-96.7430,type:'fab'}]},
  { id:54, ticker:'ADI',   name:'Analog Devices',  country:'US', archetype:'A', sector:'Semiconductor', facilities:[{name:'Wilmington MA',lat:42.5570,lng:-71.1510,type:'fab'}]},

  // --- EV / Battery Extended ---
  { id:55, ticker:'XPEV',  name:'XPeng',           country:'CN', archetype:'A', sector:'EV', facilities:[{name:'Zhaoqing Factory',lat:23.0470,lng:112.4570,type:'assembly'}]},
  { id:56, ticker:'9866',  name:'NIO (HK)',        country:'CN', archetype:'A', sector:'EV', facilities:[{name:'Hefei F2',lat:31.8730,lng:117.2530,type:'assembly'}]},
  { id:57, ticker:'051910', name:'LG화학',          country:'KR', archetype:'A', sector:'Chemical', facilities:[{name:'여수 공장',lat:34.7310,lng:127.7420,type:'chemical'}]},
  { id:58, ticker:'006400', name:'삼성SDI',         country:'KR', archetype:'A', sector:'Battery', facilities:[{name:'천안 공장',lat:36.8200,lng:127.1540,type:'battery'},{name:'Göd Hungary',lat:47.6870,lng:19.1280,type:'battery'}]},

  // --- Tech Data Centers ---
  { id:59, ticker:'ORCL',  name:'Oracle',          country:'US', archetype:'D', sector:'Cloud', facilities:[{name:'Phoenix DC',lat:33.4480,lng:-112.0740,type:'datacenter'}]},
  { id:60, ticker:'CRM',   name:'Salesforce',      country:'US', archetype:'D', sector:'Cloud', facilities:[{name:'SF HQ',lat:37.7900,lng:-122.3970,type:'office'}]},

  // --- Food & Agriculture ---
  { id:61, ticker:'ADM',   name:'ADM',             country:'US', archetype:'A', sector:'Agri', facilities:[{name:'Decatur IL Complex',lat:39.8440,lng:-88.9540,type:'processing'}]},
  { id:62, ticker:'BG',    name:'Bunge',           country:'US', archetype:'A', sector:'Agri', facilities:[{name:'Council Bluffs IA',lat:41.2290,lng:-95.8510,type:'processing'}]},

  // --- Energy ---
  { id:63, ticker:'NEE',   name:'NextEra Energy',  country:'US', archetype:'F', sector:'Renewables', facilities:[{name:'FPL Solar FL',lat:26.9820,lng:-80.1180,type:'solar'}]},
  { id:64, ticker:'ENPH',  name:'Enphase Energy',  country:'US', archetype:'A', sector:'Solar', facilities:[{name:'Peoria AZ',lat:33.5810,lng:-112.2370,type:'manufacturing'}]},
  { id:65, ticker:'FSLR',  name:'First Solar',     country:'US', archetype:'A', sector:'Solar', facilities:[{name:'Perrysburg OH',lat:41.5460,lng:-83.6420,type:'manufacturing'}]},

  // --- Japan ---
  { id:66, ticker:'7203',  name:'Toyota (JP)',     country:'JP', archetype:'A', sector:'Auto', facilities:[{name:'Tahara Plant',lat:34.6470,lng:137.0670,type:'assembly'}]},
  { id:67, ticker:'6758',  name:'Sony',            country:'JP', archetype:'A', sector:'Electronics', facilities:[{name:'Kumamoto Fab',lat:32.7820,lng:130.7410,type:'fab'}]},
  { id:68, ticker:'6861',  name:'Keyence',         country:'JP', archetype:'A', sector:'Factory Automation', facilities:[{name:'Osaka HQ',lat:34.7690,lng:135.4940,type:'manufacturing'}]},

  // --- Germany ---
  { id:69, ticker:'SIE.DE',name:'Siemens',         country:'DE', archetype:'A', sector:'Industrial', facilities:[{name:'Amberg Factory',lat:49.4430,lng:11.8520,type:'manufacturing',note:'디지털 트윈 공장'}]},
  { id:70, ticker:'BAS.DE',name:'BASF',            country:'DE', archetype:'A', sector:'Chemical', facilities:[{name:'Ludwigshafen',lat:49.4940,lng:8.4320,type:'chemical',note:'세계 최대 화학 단지'}]},

  // --- India ---
  { id:71, ticker:'TCS',   name:'TCS',             country:'IN', archetype:'D', sector:'IT Services', facilities:[{name:'Mumbai HQ',lat:19.0760,lng:72.8780,type:'office'}]},
  { id:72, ticker:'RELIANCE',name:'Reliance Industries',country:'IN', archetype:'F', sector:'Conglomerate', facilities:[{name:'Jamnagar Refinery',lat:22.3340,lng:70.0190,type:'refinery',note:'세계 최대 정유소'}]},

  // --- Korea Extended ---
  { id:73, ticker:'035420', name:'NAVER',           country:'KR', archetype:'D', sector:'Tech', facilities:[{name:'춘천 데이터센터',lat:37.9110,lng:127.7350,type:'datacenter'}]},
  { id:74, ticker:'035720', name:'카카오',           country:'KR', archetype:'D', sector:'Tech', facilities:[{name:'판교 오피스',lat:37.3940,lng:127.1110,type:'office'}]},
  { id:75, ticker:'066570', name:'LG전자',          country:'KR', archetype:'A', sector:'Electronics', facilities:[{name:'창원 공장',lat:35.2280,lng:128.6710,type:'manufacturing'}]},
  { id:76, ticker:'000270', name:'기아',            country:'KR', archetype:'A', sector:'Auto', facilities:[{name:'화성 공장',lat:37.1390,lng:126.8220,type:'assembly'},{name:'광주 공장',lat:35.1570,lng:126.7930,type:'assembly'}]},
  { id:77, ticker:'028260', name:'삼성물산',         country:'KR', archetype:'E', sector:'Construction', facilities:[{name:'서울 사무소',lat:37.5305,lng:127.0019,type:'office'}]},
  { id:78, ticker:'034730', name:'SK Inc.',         country:'KR', archetype:'A', sector:'Conglomerate', facilities:[{name:'서울 종로',lat:37.5700,lng:126.9830,type:'office'}]},
  { id:79, ticker:'012330', name:'현대모비스',       country:'KR', archetype:'A', sector:'Auto Parts', facilities:[{name:'울산 모듈공장',lat:35.5350,lng:129.3120,type:'manufacturing'}]},
  { id:80, ticker:'096770', name:'SK이노베이션',     country:'KR', archetype:'A', sector:'Battery', facilities:[{name:'서산 공장',lat:36.7980,lng:126.4590,type:'battery'}]},
  { id:81, ticker:'003670', name:'포스코퓨처엠',     country:'KR', archetype:'A', sector:'Materials', facilities:[{name:'광양 공장',lat:34.7600,lng:127.7130,type:'manufacturing'}]},
  { id:82, ticker:'009150', name:'삼성전기',         country:'KR', archetype:'A', sector:'Electronics', facilities:[{name:'부산 공장',lat:35.1120,lng:129.0260,type:'manufacturing'}]},

  // --- China Extended ---
  { id:83, ticker:'BABA',  name:'Alibaba',         country:'CN', archetype:'C', sector:'E-Commerce', facilities:[{name:'Hangzhou HQ',lat:30.2740,lng:120.0220,type:'office'},{name:'Cainiao Wuxi',lat:31.4920,lng:120.3120,type:'fulfillment'}]},
  { id:84, ticker:'PDD',   name:'PDD / Temu',      country:'CN', archetype:'C', sector:'E-Commerce', facilities:[{name:'Guangzhou Warehouse',lat:23.0490,lng:113.3940,type:'fulfillment'}]},
  { id:85, ticker:'600519', name:'Moutai',          country:'CN', archetype:'A', sector:'Liquor', facilities:[{name:'Maotai Town',lat:27.8540,lng:106.3880,type:'distillery'}]},

  // --- Taiwan Extended ---
  { id:86, ticker:'2317',  name:'Hon Hai/Foxconn', country:'TW', archetype:'A', sector:'EMS', facilities:[{name:'Zhengzhou Campus',lat:34.7190,lng:113.8550,type:'assembly',note:'iPhone City'}]},
  { id:87, ticker:'2330',  name:'TSMC (TW)',       country:'TW', archetype:'A', sector:'Semiconductor', facilities:[{name:'Fab 18 Phase 7',lat:23.0570,lng:120.2970,type:'fab'}]},

  // --- European ---
  { id:88, ticker:'NESN',  name:'Nestlé',          country:'CH', archetype:'A', sector:'Food', facilities:[{name:'Vevey HQ',lat:46.4620,lng:6.8440,type:'manufacturing'}]},
  { id:89, ticker:'MC.PA', name:'LVMH',            country:'FR', archetype:'A', sector:'Luxury', facilities:[{name:'Asnières Workshop Paris',lat:48.9140,lng:2.2840,type:'manufacturing'}]},
  { id:90, ticker:'SAP',   name:'SAP',             country:'DE', archetype:'D', sector:'Enterprise SW', facilities:[{name:'Walldorf HQ',lat:49.2940,lng:8.6420,type:'office'}]},

  // --- Others ---
  { id:91, ticker:'DIS',   name:'Disney',          country:'US', archetype:'E', sector:'Entertainment', facilities:[{name:'Walt Disney World FL',lat:28.3852,lng:-81.5639,type:'theme_park'}]},
  { id:92, ticker:'NKE',   name:'Nike',            country:'US', archetype:'A', sector:'Apparel', facilities:[{name:'Vietnam Factory',lat:10.9780,lng:106.6300,type:'manufacturing',operator:'contracted'}]},
  { id:93, ticker:'SBUX',  name:'Starbucks',       country:'US', archetype:'C', sector:'Food & Beverage', facilities:[{name:'Kent Roasting WA',lat:47.3810,lng:-122.2350,type:'processing'}]},
  { id:94, ticker:'V',     name:'Visa',            country:'US', archetype:'D', sector:'Fintech', facilities:[{name:'Ashburn DC VA',lat:39.0440,lng:-77.4880,type:'datacenter'}]},
  { id:95, ticker:'JPM',   name:'JPMorgan Chase',  country:'US', archetype:'D', sector:'Banking', facilities:[{name:'Plano TX DC',lat:33.0750,lng:-96.7450,type:'datacenter'}]},

  // --- Construction Under Observation ---
  { id:96, ticker:'NEOM',  name:'NEOM (비상장)',    country:'SA', archetype:'E', sector:'Megaproject', facilities:[{name:'NEOM The Line',lat:28.0070,lng:35.1470,type:'construction',underConstruction:true,note:'세계 최대 건설 프로젝트'}]},
  { id:97, ticker:'DHR',   name:'Danaher',         country:'US', archetype:'A', sector:'Life Sciences', facilities:[{name:'Washington DC HQ',lat:38.9050,lng:-77.0370,type:'manufacturing'}]},
  { id:98, ticker:'LIN',   name:'Linde',           country:'IE', archetype:'A', sector:'Industrial Gas', facilities:[{name:'Leuna Germany',lat:51.3170,lng:12.0150,type:'chemical'}]},
  { id:99, ticker:'DE',    name:'Deere & Company',  country:'US', archetype:'A', sector:'Agriculture Equipment', facilities:[{name:'Waterloo IA',lat:42.4930,lng:-92.3430,type:'manufacturing'}]},
  { id:100,ticker:'GRAB',  name:'Grab',            country:'SG', archetype:'D', sector:'Super App', facilities:[{name:'Singapore HQ',lat:1.2930,lng:103.8560,type:'office'}]},
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

module.exports = {
  ARCHETYPES,
  FLOW_TEMPLATES,
  PROFILES,
  STATS,
  getProfile,
  getByArchetype,
  getByCountry,
  getBySector,
  getUnderConstruction,
  getAllFacilities,
};
