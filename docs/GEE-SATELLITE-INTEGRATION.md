# S2 야간광량 GEE 연동 가이드

## 개요
Google Earth Engine을 통해 VIIRS 야간광량 데이터를 자동 수집합니다.

## 파일
- `server/lib/fetch-satellite.js` - GEE 위성 데이터 수집 모듈
- `server/keys/make1-456808-be67c3bfb578.json` - GEE 서비스 계정 키 (Git 제외)

## 설정

### 1. GEE 키 파일 배치
```bash
server/keys/make1-456808-be67c3bfb578.json
```

### 2. .env 설정
```
GEE_PROJECT_ID=make1-456808
GEE_SERVICE_ACCOUNT=make-699@make1-456808.iam.gserviceaccount.com
GEE_KEY_FILE=./keys/make1-456808-be67c3bfb578.json
```

### 3. NPM 패키지 설치
```bash
cd server
npm install @google/earthengine
```

## 사용법

### 단독 실행 (테스트)
```bash
cd server/lib
node fetch-satellite.js
```

### 결과 예시
```json
{
  "gaugeId": "S2",
  "source": "GEE_VIIRS",
  "name": "야간광량(서울)",
  "unit": "nW/cm²/sr",
  "value": 42.15,
  "prevValue": 39.97,
  "date": "202510",
  "status": "OK",
  "rows": 2
}
```

## 통합 계획

### Phase 1: 수동 실행 (현재)
- Python/Node.js 스크립트로 수동 실행
- JSON 파일로 결과 저장
- data-pipeline.js에서 JSON 읽기

### Phase 2: 자동 통합
- data-pipeline.js에서 fetch-satellite.js 직접 호출
- fetchGauge() 함수 내 통합
- 실시간 수집

### Phase 3: 캐싱 & 최적화
- 일 1회 수집, 캐시 사용
- 배치 수집 (여러 게이지 동시)
- 에러 핸들링 강화

## 데이터

### 서울 야간광량 (2025년 10개월)
| 월 | 값 |
|----|-----|
| 2025-01 | 42.15 |
| 2025-02 | 39.97 |
| 2025-03 | 37.62 |
| 2025-04 | 41.37 |
| 2025-05 | 38.15 |
| 2025-06 | 31.68 |
| 2025-07 | 36.90 |
| 2025-08 | 33.52 |
| 2025-09 | 38.21 |
| 2025-10 | 41.68 |

**평균**: 38.13 nW/cm²/sr

## 주의사항

1. **키 파일 보안**
   - `keys/` 폴더는 .gitignore에 포함
   - 절대 GitHub에 업로드 금지

2. **GEE 할당량**
   - 무료 계정: 월 10,000 요청
   - 서울 1개 게이지: 월 12회 수집 = 12 요청
   - 여유 충분

3. **데이터 품질**
   - 6~7월 값 낮음 (여름철 일조시간)
   - 구름 커버 자동 제거됨
   - 월간 합성 데이터 사용

## 향후 확장

### R6 도시열섬 (Landsat-9)
- 같은 fetch-satellite.js에 추가
- 서울 열섬 강도 측정

### 전국 확장
- 서울 → 6대 광역시
- 산업단지별 분석
- Phase 2 주식 감시용
