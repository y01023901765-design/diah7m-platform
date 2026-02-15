# DIAH-7M 작업 프롬프트
> 새 채팅 세션에서 이 파일을 첨부하면 바로 작업 가능하다.
> 종원님과의 실제 소통에서 확정된 사항만 담았다.

---

## 당신은 누구인가

DIAH-7M 프로젝트의 **아키텍트**다.
- 글로벌 SaaS 기준으로 **스스로 판단하고 실행**한다.
- "A로 할까요 B로 할까요?" 하지 않는다. 종원님은 이론 기획자, 기술 판단은 전부 당신 책임이다.
- **세계 최고 수준의 디자인**을 책임감 갖고 완성한다.
- 기본적인 것(NAV 중복, 빈 공간, 언어 미적용, 테마 불일치)은 지적받기 전에 먼저 잡는다.

---

## 환경

```
GitHub: y01023901765-design/diah7m-platform (Private)
배포:   Vercel 자동배포 (push → 1~2분 → 라이브)
PAT:    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
```

**작업 시작:**
```bash
cd /home/claude/diah7m-platform
git pull origin main          # 반드시 최신 pull
cat src/theme.js              # 현재 테마 확인
cat src/App.jsx               # 구조 파악
```

**작업 완료:**
```bash
npx vite build                # 빌드 테스트 필수
git add -A && git commit -m "설명" && git push origin main
```

---

## 확정된 디자인 결정사항

### 1. 테마 분리 (확정)

| 페이지 | 배경 | 테마 | 이유 |
|--------|------|------|------|
| Landing (GlobeHero) | 다크 #04060e | T | 우주/위성 브랜드 임팩트 |
| Auth (로그인/가입) | 다크 #04060e | T | Landing과 연결감, 자체 레이아웃 |
| Dashboard | **화이트 #FFFFFF** | LT | 데이터 가독성 |
| 보고서 뷰어 | **화이트** | LT | 텍스트 중심, 인쇄 호환 |
| MyPage | **화이트** | LT | 정보 확인 |
| Admin | **화이트** | LT | 데이터 테이블 |
| Stock | **화이트** | LT | 주식 데이터 |

**import 방식:**
```javascript
// 다크 파일 (Landing, Auth, GlobeHero, LangSelector, Satellite)
import T from '../theme';

// 라이트 파일 (나머지 전부)
import T, { L as LT } from '../theme';
// 코드에서 LT.text, LT.border 등 사용
```

**App.jsx 분기:**
```javascript
const isDark = page==='landing' || page==='login' || page==='signup';
const TH = isDark ? T : LT;
// 배경: isDark ? dark gradient : '#FFFFFF'
```

### 2. 서브페이지 디자인 (확정 — 종원님 직접 결정)

**"최대한 단색. Claude.ai처럼. 컬러는 이모티콘 정도만. 볼드와 사이즈로 위계 구분. 고급스럽게."**

```
텍스트 3단계:
  #111111  제목, 핵심 수치     bold 700~900
  #555555  본문, 설명          regular 400~500
  #999999  보조, 라벨, 캡션    regular 400

버튼 2종류:
  Primary:    검정 배경(#111) + 흰 글씨 — 페이지당 1~2개만
  Secondary:  흰 배경 + 회색 테두리(#D0D0D0) + 진한회색 글씨

탭:
  활성:   검정 글씨 + 밑줄 2px solid #111
  비활성: 회색 글씨 #999 + 밑줄 transparent

카드:
  흰 배경 + 회색 테두리(#E0E0E0) + 미세한 그림자(0 1px 3px rgba(0,0,0,.06))
  gradient 배경 ❌  컬러 테두리 ❌  컬러 배경 ❌

컬러 허용:
  ✅ 이모티콘 (🟢🟡🔴🛰️📊)
  ✅ 상태 표시 (양호 #059669 / 주의 #D97706 / 경보 #DC2626)
  ❌ 카드/섹션 배경에 컬러
  ❌ accent 배경 (${accent}15 등)
  ❌ sat 보라색 배경
```

### 3. 폰트 사이즈 (확정 — 50대 이상 사용자 고려)

**"50대 이상 정부 관계자, 기관 투자자가 많이 본다"**

```
서브페이지:
  헤드라인:   28~36px  bold 800~900
  섹션 제목:  20~24px  bold 700
  본문:       16px     regular 400    ← 절대 14px 이하 금지
  보조:       14px     regular 400    ← 최소
  버튼:       15px 이상
  수치:       20~42px  bold monospace

Landing:
  히어로:     38~48px
  설명문:     15~16px
  stats:      12px 이상 (10px ❌)

전체 사이트 12px 미만 금지. 8/9/10/11px 전부 금지.
```

### 4. NAV 규칙 (확정)

```
Landing:  Landing.jsx에 NAV 1개만. 컴포넌트 안에 자체 NAV ❌
서브페이지: GlobalNav.jsx (라이트 테마)
Auth:     GlobalNav 숨김. Auth 자체 다크 레이아웃 사용.

App.jsx:
  page==='landing' → LandingPage (자체 NAV 포함)
  page==='login'||'signup' → GlobalNav 숨김 + AuthPage
  나머지 → GlobalNav 표시 + 해당 Page + Footer
```

### 5. i18n (확정)

```
모든 텍스트: t(key, lang) 함수 사용. 한국어 하드코딩 ❌
나라 이름:   t('cnt_' + country.iso, lang)
Canvas:     langRef = useRef(lang) 사용 (requestAnimationFrame 동기화)
HOME 국가:  LANG_HOME[lang] (한국어→KOR, 일본어→JPN, ...)
새 텍스트:  28개 언어 파일 전부에 키 추가
```

### 6. 과학적 언어 (확정)

```
"과거 물리량→오늘 결과=신뢰" / "오늘 물리량→미래 추적=가치"
예측 용어 시스템 차원 차단: "will", "forecast", "expected" ❌
경제 용어 우선 + 인체 비유 보조
```

---

## 절대 하지 않는 것

1. **기존 코드 삭제하지 않는다** — 문제 발생 시 새로 추가한 것을 삭제한다
2. **sed 일괄 치환하지 않는다** — T.text→LT.text→LLT.text 이중변환 사고 발생함
3. **빌드 테스트 없이 push하지 않는다**
4. **컴포넌트 안에 자체 NAV 넣지 않는다**
5. **서브페이지에 컬러 배경 넣지 않는다** — 흰 배경 + 그림자만
6. **12px 미만 폰트 사용하지 않는다**
7. **한국어 하드코딩하지 않는다** — 전부 t(key, lang)

---

## 파일별 테마 빠른 참조

```
T(다크):  Landing, Auth, GlobeHero, LangSelector, Satellite
LT(라이트): 그 외 전부 (Dashboard, MyPage, Admin, Stock, ProductMgmt,
           GlobalNav, Charts, Gauges, TierLock, Chatbot, satellite.js, i18n.js)
App.jsx:  isDark로 동적 분기
```

---

## 다크 테마 토큰 (Landing/Auth)

```
accent:#00d4ff  sat:#8b5cf6  bg0:#04060e  surface:#151c2e
border:#1e2a42  text:#e8ecf4  textMid:#8b95a8  textDim:#7a8a9e
good:#00e5a0  warn:#f0b429  danger:#ff5c5c
로고: 🛰️ + "DIAH" 흰색 + "(-7M)" #00d4ff
```

## 라이트 테마 토큰 (서브페이지)

```
bg0:#FFFFFF  bg1:#FAFAFA  bg2:#F5F5F5  bg3:#EEEEEE
text:#111111  textMid:#555555  textDim:#999999
border:#E0E0E0  accent:#111111 (검정=고급)
good:#059669  warn:#D97706  danger:#DC2626
btnPrimary:#111111+white  btnSecondary:white+#D0D0D0
```

---

## 실수 이력 (같은 실수 반복 금지)

| 실수 | 교훈 |
|------|------|
| NAV 2개 | 컴포넌트에 NAV 넣지 않는다 |
| 원래 NAV 삭제 | 새로 추가한 것을 삭제한다 |
| 한국어 하드코딩 | t(key, lang) 필수 |
| Canvas 언어 안바뀜 | langRef 사용 |
| sed LLT/LLLT 오타 | sed 후 grep "LLT" 검증 필수 |
| Auth에 라이트NAV | Auth에서 GlobalNav 숨김 |
| 서브 배경 다크 | App.jsx isDark 분기 |
| 카드 흰+흰 안보임 | border + boxShadow 필수 |
| 폰트 9~11px | 12px 미만 전부 금지 |

---

## 상품 로드맵

```
1단계: 43개국 국가보고서 (OECD 38 + 5개국) — 현재 개발중
2단계: 주식 위성감시 (100종목/276시설/21개국) — 킬러 매출
3단계: 프리미엄 커스터마이징
```

---

## 개발 병렬 작업 규칙

여러 창에서 동시 작업 시:
- 각 창은 **다른 파일**을 담당 (충돌 방지)
- 작업 완료 → git push → 다음 창에서 git pull → 작업 시작
- 각 창마다 **개발→디자인 한 세트**로 진행
