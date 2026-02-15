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
    const tmpPath = '/tmp/gee-sa.json';
    fs.writeFileSync(tmpPath, decoded, { mode: 0o600 });
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

// ═══ 2. VIIRS 야간광 (S2) ═══
const REGIONS = {
  KR: { name: '대한민국', bbox: [126.0, 33.0, 130.0, 39.0] },
};

async function fetchVIIRS(regionCode, lookbackDays) {
  regionCode = regionCode || 'KR';
  lookbackDays = lookbackDays || 7;
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
    }).evaluate(function(err, latestStats) {
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
      }).evaluate(function(err7, sevenStats) {
        var mean7d = (sevenStats && sevenStats.avg_rad) ? Math.round(sevenStats.avg_rad * 100) / 100 : null;

        // 60일 평균
        rollingCol.mean().reduceRegion({
          reducer: ee.Reducer.mean(), geometry: geometry, scale: 1000, maxPixels: 1e9
        }).evaluate(function(err60, rollingStats) {
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
          }).evaluate(function(errBL, baselineStats) {
            var baseline365 = (baselineStats && baselineStats.avg_rad) ? Math.round(baselineStats.avg_rad * 100) / 100 : null;
            var anomaly = (baseline365 && baseline365 > 0) ? Math.round(((mean60d - baseline365) / baseline365) * 10000) / 10000 : null;

            resolve({
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
            });
          });
        });
      });
    });
  });
}

// ═══ 3. Landsat-9 도시열섬 (R6) ═══
async function fetchLandsat(regionCode, lookbackDays) {
  regionCode = regionCode || 'KR';
  lookbackDays = lookbackDays || 60;
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
    .filter(ee.Filter.lt('CLOUD_COVER', 10))
    .sort('system:time_start', false);

  return new Promise(function(resolve) {
    collection.first().reduceRegion({
      reducer: ee.Reducer.mean(), geometry: geometry, scale: 100, maxPixels: 1e9
    }).evaluate(function(err, stats) {
      if (err || !stats || !stats.ST_B10) {
        return resolve({
          gaugeId: 'R6', source: 'SATELLITE', name: '도시열섬',
          status: 'NO_DATA', error: (err && err.message) || 'No clear Landsat data',
          duration_ms: Date.now() - t0
        });
      }
      var tempC = Math.round((stats.ST_B10 * 0.00341802 + 149.0 - 273.15) * 10) / 10;
      resolve({
        gaugeId: 'R6', source: 'SATELLITE', name: '도시열섬', unit: '°C',
        value: tempC, prevValue: null, date: new Date().toISOString().slice(0, 10),
        region: regionCode, status: 'OK', duration_ms: Date.now() - t0,
        source_meta: { dataset: 'LANDSAT/LC09/C02/T1_L2', cloud_filter: 10, scale: 100 }
      });
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
