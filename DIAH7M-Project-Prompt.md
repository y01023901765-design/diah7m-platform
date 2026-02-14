# 🛰️ DIAH-7M 프로젝트 프롬프트
> 새 채팅 세션에 첨부하여 프로젝트 컨텍스트 유지  
> 최종 업데이트: 2026-02-15

---

## 1. 프로젝트 개요

DIAH-7M: 위성 기반 경제 진단 플랫폼.  
인체국가경제론(의학도서 ISBN 출판)의 5단계 서사구조(요인→시작→원인→발현→결과)를 경제 분석에 적용.  
59개 경제 지표를 9개 인체 시스템에 매핑, NASA/ESA 위성 데이터로 조기 경보 제공.

### 상품 로드맵
- **1단계**: 국가보고서 (OECD 38 + 싱가포르/홍콩/대만/인도 + 중국위성 = 43개국) — 인프라/진열
- **2단계**: 주식종목 위성감시 (킬러 매출 기능) — 100종목/276시설/21개국
- **3단계**: 프리미엄 커스터마이징 주문제작

---

## 2. 역할 분담

- **Claude = 아키텍트**. 글로벌 SaaS 기준으로 판단/제안/실행. 프로그램 선택지를 종원님에게 떠넘기지 않는다.
- **종원님 = 이론 기획자**. 프로그램 판단은 Claude 책임.

---

## 3. 현재 인프라 상태

| 항목 | 내용 |
|------|------|
| GitHub | y01023901765-design/diah7m-platform (Private) |
| 배포 | Vercel 자동배포 (push → 자동). URL: diah7m-platform.vercel.app |
| 프론트 | React + Vite + D3.js. 멀티파일 구조 |
| i18n | 28개 언어, locales/ 폴더, ko SSOT → EN fallback. API 불필요 |
| 데이터 수집 | ECOS API 51/59 (86%). 남은: 위성4 + manual2 + PMI1 + timeout1 |
| 디자인 토큰 | accent=#00d4ff, bg=#04060e, surface=#151c2e, sat=#8b5cf6 |

---

## 4. GlobeHero (랜딩 히어로) 현재 상태

- D3.js Canvas 기반 2D 세계 지도
- 한국 중심 배치: geoNaturalEarth1().rotate([-127, 0]), scale(w/6)
- 43개국 활성 (불빛 + hover + 클릭 패널)
- gradient fade-out (220px): 지도 하단 → 텍스트 자연 전환
- 28언어 × 43개국 나라이름 i18n (locales에 cnt_KOR 등 키)
- 언어별 HOME 동적 전환 (ko→KOR, en→USA, ja→JPN 등) — LANG_HOME 맵
- NAV는 Landing.jsx 소유 (1개만 존재). GlobeHero는 NAV 없음

---

## 5. 작업 규칙 (필수 준수)

⚠️ **아래 규칙은 반드시 지켜야 합니다:**

1. **프리뷰 먼저 → 종원님 확인 → 확정 후에만 git push**
2. **Claude 채팅에서만 코드 수정**. Cowork = 검진보고서 전용 (수정 금지)
3. **종원님 cmd = git push만**
4. **기존 코드/디자인 건드리지 않기**. 새 기능 추가 시 기존 위에 작업
5. **원래 것 삭제 금지**. 새로 추가한 것이 문제면 새 것을 삭제
6. **Claude가 직접 git push** (PAT로 인증). zip/다운로드 불필요

---

## 6. 디자인 시스템

- 로고: 🛰️ + "DIAH" 흰색 + "(-7M)" #00d4ff
- accent: #00d4ff (cyan)
- satellite purple: #8b5cf6
- 배경: deep navy #04060e
- surface: #151c2e, border: #1e2a42
- **금지**: 그라데이션 박스, JetBrains Mono 로고

---

## 7. 다국어 체계

- KO = 원본 (Source of Truth), 329키
- ko/en/ja/zh = 완전 번역
- 22개 추가 언어 = 핵심 UI 번역 + EN fallback
- GlobeHero 전용 키: gStatGood, gGauges, gClickHint, cnt_KOR 등
- navigator.language로 브라우저 언어 자동 감지
- LangSelector로 수동 전환 → GlobeHero 포함 전체 즉시 반영

---

## 8. 핵심 파일 경로

| 파일 | 역할 |
|------|------|
| src/App.jsx | 라우터, lang state 관리 |
| src/pages/Landing.jsx | NAV + GlobeHero + Features + Pricing + Footer |
| src/components/GlobeHero.jsx | D3 Canvas 지도 + 위성 + hover/click + i18n |
| src/i18n.js | t() 함수, detectLang(), LANG_LIST |
| src/locales/*.js | 28개 언어 파일 (ko.js = SSOT) |
| src/theme.js | 디자인 토큰 |
| src/constants.js | SSOT 중앙 참조 |

---

## 9. GitHub 접근

- Repository: y01023901765-design/diah7m-platform
- PAT (읽기전용, 90일): `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`

---

## 10. 과학적 언어 원칙

- "과거 물리량 → 오늘 결과 = 신뢰" / "오늘 물리량 → 미래 추적 = 가치"
- 관찰/비교/이력 언어만 사용. **예측 용어 시스템 차원 차단**
- 경제 용어 우선 + 인체 비유 보조 (전문성 우선)

---

## 11. UX 핵심 전략

- 쇼핑몰 전시 모델: 잠금 콘텐츠를 흐릿하게 보여주고 "87% 잠겨있습니다" → 구독 전환
- tierMask 구현: FREE / BASIC / PRO / ENTERPRISE
- **"안 보이면 안 사지만, 보이는데 못 열면 산다"**

---

## 12. 4종 규격서 (완성)

1. 보고서 양식 (7요소 + 3채널)
2. 주기별 (5주기)
3. 상품별 구성 (4상품 공식)
4. JSON Schema Contract (16 $defs) — schema.json이 MASTER

---

## 13. 주의사항 (과거 실수 반복 금지)

- ❌ NAV 중복 생성 금지 (Landing.jsx의 NAV만 유일)
- ❌ context compaction으로 코드 분실 주의 → 완성 즉시 git push
- ❌ 프리뷰 없이 push 금지
- ❌ 기존 파일 삭제 전 반드시 확인
- ❌ GlobeHero 자체에 NAV 넣지 않기
- ❌ 매 창마다 신입사원처럼 기본 규칙 잊지 않기
