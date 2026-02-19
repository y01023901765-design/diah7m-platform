import { useState, useEffect } from 'react';
import T, { L as LT } from '../theme';
import { t } from '../i18n';
import TierLock from '../components/TierLock';
import { GaugeRow, SystemSection } from '../components/Gauges';
import { RadarChart } from '../components/Charts';
import { STOCKS, ARCHETYPE_LABELS, TIER_LABELS } from '../data/stocks';
import * as API from '../api';

// ═══ 가격 포맷 (API 실데이터 기반) ═══
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

function fmtPrice(sid, livePrices){
  const d = livePrices && livePrices[sid];
  if(!d || d.price==null) return {price:'—',change:'—',isUp:true};
  const isKrw = d.currency==='KRW';
  const price = isKrw
    ? (d.price>=10000?(d.price/10000).toFixed(1)+'만':d.price.toLocaleString())
    : (d.currency==='JPY'?'¥':d.currency==='CNY'?'¥':d.currency==='TWD'?'NT$':'$')+d.price.toLocaleString(undefined,{minimumFractionDigits:d.price>=1000?0:2,maximumFractionDigits:d.price>=1000?0:2});
  const ch = d.change!=null ? d.change : 0;
  return {price, change:(ch>0?'+':'')+ch.toFixed(1)+'%', isUp:ch>=0};
}
function chgCell(v){
  const col=v===null?LT.textDim:v>0?LT.good:v<0?LT.danger:LT.text;
  const txt=v===null?'—':v>0?`▲${v}%`:v<0?`▼${Math.abs(v)}%`:'0%';
  return {col,txt};
}

// ═══ Stock Gauge 5축 정의 (stock-thresholds.js 미러) ═══
const STOCK_AXES = {
  SV: { id:'SV', name:{en:'Valuation',ko:'밸류에이션'}, icon:'💰', color:'#8b5cf6', gauges:['SG_V1','SG_V2','SG_V3','SG_V4'] },
  SG: { id:'SG', name:{en:'Growth',ko:'성장성'}, icon:'📈', color:'#10b981', gauges:['SG_G1','SG_G2','SG_G3'] },
  SQ: { id:'SQ', name:{en:'Quality',ko:'재무건전성'}, icon:'🏗️', color:'#3b82f6', gauges:['SG_Q1','SG_Q2','SG_Q3'] },
  SM: { id:'SM', name:{en:'Momentum',ko:'모멘텀'}, icon:'⚡', color:'#f59e0b', gauges:['SG_M1','SG_M2','SG_M3'] },
  SS: { id:'SS', name:{en:'Satellite',ko:'위성물리'}, icon:'🛰️', color:'#ef4444', gauges:['SG_S1','SG_S2'] },
};

const STOCK_GAUGE_NAMES = {
  SG_V1:{en:'P/E Ratio',ko:'PER(배)'},SG_V2:{en:'P/B Ratio',ko:'PBR(배)'},
  SG_V3:{en:'EV/EBITDA',ko:'EV/EBITDA(배)'},SG_V4:{en:'Dividend Yield',ko:'배당수익률(%)'},
  SG_G1:{en:'Revenue Growth',ko:'매출성장률(%)'},SG_G2:{en:'Earnings Growth',ko:'순이익성장률(%)'},
  SG_G3:{en:'OPM Trend',ko:'영업이익률추세(bps)'},
  SG_Q1:{en:'ROE',ko:'ROE(%)'},SG_Q2:{en:'Debt/Equity',ko:'부채비율(%)'},
  SG_Q3:{en:'FCF Margin',ko:'FCF마진(%)'},
  SG_M1:{en:'RSI 14d',ko:'RSI 14일'},SG_M2:{en:'52W Strength',ko:'52주강도(%)'},
  SG_M3:{en:'Volume Trend',ko:'거래량추세(%)'},
  SG_S1:{en:'NTL Anomaly',ko:'야간광이상(%)'},SG_S2:{en:'Thermal Anomaly',ko:'열이상(°C)'},
};

// API 게이지 응답 → GaugeRow/SystemSection 형식 변환
function buildStockEntityData(gaugesArr, health, lang) {
  const L = lang || 'ko';
  const gaugeData = {};
  const sysData = {};

  // 1) gauge 배열 → GaugeRow 호환 형식
  for (let i = 0; i < (gaugesArr || []).length; i++) {
    const g = gaugesArr[i];
    const nm = STOCK_GAUGE_NAMES[g.id];
    const gradeKo = g.grade === 'good' ? '양호' : g.grade === 'caution' ? '주의'
      : g.grade === 'alert' ? '경보' : '주의';
    gaugeData[g.id] = {
      c: g.id,
      n: nm ? nm[L] || nm.en : g.id,
      s: g.axis,
      u: '',
      v: g.value,
      p: g.prevValue ?? g.value,
      ch: g.value != null ? (g.value >= 0 ? '+' + (typeof g.value === 'number' ? g.value.toFixed(1) : g.value) : String(typeof g.value === 'number' ? g.value.toFixed(1) : g.value)) : '—',
      g: g.value != null ? gradeKo : '주의',
      note: g.status === 'OK' ? '' : g.status || '',
      t: null, m: null, act: [], bs: null,
      _live: g.status === 'OK',
      _global: false,
    };
  }

  // 2) 축별 시스템 점수 → SystemSection 호환 형식
  for (const [axId, ax] of Object.entries(STOCK_AXES)) {
    const keys = ax.gauges.filter(k => gaugeData[k]);
    const serverSys = health?.systemScores?.[axId];
    let sc, g, hasAlert;
    if (serverSys) {
      sc = serverSys.score;
      g = serverSys.grade === 'good' ? '양호' : serverSys.grade === 'caution' ? '주의' : '경보';
      hasAlert = serverSys.hasAlert;
    } else if (keys.length > 0) {
      const scores = keys.map(k => gaugeData[k].g === '양호' ? 85 : gaugeData[k].g === '주의' ? 50 : 15);
      const n = scores.length;
      const raw = scores.reduce((a, b) => a + b, 0) / n;
      sc = Math.round((n * raw + 3 * 50) / (n + 3)); // k=3 for stock
      g = sc >= 70 ? '양호' : sc >= 40 ? '주의' : '경보';
      hasAlert = scores.some(s => s <= 15);
    } else {
      sc = 50; g = '주의'; hasAlert = false;
    }
    sysData[axId] = {
      tK: axId,
      name: ax.name,
      icon: ax.icon,
      color: ax.color,
      g, sc, keys,
      hasAlert,
    };
  }

  return { gaugeData, sysData };
}

// ═══ StockView — 5탭 종목 상세 ═══
function StockView({stock:s,lang,onBack}){
  const L=lang||'ko';
  const [tab,setTab]=useState('diag');
  const [liveFacs,setLiveFacs]=useState(null);
  const [liveDelta,setLiveDelta]=useState(null);
  const [liveGauges,setLiveGauges]=useState(null);
  const [liveHealth,setLiveHealth]=useState(null);
  const [expanded,setExpanded]=useState({});
  const [livePrice,setLivePrice]=useState(null);
  const pData = livePrice ? {[s.sid]:livePrice} : {};
  const {price,change,isUp}=fmtPrice(s.sid, pData);
  const getName=x=>L==='ko'?x.n:(x.ne||x.n);
  const toggleGauge=id=>setExpanded(p=>({...p,[id]:!p[id]}));

  // API에서 시설/델타/게이지/건강도/가격 로드
  useEffect(()=>{
    let c=false;
    (async()=>{
      try{
        const [facRes,deltaRes,gaugeRes,profileRes,priceRes]=await Promise.allSettled([
          API.stockFacilities(s.sid),
          API.stockDelta(s.sid),
          API.stockGauges(s.sid),
          API.stockProfile(s.sid),
          API.stockPrice(s.sid),
        ]);
        if(c)return;
        if(facRes.status==='fulfilled'&&facRes.value?.facilities) setLiveFacs(facRes.value.facilities);
        if(deltaRes.status==='fulfilled') setLiveDelta(deltaRes.value);
        if(gaugeRes.status==='fulfilled'&&gaugeRes.value?.gauges) setLiveGauges(gaugeRes.value.gauges);
        if(profileRes.status==='fulfilled'&&profileRes.value?.health) setLiveHealth(profileRes.value.health);
        if(priceRes.status==='fulfilled'&&priceRes.value?.price!=null) setLivePrice(priceRes.value);
      }catch{/* fallback */}
    })();
    return()=>{c=true};
  },[s.sid]);

  // buildStockEntityData로 GaugeRow/SystemSection 데이터 변환
  const stockEntity = liveGauges ? buildStockEntityData(liveGauges, liveHealth, L) : null;

  const facs=liveFacs||DUMMY_FAC[s.sid]||[];
  const normalCnt=facs.filter(f=>f.status==='normal').length;
  const warnCnt=facs.filter(f=>f.status==='warning').length;
  const rawDelta=liveDelta||DUMMY_DELTA[s.sid]||{satIdx:50,mktIdx:50,gap:0,state:'ALIGNED',desc:'svDeltaAligned'};
  const delta={satIdx:rawDelta.ssScore||rawDelta.satIdx||50,mktIdx:rawDelta.smScore||rawDelta.mktIdx||50,gap:rawDelta.gap||0,state:rawDelta.state||'ALIGNED',desc:rawDelta.description?'':rawDelta.desc||'svDeltaAligned'};
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
          <div style={{fontSize:14,color:LT.textDim,marginTop:2}}>{t('svDelayed',L)}</div>
        </div>
      </div>
    </div>

    {/* 5 Tabs — mobile scroll */}
    <div style={{display:"flex",gap:0,borderBottom:`1px solid ${LT.border}`,marginBottom:16,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      {tabs.map(tb=>(<button key={tb.id} onClick={()=>setTab(tb.id)} style={{padding:"12px 16px",border:"none",background:"transparent",color:tab===tb.id?LT.text:LT.textDim,borderBottom:tab===tb.id?'2px solid #111':'2px solid transparent',fontSize:15,fontWeight:tab===tb.id?700:500,cursor:"pointer",whiteSpace:"nowrap",marginBottom:-1}}>{tb.label}</button>))}
    </div>

    {/* ═══ TAB 1: 진단 ═══ */}
    {tab==='diag'&&<>
      {/* Score Card + Radar */}
      {stockEntity&&<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
          <RadarChart lang={L} sysData={stockEntity.sysData}/>
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontSize:14,color:LT.textDim,marginBottom:4}}>{L==='ko'?'종합 건강도':'Overall Health'}</div>
            <div style={{fontSize:36,fontWeight:900,color:liveHealth?.score>=70?LT.good:liveHealth?.score>=40?LT.warn:LT.danger,fontFamily:"monospace"}}>{liveHealth?.score??'—'}</div>
            {liveHealth?.severity!=null&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
              <span style={{fontSize:14,color:LT.textDim}}>{L==='ko'?'리스크':'Risk'}</span>
              <div style={{flex:1,height:6,background:LT.bg3,borderRadius:3,overflow:"hidden"}}>
                <div style={{width:`${(liveHealth.severity/5)*100}%`,height:"100%",borderRadius:3,background:liveHealth.severity>=3.5?LT.danger:liveHealth.severity>=2?LT.warn:LT.good}}/>
              </div>
              <span style={{fontSize:14,fontWeight:700,fontFamily:"monospace",color:liveHealth.severity>=3.5?LT.danger:liveHealth.severity>=2?LT.warn:LT.good}}>{liveHealth.severity.toFixed(1)}/5</span>
            </div>}
            {liveHealth?.contextNote&&<div style={{fontSize:14,color:LT.textMid,marginTop:8,padding:8,background:LT.bg2,borderRadius:6}}>{liveHealth.contextNote}</div>}
          </div>
        </div>
      </div>}
      {/* 5축 Gauge Panel */}
      {stockEntity&&<div style={{marginBottom:12}}>
        {Object.entries(stockEntity.sysData).map(([axId,sys])=>(
          <SystemSection key={axId} sysKey={axId} sys={sys} expanded={expanded} toggle={toggleGauge} lang={L} gaugeData={stockEntity.gaugeData} isGlobal={false}/>
        ))}
      </div>}
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
        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        <div style={{display:"flex",padding:"6px 0",fontSize:14,color:LT.textDim,fontWeight:600,borderBottom:`1px solid ${LT.border}`,minWidth:480}}>
          <span style={{flex:1,minWidth:130}}>{t('svFacName',L)}</span>
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
        </div>{/* end scroll wrapper */}
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
            <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
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
        <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
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
        <div className="grid-2" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
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
  const [filterCountry,setFilterCountry]=useState('');
  const [selected,setSelected]=useState(null);
  const [livePrices,setLivePrices]=useState({});

  // 가격 배치 로드
  useEffect(()=>{
    let c=false;
    API.safeApi('/api/v1/stock/prices',{},{}).then(d=>{
      if(!c&&d&&d.prices) setLivePrices(d.prices);
    });
    return()=>{c=true};
  },[]);

  // 국가별 고유 목록 (flag → {flag, count})
  const countryList = (() => {
    const m = {};
    STOCKS.forEach(s => { m[s.c] = (m[s.c] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([flag, cnt]) => ({ flag, cnt }));
  })();

  const getName=s=>L==='ko'?s.n:(s.ne||s.n);
  const filtered=STOCKS.filter(s=>{
    if(filterTier && s.tier!==filterTier) return false;
    if(filterArch && s.a!==filterArch) return false;
    if(filterCountry && s.c!==filterCountry) return false;
    if(search){const q=search.toLowerCase();return getName(s).toLowerCase().includes(q)||s.sid.toLowerCase().includes(q)||s.sec.toLowerCase().includes(q);}
    return true;
  });

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
    <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
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
    {/* Country Filter */}
    <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
      <button onClick={()=>setFilterCountry('')}
        style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${!filterCountry?LT.text:LT.border}`,background:!filterCountry?LT.bg3:LT.surface,color:!filterCountry?LT.text:LT.textDim,fontSize:14,fontWeight:!filterCountry?700:500,cursor:"pointer"}}>
        {L==='ko'?'전체':'All'} <span style={{fontSize:13,color:LT.textDim}}>({STOCKS.length})</span>
      </button>
      {countryList.map(({flag,cnt})=>{
        const active=filterCountry===flag;
        return(<button key={flag} onClick={()=>setFilterCountry(active?'':flag)}
          style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${active?LT.text:LT.border}`,background:active?LT.bg3:LT.surface,fontSize:14,fontWeight:active?700:500,cursor:"pointer",color:active?LT.text:LT.textDim}}>
          {flag}<span style={{fontSize:13,marginLeft:2}}>{cnt}</span>
        </button>);
      })}
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
      const {price,change,isUp}=fmtPrice(s.sid, livePrices);
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
