# DIAH-7M v2 패치 — 변경 사항 & 마이그레이션

## 변경 요약

| 항목 | Before (v1) | After (v2) | 이유 |
|---|---|---|---|
| 총 게이지 | 56개 | **59개** | M접두사 빈자리 3개 추가 |
| A8 게이지 코드 | A1, A2, A3 | **D1, D2, D3** | 축 코드(A1~A9)와 충돌 해결 |
| A8 접두사 | ['A', 'L'] | **['D', 'L']** | D=Demographics |
| A7 게이지 | O1~O6 (6개) | **M1~M3 + O1~O6 (9개)** | M=Manufacturing 내부 상태 |

## 추가된 3개 게이지 (A7 근골격계)

| 코드 | 이름 | 단위 | 범위 | invert | 인체 비유 |
|---|---|---|---|---|---|
| **M1** | 제조업가동률 | % | 60~85 | false | 근육 가동률 — 근육이 실제로 쓰이는 비율 |
| **M2** | 제조업재고율 | % | 90~130 | true | 글리코겐 비축 — 높으면 과잉(체감 경기 하락) |
| **M3** | 신규수주증감 | % | -15~15 | false | 근육 성장 신호 — 미래 근력 예고 |

### 왜 M인가?

A7의 접두사 선언은 처음부터 `['M', 'O']`였음:
- **M** = Manufacturing 내부 (가동률, 재고, 수주) → "근육의 상태 검사"
- **O** = Output 결과 (산업생산, PMI, 건설, 서비스) → "근육의 출력 측정"

이 두 접두사가 합쳐져야 근골격계의 진단이 완전해짐.

## 코드 충돌 해결 상세

### 문제
```
축(Axis) A1 = 순환계
게이지   A1 = 합계출산율  ← 충돌!
```
축 이름과 게이지 코드가 같으면:
- 보고서 드릴다운에서 `A1` 클릭 시 순환계인지 출산율인지 혼동
- DB 쿼리, API 라우팅에서 namespace 충돌
- 프론트엔드 키 매핑 오류

### 해결
```
축(Axis)  : A1~A9 (불변)
게이지    : A1→D1, A2→D2, A3→D3  (D=Demographics)
접두사    : ['A','L'] → ['D','L']
```

### 영향 범위
- `core-engine.js` — GAUGE_THRESHOLDS, AXES.A8.gaugePrefix
- `data_collector.js` — 수집 대상 키 (A1→D1, A2→D2, A3→D3)
- `layer_data_59gauges.js` — A1_POP→D1, A2_POP→D2, A3_POP→D3
- `full_report_59.jsx` — 같은 키 변경
- `.env` / DB 스키마 — 컬럼명 영향 없음 (코드 기반)

### 교차신호 영향: 없음
교차신호는 축 코드(A1~A9)만 사용. 게이지 코드 변경과 무관.

## 최종 59게이지 전체 코드 맵

```
A1 순환계    [6] : I1 I2 I3 I4 I5 I6
A2 호흡계    [6] : E1 E2 E3 E4 E5 E6
A3 소화계    [6] : C1 C2 C3 C4 C5 C6
A4 신경계    [6] : S1 S2 S3 S4 S5 S6
A5 면역계    [7] : F1 F2 F3 F4 F5 F6 F7
A6 내분비계  [6] : P1 P2 P3 P4 P5 P6
A7 근골격계  [9] : M1 M2 M3 O1 O2 O3 O4 O5 O6
A8 인구/취약 [7] : D1 D2 D3 L1 L2 L3 L4
A9 재생/대외 [6] : R1 R2 R5 R6 G1 G6
                    ─────────────────────
                    합계: 59개 ✓
```

## 3-Layer 문법 규격 (report-grammar-v2.js)

모든 59개 게이지는 동일한 3-Layer를 반복:
- **Layer 1**: value, unit, period, source, trend, status, grade, severity
- **Layer 2**: blindSpot(DIAH + others[3]), metaphor(bodyPart + explain)
- **Layer 3**: investorActions[3], policyNote, lifeGuide

## 파일 목록

| 파일 | 설명 |
|---|---|
| `core-engine-v2.js` | 패치된 엔진 (59게이지, D코드, M코드) |
| `report-grammar-v2.js` | 3-Layer 문법 규격서 |
| `full_report_59.jsx` | 보고서 렌더러 (추후 D/M 코드 반영 필요) |
| `report_data_202601.json` | 2026-01 실데이터 (추후 D/M 코드 반영 필요) |
| `layer_data_59gauges.js` | Layer 1+2 데이터 (추후 D/M 코드 반영 필요) |

## 다음 단계

1. ✅ 엔진 59개 확정 + 테스트 통과
2. ✅ 3-Layer 문법 규격 고정
3. ⬜ data_collector.js에 M1/M2/M3 수집 로직 추가 (ECOS: 제조업가동률, 재고율지수, 신규수주지수)
4. ⬜ full_report_59.jsx → D1/D2/D3/M1/M2/M3 코드 반영
5. ⬜ 서버 배포 → Layer 3 알림 활성화
