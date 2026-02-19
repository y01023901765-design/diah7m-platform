import { useState } from 'react';
import T, { L as LT } from '../theme';
import { t, gc } from '../i18n';
import { SatBadge, SatXrefBanner, SatEvidencePanel, SparkLine } from './Satellite';
import TierLock, { isSat, SAT_META, D, gN, sysN, sysB, sysM } from './TierLock';
import { TIER_ACCESS } from '../data/gauges';
import { SAT_EV } from '../data/satellite';

// GEE 실데이터가 있으면 SAT_EV에 머지
function mergedSatEv(code, liveSat) {
  const base = SAT_EV[code];
  if (!base || !liveSat) return base;
  const merged = { ...base };
  if (code === 'S2' && liveSat.S2 && liveSat.S2.status === 'OK') {
    const s = liveSat.S2;
    merged.after = { date: s.date || merged.after.date, val: String(s.value), raw: s.value };
    if (s.baseline_365d) merged.before = { date: s.date ? new Date(new Date(s.date).getTime() - 30*86400000).toISOString().slice(0,10) : merged.before.date, val: String(s.baseline_365d), raw: s.baseline_365d };
  }
  if (code === 'R6' && liveSat.R6 && liveSat.R6.status === 'OK') {
    const r = liveSat.R6;
    merged.after = { date: r.date || merged.after.date, val: String(r.value), raw: r.value };
  }
  return merged;
}

// Tier/label data for gauge badges
const TIER={};const TIER_LABEL={T1:{ko:'직접관측',color:LT.sat},T2:{ko:'물리인과',color:LT.accent},T3:{ko:'간접참고',color:LT.warn}};

function GaugeRow({d,open,toggle,lang,liveSat,isGlobal}){
  const L=lang||'ko';
  const col=gc(d.g), sat=isSat(d.c);
  const evData = mergedSatEv(d.c, liveSat);
  // 게이지 이름 폴백: i18n 키가 없으면 서버 제공 이름 사용
  const displayName = (() => { const fromI18n = gN(d.c, L); return fromI18n !== d.c ? fromI18n : (d.n || d.c); })();
  return(
    <div style={{background:LT.surface,borderRadius:LT.smRadius,border:`1px solid ${LT.border}`,marginBottom:6,overflow:"hidden",cursor:"pointer",transition:"all .2s",position:"relative"}} onClick={toggle}>
      {sat&&<div style={{position:"absolute",top:0,left:0,width:"100%",height:2,background:LT.border}}/>}
      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:10,position:"relative"}}>
        <span style={{fontSize:15,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:LT.textMid,width:32,flexShrink:0}}>{d.c}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontSize:16,fontWeight:700,color:LT.text}}>{displayName}</span>
            {sat&&<SatBadge code={d.c}/>}
            {TIER[d.c]&&<span style={{display:"inline-flex",alignItems:"center",gap:2,fontSize:15,padding:"2px 7px",borderRadius:4,fontWeight:700,
              background:LT.bg2,color:LT.textMid,
              border:`1px solid ${LT.border}`}}>{TIER[d.c]!=='T3'&&<span style={{fontSize:16}}>🛰️</span>}{TIER_LABEL[TIER[d.c]].ko}</span>}
          </div>
          <div style={{fontSize:16,color:LT.textDim,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.note}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:17,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:LT.text}}>{typeof d.v==="number"&&d.v>1000?d.v.toLocaleString():d.v}<span style={{fontSize:16,color:LT.textDim,fontWeight:400,marginLeft:3}}>{d.u}</span></div>
          <div style={{fontSize:16,color:d.ch?.toString().includes("-")?LT.info:d.ch?.toString().includes("+")?LT.danger:LT.textDim}}>{d.ch}</div>
        </div>
        <span style={{width:8,height:8,borderRadius:4,background:col,flexShrink:0}}/>
        <span style={{fontSize:15,color:LT.textDim}}>{open?"▲":"▼"}</span>
      </div>
      {open&&(
        <div style={{padding:"0 16px 16px",borderTop:`1px solid ${LT.border}`}}>
          {/* 의학비유 설명 — 데이터 있을 때만 */}
          {d.t&&<div style={{background:LT.bg2,borderRadius:LT.smRadius,padding:"10px 14px",marginTop:10,border:`1px solid ${LT.border}`}}>
            <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:3}}>{t('bodyMetaphor',L)}: {d.t}</div>
            <div style={{fontSize:16,color:LT.textMid,lineHeight:1.7}}>{d.m}</div>
          </div>}
          {/* 글로벌 전용: 데이터 소스 정보 */}
          {d._global&&<div style={{background:LT.bg2,borderRadius:LT.smRadius,padding:"10px 14px",marginTop:10,border:`1px solid ${LT.border}`}}>
            <span style={{fontSize:14,color:LT.textMid}}>📡 {d.note||t('globalProvider',L)||'데이터 출처'}</span>
          </div>}
          {evData?<SatEvidencePanel data={evData}/>:<>
          {/* 위성 교차검증 (한국 전용) */}
          {!isGlobal&&(sat?<div style={{background:LT.bg2,borderRadius:LT.smRadius,padding:"10px 14px",marginTop:8,border:`1px solid ${LT.border}`}}>
            <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:4}}>{t('satObsInfo',L)}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
              {[[t('satCol',L),SAT_META[d.c]?.sat],[t('satProg',L),SAT_META[d.c]?.orbit],[t('satCycle',L),SAT_META[d.c]?.freq],[t('satBand',L),SAT_META[d.c]?.band]].map(([k,v])=>(
                <div key={k} style={{fontSize:16}}><span style={{color:LT.text,fontWeight:700}}>{k}: </span><span style={{color:LT.textMid}}>{v}</span></div>
              ))}
            </div>
          </div>:<SatXrefBanner code={d.c} lang={L}/>)}
          {/* 행동 시그널 — 데이터 있을 때만 */}
          {d.act?.length>0&&<div style={{background:LT.bg2,borderRadius:LT.smRadius,padding:"10px 14px",marginTop:8,border:`1px solid ${LT.border}`}}>
            <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:6}}>{t('investSignal',L)}</div>
            {d.act.map((a,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:5}}>
                <div style={{flex:1}}><div style={{fontSize:16,fontWeight:600,color:LT.text}}>{a.s}</div><div style={{fontSize:16,color:LT.textMid}}>{a.a}</div></div>
                <span style={{fontSize:15,fontWeight:700,padding:"2px 6px",borderRadius:4,background:LT.bg2,color:LT.text,border:`1px solid ${LT.border}`,whiteSpace:"nowrap"}}>{a.tg}</span>
              </div>
            ))}
          </div>}
          {/* 사각지대 — 데이터 있을 때만 */}
          {d.bs?.d&&<div style={{background:LT.bg2,borderRadius:LT.smRadius,padding:"10px 14px",marginTop:8,border:`1px solid ${LT.border}`}}>
            <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:4}}>{t('blindSpot',L)}</div>
            <div style={{fontSize:16,color:LT.textMid,marginBottom:4}}>{d.bs.d}</div>
            {d.bs?.o?.map((o,i)=>(<div key={i} style={{fontSize:15,color:LT.textDim,marginBottom:2}}>✕ {o}</div>))}
          </div>}
          </>}
        </div>
      )}
    </div>
  );
}

function SystemSection({sysKey,sys,expanded,toggle,lang,liveSat,gaugeData,isGlobal}){
  const L=lang||'ko';
  const col=gc(sys.g);
  const source = gaugeData || D;  // ★ prop 있으면 사용, 없으면 기존 D
  const gArr=sys.keys.map(k=>source[k]).filter(Boolean);
  const good=gArr.filter(g=>g.g==="양호").length,caution=gArr.filter(g=>g.g==="주의").length,alert=gArr.filter(g=>g.g==="경보").length;
  const satCount=isGlobal?0:gArr.filter(g=>isSat(g.c)).length;
  // 시스템 이름 폴백: 글로벌 축은 i18n 키가 없으므로
  const sName = sys.name?.[L] || sys.name?.en || sysN(sysKey, L);
  const sBrief = sys.name ? '' : sysB(sysKey, L);
  const sDesc = sys.name ? '' : sysM(sysKey, L);
  const [open,setOpen]=useState(false);
  return(
    <div style={{marginBottom:12}}>
      <div onClick={()=>setOpen(!open)} style={{background:LT.surface,borderRadius:LT.cardRadius,padding:"20px 20px",border:`1px solid ${LT.border}`,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all .2s"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:22}}>{sys.icon}</span>
            <span style={{fontSize:20,fontWeight:800,color:LT.text}}>{sName}</span>
            {sBrief&&<span style={{fontSize:15,color:LT.textDim,fontWeight:500}}>({sBrief})</span>}
            {satCount>0&&<span style={{fontSize:14,fontWeight:600,padding:"2px 8px",borderRadius:10,background:LT.bg2,color:LT.textMid,border:`1px solid ${LT.border}`}}>🛰️ ×{satCount}</span>}
          </div>
          <div style={{fontSize:15,color:LT.textDim,marginTop:6}}>{sDesc}{sDesc?' · ':''}{gArr.length} {t('gaugesLabel',L)}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{display:"flex",gap:6}}>
            {good>0&&<span style={{fontSize:16,color:LT.good,fontWeight:700}}>●{good}</span>}
            {caution>0&&<span style={{fontSize:16,color:LT.warn,fontWeight:700}}>●{caution}</span>}
            {alert>0&&<span style={{fontSize:16,color:LT.danger,fontWeight:700}}>●{alert}</span>}
          </div>
          <div style={{width:48,height:48,borderRadius:24,background:`conic-gradient(${col} ${sys.sc}%, ${LT.border} ${sys.sc}%)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:36,height:36,borderRadius:18,background:LT.bg2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:col}}>{sys.sc}</div>
          </div>
          <span style={{fontSize:16,color:LT.textDim,transition:"transform .2s",transform:open?"rotate(180deg)":"rotate(0)"}}>▼</span>
        </div>
      </div>
      {open&&<div style={{marginTop:6}}>{gArr.map(g=>(<GaugeRow key={g.c} d={g} open={expanded[g.c]} toggle={()=>toggle(g.c)} lang={L} liveSat={liveSat} isGlobal={isGlobal}/>))}</div>}
    </div>
  );
}

// ═══ PAGES ═══


export { GaugeRow, SystemSection };
