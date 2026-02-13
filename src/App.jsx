import { useState, useEffect, useCallback, useRef } from "react";

// ══════════════════════════════════════════════════════════════
// DIAH-7M PRODUCTION PLATFORM v1.0
// Landing → 회원가입/로그인 → 대시보드 → 59게이지 진단서
// 경제용어 = 메인 | 의학비유 = 설명 시에만
// ══════════════════════════════════════════════════════════════

// ── DESIGN TOKENS ──
const T = {
  bg0:'#04060e', bg1:'#0a0f1e', bg2:'#111827', bg3:'#1a2235',
  surface:'#151c2e', surfaceHover:'#1c2540',
  border:'#1e2a42', borderLight:'#2a3a58',
  text:'#e8ecf4', textMid:'#8b95a8', textDim:'#5a6478',
  accent:'#00d4ff', accentDim:'#00d4ff30', accentMid:'#00d4ff60',
  good:'#00e5a0', warn:'#f0b429', danger:'#ff5c5c', info:'#6e8efb',
  sat:'#8b5cf6', satDim:'#8b5cf620', satBorder:'#6d28d9',
  cardRadius:14, smRadius:8,
};

// ── i18n SYSTEM ──
const LANG_LIST=[
  {code:'ko',flag:'🇰🇷',name:'한국어'},
  {code:'en',flag:'🇺🇸',name:'English'},
  {code:'ja',flag:'🇯🇵',name:'日本語'},
  {code:'zh',flag:'🇨🇳',name:'中文'},
  {code:'es',flag:'🇪🇸',name:'Español'},
  {code:'ar',flag:'🇸🇦',name:'العربية'},
  {code:'fr',flag:'🇫🇷',name:'Français'},
  {code:'de',flag:'🇩🇪',name:'Deutsch'},
  {code:'pt',flag:'🇧🇷',name:'Português'},
  {code:'vi',flag:'🇻🇳',name:'Tiếng Việt'},
  {code:'th',flag:'🇹🇭',name:'ไทย'},
  {code:'id',flag:'🇮🇩',name:'Bahasa'},
  {code:'hi',flag:'🇮🇳',name:'हिन्दी'},
  {code:'ru',flag:'🇷🇺',name:'Русский'},
  {code:'it',flag:'🇮🇹',name:'Italiano'},
  {code:'nl',flag:'🇳🇱',name:'Nederlands'},
  {code:'pl',flag:'🇵🇱',name:'Polski'},
  {code:'tr',flag:'🇹🇷',name:'Türkçe'},
  {code:'sv',flag:'🇸🇪',name:'Svenska'},
  {code:'da',flag:'🇩🇰',name:'Dansk'},
  {code:'no',flag:'🇳🇴',name:'Norsk'},
  {code:'fi',flag:'🇫🇮',name:'Suomi'},
  {code:'cs',flag:'🇨🇿',name:'Čeština'},
  {code:'hu',flag:'🇭🇺',name:'Magyar'},
  {code:'ro',flag:'🇷🇴',name:'Română'},
  {code:'uk',flag:'🇺🇦',name:'Українська'},
  {code:'el',flag:'🇬🇷',name:'Ελληνικά'},
  {code:'he',flag:'🇮🇱',name:'עברית'},
  {code:'ms',flag:'🇲🇾',name:'Melayu'},
  {code:'bn',flag:'🇧🇩',name:'বাংলা'},
];
const detectLang=()=>{
  if(typeof navigator==='undefined') return 'ko';
  const bl=navigator.language.slice(0,2);
  return LANG_LIST.find(l=>l.code===bl)?bl:'en';
};
// ── ko 원본 (Single Source of Truth) ──
const KO={
  // ── NAV ──
  login:'로그인',
  signup:'무료 시작',
  logout:'로그아웃',
  dashboard:'대시보드',
  mypage:'마이페이지',
  admin:'관리자',
  // ── HERO ──
  heroSub:'SATELLITE ECONOMIC DIAGNOSTICS',
  heroTitle1:'우주에서',
  heroTitle2:'경제를 진단합니다',
  heroDesc:'NASA·ESA 위성 데이터로 정부 통계보다',
  heroFast:'2개월 빠른',
  heroDesc2:'경제 진단.',
  heroCta:'무료로 진단 시작하기',
  heroMore:'자세히 보기 ↓',
  gauges:'경제 게이지',
  bodySys:'인체 시스템',
  satCost:'위성 비용',
  languages:'지원 언어',
  // ── FEATURES ──
  whyTitle:'기존 경제 분석과 무엇이 다른가',
  feat1:'측정 vs 해석',
  feat2:'2개월 선행',
  feat3:'인체비유 진단',
  feat4:'이중봉쇄 경보',
  feat5:'Delta 괴리 분석',
  feat6:'투자 행동 시그널',
  featDesc1:"증권사는 통계를 '해석'합니다. DIAH-7M은 위성으로 '측정'합니다.",
  featDesc2:'정부 통계보다 2개월 전, 위성이 변화를 감지합니다.',
  featDesc3:"경상수지 적자 → '폐의 산소 배출 감소'. 누구나 즉시 파악.",
  featDesc4:'입력·출력 동시 봉쇄 시 경보 발령. 유일한 시스템.',
  featDesc5:'위성 지수 vs 시장 지수 차이 → 저평가/과열 신호.',
  featDesc6:'진단 결과를 구체적 투자 행동으로 번역합니다.',
  // ── HOW IT WORKS ──
  howTitle:'위성에서 투자 행동까지',
  step1:'위성 관측',
  step2:'물리 측정',
  step3:'경제 진단',
  step4:'교차검증',
  step5:'행동 시그널',
  // ── PRICING ──
  pricingTitle:'위성 데이터는 무료, 진단은 합리적으로',
  pricingSub:'모든 유료 플랜 14일 무료 체험 · 언제든 해지 가능',
  free:'무료 시작',
  trial:'14일 무료 체험',
  perMonth:'/월',
  // ── FAQ ──
  faqTitle:'자주 묻는 질문',
  // ── CTA ──
  ctaTitle:'지금 시작하세요',
  ctaDesc:'가입 즉시 500P 마일리지 · 14일 무료 체험 · 카드 등록 불필요',
  ctaBtn:'무료 계정 만들기',
  // ── AUTH ──
  loginTitle:'로그인',
  email:'이메일',
  password:'비밀번호',
  forgotPw:'비밀번호 찾기',
  noAccount:'{t("noAccount",L)}',
  freeSignup:'무료 가입',
  hasAccount:'{t("hasAccount",L)}',
  or:'또는',
  resetTitle:'비밀번호 재설정',
  resetDesc:'{t("resetDesc",L)}',
  resetSent:'이메일 발송 완료',
  resetBtn:'재설정 링크 발송',
  backToLogin:'← 로그인으로 돌아가기',
  createAccount:'계정 생성',
  selectPlan:'플랜 선택',
  agreeTerms:'약관 동의',
  name:'이름',
  quickSignup:'간편 가입',
  next:'다음',
  agreeAll:'전체 동의',
  required:'필수',
  optional:'선택',
  termsService:'이용약관 동의',
  termsPrivacy:'개인정보 처리방침 동의',
  termsMarketing:'마케팅 수신 동의',
  selectedPlan:'{t("selectedPlan",L)}',
  mileageBonus:'가입 즉시 500P 마일리지 지급!',
  // ── DASHBOARD ──
  overview:'📊 종합 진단',
  gaugeTab:'📋 59게이지',
  satTab:'🛰️ 위성',
  alertTab:'🔔 경보',
  good:'양호',
  caution:'주의',
  alert:'경보',
  keyActions:'🎯 핵심 행동 5가지',
  verdict:'📋 종합소견',
  satTimeline:'🛰️ 위성 시간축',
  verification:'⏪ 검증',
  prediction:'⏩ 예측',
  nineSystems:'9개 경제 시스템',
  alertCenter:'🔔 경보 센터',
  dualLock:'이중봉쇄 작동 중',
  deltaTitle:'📐 Delta 괴리 분석',
  satIndex:'위성 지수',
  marketIndex:'시장 지수',
  // ── MYPAGE ──
  profile:'프로필',
  subscription:'구독 관리',
  mileage:'마일리지',
  settings:'설정',
  save:'변경사항 저장',
  changePw:'비밀번호 변경',
  currentPlan:'현재 플랜',
  changePlan:'플랜 변경',
  cancelSub:'해지',
  balance:'보유',
  earned:'이번 달 적립',
  used:'이번 달 사용',
  exchange:'교환 메뉴',
  notifications:'알림 설정',
  langSetting:'🌐 언어 설정',
  deleteAccount:'계정 삭제',
  // ── CHATBOT ──
  chatGreeting:'안녕하세요! DIAH-7M 위성 경제 진단 서비스입니다. 무엇을 도와드릴까요?',
  chatPlaceholder:'질문을 입력하세요...',
  chatSend:'전송',
  // ── DASHBOARD DETAIL ──
  dateLabel:'2026년 1월 · 대한민국',
  totalScore:'종합 점수',
  stNormal:'정상',
  stWatch:'관측',
  stTrigger:'트리거',
  stSeal:'봉쇄',
  stCrisis:'위기',
  inputSeal:'입력 봉쇄',
  outputSeal:'출력 봉쇄',
  dualLockActive:'이중봉쇄 작동 중',
  negGap:'부정적 괴리',
  deltaTitle:'📐 Delta 괴리 분석',
  satIndex:'위성 지수',
  mktIndex:'시장 지수',
  deltaDesc:'위성 데이터는 경제 활동이 활발하다고 보지만, 시장 심리는 이를 반영하지 못하고 있습니다. 저평가 가능성.',
  gaugesLabel:'게이지',
  deltaDesc:'위성 데이터는 경제 활동이 활발하다고 보지만, 시장 심리는 이를 반영하지 못하고 있습니다. 저평가 가능성.',
  verdictText:'수출(658억$)과 반도체는 강력하다. 물가(2.0%), 금리(2.5%) 안정. 그러나 내수 약하고, 건설(-3.2%), 자영업 연체율(1.8%↑)은 내부 균열. 외부 강하나 내부 약한 "외강내약" 구조.',
  actions:['반도체 수출 역대 최대 → HBM·장비·소재주 비중 유지/확대','KOSPI 5,300 돌파 → 레버리지 축소, 분산 투자','환율 1,450원대 고착화 → 수출주 수혜 점검','건설·부동산 약세 → 관련 섹터 비중 축소','자영업 연체율↑ → 소비 관련주 리스크 주의'],
  satVerify:'⏪ 검증',
  satPredict:'⏩ 예측',
  satEarlyDetect:'위성 조기 확인',
  satStatBefore:'통계 발표 전 확인',
  satPastVerify:'⏪ 과거 위성 → 오늘 확인',
  satFutureHint:'⏩ 오늘 위성 → 미래 시사',
  satEvidence:'근거',
  bodyMetaphor:'🏥 인체비유',
  satObsInfo:'🛰️ 위성 관측 정보',
  satCol:'위성',
  satProg:'프로그램',
  satCycle:'관측주기',
  satBand:'파장/밴드',
  investSignal:'🎯 투자 행동 시그널',
  sigBuy:'매수',
  sigAvoid:'회피',
  sigSell:'매도',
  blindSpot:'🔭 DIAH-7M만의 시야',
  gaugesLabel:'개 게이지',
  // ── MYPAGE DETAIL ──
  profileSaved:'✅ 프로필이 저장되었습니다',
  fillAllFields:'⚠️ 모든 필드를 입력해주세요',
  pwMismatch:'⚠️ 새 비밀번호가 일치하지 않습니다',
  pwChanged:'✅ 비밀번호가 변경되었습니다',
  paymentPending:'💳 결제 시스템 연동 후 이용 가능합니다',
  confirmCancelSub:'정말 구독을 해지하시겠습니까?',
  cancelInfo:'해지 후 남은 기간까지 서비스를 이용할 수 있습니다.',
  cancelFeatures:'Pro 기능(59게이지, 위성 교차검증)이 비활성화됩니다.',
  confirmCancelBtn:'해지 확인',
  goBack:'돌아가기',
  subCancelled:'✅ 구독이 해지 예약되었습니다',
  nextBill:'다음 결제일',
  payMethod:'결제 수단',
  streak:'연속 구독',
  changePayment:'결제 수단 변경',
  active:'활성',
  milInsufficient:'마일리지가 부족합니다',
  milExchanged:'교환 완료!',
  notifEnabled:'활성화',
  notifDisabled:'비활성화',
  langChanged:'언어가 변경되었습니다',
  confirmDeleteTitle:'⚠️ 계정을 삭제하시겠습니까?',
  confirmDeleteDesc:'삭제된 계정은 복구할 수 없습니다. 모든 데이터(보고서, 마일리지)가 영구 삭제됩니다.',
  permDelete:'영구 삭제',
  cancel:'취소',
  accountDeleted:'계정이 삭제 요청되었습니다',
  emailNotif:'이메일 알림',
  emailNotifDesc:'월간 보고서, 경보',
  smsNotif:'SMS 알림',
  smsNotifDesc:'긴급 경보만',
  kakaoNotif:'카카오톡 알림',
  kakaoNotifDesc:'보고서 발행, 경보',
  slackNotif:'Slack 알림',
  slackNotifDesc:'팀 알림 (Enterprise)',
  pushNotif:'Push 알림',
  pushNotifDesc:'실시간 경보',
  curPw:'현재 비밀번호',
  newPw:'새 비밀번호',
  confirmPw:'새 비밀번호 확인',
  phone:'연락처',
  // ── AUTH DETAIL ──
  pwCheck8:'8자+',
  pwCheckAlpha:'영문',
  pwCheckNum:'숫자',
  pwCheckSpecial:'특수',
  nameRequired:'이름을 입력해주세요',
  emailInvalid:'올바른 이메일 형식을 입력해주세요',
  pwRequired:'비밀번호 조건을 모두 충족해주세요',
  pwEnterRequired:'비밀번호를 입력해주세요',
  termsRequired:'필수 약관에 동의해주세요',
  loggingIn:'로그인 중...',
  sending:'발송 중...',
  creating:'계정 생성 중...',
  freeCreate:'무료 계정 만들기',
  trialStart:'14일 무료 체험 시작',
  trialNote:'14일 무료 체험 후 결제가 시작됩니다 · 언제든 해지 가능',
  connecting:'연결 중...',
  satPlatform:'위성 경제 진단 플랫폼',
  satPredict2:'⏩ 예측',
  gaugeDetail:'59게이지 상세 진단',
  gaugeDetailSub:'2026년 1월 · 9축 · 실데이터 · 위성 교차검증',
  freqDaily:'매일',
  freq12d:'12일',
  freq16d:'16일',
  curPlan:'현재 플랜',
  change:'변경',
  spent:'이번 달 사용',
  exchangeMenu:'교환 메뉴',
  notifSettings:'알림 설정',
  // ── PLAN FEATURES (bilingual handled in code) ──
  planFreeDesc:'기본 진단 체험',
  planBasicDesc:'핵심 게이지 열람',
  planProDesc:'59게이지 + 위성 교차검증',
  planEntDesc:'기관·팀 전용',
  planFreeFeat:['월간 요약 1회','9축 점수','이메일 알림','가입 시 500P'],
  planBasicFeat:['월간 풀 리포트','주요 게이지 20개','위성 요약','AI 챗봇 기본','월 100P 적립'],
  planProFeat:['주간+월간 풀 리포트','59게이지 전체','위성 교차검증','AI 챗봇 무제한','행동 시그널','데이터 내보내기','월 200P (2배)'],
  planEntFeat:['Pro 전체 +','API 접근','맞춤 리포트','전담 매니저','팀 5명','30개 언어','월 300P (3배)'],
  milBasic:'월 100P 적립',
  milPro:'월 200P 적립 (2배)',
  milEnt:'월 300P 적립 (3배)',
  // ── EXCHANGE MENU ──
  exReport:'추가 보고서 1건',
  exHistory:'과거 데이터 1개월',
  exApi:'API 100회 추가',
  exExport:'데이터 내보내기 1회',
  exDiscount:'결제 1% 할인',
  // ── FAQ ──
  faq1q:'DIAH-7M이 뭔가요?',
  faq1a:'NASA·ESA 위성 데이터(야간광, NO₂, 열적외선, SAR)로 한국 경제를 59개 게이지, 9개 시스템으로 진단하는 세계 최초의 위성 경제 진단 플랫폼입니다.',
  faq2q:'기존 증권사/한국은행 리포트와 뭐가 다른가요?',
  faq2a:'기존 리포트는 통계를 해석합니다. DIAH-7M은 위성으로 측정합니다. 공장이 돌아가는 열, 항만의 빛, 대기 배출로 경제를 직접 봅니다.',
  faq3q:'위성 데이터는 비용이 드나요?',
  faq3a:'아닙니다. NASA VIIRS, ESA Copernicus Sentinel, Landsat-9 모두 무료 공개 데이터입니다.',
  faq4q:'인체비유가 왜 필요한가요?',
  faq4a:"경상수지가 적자다 → 이게 나쁜 건가? DIAH-7M은 '장(腸)의 영양 흡수가 역전되어 에너지 유출'로 번역합니다. 비전문가도 즉시 심각성을 파악할 수 있습니다.",
  faq5q:'무료 플랜으로 뭘 할 수 있나요?',
  faq5a:'매월 1회 9축 종합 점수와 요약을 받습니다. 59게이지 상세, 위성 교차검증은 Basic 이상 플랜에서 이용 가능합니다.',
  faq6q:'환불 정책은 어떻게 되나요?',
  faq6a:'14일 무료 체험 기간 내 해지하면 비용이 발생하지 않습니다. 이후 결제된 금액은 남은 기간에 비례하여 환불됩니다.',
  gI1:'기준금리',gI2:'경상수지',gI3:'외환보유고',gI4:'환율(원/달러)',gI5:'M2 증가율',gI6:'국채금리(3Y)',
  gE1:'수출',gE2:'수입',gE3:'무역수지',gE4:'컨테이너물동량',gE5:'유가(두바이)',gE6:'수출증가율',
  gC1:'소매판매',gC2:'소비자심리',gC3:'카드매출',gC4:'설비투자',gC5:'민간소비',gC6:'서비스업생산',
  gS1:'BSI(기업경기)',gS2:'야간광량(위성)',gS3:'경기선행지수',gS4:'정부지출',gS5:'정책불확실성',gS6:'경기동행지수',
  gF1:'신용스프레드',gF2:'CD-국고채 스프레드',gF3:'KOSPI',gF4:'V-KOSPI(변동성)',gF5:'연체율(금융)',gF6:'회사채스프레드',gF7:'KOSDAQ',
  gP1:'CPI(소비자물가)',gP2:'PPI(생산자물가)',gP3:'국세수입',gP4:'국가채무비율',gP5:'재정수지',gP6:'근원물가',
  gO1:'산업생산',gO2:'PMI(제조업)',gO3:'건설기성',gO4:'제조업생산',gO5:'서비스업생산',gO6:'소비증감(YoY)',
  gM1:'제조업가동률',gM2_G:'제조업재고율',gM3_G:'신규수주증감',
  gD1:'합계출산율',gD2:'고령화율',gD3:'생산가능인구',gL1:'고용률',gL2:'실업률',gL3:'가계부채',gL4:'가계연체율',
  gR1:'주택가격',gR2:'미분양주택',gR5:'해수면상승(SAR)',gR6:'도시열섬(열적외선)',gG1:'FDI(외국인직접투자)',gG6:'PM2.5(대기질·위성)',
  sysA1n:'통화·자금',sysA1b:'순환계',sysA1m:'금리·환율·외환 = 혈액순환',
  sysA2n:'무역·수출입',sysA2b:'호흡계',sysA2m:'수출·수입·물동량 = 호흡',
  sysA3n:'소비·내수',sysA3b:'소화계',sysA3m:'소매·카드·서비스 = 영양분 흡수',
  sysA4n:'정책·규제',sysA4b:'신경계',sysA4m:'BSI·선행·정부지출 = 두뇌 명령',
  sysA5n:'금융안정',sysA5b:'면역계',sysA5m:'신용·스프레드·연체 = 면역 방어',
  sysA6n:'물가·재정',sysA6b:'내분비계',sysA6m:'CPI·PPI·세수·채무 = 호르몬 균형',
  sysA7n:'생산·산업',sysA7b:'근골격계',sysA7m:'산업생산·PMI·건설 = 근력 활동',
  sysA8n:'제조·재고',sysA8b:'대사계',sysA8m:'가동률·재고율·수주 = 에너지 대사',
  sysA9n:'인구·가계',sysA9b:'생식·재생계',sysA9m:'출산·고령화·부채 = 세대 재생',
  locked:'잠겨있습니다',upgradeHint:'{tier} 이상 구독으로 전체 데이터를 확인하세요',upgradeBtn:'구독하기',
};

// ── i18n 정적 내장 (6개 언어 0ms · API 호출 0 · 로딩 0) ──
const I18N_CACHE={};

// ── EN 내장사전 (API 호출 0) ──
const EN={
  login:'Log in',signup:'Get Started Free',logout:'Log out',dashboard:'Dashboard',mypage:'My Page',admin:'Admin',
  heroSub:'SATELLITE ECONOMIC DIAGNOSTICS',heroTitle1:'Diagnosing',heroTitle2:'the Economy from Space',
  heroDesc:'Satellite data from NASA & ESA detects economic changes',heroFast:'2 months faster',heroDesc2:'than government statistics.',
  heroCta:'Start Free Diagnosis',heroMore:'Learn More ↓',gauges:'Economic Gauges',bodySys:'Body Systems',satCost:'Satellite Cost',languages:'Languages',
  whyTitle:'How is this different from traditional economic analysis?',
  feat1:'Measurement vs Interpretation',feat2:'2 Months Ahead',feat3:'Body Metaphor Diagnosis',feat4:'Dual-Lock Alert',feat5:'Delta Gap Analysis',feat6:'Investment Action Signals',
  featDesc1:"Brokerages 'interpret' statistics. DIAH-7M 'measures' with satellites.",featDesc2:'Satellites detect changes 2 months before government statistics.',
  featDesc3:"Current account deficit → 'Reduced oxygen output in the lungs'. Anyone can understand instantly.",featDesc4:'Alert triggered when both input and output are blocked. The only system that does this.',
  featDesc5:'Satellite index vs market index gap → undervaluation/overheating signals.',featDesc6:'Translates diagnostic results into specific investment actions.',
  howTitle:'From Satellites to Investment Action',step1:'Satellite Observation',step2:'Physical Measurement',step3:'Economic Diagnosis',step4:'Cross-Verification',step5:'Action Signal',
  pricingTitle:'Satellite data is free. Diagnosis is affordable.',pricingSub:'14-day free trial for all paid plans · Cancel anytime',
  free:'Start Free',trial:'14-Day Free Trial',perMonth:'/mo',
  faqTitle:'Frequently Asked Questions',ctaTitle:'Get Started Now',ctaDesc:'500P mileage on signup · 14-day free trial · No credit card required',ctaBtn:'Create Free Account',
  loginTitle:'Log In',email:'Email',password:'Password',forgotPw:'Forgot Password',noAccount:"Don't have an account?",freeSignup:'Sign Up Free',
  hasAccount:'Already have an account?',or:'or',resetTitle:'Reset Password',resetDesc:'Enter your email to receive a reset link.',resetSent:'Email sent!',
  resetBtn:'Send Reset Link',backToLogin:'← Back to Login',createAccount:'Create Account',selectPlan:'Select Plan',agreeTerms:'Agree to Terms',
  name:'Name',quickSignup:'Quick Sign Up',next:'Next',agreeAll:'Agree All',required:'Required',optional:'Optional',
  termsService:'Terms of Service',termsPrivacy:'Privacy Policy',termsMarketing:'Marketing Communications (benefits & events)',
  selectedPlan:'Selected Plan',mileageBonus:'500P mileage awarded on signup!',
  overview:'📊 Overview',gaugeTab:'📋 59 Gauges',satTab:'🛰️ Satellite',alertTab:'🔔 Alerts',
  good:'Good',caution:'Caution',alert:'Alert',keyActions:'🎯 5 Key Actions',verdict:'📋 Summary',
  satTimeline:'🛰️ Satellite Timeline',verification:'⏪ Verification',prediction:'⏩ Prediction',nineSystems:'9 Economic Systems',
  alertCenter:'🔔 Alert Center',dualLock:'Dual-Lock Active',deltaTitle:'📐 Delta Gap Analysis',satIndex:'Satellite Index',marketIndex:'Market Index',
  profile:'Profile',subscription:'Subscription',mileage:'Mileage',settings:'Settings',save:'Save Changes',changePw:'Change Password',
  currentPlan:'Current Plan',changePlan:'Change Plan',cancelSub:'Cancel',balance:'Balance',earned:'Earned This Month',used:'Used This Month',
  exchange:'Exchange Menu',notifications:'Notifications',langSetting:'🌐 Language',deleteAccount:'Delete Account',
  chatGreeting:'Hello! Welcome to DIAH-7M Satellite Economic Diagnostic Service. How can I help?',chatPlaceholder:'Type your question...',chatSend:'Send',
  chatQ1:'What is DIAH-7M?',chatA1:'A satellite economic diagnostic platform analyzing the Korean economy with 59 gauges across 9 systems using NASA & ESA satellite data.',
  chatQ2:'How do I read the scores?',chatA2:'Score 0-100: 🟢 80+ Good, 🟡 60-79 Caution, 🔴 Below 40 Alert.',
  chatQ3:'What are the data sources?',chatA3:'NASA VIIRS, ESA Sentinel, Landsat-9 satellites + Bank of Korea ECOS, KOSIS.',
  chatQ4:'Can it diagnose other countries?',chatA4:'Currently Korea-focused, expanding to OECD 38 + major economies.',
  chatDefault:'For detailed inquiries, please contact contact@diah7m.com!',chatHelper:'Assistant',
  dateLabel:'January 2026 · Republic of Korea',totalScore:'Overall Score',
  stNormal:'Normal',stWatch:'Watch',stTrigger:'Trigger',stSeal:'Seal',stCrisis:'Crisis',
  inputSeal:'Input Seal',outputSeal:'Output Seal',dualLockActive:'Dual-Lock Active',
  negGap:'Negative Gap',mktIndex:'Market Index',
  deltaDesc:'Satellite data shows active economic activity, but market sentiment has not reflected this. Possible undervaluation.',
  verdictText:'Exports ($65.8B) and semiconductors are strong. CPI (2.0%) and rates (2.5%) stable. However, domestic demand is weak; construction (-3.2%) and self-employed delinquency (1.8%↑) show internal cracks.',
  actions:['Semiconductor exports at all-time high → Maintain/increase HBM, equipment, materials stocks','KOSPI breaks 5,300 → Reduce leverage, diversify','KRW/USD stuck at 1,450 → Review export stock benefits','Construction & real estate weak → Reduce sector weight','Self-employed delinquency↑ → Monitor consumer-related stock risk'],
  satVerify:'⏪ Verification',satPredict:'⏩ Prediction',satEarlyDetect:'Satellite Early Detection',
  satStatBefore:'before official stats',satPastVerify:'⏪ Past satellite → Confirmed today',satFutureHint:'⏩ Today\'s satellite → Future implications',
  satEvidence:'Evidence',bodyMetaphor:'🏥 Body Metaphor',satObsInfo:'🛰️ Satellite Observation Info',
  satCol:'Satellite',satProg:'Program',satCycle:'Cycle',satBand:'Band',investSignal:'🎯 Investment Action Signal',
  sigBuy:'Buy',sigAvoid:'Avoid',sigSell:'Sell',blindSpot:'🔭 DIAH-7M Exclusive View',gaugesLabel:'gauges',
  profileSaved:'✅ Profile saved',fillAllFields:'⚠️ Please fill all fields',pwMismatch:'⚠️ New passwords do not match',
  pwChanged:'✅ Password changed',paymentPending:'💳 Available after payment integration',
  confirmCancelSub:'Are you sure you want to cancel?',cancelInfo:'You can use the service until the end of your billing period.',
  cancelFeatures:'Pro features will be deactivated.',confirmCancelBtn:'Confirm Cancel',goBack:'Go Back',
  subCancelled:'✅ Subscription cancellation scheduled',nextBill:'Next Billing',payMethod:'Payment Method',streak:'Streak',
  changePayment:'Change Payment',active:'Active',milInsufficient:'Insufficient mileage',milExchanged:'Exchange complete!',
  notifEnabled:'Enabled',notifDisabled:'Disabled',langChanged:'Language changed',
  confirmDeleteTitle:'⚠️ Delete your account?',confirmDeleteDesc:'All data will be permanently deleted.',
  permDelete:'Permanently Delete',cancel:'Cancel',accountDeleted:'Account deletion requested',
  emailNotif:'Email Notifications',emailNotifDesc:'Monthly reports, alerts',smsNotif:'SMS Notifications',smsNotifDesc:'Urgent alerts only',
  kakaoNotif:'KakaoTalk Notifications',kakaoNotifDesc:'Report releases',slackNotif:'Slack Notifications',slackNotifDesc:'Team alerts (Enterprise)',
  pushNotif:'Push Notifications',pushNotifDesc:'Real-time alerts',curPw:'Current Password',newPw:'New Password',confirmPw:'Confirm New Password',phone:'Phone',
  pwCheck8:'8+ chars',pwCheckAlpha:'Letters',pwCheckNum:'Numbers',pwCheckSpecial:'Special',
  nameRequired:'Please enter your name',emailInvalid:'Please enter a valid email',pwRequired:'Please meet all password requirements',
  pwEnterRequired:'Please enter a password',termsRequired:'Please agree to required terms',
  loggingIn:'Logging in...',sending:'Sending...',creating:'Creating account...',freeCreate:'Create Free Account',
  trialStart:'Start 14-Day Free Trial',trialNote:'Billing starts after 14-day trial · Cancel anytime',connecting:'Connecting...',satPlatform:'Satellite Economic Diagnostic Platform',
  verdictTitle:'📋 Summary',gaugeDetail:'59 Gauge Detailed Diagnosis',
  gaugeDetailSub:'January 2026 · 9 Axes · Real Data · Satellite Cross-Verification',
  satStatus:'🛰️ Satellite Observation Status',freqDaily:'Daily',freq12d:'12 days',freq16d:'16 days',
  planFreeDesc:'Basic diagnostic trial',planBasicDesc:'Core gauge access',planProDesc:'59 gauges + satellite cross-verification',planEntDesc:'Enterprise & team',
  planFreeFeat:['Monthly summary (1x)','9-axis scores','Email alerts','500P on signup'],
  planBasicFeat:['Full monthly report','20 key gauges','Satellite summary','Basic AI chatbot','100P/month'],
  planProFeat:['Weekly + monthly reports','All 59 gauges','Satellite cross-verification','Unlimited AI chatbot','Action signals','Data export','200P/month (2x)'],
  planEntFeat:['All Pro features +','API access','Custom reports','Dedicated manager','Team (5 seats)','30 languages','300P/month (3x)'],
  milBasic:'100P/month',milPro:'200P/month (2x)',milEnt:'300P/month (3x)',
  exReport:'1 Additional Report',exHistory:'1 Month Historical Data',exApi:'100 Extra API Calls',exExport:'1 Data Export',exDiscount:'1% Payment Discount',
  faq1q:'What is DIAH-7M?',faq1a:'The world\'s first satellite economic diagnostic platform analyzing the Korean economy with 59 gauges across 9 systems using NASA & ESA satellite data.',
  faq2q:'How is it different from brokerage reports?',faq2a:'Traditional reports interpret statistics. DIAH-7M measures with satellites — factory heat, port lights, atmospheric emissions.',
  faq3q:'Does satellite data cost money?',faq3a:'No. NASA VIIRS, ESA Copernicus Sentinel, and Landsat-9 are all free public data.',
  faq4q:'Why the body metaphor?',faq4a:"'Current account deficit' → 'reversed nutrient absorption in the intestines'. Non-experts can instantly grasp severity.",
  faq5q:'What can I do with the free plan?',faq5a:'Monthly 9-axis score and summary. Detailed 59 gauges require Basic plan or above.',
  faq6q:'What is the refund policy?',faq6a:'Cancel within the 14-day trial at no cost. After that, prorated refunds.',
  sysA1n:'Monetary & Capital',sysA1b:'Circulatory',sysA1m:'Interest rates · FX · Reserves = Blood circulation',
  sysA2n:'Trade & Exports',sysA2b:'Respiratory',sysA2m:'Exports · Imports · Cargo = Breathing',
  sysA3n:'Consumption & Domestic',sysA3b:'Digestive',sysA3m:'Retail · Cards · Investment = Digestion',
  sysA4n:'Sentiment & Policy',sysA4b:'Nervous',sysA4m:'BSI · Leading index · Gov spending = Brain & Nerves',
  sysA5n:'Financial Stability',sysA5b:'Immune',sysA5m:'KOSPI · Spreads · Delinquency = Immunity',
  sysA6n:'Prices & Fiscal',sysA6b:'Endocrine',sysA6m:'CPI · PPI · National debt = Hormones',
  sysA7n:'Industry & Production',sysA7b:'Musculoskeletal',sysA7m:'Industrial production · PMI · Utilization = Bones & Muscles',
  sysA8n:'Population · Jobs · Household',sysA8b:'Cellular',sysA8m:'Birth rate · Employment · Household debt = Cells',
  sysA9n:'Real Estate · External',sysA9b:'Skin',sysA9m:'Housing · Unsold · FDI = Skin & Regeneration',
  adminTitle:'Admin Panel',admKpi:'KPI',admMembers:'Members',admEngine:'Engine',admRevenue:'Revenue',admSettings:'Settings',
  admTotalMembers:'Total Members',admMonthlyRev:'Monthly Revenue',admActiveSubs:'Active Subs',admMileageTotal:'Mileage',
  admGradeDist:'Grade Distribution',admRecentSignup:'Recent Signups',admSearchPlaceholder:'Search name or email...',
  admAllGrade:'All Grades',admAllStatus:'All Status',admSuspended:'Suspended',
  admNameCol:'Name',admEmailCol:'Email',admGradeCol:'Grade',admStatusCol:'Status',admJoinDate:'Join Date',
  admShowing:'shown',admTotal:'Total',admDataCollection:'Data Collection',admSatLink:'Satellite Link',admApiResp:'API Response',
  admAllCollected:'All collected',admNasaEsa:'NASA+ESA Normal',admSatDataStatus:'Satellite Data Status',
  change:'Change',curPlan:'Current Plan',spent:'Used This Month',exchangeMenu:'Exchange Menu',notifSettings:'Notification Settings',
gI1:'Base Rate',gI2:'Current Account',gI3:'FX Reserves',gI4:'USD/KRW Rate',gI5:'M2 Growth',gI6:'Gov Bond 3Y',
gE1:'Exports',gE2:'Imports',gE3:'Trade Balance',gE4:'Container Volume',gE5:'Oil Price (Dubai)',gE6:'Export Growth',
gC1:'Retail Sales',gC2:'Consumer Sentiment',gC3:'Card Spending',gC4:'Facility Investment',gC5:'Private Consumption',gC6:'Service Production',
gS1:'BSI (Business)',gS2:'Night Lights (Sat)',gS3:'Leading Index',gS4:'Gov Spending',gS5:'Policy Uncertainty',gS6:'Coincident Index',
gF1:'Credit Spread',gF2:'CD-Bond Spread',gF3:'KOSPI',gF4:'V-KOSPI (Vol)',gF5:'Delinquency Rate',gF6:'Corp Bond Spread',gF7:'KOSDAQ',
gP1:'CPI',gP2:'PPI',gP3:'Tax Revenue',gP4:'Debt/GDP Ratio',gP5:'Fiscal Balance',gP6:'Core CPI',
gO1:'Industrial Prod.',gO2:'PMI (Mfg)',gO3:'Construction',gO4:'Mfg Production',gO5:'Service Prod.',gO6:'Consumption YoY',
gM1:'Capacity Util.',gM2_G:'Inventory Ratio',gM3_G:'New Orders',
gD1:'Fertility Rate',gD2:'Aging Rate',gD3:'Working Pop.',gL1:'Employment Rate',gL2:'Unemployment',gL3:'Household Debt',gL4:'HH Delinquency',
gR1:'Housing Price',gR2:'Unsold Housing',gR5:'Sea Level (SAR)',gR6:'Urban Heat (IR)',gG1:'FDI',gG6:'PM2.5 (Satellite)',
locked:'Locked',upgradeHint:'Upgrade to {tier}+ to unlock all data',upgradeBtn:'Subscribe',
};
I18N_CACHE['en']=EN;

// ── JA 内蔵辞書 ──
const JA={
login:'ログイン',signup:'無料で始める',logout:'ログアウト',dashboard:'ダッシュボード',mypage:'マイページ',admin:'管理者',
heroSub:'衛星経済診断',heroTitle1:'宇宙から',heroTitle2:'経済を診断する',
heroDesc:'NASA・ESAの衛星データが経済変動を',heroFast:'2ヶ月早く',heroDesc2:'政府統計より先に検知します。',
heroCta:'無料診断を開始',heroMore:'詳しく見る ↓',gauges:'経済ゲージ',bodySys:'人体システム',satCost:'衛星コスト',languages:'対応言語',
whyTitle:'従来の経済分析と何が違うのか？',
feat1:'解釈ではなく測定',feat2:'2ヶ月先行',feat3:'人体メタファー診断',feat4:'デュアルロック警報',feat5:'デルタギャップ分析',feat6:'投資アクションシグナル',
featDesc1:'証券会社は統計を「解釈」。DIAH-7Mは衛星で「測定」。',featDesc2:'衛星は政府統計より2ヶ月早く変化を検知。',
featDesc3:'経常赤字→「肺の酸素出力低下」。誰でも即座に理解。',featDesc4:'入力と出力が同時に遮断された時に警報発動。唯一のシステム。',
featDesc5:'衛星指数vs市場指数のギャップ→割安/過熱シグナル。',featDesc6:'診断結果を具体的な投資行動に変換。',
howTitle:'衛星から投資行動へ',step1:'衛星観測',step2:'物理測定',step3:'経済診断',step4:'交差検証',step5:'アクションシグナル',
pricingTitle:'衛星データは無料。診断は手頃な価格。',pricingSub:'全有料プラン14日間無料体験・いつでもキャンセル可',
free:'無料で始める',trial:'14日間無料体験',perMonth:'/月',
faqTitle:'よくある質問',ctaTitle:'今すぐ始めよう',ctaDesc:'登録時500Pマイレージ・14日無料・クレジットカード不要',ctaBtn:'無料アカウント作成',
loginTitle:'ログイン',email:'メール',password:'パスワード',forgotPw:'パスワードを忘れた',noAccount:'アカウントをお持ちでない方',freeSignup:'無料登録',
hasAccount:'既にアカウントをお持ちの方',or:'または',resetTitle:'パスワードリセット',resetDesc:'リセットリンクを送信するメールアドレスを入力。',resetSent:'メール送信完了！',
resetBtn:'リセットリンク送信',backToLogin:'← ログインに戻る',createAccount:'アカウント作成',selectPlan:'プラン選択',agreeTerms:'利用規約に同意',
name:'名前',quickSignup:'簡単登録',next:'次へ',agreeAll:'全て同意',required:'必須',optional:'任意',
termsService:'利用規約',termsPrivacy:'プライバシーポリシー',termsMarketing:'マーケティング通知',
selectedPlan:'選択プラン',mileageBonus:'登録時500Pマイレージ付与！',
overview:'📊 概要',gaugeTab:'📋 59ゲージ',satTab:'🛰️ 衛星',alertTab:'🔔 アラート',
good:'良好',caution:'注意',alert:'警報',keyActions:'🎯 重要アクション5選',verdict:'📋 総合判定',
satTimeline:'🛰️ 衛星タイムライン',verification:'⏪ 検証',prediction:'⏩ 予測',nineSystems:'9つの経済システム',
alertCenter:'🔔 アラートセンター',dualLock:'デュアルロック発動',deltaTitle:'📐 デルタギャップ分析',satIndex:'衛星指数',marketIndex:'市場指数',
profile:'プロフィール',subscription:'サブスクリプション',mileage:'マイレージ',settings:'設定',save:'変更を保存',changePw:'パスワード変更',
currentPlan:'現在のプラン',changePlan:'プラン変更',cancelSub:'キャンセル',balance:'残高',earned:'今月獲得',used:'今月使用',
exchange:'交換メニュー',notifications:'通知',langSetting:'🌐 言語',deleteAccount:'アカウント削除',
chatGreeting:'こんにちは！DIAH-7M衛星経済診断サービスへようこそ。',chatPlaceholder:'質問を入力...',chatSend:'送信',
chatQ1:'DIAH-7Mとは？',chatA1:'NASA・ESA衛星データで韓国経済を9システム59ゲージで診断するプラットフォーム。',
chatQ2:'スコアの読み方は？',chatA2:'0-100：🟢80+良好、🟡60-79注意、🔴40未満警報。',
chatQ3:'データソースは？',chatA3:'NASA VIIRS、ESA Sentinel、Landsat-9衛星＋韓国銀行ECOS、KOSIS。',
chatQ4:'他国の診断は可能？',chatA4:'現在は韓国中心。OECD38カ国＋主要経済国に拡大予定。',
chatDefault:'詳細はcontact@diah7m.comまでお問い合わせください！',chatHelper:'アシスタント',
dateLabel:'2026年1月・大韓民国',totalScore:'総合スコア',
stNormal:'正常',stWatch:'監視',stTrigger:'警戒',stSeal:'封鎖',stCrisis:'危機',
inputSeal:'入力封鎖',outputSeal:'出力封鎖',dualLockActive:'デュアルロック発動中',
negGap:'マイナスギャップ',mktIndex:'市場指数',
deltaDesc:'衛星データは活発な経済活動を示すが、市場心理に未反映。割安の可能性。',
verdictText:'輸出($658億)と半導体が堅調。CPI(2.0%)と金利(2.5%)安定。ただし内需弱く、建設(-3.2%)と自営業延滞率(1.8%↑)に亀裂。',
actions:['半導体輸出過去最高→HBM・装備・素材株維持/追加','KOSPI5,300突破→レバレッジ縮小・分散','ウォン/ドル1,450固着→輸出株メリット確認','建設・不動産弱→セクター比重縮小','自営業延滞率↑→消費関連株リスク監視'],
satVerify:'⏪ 検証',satPredict:'⏩ 予測',satEarlyDetect:'衛星早期検知',
satStatBefore:'公式統計より先に',satPastVerify:'⏪ 過去の衛星→今日確認済み',satFutureHint:'⏩ 今日の衛星→将来の示唆',
satEvidence:'証拠',bodyMetaphor:'🏥 人体メタファー',satObsInfo:'🛰️ 衛星観測情報',
satCol:'衛星',satProg:'プログラム',satCycle:'周期',satBand:'バンド',investSignal:'🎯 投資アクションシグナル',
sigBuy:'買い',sigAvoid:'回避',sigSell:'売り',blindSpot:'🔭 DIAH-7M独自の視点',gaugesLabel:'ゲージ',
profileSaved:'✅ 保存完了',fillAllFields:'⚠️ 全項目を入力してください',pwMismatch:'⚠️ パスワードが一致しません',
pwChanged:'✅ パスワード変更完了',paymentPending:'💳 決済連携後に利用可能',
confirmCancelSub:'本当にキャンセルしますか？',cancelInfo:'請求期間終了まで利用可能。',
cancelFeatures:'Pro機能が無効化されます。',confirmCancelBtn:'キャンセル確定',goBack:'戻る',
subCancelled:'✅ キャンセル予約済み',nextBill:'次回請求',payMethod:'決済方法',streak:'連続利用',
changePayment:'決済方法変更',active:'有効',milInsufficient:'マイレージ不足',milExchanged:'交換完了！',
notifEnabled:'有効',notifDisabled:'無効',langChanged:'言語が変更されました',
confirmDeleteTitle:'⚠️ アカウントを削除しますか？',confirmDeleteDesc:'全データが完全に削除されます。',
permDelete:'完全削除',cancel:'キャンセル',accountDeleted:'削除リクエスト済み',
emailNotif:'メール通知',emailNotifDesc:'月次レポート・アラート',smsNotif:'SMS通知',smsNotifDesc:'緊急アラートのみ',
kakaoNotif:'KakaoTalk通知',kakaoNotifDesc:'レポート配信',slackNotif:'Slack通知',slackNotifDesc:'チームアラート',
pushNotif:'プッシュ通知',pushNotifDesc:'リアルタイムアラート',curPw:'現在のパスワード',newPw:'新しいパスワード',confirmPw:'パスワード確認',phone:'電話番号',
pwCheck8:'8文字以上',pwCheckAlpha:'英字',pwCheckNum:'数字',pwCheckSpecial:'特殊文字',
nameRequired:'名前を入力してください',emailInvalid:'有効なメールアドレスを入力',pwRequired:'全てのパスワード要件を満たしてください',
pwEnterRequired:'パスワードを入力してください',termsRequired:'必須項目に同意してください',
loggingIn:'ログイン中...',sending:'送信中...',creating:'作成中...',freeCreate:'無料アカウント作成',
trialStart:'14日間無料体験開始',trialNote:'14日後に課金開始・いつでもキャンセル可',connecting:'接続中...',satPlatform:'衛星経済診断プラットフォーム',
verdictTitle:'📋 総合判定',gaugeDetail:'59ゲージ詳細診断',
gaugeDetailSub:'2026年1月・9軸・実データ・衛星交差検証',
satStatus:'🛰️ 衛星観測状況',freqDaily:'毎日',freq12d:'12日',freq16d:'16日',
planFreeDesc:'基本診断体験',planBasicDesc:'主要ゲージアクセス',planProDesc:'59ゲージ＋衛星交差検証',planEntDesc:'企業・チーム向け',
planFreeFeat:['月次サマリー(1回)','9軸スコア','メールアラート','登録時500P'],
planBasicFeat:['月次フルレポート','主要20ゲージ','衛星サマリー','基本AIチャット','月100P'],
planProFeat:['週次＋月次レポート','全59ゲージ','衛星交差検証','無制限AIチャット','アクションシグナル','データエクスポート','月200P(2倍)'],
planEntFeat:['Pro全機能＋','APIアクセス','カスタムレポート','専任マネージャー','チーム5名','30言語','月300P(3倍)'],
milBasic:'月100P',milPro:'月200P(2倍)',milEnt:'月300P(3倍)',
exReport:'追加レポート1回',exHistory:'過去データ1ヶ月',exApi:'API追加100回',exExport:'データエクスポート1回',exDiscount:'決済割引1%',
faq1q:'DIAH-7Mとは？',faq1a:'NASA・ESA衛星データで韓国経済を59ゲージ9システムで診断する世界初のプラットフォーム。',
faq2q:'証券会社レポートとの違いは？',faq2a:'従来は統計を解釈。DIAH-7Mは衛星で測定—工場の熱、港の光、大気排出。',
faq3q:'衛星データは有料？',faq3a:'無料。NASA VIIRS、ESA Copernicus、Landsat-9は全て無料公開データ。',
faq4q:'なぜ人体メタファー？',faq4a:'「経常赤字」→「腸の栄養吸収逆転」。専門家でなくても即座に深刻度を把握。',
faq5q:'無料プランで何ができる？',faq5a:'月次9軸スコアとサマリー。59ゲージはBasicプラン以上。',
faq6q:'返金ポリシーは？',faq6a:'14日無料体験中は無料でキャンセル。以降は日割り返金。',
sysA1n:'通貨・資金',sysA1b:'循環器系',sysA1m:'金利・為替・外貨準備＝血液循環',
sysA2n:'貿易・輸出入',sysA2b:'呼吸器系',sysA2m:'輸出・輸入・物流＝呼吸',
sysA3n:'消費・内需',sysA3b:'消化器系',sysA3m:'小売・カード・投資＝消化吸収',
sysA4n:'心理・政策',sysA4b:'神経系',sysA4m:'BSI・先行指数・政府支出＝脳と神経',
sysA5n:'金融安定',sysA5b:'免疫系',sysA5m:'KOSPI・スプレッド・延滞＝免疫',
sysA6n:'物価・財政',sysA6b:'内分泌系',sysA6m:'CPI・PPI・国家債務＝ホルモン',
sysA7n:'産業・生産',sysA7b:'筋骨格系',sysA7m:'鉱工業生産・PMI・稼働率＝骨と筋肉',
sysA8n:'人口・雇用・家計',sysA8b:'細胞系',sysA8m:'出生率・雇用・家計負債＝細胞',
sysA9n:'不動産・対外・環境',sysA9b:'皮膚系',sysA9m:'住宅価格・未分譲・FDI＝皮膚と再生',
adminTitle:'管理パネル',admKpi:'KPI',admMembers:'会員',admEngine:'エンジン',admRevenue:'収益',admSettings:'設定',
admTotalMembers:'総会員数',admMonthlyRev:'月間収益',admActiveSubs:'有効サブスク',admMileageTotal:'マイレージ',
admGradeDist:'等級分布',admRecentSignup:'最近の登録',admSearchPlaceholder:'名前またはメールで検索...',
admAllGrade:'全等級',admAllStatus:'全ステータス',admSuspended:'停止',
admNameCol:'名前',admEmailCol:'メール',admGradeCol:'等級',admStatusCol:'ステータス',admJoinDate:'登録日',
admShowing:'表示',admTotal:'合計',admDataCollection:'データ収集',admSatLink:'衛星リンク',admApiResp:'APIレスポンス',
admAllCollected:'全収集完了',admNasaEsa:'NASA+ESA正常',admSatDataStatus:'衛星データ状況',
change:'変更',curPlan:'現在のプラン',spent:'今月使用',exchangeMenu:'交換メニュー',notifSettings:'通知設定',
gI1:'基準金利',gI2:'経常収支',gI3:'外貨準備高',gI4:'為替(ウォン/ドル)',gI5:'M2増加率',gI6:'国債金利(3Y)',
gE1:'輸出',gE2:'輸入',gE3:'貿易収支',gE4:'コンテナ物量',gE5:'原油価格(ドバイ)',gE6:'輸出増加率',
gC1:'小売販売',gC2:'消費者心理',gC3:'カード売上',gC4:'設備投資',gC5:'民間消費',gC6:'サービス業生産',
gS1:'BSI(企業景気)',gS2:'夜間光量(衛星)',gS3:'景気先行指数',gS4:'政府支出',gS5:'政策不確実性',gS6:'景気一致指数',
gF1:'信用スプレッド',gF2:'CD-国債スプレッド',gF3:'KOSPI',gF4:'V-KOSPI(変動性)',gF5:'延滞率(金融)',gF6:'社債スプレッド',gF7:'KOSDAQ',
gP1:'CPI(消費者物価)',gP2:'PPI(生産者物価)',gP3:'国税収入',gP4:'国家債務比率',gP5:'財政収支',gP6:'コア物価',
gO1:'産業生産',gO2:'PMI(製造業)',gO3:'建設実績',gO4:'製造業生産',gO5:'サービス業生産',gO6:'消費増減(YoY)',
gM1:'製造業稼働率',gM2_G:'製造業在庫率',gM3_G:'新規受注増減',
gD1:'合計出生率',gD2:'高齢化率',gD3:'生産年齢人口',gL1:'雇用率',gL2:'失業率',gL3:'家計負債',gL4:'家計延滞率',
gR1:'住宅価格',gR2:'未分譲住宅',gR5:'海面上昇(SAR)',gR6:'都市熱島(熱IR)',gG1:'FDI(外国人直接投資)',gG6:'PM2.5(衛星)',
};
I18N_CACHE['ja']=JA;

// ── ZH 内置词典 ──
const ZH={
login:'登录',signup:'免费开始',logout:'退出',dashboard:'仪表盘',mypage:'我的页面',admin:'管理员',
heroSub:'卫星经济诊断',heroTitle1:'从太空',heroTitle2:'诊断经济',
heroDesc:'NASA和ESA的卫星数据检测经济变化',heroFast:'提前2个月',heroDesc2:'比政府统计更早。',
heroCta:'开始免费诊断',heroMore:'了解更多 ↓',gauges:'经济仪表',bodySys:'人体系统',satCost:'卫星成本',languages:'支持语言',
whyTitle:'与传统经济分析有何不同？',
feat1:'测量而非解读',feat2:'提前2个月',feat3:'人体隐喻诊断',feat4:'双重封锁警报',feat5:'Delta差距分析',feat6:'投资行动信号',
featDesc1:'券商"解读"统计数据。DIAH-7M用卫星"测量"。',featDesc2:'卫星比政府统计提前2个月检测变化。',
featDesc3:'经常账户赤字→"肺部氧气输出减少"。任何人都能立即理解。',featDesc4:'当输入和输出同时被阻断时触发警报。唯一的系统。',
featDesc5:'卫星指数vs市场指数差距→低估/过热信号。',featDesc6:'将诊断结果转化为具体投资行动。',
howTitle:'从卫星到投资行动',step1:'卫星观测',step2:'物理测量',step3:'经济诊断',step4:'交叉验证',step5:'行动信号',
pricingTitle:'卫星数据免费。诊断价格实惠。',pricingSub:'所有付费计划14天免费试用·随时取消',
free:'免费开始',trial:'14天免费试用',perMonth:'/月',
faqTitle:'常见问题',ctaTitle:'立即开始',ctaDesc:'注册送500P·14天免费·无需信用卡',ctaBtn:'创建免费账户',
loginTitle:'登录',email:'邮箱',password:'密码',forgotPw:'忘记密码',noAccount:'还没有账户？',freeSignup:'免费注册',
hasAccount:'已有账户？',or:'或',resetTitle:'重置密码',resetDesc:'输入邮箱接收重置链接。',resetSent:'邮件已发送！',
resetBtn:'发送重置链接',backToLogin:'← 返回登录',createAccount:'创建账户',selectPlan:'选择计划',agreeTerms:'同意条款',
name:'姓名',quickSignup:'快速注册',next:'下一步',agreeAll:'全部同意',required:'必填',optional:'选填',
termsService:'服务条款',termsPrivacy:'隐私政策',termsMarketing:'营销通知',
selectedPlan:'已选计划',mileageBonus:'注册即送500P！',
overview:'📊 概览',gaugeTab:'📋 59项仪表',satTab:'🛰️ 卫星',alertTab:'🔔 警报',
good:'良好',caution:'注意',alert:'警报',keyActions:'🎯 5大关键行动',verdict:'📋 综合判断',
satTimeline:'🛰️ 卫星时间线',verification:'⏪ 验证',prediction:'⏩ 预测',nineSystems:'9大经济系统',
alertCenter:'🔔 警报中心',dualLock:'双重封锁激活',deltaTitle:'📐 Delta差距分析',satIndex:'卫星指数',marketIndex:'市场指数',
profile:'个人资料',subscription:'订阅',mileage:'积分',settings:'设置',save:'保存更改',changePw:'修改密码',
currentPlan:'当前计划',changePlan:'更换计划',cancelSub:'取消',balance:'余额',earned:'本月获得',used:'本月使用',
exchange:'兑换菜单',notifications:'通知',langSetting:'🌐 语言',deleteAccount:'删除账户',
chatGreeting:'您好！欢迎使用DIAH-7M卫星经济诊断服务。',chatPlaceholder:'输入问题...',chatSend:'发送',
chatQ1:'什么是DIAH-7M？',chatA1:'使用NASA和ESA卫星数据，通过9大系统59项仪表诊断韩国经济的平台。',
chatQ2:'如何解读分数？',chatA2:'0-100：🟢80+良好，🟡60-79注意，🔴40以下警报。',
chatQ3:'数据来源？',chatA3:'NASA VIIRS、ESA Sentinel、Landsat-9卫星+韩国银行ECOS、KOSIS。',
chatQ4:'能诊断其他国家吗？',chatA4:'目前以韩国为主，计划扩展至OECD 38国+主要经济体。',
chatDefault:'详细咨询请联系contact@diah7m.com！',chatHelper:'助手',
dateLabel:'2026年1月·大韩民国',totalScore:'综合评分',
stNormal:'正常',stWatch:'监视',stTrigger:'警戒',stSeal:'封锁',stCrisis:'危机',
inputSeal:'输入封锁',outputSeal:'输出封锁',dualLockActive:'双重封锁激活中',
negGap:'负差距',mktIndex:'市场指数',
deltaDesc:'卫星数据显示经济活动活跃，但市场情绪尚未反映。可能被低估。',
verdictText:'出口(658亿$)和半导体强劲。CPI(2.0%)和利率(2.5%)稳定。但内需疲软，建设(-3.2%)和自营业逾期率(1.8%↑)显示裂痕。',
actions:['半导体出口创新高→维持/增持HBM、设备、材料股','KOSPI突破5,300→降低杠杆、分散投资','韩元/美元1,450固化→确认出口股利好','建设和房地产疲软→降低板块权重','自营业逾期率↑→监控消费相关股风险'],
satVerify:'⏪ 验证',satPredict:'⏩ 预测',satEarlyDetect:'卫星早期检测',
satStatBefore:'先于官方统计',satPastVerify:'⏪ 过去卫星→今日已确认',satFutureHint:'⏩ 今日卫星→未来暗示',
satEvidence:'证据',bodyMetaphor:'🏥 人体隐喻',satObsInfo:'🛰️ 卫星观测信息',
satCol:'卫星',satProg:'项目',satCycle:'周期',satBand:'波段',investSignal:'🎯 投资行动信号',
sigBuy:'买入',sigAvoid:'回避',sigSell:'卖出',blindSpot:'🔭 DIAH-7M独家视角',gaugesLabel:'仪表',
profileSaved:'✅ 已保存',fillAllFields:'⚠️ 请填写所有字段',pwMismatch:'⚠️ 密码不匹配',
pwChanged:'✅ 密码已更改',paymentPending:'💳 支付对接后可用',
confirmCancelSub:'确定要取消吗？',cancelInfo:'可使用至当前计费周期结束。',
cancelFeatures:'Pro功能将被停用。',confirmCancelBtn:'确认取消',goBack:'返回',
subCancelled:'✅ 取消已预约',nextBill:'下次计费',payMethod:'支付方式',streak:'连续使用',
changePayment:'更改支付方式',active:'活跃',milInsufficient:'积分不足',milExchanged:'兑换完成！',
notifEnabled:'已启用',notifDisabled:'已禁用',langChanged:'语言已更改',
confirmDeleteTitle:'⚠️ 删除账户？',confirmDeleteDesc:'所有数据将永久删除。',
permDelete:'永久删除',cancel:'取消',accountDeleted:'删除已请求',
emailNotif:'邮件通知',emailNotifDesc:'月度报告、警报',smsNotif:'短信通知',smsNotifDesc:'仅紧急警报',
kakaoNotif:'KakaoTalk通知',kakaoNotifDesc:'报告发布',slackNotif:'Slack通知',slackNotifDesc:'团队警报',
pushNotif:'推送通知',pushNotifDesc:'实时警报',curPw:'当前密码',newPw:'新密码',confirmPw:'确认密码',phone:'电话',
pwCheck8:'8位以上',pwCheckAlpha:'字母',pwCheckNum:'数字',pwCheckSpecial:'特殊字符',
nameRequired:'请输入姓名',emailInvalid:'请输入有效邮箱',pwRequired:'请满足所有密码要求',
pwEnterRequired:'请输入密码',termsRequired:'请同意必要条款',
loggingIn:'登录中...',sending:'发送中...',creating:'创建中...',freeCreate:'创建免费账户',
trialStart:'开始14天免费试用',trialNote:'14天后开始计费·随时取消',connecting:'连接中...',satPlatform:'卫星经济诊断平台',
verdictTitle:'📋 综合判断',gaugeDetail:'59项仪表详细诊断',
gaugeDetailSub:'2026年1月·9轴·实际数据·卫星交叉验证',
satStatus:'🛰️ 卫星观测状态',freqDaily:'每日',freq12d:'12天',freq16d:'16天',
planFreeDesc:'基础诊断体验',planBasicDesc:'核心仪表访问',planProDesc:'59仪表+卫星交叉验证',planEntDesc:'企业和团队',
planFreeFeat:['月度摘要(1次)','9轴评分','邮件警报','注册送500P'],
planBasicFeat:['完整月度报告','20个关键仪表','卫星摘要','基础AI聊天','月100P'],
planProFeat:['周报+月报','全部59仪表','卫星交叉验证','无限AI聊天','行动信号','数据导出','月200P(2倍)'],
planEntFeat:['Pro全部功能+','API访问','定制报告','专属经理','团队5人','30种语言','月300P(3倍)'],
milBasic:'月100P',milPro:'月200P(2倍)',milEnt:'月300P(3倍)',
exReport:'额外报告1份',exHistory:'历史数据1个月',exApi:'额外API100次',exExport:'数据导出1次',exDiscount:'支付折扣1%',
faq1q:'什么是DIAH-7M？',faq1a:'全球首个使用NASA和ESA卫星数据，通过9大系统59项仪表诊断韩国经济的平台。',
faq2q:'与券商报告有何不同？',faq2a:'传统报告解读统计。DIAH-7M用卫星测量——工厂热量、港口灯光、大气排放。',
faq3q:'卫星数据收费吗？',faq3a:'免费。NASA VIIRS、ESA Copernicus、Landsat-9均为免费公开数据。',
faq4q:'为什么用人体隐喻？',faq4a:'"经常账户赤字"→"肠道营养吸收逆转"。非专业人士也能理解严重程度。',
faq5q:'免费计划能做什么？',faq5a:'月度9轴评分和摘要。59仪表需Basic计划以上。',
faq6q:'退款政策？',faq6a:'14天试用期内免费取消。之后按比例退款。',
sysA1n:'货币与资金',sysA1b:'循环系统',sysA1m:'利率·汇率·外储=血液循环',
sysA2n:'贸易与进出口',sysA2b:'呼吸系统',sysA2m:'出口·进口·物流=呼吸',
sysA3n:'消费与内需',sysA3b:'消化系统',sysA3m:'零售·信用卡·投资=消化吸收',
sysA4n:'情绪与政策',sysA4b:'神经系统',sysA4m:'BSI·先行指数·政府支出=大脑与神经',
sysA5n:'金融稳定',sysA5b:'免疫系统',sysA5m:'KOSPI·利差·逾期=免疫防御',
sysA6n:'物价与财政',sysA6b:'内分泌系统',sysA6m:'CPI·PPI·国债=荷尔蒙平衡',
sysA7n:'产业与生产',sysA7b:'骨骼肌肉系统',sysA7m:'工业生产·PMI·开工率=骨骼与肌肉',
sysA8n:'人口·就业·家庭',sysA8b:'细胞系统',sysA8m:'出生率·就业·家庭负债=细胞',
sysA9n:'房地产·对外·环境',sysA9b:'皮肤系统',sysA9m:'房价·滞销·FDI=皮肤与再生',
adminTitle:'管理面板',admKpi:'KPI',admMembers:'会员',admEngine:'引擎',admRevenue:'收入',admSettings:'设置',
admTotalMembers:'总会员',admMonthlyRev:'月收入',admActiveSubs:'活跃订阅',admMileageTotal:'积分',
admGradeDist:'等级分布',admRecentSignup:'最近注册',admSearchPlaceholder:'搜索姓名或邮箱...',
admAllGrade:'全部等级',admAllStatus:'全部状态',admSuspended:'已暂停',
admNameCol:'姓名',admEmailCol:'邮箱',admGradeCol:'等级',admStatusCol:'状态',admJoinDate:'注册日期',
admShowing:'显示',admTotal:'共计',admDataCollection:'数据采集',admSatLink:'卫星链接',admApiResp:'API响应',
admAllCollected:'全部采集完成',admNasaEsa:'NASA+ESA正常',admSatDataStatus:'卫星数据状态',
change:'更改',curPlan:'当前计划',spent:'本月使用',exchangeMenu:'兑换菜单',notifSettings:'通知设置',
gI1:'基准利率',gI2:'经常账户',gI3:'外汇储备',gI4:'汇率(韩元/美元)',gI5:'M2增速',gI6:'国债利率(3Y)',
gE1:'出口',gE2:'进口',gE3:'贸易收支',gE4:'集装箱物量',gE5:'油价(迪拜)',gE6:'出口增速',
gC1:'零售销售',gC2:'消费者信心',gC3:'信用卡消费',gC4:'设备投资',gC5:'民间消费',gC6:'服务业产值',
gS1:'BSI(企业景气)',gS2:'夜间光量(卫星)',gS3:'先行指数',gS4:'政府支出',gS5:'政策不确定性',gS6:'同步指数',
gF1:'信用利差',gF2:'CD-国债利差',gF3:'KOSPI',gF4:'V-KOSPI(波动率)',gF5:'逾期率(金融)',gF6:'公司债利差',gF7:'KOSDAQ',
gP1:'CPI(消费者物价)',gP2:'PPI(生产者物价)',gP3:'税收收入',gP4:'国债/GDP比',gP5:'财政收支',gP6:'核心CPI',
gO1:'工业产值',gO2:'PMI(制造业)',gO3:'建筑产值',gO4:'制造业产值',gO5:'服务业产值',gO6:'消费增减(YoY)',
gM1:'制造业开工率',gM2_G:'制造业库存率',gM3_G:'新增订单',
gD1:'生育率',gD2:'老龄化率',gD3:'劳动年龄人口',gL1:'就业率',gL2:'失业率',gL3:'家庭负债',gL4:'家庭逾期率',
gR1:'房价',gR2:'滞销房屋',gR5:'海平面上升(SAR)',gR6:'城市热岛(热IR)',gG1:'FDI(外商直投)',gG6:'PM2.5(卫星)',
};
I18N_CACHE['zh']=ZH;

// ── ES diccionario ──
const ES={
login:'Iniciar sesión',signup:'Comenzar gratis',logout:'Cerrar sesión',dashboard:'Panel',mypage:'Mi página',admin:'Admin',
heroSub:'DIAGNÓSTICO ECONÓMICO SATELITAL',heroTitle1:'Diagnosticando',heroTitle2:'la economía desde el espacio',
heroDesc:'Datos satelitales de NASA y ESA detectan cambios económicos',heroFast:'2 meses antes',heroDesc2:'que las estadísticas oficiales.',
heroCta:'Diagnóstico gratuito',heroMore:'Saber más ↓',gauges:'Indicadores',bodySys:'Sistemas corporales',satCost:'Coste satelital',languages:'Idiomas',
whyTitle:'¿En qué se diferencia del análisis tradicional?',
feat1:'Medición vs interpretación',feat2:'2 meses de ventaja',feat3:'Metáfora corporal',feat4:'Alerta de doble bloqueo',feat5:'Análisis Delta Gap',feat6:'Señales de inversión',
featDesc1:'Las corredurías "interpretan". DIAH-7M "mide" con satélites.',featDesc2:'Los satélites detectan cambios 2 meses antes.',
featDesc3:'Déficit por cuenta corriente → "Reducción del oxígeno pulmonar". Comprensión instantánea.',featDesc4:'Alerta cuando entrada y salida están bloqueadas. Sistema único.',
featDesc5:'Índice satelital vs mercado → señales de infravaloración/sobrecalentamiento.',featDesc6:'Traduce diagnósticos en acciones de inversión concretas.',
howTitle:'Del satélite a la inversión',step1:'Observación satelital',step2:'Medición física',step3:'Diagnóstico económico',step4:'Verificación cruzada',step5:'Señal de acción',
pricingTitle:'Datos satelitales gratuitos. Diagnóstico asequible.',pricingSub:'14 días gratis en todos los planes · Cancela cuando quieras',
free:'Comenzar gratis',trial:'14 días gratis',perMonth:'/mes',
faqTitle:'Preguntas frecuentes',ctaTitle:'Empieza ahora',ctaDesc:'500P al registrarte · 14 días gratis · Sin tarjeta',ctaBtn:'Crear cuenta gratuita',
loginTitle:'Iniciar sesión',email:'Correo',password:'Contraseña',forgotPw:'¿Olvidaste tu contraseña?',noAccount:'¿No tienes cuenta?',freeSignup:'Regístrate gratis',
hasAccount:'¿Ya tienes cuenta?',or:'o',resetTitle:'Restablecer contraseña',resetDesc:'Ingresa tu correo para recibir un enlace.',resetSent:'¡Correo enviado!',
resetBtn:'Enviar enlace',backToLogin:'← Volver',createAccount:'Crear cuenta',selectPlan:'Seleccionar plan',agreeTerms:'Aceptar términos',
name:'Nombre',quickSignup:'Registro rápido',next:'Siguiente',agreeAll:'Aceptar todo',required:'Requerido',optional:'Opcional',
termsService:'Términos de servicio',termsPrivacy:'Privacidad',termsMarketing:'Comunicaciones de marketing',
selectedPlan:'Plan seleccionado',mileageBonus:'¡500P de bienvenida!',
overview:'📊 Resumen',gaugeTab:'📋 59 indicadores',satTab:'🛰️ Satélite',alertTab:'🔔 Alertas',
good:'Bueno',caution:'Precaución',alert:'Alerta',keyActions:'🎯 5 acciones clave',verdict:'📋 Resumen',
satTimeline:'🛰️ Línea temporal',verification:'⏪ Verificación',prediction:'⏩ Predicción',nineSystems:'9 sistemas económicos',
alertCenter:'🔔 Centro de alertas',dualLock:'Doble bloqueo activo',deltaTitle:'📐 Análisis Delta Gap',satIndex:'Índice satelital',marketIndex:'Índice de mercado',
profile:'Perfil',subscription:'Suscripción',mileage:'Puntos',settings:'Ajustes',save:'Guardar',changePw:'Cambiar contraseña',
currentPlan:'Plan actual',changePlan:'Cambiar plan',cancelSub:'Cancelar',balance:'Saldo',earned:'Ganado este mes',used:'Usado este mes',
exchange:'Menú de canje',notifications:'Notificaciones',langSetting:'🌐 Idioma',deleteAccount:'Eliminar cuenta',
chatGreeting:'¡Hola! Bienvenido a DIAH-7M. ¿En qué puedo ayudarte?',chatPlaceholder:'Escribe tu pregunta...',chatSend:'Enviar',
chatQ1:'¿Qué es DIAH-7M?',chatA1:'Plataforma satelital que analiza la economía coreana con 59 indicadores en 9 sistemas.',
chatQ2:'¿Cómo leo las puntuaciones?',chatA2:'0-100: 🟢80+ Bueno, 🟡60-79 Precaución, 🔴<40 Alerta.',
chatQ3:'¿Fuentes de datos?',chatA3:'NASA VIIRS, ESA Sentinel, Landsat-9 + Banco de Corea ECOS, KOSIS.',
chatQ4:'¿Otros países?',chatA4:'Actualmente Corea, expandiéndose a OCDE 38 + principales economías.',
chatDefault:'Consultas: contact@diah7m.com',chatHelper:'Asistente',
dateLabel:'Enero 2026 · República de Corea',totalScore:'Puntuación total',
stNormal:'Normal',stWatch:'Vigilancia',stTrigger:'Alerta',stSeal:'Bloqueo',stCrisis:'Crisis',
inputSeal:'Bloqueo entrada',outputSeal:'Bloqueo salida',dualLockActive:'Doble bloqueo activo',
negGap:'Brecha negativa',mktIndex:'Índice de mercado',
deltaDesc:'Datos satelitales muestran actividad activa, pero el mercado no lo refleja. Posible infravaloración.',
verdictText:'Exportaciones ($65.8B) y semiconductores fuertes. CPI (2.0%) estable. Demanda interna débil; construcción (-3.2%) y morosidad (1.8%↑).',
actions:['Semiconductores en máximo → Mantener HBM','KOSPI 5,300 → Reducir apalancamiento','Won/USD 1,450 → Revisar exportadores','Construcción débil → Reducir sector','Morosidad↑ → Monitorear consumo'],
satVerify:'⏪ Verificación',satPredict:'⏩ Predicción',satEarlyDetect:'Detección temprana',
satStatBefore:'antes de estadísticas oficiales',satPastVerify:'⏪ Satélite pasado → Confirmado hoy',satFutureHint:'⏩ Satélite hoy → Futuro',
satEvidence:'Evidencia',bodyMetaphor:'🏥 Metáfora corporal',satObsInfo:'🛰️ Info satelital',
satCol:'Satélite',satProg:'Programa',satCycle:'Ciclo',satBand:'Banda',investSignal:'🎯 Señal de inversión',
sigBuy:'Comprar',sigAvoid:'Evitar',sigSell:'Vender',blindSpot:'🔭 Vista exclusiva DIAH-7M',gaugesLabel:'indicadores',
profileSaved:'✅ Guardado',fillAllFields:'⚠️ Completa todos los campos',pwMismatch:'⚠️ Contraseñas no coinciden',
pwChanged:'✅ Contraseña cambiada',paymentPending:'💳 Disponible tras integración de pago',
confirmCancelSub:'¿Seguro?',cancelInfo:'Puedes usar hasta el fin del período.',
cancelFeatures:'Funciones Pro se desactivarán.',confirmCancelBtn:'Confirmar',goBack:'Volver',
subCancelled:'✅ Cancelación programada',nextBill:'Próxima factura',payMethod:'Método de pago',streak:'Racha',
changePayment:'Cambiar método',active:'Activo',milInsufficient:'Puntos insuficientes',milExchanged:'¡Canje completado!',
notifEnabled:'Activado',notifDisabled:'Desactivado',langChanged:'Idioma cambiado',
confirmDeleteTitle:'⚠️ ¿Eliminar cuenta?',confirmDeleteDesc:'Todos los datos se eliminarán.',
permDelete:'Eliminar',cancel:'Cancelar',accountDeleted:'Eliminación solicitada',
emailNotif:'Notificaciones email',emailNotifDesc:'Informes, alertas',smsNotif:'SMS',smsNotifDesc:'Solo urgentes',
kakaoNotif:'KakaoTalk',kakaoNotifDesc:'Informes',slackNotif:'Slack',slackNotifDesc:'Equipo',
pushNotif:'Push',pushNotifDesc:'Tiempo real',curPw:'Contraseña actual',newPw:'Nueva',confirmPw:'Confirmar',phone:'Teléfono',
pwCheck8:'8+ caracteres',pwCheckAlpha:'Letras',pwCheckNum:'Números',pwCheckSpecial:'Especiales',
nameRequired:'Ingresa tu nombre',emailInvalid:'Email inválido',pwRequired:'Cumple requisitos',
pwEnterRequired:'Ingresa contraseña',termsRequired:'Acepta los términos',
loggingIn:'Iniciando...',sending:'Enviando...',creating:'Creando...',freeCreate:'Crear cuenta gratuita',
trialStart:'Iniciar prueba',trialNote:'Facturación tras 14 días · Cancela cuando quieras',connecting:'Conectando...',satPlatform:'Plataforma de diagnóstico satelital',
verdictTitle:'📋 Resumen',gaugeDetail:'Diagnóstico detallado 59 indicadores',
gaugeDetailSub:'Enero 2026 · 9 ejes · Datos reales · Verificación satelital',
satStatus:'🛰️ Estado satelital',freqDaily:'Diario',freq12d:'12 días',freq16d:'16 días',
planFreeDesc:'Prueba básica',planBasicDesc:'Indicadores clave',planProDesc:'59 indicadores + verificación',planEntDesc:'Empresa y equipo',
planFreeFeat:['Resumen mensual','9 ejes','Alertas email','500P'],
planBasicFeat:['Informe completo','20 indicadores','Resumen satelital','Chatbot básico','100P/mes'],
planProFeat:['Informes semanales+mensuales','59 indicadores','Verificación satelital','Chatbot ilimitado','Señales','Exportación','200P/mes'],
planEntFeat:['Todo Pro +','API','Informes custom','Gerente dedicado','5 personas','30 idiomas','300P/mes'],
milBasic:'100P/mes',milPro:'200P/mes',milEnt:'300P/mes',
exReport:'1 informe extra',exHistory:'1 mes histórico',exApi:'100 API extra',exExport:'1 exportación',exDiscount:'1% descuento',
faq1q:'¿Qué es DIAH-7M?',faq1a:'Primera plataforma mundial de diagnóstico satelital con 59 indicadores en 9 sistemas.',
faq2q:'¿Diferencia con corredurías?',faq2a:'Interpretan vs medimos con satélites — calor de fábricas, luces, emisiones.',
faq3q:'¿Datos satelitales cuestan?',faq3a:'No. NASA VIIRS, ESA Copernicus, Landsat-9 son gratuitos.',
faq4q:'¿Por qué metáfora corporal?',faq4a:'"Déficit" → "absorción intestinal invertida". Comprensión inmediata.',
faq5q:'¿Plan gratuito?',faq5a:'9 ejes mensuales. 59 indicadores requieren Basic+.',
faq6q:'¿Reembolso?',faq6a:'Gratis durante 14 días. Después, proporcional.',
sysA1n:'Monetario',sysA1b:'Circulatorio',sysA1m:'Tasas · Divisas · Reservas = Circulación',
sysA2n:'Comercio',sysA2b:'Respiratorio',sysA2m:'Exportaciones · Importaciones = Respiración',
sysA3n:'Consumo',sysA3b:'Digestivo',sysA3m:'Retail · Tarjetas · Inversión = Digestión',
sysA4n:'Sentimiento',sysA4b:'Nervioso',sysA4m:'BSI · Índice adelantado · Gasto público = Cerebro',
sysA5n:'Estabilidad financiera',sysA5b:'Inmune',sysA5m:'KOSPI · Spreads · Morosidad = Inmunidad',
sysA6n:'Precios y fiscal',sysA6b:'Endocrino',sysA6m:'CPI · PPI · Deuda = Hormonas',
sysA7n:'Industria',sysA7b:'Musculoesquelético',sysA7m:'Producción · PMI · Utilización = Músculos',
sysA8n:'Población · Empleo',sysA8b:'Celular',sysA8m:'Natalidad · Empleo · Deuda = Células',
sysA9n:'Inmobiliario · Exterior',sysA9b:'Piel',sysA9m:'Vivienda · Vacantes · FDI = Piel',
adminTitle:'Panel admin',admKpi:'KPI',admMembers:'Miembros',admEngine:'Motor',admRevenue:'Ingresos',admSettings:'Ajustes',
admTotalMembers:'Total',admMonthlyRev:'Ingresos mensuales',admActiveSubs:'Suscripciones activas',admMileageTotal:'Puntos',
admGradeDist:'Distribución',admRecentSignup:'Registros recientes',admSearchPlaceholder:'Buscar...',
admAllGrade:'Todos',admAllStatus:'Todos',admSuspended:'Suspendido',
admNameCol:'Nombre',admEmailCol:'Correo',admGradeCol:'Grado',admStatusCol:'Estado',admJoinDate:'Fecha',
admShowing:'mostrados',admTotal:'Total',admDataCollection:'Recolección',admSatLink:'Enlace satelital',admApiResp:'API',
admAllCollected:'Recolectado',admNasaEsa:'NASA+ESA OK',admSatDataStatus:'Estado satelital',
change:'Cambiar',curPlan:'Plan actual',spent:'Usado',exchangeMenu:'Canje',notifSettings:'Notificaciones',
gI1:'Tasa base',gI2:'Cuenta corriente',gI3:'Reservas FX',gI4:'Tipo cambio USD/KRW',gI5:'Crecimiento M2',gI6:'Bono gob. 3A',
gE1:'Exportaciones',gE2:'Importaciones',gE3:'Balanza comercial',gE4:'Volumen contenedores',gE5:'Petróleo (Dubai)',gE6:'Crecimiento export.',
gC1:'Ventas minoristas',gC2:'Sentimiento consumidor',gC3:'Gasto tarjetas',gC4:'Inversión equipos',gC5:'Consumo privado',gC6:'Producción servicios',
gS1:'BSI (Empresas)',gS2:'Luz nocturna (Sat)',gS3:'Índice adelantado',gS4:'Gasto público',gS5:'Incertidumbre política',gS6:'Índice coincidente',
gF1:'Spread crédito',gF2:'Spread CD-Bono',gF3:'KOSPI',gF4:'V-KOSPI (Vol)',gF5:'Tasa morosidad',gF6:'Spread corp.',gF7:'KOSDAQ',
gP1:'CPI',gP2:'PPI',gP3:'Ingresos fiscales',gP4:'Deuda/PIB',gP5:'Balance fiscal',gP6:'CPI subyacente',
gO1:'Producción industrial',gO2:'PMI (Mfg)',gO3:'Construcción',gO4:'Producción mfg',gO5:'Producción servicios',gO6:'Consumo YoY',
gM1:'Utilización capacidad',gM2_G:'Ratio inventario',gM3_G:'Nuevos pedidos',
gD1:'Tasa fertilidad',gD2:'Tasa envejecimiento',gD3:'Población activa',gL1:'Tasa empleo',gL2:'Desempleo',gL3:'Deuda hogares',gL4:'Morosidad hogares',
gR1:'Precio vivienda',gR2:'Viviendas sin vender',gR5:'Nivel del mar (SAR)',gR6:'Isla calor (IR)',gG1:'FDI',gG6:'PM2.5 (Satélite)',
};
I18N_CACHE['es']=ES;

// ── AR القاموس المدمج ──
const AR={
login:'تسجيل الدخول',signup:'ابدأ مجاناً',logout:'تسجيل الخروج',dashboard:'لوحة التحكم',mypage:'صفحتي',admin:'المسؤول',
heroSub:'التشخيص الاقتصادي الفضائي',heroTitle1:'تشخيص',heroTitle2:'الاقتصاد من الفضاء',
heroDesc:'بيانات الأقمار من NASA وESA تكشف التغيرات',heroFast:'قبل شهرين',heroDesc2:'من الإحصاءات الرسمية.',
heroCta:'ابدأ التشخيص المجاني',heroMore:'اعرف المزيد ↓',gauges:'المؤشرات',bodySys:'أجهزة الجسم',satCost:'تكلفة الأقمار',languages:'اللغات',
whyTitle:'ما الفرق عن التحليل التقليدي؟',
feat1:'قياس لا تفسير',feat2:'سبق بشهرين',feat3:'تشبيه الجسم',feat4:'تحذير الحصار المزدوج',feat5:'تحليل فجوة Delta',feat6:'إشارات الاستثمار',
featDesc1:'الوسطاء "يفسرون". DIAH-7M "يقيس" بالأقمار.',featDesc2:'الأقمار تكشف التغيرات قبل شهرين.',
featDesc3:'عجز الحساب الجاري → "انخفاض أكسجين الرئة". يفهمها الجميع.',featDesc4:'تنبيه عند حصار المدخلات والمخرجات. النظام الوحيد.',
featDesc5:'الفرق بين مؤشر الأقمار والسوق ← إشارة تقييم.',featDesc6:'يترجم التشخيص إلى إجراءات استثمارية.',
howTitle:'من الأقمار إلى الاستثمار',step1:'رصد فضائي',step2:'قياس فيزيائي',step3:'تشخيص اقتصادي',step4:'تحقق متبادل',step5:'إشارة عمل',
pricingTitle:'بيانات الأقمار مجانية. التشخيص بسعر معقول.',pricingSub:'تجربة 14 يوماً مجانية · إلغاء في أي وقت',
free:'ابدأ مجاناً',trial:'تجربة 14 يوماً',perMonth:'/شهر',
faqTitle:'الأسئلة الشائعة',ctaTitle:'ابدأ الآن',ctaDesc:'500 نقطة عند التسجيل · 14 يوم مجاناً · بدون بطاقة',ctaBtn:'إنشاء حساب مجاني',
loginTitle:'تسجيل الدخول',email:'البريد',password:'كلمة المرور',forgotPw:'نسيت كلمة المرور؟',noAccount:'ليس لديك حساب؟',freeSignup:'سجل مجاناً',
hasAccount:'لديك حساب؟',or:'أو',resetTitle:'إعادة تعيين',resetDesc:'أدخل بريدك لتلقي الرابط.',resetSent:'تم الإرسال!',
resetBtn:'إرسال الرابط',backToLogin:'← العودة',createAccount:'إنشاء حساب',selectPlan:'اختر خطة',agreeTerms:'الموافقة',
name:'الاسم',quickSignup:'تسجيل سريع',next:'التالي',agreeAll:'موافقة الكل',required:'مطلوب',optional:'اختياري',
termsService:'شروط الخدمة',termsPrivacy:'الخصوصية',termsMarketing:'إشعارات تسويقية',
selectedPlan:'الخطة المختارة',mileageBonus:'500 نقطة مكافأة!',
overview:'📊 نظرة عامة',gaugeTab:'📋 59 مؤشراً',satTab:'🛰️ الأقمار',alertTab:'🔔 التنبيهات',
good:'جيد',caution:'تحذير',alert:'إنذار',keyActions:'🎯 5 إجراءات',verdict:'📋 الملخص',
satTimeline:'🛰️ الجدول الفضائي',verification:'⏪ التحقق',prediction:'⏩ التوقع',nineSystems:'9 أنظمة اقتصادية',
alertCenter:'🔔 مركز التنبيهات',dualLock:'الحصار المزدوج نشط',deltaTitle:'📐 تحليل فجوة Delta',satIndex:'مؤشر الأقمار',marketIndex:'مؤشر السوق',
profile:'الملف الشخصي',subscription:'الاشتراك',mileage:'النقاط',settings:'الإعدادات',save:'حفظ',changePw:'تغيير كلمة المرور',
currentPlan:'الخطة الحالية',changePlan:'تغيير الخطة',cancelSub:'إلغاء',balance:'الرصيد',earned:'المكتسب',used:'المستخدم',
exchange:'الاستبدال',notifications:'الإشعارات',langSetting:'🌐 اللغة',deleteAccount:'حذف الحساب',
chatGreeting:'مرحباً! أهلاً بك في DIAH-7M. كيف يمكنني مساعدتك؟',chatPlaceholder:'اكتب سؤالك...',chatSend:'إرسال',
chatQ1:'ما هو DIAH-7M؟',chatA1:'منصة تشخيص بالأقمار تحلل الاقتصاد الكوري بـ 59 مؤشراً في 9 أنظمة.',
chatQ2:'كيف أقرأ الدرجات؟',chatA2:'0-100: 🟢80+ جيد، 🟡60-79 تحذير، 🔴أقل من 40 إنذار.',
chatQ3:'مصادر البيانات؟',chatA3:'NASA VIIRS وESA Sentinel وLandsat-9 + بنك كوريا.',
chatQ4:'دول أخرى؟',chatA4:'حالياً كوريا، يتوسع إلى 38 دولة OECD.',
chatDefault:'للاستفسارات: contact@diah7m.com',chatHelper:'المساعد',
dateLabel:'يناير 2026 · كوريا',totalScore:'الدرجة الإجمالية',
stNormal:'طبيعي',stWatch:'مراقبة',stTrigger:'تحذير',stSeal:'حصار',stCrisis:'أزمة',
inputSeal:'حصار المدخلات',outputSeal:'حصار المخرجات',dualLockActive:'الحصار المزدوج نشط',
negGap:'فجوة سلبية',mktIndex:'مؤشر السوق',
deltaDesc:'بيانات الأقمار تُظهر نشاطاً اقتصادياً لكن السوق لم يعكسه. احتمال تقييم منخفض.',
verdictText:'الصادرات (65.8 مليار$) وأشباه الموصلات قوية. CPI (2.0%) مستقر. الطلب المحلي ضعيف.',
actions:['أشباه الموصلات في أعلى مستوى → الحفاظ على HBM','KOSPI يتجاوز 5,300 → تقليل الرافعة','الوون 1,450 → مراجعة التصدير','البناء ضعيف → تقليل الوزن','التأخر↑ → مراقبة الاستهلاك'],
satVerify:'⏪ التحقق',satPredict:'⏩ التوقع',satEarlyDetect:'الكشف المبكر',
satStatBefore:'قبل الإحصاءات',satPastVerify:'⏪ الماضي → مؤكد اليوم',satFutureHint:'⏩ اليوم → المستقبل',
satEvidence:'الأدلة',bodyMetaphor:'🏥 تشبيه الجسم',satObsInfo:'🛰️ معلومات الرصد',
satCol:'القمر',satProg:'البرنامج',satCycle:'الدورة',satBand:'النطاق',investSignal:'🎯 إشارة الاستثمار',
sigBuy:'شراء',sigAvoid:'تجنب',sigSell:'بيع',blindSpot:'🔭 رؤية DIAH-7M الحصرية',gaugesLabel:'مؤشرات',
profileSaved:'✅ تم الحفظ',fillAllFields:'⚠️ أكمل جميع الحقول',pwMismatch:'⚠️ كلمتا المرور غير متطابقتين',
pwChanged:'✅ تم التغيير',paymentPending:'💳 متاح بعد ربط الدفع',
confirmCancelSub:'هل أنت متأكد؟',cancelInfo:'يمكنك الاستخدام حتى نهاية الفترة.',
cancelFeatures:'ستُعطل ميزات Pro.',confirmCancelBtn:'تأكيد الإلغاء',goBack:'رجوع',
subCancelled:'✅ تم جدولة الإلغاء',nextBill:'الفاتورة القادمة',payMethod:'طريقة الدفع',streak:'الاستخدام المتواصل',
changePayment:'تغيير الدفع',active:'نشط',milInsufficient:'نقاط غير كافية',milExchanged:'تم الاستبدال!',
notifEnabled:'مفعل',notifDisabled:'معطل',langChanged:'تم تغيير اللغة',
confirmDeleteTitle:'⚠️ حذف الحساب؟',confirmDeleteDesc:'ستُحذف جميع البيانات نهائياً.',
permDelete:'حذف نهائي',cancel:'إلغاء',accountDeleted:'تم طلب الحذف',
emailNotif:'إشعارات البريد',emailNotifDesc:'تقارير وتنبيهات',smsNotif:'SMS',smsNotifDesc:'تنبيهات عاجلة',
kakaoNotif:'KakaoTalk',kakaoNotifDesc:'التقارير',slackNotif:'Slack',slackNotifDesc:'تنبيهات الفريق',
pushNotif:'إشعارات فورية',pushNotifDesc:'تنبيهات مباشرة',curPw:'كلمة المرور الحالية',newPw:'الجديدة',confirmPw:'تأكيد',phone:'الهاتف',
pwCheck8:'8+ أحرف',pwCheckAlpha:'أحرف',pwCheckNum:'أرقام',pwCheckSpecial:'رموز',
nameRequired:'أدخل الاسم',emailInvalid:'بريد غير صالح',pwRequired:'أكمل المتطلبات',
pwEnterRequired:'أدخل كلمة المرور',termsRequired:'وافق على الشروط',
loggingIn:'جارٍ الدخول...',sending:'جارٍ الإرسال...',creating:'جارٍ الإنشاء...',freeCreate:'إنشاء حساب مجاني',
trialStart:'بدء التجربة',trialNote:'الفوترة بعد 14 يوماً · إلغاء في أي وقت',connecting:'جارٍ الاتصال...',satPlatform:'منصة التشخيص الفضائي',
verdictTitle:'📋 الملخص',gaugeDetail:'تشخيص مفصل 59 مؤشراً',
gaugeDetailSub:'يناير 2026 · 9 محاور · بيانات حقيقية · تحقق فضائي',
satStatus:'🛰️ حالة الرصد',freqDaily:'يومي',freq12d:'12 يوماً',freq16d:'16 يوماً',
planFreeDesc:'تجربة أساسية',planBasicDesc:'المؤشرات الأساسية',planProDesc:'59 مؤشراً + تحقق فضائي',planEntDesc:'مؤسسات وفرق',
planFreeFeat:['ملخص شهري','9 محاور','تنبيهات بريد','500 نقطة'],
planBasicFeat:['تقرير شهري كامل','20 مؤشراً','ملخص فضائي','دردشة AI أساسية','100 نقطة/شهر'],
planProFeat:['تقارير أسبوعية+شهرية','59 مؤشراً','تحقق فضائي','دردشة AI غير محدودة','إشارات','تصدير البيانات','200 نقطة/شهر'],
planEntFeat:['كل ميزات Pro +','API','تقارير مخصصة','مدير مخصص','5 أعضاء','30 لغة','300 نقطة/شهر'],
milBasic:'100 نقطة/شهر',milPro:'200 نقطة/شهر',milEnt:'300 نقطة/شهر',
exReport:'تقرير إضافي',exHistory:'شهر بيانات',exApi:'100 طلب API',exExport:'تصدير واحد',exDiscount:'خصم 1%',
faq1q:'ما هو DIAH-7M؟',faq1a:'أول منصة عالمية للتشخيص الاقتصادي الفضائي بـ 59 مؤشراً في 9 أنظمة.',
faq2q:'الفرق عن تقارير الوساطة؟',faq2a:'التقارير التقليدية تفسر. DIAH-7M يقيس — حرارة المصانع، أضواء الموانئ، الانبعاثات.',
faq3q:'هل بيانات الأقمار مدفوعة؟',faq3a:'لا. NASA VIIRS وESA Copernicus وLandsat-9 مجانية.',
faq4q:'لماذا تشبيه الجسم؟',faq4a:'"عجز الحساب الجاري" → "انعكاس امتصاص الأمعاء". الجميع يفهم.',
faq5q:'ماذا يقدم الحساب المجاني؟',faq5a:'9 محاور شهرية. 59 مؤشراً تحتاج خطة Basic+.',
faq6q:'سياسة الاسترداد؟',faq6a:'إلغاء مجاني خلال 14 يوماً. بعدها استرداد نسبي.',
sysA1n:'النقد والرأسمال',sysA1b:'الدورة الدموية',sysA1m:'الفائدة · العملات · الاحتياطي = الدورة الدموية',
sysA2n:'التجارة والتصدير',sysA2b:'الجهاز التنفسي',sysA2m:'الصادرات · الواردات · الشحن = التنفس',
sysA3n:'الاستهلاك والطلب',sysA3b:'الجهاز الهضمي',sysA3m:'التجزئة · البطاقات · الاستثمار = الهضم',
sysA4n:'المعنويات والسياسة',sysA4b:'الجهاز العصبي',sysA4m:'BSI · المؤشر القيادي · الإنفاق = الدماغ',
sysA5n:'الاستقرار المالي',sysA5b:'الجهاز المناعي',sysA5m:'KOSPI · الفروقات · التأخر = المناعة',
sysA6n:'الأسعار والمالية',sysA6b:'جهاز الغدد',sysA6m:'CPI · PPI · الدين = الهرمونات',
sysA7n:'الصناعة والإنتاج',sysA7b:'الجهاز العضلي',sysA7m:'الإنتاج · PMI · التشغيل = العضلات',
sysA8n:'السكان · التوظيف',sysA8b:'الخلايا',sysA8m:'الولادة · التوظيف · الديون = الخلايا',
sysA9n:'العقارات · الخارج',sysA9b:'الجلد',sysA9m:'الإسكان · الشواغر · FDI = الجلد',
adminTitle:'لوحة الإدارة',admKpi:'KPI',admMembers:'الأعضاء',admEngine:'المحرك',admRevenue:'الإيرادات',admSettings:'الإعدادات',
admTotalMembers:'الإجمالي',admMonthlyRev:'الإيرادات الشهرية',admActiveSubs:'الاشتراكات النشطة',admMileageTotal:'النقاط',
admGradeDist:'توزيع الدرجات',admRecentSignup:'التسجيلات الأخيرة',admSearchPlaceholder:'بحث...',
admAllGrade:'الكل',admAllStatus:'الكل',admSuspended:'موقوف',
admNameCol:'الاسم',admEmailCol:'البريد',admGradeCol:'الدرجة',admStatusCol:'الحالة',admJoinDate:'التاريخ',
admShowing:'معروض',admTotal:'الإجمالي',admDataCollection:'جمع البيانات',admSatLink:'رابط الأقمار',admApiResp:'استجابة API',
admAllCollected:'تم الجمع',admNasaEsa:'NASA+ESA طبيعي',admSatDataStatus:'حالة البيانات',
change:'تغيير',curPlan:'الخطة الحالية',spent:'المستخدم',exchangeMenu:'الاستبدال',notifSettings:'إعدادات الإشعارات',
gI1:'سعر الفائدة',gI2:'الحساب الجاري',gI3:'احتياطي النقد',gI4:'سعر الصرف وون/دولار',gI5:'نمو M2',gI6:'سندات حكومية 3سنوات',
gE1:'الصادرات',gE2:'الواردات',gE3:'الميزان التجاري',gE4:'حجم الحاويات',gE5:'سعر النفط (دبي)',gE6:'نمو الصادرات',
gC1:'مبيعات التجزئة',gC2:'ثقة المستهلك',gC3:'إنفاق البطاقات',gC4:'استثمار المعدات',gC5:'الاستهلاك الخاص',gC6:'إنتاج الخدمات',
gS1:'BSI (الأعمال)',gS2:'الإضاءة الليلية (قمر)',gS3:'المؤشر القيادي',gS4:'الإنفاق الحكومي',gS5:'عدم اليقين السياسي',gS6:'المؤشر المتزامن',
gF1:'هامش الائتمان',gF2:'هامش CD-السندات',gF3:'KOSPI',gF4:'V-KOSPI (التقلب)',gF5:'معدل التأخر',gF6:'هامش سندات الشركات',gF7:'KOSDAQ',
gP1:'مؤشر أسعار المستهلك',gP2:'مؤشر أسعار المنتجين',gP3:'الإيرادات الضريبية',gP4:'الدين/الناتج',gP5:'الميزان المالي',gP6:'التضخم الأساسي',
gO1:'الإنتاج الصناعي',gO2:'PMI (التصنيع)',gO3:'البناء',gO4:'إنتاج التصنيع',gO5:'إنتاج الخدمات',gO6:'الاستهلاك سنوي',
gM1:'معدل التشغيل',gM2_G:'نسبة المخزون',gM3_G:'الطلبات الجديدة',
gD1:'معدل الخصوبة',gD2:'معدل الشيخوخة',gD3:'السكان العاملون',gL1:'معدل التوظيف',gL2:'البطالة',gL3:'ديون الأسر',gL4:'تأخر سداد الأسر',
gR1:'أسعار المساكن',gR2:'المساكن غير المباعة',gR5:'ارتفاع البحر (SAR)',gR6:'الجزيرة الحرارية (IR)',gG1:'الاستثمار الأجنبي',gG6:'PM2.5 (قمر صناعي)',
};
I18N_CACHE['ar']=AR;



// ── i18n: 정적 내장 전용. 런타임 API 호출 0. ──
// 지원 언어: ko, en, ja, zh, es, ar (세계 인구 75%+)
// 미지원 언어 → EN fallback (글로벌 SaaS 표준)

const t=(key,lang)=>{
  if(!lang||lang==='ko')return KO[key]||key;
  return I18N_CACHE[lang]?.[key]||EN[key]||KO[key]||key;
};const gc = g => g==="양호"?T.good:g==="주의"?T.warn:T.danger;
const gi = g => g==="양호"?"●":g==="주의"?"●":"●";

// ── TIER LOCK SYSTEM (쇼핑몰형 잠금 UX) ──
const TIER_ACCESS={
  FREE:{systems:['A1'],gauges:7,satTab:false,alerts:false},
  BASIC:{systems:['A1','A2','A3'],gauges:21,satTab:false,alerts:true},
  PRO:{systems:['A1','A2','A3','A4','A5','A6','A7','A8','A9'],gauges:59,satTab:true,alerts:true},
  ENTERPRISE:{systems:['A1','A2','A3','A4','A5','A6','A7','A8','A9'],gauges:59,satTab:true,alerts:true},
};
const tierLevel=p=>p==='ENTERPRISE'?4:p==='PRO'?3:p==='BASIC'?2:1;
function TierLock({plan,req,children,lang,compact}){
  const L=lang||'ko';
  const uLv=tierLevel(plan),rLv=tierLevel(req);
  if(uLv>=rLv) return children;
  const pct=Math.round((1-(TIER_ACCESS[plan||'FREE']?.gauges||7)/59)*100);
  return(
    <div style={{position:"relative",borderRadius:T.cardRadius,overflow:"hidden"}}>
      <div style={{filter:"blur(6px)",opacity:.35,pointerEvents:"none",userSelect:"none"}}>{children}</div>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        background:`${T.bg0}85`,backdropFilter:"blur(2px)",borderRadius:T.cardRadius,border:`1px dashed ${T.accent}40`,zIndex:10}}>
        <div style={{width:48,height:48,borderRadius:24,background:`${T.accent}15`,display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:22,marginBottom:12,border:`2px solid ${T.accent}30`}}>🔒</div>
        {!compact&&<div style={{fontSize:13,fontWeight:800,color:T.text,marginBottom:4}}>{pct}% {t('locked',L)}</div>}
        {!compact&&<div style={{fontSize:11,color:T.textMid,marginBottom:16,textAlign:"center",maxWidth:240,lineHeight:1.6}}>
          {t('upgradeHint',L).replace('{tier}',req)}</div>}
        <button style={{padding:compact?"8px 16px":"10px 24px",borderRadius:10,border:"none",
          background:`linear-gradient(135deg,${T.accent},#0099cc)`,color:"#fff",fontSize:compact?11:13,fontWeight:700,
          cursor:"pointer",boxShadow:`0 4px 20px ${T.accent}40`,animation:"tierPulse 2s ease infinite"}}>
          {t('upgradeBtn',L)}</button>
      </div>
    </div>
  );
}

// ── SATELLITE META ──
const SAT_META = {
  S2:{sat:"VIIRS DNB",orbit:"Suomi NPP",freq:"daily",band:"Night Visible",icon:"🛰️"},
  R5:{sat:"Sentinel-1 SAR",orbit:"Copernicus",freq:"12d",band:"C-band SAR",icon:"🌊"},
  R6:{sat:"Landsat-9",orbit:"NASA EOS",freq:"16d",band:"Thermal IR",icon:"🌡️"},
  G6:{sat:"Sentinel-5P",orbit:"Copernicus",freq:"daily",band:"UV-VIS",icon:"💨"},
};
const isSat = c => !!SAT_META[c];
const LEAD = {
  fast:{label:'빠른',range:'2~4주',color:'#00e5a0',emoji:'⚡'},
  medium:{label:'중간',range:'1~3개월',color:'#f0b429',emoji:'🔄'},
  slow:{label:'느린',range:'3~6개월+',color:'#ff5c5c',emoji:'🐢'},
};
const EV_STYLE = {
  strong:{label:'강함',color:'#00e5a0',desc:'직접 물리 측정'},
  medium:{label:'중간',color:'#f0b429',desc:'간접 논리 연결'},
  weak:{label:'약함',color:'#ff8c42',desc:'간접 (백테스트 필요)'},
};

// ── TIME PROFILES (59 gauges) ──
const TP={I1:{ld:'medium',rng:'1~3개월',ev:'weak',lk:'야간광은 실물 가동의 밀도이며, 금리는 그 밀도의 압력을 조절하는 밸브다'},I2:{ld:'medium',rng:'1~2개월',ev:'medium',lk:'야간광+배출은 생산량이며, 경상수지는 그 생산의 해외 대금 수령이다'},I3:{ld:'medium',rng:'1~3개월',ev:'weak',lk:'야간광 급감은 위기 징후이며, 외환보유고 급감은 그 위기의 방어 흔적이다'},I4:{ld:'medium',rng:'1~2개월',ev:'weak',lk:'야간광은 수출 가동력이며, 환율은 그 가동력의 외환시장 그림자다'},I5:{ld:'slow',rng:'2~4개월',ev:'weak',lk:'야간광은 돈이 실물에 도달한 증거이며, M2는 돈이 풀린 양이다'},I6:{ld:'medium',rng:'1~2개월',ev:'weak',lk:'야간광 안정은 경기 쇼크가 없다는 증거이며, 국채금리는 그 안정의 가격이다'},E1:{ld:'fast',rng:'2~4주',ev:'strong',lk:'야간광+NO₂는 공장이 돌아가는 물리량이며, 수출은 그 생산물의 출항 금액이다'},E2:{ld:'medium',rng:'1~2개월',ev:'medium',lk:'NO₂ 배출은 원자재 가공의 흔적이며, 수입은 그 원자재의 청구서다'},E3:{ld:'fast',rng:'2~4주',ev:'medium',lk:'항만 야간광은 선적의 밀도이며, 무역수지는 그 밀도의 순잔액이다'},E4:{ld:'fast',rng:'2~4주',ev:'strong',lk:'항만 야간광+선박 패턴은 물류의 물리량이며, TEU는 그 물류의 단위다'},E5:{ld:'medium',rng:'1~2개월',ev:'medium',lk:'정유시설 열+배출은 정제의 강도이며, 유가는 그 강도의 시장 반영이다'},E6:{ld:'fast',rng:'2~6주',ev:'strong',lk:'산업단지 야간광 추세는 생산 모멘텀이며, 수출증가율은 그 모멘텀의 금액 환산이다'},C1:{ld:'medium',rng:'1~2개월',ev:'medium',lk:'상업지구 야간광은 소비 행위의 빛이며, 소매판매는 그 빛의 금액 집계다'},C2:{ld:'medium',rng:'1~3개월',ev:'weak',lk:'도심 야간광은 사람들이 밖에 나온 밀도이며, 소비자심리는 그 밀도의 설문 번역이다'},C3:{ld:'fast',rng:'2~4주',ev:'medium',lk:'번화가 야간광은 소비 현장의 밝기이며, 카드매출은 그 현장의 결제 총액이다'},C4:{ld:'medium',rng:'1~3개월',ev:'medium',lk:'공장 열+배출은 설비 가동의 물리량이며, 설비투자는 그 가동의 자본 투입이다'},C5:{ld:'medium',rng:'1~3개월',ev:'medium',lk:'주거·상업 야간광은 국민 활동의 밀도이며, 민간소비는 그 활동의 지출 합계다'},C6:{ld:'medium',rng:'1~2개월',ev:'medium',lk:'오피스 야간광은 서비스업의 가동 시간이며, 서비스업생산은 그 가동의 산출이다'},S1:{ld:'medium',rng:'1~2개월',ev:'weak',lk:'공장 야간 가동+열은 기업의 실제 행동이며, BSI는 기업이 느끼는 심리 점수다'},S3:{ld:'medium',rng:'1~3개월',ev:'medium',lk:'야간광 추세는 경제의 방향 물리량이며, 선행지수는 그 방향의 통계 합성이다'},S4:{ld:'fast',rng:'2~4주',ev:'strong',lk:'건설현장 야간 조명+열은 집행의 물리량이며, 정부지출은 그 집행의 회계 기록이다'},S5:{ld:'medium',rng:'1~3개월',ev:'weak',lk:'야간광 변동성은 경제의 불안 진동이며, 정책불확실성은 그 진동의 언어 측정이다'},S6:{ld:'fast',rng:'2~4주',ev:'strong',lk:'야간광+열지도는 지금의 경제 활동이며, 동행지수는 그 활동의 지연 집계다'},F1:{ld:'medium',rng:'1~3개월',ev:'weak',lk:'야간광 급감은 실물 위축이며, 신용스프레드는 그 위축의 금융 체온이다'},F2:{ld:'medium',rng:'1~2개월',ev:'weak',lk:'야간광 안정은 경제 정상 작동이며, CD-국고채 스프레드는 그 작동의 자금 온도다'},F3:{ld:'medium',rng:'1~3개월',ev:'weak',lk:'산업단지 야간광+열은 기업 이익의 물리 근거이며, KOSPI는 그 이익의 시장 가격이다'},F4:{ld:'fast',rng:'2~4주',ev:'weak',lk:'야간광 안정은 실물에 쇼크가 없다는 증거이며, V-KOSPI는 금융 노이즈의 크기다'},F5:{ld:'medium',rng:'1~3개월',ev:'medium',lk:'자영업 야간광 감소는 매출 하락이며, 연체율은 그 하락의 상환 실패다'},F6:{ld:'medium',rng:'1~3개월',ev:'weak',lk:'산업단지 야간광+배출은 기업 가동의 증거이며, 회사채스프레드는 그 기업의 신용 온도다'},F7:{ld:'medium',rng:'1~2개월',ev:'weak',lk:'벤처밸리 야간광은 혁신 활동의 밀도이며, KOSDAQ은 그 혁신의 시장 가격이다'},P1:{ld:'medium',rng:'1~3개월',ev:'medium',lk:'열+NO₂는 에너지 소비의 물리량이며, CPI는 그 소비가 가격에 남긴 흔적이다'},P2:{ld:'medium',rng:'1~2개월',ev:'medium',lk:'공장 배출량은 원재료 연소의 밀도이며, PPI는 그 연소의 원가 청구서다'},P3:{ld:'medium',rng:'1~3개월',ev:'medium',lk:'전국 야간광은 경제 활동 총량이며, 국세수입은 그 활동에서 걷히는 세금이다'},P4:{ld:'slow',rng:'3~6개월',ev:'medium',lk:'SOC 야간광은 재정이 실물에 도달한 증거이며, 국가채무비율은 그 재정의 누적 부담이다'},P5:{ld:'medium',rng:'1~3개월',ev:'medium',lk:'야간광 반등은 경기 회복의 물리량이며, 재정수지는 세입-세출의 차이다'},P6:{ld:'medium',rng:'1~3개월',ev:'medium',lk:'도심 열지도는 서비스 수요의 열량이며, 근원물가는 그 열량의 가격 반영이다'},M1:{ld:'fast',rng:'2~4주',ev:'strong',lk:'공장 열적외선은 기계가 돌아가는 열이며, 가동률은 그 열의 퍼센트 환산이다'},M2_G:{ld:'medium',rng:'1~2개월',ev:'medium',lk:'물류센터 야간 활동은 출하의 밀도이며, 재고율은 출하되지 못한 생산의 비율이다'},M3_G:{ld:'fast',rng:'2~6주',ev:'strong',lk:'산업단지 야간광+배출은 새 주문의 가동이며, 신규수주는 그 가동의 계약 금액이다'},O1:{ld:'fast',rng:'2~4주',ev:'strong',lk:'야간광+열+배출은 생산의 3중 물리량이며, 산업생산은 그 물리량의 통계 환산이다'},O2:{ld:'fast',rng:'2~4주',ev:'strong',lk:'산업단지 야간광+열은 제조업의 실제 활동이며, PMI는 구매담당자의 체감 점수다'},O3:{ld:'fast',rng:'2~4주',ev:'strong',lk:'건설현장 야간 조명+열은 공사의 물리량이며, 건설기성은 그 공사의 청구 금액이다'},O4:{ld:'fast',rng:'2~4주',ev:'strong',lk:'공장 열+NO₂는 제조의 연소 강도이며, 제조업생산은 그 연소의 산출량이다'},O5:{ld:'medium',rng:'1~2개월',ev:'medium',lk:'오피스 야간광은 서비스의 가동 시간이며, 서비스업생산은 그 시간의 산출이다'},O6:{ld:'medium',rng:'1~2개월',ev:'medium',lk:'상업지구 야간광은 소비의 현장 밝기이며, 소비증감은 그 밝기의 연간 비교다'},D1:{ld:'slow',rng:'6개월~수년',ev:'strong',lk:'지방 야간광 소멸은 사람이 떠난 물리량이며, 출산율은 사람이 태어나지 않는 통계다'},D2:{ld:'slow',rng:'1~3년',ev:'strong',lk:'농촌 야간광↓+의료 야간광↑는 인구 이동의 열지도이며, 고령화율은 그 이동의 비율이다'},D3:{ld:'slow',rng:'6개월~수년',ev:'strong',lk:'산업단지 야간광 장기 추세는 노동력의 밀도이며, 생산인구는 그 밀도의 인원수다'},L1:{ld:'medium',rng:'1~3개월',ev:'medium',lk:'산업단지+상업 야간광은 사람이 일하는 밀도이며, 고용률은 그 밀도의 인구 비율이다'},L2:{ld:'medium',rng:'1~3개월',ev:'medium',lk:'야간광 감소는 일터가 꺼진 물리량이며, 실업률은 일자리를 잃은 사람의 비율이다'},L3:{ld:'slow',rng:'3~6개월',ev:'weak',lk:'야간광 안정은 소득이 유지된다는 증거이며, 가계부채는 그 소득으로 갚아야 할 빚이다'},L4:{ld:'medium',rng:'1~3개월',ev:'medium',lk:'자영업 야간광 감소는 매출 하락의 빛이며, 연체율은 그 하락이 상환 실패로 전이된 수치다'},R1:{ld:'medium',rng:'1~3개월',ev:'medium',lk:'개발지 야간광+열은 수요가 몰리는 물리량이며, 주택가격은 그 수요의 가격 반영이다'},R2:{ld:'medium',rng:'1~3개월',ev:'strong',lk:'준공 단지 야간광 미점등은 사람이 안 산 증거이며, 미분양은 그 증거의 호수 집계다'},G1:{ld:'medium',rng:'1~3개월',ev:'medium',lk:'외투 시설 야간광+열은 실투자의 물리량이며, FDI는 그 투자의 금액 신고다'}};

// ── SATELLITE CROSS-REFERENCE ──
const SAT_XREF={I1:{ref:"S2",past:{sat:"11월 야간광 108.1%→108.3% 상승 유지",result:"1월 기준금리 동결"},now:{sat:"1월 야간광 108.3% 각성 유지",predict:"3월 금통위 동결 가능성 높음"}},I2:{ref:"S2,G6",past:{sat:"11월 산업단지 야간광↑ + NO₂↑",result:"1월 경상수지 87.4억$ 흑자"},now:{sat:"1월 야간광+배출 동반 상승",predict:"3월 경상수지 80억$+ 흑자 유지"}},I4:{ref:"S2",past:{sat:"11월 수출단지 야간광 강세",result:"1월 수출 658억$ 사상최대"},now:{sat:"1월 야간광 유지",predict:"3월 1,400원대 고착화"}},E1:{ref:"S2,G6",past:{sat:"11월 반도체단지 야간광+5% + NO₂ 급증",result:"1월 수출 658억$, 반도체 205억$(+103%)"},now:{sat:"1월 야간광 고수준, NO₂ 약간 둔화",predict:"3월 수출 600억$대 유지"}},E4:{ref:"S2,R5",past:{sat:"11월 부산항 야간광↑ + 선박 활동 감지",result:"1월 물동량 142.3만TEU(+2.7%)"},now:{sat:"1월 항만 야간광 유지",predict:"3월 물동량 140만TEU+ 유지"}},F3:{ref:"S2,R6",past:{sat:"11월 산업단지 야간광+열 강세",result:"1월 KOSPI 5,302 사상최고"},now:{sat:"1월 야간광 유지이나 증가 둔화",predict:"3월 KOSPI 5,000~5,500 박스권"}},F5:{ref:"S2",past:{sat:"11월 자영업 밀집지 야간광 약세",result:"1월 연체율 0.85%↑"},now:{sat:"1월 자영업 야간광 계속 약세",predict:"3월 연체율 0.9% 접근"}},D1:{ref:"S2",past:{sat:"지방 소도시 야간광 3년 연속 하락",result:"출산율 0.68"},now:{sat:"1월 소멸 지역 야간광 계속 감소",predict:"출산율 0.65 이하 추세 지속"}},O1:{ref:"S2,R6,G6",past:{sat:"11월 야간광+열+배출 3중 상승",result:"1월 산업생산 +2.5%"},now:{sat:"1월 3중 유지, 열 소폭 둔화",predict:"3월 산업생산 +2~3%"}},M1:{ref:"R6,S2",past:{sat:"11월 공장 열적외선 73.2°C",result:"1월 가동률 73.5%"},now:{sat:"1월 반도체 팹 열↑, 석화 열↓",predict:"3월 가동률 74~75%"}},R2:{ref:"S2",past:{sat:"11월 준공 단지 야간광 미점등 증가",result:"미분양 72,500호"},now:{sat:"1월 지방 미점등 확대 중",predict:"3월 미분양 75,000호 가능"}}};

// ── 59 GAUGE DATA (2026-01) ──
const D={
I1:{c:"I1",n:"기준금리",s:"A1",u:"%",v:2.5,p:2.5,ch:"동결",g:"양호",t:"혈압",m:"중앙은행이 경제 전체에 설정하는 기본 금리. 인체로 비유하면 심장이 뿜는 혈압과 같다",note:"1/15 금통위 만장일치 동결",act:[{s:"🟢 동결 지속",a:"채권 비중 유지, 성장주 우호",tg:"유지"},{s:"📈 인상",a:"단기채 전환, 은행주 수혜",tg:"리밸런싱"},{s:"📉 인하",a:"장기채 매수, 부동산·성장주 반등",tg:"매수 고려"}],bs:{d:"8개 경제 영역에 미치는 연쇄 영향 시각화",o:["증권사: 금리 전망만","한국은행: 결정만 발표"]}},
I2:{c:"I2",n:"경상수지",s:"A1",u:"억$",v:87.4,p:72.1,ch:"+21.2%",g:"양호",t:"혈액 유입",m:"해외에서 국내로 유입되는 자금 흐름. 인체의 혈액 유입량과 같다",note:"12개월 연속 흑자. 반도체 수출 견인",act:[{s:"🟢 흑자 지속",a:"원화 안정. 내수·항공주 긍정",tg:"유지"},{s:"⚠️ 흑자 축소",a:"수출주 점검, 환율 헤지",tg:"점검"},{s:"🔴 적자 전환",a:"달러 자산 확대",tg:"긴급 조정"}],bs:{d:"산업별·국가별 자금 흐름 시각화",o:["한국은행: 월별 수치만","IMF: 연간만"]}},
I3:{c:"I3",n:"외환보유고",s:"A1",u:"억$",v:4259.1,p:4280.6,ch:"-21.5",g:"양호",t:"비상금",m:"국가의 위기 대비 외화 비축금. 4,259억$ ≈ 9개월분",note:"전월비 21.5억$ 감소. 세계 9위",act:[{s:"🟢 4,000억$+",a:"외국인 신뢰 유지",tg:"유지"},{s:"⚠️ 빠른 감소",a:"환율 급등 대비",tg:"주목"},{s:"🔴 3,500억$ 이하",a:"신흥국 위기 프리미엄",tg:"리스크 회피"}],bs:{d:"위기 시 실제 가용 외환과 방어 기간 분석",o:["한국은행: 총액만","IMF: 적정 기준만"]}},
I4:{c:"I4",n:"환율(원/달러)",s:"A1",u:"원/$",v:1453,p:1472,ch:"-19원",g:"주의",t:"혈압계",m:"원화의 대외 가치. 높으면 수입물가 부담, 낮으면 수출 타격",note:"1,400원대 고착화. 16년래 최저 원화",act:[{s:"🟡 1,400원대",a:"수출주 수혜, 내수주 부담",tg:"섹터 선별"},{s:"📈 1,450원+",a:"달러 자산 차익 실현",tg:"차익 실현"},{s:"📉 1,200원 이하",a:"해외 자산 매수 기회",tg:"매수 고려"}],bs:{d:"양방향 리스크 진단",o:["외환시장: 시세만","증권사: 전망만"]}},
I5:{c:"I5",n:"M2 증가율",s:"A1",u:"%",v:6.2,p:6.5,ch:"-0.3%p",g:"양호",t:"혈액량",m:"시중에 풀린 통화량의 증가 속도. 인체의 총 혈액량 변화와 같다",note:"대출 규제 효과로 소폭 둔화",act:[{s:"🟢 5~7%",a:"자산시장 우호적",tg:"유지"},{s:"📈 10%+",a:"버블 경계, 실물자산",tg:"인플레 헤지"},{s:"📉 3% 이하",a:"유동성 경색",tg:"방어 전환"}],bs:{d:"M2→자산시장·물가 시차 효과 분석",o:["한국은행: 통계만"]}},
I6:{c:"I6",n:"국채금리(3Y)",s:"A1",u:"%",v:2.95,p:3.05,ch:"-10bp",g:"양호",t:"혈관 탄력",m:"3년물 국채 수익률. 채권시장이 경제를 어떻게 보는지의 가격",note:"기준금리 대비 +45bp. 정상 수준",act:[{s:"🟢 스프레드 정상",a:"회사채 투자 적기",tg:"유지"},{s:"⚠️ 괴리 확대",a:"단기채 전환",tg:"단기 전환"},{s:"🔴 장단기 역전",a:"침체 신호",tg:"침체 대비"}],bs:{d:"기준금리와의 괴리가 의미하는 시장 신호",o:["한국은행: 수익률 곡선만"]}},
E1:{c:"E1",n:"수출",s:"A2",u:"억$",v:658.5,p:491.5,ch:"+33.9%",g:"양호",t:"산소 배출",m:"국가 생산물의 해외 판매 총액. 경제의 산소 공급력과 같다",note:"역대 1월 최대. 반도체 205억$(+103%)",act:[{s:"🟢 600억$+",a:"수출 대형주 비중 유지",tg:"유지"},{s:"📈 3개월↑",a:"경기민감주 매수",tg:"매수 고려"},{s:"📉 전년비 10%↓",a:"수출주 축소",tg:"비중 축소"}],bs:{d:"산업생태계 전체 호흡 상태 진단",o:["관세청: 총액만"]}},
E2:{c:"E2",n:"수입",s:"A2",u:"억$",v:571.1,p:511.2,ch:"+11.7%",g:"양호",t:"산소 흡입",m:"원재료·에너지의 해외 구매 총액",note:"설비투자·원자재 증가",act:[{s:"🟢 설비수입↑",a:"건강한 성장",tg:"유지"},{s:"⚠️ 에너지 비중↑",a:"원가 부담",tg:"점검"}],bs:{d:"에너지 소모 vs 성장 투자 구분",o:["관세청: 품목별만"]}},
E3:{c:"E3",n:"무역수지",s:"A2",u:"억$",v:87.4,p:97.0,ch:"-9.6",g:"양호",t:"호흡 효율",m:"수출-수입 차이. 87억$ 흑자",note:"12개월 연속 흑자",act:[{s:"🟢 흑자 50억$+",a:"원화 안정",tg:"유지"},{s:"🔴 적자 전환",a:"원화 약세 가속",tg:"섹터 분화"}],bs:{d:"적자의 질(투자 vs 소비) 구분",o:["관세청: 금액만"]}},
E4:{c:"E4",n:"컨테이너물동량",s:"A2",u:"만TEU",v:142.3,p:138.5,ch:"+2.7%",g:"양호",t:"호흡수",m:"실물 교역의 물리적 규모",note:"부산항 물동량 전년비 증가",act:[{s:"🟢 물동량↑",a:"해운·물류주 긍정",tg:"유지"},{s:"📉 3개월↓",a:"수요 둔화 선행",tg:"비중 축소"}],bs:{d:"물동량과 실물경기 선행성 분석",o:["해양수산부: 항만별만"]}},
E5:{c:"E5",n:"유가(두바이)",s:"A2",u:"$/bbl",v:63.2,p:68.5,ch:"-7.7%",g:"양호",t:"산소 비용",m:"에너지 비용. 경제가 숨 쉬는 비용",note:"OPEC 공급 확대로 하락",act:[{s:"🟢 60~80$",a:"에너지 비용 안정",tg:"유지"},{s:"📈 100$+",a:"정유주 수혜, 항공 타격",tg:"섹터 교체"}],bs:{d:"경제 체력에 미치는 부담률 계산",o:["에너지공단: 국제가만"]}},
E6:{c:"E6",n:"수출증가율",s:"A2",u:"%",v:33.9,p:12.4,ch:"+21.5%p",g:"양호",t:"폐활량 변화",m:"수출 성장 모멘텀. +33.9%는 매우 강력",note:"반도체 호황 + 자동차·선박 동반",act:[{s:"🟢 5%+",a:"경기 확장 확인",tg:"비중 확대"},{s:"🔴 마이너스",a:"KOSPI 하락 압력",tg:"방어 전환"}],bs:{d:"3~6개월 수출 추세 진단",o:["관세청: 단월만"]}},
C1:{c:"C1",n:"소매판매",s:"A3",u:"%",v:1.2,p:-0.5,ch:"+1.7%p",g:"양호",t:"소화력",m:"국내 소비 활동의 직접 지표",note:"설 특수 일부. 내수 회복 미약",act:[{s:"🟢 +3%↑",a:"유통·소비재 긍정",tg:"유지"},{s:"📉 마이너스",a:"필수소비재 전환",tg:"방어 전환"}],bs:{d:"소비 체력 건강 상태 종합",o:["통계청: 업태별만"]}},
C2:{c:"C2",n:"소비자심리",s:"A3",u:"pt",v:92.4,p:91.8,ch:"+0.6",g:"주의",t:"식욕",m:"소비자가 느끼는 경기 체감도. 100 미만은 위축",note:"고물가·고환율·정치불확실성",act:[{s:"🟢 100+",a:"소비재 비중 유지",tg:"유지"},{s:"📉 90 이하",a:"재량소비 축소",tg:"비중 축소"}],bs:{d:"심리→행동 전환 시점 분석",o:["한국은행: 수치만"]}},
C3:{c:"C3",n:"카드매출",s:"A3",u:"조원",v:38.2,p:45.7,ch:"-16.4%",g:"주의",t:"식사량",m:"실제 소비 행동을 결제 데이터로 측정",note:"12월 연말 특수 반동",act:[{s:"🟢 전년비 증가",a:"결제 플랫폼주 긍정",tg:"유지"},{s:"📉 전년비 감소",a:"소비 경고",tg:"매도 고려"}],bs:{d:"국민 전체 소비 행위 진단",o:["여신금융: 총액만"]}},
C4:{c:"C4",n:"설비투자",s:"A3",u:"%",v:3.8,p:2.1,ch:"+1.7%p",g:"양호",t:"위장 수술",m:"기업의 미래 생산능력 투자",note:"반도체 CAPEX 중심. 비IT 부진",act:[{s:"🟢 +5%↑",a:"산업재·장비주 수혜",tg:"매수 고려"},{s:"📈 반도체 CAPEX",a:"장비·소재주 강세",tg:"사이클 매수"}],bs:{d:"투자의 질(혁신 vs 유지보수) 구분",o:["통계청: 증감률만"]}},
C5:{c:"C5",n:"민간소비",s:"A3",u:"%",v:1.6,p:1.3,ch:"+0.3%p",g:"주의",t:"흡수 효율",m:"가계의 소비 지출 증가율. GDP의 핵심",note:"금리 하락·재정 효과 기대",act:[{s:"🟢 2~4%",a:"내수 관련주 긍정",tg:"유지"},{s:"📉 마이너스",a:"GDP 둔화 확정",tg:"방어 전환"}],bs:{d:"과소비/절약 건강성 진단",o:["한국은행: GDP 기여도만"]}},
C6:{c:"C6",n:"서비스업생산",s:"A3",u:"%",v:1.8,p:1.5,ch:"+0.3%p",g:"양호",t:"유익균",m:"서비스 산업의 생산 증가율. GDP의 60%+",note:"IT·금융 견인, 대면 더딤",act:[{s:"🟢 +2%",a:"IT서비스·플랫폼 긍정",tg:"유지"},{s:"📉 마이너스",a:"고용 직결(70%)",tg:"고용 경고"}],bs:{d:"서비스 생태계 건강성 종합",o:["통계청: 업종별만"]}},
S1:{c:"S1",n:"BSI(기업경기)",s:"A4",u:"pt",v:88.5,p:86.2,ch:"+2.3",g:"주의",t:"자율신경",m:"기업인이 체감하는 경기 전망. 100 미만은 비관 우세",note:"수출 호조에도 내수 체감 괴리",act:[{s:"🟢 100+",a:"경기민감주 확대",tg:"비중 확대"},{s:"📉 80 이하",a:"방어주 전환",tg:"방어 전환"}],bs:{d:"산업별 체감 차이 분석",o:["한국은행: 수치만"]}},
S2:{c:"S2",n:"야간광량(위성)",s:"A4",u:"%",v:108.3,p:105.7,ch:"+2.5%p",g:"양호",t:"뇌파(EEG)",m:"위성이 촬영한 한반도 야간 광량. 경제 활동의 물리적 밝기",note:"Suomi NPP 매일 촬영. 산업단지 야간 가동 상승",act:[{s:"🟢 108%",a:"경제 각성 상태 확인",tg:"유지"},{s:"📈 산업단지↑",a:"반도체 장비·소재주 강세",tg:"매수 고려"},{s:"⚠️ 지방↓",a:"지방 중소형주 리스크",tg:"점검"}],bs:{d:"정부 통계보다 2개월 빠른 실시간 경제 활동 측정",o:["증권사: 야간 데이터 없음","한국은행: 2개월 지연","통계청: 조명 미수집"]}},
S3:{c:"S3",n:"경기선행지수",s:"A4",u:"pt",v:100.2,p:100.5,ch:"-0.3",g:"양호",t:"전두엽",m:"3~6개월 후 경기를 미리 보여주는 복합 지수",note:"수출 호조 유지, 내수 부진이 하방",act:[{s:"🟢 100+",a:"3~6개월 확장 → 선제 매수",tg:"선제 매수"},{s:"📉 3개월↓",a:"현금 비중 확대",tg:"사전 방어"}],bs:{d:"구성 지표 간 상충 시그널 해석",o:["통계청: 지수만"]}},
S4:{c:"S4",n:"정부지출",s:"A4",u:"%",v:4.2,p:3.8,ch:"+0.4%p",g:"양호",t:"아드레날린",m:"정부의 재정 집행 증가율",note:"확장 재정, 상반기 집중 집행",act:[{s:"🟢 +3~5%",a:"정부 수주 기업 안정",tg:"유지"},{s:"📈 10%+",a:"SOC·건설·방산 수혜",tg:"정부 수혜주"}],bs:{d:"지출의 경제 자극 효과",o:["기재부: 집행률만"]}},
S5:{c:"S5",n:"정책불확실성",s:"A4",u:"%",v:1.2,p:1.5,ch:"-0.3%p",g:"주의",t:"코르티솔",m:"정책 방향의 예측 불가능 정도",note:"미 관세·환율 불확실성",act:[{s:"🟢 0.5% 이하",a:"위험자산 양호",tg:"유지"},{s:"⚠️ 1%+",a:"옵션 헤지",tg:"헤지"},{s:"🔴 2%+",a:"현금 최대화",tg:"현금 대기"}],bs:{d:"불확실성 수준별 행동 가이드",o:["학계: 논문만"]}},
S6:{c:"S6",n:"경기동행지수",s:"A4",u:"pt",v:99.8,p:99.5,ch:"+0.3",g:"양호",t:"의식수준",m:"현재 경기 상태를 종합한 지수. 100이 기준선",note:"수출과 내수의 양극화",act:[{s:"🟢 100+",a:"기존 포지션 유지",tg:"유지"},{s:"📉 100 하회",a:"방어적 전환",tg:"방어 전환"}],bs:{d:"현재 경제 상태 종합",o:["통계청: 지수만"]}},
F1:{c:"F1",n:"신용스프레드",s:"A5",u:"%",v:0.62,p:0.58,ch:"+4bp",g:"양호",t:"백혈구",m:"회사채와 국채의 금리 차이. 시장의 공포 수준",note:"소폭 확대이나 정상",act:[{s:"🟢 0.5% 이하",a:"회사채 적기",tg:"유지"},{s:"⚠️ 1.5%↑",a:"국채 전환",tg:"안전자산"},{s:"🔴 3%+",a:"패닉",tg:"현금 대기"}],bs:{d:"금융 공포 수준 진단",o:["금감원: 수치만"]}},
F2:{c:"F2",n:"CD-국고채 스프레드",s:"A5",u:"%p",v:0.45,p:0.42,ch:"+3bp",g:"양호",t:"피부(1차 방어)",m:"단기 자금시장의 건전성 지표",note:"정상 범위",act:[{s:"🟢 0.3% 이하",a:"MMF·RP 정상",tg:"유지"},{s:"🔴 1%+",a:"자금시장 경색",tg:"긴급 전환"}],bs:{d:"1차 방어선 돌파 시 전이 경로",o:["금감원: 모니터링만"]}},
F3:{c:"F3",n:"KOSPI",s:"A5",u:"pt",v:5302,p:4615,ch:"+14.9%",g:"양호",t:"체력 점수",m:"한국 대표 주가지수. 경제 면역력의 종합 점수",note:"사상 최고치. 반도체·AI·방산",act:[{s:"🟢 상승 추세",a:"업종 로테이션",tg:"유지"},{s:"📉 -10%",a:"우량주 저점 매수",tg:"저점 매수"},{s:"🔴 -20%",a:"현금 확대, 분할 매수",tg:"분할 매수"}],bs:{d:"주가 상승의 원천과 취약점",o:["거래소: 가격만"]}},
F4:{c:"F4",n:"V-KOSPI(변동성)",s:"A5",u:"pt",v:22.5,p:18.3,ch:"+4.2",g:"양호",t:"알레르기",m:"KOSPI 옵션의 내재변동성. 시장 공포지수",note:"AI 버블론 이후 확대",act:[{s:"🟢 15 이하",a:"안정적 적립식",tg:"유지"},{s:"⚠️ 25↑",a:"리스크 헤지",tg:"헤지"},{s:"🔴 35↑",a:"역발상 기회+리스크",tg:"역발상"}],bs:{d:"과민 반응 원인·지속 기간",o:["거래소: 수치만"]}},
F5:{c:"F5",n:"연체율(금융)",s:"A5",u:"%",v:0.85,p:0.82,ch:"+3bp",g:"양호",t:"감염률",m:"대출금 상환 연체 비율. 부실 확산의 초기 신호",note:"자영업·다중채무자 소폭 상승",act:[{s:"🟢 1% 이하",a:"금융주 안정",tg:"유지"},{s:"⚠️ 2%+",a:"은행 충당금 증가",tg:"점검"},{s:"🔴 3%+",a:"금융주 매도",tg:"매도"}],bs:{d:"산업·지역별 부실 확산 경로",o:["금감원: 은행별만"]}},
F6:{c:"F6",n:"회사채스프레드",s:"A5",u:"%p",v:0.55,p:0.52,ch:"+3bp",g:"양호",t:"저항력",m:"기업 자금조달 비용 프리미엄",note:"양호. 기업 자금조달 안정",act:[{s:"🟢 0.5% 이하",a:"회사채 적기",tg:"유지"},{s:"🔴 2%+",a:"국채만 보유",tg:"국채 전환"}],bs:{d:"업종·규모별 신용 차이",o:["금감원: 등급별만"]}},
F7:{c:"F7",n:"KOSDAQ",s:"A5",u:"pt",v:1128,p:980,ch:"+15.1%",g:"양호",t:"T세포",m:"기술·혁신 기업 주가지수. 미래 성장력",note:"바이오·AI 성장주 랠리",act:[{s:"🟢 상승",a:"바이오·IT·게임 유지",tg:"유지"},{s:"📉 부진",a:"대형주 전환",tg:"대형주 전환"}],bs:{d:"국가 혁신 생태계 진단",o:["거래소: 가격만"]}},
P1:{c:"P1",n:"CPI(소비자물가)",s:"A6",u:"%",v:2.0,p:2.3,ch:"-0.3%p",g:"양호",t:"갑상선",m:"소비자가 체감하는 물가 상승률. 한은 목표 2.0% 정확 부합",note:"유류비·기저효과",act:[{s:"🟢 2~3%",a:"주식·채권 균형",tg:"유지"},{s:"📈 4%+",a:"원자재·TIPS",tg:"인플레 헤지"},{s:"📉 0%",a:"장기채, 성장주 회피",tg:"디플레 대비"}],bs:{d:"경제 물가 균형 종합",o:["통계청: 품목별만"]}},
P2:{c:"P2",n:"PPI(생산자물가)",s:"A6",u:"%",v:1.5,p:1.8,ch:"-0.3%p",g:"양호",t:"코르티솔",m:"기업이 받는 원가 부담 변화율",note:"원자재 안정. 마진 완화",act:[{s:"🟢 안정",a:"기업 마진 안정",tg:"유지"},{s:"📈 PPI>CPI",a:"마진 압박",tg:"선별 매수"}],bs:{d:"PPI→CPI 전이 시차 예측",o:["한국은행: PPI만"]}},
P3:{c:"P3",n:"국세수입",s:"A6",u:"%",v:-5.2,p:-8.1,ch:"+2.9%p",g:"주의",t:"인슐린",m:"정부 세금 수입 변화율. 경제활동의 재정 반영",note:"결손 지속이나 감소세",act:[{s:"🟢 증가",a:"재정 건전, 국채금리 안정",tg:"유지"},{s:"📉 급감",a:"국채↑ 금리↑",tg:"채권 주의"}],bs:{d:"세수와 경기 선행성 연결",o:["기재부: 징수만"]}},
P4:{c:"P4",n:"국가채무비율",s:"A6",u:"%GDP",v:52.3,p:51.8,ch:"+0.5%p",g:"주의",t:"비만도(BMI)",m:"GDP 대비 국가 부채. 적당한 부채는 성장 동력",note:"52.3%. 증가 속도 경계",act:[{s:"🟢 50% 이하",a:"재정 여력 충분",tg:"유지"},{s:"⚠️ 50~60%",a:"장기 국채 리스크",tg:"장기채 주의"},{s:"🔴 60%+",a:"신용등급 하향",tg:"분산 필요"}],bs:{d:"채무의 질(생산적 vs 소모적) 구분",o:["기재부: 비율만"]}},
P5:{c:"P5",n:"재정수지",s:"A6",u:"%GDP",v:-2.8,p:-3.2,ch:"+0.4%p",g:"주의",t:"호르몬 수지",m:"정부 수입-지출 차이. 적자 축소 추세",note:"적자 축소 중이나 여전히 적자",act:[{s:"🟢 균형/흑자",a:"시장 신뢰",tg:"유지"},{s:"⚠️ -3%+",a:"국채↑ 금리↑",tg:"단기채 전환"}],bs:{d:"구조적 vs 경기적 적자 구분",o:["기재부: 관리재정만"]}},
P6:{c:"P6",n:"근원물가",s:"A6",u:"%",v:2.0,p:2.1,ch:"-0.1%p",g:"양호",t:"기초대사율",m:"식품·에너지 제외한 기본 물가 추세",note:"한은 목표 일치. 서비스물가 둔화",act:[{s:"🟢 2%",a:"금리 안정 지속",tg:"유지"},{s:"📈 3%+",a:"구조적 인플레",tg:"구조적 헤지"}],bs:{d:"CPI와 괴리의 의미",o:["통계청: 수치만"]}},
O1:{c:"O1",n:"산업생산",s:"A7",u:"%",v:2.5,p:1.8,ch:"+0.7%p",g:"양호",t:"근력",m:"전 산업의 생산 활동 증가율",note:"반도체 중심. 비IT 부진",act:[{s:"🟢 +3%↑",a:"산업재 비중 유지",tg:"유지"},{s:"📉 3개월↓",a:"제조업 축소",tg:"비중 축소"}],bs:{d:"전체 산업 생산력 종합",o:["통계청: 광업·제조업만"]}},
O2:{c:"O2",n:"PMI(제조업)",s:"A7",u:"pt",v:51.2,p:50.8,ch:"+0.4",g:"양호",t:"무릎 반사",m:"구매관리자지수. 50 이상이면 확장",note:"확장이나 모멘텀 약함",act:[{s:"🟢 52↑",a:"산업재·원자재 긍정",tg:"유지"},{s:"⚠️ 50 하회",a:"제조업 수축",tg:"비중 축소"}],bs:{d:"하위 5개 지수 조합 패턴",o:["S&P Global: 수치만"]}},
O3:{c:"O3",n:"건설기성",s:"A7",u:"%",v:-3.2,p:-4.5,ch:"+1.3%p",g:"주의",t:"골밀도",m:"건설 공사 실적 증가율. 인프라 투자의 척도",note:"PF 부실·미분양으로 부진",act:[{s:"🟢 +3~5%",a:"건설·시멘트·철강 안정",tg:"유지"},{s:"📉 감소",a:"건설주 실적 악화",tg:"비중 축소"}],bs:{d:"건설 산업 건전성",o:["통계청: 기성액만"]}},
O4:{c:"O4",n:"제조업생산",s:"A7",u:"%",v:4.8,p:3.2,ch:"+1.6%p",g:"양호",t:"골격근",m:"제조업 부문 생산 증가율",note:"반도체·자동차 주도",act:[{s:"🟢 생산↑",a:"수출 경쟁력 확인",tg:"유지"},{s:"📉 3개월↓",a:"수출 둔화 예고",tg:"내수 전환"}],bs:{d:"제조업 균형",o:["통계청: 업종별만"]}},
O5:{c:"O5",n:"서비스업생산",s:"A7",u:"%",v:1.8,p:1.5,ch:"+0.3%p",g:"양호",t:"평활근",m:"서비스 부문 생산 증가율",note:"IT·금융 견인",act:[{s:"🟢 +2%↑",a:"IT서비스·물류 긍정",tg:"유지"}],bs:{d:"서비스 산업 지구력",o:["통계청: 업종별만"]}},
O6:{c:"O6",n:"소비증감(YoY)",s:"A7",u:"%",v:1.2,p:0.8,ch:"+0.4%p",g:"주의",t:"근지구력",m:"전년 대비 소비 변화율",note:"물가 감안 실질 소비 제자리",act:[{s:"🟢 +3%↑",a:"소비재 중장기 긍정",tg:"유지"},{s:"📉 마이너스",a:"소비주 매도",tg:"필수재 전환"}],bs:{d:"소비 구조 변화",o:["통계청: 수치만"]}},
M1:{c:"M1",n:"제조업가동률",s:"A7",u:"%",v:73.5,p:72.1,ch:"+1.4%p",g:"양호",t:"근육 가동률",m:"설비 대비 실제 생산 비율. 경제의 가동 수준",note:"반도체·자동차 가동 상승",act:[{s:"🟢 75%+",a:"산업재 활황",tg:"유지"},{s:"📉 65% 하회",a:"과잉 설비",tg:"비중 축소"},{s:"📈 80%+",a:"CAPEX 확대 기대",tg:"장비주 매수"}],bs:{d:"산업별 가동 지도",o:["통계청: 월 1회"]}},
M2_G:{c:"M2_G",n:"제조업재고율",s:"A7",u:"%",v:115.2,p:118.5,ch:"-3.3%p",g:"주의",t:"재고 비축",m:"출하 대비 재고 비율. 높으면 수요 부진 신호",note:"재고율 하락은 긍정이나 여전히 높음",act:[{s:"🟢 100% 이하",a:"수급 균형",tg:"유지"},{s:"⚠️ 110%+",a:"수요 부진, 감산 우려",tg:"점검"}],bs:{d:"재고 해소 속도와 경기 선행성",o:["통계청: 비율만"]}},
M3_G:{c:"M3_G",n:"신규수주증감",s:"A7",u:"%",v:2.8,p:-1.2,ch:"+4.0%p",g:"양호",t:"성장 신호",m:"새로운 주문 증가율. 미래 생산의 선행 지표",note:"반도체·방산 중심 수주 증가",act:[{s:"🟢 +5%↑",a:"산업재 장기 긍정",tg:"비중 확대"},{s:"📉 3개월↓",a:"생산 감소 선행",tg:"비중 축소"}],bs:{d:"수주잔고 대비 생산 전환율",o:["통계청: 월 1회"]}},
D1:{c:"D1",n:"합계출산율",s:"A8",u:"명",v:0.68,p:0.72,ch:"-0.04",g:"경보",t:"세포분열",m:"여성 1명이 평생 낳는 평균 자녀 수. OECD 최저",note:"인구 소멸 궤도",act:[{s:"🔴 0.7 이하",a:"실버·헬스케어·로봇 장기",tg:"구조적 전환"},{s:"📉 하락 지속",a:"해외 매출 높은 기업",tg:"글로벌 기업"}],bs:{d:"경제·산업·재정 연쇄 영향",o:["통계청: 수치만"]}},
D2:{c:"D2",n:"고령화율",s:"A8",u:"%",v:19.8,p:19.2,ch:"+0.6%p",g:"주의",t:"세포 노화",m:"65세 이상 인구 비율. 20% = 초고령사회",note:"2025년 초고령사회 진입 임박",act:[{s:"⚠️ 20%+",a:"헬스케어·로봇 장기",tg:"장기 매수"}],bs:{d:"부양 부담·의료비·연금 연쇄",o:["통계청: 비율만"]}},
D3:{c:"D3",n:"생산가능인구",s:"A8",u:"만명",v:3520,p:3550,ch:"-30만명",g:"경보",t:"줄기세포",m:"15~64세 경제활동 가능 인구. 연 30만 감소",note:"노동력 부족 구조화",act:[{s:"🔴 연 30만↓",a:"자동화·AI 필수 투자",tg:"구조적 전환"}],bs:{d:"질적 변화(고학력화·기술) 반영",o:["통계청: 총수만"]}},
L1:{c:"L1",n:"고용률",s:"A8",u:"%",v:61.2,p:61.5,ch:"-0.3%p",g:"양호",t:"활성률",m:"15세 이상 인구 중 취업자 비율",note:"1월 +10.8만명",act:[{s:"🟢 62%+",a:"소비 기반 튼튼",tg:"유지"},{s:"📉 하락",a:"소비 위축 선행",tg:"비중 축소"}],bs:{d:"고용의 질 구분",o:["통계청: 비율만"]}},
L2:{c:"L2",n:"실업률",s:"A8",u:"%",v:3.2,p:2.8,ch:"+0.4%p",g:"양호",t:"사멸률",m:"경제활동인구 중 실업자 비율",note:"계절적 상승. 청년 '쉬었음' 증가",act:[{s:"🟢 3% 이하",a:"노동시장 건전",tg:"유지"},{s:"⚠️ 4%+",a:"소비 둔화 예상",tg:"방어 전환"}],bs:{d:"체감실업률 괴리 분석",o:["통계청: 좁은 정의"]}},
L3:{c:"L3",n:"가계부채",s:"A8",u:"조원",v:1905,p:1895,ch:"+10조원",g:"경보",t:"체지방률",m:"가계 총 대출 잔액. GDP 100%+ 수준",note:"금리 민감성 극대화",act:[{s:"⚠️ GDP 100%+",a:"금리↑ 시 폭탄",tg:"리스크 경계"},{s:"📈 증가 가속",a:"부동산 과열 고점",tg:"고점 경계"}],bs:{d:"부채 질과 상환능력 연동",o:["한국은행: 총액만"]}},
L4:{c:"L4",n:"가계연체율",s:"A8",u:"%",v:0.65,p:0.62,ch:"+3bp",g:"양호",t:"괴사율",m:"가계 대출 연체 비율. 상환 실패의 초기 지표",note:"자영업·다중채무자 상승 초기",act:[{s:"🟢 0.5% 이하",a:"가계 건전",tg:"유지"},{s:"⚠️ 1%+",a:"은행 충당금+소비 위축",tg:"이중 주의"}],bs:{d:"가계→자영업→은행 전이",o:["금감원: 수치만"]}},
R1:{c:"R1",n:"주택가격",s:"A9",u:"%",v:1.8,p:2.5,ch:"-0.7%p",g:"양호",t:"피부 탄력",m:"전국 주택매매가격 변동률",note:"서울 소폭 상승, 지방 하락",act:[{s:"🟢 +2~3%",a:"건설·건자재 안정",tg:"유지"},{s:"📈 +10%",a:"규제 임박",tg:"고점 경계"},{s:"📉 마이너스",a:"PF·금융 연쇄",tg:"비중 축소"}],bs:{d:"버블 vs 정상 성장 진단",o:["부동산원: 지수만"]}},
R2:{c:"R2",n:"미분양주택",s:"A9",u:"호",v:72500,p:68200,ch:"+4,300",g:"주의",t:"각질",m:"팔리지 않은 신규 주택 수. 7.25만호 = 경고선",note:"지방·비수도권 적체",act:[{s:"🟢 3만 이하",a:"건설주 안정",tg:"유지"},{s:"⚠️ 5만↑",a:"PF 부실",tg:"건설 점검"},{s:"🔴 7만↑",a:"건설·금융 연쇄",tg:"회피"}],bs:{d:"지역별 부동산 위험 심각도",o:["국토부: 총호수만"]}},
R5:{c:"R5",n:"해수면상승(SAR)",s:"A9",u:"mm/yr",v:3.2,p:3.1,ch:"+0.1",g:"주의",t:"부종",m:"Sentinel-1 SAR 위성이 12일 주기로 관측하는 해안선 변위",note:"36년 누적 11.5cm 상승",act:[{s:"🟡 3.2mm/yr",a:"해안 인프라·방재 관련주 관심",tg:"장기 관심"},{s:"🔴 8mm/yr 지역",a:"해안 부동산 리스크",tg:"리스크 회피"}],bs:{d:"mm 단위 침수 리스크를 위성이 직접 측정",o:["기상청: 전국 평균만","증권사: 분석 자체 없음"]}},
R6:{c:"R6",n:"도시열섬(열적외선)",s:"A9",u:"지수",v:82.5,p:78.3,ch:"+4.2",g:"양호",t:"체온",m:"Landsat-9 열적외선이 촬영한 도심 표면 온도. 경제활동 강도 반영",note:"겨울 82.5 = 정상 수준",act:[{s:"🟢 겨울 82.5",a:"에너지 소비 정상",tg:"유지"},{s:"📉 급락(60↓)",a:"제조업 정지 신호",tg:"경계"}],bs:{d:"위성 촬영 열지도를 경제활동으로 변환",o:["기상청: 기온만","환경부: 정책만"]}},
G1:{c:"G1",n:"FDI(외국인직접투자)",s:"A9",u:"억$",v:12.5,p:10.8,ch:"+15.7%",g:"양호",t:"외부 영양",m:"외국인이 국내에 직접 투자한 금액",note:"AI·반도체·바이오 분야 유입",act:[{s:"🟢 증가",a:"산업단지 관련주 긍정",tg:"유지"},{s:"📈 특정 산업 급증",a:"관련 국내 기업 수혜",tg:"테마 주목"}],bs:{d:"FDI가 산업 생태계에 미치는 효과",o:["산업부: 투자액만"]}},
G6:{c:"G6",n:"PM2.5(대기질·위성)",s:"A9",u:"㎍/m³",v:32.4,p:24.1,ch:"+34.4%",g:"주의",t:"콜레스테롤",m:"Sentinel-5P가 매일 관측하는 대기 에어로졸. 산업배출 + 건강비용",note:"서울 AQI 155 관측",act:[{s:"🟡 32.4㎍/m³",a:"공기청정기·마스크주 단기",tg:"단기 매수"},{s:"📊 50↑",a:"환경 테마주 정책 모멘텀",tg:"테마 주목"}],bs:{d:"위성 관측 산업배출량과 경제 구조의 관계",o:["에어코리아: 지상관측만","WHO: 건강 경고만"]}}
};

// ── 9 SYSTEMS (i18n 키 기반 다국어) ──
const SYS={
  A1:{tK:"A1",icon:"❤️",g:"양호",sc:72,keys:["I1","I2","I3","I4","I5","I6"],color:"#ff4d6a"},
  A2:{tK:"A2",icon:"🫁",g:"양호",sc:85,keys:["E1","E2","E3","E4","E5","E6"],color:"#3b82f6"},
  A3:{tK:"A3",icon:"🛒",g:"주의",sc:58,keys:["C1","C2","C3","C4","C5","C6"],color:"#f0b429"},
  A4:{tK:"A4",icon:"🧠",g:"양호",sc:71,keys:["S1","S2","S3","S4","S5","S6"],color:"#8b5cf6"},
  A5:{tK:"A5",icon:"🛡️",g:"양호",sc:75,keys:["F1","F2","F3","F4","F5","F6","F7"],color:"#10b981"},
  A6:{tK:"A6",icon:"💊",g:"양호",sc:70,keys:["P1","P2","P3","P4","P5","P6"],color:"#ec4899"},
  A7:{tK:"A7",icon:"🏭",g:"주의",sc:60,keys:["M1","M2_G","M3_G","O1","O2","O3","O4","O5","O6"],color:"#f97316"},
  A8:{tK:"A8",icon:"👥",g:"경보",sc:35,keys:["D1","D2","D3","L1","L2","L3","L4"],color:"#dc2626"},
  A9:{tK:"A9",icon:"🌍",g:"주의",sc:55,keys:["R1","R2","R5","R6","G1","G6"],color:"#0ea5e9"}
};
// 헬퍼: SYS 렌더 시 다국어 이름/바디/메타 조회
const sysN=(k,L)=>t('sys'+k+'n',L);
const sysB=(k,L)=>t('sys'+k+'b',L);
const sysM=(k,L)=>t('sys'+k+'m',L);
// 게이지 이름 다국어: gN('I1','ja') → '基準金利'
const gN=(code,L)=>t('g'+code,L);

// ═══ LANG SELECTOR ═══
function LangSelector({lang,setLang}){
  const [open,setOpen]=useState(false);
  const cur=LANG_LIST.find(function(l){return l.code===lang;})||LANG_LIST[0];
  const ref=useRef(null);
  useEffect(function(){
    function close(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false);}
    document.addEventListener('mousedown',close);
    return function(){document.removeEventListener('mousedown',close);};
  },[]);
  return(
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={function(){setOpen(!open);}} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",borderRadius:8,border:"1px solid "+T.border,background:T.surface+"80",color:T.text,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
        {cur.flag} {cur.code.toUpperCase()} <span style={{fontSize:8,opacity:0.6}}>▼</span>
      </button>
      {open&&<div style={{position:"absolute",top:"100%",right:0,marginTop:4,width:180,maxHeight:320,overflowY:"auto",background:T.bg1,border:"1px solid "+T.border,borderRadius:10,boxShadow:"0 8px 32px rgba(0,0,0,.5)",zIndex:500,padding:4}}>
        {LANG_LIST.map(function(l){return(
          <button key={l.code} onClick={function(){setLang(l.code);setOpen(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",border:"none",borderRadius:6,background:l.code===lang?T.accent+"15":"transparent",color:l.code===lang?T.accent:T.text,fontSize:11,fontWeight:l.code===lang?700:400,cursor:"pointer",textAlign:"left"}}>{l.flag} {l.name}</button>
        );})}
      </div>}
    </div>
  );
}

// ═══ COMPONENTS ═══

function SatBadge({code}){
  const s=SAT_META[code]; if(!s) return null;
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",borderRadius:20,background:`linear-gradient(135deg,${T.sat}15,${T.sat}08)`,color:T.sat,fontSize:9,fontWeight:700,border:`1px solid ${T.sat}40`,letterSpacing:.3}}>{s.icon} {s.sat}</span>;
}

function SatXrefBanner({code,lang}){
  const L=lang||'ko';
  const x=SAT_XREF[code],tp=TP[code];
  if(!x||isSat(code)||!tp) return null;
  const ld=LEAD[tp.ld],evs=EV_STYLE[tp.ev];
  return(
    <div style={{background:`linear-gradient(135deg,${T.sat}08,${T.sat}04)`,borderRadius:T.smRadius,padding:14,marginTop:10,border:`1px solid ${T.sat}30`}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,flexWrap:"wrap"}}>
        <span style={{fontSize:13}}>🛰️</span>
        <span style={{fontSize:11,fontWeight:700,color:T.sat}}>{t('satEarlyDetect',L)}</span>
        <span style={{fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:6,background:ld.color+"18",color:ld.color,marginLeft:"auto"}}>{ld.emoji} {tp.rng} {t('satStatBefore',L)}</span>
      </div>
      <div style={{fontSize:10,color:T.textMid,lineHeight:1.7,marginBottom:10,padding:"8px 12px",background:`${T.sat}08`,borderRadius:6,borderLeft:`3px solid ${T.sat}`}}>{tp.lk}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div style={{background:`${T.good}08`,borderRadius:6,padding:"10px 12px",border:`1px solid ${T.good}20`}}>
          <div style={{fontSize:9,fontWeight:700,color:T.good,marginBottom:4}}>{t('satPastVerify',L)}</div>
          <div style={{fontSize:10,color:T.textMid,lineHeight:1.5}}>📡 {x.past?.sat}</div>
          <div style={{fontSize:10,color:T.text,lineHeight:1.5,marginTop:2}}>✅ {x.past?.result}</div>
        </div>
        <div style={{background:`${T.warn}08`,borderRadius:6,padding:"10px 12px",border:`1px solid ${T.warn}20`}}>
          <div style={{fontSize:9,fontWeight:700,color:T.warn,marginBottom:4}}>{t('satFutureHint',L)}</div>
          <div style={{fontSize:10,color:T.textMid,lineHeight:1.5}}>📡 {x.now?.sat}</div>
          <div style={{fontSize:10,color:"#fde68a",lineHeight:1.5,fontWeight:600,marginTop:2}}>📊 {x.now?.predict}</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,padding:"5px 10px",background:`${T.bg1}80`,borderRadius:6}}>
        <span style={{fontSize:8,fontWeight:700,padding:"1px 6px",borderRadius:4,background:evs.color+"18",color:evs.color}}>{t('satEvidence',L)} {evs.label}</span>
        <span style={{fontSize:9,color:T.textDim}}>{evs.desc}</span>
      </div>
    </div>
  );
}

/* ═══ SATELLITE EVIDENCE — 공통 컴포넌트 6개 ═══ */
function SparkLine({data,c,w=120,h=28}){
  const mx=Math.max(...data),mn=Math.min(...data),rg=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rg)*(h-4)-2}`).join(" ");
  const last=pts.split(" ").pop().split(",");
  return(<svg width={w} height={h} style={{display:"block"}}>
    <polyline points={pts} fill="none" stroke={c} strokeWidth={1.5} style={{filter:`drop-shadow(0 0 2px ${c}44)`}}/>
    <circle cx={parseFloat(last[0])} cy={parseFloat(last[1])} r={2} fill={c} style={{filter:`drop-shadow(0 0 3px ${c})`}}/>
  </svg>);
}
function SatCompare({before:bf,after:af,sensor,product,coord,radius,unit,color}){
  return(<div style={{display:"flex",gap:6}}>
    {[{lb:bf.date,val:bf.val,ac:T.textDim,bd:T.border,ds:"수집 후 표시"},
      {lb:af.date,val:af.val,ac:color||T.accent,bd:(color||T.accent)+"40",ds:"최신 촬영분"}].map((s,i)=>(
      <div key={i} style={{flex:1}}>
        <div style={{fontSize:8,color:s.ac,fontFamily:"monospace",marginBottom:4,textAlign:"center",fontWeight:i?600:400}}>{i?"오늘 · ":"30일 전 · "}{s.lb}</div>
        <div style={{width:"100%",aspectRatio:"1",borderRadius:6,border:`1px solid ${s.bd}`,overflow:"hidden",position:"relative",
          background:"linear-gradient(135deg,#0a1628,#0d1f3c)",boxShadow:i?`0 0 8px ${(color||T.accent)}15`:"none"}}>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
            <div style={{fontSize:28,marginBottom:4}}>🛰️</div>
            <div style={{fontSize:8,color:s.ac,fontFamily:"monospace",textAlign:"center",padding:"0 8px",lineHeight:1.4}}>{sensor}<br/>{product}<br/>{s.ds}</div>
          </div>
          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"4px 6px",background:"rgba(0,0,0,0.7)"}}>
            <div style={{fontSize:7,fontFamily:"monospace",color:s.ac}}>{coord} · {radius}</div>
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:4}}>
          <span style={{fontSize:12,fontFamily:"monospace",fontWeight:700,color:i?(color||T.accent):"#fff"}}>{s.val}</span>
          <span style={{fontSize:8,color:T.textDim,fontFamily:"monospace"}}> {unit}</span>
        </div>
      </div>
    ))}
  </div>);
}
function EvPkg({ev}){
  return(<div style={{marginTop:8,padding:"6px 8px",borderRadius:4,background:T.bg0,border:`1px solid ${T.border}`}}>
    <div style={{fontSize:8,fontWeight:600,color:"#ccc",marginBottom:3}}>📎 증거 패키지</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
      <div style={{fontSize:6,color:T.textDim,fontFamily:"monospace",lineHeight:1.5}}>출처: {ev.source}<br/>센서: {ev.sensor}<br/>제품: {ev.product}<br/>해상도: {ev.resolution}</div>
      <div style={{fontSize:6,color:T.textDim,fontFamily:"monospace",lineHeight:1.5}}>처리: {ev.process}<br/>크롭: {ev.crop}<br/>해시: {ev.hash}<br/>결측: {ev.missing}</div>
    </div>
    <div style={{display:"flex",gap:4,marginTop:4}}>
      {ev.qg.map((g,i)=>(<div key={i} style={{flex:1,textAlign:"center",padding:"2px 0",borderRadius:2,
        background:g.ok?`${T.good}10`:`${T.danger}10`,border:`1px solid ${g.ok?T.good:T.danger}20`}}>
        <span style={{fontSize:6,fontFamily:"monospace",color:g.ok?T.good:T.danger}}>{g.ok?"✓":"✗"} {g.l}</span>
      </div>))}
    </div>
  </div>);
}
function BtPanel({entries}){
  return(<div style={{background:T.surface,borderRadius:T.smRadius,padding:10,border:`1px solid ${T.border}`,marginTop:8}}>
    <div style={{fontSize:10,fontWeight:700,color:T.text,marginBottom:6}}>🔬 반복 검증</div>
    {entries.map((b,i)=>(<div key={i} style={{padding:6,borderRadius:4,background:T.bg0,border:`1px solid ${T.border}`,marginBottom:i<entries.length-1?4:0}}>
      <div style={{fontSize:9,color:T.accent,fontWeight:600,marginBottom:3}}>{b.signal}</div>
      <div style={{display:"flex",gap:8}}>
        <div><div style={{fontSize:7,color:T.textDim}}>표본</div><div style={{fontSize:10,fontFamily:"monospace",fontWeight:700,color:T.text}}>N={b.n}</div></div>
        <div><div style={{fontSize:7,color:T.textDim}}>적중</div><div style={{fontSize:10,fontFamily:"monospace",fontWeight:700,color:T.good}}>{b.hit}/{b.n} ({Math.round(b.hit/b.n*100)}%)</div></div>
        <div><div style={{fontSize:7,color:T.textDim}}>리드타임</div><div style={{fontSize:10,fontFamily:"monospace",fontWeight:700,color:T.warn}}>{b.median}</div><div style={{fontSize:7,color:T.textDim}}>IQR {b.iqr}</div></div>
      </div>
    </div>))}
  </div>);
}
function LtPanel({layers}){
  return(<div style={{background:T.surface,borderRadius:T.smRadius,padding:10,border:`1px solid ${T.border}`,marginTop:8}}>
    <div style={{fontSize:10,fontWeight:700,color:T.text,marginBottom:6}}>⏱️ 위성→지표 리드타임</div>
    {layers.map((l,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",
      borderBottom:i<layers.length-1?`1px solid ${T.border}`:"none"}}>
      <span style={{fontSize:9,width:48,flexShrink:0}}>{l.icon} {l.layer}</span>
      <div style={{flex:1}}><div style={{position:"relative",height:8,background:T.border,borderRadius:4}}>
        <div style={{position:"absolute",height:"100%",left:`${(parseInt(l.iqr)/100)*100}%`,
          width:`${((parseInt(l.iqr.split("~")[1])-parseInt(l.iqr))/100)*100}%`,background:`${T.accent}30`,borderRadius:3}}/>
        <div style={{position:"absolute",top:0,width:8,height:8,borderRadius:4,background:T.accent,
          left:`${(parseInt(l.median)/100)*100}%`,transform:"translateX(-50%)",boxShadow:`0 0 4px ${T.accent}66`}}/>
      </div></div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontSize:8,fontFamily:"monospace",color:T.accent,fontWeight:700}}>중앙 {l.median}</div>
        <div style={{fontSize:6,color:T.textDim,fontFamily:"monospace"}}>N={l.n}</div>
      </div>
    </div>))}
  </div>);
}
function SatEvidencePanel({data:d}){
  const chg=d.after.raw&&d.before.raw?((d.after.raw-d.before.raw)/d.before.raw*100).toFixed(0):0;
  const isUp=chg>0;
  return(<div style={{marginTop:10}}>
    <div style={{background:`linear-gradient(135deg,${T.sat}08,${T.sat}04)`,borderRadius:T.smRadius,padding:12,border:`1px solid ${T.sat}30`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:10,fontWeight:700,color:T.sat}}>🛰️ 위성 물리 증거</span>
        <span style={{fontSize:7,fontFamily:"monospace",padding:"2px 6px",borderRadius:3,
          background:`${isUp?T.good:T.danger}15`,color:isUp?T.good:T.danger,fontWeight:700}}>{isUp?"▲":"▼"}{Math.abs(chg)}%</span>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:8,overflowX:"auto"}}>
        {d.layers.map((l,i)=>(<button key={i} style={{padding:"3px 7px",borderRadius:4,border:`1px solid ${i===0?T.accent:T.border}`,
          background:i===0?`${T.accent}15`:"transparent",color:i===0?T.accent:T.textDim,fontSize:8,
          fontFamily:"monospace",cursor:"pointer",whiteSpace:"nowrap",fontWeight:i===0?600:400}}>{l}</button>))}
      </div>
      <SatCompare before={d.before} after={d.after} sensor={d.sensor} product={d.product} coord={d.coord} radius={d.radius} unit={d.unit} color={d.color}/>
      {d.coverage&&<div style={{marginTop:6,padding:"4px 8px",borderRadius:3,background:`${T.warn}10`,border:`1px solid ${T.warn}20`}}>
        <span style={{fontSize:7,color:T.warn,fontFamily:"monospace"}}>⚠ 커버리지: {d.coverage}</span>
      </div>}
      <EvPkg ev={d.ev}/>
    </div>
    <div style={{background:T.surface,borderRadius:T.smRadius,padding:10,border:`1px solid ${T.border}`,marginTop:8}}>
      <div style={{fontSize:10,fontWeight:700,color:T.text,marginBottom:6}}>📈 30일 추세</div>
      <div style={{display:"flex",gap:14}}>
        {d.trends.map((tr,i)=>(<div key={i}>
          <div style={{fontSize:7,color:tr.color,fontFamily:"monospace",marginBottom:2}}>{tr.label}</div>
          <SparkLine data={tr.data} c={tr.color}/>
          <div style={{fontSize:7,color:tr.change>0?T.good:T.danger,fontFamily:"monospace"}}>{tr.change>0?"▲":"▼"}{Math.abs(tr.change)}%</div>
        </div>))}
      </div>
    </div>
    <BtPanel entries={d.bt}/>
    <LtPanel layers={d.lt}/>
    {/* 신뢰 + 가치 */}
    <div style={{background:T.surface,borderRadius:T.smRadius,padding:12,border:`1px solid ${T.sat}30`,marginTop:8}}>
      <div style={{textAlign:"center",fontSize:10,color:"#ddd",lineHeight:1.6,marginBottom:10,fontWeight:600}}>
        "이 데이터는 통계를 해석하는 것이 아니라,<br/>물리를 통해 통계의 시간을 앞당깁니다."
      </div>
      <div style={{display:"flex",gap:8}}>
        <div style={{flex:1,padding:8,borderRadius:6,background:T.bg0,border:`1px solid ${T.accent}25`}}>
          <div style={{fontSize:9,fontWeight:700,color:T.accent,marginBottom:4}}>📡 과거 신호 → 오늘 결과</div>
          <div style={{fontSize:8,color:"#ccc",lineHeight:1.5,marginBottom:6}}>{d.trust||"과거 위성 변화와 후행 통계 일치 확인."}</div>
          <div style={{padding:"3px 6px",borderRadius:3,background:`${T.accent}10`,textAlign:"center"}}>
            <span style={{fontSize:8,color:T.accent,fontFamily:"monospace",fontWeight:700}}>"이 계기판은 정확하다" = 신뢰</span>
          </div>
        </div>
        <div style={{flex:1,padding:8,borderRadius:6,background:T.bg0,border:`1px solid ${T.warn}25`}}>
          <div style={{fontSize:9,fontWeight:700,color:T.warn,marginBottom:4}}>🔎 선행 신호 추적 중</div>
          <div style={{fontSize:8,color:"#ccc",lineHeight:1.5,marginBottom:6}}>{d.value||"현재 위성 변화가 유사 구간 후행 분포에 해당."}</div>
          <div style={{padding:"3px 6px",borderRadius:3,background:`${T.warn}10`,textAlign:"center"}}>
            <span style={{fontSize:8,color:T.warn,fontFamily:"monospace",fontWeight:700}}>"남보다 먼저 본다" = 가치</span>
          </div>
        </div>
      </div>
    </div>
    <div style={{padding:"5px 8px",borderRadius:4,background:`${T.danger}08`,border:`1px solid ${T.danger}20`,marginTop:8}}>
      <div style={{fontSize:7,color:T.danger,fontFamily:"monospace",fontWeight:600}}>⚠ 관측 전용 · 예측 금지</div>
      <div style={{fontSize:7,color:T.textDim,lineHeight:1.4,marginTop:1}}>물리적 관측 사실만 표시. 전망·추천 표현은 시스템 레벨에서 차단됩니다.</div>
    </div>
  </div>);
}

/* ═══ 지표 Tier 분류 (물리 매핑 정직성) ═══ */
// T1: 위성 직접 측정 | T2: 물리 인과 확정 | T3: 간접 참고 | null: 위성 불가
const TIER={
  S2:'T1',R5:'T1',R6:'T1',G6:'T1',
  E1:'T2',E2:'T2',E3:'T2',E4:'T2',E6:'T2',I2:'T2',C4:'T2',
  O1:'T2',O3:'T2',O4:'T2',M1:'T2',R1:'T2',R2:'T2',
  C1:'T3',C5:'T3',O2:'T3',O6:'T3',M2_G:'T3'
};
const TIER_LABEL={T1:{ko:'위성 직접관측',en:'Satellite Direct',color:T.sat},
  T2:{ko:'물리 인과 확인',en:'Physical Causal',color:T.good},
  T3:{ko:'간접 참고신호',en:'Cross-Reference',color:T.warn}};

// ═══ 위성 증거 데이터 (물리 인과 확정만 · 서버에서 JSON 확장) ═══
const SAT_EV={
E1:{layers:["AIS 선박","SAR 항만","야간광"],sensor:"Spire AIS",product:"선박 위치·수량",coord:"35.08°N 129.04°E",radius:"부산항 10km",unit:"척/일",color:T.accent,
  before:{date:"2026-01-13",val:"342",raw:342},after:{date:"2026-02-12",val:"418",raw:418},
  ev:{source:"Spire Maritime",sensor:"AIS 수신기",product:"선박 위치·속도·선종",resolution:"실시간",process:"원본 무보정",crop:"10km 반경",hash:"b2e4..9f1a",missing:"0/30일",
    qg:[{l:"원본",ok:true},{l:"연속",ok:true},{l:"해상도",ok:true},{l:"결측",ok:true}]},
  trends:[{label:"출항",data:[342,338,355,361,348,365,372,358,380,388,375,392,398,385,401,412,395,408,415,402,420,428,410,425,432,418,435,440,425,418],color:T.accent,change:22},
    {label:"TEU",data:[4.2,4.1,4.3,4.5,4.3,4.6,4.7,4.4,4.8,4.9,4.6,5.0,5.1,4.8,5.2,5.3,4.9,5.1,5.4,5.2,5.5,5.6,5.3,5.5,5.7,5.4,5.6,5.8,5.5,5.7],color:T.good,change:36}],
  bt:[{signal:"출항 ▲15% (14일 지속)",n:18,hit:14,median:"22일",iqr:"15~32"},
    {signal:"TEU + AIS 동반 상승",n:11,hit:8,median:"28일",iqr:"18~40"}],
  lt:[{layer:"AIS",icon:"🚢",median:"8일",iqr:"3~14",n:55},{layer:"SAR",icon:"🔵",median:"18일",iqr:"10~28",n:32},{layer:"야간광",icon:"🟣",median:"35일",iqr:"20~52",n:18}]},
O1:{layers:["NO₂","열적외선","야간광","SAR"],sensor:"Sentinel-5P",product:"TROPOMI NO₂ L2",coord:"36.99°N 127.11°E",radius:"산업단지 5km",unit:"×10⁻⁵mol",color:"#f97316",
  before:{date:"2026-01-13",val:"4.8",raw:4.8},after:{date:"2026-02-12",val:"5.9",raw:5.9},
  ev:{source:"ESA Copernicus",sensor:"Sentinel-5P TROPOMI",product:"L2 NO₂ Column",resolution:"5.5km×3.5km",process:"원본 무보정",crop:"5km 반경",hash:"c7d1..4e2f",missing:"2/30일",
    qg:[{l:"원본",ok:true},{l:"연속",ok:true},{l:"해상도",ok:true},{l:"결측",ok:true}]},
  trends:[{label:"NO₂",data:[4.8,4.9,4.7,5.0,5.2,4.9,5.1,5.3,5.0,5.4,5.5,5.2,5.6,5.3,5.1,5.4,5.7,5.5,5.8,5.6,5.3,5.7,5.9,5.6,6.0,5.8,5.5,5.9,6.1,5.9],color:T.accent,change:23},
    {label:"열적외선",data:[35,35.3,35.1,35.6,35.8,35.4,36.0,36.2,35.8,36.4,36.6,36.1,36.8,36.4,36.1,36.5,36.9,36.6,37.1,36.8,36.4,37.0,37.3,36.9,37.5,37.2,36.8,37.4,37.7,37.5],color:"#f97316",change:7}],
  bt:[{signal:"NO₂ ▲20% (14일 지속)",n:15,hit:12,median:"18일",iqr:"11~28"},
    {signal:"열적외선+NO₂ 동반 상승",n:9,hit:7,median:"14일",iqr:"8~22"}],
  lt:[{layer:"NO₂",icon:"🟡",median:"18일",iqr:"11~28",n:42},{layer:"열적외선",icon:"🔴",median:"12일",iqr:"7~22",n:38},{layer:"야간광",icon:"🟣",median:"45일",iqr:"25~68",n:20}]},
R1:{layers:["SAR","광학","야간광"],sensor:"Sentinel-1",product:"C-band IW GRD",coord:"37.39°N 127.10°E",radius:"수도권 3km",unit:"Mm²",color:T.sat,
  before:{date:"2026-01-13",val:"2.41",raw:2.41},after:{date:"2026-02-12",val:"2.58",raw:2.58},
  ev:{source:"ESA Copernicus",sensor:"Sentinel-1A/B SAR",product:"C-band IW GRD 10m",resolution:"10m×10m",process:"원본 무보정",crop:"3km 반경",hash:"e5a2..7c3d",missing:"1/30일",
    qg:[{l:"원본",ok:true},{l:"연속",ok:true},{l:"해상도",ok:true},{l:"결측",ok:true}]},
  trends:[{label:"건설면적",data:[2.41,2.42,2.41,2.43,2.44,2.43,2.45,2.46,2.44,2.47,2.48,2.46,2.49,2.48,2.47,2.49,2.50,2.49,2.51,2.52,2.50,2.53,2.54,2.52,2.55,2.56,2.54,2.57,2.58,2.58],color:T.sat,change:7},
    {label:"야간광",data:[6.8,6.7,6.9,7.0,6.8,7.1,7.2,7.0,7.3,7.4,7.1,7.5,7.3,7.2,7.4,7.5,7.3,7.6,7.7,7.4,7.8,7.6,7.5,7.7,7.8,7.6,7.9,8.0,7.8,8.1],color:T.warn,change:19}],
  bt:[{signal:"건설면적 SAR ▲5% (30일)",n:22,hit:16,median:"52일",iqr:"35~78"},
    {signal:"야간광(주거)+SAR 동반",n:8,hit:6,median:"65일",iqr:"42~90"}],
  lt:[{layer:"SAR",icon:"🔵",median:"52일",iqr:"35~78",n:22},{layer:"광학",icon:"🟢",median:"40일",iqr:"25~60",n:28},{layer:"야간광",icon:"🟣",median:"65일",iqr:"42~90",n:15}]},
S2:{layers:["야간광(VIIRS)","NO₂","열적외선"],sensor:"Suomi NPP",product:"VIIRS DNB L2",coord:"36.50°N 127.00°E",radius:"한반도 전역",unit:"%",color:T.sat,
  before:{date:"2026-01-13",val:"105.8",raw:105.8},after:{date:"2026-02-12",val:"108.3",raw:108.3},
  ev:{source:"NASA LAADS",sensor:"Suomi NPP VIIRS DNB",product:"야간 가시광 합성",resolution:"750m",process:"월간 합성 무보정",crop:"한반도 전역",hash:"f1a3..8d2c",missing:"0/30일",
    qg:[{l:"원본",ok:true},{l:"연속",ok:true},{l:"해상도",ok:true},{l:"결측",ok:true}]},
  trends:[{label:"야간광지수",data:[105.8,105.6,106.0,106.2,105.9,106.4,106.6,106.1,106.8,107.0,106.5,107.2,106.9,107.1,107.4,107.0,107.6,107.3,107.8,108.0,107.5,108.2,107.8,108.0,108.3,108.1,108.4,108.6,108.2,108.3],color:T.sat,change:2.4},
    {label:"산업단지NO₂",data:[4.5,4.6,4.4,4.7,4.9,4.6,4.8,5.0,4.7,5.1,5.2,4.9,5.3,5.0,4.8,5.1,5.4,5.2,5.5,5.3,5.0,5.4,5.6,5.3,5.7,5.5,5.2,5.6,5.8,5.7],color:T.accent,change:27}],
  bt:[{signal:"야간광 108%+ (30일 유지)",n:14,hit:11,median:"45일",iqr:"30~65"},
    {signal:"야간광+NO₂ 동반 상승",n:8,hit:7,median:"35일",iqr:"22~52"}],
  lt:[{layer:"야간광",icon:"🟣",median:"52일",iqr:"30~85",n:24},{layer:"NO₂",icon:"🟡",median:"18일",iqr:"11~28",n:42},{layer:"열적외선",icon:"🔴",median:"12일",iqr:"7~22",n:38}]},
R5:{layers:["SAR(해수면)","조위관측"],sensor:"Sentinel-1",product:"C-band SAR L1",coord:"35.07°N 129.08°E",radius:"부산 연안 20km",unit:"mm/yr",color:"#3b82f6",
  before:{date:"2026-01-13",val:"3.2",raw:3.2},after:{date:"2026-02-12",val:"3.4",raw:3.4},
  ev:{source:"ESA Copernicus",sensor:"Sentinel-1A/B SAR",product:"C-band IW SLC",resolution:"5m×20m",process:"InSAR 변위 분석",crop:"연안 20km",hash:"a8c2..5f1e",missing:"1/30일",
    qg:[{l:"원본",ok:true},{l:"연속",ok:true},{l:"해상도",ok:true},{l:"결측",ok:true}]},
  trends:[{label:"해수면",data:[3.2,3.2,3.3,3.2,3.3,3.3,3.3,3.4,3.3,3.4,3.4,3.3,3.4,3.4,3.4,3.5,3.4,3.4,3.5,3.4,3.5,3.4,3.4,3.5,3.4,3.4,3.5,3.4,3.4,3.4],color:"#3b82f6",change:6}],
  bt:[{signal:"해수면 상승률 ▲ (연간 추세)",n:10,hit:8,median:"180일",iqr:"120~365"}],
  lt:[{layer:"SAR",icon:"🔵",median:"180일",iqr:"120~365",n:10},{layer:"조위",icon:"🌊",median:"90일",iqr:"60~150",n:18}]},
R6:{layers:["열적외선(Landsat)","MODIS LST"],sensor:"Landsat-9",product:"Thermal IR Band 10",coord:"37.57°N 126.98°E",radius:"서울 도심 10km",unit:"°C",color:"#f97316",
  before:{date:"2026-01-13",val:"2.8",raw:2.8},after:{date:"2026-02-12",val:"3.5",raw:3.5},
  ev:{source:"NASA/USGS",sensor:"Landsat-9 TIRS-2",product:"Band 10 Thermal IR",resolution:"100m",process:"대기보정 후 LST 변환",crop:"10km 반경",hash:"d4b1..9e3f",missing:"3/30일 (구름)",
    qg:[{l:"원본",ok:true},{l:"연속",ok:true},{l:"해상도",ok:true},{l:"결측",ok:false}]},
  trends:[{label:"도시열섬",data:[2.8,2.7,2.9,3.0,2.8,3.1,3.0,2.9,3.2,3.1,3.0,3.3,3.1,3.2,3.3,3.1,3.4,3.2,3.3,3.5,3.3,3.4,3.6,3.4,3.5,3.6,3.4,3.5,3.6,3.5],color:"#f97316",change:25}],
  bt:[{signal:"도심-교외 온도차 ▲3°C+ (14일)",n:20,hit:15,median:"30일",iqr:"18~50"}],
  lt:[{layer:"열적외선",icon:"🔴",median:"30일",iqr:"18~50",n:20},{layer:"MODIS",icon:"🌡️",median:"16일",iqr:"8~28",n:35}]},
G6:{layers:["Sentinel-5P","MODIS AOD"],sensor:"Sentinel-5P",product:"TROPOMI AAI/AOD",coord:"37.57°N 126.98°E",radius:"수도권 30km",unit:"μg/m³",color:T.accent,
  before:{date:"2026-01-13",val:"28.5",raw:28.5},after:{date:"2026-02-12",val:"35.2",raw:35.2},
  ev:{source:"ESA Copernicus",sensor:"Sentinel-5P TROPOMI",product:"L2 Aerosol Index",resolution:"5.5km×3.5km",process:"원본 무보정",crop:"30km 반경",hash:"b7e3..4a1c",missing:"2/30일",
    qg:[{l:"원본",ok:true},{l:"연속",ok:true},{l:"해상도",ok:true},{l:"결측",ok:true}]},
  trends:[{label:"PM2.5",data:[28.5,30.2,27.8,32.1,29.5,31.8,33.2,28.9,35.0,31.5,29.8,34.2,32.0,30.5,33.8,35.5,31.2,34.0,36.2,33.5,30.8,35.8,34.5,32.2,36.0,37.2,33.8,35.5,36.8,35.2],color:T.accent,change:24},
    {label:"AOD",data:[0.35,0.38,0.33,0.40,0.36,0.39,0.42,0.35,0.44,0.39,0.37,0.43,0.40,0.38,0.42,0.45,0.39,0.43,0.46,0.42,0.38,0.45,0.43,0.40,0.46,0.47,0.42,0.45,0.47,0.44],color:T.warn,change:26}],
  bt:[{signal:"PM2.5 30μg+ (7일 지속)",n:25,hit:20,median:"3일",iqr:"1~7"},
    {signal:"AOD 0.4+ 위성 관측",n:18,hit:15,median:"2일",iqr:"1~5"}],
  lt:[{layer:"TROPOMI",icon:"🟡",median:"3일",iqr:"1~7",n:25},{layer:"MODIS",icon:"🌡️",median:"2일",iqr:"1~5",n:18}]},
I2:{layers:["AIS 선박","SAR 항만"],sensor:"Spire AIS",product:"선박 AIS 국제교역",coord:"35.08°N 129.04°E",radius:"부산+인천항",unit:"척/일",color:T.good,
  before:{date:"2026-01-13",val:"685",raw:685},after:{date:"2026-02-12",val:"742",raw:742},
  ev:{source:"Spire Maritime",sensor:"AIS 위성+지상",product:"입출항 선박 집계",resolution:"실시간",process:"무보정",crop:"항만 20km",hash:"a1d4..3c2e",missing:"0/30일",
    qg:[{l:"원본",ok:true},{l:"연속",ok:true},{l:"해상도",ok:true},{l:"결측",ok:true}]},
  trends:[{label:"입출항",data:[685,690,678,695,702,688,710,715,698,720,725,705,730,718,708,722,735,720,738,728,715,740,745,730,748,742,728,745,750,742],color:T.good,change:8}],
  bt:[{signal:"입출항 ▲10% (30일)",n:16,hit:12,median:"30일",iqr:"20~45"}],
  lt:[{layer:"AIS",icon:"🚢",median:"15일",iqr:"8~25",n:40},{layer:"SAR",icon:"🔵",median:"25일",iqr:"15~40",n:22}],
  coverage:"상품수지 부분 추정 · 서비스수지(관광·IP·운임) 미포함 · 상품 비중 약70%"}
};

function GaugeRow({d,open,toggle,lang}){
  const L=lang||'ko';
  const col=gc(d.g), sat=isSat(d.c);
  return(
    <div style={{background:sat?`linear-gradient(135deg,${T.sat}06,${T.bg2})`:T.surface,borderRadius:T.smRadius,border:`1px solid ${sat?T.sat+"25":T.border}`,marginBottom:6,overflow:"hidden",cursor:"pointer",transition:"all .2s"}} onClick={toggle}>
      {sat&&<div style={{position:"absolute",top:0,left:0,width:"100%",height:2,background:`linear-gradient(90deg,transparent,${T.sat},transparent)`}}/>}
      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:10,position:"relative"}}>
        <span style={{fontSize:12,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:sat?T.sat:T.textMid,width:32,flexShrink:0}}>{d.c}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>{gN(d.c,L)}</span>
            {sat&&<SatBadge code={d.c}/>}
            {TIER[d.c]&&<span style={{display:"inline-flex",alignItems:"center",gap:2,fontSize:8,padding:"2px 7px",borderRadius:4,fontWeight:700,
              background:`${TIER_LABEL[TIER[d.c]].color}15`,color:TIER_LABEL[TIER[d.c]].color,
              border:`1px solid ${TIER_LABEL[TIER[d.c]].color}30`}}>{TIER[d.c]!=='T3'&&<span style={{fontSize:11}}>🛰️</span>}{TIER_LABEL[TIER[d.c]].ko}</span>}
          </div>
          <div style={{fontSize:10,color:T.textDim,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.note}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:17,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:T.text}}>{typeof d.v==="number"&&d.v>1000?d.v.toLocaleString():d.v}<span style={{fontSize:10,color:T.textDim,fontWeight:400,marginLeft:3}}>{d.u}</span></div>
          <div style={{fontSize:10,color:d.ch?.toString().includes("-")?T.info:d.ch?.toString().includes("+")?T.danger:T.textDim}}>{d.ch}</div>
        </div>
        <span style={{width:8,height:8,borderRadius:4,background:col,flexShrink:0}}/>
        <span style={{fontSize:9,color:T.textDim}}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div style={{padding:"0 16px 16px",borderTop:`1px solid ${T.border}`}}>
          {/* 의학비유 설명 */}
          <div style={{background:`${T.warn}06`,borderRadius:T.smRadius,padding:"10px 14px",marginTop:10,border:`1px solid ${T.warn}15`}}>
            <div style={{fontSize:10,fontWeight:700,color:T.warn,marginBottom:3}}>{t('bodyMetaphor',L)}: {d.t}</div>
            <div style={{fontSize:11,color:T.textMid,lineHeight:1.7}}>{d.m}</div>
          </div>
          {SAT_EV[d.c]?<SatEvidencePanel data={SAT_EV[d.c]}/>:<>
          {/* 위성 교차검증 (기존) */}
          {sat?<div style={{background:`${T.sat}08`,borderRadius:T.smRadius,padding:"10px 14px",marginTop:8,border:`1px solid ${T.sat}30`}}>
            <div style={{fontSize:10,fontWeight:700,color:T.sat,marginBottom:4}}>{t('satObsInfo',L)}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
              {[[t('satCol',L),SAT_META[d.c]?.sat],[t('satProg',L),SAT_META[d.c]?.orbit],[t('satCycle',L),SAT_META[d.c]?.freq],[t('satBand',L),SAT_META[d.c]?.band]].map(([k,v])=>(
                <div key={k} style={{fontSize:10}}><span style={{color:T.sat,fontWeight:700}}>{k}: </span><span style={{color:T.textMid}}>{v}</span></div>
              ))}
            </div>
          </div>:<SatXrefBanner code={d.c} lang={L}/>}
          {/* 행동 시그널 */}
          <div style={{background:`${T.good}06`,borderRadius:T.smRadius,padding:"10px 14px",marginTop:8,border:`1px solid ${T.good}15`}}>
            <div style={{fontSize:10,fontWeight:700,color:T.good,marginBottom:6}}>{t('investSignal',L)}</div>
            {d.act?.map((a,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:5}}>
                <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:T.text}}>{a.s}</div><div style={{fontSize:10,color:T.textMid}}>{a.a}</div></div>
                <span style={{fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:4,background:a.tg.includes(t('sigBuy',L))?T.good+"18":a.tg.includes(t('sigAvoid',L))||a.tg.includes(t('sigSell',L))?T.danger+"18":T.warn+"18",color:a.tg.includes(t('sigBuy',L))?T.good:a.tg.includes(t('sigAvoid',L))||a.tg.includes(t('sigSell',L))?T.danger:T.warn,whiteSpace:"nowrap"}}>{a.tg}</span>
              </div>
            ))}
          </div>
          {/* 사각지대 */}
          <div style={{background:`${T.accent}06`,borderRadius:T.smRadius,padding:"10px 14px",marginTop:8,border:`1px solid ${T.accent}15`}}>
            <div style={{fontSize:10,fontWeight:700,color:T.accent,marginBottom:4}}>{t('blindSpot',L)}</div>
            <div style={{fontSize:10,color:T.accent,marginBottom:4}}>{d.bs?.d}</div>
            {d.bs?.o?.map((o,i)=>(<div key={i} style={{fontSize:9,color:T.textDim,marginBottom:2}}>✕ {o}</div>))}
          </div>
          </>}
        </div>
      )}
    </div>
  );
}

function SystemSection({sysKey,sys,expanded,toggle,lang}){
  const L=lang||'ko';
  const col=gc(sys.g);
  const gArr=sys.keys.map(k=>D[k]).filter(Boolean);
  const good=gArr.filter(g=>g.g==="양호").length,caution=gArr.filter(g=>g.g==="주의").length,alert=gArr.filter(g=>g.g==="경보").length;
  const satCount=gArr.filter(g=>isSat(g.c)).length;
  const [open,setOpen]=useState(false);
  return(
    <div style={{marginBottom:12}}>
      <div onClick={()=>setOpen(!open)} style={{background:`linear-gradient(135deg,${sys.color}12,${sys.color}06)`,borderRadius:T.cardRadius,padding:"16px 20px",border:`1.5px solid ${sys.color}25`,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all .2s"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:20}}>{sys.icon}</span>
            <span style={{fontSize:16,fontWeight:800,color:T.text}}>{sysN(sysKey,L)}</span>
            <span style={{fontSize:11,color:sys.color,fontWeight:600}}>({sysB(sysKey,L)})</span>
            {satCount>0&&<span style={{fontSize:8,fontWeight:700,padding:"2px 8px",borderRadius:10,background:`${T.sat}15`,color:T.sat,border:`1px solid ${T.sat}30`}}>🛰️ ×{satCount}</span>}
          </div>
          <div style={{fontSize:11,color:T.textDim,marginTop:4}}>{sysM(sysKey,L)} · {gArr.length} {t('gaugesLabel',L)}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{display:"flex",gap:6}}>
            {good>0&&<span style={{fontSize:11,color:T.good,fontWeight:700}}>●{good}</span>}
            {caution>0&&<span style={{fontSize:11,color:T.warn,fontWeight:700}}>●{caution}</span>}
            {alert>0&&<span style={{fontSize:11,color:T.danger,fontWeight:700}}>●{alert}</span>}
          </div>
          <div style={{width:48,height:48,borderRadius:24,background:`conic-gradient(${col} ${sys.sc}%, ${T.border} ${sys.sc}%)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:36,height:36,borderRadius:18,background:T.bg2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:col}}>{sys.sc}</div>
          </div>
          <span style={{fontSize:11,color:T.textDim,transition:"transform .2s",transform:open?"rotate(180deg)":"rotate(0)"}}>▼</span>
        </div>
      </div>
      {open&&<div style={{marginTop:6}}>{gArr.map(g=>(<GaugeRow key={g.c} d={g} open={expanded[g.c]} toggle={()=>toggle(g.c)}/>))}</div>}
    </div>
  );
}

// ═══ PAGES ═══

function LandingPage({onNavigate,lang,setLang}){
  const L=lang||'ko';
  const [faqOpen,setFaqOpen]=useState({});
  const toggleFaq=k=>setFaqOpen(p=>({...p,[k]:!p[k]}));
  const isKR=L==='ko';
  const showPrice=(kr,usd)=>isKR?kr:usd;
  const plans=[
    {id:'FREE',name:'Free',icon:'🔍',price:showPrice('₩0','$0'),period:t('perMonth',L),desc:t('planFreeDesc',L),features:t('planFreeFeat',L),color:T.textMid,pop:false},
    {id:'BASIC',name:'Basic',icon:'📊',price:showPrice('₩19,000','$15'),period:t('perMonth',L),desc:t('planBasicDesc',L),features:t('planBasicFeat',L),color:T.info,pop:false},
    {id:'PRO',name:'Pro',icon:'🛰️',price:showPrice('₩49,000','$39'),period:t('perMonth',L),desc:t('planProDesc',L),features:t('planProFeat',L),color:T.accent,pop:true},
    {id:'ENT',name:'Enterprise',icon:'🏛️',price:showPrice('₩450,000','$350'),period:t('perMonth',L),desc:t('planEntDesc',L),features:t('planEntFeat',L),color:'#f59e0b',pop:false},
  ];
  const faqs=[
    {q:t('faq1q',L),a:t('faq1a',L)},
    {q:t('faq2q',L),a:t('faq2a',L)},
    {q:t('faq3q',L),a:t('faq3a',L)},
    {q:t('faq4q',L),a:t('faq4a',L)},
    {q:t('faq5q',L),a:t('faq5a',L)},
    {q:t('faq6q',L),a:t('faq6a',L)},
  ];
  const faqList=faqs;
  const featList=[
    {icon:"🛰️",title:t('feat1',L),desc:t('featDesc1',L),color:T.accent},
    {icon:"⏱️",title:t('feat2',L),desc:t('featDesc2',L),color:T.good},
    {icon:"🏥",title:t('feat3',L),desc:t('featDesc3',L),color:T.warn},
    {icon:"🔒",title:t('feat4',L),desc:t('featDesc4',L),color:"#f97316"},
    {icon:"📐",title:t('feat5',L),desc:t('featDesc5',L),color:T.info},
    {icon:"🎯",title:t('feat6',L),desc:t('featDesc6',L),color:T.danger},
  ];
  const stepList=[t('step1',L),t('step2',L),t('step3',L),t('step4',L),t('step5',L)];
  const sectionStyle={maxWidth:900,margin:"0 auto",padding:"80px 24px"};
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(180deg,${T.bg0},${T.bg1} 30%,${T.bg2} 70%,${T.bg0})`,color:T.text}}>
      {/* ═══ NAV ═══ */}
      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 24px",borderBottom:`1px solid ${T.border}`,background:`${T.bg0}d0`,backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:100,direction:"ltr"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>🛰️</span><span style={{fontSize:16,fontWeight:800,letterSpacing:-.5}}>DIAH-7M</span></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <LangSelector lang={L} setLang={setLang}/>
          <button onClick={()=>onNavigate('login')} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${T.border}`,background:"transparent",color:T.text,fontSize:12,fontWeight:600,cursor:"pointer"}}>{t('login',L)}</button>
          <button onClick={()=>onNavigate('signup')} style={{padding:"8px 16px",borderRadius:8,border:"none",background:T.accent,color:T.bg0,fontSize:12,fontWeight:700,cursor:"pointer"}}>{t('signup',L)}</button>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <div style={{textAlign:"center",padding:"100px 24px 80px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"30%",left:"50%",transform:"translate(-50%,-50%)",width:600,height:600,borderRadius:"50%",background:`radial-gradient(circle,${T.accent}06,transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{fontSize:11,fontWeight:700,color:T.accent,letterSpacing:3,marginBottom:16}}>{t('heroSub',L)}</div>
        <h1 style={{fontSize:42,fontWeight:900,margin:"0 0 20px",lineHeight:1.15,letterSpacing:-2,maxWidth:600,marginLeft:"auto",marginRight:"auto"}}>{t('heroTitle1',L)}<br/>{t('heroTitle2',L)}</h1>
        <p style={{fontSize:15,color:T.textMid,maxWidth:520,lineHeight:1.8,margin:"0 auto 36px"}}>{t('heroDesc',L)} <strong style={{color:T.accent}}>{t('heroFast',L)}</strong> {t('heroDesc2',L)}<br/>59 {t('gauges',L)} · 9 {t('bodySys',L)} · {t('satTab',L)}</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={()=>onNavigate('signup')} style={{padding:"14px 36px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${T.accent},#0099cc)`,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:`0 4px 24px ${T.accent}40`}}>{t('heroCta',L)}</button>
          <button onClick={()=>{const el=document.getElementById('features');el&&el.scrollIntoView({behavior:'smooth'});}} style={{padding:"14px 28px",borderRadius:12,border:`1px solid ${T.border}`,background:"transparent",color:T.text,fontSize:14,fontWeight:600,cursor:"pointer"}}>{t('heroMore',L)}</button>
        </div>
        <div style={{display:"flex",gap:32,justifyContent:"center",marginTop:56}}>
          {[{n:t('gauges',L),v:"59"},{n:t('bodySys',L),v:"9"},{n:t('satCost',L),v:"$0"},{n:t('languages',L),v:"30"}].map(s=>(<div key={s.n}><div style={{fontSize:24,fontWeight:800,color:T.accent,fontFamily:"'JetBrains Mono',monospace"}}>{s.v}</div><div style={{fontSize:11,color:T.textDim,marginTop:2}}>{s.n}</div></div>))}
        </div>
      </div>

      {/* ═══ FEATURES ═══ */}
      <div id="features" style={sectionStyle}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:11,fontWeight:700,color:T.sat,letterSpacing:2,marginBottom:8}}>WHY DIAH-7M</div>
          <h2 style={{fontSize:28,fontWeight:800,margin:0,letterSpacing:-1}}>{t('whyTitle',L)}</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {featList.map(f=>(<div key={f.title} style={{background:T.surface,borderRadius:T.cardRadius,padding:24,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:28,marginBottom:12}}>{f.icon}</div>
            <div style={{fontSize:15,fontWeight:700,color:f.color,marginBottom:8}}>{f.title}</div>
            <div style={{fontSize:12,color:T.textMid,lineHeight:1.8}}>{f.desc}</div>
          </div>))}
        </div>
      </div>

      {/* ═══ HOW IT WORKS ═══ */}
      <div style={{...sectionStyle,background:`linear-gradient(180deg,${T.bg2}80,transparent)`}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:11,fontWeight:700,color:T.accent,letterSpacing:2,marginBottom:8}}>HOW IT WORKS</div>
          <h2 style={{fontSize:28,fontWeight:800,margin:0,letterSpacing:-1}}>{t('howTitle',L)}</h2>
        </div>
        <div style={{display:"flex",gap:0,justifyContent:"center",flexWrap:"wrap"}}>
          {stepList.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center"}}>
            <div style={{width:140,textAlign:"center",padding:"0 8px"}}>
              <div style={{width:48,height:48,borderRadius:24,background:`${T.accent}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 10px"}}>{["🛰️","📡","🏥","✅","🎯"][i]}</div>
              <div style={{fontSize:10,fontWeight:800,color:T.accent,marginBottom:4}}>0{i+1}</div>
              <div style={{fontSize:13,fontWeight:700,color:T.text}}>{s}</div>
            </div>
            {i<4&&<div style={{width:30,height:2,background:T.border,flexShrink:0}}/>}
          </div>))}
        </div>
      </div>

      {/* ═══ SATELLITES ═══ */}
      <div style={sectionStyle}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,fontWeight:700,color:T.sat,letterSpacing:2,marginBottom:8}}>DATA SOURCES</div>
          <h2 style={{fontSize:28,fontWeight:800,margin:0,letterSpacing:-1}}>4 {t('satTab',L)} — {t('satCost',L)}</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {[
            {icon:"🛰️",name:"VIIRS DNB",sat:"Suomi NPP",freq:t("freqDaily",L),res:"750m"},
            {icon:"💨",name:"Sentinel-5P",sat:"TROPOMI",freq:t("freqDaily",L),res:"7km"},
            {icon:"🌊",name:"Sentinel-1",sat:"C-band SAR",freq:t("freq12d",L),res:"5m"},
            {icon:"🌡️",name:"Landsat-9",sat:"OLI/TIRS",freq:t("freq16d",L),res:"30m"},
          ].map(s=>(<div key={s.name} style={{background:`${T.sat}06`,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.sat}20`,textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:8}}>{s.icon}</div>
            <div style={{fontSize:14,fontWeight:700,color:T.text}}>{s.name}</div>
            <div style={{fontSize:10,color:T.sat,marginTop:2}}>{s.sat}</div>
            <div style={{display:"flex",justifyContent:"center",gap:12,marginTop:12}}>
              <span style={{fontSize:10,color:T.textDim}}>{s.freq}</span>
              <span style={{fontSize:10,color:T.textDim}}>{s.res}</span>
              <span style={{fontSize:10,color:T.good,fontWeight:700}}>$0</span>
            </div>
          </div>))}
        </div>
      </div>

      {/* ═══ 9 SYSTEMS ═══ */}
      <div style={sectionStyle}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,fontWeight:700,color:T.warn,letterSpacing:2,marginBottom:8}}>9 BODY SYSTEMS</div>
          <h2 style={{fontSize:28,fontWeight:800,margin:0,letterSpacing:-1}}>{t('nineSystems',L)}</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {Object.entries(SYS).map(([k,s])=>(<div key={k} style={{background:`${s.color}06`,borderRadius:T.cardRadius,padding:"18px 16px",border:`1px solid ${s.color}15`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:20}}>{s.icon}</span>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:`${s.color}15`,color:s.color,fontWeight:700}}>{s.keys.length}</span>
            </div>
            <div style={{fontSize:14,fontWeight:700,color:T.text}}>{sysN(k,L)}</div>
            <div style={{fontSize:10,color:s.color,marginTop:2}}>{sysB(k,L)}</div>
          </div>))}
        </div>
      </div>

      {/* ═══ PRICING ═══ */}
      <div id="pricing" style={sectionStyle}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,fontWeight:700,color:T.good,letterSpacing:2,marginBottom:8}}>PRICING</div>
          <h2 style={{fontSize:28,fontWeight:800,margin:0,letterSpacing:-1}}>{t('pricingTitle',L)}</h2>
          <p style={{fontSize:13,color:T.textMid,marginTop:10}}>{t('pricingSub',L)}</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {plans.map(p=>(<div key={p.id} style={{background:T.surface,borderRadius:T.cardRadius,padding:24,border:`2px solid ${p.pop?T.accent:T.border}`,position:"relative",display:"flex",flexDirection:"column"}}>
            {p.pop&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",fontSize:10,fontWeight:800,padding:"3px 14px",borderRadius:10,background:T.accent,color:T.bg0}}>POPULAR</div>}
            <div style={{fontSize:24,marginBottom:8}}>{p.icon}</div>
            <div style={{fontSize:18,fontWeight:800,color:p.color}}>{p.name}</div>
            <div style={{fontSize:10,color:T.textDim,marginTop:2}}>{p.desc}</div>
            <div style={{marginTop:16,marginBottom:16}}>
              <span style={{fontSize:28,fontWeight:900,color:T.text}}>{p.price}</span>
              <span style={{fontSize:11,color:T.textDim}}>{p.period}</span>
            </div>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
              {p.features.map((f,i)=>(<div key={i} style={{fontSize:11,color:T.textMid,display:"flex",gap:6}}><span style={{color:p.color}}>✓</span>{f}</div>))}
            </div>
            <button onClick={()=>onNavigate('signup')} style={{width:"100%",padding:"12px",borderRadius:10,border:p.pop?"none":`1px solid ${T.border}`,background:p.pop?`linear-gradient(135deg,${T.accent},#0099cc)`:T.bg2,color:p.pop?"#fff":T.text,fontSize:13,fontWeight:700,cursor:"pointer",marginTop:20}}>{p.id==='FREE'?t('free',L):t('trial',L)}</button>
          </div>))}
        </div>
      </div>

      {/* ═══ FAQ ═══ */}
      <div style={sectionStyle}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,fontWeight:700,color:T.info,letterSpacing:2,marginBottom:8}}>FAQ</div>
          <h2 style={{fontSize:28,fontWeight:800,margin:0,letterSpacing:-1}}>{t('faqTitle',L)}</h2>
        </div>
        <div style={{maxWidth:680,margin:"0 auto"}}>
          {faqList.map((f,i)=>(<div key={i} style={{borderBottom:`1px solid ${T.border}`,padding:"16px 0"}}>
            <div onClick={()=>toggleFaq(i)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
              <span style={{fontSize:14,fontWeight:600,color:T.text}}>{f.q}</span>
              <span style={{fontSize:16,color:T.textDim,transition:"transform .2s",transform:faqOpen[i]?"rotate(45deg)":"none"}}>+</span>
            </div>
            {faqOpen[i]&&<div style={{fontSize:12,color:T.textMid,lineHeight:1.8,marginTop:10}}>{f.a}</div>}
          </div>))}
        </div>
      </div>

      {/* ═══ CTA ═══ */}
      <div style={{textAlign:"center",padding:"80px 24px",background:`linear-gradient(180deg,transparent,${T.accent}04,transparent)`}}>
        <h2 style={{fontSize:30,fontWeight:900,margin:"0 0 12px",letterSpacing:-1}}>{t('ctaTitle',L)}</h2>
        <p style={{fontSize:14,color:T.textMid,margin:"0 0 32px"}}>{t('ctaDesc',L)}</p>
        <button onClick={()=>onNavigate('signup')} style={{padding:"16px 48px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${T.accent},#0099cc)`,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:`0 6px 32px ${T.accent}40`}}>{t('ctaBtn',L)}</button>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer style={{borderTop:`1px solid ${T.border}`,padding:"40px 24px"}}>
        <div style={{maxWidth:900,margin:"0 auto",textAlign:"center"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:12}}><span>🛰️</span><span style={{fontWeight:800}}>DIAH-7M</span></div>
          <div style={{fontSize:11,color:T.textDim}}>© 2026 DIAH-7M · Human Body National Economics · NASA VIIRS · Copernicus Sentinel-1/5P · Landsat-9</div>
        </div>
      </footer>
    </div>
  );
}
function AuthPage({mode,onNavigate,onLogin,lang}){
  const L=lang||'ko';
  const [authMode,setAuthMode]=useState(mode==='signup'?'register':'login'); // login | register | reset
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({name:'',email:'',password:'',plan:'FREE',terms:false,privacy:false,marketing:false});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [showPw,setShowPw]=useState(false);
  const [resetSent,setResetSent]=useState(false);
  const update=(k,v)=>setForm(p=>({...p,[k]:v}));
  const switchMode=(m)=>{setAuthMode(m);setError('');setStep(1);setResetSent(false);};

  // ── 지역별 소셜로그인 ──
  const blang=L;
  const GLOBAL_SOCIAL=[
    {id:'google',name:'Google',icon:'G',bg:'#4285F4',fg:'#fff'},
    {id:'apple',name:'Apple',icon:'',bg:'#000',fg:'#fff'},
  ];
  const REGIONAL={
    ko:[{id:'kakao',name:'Kakao',icon:'💬',bg:'#FEE500',fg:'#000'},{id:'naver',name:'Naver',icon:'N',bg:'#03C75A',fg:'#fff'}],
    ja:[{id:'line',name:'LINE',icon:'L',bg:'#06C755',fg:'#fff'}],
  };
  const socialProviders=[...GLOBAL_SOCIAL,...(REGIONAL[L]||[])];
  const continueWith=L==='ko'?null:L==='ja'?'で続行':L==='zh'?'继续使用':L==='es'?'Continuar con':L==='ar'?'تابع باستخدام':'Continue with';

  // ── 비밀번호 강도 ──
  const pwChecks=[
    {label:t('pwCheck8',L),ok:form.password.length>=8},
    {label:t('pwCheckAlpha',L),ok:/[a-zA-Z]/.test(form.password)},
    {label:t('pwCheckNum',L),ok:/\d/.test(form.password)},
    {label:t('pwCheckSpecial',L),ok:/[^a-zA-Z0-9]/.test(form.password)},
  ];
  const pwStrength=pwChecks.filter(c=>c.ok).length;
  const pwAllPass=pwStrength===4;

  // ── 4등급 플랜 (확정 설계) ──
  const plans=[
    {id:'FREE',name:'Free',icon:'🔍',price:'₩0',usd:'$0',period:t('perMonth',L),desc:t('planFreeDesc',L),features:t('planFreeFeat',L),color:T.textMid,badge:'',mileage:t('mileageBonus',L)},
    {id:'BASIC',name:'Basic',icon:'📊',price:'₩19,000',usd:'$15',period:t('perMonth',L),desc:t('planBasicDesc',L),features:t('planBasicFeat',L),color:T.info,badge:'',mileage:t('milBasic',L)},
    {id:'PRO',name:'Pro',icon:'🛰️',price:'₩49,000',usd:'$39',period:t('perMonth',L),desc:t('planProDesc',L),features:t('planProFeat',L),color:T.accent,badge:'POPULAR',mileage:t('milPro',L)},
    {id:'ENTERPRISE',name:'Enterprise',icon:'🏛️',price:'₩450,000',usd:'$350',period:t('perMonth',L),desc:t('planEntDesc',L),features:t('planEntFeat',L),color:'#f59e0b',badge:'',mileage:t('milEnt',L)},
  ];

  // ── 핸들러 ──
  const handleNext=()=>{
    setError('');
    if(step===1){
      if(!form.name.trim()){setError(t('nameRequired',L));return;}
      if(!form.email.includes('@')){setError(t('emailInvalid',L));return;}
      if(!pwAllPass){setError(t('pwRequired',L));return;}
      setStep(2);
    } else if(step===2){
      setStep(3);
    } else if(step===3){
      if(!form.terms||!form.privacy){setError(t('termsRequired',L));return;}
      setLoading(true);
      setTimeout(()=>{setLoading(false);onLogin({email:form.email,name:form.name,plan:form.plan});},1500);
    }
  };
  const handleLoginSubmit=()=>{
    setError('');
    if(!form.email.includes('@')){setError(t('emailInvalid',L));return;}
    if(form.password.length<1){setError(t('pwEnterRequired',L));return;}
    setLoading(true);
    setTimeout(()=>{setLoading(false);onLogin({email:form.email,name:'Investor'});},1200);
  };
  const handleReset=()=>{
    setError('');
    if(!form.email.includes('@')){setError(t('emailInvalid',L));return;}
    setLoading(true);
    setTimeout(()=>{setLoading(false);setResetSent(true);},1000);
  };

  const inputStyle={width:"100%",padding:"14px 16px",borderRadius:10,border:`1px solid ${T.border}`,background:T.bg2,color:T.text,fontSize:14,outline:"none",boxSizing:"border-box",transition:"border-color .2s"};
  const labelStyle={display:"block",color:T.text,fontSize:12,fontWeight:600,marginBottom:6};
  const btnStyle=(dis)=>({width:"100%",padding:"14px",borderRadius:10,border:"none",background:dis?T.textDim:`linear-gradient(135deg,${T.accent},#0099cc)`,color:"#fff",fontSize:15,fontWeight:700,cursor:dis?"wait":"pointer",transition:"all .2s",boxShadow:`0 4px 16px ${T.accent}30`});
  const dividerEl=(<div style={{display:"flex",alignItems:"center",gap:12,margin:"20px 0"}}><div style={{flex:1,height:1,background:T.border}}/><span style={{fontSize:11,color:T.textDim}}>{t("or",L)}</span><div style={{flex:1,height:1,background:T.border}}/></div>);

  // ── 소셜 버튼 렌더러 ──
  const [socialLoading,setSocialLoading]=useState('');
  const handleSocial=(provider)=>{
    setSocialLoading(provider);
    setError('');
    // 실제 배포 시: window.location.href = `/api/v1/auth/oauth/${provider}`;
    setTimeout(()=>{
      setSocialLoading('');
      onLogin({email:`user@${provider}.com`,name:provider==='kakao'?'Kakao User':provider==='naver'?'Naver User':'User',plan:'PRO'});
    },1200);
  };
  const socialButtons=(<div style={{display:"flex",flexDirection:"column",gap:8}}>
    {socialProviders.map(s=>(<button key={s.id} onClick={()=>handleSocial(s.id)} disabled={!!socialLoading} style={{width:"100%",padding:"12px",borderRadius:10,border:`1px solid ${T.border}`,background:socialLoading===s.id?s.bg:T.bg2,color:socialLoading===s.id?s.fg:T.text,fontSize:13,fontWeight:600,cursor:socialLoading?"wait":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"all .2s",opacity:socialLoading&&socialLoading!==s.id?0.5:1}}>
      <span style={{width:24,height:24,borderRadius:6,background:socialLoading===s.id?"transparent":s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:socialLoading===s.id?"inherit":s.fg}}>{socialLoading===s.id?"⏳":s.icon}</span>
      {socialLoading===s.id?`${s.name} ${t('connecting',L)}`:continueWith?`${continueWith} ${s.name}`:s.name}
    </button>))}
  </div>);

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(180deg,${T.bg0},${T.bg1})`,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:authMode==='register'?480:420}}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:28,cursor:"pointer"}} onClick={()=>onNavigate('landing')}>🛰️</div>
          <div style={{fontSize:16,fontWeight:800,color:T.text,marginTop:8,letterSpacing:-.5}}>DIAH-7M</div>
          <div style={{fontSize:12,color:T.textMid,marginTop:4}}>{t("satPlatform",L)}</div>
        </div>

        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:32,border:`1px solid ${T.border}`}}>

          {/* ════ 로그인 ════ */}
          {authMode==='login'&&(<>
            <h2 style={{fontSize:20,fontWeight:800,color:T.text,margin:"0 0 24px",letterSpacing:-.5}}>{t("loginTitle",L)}</h2>
            <div style={{marginBottom:16}}><label style={labelStyle}>{t('email',L)}</label><input type="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="name@company.com" style={inputStyle}/></div>
            <div style={{marginBottom:8}}><label style={labelStyle}>{t('password',L)}</label><input type="password" value={form.password} onChange={e=>update('password',e.target.value)} placeholder="" style={inputStyle} onKeyDown={e=>e.key==='Enter'&&handleLoginSubmit()}/></div>
            <div style={{textAlign:"right",marginBottom:16}}><span onClick={()=>switchMode('reset')} style={{fontSize:11,color:T.accent,cursor:"pointer"}}>{t("forgotPw",L)}</span></div>
            {error&&<div style={{fontSize:12,color:T.danger,marginBottom:12,padding:"8px 12px",background:`${T.danger}10`,borderRadius:8}}>{error}</div>}
            <button onClick={handleLoginSubmit} disabled={loading} style={btnStyle(loading)}>{loading?t("login",L)+"...":t("login",L)}</button>
            {dividerEl}
            {socialButtons}
            <div style={{textAlign:"center",marginTop:24,fontSize:12,color:T.textDim}}>{t("noAccount",L)} <span onClick={()=>switchMode('register')} style={{color:T.accent,cursor:"pointer",fontWeight:700}}>{t("freeSignup",L)}</span></div>
          </>)}

          {/* ════ 비밀번호 찾기 ════ */}
          {authMode==='reset'&&(<>
            <h2 style={{fontSize:20,fontWeight:800,color:T.text,margin:"0 0 8px",letterSpacing:-.5}}>{t('resetTitle',L)}</h2>
            <p style={{fontSize:12,color:T.textMid,margin:"0 0 24px",lineHeight:1.6}}>{t("resetDesc",L)}</p>
            {resetSent?(<div style={{textAlign:"center",padding:"24px 0"}}>
              <div style={{fontSize:32,marginBottom:12}}>✉️</div>
              <div style={{fontSize:14,fontWeight:700,color:T.good,marginBottom:8}}>{t('resetSent',L)}</div>
              <div style={{fontSize:12,color:T.textMid,lineHeight:1.6}}>{form.email}</div>
              <button onClick={()=>switchMode('login')} style={{...btnStyle(false),marginTop:20}}>{t("backToLogin",L)}</button>
            </div>):(<>
              <div style={{marginBottom:16}}><label style={labelStyle}>{t('email',L)}</label><input type="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="name@company.com" style={inputStyle}/></div>
              {error&&<div style={{fontSize:12,color:T.danger,marginBottom:12,padding:"8px 12px",background:`${T.danger}10`,borderRadius:8}}>{error}</div>}
              <button onClick={handleReset} disabled={loading} style={btnStyle(loading)}>{loading?t("resetBtn",L)+"...":t("resetBtn",L)}</button>
            </>)}
            <div style={{textAlign:"center",marginTop:20,fontSize:12,color:T.textDim}}><span onClick={()=>switchMode('login')} style={{color:T.accent,cursor:"pointer",fontWeight:600}}>{t("backToLogin",L)}</span></div>
          </>)}

          {/* ════ 회원가입 (3단계) ════ */}
          {authMode==='register'&&(<>
            {/* Back + Title */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <button onClick={()=>step>1?setStep(step-1):switchMode('login')} style={{background:"none",border:"none",color:T.text,cursor:"pointer",fontSize:18,padding:0}}>←</button>
              <h2 style={{fontSize:20,fontWeight:800,color:T.text,margin:0,letterSpacing:-.5}}>
                {step===1?t("createAccount",L):step===2?t("selectPlan",L):t("agreeTerms",L)}
              </h2>
              <span style={{fontSize:11,color:T.textDim,marginLeft:"auto"}}>{step}/3</span>
            </div>
            {/* Progress Bar */}
            <div style={{display:"flex",gap:6,marginBottom:28}}>
              {[1,2,3].map(s=>(<div key={s} style={{flex:1,height:4,borderRadius:2,background:s<=step?T.accent:T.border,transition:"background .3s"}}/>))}
            </div>

            {/* Step 1: 계정 정보 */}
            {step===1&&(<div style={{display:"flex",flexDirection:"column",gap:18}}>
              {/* 소셜 가입 (먼저 표시) */}
              <div style={{marginBottom:4}}>
                <div style={{fontSize:12,fontWeight:600,color:T.textMid,marginBottom:10}}>{t("quickSignup",L)}</div>
                {socialButtons}
              </div>
              {dividerEl}
              <div><label style={labelStyle}>{t('name',L)} *</label><input value={form.name} onChange={e=>update('name',e.target.value)} placeholder="" style={inputStyle}/></div>
              <div><label style={labelStyle}>{t("email",L)} *</label><input type="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="name@company.com" style={inputStyle}/></div>
              <div>
                <label style={labelStyle}>{t("password",L)} *</label>
                <div style={{position:"relative"}}>
                  <input type={showPw?"text":"password"} value={form.password} onChange={e=>update('password',e.target.value)} placeholder="" style={{...inputStyle,paddingRight:44}}/>
                  <button onClick={()=>setShowPw(!showPw)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:13}}>{showPw?"🙈":"👁️"}</button>
                </div>
                <div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap"}}>
                  {pwChecks.map((r,i)=>(<span key={i} style={{fontSize:11,fontWeight:600,color:r.ok?T.good:T.textDim,transition:"color .2s"}}>{r.ok?"✓":"○"} {r.label}</span>))}
                </div>
                {form.password.length>0&&<div style={{display:"flex",gap:3,marginTop:8}}>
                  {[1,2,3,4].map(i=>(<div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=pwStrength?(pwStrength<=1?T.danger:pwStrength<=2?T.warn:pwStrength<=3?T.warn:T.good):T.border,transition:"background .3s"}}/>))}
                </div>}
              </div>
            </div>)}

            {/* Step 2: 플랜 선택 */}
            {step===2&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>
              {plans.map(p=>(
                <div key={p.id} onClick={()=>update('plan',p.id)} style={{borderRadius:12,padding:"16px 18px",border:`2px solid ${form.plan===p.id?p.color||T.accent:T.border}`,background:form.plan===p.id?`${(p.color||T.accent)}08`:T.bg2,cursor:"pointer",transition:"all .2s",position:"relative"}}>
                  {p.badge&&<span style={{position:"absolute",top:-8,right:12,fontSize:9,fontWeight:800,padding:"2px 10px",borderRadius:10,background:T.accent,color:T.bg0}}>{p.badge}</span>}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{width:18,height:18,borderRadius:9,border:`2px solid ${form.plan===p.id?p.color||T.accent:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{form.plan===p.id&&<span style={{width:10,height:10,borderRadius:5,background:p.color||T.accent}}/>}</span>
                        <span style={{fontSize:15,fontWeight:700,color:T.text}}>{p.icon} {p.name}</span>
                      </div>
                      <div style={{fontSize:11,color:T.textDim,marginTop:4,marginLeft:26}}>{p.desc}</div>
                    </div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:800,color:T.text}}>{p.price}</div><div style={{fontSize:10,color:T.textDim}}>{p.usd}{p.period}</div></div>
                  </div>
                  {form.plan===p.id&&<div style={{marginTop:12,marginLeft:26}}>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {p.features.map((f,i)=>(<div key={i} style={{fontSize:11,color:T.textMid}}>✓ {f}</div>))}
                    </div>
                    <div style={{marginTop:8,fontSize:10,color:T.accent,fontWeight:600}}>🎁 {p.mileage}</div>
                  </div>}
                </div>
              ))}
              <div style={{fontSize:10,color:T.textDim,textAlign:"center",marginTop:4}}>{t("trialNote",L)}</div>
            </div>)}

            {/* Step 3: 약관 동의 */}
            {step===3&&(<div style={{display:"flex",flexDirection:"column",gap:14}}>
              {/* 선택 플랜 요약 */}
              <div style={{padding:"14px 16px",background:T.bg2,borderRadius:10,border:`1px solid ${T.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:11,color:T.textDim,marginBottom:2}}>{t("selectedPlan",L)}</div><span style={{fontSize:14,fontWeight:700,color:T.accent}}>{plans.find(p=>p.id===form.plan)?.icon} {plans.find(p=>p.id===form.plan)?.name}</span></div>
                  <div style={{textAlign:"right"}}><span style={{fontSize:16,fontWeight:800,color:T.text}}>{plans.find(p=>p.id===form.plan)?.price}</span><div style={{fontSize:10,color:T.textDim}}>{plans.find(p=>p.id===form.plan)?.period}</div></div>
                </div>
              </div>
              {/* 마일리지 안내 */}
              <div style={{padding:"10px 16px",background:`${T.good}08`,borderRadius:10,border:`1px solid ${T.good}15`,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>🎁</span>
                <span style={{fontSize:12,color:T.good,fontWeight:600}}>{t('mileageBonus',L)}</span>
              </div>
              {/* 전체 동의 */}
              <div onClick={()=>{const all=!(form.terms&&form.privacy&&form.marketing);update('terms',all);update('privacy',all);update('marketing',all);}} style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",background:`${T.accent}08`,borderRadius:10,border:`1px solid ${T.accent}20`,cursor:"pointer"}}>
                <span style={{width:20,height:20,borderRadius:4,border:`2px solid ${(form.terms&&form.privacy&&form.marketing)?T.accent:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:T.accent,fontWeight:800}}>{(form.terms&&form.privacy&&form.marketing)?"✓":""}</span>
                <span style={{fontSize:13,fontWeight:700,color:T.text}}>{t("agreeAll",L)}</span>
              </div>
              {[{k:'terms',label:t('termsService',L),req:true},{k:'privacy',label:t('termsPrivacy',L),req:true},{k:'marketing',label:t('termsMarketing',L),req:false}].map(item=>(
                <div key={item.k} onClick={()=>update(item.k,!form[item.k])} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",cursor:"pointer"}}>
                  <span style={{width:18,height:18,borderRadius:4,border:`2px solid ${form[item.k]?T.accent:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:T.accent,fontWeight:800}}>{form[item.k]?"✓":""}</span>
                  <span style={{fontSize:12,color:T.textMid,flex:1}}>{item.label}</span>
                  <span style={{fontSize:10,color:item.req?T.danger:T.textDim,fontWeight:600}}>{item.req?t('required',L):t('optional',L)}</span>
                </div>
              ))}
            </div>)}

            {/* Error */}
            {error&&<div style={{fontSize:12,color:T.danger,marginTop:14,padding:"8px 12px",background:`${T.danger}10`,borderRadius:8}}>{error}</div>}

            {/* Next / Submit */}
            <button onClick={handleNext} disabled={loading} style={{...btnStyle(loading),marginTop:24}}>
              {loading?t("createAccount",L)+"...":step<3?t("next",L):form.plan==='FREE'?t("free",L):t("trial",L)}
            </button>

            <div style={{textAlign:"center",marginTop:16,fontSize:12,color:T.textDim}}>{t("hasAccount",L)} <span onClick={()=>switchMode('login')} style={{color:T.accent,cursor:"pointer",fontWeight:700}}>{t("login",L)}</span></div>
          </>)}
        </div>
        <div style={{textAlign:"center",marginTop:20,fontSize:10,color:T.textDim}}>© DIAH-7M · Human Body National Economics · Jong-Won Yoon</div>
      </div>
    </div>
  );
}

// ═══ 9축 레이더 차트 ═══
function RadarChart({lang:RL}){
  const axes=Object.entries(SYS).map(([k,s])=>({id:k,...s}));
  const cx=120,cy=120,r=90;
  const getP=(i,v)=>{const a=(Math.PI*2*i/9)-Math.PI/2;return[cx+r*(v/100)*Math.cos(a),cy+r*(v/100)*Math.sin(a)];};
  const poly=axes.map((a,i)=>getP(i,a.sc).join(",")).join(" ");
  const grid=[25,50,75,100];
  return(<svg viewBox="0 0 240 240" style={{width:"100%",maxWidth:260}}>
    {grid.map(g=>(<polygon key={g} points={axes.map((_,i)=>getP(i,g).join(",")).join(" ")} fill="none" stroke={T.border} strokeWidth={.5}/>))}
    {axes.map((_,i)=>{const[x,y]=getP(i,100);return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={T.border} strokeWidth={.5}/>;} )}
    <polygon points={poly} fill={`${T.accent}18`} stroke={T.accent} strokeWidth={1.5}/>
    {axes.map((a,i)=>{const[px,py]=getP(i,a.sc);const[lx,ly]=getP(i,118);return(<g key={a.id}><circle cx={px} cy={py} r={3} fill={a.color}/><text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={T.textMid} fontSize={8} fontWeight={600}>{a.icon}{sysN(a.id,RL).slice(0,3)}</text></g>);})}
  </svg>);
}

// ═══ 이중봉쇄 표시기 ═══
function DualLockIndicator({lang}){
  const L=lang||'ko';
  const dl={locked:true,input:{score:8,threshold:3,label:t('inputSeal',L)},output:{score:20,threshold:3,label:t('outputSeal',L)}};
  const barStyle=(v,max,col)=>({width:`${Math.min(v/max*100,100)}%`,height:6,borderRadius:3,background:col,transition:"width .8s"});
  return(<div style={{background:`linear-gradient(135deg,#f97316 08,${T.bg2})`,borderRadius:T.cardRadius,padding:16,border:`1px solid #f97316 30`}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
      <span style={{width:10,height:10,borderRadius:5,background:"#f97316",boxShadow:"0 0 8px #f97316"}}/>
      <span style={{fontSize:13,fontWeight:700,color:"#f97316"}}>{t('dualLockActive',L)}</span>
      <span style={{fontSize:10,color:T.textDim,marginLeft:"auto"}}>State: {t('stTrigger',L)}</span>
    </div>
    {[dl.input,dl.output].map((s,i)=>(<div key={i} style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.textMid,marginBottom:4}}>
        <span>{s.label}</span><span style={{fontWeight:700,color:s.score>=s.threshold?"#f97316":T.good}}>{s.score}/{s.threshold*4}</span>
      </div>
      <div style={{background:T.border,borderRadius:3,height:6,overflow:"hidden"}}>
        <div style={barStyle(s.score,s.threshold*4,s.score>=s.threshold?"#f97316":T.good)}/>
      </div>
    </div>))}
  </div>);
}

// ═══ 5단계 상태 표시 ═══
function StateIndicator({lang}){
  const L=lang||'ko';
  const states=[{id:0,l:t('stNormal',L),c:T.good,i:"🟢"},{id:1,l:t('stWatch',L),c:T.info,i:"🔵"},{id:2,l:t('stTrigger',L),c:T.warn,i:"🟡"},{id:3,l:t('stSeal',L),c:"#f97316",i:"🟠"},{id:4,l:t('stCrisis',L),c:T.danger,i:"🔴"}];
  const current=2;
  return(<div style={{display:"flex",gap:4,alignItems:"center"}}>
    {states.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:2}}>
      <div style={{width:i===current?28:20,height:i===current?28:20,borderRadius:14,background:i<=current?s.c:T.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:i===current?12:9,fontWeight:800,color:i<=current?"#fff":T.textDim,transition:"all .3s",border:i===current?`2px solid ${s.c}`:"none",boxShadow:i===current?`0 0 12px ${s.c}40`:"none"}}>{i===current?s.i:i+1}</div>
      {i<4&&<div style={{width:16,height:2,background:i<current?states[i+1].c:T.border,borderRadius:1}}/>}
    </div>))}
    <span style={{fontSize:11,fontWeight:700,color:states[current].c,marginLeft:8}}>{states[current].l}</span>
  </div>);
}

// ═══ Delta 분석 ═══
function DeltaAnalysis({lang}){
  const L=lang||'ko';
  return(<div style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`}}>
    <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:10}}>{t('deltaTitle',L)}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"center"}}>
      <div style={{textAlign:"center"}}><div style={{fontSize:10,color:T.textDim}}>{t('satIndex',L)}</div><div style={{fontSize:24,fontWeight:800,color:T.good,fontFamily:"monospace"}}>71</div></div>
      <div style={{textAlign:"center"}}><div style={{fontSize:10,color:T.warn,fontWeight:700}}>Δ3</div><div style={{fontSize:20,fontWeight:800,color:T.warn}}>-33</div><div style={{fontSize:9,color:T.warn}}>{t('negGap',L)}</div></div>
      <div style={{textAlign:"center"}}><div style={{fontSize:10,color:T.textDim}}>{t('mktIndex',L)}</div><div style={{fontSize:24,fontWeight:800,color:T.warn,fontFamily:"monospace"}}>38</div></div>
    </div>
    <div style={{fontSize:10,color:T.textMid,marginTop:10,lineHeight:1.6,padding:"8px 12px",background:T.bg2,borderRadius:8}}>{t('deltaDesc',L)}</div>
  </div>);
}

// ═══ 대시보드 ═══
function DashboardPage({user,onNav,lang}){
  const L=lang||'ko';
  const [expanded,setExpanded]=useState({});
  const [tab,setTab]=useState('overview');
  const [demoPlan,setDemoPlan]=useState(user?.plan||'PRO');
  const toggle=k=>setExpanded(p=>({...p,[k]:!p[k]}));
  const allG=Object.values(D);
  const good=allG.filter(g=>g.g==="양호").length,caution=allG.filter(g=>g.g==="주의").length,alertCnt=allG.filter(g=>g.g==="경보").length;
  const tabs=[{id:'overview',label:t('overview',L)},{id:'report',label:t('gaugeTab',L)},{id:'satellite',label:t('satTab',L)},{id:'alerts',label:t('alertTab',L)}];
  const demoUser={...user,plan:demoPlan};
  return(<div style={{maxWidth:780,margin:"0 auto",padding:"20px 16px"}}>
    {/* Demo Plan Switcher */}
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,padding:"6px 10px",borderRadius:8,background:`${T.accent}08`,border:`1px solid ${T.accent}15`}}>
      <span style={{fontSize:9,color:T.textDim,fontFamily:"monospace"}}>DEMO</span>
      {['FREE','BASIC','PRO','ENTERPRISE'].map(p=>(<button key={p} onClick={()=>setDemoPlan(p)} style={{padding:"4px 12px",borderRadius:6,border:demoPlan===p?"none":`1px solid ${T.border}`,fontSize:10,fontWeight:demoPlan===p?700:600,
        background:demoPlan===p?T.accent:`${T.surface}`,color:demoPlan===p?"#fff":T.text,cursor:"pointer"}}>{p}</button>))}
    </div>
    <div style={{display:"flex",gap:4,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
      {tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 16px",borderRadius:8,border:"none",background:tab===t.id?`${T.accent}15`:"transparent",color:tab===t.id?T.accent:T.textDim,fontSize:12,fontWeight:tab===t.id?700:500,cursor:"pointer",whiteSpace:"nowrap"}}>{t.label}</button>))}
    </div>
    {tab==='overview'&&<>
      {/* Score + State + Radar */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={{background:`linear-gradient(135deg,${T.bg3},${T.surface})`,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:10,color:T.textDim}}>{t('dateLabel',L)}</div>
          <div style={{display:"flex",alignItems:"baseline",gap:4,marginTop:8}}>
            <span style={{fontSize:42,fontWeight:900,color:T.good,fontFamily:"monospace"}}>68.5</span>
            <span style={{fontSize:14,color:T.textDim}}>/ 100</span>
          </div>
          <div style={{display:"flex",gap:16,marginTop:12}}>
            {[[t('good',L),good,T.good],[t('caution',L),caution,T.warn],[t('alert',L),alertCnt,T.danger]].map(([l,c,col])=>(<div key={l}><span style={{fontSize:20,fontWeight:800,color:col,fontFamily:"monospace"}}>{c}</span><span style={{fontSize:10,color:T.textDim,marginLeft:3}}>{l}</span></div>))}
          </div>
          <div style={{marginTop:12}}><StateIndicator lang={L}/></div>
        </div>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:12,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <RadarChart lang={L}/>
        </div>
      </div>
      {/* Dual Lock + Delta */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <DualLockIndicator lang={L}/>
        <DeltaAnalysis lang={L}/>
      </div>
      {/* Key Actions */}
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,marginBottom:16,border:`1px solid ${T.border}`}}>
        <div style={{fontSize:13,fontWeight:700,color:T.good,marginBottom:12}}>{t('keyActions',L)}</div>
        {(t('actions',L)||[]).map((txt,i)=>(<div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}><span style={{width:22,height:22,borderRadius:11,background:i===4?T.danger:i===0?T.good:T.warn,color:"#fff",fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span><span style={{fontSize:12,color:T.text,lineHeight:1.6}}>{txt}</span></div>))}
      </div>
      {/* Verdict */}
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,marginBottom:16,border:`1px solid ${T.border}`}}>
        <div style={{fontSize:13,fontWeight:700,color:T.warn,marginBottom:10}}>{t('verdictTitle',L)}</div>
        <div style={{fontSize:12,color:T.textMid,lineHeight:2}}>{t('verdictText',L)}</div>
      </div>
      {/* Satellite summary */}
      <div style={{background:`${T.sat}08`,borderRadius:T.cardRadius,padding:20,marginBottom:16,border:`1px solid ${T.sat}25`}}>
        <div style={{fontSize:13,fontWeight:700,color:T.sat,marginBottom:10}}>{t('satTimeline',L)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:`${T.good}06`,borderRadius:8,padding:12,border:`1px solid ${T.good}15`}}><div style={{fontSize:10,fontWeight:700,color:T.good,marginBottom:4}}>{t("satVerify",L)}</div><div style={{fontSize:10,color:T.textMid,lineHeight:1.7}}>{t("satVerifyDesc",L)}</div></div>
          <div style={{background:`${T.warn}06`,borderRadius:8,padding:12,border:`1px solid ${T.warn}15`}}><div style={{fontSize:10,fontWeight:700,color:T.warn,marginBottom:4}}>{t("satPredict",L)}</div><div style={{fontSize:10,color:T.textMid,lineHeight:1.7}}>{t("satPredictDesc",L)}</div></div>
        </div>
      </div>
      {/* 9 Systems */}
      <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>{t("nineSystems",L)}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        {Object.entries(SYS).map(([k,s])=>{const col=gc(s.g);return(<div key={k} style={{background:`${s.color}08`,borderRadius:8,padding:"12px 10px",border:`1px solid ${s.color}18`}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:16}}>{s.icon}</span><div style={{width:28,height:28,borderRadius:14,background:`conic-gradient(${col} ${s.sc}%, ${T.border} ${s.sc}%)`,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:20,height:20,borderRadius:10,background:T.bg2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:col}}>{s.sc}</div></div></div><div style={{fontSize:12,fontWeight:700,color:T.text,marginTop:4}}>{sysN(k,L)}</div><div style={{fontSize:9,color:T.textDim}}>{sysB(k,L)} · {s.keys.length} {t('gaugesLabel',L)}</div></div>);})}
      </div>
    </>}
    {tab==='report'&&<>
      <div style={{marginBottom:16}}><div style={{fontSize:18,fontWeight:800,color:T.text}}>{t("gaugeDetail",L)}</div><div style={{fontSize:11,color:T.textMid,marginTop:4}}>{t("gaugeDetailSub",L)}</div></div>
      {Object.entries(SYS).map(([k,sys])=>{
        const needsTier=!TIER_ACCESS[demoUser?.plan||'FREE']?.systems?.includes(k);
        const reqTier=k==='A1'?'FREE':['A2','A3'].includes(k)?'BASIC':'PRO';
        return needsTier?
          <TierLock key={k} plan={demoUser?.plan} req={reqTier} lang={L}>
            <SystemSection sysKey={k} sys={sys} expanded={expanded} toggle={toggle} lang={L}/>
          </TierLock>:
          <SystemSection key={k} sysKey={k} sys={sys} expanded={expanded} toggle={toggle} lang={L}/>;
      })}
    </>}
    {tab==='satellite'&&<>
      <div style={{marginBottom:16}}><div style={{fontSize:18,fontWeight:800,color:T.text}}>{t("satStatus",L)}</div></div>
      <TierLock plan={demoUser?.plan} req="PRO" lang={L}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {Object.values(D).filter(g=>isSat(g.c)).map(g=>{const s=SAT_META[g.c];return(<div key={g.c} style={{background:`${T.sat}08`,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.sat}25`}}><div style={{fontSize:13,fontWeight:700,color:T.text}}>{s.icon} {gN(g.c,L)}</div><div style={{fontSize:9,color:T.sat}}>{s.sat} · {s.freq}</div><div style={{fontSize:22,fontWeight:800,color:T.text,marginTop:8,fontFamily:"monospace"}}>{g.v}<span style={{fontSize:10,color:T.textDim,marginLeft:3}}>{g.u}</span></div><div style={{fontSize:10,color:T.textMid,marginTop:4}}>{g.note}</div></div>);})}
      </div>
      </TierLock>
    </>}
    {tab==='alerts'&&<>
      <div style={{marginBottom:16}}><div style={{fontSize:18,fontWeight:800,color:T.text}}>{t("alertCenter",L)}</div></div>
      <TierLock plan={demoUser?.plan} req="BASIC" lang={L}>
      {[{t:t('alert',L),c:T.danger,g:"D1",m:t('alertD1',L),d:"2026-01-15"},{t:t('alert',L),c:T.danger,g:"D3",m:t('alertD3',L),d:"2026-01-15"},{t:t('alert',L),c:T.danger,g:"L3",m:t('alertL3',L),d:"2026-01-12"},{t:t('caution',L),c:T.warn,g:"R2",m:t('alertR2',L),d:"2026-01-10"},{t:t('caution',L),c:T.warn,g:"C2",m:t('alertC2',L),d:"2026-01-08"},{t:t('stWatch',L),c:T.info,g:"I4",m:t('alertI4',L),d:"2026-01-05"}].map((a,i)=>(<div key={i} style={{background:T.surface,borderRadius:T.smRadius,padding:"14px 16px",border:`1px solid ${a.c}20`,marginBottom:8,display:"flex",gap:12,alignItems:"flex-start"}}>
        <span style={{width:8,height:8,borderRadius:4,background:a.c,marginTop:4,flexShrink:0}}/>
        <div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,fontWeight:700,color:a.c}}>{a.t} · {a.g}</span><span style={{fontSize:10,color:T.textDim}}>{a.d}</span></div><div style={{fontSize:12,color:T.text,lineHeight:1.5}}>{a.m}</div></div>
      </div>))}
      </TierLock>
    </>}
  </div>);
}

// ═══ 마이페이지 ═══
function MyPage({user,onNav,lang,setGlobalLang}){
  const [tab,setTab]=useState('profile');
  const [msg,setMsg]=useState('');
  const [profile,setProfile]=useState({name:user.name||'',phone:''});
  const [pw,setPw]=useState({cur:'',new1:'',new2:''});
  const [mileage,setMileage]=useState(3500);
  const [notifs,setNotifs]=useState({email:true,sms:false,kakao:true,slack:false,push:true});
  const [selectedLang,setSelectedLang]=useState(LANG_LIST.findIndex(l=>l.code===lang)||0);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [confirmCancel,setConfirmCancel]=useState(false);
  const L=lang||'ko';
  const flash=(m)=>{setMsg(m);setTimeout(()=>setMsg(''),2500);};
  const tabs=[{id:'profile',label:`👤 ${t('profile',L)}`},{id:'subscription',label:`💳 ${t('subscription',L)}`},{id:'mileage',label:`💎 ${t('mileage',L)}`},{id:'settings',label:`⚙️ ${t('settings',L)}`}];
  const inputStyle={width:"100%",padding:"12px 16px",borderRadius:10,border:`1px solid ${T.border}`,background:T.bg2,color:T.text,fontSize:13,outline:"none",boxSizing:"border-box"};
  const exchanges=[{n:t("exReport",L),p:500},{n:t("exHistory",L),p:300},{n:t("exApi",L),p:1000},{n:t("exExport",L),p:300},{n:t("exDiscount",L),p:100}];
  return(<div style={{maxWidth:680,margin:"0 auto",padding:"20px 16px"}}>
    {/* Toast */}
    {msg&&<div style={{position:"fixed",top:70,left:"50%",transform:"translateX(-50%)",padding:"10px 24px",borderRadius:10,background:T.good,color:"#fff",fontSize:13,fontWeight:700,zIndex:300,boxShadow:"0 4px 20px rgba(0,0,0,.3)",animation:"fadeIn .3s ease"}}>{msg}</div>}
    <div style={{display:"flex",gap:4,marginBottom:20}}>
      {tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 14px",borderRadius:8,border:"none",background:tab===t.id?`${T.accent}15`:"transparent",color:tab===t.id?T.accent:T.textDim,fontSize:12,fontWeight:tab===t.id?700:500,cursor:"pointer"}}>{t.label}</button>))}
    </div>
    {tab==='profile'&&<div>
      <h2 style={{fontSize:18,fontWeight:800,color:T.text,marginBottom:20}}>{t('profile',L)}</h2>
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:24,border:`1px solid ${T.border}`,display:"grid",gap:16}}>
        <div><label style={{fontSize:12,fontWeight:600,color:T.textMid,display:"block",marginBottom:6}}>{t("name",L)}</label><input value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value}))} style={inputStyle}/></div>
        <div><label style={{fontSize:12,fontWeight:600,color:T.textMid,display:"block",marginBottom:6}}>{t("email",L)}</label><input defaultValue={user.email} style={{...inputStyle,opacity:.6}} disabled/></div>
        <div><label style={{fontSize:12,fontWeight:600,color:T.textMid,display:"block",marginBottom:6}}>{t("phone",L)}</label><input value={profile.phone} onChange={e=>setProfile(p=>({...p,phone:e.target.value}))} placeholder="+82 10-0000-0000" style={inputStyle}/></div>
        <button onClick={()=>flash(t('profileSaved',L))} style={{padding:"12px",borderRadius:10,border:"none",background:T.accent,color:"#fff",fontWeight:700,cursor:"pointer",width:"fit-content"}}>{t("save",L)}</button>
      </div>
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:24,border:`1px solid ${T.border}`,marginTop:16}}>
        <h3 style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:12}}>{t("changePw",L)}</h3>
        <div style={{display:"grid",gap:12,maxWidth:360}}>
          <input type="password" placeholder={t("curPw",L)} value={pw.cur} onChange={e=>setPw(p=>({...p,cur:e.target.value}))} style={inputStyle}/>
          <input type="password" placeholder={t("newPw",L)} value={pw.new1} onChange={e=>setPw(p=>({...p,new1:e.target.value}))} style={inputStyle}/>
          <input type="password" placeholder={t("confirmPw",L)} value={pw.new2} onChange={e=>setPw(p=>({...p,new2:e.target.value}))} style={inputStyle}/>
          <button onClick={()=>{if(!pw.cur||!pw.new1){flash(t('fillAllFields',L));return;}if(pw.new1!==pw.new2){flash(t('pwMismatch',L));return;}flash(t('pwChanged',L));setPw({cur:'',new1:'',new2:''});}} style={{padding:"10px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bg2,color:T.text,fontWeight:600,cursor:"pointer",width:"fit-content"}}>{t("change",L)}</button>
        </div>
      </div>
    </div>}
    {tab==='subscription'&&<div>
      <h2 style={{fontSize:18,fontWeight:800,color:T.text,marginBottom:20}}>{t("subscription",L)}</h2>
      {confirmCancel?<div style={{background:T.surface,borderRadius:T.cardRadius,padding:32,border:`1px solid ${T.danger}30`,textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:12}}>⚠️</div>
        <div style={{fontSize:16,fontWeight:700,color:T.danger,marginBottom:8}}>{t("confirmCancelSub",L)}</div>
        <div style={{fontSize:12,color:T.textMid,lineHeight:1.8,marginBottom:20}}>{t("cancelInfo",L)}</div>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          <button onClick={()=>{setConfirmCancel(false);flash(t('subCancelled',L));}} style={{padding:"10px 24px",borderRadius:8,border:"none",background:T.danger,color:"#fff",fontWeight:700,cursor:"pointer"}}>{t("confirmCancelBtn",L)}</button>
          <button onClick={()=>setConfirmCancel(false)} style={{padding:"10px 24px",borderRadius:8,border:`1px solid ${T.border}`,background:"transparent",color:T.text,fontWeight:600,cursor:"pointer"}}>{t("goBack",L)}</button>
        </div>
      </div>:<div style={{background:T.surface,borderRadius:T.cardRadius,padding:24,border:`1px solid ${T.accent}30`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontSize:11,color:T.textDim}}>{t("curPlan",L)}</div><div style={{fontSize:24,fontWeight:900,color:T.accent,marginTop:4}}>🛰️ Pro</div><div style={{fontSize:13,color:T.text,marginTop:2}}>₩49,000{t('perMonth',L)}</div></div>
          <span style={{padding:"6px 14px",borderRadius:20,background:`${T.good}15`,color:T.good,fontSize:12,fontWeight:700}}>{t("active",L)}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {[[t("nextBill",L),"2026-03-01"],[t("payMethod",L),"Visa ****4242"],[t("streak",L),"3 months 🔥"]].map(([k,v])=>(<div key={k} style={{padding:12,background:T.bg2,borderRadius:8}}><div style={{fontSize:10,color:T.textDim}}>{k}</div><div style={{fontSize:13,fontWeight:700,color:T.text,marginTop:4}}>{v}</div></div>))}
        </div>
        <div style={{display:"flex",gap:8,marginTop:16}}>
          <button onClick={()=>flash(t('paymentPending',L))} style={{padding:"10px 16px",borderRadius:8,border:"none",background:T.accent,color:"#fff",fontWeight:600,cursor:"pointer"}}>{t("changePlan",L)}</button>
          <button onClick={()=>flash(t('paymentPending',L))} style={{padding:"10px 16px",borderRadius:8,border:`1px solid ${T.border}`,background:"transparent",color:T.textMid,fontWeight:600,cursor:"pointer"}}>{t("changePayment",L)}</button>
          <button onClick={()=>setConfirmCancel(true)} style={{padding:"10px 16px",borderRadius:8,border:`1px solid ${T.danger}30`,background:`${T.danger}08`,color:T.danger,fontWeight:600,cursor:"pointer"}}>{t("cancelSub",L)}</button>
        </div>
      </div>}
    </div>}
    {tab==='mileage'&&<div>
      <h2 style={{fontSize:18,fontWeight:800,color:T.text,marginBottom:20}}>{t("mileage",L)}</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`,textAlign:"center"}}><div style={{fontSize:10,color:T.textDim}}>{t("balance",L)}</div><div style={{fontSize:28,fontWeight:900,color:T.warn,marginTop:4}}>{mileage.toLocaleString()}</div><div style={{fontSize:10,color:T.textDim}}>P</div></div>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`,textAlign:"center"}}><div style={{fontSize:10,color:T.textDim}}>{t("earned",L)}</div><div style={{fontSize:28,fontWeight:900,color:T.good,marginTop:4}}>+420</div><div style={{fontSize:10,color:T.textDim}}>P</div></div>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`,textAlign:"center"}}><div style={{fontSize:10,color:T.textDim}}>{t("spent",L)}</div><div style={{fontSize:28,fontWeight:900,color:T.info,marginTop:4}}>-200</div><div style={{fontSize:10,color:T.textDim}}>P</div></div>
      </div>
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
        <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>{t("exchangeMenu",L)}</div>
        {exchanges.map(m=>(<div key={m.n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.border}`}}><span style={{fontSize:12,color:T.text}}>{m.n}</span><button onClick={()=>{if(mileage<m.p){flash(`⚠️ ${t('milInsufficient',L)} (${m.p}P)`);return;}setMileage(prev=>prev-m.p);flash(`✅ ${m.n} (-${m.p}P)`);}} style={{padding:"4px 12px",borderRadius:6,border:`1px solid ${T.warn}30`,background:`${T.warn}08`,color:T.warn,fontSize:11,fontWeight:700,cursor:"pointer"}}>{m.p}P</button></div>))}
      </div>
    </div>}
    {tab==='settings'&&<div>
      <h2 style={{fontSize:18,fontWeight:800,color:T.text,marginBottom:20}}>{t("notifSettings",L)}</h2>
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:24,border:`1px solid ${T.border}`}}>
        {[{k:"email",n:t("emailNotif",L),d:t("emailNotifDesc",L)},{k:"sms",n:t("smsNotif",L),d:t("smsNotifDesc",L)},{k:"kakao",n:t("kakaoNotif",L),d:t("kakaoNotifDesc",L)},{k:"slack",n:t("slackNotif",L),d:t("slackNotifDesc",L)},{k:"push",n:t("pushNotif",L),d:t("pushNotifDesc",L)}].map((s,i)=>(<div key={s.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:i<4?`1px solid ${T.border}`:"none"}}><div><div style={{fontSize:13,fontWeight:600,color:T.text}}>{s.n}</div><div style={{fontSize:10,color:T.textDim,marginTop:2}}>{s.d}</div></div><div onClick={()=>{setNotifs(p=>({...p,[s.k]:!p[s.k]}));flash(`${!notifs[s.k]?'✅':'⬜'} ${s.n}`);}} style={{width:44,height:24,borderRadius:12,background:notifs[s.k]?T.accent:T.border,cursor:"pointer",position:"relative",transition:"background .2s"}}><div style={{width:20,height:20,borderRadius:10,background:"#fff",position:"absolute",top:2,left:notifs[s.k]?22:2,transition:"left .2s"}}/></div></div>))}
      </div>
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:24,border:`1px solid ${T.border}`,marginTop:16}}>
        <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>{t('langSetting',L)}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {LANG_LIST.map((l,i)=>(<button key={i} onClick={()=>{setSelectedLang(i);if(setGlobalLang)setGlobalLang(l.code);flash(`✅ ${l.flag} ${l.name}`);}} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${i===selectedLang?T.accent:T.border}`,background:i===selectedLang?`${T.accent}15`:"transparent",color:i===selectedLang?T.accent:T.textMid,fontSize:12,fontWeight:i===selectedLang?700:500,cursor:"pointer"}}>{l.flag} {l.name}</button>))}
        </div>
      </div>
      {confirmDelete?<div style={{background:`${T.danger}06`,borderRadius:T.cardRadius,padding:24,border:`1px solid ${T.danger}30`,marginTop:16}}>
        <div style={{fontSize:14,fontWeight:700,color:T.danger,marginBottom:8}}>{t("confirmDeleteTitle",L)}</div>
        <div style={{fontSize:12,color:T.textMid,lineHeight:1.8,marginBottom:16}}>{t("confirmDeleteDesc",L)}</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{setConfirmDelete(false);flash(t('accountDeleted',L));}} style={{padding:"10px 20px",borderRadius:8,border:"none",background:T.danger,color:"#fff",fontWeight:700,cursor:"pointer"}}>{t("permDelete",L)}</button>
          <button onClick={()=>setConfirmDelete(false)} style={{padding:"10px 20px",borderRadius:8,border:`1px solid ${T.border}`,background:"transparent",color:T.text,fontWeight:600,cursor:"pointer"}}>{t("cancel",L)}</button>
        </div>
      </div>:<button onClick={()=>setConfirmDelete(true)} style={{marginTop:16,padding:"10px 16px",borderRadius:8,border:`1px solid ${T.danger}30`,background:"transparent",color:T.danger,fontSize:12,fontWeight:600,cursor:"pointer"}}>{t("deleteAccount",L)}</button>}
    </div>}
  </div>);
}

// ═══ 관리자 패널 ═══
// ═══ 상품관리 (쇼핑몰 풀기능) ═══
function ProductMgmt(){
  const [sub,setSub]=useState('list');
  const [detail,setDetail]=useState(null);
  const [editPrice,setEditPrice]=useState(null);
  const subs=[{id:'list',lb:'📋 상품목록'},{id:'price',lb:'💰 가격관리'},{id:'coupon',lb:'🎫 쿠폰'},{id:'category',lb:'📂 카테고리'},{id:'stats',lb:'📊 판매통계'}];
  const statusC={판매중:T.good,판매중지:T.danger,품절:T.textDim,준비중:T.warn,시즌종료:'#8b5cf6'};
  const products=[
    {id:'NAT-KR',name:'🇰🇷 한국 경제 진단',cat:'국가보고서',price:0,salePrice:null,tier:'Free',status:'판매중',stock:'무제한',sold:847,revenue:'₩0',desc:'한국 59게이지 전체 진단 · 9축 시스템 · 위성 교차검증 포함',recipe:'NATIONAL_REPORT',created:'2026-01-15',updated:'2026-02-10',views:12450,cvr:'6.8%',options:['위성 심층분석','국가 비교']},
    {id:'NAT-US',name:'🇺🇸 미국 경제 진단',cat:'국가보고서',price:19000,salePrice:15200,tier:'Basic+',status:'판매중',stock:'무제한',sold:234,revenue:'₩3.6M',desc:'미국 FRED 기반 59게이지 · 달러 경제권 심층 · 연준 정책 연동',recipe:'NATIONAL_REPORT',created:'2026-01-20',updated:'2026-02-08',views:8920,cvr:'2.6%',options:['위성 심층분석','한미 비교']},
    {id:'NAT-JP',name:'🇯🇵 일본 경제 진단',cat:'국가보고서',price:19000,salePrice:null,tier:'Basic+',status:'판매중',stock:'무제한',sold:156,revenue:'₩3.0M',desc:'일본 e-Stat 기반 · 엔화 경제권 · BOJ 정책 연동',recipe:'NATIONAL_REPORT',created:'2026-02-01',updated:'2026-02-10',views:4230,cvr:'3.7%',options:['위성 심층분석','한일 비교']},
    {id:'NAT-OECD',name:'🌍 OECD 38개국 패키지',cat:'국가보고서',price:49000,salePrice:39200,tier:'Pro',status:'판매중',stock:'무제한',sold:89,revenue:'₩3.5M',desc:'OECD 전체 38개국 라이트 진단 · 국가간 비교 · 위성 전체 커버',recipe:'NATIONAL_REPORT',created:'2026-02-05',updated:'2026-02-12',views:3100,cvr:'2.9%',options:['심층 업그레이드','PDF 보고서']},
    {id:'STK-KILLER',name:'🔥 킬러 10종목 위성감시',cat:'주식감시',price:29000,salePrice:null,tier:'Basic+',status:'준비중',stock:'100명 한정',sold:0,revenue:'₩0',desc:'Tesla·TSMC·삼성전자 등 위성 직접 감시 가능 10종목 · 공장 가동률+괴리Δ',recipe:'STOCK_SURVEILLANCE',created:'2026-02-10',updated:'2026-02-12',views:1560,cvr:'0%',options:['알림 설정','PDF 리포트']},
    {id:'STK-SECTOR',name:'📊 섹터 40종목 패키지',cat:'주식감시',price:49000,salePrice:null,tier:'Pro',status:'준비중',stock:'무제한',sold:0,revenue:'₩0',desc:'반도체·EV·에너지·물류 4대 섹터 대표 40종목 · 공급망 추적',recipe:'STOCK_SURVEILLANCE',created:'2026-02-10',updated:'2026-02-12',views:890,cvr:'0%',options:['섹터 비교','알림']},
    {id:'STK-GLOBAL',name:'🌐 글로벌 100종목 올인원',cat:'주식감시',price:99000,salePrice:79200,tier:'Pro',status:'준비중',stock:'무제한',sold:0,revenue:'₩0',desc:'21개국 100종목 · 276시설 좌표 · 전 센서 커버 · 월간 리포트',recipe:'STOCK_SURVEILLANCE',created:'2026-02-10',updated:'2026-02-12',views:620,cvr:'0%',options:['API 접근','맞춤 알림']},
    {id:'CMP-2NATION',name:'⚖️ 국가 비교 분석',cat:'애드온',price:9900,salePrice:null,tier:'Basic+',status:'판매중',stock:'무제한',sold:67,revenue:'₩660K',desc:'2개국 게이지 나란히 비교 · 차이 분석 · 위성 비교 이미지',recipe:'COMPARISON',created:'2026-02-01',updated:'2026-02-08',views:2100,cvr:'3.2%',options:['3개국 확장']},
    {id:'CST-BASIC',name:'🏭 위성 촬영 주문(기본)',cat:'커스터마이징',price:890000,salePrice:null,tier:'Enterprise',status:'판매중',stock:'월 5건',sold:2,revenue:'₩1.8M',desc:'지정 좌표 10m 위성 촬영 · 분석 보고서 · 3영업일 납품',recipe:'CUSTOM',created:'2026-01-20',updated:'2026-02-05',views:340,cvr:'0.6%',options:['30cm 업그레이드','긴급(1일)']},
    {id:'CST-PREMIUM',name:'💎 30cm 정밀 촬영 주문',cat:'커스터마이징',price:3500000,salePrice:null,tier:'Enterprise',status:'품절',stock:'월 2건 (소진)',sold:2,revenue:'₩7.0M',desc:'Maxar 30cm 초고해상도 · 전문 분석 · 기관 전용',recipe:'CUSTOM',created:'2026-01-25',updated:'2026-02-12',views:180,cvr:'1.1%',options:['정기 계약']},
    {id:'ADD-SEASON',name:'📅 계절 패턴 분석',cat:'애드온',price:4900,salePrice:null,tier:'Pro',status:'시즌종료',stock:'-',sold:45,revenue:'₩220K',desc:'계절성 지표 과거 5년 패턴 대비 현재 위치 진단',recipe:'COMPARISON',created:'2026-01-10',updated:'2026-02-01',views:980,cvr:'4.6%',options:[]},
  ];
  const cats=[...new Set(products.map(p=>p.cat))];
  const [filterCat,setFilterCat]=useState('전체');
  const [filterStatus,setFilterStatus]=useState('전체');
  const [searchQ,setSearchQ]=useState('');
  const filtered=products.filter(p=>(filterCat==='전체'||p.cat===filterCat)&&(filterStatus==='전체'||p.status===filterStatus)&&(!searchQ||p.name.includes(searchQ)||p.id.toLowerCase().includes(searchQ.toLowerCase())));
  const inputS={padding:"8px 12px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bg2,color:T.text,fontSize:11,outline:"none"};

  // 상품 상세
  if(detail){const p=detail;return(<div>
    <button onClick={()=>setDetail(null)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${T.border}`,background:"transparent",color:T.accent,fontSize:11,cursor:"pointer",marginBottom:16}}>← 목록으로</button>
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
      {/* 왼쪽: 상품 정보 */}
      <div>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div><div style={{fontSize:16,fontWeight:800,color:T.text}}>{p.name}</div><div style={{fontSize:10,color:T.textDim,fontFamily:"monospace",marginTop:2}}>SKU: {p.id}</div></div>
            <span style={{fontSize:9,padding:"3px 10px",borderRadius:6,background:`${statusC[p.status]}15`,color:statusC[p.status],fontWeight:700}}>{p.status}</span>
          </div>
          <div style={{fontSize:11,color:T.textMid,lineHeight:1.8,padding:"12px 0",borderTop:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}`}}>{p.desc}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginTop:12}}>
            {[["카테고리",p.cat],["Recipe",p.recipe],["최소 티어",p.tier],["재고",p.stock],["등록일",p.created],["최종수정",p.updated]].map(([k,v])=>(<div key={k}><div style={{fontSize:9,color:T.textDim}}>{k}</div><div style={{fontSize:11,fontWeight:600,color:T.text,marginTop:2}}>{v}</div></div>))}
          </div>
        </div>
        {/* 가격 */}
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:10}}>💰 가격 정보</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div><div style={{fontSize:9,color:T.textDim}}>정가</div><div style={{fontSize:18,fontWeight:800,color:T.text,fontFamily:"monospace",marginTop:2}}>₩{p.price.toLocaleString()}</div></div>
            <div><div style={{fontSize:9,color:T.textDim}}>판매가 {p.salePrice?'(할인중)':''}</div><div style={{fontSize:18,fontWeight:800,color:p.salePrice?T.danger:T.text,fontFamily:"monospace",marginTop:2}}>₩{(p.salePrice||p.price).toLocaleString()}</div></div>
            <div><div style={{fontSize:9,color:T.textDim}}>할인율</div><div style={{fontSize:18,fontWeight:800,color:p.salePrice?T.good:T.textDim,fontFamily:"monospace",marginTop:2}}>{p.salePrice?Math.round((1-p.salePrice/p.price)*100)+'%':'-'}</div></div>
          </div>
          <div style={{display:"flex",gap:6,marginTop:12}}>
            <button style={{padding:"6px 14px",borderRadius:6,border:"none",background:T.accent,color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer"}}>가격 수정</button>
            <button style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${T.danger}30`,background:`${T.danger}08`,color:T.danger,fontSize:10,fontWeight:600,cursor:"pointer"}}>할인 설정</button>
            <button style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${T.border}`,background:"transparent",color:T.textMid,fontSize:10,fontWeight:600,cursor:"pointer"}}>가격 이력</button>
          </div>
        </div>
        {/* 옵션 */}
        {p.options.length>0&&<div style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:8}}>🧩 옵션 / 애드온</div>
          {p.options.map(o=>(<div key={o} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${T.border}`}}>
            <span style={{fontSize:11,color:T.text}}>{o}</span>
            <div style={{display:"flex",gap:4}}><span style={{fontSize:9,padding:"2px 8px",borderRadius:4,background:`${T.good}15`,color:T.good}}>활성</span></div>
          </div>))}
        </div>}
      </div>
      {/* 오른쪽: 판매 현황 + 조치 */}
      <div>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:10}}>📊 판매 현황</div>
          {[["누적 판매",p.sold+"건"],["누적 매출",p.revenue],["조회수",p.views.toLocaleString()],["전환율",p.cvr]].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.border}`,fontSize:11}}>
            <span style={{color:T.textDim}}>{k}</span><span style={{fontWeight:700,color:T.text,fontFamily:"monospace"}}>{v}</span>
          </div>))}
        </div>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:10}}>⚡ 즉시 조치</div>
          <div style={{display:"grid",gap:6}}>
            {[["판매 중지",T.danger,"이 상품을 즉시 비공개합니다"],["품절 처리",T.warn,"재고 소진 표시 (페이지 유지)"],["가격 변경",T.accent,"정가/할인가 즉시 변경"],["시즌 종료","#8b5cf6","시즌 상품 마감 처리"],["상품 복제",T.info,"동일 구성으로 새 상품 생성"],["삭제",T.danger,"영구 삭제 (복구 불가)"]].map(([lb,c,desc])=>(<button key={lb} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderRadius:8,border:`1px solid ${c}20`,background:`${c}06`,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:10,fontWeight:700,color:c}}>{lb}</span>
              <span style={{fontSize:8,color:T.textDim}}>{desc}</span>
            </button>))}
          </div>
        </div>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:8}}>📝 변경 이력</div>
          {[["02-12","가격 v2 적용"],["02-10","할인 20% 설정"],["02-05","상품 등록"],].map(([d,a])=>(<div key={d+a} style={{display:"flex",gap:8,padding:"4px 0",fontSize:9}}>
            <span style={{color:T.textDim,fontFamily:"monospace"}}>{d}</span><span style={{color:T.textMid}}>{a}</span>
          </div>))}
        </div>
      </div>
    </div>
  </div>);}

  return(<div>
    {/* 서브탭 */}
    <div style={{display:"flex",gap:4,marginBottom:16}}>
      {subs.map(s=>(<button key={s.id} onClick={()=>setSub(s.id)} style={{padding:"6px 12px",borderRadius:8,border:"none",background:sub===s.id?`${T.accent}15`:"transparent",color:sub===s.id?T.accent:T.textDim,fontSize:11,fontWeight:sub===s.id?700:500,cursor:"pointer"}}>{s.lb}</button>))}
    </div>

    {sub==='list'&&<>
      {/* 요약 카드 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:16}}>
        {[["전체 상품",products.length,T.accent],["판매중",products.filter(p=>p.status==='판매중').length,T.good],["준비중",products.filter(p=>p.status==='준비중').length,T.warn],["품절",products.filter(p=>p.status==='품절').length,T.danger],["총 매출","₩19.8M",T.accent]].map(([n,v,c])=>(<div key={n} style={{background:T.surface,borderRadius:T.smRadius,padding:10,border:`1px solid ${T.border}`,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:800,color:c,fontFamily:"monospace"}}>{v}</div><div style={{fontSize:8,color:T.textDim}}>{n}</div>
        </div>))}
      </div>
      {/* 필터 + 검색 + 신규버튼 */}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="상품명 / SKU 검색..." style={{...inputS,flex:1}}/>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={inputS}><option>전체</option>{cats.map(c=>(<option key={c}>{c}</option>))}</select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={inputS}><option>전체</option>{Object.keys(statusC).map(s=>(<option key={s}>{s}</option>))}</select>
        <button style={{padding:"8px 14px",borderRadius:8,border:"none",background:T.accent,color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>+ 신규 상품</button>
      </div>
      {/* 상품 테이블 */}
      <div style={{background:T.surface,borderRadius:T.cardRadius,border:`1px solid ${T.border}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2.5fr 1fr 1fr 1fr 0.8fr 0.8fr 0.6fr",padding:"8px 12px",background:T.bg3,fontSize:9,fontWeight:700,color:T.textDim}}>
          <span>상품명</span><span>카테고리</span><span>판매가</span><span>상태</span><span>재고</span><span>판매</span><span>상세</span>
        </div>
        {filtered.map(p=>(<div key={p.id} style={{display:"grid",gridTemplateColumns:"2.5fr 1fr 1fr 1fr 0.8fr 0.8fr 0.6fr",padding:"10px 12px",borderBottom:`1px solid ${T.border}`,fontSize:10,alignItems:"center"}}>
          <div><div style={{fontWeight:600,color:T.text}}>{p.name}</div><div style={{fontSize:8,color:T.textDim,fontFamily:"monospace"}}>{p.id}</div></div>
          <span style={{color:T.textMid}}>{p.cat}</span>
          <div>{p.salePrice&&<span style={{textDecoration:"line-through",color:T.textDim,fontSize:9,marginRight:4}}>₩{(p.price/1000).toFixed(0)}K</span>}<span style={{fontWeight:700,color:p.salePrice?T.danger:T.text,fontFamily:"monospace"}}>₩{((p.salePrice||p.price)/1000).toFixed(0)}K</span></div>
          <span style={{fontSize:9,padding:"2px 8px",borderRadius:4,background:`${statusC[p.status]}12`,color:statusC[p.status],fontWeight:700,display:"inline-block",width:"fit-content"}}>{p.status}</span>
          <span style={{fontSize:9,color:p.stock==='무제한'?T.textDim:p.stock.includes('소진')?T.danger:T.warn}}>{p.stock}</span>
          <span style={{fontWeight:700,color:T.text,fontFamily:"monospace"}}>{p.sold}</span>
          <button onClick={()=>setDetail(p)} style={{padding:"4px 8px",borderRadius:4,border:`1px solid ${T.accent}30`,background:`${T.accent}08`,color:T.accent,fontSize:9,fontWeight:600,cursor:"pointer"}}>상세</button>
        </div>))}
      </div>
      <div style={{fontSize:9,color:T.textDim,marginTop:6,textAlign:"right"}}>{filtered.length}개 표시 / 전체 {products.length}개</div>
    </>}

    {sub==='price'&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,fontWeight:700,color:T.text}}>💰 가격 정책 관리</span>
        <div style={{display:"flex",gap:6}}><span style={{fontSize:8,padding:"3px 10px",borderRadius:6,background:`${T.good}15`,color:T.good,fontWeight:600}}>현행 v2 · 2026-02-10</span>
          <button style={{padding:"4px 10px",borderRadius:6,border:"none",background:T.accent,color:"#fff",fontSize:9,fontWeight:700,cursor:"pointer"}}>새 버전</button></div>
      </div>
      {/* 구독 플랜 */}
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`,marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:10}}>📋 구독 플랜 (월간/연간)</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
          {[["Free","₩0","₩0","7게이지·1축",T.textMid,580],["Basic","₩19,000","₩190,000","21게이지·3축·알림",T.info,320],["Pro","₩49,000","₩490,000","59게이지·위성·전체",T.accent,285],["Enterprise","₩450,000","협의","API·팀·커스텀","#f59e0b",62]].map(([n,m,y,d,c,cnt])=>(<div key={n} style={{padding:12,borderRadius:8,background:`${c}06`,border:`1px solid ${c}15`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,fontWeight:700,color:c}}>{n}</span><span style={{fontSize:8,color:T.textDim}}>{cnt}명</span></div>
            <div style={{fontSize:16,fontWeight:800,color:T.text,fontFamily:"monospace",marginTop:6}}>{m}</div>
            <div style={{fontSize:9,color:T.textDim}}>연간: {y}</div>
            <div style={{fontSize:8,color:T.textDim,marginTop:4}}>{d}</div>
            <button style={{marginTop:8,padding:"4px 10px",borderRadius:4,border:`1px solid ${c}30`,background:"transparent",color:c,fontSize:9,fontWeight:600,cursor:"pointer",width:"100%"}}>가격 수정</button>
          </div>))}
        </div>
      </div>
      {/* 개별 상품 가격 일괄수정 */}
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:11,fontWeight:700,color:T.text}}>🏷️ 개별 상품 가격</span>
          <div style={{display:"flex",gap:6}}>
            <button style={{padding:"4px 10px",borderRadius:4,border:`1px solid ${T.warn}30`,background:`${T.warn}08`,color:T.warn,fontSize:9,fontWeight:600,cursor:"pointer"}}>일괄 할인</button>
            <button style={{padding:"4px 10px",borderRadius:4,border:`1px solid ${T.danger}30`,background:`${T.danger}08`,color:T.danger,fontSize:9,fontWeight:600,cursor:"pointer"}}>할인 해제</button>
          </div>
        </div>
        {products.filter(p=>p.price>0).map(p=>(<div key={p.id} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 0.8fr",padding:"6px 0",borderBottom:`1px solid ${T.border}`,fontSize:10,alignItems:"center"}}>
          <span style={{fontWeight:600,color:T.text}}>{p.name}</span>
          <span style={{fontFamily:"monospace",color:T.textDim}}>₩{p.price.toLocaleString()}</span>
          <span style={{fontFamily:"monospace",color:p.salePrice?T.danger:T.textDim}}>₩{(p.salePrice||p.price).toLocaleString()}</span>
          <span style={{color:p.salePrice?T.good:T.textDim}}>{p.salePrice?Math.round((1-p.salePrice/p.price)*100)+'% 할인':'-'}</span>
          <button style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${T.accent}30`,background:`${T.accent}08`,color:T.accent,fontSize:9,cursor:"pointer"}}>수정</button>
        </div>))}
      </div>
      {/* 가격 이력 */}
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`}}>
        <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:8}}>📜 가격 변경 이력</div>
        {[["v2","2026-02-10","Pro ₩49K, 연간 할인 도입, OECD 패키지 20%할인","현행"],["v1","2026-01-15","초기 가격 설정, Basic ₩19K/Pro ₩49K/Enterprise ₩450K","만료"]].map(([ver,d,desc,s])=>(<div key={ver} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.border}`,alignItems:"center"}}>
          <span style={{fontSize:10,fontWeight:700,color:s==='현행'?T.good:T.textDim,minWidth:24}}>{ver}</span>
          <span style={{fontSize:9,color:T.textDim,fontFamily:"monospace",minWidth:70}}>{d}</span>
          <span style={{fontSize:9,color:T.textMid,flex:1}}>{desc}</span>
          <span style={{fontSize:8,padding:"2px 6px",borderRadius:4,background:s==='현행'?`${T.good}15`:`${T.textDim}15`,color:s==='현행'?T.good:T.textDim}}>{s}</span>
        </div>))}
      </div>
    </>}

    {sub==='coupon'&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,fontWeight:700,color:T.text}}>🎫 쿠폰 / 프로모션</span>
        <button style={{padding:"6px 14px",borderRadius:8,border:"none",background:T.accent,color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer"}}>+ 새 쿠폰 생성</button>
      </div>
      <div style={{background:T.surface,borderRadius:T.cardRadius,border:`1px solid ${T.border}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.5fr 0.6fr 1fr 1fr 0.8fr 1.2fr 0.6fr",padding:"8px 12px",background:T.bg3,fontSize:9,fontWeight:700,color:T.textDim}}>
          <span>코드</span><span>할인</span><span>적용 범위</span><span>기간</span><span>사용/한도</span><span>남용감지</span><span>상태</span>
        </div>
        {[
          {code:"LAUNCH2026",disc:"30%",scope:"전체 플랜",start:"02-01",expire:"03-31",used:47,max:100,abuse:0,status:"활성"},
          {code:"YOUTUBE50",disc:"50%",scope:"Pro 첫달·신규만",start:"02-10",expire:"06-30",used:12,max:500,abuse:0,status:"활성"},
          {code:"EARLYBIRD",disc:"20%",scope:"연간 결제",start:"01-15",expire:"02-28",used:89,max:100,abuse:2,status:"만료임박"},
          {code:"PARTNER10",disc:"₩10K",scope:"Basic+·재구매",start:"02-05",expire:"12-31",used:5,max:50,abuse:0,status:"활성"},
          {code:"TEST100",disc:"100%",scope:"내부 테스트",start:"02-01",expire:"02-28",used:3,max:5,abuse:0,status:"내부"},
        ].map(cp=>(<div key={cp.code} style={{display:"grid",gridTemplateColumns:"1.5fr 0.6fr 1fr 1fr 0.8fr 1.2fr 0.6fr",padding:"8px 12px",borderBottom:`1px solid ${T.border}`,fontSize:10,alignItems:"center"}}>
          <span style={{fontWeight:700,color:T.accent,fontFamily:"monospace"}}>{cp.code}</span>
          <span style={{fontWeight:700,color:T.good}}>{cp.disc}</span>
          <span style={{color:T.textDim,fontSize:9}}>{cp.scope}</span>
          <span style={{color:T.textDim,fontSize:9}}>{cp.start}~{cp.expire}</span>
          <div><div style={{height:4,background:T.border,borderRadius:2,overflow:"hidden",marginBottom:2}}><div style={{width:`${cp.used/cp.max*100}%`,height:"100%",background:cp.used/cp.max>0.8?T.warn:T.accent}}/></div><span style={{fontSize:8,color:T.textDim}}>{cp.used}/{cp.max}</span></div>
          <span style={{fontSize:9,color:cp.abuse>0?T.danger:T.textDim}}>{cp.abuse>0?`⚠️ ${cp.abuse}건 의심`:'정상'}</span>
          <span style={{fontSize:8,padding:"2px 6px",borderRadius:4,background:`${cp.status==='활성'?T.good:cp.status==='만료임박'?T.warn:cp.status==='내부'?T.sat:T.textDim}15`,color:cp.status==='활성'?T.good:cp.status==='만료임박'?T.warn:cp.status==='내부'?T.sat:T.textDim,fontWeight:600}}>{cp.status}</span>
        </div>))}
      </div>
      <div style={{background:`${T.warn}08`,borderRadius:T.smRadius,padding:12,border:`1px solid ${T.warn}15`,marginTop:10}}>
        <div style={{fontSize:10,fontWeight:700,color:T.warn}}>🔍 남용 감지 정책</div>
        <div style={{fontSize:9,color:T.textDim,marginTop:4,lineHeight:1.6}}>동일 카드 3회 이상 · 동일 이메일 도메인 5회 이상 · VPN/프록시 차단 · 가입 24시간 내 쿠폰 사용 제한</div>
      </div>
    </>}

    {sub==='category'&&<>
      <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>📂 상품 카테고리 관리</div>
      {[
        {name:"국가보고서",icon:"🌍",cnt:4,active:3,desc:"OECD 38개국 + 아시아 4개국 + 중국(위성전용) = 43개국 경제 진단 보고서",phase:"1단계 · 진열/인프라",c:T.accent},
        {name:"주식감시",icon:"📈",cnt:3,active:0,desc:"100종목 · 276시설 · 21개국 · 위성 직접 감시 기반 종목 시그널",phase:"2단계 · 킬러/매출",c:T.sat},
        {name:"애드온",icon:"🧩",cnt:2,active:1,desc:"국가 비교, 계절 패턴 등 기본 상품에 추가 가능한 부가 서비스",phase:"보조 상품",c:T.info},
        {name:"커스터마이징",icon:"🏭",cnt:2,active:1,desc:"268개 카탈로그 · 10m~30cm 촬영 · 주문제작 · Enterprise 전용",phase:"3단계 · 프리미엄",c:"#f59e0b"},
      ].map(cat=>(<div key={cat.name} style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${cat.c}15`,marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22}}>{cat.icon}</span>
            <div><div style={{fontSize:13,fontWeight:700,color:T.text}}>{cat.name}</div><div style={{fontSize:9,color:cat.c,fontWeight:600}}>{cat.phase}</div></div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:9,color:T.textDim}}>{cat.cnt}개 상품 · {cat.active}개 판매중</div>
            <div style={{display:"flex",gap:4,marginTop:4,justifyContent:"flex-end"}}>
              <button style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${T.accent}30`,background:`${T.accent}08`,color:T.accent,fontSize:9,cursor:"pointer"}}>수정</button>
              <button style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${T.border}`,background:"transparent",color:T.textDim,fontSize:9,cursor:"pointer"}}>숨김</button>
            </div>
          </div>
        </div>
        <div style={{fontSize:10,color:T.textMid,marginTop:8,lineHeight:1.6}}>{cat.desc}</div>
      </div>))}
    </>}

    {sub==='stats'&&<>
      <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>📊 판매 통계</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[["총 매출","₩19.8M",T.good],["총 판매","1,440건",T.accent],["평균 객단가","₩13,750",T.info],["전환율","3.2%",T.warn]].map(([n,v,c])=>(<div key={n} style={{background:T.surface,borderRadius:T.smRadius,padding:12,border:`1px solid ${T.border}`,textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:800,color:c,fontFamily:"monospace"}}>{v}</div><div style={{fontSize:9,color:T.textDim}}>{n}</div>
        </div>))}
      </div>
      {/* 상품별 매출 랭킹 */}
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`,marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:10}}>🏆 상품별 매출 순위</div>
        {products.filter(p=>p.sold>0).sort((a,b)=>{const parse=s=>{const n=parseFloat(s.replace(/[₩,KM]/g,''));return s.includes('M')?n*1e6:s.includes('K')?n*1e3:n};return parse(b.revenue)-parse(a.revenue)}).map((p,i)=>(<div key={p.id} style={{display:"grid",gridTemplateColumns:"0.3fr 2fr 1fr 1fr 1.5fr",padding:"8px 0",borderBottom:`1px solid ${T.border}`,fontSize:10,alignItems:"center"}}>
          <span style={{fontWeight:800,color:i<3?T.accent:T.textDim}}>{i+1}</span>
          <span style={{fontWeight:600,color:T.text}}>{p.name}</span>
          <span style={{fontFamily:"monospace",color:T.accent}}>{p.revenue}</span>
          <span style={{color:T.textDim}}>{p.sold}건</span>
          <div style={{height:6,background:T.border,borderRadius:3,overflow:"hidden"}}><div style={{width:`${Math.min(p.sold/847*100,100)}%`,height:"100%",background:i<3?T.accent:T.info,borderRadius:3}}/></div>
        </div>))}
      </div>
      {/* 카테고리별 */}
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`}}>
        <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:10}}>📂 카테고리별 비중</div>
        {[["국가보고서","₩10.1M","51%",T.accent],["커스터마이징","₩8.8M","44%","#f59e0b"],["애드온","₩880K","5%",T.info],["주식감시","₩0","0%",T.sat]].map(([n,rev,pct,c])=>(<div key={n} style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}><span style={{color:c,fontWeight:600}}>{n}</span><span style={{color:T.textDim}}>{rev} ({pct})</span></div>
          <div style={{height:6,background:T.border,borderRadius:3,overflow:"hidden"}}><div style={{width:pct,height:"100%",background:c,borderRadius:3}}/></div>
        </div>))}
      </div>
    </>}
  </div>);
}

function AdminPage({lang}){
  const L=lang||'ko';
  const [tab,setTab]=useState('kpi');
  const [search,setSearch]=useState('');
  const tabs=[{id:'kpi',label:'📊 KPI'},{id:'members',label:'👥 회원'},{id:'products',label:'🛒 상품'},{id:'pipeline',label:'🔄 파이프라인'},{id:'billing',label:'💳 결제'},{id:'engine',label:'🔧 엔진'},{id:'audit',label:'📋 감사'},{id:'settings',label:'⚙️ 설정'}];
  const members=[
    {n:"김투자",e:"kim@gmail.com",p:"Pro",s:"활성",d:"2026-02-10",ml:3500},
    {n:"박분석",e:"park@naver.com",p:"Basic",s:"활성",d:"2026-02-08",ml:1200},
    {n:"이글로벌",e:"lee@yahoo.com",p:"Free",s:"활성",d:"2026-02-05",ml:500},
    {n:"최데이터",e:"choi@gmail.com",p:"Pro",s:"활성",d:"2026-01-28",ml:8200},
    {n:"정위성",e:"jung@daum.net",p:"Enterprise",s:"활성",d:"2026-01-15",ml:15000},
    {n:"한리서치",e:"han@corp.co.kr",p:"Basic",s:"정지",d:"2026-01-10",ml:0},
  ];
  const filtered=members.filter(m=>!search||m.n.includes(search)||m.e.includes(search));
  const inputS={padding:"10px 14px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bg2,color:T.text,fontSize:12,outline:"none",boxSizing:"border-box"};
  return(<div style={{maxWidth:860,margin:"0 auto",padding:"20px 16px"}}>
    <h2 style={{fontSize:18,fontWeight:800,color:T.text,marginBottom:16}}>⚙️ 관리자 패널</h2>
    <div style={{display:"flex",gap:4,marginBottom:20,overflowX:"auto"}}>
      {tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 14px",borderRadius:8,border:"none",background:tab===t.id?`${T.accent}15`:"transparent",color:tab===t.id?T.accent:T.textDim,fontSize:12,fontWeight:tab===t.id?700:500,cursor:"pointer",whiteSpace:"nowrap"}}>{t.label}</button>))}
    </div>

    {tab==='kpi'&&<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[["총 회원","1,247",T.accent,"+12%↑"],["월 매출","₩18.5M",T.good,"+8.3%↑"],["활성 구독","892",T.info,"71.5%"],["마일리지","1.2M P",T.warn,"+15%↑"]].map(([n,v,c,d])=>(<div key={n} style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`}}><div style={{fontSize:10,color:T.textDim}}>{n}</div><div style={{fontSize:22,fontWeight:800,color:c,marginTop:6,fontFamily:"monospace"}}>{v}</div><div style={{fontSize:10,color:T.good,marginTop:4}}>{d}</div></div>))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>📈 등급별 분포</div>
          {[["Free",580,"46.5%",T.textMid],["Basic",320,"25.7%",T.info],["Pro",285,"22.9%",T.accent],["Enterprise",62,"5.0%","#f59e0b"]].map(([n,c,p,col])=>(<div key={n} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}><span style={{color:col,fontWeight:600}}>{n}</span><span style={{color:T.textDim}}>{c}명 ({p})</span></div><div style={{height:6,background:T.border,borderRadius:3,overflow:"hidden"}}><div style={{width:p,height:"100%",background:col,borderRadius:3}}/></div></div>))}
        </div>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>🕐 최근 가입</div>
          {members.slice(0,4).map(u=>(<div key={u.e} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.border}`}}><div><div style={{fontSize:12,fontWeight:600,color:T.text}}>{u.n}</div><div style={{fontSize:10,color:T.textDim}}>{u.e}</div></div><div style={{textAlign:"right"}}><span style={{fontSize:10,fontWeight:600,color:T.accent}}>{u.p}</span><div style={{fontSize:9,color:T.textDim}}>{u.d}</div></div></div>))}
        </div>
      </div>
    </>}

    {tab==='members'&&<>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="이름 또는 이메일 검색..." style={{...inputS,flex:1}}/>
        <select style={{...inputS,width:120}}><option>전체 등급</option><option>Free</option><option>Basic</option><option>Pro</option><option>Enterprise</option></select>
        <select style={{...inputS,width:100}}><option>전체 상태</option><option>{t("active",L)}</option><option>정지</option></select>
      </div>
      <div style={{background:T.surface,borderRadius:T.cardRadius,border:`1px solid ${T.border}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.5fr 2fr 1fr 1fr 1fr 1fr",padding:"10px 16px",background:T.bg3,fontSize:10,fontWeight:700,color:T.textDim}}>
          <span>이름</span><span>이메일</span><span>등급</span><span>상태</span><span>{t("mileage",L)}</span><span>가입일</span>
        </div>
        {filtered.map(m=>(<div key={m.e} style={{display:"grid",gridTemplateColumns:"1.5fr 2fr 1fr 1fr 1fr 1fr",padding:"10px 16px",borderBottom:`1px solid ${T.border}`,fontSize:11,alignItems:"center"}}>
          <span style={{fontWeight:600,color:T.text}}>{m.n}</span>
          <span style={{color:T.textMid}}>{m.e}</span>
          <span style={{color:T.accent,fontWeight:600}}>{m.p}</span>
          <span style={{color:m.s==="활성"?T.good:T.danger,fontWeight:600}}>{m.s}</span>
          <span style={{color:T.warn,fontFamily:"monospace"}}>{m.ml.toLocaleString()}P</span>
          <span style={{color:T.textDim}}>{m.d}</span>
        </div>))}
      </div>
      <div style={{fontSize:10,color:T.textDim,marginTop:8,textAlign:"right"}}>{filtered.length}명 표시 / 전체 1,247명</div>
    </>}

    {tab==='engine'&&<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        {[["데이터 수집","59/59 게이지",T.good,"전체 수집 완료"],["위성 연동","4/4 소스",T.good,"NASA+ESA 정상"],["API 응답","avg 120ms",T.good,"P95: 240ms"]].map(([n,v,c,d])=>(<div key={n} style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`}}><div style={{fontSize:10,color:T.textDim}}>{n}</div><div style={{fontSize:18,fontWeight:800,color:c,marginTop:4,fontFamily:"monospace"}}>{v}</div><div style={{fontSize:10,color:T.textDim,marginTop:4}}>{d}</div></div>))}
      </div>
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>🛰️ 위성 데이터 수집 현황</div>
        {[["VIIRS DNB (야간광)","2026-02-12 06:00","정상",T.good],["Sentinel-5P (NO₂)","2026-02-12 04:30","정상",T.good],["Sentinel-1 (SAR)","2026-02-08","정상 (12일 주기)",T.good],["Landsat-9 (열적외선)","2026-02-05","정상 (16일 주기)",T.good]].map(([n,d,s,c])=>(<div key={n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.border}`}}><div><div style={{fontSize:12,fontWeight:600,color:T.text}}>{n}</div><div style={{fontSize:10,color:T.textDim}}>마지막 수집: {d}</div></div><span style={{fontSize:11,fontWeight:700,color:c}}>{s}</span></div>))}
      </div>
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
        <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>📊 59게이지 수집 상태</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(9,1fr)",gap:6}}>
          {Object.entries(SYS).map(([k,s])=>(<div key={k} style={{textAlign:"center"}}><div style={{fontSize:14}}>{s.icon}</div><div style={{fontSize:9,fontWeight:600,color:T.text}}>{sysN(k,L).slice(0,3)}</div><div style={{fontSize:9,color:T.good,fontWeight:700}}>{s.keys.length}/{s.keys.length}</div></div>))}
        </div>
      </div>
    </>}

    {tab==='products'&&<ProductMgmt/>}


    {tab==='pipeline'&&<>
      {/* 이상징후 경보 */}
      <div style={{background:`${T.danger}08`,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.danger}20`,marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:T.danger,marginBottom:8}}>⚠️ 이상 징후 (2건)</div>
        {[["KOSIS 실업률 수집 지연","예상 2/10 → 미수신 · 72시간 초과","2026-02-13"],["Sentinel-5P NO₂ 결측","구름 피복 92% · 한반도 전역","2026-02-12"]].map(([tt,d,ts])=>(<div key={tt} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.danger}10`}}>
          <div><div style={{fontSize:11,fontWeight:600,color:T.text}}>{tt}</div><div style={{fontSize:9,color:T.textDim}}>{d}</div></div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:9,color:T.textDim}}>{ts}</span>
            <button style={{padding:"4px 10px",borderRadius:6,border:"none",background:T.warn,color:"#fff",fontSize:9,fontWeight:700,cursor:"pointer"}}>Hold</button></div>
        </div>))}
      </div>
      {/* 소스별 상태 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
        {[["ECOS",32,"정상","2/12",T.good],["KOSIS",27,"지연","미수신",T.warn],["VIIRS",1,"정상","2/12",T.good],["S-5P",1,"결측","구름92%",T.danger],["S-1 SAR",1,"정상","2/08",T.good],["Landsat",1,"정상","2/05",T.good]].map(([n,cnt,s,d,c])=>(<div key={n} style={{background:T.surface,borderRadius:T.smRadius,padding:12,border:`1px solid ${c}20`}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,fontWeight:700,color:T.text}}>{n}</span><span style={{width:6,height:6,borderRadius:3,background:c}}/></div>
          <div style={{fontSize:9,color:c,fontWeight:600,marginTop:4}}>{s}</div><div style={{fontSize:8,color:T.textDim}}>{cnt}지표 · {d}</div>
        </div>))}
      </div>
      {/* QA/Hold */}
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`,marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:10}}>🎯 QA / Hold</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}}>
          {[["관측품질",94,T.good],["센서일관",87,T.good],["결측안정",71,T.warn],["Hold",2,T.danger]].map(([n,v,c])=>(<div key={n} style={{textAlign:"center",padding:6,background:`${c}08`,borderRadius:6}}>
            <div style={{fontSize:16,fontWeight:800,color:c,fontFamily:"monospace"}}>{n==='Hold'?v+'건':v+'%'}</div><div style={{fontSize:8,color:T.textDim}}>{n}</div>
          </div>))}
        </div>
      </div>
      {/* 재처리 */}
      <div style={{display:"flex",gap:8}}>
        <button style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${T.accent}30`,background:`${T.accent}08`,color:T.accent,fontSize:10,fontWeight:600,cursor:"pointer"}}>KOSIS 재수집</button>
        <button style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${T.warn}30`,background:`${T.warn}08`,color:T.warn,fontSize:10,fontWeight:600,cursor:"pointer"}}>2월 재계산</button>
      </div>
    </>}

    {tab==='billing'&&<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[["MRR","₩18.5M",T.good],["활성구독","892",T.accent],["결제실패","3건",T.danger],["환불대기","1건",T.warn]].map(([n,v,c])=>(<div key={n} style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`}}><div style={{fontSize:10,color:T.textDim}}>{n}</div><div style={{fontSize:20,fontWeight:800,color:c,marginTop:6,fontFamily:"monospace"}}>{v}</div></div>))}
      </div>
      {/* 결제실패 */}
      <div style={{background:`${T.danger}06`,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.danger}15`,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:12,fontWeight:700,color:T.text}}>💳 결제 실패 플로우</span>
          <button style={{padding:"5px 12px",borderRadius:6,border:"none",background:T.danger,color:"#fff",fontSize:9,fontWeight:700,cursor:"pointer"}}>일괄 리마인드</button>
        </div>
        {[{n:"박분석",p:"Basic",a:"₩19K",r:"카드만료",step:"1차 리마인드"},{n:"강데이터",p:"Pro",a:"₩49K",r:"잔액부족",step:"2차 리마인드"},{n:"오분석",p:"Basic",a:"₩19K",r:"카드분실",step:"다운그레이드 예정"}].map((x,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.danger}10`,fontSize:10,alignItems:"center"}}>
          <span style={{fontWeight:600,color:T.text}}>{x.n}</span><span style={{color:T.accent}}>{x.p}</span><span style={{color:T.danger,fontFamily:"monospace"}}>{x.a}</span><span style={{color:T.textDim}}>{x.r}</span><span style={{color:T.warn,fontWeight:600}}>{x.step}</span>
        </div>))}
      </div>
      {/* 매출 차트 */}
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
        <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:12}}>📈 월별 매출</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:100}}>
          {[8.2,9.5,10.8,11.2,12.5,13.8,14.2,15.0,15.8,16.5,17.2,18.5].map((v,i)=>(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{width:"100%",height:`${v/18.5*100}%`,background:`linear-gradient(180deg,${T.accent},${T.accent}60)`,borderRadius:3,minHeight:3}}/><span style={{fontSize:7,color:T.textDim}}>{i+1}</span></div>))}
        </div>
      </div>
    </>}

    {tab==='audit'&&<>
      <div style={{marginBottom:12}}><div style={{fontSize:13,fontWeight:700,color:T.text}}>📋 감사 로그</div><div style={{fontSize:9,color:T.textDim}}>모든 관리자 행동 자동 기록 · 90일 보관</div></div>
      <div style={{background:T.surface,borderRadius:T.cardRadius,border:`1px solid ${T.border}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 3fr 0.8fr",padding:"8px 12px",background:T.bg3,fontSize:9,fontWeight:700,color:T.textDim}}>
          <span>시각</span><span>행위자</span><span>행동</span><span>대상</span>
        </div>
        {[
          ["02-13 09:15","admin","Hold 수동: G6 PM2.5 (구름 92%)","G6"],
          ["02-13 08:30","system","결제실패 리마인드 자동발송 (3건)","billing"],
          ["02-12 22:10","admin","환불 검토 시작: 이글로벌 ₩49K","user"],
          ["02-12 18:00","system","KOSIS 수집 지연 경보 (72h)","pipeline"],
          ["02-12 14:30","system","S-5P 결측 Hold 자동 발동","G6"],
          ["02-12 09:00","system","ECOS 32개 지표 정상 수집","pipeline"],
          ["02-11 16:45","admin","티어 변경: 한리서치 → 정지","user"],
          ["02-11 10:20","admin","쿠폰 생성: LAUNCH2026 30%","coupon"],
          ["02-10 23:00","system","일간 백업 완료 (3.2GB)","backup"],
          ["02-10 15:30","admin","가격표 v2 적용","pricing"],
        ].map(([ts,who,act,tgt],i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 3fr 0.8fr",padding:"6px 12px",borderBottom:`1px solid ${T.border}`,fontSize:9,alignItems:"center"}}>
          <span style={{color:T.textDim,fontFamily:"monospace"}}>{ts}</span>
          <span style={{color:who==='system'?T.sat:T.accent,fontWeight:600}}>{who==='system'?'🤖 sys':'👤 adm'}</span>
          <span style={{color:T.text}}>{act}</span>
          <span style={{color:T.textDim,fontFamily:"monospace"}}>{tgt}</span>
        </div>))}
      </div>
      <div style={{fontSize:8,color:T.textDim,marginTop:6,textAlign:"right"}}>최근 10건 / 전체 2,847건</div>
    </>}

    {tab==='settings'&&<>
      <div style={{display:"grid",gap:16}}>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>🔐 보안 설정</div>
          {[["JWT 토큰 만료","24시간"],[" 비밀번호 정책","8자+영문+숫자+특수"],["로그인 시도 제한","5회/15분"],["2FA 강제","Enterprise만"]].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`,fontSize:12}}><span style={{color:T.textMid}}>{k}</span><span style={{color:T.text,fontWeight:600}}>{v}</span></div>))}
        </div>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>📡 데이터 수집 주기</div>
          {[["ECOS 경제지표","매월 1일"],["KOSIS 통계","매월 5일"],["위성 데이터","자동 (매일/12일/16일)"],["환율","실시간 (30분)"]].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`,fontSize:12}}><span style={{color:T.textMid}}>{k}</span><span style={{color:T.text,fontWeight:600}}>{v}</span></div>))}
        </div>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>🗄️ 시스템</div>
          {[["데이터베이스","PostgreSQL 15.4",T.good],["캐시","Redis 7.2",T.good],["서버","Docker · Node 20 LTS",T.good],["SSL","Let's Encrypt · 자동 갱신",T.good],["백업","매일 03:00 자동",T.good]].map(([k,v,c])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`,fontSize:12}}><span style={{color:T.textMid}}>{k}</span><span style={{color:c,fontWeight:600}}>{v}</span></div>))}
        </div>
      </div>
    </>}
  </div>);
}

// ═══ 주식종목 위성감시 (진입점) ═══
function StockPage({user,lang}){
  const L=lang||'ko';
  const stocks=[
    {t:'TSLA',n:'Tesla',c:'🇺🇸',sec:'EV/Energy',fac:6,sat:['VIIRS','NO₂','Thermal','SAR'],sc:74,g:'주의',d:'+2.3%',p:'$248.50'},
    {t:'005930',n:L==='ko'?'삼성전자':'Samsung',c:'🇰🇷',sec:'Semiconductor',fac:5,sat:['VIIRS','NO₂','Thermal'],sc:82,g:'양호',d:'-0.8%',p:'₩72,400'},
    {t:'TSM',n:'TSMC',c:'🇹🇼',sec:'Semiconductor',fac:8,sat:['VIIRS','NO₂','Thermal','SAR'],sc:88,g:'양호',d:'+1.5%',p:'$178.30'},
    {t:'NVDA',n:'NVIDIA',c:'🇺🇸',sec:'AI/GPU',fac:3,sat:['VIIRS','NO₂'],sc:71,g:'주의',d:'+4.2%',p:'$721.60'},
    {t:'ASML',n:'ASML',c:'🇳🇱',sec:'Semiconductor Equip',fac:2,sat:['VIIRS','NO₂','SAR'],sc:79,g:'양호',d:'+0.9%',p:'€654.20'},
    {t:'000660',n:L==='ko'?'SK하이닉스':'SK Hynix',c:'🇰🇷',sec:'Memory',fac:4,sat:['VIIRS','NO₂','Thermal'],sc:68,g:'주의',d:'-1.2%',p:'₩198,500'},
  ];
  const tiers=[
    {n:L==='ko'?'킬러 10종목':'Killer 10',cnt:10,desc:L==='ko'?'위성 직접 감시 가능 · 시장 관심 최고':'Direct satellite monitoring · Highest market interest',c:T.danger},
    {n:L==='ko'?'섹터 40종목':'Sector 40',cnt:40,desc:L==='ko'?'핵심 산업 대표 종목 · 공급망 추적':'Key sector leaders · Supply chain tracking',c:T.warn},
    {n:L==='ko'?'글로벌 60종목':'Global 60',cnt:60,desc:L==='ko'?'21개국 주요 종목 · 매크로 연결':'21 countries · Macro correlation',c:T.info},
  ];
  return(<div style={{maxWidth:780,margin:"0 auto",padding:"20px 16px"}}>
    {/* Header */}
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <span style={{fontSize:20}}>📈</span>
        <span style={{fontSize:18,fontWeight:800,color:T.text}}>{L==='ko'?'주식종목 위성감시':'Stock Satellite Monitor'}</span>
        <span style={{fontSize:9,padding:"2px 8px",borderRadius:6,background:`${T.sat}15`,color:T.sat,fontWeight:600}}>Phase 2</span>
      </div>
      <div style={{fontSize:11,color:T.textMid}}>{L==='ko'?'100종목 · 276시설 · 21개국 · 위성 직접 감시':'100 stocks · 276 facilities · 21 countries · Direct satellite monitoring'}</div>
    </div>

    {/* 3-Tier Structure */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
      {tiers.map(tr=>(<div key={tr.n} style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${tr.c}20`}}>
        <div style={{fontSize:24,fontWeight:900,color:tr.c,fontFamily:"monospace"}}>{tr.cnt}</div>
        <div style={{fontSize:12,fontWeight:700,color:T.text,marginTop:4}}>{tr.n}</div>
        <div style={{fontSize:9,color:T.textDim,marginTop:4,lineHeight:1.5}}>{tr.desc}</div>
      </div>))}
    </div>

    {/* Stock List */}
    <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>{L==='ko'?'🔥 킬러 종목 미리보기':'🔥 Killer Stocks Preview'}</div>
    {stocks.map(s=>{const col=s.g==='양호'?T.good:T.warn;return(
      <div key={s.t} style={{background:T.surface,borderRadius:T.smRadius,padding:"14px 16px",border:`1px solid ${T.border}`,marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:14}}>{s.c}</span>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13,fontWeight:700,color:T.text}}>{s.n}</span>
                <span style={{fontSize:9,color:T.textDim,fontFamily:"monospace"}}>{s.t}</span>
              </div>
              <div style={{fontSize:9,color:T.textDim}}>{s.sec} · {s.fac}{L==='ko'?'개 시설':' facilities'}</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:15,fontWeight:800,color:T.text,fontFamily:"monospace"}}>{s.p}</div>
            <div style={{fontSize:10,color:parseFloat(s.d)>0?T.good:T.danger,fontWeight:600}}>{s.d}</div>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
          <div style={{display:"flex",gap:4}}>
            {s.sat.map(st=>(<span key={st} style={{fontSize:8,padding:"2px 6px",borderRadius:4,background:`${T.sat}12`,color:T.sat,fontWeight:600}}>🛰️ {st}</span>))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:28,height:28,borderRadius:14,background:`conic-gradient(${col} ${s.sc}%, ${T.border} ${s.sc}%)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:20,height:20,borderRadius:10,background:T.bg2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:col}}>{s.sc}</div>
            </div>
          </div>
        </div>
      </div>
    );})}

    {/* Coming Soon */}
    <TierLock plan="FREE" req="PRO" lang={L}>
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:40,textAlign:"center"}}>
        <div style={{fontSize:16,fontWeight:800,color:T.text,marginBottom:8}}>{L==='ko'?'나머지 94종목':'94 More Stocks'}</div>
        <div style={{fontSize:11,color:T.textMid}}>Sector 40 + Global 60</div>
      </div>
    </TierLock>

    {/* Video Funnel */}
    <div style={{background:`${T.accent}08`,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.accent}15`,marginTop:16}}>
      <div style={{fontSize:12,fontWeight:700,color:T.accent,marginBottom:8}}>📺 YouTube {L==='ko'?'연동 콘텐츠':'Content'}</div>
      <div style={{fontSize:11,color:T.textMid,lineHeight:1.6}}>{L==='ko'?
        '첫 영상: Tesla → TSMC → Samsung 순서로 공개. 위성이 본 공장 가동률 변화를 무료로 보여주고, 상세 종목 시그널은 구독자 전용.':
        'First videos: Tesla → TSMC → Samsung. Free factory satellite views, detailed stock signals for subscribers only.'}</div>
    </div>
  </div>);
}


function ChatbotWidget({lang}){
  const L=lang||'ko';
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([{from:'bot',text:t('chatGreeting',L)}]);
  const [input,setInput]=useState('');
  const faqs=[
    {q:t('chatQ1',L),a:t('chatA1',L)},
    {q:t('chatQ2',L),a:t('chatA2',L)},
    {q:t('chatQ3',L),a:t('chatA3',L)},
    {q:t('chatQ4',L),a:t('chatA4',L)},
  ];
  const send=(text)=>{
    const q=text||input;if(!q.trim())return;
    setMsgs(p=>[...p,{from:'user',text:q}]);setInput('');
    const faq=faqs.find(f=>q.includes(f.q.slice(0,4)));
    setTimeout(()=>setMsgs(p=>[...p,{from:'bot',text:faq?faq.a:t('chatDefault',L)}]),800);
  };
  if(!open) return(<button onClick={()=>setOpen(true)} style={{position:"fixed",bottom:20,right:20,width:56,height:56,borderRadius:28,background:`linear-gradient(135deg,${T.accent},#0099cc)`,border:"none",color:"#fff",fontSize:24,cursor:"pointer",boxShadow:`0 4px 20px ${T.accent}40`,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>💬</button>);
  return(<div style={{position:"fixed",bottom:20,right:20,width:360,height:480,borderRadius:T.cardRadius,background:T.bg1,border:`1px solid ${T.border}`,boxShadow:"0 8px 32px rgba(0,0,0,.5)",zIndex:1000,display:"flex",flexDirection:"column",overflow:"hidden"}}>
    <div style={{padding:"14px 16px",background:T.surface,borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:700,color:T.text}}>🛰️ DIAH-7M {t('chatHelper',L)}</span><button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:T.textDim,fontSize:16,cursor:"pointer"}}>✕</button></div>
    <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
      {msgs.map((m,i)=>(<div key={i} style={{alignSelf:m.from==='user'?"flex-end":"flex-start",maxWidth:"80%",padding:"10px 14px",borderRadius:12,background:m.from==='user'?T.accent:T.surface,color:m.from==='user'?"#fff":T.text,fontSize:12,lineHeight:1.6}}>{m.text}</div>))}
    </div>
    {/* Quick questions */}
    <div style={{padding:"8px 12px",display:"flex",gap:6,overflowX:"auto",borderTop:`1px solid ${T.border}`}}>
      {faqs.slice(0,2).map(f=>(<button key={f.q} onClick={()=>send(f.q)} style={{padding:"6px 10px",borderRadius:16,border:`1px solid ${T.accent}30`,background:`${T.accent}08`,color:T.accent,fontSize:10,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{f.q}</button>))}
    </div>
    <div style={{padding:"10px 12px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8}}>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={t('chatPlaceholder',L)} style={{flex:1,padding:"10px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:T.bg2,color:T.text,fontSize:12,outline:"none"}}/>
      <button onClick={()=>send()} style={{padding:"10px 16px",borderRadius:10,border:"none",background:T.accent,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:12}}>{t('chatSend',lang)}</button>
    </div>
  </div>);
}

// ═══ 글로벌 네비게이션 ═══
function GlobalNav({page,user,onNav,onLogout,lang,setLang}){
  const L=lang||'ko';
  const pages=user?[{id:'dashboard',label:`📊 ${t('dashboard',L)}`},{id:'stock',label:`📈 ${L==='ko'?'주식감시':'Stock'}`},{id:'mypage',label:`👤 ${t('mypage',L)}`},...(user.email==='admin@diah7m.com'?[{id:'admin',label:`⚙️ ${t('admin',L)}`}]:[])]:[];
  return(<nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px",borderBottom:`1px solid ${T.border}`,background:`${T.bg0}e0`,backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:200,direction:"ltr"}}>    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <div onClick={()=>onNav(user?'dashboard':'landing')} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><span style={{fontSize:16}}>🛰️</span><span style={{fontSize:14,fontWeight:800,color:T.text}}>DIAH-7M</span></div>
      {user&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:6,background:`${T.accent}15`,color:T.accent,fontWeight:600}}>2026.01</span>}
      {user&&pages.map(p=>(<button key={p.id} onClick={()=>onNav(p.id)} style={{padding:"6px 12px",borderRadius:6,border:"none",background:page===p.id?`${T.accent}15`:"transparent",color:page===p.id?T.accent:T.textDim,fontSize:11,fontWeight:page===p.id?700:500,cursor:"pointer"}}>{p.label}</button>))}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <LangSelector lang={L} setLang={setLang}/>
      {!user&&<><button onClick={()=>onNav('login')} style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${T.border}`,background:"transparent",color:T.text,fontSize:12,fontWeight:600,cursor:"pointer"}}>{t('login',L)}</button><button onClick={()=>onNav('signup')} style={{padding:"7px 14px",borderRadius:8,border:"none",background:T.accent,color:T.bg0,fontSize:12,fontWeight:700,cursor:"pointer"}}>{t('signup',L)}</button></>}
      {user&&<><span style={{fontSize:11,color:T.textMid}}>{user.name}</span><span style={{fontSize:10,padding:"2px 8px",borderRadius:6,background:`${T.accent}15`,color:T.accent,fontWeight:600}}>{user.plan||'PRO'}</span><button onClick={onLogout} style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${T.border}`,background:"transparent",color:T.textDim,fontSize:10,cursor:"pointer"}}>{t('logout',L)}</button></>}
    </div>
  </nav>);
}

// ═══ MAIN APP ═══
const RESPONSIVE_CSS = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes tierPulse { 0%,100% { box-shadow: 0 4px 20px #00d4ff40; } 50% { box-shadow: 0 4px 30px #00d4ff70; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${T.bg0}; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${T.bg1}; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
  input:focus, select:focus { border-color: ${T.accent} !important; }
  button:hover { opacity: 0.9; }
  @media (max-width: 768px) {
    .grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
    .grid-3 { grid-template-columns: 1fr !important; }
    .grid-2 { grid-template-columns: 1fr !important; }
    .hide-mobile { display: none !important; }
    .nav-pages { display: none !important; }
    .hero-title { font-size: 28px !important; }
    .footer-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 480px) {
    .grid-4 { grid-template-columns: 1fr !important; }
    .stat-row { flex-wrap: wrap !important; gap: 16px !important; }
  }
`;

export default function App(){
  const [page,setPage]=useState('landing');
  const [user,setUser]=useState(null);
  const [lang,setLang]=useState(detectLang());
  // i18n: 정적 내장. 로딩 없음. 모든 언어 0ms 전환.
  const handleLogin=(u)=>{setUser({...u,name:u.name||'종원',email:u.email||'admin@diah7m.com',plan:'PRO'});setPage('dashboard');};
  const handleLogout=()=>{setUser(null);setPage('landing');};
  const nav=(p)=>{
    // Auth guard: 로그인 필요 페이지 접근 시
    if(['dashboard','stock','mypage','admin'].includes(p)&&!user){setPage('login');return;}
    // Admin guard
    if(p==='admin'&&user&&user.email!=='admin@diah7m.com'){setPage('dashboard');return;}
    setPage(p);
    window.scrollTo(0,0);
  };
  const isRTL=lang==='ar'||lang==='he';
  return(
    <div dir={isRTL?'rtl':'ltr'} style={{minHeight:"100vh",background:`linear-gradient(180deg,${T.bg0},${T.bg1})`,fontFamily:lang==='ar'?"'Noto Sans Arabic','Pretendard',sans-serif":lang==='ja'?"'Noto Sans JP','Pretendard',sans-serif":lang==='zh'?"'Noto Sans SC','Pretendard',sans-serif":"'Pretendard',-apple-system,BlinkMacSystemFont,sans-serif",color:T.text}}>
      <style>{RESPONSIVE_CSS}</style>
      {page==='landing'?<LandingPage onNavigate={nav} lang={lang} setLang={setLang}/>:<>
        <GlobalNav page={page} user={user} onNav={nav} onLogout={handleLogout} lang={lang} setLang={setLang}/>
        <div style={{animation:"fadeIn 0.3s ease"}}>
          {(page==='login'||page==='signup')&&<AuthPage mode={page} onNavigate={nav} onLogin={handleLogin} lang={lang}/>}
          {page==='dashboard'&&user&&<DashboardPage user={user} onNav={nav} lang={lang}/>}
          {page==='stock'&&user&&<StockPage user={user} lang={lang}/>}
          {page==='mypage'&&user&&<MyPage user={user} onNav={nav} lang={lang} setGlobalLang={setLang}/>}
          {page==='admin'&&user&&<AdminPage lang={lang}/>}
        </div>
        <div style={{padding:"20px 16px",textAlign:"center",fontSize:10,color:T.textDim,borderTop:`1px solid ${T.border}`,marginTop:40}}>© Human Body National Economics · DIAH-7M · Jong-Won Yoon | NASA VIIRS · Copernicus Sentinel-1/5P · Landsat-9</div>
      </>}
      {user&&<ChatbotWidget lang={lang}/>}
    </div>
  );
}
