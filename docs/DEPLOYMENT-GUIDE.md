# DIAH-7M Phase 1 배포 가이드

**작성**: 2026-02-16  
**목표**: Frontend ↔ Backend 연결 성공  
**소요 시간**: 30분

---

## 📋 사전 준비

### ✅ 필요한 것
- [ ] GitHub 접근 권한 (y01023901765-design/diah7m-platform)
- [ ] Vercel 계정 (프론트엔드 배포)
- [ ] Render 계정 (백엔드 배포)
- [ ] 로컬 개발 환경 (Node.js 20+)

---

## 🚀 배포 순서

### **Step 1: GitHub에 코드 업로드**

```bash
# 1. 다운로드한 파일들을 프로젝트 폴더에 복사
cp routes-diagnosis.js diah7m-platform/server/routes/diagnosis.js
cp server.js diah7m-platform/server/server.js
cp .env.template diah7m-platform/server/.env.example
cp .env.frontend.template diah7m-platform/.env.example

# 2. Git 작업
cd diah7m-platform

# 3. 변경사항 확인
git status

# 4. 커밋
git add server/routes/diagnosis.js
git add server/server.js
git add server/.env.example
git add .env.example

git commit -m "feat(window1): Phase 1 - Connect Frontend to Backend

- Add routes/diagnosis.js (data collection + diagnosis APIs)
- Update server.js with CORS whitelist
- Add environment variable templates
- Status: Frontend ↔ Backend connection ready

Closes #1 (if issue exists)
"

# 5. Push (Render 자동 배포 트리거)
git push origin main
```

---

### **Step 2: Render 환경 변수 설정**

1. **Render Dashboard 접속**
   - https://dashboard.render.com
   - diah7m-platform 서비스 선택

2. **Environment 탭 이동**
   - 왼쪽 메뉴: "Environment"

3. **환경 변수 추가/확인**
   ```
   NODE_ENV = production
   PORT = 10000  (Render 기본값, 자동 설정됨)
   JWT_SECRET = [복사: 아래 명령어 실행]
   ```

4. **JWT_SECRET 생성 (로컬 터미널)**
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   # 출력값을 복사해서 Render에 붙여넣기
   ```

5. **변경사항 저장**
   - "Save Changes" 버튼 클릭
   - 서비스 자동 재시작 (1-2분 소요)

---

### **Step 3: Render 배포 확인**

```bash
# 1. 배포 로그 확인 (Render Dashboard → Logs)
# 기대 출력:
# ╔════════════════════════════════════════╗
# ║   DIAH-7M Backend Server               ║
# ║   Phase 1: 최소 연결 (2026-02-16)      ║
# ╠════════════════════════════════════════╣
# ║   Port:     10000                      ║
# ║   Env:      production                 ║
# ║   CORS:     Vercel + localhost         ║
# ╚════════════════════════════════════════╝
# ✅ Server is running

# 2. Health Check 테스트
curl https://diah7m-platform.onrender.com/api/health

# 기대 응답:
# {
#   "success": true,
#   "status": "ok",
#   "timestamp": "2026-02-16T...",
#   "version": "0.2.0",
#   "environment": "production"
# }

# 3. Data Status 테스트
curl https://diah7m-platform.onrender.com/api/v1/data/status

# 기대 응답:
# {
#   "success": true,
#   "data": {
#     "collected": 56,
#     "total": 59,
#     "percentage": 94.9,
#     "missing": ["O2_PMI", "S2_NIGHTLIGHT", "R6_THERMAL"]
#   }
# }
```

**✅ 백엔드 배포 성공!**

---

### **Step 4: Vercel 환경 변수 설정**

1. **Vercel Dashboard 접속**
   - https://vercel.com/dashboard
   - diah7m-platform 프로젝트 선택

2. **Settings → Environment Variables**

3. **환경 변수 추가**
   ```
   Name:  VITE_API_URL
   Value: https://diah7m-platform.onrender.com
   Scope: ✅ Production  ✅ Preview  ✅ Development
   ```

4. **Save**

---

### **Step 5: Vercel 재배포**

**방법 A: Git Push (권장)**
```bash
# 아무 변경이나 추가 (재배포 트리거용)
git commit --allow-empty -m "chore: trigger Vercel redeploy for VITE_API_URL"
git push origin main

# Vercel이 자동으로 감지하고 재배포 시작
```

**방법 B: Vercel Dashboard**
```
1. Deployments 탭
2. 최신 배포 옆 "..." 메뉴
3. "Redeploy" 클릭
4. "Redeploy" 버튼 다시 클릭 (확인)
```

**배포 완료 대기**: 2-3분

---

### **Step 6: 프론트엔드 연결 확인**

1. **배포된 사이트 접속**
   ```
   https://diah7m-platform.vercel.app
   ```

2. **브라우저 개발자 도구 열기**
   - F12 또는 Cmd+Opt+I

3. **Console 탭에서 환경 변수 확인**
   ```javascript
   // 임시로 Dashboard.jsx 최상단에 추가 (디버깅용)
   console.log('API_BASE:', import.meta.env.VITE_API_URL);
   
   // 기대 출력:
   // API_BASE: https://diah7m-platform.onrender.com
   ```

4. **Network 탭에서 API 호출 확인**
   - Dashboard 페이지 접속
   - Network 탭에서 필터: "Fetch/XHR"
   - `/api/v1/data/status` 또는 `/api/v1/data/latest` 요청 찾기
   
   **기대 결과:**
   ```
   Request URL: https://diah7m-platform.onrender.com/api/v1/data/status
   Status: 200 OK
   Response: {"success":true,"data":{...}}
   ```

**✅ 프론트엔드 연결 성공!**

---

## 🐛 트러블슈팅

### ❌ 문제 1: CORS 에러

**증상:**
```
Access to fetch at 'https://diah7m-platform.onrender.com/api/v1/...' 
from origin 'https://diah7m-platform.vercel.app' has been blocked by CORS policy
```

**원인:** Render의 CORS 설정에 Vercel 도메인이 없음

**해결:**
1. Render 로그 확인: `🚫 CORS blocked origin: ...` 메시지 찾기
2. server.js의 `allowedOrigins` 배열에 해당 도메인 추가
3. Git commit + push → Render 재배포

---

### ❌ 문제 2: 환경 변수 미반영

**증상:**
```javascript
console.log(import.meta.env.VITE_API_URL);
// 출력: undefined 또는 빈 문자열
```

**원인:** Vercel 재배포 안 함

**해결:**
1. Vercel Dashboard → Environment Variables 재확인
2. **Redeploy** 버튼 클릭 (필수!)
3. 배포 완료 후 브라우저 강력 새로고침 (Cmd+Shift+R)

---

### ❌ 문제 3: Render Cold Start (첫 요청 느림)

**증상:** 첫 API 호출이 50초 이상 걸림

**원인:** Render Free Tier는 15분 미사용 시 sleep

**임시 해결:**
1. Render Dashboard → Logs에서 "Server is running" 확인 대기
2. 또는 브라우저에서 재시도

**영구 해결 (Phase 2):**
- Wake-up 로직 추가 (App.jsx useEffect)

---

### ❌ 문제 4: 404 Not Found

**증상:**
```
GET /api/v1/data/status → 404
```

**원인:** 라우트 경로 오타 또는 server.js에서 라우터 연결 안 됨

**해결:**
1. Render 로그 확인: `⚠️ 404 Not Found: GET /api/v1/data/status`
2. server.js 확인: `app.use('/api/v1', diagnosisRouter);` 존재 여부
3. routes/diagnosis.js 확인: `router.get('/data/status', ...)` 존재 여부

---

## 📊 성공 체크리스트

배포 완료 후 아래 항목 전부 ✅인지 확인:

### Backend (Render)
- [ ] `/api/health` 응답 200
- [ ] `/api/v1/data/status` 응답 200
- [ ] Render 로그에 "Server is running" 표시
- [ ] CORS 에러 없음

### Frontend (Vercel)
- [ ] 사이트 정상 로딩
- [ ] Console에 VITE_API_URL 출력됨
- [ ] Network 탭에서 Render URL로 요청 나감
- [ ] Dashboard에 데이터 표시 (또는 API 호출 성공)

### 통합
- [ ] CORS 에러 없음
- [ ] 404 에러 없음
- [ ] 500 에러 없음
- [ ] 응답 시간 < 5초 (첫 요청 제외)

---

## 🎯 다음 단계

Phase 1 성공 후:

1. **Phase 2: 진단 엔진 연동** (N07-N10)
   - core-engine.js → routes/diagnosis.js
   - `/api/v1/diagnosis/kr` 실제 데이터

2. **Phase 3: 데이터 수집 완성** (N01-N06)
   - O2_PMI, S2_NIGHTLIGHT, R6_THERMAL 추가
   - 56/59 → 59/59 완료

3. **Phase 4: Dashboard 실데이터 연결** (N15-N20)
   - 데모 데이터 → API 호출
   - TierLock 실동작

---

## 📞 지원

문제 발생 시:
1. Render 로그 확인
2. Vercel 로그 확인
3. 브라우저 Console + Network 탭 확인
4. 이 문서의 트러블슈팅 섹션 참고

**마지막 업데이트**: 2026-02-16
