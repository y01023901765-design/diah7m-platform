/**
 * DIAH-7M Global Data Pipeline
 * ═══════════════════════════════════════════
 * 
 * 43개국 경제 데이터 자동 수집
 * 
 * ┌─────────────────────────────────────────┐
 * │  World Bank API  →  20+ gauges, 42국    │
 * │  OECD SDMX API   →  8+ gauges, 38국     │
 * │  IMF DataMapper  →  backup, 190국       │
 * │  FRED API        →  원자재/글로벌 금융   │
 * └─────────────┬───────────────────────────┘
 *               ▼
 *   정규화 → 캐시 → 엔진 → 보고서
 */

'use strict';

const { COUNTRIES, WB_COUNTRIES, OECD_MEMBERS, getWBCountryString, getOECDCountryString } = require('./country-profiles');
const { GLOBAL_GAUGES, GLOBAL_COMMODITIES, GAUGE_IDS, AXIS_MAP } = require('./global-indicators');

// ═══════════════════════════════════════════
// 설정
// ═══════════════════════════════════════════
const CONFIG = {
  worldBank: {
    baseUrl: 'https://api.worldbank.org/v2',
    timeout: 15000,
    retries: 3,
    perPage: 1000,
    mrnev: 5,   // Most Recent Non-Empty Values
  },
  oecd: {
    baseUrl: 'https://sdmx.oecd.org/public/rest/data',
    timeout: 20000,
    retries: 2,
    rateLimit: 20,  // 분당 최대 20 요청
    format: 'csv',  // CSV가 JSON보다 안정적
  },
  imf: {
    baseUrl: 'https://www.imf.org/external/datamapper/api/v1',
    timeout: 15000,
    retries: 2,
  },
  fred: {
    baseUrl: 'https://api.stlouisfed.org/fred/series/observations',
    timeout: 10000,
    retries: 3,
  },
  cache: {
    ttl: {
      monthly: 24 * 3600 * 1000,       // 24시간
      quarterly: 7 * 24 * 3600 * 1000,  // 7일
      annual: 30 * 24 * 3600 * 1000,    // 30일
    },
  },
};

// ═══════════════════════════════════════════
// HTTP 보호막 (한국 파이프라인에서 검증 완료)
// ═══════════════════════════════════════════
async function safeFetch(url, label, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();

  try {
    const res = await fetch(url, { signal: controller.signal });
    const latency = Date.now() - t0;
    clearTimeout(timer);

    if (!res.ok) {
      const code = res.status;
      const msg = code === 429 ? 'RATE_LIMITED' :
                  code >= 500 ? 'SERVER_ERROR' : `HTTP_${code}`;
      return { ok: false, error: msg, code, latency, label };
    }

    return { ok: true, res, latency, label };
  } catch (e) {
    clearTimeout(timer);
    const latency = Date.now() - t0;
    const msg = e.name === 'AbortError' ? 'TIMEOUT' : `NETWORK_ERROR: ${e.message}`;
    return { ok: false, error: msg, latency, label };
  }
}

// ═══════════════════════════════════════════
// 1. WORLD BANK CONNECTOR
// ═══════════════════════════════════════════

/**
 * World Bank API에서 특정 지표 수집 (다국가 일괄)
 * 
 * URL 형식:
 *   /v2/country/KOR;USA;JPN/indicator/NY.GDP.MKTP.KD.ZG?format=json&mrnev=5&per_page=1000
 * 
 * 응답 형식:
 *   [{ page, pages, per_page, total }, [{ country, countryiso3code, date, value, ... }]]
 */
async function fetchWorldBank(indicatorId, countryList = null) {
  const countries = countryList || WB_COUNTRIES;
  const wbCodes = countries
    .map(c => COUNTRIES[c]?.wbCode)
    .filter(Boolean);

  // World Bank API는 세미콜론으로 구분, 한 번에 최대 60개국
  const chunks = [];
  for (let i = 0; i < wbCodes.length; i += 60) {
    chunks.push(wbCodes.slice(i, i + 60));
  }

  const allResults = [];

  for (const chunk of chunks) {
    const countryStr = chunk.join(';');
    const url = `${CONFIG.worldBank.baseUrl}/country/${countryStr}/indicator/${indicatorId}?format=json&mrnev=${CONFIG.worldBank.mrnev}&per_page=${CONFIG.worldBank.perPage}`;

    const result = await safeFetch(url, `WB:${indicatorId}`, CONFIG.worldBank.timeout);

    if (!result.ok) {
      console.warn(`[WB] ${indicatorId} failed: ${result.error} (${result.latency}ms)`);
      continue;
    }

    try {
      const json = await result.res.json();

      // World Bank 응답: [metadata, data[]]
      if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) {
        console.warn(`[WB] ${indicatorId}: unexpected response structure`);
        continue;
      }

      const records = json[1];
      for (const row of records) {
        if (row.value === null || row.value === undefined) continue;

        allResults.push({
          provider: 'WB',
          indicator: indicatorId,
          country: row.countryiso3code,
          date: row.date,
          value: Number(row.value),
          unit: row.unit || '',
          decimal: row.decimal || 0,
        });
      }
    } catch (e) {
      console.warn(`[WB] ${indicatorId} parse error: ${e.message}`);
    }
  }

  return allResults;
}

/**
 * World Bank 전체 글로벌 게이지 수집
 */
async function fetchAllWorldBank() {
  const wbGauges = Object.entries(GLOBAL_GAUGES)
    .filter(([, g]) => g.sources.some(s => s.provider === 'WB'));

  const results = {};
  const errors = [];

  // 지표별 순차 수집 (API 부하 방지)
  for (const [gaugeId, gauge] of wbGauges) {
    const wbSource = gauge.sources.find(s => s.provider === 'WB');
    if (!wbSource) continue;

    try {
      const data = await fetchWorldBank(wbSource.indicator);
      results[gaugeId] = {
        gaugeId,
        gaugeName: gauge.name,
        axis: gauge.axis,
        provider: 'WB',
        indicator: wbSource.indicator,
        data,
        fetchedAt: new Date().toISOString(),
        count: data.length,
      };

      console.log(`[WB] ${gaugeId} (${gauge.name.en}): ${data.length} records`);

      // 1초 대기 (rate limit 방지)
      await sleep(1000);
    } catch (e) {
      errors.push({ gaugeId, provider: 'WB', error: e.message });
    }
  }

  return { results, errors };
}


// ═══════════════════════════════════════════
// 2. OECD SDMX CONNECTOR
// ═══════════════════════════════════════════

/**
 * OECD SDMX API에서 CSV 데이터 수집
 * 
 * URL 형식 (v2):
 *   /OECD.SDD.STES,DSD_STES@DF_CLI/{COUNTRY}.M.LI...AA...H?format=csv&startPeriod=2023-01
 * 
 * OECD API는 rate limit이 엄격 (20 req/min)
 * → CSV 형식으로 한 번에 모든 국가 데이터 수집
 */
async function fetchOECD(dataset, countries, measure, freq = 'M', startPeriod = null) {
  const countryStr = countries
    .map(c => COUNTRIES[c]?.oecdCode)
    .filter(Boolean)
    .join('+');

  if (!countryStr) return [];

  // startPeriod 기본값: 2년 전
  if (!startPeriod) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    startPeriod = `${d.getFullYear()}-01`;
  }

  // OECD SDMX v1 CSV 형식
  const url = `${CONFIG.oecd.baseUrl}/${dataset}/${countryStr}.${freq}.${measure}?format=csv&startPeriod=${startPeriod}&dimensionAtObservation=AllDimensions`;

  const result = await safeFetch(url, `OECD:${dataset}:${measure}`, CONFIG.oecd.timeout);

  if (!result.ok) {
    console.warn(`[OECD] ${dataset}/${measure} failed: ${result.error} (${result.latency}ms)`);
    return [];
  }

  try {
    const text = await result.res.text();
    return parseOECDCsv(text, measure);
  } catch (e) {
    console.warn(`[OECD] ${dataset}/${measure} parse error: ${e.message}`);
    return [];
  }
}

/**
 * OECD CSV 파싱
 * 
 * CSV 헤더: STRUCTURE,STRUCTURE_ID,STRUCTURE_NAME,ACTION,REF_AREA,FREQ,MEASURE,...,TIME_PERIOD,OBS_VALUE,...
 * 핵심 컬럼: REF_AREA (국가), TIME_PERIOD (날짜), OBS_VALUE (값)
 */
function parseOECDCsv(csvText, measure) {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',');
  const refAreaIdx = header.indexOf('REF_AREA');
  const timeIdx = header.indexOf('TIME_PERIOD');
  const valueIdx = header.indexOf('OBS_VALUE');

  if (refAreaIdx < 0 || timeIdx < 0 || valueIdx < 0) {
    console.warn(`[OECD] CSV header missing required columns for ${measure}`);
    return [];
  }

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length <= valueIdx) continue;

    const value = parseFloat(cols[valueIdx]);
    if (isNaN(value)) continue;

    // OECD 국가코드(3자리) → ISO3 매핑
    const oecdCode = cols[refAreaIdx];
    const iso3 = Object.entries(COUNTRIES)
      .find(([, c]) => c.oecdCode === oecdCode)?.[0];

    if (!iso3) continue;

    results.push({
      provider: 'OECD',
      indicator: measure,
      country: iso3,
      date: cols[timeIdx],
      value,
    });
  }

  return results;
}

/**
 * OECD 전체 글로벌 게이지 수집
 */
async function fetchAllOECD() {
  const oecdGauges = Object.entries(GLOBAL_GAUGES)
    .filter(([, g]) => g.sources.some(s => s.provider === 'OECD'));

  const results = {};
  const errors = [];
  let requestCount = 0;

  for (const [gaugeId, gauge] of oecdGauges) {
    const oecdSource = gauge.sources.find(s => s.provider === 'OECD');
    if (!oecdSource) continue;

    // Rate limit: 20 req/min → 3초 간격
    if (requestCount > 0 && requestCount % 15 === 0) {
      console.log('[OECD] Rate limit pause (60s)...');
      await sleep(60000);
    }

    try {
      const data = await fetchOECD(
        oecdSource.dataset,
        OECD_MEMBERS,
        oecdSource.measure,
        oecdSource.freq,
      );

      results[gaugeId] = {
        gaugeId,
        gaugeName: gauge.name,
        axis: gauge.axis,
        provider: 'OECD',
        indicator: oecdSource.measure,
        data,
        fetchedAt: new Date().toISOString(),
        count: data.length,
      };

      console.log(`[OECD] ${gaugeId} (${gauge.name.en}): ${data.length} records`);
      requestCount++;

      await sleep(3000); // 3초 대기
    } catch (e) {
      errors.push({ gaugeId, provider: 'OECD', error: e.message });
    }
  }

  return { results, errors };
}


// ═══════════════════════════════════════════
// 3. IMF DataMapper CONNECTOR (Backup)
// ═══════════════════════════════════════════

/**
 * IMF DataMapper API
 * URL: https://www.imf.org/external/datamapper/api/v1/{indicator}?periods=2020,2021,2022,2023,2024,2025
 */
async function fetchIMF(indicatorId) {
  const currentYear = new Date().getFullYear();
  const periods = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i).join(',');
  const url = `${CONFIG.imf.baseUrl}/${indicatorId}?periods=${periods}`;

  const result = await safeFetch(url, `IMF:${indicatorId}`, CONFIG.imf.timeout);

  if (!result.ok) {
    console.warn(`[IMF] ${indicatorId} failed: ${result.error}`);
    return [];
  }

  try {
    const json = await result.res.json();
    const values = json?.values?.[indicatorId];
    if (!values) return [];

    const results = [];
    for (const [countryCode, yearData] of Object.entries(values)) {
      // IMF 2자리 코드 → ISO3 변환
      const iso3 = Object.entries(COUNTRIES)
        .find(([, c]) => c.imfCode === countryCode)?.[0];
      if (!iso3) continue;

      for (const [year, val] of Object.entries(yearData)) {
        if (val === null || val === undefined) continue;
        results.push({
          provider: 'IMF',
          indicator: indicatorId,
          country: iso3,
          date: year,
          value: Number(val),
        });
      }
    }

    return results;
  } catch (e) {
    console.warn(`[IMF] ${indicatorId} parse error: ${e.message}`);
    return [];
  }
}


// ═══════════════════════════════════════════
// 4. FRED CONNECTOR (원자재 + 글로벌 금융)
// ═══════════════════════════════════════════

/**
 * FRED API로 원자재/글로벌 금융 데이터 수집
 */
async function fetchFRED(seriesId, fredApiKey) {
  if (!fredApiKey) {
    console.warn('[FRED] No API key');
    return [];
  }

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const url = `${CONFIG.fred.baseUrl}?series_id=${seriesId}&api_key=${fredApiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}&sort_order=desc&limit=60`;

  const result = await safeFetch(url, `FRED:${seriesId}`, CONFIG.fred.timeout);

  if (!result.ok) {
    console.warn(`[FRED] ${seriesId} failed: ${result.error}`);
    return [];
  }

  try {
    const json = await result.res.json();
    return (json.observations || [])
      .filter(o => o.value !== '.')
      .map(o => ({
        provider: 'FRED',
        indicator: seriesId,
        country: 'GLOBAL',
        date: o.date,
        value: parseFloat(o.value),
      }));
  } catch (e) {
    console.warn(`[FRED] ${seriesId} parse error: ${e.message}`);
    return [];
  }
}

/**
 * 전체 원자재/글로벌 금융 수집
 */
async function fetchAllCommodities(fredApiKey) {
  const results = {};
  const errors = [];

  // FRED 기반 원자재 수집
  for (const [id, commodity] of Object.entries(GLOBAL_COMMODITIES)) {
    if (commodity.source === 'manual') continue;
    if (commodity.source === 'datahub') continue; // 별도 처리
    if (!commodity.fredId) continue;

    try {
      const data = await fetchFRED(commodity.fredId, fredApiKey);
      results[id] = {
        id,
        name: commodity.name,
        unit: commodity.unit,
        data,
        fetchedAt: new Date().toISOString(),
        count: data.length,
      };

      console.log(`[FRED] ${id} (${commodity.name}): ${data.length} records`);
      await sleep(500);
    } catch (e) {
      errors.push({ id, error: e.message });
    }
  }

  // Gold: DataHub (GitHub-hosted World Bank commodity data, CSV)
  // FRED discontinued LBMA gold price series in Jan 2022
  try {
    const goldUrl = 'https://raw.githubusercontent.com/datasets/gold-prices/main/data/monthly.csv';
    const goldResult = await safeFetch(goldUrl, 'GOLD_DATAHUB', 10000);
    if (goldResult.ok) {
      const csvText = await goldResult.res.text();
      // CSV format: Date,Price (e.g. "1950-01,34.73")
      const lines = csvText.trim().split('\n').slice(1); // skip header
      const goldData = lines
        .map(line => {
          const [date, price] = line.split(',');
          return { date: date?.trim(), price: parseFloat(price) };
        })
        .filter(r => r.price && !isNaN(r.price) && r.date >= '2020')
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 60)
        .map(r => ({
          provider: 'WorldBank',
          indicator: 'GOLD_MONTHLY',
          country: 'GLOBAL',
          date: r.date + '-01',
          value: r.price,
        }));

      if (goldData.length > 0) {
        results.GOLD = {
          id: 'GOLD',
          name: 'Gold',
          unit: '$/oz',
          data: goldData,
          fetchedAt: new Date().toISOString(),
          count: goldData.length,
        };
        console.log(`[DataHub] GOLD: ${goldData.length} records (latest: $${goldData[0].value}/oz)`);
      }
    } else {
      errors.push({ id: 'GOLD', error: `DataHub fetch failed: ${goldResult.error}` });
    }
  } catch (e) {
    errors.push({ id: 'GOLD', error: `Gold fallback error: ${e.message}` });
  }

  return { results, errors };
}


// ═══════════════════════════════════════════
// 5. 통합 수집 오케스트레이터
// ═══════════════════════════════════════════

/**
 * 전체 글로벌 데이터 수집 (메인 함수)
 * 
 * 수집 순서:
 *   1. World Bank (가장 안정적, 42국 일괄)
 *   2. OECD (월간 최신 데이터, 38국)
 *   3. IMF (백업)
 *   4. FRED (원자재)
 * 
 * 소스 우선순위 병합:
 *   같은 게이지에 OECD + WB 데이터가 있으면
 *   → OECD 우선 (더 최신), WB는 OECD 없는 국가만 채움
 */
async function fetchAllGlobal(options = {}) {
  const { fredApiKey, skipOECD = false, skipIMF = false } = options;
  const t0 = Date.now();

  console.log('═══════════════════════════════════════');
  console.log('  DIAH-7M GLOBAL DATA COLLECTION START');
  console.log(`  Target: ${Object.keys(COUNTRIES).length} countries, ${GAUGE_IDS.length} gauges`);
  console.log('═══════════════════════════════════════');

  // Phase 1: World Bank
  console.log('\n[Phase 1] World Bank API...');
  const wb = await fetchAllWorldBank();

  // Phase 2: OECD
  let oecd = { results: {}, errors: [] };
  if (!skipOECD) {
    console.log('\n[Phase 2] OECD SDMX API...');
    oecd = await fetchAllOECD();
  }

  // Phase 3: IMF (백업 - WB/OECD에서 못 가져온 것만)
  let imf = { results: {}, errors: [] };
  if (!skipIMF) {
    console.log('\n[Phase 3] IMF DataMapper (backup)...');
    const imfGauges = Object.entries(GLOBAL_GAUGES)
      .filter(([, g]) => g.sources.some(s => s.provider === 'IMF'));

    for (const [gaugeId, gauge] of imfGauges) {
      // WB와 OECD에서 이미 데이터가 충분하면 IMF 스킵
      const wbCount = wb.results[gaugeId]?.count || 0;
      const oecdCount = oecd.results[gaugeId]?.count || 0;
      if (wbCount > 30 || oecdCount > 30) continue;

      const imfSource = gauge.sources.find(s => s.provider === 'IMF');
      if (!imfSource) continue;

      try {
        const data = await fetchIMF(imfSource.indicator);
        imf.results[gaugeId] = {
          gaugeId,
          gaugeName: gauge.name,
          axis: gauge.axis,
          provider: 'IMF',
          indicator: imfSource.indicator,
          data,
          fetchedAt: new Date().toISOString(),
          count: data.length,
        };
        console.log(`[IMF] ${gaugeId}: ${data.length} records (backup)`);
        await sleep(1000);
      } catch (e) {
        imf.errors.push({ gaugeId, error: e.message });
      }
    }
  }

  // Phase 4: FRED (원자재)
  let commodities = { results: {}, errors: [] };
  if (fredApiKey) {
    console.log('\n[Phase 4] FRED Commodities...');
    commodities = await fetchAllCommodities(fredApiKey);
  }

  // ── 병합: 소스 우선순위 적용 ──
  const merged = mergeByPriority(wb.results, oecd.results, imf.results);

  const elapsed = Date.now() - t0;
  const stats = {
    total_gauges: GAUGE_IDS.length,
    wb_gauges: Object.keys(wb.results).length,
    oecd_gauges: Object.keys(oecd.results).length,
    imf_gauges: Object.keys(imf.results).length,
    commodities: Object.keys(commodities.results).length,
    merged_gauges: Object.keys(merged).length,
    countries_covered: countCoveredCountries(merged),
    elapsed_ms: elapsed,
    errors: [
      ...wb.errors,
      ...oecd.errors,
      ...imf.errors,
      ...commodities.errors,
    ],
  };

  console.log('\n═══════════════════════════════════════');
  console.log('  COLLECTION COMPLETE');
  console.log(`  Gauges: ${stats.merged_gauges}/${stats.total_gauges}`);
  console.log(`  Countries: ${stats.countries_covered}`);
  console.log(`  Elapsed: ${(elapsed / 1000).toFixed(1)}s`);
  console.log(`  Errors: ${stats.errors.length}`);
  console.log('═══════════════════════════════════════');

  return {
    gauges: merged,
    commodities: commodities.results,
    stats,
  };
}


// ═══════════════════════════════════════════
// 소스 우선순위 병합
// ═══════════════════════════════════════════

/**
 * 같은 게이지에 여러 소스 데이터가 있을 때:
 *   OECD (월간) > WB (연간) > IMF (백업)
 *   
 * 같은 국가의 같은 게이지:
 *   → 가장 최신 날짜의 데이터를 우선
 */
function mergeByPriority(wbResults, oecdResults, imfResults) {
  const merged = {};

  for (const gaugeId of GAUGE_IDS) {
    const sources = [];
    if (oecdResults[gaugeId]?.data?.length) sources.push(oecdResults[gaugeId]);
    if (wbResults[gaugeId]?.data?.length) sources.push(wbResults[gaugeId]);
    if (imfResults[gaugeId]?.data?.length) sources.push(imfResults[gaugeId]);

    if (sources.length === 0) continue;

    // 국가별로 가장 최신 데이터만 유지
    const byCountry = {};
    for (const source of sources) {
      for (const record of source.data) {
        const key = record.country;
        if (!byCountry[key] || record.date > byCountry[key].date) {
          byCountry[key] = record;
        }
      }
    }

    merged[gaugeId] = {
      gaugeId,
      gaugeName: GLOBAL_GAUGES[gaugeId].name,
      axis: GLOBAL_GAUGES[gaugeId].axis,
      data: byCountry,
      countries: Object.keys(byCountry).length,
      fetchedAt: new Date().toISOString(),
    };
  }

  return merged;
}

/** 커버된 국가 수 계산 */
function countCoveredCountries(merged) {
  const covered = new Set();
  for (const gauge of Object.values(merged)) {
    for (const country of Object.keys(gauge.data)) {
      covered.add(country);
    }
  }
  return covered.size;
}


// ═══════════════════════════════════════════
// 축(Axes) 메타 빌더 + 응답 검증
// ═══════════════════════════════════════════

/** 데이터 있는 축만 필터링하여 프론트에 전달 */
function buildAxesInfo(gauges) {
  const axes = {};
  for (const [axId, axMeta] of Object.entries(AXIS_MAP)) {
    const liveKeys = axMeta.gauges.filter(gId => gauges[gId]?.value != null);
    if (liveKeys.length === 0) continue;
    axes[axId] = {
      ...axMeta,
      keys: liveKeys,
      gaugeCount: liveKeys.length,
      totalGauges: axMeta.gauges.length,
    };
  }
  return axes;
}

/** 서버 self-validate: API 계약 위반 시 errors에 추가 */
function validateResponse(resp) {
  const contractErrors = [];
  if (!resp.datasetId) contractErrors.push('datasetId 누락');
  if (!resp.entityType) contractErrors.push('entityType 누락');
  for (const [axId, ax] of Object.entries(resp.axes || {})) {
    for (const gKey of (ax.keys || [])) {
      if (!resp.gauges[gKey]) contractErrors.push(`axes.${axId}.keys에 존재하지 않는 gaugeId: ${gKey}`);
    }
    if (!ax.tierKey) contractErrors.push(`axes.${axId}.tierKey 누락`);
  }
  if (contractErrors.length) {
    resp.errors = [...(resp.errors || []), ...contractErrors.map(msg => ({ type: 'contract', msg }))];
  }
  return resp;
}

// ═══════════════════════════════════════════
// 단일 국가 수집 (국가별 보고서용)
// ═══════════════════════════════════════════

/**
 * 특정 국가의 모든 게이지 데이터 수집
 * Dashboard에서 국가 선택 시 호출
 */
async function fetchCountryData(iso3, options = {}) {
  const country = COUNTRIES[iso3];
  if (!country) throw new Error(`Unknown country: ${iso3}`);

  if (country.tier === 'satellite_only') {
    return validateResponse({
      entityType: 'country',
      datasetId: 'GLOBAL',
      country: iso3,
      countryName: country.name,
      tier: 'satellite_only',
      currency: country.currency,
      gauges: {},
      axes: {},
      axisOrder: Object.keys(AXIS_MAP),
      gaugeCount: 0,
      totalGauges: GAUGE_IDS.length,
      coverageRate: '0%',
      errors: [],
      fetchedAt: new Date().toISOString(),
      note: 'Satellite data only — official indicators excluded',
      // Phase 2 예약 필드
      parentId: null,
      childrenSummary: null,
      causalChain: { factor: [], trigger: [], cause: null, manifest: [], result: [] },
    });
  }

  const { fredApiKey } = options;
  const gauges = {};
  const errors = [];

  for (const [gaugeId, gauge] of Object.entries(GLOBAL_GAUGES)) {
    for (const source of gauge.sources) {
      try {
        let data = [];

        if (source.provider === 'WB' && country.wbCode) {
          data = await fetchWorldBank(source.indicator, [iso3]);
        } else if (source.provider === 'OECD' && country.oecdCode) {
          data = await fetchOECD(
            source.dataset,
            [iso3],
            source.measure,
            source.freq,
          );
        } else if (source.provider === 'IMF' && country.imfCode) {
          const imfData = await fetchIMF(source.indicator);
          data = imfData.filter(d => d.country === iso3);
        }

        if (data.length > 0) {
          // 가장 최신 값
          data.sort((a, b) => b.date.localeCompare(a.date));
          gauges[gaugeId] = {
            gaugeId,
            name: gauge.name,
            axis: gauge.axis,
            value: data[0].value,
            date: data[0].date,
            provider: source.provider,
            unit: gauge.unit,
            history: data.slice(0, 10), // 최근 10개
            // Phase 2 예약: 서버 기준 활성화 시 프론트 자동 전환
            thresholds: null,
            scoreRule: null,
          };
          break; // 첫 번째 성공 소스에서 중단
        }
      } catch (e) {
        errors.push({ gaugeId, provider: source.provider, error: e.message });
      }
    }
  }

  return validateResponse({
    // ── 필수 필드 (Phase 1) ──
    entityType: 'country',
    datasetId: 'GLOBAL',
    country: iso3,
    countryName: country.name,
    tier: country.tier,
    currency: country.currency,
    gauges,
    axes: buildAxesInfo(gauges),
    axisOrder: Object.keys(AXIS_MAP),
    gaugeCount: Object.keys(gauges).length,
    totalGauges: GAUGE_IDS.length,
    coverageRate: `${Math.round(Object.keys(gauges).length / GAUGE_IDS.length * 100)}%`,
    errors,
    fetchedAt: new Date().toISOString(),

    // ── Phase 2 예약 필드 ──
    parentId: null,
    childrenSummary: null,
    causalChain: {
      factor: [],
      trigger: [],
      cause: null,
      manifest: [],
      result: [],
    },
  });
}


// ═══════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// ═══════════════════════════════════════════
// Express 라우터 (server.js에 마운트)
// ═══════════════════════════════════════════
function createGlobalRouter(express) {
  const router = express.Router();

  // 글로벌 데이터 캐시
  let globalCache = null;
  let globalCacheTime = 0;
  const CACHE_TTL = 6 * 3600 * 1000; // 6시간

  /**
   * GET /api/v1/global/countries
   * 43개국 목록 반환
   */
  router.get('/countries', (req, res) => {
    const list = Object.entries(COUNTRIES).map(([code, c]) => ({
      code,
      name: c.name,
      region: c.region,
      tier: c.tier,
      currency: c.currency,
      hasOECD: !!c.oecdCode,
      hasWB: !!c.wbCode,
    }));
    res.json({ total: list.length, countries: list });
  });

  /**
   * GET /api/v1/global/country/:iso3
   * 특정 국가 데이터 (20게이지)
   */
  router.get('/country/:iso3', async (req, res) => {
    const iso3 = req.params.iso3.toUpperCase();
    try {
      const data = await fetchCountryData(iso3, {
        fredApiKey: process.env.FRED_API_KEY,
      });
      res.json(data);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  /**
   * POST /api/v1/global/refresh
   * 전체 글로벌 데이터 갱신 (관리자 전용)
   */
  router.post('/refresh', async (req, res) => {
    try {
      const data = await fetchAllGlobal({
        fredApiKey: process.env.FRED_API_KEY,
      });
      globalCache = data;
      globalCacheTime = Date.now();
      res.json({ ok: true, stats: data.stats });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/v1/global/overview
   * 글로벌 오버뷰 (캐시된 데이터)
   */
  router.get('/overview', async (req, res) => {
    // 캐시 유효하면 반환
    if (globalCache && (Date.now() - globalCacheTime) < CACHE_TTL) {
      return res.json(globalCache);
    }

    // 캐시 없으면 수집
    try {
      const data = await fetchAllGlobal({
        fredApiKey: process.env.FRED_API_KEY,
      });
      globalCache = data;
      globalCacheTime = Date.now();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/v1/global/commodities
   * 세계 경제 공통지표 (원자재/VIX/DXY 등)
   */
  router.get('/commodities', async (req, res) => {
    try {
      const data = await fetchAllCommodities(process.env.FRED_API_KEY);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /**
   * GET /api/v1/global/compare/:iso3list
   * 국가 비교 (최대 5개국)
   * 예: /api/v1/global/compare/KOR;USA;JPN
   */
  router.get('/compare/:iso3list', async (req, res) => {
    const countries = req.params.iso3list.toUpperCase().split(';').slice(0, 5);
    const results = {};
    const errors = [];

    for (const iso3 of countries) {
      try {
        results[iso3] = await fetchCountryData(iso3, {
          fredApiKey: process.env.FRED_API_KEY,
        });
      } catch (e) {
        errors.push({ country: iso3, error: e.message });
      }
    }

    res.json({ countries: results, errors });
  });

  return router;
}


// ═══════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════
module.exports = {
  fetchWorldBank,
  fetchOECD,
  fetchIMF,
  fetchFRED,
  fetchAllGlobal,
  fetchCountryData,
  fetchAllCommodities,
  createGlobalRouter,
  CONFIG,
};
