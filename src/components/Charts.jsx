import T, { L as LT } from '../theme';
import { t } from '../i18n';
import { SYS, sysN } from './TierLock';

function RadarChart({lang:RL,sysData}){
  const sys=sysData||SYS;
  const axes=Object.entries(sys).map(([k,s])=>({id:k,...s}));
  const axisCount=axes.length||1;
  const cx=120,cy=120,r=90;
  const getP=(i,v)=>{const a=(Math.PI*2*i/axisCount)-Math.PI/2;return[cx+r*(v/100)*Math.cos(a),cy+r*(v/100)*Math.sin(a)];};
  const poly=axes.map((a,i)=>getP(i,a.sc).join(",")).join(" ");
  const grid=[25,50,75,100];
  // 라벨: name 있으면 사용, 없으면 sysN 폴백
  const getLabel=(a)=>{const n=sysN(a.id,RL)||a.name?.[RL]||a.name?.en||a.id;const isCJK=/[\u3000-\u9fff\uac00-\ud7af]/.test(n);return n.slice(0,isCJK?2:3);};
  return(<svg viewBox="0 0 240 240" style={{width:"100%",maxWidth:260}}>
    {grid.map(g=>(<polygon key={g} points={axes.map((_,i)=>getP(i,g).join(",")).join(" ")} fill="none" stroke={LT.border} strokeWidth={.5}/>))}
    {axes.map((_,i)=>{const[x,y]=getP(i,100);return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={LT.border} strokeWidth={.5}/>;} )}
    <polygon points={poly} fill="#E0E0E0" stroke={LT.accent} strokeWidth={1.5}/>
    {axes.map((a,i)=>{const[px,py]=getP(i,a.sc);const[lx,ly]=getP(i,118);return(<g key={a.id}><circle cx={px} cy={py} r={3} fill={a.color}/><text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={LT.textMid} fontSize={8} fontWeight={600}>{a.icon}{getLabel(a)}</text></g>);})}
  </svg>);
}

// ═══ 이중봉쇄 표시기 (정본 기준: CAM + DLT) ═══
// props: dualLock = core-engine diagnose() 결과의 dualLock 객체
// 없으면 하드코딩 데모 표시
function DualLockIndicator({lang, dualLock}){
  const L=lang||'ko';
  const dl = dualLock || null;
  const isLocked = dl?.locked || false;
  const criticalAxes = dl?.criticalAxes || [];
  const activeSignals = dl?.activeSignals || 0;
  const reason = dl?.reason || '';
  const lockColor = isLocked ? LT.danger : LT.good;
  const lockIcon = isLocked ? '🔴' : '🟢';

  return(<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`2px solid ${lockColor}40`}}>
    {/* 헤더 */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
      <span style={{width:10,height:10,borderRadius:5,background:lockColor,boxShadow:`0 0 8px ${lockColor}`}}/>
      <span style={{fontSize:15,fontWeight:700,color:lockColor}}>
        {isLocked ? (L==='ko'?'⚠ 이중봉쇄 발동':'⚠ Dual Lock Active') : (L==='ko'?'✓ 이중봉쇄 해제':'✓ Dual Lock Clear')}
      </span>
    </div>
    {/* CAM + DLT 조건 */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
      {[
        {label:L==='ko'?'CAM 기능적봉쇄':'CAM Functional', desc:L==='ko'?`경계축 ${criticalAxes.length}/3`:`Critical Axes ${criticalAxes.length}/3`, active:criticalAxes.length>=3},
        {label:L==='ko'?'DLT 물리적봉쇄':'DLT Physical',   desc:L==='ko'?`교차신호 ${activeSignals}/5`:`Cross Signals ${activeSignals}/5`, active:activeSignals>=5},
      ].map((item,i)=>(
        <div key={i} style={{padding:'8px 10px',borderRadius:8,background:item.active?`${LT.danger}15`:LT.bg2,border:`1px solid ${item.active?LT.danger+'40':LT.border}`}}>
          <div style={{fontSize:12,fontWeight:700,color:item.active?LT.danger:LT.textMid}}>{item.label}</div>
          <div style={{fontSize:11,color:LT.textDim,marginTop:2}}>{item.desc}</div>
          <div style={{fontSize:11,fontWeight:700,color:item.active?LT.danger:LT.good,marginTop:4}}>{item.active?(L==='ko'?'봉쇄':'LOCKED'):'OK'}</div>
        </div>
      ))}
    </div>
    {/* 경계축 목록 */}
    {criticalAxes.length>0&&<div style={{fontSize:11,color:LT.textDim,padding:'6px 10px',background:LT.bg2,borderRadius:6}}>
      {L==='ko'?'경계 축:':'Critical:'} <span style={{color:LT.warn,fontWeight:600}}>{criticalAxes.join(', ')}</span>
    </div>}
    {/* 이유 */}
    {reason&&<div style={{fontSize:11,color:LT.textDim,marginTop:8,lineHeight:1.5}}>{reason}</div>}
  </div>);
}

// ═══ 교차신호 패널 (15쌍) ═══
// props: crossSignals = core-engine diagnose() 결과의 crossSignals 배열
function CrossSignalPanel({lang, crossSignals}){
  const L=lang||'ko';
  const signals = crossSignals || [];
  if(signals.length===0) return(
    <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}>
      <div style={{fontSize:14,fontWeight:700,color:LT.text,marginBottom:8}}>{L==='ko'?'📡 교차신호 분석':'📡 Cross Signal Analysis'}</div>
      <div style={{fontSize:12,color:LT.textDim}}>{L==='ko'?'현재 발동된 교차신호 없음':'No active cross signals'}</div>
    </div>
  );
  return(<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}>
    <div style={{fontSize:14,fontWeight:700,color:LT.text,marginBottom:12}}>
      {L==='ko'?`📡 교차신호 ${signals.length}건 감지`:`📡 ${signals.length} Cross Signals`}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {signals.slice(0,5).map((cs,i)=>{
        const col=cs.combined>=3.5?LT.danger:cs.combined>=2.5?LT.orange:LT.warn;
        return(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:'6px 10px',borderRadius:6,background:LT.bg2,border:`1px solid ${col}30`}}>
          <span style={{fontSize:11,fontWeight:700,color:col,minWidth:80}}>{cs.pair}</span>
          <span style={{fontSize:11,color:LT.textMid,flex:1}}>{cs.name}</span>
          <span style={{fontSize:11,fontWeight:700,color:col,minWidth:40,textAlign:"right"}}>Lv{cs.level?.level||'?'}</span>
        </div>);
      })}
      {signals.length>5&&<div style={{fontSize:11,color:LT.textDim,textAlign:"center"}}>+{signals.length-5} {L==='ko'?'건 더':'more'}</div>}
    </div>
  </div>);
}

// ═══ 5단계 상태 표시 (Level 1~5 정본 기준) ═══
// props: levelInfo = { level:1~5, name, color }
function StateIndicator({lang, levelInfo}){
  const L=lang||'ko';
  const LEVELS=[
    {level:1,l:L==='ko'?'안정':'Stable',  c:'#22c55e',i:"🟢"},
    {level:2,l:L==='ko'?'주의':'Watch',   c:'#eab308',i:"🟡"},
    {level:3,l:L==='ko'?'경계':'Caution', c:'#f97316',i:"🟠"},
    {level:4,l:L==='ko'?'심각':'Severe',  c:'#ef4444',i:"🔴"},
    {level:5,l:L==='ko'?'위기':'Crisis',  c:'#991b1b',i:"🆘"},
  ];
  const current = levelInfo ? levelInfo.level - 1 : 2; // 기본값 경계(L3)
  return(<div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
    {LEVELS.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:2}}>
      <div style={{
        width:i===current?28:20, height:i===current?28:20, borderRadius:14,
        background:i<=current?s.c:LT.border,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:i===current?12:9, fontWeight:800,
        color:i<=current?LT.white:LT.textDim,
        transition:"all .3s",
        border:i===current?`2px solid ${s.c}`:"none",
        boxShadow:i===current?`0 0 12px ${s.c}40`:"none",
      }}>{i===current?s.i:i+1}</div>
      {i<4&&<div style={{width:16,height:2,background:i<current?LEVELS[i+1].c:LT.border,borderRadius:1}}/>}
    </div>))}
    <span style={{fontSize:15,fontWeight:700,color:LEVELS[current].c,marginLeft:8}}>{LEVELS[current].l}</span>
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

export { RadarChart, DualLockIndicator, CrossSignalPanel, StateIndicator, DeltaAnalysis };
