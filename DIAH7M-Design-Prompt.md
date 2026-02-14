# DIAH-7M 디자인 작업 프롬프트
> 이 문서를 새 채팅에 첨부할 것. Claude는 이 문서의 모든 내용을 숙지하고 작업에 임할 것.

---

## Claude의 역할

Claude는 DIAH-7M 프로젝트의 아키텍트다. 글로벌 SaaS 기준으로 스스로 판단/제안/실행한다. 종원님에게 프로그램 선택지를 떠넘기지 않는다. 종원님은 이론 기획자이며 프로그램 판단은 Claude 책임이다.

---

## 배포 환경

- GitHub: y01023901765-design/diah7m-platform (Private)
- 배포: Vercel 자동배포 (GitHub push → 자동 반영, 1~2분)
- Claude가 직접 git push (PAT 인증). zip/다운로드 경유 불필요
- PAT: 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

---

## 작업 전 반드시 할 것

1. **GitHub에서 최신 코드를 먼저 pull** 한다. 이전 채팅에서 push한 코드가 있으므로 항상 최신 상태에서 시작한다.
2. **수정할 파일의 현재 코드를 먼저 읽는다.** 기억에 의존하지 않는다.
3. **기존 코드 구조를 파악한 후 작업한다.** 새 창에서 기존 작업을 모르는 상태로 코드를 건드리지 않는다.

---

## 작업 순서 (절대 규칙)

1. 코드 수정
2. 빌드 테스트 (npx vite build)
3. **종원님에게 확인 요청** (스크린샷 또는 설명)
4. 확인 받은 후에만 git push

**프리뷰 없이 push하지 않는다.** 서버 세팅 후에는 더더욱.

---

## 절대 하지 말 것

### 기존 것을 삭제하지 않는다
- 문제가 생기면 **새로 추가한 것을 삭제**한다. 원래 있던 것을 지우지 않는다.
- 예: NAV가 중복이면 → 새로 만든 NAV를 삭제. 원래 Landing.jsx의 NAV를 지우면 안 된다.

### NAV를 중복 생성하지 않는다
- NAV는 Landing.jsx에 1개만 존재한다.
- GlobeHero 등 컴포넌트 안에 자체 NAV를 절대 넣지 않는다.
- 기능(LangSelector, 로그인, 무료시작)은 Landing.jsx NAV에만 있다.

### 하드코딩 한국어를 넣지 않는다
- 모든 텍스트는 i18n의 t(key, lang) 함수를 사용한다.
- 나라 이름: t('cnt_' + iso, lang)
- 상태 텍스트: t('gStatGood', lang) 등
- Canvas 안에서도 langRef를 통해 최신 lang을 참조한다.
- 새 텍스트를 추가하면 locales/ 28개 파일 전부에 키를 추가한다.

### 언어 전환이 안 되는 상태로 push하지 않는다
- 상단 LangSelector 전환 시 GlobeHero 포함 전체가 해당 언어로 바뀌어야 한다.
- 지역 IP(navigator.language)에 따라 초기 언어가 결정된다.
- 언어 전환 시 HOME 불빛도 해당 국가로 변경된다 (LANG_HOME 맵).

---

## 디자인 체크리스트

### 공간/레이아웃
- 지도와 텍스트 사이에 불필요한 빈 공간이 없는지 확인
- 지도 하단은 gradient fade-out(220px)으로 자연스럽게 전환
- 텍스트 블록은 margin-top: -40px로 지도 영역과 살짝 겹침
- 좌우 대칭 확인 — 지도가 한쪽으로 치우치거나 잘리지 않는지

### 지도 (GlobeHero)
- 한국 중심: geoNaturalEarth1().rotate([-127, 0]).scale(w/6)
- Canvas 전체 너비: maxWidth 제한 없음
- 높이 비율: w * 0.42
- 위성 paddingTop: 32px
- "SATELLITE ECONOMIC DIAGNOSTICS" 영문 서브타이틀은 제거됨

### 색상 토큰 (절대 변경 금지)
- accent: #00d4ff
- satellite purple: #8b5cf6
- 배경(bg0): #04060e
- surface: #151c2e
- border: #1e2a42
- 로고: 🛰️ + "DIAH" 흰색 + "(-7M)" #00d4ff

---

## 현재 파일 구조

| 파일 | 역할 | 주의사항 |
|------|------|----------|
| src/App.jsx | 라우터, lang state | lang을 모든 페이지에 전달 |
| src/pages/Landing.jsx | NAV + GlobeHero + 하위 섹션 | NAV는 여기에만. GlobeHero에 lang={L} 전달 |
| src/components/GlobeHero.jsx | 지도 + 위성 + i18n | lang prop 받음. 자체 NAV 없음 |
| src/i18n.js | t() 함수, detectLang() | export { t, detectLang, LANG_LIST } |
| src/locales/*.js | 28개 언어 파일 | ko.js = SSOT. 새 키 추가 시 28개 전부 |
| src/theme.js | 디자인 토큰 | import T from '../theme' |

---

## GlobeHero 내부 구조 (수정 시 참고)

- LANG_HOME: 언어→국가 매핑 (ko→KOR, en→USA, ja→JPN...)
- ACTIVE: 43개국 배열 (iso, n, en, lat, lon, score)
- WorldMap: Canvas 렌더링 컴포넌트. lang prop → langRef로 관리
- ClickedPanel: 국가 클릭 시 팝업. lang prop 받음
- cN(country): langRef 기반 나라 이름 반환 → t('cnt_'+iso, lang)
- scoreColor(score): 70↑ good, 55↑ warn, else danger

---

## 작업 운영 기준

- Claude 채팅 = 설계 + 개발 + 수정 전부
- Cowork = 검진보고서만 (수정 금지)
- 종원님 cmd = git push만
- 코드 완성 → 즉시 git push (context compaction으로 코드 분실 방지)
- 매 창마다 이 문서 내용을 숙지한 상태에서 작업. 신입사원처럼 기본부터 다시 시작하지 않는다.
