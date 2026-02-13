/**
 * ═══════════════════════════════════════════════════════════════
 * DIAH-7M Data Pipeline — ECOS/KOSIS 실데이터 수집 모듈
 * ═══════════════════════════════════════════════════════════════
 * 
 * 59개 게이지 → 실제 통계 API 매핑
 * ECOS: 한국은행 경제통계 (무료, 인증키 필요)
 * KOSIS: 통계청 국가통계 (무료, 인증키 필요)
 * 
 * 사용법:
 *   const pipeline = require('./data-pipeline');
 *   await pipeline.fetchAll('ECOS_KEY', 'KOSIS_KEY');
 *   // → 59개 게이지 최신 데이터 반환
 * ═══════════════════════════════════════════════════════════════
 */

const ECOS_BASE = 'https://ecos.bok.or.kr/api/StatisticSearch';
const KOSIS_BASE = 'https://kosis.kr/openapi/Param/statisticsParameterData.do';

// ═══════════════════════════════════════════════════════════════
// 59 GAUGE → API MAPPING
// source: ECOS | KOSIS | DERIVED(계산)
// ═══════════════════════════════════════════════════════════════
const GAUGE_MAP = {
  // ── A1: 통화·자금 (순환계) ──
  I1: { source:'ECOS', stat:'722Y001', item:'0101000', cycle:'M', name:'기준금리', unit:'%' },
  I2: { source:'ECOS', stat:'301Y013', item:'000000BPA', cycle:'M', name:'경상수지', unit:'억$', transform: v => +(v/100).toFixed(1) },
  I3: { source:'ECOS', stat:'732Y001', item:'99', cycle:'M', name:'외환보유고', unit:'억$', transform: v => +(v/100).toFixed(1) },
  I4: { source:'ECOS', stat:'731Y004', item:'0000001', cycle:'M', name:'환율(원/달러)', unit:'원/$' },
  I5: { source:'ECOS', stat:'101Y004', item:'BBGA00', cycle:'M', name:'M2 증가율', unit:'%' },
  I6: { source:'ECOS', stat:'817Y002', item:'010200000', cycle:'M', name:'국채금리(3Y)', unit:'%' },

  // ── A2: 무역·수출입 (호흡계) ──
  E1: { source:'KOSIS', orgId:'101', tblId:'DT_1B20001', item:'T10', cycle:'M', name:'수출', unit:'억$', transform: v => +(v/100).toFixed(1) },
  E2: { source:'KOSIS', orgId:'101', tblId:'DT_1B20001', item:'T20', cycle:'M', name:'수입', unit:'억$', transform: v => +(v/100).toFixed(1) },
  E3: { source:'DERIVED', deps:['E1','E2'], calc: (e1,e2) => +(e1-e2).toFixed(1), name:'무역수지', unit:'억$' },
  E4: { source:'KOSIS', orgId:'146', tblId:'DT_14601N_001', item:'T001', cycle:'M', name:'컨테이너물동량', unit:'만TEU', transform: v => +(v/10000).toFixed(1) },
  E5: { source:'ECOS', stat:'902Y002', item:'KSP', cycle:'M', name:'유가(두바이)', unit:'$/bbl' },
  E6: { source:'DERIVED', deps:['E1'], calcYoY: true, name:'수출증가율', unit:'%' },

  // ── A3: 소비·내수 (소화계) ──
  C1: { source:'KOSIS', orgId:'101', tblId:'DT_1C81', item:'I_CHG', cycle:'M', name:'소매판매', unit:'%' },
  C2: { source:'ECOS', stat:'511Y002', item:'FME', cycle:'M', name:'소비자심리', unit:'pt' },
  C3: { source:'KOSIS', orgId:'365', tblId:'DT_365N_001', item:'T001', cycle:'M', name:'카드매출', unit:'조원', transform: v => +(v/1e12).toFixed(1) },
  C4: { source:'KOSIS', orgId:'101', tblId:'DT_1C85', item:'I_CHG', cycle:'M', name:'설비투자', unit:'%' },
  C5: { source:'ECOS', stat:'200Y001', item:'10212', cycle:'Q', name:'민간소비', unit:'%' },
  C6: { source:'KOSIS', orgId:'101', tblId:'DT_1C81', item:'S_CHG', cycle:'M', name:'서비스업생산', unit:'%' },

  // ── A4: 정책·규제 (신경계) ──
  S1: { source:'ECOS', stat:'512Y006', item:'FBB', cycle:'M', name:'BSI(기업경기)', unit:'pt' },
  S2: { source:'SATELLITE', sat:'VIIRS_DNB', name:'야간광량', unit:'%', note:'NASA Suomi NPP 직접 수집' },
  S3: { source:'KOSIS', orgId:'101', tblId:'DT_1C71', item:'CI_L', cycle:'M', name:'경기선행지수', unit:'pt' },
  S4: { source:'ECOS', stat:'301Y014', item:'A0100', cycle:'M', name:'정부지출', unit:'%' },
  S5: { source:'DERIVED', manual:true, name:'정책불확실성', unit:'%', note:'Baker-Bloom-Davis EPU 지수 참조' },
  S6: { source:'KOSIS', orgId:'101', tblId:'DT_1C71', item:'CI_C', cycle:'M', name:'경기동행지수', unit:'pt' },

  // ── A5: 금융안정 (면역계) ──
  F1: { source:'ECOS', stat:'817Y002', item:'010500102', cycle:'M', name:'신용스프레드', unit:'%',
        deps:['817Y002/010500102','817Y002/010200000'], calc:(corp,gov)=>+(corp-gov).toFixed(2) },
  F2: { source:'ECOS', stat:'817Y002', item:'010100000', cycle:'M', name:'CD-국고채 스프레드', unit:'%p' },
  F3: { source:'ECOS', stat:'802Y001', item:'0001000', cycle:'D', name:'KOSPI', unit:'pt' },
  F4: { source:'ECOS', stat:'901Y062', item:'VKOSPI', cycle:'D', name:'V-KOSPI', unit:'pt' },
  F5: { source:'ECOS', stat:'901Y014', item:'DRATE', cycle:'M', name:'연체율(금융)', unit:'%' },
  F6: { source:'DERIVED', deps:['F1'], name:'회사채스프레드', unit:'%p', note:'F1과 연동' },
  F7: { source:'ECOS', stat:'802Y001', item:'0002000', cycle:'D', name:'KOSDAQ', unit:'pt' },

  // ── A6: 물가·재정 (내분비계) ──
  P1: { source:'KOSIS', orgId:'101', tblId:'DT_1J20001', item:'T_CHG', cycle:'M', name:'CPI(소비자물가)', unit:'%' },
  P2: { source:'KOSIS', orgId:'101', tblId:'DT_1J30001', item:'T_CHG', cycle:'M', name:'PPI(생산자물가)', unit:'%' },
  P3: { source:'ECOS', stat:'301Y014', item:'R0100', cycle:'M', name:'국세수입', unit:'%' },
  P4: { source:'KOSIS', orgId:'101', tblId:'DT_1Y001', item:'GDP_DEBT', cycle:'A', name:'국가채무비율', unit:'%GDP' },
  P5: { source:'ECOS', stat:'301Y014', item:'BALANCE', cycle:'M', name:'재정수지', unit:'%GDP' },
  P6: { source:'KOSIS', orgId:'101', tblId:'DT_1J20001', item:'CORE_CHG', cycle:'M', name:'근원물가', unit:'%' },

  // ── A7: 생산·산업 (근골격계) ──
  O1: { source:'KOSIS', orgId:'101', tblId:'DT_1C81', item:'ALL_CHG', cycle:'M', name:'산업생산', unit:'%' },
  O2: { source:'EXTERNAL', url:'https://www.pmi.spglobal.com', name:'PMI(제조업)', unit:'pt', note:'S&P Global 직접 수집' },
  O3: { source:'KOSIS', orgId:'101', tblId:'DT_1C85', item:'C_CHG', cycle:'M', name:'건설기성', unit:'%' },
  O4: { source:'KOSIS', orgId:'101', tblId:'DT_1C81', item:'M_CHG', cycle:'M', name:'제조업생산', unit:'%' },
  O5: { source:'KOSIS', orgId:'101', tblId:'DT_1C81', item:'S_CHG', cycle:'M', name:'서비스업생산', unit:'%' },
  O6: { source:'DERIVED', deps:['C1'], calcYoY:true, name:'소비증감(YoY)', unit:'%' },

  // ── A7 확장: 제조·재고 (대사계) ──
  M1: { source:'KOSIS', orgId:'101', tblId:'DT_1C82', item:'OP_RATE', cycle:'M', name:'제조업가동률', unit:'%' },
  M2_G: { source:'KOSIS', orgId:'101', tblId:'DT_1C82', item:'INV_RATE', cycle:'M', name:'제조업재고율', unit:'%' },
  M3_G: { source:'KOSIS', orgId:'101', tblId:'DT_1C82', item:'NEW_ORD', cycle:'M', name:'신규수주증감', unit:'%' },

  // ── A8: 인구·가계 (생식·재생계) ──
  D1: { source:'KOSIS', orgId:'101', tblId:'DT_1B80A01', item:'TFR', cycle:'A', name:'합계출산율', unit:'명' },
  D2: { source:'KOSIS', orgId:'101', tblId:'DT_1IN1502', item:'AGED_RATE', cycle:'A', name:'고령화율', unit:'%' },
  D3: { source:'KOSIS', orgId:'101', tblId:'DT_1IN1502', item:'POP_WORK', cycle:'A', name:'생산가능인구', unit:'만명', transform: v => +(v/10000).toFixed(0) },
  L1: { source:'KOSIS', orgId:'101', tblId:'DT_1DA7002S', item:'EMP_RATE', cycle:'M', name:'고용률', unit:'%' },
  L2: { source:'KOSIS', orgId:'101', tblId:'DT_1DA7002S', item:'UNEMP_RATE', cycle:'M', name:'실업률', unit:'%' },
  L3: { source:'ECOS', stat:'151Y002', item:'HH_DEBT', cycle:'Q', name:'가계부채', unit:'조원', transform: v => +(v/1e12).toFixed(0) },
  L4: { source:'ECOS', stat:'901Y014', item:'HH_DRATE', cycle:'M', name:'가계연체율', unit:'%' },

  // ── A9: 환경·부동산 (생태·재생계) ──
  R1: { source:'KOSIS', orgId:'408', tblId:'DT_30404_N0010', item:'PRICE_CHG', cycle:'M', name:'주택가격', unit:'%' },
  R2: { source:'KOSIS', orgId:'116', tblId:'DT_116N_A060301', item:'UNSOLD', cycle:'M', name:'미분양주택', unit:'호' },
  R5: { source:'SATELLITE', sat:'SENTINEL1_SAR', name:'해수면상승', unit:'mm/yr', note:'Copernicus SAR 직접 수집' },
  R6: { source:'SATELLITE', sat:'LANDSAT9_TIR', name:'도시열섬', unit:'지수', note:'NASA Landsat-9 직접 수집' },
  G1: { source:'KOSIS', orgId:'101', tblId:'DT_2AS015', item:'FDI', cycle:'Q', name:'FDI', unit:'억$' },
  G6: { source:'SATELLITE', sat:'SENTINEL5P_NO2', name:'PM2.5(대기질)', unit:'㎍/m³', note:'Copernicus S5P 직접 수집' },
};

// ═══════════════════════════════════════════════════════════════
// HTTP 보호막 — timeout + status code 처리
// ═══════════════════════════════════════════════════════════════
const FETCH_TIMEOUT_MS = 10000; // 10초

async function safeFetch(url, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const latency = Date.now() - t0;
    clearTimeout(timer);

    // HTTP 에러 처리
    if (!res.ok) {
      const code = res.status;
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
    const msg = e.name === 'AbortError' ? 'TIMEOUT' : e.message;
    return { ok: false, error: msg, latency, label };
  }
}

// ═══════════════════════════════════════════════════════════════
// ECOS API 호출 (보호막 적용)
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
        date: r.TIME,
        value: parseFloat(r.DATA_VALUE) || 0,
        name: r.STAT_NAME,
      })),
      latency: result.latency,
    };
  }

  // ECOS 에러 응답 (키 오류 등)
  if (json.RESULT) {
    console.warn(`  ⚠️  ECOS:${statCode}: ${json.RESULT.MESSAGE} (${result.latency}ms)`);
    return { rows: [], error: json.RESULT.MESSAGE, latency: result.latency };
  }

  return { rows: [], latency: result.latency };
}

// ═══════════════════════════════════════════════════════════════
// KOSIS API 호출 (보호막 적용)
// ═══════════════════════════════════════════════════════════════
async function fetchKOSIS(apiKey, orgId, tblId, itemCode, cycle, startDate, endDate) {
  const params = new URLSearchParams({
    method: 'getList',
    apiKey,
    itmId: itemCode,
    objL1: 'ALL',
    format: 'json',
    jsonVD: 'Y',
    prdSe: cycle === 'M' ? 'M' : cycle === 'Q' ? 'Q' : 'Y',
    startPrdDe: startDate,
    endPrdDe: endDate,
    orgId,
    tblId,
  });
  const result = await safeFetch(`${KOSIS_BASE}?${params}`, `KOSIS:${tblId}`);

  if (!result.ok) {
    console.warn(`  ⚠️  ${result.label}: ${result.error} (${result.latency}ms)`);
    return { rows: [], error: result.error, latency: result.latency };
  }

  const json = result.json;
  if (Array.isArray(json)) {
    return {
      rows: json.map(r => ({
        date: r.PRD_DE,
        value: parseFloat(r.DT) || 0,
        name: r.TBL_NM,
      })),
      latency: result.latency,
    };
  }

  // KOSIS 에러 응답
  if (json.err) {
    console.warn(`  ⚠️  KOSIS:${tblId}: ${json.err} (${result.latency}ms)`);
    return { rows: [], error: json.err, latency: result.latency };
  }

  return { rows: [], latency: result.latency };
}

// ═══════════════════════════════════════════════════════════════
// 날짜 헬퍼
// ═══════════════════════════════════════════════════════════════
function getDateRange(cycle) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const end = cycle === 'D' ? `${y}${m}${String(now.getDate()).padStart(2, '0')}` :
              cycle === 'M' ? `${y}${m}` :
              cycle === 'Q' ? `${y}Q${Math.ceil((now.getMonth()+1)/3)}` : `${y}`;
  // 1년 전
  const py = y - 1;
  const start = cycle === 'D' ? `${py}${m}01` :
                cycle === 'M' ? `${py}${m}` :
                cycle === 'Q' ? `${py}Q1` : `${py}`;
  return { start, end };
}

// ═══════════════════════════════════════════════════════════════
// 단일 게이지 수집
// ═══════════════════════════════════════════════════════════════
async function fetchGauge(gaugeId, ecosKey, kosisKey) {
  const spec = GAUGE_MAP[gaugeId];
  if (!spec) return null;

  const { start, end } = getDateRange(spec.cycle || 'M');

  let rows = [], latency = 0, fetchError = null;
  if (spec.source === 'ECOS') {
    const r = await fetchECOS(ecosKey, spec.stat, spec.item, spec.cycle, start, end);
    rows = r.rows || []; latency = r.latency || 0; fetchError = r.error;
  } else if (spec.source === 'KOSIS') {
    const r = await fetchKOSIS(kosisKey, spec.orgId, spec.tblId, spec.item, spec.cycle, start, end);
    rows = r.rows || []; latency = r.latency || 0; fetchError = r.error;
  } else if (spec.source === 'SATELLITE') {
    return { gaugeId, source: 'SATELLITE', sat: spec.sat, note: spec.note, value: null, status: 'PENDING' };
  } else if (spec.source === 'EXTERNAL') {
    return { gaugeId, source: 'EXTERNAL', url: spec.url, note: spec.note, value: null, status: 'PENDING' };
  } else if (spec.source === 'DERIVED') {
    return { gaugeId, source: 'DERIVED', deps: spec.deps, status: 'NEEDS_CALC' };
  }

  if (fetchError) {
    return { gaugeId, source: spec.source, value: null, status: 'API_ERROR', error: fetchError, latency };
  }

  if (rows.length === 0) return { gaugeId, source: spec.source, value: null, status: 'NO_DATA', latency };

  // 최신값
  const latest = rows[rows.length - 1];
  const prev = rows.length > 1 ? rows[rows.length - 2] : null;
  let value = latest.value;
  if (spec.transform) value = spec.transform(value);

  return {
    gaugeId,
    source: spec.source,
    name: spec.name,
    unit: spec.unit,
    value,
    prevValue: prev ? (spec.transform ? spec.transform(prev.value) : prev.value) : null,
    date: latest.date,
    rows: rows.length,
    latency,
    status: 'OK',
  };
}

// ═══════════════════════════════════════════════════════════════
// 전체 수집 (59개 게이지)
// ═══════════════════════════════════════════════════════════════
async function fetchAll(ecosKey, kosisKey) {
  const gaugeIds = Object.keys(GAUGE_MAP);
  const results = {};
  const errors = [];

  // 병렬 수집 (10개씩 배치)
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
        results[id] = { gaugeId: id, status: 'ERROR', error: r.reason?.message };
      }
    });
    // Rate limit: 100ms between batches
    if (i + 10 < gaugeIds.length) await new Promise(r => setTimeout(r, 100));
  }

  // DERIVED 계산
  for (const [id, spec] of Object.entries(GAUGE_MAP)) {
    if (spec.source !== 'DERIVED') continue;
    if (spec.calcYoY && spec.deps) {
      const dep = results[spec.deps[0]];
      if (dep?.value && dep?.prevValue) {
        results[id] = {
          gaugeId: id, source: 'DERIVED', name: spec.name, unit: spec.unit,
          value: +(((dep.value - dep.prevValue) / dep.prevValue) * 100).toFixed(1),
          status: 'OK',
        };
      }
    } else if (spec.calc && spec.deps) {
      const vals = spec.deps.map(d => results[d]?.value);
      if (vals.every(v => v !== null && v !== undefined)) {
        results[id] = {
          gaugeId: id, source: 'DERIVED', name: spec.name, unit: spec.unit,
          value: spec.calc(...vals),
          status: 'OK',
        };
      }
    }
  }

  // 통계
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
// 수집 가능 여부 진단
// ═══════════════════════════════════════════════════════════════
function diagnoseMapping() {
  const breakdown = { ECOS: [], KOSIS: [], SATELLITE: [], DERIVED: [], EXTERNAL: [], MANUAL: [] };
  for (const [id, spec] of Object.entries(GAUGE_MAP)) {
    const cat = spec.manual ? 'MANUAL' : spec.source;
    (breakdown[cat] || breakdown.MANUAL).push({ id, name: spec.name });
  }
  return {
    total: Object.keys(GAUGE_MAP).length,
    breakdown: Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [k, { count: v.length, gauges: v }])
    ),
    readyForAPI: breakdown.ECOS.length + breakdown.KOSIS.length,
    needsSatellite: breakdown.SATELLITE.length,
    needsManual: breakdown.MANUAL.length + breakdown.EXTERNAL.length,
  };
}

// ═══════════════════════════════════════════════════════════════
// 개별 게이지 테스트 (디버그용 — 원시 URL/응답 노출)
// ═══════════════════════════════════════════════════════════════
async function testGauge(gaugeId, ecosKey, kosisKey) {
  const spec = GAUGE_MAP[gaugeId];
  if (!spec) return { error: `Unknown gauge: ${gaugeId}` };
  
  const { start, end } = getDateRange(spec.cycle || 'M');
  
  if (spec.source === 'ECOS') {
    const url = `${ECOS_BASE}/${ecosKey}/json/kr/1/10/${spec.stat}/${spec.cycle}/${start}/${end}/${spec.item}`;
    const safeUrl = url.replace(ecosKey, 'KEY***');
    const result = await safeFetch(url, `ECOS:${gaugeId}`);
    return {
      gaugeId, source: 'ECOS', name: spec.name, url: safeUrl,
      dateRange: { start, end, cycle: spec.cycle },
      httpOk: result.ok, latency: result.latency,
      rawResponse: result.ok ? result.json : { error: result.error },
      rows: result.ok && result.json?.StatisticSearch?.row ? result.json.StatisticSearch.row.length : 0,
      ecosError: result.ok ? (result.json?.RESULT?.MESSAGE || null) : null,
    };
  } else if (spec.source === 'KOSIS') {
    const params = new URLSearchParams({
      method: 'getList', apiKey: kosisKey, itmId: spec.item, objL1: 'ALL',
      format: 'json', jsonVD: 'Y',
      prdSe: spec.cycle === 'M' ? 'M' : spec.cycle === 'Q' ? 'Q' : 'Y',
      startPrdDe: start, endPrdDe: end, orgId: spec.orgId, tblId: spec.tblId,
    });
    const safeParams = params.toString().replace(kosisKey, 'KEY***');
    const result = await safeFetch(`${KOSIS_BASE}?${params}`, `KOSIS:${gaugeId}`);
    return {
      gaugeId, source: 'KOSIS', name: spec.name, url: `${KOSIS_BASE}?${safeParams}`,
      dateRange: { start, end, cycle: spec.cycle },
      httpOk: result.ok, latency: result.latency,
      rawResponse: result.ok ? (Array.isArray(result.json) ? { count: result.json.length, sample: result.json.slice(0, 2) } : result.json) : { error: result.error },
      rows: result.ok && Array.isArray(result.json) ? result.json.length : 0,
      kosisError: result.ok && !Array.isArray(result.json) ? JSON.stringify(result.json).slice(0, 200) : null,
    };
  } else {
    return { gaugeId, source: spec.source, name: spec.name, status: 'NOT_API', note: spec.note || spec.source };
  }
}

// ═══════════════════════════════════════════════════════════════
// 전체 진단 (각 게이지 원시 응답 확인)
// ═══════════════════════════════════════════════════════════════
async function diagnoseAll(ecosKey, kosisKey) {
  const ids = Object.keys(GAUGE_MAP);
  const results = {};
  const summary = { ok: 0, noData: 0, ecosError: 0, kosisError: 0, notApi: 0, httpError: 0 };
  
  // 5개씩 배치
  for (let i = 0; i < ids.length; i += 5) {
    const batch = ids.slice(i, i + 5);
    const batchResults = await Promise.allSettled(
      batch.map(id => testGauge(id, ecosKey, kosisKey))
    );
    batchResults.forEach((r, j) => {
      const id = batch[j];
      const data = r.status === 'fulfilled' ? r.value : { error: r.reason?.message };
      results[id] = data;
      
      if (data.status === 'NOT_API') summary.notApi++;
      else if (!data.httpOk) summary.httpError++;
      else if (data.rows > 0) summary.ok++;
      else if (data.ecosError) summary.ecosError++;
      else if (data.kosisError) summary.kosisError++;
      else summary.noData++;
    });
    if (i + 5 < ids.length) await new Promise(r => setTimeout(r, 200));
  }
  
  return { total: ids.length, summary, gauges: results };
}

module.exports = { GAUGE_MAP, fetchGauge, fetchAll, diagnoseMapping, fetchECOS, fetchKOSIS, testGauge, diagnoseAll };
