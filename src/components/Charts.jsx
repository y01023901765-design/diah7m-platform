import T, { L as LT } from '../theme';
import { t } from '../i18n';
import { SYS, sysN } from './TierLock';

function RadarChart({lang:RL}){
  const axes=Object.entries(SYS).map(([k,s])=>({id:k,...s}));
  const cx=120,cy=120,r=90;
  const getP=(i,v)=>{const a=(Math.PI*2*i/9)-Math.PI/2;return[cx+r*(v/100)*Math.cos(a),cy+r*(v/100)*Math.sin(a)];};
  const poly=axes.map((a,i)=>getP(i,a.sc).join(",")).join(" ");
  const grid=[25,50,75,100];
  return(<svg viewBox="0 0 240 240" style={{width:"100%",maxWidth:260}}>
    {grid.map(g=>(<polygon key={g} points={axes.map((_,i)=>getP(i,g).join(",")).join(" ")} fill="none" stroke={LT.border} strokeWidth={.5}/>))}
    {axes.map((_,i)=>{const[x,y]=getP(i,100);return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={LT.border} strokeWidth={.5}/>;} )}
    <polygon points={poly} fill="#E0E0E0" stroke={LT.accent} strokeWidth={1.5}/>
    {axes.map((a,i)=>{const[px,py]=getP(i,a.sc);const[lx,ly]=getP(i,118);return(<g key={a.id}><circle cx={px} cy={py} r={3} fill={a.color}/><text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={LT.textMid} fontSize={8} fontWeight={600}>{a.icon}{sysN(a.id,RL).slice(0,3)}</text></g>);})}
  </svg>);
}

// ═══ 이중봉쇄 표시기 ═══
function DualLockIndicator({lang}){
  const L=lang||'ko';
  const dl={locked:true,input:{score:8,threshold:3,label:t('inputSeal',L)},output:{score:20,threshold:3,label:t('outputSeal',L)}};
  const barStyle=(v,max,col)=>({width:`${Math.min(v/max*100,100)}%`,height:6,borderRadius:3,background:col,transition:"width .8s"});
  return(<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
      <span style={{width:10,height:10,borderRadius:5,background:LT.orange,boxShadow:`0 0 8px ${LT.orange}`}}/>
      <span style={{fontSize:16,fontWeight:700,color:LT.orange}}>{t('dualLockActive',L)}</span>
      <span style={{fontSize:16,color:LT.textDim,marginLeft:"auto"}}>State: {t('stTrigger',L)}</span>
    </div>
    {[dl.input,dl.output].map((s,i)=>(<div key={i} style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:16,color:LT.textMid,marginBottom:4}}>
        <span>{s.label}</span><span style={{fontWeight:700,color:s.score>=s.threshold?LT.orange:LT.good}}>{s.score}/{s.threshold*4}</span>
      </div>
      <div style={{background:LT.border,borderRadius:3,height:6,overflow:"hidden"}}>
        <div style={barStyle(s.score,s.threshold*4,s.score>=s.threshold?LT.orange:LT.good)}/>
      </div>
    </div>))}
  </div>);
}

// ═══ 5단계 상태 표시 ═══
function StateIndicator({lang}){
  const L=lang||'ko';
  const states=[{id:0,l:t('stNormal',L),c:LT.good,i:"🟢"},{id:1,l:t('stWatch',L),c:LT.info,i:"🔵"},{id:2,l:t('stTrigger',L),c:LT.warn,i:"🟡"},{id:3,l:t('stSeal',L),c:LT.orange,i:"🟠"},{id:4,l:t('stCrisis',L),c:LT.danger,i:"🔴"}];
  const current=2;
  return(<div style={{display:"flex",gap:4,alignItems:"center"}}>
    {states.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:2}}>
      <div style={{width:i===current?28:20,height:i===current?28:20,borderRadius:14,background:i<=current?s.c:LT.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:i===current?12:9,fontWeight:800,color:i<=current?LT.white:LT.textDim,transition:"all .3s",border:i===current?`2px solid ${s.c}`:"none",boxShadow:i===current?`0 0 12px ${s.c}40`:"none"}}>{i===current?s.i:i+1}</div>
      {i<4&&<div style={{width:16,height:2,background:i<current?states[i+1].c:LT.border,borderRadius:1}}/>}
    </div>))}
    <span style={{fontSize:16,fontWeight:700,color:states[current].c,marginLeft:8}}>{states[current].l}</span>
  </div>);
}

// ═══ Delta 분석 ═══
function DeltaAnalysis({lang}){
  const L=lang||'ko';
  return(<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}>
    <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:10}}>{t('deltaTitle',L)}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"center"}}>
      <div style={{textAlign:"center"}}><div style={{fontSize:16,color:LT.textDim}}>{t('satIndex',L)}</div><div style={{fontSize:24,fontWeight:800,color:LT.good,fontFamily:"monospace"}}>71</div></div>
      <div style={{textAlign:"center"}}><div style={{fontSize:16,color:LT.warn,fontWeight:700}}>Δ3</div><div style={{fontSize:20,fontWeight:800,color:LT.warn}}>-33</div><div style={{fontSize:15,color:LT.warn}}>{t('negGap',L)}</div></div>
      <div style={{textAlign:"center"}}><div style={{fontSize:16,color:LT.textDim}}>{t('mktIndex',L)}</div><div style={{fontSize:24,fontWeight:800,color:LT.warn,fontFamily:"monospace"}}>38</div></div>
    </div>
    <div style={{fontSize:16,color:LT.textMid,marginTop:10,lineHeight:1.6,padding:"8px 12px",background:LT.bg2,borderRadius:8}}>{t('deltaDesc',L)}</div>
  </div>);
}

// ═══ 대시보드 ═══

export { RadarChart, DualLockIndicator, StateIndicator, DeltaAnalysis };
