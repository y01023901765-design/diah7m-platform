# DIAH-7M v2 참고 자료

**작성일**: 2026-02-18  
**용도**: 참고용 (실제 사용 X)

---

## 📋 이 폴더의 목적

이 폴더에는 다른 개발자가 작성한 v2 시스템 코드가 보관되어 있습니다.
**v2는 현재 DIAH-7M 설계도와 다른 구조이므로 직접 사용하지 않습니다.**

대신, v2의 **좋은 아이디어**만 기존 시스템에 선택적으로 적용했습니다.

---

## 📁 파일 목록

### 코드 파일
1. **core-engine-v2.js** (282줄)
   - 9축: O/F/S/P/R/I/T/E/L
   - GPT 피드백 17개 반영
   - Ajv 검증, 2축 교차신호

2. **data-pipeline-v2.js** (365줄)
   - 게이지: O1_EXPORT ~ L5_YOUTH_UNEMP
   - p-limit 병렬 제한
   - 데이터 검증 강화

3. **renderer-v2.js** (225줄)
   - PDFKit 사용
   - Standard 디자인
   - Stream 전송

### 문서 파일
4. **N01-N10-FINAL-REPORT.md** (293줄)
   - GPT 피드백 17개 질문/답변
   - 중대 문제 3개 발견 (Cron/Puppeteer/RateLimit)

5. **PACKAGE-JSON-UPDATE-v2.md** (110줄)
   - 의존성 변경 가이드
   - p-limit, ajv, pdfkit 추가

---

## ✅ v2에서 채택한 아이디어

### 1. p-limit (병렬 제한) ✅
**문제:** 59개 게이지 동시 요청 시 API 서버 부하  
**해결:** 동시 5개로 제한

```javascript
// 기존 data-pipeline.js에 적용
import pLimit from 'p-limit';
const limit = pLimit(5);
const tasks = gauges.map(g => limit(() => fetchGauge(g)));
```

**상태:** ✅ 적용 완료

---

### 2. Ajv 스키마 검증 강화 ✅
**문제:** 진단 결과 구조 보장 필요  
**해결:** Ajv로 schema.json 검증

```javascript
// 기존 core-engine.js에 적용
import Ajv from 'ajv';
const ajv = new Ajv({ allErrors: true });
ajv.addSchema(schema, 'DiagnosisReport');
```

**상태:** ✅ 적용 완료

---

### 3. PDFKit (가벼운 PDF 생성) ✅
**문제:** Puppeteer 메모리 300MB → Render 서버 다운  
**해결:** PDFKit 사용 (3MB)

```javascript
// 기존 renderer.js 개선
import PDFDocument from 'pdfkit';
export async function renderPDF(diagnosis, outputStream) {
  const doc = new PDFDocument();
  doc.pipe(outputStream);
  // ...
  doc.end();
}
```

**상태:** ✅ 적용 완료

---

### 4. 데이터 검증 강화 ✅
**문제:** null/NaN/Infinity → 프론트엔드 크래시  
**해결:** validateGaugeValue 함수

```javascript
// 기존 data-pipeline.js에 적용
function validateGaugeValue(value, gaugeId) {
  if (value === null || value === undefined) return { value: null };
  if (typeof value === 'number' && isNaN(value)) return { value: null };
  if (!isFinite(value)) return { value: null };
  return { value };
}
```

**상태:** ✅ 적용 완료

---

### 5. node-cron 제거 (외부 Trigger) ✅
**문제:** Render 서버 sleep 시 Cron 작동 안 함  
**해결:** POST /api/v1/data/collect 엔드포인트 + GitHub Actions

```javascript
// routes/data.js에 추가
router.post('/data/collect', async (req, res) => {
  const result = await fetchAll();
  res.json(result);
});
```

**상태:** ✅ 적용 완료

---

## ❌ v2에서 채택하지 않은 것

### 1. 9축 체계 변경 ❌
**v2:** O/F/S/P/R/I/T/E/L  
**기존:** C/R/D/N/E/I/M/G/O  
**이유:** 현재 설계도와 schema.json이 기존 체계 기반

### 2. 게이지 네이밍 변경 ❌
**v2:** O1_EXPORT, F1_KOSPI (언더스코어)  
**기존:** E1, F1 (간단)  
**이유:** gauge-meta.js, 프론트엔드가 기존 방식 사용

### 3. 시스템 전체 교체 ❌
**이유:** 위험도 높음, 점진적 개선 선택

---

## 📊 최종 적용 결과

### package.json 변경
```diff
"dependencies": {
  "express": "^4.18.2",
  "axios": "^1.6.2",
+ "p-limit": "^5.0.0",
+ "ajv": "^8.12.0",
+ "pdfkit": "^0.14.0"
}
```

### 개선된 파일
1. `server/lib/data-pipeline.js` (+50줄) - p-limit, 검증 강화
2. `server/lib/core-engine.js` (+30줄) - Ajv 검증
3. `server/lib/renderer.js` (전체 교체) - PDFKit
4. `server/routes/data.js` (+20줄) - Trigger API

---

## 📝 참고사항

- v2 코드는 **읽기 전용**입니다
- 기존 시스템과 충돌하므로 절대 import 하지 마세요
- 아이디어 참고용으로만 사용하세요

---

**마지막 업데이트**: 2026-02-18  
**다음 검토**: 필요 시
