/**
 * DIAH-7M 위성 데이터 수집 모듈 (v2)
 * ═══════════════════════════════════
 * Google Earth Engine → Node.js
 * 
 * GPT 합의 설계:
 * - 인증: Render Secret File 1순위, base64 2순위
 * - 수집: 매일 06:00 KST 배치, 센서별 게이트
 * - VIIRS: 최근 7일 룩백
 * - Landsat: 구름 10% 미만 최신 이미지
 * - 순차 실행 (CPU 스파이크 방지)
 * - 관측성 메타: run_id/asof_kst/duration_ms/failures
 */

'use strict';

let ee;
try { ee = require('@google/earthengine'); } catch (e) {
  console.warn('  ⚠️ @google/earthengine not installed — satellite collection disabled');
  ee = null;
}
const fs = require('fs');
const path = require('path');
const conc = require('./concurrency');

let geeInitialized = false;

// ── 동시접속 보호: GEE 동시 3개 제한 (레이트리밋 100/분 보호) ──
var _geeSem = new conc.Semaphore(3);
var _geeTimeout = 30000; // 30초 타임아웃 (GEE callback 무응답 방지)

// ═══ 1. GEE 인증 ═══
async function authenticateGEE() {
  if (geeInitialized) return;
  if (!ee) throw new Error('@google/earthengine not installed');

  let credentials;

  // 1순위: Secret File / GOOGLE_APPLICATION_CREDENTIALS
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GEE_KEY_FILE;
  if (credPath && fs.existsSync(credPath)) {
    credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    console.log('  🔑 GEE: Secret File auth (' + path.basename(credPath) + ')');
  }

  // 2순위: base64 env
  if (!credentials && process.env.GEE_CREDENTIALS_B64) {
    const decoded = Buffer.from(process.env.GEE_CREDENTIALS_B64, 'base64').toString();
    credentials = JSON.parse(decoded);
    // private_key 줄바꿈 정규화 (환경별 이스케이프 차이 방지)
    if (typeof credentials.private_key === 'string' && credentials.private_key.includes('\\n')) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    console.log('  🔑 GEE: base64 auth (' + decoded.length + 'B)');
  }

  if (!credentials) {
    throw new Error('GEE credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS or GEE_CREDENTIALS_B64');
  }

  return new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      credentials,
      () => ee.initialize(null, null, () => { geeInitialized = true; console.log('  ✅ GEE initialized'); resolve(); }, reject),
      reject
    );
  });
}

// ═══ 이미지 썸네일 파라미터 ═══
const THUMB_PARAMS = {
  VIIRS: {
    bands: 'avg_rad',
    palette: ['000000', '1a1a5e', '0066cc', '00ccff', 'ffff00', 'ffffff'],
    min: 0, max: 80,
    dimensions: '512x320',
    paletteLabels: { min: '0 nW/cm²/sr', max: '80 nW/cm²/sr' },
  },
  LANDSAT: {
    bands: 'ST_B10',
    palette: ['0000ff', '00ffff', '00ff00', 'ffff00', 'ff8800', 'ff0000'],
    min: 280, max: 320,  // 켈빈 (7°C ~ 47°C)
    dimensions: '512x320',
    paletteLabels: { min: '7°C', max: '47°C' },
  },
};

/** GEE getThumbURL 래퍼 — URL 문자열만 반환, 이미지 바이트 없음 */
function getThumbPromise(image, geometry, params) {
  return new Promise(function(resolve) {
    if (!image) return resolve(null);
    try {
      const thumbOpts = {
        region: geometry,
        palette: params.palette,
        min: params.min, max: params.max,
        format: 'png',
      };
      if (params.scale) thumbOpts.scale = params.scale;
      else if (params.dimensions) thumbOpts.dimensions = params.dimensions;
      image.getThumbURL(thumbOpts, function(url, err) {
        if (err) console.warn('  ⚠️ getThumbURL callback err:', err);
        else if (!url) console.warn('  ⚠️ getThumbURL returned empty URL');
        resolve(err || !url ? null : url);
      });
    } catch(e) {
      console.warn('  ⚠️ getThumbURL exception:', e.message);
      resolve(null);
    }
  });
}

// ═══ 2. VIIRS 야간광 (S2) ═══
// 43국 수도/경제 중심지 bbox — country-profiles.js에서 동적 생성
// 국가 추가 시 country-profiles.js의 satellite.bbox만 추가하면 자동 반영
var _cpCountries = require('./country-profiles').COUNTRIES;
var REGIONS = {};
for (var _iso3 of Object.keys(_cpCountries)) {
  var _c = _cpCountries[_iso3];
  if (_c.satellite && _c.satellite.bbox) {
    REGIONS[_c.iso2] = { name: _c.name.en, bbox: _c.satellite.bbox };
  }
}

async function fetchVIIRS(regionCode, lookbackDays) {
  regionCode = regionCode || 'KR';
  lookbackDays = lookbackDays || 365; // VCMSLCFG 월간, 발행 2~3개월 지연 → 넉넉히 365일
  const t0 = Date.now();
  await authenticateGEE();

  var region = REGIONS[regionCode];
  if (!region) throw new Error('Unknown region: ' + regionCode);
  var geometry = ee.Geometry.Rectangle(region.bbox);

  var endDate = new Date();
  var startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  var collection = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
    .filterBounds(geometry)
    .filterDate(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
    .select('avg_rad')
    .sort('system:time_start', false);

  // 7일 빠른 평균 (민감도) + 60일 안정 평균 (추세) — GPT 합의 2채널
  var sevenDayStart = new Date();
  sevenDayStart.setDate(sevenDayStart.getDate() - 7);
  var sevenDayCol = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
    .filterBounds(geometry)
    .filterDate(sevenDayStart.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
    .select('avg_rad');

  var rollingStart = new Date();
  rollingStart.setDate(rollingStart.getDate() - 60);
  var rollingCol = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
    .filterBounds(geometry)
    .filterDate(rollingStart.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
    .select('avg_rad');

  return new Promise(function(resolve) {
    // 최신 단일 값
    collection.first().reduceRegion({
      reducer: ee.Reducer.mean(), geometry: geometry, scale: 1000, maxPixels: 1e9
    }).evaluate(function(latestStats, err) {
      if (err || !latestStats || !latestStats.avg_rad) {
        return resolve({
          gaugeId: 'S2', source: 'SATELLITE', name: '야간광량',
          status: 'NO_DATA', error: (err && err.message) || 'No VIIRS data',
          duration_ms: Date.now() - t0
        });
      }

      // 7일 평균
      sevenDayCol.mean().reduceRegion({
        reducer: ee.Reducer.mean(), geometry: geometry, scale: 1000, maxPixels: 1e9
      }).evaluate(function(sevenStats, err7) {
        var mean7d = (sevenStats && sevenStats.avg_rad) ? Math.round(sevenStats.avg_rad * 100) / 100 : null;

        // 60일 평균
        rollingCol.mean().reduceRegion({
          reducer: ee.Reducer.mean(), geometry: geometry, scale: 1000, maxPixels: 1e9
        }).evaluate(function(rollingStats, err60) {
          var mean60d = Math.round(((rollingStats && rollingStats.avg_rad) || latestStats.avg_rad) * 100) / 100;

          // 365일 baseline (GEE 원샷 — Cold Start 해결)
          var baselineStart = new Date();
          baselineStart.setDate(baselineStart.getDate() - 365);
          var baselineCol = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
            .filterBounds(geometry)
            .filterDate(baselineStart.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
            .select('avg_rad');

          baselineCol.mean().reduceRegion({
            reducer: ee.Reducer.mean(), geometry: geometry, scale: 1000, maxPixels: 1e9
          }).evaluate(function(baselineStats, errBL) {
            var baseline365 = (baselineStats && baselineStats.avg_rad) ? Math.round(baselineStats.avg_rad * 100) / 100 : null;
            var anomaly = (baseline365 && baseline365 > 0) ? Math.round(((mean60d - baseline365) / baseline365) * 10000) / 10000 : null;

            var resultData = {
              gaugeId: 'S2', source: 'SATELLITE', name: '야간광량', unit: 'nW/cm²/sr',
              value: mean60d,
              mean_7d: mean7d,
              mean_60d: mean60d,
              baseline_365d: baseline365,
              anomaly: anomaly,
              latestValue: Math.round(latestStats.avg_rad * 100) / 100,
              prevValue: null, date: new Date().toISOString().slice(0, 10),
              region: regionCode, status: 'OK', duration_ms: Date.now() - t0,
              source_meta: {
                dataset: 'NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG',
                channels: '7d+60d+baseline365',
                scale: 1000,
                baseline_days: 365,
              }
            };

            // ── 이미지 썸네일 생성 (수치 수집 완료 후 안전하게) ──
            try {
              var afterImg = collection.first().select('avg_rad');
              // "before": 90~365일 전 기간에서 최신 1장
              var beforeStart = new Date();
              beforeStart.setDate(beforeStart.getDate() - 365);
              var beforeEnd = new Date();
              beforeEnd.setDate(beforeEnd.getDate() - 90);
              var beforeCol = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
                .filterBounds(geometry)
                .filterDate(beforeStart.toISOString().split('T')[0], beforeEnd.toISOString().split('T')[0])
                .select('avg_rad')
                .sort('system:time_start', false);
              var beforeImg = beforeCol.first();

              Promise.all([
                getThumbPromise(afterImg, geometry, THUMB_PARAMS.VIIRS),
                getThumbPromise(beforeImg, geometry, THUMB_PARAMS.VIIRS),
              ]).then(function(urls) {
                if (urls[0] || urls[1]) {
                  resultData.images = {
                    after: urls[0] ? { url: urls[0], date: resultData.date } : null,
                    before: urls[1] ? { url: urls[1], date: beforeEnd.toISOString().slice(0, 10) } : null,
                    palette: THUMB_PARAMS.VIIRS.palette,
                    paletteLabels: THUMB_PARAMS.VIIRS.paletteLabels,
                  };
                  console.log('  📸 VIIRS thumb:', urls[0] ? 'after✓' : 'after✗', urls[1] ? 'before✓' : 'before✗');
                }
                resolve(resultData);
              }).catch(function() { resolve(resultData); });
            } catch(imgErr) {
              console.warn('  ⚠️ VIIRS image generation skipped:', imgErr.message);
              resolve(resultData);
            }
          });
        });
      });
    });
  });
}

// ═══ 3. Landsat-9 도시열섬 (R6) ═══
async function fetchLandsat(regionCode, lookbackDays) {
  regionCode = regionCode || 'KR';
  lookbackDays = lookbackDays || 180; // 구름 없는 이미지 확보 위해 넉넉히
  var t0 = Date.now();
  await authenticateGEE();

  var region = REGIONS[regionCode];
  if (!region) throw new Error('Unknown region: ' + regionCode);
  var geometry = ee.Geometry.Rectangle(region.bbox);

  var endDate = new Date();
  var startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  var collection = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
    .filterBounds(geometry)
    .filterDate(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
    .filter(ee.Filter.lt('CLOUD_COVER', 30))
    .sort('system:time_start', false);

  return new Promise(function(resolve) {
    collection.first().reduceRegion({
      reducer: ee.Reducer.mean(), geometry: geometry, scale: 100, maxPixels: 1e9
    }).evaluate(function(stats, err) {
      if (err || !stats || !stats.ST_B10) {
        return resolve({
          gaugeId: 'R6', source: 'SATELLITE', name: '도시열섬',
          status: 'NO_DATA', error: (err && err.message) || 'No clear Landsat data',
          duration_ms: Date.now() - t0
        });
      }
      var tempC = Math.round((stats.ST_B10 * 0.00341802 + 149.0 - 273.15) * 10) / 10;
      var resultData = {
        gaugeId: 'R6', source: 'SATELLITE', name: '도시열섬', unit: '°C',
        value: tempC, prevValue: null, date: new Date().toISOString().slice(0, 10),
        region: regionCode, status: 'OK', duration_ms: Date.now() - t0,
        source_meta: { dataset: 'LANDSAT/LC09/C02/T1_L2', cloud_filter: 30, scale: 100 }
      };

      // ── 이미지 썸네일 생성 ──
      try {
        // "after": 최신 이미지의 ST_B10 → 켈빈 스케일 적용
        var afterRaw = collection.first().select('ST_B10');
        var afterScaled = afterRaw.multiply(0.00341802).add(149.0);
        // "before": 90~180일 전 구름 30% 미만 최신 이미지
        var bfStart = new Date();
        bfStart.setDate(bfStart.getDate() - 180);
        var bfEnd = new Date();
        bfEnd.setDate(bfEnd.getDate() - 90);
        var beforeCol = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
          .filterBounds(geometry)
          .filterDate(bfStart.toISOString().split('T')[0], bfEnd.toISOString().split('T')[0])
          .filter(ee.Filter.lt('CLOUD_COVER', 30))
          .sort('system:time_start', false);
        var beforeRaw = beforeCol.first().select('ST_B10');
        var beforeScaled = beforeRaw.multiply(0.00341802).add(149.0);

        Promise.all([
          getThumbPromise(afterScaled, geometry, THUMB_PARAMS.LANDSAT),
          getThumbPromise(beforeScaled, geometry, THUMB_PARAMS.LANDSAT),
        ]).then(function(urls) {
          if (urls[0] || urls[1]) {
            resultData.images = {
              after: urls[0] ? { url: urls[0], date: resultData.date } : null,
              before: urls[1] ? { url: urls[1], date: bfEnd.toISOString().slice(0, 10) } : null,
              palette: THUMB_PARAMS.LANDSAT.palette,
              paletteLabels: THUMB_PARAMS.LANDSAT.paletteLabels,
            };
            console.log('  📸 Landsat thumb:', urls[0] ? 'after✓' : 'after✗', urls[1] ? 'before✓' : 'before✗');
          }
          resolve(resultData);
        }).catch(function() { resolve(resultData); });
      } catch(imgErr) {
        console.warn('  ⚠️ Landsat image generation skipped:', imgErr.message);
        resolve(resultData);
      }
    });
  });
}

// ═══ 4. 전체 위성 수집 (순차) ═══
var SENSOR_CONFIG = {
  S2: { fn: fetchVIIRS, minIntervalDays: 1 },
  R6: { fn: fetchLandsat, minIntervalDays: 7 },
};

async function fetchAllSatellite(regionCode, lastSuccessMap) {
  regionCode = regionCode || 'KR';
  lastSuccessMap = lastSuccessMap || {};
  var runStart = Date.now();
  var results = {};
  var failures = [];
  var now = Date.now();

  for (var _entry of Object.entries(SENSOR_CONFIG)) {
    var gaugeId = _entry[0], config = _entry[1];
    var lastSuccess = lastSuccessMap[gaugeId];
    if (lastSuccess) {
      var daysSince = (now - new Date(lastSuccess).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < config.minIntervalDays) {
        results[gaugeId] = { gaugeId: gaugeId, status: 'SKIP', reason: 'Last success ' + Math.round(daysSince * 10) / 10 + 'd ago' };
        continue;
      }
    }
    try {
      results[gaugeId] = await config.fn(regionCode);
      // NO_DATA도 실패로 기록 (0/0/0 사각지대 방지)
      if (results[gaugeId].status === 'NO_DATA') {
        failures.push({ gaugeId: gaugeId, error: results[gaugeId].error || 'NO_DATA' });
      }
    } catch (err) {
      results[gaugeId] = { gaugeId: gaugeId, status: 'ERROR', error: err.message };
      failures.push({ gaugeId: gaugeId, error: err.message });
    }
  }

  return {
    results: results,
    meta: {
      run_id: 'sat_' + runStart,
      asof_kst: new Date(now + 9 * 3600000).toISOString().replace('T', ' ').slice(0, 19) + ' KST',
      duration_ms: Date.now() - runStart,
      region: regionCode,
      collected: Object.values(results).filter(function(r) { return r.status === 'OK'; }).length,
      skipped: Object.values(results).filter(function(r) { return r.status === 'SKIP'; }).length,
      failed: failures.length,
      failures: failures,
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// 5. Facility-level 위성 수집 (공급망 모니터용)
// ═══════════════════════════════════════════════════════════════

// ── 시설 캐시: (lat,lng,radius,sensor) → { data, timestamp } ──
// 같은 항만을 여러 종목이 공유할 때 GEE 중복 호출 방지
var _facilityCache = {};
var CACHE_TTL_MS = 7 * 24 * 3600 * 1000; // 7일 (VIIRS 월간 발행, 2-3개월 지연)

function _cacheKey(lat, lng, radiusKm, sensor) {
  return sensor + ':' + lat.toFixed(3) + ',' + lng.toFixed(3) + ':' + radiusKm;
}

function _getFromCache(key) {
  var entry = _facilityCache[key];
  if (entry && (Date.now() - entry.timestamp) < CACHE_TTL_MS) return entry.data;
  return null;
}

function _setCache(key, data) {
  _facilityCache[key] = { data: data, timestamp: Date.now() };
  // 캐시 크기 제한 (500개 초과 시 오래된 50% 제거)
  var keys = Object.keys(_facilityCache);
  if (keys.length > 500) {
    keys.sort(function(a, b) { return _facilityCache[a].timestamp - _facilityCache[b].timestamp; });
    for (var i = 0; i < 250; i++) delete _facilityCache[keys[i]];
  }
}

/** lat/lng → GEE bbox 변환 (radiusKm 기반) */
function _facilityBbox(lat, lng, radiusKm) {
  var dLat = radiusKm / 111.32;
  var dLng = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

/**
 * fetchFacilityVIIRS — 시설 단위 야간광 수집
 * 반환: { mean_7d, mean_60d, baseline_365d, anomaly, anomPct, quality }
 * 단위: nW/cm²/sr (NTL 원본), anomPct = % (anomaly × 100)
 */
async function fetchFacilityVIIRS(lat, lng, radiusKm) {
  radiusKm = radiusKm || 5;
  var key = _cacheKey(lat, lng, radiusKm, 'NTL');
  var cached = _getFromCache(key);
  if (cached) return cached;

  var t0 = Date.now();
  await authenticateGEE();

  var bbox = _facilityBbox(lat, lng, radiusKm);
  var geometry = ee.Geometry.Rectangle(bbox);
  var endDate = new Date();
  var endStr = endDate.toISOString().split('T')[0];

  // 7일 평균
  var d7 = new Date(); d7.setDate(d7.getDate() - 7);
  // 60일 평균
  var d60 = new Date(); d60.setDate(d60.getDate() - 60);
  // 365일 baseline
  var d365 = new Date(); d365.setDate(d365.getDate() - 365);

  var col = 'NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG';

  function _meanReduce(startDate) {
    return new Promise(function(resolve) {
      ee.ImageCollection(col)
        .filterBounds(geometry)
        .filterDate(startDate.toISOString().split('T')[0], endStr)
        .select('avg_rad')
        .mean()
        .reduceRegion({ reducer: ee.Reducer.mean(), geometry: geometry, scale: 500, maxPixels: 1e8 })
        .evaluate(function(stats, err) {
          resolve((stats && stats.avg_rad != null) ? Math.round(stats.avg_rad * 100) / 100 : null);
        });
    });
  }

  var results = await Promise.all([_meanReduce(d7), _meanReduce(d60), _meanReduce(d365)]);
  var mean7d = results[0], mean60d = results[1], baseline365 = results[2];

  var anomaly = (baseline365 && baseline365 > 0) ? (mean60d - baseline365) / baseline365 : null;
  var anomPct = (anomaly != null) ? Math.round(anomaly * 10000) / 100 : null; // %

  // quality 판정
  var coverageDays = mean7d != null ? 1 : 0; // VIIRS 월간이라 간략화
  var quality = (mean7d != null && mean60d != null && baseline365 != null) ? 'GOOD'
    : (mean60d != null) ? 'PARTIAL' : 'LOW_QUALITY';

  var result = {
    sensor: 'NTL', unit: 'anomPct',
    mean_7d: mean7d, mean_60d: mean60d, baseline_365d: baseline365,
    anomaly: anomaly != null ? Math.round(anomaly * 10000) / 10000 : null,
    anomPct: anomPct,
    quality: { status: quality, coverageDays: coverageDays, cloudPct: null },
    duration_ms: Date.now() - t0,
  };

  _setCache(key, result);
  return result;
}

/**
 * fetchFacilityNO2 — 시설 단위 이산화질소 수집 (Sentinel-5P)
 * cloud_fraction < 0.2 필터 + 7일 이동평균
 * 반환: { mean_7d, mean_30d, baseline_180d, anomaly, anomPct, quality }
 * 단위: mol/m² → anomPct = %
 */
async function fetchFacilityNO2(lat, lng, radiusKm) {
  radiusKm = radiusKm || 5;
  var key = _cacheKey(lat, lng, radiusKm, 'NO2');
  var cached = _getFromCache(key);
  if (cached) return cached;

  var t0 = Date.now();
  await authenticateGEE();

  var bbox = _facilityBbox(lat, lng, radiusKm);
  var geometry = ee.Geometry.Rectangle(bbox);
  var endDate = new Date();
  var endStr = endDate.toISOString().split('T')[0];

  var d7 = new Date(); d7.setDate(d7.getDate() - 7);
  var d30 = new Date(); d30.setDate(d30.getDate() - 30);
  var d180 = new Date(); d180.setDate(d180.getDate() - 180);

  var dataset = 'COPERNICUS/S5P/OFFL/L3_NO2';

  function _no2Mean(startDate) {
    return new Promise(function(resolve) {
      ee.ImageCollection(dataset)
        .filterBounds(geometry)
        .filterDate(startDate.toISOString().split('T')[0], endStr)
        .filter(ee.Filter.lt('SENSING_ORBIT_DIRECTION', 2)) // descending orbit
        .map(function(img) {
          // cloud_fraction < 0.2 마스킹
          var cloudMask = img.select('cloud_fraction').lt(0.2);
          return img.select('tropospheric_NO2_column_number_density')
            .updateMask(cloudMask);
        })
        .mean()
        .reduceRegion({ reducer: ee.Reducer.mean(), geometry: geometry, scale: 1000, maxPixels: 1e8 })
        .evaluate(function(stats, err) {
          var val = stats && stats.tropospheric_NO2_column_number_density;
          resolve(val != null ? val : null);
        });
    });
  }

  var results = await Promise.all([_no2Mean(d7), _no2Mean(d30), _no2Mean(d180)]);
  var mean7d = results[0], mean30d = results[1], baseline180d = results[2];

  // 값을 µmol/m²로 변환 (×1e6) 후 반올림
  var toMicro = function(v) { return v != null ? Math.round(v * 1e6 * 100) / 100 : null; };
  mean7d = toMicro(mean7d); mean30d = toMicro(mean30d); baseline180d = toMicro(baseline180d);

  var anomaly = (baseline180d && baseline180d > 0) ? (mean30d - baseline180d) / baseline180d : null;
  var anomPct = anomaly != null ? Math.round(anomaly * 10000) / 100 : null;

  var quality = (mean7d != null && mean30d != null && baseline180d != null) ? 'GOOD'
    : (mean30d != null) ? 'PARTIAL' : 'LOW_QUALITY';

  var result = {
    sensor: 'NO2', unit: 'anomPct',
    mean_7d: mean7d, mean_30d: mean30d, baseline_180d: baseline180d,
    anomaly: anomaly != null ? Math.round(anomaly * 10000) / 10000 : null,
    anomPct: anomPct,
    quality: { status: quality, coverageDays: null, cloudPct: null },
    duration_ms: Date.now() - t0,
  };

  _setCache(key, result);
  return result;
}

/**
 * fetchFacilityThermal — 시설 단위 열적외선 수집 (Landsat-9 ST_B10)
 * cloud < 30% 필터
 * 반환: { tempC, baseline_tempC, anomaly_degC, quality }
 * 단위: °C (anomaly_degC = °C 차이)
 */
async function fetchFacilityThermal(lat, lng, radiusKm) {
  radiusKm = radiusKm || 5;
  var key = _cacheKey(lat, lng, radiusKm, 'THERMAL');
  var cached = _getFromCache(key);
  if (cached) return cached;

  var t0 = Date.now();
  await authenticateGEE();

  var bbox = _facilityBbox(lat, lng, radiusKm);
  var geometry = ee.Geometry.Rectangle(bbox);
  var endDate = new Date();
  var endStr = endDate.toISOString().split('T')[0];

  // 최근 60일 평균 (Landsat 16일 주기)
  var d60 = new Date(); d60.setDate(d60.getDate() - 60);
  // 365일 baseline
  var d365 = new Date(); d365.setDate(d365.getDate() - 365);

  var dataset = 'LANDSAT/LC09/C02/T1_L2';

  function _thermalMean(startDate, endDateStr) {
    return new Promise(function(resolve) {
      ee.ImageCollection(dataset)
        .filterBounds(geometry)
        .filterDate(startDate.toISOString().split('T')[0], endDateStr)
        .filter(ee.Filter.lt('CLOUD_COVER', 30))
        .select('ST_B10')
        .mean()
        .reduceRegion({ reducer: ee.Reducer.mean(), geometry: geometry, scale: 100, maxPixels: 1e8 })
        .evaluate(function(stats, err) {
          if (stats && stats.ST_B10 != null) {
            var tempC = Math.round((stats.ST_B10 * 0.00341802 + 149.0 - 273.15) * 10) / 10;
            resolve(tempC);
          } else {
            resolve(null);
          }
        });
    });
  }

  var results = await Promise.all([_thermalMean(d60, endStr), _thermalMean(d365, endStr)]);
  var tempC = results[0], baselineTempC = results[1];

  var anomalyDegC = (tempC != null && baselineTempC != null) ? Math.round((tempC - baselineTempC) * 10) / 10 : null;

  var quality = (tempC != null && baselineTempC != null) ? 'GOOD'
    : (tempC != null) ? 'PARTIAL' : 'LOW_QUALITY';

  var result = {
    sensor: 'THERMAL', unit: 'anomDegC',
    tempC: tempC, baseline_tempC: baselineTempC,
    anomaly_degC: anomalyDegC,
    quality: { status: quality, coverageDays: null, cloudPct: null },
    duration_ms: Date.now() - t0,
  };

  _setCache(key, result);
  return result;
}

/**
 * fetchFacilitySensors — 시설 1개에 대해 선언된 센서 모두 수집
 * @param {Object} facility - { lat, lng, radiusKm, sensors: ['NTL','NO2','THERMAL'] }
 * @returns {{ NTL?: object, NO2?: object, THERMAL?: object }}
 */
async function fetchFacilitySensors(facility) {
  var sensorFns = { NTL: fetchFacilityVIIRS, NO2: fetchFacilityNO2, THERMAL: fetchFacilityThermal };
  var sensors = facility.sensors || ['NTL'];
  var radius = facility.radiusKm || 5;
  var results = {};

  // 세마포어 + 타임아웃: GEE 동시 3개 제한, 30초 타임아웃
  for (var i = 0; i < sensors.length; i++) {
    var s = sensors[i];
    if (sensorFns[s]) {
      try {
        var fn = sensorFns[s];
        var lat = facility.lat, lng = facility.lng;
        results[s] = await _geeSem.run(function() {
          return conc.withTimeout(
            fn(lat, lng, radius),
            _geeTimeout,
            'GEE ' + s + ' ' + facility.name
          );
        });
      } catch (err) {
        results[s] = { sensor: s, status: 'ERROR', error: err.message };
      }
    }
  }
  return results;
}

// ═══ 캐시 관리 ═══
function clearFacilityCache() {
  _facilityCache = {};
}

function getFacilityCacheSize() {
  return Object.keys(_facilityCache).length;
}

if (require.main === module) {
  console.log('=== DIAH-7M Satellite Test ===\n');
  fetchAllSatellite('KR').then(function(r) { console.log(JSON.stringify(r, null, 2)); process.exit(0); })
    .catch(function(e) { console.error('Error:', e); process.exit(1); });
}

module.exports = {
  authenticateGEE: authenticateGEE,
  fetchVIIRS: fetchVIIRS,
  fetchLandsat: fetchLandsat,
  fetchAllSatellite: fetchAllSatellite,
  // facility-level
  fetchFacilityVIIRS: fetchFacilityVIIRS,
  fetchFacilityNO2: fetchFacilityNO2,
  fetchFacilityThermal: fetchFacilityThermal,
  fetchFacilitySensors: fetchFacilitySensors,
  clearFacilityCache: clearFacilityCache,
  getFacilityCacheSize: getFacilityCacheSize,
  getThumbPromise: getThumbPromise,
  facilityBbox: _facilityBbox,
  REGIONS: REGIONS,
  SENSOR_CONFIG: SENSOR_CONFIG,
};
