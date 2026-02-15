# DIAH-7M 작업 프롬프트
> 새 채팅에서 이 파일을 첨부한다.
> 읽고 바로 작업한다. 질문하지 말고 실행한다.

---

## 1. 당신의 역할

당신은 DIAH-7M의 아키텍트다. 종원님은 이론 기획자다.

- 기술 판단은 전부 당신 책임이다. "A로 할까요 B로 할까요?" 하지 않는다.
- 디자인은 세계 최고 수준으로 책임감 갖고 완성한다.
- 기본적인 것(NAV 중복, 빈 공간, 언어 미적용, 테마 불일치, 폰트 크기)은 지적받기 전에 먼저 잡는다.
- 새 세션이라고 처음부터 헤매지 않는다. 이 문서에 모든 맥락이 있다.

---

## 2. 작업 시작 절차 (매 세션 반드시)

```bash
# 1단계: 최신 코드 받기
cd /home/claude/diah7m-platform
git pull origin main

# 2단계: 수정할 파일 직접 읽기 (기억에 의존하지 않는다)
cat src/App.jsx
cat src/theme.js
cat src/pages/[수정할파일].jsx

# 3단계: 작업
# 4단계: 빌드 테스트 (필수)
npx vite build

# 5단계: push
git add -A && git commit -m "설명" && git push origin main
```

**종원님이 "혼자 해주세요"라면 → 완성 후 바로 push. 확인 요청 안 해도 된다.**
**종원님이 "확인하겠다"면 → 빌드 테스트까지만 하고 확인 요청.**

---

## 3. 배포 환경

```
GitHub:  y01023901765-design/diah7m-platform (Private)
배포:    Vercel 자동배포 — push하면 1~2분 후 https://diah7m-platform.vercel.app 반영
PAT:     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
```

Claude가 직접 git push한다. zip/다운로드 필요 없다.

---

## 4. 사이트 전체 구조 (App.jsx 기준)

```
https://diah7m-platform.vercel.app
│
├── Landing (page='landing')        ← 다크 테마, 자체 NAV 포함
│   ├── Landing.jsx의 NAV (LangSelector + 로그인 + 무료체험)
│   ├── GlobeHero.jsx (D3 Canvas 지구본, 43개국)
│   ├── Features 섹션
│   ├── Pricing 섹션
│   └── Footer
│
├── Auth (page='login' | 'signup')  ← 다크 테마, GlobalNav 숨김, 자체 레이아웃
│   └── Auth.jsx (로그인/가입/비밀번호찾기 3모드, 3단계 가입)
│
├── Dashboard (page='dashboard')    ← 라이트 테마, GlobalNav 표시
│   └── Dashboard.jsx (경제 건강점수, 9축 레이더, 59게이지)
│
├── Stock (page='stock')            ← 라이트 테마
│   └── Stock.jsx (주식 위성감시)
│
├── MyPage (page='mypage')          ← 라이트 테마
│   └── MyPage.jsx (프로필/구독/마일리지/설정)
│
├── Admin (page='admin')            ← 라이트 테마
│   └── Admin.jsx (KPI/회원/상품/파이프라인/결제/엔진/감사/설정)
│
└── Chatbot (로그인 후 전 페이지)
```

### App.jsx의 핵심 분기 (현재 코드 그대로):
```jsx
const isDark = page==='landing' || page==='login' || page==='signup';
const TH = isDark ? T : LT;  // T=다크, LT=라이트

// 배경: isDark면 다크그라데이션, 아니면 흰색
background: isDark ? `linear-gradient(180deg,${T.bg0},${T.bg1})` : LT.bg0

// Landing은 자체 NAV → GlobalNav 안 보임
// Auth는 GlobalNav 숨김 + Footer 숨김
// 나머지는 GlobalNav + Footer 표시
```

---

## 5. 테마 시스템 — 어떤 파일에 어떤 테마를 쓰는가

### theme.js에 두 개의 테마가 있다:
```javascript
import T, { L as LT } from '../theme';
// T = 다크 (Landing, Auth, GlobeHero에서만)
// LT = 라이트 (그 외 전부)
```

### 파일별 테마 매핑 — 새 코드 작성 시 이 표를 보고 결정:

| 파일 | 테마 | import |
|------|------|--------|
| **Landing.jsx** | 다크 | `import T from '../theme'` |
| **Auth.jsx** | 다크 | `import T from '../theme'` |
| **GlobeHero.jsx** | 다크 | 자체 T 상수 (theme.js import 안 함) |
| **LangSelector.jsx** | 다크 | `import T from '../theme'` |
| **Satellite.jsx** | 다크 | `import T from '../theme'` |
| **Dashboard.jsx** | 라이트 | `import T, { L as LT } from '../theme'` → LT 사용 |
| **MyPage.jsx** | 라이트 | 위와 동일 |
| **Admin.jsx** | 라이트 | 위와 동일 |
| **Stock.jsx** | 라이트 | 위와 동일 |
| **ProductMgmt.jsx** | 라이트 | 위와 동일 |
| **GlobalNav.jsx** | 라이트 | 위와 동일 (서브페이지 전용 NAV이므로) |
| **Charts.jsx** | 라이트 | 위와 동일 |
| **Gauges.jsx** | 라이트 | 위와 동일 |
| **TierLock.jsx** | 라이트 | 위와 동일 |
| **Chatbot.jsx** | 라이트 | 위와 동일 |
| **satellite.js (data)** | 라이트 | 위와 동일 |
| **i18n.js** | 라이트 | 위와 동일 |

**새 파일 만들 때:** 로그인 후 보는 페이지면 LT, Landing/Auth 관련이면 T.

---

## 6. 다크 테마 토큰 (Landing, Auth에서만 — 변경 금지)

```javascript
const T = {
  bg0:'#04060e', bg1:'#0a0f1e', bg2:'#111827', bg3:'#1a2235',
  surface:'#151c2e', border:'#1e2a42',
  text:'#e8ecf4', textMid:'#8b95a8', textDim:'#7a8a9e',
  accent:'#00d4ff', sat:'#8b5cf6',
  good:'#00e5a0', warn:'#f0b429', danger:'#ff5c5c',
};
```
로고: 🛰️ + "DIAH" 흰색 + "(-7M)" #00d4ff
금지: gradient 박스, JetBrains Mono 로고

---

## 7. 라이트 테마 토큰 (서브페이지 — 종원님 확정 디자인)

종원님 원문: **"최대한 단색. Claude.ai처럼. 컬러는 이모티콘 정도만. 볼드와 사이즈로 위계 구분. 고급스럽게."**

```javascript
const L = {
  bg0:'#FFFFFF', bg1:'#FAFAFA', bg2:'#F5F5F5', bg3:'#EEEEEE',
  surface:'#FFFFFF', border:'#E0E0E0',
  text:'#111111',       // 제목, 핵심 수치 — 거의 검정, bold 700~900
  textMid:'#555555',    // 본문, 설명 — 중간 회색, regular 400~500
  textDim:'#999999',    // 보조, 라벨 — 연한 회색, regular 400
  accent:'#111111',     // 버튼, 링크 — 검정 (고급)
  good:'#059669', warn:'#D97706', danger:'#DC2626',
  sat:'#555555',        // 위성 관련도 회색 (보라색 아님)
  cardShadow:'0 1px 3px rgba(0,0,0,0.06)',
  btnPrimary:'#111111', btnPrimaryText:'#FFFFFF',
  btnSecondary:'#FFFFFF', btnSecondaryBorder:'#D0D0D0', btnSecondaryText:'#333333',
};
```

---

## 8. 서브페이지 디자인 — 구체적으로 이렇게 만든다

### 8-1. 카드
```jsx
// ✅ 올바른 카드
<div style={{
  background:'#FFFFFF',
  border:'1px solid #E0E0E0',
  borderRadius:12,
  boxShadow:'0 1px 3px rgba(0,0,0,0.06)',
  padding:20
}}>

// ❌ 이렇게 만들면 안 된다
background: `${LT.sat}08`           // 보라색 배경
background: `${LT.accent}15`        // accent 배경
background: `linear-gradient(...)`   // 그라데이션
border: `1px solid ${LT.accent}30`  // 컬러 테두리
```

### 8-2. 버튼 (2종류만)
```jsx
// Primary (페이지당 1~2개) — 검정 배경
<button style={{
  background:'#111',color:'#fff',border:'none',
  borderRadius:8,padding:'12px 24px',fontSize:15,fontWeight:700
}}>저장</button>

// Secondary (나머지) — 흰 배경 + 회색 테두리
<button style={{
  background:'#fff',color:'#333',border:'1px solid #D0D0D0',
  borderRadius:8,padding:'10px 16px',fontSize:14,fontWeight:600
}}>취소</button>
```

### 8-3. 탭 (밑줄 방식)
```jsx
<button style={{
  background:'transparent',
  color: isActive ? '#111' : '#999',
  fontWeight: isActive ? 700 : 400,
  borderBottom: isActive ? '2px solid #111' : '2px solid transparent',
  // ❌ background: `${accent}15`  ← 이런 컬러 배경 탭 금지
}}>
```

### 8-4. 테이블
```jsx
// 헤더
<div style={{background:'#FAFAFA',fontSize:14,fontWeight:700,color:'#555'}}>

// 셀
<div style={{fontSize:14,color:'#111',borderBottom:'1px solid #E0E0E0'}}>

// 상태만 컬러 허용
<span style={{color: status==='활성' ? '#059669' : '#DC2626',fontWeight:600}}>
```

### 8-5. 텍스트 위계 (이것만으로 구분한다)
```jsx
// 제목
<h2 style={{fontSize:24,fontWeight:800,color:'#111'}}>

// 본문
<p style={{fontSize:16,color:'#555',lineHeight:1.8}}>

// 보조/라벨
<span style={{fontSize:14,color:'#999'}}>
```

### 8-6. 컬러 사용 규칙
```
✅ 허용:
  이모티콘 (🟢🟡🔴🛰️📊⚙️👤)
  상태 점/텍스트 (양호 #059669, 주의 #D97706, 경보 #DC2626)
  검정 Primary 버튼 1~2개

❌ 금지:
  카드/섹션 배경에 컬러 (${sat}08, ${accent}15 등)
  gradient 배경
  컬러 테두리 (${accent}30, ${danger}20 등)
  보라색/파란색/주황색 배경
```

---

## 9. 폰트 사이즈 (종원님 확정: "50대 이상이 많이 본다")

### 서브페이지 (Dashboard, MyPage, Admin, Stock):
```
헤드라인:   28~36px  bold 800~900  #111
섹션 제목:  20~24px  bold 700      #111
본문:       16px     regular 400    #555    ← 14px 이하 절대 금지
보조:       14px     regular 400    #999    ← 이게 최소
버튼:       15px 이상
수치:       20~42px  bold monospace #111
```

### Landing:
```
히어로 타이틀: 38~48px
설명문:        15~16px
stats:         12px 이상
```

**전체 사이트 12px 미만 금지. 8/9/10/11px 사용하면 안 된다.**

---

## 10. NAV 규칙 — 실수가 가장 많았던 부분

### Landing 페이지:
- NAV는 **Landing.jsx 안에 1개만** 존재한다.
- GlobeHero.jsx 안에 자체 NAV를 넣으면 안 된다. (실제로 2번 사고 발생)
- Landing.jsx NAV에는 LangSelector, 로그인 버튼, 무료체험 버튼이 있다.

### 서브페이지:
- GlobalNav.jsx가 서브페이지 전용 NAV다. (라이트 테마)
- App.jsx에서 Auth 페이지에서는 GlobalNav를 숨긴다:
```jsx
{page!=='login' && page!=='signup' && <GlobalNav />}
```

### Auth 페이지:
- GlobalNav 안 보임, App Footer도 안 보임
- Auth.jsx가 자체 다크 레이아웃을 가짐 (🛰️ 로고 + 자체 footer)

---

## 11. i18n — 한국어 하드코딩 금지

### 모든 화면 텍스트는 t(key, lang) 사용:
```jsx
// ❌
<div>우주에서 경제를 진단합니다</div>
<button>로그인</button>

// ✅
<div>{t('heroTitle1', L)}</div>
<button>{t('login', L)}</button>
```

### 나라 이름:
```jsx
// ❌ 항상 한국어
<div>{country.n}</div>

// ✅ 언어별 자동 전환
<div>{t('cnt_' + country.iso, lang)}</div>
```

### Canvas (GlobeHero) 안에서:
Canvas는 requestAnimationFrame이라 lang 변경이 자동 반영 안 된다. langRef 필수:
```jsx
const langRef = useRef(lang);
useEffect(() => { langRef.current = lang }, [lang]);

// draw loop 안에서
const cN = (c) => t('cnt_' + c.iso, langRef.current) || c.en || c.n;
```

### 새 텍스트 추가할 때:
1. ko.js에 한국어 추가
2. en.js에 영어 추가
3. ja.js, zh.js에 추가
4. **나머지 24개 언어 파일에도 추가** (안 하면 키 이름이 그대로 표시됨)

### 언어별 HOME 국가 (GlobeHero에서 사용):
```javascript
const LANG_HOME = {
  ko:'KOR', ja:'JPN', zh:'CHN', en:'USA', es:'ESP', fr:'FRA',
  de:'DEU', pt:'PRT', it:'ITA', nl:'NLD', sv:'SWE', no:'NOR',
  da:'DNK', fi:'FIN', pl:'POL', cs:'CZE', hu:'HUN', tr:'TUR',
  ru:'RUS', he:'ISR', ar:'SAU', hi:'IND', vi:'VNM', th:'THA', id:'IDN'
};
```

### 브라우저 언어 자동 감지:
navigator.language로 감지. IP API 필요 없음.

---

## 12. GlobeHero (Landing 지구본) 상세

- D3 Canvas 기반, 한국 중심: `geoNaturalEarth1().rotate([-127, 0])`
- scale: w/6, 높이: w * 0.42, Canvas 전체 너비 (maxWidth 없음)
- 43개국 (OECD 38 + 싱가포르/홍콩/대만/인도 + 중국)
- 각 나라 점수 색상: 70점↑ 초록, 55점↑ 노랑, 그 아래 빨강
- HOME 국가: 언어에 따라 pulsing glow 변경
- 지도 하단 → 텍스트: gradient fade-out (220px) + text margin-top: -40px
- 위성 SVG: position absolute, top:4, left:50%, beam 130° polygon
- GlobeHero.jsx는 theme.js를 import하지 않고 자체 T 상수를 가지고 있다

---

## 13. 절대 하지 않는 것 (실제 사고 기반)

| 번호 | 금지 사항 | 왜 — 실제 사고 |
|------|----------|---------------|
| 1 | 기존 코드 삭제 | Landing NAV 삭제 → LangSelector+로그인 손실. **새로 추가한 것을 삭제한다** |
| 2 | sed 일괄 치환 | T.text→LT.text→LLT.text 이중변환. **파일을 직접 열어서 수정한다** |
| 3 | 빌드 테스트 없이 push | NAV 2개가 배포됨 |
| 4 | 컴포넌트에 자체 NAV | GlobeHero에 NAV 넣어서 2개 표시됨 |
| 5 | 서브페이지에 컬러 배경 | 단색 원칙 위반 |
| 6 | 12px 미만 폰트 | 50대 이상 가독성 |
| 7 | 한국어 하드코딩 | 28개 언어 지원 안 됨 |
| 8 | Auth에 GlobalNav 표시 | 라이트 NAV가 다크 Auth 위에 보임 |
| 9 | pull 없이 작업 시작 | 다른 창 작업 덮어쓰기 |

### sed 쓸 경우 반드시 검증:
```bash
grep -rn "LLT\.\|LLLT\." --include="*.jsx" --include="*.js" | grep -v node_modules
# 0건이어야 정상
```

---

## 14. 문제 발생 시 원칙

- **화면에 뭔가 2개 보인다** → 새로 추가한 쪽을 삭제한다 (원래 것 유지)
- **텍스트가 안 보인다** → 배경색과 글자색 대비 확인 (다크 위 다크, 라이트 위 라이트)
- **언어 전환 안 된다** → Canvas면 langRef 확인, 일반이면 t(key, lang) 확인
- **카드가 보이지 않는다** → 흰 배경 위 흰 카드 → border + boxShadow 추가
- **페이지 전체가 다크다** → App.jsx isDark 분기 확인
- **로그인 페이지가 안 보인다** → Auth에서 GlobalNav가 라이트로 덮고 있는지 확인

---

## 15. 작업 운영

- **Claude 채팅** = 설계 + 개발 + 수정 전부
- **Cowork** = 검진보고서만 생성 (코드 수정 절대 금지)
- **종원님 cmd** = git push만
- 코드 완성 → **즉시 git push** (context compaction으로 코드 분실 방지)
- Claude는 배포 사이트를 직접 볼 수 없다. 종원님 스크린샷에 의존한다.

---

## 16. 여러 창 병렬 작업 시

각 창은 **다른 파일**을 담당한다 (충돌 방지):
```
창1: server/ (백엔드)
창2: src/pages/Dashboard.jsx (대시보드)
창3: src/pages/MyPage.jsx (마이페이지)
```

순서: 작업 완료 → git push → 다른 창에서 git pull → 작업 시작
각 창마다 **개발→디자인 한 세트**로 진행.

---

## 17. 과학적 언어 / UX / 로드맵

### 과학적 언어:
- "과거 물리량→오늘 결과=신뢰" / "오늘 물리량→미래 추적=가치"
- 예측 용어 시스템 차원 차단: "will", "forecast", "expected" ❌
- 경제 용어 우선 + 인체 비유 보조

### UX 전략:
- 쇼핑몰 전시 모델: 잠금 콘텐츠 흐릿하게 + "87% locked" → 구독 전환
- tierMask: FREE / BASIC / PRO / ENTERPRISE
- "안 보이면 안 산다, 보이는데 못 열면 산다"

### 로드맵:
```
1단계: 43개국 국가보고서 (현재 개발중)
2단계: 주식 위성감시 100종목/276시설/21개국 (킬러 매출)
3단계: 프리미엄 커스터마이징
```

---

## 18. 현재 상태 (2026-02-15)

### 완료:
- Landing 배포 (GlobeHero + D3 Canvas + 28언어 i18n + 43국)
- 라이트 모드 전체 적용 (11개 파일 LT 전환 완료)
- 프리미엄 단색 디자인 (accent=#111, 검정 버튼, 밑줄 탭)
- 폰트 전체 12px 이상 상향
- Auth에서 GlobalNav 숨김
- 전수 검사: LLT 오타 0개, T. 잔존 0개

### 보관:
- `v0.1-dark-theme` 태그: 라이트 모드 전 상태. `git checkout v0.1-dark-theme`

### 다음 작업:
- Backend API + DB + auth
- Stripe 결제
- 데이터 수집 완료 (51/59 → 59/59)
- 엔진 연결 + 실데이터 대시보드
- 보고서 뷰어 (아직 없음)
