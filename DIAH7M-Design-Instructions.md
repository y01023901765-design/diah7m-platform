# DIAH-7M 디자인 작업 지침서
> 이 문서는 새 채팅 세션에 반드시 첨부한다.
> Claude는 작업 시작 전 이 문서를 전부 읽고 숙지한 상태에서 작업한다.
> 최종 업데이트: 2026-02-15

---

## 1. Claude의 역할과 책임

Claude는 DIAH-7M 프로젝트의 아키텍트다.

- 글로벌 SaaS 기준으로 스스로 판단하고 실행한다.
- "A로 할까요 B로 할까요?" 식으로 종원님에게 프로그램 선택지를 떠넘기지 않는다.
- 종원님은 이론 기획자다. 프로그램/기술 판단은 전부 Claude 책임이다.
- 디자인 작업 시 기본적인 것(NAV 중복, 빈 공간, 언어 미적용 등)을 종원님이 지적하기 전에 Claude가 먼저 잡아야 한다.
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
```

### 3-3. 기존 구조를 파악한다
- Landing.jsx에 NAV가 있는지
- GlobeHero.jsx에 NAV가 없는지
- i18n이 어떻게 연결되어 있는지
- lang prop이 어떻게 전달되는지
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

실제 사례: 오늘 NAV 중복 문제를 프리뷰 없이 2번 연속 push해서 배포 사이트에 NAV가 2개 보였다. 종원님이 스크린샷으로 지적한 후에야 수정했다. 이런 일이 반복되면 안 된다.

---

## 5. 기존 것을 삭제하지 않는다

**원칙: 문제가 생기면 새로 추가한 것을 삭제한다. 원래 있던 것을 지우지 않는다.**

### 실제 사례: NAV 중복 사건
- GlobeHero 안에 자체 NAV가 있었고, Landing.jsx에도 NAV가 있어서 2개가 보였다.
- 잘못된 대응: Landing.jsx의 원래 NAV를 삭제함 → GlobeHero의 NAV에는 LangSelector, 로그인 기능이 없어서 기능 손실 발생
- 올바른 대응: GlobeHero의 자체 NAV(새로 추가된 것)를 삭제하고, Landing.jsx의 원래 NAV를 유지

### 적용 규칙
- 어떤 요소가 중복이면 → 원래 있던 것을 남기고 새로 만든 것을 삭제
- 어떤 기능이 안 되면 → 기존 코드를 지우지 말고 새로 추가한 부분만 수정
- 확실하지 않으면 → 삭제하지 말고 종원님에게 확인

---

## 6. NAV 규칙

- **NAV는 Landing.jsx에 1개만 존재한다.**
- GlobeHero, 기타 컴포넌트 안에 자체 NAV를 절대 넣지 않는다.
- NAV에는 LangSelector, 로그인 버튼, 무료시작 버튼이 포함된다.
- GlobeHero는 `<GlobeHero lang={L}/>` 형태로 Landing.jsx의 NAV 아래에 위치한다.

### Landing.jsx 구조
```
NAV (LangSelector + 로그인 + 무료시작)
↓
GlobeHero (lang={L} prop 받음, 자체 NAV 없음)
↓
Features 섹션
↓
Pricing 섹션
↓
Footer
```

---

## 7. 다국어 (i18n) — 모든 페이지/컴포넌트에 적용

### 7-1. 원칙
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

### 7-2. 나라 이름
나라 이름도 하드코딩하지 않는다. locale에 cnt_KOR, cnt_USA 등의 키가 28개 언어로 번역되어 있다.
```jsx
// 잘못된 예
<div>{country.n}</div>  // 항상 한국어로 나옴

// 올바른 예  
<div>{t('cnt_' + country.iso, lang)}</div>  // 언어에 따라 자동 변환
```

### 7-3. Canvas 안에서의 다국어
Canvas에서 텍스트를 그릴 때도 lang을 반영해야 한다. Canvas의 draw loop는 requestAnimationFrame으로 돌아가므로 lang이 바뀌어도 자동으로 반영되지 않는다. **langRef (useRef)를 사용**해서 항상 최신 lang을 참조한다.

```jsx
const langRef = useRef(lang);
useEffect(() => { langRef.current = lang }, [lang]);

// draw loop 안에서
const cN = (c) => t('cnt_' + c.iso, langRef.current) || c.en || c.n;
ctx.fillText(cN(country), x, y);
```

### 7-4. 새 텍스트 추가 시
새로운 텍스트를 UI에 추가하면:
1. src/locales/ko.js에 한국어 키 추가
2. src/locales/en.js에 영어 키 추가
3. src/locales/ja.js, zh.js에 일본어/중국어 키 추가
4. 나머지 24개 언어 파일에도 키 추가 (해당 언어 번역 또는 EN fallback)
5. 28개 파일 전부에 추가하지 않으면 일부 언어에서 키 이름이 그대로 표시된다

스크립트로 일괄 추가하는 방법:
```javascript
// 각 locale 파일의 }; 앞에 키 삽입
const content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/\n};/, `,\n  newKey:'번역값',\n};`);
fs.writeFileSync(filePath, content);
```

### 7-5. 언어 전환이 되는지 확인
작업 후 반드시 확인할 것:
- LangSelector에서 언어를 바꾸면 GlobeHero 포함 전체가 해당 언어로 바뀌는가?
- Canvas 위 hover 시 나라 이름이 해당 언어로 표시되는가?
- 클릭 패널의 나라 이름, 상태(양호/주의/경보), 버튼 텍스트가 해당 언어인가?
- 하단 텍스트(59 경제 게이지 등)가 해당 언어인가?

### 7-6. 언어별 HOME 국가
언어를 바꾸면 지도에서 강조(pulsing glow)되는 HOME 국가도 바뀌어야 한다.
```javascript
const LANG_HOME = {
  ko:'KOR', ja:'JPN', zh:'CHN', en:'USA', es:'ESP', fr:'FRA', 
  de:'DEU', pt:'PRT', it:'ITA', nl:'NLD', sv:'SWE', no:'NOR',
  da:'DNK', fi:'FIN', pl:'POL', cs:'CZE', hu:'HUN', tr:'TUR',
  ru:'RUS', he:'ISR', ar:'SAU', hi:'IND', vi:'VNM', th:'THA', id:'IDN'
};
```
Canvas draw loop에서 `c.home` 같은 하드코딩 대신 `c.iso === (LANG_HOME[langRef.current] || 'KOR')`로 판단한다.

### 7-7. 브라우저 언어 자동 감지
navigator.language로 브라우저/OS 언어를 감지한다. 일본에서 일본어 브라우저로 접속하면 자동으로 일본어가 된다. 별도 IP API 호출 불필요.

---

## 8. 디자인 공간/레이아웃 규칙

### 8-1. 빈 공간 확인
작업 후 반드시 확인:
- 지도 아래~텍스트 위 사이에 불필요한 빈 공간이 없는가?
- 컴포넌트 사이에 경계선이나 배경색 차이가 보이는가?
- 전체 페이지에서 어색한 여백이 있는가?

### 8-2. 경계선 처리
지도 Canvas와 텍스트 섹션 사이에 경계선이 보이지 않게:
- 텍스트 섹션을 지도 래퍼(position:relative, overflow:hidden) 안에 넣는다
- 지도 하단에 gradient fade-out(220px, transparent → bg0 60%)을 적용한다
- 텍스트 블록은 margin-top: -40px로 gradient 영역에 살짝 겹친다
- 텍스트 블록에 position:relative, zIndex:5로 gradient 위에 표시한다

### 8-3. 지도 좌우 대칭
- 한국 중심: geoNaturalEarth1().rotate([-127, 0])
- scale: w/6 (너무 크면 대륙이 잘림, 너무 작으면 빈 공간)
- Canvas 전체 너비: maxWidth 제한 없음 (좌우 경계선 방지)
- 높이 비율: w * 0.42

### 8-4. 위성과 빔
- 위성 위치: position absolute, top:4, left:50%, zIndex:10
- 위성~지도 간격: paddingTop:32px
- 빔: 130° SVG polygon, gradient opacity 애니메이션

---

## 9. 색상 토큰 (변경 금지)

### 다크 모드 (Landing, Auth)
```
accent:    #00d4ff (cyan)
satellite: #8b5cf6 (purple)
bg0:       #04060e (deep navy, 메인 배경)
surface:   #151c2e
border:    #1e2a42
text:      #e8ecf4
textMid:   #8b95a8
textDim:   #7a8a9e
good:      #00e5a0 (양호)
warn:      #f0b429 (주의)
danger:    #ff5c5c (경보)
```

### 라이트 모드 (Dashboard, 보고서, MyPage, Admin)
```
accent:    #0891B2 (다크 cyan, 화이트 배경 대비용)
bg:        #FFFFFF (화이트)
surface:   #F8FAFB
border:    #E2E8F0
text:      #1A202C
textMid:   #4A5568
textDim:   #A0AEC0
good:      #059669
warn:      #D97706
danger:    #DC2626
```

### 페이지별 테마 적용
| 페이지 | 테마 | 이유 |
|--------|------|------|
| Landing (GlobeHero) | 다크 | 위성/우주 브랜드 임팩트 |
| Auth (로그인/가입) | 다크 | Landing과 연결감 |
| Dashboard | 라이트 | 59게이지 숫자 가독성 |
| 보고서 뷰어 | 라이트 | 텍스트 중심, 인쇄 호환 |
| MyPage | 라이트 | 정보 확인 |
| Admin | 라이트 | 데이터 테이블 |

theme.js에 dark/light 두 모드를 export하고, 각 페이지에서 적절한 테마를 import한다.

### 폰트 사이즈 기준 (가독성 — 50대 이상 사용자 고려)

주요 사용자가 정부 관계자, 기관 투자자, 경영진(40~60대)이므로 작은 글씨를 지양한다.

**서브페이지(Dashboard, 보고서, MyPage, Admin) 최소 기준:**
```
헤드라인 (h1):     28~36px
섹션 제목 (h2):    20~24px
본문:              16px (절대 14px 이하 금지)
보조 텍스트:       14px (최소)
라벨/캡션:         13px (최소, 이보다 작게 하지 않는다)
버튼 텍스트:       15px 이상
테이블 셀:         14~15px
```

**Landing(GlobeHero):**
Landing은 임팩트 중심이라 작은 보조 텍스트(10~11px) 허용하되, 핵심 메시지는 크게:
```
히어로 타이틀:     38~48px
설명문:            15~16px
stats 숫자:        24px 이상
stats 라벨:        12px 이상 (현재 10px → 12px으로 상향)
힌트 텍스트:       12px 이상 (현재 10px → 12px으로 상향)
```

**절대 규칙:** 서브페이지에서 12px 이하 텍스트를 사용하지 않는다.

### 서브페이지 디자인 원칙 (Claude.ai 스타일)

서브페이지는 **최대한 단색(흑백 + 회색)**으로 구성한다. 데이터 가독성이 최우선이다.

```
허용되는 컬러:
  ✅ 이모티콘 (🟢🟡🔴🛰️ 등)
  ✅ 상태 표시 (양호 green / 주의 amber / 경보 red)
  ✅ accent (#0891B2) — 링크, 버튼에만 최소 사용
  
금지:
  ❌ 배경에 컬러 사용
  ❌ 카드/섹션에 컬러 보더
  ❌ 그라데이션
  ❌ 컬러풀한 아이콘
  ❌ 불필요한 색상 강조

위계 구분 방법:
  - 볼드 (font-weight: 700 vs 400)
  - 사이즈 (h1 28~36px > h2 20~24px > 본문 16px > 보조 14px)
  - 회색 명도 차이 (text #1A202C > textMid #4A5568 > textDim #94A3B8)
  
테이블: 얇은 회색 선(#E2E8F0) + 볼드 헤더 + 충분한 셀 패딩
카드: 그림자 최소(shadow-sm), 회색 테두리(#E2E8F0), 흰 배경
버튼: accent 배경은 primary 버튼 1개만. 나머지는 회색 아웃라인
```

로고: 🛰️ + "DIAH" 흰색 + "(-7M)" #00d4ff
금지: 그라데이션 박스, JetBrains Mono 로고

---

## 10. 현재 파일 구조와 수정 시 주의사항

| 파일 | 역할 | 수정 시 주의 |
|------|------|-------------|
| src/App.jsx | 라우터, lang state | lang을 Landing에 전달: `<LandingPage lang={lang} setLang={setLang}/>` |
| src/pages/Landing.jsx | NAV + GlobeHero + 섹션들 | NAV는 여기에만. `<GlobeHero lang={L}/>` |
| src/components/GlobeHero.jsx | D3 Canvas 지도 | lang prop 받음. 자체 NAV 없음. langRef로 Canvas 동기화 |
| src/i18n.js | t() 함수, detectLang() | `import { t } from '../i18n'` |
| src/locales/ko.js | 한국어 SSOT | 새 키 추가 시 여기가 기준 |
| src/locales/*.js | 28개 언어 | 새 키 추가 시 28개 전부 |
| src/theme.js | 디자인 토큰 | `import T from '../theme'` |

### GlobeHero.jsx 내부 구조
```
LANG_HOME = 언어→국가 매핑
ACTIVE = 43개국 배열 [{iso, n, en, lat, lon, score}]
scoreColor(score) = 점수→색상
ClickedPanel({country, onClose, lang}) = 클릭 팝업
RealisticSatellite() = SVG 위성
WorldMap({hovered, setHovered, setClicked, setMousePos, lang}) = Canvas 지도
  - langRef = useRef(lang) → Canvas loop에서 최신 lang 참조
  - cN(c) = t('cnt_'+c.iso, langRef.current) → 나라 이름
GlobeHero({lang}) = 메인 export
  - cName(c) = t('cnt_'+c.iso, L) → hover 툴팁용
```

---

## 11. 작업 운영 기준

- **Claude 채팅** = 설계 + 개발 + 수정 전부
- **Cowork** = 검진보고서만 생성 (코드 수정 금지)
- **종원님 cmd** = git push만
- 코드 완성 → 즉시 git push (채팅 context compaction으로 코드 분실 방지)
- Claude는 배포 사이트를 직접 볼 수 없다. 종원님 스크린샷에 의존한다.

---

## 12. 과학적 언어 원칙

- "과거 물리량 → 오늘 결과 = 신뢰" / "오늘 물리량 → 미래 추적 = 가치"
- 관찰/비교/이력 언어만 사용
- **예측 용어 시스템 차원 차단** ("~할 것이다", "전망", "예상" 금지)
- 경제 용어 우선 + 인체 비유 보조 (전문성 우선)

---

## 13. UX 핵심 전략

- 쇼핑몰 전시 모델: 잠금 콘텐츠를 흐릿하게 보여주고 "87% 잠겨있습니다" → 구독 전환
- tierMask 구현: FREE / BASIC / PRO / ENTERPRISE
- "안 보이면 안 사지만, 보이는데 못 열면 산다"

---

## 14. 상품 로드맵

- **1단계**: 국가보고서 (OECD 38 + 싱가포르/홍콩/대만/인도 + 중국위성 = 43개국)
- **2단계**: 주식종목 위성감시 (킬러 매출) — 100종목/276시설/21개국
- **3단계**: 프리미엄 커스터마이징

---

## 15. 오늘(2/15) 작업 이력 — 같은 실수 반복 금지

| 실수 | 원인 | 교훈 |
|------|------|------|
| NAV 2개 표시 | GlobeHero에 자체 NAV 포함 | 컴포넌트에 NAV 넣지 않는다 |
| Landing NAV 삭제 | 중복 해결 시 원래 것을 삭제 | 새로 추가한 것을 삭제한다 |
| 한국어 하드코딩 | GlobeHero 텍스트에 i18n 미적용 | 모든 텍스트는 t(key, lang) |
| 언어 전환 안됨 | Canvas에서 lang 변경 미반영 | langRef 사용 |
| 언어 전환 시 나라이름 영어만 | locale에 나라이름 키 없음 | 28개 파일에 cnt_* 키 추가 |
| HOME 불빛 한국 고정 | home:true 하드코딩 | LANG_HOME 맵으로 동적 전환 |
| 지도 아래 빈 공간 | Canvas aspect ratio + padding | gradient fade + margin 조정 |
| 지도~텍스트 경계선 | 별도 div 배경색 차이 | 같은 래퍼 안에 + gradient |
| 지도 우측 잘림 | scale 너무 큼, rotate 값 | scale w/6, rotate -127 |
| 프리뷰 없이 push | 작업 순서 미준수 | 반드시 확인 후 push |
| 이전 채팅 코드 분실 | context compaction | 완성 즉시 git push |
