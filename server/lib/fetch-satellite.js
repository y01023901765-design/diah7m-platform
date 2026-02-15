/**
 * DIAH-7M 위성 데이터 수집 모듈
 * Google Earth Engine → Node.js
 * 
 * 필요: npm install @google/earthengine
 */

const ee = require('@google/earthengine');
const fs = require('fs');

// GEE 서비스 계정 인증
const SERVICE_ACCOUNT = process.env.GEE_SERVICE_ACCOUNT || '';
const KEY_FILE = './keys/make1-456808-be67c3bfb578.json';

let geeInitialized = false;

/**
 * GEE 초기화 (한 번만 실행)
 */
async function initializeGEE() {
  if (geeInitialized) return;
  
  return new Promise((resolve, reject) => {
    const privateKey = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
    
    ee.data.authenticateViaPrivateKey(
      privateKey,
      () => {
        ee.initialize(null, null, () => {
          geeInitialized = true;
          console.log('  ✅ GEE 초기화 완료');
          resolve();
        }, reject);
      },
      reject
    );
  });
}

/**
 * S2: 서울 야간광량 (VIIRS DNB)
 * 
 * @param {number} monthsBack - 조회 기간 (개월)
 * @returns {Promise<Object>} - {value, prevValue, date, status}
 */
async function fetchS2Nightlight(monthsBack = 3) {
  await initializeGEE();
  
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);
  const endDate = new Date();
  
  const seoul = ee.Geometry.Rectangle([126.7, 37.4, 127.2, 37.7]);
  
  const viirs = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
    .filterBounds(seoul)
    .filterDate(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
    .select('avg_rad')
    .sort('system:time_start', false);  // 최신순
  
  return new Promise((resolve, reject) => {
    viirs.getInfo((error, collection) => {
      if (error) return reject(error);
      
      const features = collection.features;
      if (features.length === 0) {
        return resolve({ status: 'NO_DATA', error: 'No data available' });
      }
      
      // 최신 2개월 데이터 추출
      const results = [];
      for (let i = 0; i < Math.min(2, features.length); i++) {
        const image = ee.Image(features[i].id);
        
        image.reduceRegion({
          reducer: ee.Reducer.mean(),
          geometry: seoul,
          scale: 1000,
          maxPixels: 1e9
        }).getInfo((err, stats) => {
          if (err) return;
          
          const value = stats.avg_rad;
          if (value && value > 0) {
            const date = new Date(features[i].properties['system:time_start']);
            const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            results.push({
              date: dateStr,
              value: Math.round(value * 100) / 100
            });
          }
          
          // 2개 완료되면 결과 반환
          if (results.length === 2 || i === features.length - 1) {
            resolve({
              gaugeId: 'S2',
              source: 'GEE_VIIRS',
              name: '야간광량(서울)',
              unit: 'nW/cm²/sr',
              value: results[0].value,
              prevValue: results[1] ? results[1].value : null,
              date: results[0].date,
              status: 'OK',
              rows: results.length
            });
          }
        });
      }
    });
  });
}

/**
 * R6: 서울 도시열섬 (Landsat-9)
 * 
 * @param {number} monthsBack - 조회 기간 (개월)
 * @returns {Promise<Object>} - {value, prevValue, date, status}
 */
async function fetchR6HeatIsland(monthsBack = 6) {
  await initializeGEE();
  
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);
  const endDate = new Date();
  
  const seoul = ee.Geometry.Rectangle([126.7, 37.4, 127.2, 37.7]);
  
  // Landsat-9 열적외선 (구름 20% 이하)
  const landsat = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
    .filterBounds(seoul)
    .filterDate(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0])
    .filter(ee.Filter.lt('CLOUD_COVER', 20))
    .sort('system:time_start', false);  // 최신순
  
  return new Promise((resolve, reject) => {
    landsat.getInfo((error, collection) => {
      if (error) return reject(error);
      
      const features = collection.features;
      if (features.length === 0) {
        return resolve({ status: 'NO_DATA', error: 'No Landsat data available' });
      }
      
      // 최신 2개 이미지 처리
      const results = [];
      for (let i = 0; i < Math.min(2, features.length); i++) {
        const image = ee.Image(features[i].id);
        
        // 열밴드 (ST_B10) 추출 및 켈빈→섭씨 변환
        const thermal = image.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15);
        
        thermal.reduceRegion({
          reducer: ee.Reducer.mean(),
          geometry: seoul,
          scale: 100,  // 100m 해상도
          maxPixels: 1e9
        }).getInfo((err, stats) => {
          if (err) return;
          
          const temp = stats.ST_B10;
          if (temp !== null && temp !== undefined) {
            const date = new Date(features[i].properties['system:time_start']);
            const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
            
            results.push({
              date: dateStr,
              value: Math.round(temp * 10) / 10  // 소수점 1자리
            });
          }
          
          // 2개 완료되면 결과 반환
          if (results.length === 2 || i === features.length - 1) {
            results.sort((a, b) => b.date.localeCompare(a.date));  // 최신순 정렬
            
            resolve({
              gaugeId: 'R6',
              source: 'GEE_LANDSAT',
              name: '도시열섬(서울)',
              unit: '°C',
              value: results[0].value,
              prevValue: results[1] ? results[1].value : null,
              date: results[0].date,
              status: 'OK',
              rows: results.length
            });
          }
        });
      }
    });
  });
}

/**
 * 전체 위성 데이터 수집
 * 
 * @returns {Promise<Object>} - {S2, R6, ...}
 */
async function fetchAllSatellite() {
  const results = {};
  
  try {
    results.S2 = await fetchS2Nightlight();
  } catch (err) {
    results.S2 = { gaugeId: 'S2', status: 'ERROR', error: err.message };
  }
  
  try {
    results.R6 = await fetchR6HeatIsland();
  } catch (err) {
    results.R6 = { gaugeId: 'R6', status: 'ERROR', error: err.message };
  }
  
  return results;
}

// 테스트 실행
if (require.main === module) {
  console.log('=== DIAH-7M 위성 데이터 테스트 ===\n');
  
  fetchS2Nightlight().then(result => {
    console.log('S2 야간광량:', JSON.stringify(result, null, 2));
    process.exit(0);
  }).catch(err => {
    console.error('❌ 오류:', err);
    process.exit(1);
  });
}

module.exports = {
  initializeGEE,
  fetchS2Nightlight,
  fetchR6HeatIsland,
  fetchAllSatellite
};
