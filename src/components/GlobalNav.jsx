import T, { L as LT } from '../theme';
import { t } from '../i18n';
import LangSelector from './LangSelector';

function GlobalNav({page,user,onNav,onLogout,lang,setLang}){
  const L=lang||'ko';
  const pages=user?[{id:'dashboard',label:`📊 ${t('dashboard',L)}`},{id:'stock',label:`📈 ${L==='ko'?'주식감시':'Stock'}`},{id:'mypage',label:`👤 ${t('mypage',L)}`},...(user.email==='admin@diah7m.com'?[{id:'admin',label:`⚙️ ${t('admin',L)}`}]:[])]:[];
  return(<nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px",borderBottom:`1px solid ${LT.border}`,background:`${LT.bg0}e0`,backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:200,direction:"ltr"}}>    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <div onClick={()=>onNav(user?'dashboard':'landing')} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><span style={{fontSize:16}}>🛰️</span><span style={{fontSize:14,fontWeight:800,color:LT.text}}>DIAH-7M</span></div>
      {user&&<span style={{fontSize:12,padding:"2px 8px",borderRadius:6,background:`${LT.accent}15`,color:LT.accent,fontWeight:600}}>2026.01</span>}
      {user&&pages.map(p=>(<button key={p.id} onClick={()=>onNav(p.id)} style={{padding:"6px 12px",borderRadius:6,border:"none",background:page===p.id?`${LT.accent}15`:"transparent",color:page===p.id?LT.accent:LLT.textDim,fontSize:13,fontWeight:page===p.id?700:500,cursor:"pointer"}}>{p.label}</button>))}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <LangSelector lang={L} setLang={setLang}/>
      {!user&&<><button onClick={()=>onNav('login')} style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${LT.border}`,background:"transparent",color:LT.text,fontSize:12,fontWeight:600,cursor:"pointer"}}>{t('login',L)}</button><button onClick={()=>onNav('signup')} style={{padding:"7px 14px",borderRadius:8,border:"none",background:LT.accent,color:LT.bg0,fontSize:12,fontWeight:700,cursor:"pointer"}}>{t('signup',L)}</button></>}
      {user&&<><span style={{fontSize:13,color:LLT.textMid}}>{user.name}</span><span style={{fontSize:12,padding:"2px 8px",borderRadius:6,background:`${LT.accent}15`,color:LT.accent,fontWeight:600}}>{user.plan||'PRO'}</span><button onClick={onLogout} style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${LT.border}`,background:"transparent",color:LLT.textDim,fontSize:12,cursor:"pointer"}}>{t('logout',L)}</button></>}
    </div>
  </nav>);
}

export default GlobalNav;
