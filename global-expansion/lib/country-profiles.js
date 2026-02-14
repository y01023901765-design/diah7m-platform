/**
 * DIAH-7M Country Profiles — 43개국 정의
 * ═══════════════════════════════════════════
 * 
 * OECD 38 + 싱가포르/홍콩/대만/인도 + 중국(위성전용) = 43개국
 * 
 * 각 국가별:
 *   - ISO 코드 (alpha-2, alpha-3)
 *   - World Bank / OECD / IMF 국가코드
 *   - 데이터 소스 우선순위
 *   - 주요 주가지수 (FMP 심볼)
 *   - 통화 코드
 *   - 위성 좌표 (수도 기준)
 */

'use strict';

// ═══════════════════════════════════════════
// 국가 프로필 정의
// ═══════════════════════════════════════════
const COUNTRIES = {
  // ────── 북미 ──────
  USA: {
    name: { en: 'United States', ko: '미국' },
    iso2: 'US', iso3: 'USA', wbCode: 'USA', oecdCode: 'USA', imfCode: 'US',
    region: 'north_america', currency: 'USD',
    stockIndex: '^GSPC', stockName: 'S&P 500',
    deepSource: 'FRED', // 심층 데이터 소스 (향후)
    satellite: { lat: 38.9072, lon: -77.0369 }, // Washington DC
    tier: 'deep_ready', // deep_ready | light | satellite_only
  },
  CAN: {
    name: { en: 'Canada', ko: '캐나다' },
    iso2: 'CA', iso3: 'CAN', wbCode: 'CAN', oecdCode: 'CAN', imfCode: 'CA',
    region: 'north_america', currency: 'CAD',
    stockIndex: '^GSPTSE', stockName: 'TSX',
    satellite: { lat: 45.4215, lon: -75.6972 },
    tier: 'light',
  },
  MEX: {
    name: { en: 'Mexico', ko: '멕시코' },
    iso2: 'MX', iso3: 'MEX', wbCode: 'MEX', oecdCode: 'MEX', imfCode: 'MX',
    region: 'north_america', currency: 'MXN',
    stockIndex: '^MXX', stockName: 'IPC',
    satellite: { lat: 19.4326, lon: -99.1332 },
    tier: 'light',
  },

  // ────── 동아시아 ──────
  KOR: {
    name: { en: 'South Korea', ko: '대한민국' },
    iso2: 'KR', iso3: 'KOR', wbCode: 'KOR', oecdCode: 'KOR', imfCode: 'KR',
    region: 'east_asia', currency: 'KRW',
    stockIndex: '^KS11', stockName: 'KOSPI',
    deepSource: 'ECOS', // 한국은행 — 이미 구축 완료
    satellite: { lat: 37.5665, lon: 126.978 },
    tier: 'deep', // 59게이지 심층 진단 가동 중
  },
  JPN: {
    name: { en: 'Japan', ko: '일본' },
    iso2: 'JP', iso3: 'JPN', wbCode: 'JPN', oecdCode: 'JPN', imfCode: 'JP',
    region: 'east_asia', currency: 'JPY',
    stockIndex: '^N225', stockName: 'Nikkei 225',
    deepSource: 'ESTAT', // e-Stat (향후)
    satellite: { lat: 35.6762, lon: 139.6503 },
    tier: 'deep_ready',
  },

  // ────── 서유럽 ──────
  DEU: {
    name: { en: 'Germany', ko: '독일' },
    iso2: 'DE', iso3: 'DEU', wbCode: 'DEU', oecdCode: 'DEU', imfCode: 'DE',
    region: 'western_europe', currency: 'EUR',
    stockIndex: '^GDAXI', stockName: 'DAX',
    deepSource: 'EUROSTAT',
    satellite: { lat: 52.52, lon: 13.405 },
    tier: 'deep_ready',
  },
  GBR: {
    name: { en: 'United Kingdom', ko: '영국' },
    iso2: 'GB', iso3: 'GBR', wbCode: 'GBR', oecdCode: 'GBR', imfCode: 'GB',
    region: 'western_europe', currency: 'GBP',
    stockIndex: '^FTSE', stockName: 'FTSE 100',
    deepSource: 'ONS',
    satellite: { lat: 51.5074, lon: -0.1278 },
    tier: 'deep_ready',
  },
  FRA: {
    name: { en: 'France', ko: '프랑스' },
    iso2: 'FR', iso3: 'FRA', wbCode: 'FRA', oecdCode: 'FRA', imfCode: 'FR',
    region: 'western_europe', currency: 'EUR',
    stockIndex: '^FCHI', stockName: 'CAC 40',
    deepSource: 'EUROSTAT',
    satellite: { lat: 48.8566, lon: 2.3522 },
    tier: 'light',
  },
  ITA: {
    name: { en: 'Italy', ko: '이탈리아' },
    iso2: 'IT', iso3: 'ITA', wbCode: 'ITA', oecdCode: 'ITA', imfCode: 'IT',
    region: 'western_europe', currency: 'EUR',
    stockIndex: 'FTSEMIB.MI', stockName: 'FTSE MIB',
    satellite: { lat: 41.9028, lon: 12.4964 },
    tier: 'light',
  },
  ESP: {
    name: { en: 'Spain', ko: '스페인' },
    iso2: 'ES', iso3: 'ESP', wbCode: 'ESP', oecdCode: 'ESP', imfCode: 'ES',
    region: 'western_europe', currency: 'EUR',
    stockIndex: '^IBEX', stockName: 'IBEX 35',
    satellite: { lat: 40.4168, lon: -3.7038 },
    tier: 'light',
  },
  NLD: {
    name: { en: 'Netherlands', ko: '네덜란드' },
    iso2: 'NL', iso3: 'NLD', wbCode: 'NLD', oecdCode: 'NLD', imfCode: 'NL',
    region: 'western_europe', currency: 'EUR',
    stockIndex: '^AEX', stockName: 'AEX',
    satellite: { lat: 52.3676, lon: 4.9041 },
    tier: 'light',
  },
  BEL: {
    name: { en: 'Belgium', ko: '벨기에' },
    iso2: 'BE', iso3: 'BEL', wbCode: 'BEL', oecdCode: 'BEL', imfCode: 'BE',
    region: 'western_europe', currency: 'EUR',
    stockIndex: '^BFX', stockName: 'BEL 20',
    satellite: { lat: 50.8503, lon: 4.3517 },
    tier: 'light',
  },
  LUX: {
    name: { en: 'Luxembourg', ko: '룩셈부르크' },
    iso2: 'LU', iso3: 'LUX', wbCode: 'LUX', oecdCode: 'LUX', imfCode: 'LU',
    region: 'western_europe', currency: 'EUR',
    satellite: { lat: 49.6116, lon: 6.1319 },
    tier: 'light',
  },
  CHE: {
    name: { en: 'Switzerland', ko: '스위스' },
    iso2: 'CH', iso3: 'CHE', wbCode: 'CHE', oecdCode: 'CHE', imfCode: 'CH',
    region: 'western_europe', currency: 'CHF',
    stockIndex: '^SSMI', stockName: 'SMI',
    satellite: { lat: 46.9481, lon: 7.4474 },
    tier: 'light',
  },
  AUT: {
    name: { en: 'Austria', ko: '오스트리아' },
    iso2: 'AT', iso3: 'AUT', wbCode: 'AUT', oecdCode: 'AUT', imfCode: 'AT',
    region: 'western_europe', currency: 'EUR',
    stockIndex: '^ATX', stockName: 'ATX',
    satellite: { lat: 48.2082, lon: 16.3738 },
    tier: 'light',
  },
  IRL: {
    name: { en: 'Ireland', ko: '아일랜드' },
    iso2: 'IE', iso3: 'IRL', wbCode: 'IRL', oecdCode: 'IRL', imfCode: 'IE',
    region: 'western_europe', currency: 'EUR',
    satellite: { lat: 53.3498, lon: -6.2603 },
    tier: 'light',
  },
  PRT: {
    name: { en: 'Portugal', ko: '포르투갈' },
    iso2: 'PT', iso3: 'PRT', wbCode: 'PRT', oecdCode: 'PRT', imfCode: 'PT',
    region: 'western_europe', currency: 'EUR',
    satellite: { lat: 38.7223, lon: -9.1393 },
    tier: 'light',
  },
  GRC: {
    name: { en: 'Greece', ko: '그리스' },
    iso2: 'GR', iso3: 'GRC', wbCode: 'GRC', oecdCode: 'GRC', imfCode: 'GR',
    region: 'western_europe', currency: 'EUR',
    satellite: { lat: 37.9838, lon: 23.7275 },
    tier: 'light',
  },

  // ────── 북유럽 ──────
  SWE: {
    name: { en: 'Sweden', ko: '스웨덴' },
    iso2: 'SE', iso3: 'SWE', wbCode: 'SWE', oecdCode: 'SWE', imfCode: 'SE',
    region: 'nordic', currency: 'SEK',
    stockIndex: '^OMX', stockName: 'OMX Stockholm',
    satellite: { lat: 59.3293, lon: 18.0686 },
    tier: 'light',
  },
  NOR: {
    name: { en: 'Norway', ko: '노르웨이' },
    iso2: 'NO', iso3: 'NOR', wbCode: 'NOR', oecdCode: 'NOR', imfCode: 'NO',
    region: 'nordic', currency: 'NOK',
    satellite: { lat: 59.9139, lon: 10.7522 },
    tier: 'light',
  },
  DNK: {
    name: { en: 'Denmark', ko: '덴마크' },
    iso2: 'DK', iso3: 'DNK', wbCode: 'DNK', oecdCode: 'DNK', imfCode: 'DK',
    region: 'nordic', currency: 'DKK',
    satellite: { lat: 55.6761, lon: 12.5683 },
    tier: 'light',
  },
  FIN: {
    name: { en: 'Finland', ko: '핀란드' },
    iso2: 'FI', iso3: 'FIN', wbCode: 'FIN', oecdCode: 'FIN', imfCode: 'FI',
    region: 'nordic', currency: 'EUR',
    satellite: { lat: 60.1699, lon: 24.9384 },
    tier: 'light',
  },
  ISL: {
    name: { en: 'Iceland', ko: '아이슬란드' },
    iso2: 'IS', iso3: 'ISL', wbCode: 'ISL', oecdCode: 'ISL', imfCode: 'IS',
    region: 'nordic', currency: 'ISK',
    satellite: { lat: 64.1466, lon: -21.9426 },
    tier: 'light',
  },

  // ────── 동유럽 ──────
  POL: {
    name: { en: 'Poland', ko: '폴란드' },
    iso2: 'PL', iso3: 'POL', wbCode: 'POL', oecdCode: 'POL', imfCode: 'PL',
    region: 'eastern_europe', currency: 'PLN',
    stockIndex: '^WIG20', stockName: 'WIG 20',
    satellite: { lat: 52.2297, lon: 21.0122 },
    tier: 'light',
  },
  CZE: {
    name: { en: 'Czech Republic', ko: '체코' },
    iso2: 'CZ', iso3: 'CZE', wbCode: 'CZE', oecdCode: 'CZE', imfCode: 'CZ',
    region: 'eastern_europe', currency: 'CZK',
    satellite: { lat: 50.0755, lon: 14.4378 },
    tier: 'light',
  },
  HUN: {
    name: { en: 'Hungary', ko: '헝가리' },
    iso2: 'HU', iso3: 'HUN', wbCode: 'HUN', oecdCode: 'HUN', imfCode: 'HU',
    region: 'eastern_europe', currency: 'HUF',
    satellite: { lat: 47.4979, lon: 19.0402 },
    tier: 'light',
  },
  SVK: {
    name: { en: 'Slovakia', ko: '슬로바키아' },
    iso2: 'SK', iso3: 'SVK', wbCode: 'SVK', oecdCode: 'SVK', imfCode: 'SK',
    region: 'eastern_europe', currency: 'EUR',
    satellite: { lat: 48.1486, lon: 17.1077 },
    tier: 'light',
  },
  SVN: {
    name: { en: 'Slovenia', ko: '슬로베니아' },
    iso2: 'SI', iso3: 'SVN', wbCode: 'SVN', oecdCode: 'SVN', imfCode: 'SI',
    region: 'eastern_europe', currency: 'EUR',
    satellite: { lat: 46.0569, lon: 14.5058 },
    tier: 'light',
  },
  EST: {
    name: { en: 'Estonia', ko: '에스토니아' },
    iso2: 'EE', iso3: 'EST', wbCode: 'EST', oecdCode: 'EST', imfCode: 'EE',
    region: 'eastern_europe', currency: 'EUR',
    satellite: { lat: 59.437, lon: 24.7536 },
    tier: 'light',
  },
  LVA: {
    name: { en: 'Latvia', ko: '라트비아' },
    iso2: 'LV', iso3: 'LVA', wbCode: 'LVA', oecdCode: 'LVA', imfCode: 'LV',
    region: 'eastern_europe', currency: 'EUR',
    satellite: { lat: 56.9496, lon: 24.1052 },
    tier: 'light',
  },
  LTU: {
    name: { en: 'Lithuania', ko: '리투아니아' },
    iso2: 'LT', iso3: 'LTU', wbCode: 'LTU', oecdCode: 'LTU', imfCode: 'LT',
    region: 'eastern_europe', currency: 'EUR',
    satellite: { lat: 54.6872, lon: 25.2797 },
    tier: 'light',
  },

  // ────── 오세아니아 ──────
  AUS: {
    name: { en: 'Australia', ko: '호주' },
    iso2: 'AU', iso3: 'AUS', wbCode: 'AUS', oecdCode: 'AUS', imfCode: 'AU',
    region: 'oceania', currency: 'AUD',
    stockIndex: '^AXJO', stockName: 'ASX 200',
    satellite: { lat: -35.2809, lon: 149.13 },
    tier: 'light',
  },
  NZL: {
    name: { en: 'New Zealand', ko: '뉴질랜드' },
    iso2: 'NZ', iso3: 'NZL', wbCode: 'NZL', oecdCode: 'NZL', imfCode: 'NZ',
    region: 'oceania', currency: 'NZD',
    satellite: { lat: -41.2865, lon: 174.7762 },
    tier: 'light',
  },

  // ────── 남미 ──────
  CHL: {
    name: { en: 'Chile', ko: '칠레' },
    iso2: 'CL', iso3: 'CHL', wbCode: 'CHL', oecdCode: 'CHL', imfCode: 'CL',
    region: 'south_america', currency: 'CLP',
    satellite: { lat: -33.4489, lon: -70.6693 },
    tier: 'light',
  },
  COL: {
    name: { en: 'Colombia', ko: '콜롬비아' },
    iso2: 'CO', iso3: 'COL', wbCode: 'COL', oecdCode: 'COL', imfCode: 'CO',
    region: 'south_america', currency: 'COP',
    satellite: { lat: 4.711, lon: -74.0721 },
    tier: 'light',
  },
  CRI: {
    name: { en: 'Costa Rica', ko: '코스타리카' },
    iso2: 'CR', iso3: 'CRI', wbCode: 'CRI', oecdCode: 'CRI', imfCode: 'CR',
    region: 'south_america', currency: 'CRC',
    satellite: { lat: 9.9281, lon: -84.0907 },
    tier: 'light',
  },

  // ────── 중동 ──────
  ISR: {
    name: { en: 'Israel', ko: '이스라엘' },
    iso2: 'IL', iso3: 'ISR', wbCode: 'ISR', oecdCode: 'ISR', imfCode: 'IL',
    region: 'middle_east', currency: 'ILS',
    stockIndex: '^TA125.TA', stockName: 'TA-125',
    satellite: { lat: 31.7683, lon: 35.2137 },
    tier: 'light',
  },
  TUR: {
    name: { en: 'Türkiye', ko: '튀르키예' },
    iso2: 'TR', iso3: 'TUR', wbCode: 'TUR', oecdCode: 'TUR', imfCode: 'TR',
    region: 'middle_east', currency: 'TRY',
    stockIndex: 'XU100.IS', stockName: 'BIST 100',
    satellite: { lat: 39.9334, lon: 32.8597 },
    tier: 'light',
  },

  // ════════════════════════════════
  // 비-OECD 추가 4+1 국가
  // ════════════════════════════════

  SGP: {
    name: { en: 'Singapore', ko: '싱가포르' },
    iso2: 'SG', iso3: 'SGP', wbCode: 'SGP', oecdCode: null, imfCode: 'SG',
    region: 'southeast_asia', currency: 'SGD',
    stockIndex: '^STI', stockName: 'STI',
    localApi: 'MAS', // api.mas.gov.sg
    satellite: { lat: 1.3521, lon: 103.8198 },
    tier: 'light',
  },
  HKG: {
    name: { en: 'Hong Kong', ko: '홍콩' },
    iso2: 'HK', iso3: 'HKG', wbCode: 'HKG', oecdCode: null, imfCode: 'HK',
    region: 'east_asia', currency: 'HKD',
    stockIndex: '^HSI', stockName: 'Hang Seng',
    localApi: 'HKMA', // api.hkma.gov.hk
    satellite: { lat: 22.3193, lon: 114.1694 },
    tier: 'light',
  },
  TWN: {
    name: { en: 'Taiwan', ko: '대만' },
    iso2: 'TW', iso3: 'TWN', wbCode: null, oecdCode: null, imfCode: 'TW',
    region: 'east_asia', currency: 'TWD',
    stockIndex: '^TWII', stockName: 'TAIEX',
    localApi: 'DGBAS',
    satellite: { lat: 25.033, lon: 121.5654 },
    tier: 'light',
    note: 'World Bank에서 TWN 코드 없음 → IMF + 자체 API 사용',
  },
  IND: {
    name: { en: 'India', ko: '인도' },
    iso2: 'IN', iso3: 'IND', wbCode: 'IND', oecdCode: null, imfCode: 'IN',
    region: 'south_asia', currency: 'INR',
    stockIndex: '^BSESN', stockName: 'SENSEX',
    localApi: 'RBI', // data.gov.in
    satellite: { lat: 28.6139, lon: 77.209 },
    tier: 'light',
  },

  // ────── 중국 (위성 전용) ──────
  CHN: {
    name: { en: 'China', ko: '중국' },
    iso2: 'CN', iso3: 'CHN', wbCode: 'CHN', oecdCode: null, imfCode: 'CN',
    region: 'east_asia', currency: 'CNY',
    stockIndex: '000001.SS', stockName: 'Shanghai Composite',
    satellite: { lat: 39.9042, lon: 116.4074 },
    tier: 'satellite_only', // 공식지표 불신뢰 → 위성 데이터만 사용
    note: '중국 공식 경제지표 신뢰도 문제 → 위성 물리 측정으로만 진단',
  },
};


// ═══════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════

/** 전체 국가 수 */
const COUNTRY_COUNT = Object.keys(COUNTRIES).length;

/** OECD 회원국만 */
const OECD_MEMBERS = Object.entries(COUNTRIES)
  .filter(([, c]) => c.oecdCode)
  .map(([code]) => code);

/** World Bank 코드 보유국 */
const WB_COUNTRIES = Object.entries(COUNTRIES)
  .filter(([, c]) => c.wbCode)
  .map(([code]) => code);

/** 위성 전용 국가 */
const SATELLITE_ONLY = Object.entries(COUNTRIES)
  .filter(([, c]) => c.tier === 'satellite_only')
  .map(([code]) => code);

/** 심층 진단 가능 국가 */
const DEEP_COUNTRIES = Object.entries(COUNTRIES)
  .filter(([, c]) => c.tier === 'deep' || c.tier === 'deep_ready')
  .map(([code]) => code);

/** ISO3 코드로 국가 찾기 */
function getCountry(iso3) {
  return COUNTRIES[iso3] || null;
}

/** World Bank API용 국가코드 문자열 (세미콜론 구분) */
function getWBCountryString(iso3List) {
  return iso3List
    .map(c => COUNTRIES[c]?.wbCode)
    .filter(Boolean)
    .join(';');
}

/** OECD API용 국가코드 문자열 (+ 구분) */
function getOECDCountryString(iso3List) {
  return iso3List
    .map(c => COUNTRIES[c]?.oecdCode)
    .filter(Boolean)
    .join('+');
}

/** 지역별 그룹핑 */
function groupByRegion() {
  const groups = {};
  for (const [code, country] of Object.entries(COUNTRIES)) {
    const r = country.region;
    if (!groups[r]) groups[r] = [];
    groups[r].push(code);
  }
  return groups;
}

module.exports = {
  COUNTRIES,
  COUNTRY_COUNT,
  OECD_MEMBERS,
  WB_COUNTRIES,
  SATELLITE_ONLY,
  DEEP_COUNTRIES,
  getCountry,
  getWBCountryString,
  getOECDCountryString,
  groupByRegion,
};
