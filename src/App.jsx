import { useState, useEffect } from "react";

// ── Core ──
import T, { L as LT } from './theme';
import { detectLang } from './i18n';
import * as API from './api';
import { checkServer, isServerAlive } from './api';  // ★ 추가

// ── Pages ──
import LandingPage from './pages/Landing';
import AuthPage from './pages/Auth';
import DashboardPage from './pages/Dashboard';
import MyPage from './pages/MyPage';
import AdminPage from './pages/Admin';
import StockPage from './pages/Stock';
import NotFound from './pages/NotFound';

// ── Components ──
import GlobalNav from './components/GlobalNav';
import ChatbotWidget from './components/Chatbot';

// ── Responsive CSS ──
const RESPONSIVE_CSS = (isDark) => `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes tierPulse { 0%,100% { box-shadow: 0 4px 20px #00d4ff40; } 50% { box-shadow: 0 4px 30px #00d4ff70; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${isDark?T.bg1:LT.bg1}; }
  ::-webkit-scrollbar-thumb { background: ${isDark?T.border:LT.border}; border-radius: 3px; }
  input:focus, select:focus { border-color: ${isDark?T.accent:LT.accent} !important; }
  button { transition: opacity .15s, transform .1s; }
  button:hover { opacity: 0.9; }
  button:active { transform: scale(0.97); }
  button:focus-visible, a:focus-visible { outline: 2px solid ${isDark?T.accent:LT.accent}; outline-offset: 2px; border-radius: 4px; }

  @media (max-width: 768px) {
    .grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
    .grid-3 { grid-template-columns: repeat(2, 1fr) !important; }
    .grid-2 { grid-template-columns: 1fr !important; }
    .hide-mobile { display: none !important; }
    .nav-pages { gap: 2px !important; }
    .nav-pages button { padding: 6px 8px !important; font-size: 13px !important; }
    .hero-title { font-size: 28px !important; }
    .footer-grid { grid-template-columns: 1fr !important; }
    .section-pad { padding: 40px 16px !important; }
    .score-big { font-size: 32px !important; }
    .tab-scroll { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
    .tab-scroll::-webkit-scrollbar { display: none; }
    .card-pad { padding: 16px !important; }
    .demo-switch { flex-wrap: wrap !important; }
    .auth-card { padding: 20px !important; }
  }

  @media (max-width: 480px) {
    .grid-4 { grid-template-columns: 1fr !important; }
    .grid-3 { grid-template-columns: 1fr !important; }
    .stat-row { flex-wrap: wrap !important; gap: 12px !important; }
    .nav-pages button { padding: 5px 6px !important; font-size: 12px !important; }
    .score-big { font-size: 28px !important; }
    .hero-title { font-size: 22px !important; letter-spacing: -1px !important; }
    .section-pad { padding: 24px 12px !important; }
    .card-pad { padding: 12px !important; }
    .auth-card { padding: 16px !important; }
  }
`;

export default function App(){
  const [page,setPage]=useState('landing');
  const [user,setUser]=useState(()=>API.getStoredUser());
  const [lang,setLang]=useState(detectLang());
  const [appReady,setAppReady]=useState(false);  // ★ 추가: 앱 초기화 완료 여부

  // ★ 앱 초기화: 서버 상태 확인 + 자동 로그인 (최대 10초)
  useEffect(()=>{
    let done = false;

    // 안전장치: 10초 후 무조건 앱 시작
    const timeout = setTimeout(()=>{
      if(!done){ done=true; setAppReady(true); }
    }, 10000);

    async function init(){
      try {
        // 서버 상태 확인 (8초 타임아웃)
        await checkServer();

        // 토큰 있고 서버 살아있으면 자동 로그인
        if(API.isAuthenticated() && !user && isServerAlive()){
          try {
            const data = await API.getMe();
            const u = data.user || data;
            setUser(u);
            API.storeUser(u);
          } catch {
            API.logout();
          }
        }
      } catch {
        // 서버 다운 — 데모 모드로 진행
        console.warn('[DIAH-7M] 서버 오프라인 — 데모 모드');
      } finally {
        if(!done){ done=true; setAppReady(true); }
        clearTimeout(timeout);
      }
    }

    init();
    return ()=>clearTimeout(timeout);
  },[]);

  const handleLogin=(u)=>{
    const merged = {...u, name:u.name||'종원', email:u.email||'admin@diah7m.com', plan:u.plan||'PRO'};
    setUser(merged);
    API.storeUser(merged);
    setPage('dashboard');
  };
  const handleLogout=()=>{API.logout();setUser(null);setPage('landing');};
  const [selectedCountry,setSelectedCountry]=useState(null);
  const [selectedCity,setSelectedCity]=useState(null);
  const nav=(p,params)=>{
    if(['dashboard','stock','mypage','admin'].includes(p)&&!user){setPage('login');return;}
    if(p==='admin'&&user&&user.email!=='admin@diah7m.com'){setPage('dashboard');return;}
    if(params?.country) setSelectedCountry(params.country);
    else if(p!=='dashboard') setSelectedCountry(null);
    if(params?.city) setSelectedCity(params.city);
    else setSelectedCity(null);
    setPage(p);
    window.scrollTo(0,0);
  };
  const isRTL=lang==='ar'||lang==='he';
  const isDark=page==='landing'||page==='login'||page==='signup';
  const TH=isDark?T:LT;

  // ★ 초기화 중 로딩 화면 (최대 10초 후 자동 해제)
  if(!appReady){
    return(
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:`linear-gradient(180deg,${T.bg0},${T.bg1})`,color:T.text,fontFamily:"'Pretendard',-apple-system,sans-serif"}}>
        <div style={{fontSize:48,marginBottom:16}}>🛰️</div>
        <div style={{fontSize:20,fontWeight:700,marginBottom:8}}>DIAH-7M</div>
        <div style={{fontSize:14,color:T.textDim,animation:"pulse 1.5s infinite"}}>Connecting to server...</div>
      </div>
    );
  }

  return(
    <div dir={isRTL?'rtl':'ltr'} style={{minHeight:"100vh",background:isDark?`linear-gradient(180deg,${T.bg0},${T.bg1})`:LT.bg0,fontFamily:lang==='ar'?"'Noto Sans Arabic','Pretendard',sans-serif":lang==='ja'?"'Noto Sans JP','Pretendard',sans-serif":lang==='zh'?"'Noto Sans SC','Pretendard',sans-serif":"'Pretendard',-apple-system,BlinkMacSystemFont,sans-serif",color:TH.text}}>
      <a href="#main-content" style={{position:"absolute",top:-40,left:0,background:TH.accent,color:TH.bg0,padding:"8px 16px",zIndex:1000,fontSize:14,fontWeight:700,transition:"top .2s"}} onFocus={e=>e.target.style.top='0'} onBlur={e=>e.target.style.top='-40px'}>Skip to content</a>
      <style>{RESPONSIVE_CSS(isDark)}</style>
      {page==='landing'?<LandingPage onNavigate={nav} lang={lang} setLang={setLang}/>:<>
        {page!=='login'&&page!=='signup'&&<GlobalNav page={page} user={user} onNav={nav} onLogout={handleLogout} lang={lang} setLang={setLang}/>}
        <main id="main-content" role="main" style={{animation:"fadeIn 0.3s ease"}}>
          {(page==='login'||page==='signup')&&<AuthPage mode={page} onNavigate={nav} onLogin={handleLogin} lang={lang}/>}
          {page==='dashboard'&&user&&<DashboardPage user={user} onNav={nav} lang={lang} country={selectedCountry} city={selectedCity}/>}
          {page==='stock'&&user&&<StockPage user={user} lang={lang}/>}
          {page==='mypage'&&user&&<MyPage user={user} lang={lang} setGlobalLang={setLang}/>}
          {page==='admin'&&user&&<AdminPage lang={lang}/>}
          {!['landing','login','signup','dashboard','stock','mypage','admin'].includes(page)&&<NotFound onNav={nav} lang={lang} isDark={isDark}/>}
        </main>
        {page!=='login'&&page!=='signup'&&<footer style={{borderTop:`1px solid ${TH.border}`,marginTop:40,padding:"24px 16px 16px"}}>
          <div style={{maxWidth:780,margin:"0 auto"}}>
            <div className="footer-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>
              <div><div style={{fontSize:14,fontWeight:700,color:TH.text,marginBottom:6}}>DIAH-7M</div><div style={{fontSize:13,color:TH.textDim,lineHeight:1.7}}>Human Body National Economics<br/>인체국가경제론 · 윤종원</div></div>
              <div><div style={{fontSize:14,fontWeight:700,color:TH.text,marginBottom:6}}>Data Sources</div><div style={{fontSize:13,color:TH.textDim,lineHeight:1.7}}>NASA VIIRS · Copernicus Sentinel-1/5P<br/>Landsat-9 · ECOS · FRED · World Bank</div></div>
              <div><div style={{fontSize:14,fontWeight:700,color:TH.text,marginBottom:6}}>Legal</div><div style={{fontSize:13,color:TH.textDim,lineHeight:1.7}}>ISBN 978-89-01-29340-3<br/>Observation only · Not investment advice</div></div>
            </div>
            <div style={{borderTop:`1px solid ${TH.border}`,paddingTop:12,fontSize:12,color:TH.textDim,textAlign:"center"}}>© 2026 DIAH-7M · All rights reserved</div>
          </div>
        </footer>}
      </>}
      {user&&<ChatbotWidget lang={lang}/>}
    </div>
  );
}
