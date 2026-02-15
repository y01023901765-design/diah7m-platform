import T, { L as LT } from '../theme';
import { t } from '../i18n';
import LangSelector from './LangSelector';

function GlobalNav({page,user,onNav,onLogout,lang,setLang}){
  const L=lang||'ko';
  const alertCount=3;
  const pages=user?[
    {id:'dashboard',label:`📊 ${t('dashboard',L)}`,badge:0},
    {id:'stock',label:`📈 ${t('stockNav',L)}`,badge:alertCount},
    {id:'mypage',label:`👤 ${t('mypage',L)}`,badge:0},
    ...(user.email==='admin@diah7m.com'?[{id:'admin',label:`⚙️ ${t('admin',L)}`,badge:0}]:[]),
  ]:[];
  return(<nav aria-label="Main navigation" role="navigation" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px",borderBottom:`1px solid ${LT.border}`,background:`${LT.bg0}e0`,backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:200,direction:"ltr"}}>
    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <div onClick={()=>onNav(user?'dashboard':'landing')} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}><span style={{fontSize:16}}>🛰️</span><span style={{fontSize:14,fontWeight:800,color:LT.text}}>DIAH-7M</span></div>
      {user&&<span style={{fontSize:14,padding:"2px 8px",borderRadius:6,background:'#F0F0F0',color:LT.textMid,fontWeight:600}}>2026.01</span>}
      {user&&pages.map(p=>(<button key={p.id} onClick={()=>onNav(p.id)} style={{position:"relative",padding:"6px 12px",borderRadius:6,border:"none",background:"transparent",color:page===p.id?LT.text:LT.textDim,fontWeight:page===p.id?700:500,fontSize:14,cursor:"pointer"}}>
        {p.label}
        {p.badge>0&&<span style={{position:"absolute",top:0,right:0,minWidth:16,height:16,borderRadius:8,background:LT.danger,color:"#fff",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{p.badge}</span>}
      </button>))}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <LangSelector lang={L} setLang={setLang}/>
      {!user&&<><button onClick={()=>onNav('login')} style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${LT.border}`,background:"transparent",color:LT.text,fontSize:14,fontWeight:600,cursor:"pointer"}}>{t('login',L)}</button><button onClick={()=>onNav('signup')} style={{padding:"7px 14px",borderRadius:8,border:"none",background:'#111',color:'#fff',fontSize:14,fontWeight:700,cursor:"pointer"}}>{t('signup',L)}</button></>}
      {user&&<><span style={{fontSize:14,color:LT.textMid}}>{user.name}</span><span style={{fontSize:14,padding:"2px 8px",borderRadius:6,background:'#F0F0F0',color:LT.textMid,fontWeight:600}}>{user.plan||'PRO'}</span><button onClick={onLogout} style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${LT.border}`,background:"transparent",color:LT.textDim,fontSize:14,cursor:"pointer"}}>{t('logout',L)}</button></>}
    </div>
  </nav>);
}

export default GlobalNav;
