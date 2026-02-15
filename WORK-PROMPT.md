# DIAH-7M 작업 프롬프트
> 새 채팅에 이 파일을 첨부한다. 읽고 바로 작업한다.

---

## 0. 과거 실수 기반 행동 규칙 (최우선)

아래는 종원님이 실제로 반복 지적한 사항이다. **이것을 어기면 프로젝트가 지연된다.**

### 규칙 1: 다국어 — 모든 텍스트에 적용 (5회 이상 지적됨)
> "언어문제 매번 이야기해야되나요 기억못하나요"
> "언어가 한국어외 모두 영어에요"

**행동:**
- 페이지를 만들거나 수정할 때, **화면에 보이는 모든 텍스트**는 반드시 `t(key, lang)`으로 작성한다.
- 한국어를 직접 쓰면 안 된다: `<div>경제 진단</div>` ❌ → `<div>{t('econDiag', lang)}</div>` ✅
- 나라 이름: `country.n` ❌ → `t('cnt_' + country.iso, lang)` ✅
- **새 텍스트 키를 추가하면 28개 언어 파일 전부에 넣는다** (ko, en, ja, zh + 나머지 24개)
  - 경로: `src/locales/ko.js`, `src/locales/en.js`, ... `src/locales/vi.js`
  - 하나라도 빠지면 해당 언어에서 키 이름이 그대로 표시됨
- Canvas(GlobeHero) 안에서는 langRef 사용:
  ```jsx
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang }, [lang]);
  // draw loop: t('cnt_' + c.iso, langRef.current)
  ```
- 언어별 HOME 국가: `LANG_HOME[lang]` (ko→KOR, en→USA, ja→JPN ...)
- 언어 감지: `navigator.language` 사용. IP API 불필요.

### 규칙 2: 헤매지 않는다 (매 세션 지적됨)
> "매번 창변경때마다 신입사원에요"
> "검색해서 미리 분석하고 일을 하세요"
> "이거 이미 작업되있어요 검색해서 좀"

**행동:**
- 작업 전에 **반드시** `git pull origin main` + 관련 파일 `cat`으로 읽는다.
- "이건 아직 안 되어있나?" 의문이 들면 **코드를 직접 확인**한다. 추측하지 않는다.
- 이전 세션에서 뭘 했는지 모르겠으면 **conversation_search 도구**를 사용한다.
- 종원님에게 "이거 되어있나요?" 질문하지 않는다. 코드를 보면 된다.

### 규칙 3: 기존 것을 삭제하지 않는다 (2번 사고)
> "선그른걸 삭제해야지요 왜 원래 것을 삭제하나요"

**행동:**
- 화면에 뭔가 2개 보이면 → **새로 추가한 쪽을 삭제**한다.
- 원래 있던 코드를 절대 지우지 않는다. 새로 넣은 코드를 지운다.
- 실제 사고: GlobeHero에 NAV를 새로 넣어서 2개 → Landing.jsx의 원래 NAV를 삭제 → LangSelector, 로그인 기능 손실

### 규칙 4: zip/다운로드 제안하지 않는다 (3번 이상 지적)
> "내가 다운안받는 작업방식이라구요"
> "지금 장난하나 몇번을 이야기하나요"

**행동:**
- Claude가 직접 `git push origin main`한다.
- Vercel이 자동 배포한다.
- zip 만들기, 파일 다운로드 제안 절대 하지 않는다.

### 규칙 5: 모든 페이지에 적용한다 (명시적 지시)
> "분명히 이야기 합니다 모든 페이지입니다 사이트 전체"
> "회원가입부터 마이페이지 관리자 페이지 구석구석모두요"

**행동:**
- 디자인/테마/폰트 변경은 **관련 파일 전부**에 적용한다.
- "Dashboard만 했으니 나머지는 다음에" ❌ → 한 번에 전부 ✅
- 변경 후 `grep`으로 누락 확인:
  ```bash
  # 예: 다크 테마(T.) 잔존 확인
  grep -rn "T\.\(text\|bg\|border\|accent\)" --include="*.jsx" src/pages/ src/components/ | grep -v "LT\." | grep -v node_modules
  ```

### 규칙 6: 스스로 판단하고 전체를 완성한다
> "일단 전체 판단해서 해주세요 세계 최고디자인으로 책임감을 갖고해주세요"
> "A로 할까요 B로 할까요?" 하지 않는다.

**행동:**
- 기술/디자인 판단은 Claude 책임. 종원님에게 선택지를 넘기지 않는다.
- 기본적인 것(NAV 중복, 빈 공간, 글씨 크기, 테마 불일치)은 지적받기 전에 먼저 잡는다.
- 종원님이 "혼자 해주세요"라면 전체를 완성하고 push한다.

### 규칙 7: sed 일괄 치환 금지 (1번 사고, 100개 이상 오류)
**행동:**
- `T.text` → `LT.text` sed 치환 시 `LT.text`가 또 매칭되어 `LLT.text` 됨
- 파일을 직접 열어서 수정한다.
- sed 사용했으면 반드시: `grep -rn "LLT\.\|LLLT\." --include="*.jsx" --include="*.js" | grep -v node_modules`

---

## 1. 환경

```
GitHub:  y01023901765-design/diah7m-platform (Private)
배포:    Vercel 자동배포 — push → 1~2분 → https://diah7m-platform.vercel.app
PAT:     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
```

---

## 2. 작업 시작 절차

```bash
cd /home/claude/diah7m-platform
git pull origin main                    # 1. 최신 코드
cat src/App.jsx                          # 2. 구조 파악
cat src/theme.js                         # 3. 테마 확인
cat src/pages/[수정할파일].jsx            # 4. 현재 상태 확인
# ... 작업 ...
npx vite build                           # 5. 빌드 테스트 필수
git add -A && git commit -m "설명" && git push origin main  # 6. push
```

---

## 3. 사이트 구조

```
Landing (page='landing')        → 다크 (#04060e), 자체 NAV
Auth (page='login'|'signup')    → 다크, GlobalNav 숨김, 자체 레이아웃
Dashboard (page='dashboard')    → 라이트 (#FFFFFF), GlobalNav 표시
Stock (page='stock')            → 라이트
MyPage (page='mypage')          → 라이트
Admin (page='admin')            → 라이트
```

### App.jsx 핵심:
```jsx
const isDark = page==='landing' || page==='login' || page==='signup';
const TH = isDark ? T : LT;
background: isDark ? `linear-gradient(180deg,${T.bg0},${T.bg1})` : LT.bg0

{page==='landing' ? <LandingPage/> : <>
  {page!=='login' && page!=='signup' && <GlobalNav/>}  // Auth에서 숨김
  {(page==='login'||page==='signup') && <AuthPage/>}
  {page==='dashboard' && <DashboardPage/>}
  ...
  {page!=='login' && page!=='signup' && <Footer/>}     // Auth에서 숨김
</>}
```

---

## 4. 테마 — 어떤 파일에 어떤 테마

```
다크(T):   Landing.jsx, Auth.jsx, GlobeHero.jsx*, LangSelector.jsx, Satellite.jsx
라이트(LT): 그 외 전부

* GlobeHero는 자체 T 상수 사용 (theme.js import 안 함)
```

**라이트 파일 import 방식:**
```javascript
import T, { L as LT } from '../theme';
// 코드에서 LT.text, LT.border 등 사용. T 쓰면 안 됨.
```

**새 파일 만들 때:** 로그인 후 보는 페이지 → LT. Landing/Auth 관련 → T.

---

## 5. 다크 테마 토큰 (Landing, Auth — 변경 금지)

```
bg0:#04060e  bg1:#0a0f1e  surface:#151c2e  border:#1e2a42
text:#e8ecf4  textMid:#8b95a8  textDim:#7a8a9e
accent:#00d4ff  sat:#8b5cf6
good:#00e5a0  warn:#f0b429  danger:#ff5c5c
로고: 🛰️ "DIAH" 흰색 "(-7M)" #00d4ff
```

---

## 6. 라이트 테마 토큰 — 프리미엄 단색 (종원님 직접 결정)

> "최대한 단색. Claude.ai처럼. 컬러는 이모티콘 정도만. 볼드와 사이즈로 위계 구분. 고급스럽게."
> "버튼등 회색과 검정색 명암비 폰트도 검정과 회색 그리고 볼트체 조절만 잘하면 고급스럽습니다"

```
배경: bg0:#FFFFFF  bg1:#FAFAFA  bg2:#F5F5F5  bg3:#EEEEEE
텍스트: text:#111111(제목,bold700~900)  textMid:#444444(본문,regular400)  textDim:#777777(보조,regular400)
테두리: border:#E0E0E0  divider:#F0F0F0
accent: #111111 (검정=고급)
상태만 컬러: good:#059669  warn:#D97706  danger:#DC2626
카드: 흰 배경 + border #E0E0E0 + shadow 0 1px 3px rgba(0,0,0,0.06)
```

---

## 7. 서브페이지 디자인 — 코드로 보여주는 올바른/잘못된 예

### 카드:
```jsx
// ✅
{background:'#FFF', border:'1px solid #E0E0E0', borderRadius:12,
 boxShadow:'0 1px 3px rgba(0,0,0,0.06)', padding:20}

// ❌ 전부 금지
background: `${LT.sat}08`           // 보라색 배경
background: `${LT.accent}15`        // accent 배경
background: `linear-gradient(...)`   // 그라데이션
border: `1px solid ${LT.accent}30`  // 컬러 테두리
```

### 버튼 (2종류만):
```jsx
// Primary (페이지당 1~2개) — 검정
{background:'#111', color:'#fff', border:'none', borderRadius:8,
 padding:'12px 24px', fontSize:15, fontWeight:700}

// Secondary (나머지) — 흰+회색테두리
{background:'#fff', color:'#333', border:'1px solid #D0D0D0',
 borderRadius:8, padding:'10px 16px', fontSize:14, fontWeight:600}
```

### 탭:
```jsx
// 활성: 검정 글씨 + 밑줄
{background:'transparent', color:'#111', fontWeight:700, borderBottom:'2px solid #111'}
// 비활성: 회색
{background:'transparent', color:'#999', fontWeight:400, borderBottom:'2px solid transparent'}
// ❌ background: `${accent}15` 컬러 배경 탭 금지
```

### 컬러 규칙:
```
✅ 이모티콘 (🟢🟡🔴🛰️📊), 상태 텍스트(양호/주의/경보), 검정 Primary 버튼
❌ 카드/섹션 배경 컬러, gradient, 컬러 테두리, 보라색/파란색/주황색 배경
```

---

## 8. 폰트 — 50대 이상 고려 (종원님 직접 결정)

> "글씨폰트도 50대이상이 많이 볼수 있는데"

```
서브페이지:
  히어로수치: 24~42px  bold 800~900  #111  monospace
  섹션제목:  18~22px  bold 700~800  #111
  서브제목:  16px     bold 700      #111
  본문:      15~16px  regular 400   #444  ← 핵심 기준
  보조/라벨: 15px     regular 400   #777
  NAV:       14px (서브페이지 유일한 14px)
  버튼:      15px 이상

위계 밸런스 규칙:
  - 같은 카드 안에서 제목과 본문의 fontSize 차이 최소 2px 이상
  - 제목 옆 부제(괄호)는 제목보다 작고 연하게: fontSize 작게 + #777
  - 수치가 카드의 핵심이면 가장 크게 (22px+)
  - 모든 서브페이지 컴포넌트 15/16px 중심 통일

Landing:
  히어로: 38~48px / 설명: 15~16px / stats: 14px 이상

전체 사이트 12px 미만 금지. 서브페이지 14px 미만 금지 (NAV 제외).
```

---

## 9. NAV 규칙

```
Landing: NAV는 Landing.jsx 안에 1개만. 컴포넌트(GlobeHero 등)에 자체 NAV ❌
서브페이지: GlobalNav.jsx (라이트 테마)
Auth: GlobalNav 숨김 + Footer 숨김. Auth.jsx 자체 다크 레이아웃.
```

---

## 10. GlobeHero 상세

```
D3 Canvas, 한국 중심: geoNaturalEarth1().rotate([-127, 0])
scale: w/6, 높이: w * 0.42, Canvas 전체 너비
43개국, 점수 색상: 70+초록, 55+노랑, 그 아래 빨강
HOME: LANG_HOME[lang]으로 pulsing glow
지도→텍스트: gradient fade-out 220px + margin-top:-40px
GlobeHero.jsx는 자체 T 상수 (theme.js import 안 함)
```

---

## 11. 작업 체크리스트 — 페이지 만들거나 수정할 때마다

```
□ git pull origin main 했는가?
□ 수정할 파일을 cat으로 직접 읽었는가?
□ 모든 텍스트에 t(key, lang) 적용했는가? (한국어 하드코딩 ❌)
□ 새 텍스트 키를 28개 언어 파일에 전부 추가했는가?
□ 라이트 파일인데 T. 대신 LT. 쓰고 있는가?
□ 폰트 12px 미만 없는가?
□ 카드에 컬러 배경 없는가? (흰 + 그림자만)
□ 이 변경이 다른 페이지에도 영향 주는가? → 전부 적용
□ npx vite build 성공하는가?
□ grep으로 누락 확인했는가?
```

---

## 12. 문제 발생 시

| 증상 | 원인 | 해결 |
|------|------|------|
| 화면에 뭔가 2개 | 새로 추가한 것 + 원래 것 | 새로 추가한 쪽 삭제 |
| 텍스트 안 보임 | 배경=글자 색 동일 | 대비 확인 (다크위다크, 라이트위라이트) |
| 언어 전환 안 됨 | t(key,lang) 누락 또는 Canvas langRef 미사용 | 전부 t() 적용 + Canvas는 langRef |
| 카드 안 보임 | 흰 배경 위 흰 카드 | border + boxShadow 추가 |
| 페이지가 다크 | App.jsx isDark 분기 | 해당 page를 isDark 조건에서 제외 |
| 로그인 안 보임 | Auth 위에 라이트 GlobalNav | Auth에서 GlobalNav 숨김 확인 |
| LLT.text 에러 | sed 이중 치환 | grep LLT 후 수동 수정 |

---

## 13. 운영 규칙

- **Claude 채팅** = 설계 + 개발 + 수정 전부
- **Cowork** = 검진보고서만 (코드 수정 절대 금지)
- **종원님** = git push만 / 이론 기획자
- 코드 완성 → **즉시 git push** (context compaction으로 분실 방지)
- Claude는 배포 사이트를 직접 볼 수 없다. 종원님 스크린샷에 의존.
- 여러 창 병렬 시: 각 창 **다른 파일** 담당. push → 다른 창 pull → 작업.

---

## 14. 과학적 언어

- "과거 물리량→오늘 결과=신뢰" / "오늘 물리량→미래 추적=가치"
- 예측 용어 차단: "will", "forecast", "expected" ❌
- 경제 용어 우선 + 인체 비유 보조

---

## 15. UX / 상품

- 쇼핑몰 전시: 잠금 콘텐츠 흐릿하게 + "87% locked" → 구독 전환
- tierMask: FREE / BASIC / PRO / ENTERPRISE
- 로드맵: 1단계 43국 보고서(현재) → 2단계 주식 위성감시(킬러) → 3단계 커스터마이징

---

## 16. 현재 완료 (2026-02-15)

- ✅ Landing 배포 (GlobeHero + D3 + 28언어 + 43국)
- ✅ 라이트 모드 전체 적용 (11개 파일)
- ✅ 프리미엄 단색 (accent=#111, 검정 버튼, 밑줄 탭)
- ✅ 폰트 12px↑ 전체 상향
- ✅ Auth GlobalNav 숨김
- ✅ 전수 검사: LLT 0개, T. 잔존 0개
- 보관: `git checkout v0.1-dark-theme` (다크 전 상태)

### 다음:
- Backend API + DB + auth
- Stripe 결제
- 데이터 수집 59/59 완성
- 엔진 연결 + 실데이터
- 보고서 뷰어
