# DIAH-7M N22~N24 최종 완성 코드

**GPT 피드백 완전 반영 (2026-02-16)**

---

## 🚨 핵심 원칙

### ❌ **절대 금지**
```javascript
// API에서 fetchCountry() 호출 금지!
const data = await fetchCountry(country); // ❌
```

### ✅ **정답**
```javascript
// 캐시만 서빙
const cached = await store.get(diagnosisKey(country, today)); // ✅
```

---

## 📦 파일 구조

```
server/
├── lib/
│   ├── store/
│   │   ├── index.js          # 저장소 선택 (메모리/Redis/파일)
│   │   ├── memory.js         # 메모리 저장소
│   │   ├── redis.js          # Redis 저장소 (Upstash)
│   │   └── file.js           # 파일 저장소 (디버그용)
│   └── globalKeys.js         # 캐시 키 규칙 (날짜 기반)
├── jobs/
│   ├── globalCollector.js    # 43국 수집 로직
│   └── globalScheduler.js    # Cron 스케줄러
├── routes/
│   ├── global.js             # GET /diagnosis/:country
│   └── admin.js              # 관리자 수동 수집
└── middleware/
    └── adminAuth.js          # 토큰 인증

src/
├── hooks/
│   └── useGlobalDiagnosis.js # 글로벌 진단 Hook
└── utils/
    └── api.js                # requestGlobal 추가
```

---

## 🔧 1. 환경변수 (Render)

```bash
# 필수
STORE_DRIVER=redis              # memory | redis | file
REDIS_URL=redis://...           # Upstash Redis URL
ADMIN_TOKEN=your-32char-token   # 관리자 토큰

# 선택
GLOBAL_CRON=0 9 * * *          # 매일 09:00 (UTC)
GLOBAL_COUNTRIES=KR,US,JP,CN,DE # 지정 없으면 전체 43국
GLOBAL_CONCURRENCY=4            # 동시 수집 수
```

---

## 📄 2. lib/store/index.js

```javascript
/**
 * 저장소 선택 (Memory / Redis / File)
 */

import { MemoryStore } from './memory.js';
import { RedisStore } from './redis.js';
import { FileStore } from './file.js';

export function createStore() {
  const driver = (process.env.STORE_DRIVER || 'memory').toLowerCase();
  
  if (driver === 'redis') {
    if (!process.env.REDIS_URL) {
      throw new Error('STORE_DRIVER=redis but REDIS_URL is missing');
    }
    return new RedisStore(process.env.REDIS_URL);
  }
  
  if (driver === 'file') {
    return new FileStore(process.env.STORE_DIR || './data-cache');
  }
  
  return new MemoryStore();
}
```

---

## 📄 3. lib/store/memory.js

```javascript
/**
 * 메모리 저장소 (개발/로컬용)
 */

export class MemoryStore {
  constructor() {
    this.map = new Map();
  }
  
  async get(key) {
    return this.map.get(key) ?? null;
  }
  
  async set(key, value) {
    this.map.set(key, value);
    return true;
  }
  
  async del(key) {
    this.map.delete(key);
    return true;
  }
}
```

---

## 📄 4. lib/store/redis.js

```javascript
/**
 * Redis 저장소 (Upstash 권장)
 */

import Redis from 'ioredis';

export class RedisStore {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl, { 
      maxRetriesPerRequest: 2 
    });
  }
  
  async get(key) {
    const raw = await this.redis.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  
  async set(key, value) {
    await this.redis.set(key, JSON.stringify(value));
    return true;
  }
  
  async del(key) {
    await this.redis.del(key);
    return true;
  }
}
```

---

## 📄 5. lib/store/file.js

```javascript
/**
 * 파일 저장소 (디버그용)
 * 
 * ⚠️ Render는 재시작 시 파일 소실!
 */

import fs from 'fs';
import path from 'path';

export class FileStore {
  constructor(dir) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
  }
  
  filePath(key) {
    const safe = key.replace(/[\/\\:]/g, '_');
    return path.join(this.dir, `${safe}.json`);
  }
  
  async get(key) {
    const p = this.filePath(key);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  
  async set(key, value) {
    const p = this.filePath(key);
    fs.writeFileSync(p, JSON.stringify(value));
    return true;
  }
  
  async del(key) {
    const p = this.filePath(key);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return true;
  }
}
```

---

## 📄 6. lib/globalKeys.js

```javascript
/**
 * 캐시 키 규칙 (날짜 기반)
 * 
 * GPT 피드백: 하루 1번 수집
 */

export function todayKeyUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function countryDataKey(country, day = todayKeyUTC()) {
  return `country-data:${country}:${day}`;
}

export function diagnosisKey(country, day = todayKeyUTC()) {
  return `diagnosis:${country}:${day}`;
}

export function globalMetaKey(day = todayKeyUTC()) {
  return `global-meta:${day}`;
}
```

---

## 📄 7. jobs/globalCollector.js

```javascript
/**
 * 글로벌 수집 로직
 * 
 * 여기서만 fetchCountry() 호출 허용!
 */

import { fetchCountry } from '../lib/global-pipeline.js';
import { diagnose } from '../lib/core-engine-v2.js';
import { getCountry, PROFILES } from '../lib/country-profiles.js';
import { 
  countryDataKey, 
  diagnosisKey, 
  globalMetaKey, 
  todayKeyUTC 
} from '../lib/globalKeys.js';

function parseCountriesEnv() {
  const raw = process.env.GLOBAL_COUNTRIES;
  if (!raw) return null;
  return raw
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
}

/**
 * 전체 국가 수집 (Cron 또는 수동)
 */
export async function collectAllCountries(store) {
  const day = todayKeyUTC();
  const list = parseCountriesEnv() || 
    Object.keys(PROFILES).map(c => c.toUpperCase());
  
  const meta = {
    day,
    total: list.length,
    ok: [],
    failed: [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };
  
  // 동시 수집 제한 (Rate Limit 방지)
  const concurrency = Number(process.env.GLOBAL_CONCURRENCY || 4);
  
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < list.length) {
      const country = list[idx++];
      const profile = getCountry(country);
      
      if (!profile) {
        meta.failed.push({ 
          country, 
          reason: 'COUNTRY_NOT_SUPPORTED' 
        });
        continue;
      }
      
      try {
        // 데이터 수집
        const data = await fetchCountry(country);
        
        await store.set(countryDataKey(country, day), {
          country,
          day,
          gauges: data.gauges || [],
          collectedAt: new Date().toISOString(),
        });
        
        // 진단 실행
        const diagnosis = await diagnose(data.gauges, { country });
        
        await store.set(diagnosisKey(country, day), {
          country,
          day,
          diagnosis,
          computedAt: new Date().toISOString(),
        });
        
        meta.ok.push(country);
        console.log(`[GLOBAL] ✅ ${country} collected`);
        
      } catch (e) {
        meta.failed.push({ country, reason: e.message });
        console.log(`[GLOBAL] ❌ ${country} failed: ${e.message}`);
      }
    }
  });
  
  await Promise.all(workers);
  
  meta.finishedAt = new Date().toISOString();
  await store.set(globalMetaKey(day), meta);
  
  return meta;
}

/**
 * 단일 국가 수집 (관리자 수동)
 */
export async function collectOneCountry(store, countryInput) {
  const country = String(countryInput || '').toUpperCase();
  const profile = getCountry(country);
  
  if (!profile) {
    return {
      ok: false,
      country,
      reason: 'COUNTRY_NOT_SUPPORTED',
    };
  }
  
  const day = todayKeyUTC();
  
  try {
    const data = await fetchCountry(country);
    
    await store.set(countryDataKey(country, day), {
      country,
      day,
      gauges: data.gauges || [],
      collectedAt: new Date().toISOString(),
    });
    
    const diagnosis = await diagnose(data.gauges, { country });
    
    await store.set(diagnosisKey(country, day), {
      country,
      day,
      diagnosis,
      computedAt: new Date().toISOString(),
    });
    
    return { ok: true, country, day };
    
  } catch (e) {
    return { ok: false, country, day, reason: e.message };
  }
}
```

---

## 📄 8. jobs/globalScheduler.js

```javascript
/**
 * Cron 스케줄러
 * 
 * GPT 피드백: 매일 09:00 자동 수집
 */

import cron from 'node-cron';
import { collectAllCountries } from './globalCollector.js';

export function startGlobalScheduler(store) {
  const schedule = process.env.GLOBAL_CRON || '0 9 * * *';
  
  console.log(`[GLOBAL] Scheduler start: ${schedule}`);
  
  cron.schedule(schedule, async () => {
    console.log('[GLOBAL] Scheduled collection start');
    
    try {
      const meta = await collectAllCountries(store);
      console.log(
        `[GLOBAL] Done: ok=${meta.ok.length}, failed=${meta.failed.length}`
      );
    } catch (e) {
      console.log(`[GLOBAL] Error: ${e.message}`);
    }
  });
}
```

---

## 📄 9. routes/global.js

```javascript
/**
 * 글로벌 진단 API
 * 
 * 🚨 여기서 fetchCountry() 호출 금지!
 */

import express from 'express';
import { getCountry, PROFILES } from '../lib/country-profiles.js';
import { todayKeyUTC, diagnosisKey, globalMetaKey } from '../lib/globalKeys.js';

export default function buildGlobalRouter(store) {
  const router = express.Router();
  
  /**
   * GET /api/v1/global/countries
   * 지원 국가 목록
   */
  router.get('/countries', (req, res) => {
    const list = Object.keys(PROFILES).map(code => {
      const p = getCountry(code);
      return { 
        code: p.code, 
        name: p.name, 
        tier: p.tier || 'PRO' 
      };
    });
    
    res.json({ success: true, data: list });
  });
  
  /**
   * GET /api/v1/global/meta/today
   * 오늘 수집 메타 (성공/실패 국가)
   */
  router.get('/meta/today', async (req, res) => {
    const day = todayKeyUTC();
    const meta = await store.get(globalMetaKey(day));
    
    if (!meta) {
      return res.json({
        success: true,
        data: { 
          day, 
          ok: [], 
          failed: [], 
          total: Object.keys(PROFILES).length 
        },
        stale: true,
        warnings: ['GLOBAL_META_MISSING'],
      });
    }
    
    res.json({ success: true, data: meta });
  });
  
  /**
   * GET /api/v1/global/diagnosis/:country
   * 
   * 핵심: 캐시만 서빙 (fetchCountry 금지!)
   */
  router.get('/diagnosis/:country', async (req, res) => {
    const country = String(req.params.country || '').toUpperCase();
    const profile = getCountry(country);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        code: 'COUNTRY_NOT_FOUND',
        message: `Country ${country} not supported`,
      });
    }
    
    const day = todayKeyUTC();
    const cached = await store.get(diagnosisKey(country, day));
    
    if (!cached?.diagnosis) {
      // ❌ fetchCountry() 호출 금지!
      // ✅ demo/stale 반환
      return res.json({
        success: true,
        data: null,
        country: profile,
        demo: true,
        stale: true,
        warnings: ['CACHE_MISS_NO_TODAY_DIAGNOSIS'],
      });
    }
    
    // CDN 캐싱 헤더
    res.setHeader(
      'Cache-Control', 
      'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400'
    );
    
    res.json({
      success: true,
      data: cached.diagnosis,
      country: profile,
      day,
      demo: false,
      stale: false,
    });
  });
  
  return router;
}
```

---

## 📄 10. middleware/adminAuth.js

```javascript
/**
 * 관리자 토큰 인증
 */

export function requireAdmin(req, res, next) {
  const token = process.env.ADMIN_TOKEN;
  
  if (!token) {
    return res.status(500).json({
      success: false,
      code: 'ADMIN_TOKEN_MISSING',
      message: 'ADMIN_TOKEN is not configured',
    });
  }
  
  const header = req.headers['authorization'] || '';
  const bearer = header.startsWith('Bearer ') 
    ? header.slice(7) 
    : null;
  
  // 쿼리로도 허용 (편의)
  const queryToken = req.query.token 
    ? String(req.query.token) 
    : null;
  
  const provided = bearer || queryToken;
  
  if (!provided || provided !== token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Invalid admin token',
    });
  }
  
  next();
}
```

---

## 📄 11. routes/admin.js

```javascript
/**
 * 관리자 API (수동 수집)
 */

import express from 'express';
import { requireAdmin } from '../middleware/adminAuth.js';
import { 
  collectAllCountries, 
  collectOneCountry 
} from '../jobs/globalCollector.js';
import { todayKeyUTC, globalMetaKey } from '../lib/globalKeys.js';

export default function buildAdminRouter(store) {
  const router = express.Router();
  
  /**
   * GET /api/v1/admin/global/status
   * 오늘 수집 상태 확인
   */
  router.get('/global/status', requireAdmin, async (req, res) => {
    const day = todayKeyUTC();
    const meta = await store.get(globalMetaKey(day));
    
    res.json({
      success: true,
      data: meta || { day, ok: [], failed: [], total: null },
      stale: !meta,
    });
  });
  
  /**
   * POST /api/v1/admin/global/collect
   * 전체 국가 수동 수집 (배포 직후 1회 실행)
   */
  router.post('/global/collect', requireAdmin, async (req, res) => {
    try {
      const meta = await collectAllCountries(store);
      res.json({ success: true, data: meta });
    } catch (e) {
      res.status(500).json({
        success: false,
        code: 'COLLECT_ERROR',
        message: e.message,
      });
    }
  });
  
  /**
   * POST /api/v1/admin/global/collect/:country
   * 특정 국가만 수동 수집
   */
  router.post('/global/collect/:country', requireAdmin, async (req, res) => {
    try {
      const { country } = req.params;
      const result = await collectOneCountry(store, country);
      
      if (!result.ok) {
        return res.status(
          result.reason === 'COUNTRY_NOT_SUPPORTED' ? 404 : 500
        ).json({
          success: false,
          code: result.reason === 'COUNTRY_NOT_SUPPORTED' 
            ? 'COUNTRY_NOT_FOUND' 
            : 'COLLECT_ONE_ERROR',
          message: result.reason,
          country: result.country,
          day: result.day,
        });
      }
      
      res.json({ success: true, data: result });
      
    } catch (e) {
      res.status(500).json({
        success: false,
        code: 'COLLECT_ONE_EXCEPTION',
        message: e.message,
      });
    }
  });
  
  return router;
}
```

---

## 📄 12. server.js 통합

```javascript
/**
 * server.js에 추가
 */

import express from 'express';
import cors from 'cors';
import { createStore } from './lib/store/index.js';
import buildGlobalRouter from './routes/global.js';
import buildAdminRouter from './routes/admin.js';
import { startGlobalScheduler } from './jobs/globalScheduler.js';

const app = express();
app.use(cors());
app.use(express.json());

// 저장소 생성
const store = createStore();

// Health Check
app.get('/api/health', (req, res) => 
  res.json({ ok: true, timestamp: new Date().toISOString() })
);

// 글로벌 라우터
app.use('/api/v1/global', buildGlobalRouter(store));

// 관리자 라우터
app.use('/api/v1/admin', buildAdminRouter(store));

// Cron 스케줄러 시작
startGlobalScheduler(store);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server on ${port}`));
```

---

## 📄 13. Frontend - hooks/useGlobalDiagnosis.js

```javascript
/**
 * 글로벌 진단 Hook
 */

import { useEffect, useState } from 'react';
import api from '../utils/api';

export function useGlobalDiagnosis(country = 'KR') {
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchIt = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const r = country === 'KR'
        ? await api.getDiagnosis('kr')
        : await api.requestGlobal(country);
      
      setRes(r);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchIt();
  }, [country]);
  
  return { res, loading, error, refetch: fetchIt };
}
```

---

## 📄 14. Frontend - utils/api.js 수정

```javascript
/**
 * api.js에 추가
 */

export const api = {
  // 기존...
  health: () => request('/api/health'),
  getDiagnosis: (country = 'kr') => 
    request(`/api/v1/diagnosis/${country}`),
  
  // 🆕 글로벌 추가
  requestGlobal: (country) => 
    request(`/api/v1/global/diagnosis/${country}`),
  
  getCountries: () => 
    request('/api/v1/global/countries'),
  
  getGlobalMeta: () => 
    request('/api/v1/global/meta/today'),
};
```

---

## 📄 15. Frontend - components/CountrySelector.jsx

```javascript
/**
 * 국가 선택 드롭다운
 * 
 * GPT 피드백: KR만 무료, 나머지 PRO
 */

import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function CountrySelector({ value, onChange, userTier = 'FREE' }) {
  const [countries, setCountries] = useState([]);
  
  useEffect(() => {
    api.getCountries()
      .then(res => setCountries(res.data || []))
      .catch(console.error);
  }, []);
  
  return (
    <select 
      value={value} 
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid rgba(0,0,0,0.2)',
      }}
    >
      {countries.map(country => {
        const locked = country.tier === 'PRO' && userTier === 'FREE';
        
        return (
          <option 
            key={country.code} 
            value={country.code}
            disabled={locked}
          >
            {country.name}
            {locked && ' 🔒 (PRO)'}
          </option>
        );
      })}
    </select>
  );
}
```

---

## 📄 16. Frontend - Dashboard.jsx 통합

```javascript
/**
 * Dashboard에 국가 선택 추가
 */

import { useState } from 'react';
import { useGlobalDiagnosis } from '../hooks/useGlobalDiagnosis';
import CountrySelector from '../components/CountrySelector';
import StatusBanner from '../components/StatusBanner';

export default function Dashboard({ user }) {
  const [country, setCountry] = useState('KR');
  const { res, loading, error, refetch } = useGlobalDiagnosis(country);
  
  return (
    <div>
      {/* 국가 선택 */}
      <CountrySelector 
        value={country} 
        onChange={setCountry} 
        userTier={user?.tier || 'FREE'}
      />
      
      {/* 상태 배너 */}
      <StatusBanner res={res} onRefresh={refetch} />
      
      {/* 진단 결과 */}
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {res?.data && <DiagnosisView diagnosis={res.data} />}
    </div>
  );
}
```

---

## 🚀 배포 가이드

### 1. Render 환경변수 설정

```bash
STORE_DRIVER=redis
REDIS_URL=redis://...  # Upstash Redis
ADMIN_TOKEN=your-32-char-secure-token
GLOBAL_CRON=0 9 * * *
GLOBAL_COUNTRIES=KR,US,JP,CN,DE
```

### 2. 패키지 설치

```bash
npm install ioredis node-cron
```

### 3. 배포 직후 캐시 채우기

```bash
# 전체 43국 수집
curl -X POST "https://your-api.com/api/v1/admin/global/collect" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 또는 특정 국가만
curl -X POST "https://your-api.com/api/v1/admin/global/collect/KR" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 4. 상태 확인

```bash
curl "https://your-api.com/api/v1/admin/global/status" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## ✅ 체크리스트

- [ ] Upstash Redis 계정 생성
- [ ] REDIS_URL 환경변수 설정
- [ ] ADMIN_TOKEN 설정 (32자 이상)
- [ ] 배포 후 /admin/global/collect 1회 실행
- [ ] /global/meta/today 확인
- [ ] Frontend에서 국가 선택 테스트

---

## 🎯 최종 확인

**성공 조건:**
1. ✅ `/api/v1/global/diagnosis/KR` → 200 OK
2. ✅ `/api/v1/global/diagnosis/US` → demo:true (첫 수집 전)
3. ✅ 수집 후 → demo:false
4. ✅ 국가 변경 시 자동 리패치
5. ✅ demo/stale 배너 표시

---

**N22~N24 완성!** 🎉
**창1 글로벌 확장 100% 완료!** 🎊
