import T from '../theme';
import { t } from '../i18n';
import { SYS, sysN } from './TierLock';

function RadarChart({lang:RL}){
  const axes=Object.entries(SYS).map(([k,s])=>({id:k,...s}));
  const cx=120,cy=120,r=90;
  const getP=(i,v)=>{const a=(Math.PI*2*i/9)-Math.PI/2;return[cx+r*(v/100)*Math.cos(a),cy+r*(v/100)*Math.sin(a)];};
  const poly=axes.map((a,i)=>getP(i,a.sc).join(",")).join(" ");
  const grid=[25,50,75,100];
  return(<svg viewBox="0 0 240 240" style={{width:"100%",maxWidth:260}}>
    {grid.map(g=>(<polygon key={g} points={axes.map((_,i)=>getP(i,g).join(",")).join(" ")} fill="none" stroke={T.border} strokeWidth={.5}/>))}
    {axes.map((_,i)=>{const[x,y]=getP(i,100);return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={T.border} strokeWidth={.5}/>;} )}
    <polygon points={poly} fill={`${T.accent}18`} stroke={T.accent} strokeWidth={1.5}/>
    {axes.map((a,i)=>{const[px,py]=getP(i,a.sc);const[lx,ly]=getP(i,118);return(<g key={a.id}><circle cx={px} cy={py} r={3} fill={a.color}/><text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={T.textMid} fontSize={8} fontWeight={600}>{a.icon}{sysN(a.id,RL).slice(0,3)}</text></g>);})}
  </svg>);
}

// ═══ 이중봉쇄 표시기 ═══
function DualLockIndicator({lang}){
  const L=lang||'ko';
  const dl={locked:true,input:{score:8,threshold:3,label:t('inputSeal',L)},output:{score:20,threshold:3,label:t('outputSeal',L)}};
  const barStyle=(v,max,col)=>({width:`${Math.min(v/max*100,100)}%`,height:6,borderRadius:3,background:col,transition:"width .8s"});
  return(<div style={{background:`linear-gradient(135deg,${T.orange}08,${T.bg2})`,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.orangeDim}`}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
      <span style={{width:10,height:10,borderRadius:5,background:T.orange,boxShadow:`0 0 8px ${T.orange}`}}/>
      <span style={{fontSize:13,fontWeight:700,color:T.orange}}>{t('dualLockActive',L)}</span>
      <span style={{fontSize:10,color:T.textDim,marginLeft:"auto"}}>State: {t('stTrigger',L)}</span>
    </div>
    {[dl.input,dl.output].map((s,i)=>(<div key={i} style={{marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.textMid,marginBottom:4}}>
        <span>{s.label}</span><span style={{fontWeight:700,color:s.score>=s.threshold?T.orange:T.good}}>{s.score}/{s.threshold*4}</span>
      </div>
      <div style={{background:T.border,borderRadius:3,height:6,overflow:"hidden"}}>
        <div style={barStyle(s.score,s.threshold*4,s.score>=s.threshold?T.orange:T.good)}/>
      </div>
    </div>))}
  </div>);
}

// ═══ 5단계 상태 표시 ═══
function StateIndicator({lang}){
  const L=lang||'ko';
  const states=[{id:0,l:t('stNormal',L),c:T.good,i:"🟢"},{id:1,l:t('stWatch',L),c:T.info,i:"🔵"},{id:2,l:t('stTrigger',L),c:T.warn,i:"🟡"},{id:3,l:t('stSeal',L),c:T.orange,i:"🟠"},{id:4,l:t('stCrisis',L),c:T.danger,i:"🔴"}];
  const current=2;
  return(<div style={{display:"flex",gap:4,alignItems:"center"}}>
    {states.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:2}}>
      <div style={{width:i===current?28:20,height:i===current?28:20,borderRadius:14,background:i<=current?s.c:T.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:i===current?12:9,fontWeight:800,color:i<=current?T.white:T.textDim,transition:"all .3s",border:i===current?`2px solid ${s.c}`:"none",boxShadow:i===current?`0 0 12px ${s.c}40`:"none"}}>{i===current?s.i:i+1}</div>
      {i<4&&<div style={{width:16,height:2,background:i<current?states[i+1].c:T.border,borderRadius:1}}/>}
    </div>))}
    <span style={{fontSize:11,fontWeight:700,color:states[current].c,marginLeft:8}}>{states[current].l}</span>
  </div>);
}

// ═══ Delta 분석 ═══
function DeltaAnalysis({lang}){
  const L=lang||'ko';
  return(<div style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`}}>
    <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:10}}>{t('deltaTitle',L)}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"center"}}>
      <div style={{textAlign:"center"}}><div style={{fontSize:10,color:T.textDim}}>{t('satIndex',L)}</div><div style={{fontSize:24,fontWeight:800,color:T.good,fontFamily:"monospace"}}>71</div></div>
      <div style={{textAlign:"center"}}><div style={{fontSize:10,color:T.warn,fontWeight:700}}>Δ3</div><div style={{fontSize:20,fontWeight:800,color:T.warn}}>-33</div><div style={{fontSize:9,color:T.warn}}>{t('negGap',L)}</div></div>
      <div style={{textAlign:"center"}}><div style={{fontSize:10,color:T.textDim}}>{t('mktIndex',L)}</div><div style={{fontSize:24,fontWeight:800,color:T.warn,fontFamily:"monospace"}}>38</div></div>
    </div>
    <div style={{fontSize:10,color:T.textMid,marginTop:10,lineHeight:1.6,padding:"8px 12px",background:T.bg2,borderRadius:8}}>{t('deltaDesc',L)}</div>
  </div>);
}

// ═══ 대시보드 ═══

export { RadarChart, DualLockIndicator, StateIndicator, DeltaAnalysis };
