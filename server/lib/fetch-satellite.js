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

let geeInitialized = false;

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
      image.getThumbURL({
        region: geometry,
        dimensions: params.dimensions,
        palette: params.palette,
        min: params.min, max: params.max,
        format: 'png',
      }, function(url, err) { resolve(err || !url ? null : url); });
    } catch(e) {
      console.warn('  ⚠️ getThumbURL error:', e.message);
      resolve(null);
    }
  });
}

// ═══ 2. VIIRS 야간광 (S2) ═══
// 43국 수도/경제 중심지 bbox (약 30~50km)
const REGIONS = {
  // ── OECD 38국 ──
  KR: { name: '대한민국 (서울)', bbox: [126.7, 37.4, 127.2, 37.7] },
  US: { name: 'USA (New York)', bbox: [-74.1, 40.6, -73.7, 40.9] },
  JP: { name: '日本 (東京)', bbox: [139.5, 35.5, 139.9, 35.8] },
  DE: { name: 'Deutschland (Berlin)', bbox: [13.2, 52.4, 13.6, 52.6] },
  GB: { name: 'UK (London)', bbox: [-0.3, 51.4, 0.1, 51.6] },
  FR: { name: 'France (Paris)', bbox: [2.2, 48.8, 2.5, 48.9] },
  CA: { name: 'Canada (Toronto)', bbox: [-79.5, 43.6, -79.2, 43.8] },
  AU: { name: 'Australia (Sydney)', bbox: [151.1, -33.9, 151.3, -33.8] },
  IT: { name: 'Italia (Roma)', bbox: [12.3, 41.8, 12.6, 42.0] },
  ES: { name: 'España (Madrid)', bbox: [-3.8, 40.3, -3.5, 40.5] },
  MX: { name: 'México (CDMX)', bbox: [-99.3, 19.3, -99.0, 19.5] },
  NL: { name: 'Nederland (Amsterdam)', bbox: [4.7, 52.3, 5.0, 52.4] },
  CH: { name: 'Schweiz (Zürich)', bbox: [8.4, 47.3, 8.6, 47.4] },
  SE: { name: 'Sverige (Stockholm)', bbox: [17.9, 59.3, 18.2, 59.4] },
  PL: { name: 'Polska (Warszawa)', bbox: [20.9, 52.1, 21.1, 52.3] },
  BE: { name: 'België (Brussel)', bbox: [4.3, 50.8, 4.5, 50.9] },
  AT: { name: 'Österreich (Wien)', bbox: [16.3, 48.1, 16.5, 48.3] },
  NO: { name: 'Norge (Oslo)', bbox: [10.6, 59.9, 10.8, 60.0] },
  DK: { name: 'Danmark (København)', bbox: [12.4, 55.6, 12.7, 55.7] },
  FI: { name: 'Suomi (Helsinki)', bbox: [24.8, 60.1, 25.1, 60.2] },
  IE: { name: 'Ireland (Dublin)', bbox: [-6.4, 53.3, -6.1, 53.4] },
  PT: { name: 'Portugal (Lisboa)', bbox: [-9.2, 38.7, -9.0, 38.8] },
  CZ: { name: 'Česko (Praha)', bbox: [14.3, 50.0, 14.5, 50.1] },
  GR: { name: 'Greece (Athina)', bbox: [23.6, 37.9, 23.8, 38.0] },
  HU: { name: 'Magyarorszag (Budapest)', bbox: [19.0, 47.4, 19.2, 47.6] },
  NZ: { name: 'New Zealand (Auckland)', bbox: [174.7, -36.9, 174.9, -36.8] },
  IL: { name: 'Israel (Tel Aviv)', bbox: [34.7, 32.0, 34.9, 32.1] },
  CL: { name: 'Chile (Santiago)', bbox: [-70.7, -33.5, -70.5, -33.4] },
  TR: { name: 'Turkiye (Istanbul)', bbox: [28.8, 41.0, 29.2, 41.1] },
  CO: { name: 'Colombia (Bogota)', bbox: [-74.2, 4.6, -74.0, 4.7] },
  SK: { name: 'Slovensko (Bratislava)', bbox: [17.0, 48.1, 17.2, 48.2] },
  LT: { name: 'Lietuva (Vilnius)', bbox: [25.2, 54.6, 25.4, 54.7] },
  SI: { name: 'Slovenija (Ljubljana)', bbox: [14.4, 46.0, 14.6, 46.1] },
  LV: { name: 'Latvija (Riga)', bbox: [23.9, 56.9, 24.2, 57.0] },
  EE: { name: 'Eesti (Tallinn)', bbox: [24.7, 59.4, 24.9, 59.5] },
  LU: { name: 'Luxembourg', bbox: [6.1, 49.5, 6.2, 49.7] },
  IS: { name: 'Island (Reykjavik)', bbox: [-22.0, 64.1, -21.8, 64.2] },
  CR: { name: 'Costa Rica (San Jose)', bbox: [-84.1, 9.9, -83.9, 10.0] },
  // ── 추가 5국 ──
  SG: { name: 'Singapore', bbox: [103.7, 1.2, 104.0, 1.4] },
  HK: { name: 'Hong Kong', bbox: [114.1, 22.2, 114.3, 22.4] },
  TW: { name: 'Taiwan (Taipei)', bbox: [121.4, 25.0, 121.6, 25.1] },
  IN: { name: 'India (Mumbai)', bbox: [72.8, 19.0, 73.0, 19.2] },
  CN: { name: 'China (Shanghai)', bbox: [121.3, 31.1, 121.6, 31.4] },
};

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
  REGIONS: REGIONS,
  SENSOR_CONFIG: SENSOR_CONFIG,
};
