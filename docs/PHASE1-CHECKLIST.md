# DIAH-7M Phase 1 실행 체크리스트

**작성**: 2026-02-16  
**목표**: Frontend ↔ Backend 최소 연결  
**예상 시간**: 2시간

---

## 📋 준비 단계 (10분)

### 로컬 환경
- [ ] Node.js 20+ 설치 확인 (`node -v`)
- [ ] Git 설치 확인 (`git --version`)
- [ ] 프로젝트 클론 완료
- [ ] `npm install` 실행 완료 (server/ 및 루트)

### 접근 권한
- [ ] GitHub 접근 가능 (y01023901765-design/diah7m-platform)
- [ ] Vercel 로그인 가능
- [ ] Render 로그인 가능

---

## 🔧 로컬 작업 (30분)

### 1. 파일 복사
- [ ] `routes-diagnosis.js` → `server/routes/diagnosis.js`
- [ ] `server.js` → `server/server.js` (기존 백업: `server.js.backup`)
- [ ] `.env.template` → `server/.env.example`
- [ ] `.env.frontend.template` → `.env.example`

### 2. 로컬 환경 변수 설정
```bash
# server/.env 생성
NODE_ENV=development
PORT=4000
JWT_SECRET=dev-secret-change-me

# .env 생성 (프론트 루트)
VITE_API_URL=http://localhost:4000
```

- [ ] `server/.env` 파일 생성
- [ ] `.env` 파일 생성 (프론트)
- [ ] `.gitignore`에 `.env` 확인

### 3. 로컬 테스트
```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
npm run dev
```

- [ ] Backend 실행 성공 (포트 4000)
- [ ] Frontend 실행 성공 (포트 5173)
- [ ] Backend 로그에 "Server is running" 표시
- [ ] Backend 로그에 "Allowed origins: ...localhost:5173" 표시

### 4. 로컬 API 테스트
```bash
# 브라우저 또는 curl
curl http://localhost:4000/api/health
curl http://localhost:4000/api/v1/data/status
```

- [ ] `/api/health` 응답 200
- [ ] `/api/v1/data/status` 응답 200
- [ ] JSON 형식 확인

### 5. 로컬 프론트 연결 확인
```
브라우저: http://localhost:5173/dashboard
F12 → Console
```

- [ ] Console에 `API_BASE: http://localhost:4000` 출력 (임시 디버깅 코드)
- [ ] Network 탭에서 `/api/v1/data/...` 요청 확인
- [ ] CORS 에러 없음
- [ ] 응답 200

---

## 📤 Git 작업 (10분)

### 1. 변경사항 확인
```bash
git status
git diff server/server.js
```

- [ ] 수정 파일 확인: `server/server.js`
- [ ] 신규 파일 확인: `server/routes/diagnosis.js`
- [ ] `.env` 파일이 **staging되지 않았는지** 확인 (gitignore)

### 2. 커밋
```bash
git add server/routes/diagnosis.js
git add server/server.js
git add server/.env.example
git add .env.example

git commit -m "feat(window1): Phase 1 - Connect Frontend to Backend

- Add routes/diagnosis.js with 6 endpoints
- Update server.js with CORS whitelist (Vercel + localhost)
- Add environment variable templates
- Status: Local connection tested and working

Phase 1 Progress:
- ✅ Route separation (diagnosis)
- ✅ CORS configuration
- ✅ Environment variables (local)
- ⏸️ Production deployment (next)
"
```

- [ ] 커밋 메시지 작성 완료
- [ ] `git log -1` 확인

### 3. Push (선택 - 로컬 테스트 성공 후)
```bash
git push origin main
```

- [ ] Push 성공
- [ ] GitHub에서 커밋 확인

---

## ☁️ Render 배포 (20분)

### 1. 배포 대기
```
Render Dashboard → diah7m-platform → Events
```

- [ ] Git push 후 자동 배포 시작 확인
- [ ] 빌드 로그 모니터링
- [ ] "Build succeeded" 확인

### 2. 환경 변수 설정
```
Render Dashboard → Environment
```

**추가/확인할 변수:**
```
NODE_ENV = production
PORT = 10000
JWT_SECRET = [생성된 값]
```

- [ ] `NODE_ENV` 확인
- [ ] `PORT` 확인 (자동 설정됨)
- [ ] `JWT_SECRET` 생성 및 추가

**JWT_SECRET 생성:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

- [ ] JWT_SECRET 값 복사
- [ ] Render에 붙여넣기
- [ ] "Save Changes" 클릭
- [ ] 서비스 재시작 확인

### 3. 배포 확인
```bash
# Health Check
curl https://diah7m-platform.onrender.com/api/health

# Data Status
curl https://diah7m-platform.onrender.com/api/v1/data/status
```

- [ ] `/api/health` 응답 200
- [ ] `/api/v1/data/status` 응답 200
- [ ] Render 로그에 "Server is running" 표시
- [ ] Render 로그에 CORS 설정 확인

### 4. CORS 프리플라이트 테스트
```bash
curl -X OPTIONS \
  -H "Origin: https://diah7m-platform.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  https://diah7m-platform.onrender.com/api/v1/data/status
```

- [ ] 응답 200 또는 204
- [ ] `Access-Control-Allow-Origin` 헤더 존재

---

## 🚀 Vercel 배포 (20분)

### 1. 환경 변수 설정
```
Vercel Dashboard → diah7m-platform → Settings → Environment Variables
```

**추가:**
```
Name:  VITE_API_URL
Value: https://diah7m-platform.onrender.com
Scope: Production, Preview, Development (모두 체크)
```

- [ ] 환경 변수 추가 완료
- [ ] Value에 오타 없는지 확인 (https://, 슬래시 없음)
- [ ] "Save" 클릭

### 2. 재배포
```bash
# 방법 A: Git Push
git commit --allow-empty -m "chore: trigger Vercel redeploy"
git push origin main

# 방법 B: Vercel Dashboard
# Deployments → ... → Redeploy
```

- [ ] 재배포 트리거 완료
- [ ] 빌드 시작 확인
- [ ] "Building" → "Deploying" → "Ready" 확인 (2-3분)

### 3. 배포 확인
```
브라우저: https://diah7m-platform.vercel.app
```

- [ ] 사이트 정상 로딩
- [ ] F12 → Console 열기
- [ ] Dashboard 페이지 이동

### 4. 환경 변수 확인 (임시 디버깅)
```javascript
// Dashboard.jsx 최상단에 임시 추가
console.log('🔍 API_BASE:', import.meta.env.VITE_API_URL);
```

- [ ] Console에 `https://diah7m-platform.onrender.com` 출력
- [ ] `undefined` 또는 빈 문자열이면 → Vercel 재배포 다시

### 5. Network 탭 확인
```
F12 → Network → Fetch/XHR 필터
Dashboard 페이지 새로고침
```

- [ ] `/api/v1/data/status` 요청 확인
- [ ] Request URL이 `https://diah7m-platform.onrender.com/...` 인지 확인
- [ ] Status 200
- [ ] Response 데이터 확인
- [ ] CORS 에러 없음 (빨간색 메시지 없음)

---

## ✅ 최종 검증 (10분)

### Backend
- [ ] `/api/health` 정상
- [ ] `/api/v1/data/status` 정상
- [ ] Render 로그 정상
- [ ] CORS 에러 없음

### Frontend
- [ ] 사이트 로딩 정상
- [ ] Console에 API_BASE 출력 정상
- [ ] Network 탭에서 Render로 요청 나감
- [ ] CORS 에러 없음

### 통합
- [ ] 로컬 환경 작동 ✅
- [ ] 프로덕션 환경 작동 ✅
- [ ] 응답 시간 < 10초 (첫 요청 제외)

---

## 🎉 성공 시 다음 단계

- [ ] 임시 디버깅 코드 제거 (`console.log` 등)
- [ ] Git commit: "chore: remove debug logs"
- [ ] GitHub Issue 닫기 (있다면)
- [ ] Phase 2 계획 확인

---

## 🐛 실패 시 체크포인트

### CORS 에러
1. [ ] Render 로그에서 `🚫 CORS blocked origin: ...` 확인
2. [ ] server.js의 `allowedOrigins` 배열 확인
3. [ ] Vercel 도메인이 정확한지 확인

### 환경 변수 미반영
1. [ ] Vercel 재배포 했는지 확인
2. [ ] 브라우저 강력 새로고침 (Cmd+Shift+R)
3. [ ] Console에서 `import.meta.env` 직접 확인

### 404 에러
1. [ ] Render 로그에서 `⚠️ 404 Not Found: ...` 확인
2. [ ] routes/diagnosis.js 경로 확인
3. [ ] server.js에서 `app.use('/api/v1', diagnosisRouter)` 확인

### 500 에러
1. [ ] Render 로그에서 ❌ 에러 메시지 확인
2. [ ] routes/diagnosis.js에서 try-catch 확인
3. [ ] 필요한 모듈 import 확인

---

## 📊 시간 트래킹

| 단계 | 예상 | 실제 | 메모 |
|------|------|------|------|
| 준비 | 10분 | ___ | |
| 로컬 작업 | 30분 | ___ | |
| Git 작업 | 10분 | ___ | |
| Render 배포 | 20분 | ___ | |
| Vercel 배포 | 20분 | ___ | |
| 최종 검증 | 10분 | ___ | |
| **합계** | **100분** | ___ | |

---

## 📝 메모

배포 중 발견한 이슈나 개선사항:

```
(여기에 메모)
```

---

**마지막 업데이트**: 2026-02-16  
**다음 리뷰**: Phase 2 시작 전
