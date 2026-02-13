import T from '../theme';
import { t } from '../i18n';
import LangSelector from './LangSelector';

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

export default GlobalNav;
