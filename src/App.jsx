import { useState, useEffect } from "react";

// ── Core ──
import T from './theme';
import { detectLang } from './i18n';
import * as API from './api';

// ── Pages ──
import LandingPage from './pages/Landing';
import AuthPage from './pages/Auth';
import DashboardPage from './pages/Dashboard';
import MyPage from './pages/MyPage';
import AdminPage from './pages/Admin';
import StockPage from './pages/Stock';

// ── Components ──
import GlobalNav from './components/GlobalNav';
import ChatbotWidget from './components/Chatbot';

// ── Responsive CSS ──
const RESPONSIVE_CSS = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  @keyframes tierPulse { 0%,100% { box-shadow: 0 4px 20px #00d4ff40; } 50% { box-shadow: 0 4px 30px #00d4ff70; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${T.bg1}; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
  input:focus, select:focus { border-color: ${T.accent} !important; }
  button { transition: opacity .15s, transform .1s; }
  button:hover { opacity: 0.9; }
  button:active { transform: scale(0.97); }
  button:focus-visible, a:focus-visible { outline: 2px solid ${T.accent}; outline-offset: 2px; border-radius: 4px; }
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
  const [user,setUser]=useState(()=>API.getStoredUser());
  const [lang,setLang]=useState(detectLang());

  // 토큰 있으면 자동 로그인 시도
  useEffect(()=>{
    if(API.isAuthenticated() && !user){
      API.getMe().then(data=>{
        const u = data.user || data;
        setUser(u);
        API.storeUser(u);
      }).catch(()=>{ API.logout(); });
    }
  },[]);

  const handleLogin=(u)=>{
    const merged = {...u, name:u.name||'종원', email:u.email||'admin@diah7m.com', plan:u.plan||'PRO'};
    setUser(merged);
    API.storeUser(merged);
    setPage('dashboard');
  };
  const handleLogout=()=>{API.logout();setUser(null);setPage('landing');};
  const nav=(p)=>{
    if(['dashboard','stock','mypage','admin'].includes(p)&&!user){setPage('login');return;}
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
