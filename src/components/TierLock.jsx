import { useState } from 'react';
import T from '../theme';
import { t, KO } from '../i18n';
import { TIER_ACCESS, tierLevel } from '../data/gauges';
// Re-export all data for backward compatibility
export { SAT_META, isSat, LEAD, EV_STYLE, TP, SAT_XREF, D, SYS, sysN, sysB, sysM, gN } from '../data/gaugeData';

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

export default TierLock;
export { TIER_ACCESS, tierLevel };
