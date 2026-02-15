# DIAH-7M 디자인 작업 지침서
> 이 문서는 새 채팅 세션에 반드시 첨부한다.
> Claude는 작업 시작 전 이 문서를 전부 읽고 숙지한 상태에서 작업한다.
> 최종 업데이트: 2026-02-15 (라이트모드+프리미엄 단색 디자인 반영)

---

## 1. Claude의 역할과 책임

Claude는 DIAH-7M 프로젝트의 아키텍트다.

- 글로벌 SaaS 기준으로 스스로 판단하고 실행한다.
- "A로 할까요 B로 할까요?" 식으로 종원님에게 프로그램 선택지를 떠넘기지 않는다.
- 종원님은 이론 기획자다. 프로그램/기술 판단은 전부 Claude 책임이다.
- 디자인 작업 시 기본적인 것(NAV 중복, 빈 공간, 언어 미적용, 테마 불일치 등)을 종원님이 지적하기 전에 Claude가 먼저 잡아야 한다.
- 디자인은 세계 최고 수준으로, 책임감을 갖고 완성한다.
- 매 채팅 세션마다 신입사원처럼 처음부터 헤매지 않는다. 이 문서에 모든 맥락이 있다.

---

## 2. 배포 환경

- GitHub: y01023901765-design/diah7m-platform (Private)
- 배포: Vercel 자동배포. GitHub에 push하면 1~2분 후 자동 반영된다.
- URL: https://diah7m-platform.vercel.app
- Claude가 직접 git push한다 (PAT 인증). zip 만들거나 종원님이 다운받을 필요 없다.
- PAT: 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

---

## 3. 작업 시작 시 반드시 할 것

### 3-1. 최신 코드 pull
```bash
cd /home/claude/diah7m-platform
git pull origin main
```
이전 채팅에서 push한 코드가 있으므로 **항상 최신 상태에서 시작**한다. pull 없이 작업하면 충돌이 발생하거나 이전 작업이 덮어써진다.

### 3-2. 수정할 파일을 먼저 읽는다
기억에 의존하지 않는다. 반드시 파일을 열어서 현재 코드를 확인한 후 작업한다.
```bash
cat src/components/GlobeHero.jsx
cat src/pages/Landing.jsx
cat src/App.jsx
cat src/theme.js
```

### 3-3. 기존 구조를 파악한다
- Landing.jsx에 NAV가 있는지
- GlobeHero.jsx에 NAV가 없는지
- i18n이 어떻게 연결되어 있는지
- lang prop이 어떻게 전달되는지
- 각 파일이 T(다크)를 쓰는지 LT(라이트)를 쓰는지
- App.jsx에서 페이지별 테마 분기가 어떻게 되어있는지
이런 기본 구조를 파악하지 않고 코드를 수정하면 중복, 누락, 충돌이 발생한다.

---

## 4. 작업 순서 (절대 규칙)

```
1. 코드 수정
2. npx vite build (빌드 테스트)
3. 종원님에게 확인 요청
4. 종원님 확인 후에만 git push
```

**프리뷰 없이 push하지 않는다.**

단, 종원님이 "혼자 다 해주세요"라고 한 경우에는 Claude가 전체를 완성하고 push한다. 이 경우에도 빌드 테스트는 반드시 한다.

실제 사례: NAV 중복 문제를 프리뷰 없이 2번 연속 push해서 배포 사이트에 NAV가 2개 보였다.

---

## 5. 기존 것을 삭제하지 않는다

**원칙: 문제가 생기면 새로 추가한 것을 삭제한다. 원래 있던 것을 지우지 않는다.**

### 실제 사례: NAV 중복 사건
- GlobeHero 안에 자체 NAV가 있었고, Landing.jsx에도 NAV가 있어서 2개가 보였다.
- 잘못된 대응: Landing.jsx의 원래 NAV를 삭제함 → LangSelector, 로그인 기능 손실
- 올바른 대응: GlobeHero의 자체 NAV(새로 추가된 것)를 삭제하고, Landing.jsx의 원래 NAV를 유지

---

## 6. NAV 규칙

### 6-1. Landing 페이지
- NAV는 Landing.jsx에 1개만 존재한다.
- GlobeHero, 기타 컴포넌트 안에 자체 NAV를 절대 넣지 않는다.

### 6-2. 서브페이지
- GlobalNav.jsx가 서브페이지 전용 NAV다.
- App.jsx에서 Landing과 Auth 페이지에서는 GlobalNav를 숨긴다.
- Auth는 자체 다크 레이아웃을 가진다.

### 6-3. App.jsx 구조
```jsx
{page==='landing' ? (
  <LandingPage />
) : (
  <>
    {page!=='login' && page!=='signup' && <GlobalNav />}
    {(page==='login'||page==='signup') && <AuthPage />}
    {page==='dashboard' && <DashboardPage />}
    {page==='stock' && <StockPage />}
    {page==='mypage' && <MyPage />}
    {page==='admin' && <AdminPage />}
    {page!=='login' && page!=='signup' && <Footer />}
  </>
)}
```

---

## 7. 테마 시스템 — 다크/라이트 완전 분리

### 7-1. theme.js 구조
```javascript
import T, { L as LT } from '../theme';
// T = 다크 테마 (Landing, Auth용)
// LT = 라이트 테마 (서브페이지용)
```

### 7-2. 파일별 테마 매핑 (절대 준수)

**다크 테마 (T) — 이 파일들은 T만 사용:**

| 파일 | 이유 |
|------|------|
| src/pages/Landing.jsx | 우주/위성 브랜드 |
| src/pages/Auth.jsx | Landing과 연결감, 자체 다크 배경 |
| src/components/GlobeHero.jsx | 지구본 + 우주 배경 |
| src/components/LangSelector.jsx | Landing NAV 안에 있음 |
| src/components/Satellite.jsx | Landing에서만 사용 |

**라이트 테마 (LT) — 이 파일들은 `import T, { L as LT } from '../theme'` 후 LT만 사용:**

| 파일 | 이유 |
|------|------|
| src/pages/Dashboard.jsx | 경제 데이터 가독성 |
| src/pages/MyPage.jsx | 정보 확인 |
| src/pages/Admin.jsx | 데이터 테이블 |
| src/pages/Stock.jsx | 주식 데이터 |
| src/pages/ProductMgmt.jsx | Admin 하위 |
| src/components/GlobalNav.jsx | 서브페이지 전용 NAV |
| src/components/Charts.jsx | Dashboard에서 사용 |
| src/components/Gauges.jsx | Dashboard에서 사용 |
| src/components/TierLock.jsx | 구독 티어별 잠금 |
| src/components/Chatbot.jsx | 서브페이지 위젯 |
| src/data/satellite.js | Stock에서 사용 |
| src/i18n.js | gc() 색상 함수 |

**App.jsx — 동적 분기:**
```javascript
const isDark = page==='landing' || page==='login' || page==='signup';
const TH = isDark ? T : LT;
// 배경: isDark ? dark gradient : #FFFFFF
// CSS: RESPONSIVE_CSS(isDark) 로 동적
```

### 7-3. 새 파일 생성 시 테마 선택 규칙
- 서브페이지(로그인 후 보는 페이지) → LT 사용
- Landing/Auth 관련 → T 사용
- 헷갈리면 LT(라이트)

### 7-4. sed 일괄 치환 금지 — 실제 사고 사례

오늘 sed로 `T.` → `LT.`를 일괄 치환했다가 다음 오류 발생:

**문제:** `T.text`가 먼저 `LT.text`로 바뀌고, 다시 sed를 돌리면 `LT.text` 안의 `T.text`가 또 매칭되어 `LLT.text`가 됨. 한번 더 돌리면 `LLLT.text`.

**증상:** GlobalNav에서 `LLT.textDim`, `LLT.textMid` → 런타임 에러 (LLT is not defined)

**예방법:**
```bash
# sed 사용 후 반드시 이중 변환 확인
grep -rn "LLT\.\|LLLT\." --include="*.jsx" --include="*.js" | grep -v node_modules
# 결과가 0건이어야 정상. 1건이라도 있으면 전부 수정
```

**권장:** sed 대신 파일을 직접 열어서 수정한다.

---

## 8. 서브페이지 디자인 원칙 — 고급 프리미엄 단색

### 8-1. 핵심 철학
Apple, Stripe, Claude.ai처럼 **컬러 없이 검정/회색 명암 + 볼드 위계**만으로 고급스러움을 만든다.
50대 이상 정부 관계자, 기관 투자자, 경영진이 주요 사용자다. 가독성이 최우선이다.

### 8-2. 라이트 테마 색상 (theme.js의 L 객체)
```
배경 계층:
  bg0: #FFFFFF   — 메인 배경 (페이지 전체)
  bg1: #FAFAFA   — 카드 내부, 테이블 헤더
  bg2: #F5F5F5   — 입력 필드 배경, 비활성 영역
  bg3: #EEEEEE   — 분리선, 비활성 탭 배경

텍스트 3단계 (이것만으로 위계를 만든다):
  text:    #111111  — 제목, 핵심 수치 (거의 검정) + bold 700~900
  textMid: #555555  — 본문, 설명 (중간 회색) + regular 400~500
  textDim: #999999  — 보조, 라벨, 캡션 (연한 회색) + regular 400

테두리/구분:
  border:  #E0E0E0  — 카드 테두리, 테이블 선
  divider: #F0F0F0  — 섹션 구분선

상태 표시 (이것만 컬러):
  good:   #059669   — 양호 (초록)
  warn:   #D97706   — 주의 (노랑)
  danger: #DC2626   — 경보 (빨강)

accent: #111111     — 활성 탭 밑줄, primary 버튼 배경 (검정 = 고급)
```

### 8-3. 버튼 스타일 (2종류만)

**Primary 버튼** (페이지당 1~2개만):
```javascript
{
  background: '#111111',        // 검정 배경
  color: '#FFFFFF',             // 흰 글씨
  border: 'none',
  borderRadius: 8,
  padding: '12px 24px',
  fontSize: 15,
  fontWeight: 700,
}
```

**Secondary 버튼** (나머지 전부):
```javascript
{
  background: '#FFFFFF',        // 흰 배경
  color: '#333333',             // 진한 회색 글씨
  border: '1px solid #D0D0D0', // 회색 테두리
  borderRadius: 8,
  padding: '10px 16px',
  fontSize: 14,
  fontWeight: 600,
}
```

### 8-4. 탭 스타일 (밑줄 방식)

```javascript
// 활성 탭
{
  background: 'transparent',
  color: '#111111',
  fontWeight: 700,
  borderBottom: '2px solid #111111',
}

// 비활성 탭
{
  background: 'transparent',
  color: '#999999',
  fontWeight: 400,
  borderBottom: '2px solid transparent',
}
```

**금지:** `background: ${accent}15` 같은 컬러 배경 탭

### 8-5. 카드 스타일

```javascript
// 올바른 카드
{
  background: '#FFFFFF',
  border: '1px solid #E0E0E0',
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  padding: 20,
}

// 금지되는 카드 스타일들
background: `${LT.sat}08`           // ❌ 보라색 배경
background: `${LT.accent}15`        // ❌ accent 배경
background: `linear-gradient(...)`   // ❌ 그라데이션
border: `1px solid ${LT.accent}30`  // ❌ 컬러 테두리
border: `1px solid ${LT.sat}25`     // ❌ 보라색 테두리
```

### 8-6. 테이블 스타일

```javascript
// 테이블 헤더
{ background: '#FAFAFA', fontSize: 14, fontWeight: 700, color: '#555555' }

// 테이블 셀
{ background: '#FFFFFF', fontSize: 14, fontWeight: 400, color: '#111111' }

// 구분선
{ borderBottom: '1px solid #E0E0E0' }

// 상태 셀만 컬러 허용
{ color: isActive ? '#059669' : '#DC2626', fontWeight: 600 }
```

### 8-7. 허용/금지 총정리

```
✅ 허용:
  - 이모티콘 (🟢🟡🔴🛰️📊⚙️👤 등)
  - 상태 표시만 컬러 (양호/주의/경보)
  - 검정 버튼 1~2개 (primary action)
  - 회색 테두리 버튼 (secondary)
  - 검정/회색 텍스트 (#111, #555, #999)
  - 흰 배경 + 미세한 그림자 카드

❌ 금지:
  - 카드/섹션 배경에 컬러 (${sat}08, ${accent}15 등 전부)
  - gradient 배경 (서브페이지에서)
  - 컬러 테두리 (${accent}30, ${danger}20 등)
  - 보라색(sat) 배경이나 테두리
  - 파란색/시안 accent 배경
  - 주황색/노란색 배경
  - 여러 색상이 섞인 화려한 UI
```

---

## 9. 폰트 사이즈 기준

### 서브페이지 (Dashboard, MyPage, Admin 등):
```
헤드라인 (h1):    28~36px  bold 800~900  color #111
섹션 제목 (h2):   20~24px  bold 700      color #111
본문:             16px     regular 400    color #555 (절대 14px 이하 금지)
보조 텍스트:      14px     regular 400    color #999 (최소)
라벨/캡션:        13px     (최소, 이보다 작게 하지 않는다)
버튼 텍스트:      15px 이상 bold 600~700
테이블 셀:        14~15px
수치 (monospace): 20~42px  bold 800~900   color #111
```

### Landing (GlobeHero):
```
히어로 타이틀:    38~48px
설명문:           15~16px
stats 숫자:       24px 이상
stats 라벨:       12px 이상
힌트 텍스트:      12px 이상
```

**절대 규칙:** 전체 사이트에서 12px 미만 텍스트 사용 금지. 8px, 9px, 10px, 11px 모두 금지.

---

## 10. 다국어 (i18n) — 모든 페이지/컴포넌트에 적용

### 10-1. 원칙
**텍스트를 화면에 표시할 때 한국어를 하드코딩하지 않는다. 반드시 t(key, lang) 함수를 사용한다.**

잘못된 예:
```jsx
<div>우주에서 경제를 진단합니다</div>
<button>로그인</button>
<span>양호</span>
```

올바른 예:
```jsx
<div>{t('heroTitle1', L)}<br/>{t('heroTitle2', L)}</div>
<button>{t('login', L)}</button>
<span>{t('gStatGood', L)}</span>
```

### 10-2. 나라 이름
```jsx
// 잘못된 예 — 항상 한국어
<div>{country.n}</div>

// 올바른 예 — 언어별 자동 변환
<div>{t('cnt_' + country.iso, lang)}</div>
```

### 10-3. Canvas 안에서의 다국어
Canvas draw loop는 requestAnimationFrame이라 lang 변경이 자동 반영 안 됨.
**langRef 필수:**
```jsx
const langRef = useRef(lang);
useEffect(() => { langRef.current = lang }, [lang]);

// draw loop 안에서
const cN = (c) => t('cnt_' + c.iso, langRef.current) || c.en || c.n;
ctx.fillText(cN(country), x, y);
```

### 10-4. 새 텍스트 추가 시
1. src/locales/ko.js에 한국어 키 추가
2. src/locales/en.js에 영어 키 추가
3. src/locales/ja.js, zh.js에 일본어/중국어 추가
4. 나머지 24개 언어 파일에도 추가
5. 28개 파일 전부에 없으면 일부 언어에서 키 이름이 그대로 표시됨

### 10-5. 언어별 HOME 국가
```javascript
const LANG_HOME = {
  ko:'KOR', ja:'JPN', zh:'CHN', en:'USA', es:'ESP', fr:'FRA',
  de:'DEU', pt:'PRT', it:'ITA', nl:'NLD', sv:'SWE', no:'NOR',
  da:'DNK', fi:'FIN', pl:'POL', cs:'CZE', hu:'HUN', tr:'TUR',
  ru:'RUS', he:'ISR', ar:'SAU', hi:'IND', vi:'VNM', th:'THA', id:'IDN'
};
```

---

## 11. 디자인 공간/레이아웃 (Landing)

- 지도 하단: gradient fade-out (220px, transparent → bg0 60%)
- 텍스트 블록: margin-top: -40px, position:relative, zIndex:5
- 한국 중심: geoNaturalEarth1().rotate([-127, 0])
- scale: w/6, 높이: w * 0.42
- Canvas 전체 너비 (maxWidth 없음)

---

## 12. 다크 테마 색상 (Landing, Auth — 변경 금지)

```
accent: #00d4ff, satellite: #8b5cf6, bg0: #04060e
surface: #151c2e, border: #1e2a42
text: #e8ecf4, textMid: #8b95a8, textDim: #7a8a9e
good: #00e5a0, warn: #f0b429, danger: #ff5c5c
```
로고: 🛰️ + "DIAH" 흰색 + "(-7M)" #00d4ff

---

## 13. 파일 구조와 테마

| 파일 | 역할 | 테마 |
|------|------|------|
| App.jsx | 라우터, 테마 분기 | isDark로 T/LT 동적 |
| Landing.jsx | NAV + GlobeHero | T(다크) |
| Auth.jsx | 로그인/가입 | T(다크), 자체 레이아웃 |
| Dashboard.jsx | 경제 진단 | LT(라이트) |
| MyPage.jsx | 회원 정보 | LT(라이트) |
| Admin.jsx | 관리자 | LT(라이트) |
| Stock.jsx | 주식 감시 | LT(라이트) |
| ProductMgmt.jsx | 상품 관리 | LT(라이트) |
| GlobeHero.jsx | D3 지도 | T(다크) |
| GlobalNav.jsx | 서브 NAV | LT(라이트) |
| Charts.jsx | 차트 | LT(라이트) |
| Gauges.jsx | 게이지 | LT(라이트) |
| TierLock.jsx | 잠금 UX | LT(라이트) |
| Chatbot.jsx | 챗봇 | LT(라이트) |
| LangSelector.jsx | 언어 선택 | T(다크) |
| Satellite.jsx | 위성 SVG | T(다크) |
| i18n.js | 번역 함수 | LT |
| data/satellite.js | 위성 데이터 | LT |
| theme.js | 토큰 정의 | T+L export |

---

## 14. 작업 운영 기준

- **Claude 채팅** = 설계 + 개발 + 수정 전부
- **Cowork** = 검진보고서만 생성 (코드 수정 금지)
- **종원님 cmd** = git push만
- 코드 완성 → 즉시 git push (context compaction으로 코드 분실 방지)
- Claude는 배포 사이트를 직접 볼 수 없다. 종원님 스크린샷에 의존한다.

---

## 15. 과학적 언어 / UX / 로드맵

- "과거 물리량→오늘 결과=신뢰" / "오늘 물리량→미래 추적=가치"
- 예측 용어 시스템 차원 차단
- 쇼핑몰 전시 모델: 잠금 콘텐츠 흐릿하게 → 구독 전환
- 1단계: 43개국 국가보고서 → 2단계: 주식 위성감시 → 3단계: 커스터마이징

---

## 16. 실수 이력 — 같은 실수 반복 금지

| 실수 | 원인 | 교훈 |
|------|------|------|
| NAV 2개 표시 | GlobeHero에 자체 NAV | 컴포넌트에 NAV 넣지 않는다 |
| Landing NAV 삭제 | 원래 것을 삭제 | 새로 추가한 것을 삭제한다 |
| 한국어 하드코딩 | i18n 미적용 | 모든 텍스트는 t(key, lang) |
| 언어 전환 안됨 | Canvas lang 미반영 | langRef 사용 |
| 나라이름 영어만 | locale 키 없음 | 28개 파일에 cnt_* 추가 |
| HOME 한국 고정 | home:true 하드코딩 | LANG_HOME 맵 사용 |
| 지도 빈 공간 | padding/ratio | gradient fade + margin |
| 지도 경계선 | div 배경차이 | gradient로 자연스럽게 |
| 지도 잘림 | scale 과대 | w/6, rotate -127 |
| 프리뷰 없이 push | 순서 미준수 | 확인 후 push |
| 코드 분실 | compaction | 완성 즉시 push |
| sed LLT/LLLT | 이중 치환 | sed 후 LLT grep 필수 |
| Auth에서 라이트NAV | GlobalNav LT적용 | Auth에서 GlobalNav 숨김 |
| 서브 배경 다크 | App.jsx bg 고정 | isDark로 배경 동적 |
| 컬러 배경 잔존 | sed 색상만 변경 | 카드→흰+그림자, 컬러bg 제거 |

---

## 17. 보관 버전

- `v0.1-dark-theme`: 라이트 모드 추가 전 상태. `git checkout v0.1-dark-theme`으로 복원 가능.
