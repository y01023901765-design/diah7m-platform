# DIAH-7M 배포 + 관통 테스트 가이드

## 1단계: API 키 발급 (무료, 각 5분)

### ECOS (한국은행)
1. https://ecos.bok.or.kr/api → 회원가입 → 인증키 발급
2. 인증키 복사 (영숫자 문자열)

### KOSIS (통계청)
1. https://kosis.kr/openapi → 회원가입 → 인증키 발급
2. 인증키 복사

## 2단계: Render 배포

### 방법 A: render.yaml 자동 (권장)
1. https://render.com → GitHub 연동
2. New → Blueprint → diah7m-platform 리포 선택
3. render.yaml 자동 감지 → 환경변수 입력:
   - `ECOS_API_KEY`: 위에서 복사한 ECOS 키
   - `KOSIS_API_KEY`: 위에서 복사한 KOSIS 키
   - `ADMIN_PASSWORD`: 원하는 관리자 비밀번호
4. Deploy

### 방법 B: 수동
1. Render → New Web Service → GitHub 리포 연동
2. Root Directory: `server`
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Environment Variables 추가:
   - `PORT` = `3700`
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (Generate 버튼)
   - `ECOS_API_KEY` = (ECOS 키)
   - `KOSIS_API_KEY` = (KOSIS 키)
   - `ADMIN_PASSWORD` = (관리자 비밀번호)
6. Deploy

## 3단계: 배포 확인

브라우저에서:
```
https://your-app.onrender.com/api/health
```
→ `{"status":"ok","modules":{"db":"loaded","core-engine":"loaded",...}}` 확인

## 4단계: 관통 테스트

### 로컬에서 (서버 실행 중):
```bash
cd server
ECOS_API_KEY=xxx KOSIS_API_KEY=xxx node test/pipeline-test.js
```

### Render 서버 대상:
```bash
API_URL=https://your-app.onrender.com ADMIN_PASSWORD=xxx node test/pipeline-test.js --via-api
```

### 결과 예시:
```
═══════════════════════════════════════
  4. DATA REFRESH (실수집)
═══════════════════════════════════════
  Total time                     12340 ms
  OK                   ████████████░░░░░░░░ 60% (35/59)
  Pending (satellite)            4
  No data                        8
  API errors                     2
  Avg latency                    180 ms

═══════════════════════════════════════
  7. SUMMARY
  수집    → 35/59 OK  (12340ms)
  캐시    → 35 entries, 0 stale
  엔진    → L2 관측  (3ms)
  보고서  → RPT-KR-20260213-M...
═══════════════════════════════════════
  ✅ PIPELINE THROUGHPUT TEST COMPLETE
```

## 5단계: 결과를 Claude에게 공유

관통 테스트 로그 전체를 복사해서 Claude 채팅에 붙여넣기.
→ 병목 위치 파악 → 즉시 수정

## Vercel (프론트엔드) 연결

Render 배포 완료 후:
1. Vercel 프로젝트 → Settings → Environment Variables
2. `VITE_API_URL` = `https://your-app.onrender.com`
3. Redeploy

이제 프론트 Dashboard에 `● LIVE` 배지가 표시됩니다.
