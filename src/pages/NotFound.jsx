import T, { L as LT } from '../theme';
import { t } from '../i18n';

function NotFound({onNav,lang,isDark}){
  const L=lang||'ko';
  const TH=isDark?T:LT;
  return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",padding:24,textAlign:"center"}}>
    <div style={{fontSize:80,marginBottom:16}}>🛰️</div>
    <div style={{fontSize:64,fontWeight:900,color:TH.text,fontFamily:"monospace",letterSpacing:-2}}>404</div>
    <div style={{fontSize:18,fontWeight:700,color:TH.text,marginTop:8}}>{t('err404Title',L)}</div>
    <div style={{fontSize:15,color:TH.textMid,marginTop:8,maxWidth:400,lineHeight:1.7}}>{t('err404Desc',L)}</div>
    <div style={{display:"flex",gap:8,marginTop:24}}>
      <button onClick={()=>onNav('landing')} style={{padding:"10px 24px",borderRadius:10,border:"none",background:isDark?T.accent:'#111',color:isDark?T.bg0:'#fff',fontSize:15,fontWeight:700,cursor:"pointer"}}>{t('err404Home',L)}</button>
      <button onClick={()=>onNav('dashboard')} style={{padding:"10px 24px",borderRadius:10,border:`1px solid ${TH.border}`,background:"transparent",color:TH.text,fontSize:15,fontWeight:600,cursor:"pointer"}}>{t('err404Dash',L)}</button>
    </div>
  </div>);
}

function ErrorBoundary({children,onNav,lang}){
  // Simple error state (React Error Boundary requires class, this is functional fallback)
  return children;
}

export { NotFound, ErrorBoundary };
export default NotFound;
