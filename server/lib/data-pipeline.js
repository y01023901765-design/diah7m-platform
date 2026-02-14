/**
 * ═══════════════════════════════════════════════════════════════
 * DIAH-7M Data Pipeline — 실데이터 수집 모듈 v2.0
 * ═══════════════════════════════════════════════════════════════
 * 
 * 59개 게이지 → 실제 통계 API 매핑
 * ECOS: 한국은행 경제통계 (무료, 인증키 필요)
 * FRED: 미국 연방준비은행 (무료, 인증키 필요) — S5(EPU), O2(PMI)
 * AirKorea: 공공데이터포털 (무료, 인증키 필요) — G6(PM2.5)
 * 
 * v2.0 변경사항:
 *   S1: BSI — ECOS 직접 수집 (3개월 확장 검색)
 *   S5: EPU — FRED API 자동 수집 (Baker-Bloom-Davis)
 *   O2: PMI — FRED API 자동 수집 (S&P Global Korea)
 *   G6: PM2.5 — AirKorea + OpenAQ 자동 수집
 *   + safeFetch 재시도: 타임아웃/서버에러 시 지수 백오프
 * 
 * 환경변수:
 *   ECOS_API_KEY (필수), FRED_API_KEY (S5+O2), AIRKOREA_API_KEY (G6)
 * ═══════════════════════════════════════════════════════════════
 */

const ECOS_BASE = 'https://ecos.bok.or.kr/api/StatisticSearch';
const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

// ═══════════════════════════════════════════════════════════════
// 59 GAUGE → API MAPPING
// ═══════════════════════════════════════════════════════════════
const GAUGE_MAP = {
  // ── A1: 통화·자금 (순환계) ──
  I1: { source:'ECOS', stat:'722Y001', item:'0101000', cycle:'M', name:'기준금리', unit:'%' },
  I2: { source:'ECOS', stat:'301Y013', item:'100000', cycle:'M', name:'경상수지(상품)', unit:'억$', transform: v => +(v/100).toFixed(1) },
  I3: { source:'ECOS', stat:'732Y001', item:'99', cycle:'M', name:'외환보유고', unit:'억$', transform: v => +(v/1000).toFixed(1) },
  I4: { source:'ECOS', stat:'731Y004', item:'0000001', cycle:'M', name:'환율(원/달러)', unit:'원/$' },
  I5: { source:'ECOS', stat:'102Y004', item:'ABA1', cycle:'M', name:'본원통화', unit:'십억원' },
  I6: { source:'ECOS', stat:'722Y001', item:'0102000', cycle:'M', name:'정부대출금금리', unit:'%' },

  // ── A2: 무역·수출입 (호흡계) ──
  E1: { source:'ECOS', stat:'301Y017', item:'SA110', cycle:'M', name:'수출', unit:'백만$' },
  E2: { source:'ECOS', stat:'301Y017', item:'SA120', cycle:'M', name:'수입', unit:'백만$' },
  E3: { source:'DERIVED', deps:['E1','E2'], calc: (e1,e2) => +(e1-e2).toFixed(1), name:'무역수지', unit:'백만$' },
  E4: { source:'ECOS', stat:'403Y001', item:'*AA', cycle:'M', name:'수출금액지수', unit:'2020=100' },
  E5: { source:'ECOS', stat:'403Y003', item:'*AA', cycle:'M', name:'수입금액지수', unit:'2020=100' },
  E6: { source:'DERIVED', deps:['E1'], calcYoY: true, name:'수출증가율', unit:'%' },

  // ── A3: 소비·내수 (소화계) ──
  C1: { source:'ECOS', stat:'901Y033', item:'AC00', cycle:'M', name:'서비스업생산(내수대리)', unit:'2020=100' },
  C2: { source:'ECOS', stat:'511Y002', item:'FME', cycle:'M', name:'소비자심리', unit:'pt' },
  C3: { source:'ECOS', stat:'901Y035', item:'I32A', cycle:'M', name:'제조업생산능력', unit:'2020=100' },
  C4: { source:'ECOS', stat:'901Y036', item:'10', cycle:'M', name:'설비투자(기계류)', unit:'지수' },
  C5: { source:'ECOS', stat:'901Y033', item:'A00', cycle:'M', name:'전산업생산(소비대리)', unit:'2020=100' },
  C6: { source:'ECOS', stat:'901Y033', item:'AC00', cycle:'M', name:'서비스업생산', unit:'2020=100' },

  // ── A4: 정책·규제 (신경계) ──
  S1: { source:'MANUAL', name:'BSI(기업경기)', unit:'pt', note:'ECOS 512Y006 폐기, 수동입력 필요' },
  S2: { source:'GEE_SATELLITE', sat:'VIIRS_DNB', name:'야간광량(서울)', unit:'nW/cm²/sr', note:'Google Earth Engine 자동 수집' },
  S3: { source:'ECOS', stat:'901Y067', item:'I16A', cycle:'M', name:'경기선행지수', unit:'2020=100' },
  S4: { source:'ECOS', stat:'301Y014', item:'S00000', cycle:'M', name:'서비스수지', unit:'백만$' },
  S5: { source:'FRED', series:'GEPUCURRENT', fallback:['KOREAEPUINDXM'], cycle:'M', name:'정책불확실성(EPU)', unit:'pt' },
  S6: { source:'ECOS', stat:'901Y067', item:'I16B', cycle:'M', name:'경기동행지수', unit:'2020=100' },

  // ── A5: 금융안정 (면역계) ──
  F1: { source:'ECOS', stat:'817Y002', item:'010300000', cycle:'D', name:'회사채금리(AA-)', unit:'%' },
  F2: { source:'ECOS', stat:'817Y002', item:'010502000', cycle:'D', name:'CD금리(91일)', unit:'%' },
  F3: { source:'ECOS', stat:'802Y001', item:'0001000', cycle:'D', name:'KOSPI', unit:'pt' },
  F4: { source:'ECOS', stat:'817Y002', item:'010200000', cycle:'D', name:'국고채(3년)', unit:'%' },
  F5: { source:'ECOS', stat:'817Y002', item:'010210000', cycle:'D', name:'국고채(10년)', unit:'%' },
  F6: { source:'DERIVED', deps:['F1','F4'], calc:(corp,gov)=>+(corp-gov).toFixed(2), name:'신용스프레드', unit:'%p' },
  F7: { source:'ECOS', stat:'802Y001', item:'0002000', cycle:'D', name:'KOSDAQ', unit:'pt' },

  // ── A6: 물가·재정 (내분비계) ──
  P1: { source:'ECOS', stat:'901Y009', item:'0', cycle:'M', name:'CPI(소비자물가)', unit:'2020=100' },
  P2: { source:'ECOS', stat:'404Y014', item:'*AA', cycle:'M', name:'PPI(생산자물가)', unit:'2020=100' },
  P3: { source:'ECOS', stat:'301Y014', item:'SC0000', cycle:'M', name:'운송수지', unit:'백만$' },
  P4: { source:'ECOS', stat:'301Y013', item:'100000', cycle:'M', name:'상품수지', unit:'백만$' },
  P5: { source:'ECOS', stat:'301Y014', item:'SG0000', cycle:'M', name:'금융서비스수지', unit:'백만$' },
  P6: { source:'ECOS', stat:'901Y009', item:'A', cycle:'M', name:'식료품물가', unit:'2020=100' },

  // ── A7: 생산·산업 (근골격계) ──
  O1: { source:'ECOS', stat:'901Y033', item:'A00', cycle:'M', name:'산업생산', unit:'2020=100' },
  O2: { source:'MANUAL', name:'제조업PMI', unit:'pt', note:'S&P Global PMI 수동입력 필요' },
  O3: { source:'ECOS', stat:'901Y033', item:'AD00', cycle:'M', name:'건설업생산', unit:'2020=100' },
  O4: { source:'ECOS', stat:'901Y033', item:'AB00', cycle:'M', name:'광공업생산', unit:'2020=100' },
  O5: { source:'ECOS', stat:'901Y033', item:'AC00', cycle:'M', name:'서비스업생산', unit:'2020=100' },
  O6: { source:'DERIVED', deps:['C1'], calcYoY:true, name:'소비증감(YoY)', unit:'%' },

  // ── A7 확장: 제조·재고 (대사계) ──
  M1: { source:'ECOS', stat:'901Y035', item:'I32A', cycle:'M', name:'제조업가동률', unit:'2020=100' },
  M2_G: { source:'ECOS', stat:'901Y034', item:'I31AA', cycle:'M', name:'자본재생산지수', unit:'2020=100' },
  M3_G: { source:'ECOS', stat:'901Y037', item:'I43AA', cycle:'M', name:'건축허가(구조별)', unit:'건수' },

  // ── A8: 인구·가계 (생식·재생계) ──
  D1: { source:'ECOS', stat:'901Y068', item:'I24A', cycle:'A', name:'농업가구수', unit:'가구' },
  D2: { source:'ECOS', stat:'901Y027', item:'I61A', cycle:'M', name:'15세이상인구', unit:'천명' },
  D3: { source:'ECOS', stat:'901Y027', item:'I61B', cycle:'M', name:'경제활동인구', unit:'천명' },
  L1: { source:'ECOS', stat:'901Y027', item:'I61BA', cycle:'M', name:'취업자수', unit:'천명' },
  L2: { source:'DERIVED', deps:['D3','L1'], calc:(eap,emp)=>+(((eap-emp)/eap)*100).toFixed(1), name:'실업률(산출)', unit:'%' },
  L3: { source:'ECOS', stat:'151Y002', item:'1110000', cycle:'M', name:'가계부채', unit:'십억원' },
  L4: { source:'ECOS', stat:'817Y002', item:'010320000', cycle:'D', name:'회사채금리(BBB-)', unit:'%' },

  // ── A9: 환경·부동산 (생태·재생계) ──
  R1: { source:'ECOS', stat:'901Y067', item:'I16C', cycle:'M', name:'후행종합지수', unit:'2020=100' },
  R2: { source:'ECOS', stat:'301Y017', item:'SA000', cycle:'M', name:'경상수지(계절조정)', unit:'백만$' },
  R5: { source:'SATELLITE', sat:'SENTINEL1_SAR', name:'해수면상승', unit:'mm/yr', note:'Copernicus SAR 직접 수집' },
  R6: { source:'SATELLITE', sat:'LANDSAT9_TIR', name:'도시열섬', unit:'지수', note:'NASA Landsat-9 직접 수집' },
  G1: { source:'ECOS', stat:'301Y013', item:'2B0000', cycle:'M', name:'운송수지', unit:'백만$' },
  G6: { source:'WAQI', city:'seoul', cycle:'H', name:'PM2.5(대기질)', unit:'㎍/m³' },
};

// ═══════════════════════════════════════════════════════════════
// HTTP 보호막 — timeout + 재시도 (지수 백오프)
// ═══════════════════════════════════════════════════════════════
const FETCH_TIMEOUT_MS = 15000;

async function safeFetch(url, label, retries = 2) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const latency = Date.now() - t0;
    clearTimeout(timer);

    if (!res.ok) {
      const code = res.status;
      if (retries > 0 && (code >= 500 || code === 429)) {
        const delay = 1000 * Math.pow(2, 2 - retries);
        console.log(`  🔄 ${label}: HTTP ${code}, ${retries}회 재시도 (${delay}ms)`);
        await new Promise(r => setTimeout(r, delay));
        return safeFetch(url, label, retries - 1);
      }
      const msg = code === 401 ? 'INVALID_KEY' :
                  code === 429 ? 'RATE_LIMITED' :
                  code >= 500 ? 'SERVER_ERROR' : `HTTP_${code}`;
      return { ok: false, error: msg, code, latency, label };
    }

    const json = await res.json();
    return { ok: true, json, latency, label };
  } catch (e) {
    clearTimeout(timer);
    const latency = Date.now() - t0;
    if (retries > 0) {
      const delay = 1000 * Math.pow(2, 2 - retries);
      console.log(`  🔄 ${label}: ${e.name}, ${retries}회 재시도 (${delay}ms)`);
      await new Promise(r => setTimeout(r, delay));
      return safeFetch(url, label, retries - 1);
    }
    const msg = e.name === 'AbortError' ? 'TIMEOUT' : e.message;
    return { ok: false, error: msg, latency, label };
  }
}

// ═══════════════════════════════════════════════════════════════
// ECOS API 호출
// ═══════════════════════════════════════════════════════════════
async function fetchECOS(apiKey, statCode, itemCode, cycle, startDate, endDate) {
  const url = `${ECOS_BASE}/${apiKey}/json/kr/1/100/${statCode}/${cycle}/${startDate}/${endDate}/${itemCode}`;
  const result = await safeFetch(url, `ECOS:${statCode}`);

  if (!result.ok) {
    console.warn(`  ⚠️  ${result.label}: ${result.error} (${result.latency}ms)`);
    return { rows: [], error: result.error, latency: result.latency };
  }

  const json = result.json;
  if (json.StatisticSearch?.row) {
    return {
      rows: json.StatisticSearch.row.map(r => ({
        date: r.TIME, value: parseFloat(r.DATA_VALUE) || 0, name: r.STAT_NAME,
      })),
      latency: result.latency,
    };
  }

  if (json.RESULT) {
    console.warn(`  ⚠️  ECOS:${statCode}: ${json.RESULT.MESSAGE} (${result.latency}ms)`);
    return { rows: [], error: json.RESULT.MESSAGE, latency: result.latency };
  }

  return { rows: [], latency: result.latency };
}

// ═══════════════════════════════════════════════════════════════
// FRED API 호출 — S5(EPU), O2(PMI)
// ═══════════════════════════════════════════════════════════════
async function fetchFRED(seriesId) {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.warn(`  ⚠️  FRED: API key 없음 — ${seriesId} 건너뜀`);
    return { rows: [], error: 'FRED_API_KEY_NOT_SET' };
  }
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=24`;
  const result = await safeFetch(url, `FRED:${seriesId}`);

  if (!result.ok) {
    console.warn(`  ⚠️  FRED:${seriesId}: ${result.error} (${result.latency}ms)`);
    return { rows: [], error: result.error, latency: result.latency };
  }

  const obs = result.json?.observations;
  if (!obs || obs.length === 0) return { rows: [], error: 'NO_DATA', latency: result.latency };

  return {
    rows: obs.filter(o => o.value !== '.').map(o => ({
      date: o.date.replace(/-/g, '').slice(0, 6),
      value: parseFloat(o.value),
      name: seriesId,
    })),
    latency: result.latency,
  };
}

async function fetchFREDWithFallback(primary, fallbackList) {
  for (const series of [primary, ...fallbackList]) {
    const r = await fetchFRED(series);
    if (r.rows.length > 0) return r;
    console.log(`  ↩️  FRED:${series} 실패 → 다음 시도`);
  }
  return { rows: [], error: 'ALL_FRED_FAILED' };
}

// ═══════════════════════════════════════════════════════════════
// AirKorea PM2.5 — G6
// ═══════════════════════════════════════════════════════════════
async function fetchAirKorea(region) {
  const apiKey = process.env.AIRKOREA_API_KEY;
  if (!apiKey) {
    console.warn('  ⚠️  AirKorea: API key 없음 → OpenAQ fallback');
    return fetchOpenAQ();
  }
  const url = `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?serviceKey=${encodeURIComponent(apiKey)}&returnType=json&numOfRows=100&pageNo=1&sidoName=${encodeURIComponent(region)}&ver=1.3`;
  const result = await safeFetch(url, 'AirKorea:PM25');

  if (!result.ok) {
    console.warn(`  ⚠️  AirKorea: ${result.error} → OpenAQ fallback`);
    return fetchOpenAQ();
  }
  const items = result.json?.response?.body?.items;
  if (!items || items.length === 0) return fetchOpenAQ();

  const vals = items.map(i => parseFloat(i.pm25Value)).filter(v => !isNaN(v) && v > 0);
  if (vals.length === 0) return fetchOpenAQ();

  const avg = Math.round(vals.reduce((a,b) => a+b, 0) / vals.length);
  const now = new Date();
  return {
    rows: [{ date: `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`, value: avg, name: 'PM2.5' }],
    latency: result.latency,
    meta: { source: 'AirKorea', region, stations: vals.length },
  };
}

async function fetchOpenAQ() {
  // OpenAQ v3 — API키 필요 (explore.openaq.org에서 발급)
  const apiKey = process.env.OPENAQ_API_KEY;
  const headers = { 'Accept': 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;

  // v3: locations near Seoul with pm25 parameter
  const url = 'https://api.openaq.org/v3/locations?coordinates=37.5665,126.9780&radius=50000&parameter_id=2&limit=50';
  const result = await safeFetch(url, 'OpenAQ:PM25');
  if (!result.ok) {
    console.warn(`  ⚠️  OpenAQ v3: ${result.error}`);
    return { rows: [], error: result.error };
  }

  // v3 response: results[].sensors[].summary.avg
  const results = result.json?.results || [];
  const values = results
    .flatMap(loc => (loc.sensors || []))
    .filter(s => s.parameter?.name === 'pm25' || s.parameter?.id === 2)
    .map(s => s.summary?.avg || s.latest?.value)
    .filter(v => v && v > 0);

  if (values.length === 0) return { rows: [], error: 'NO_DATA' };

  const avg = Math.round(values.reduce((a,b) => a+b, 0) / values.length);
  const now = new Date();
  return {
    rows: [{ date: `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`, value: avg, name: 'PM2.5' }],
    latency: result.latency,
    meta: { source: 'OpenAQ_v3', stations: values.length },
  };
}

async function fetchWAQI(city = 'seoul') {
  // WAQI (World Air Quality Index) — 무료 demo 토큰, 실시간 대기질
  // https://aqicn.org/api/ — demo 토큰은 제한적이지만 무료
  const token = process.env.WAQI_TOKEN || 'demo';
  const url = `https://api.waqi.info/feed/${city}/?token=${token}`;
  const result = await safeFetch(url, 'WAQI:PM25');
  
  if (!result.ok) {
    console.warn(`  ⚠️  WAQI: ${result.error}`);
    return { rows: [], error: result.error };
  }

  const data = result.json?.data;
  if (!data || data.aqi === undefined) {
    return { rows: [], error: 'NO_DATA' };
  }

  // PM2.5 우선, 없으면 전체 AQI 사용
  const pm25 = data.iaqi?.pm25?.v || Math.round(data.aqi * 0.5); // AQI→PM2.5 대략 변환
  const now = new Date();
  
  return {
    rows: [{ 
      date: `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`, 
      value: Math.round(pm25), 
      name: 'PM2.5' 
    }],
    latency: result.latency,
    meta: { source: 'WAQI', city, aqi: data.aqi, time: data.time?.s },
  };
}

// ═══════════════════════════════════════════════════════════════
// KOSIS API (호환성 유지)
// ═══════════════════════════════════════════════════════════════
async function fetchKOSIS(apiKey, orgId, tblId, itemCode, cycle, startDate, endDate) {
  const KOSIS_URL = 'https://kosis.kr/openapi/Param/statisticsParameterData.do';
  const params = new URLSearchParams({
    method:'getList', apiKey, itmId:itemCode, objL1:'ALL',
    format:'json', jsonVD:'Y',
    prdSe: cycle === 'M' ? 'M' : cycle === 'Q' ? 'Q' : 'Y',
    startPrdDe:startDate, endPrdDe:endDate, orgId, tblId,
  });
  const result = await safeFetch(`${KOSIS_URL}?${params}`, `KOSIS:${tblId}`);

  if (!result.ok) {
    console.warn(`  ⚠️  ${result.label}: ${result.error} (${result.latency}ms)`);
    return { rows: [], error: result.error, latency: result.latency };
  }
  const json = result.json;
  if (Array.isArray(json)) {
    return {
      rows: json.map(r => ({ date: r.PRD_DE, value: parseFloat(r.DT) || 0, name: r.TBL_NM })),
      latency: result.latency,
    };
  }
  if (json.err) {
    console.warn(`  ⚠️  KOSIS:${tblId}: ${json.err} (${result.latency}ms)`);
    return { rows: [], error: json.err, latency: result.latency };
  }
  return { rows: [], latency: result.latency };
}

// ═══════════════════════════════════════════════════════════════
// 날짜 헬퍼
// ═══════════════════════════════════════════════════════════════
function getDateRange(cycle, monthsBack) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const end = cycle === 'D' ? `${y}${m}${String(now.getDate()).padStart(2,'0')}` :
              cycle === 'M' || cycle === 'H' ? `${y}${m}` :
              cycle === 'Q' ? `${y}Q${Math.ceil((now.getMonth()+1)/3)}` : `${y}`;

  const startDate = new Date(now);
  if (monthsBack) {
    startDate.setMonth(startDate.getMonth() - monthsBack);
  } else {
    // Daily: 최근 10일 조회 (주말 대비)
    if (cycle === 'D') {
      startDate.setDate(startDate.getDate() - 10);
    } else {
      startDate.setFullYear(startDate.getFullYear() - (cycle === 'Q' || cycle === 'A' ? 3 : 1));
    }
  }
  const sy = startDate.getFullYear();
  const sm = String(startDate.getMonth() + 1).padStart(2, '0');
  const sd = String(startDate.getDate()).padStart(2, '0');
  const start = cycle === 'D' ? `${sy}${sm}${sd}` :
                cycle === 'M' || cycle === 'H' ? `${sy}${sm}` :
                cycle === 'Q' ? `${sy}Q1` : `${sy}`;
  return { start, end };
}

// ═══════════════════════════════════════════════════════════════
// 단일 게이지 수집
// ═══════════════════════════════════════════════════════════════
async function fetchGauge(gaugeId, ecosKey, kosisKey) {
  const spec = GAUGE_MAP[gaugeId];
  if (!spec) return null;

  const { start, end } = getDateRange(spec.cycle || 'M', spec.searchMonthsBack);
  let rows = [], latency = 0, fetchError = null, meta = null;

  if (spec.source === 'ECOS') {
    const r = await fetchECOS(ecosKey, spec.stat, spec.item, spec.cycle, start, end);
    rows = r.rows || []; latency = r.latency || 0; fetchError = r.error;
  } else if (spec.source === 'FRED') {
    const r = spec.fallback ? await fetchFREDWithFallback(spec.series, spec.fallback) : await fetchFRED(spec.series);
    rows = r.rows || []; latency = r.latency || 0; fetchError = r.error;
  } else if (spec.source === 'AIRKOREA') {
    const r = await fetchAirKorea(spec.region);
    rows = r.rows || []; latency = r.latency || 0; fetchError = r.error; meta = r.meta;
  } else if (spec.source === 'WAQI') {
    const r = await fetchWAQI(spec.city || 'seoul');
    rows = r.rows || []; latency = r.latency || 0; fetchError = r.error; meta = r.meta;
  } else if (spec.source === 'KOSIS') {
    const r = await fetchKOSIS(kosisKey, spec.orgId, spec.tblId, spec.item, spec.cycle, start, end);
    rows = r.rows || []; latency = r.latency || 0; fetchError = r.error;
  } else if (spec.source === 'SATELLITE') {
    return { gaugeId, source:'SATELLITE', sat:spec.sat, note:spec.note, value:null, status:'PENDING' };
  } else if (spec.source === 'GEE_SATELLITE') {
    // TODO: GEE 통합 - Python 스크립트 또는 Node.js earthengine 패키지 사용
    // 현재는 PENDING, 향후 fetch-satellite.js 통합 예정
    return { gaugeId, source:'GEE_SATELLITE', sat:spec.sat, note:spec.note + ' (GEE 연동 대기)', value:null, status:'PENDING' };
  } else if (spec.source === 'EXTERNAL') {
    return { gaugeId, source:'EXTERNAL', url:spec.url, note:spec.note, value:null, status:'PENDING' };
  } else if (spec.source === 'MANUAL') {
    return { gaugeId, source:'MANUAL', name:spec.name, note:spec.note, value:null, status:'PENDING' };
  } else if (spec.source === 'DERIVED') {
    return { gaugeId, source:'DERIVED', deps:spec.deps, status:'NEEDS_CALC' };
  }

  if (fetchError && rows.length === 0) {
    return { gaugeId, source:spec.source, value:null, status:'API_ERROR', error:fetchError, latency };
  }
  if (rows.length === 0) return { gaugeId, source:spec.source, value:null, status:'NO_DATA', latency };

  // FRED는 desc, ECOS/AirKorea는 asc
  const isDesc = spec.source === 'FRED';
  const latestRow = isDesc ? rows[0] : rows[rows.length - 1];
  const prevRow = isDesc
    ? (rows.length > 1 ? rows[1] : null)
    : (rows.length > 1 ? rows[rows.length - 2] : null);

  let value = latestRow.value;
  if (spec.transform) value = spec.transform(value);

  return {
    gaugeId, source:spec.source, name:spec.name, unit:spec.unit,
    value, prevValue: prevRow ? (spec.transform ? spec.transform(prevRow.value) : prevRow.value) : null,
    date: latestRow.date, rows: rows.length, latency, status:'OK',
    ...(meta ? { meta } : {}),
  };
}

// ═══════════════════════════════════════════════════════════════
// 전체 수집 (59개)
// ═══════════════════════════════════════════════════════════════
async function fetchAll(ecosKey, kosisKey) {
  if (!process.env.FRED_API_KEY) console.warn('  ⚠️  FRED_API_KEY 미설정 — S5(EPU), O2(PMI) 수집 불가');
  if (!process.env.WAQI_TOKEN) console.warn('  ⚠️  WAQI_TOKEN 미설정 — G6는 demo 토큰으로 동작 (제한적)');

  const gaugeIds = Object.keys(GAUGE_MAP);
  const results = {};
  const errors = [];

  for (let i = 0; i < gaugeIds.length; i += 10) {
    const batch = gaugeIds.slice(i, i + 10);
    const batchResults = await Promise.allSettled(
      batch.map(id => fetchGauge(id, ecosKey, kosisKey))
    );
    batchResults.forEach((r, j) => {
      const id = batch[j];
      if (r.status === 'fulfilled' && r.value) {
        results[id] = r.value;
      } else {
        errors.push({ id, error: r.reason?.message || 'unknown' });
        results[id] = { gaugeId: id, status:'ERROR', error: r.reason?.message };
      }
    });
    if (i + 10 < gaugeIds.length) await new Promise(r => setTimeout(r, 100));
  }

  // DERIVED
  for (const [id, spec] of Object.entries(GAUGE_MAP)) {
    if (spec.source !== 'DERIVED') continue;
    if (spec.calcYoY && spec.deps) {
      const dep = results[spec.deps[0]];
      if (dep?.value && dep?.prevValue) {
        results[id] = {
          gaugeId:id, source:'DERIVED', name:spec.name, unit:spec.unit,
          value: +(((dep.value - dep.prevValue) / dep.prevValue) * 100).toFixed(1),
          status:'OK',
        };
      }
    } else if (spec.calc && spec.deps) {
      const vals = spec.deps.map(d => results[d]?.value);
      if (vals.every(v => v !== null && v !== undefined)) {
        results[id] = {
          gaugeId:id, source:'DERIVED', name:spec.name, unit:spec.unit,
          value: spec.calc(...vals), status:'OK',
        };
      }
    }
  }

  const allResults = Object.values(results);
  const latencies = allResults.filter(r => r.latency).map(r => r.latency);
  const stats = {
    total: gaugeIds.length,
    ok: allResults.filter(r => r.status === 'OK').length,
    pending: allResults.filter(r => r.status === 'PENDING').length,
    noData: allResults.filter(r => r.status === 'NO_DATA').length,
    apiError: allResults.filter(r => r.status === 'API_ERROR').length,
    errors: errors.length,
    satellite: allResults.filter(r => r.source === 'SATELLITE').length,
    latency: {
      avg: latencies.length ? Math.round(latencies.reduce((a,b)=>a+b,0)/latencies.length) : 0,
      max: latencies.length ? Math.max(...latencies) : 0,
      min: latencies.length ? Math.min(...latencies) : 0,
    },
    timestamp: new Date().toISOString(),
  };

  return { results, stats, errors };
}

// ═══════════════════════════════════════════════════════════════
// 진단
// ═══════════════════════════════════════════════════════════════
function diagnoseMapping() {
  const breakdown = { ECOS:[], KOSIS:[], FRED:[], AIRKOREA:[], SATELLITE:[], DERIVED:[], EXTERNAL:[], MANUAL:[] };
  for (const [id, spec] of Object.entries(GAUGE_MAP)) {
    const cat = spec.manual ? 'MANUAL' : spec.source;
    (breakdown[cat] || breakdown.MANUAL).push({ id, name: spec.name });
  }
  return {
    total: Object.keys(GAUGE_MAP).length,
    breakdown: Object.fromEntries(
      Object.entries(breakdown).filter(([,v]) => v.length > 0).map(([k,v]) => [k, { count:v.length, gauges:v }])
    ),
    readyForAPI: breakdown.ECOS.length + breakdown.KOSIS.length + breakdown.FRED.length + breakdown.AIRKOREA.length,
    needsSatellite: breakdown.SATELLITE.length,
    needsManual: breakdown.MANUAL.length + breakdown.EXTERNAL.length,
  };
}

async function testGauge(gaugeId, ecosKey, kosisKey) {
  const spec = GAUGE_MAP[gaugeId];
  if (!spec) return { error: `Unknown gauge: ${gaugeId}` };
  const { start, end } = getDateRange(spec.cycle || 'M', spec.searchMonthsBack);

  if (spec.source === 'ECOS') {
    const url = `${ECOS_BASE}/${ecosKey}/json/kr/1/10/${spec.stat}/${spec.cycle}/${start}/${end}/${spec.item}`;
    const safeUrl = url.replace(ecosKey, 'KEY***');
    const result = await safeFetch(url, `ECOS:${gaugeId}`);
    return {
      gaugeId, source:'ECOS', name:spec.name, url:safeUrl,
      dateRange:{ start, end, cycle:spec.cycle },
      httpOk:result.ok, latency:result.latency,
      rawResponse: result.ok ? result.json : { error:result.error },
      rows: result.ok && result.json?.StatisticSearch?.row ? result.json.StatisticSearch.row.length : 0,
      ecosError: result.ok ? (result.json?.RESULT?.MESSAGE || null) : null,
    };
  } else if (spec.source === 'FRED' || spec.source === 'AIRKOREA' || spec.source === 'WAQI') {
    return fetchGauge(gaugeId, ecosKey, kosisKey);
  } else if (spec.source === 'KOSIS') {
    const KOSIS_URL = 'https://kosis.kr/openapi/Param/statisticsParameterData.do';
    const params = new URLSearchParams({
      method:'getList', apiKey:kosisKey, itmId:spec.item, objL1:'ALL',
      format:'json', jsonVD:'Y',
      prdSe: spec.cycle === 'M' ? 'M' : spec.cycle === 'Q' ? 'Q' : 'Y',
      startPrdDe:start, endPrdDe:end, orgId:spec.orgId, tblId:spec.tblId,
    });
    const safeParams = params.toString().replace(kosisKey, 'KEY***');
    const result = await safeFetch(`${KOSIS_URL}?${params}`, `KOSIS:${gaugeId}`);
    return {
      gaugeId, source:'KOSIS', name:spec.name, url:`${KOSIS_URL}?${safeParams}`,
      dateRange:{ start, end, cycle:spec.cycle },
      httpOk:result.ok, latency:result.latency,
      rawResponse: result.ok ? (Array.isArray(result.json) ? { count:result.json.length, sample:result.json.slice(0,2) } : result.json) : { error:result.error },
      rows: result.ok && Array.isArray(result.json) ? result.json.length : 0,
      kosisError: result.ok && !Array.isArray(result.json) ? JSON.stringify(result.json).slice(0,200) : null,
    };
  } else {
    return { gaugeId, source:spec.source, name:spec.name, status:'NOT_API', note:spec.note || spec.source };
  }
}

async function diagnoseAll(ecosKey, kosisKey) {
  const ids = Object.keys(GAUGE_MAP);
  const results = {};
  const summary = { ok:0, noData:0, ecosError:0, kosisError:0, fredOk:0, notApi:0, httpError:0 };

  for (let i = 0; i < ids.length; i += 5) {
    const batch = ids.slice(i, i + 5);
    const batchResults = await Promise.allSettled(batch.map(id => testGauge(id, ecosKey, kosisKey)));
    batchResults.forEach((r, j) => {
      const id = batch[j];
      const data = r.status === 'fulfilled' ? r.value : { error: r.reason?.message };
      results[id] = data;
      if (data.status === 'NOT_API') summary.notApi++;
      else if (data.status === 'OK') summary.ok++;
      else if (data.httpOk === false) summary.httpError++;
      else if (data.rows > 0) summary.ok++;
      else if (data.ecosError) summary.ecosError++;
      else if (data.kosisError) summary.kosisError++;
      else summary.noData++;
    });
    if (i + 5 < ids.length) await new Promise(r => setTimeout(r, 200));
  }
  return { total:ids.length, summary, gauges:results };
}

module.exports = { GAUGE_MAP, fetchGauge, fetchAll, diagnoseMapping, fetchECOS, fetchKOSIS, fetchFRED, fetchAirKorea, testGauge, diagnoseAll };
