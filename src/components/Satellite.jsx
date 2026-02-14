import { useState } from 'react';
import T from '../theme';
import { t } from '../i18n';
import { SAT_META, isSat, SAT_XREF, TP, LEAD, EV_STYLE } from './TierLock';

function SatBadge({code}){
  const s=SAT_META[code]; if(!s) return null;
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",borderRadius:20,background:`linear-gradient(135deg,${T.sat}15,${T.sat}08)`,color:T.sat,fontSize:12,fontWeight:700,border:`1px solid ${T.sat}40`,letterSpacing:.3}}>{s.icon} {s.sat}</span>;
}

function SatXrefBanner({code,lang}){
  const L=lang||'ko';
  const x=SAT_XREF[code],tp=TP[code];
  if(!x||isSat(code)||!tp) return null;
  const ld=LEAD[tp.ld],evs=EV_STYLE[tp.ev];
  return(
    <div style={{background:`linear-gradient(135deg,${T.sat}08,${T.sat}04)`,borderRadius:T.smRadius,padding:14,marginTop:10,border:`1px solid ${T.sat}30`}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8,flexWrap:"wrap"}}>
        <span style={{fontSize:13}}>🛰️</span>
        <span style={{fontSize:13,fontWeight:700,color:T.sat}}>{t('satEarlyDetect',L)}</span>
        <span style={{fontSize:12,fontWeight:700,padding:"2px 6px",borderRadius:6,background:ld.color+"18",color:ld.color,marginLeft:"auto"}}>{ld.emoji} {tp.rng} {t('satStatBefore',L)}</span>
      </div>
      <div style={{fontSize:12,color:T.textMid,lineHeight:1.7,marginBottom:10,padding:"8px 12px",background:`${T.sat}08`,borderRadius:6,borderLeft:`3px solid ${T.sat}`}}>{tp.lk}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div style={{background:`${T.good}08`,borderRadius:6,padding:"10px 12px",border:`1px solid ${T.good}20`}}>
          <div style={{fontSize:12,fontWeight:700,color:T.good,marginBottom:4}}>{t('satPastVerify',L)}</div>
          <div style={{fontSize:12,color:T.textMid,lineHeight:1.5}}>📡 {x.past?.sat}</div>
          <div style={{fontSize:12,color:T.text,lineHeight:1.5,marginTop:2}}>✅ {x.past?.result}</div>
        </div>
        <div style={{background:`${T.warn}08`,borderRadius:6,padding:"10px 12px",border:`1px solid ${T.warn}20`}}>
          <div style={{fontSize:12,fontWeight:700,color:T.warn,marginBottom:4}}>{t('satFutureHint',L)}</div>
          <div style={{fontSize:12,color:T.textMid,lineHeight:1.5}}>📡 {x.now?.sat}</div>
          <div style={{fontSize:12,color:"#fde68a",lineHeight:1.5,fontWeight:600,marginTop:2}}>📊 {x.now?.predict}</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,padding:"5px 10px",background:`${T.bg1}80`,borderRadius:6}}>
        <span style={{fontSize:12,fontWeight:700,padding:"1px 6px",borderRadius:4,background:evs.color+"18",color:evs.color}}>{t('satEvidence',L)} {evs.label}</span>
        <span style={{fontSize:12,color:T.textDim}}>{evs.desc}</span>
      </div>
    </div>
  );
}

/* ═══ SATELLITE EVIDENCE — 공통 컴포넌트 6개 ═══ */
function SparkLine({data,c,w=120,h=28}){
  const mx=Math.max(...data),mn=Math.min(...data),rg=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rg)*(h-4)-2}`).join(" ");
  const last=pts.split(" ").pop().split(",");
  return(<svg width={w} height={h} style={{display:"block"}}>
    <polyline points={pts} fill="none" stroke={c} strokeWidth={1.5} style={{filter:`drop-shadow(0 0 2px ${c}44)`}}/>
    <circle cx={parseFloat(last[0])} cy={parseFloat(last[1])} r={2} fill={c} style={{filter:`drop-shadow(0 0 3px ${c})`}}/>
  </svg>);
}
function SatCompare({before:bf,after:af,sensor,product,coord,radius,unit,color}){
  return(<div style={{display:"flex",gap:6}}>
    {[{lb:bf.date,val:bf.val,ac:T.textDim,bd:T.border,ds:"수집 후 표시"},
      {lb:af.date,val:af.val,ac:color||T.accent,bd:(color||T.accent)+"40",ds:"최신 촬영분"}].map((s,i)=>(
      <div key={i} style={{flex:1}}>
        <div style={{fontSize:12,color:s.ac,fontFamily:"monospace",marginBottom:4,textAlign:"center",fontWeight:i?600:400}}>{i?"오늘 · ":"30일 전 · "}{s.lb}</div>
        <div style={{width:"100%",aspectRatio:"1",borderRadius:6,border:`1px solid ${s.bd}`,overflow:"hidden",position:"relative",
          background:"linear-gradient(135deg,#0a1628,#0d1f3c)",boxShadow:i?`0 0 8px ${(color||T.accent)}15`:"none"}}>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
            <div style={{fontSize:28,marginBottom:4}}>🛰️</div>
            <div style={{fontSize:12,color:s.ac,fontFamily:"monospace",textAlign:"center",padding:"0 8px",lineHeight:1.4}}>{sensor}<br/>{product}<br/>{s.ds}</div>
          </div>
          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"4px 6px",background:"rgba(0,0,0,0.7)"}}>
            <div style={{fontSize:12,fontFamily:"monospace",color:s.ac}}>{coord} · {radius}</div>
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:4}}>
          <span style={{fontSize:12,fontFamily:"monospace",fontWeight:700,color:i?(color||T.accent):"#fff"}}>{s.val}</span>
          <span style={{fontSize:12,color:T.textDim,fontFamily:"monospace"}}> {unit}</span>
        </div>
      </div>
    ))}
  </div>);
}
function EvPkg({ev}){
  return(<div style={{marginTop:8,padding:"6px 8px",borderRadius:4,background:T.bg0,border:`1px solid ${T.border}`}}>
    <div style={{fontSize:12,fontWeight:600,color:"#ccc",marginBottom:3}}>📎 증거 패키지</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
      <div style={{fontSize:12,color:T.textDim,fontFamily:"monospace",lineHeight:1.5}}>출처: {ev.source}<br/>센서: {ev.sensor}<br/>제품: {ev.product}<br/>해상도: {ev.resolution}</div>
      <div style={{fontSize:12,color:T.textDim,fontFamily:"monospace",lineHeight:1.5}}>처리: {ev.process}<br/>크롭: {ev.crop}<br/>해시: {ev.hash}<br/>결측: {ev.missing}</div>
    </div>
    <div style={{display:"flex",gap:4,marginTop:4}}>
      {ev.qg.map((g,i)=>(<div key={i} style={{flex:1,textAlign:"center",padding:"2px 0",borderRadius:2,
        background:g.ok?`${T.good}10`:`${T.danger}10`,border:`1px solid ${g.ok?T.good:T.danger}20`}}>
        <span style={{fontSize:12,fontFamily:"monospace",color:g.ok?T.good:T.danger}}>{g.ok?"✓":"✗"} {g.l}</span>
      </div>))}
    </div>
  </div>);
}
function BtPanel({entries}){
  return(<div style={{background:T.surface,borderRadius:T.smRadius,padding:10,border:`1px solid ${T.border}`,marginTop:8}}>
    <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:6}}>🔬 반복 검증</div>
    {entries.map((b,i)=>(<div key={i} style={{padding:6,borderRadius:4,background:T.bg0,border:`1px solid ${T.border}`,marginBottom:i<entries.length-1?4:0}}>
      <div style={{fontSize:12,color:T.accent,fontWeight:600,marginBottom:3}}>{b.signal}</div>
      <div style={{display:"flex",gap:8}}>
        <div><div style={{fontSize:12,color:T.textDim}}>표본</div><div style={{fontSize:12,fontFamily:"monospace",fontWeight:700,color:T.text}}>N={b.n}</div></div>
        <div><div style={{fontSize:12,color:T.textDim}}>적중</div><div style={{fontSize:12,fontFamily:"monospace",fontWeight:700,color:T.good}}>{b.hit}/{b.n} ({Math.round(b.hit/b.n*100)}%)</div></div>
        <div><div style={{fontSize:12,color:T.textDim}}>리드타임</div><div style={{fontSize:12,fontFamily:"monospace",fontWeight:700,color:T.warn}}>{b.median}</div><div style={{fontSize:12,color:T.textDim}}>IQR {b.iqr}</div></div>
      </div>
    </div>))}
  </div>);
}
function LtPanel({layers}){
  return(<div style={{background:T.surface,borderRadius:T.smRadius,padding:10,border:`1px solid ${T.border}`,marginTop:8}}>
    <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:6}}>⏱️ 위성→지표 리드타임</div>
    {layers.map((l,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",
      borderBottom:i<layers.length-1?`1px solid ${T.border}`:"none"}}>
      <span style={{fontSize:12,width:48,flexShrink:0}}>{l.icon} {l.layer}</span>
      <div style={{flex:1}}><div style={{position:"relative",height:8,background:T.border,borderRadius:4}}>
        <div style={{position:"absolute",height:"100%",left:`${(parseInt(l.iqr)/100)*100}%`,
          width:`${((parseInt(l.iqr.split("~")[1])-parseInt(l.iqr))/100)*100}%`,background:`${T.accent}30`,borderRadius:3}}/>
        <div style={{position:"absolute",top:0,width:8,height:8,borderRadius:4,background:T.accent,
          left:`${(parseInt(l.median)/100)*100}%`,transform:"translateX(-50%)",boxShadow:`0 0 4px ${T.accent}66`}}/>
      </div></div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontSize:12,fontFamily:"monospace",color:T.accent,fontWeight:700}}>중앙 {l.median}</div>
        <div style={{fontSize:12,color:T.textDim,fontFamily:"monospace"}}>N={l.n}</div>
      </div>
    </div>))}
  </div>);
}
function SatEvidencePanel({data:d}){
  const chg=d.after.raw&&d.before.raw?((d.after.raw-d.before.raw)/d.before.raw*100).toFixed(0):0;
  const isUp=chg>0;
  return(<div style={{marginTop:10}}>
    <div style={{background:`linear-gradient(135deg,${T.sat}08,${T.sat}04)`,borderRadius:T.smRadius,padding:12,border:`1px solid ${T.sat}30`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:12,fontWeight:700,color:T.sat}}>🛰️ 위성 물리 증거</span>
        <span style={{fontSize:12,fontFamily:"monospace",padding:"2px 6px",borderRadius:3,
          background:`${isUp?T.good:T.danger}15`,color:isUp?T.good:T.danger,fontWeight:700}}>{isUp?"▲":"▼"}{Math.abs(chg)}%</span>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:8,overflowX:"auto"}}>
        {d.layers.map((l,i)=>(<button key={i} style={{padding:"3px 7px",borderRadius:4,border:`1px solid ${i===0?T.accent:T.border}`,
          background:i===0?`${T.accent}15`:"transparent",color:i===0?T.accent:T.textDim,fontSize:12,
          fontFamily:"monospace",cursor:"pointer",whiteSpace:"nowrap",fontWeight:i===0?600:400}}>{l}</button>))}
      </div>
      <SatCompare before={d.before} after={d.after} sensor={d.sensor} product={d.product} coord={d.coord} radius={d.radius} unit={d.unit} color={d.color}/>
      {d.coverage&&<div style={{marginTop:6,padding:"4px 8px",borderRadius:3,background:`${T.warn}10`,border:`1px solid ${T.warn}20`}}>
        <span style={{fontSize:12,color:T.warn,fontFamily:"monospace"}}>⚠ 커버리지: {d.coverage}</span>
      </div>}
      <EvPkg ev={d.ev}/>
    </div>
    <div style={{background:T.surface,borderRadius:T.smRadius,padding:10,border:`1px solid ${T.border}`,marginTop:8}}>
      <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:6}}>📈 30일 추세</div>
      <div style={{display:"flex",gap:14}}>
        {d.trends.map((tr,i)=>(<div key={i}>
          <div style={{fontSize:12,color:tr.color,fontFamily:"monospace",marginBottom:2}}>{tr.label}</div>
          <SparkLine data={tr.data} c={tr.color}/>
          <div style={{fontSize:12,color:tr.change>0?T.good:T.danger,fontFamily:"monospace"}}>{tr.change>0?"▲":"▼"}{Math.abs(tr.change)}%</div>
        </div>))}
      </div>
    </div>
    <BtPanel entries={d.bt}/>
    <LtPanel layers={d.lt}/>
    {/* 신뢰 + 가치 */}
    <div style={{background:T.surface,borderRadius:T.smRadius,padding:12,border:`1px solid ${T.sat}30`,marginTop:8}}>
      <div style={{textAlign:"center",fontSize:12,color:"#ddd",lineHeight:1.6,marginBottom:10,fontWeight:600}}>
        "이 데이터는 통계를 해석하는 것이 아니라,<br/>물리를 통해 통계의 시간을 앞당깁니다."
      </div>
      <div style={{display:"flex",gap:8}}>
        <div style={{flex:1,padding:8,borderRadius:6,background:T.bg0,border:`1px solid ${T.accent}25`}}>
          <div style={{fontSize:12,fontWeight:700,color:T.accent,marginBottom:4}}>📡 과거 신호 → 오늘 결과</div>
          <div style={{fontSize:12,color:"#ccc",lineHeight:1.5,marginBottom:6}}>{d.trust||"과거 위성 변화와 후행 통계 일치 확인."}</div>
          <div style={{padding:"3px 6px",borderRadius:3,background:`${T.accent}10`,textAlign:"center"}}>
            <span style={{fontSize:12,color:T.accent,fontFamily:"monospace",fontWeight:700}}>"이 계기판은 정확하다" = 신뢰</span>
          </div>
        </div>
        <div style={{flex:1,padding:8,borderRadius:6,background:T.bg0,border:`1px solid ${T.warn}25`}}>
          <div style={{fontSize:12,fontWeight:700,color:T.warn,marginBottom:4}}>🔎 선행 신호 추적 중</div>
          <div style={{fontSize:12,color:"#ccc",lineHeight:1.5,marginBottom:6}}>{d.value||"현재 위성 변화가 유사 구간 후행 분포에 해당."}</div>
          <div style={{padding:"3px 6px",borderRadius:3,background:`${T.warn}10`,textAlign:"center"}}>
            <span style={{fontSize:12,color:T.warn,fontFamily:"monospace",fontWeight:700}}>"남보다 먼저 본다" = 가치</span>
          </div>
        </div>
      </div>
    </div>
    <div style={{padding:"5px 8px",borderRadius:4,background:`${T.danger}08`,border:`1px solid ${T.danger}20`,marginTop:8}}>
      <div style={{fontSize:12,color:T.danger,fontFamily:"monospace",fontWeight:600}}>⚠ 관측 전용 · 예측 금지</div>
      <div style={{fontSize:12,color:T.textDim,lineHeight:1.4,marginTop:1}}>물리적 관측 사실만 표시. 전망·추천 표현은 시스템 레벨에서 차단됩니다.</div>
    </div>
  </div>);
}

/* ═══ 지표 Tier 분류 (물리 매핑 정직성) ═══ */
// T1: 위성 직접 측정 | T2: 물리 인과 확정 | T3: 간접 참고 | null: 위성 불가
const TIER={
  S2:'T1',R5:'T1',R6:'T1',G6:'T1',
  E1:'T2',E2:'T2',E3:'T2',E4:'T2',E6:'T2',I2:'T2',C4:'T2',
  O1:'T2',O3:'T2',O4:'T2',M1:'T2',R1:'T2',R2:'T2',
  C1:'T3',C5:'T3',O2:'T3',O6:'T3',M2_G:'T3'
};
const TIER_LABEL={T1:{ko:'위성 직접관측',en:'Satellite Direct',color:T.sat},
  T2:{ko:'물리 인과 확인',en:'Physical Causal',color:T.good},
  T3:{ko:'간접 참고신호',en:'Cross-Reference',color:T.warn}};


export { SatBadge, SatXrefBanner, SparkLine, SatCompare, EvPkg, BtPanel, LtPanel, SatEvidencePanel };
