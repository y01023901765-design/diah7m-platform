import { useState } from 'react';
import T, { L as LT } from '../theme';
import { t } from '../i18n';
import TierLock from '../components/TierLock';
import { STOCKS, ARCHETYPE_LABELS, TIER_LABELS } from '../data/stocks';

// ═══ Dummy Data (→ API 교체) ═══
const DUMMY_PRICE={
  'TSLA':{p:342.50,ch:2.8},'TSMC':{p:185.20,ch:1.2},'005930':{p:82400,ch:-0.5,krw:true},
  '000660':{p:218000,ch:1.8,krw:true},'NVDA':{p:892.40,ch:3.5},'ASML':{p:985.30,ch:0.8},
  'AAPL':{p:228.50,ch:-0.3},'XOM':{p:118.90,ch:0.4},'005380':{p:265000,ch:1.1,krw:true},
  'VALE3':{p:58.20,ch:-1.2},'INTC':{p:32.80,ch:-2.1},'MU':{p:108.50,ch:2.2},
  'QCOM':{p:172.30,ch:0.6},'AMD':{p:168.90,ch:1.9},'TXN':{p:195.40,ch:0.3},
  '035420':{p:215000,ch:-0.8,krw:true},'035720':{p:42500,ch:-1.5,krw:true},
  '051910':{p:368000,ch:0.9,krw:true},'006400':{p:412000,ch:1.3,krw:true},
  '373220':{p:385000,ch:2.1,krw:true},'BABA':{p:118.50,ch:3.2},'9988':{p:118.50,ch:3.2},
  'AMZN':{p:198.20,ch:1.5},'MSFT':{p:415.80,ch:0.7},'GOOGL':{p:178.90,ch:1.1},
  'META':{p:585.30,ch:2.4},'2317':{p:185.00,ch:0.5},'TM':{p:192.40,ch:-0.2},
  'VOW3':{p:118.50,ch:-0.8},'SHEL':{p:32.80,ch:0.3},'CVX':{p:162.50,ch:0.6},
  'RIO':{p:68.90,ch:-0.4},'BHP':{p:42.30,ch:-0.7},'NUE':{p:158.20,ch:1.4},
  '005490':{p:312000,ch:0.8,krw:true},'LMT':{p:485.20,ch:0.2},'BA':{p:178.90,ch:-1.8},
  '009540':{p:128000,ch:2.5,krw:true},'ZTS':{p:178.50,ch:0.4},'COST':{p:892.30,ch:0.9},
  'WMT':{p:185.40,ch:0.5},'UPS':{p:142.80,ch:-0.6},'MAERSK':{p:1285.00,ch:-1.2},
};
const DUMMY_FAC={
  'TSLA':[
    {name:'Giga Texas',loc:'Austin, TX',status:'normal',viirs:12,no2:8,therm:5},
    {name:'Giga Shanghai',loc:'Shanghai, CN',status:'warning',viirs:-15,no2:-20,therm:-12},
    {name:'Giga Berlin',loc:'Berlin, DE',status:'collecting',viirs:null,no2:null,therm:null},
    {name:'Fremont Factory',loc:'Fremont, CA',status:'normal',viirs:3,no2:2,therm:1},
    {name:'Giga Nevada',loc:'Sparks, NV',status:'normal',viirs:8,no2:6,therm:4},
    {name:'Megapack Lathrop',loc:'Lathrop, CA',status:'normal',viirs:18,no2:10,therm:7},
  ],
  '005930':[
    {name:'평택 캠퍼스',loc:'Pyeongtaek, KR',status:'normal',viirs:5,no2:3,therm:2},
    {name:'화성 캠퍼스',loc:'Hwaseong, KR',status:'normal',viirs:2,no2:1,therm:0},
    {name:'기흥 캠퍼스',loc:'Giheung, KR',status:'warning',viirs:-8,no2:-5,therm:-3},
    {name:'Taylor Texas',loc:'Taylor, TX',status:'construction',viirs:null,no2:null,therm:null},
    {name:'Xi\'an Fab',loc:'Xi\'an, CN',status:'normal',viirs:4,no2:2,therm:1},
  ],
};
// Delta dummy: satellite vs market divergence
const DUMMY_DELTA={
  'TSLA':{satIdx:72,mktIdx:85,gap:-13,state:'NEG_GAP',desc:'svDeltaNeg'},
  '005930':{satIdx:68,mktIdx:65,gap:3,state:'ALIGNED',desc:'svDeltaAligned'},
};
// Flow dummy: archetype step + bottleneck
const FLOW_TEMPLATES={
  MFG:['rawInput','inspect','feed','process','assemble','test','pack','ship','transport','deliver','install'],
  EXT:['explore','drill','mine','crush','sort','wash','transport','refine','store','ship','deliver'],
  LOG:['order','pickup','load','linehaul','transship','lastMile','unload','inspect','deliver','sign','complete'],
  PRC:['request','auth','route','process','compute','store','sync','cache','respond','log','settle'],
  DST:['receive','inspect','store','pick','pack','sort','load','deliver','arrive','receipt','return'],
  SIT:['design','permit','excavate','foundation','frame','finish','install','inspect','complete','handover','operate'],
};

function fmtPrice(sid){
  const d=DUMMY_PRICE[sid];
  if(!d) return {price:'—',change:'—',isUp:true};
  const price=d.krw?(d.p>=10000?(d.p/10000).toFixed(1)+'만':d.p.toLocaleString()):('$'+d.p.toFixed(2));
  return {price,change:(d.ch>0?'+':'')+d.ch.toFixed(1)+'%',isUp:d.ch>=0};
}
function chgCell(v){
  const col=v===null?LT.textDim:v>0?LT.good:v<0?LT.danger:LT.text;
  const txt=v===null?'—':v>0?`▲${v}%`:v<0?`▼${Math.abs(v)}%`:'0%';
  return {col,txt};
}

// ═══ StockView — 5탭 종목 상세 ═══
function StockView({stock:s,lang,onBack}){
  const L=lang||'ko';
  const [tab,setTab]=useState('diag');
  const {price,change,isUp}=fmtPrice(s.sid);
  const getName=x=>L==='ko'?x.n:(x.ne||x.n);
  const facs=DUMMY_FAC[s.sid]||[];
  const normalCnt=facs.filter(f=>f.status==='normal').length;
  const warnCnt=facs.filter(f=>f.status==='warning').length;
  const delta=DUMMY_DELTA[s.sid]||{satIdx:50,mktIdx:50,gap:0,state:'ALIGNED',desc:'svDeltaAligned'};
  const archKey=s.a==='MFG'?'MFG':s.a==='EXT'?'EXT':s.a==='LOG'?'LOG':s.a==='PRC'?'PRC':s.a==='DST'?'DST':'SIT';
  const flowSteps=FLOW_TEMPLATES[archKey]||FLOW_TEMPLATES['MFG'];
  const bottleneck=warnCnt>0?Math.floor(flowSteps.length*0.6):null; // dummy bottleneck

  const tabs=[
    {id:'diag',label:t('svTabDiag',L)},
    {id:'sat',label:t('svTabSat',L)},
    {id:'flow',label:t('svTabFlow',L)},
    {id:'signal',label:t('svTabSignal',L)},
    {id:'market',label:t('svTabMarket',L)},
  ];

  return(<div>
    {/* Back */}
    <button onClick={onBack} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${LT.border}`,background:"transparent",color:LT.textDim,fontSize:15,cursor:"pointer",marginBottom:12}}>← {t('stockCol',L)}</button>

    {/* Header — always visible */}
    <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:2}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>{s.c}</span>
            <span style={{fontSize:20,fontWeight:800,color:LT.text}}>{getName(s)}</span>
            <span style={{fontSize:15,color:LT.textDim,fontFamily:"monospace"}}>{s.sid}</span>
            <span style={{fontSize:14,padding:"2px 6px",borderRadius:4,background:LT.bg3,color:LT.textDim,fontWeight:600}}>T{s.tier}</span>
          </div>
          <div style={{fontSize:15,color:LT.textMid,marginTop:4}}>{s.sec} · {s.fac}{t('stockFacLabel',L)} · {ARCHETYPE_LABELS[s.a]?.[L==='ko'?'ko':'en']||s.a}</div>
          <div style={{display:"flex",gap:4,marginTop:8}}>
            {s.sat.map(st=>(<span key={st} style={{fontSize:14,padding:"2px 6px",borderRadius:4,background:LT.bg3,color:LT.textDim,fontWeight:600}}>🛰️ {st}</span>))}
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:24,fontWeight:800,color:LT.text,fontFamily:"monospace"}}>{price}</div>
          <div style={{fontSize:16,fontWeight:700,fontFamily:"monospace",color:isUp?LT.good:LT.danger}}>{change}</div>
          <div style={{fontSize:14,color:LT.textDim,marginTop:2}}>15min delayed</div>
        </div>
      </div>
    </div>

    {/* 5 Tabs */}
    <div style={{display:"flex",gap:0,borderBottom:`1px solid ${LT.border}`,marginBottom:16}}>
      {tabs.map(tb=>(<button key={tb.id} onClick={()=>setTab(tb.id)} style={{padding:"12px 16px",border:"none",background:"transparent",color:tab===tb.id?LT.text:LT.textDim,borderBottom:tab===tb.id?'2px solid #111':'2px solid transparent',fontSize:15,fontWeight:tab===tb.id?700:500,cursor:"pointer",whiteSpace:"nowrap",marginBottom:-1}}>{tb.label}</button>))}
    </div>

    {/* ═══ TAB 1: 진단 ═══ */}
    {tab==='diag'&&<>
      {/* Facility Table */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text}}>🛰️ {t('svFacTitle',L)}</div>
          <div style={{fontSize:15,color:LT.textDim}}>
            {normalCnt>0&&<span style={{color:LT.good,fontWeight:700}}>●{normalCnt} </span>}
            {warnCnt>0&&<span style={{color:LT.danger,fontWeight:700}}>●{warnCnt} </span>}
            {facs.length-normalCnt-warnCnt>0&&<span style={{color:LT.textDim}}>●{facs.length-normalCnt-warnCnt}</span>}
          </div>
        </div>
        <div style={{display:"flex",padding:"6px 0",fontSize:14,color:LT.textDim,fontWeight:600,borderBottom:`1px solid ${LT.border}`}}>
          <span style={{flex:1}}>{t('svFacName',L)}</span>
          <span style={{width:65,textAlign:"right"}}>VIIRS</span>
          <span style={{width:65,textAlign:"right"}}>NO₂</span>
          <span style={{width:65,textAlign:"right"}}>{t('svTherm',L)}</span>
          <span style={{width:70,textAlign:"right"}}>{t('svStatus',L)}</span>
        </div>
        {facs.map((f,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",padding:"10px 0",borderBottom:i<facs.length-1?`1px solid ${LT.border}`:"none"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:600,color:LT.text}}>{f.name}</div>
              <div style={{fontSize:14,color:LT.textDim}}>{f.loc}</div>
            </div>
            {[f.viirs,f.no2,f.therm].map((v,j)=>{const c=chgCell(v);return(
              <span key={j} style={{width:65,textAlign:"right",fontSize:15,fontFamily:"monospace",fontWeight:700,color:c.col}}>{c.txt}</span>
            );})}
            <span style={{width:70,textAlign:"right"}}>
              <span style={{fontSize:13,padding:"2px 6px",borderRadius:4,fontWeight:600,
                background:f.status==='normal'?`${LT.good}15`:f.status==='warning'?`${LT.danger}15`:LT.bg3,
                color:f.status==='normal'?LT.good:f.status==='warning'?LT.danger:LT.textDim}}>
                {t('svStat_'+f.status,L)}
              </span>
            </span>
          </div>
        ))}
        {facs.length===0&&<div style={{padding:20,textAlign:"center",color:LT.textDim,fontSize:15}}>{t('svNoData',L)}</div>}
      </div>
      {/* Verdict */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:8}}>🎯 {t('svVerdict',L)}</div>
        <div style={{display:"flex",gap:16,marginBottom:10}}>
          <div><span style={{color:LT.good,fontWeight:700}}>●{normalCnt}</span> <span style={{color:LT.textDim}}>{t('svSigNormal',L)}</span></div>
          {warnCnt>0&&<div><span style={{color:LT.danger,fontWeight:700}}>●{warnCnt}</span> <span style={{color:LT.textDim}}>{t('svSigWarn',L)}</span></div>}
        </div>
        <div style={{fontSize:15,color:LT.textMid,lineHeight:1.7,padding:12,background:LT.bg2,borderRadius:8}}>{warnCnt>0?t('svVerdictWarn',L):t('svVerdictOk',L)}</div>
      </div>
    </>}

    {/* ═══ TAB 2: 위성 ═══ */}
    {tab==='sat'&&<>
      {/* Before/After 비교 — 시설별 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>🛰️ {t('svSatCompare',L)}</div>
        {(facs.length>0?facs.slice(0,3):[{name:'—',loc:'—'}]).map((f,i)=>(
          <div key={i} style={{marginBottom:i<2?16:0}}>
            <div style={{fontSize:15,fontWeight:600,color:LT.text,marginBottom:6}}>{f.name} <span style={{color:LT.textDim,fontWeight:400}}>{f.loc}</span></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{background:LT.bg2,borderRadius:8,padding:12,border:`1px solid ${LT.border}`}}>
                <div style={{fontSize:14,color:LT.textDim,marginBottom:4}}>{t('svBefore',L)}</div>
                <div style={{background:LT.bg3,borderRadius:6,height:100,display:"flex",alignItems:"center",justifyContent:"center",color:LT.textDim,fontSize:14}}>🛰️ 30d ago</div>
                <div style={{fontSize:15,fontWeight:700,color:LT.text,marginTop:6,fontFamily:"monospace"}}>108.1 nW</div>
              </div>
              <div style={{background:LT.bg2,borderRadius:8,padding:12,border:`1px solid ${LT.border}`}}>
                <div style={{fontSize:14,color:LT.textDim,marginBottom:4}}>{t('svAfter',L)}</div>
                <div style={{background:LT.bg3,borderRadius:6,height:100,display:"flex",alignItems:"center",justifyContent:"center",color:LT.textDim,fontSize:14,border:f.viirs!=null&&f.viirs<0?`2px solid ${LT.danger}`:'none'}}>🛰️ {t('svLatest',L)}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
                  <span style={{fontSize:15,fontWeight:700,color:LT.text,fontFamily:"monospace"}}>{f.viirs!=null?(108.1*(1+f.viirs/100)).toFixed(1):'—'} nW</span>
                  {f.viirs!=null&&<span style={{fontSize:15,fontWeight:700,fontFamily:"monospace",color:f.viirs>0?LT.good:LT.danger}}>{f.viirs>0?'+':''}{f.viirs}%</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Delta 괴리 차트 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>📊 {t('svDeltaTitle',L)}</div>
        <div style={{display:"flex",gap:16,alignItems:"center",marginBottom:16}}>
          <div style={{flex:1}}>
            <div style={{fontSize:14,color:LT.textDim,marginBottom:4}}>{t('svDeltaSat',L)}</div>
            <div style={{height:8,background:LT.bg3,borderRadius:4,overflow:"hidden"}}><div style={{width:`${delta.satIdx}%`,height:"100%",background:LT.text,borderRadius:4}}/></div>
            <div style={{fontSize:20,fontWeight:800,color:LT.text,fontFamily:"monospace",marginTop:4}}>{delta.satIdx}</div>
          </div>
          <div style={{fontSize:24,fontWeight:800,color:delta.state==='ALIGNED'?LT.good:delta.state==='NEG_GAP'?LT.danger:LT.warn}}>
            {delta.gap>0?'+':''}{delta.gap}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,color:LT.textDim,marginBottom:4}}>{t('svDeltaMkt',L)}</div>
            <div style={{height:8,background:LT.bg3,borderRadius:4,overflow:"hidden"}}><div style={{width:`${delta.mktIdx}%`,height:"100%",background:LT.textDim,borderRadius:4}}/></div>
            <div style={{fontSize:20,fontWeight:800,color:LT.textDim,fontFamily:"monospace",marginTop:4}}>{delta.mktIdx}</div>
          </div>
        </div>
        <div style={{padding:12,background:LT.bg2,borderRadius:8,border:`1px solid ${LT.border}`}}>
          <span style={{fontSize:14,padding:"2px 8px",borderRadius:4,fontWeight:700,marginRight:8,
            background:delta.state==='ALIGNED'?`${LT.good}15`:delta.state==='NEG_GAP'?`${LT.danger}15`:`${LT.warn}15`,
            color:delta.state==='ALIGNED'?LT.good:delta.state==='NEG_GAP'?LT.danger:LT.warn}}>
            {t('svDelta_'+delta.state,L)}
          </span>
          <span style={{fontSize:15,color:LT.textMid}}>{t(delta.desc,L)}</span>
        </div>
      </div>
      {/* Trust: Past→Present */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>📡 {t('svTrustTitle',L)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:LT.bg2,borderRadius:8,padding:14,border:`1px solid ${LT.border}`}}>
            <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:6}}>◀ {t('svPast',L)}</div>
            <div style={{fontSize:15,color:LT.textMid,lineHeight:1.7}}>{t('svPastEx',L)}</div>
          </div>
          <div style={{background:LT.bg2,borderRadius:8,padding:14,border:`1px solid ${LT.border}`}}>
            <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:6}}>▶ {t('svNow',L)}</div>
            <div style={{fontSize:15,color:LT.textMid,lineHeight:1.7}}>{t('svNowEx',L)}</div>
          </div>
        </div>
      </div>
    </>}

    {/* ═══ TAB 3: 플로우 ═══ */}
    {tab==='flow'&&<>
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text}}>🔄 {t('svFlowTitle',L)}</div>
          <span style={{fontSize:14,padding:"2px 8px",borderRadius:4,background:LT.bg3,color:LT.textDim,fontWeight:600}}>{ARCHETYPE_LABELS[s.a]?.[L==='ko'?'ko':'en']||s.a}</span>
        </div>
        <div style={{fontSize:15,color:LT.textMid,marginBottom:16,lineHeight:1.6}}>{t('svFlowDesc',L)}</div>
        {/* Flow Steps */}
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          {flowSteps.map((step,i)=>{
            const isBottleneck=bottleneck===i;
            const isPast=bottleneck!==null&&i<bottleneck;
            const isFuture=bottleneck!==null&&i>bottleneck;
            return(<div key={i} style={{display:"flex",alignItems:"center",gap:12}}>
              {/* Step number + connector */}
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:32}}>
                <div style={{width:24,height:24,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0,
                  background:isBottleneck?LT.danger:isPast?LT.good:isFuture?LT.bg3:'#111',
                  color:isBottleneck||isPast?'#fff':isFuture?LT.textDim:'#fff'}}>
                  {i+1}
                </div>
                {i<flowSteps.length-1&&<div style={{width:2,height:20,background:isBottleneck?LT.danger:isPast?LT.good:LT.border}}/>}
              </div>
              {/* Step label */}
              <div style={{flex:1,padding:"6px 0"}}>
                <span style={{fontSize:15,fontWeight:isBottleneck?700:400,color:isBottleneck?LT.danger:isFuture?LT.textDim:LT.text}}>
                  {t('svFlow_'+step,L)}
                </span>
                {isBottleneck&&<span style={{fontSize:14,color:LT.danger,fontWeight:700,marginLeft:8}}>⚠ {t('svBottleneck',L)}</span>}
              </div>
            </div>);
          })}
        </div>
      </div>
      {/* Dual Lock */}
      {warnCnt>0&&<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.danger,marginBottom:8}}>🔒 {t('svDualLock',L)}</div>
        <div style={{fontSize:15,color:LT.textMid,lineHeight:1.7}}>{t('svDualLockDesc',L)}</div>
      </div>}
    </>}

    {/* ═══ TAB 4: 시그널 ═══ */}
    {tab==='signal'&&<>
      {/* 4 Flags */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>🚩 {t('svFlagTitle',L)}</div>
        {[
          {id:'cross',active:warnCnt>0,label:t('svFlagCross',L),desc:t('svFlagCrossDesc',L)},
          {id:'dual',active:warnCnt>=2,label:t('svFlagDual',L),desc:t('svFlagDualDesc',L)},
          {id:'delta',active:delta.state!=='ALIGNED',label:t('svFlagDelta',L),desc:t('svFlagDeltaDesc',L)},
          {id:'trend',active:false,label:t('svFlagTrend',L),desc:t('svFlagTrendDesc',L)},
        ].map((fl,i)=>(
          <div key={fl.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"10px 0",borderBottom:i<3?`1px solid ${LT.border}`:"none"}}>
            <span style={{width:8,height:8,borderRadius:4,marginTop:6,flexShrink:0,background:fl.active?LT.danger:LT.good}}/>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:fl.active?LT.danger:LT.text}}>{fl.label}</div>
              <div style={{fontSize:15,color:LT.textDim,marginTop:2}}>{fl.desc}</div>
            </div>
          </div>
        ))}
      </div>
      {/* DIAH-7M Edge */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>🔭 {t('svEdgeTitle',L)}</div>
        {[
          {icon:'✕',text:t('svEdge1',L),dim:true},
          {icon:'✕',text:t('svEdge2',L),dim:true},
          {icon:'●',text:t('svEdge3',L),dim:false},
        ].map((e,i)=>(
          <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:i<2?8:0}}>
            <span style={{fontSize:15,color:e.dim?LT.textDim:LT.text,fontWeight:e.dim?400:700,flexShrink:0}}>{e.icon}</span>
            <span style={{fontSize:15,color:e.dim?LT.textDim:LT.text,fontWeight:e.dim?400:600,lineHeight:1.6}}>{e.text}</span>
          </div>
        ))}
      </div>
    </>}

    {/* ═══ TAB 5: 시장 ═══ */}
    {tab==='market'&&<>
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>💹 {t('svMarketTitle',L)}</div>
        {/* Price chart placeholder */}
        <div style={{background:LT.bg2,borderRadius:8,height:180,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${LT.border}`,marginBottom:12}}>
          <span style={{fontSize:15,color:LT.textDim}}>{t('svChartPlaceholder',L)}</span>
        </div>
        {/* Key financials grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
          {[
            {label:t('svMktCap',L),val:s.sid==='TSLA'?'$1.09T':'—'},
            {label:t('svMktPE',L),val:s.sid==='TSLA'?'68.5':'—'},
            {label:t('svMktVol',L),val:s.sid==='TSLA'?'124.3M':'—'},
            {label:t('svMkt52',L),val:s.sid==='TSLA'?'$138~$489':'—'},
          ].map((m,i)=>(
            <div key={i} style={{background:LT.bg2,borderRadius:6,padding:12,border:`1px solid ${LT.border}`}}>
              <div style={{fontSize:14,color:LT.textDim}}>{m.label}</div>
              <div style={{fontSize:16,fontWeight:700,color:LT.text,fontFamily:"monospace",marginTop:4}}>{m.val}</div>
            </div>
          ))}
        </div>
      </div>
    </>}

    {/* Disclaimer — always */}
    <div style={{padding:"8px 12px",borderRadius:6,background:LT.bg2,border:`1px solid ${LT.border}`,marginTop:4}}>
      <span style={{fontSize:14,color:LT.danger,fontWeight:700}}>⚠ {t('svDisclaimer',L)}</span>
      <span style={{fontSize:14,color:LT.textDim,marginLeft:6}}>{t('svDisclaimerDesc',L)}</span>
    </div>
  </div>);
}

// ═══ Stock Main Page ═══
function StockPage({user,lang}){
  const L=lang||'ko';
  const [search,setSearch]=useState('');
  const [filterTier,setFilterTier]=useState(0);
  const [filterArch,setFilterArch]=useState('');
  const [selected,setSelected]=useState(null);

  const getName=s=>L==='ko'?s.n:(s.ne||s.n);
  const filtered=STOCKS.filter(s=>{
    if(filterTier && s.tier!==filterTier) return false;
    if(filterArch && s.a!==filterArch) return false;
    if(search){const q=search.toLowerCase();return getName(s).toLowerCase().includes(q)||s.sid.toLowerCase().includes(q)||s.sec.toLowerCase().includes(q);}
    return true;
  });
  const countries=[...new Set(STOCKS.map(s=>s.c))].length;
  const totalFac=STOCKS.reduce((a,s)=>a+s.fac,0);

  if(selected) return(
    <div style={{maxWidth:780,margin:"0 auto",padding:"20px 16px"}}>
      <TierLock plan={user?.plan||'FREE'} req="PRO" lang={L}>
        <StockView stock={selected} lang={L} onBack={()=>setSelected(null)}/>
      </TierLock>
    </div>
  );

  return(<div style={{maxWidth:780,margin:"0 auto",padding:"20px 16px"}}>
    {/* Hero */}
    <div style={{marginBottom:20}}>
      <div style={{fontSize:18,fontWeight:800,color:LT.text,marginBottom:6,lineHeight:1.5}}>📈 {t('stockTitle',L)}</div>
      <div style={{fontSize:16,color:LT.textMid,lineHeight:1.7,marginBottom:12}}>{t('stockHero',L)}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[
          {v:totalFac,label:t('stockKpi1',L),col:LT.text},
          {v:3,label:t('stockKpi2',L),col:LT.danger},
          {v:18,label:t('stockKpi3',L),col:LT.text},
        ].map((k,i)=>(
          <div key={i} style={{background:LT.surface,borderRadius:LT.cardRadius,padding:14,border:`1px solid ${LT.border}`,textAlign:"center"}}>
            <div style={{fontSize:24,fontWeight:900,color:k.col,fontFamily:"monospace"}}>{k.v}</div>
            <div style={{fontSize:15,color:LT.textMid,marginTop:2}}>{k.label}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Tier Filter */}
    <div className="grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
      {[1,2,3].map(tier=>{
        const cnt=STOCKS.filter(s=>s.tier===tier).length;const lb=TIER_LABELS[tier];const active=filterTier===tier;
        return(<div key={tier} onClick={()=>setFilterTier(active?0:tier)}
          style={{background:active?LT.bg3:LT.surface,borderRadius:LT.cardRadius,padding:14,border:`1px solid ${active?LT.text:LT.border}`,cursor:"pointer"}}>
          <div style={{fontSize:22,fontWeight:900,color:LT.text,fontFamily:"monospace"}}>{cnt}</div>
          <div style={{fontSize:15,fontWeight:600,color:LT.textMid,marginTop:2}}>{L==='ko'?lb.ko:(lb.en||lb.ko)}</div>
        </div>);
      })}
    </div>

    {/* Search + Archetype */}
    <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('stockSearch',L)}
        style={{flex:1,minWidth:200,padding:"8px 12px",borderRadius:8,border:`1px solid ${LT.border}`,background:LT.surface,color:LT.text,fontSize:15,outline:"none"}}/>
      <div style={{display:"flex",gap:4}}>
        {Object.entries(ARCHETYPE_LABELS).map(([k,v])=>{
          const active=filterArch===k;
          return(<button key={k} onClick={()=>setFilterArch(active?'':k)}
            style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${active?LT.text:LT.border}`,background:active?LT.bg3:LT.surface,color:active?LT.text:LT.textDim,fontSize:15,fontWeight:active?700:500,cursor:"pointer"}}>{L==='ko'?v.ko:(v.en||v.ko)}</button>);
        })}
      </div>
    </div>

    {/* Column Header */}
    <div style={{display:"flex",alignItems:"center",padding:"8px 14px",fontSize:14,color:LT.textDim,fontWeight:600,borderBottom:`1px solid ${LT.border}`,marginBottom:2}}>
      <span style={{width:36}}/><span style={{flex:1}}>{t('stockCol',L)}</span>
      <span style={{width:80,textAlign:"right"}}>{t('stockColSat',L)}</span>
      <span style={{width:100,textAlign:"right"}}>{t('stockColPrice',L)}</span>
      <span style={{width:70,textAlign:"right"}}>{t('stockColChg',L)}</span>
    </div>

    {/* Rows */}
    {filtered.slice(0,user?.plan==='PRO'||user?.plan==='ENTERPRISE'?100:10).map(s=>{
      const {price,change,isUp}=fmtPrice(s.sid);
      return(<div key={s.id} onClick={()=>setSelected(s)} style={{display:"flex",alignItems:"center",padding:"10px 14px",borderBottom:`1px solid ${LT.border}`,cursor:"pointer",transition:"background .15s"}}
        onMouseEnter={e=>e.currentTarget.style.background=LT.bg2} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        <span style={{width:36,fontSize:14,flexShrink:0}}>{s.c}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:15,fontWeight:700,color:LT.text}}>{getName(s)}</span>
            <span style={{fontSize:14,color:LT.textDim,fontFamily:"monospace"}}>{s.sid}</span>
            <span style={{fontSize:13,padding:"1px 4px",borderRadius:3,background:LT.bg3,color:LT.textDim,fontWeight:600}}>T{s.tier}</span>
          </div>
          <div style={{fontSize:14,color:LT.textDim,marginTop:1}}>{s.sec} · {s.fac}{t('stockFacLabel',L)}</div>
        </div>
        <div style={{width:80,display:"flex",gap:2,justifyContent:"flex-end",flexWrap:"wrap",flexShrink:0}}>
          {s.sat.slice(0,3).map(st=>(<span key={st} style={{fontSize:12,padding:"1px 3px",borderRadius:2,background:LT.bg3,color:LT.textDim,fontWeight:600,lineHeight:1.3}}>{st}</span>))}
          {s.sat.length>3&&<span style={{fontSize:12,color:LT.textDim}}>+{s.sat.length-3}</span>}
        </div>
        <div style={{width:100,textAlign:"right",flexShrink:0}}><div style={{fontSize:16,fontWeight:700,color:LT.text,fontFamily:"monospace"}}>{price}</div></div>
        <div style={{width:70,textAlign:"right",flexShrink:0}}><span style={{fontSize:15,fontWeight:700,fontFamily:"monospace",color:isUp?LT.good:LT.danger}}>{change}</span></div>
      </div>);
    })}

    {filtered.length>10&&user?.plan!=='PRO'&&user?.plan!=='ENTERPRISE'&&(
      <TierLock plan={user?.plan||'FREE'} req="PRO" lang={L}>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:30,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:6}}>+{filtered.length-10} {t('stockMore',L)}</div>
          <div style={{fontSize:15,color:LT.textMid}}>PRO {t('stockMoreDesc',L)}</div>
        </div>
      </TierLock>
    )}

    <div style={{background:LT.bg2,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`,marginTop:14}}>
      <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:6}}>📺 YouTube {t('stockYT',L)}</div>
      <div style={{fontSize:15,color:LT.textMid,lineHeight:1.6}}>{t('stockYTDesc',L)}</div>
    </div>
  </div>);
}

export default StockPage;
