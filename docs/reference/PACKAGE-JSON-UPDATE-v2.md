# package.json 업데이트 가이드 (GPT 피드백 반영)

**변경사항:**
- ❌ node-cron 제거
- ✅ p-limit 추가
- ✅ ajv 추가
- ✅ pdfkit 추가

---

## 📦 server/package.json 수정

### dependencies 섹션:

```json
{
  "name": "diah7m-backend",
  "version": "0.3.0",
  "description": "DIAH-7M Backend Server",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "dev": "node --watch server.js",
    "start": "node server.js",
    "test": "node --test test/**/*.test.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "axios": "^1.6.2",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "sqlite3": "^5.1.6",
    "pg": "^8.11.3",
    "p-limit": "^5.0.0",
    "ajv": "^8.12.0",
    "pdfkit": "^0.14.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

---

## 🚀 설치 명령어

```bash
cd server

# 기존 제거 (있으면)
npm uninstall node-cron

# 새로 추가
npm install p-limit ajv pdfkit
```

또는 한 번에:

```bash
npm install p-limit@5 ajv@8 pdfkit@0.14 --save
```

---

## ✅ 설치 확인

```bash
npm list p-limit ajv pdfkit
```

기대 출력:
```
server@0.3.0
├── ajv@8.12.0
├── p-limit@5.0.0
└── pdfkit@0.14.0
```

---

## 📝 변경 이유

### ❌ node-cron 제거
**문제:** Render 환경에서 서버 sleep 시 작동 안 함  
**해결:** 외부 Trigger API로 변경 (GitHub Actions 또는 Render Cron Jobs)

### ✅ p-limit 추가
**용도:** 59개 게이지 병렬 요청 제한 (동시 5개)  
**효과:** API 서버 부하 감소, 안정성 향상

### ✅ ajv 추가
**용도:** schema.json 검증  
**효과:** 진단 결과 구조 보장, 에러 조기 발견

### ✅ pdfkit 추가
**용도:** PDF 보고서 생성  
**효과:** 가벼운 PDF 생성 (Puppeteer 대비 메모리 1/100)

---

**이 가이드대로 수정하세요!**
