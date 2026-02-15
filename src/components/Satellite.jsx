
import T, { L as LT } from '../theme';
import { t } from '../i18n';
import { SAT_META, isSat, SAT_XREF, TP, LEAD, EV_STYLE } from './TierLock';

function SatBadge({code}){
  const s=SAT_META[code]; if(!s) return null;
  return <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",borderRadius:20,background:LT.bg2,color:LT.textMid,fontSize:15,fontWeight:600,border:`1px solid ${LT.border}`}}>{s.icon} {s.sat}</span>;
}

function SatXrefBanner({code,lang}){
  const L=lang||'ko';
  const x=SAT_XREF[code],tp=TP[code];
  if(!x||isSat(code)||!tp) return null;
  const ld=LEAD[tp.ld],evs=EV_STYLE[tp.ev];
  return(
    <div style={{background:LT.bg2,borderRadius:LT.smRadius,padding:16,marginTop:10,border:`1px solid ${LT.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        <span style={{fontSize:16}}>🛰️</span>
        <span style={{fontSize:16,fontWeight:700,color:LT.text}}>{t('satEarlyDetect',L)}</span>
        <span style={{fontSize:15,fontWeight:600,padding:"3px 8px",borderRadius:6,background:LT.bg3,color:LT.textMid,marginLeft:"auto",border:`1px solid ${LT.border}`}}>{ld.emoji} {tp.rng} {t('satStatBefore',L)}</span>
      </div>
      <div style={{fontSize:15,color:LT.textMid,lineHeight:1.7,marginBottom:12,padding:"10px 14px",background:LT.surface,borderRadius:6,borderLeft:`3px solid ${LT.border}`}}>{tp.lk}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div style={{background:LT.surface,borderRadius:8,padding:"12px 14px",border:`1px solid ${LT.border}`}}>
          <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:6}}>◀ {t('satPastVerify',L)}</div>
          <div style={{fontSize:15,color:LT.textMid,lineHeight:1.6}}>📡 {x.past?.sat}</div>
          <div style={{fontSize:15,color:LT.text,lineHeight:1.6,marginTop:3}}>✅ {x.past?.result}</div>
        </div>
        <div style={{background:LT.surface,borderRadius:8,padding:"12px 14px",border:`1px solid ${LT.border}`}}>
          <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:6}}>▶ {t('satFutureHint',L)}</div>
          <div style={{fontSize:15,color:LT.textMid,lineHeight:1.6}}>📡 {x.now?.sat}</div>
          <div style={{fontSize:15,color:LT.textMid,lineHeight:1.6,fontWeight:600,marginTop:3}}>📊 {x.now?.predict}</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,padding:"6px 12px",background:LT.surface,borderRadius:6,border:`1px solid ${LT.border}`}}>
        <span style={{fontSize:15,fontWeight:700,padding:"2px 8px",borderRadius:4,background:LT.bg3,color:LT.textMid,border:`1px solid ${LT.border}`}}>{t('satEvidence',L)} {evs.label}</span>
        <span style={{fontSize:15,color:LT.textDim}}>{evs.desc}</span>
      </div>
    </div>
  );
}

/* ═══ SATELLITE EVIDENCE — 공통 컴포넌트 ═══ */
function SparkLine({data,c,w=140,h=32}){
  const mx=Math.max(...data),mn=Math.min(...data),rg=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rg)*(h-4)-2}`).join(" ");
  const last=pts.split(" ").pop().split(",");
  return(<svg width={w} height={h} style={{display:"block"}}>
    <polyline points={pts} fill="none" stroke={c||LT.textMid} strokeWidth={1.5}/>
    <circle cx={parseFloat(last[0])} cy={parseFloat(last[1])} r={2.5} fill={c||LT.textMid}/>
  </svg>);
}
function SatCompare({before:bf,after:af,sensor,product,coord,radius,unit}){
  return(<div style={{display:"flex",gap:10}}>
    {[{lb:bf.date,val:bf.val,ds:"30일 전",isCurrent:false},
      {lb:af.date,val:af.val,ds:"최신",isCurrent:true}].map((s,i)=>(
      <div key={i} style={{flex:1}}>
        <div style={{fontSize:15,color:s.isCurrent?LT.text:LT.textDim,marginBottom:4,textAlign:"center",fontWeight:s.isCurrent?700:400}}>{s.isCurrent?"최신 촬영분":"30일 전 수집"} · {s.lb}</div>
        <div style={{width:"100%",aspectRatio:"1.6",borderRadius:8,border:`1px solid ${s.isCurrent?LT.text+'20':LT.border}`,overflow:"hidden",position:"relative",background:LT.bg2}}>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
            <div style={{fontSize:28,marginBottom:4}}>🛰️</div>
            <div style={{fontSize:15,color:LT.textDim,textAlign:"center",padding:"0 10px",lineHeight:1.4}}>{sensor}<br/>{product}</div>
          </div>
          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"4px 8px",background:LT.bg3,borderTop:`1px solid ${LT.border}`}}>
            <div style={{fontSize:15,color:LT.textDim}}>{coord} · {radius}</div>
          </div>
        </div>
        <div style={{textAlign:"center",marginTop:8}}>
          <span style={{fontSize:24,fontFamily:"monospace",fontWeight:800,color:LT.text}}>{s.val}</span>
          <span style={{fontSize:15,color:LT.textDim,fontFamily:"monospace"}}> {unit}</span>
        </div>
      </div>
    ))}
  </div>);
}
function EvPkg({ev}){
  return(<div style={{marginTop:10,padding:"10px 12px",borderRadius:8,background:LT.surface,border:`1px solid ${LT.border}`}}>
    <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:6}}>📎 증거 패키지</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
      <div style={{fontSize:15,color:LT.textMid,fontFamily:"monospace",lineHeight:1.7}}>출처: {ev.source}<br/>센서: {ev.sensor}<br/>제품: {ev.product}<br/>해상도: {ev.resolution}</div>
      <div style={{fontSize:15,color:LT.textMid,fontFamily:"monospace",lineHeight:1.7}}>처리: {ev.process}<br/>크롭: {ev.crop}<br/>해시: {ev.hash}<br/>결측: {ev.missing}</div>
    </div>
    <div style={{display:"flex",gap:6,marginTop:8}}>
      {ev.qg.map((g,i)=>(<div key={i} style={{flex:1,textAlign:"center",padding:"4px 0",borderRadius:4,
        background:LT.bg2,border:`1px solid ${LT.border}`}}>
        <span style={{fontSize:15,fontFamily:"monospace",color:g.ok?LT.good:LT.danger,fontWeight:600}}>{g.ok?"✓":"✗"} {g.l}</span>
      </div>))}
    </div>
  </div>);
}
function BtPanel({entries}){
  return(<div style={{background:LT.surface,borderRadius:LT.smRadius,padding:14,border:`1px solid ${LT.border}`,marginTop:10}}>
    <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:8}}>🔬 반복 검증</div>
    {entries.map((b,i)=>(<div key={i} style={{padding:10,borderRadius:6,background:LT.bg2,border:`1px solid ${LT.border}`,marginBottom:i<entries.length-1?6:0}}>
      <div style={{fontSize:15,color:LT.text,fontWeight:700,marginBottom:6}}>{b.signal}</div>
      <div style={{display:"flex",gap:16}}>
        <div><div style={{fontSize:15,color:LT.textDim}}>표본</div><div style={{fontSize:15,fontFamily:"monospace",fontWeight:700,color:LT.text}}>N={b.n}</div></div>
        <div><div style={{fontSize:15,color:LT.textDim}}>적중</div><div style={{fontSize:15,fontFamily:"monospace",fontWeight:700,color:LT.text}}>{b.hit}/{b.n} ({Math.round(b.hit/b.n*100)}%)</div></div>
        <div><div style={{fontSize:15,color:LT.textDim}}>리드타임</div><div style={{fontSize:15,fontFamily:"monospace",fontWeight:700,color:LT.text}}>{b.median}</div><div style={{fontSize:15,color:LT.textDim}}>IQR {b.iqr}</div></div>
      </div>
    </div>))}
  </div>);
}
function LtPanel({layers}){
  return(<div style={{background:LT.surface,borderRadius:LT.smRadius,padding:14,border:`1px solid ${LT.border}`,marginTop:10}}>
    <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:8}}>⏱️ 위성→지표 리드타임</div>
    {layers.map((l,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",
      borderBottom:i<layers.length-1?`1px solid ${LT.border}`:"none"}}>
      <span style={{fontSize:15,width:56,flexShrink:0,fontWeight:600}}>{l.icon} {l.layer}</span>
      <div style={{flex:1}}><div style={{position:"relative",height:8,background:LT.bg3,borderRadius:4}}>
        <div style={{position:"absolute",height:"100%",left:`${(parseInt(l.iqr)/100)*100}%`,
          width:`${((parseInt(l.iqr.split("~")[1])-parseInt(l.iqr))/100)*100}%`,background:LT.border,borderRadius:3}}/>
        <div style={{position:"absolute",top:0,width:10,height:8,borderRadius:4,background:LT.text,
          left:`${(parseInt(l.median)/100)*100}%`,transform:"translateX(-50%)"}}/>
      </div></div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{fontSize:15,fontFamily:"monospace",color:LT.text,fontWeight:700}}>중앙 {l.median}</div>
        <div style={{fontSize:15,color:LT.textDim,fontFamily:"monospace"}}>N={l.n}</div>
      </div>
    </div>))}
  </div>);
}
function SatEvidencePanel({data:d}){
  const chg=d.after.raw&&d.before.raw?((d.after.raw-d.before.raw)/d.before.raw*100).toFixed(0):0;
  const isUp=chg>0;
  return(<div style={{marginTop:12}}>
    <div style={{background:LT.bg2,borderRadius:LT.smRadius,padding:16,border:`1px solid ${LT.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:16,fontWeight:700,color:LT.text}}>🛰️ 위성 물리 증거</span>
        <span style={{fontSize:15,fontFamily:"monospace",padding:"3px 8px",borderRadius:4,
          background:LT.bg3,color:isUp?LT.good:LT.danger,fontWeight:700,border:`1px solid ${LT.border}`}}>{isUp?"▲":"▼"}{Math.abs(chg)}%</span>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:10,overflowX:"auto"}}>
        {d.layers.map((l,i)=>(<button key={i} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${i===0?LT.text:LT.border}`,
          background:i===0?LT.bg3:'transparent',color:i===0?LT.text:LT.textDim,fontSize:15,
          fontFamily:"monospace",cursor:"pointer",whiteSpace:"nowrap",fontWeight:i===0?700:400}}>{l}</button>))}
      </div>
      <SatCompare before={d.before} after={d.after} sensor={d.sensor} product={d.product} coord={d.coord} radius={d.radius} unit={d.unit} color={d.color}/>
      {d.coverage&&<div style={{marginTop:8,padding:"6px 10px",borderRadius:4,background:LT.surface,border:`1px solid ${LT.border}`}}>
        <span style={{fontSize:15,color:LT.textMid,fontFamily:"monospace"}}>⚠ 커버리지: {d.coverage}</span>
      </div>}
      <EvPkg ev={d.ev}/>
    </div>
    <div style={{background:LT.surface,borderRadius:LT.smRadius,padding:14,border:`1px solid ${LT.border}`,marginTop:10}}>
      <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:8}}>📈 30일 추세</div>
      <div style={{display:"flex",gap:24}}>
        {d.trends.map((tr,i)=>(<div key={i}>
          <div style={{fontSize:15,color:LT.text,fontWeight:700,marginBottom:4}}>{tr.label}</div>
          <SparkLine data={tr.data} c={LT.textMid}/>
          <div style={{fontSize:16,color:tr.change>0?LT.good:LT.danger,fontFamily:"monospace",fontWeight:700,marginTop:3}}>{tr.change>0?"▲":"▼"}{Math.abs(tr.change)}%</div>
        </div>))}
      </div>
    </div>
    <BtPanel entries={d.bt}/>
    <LtPanel layers={d.lt}/>
    {/* 신뢰 + 가치 */}
    <div style={{background:LT.surface,borderRadius:LT.smRadius,padding:16,border:`1px solid ${LT.border}`,marginTop:10}}>
      <div style={{textAlign:"center",fontSize:15,color:LT.textDim,lineHeight:1.7,marginBottom:12,fontWeight:500}}>
        "이 데이터는 통계를 해석하는 것이 아니라,<br/>물리를 통해 통계의 시간을 앞당깁니다."
      </div>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1,padding:12,borderRadius:8,background:LT.bg2,border:`1px solid ${LT.border}`}}>
          <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:6}}>📡 과거 신호 → 오늘 결과</div>
          <div style={{fontSize:15,color:LT.textMid,lineHeight:1.6,marginBottom:8}}>{d.trust||"과거 위성 변화와 후행 통계 일치 확인."}</div>
          <div style={{padding:"6px 10px",borderRadius:6,background:LT.bg3,textAlign:"center",border:`1px solid ${LT.border}`}}>
            <span style={{fontSize:15,color:LT.text,fontWeight:700}}>"이 계기판은 정확하다" = 신뢰</span>
          </div>
        </div>
        <div style={{flex:1,padding:12,borderRadius:8,background:LT.bg2,border:`1px solid ${LT.border}`}}>
          <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:6}}>🔎 선행 신호 추적 중</div>
          <div style={{fontSize:15,color:LT.textMid,lineHeight:1.6,marginBottom:8}}>{d.value||"현재 위성 변화가 유사 구간 후행 분포에 해당."}</div>
          <div style={{padding:"6px 10px",borderRadius:6,background:LT.bg3,textAlign:"center",border:`1px solid ${LT.border}`}}>
            <span style={{fontSize:15,color:LT.text,fontWeight:700}}>"남보다 먼저 본다" = 가치</span>
          </div>
        </div>
      </div>
    </div>
    <div style={{padding:"8px 12px",borderRadius:6,background:LT.bg2,border:`1px solid ${LT.border}`,marginTop:10}}>
      <div style={{fontSize:15,color:LT.danger,fontWeight:700}}>⚠ 관측 전용 · 예측 금지</div>
      <div style={{fontSize:15,color:LT.textDim,lineHeight:1.5,marginTop:2}}>물리적 관측 사실만 표시. 전망·추천 표현은 시스템 레벨에서 차단됩니다.</div>
    </div>
  </div>);
}

/* ═══ 지표 Tier 분류 ═══ */
const TIER={
  S2:'T1',R5:'T1',R6:'T1',G6:'T1',
  E1:'T2',E2:'T2',E3:'T2',E4:'T2',E6:'T2',I2:'T2',C4:'T2',
  O1:'T2',O3:'T2',O4:'T2',M1:'T2',R1:'T2',R2:'T2',
  C1:'T3',C5:'T3',O2:'T3',O6:'T3',M2_G:'T3'
};
const TIER_LABEL={T1:{ko:'위성 직접관측',en:'Satellite Direct',color:LT.textMid},
  T2:{ko:'물리 인과 확인',en:'Physical Causal',color:LT.text},
  T3:{ko:'간접 참고신호',en:'Cross-Reference',color:LT.textMid}};


export { SatBadge, SatXrefBanner, SparkLine, SatCompare, EvPkg, BtPanel, LtPanel, SatEvidencePanel };
