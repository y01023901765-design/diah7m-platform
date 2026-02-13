import { useState } from 'react';
import T from '../theme';
import { t, gc, gi } from '../i18n';
import { SatBadge, SatXrefBanner, SatEvidencePanel, SparkLine } from './Satellite';
import TierLock, { isSat, SAT_META, D, gN, sysN, sysB, sysM } from './TierLock';
import { TIER_ACCESS, tierLevel } from '../data/gauges';
import { SAT_EV } from '../data/satellite';

// Tier/label data for gauge badges
const TIER={};const TIER_LABEL={T1:{ko:'직접관측',color:T.sat},T2:{ko:'물리인과',color:T.accent},T3:{ko:'간접참고',color:T.warn}};

function GaugeRow({d,open,toggle,lang}){
  const L=lang||'ko';
  const col=gc(d.g), sat=isSat(d.c);
  return(
    <div style={{background:sat?`linear-gradient(135deg,${T.sat}06,${T.bg2})`:T.surface,borderRadius:T.smRadius,border:`1px solid ${sat?T.sat+"25":T.border}`,marginBottom:6,overflow:"hidden",cursor:"pointer",transition:"all .2s",position:"relative"}} onClick={toggle}>
      {sat&&<div style={{position:"absolute",top:0,left:0,width:"100%",height:2,background:`linear-gradient(90deg,transparent,${T.sat},transparent)`}}/>}
      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:10,position:"relative"}}>
        <span style={{fontSize:12,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:sat?T.sat:T.textMid,width:32,flexShrink:0}}>{d.c}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontSize:13,fontWeight:700,color:T.text}}>{gN(d.c,L)}</span>
            {sat&&<SatBadge code={d.c}/>}
            {TIER[d.c]&&<span style={{display:"inline-flex",alignItems:"center",gap:2,fontSize:9,padding:"2px 7px",borderRadius:4,fontWeight:700,
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
                <span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:4,background:a.tg.includes(t('sigBuy',L))?T.good+"18":a.tg.includes(t('sigAvoid',L))||a.tg.includes(t('sigSell',L))?T.danger+"18":T.warn+"18",color:a.tg.includes(t('sigBuy',L))?T.good:a.tg.includes(t('sigAvoid',L))||a.tg.includes(t('sigSell',L))?T.danger:T.warn,whiteSpace:"nowrap"}}>{a.tg}</span>
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
            {satCount>0&&<span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:10,background:`${T.sat}15`,color:T.sat,border:`1px solid ${T.sat}30`}}>🛰️ ×{satCount}</span>}
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


export { GaugeRow, SystemSection };
