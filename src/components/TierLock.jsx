import T, { L as LT } from '../theme';
import { t } from '../i18n';
import { TIER_ACCESS, tierLevel } from '../data/gauges';
export { SAT_META, isSat, LEAD, EV_STYLE, TP, SAT_XREF, D, SYS, sysN, sysB, sysM, gN } from '../data/gaugeData';

const TIER_PRICE={
  BASIC:{krw:'₩19,000',usd:'$15',feat:'tlFeatBasic'},
  PRO:{krw:'₩49,000',usd:'$39',feat:'tlFeatPro'},
  ENTERPRISE:{krw:'₩450,000',usd:'$350',feat:'tlFeatEnt'},
};

function TierLock({plan,req,children,lang,compact}){
  const L=lang||'ko';
  const uLv=tierLevel(plan),rLv=tierLevel(req);
  if(uLv>=rLv) return children;
  const pct=Math.round((1-(TIER_ACCESS[plan||'FREE']?.gauges||7)/59)*100);
  const priceInfo=TIER_PRICE[req];
  const priceStr=priceInfo?(L==='ko'?priceInfo.krw:priceInfo.usd):'';
  return(
    <div style={{position:"relative",borderRadius:LT.cardRadius,overflow:"hidden"}}>
      <div style={{filter:"blur(6px)",opacity:.35,pointerEvents:"none",userSelect:"none"}}>{children}</div>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        background:`${LT.bg0}85`,backdropFilter:"blur(2px)",borderRadius:LT.cardRadius,border:`1px dashed ${LT.border}`,zIndex:10}}>
        <div style={{width:48,height:48,borderRadius:24,background:LT.bg2,display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:22,marginBottom:12,border:`2px solid ${LT.border}`}}>🔒</div>
        {!compact&&<div style={{fontSize:16,fontWeight:800,color:LT.text,marginBottom:4}}>{pct}% {t('locked',L)}</div>}
        {!compact&&<div style={{fontSize:15,color:LT.textMid,marginBottom:8,textAlign:"center",maxWidth:280,lineHeight:1.6}}>
          {t('upgradeHint',L).replace('{tier}',req)}</div>}
        {!compact&&priceInfo&&<div style={{fontSize:14,color:LT.textMid,marginBottom:4,textAlign:"center",maxWidth:280}}>
          <span style={{fontSize:20,fontWeight:900,color:LT.text}}>{priceStr}</span>
          <span style={{color:LT.textDim}}>/{t('perMonth',L)}</span>
        </div>}
        {!compact&&priceInfo&&<div style={{fontSize:14,color:LT.textDim,marginBottom:14,textAlign:"center",maxWidth:260,lineHeight:1.5}}>
          {t(priceInfo.feat,L)}</div>}
        <button style={{padding:compact?"8px 16px":"10px 24px",borderRadius:10,border:"none",
          background:'#111',color:"#fff",fontSize:compact?11:14,fontWeight:700,
          cursor:"pointer",boxShadow:'0 4px 20px rgba(0,0,0,0.15)',animation:"tierPulse 2s ease infinite"}}>
          {t('upgradeBtn',L)} → {req}</button>
      </div>
    </div>
  );
}

export default TierLock;
export { TIER_ACCESS, tierLevel };
