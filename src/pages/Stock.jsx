import { useState, useEffect } from 'react';
import T, { L as LT } from '../theme';
import { t } from '../i18n';
import TierLock from '../components/TierLock';
import { GaugeRow, SystemSection } from '../components/Gauges';
import { RadarChart } from '../components/Charts';
import { STOCKS, ARCHETYPE_LABELS, TIER_LABELS } from '../data/stocks';
import * as API from '../api';

// ═══ 가격 포맷 (API 실데이터 기반) ═══

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

// 위성 연월 유틸 (컴포넌트 바깥 — 렌더마다 재계산 방지)
function _satYM(monthOffset){
  const d=new Date(); d.setMonth(d.getMonth()+monthOffset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
// VIIRS 발행 최신월 = 현재 -1개월 (실제 확인 기준 2026-01까지 발행됨)
const _SAT_LATEST = _satYM(-1);   // 예: 2026-01
const _SAT_PREV1  = _satYM(-2);   // 직전월: 2025-12
const _SAT_PREV12 = _satYM(-13);  // 전년동월: 2025-01
const _SAT_PREV3Y = _satYM(-37);  // 3년 전 동월: 2023-01
// 프리셋 정의 — null=서버 슬라이딩 윈도우(6개월 평균) 사용
const _SAT_PRESETS=[
  {id:'auto',label:'자동',       after:null,        before:null},       // 서버 슬라이딩 윈도우
  {id:'m1',  label:'연속 1개월', after:_SAT_LATEST, before:_SAT_PREV1},
  {id:'yoy', label:'전년 동월',  after:_SAT_LATEST, before:_SAT_PREV12},
  {id:'3y',  label:'3년 비교',   after:_SAT_LATEST, before:_SAT_PREV3Y},
];
const _SAT_DEFAULTS={after:null,before:null}; // 기본: 자동(슬라이딩 윈도우)

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

  const [liveFlow,setLiveFlow]=useState(null);
  const [liveSignals,setLiveSignals]=useState(null);
  const [liveChart,setLiveChart]=useState(null);
  const [liveSatImg,setLiveSatImg]=useState(null);
  const [satImgLoading,setSatImgLoading]=useState(false);
  const [satImgError,setSatImgError]=useState(null);
  const [satAfterYM,setSatAfterYM]=useState(_SAT_DEFAULTS.after);
  const [satBeforeYM,setSatBeforeYM]=useState(_SAT_DEFAULTS.before);
  const [chartRange,setChartRange]=useState('6mo');
  const [loading,setLoading]=useState(true);

  // API에서 시설/델타/게이지/건강도/가격/플로우/시그널 로드
  useEffect(()=>{
    let c=false;
    setLoading(true);
    (async()=>{
      try{
        const [facRes,deltaRes,gaugeRes,profileRes,priceRes,flowRes,sigRes]=await Promise.allSettled([
          API.stockFacilities(s.sid),
          API.stockDelta(s.sid),
          API.stockGauges(s.sid),
          API.stockProfile(s.sid),
          API.stockPrice(s.sid),
          API.stockFlow(s.sid),
          API.stockSignals(s.sid),
        ]);
        if(c)return;
        if(facRes.status==='fulfilled'&&facRes.value?.facilities) setLiveFacs(facRes.value.facilities);
        if(deltaRes.status==='fulfilled') setLiveDelta(deltaRes.value);
        if(gaugeRes.status==='fulfilled'&&gaugeRes.value?.gauges) setLiveGauges(gaugeRes.value.gauges);
        if(profileRes.status==='fulfilled'&&profileRes.value?.health) setLiveHealth(profileRes.value.health);
        if(priceRes.status==='fulfilled'&&priceRes.value?.price!=null) setLivePrice(priceRes.value);
        if(flowRes.status==='fulfilled'&&flowRes.value?.stages) setLiveFlow(flowRes.value);
        if(sigRes.status==='fulfilled'&&sigRes.value?.flags) setLiveSignals(sigRes.value);
      }catch{/* fallback */}
      if(!c) setLoading(false);
    })();
    return()=>{c=true};
  },[s.sid]);

  // 차트 데이터 로드 (range 변경 시)
  useEffect(()=>{
    let c=false;
    API.stockChart(s.sid,chartRange).then(d=>{
      if(!c&&d&&d.candles) setLiveChart(d);
    }).catch(()=>{});
    return()=>{c=true};
  },[s.sid,chartRange]);

  // 위성 이미지 — 위성 탭 진입 or 연월 변경 시 로드
  useEffect(()=>{
    if(tab!=='sat') return;
    setSatImgLoading(true);
    setLiveSatImg(null);
    setSatImgError(null);
    API.stockSatellite(s.sid,{afterYM:satAfterYM,beforeYM:satBeforeYM}).then(d=>{
      if(d&&d.facilities&&d.facilities.length>0) setLiveSatImg(d.facilities);
      else setSatImgError(d?.error||'시설 데이터 없음');
    }).catch(e=>{ setSatImgError(e?.message||'API 오류'); }).finally(()=>{ setSatImgLoading(false); });
  },[tab,s.sid,satAfterYM,satBeforeYM]);// eslint-disable-line

  // buildStockEntityData로 GaugeRow/SystemSection 데이터 변환
  const stockEntity = liveGauges ? buildStockEntityData(liveGauges, liveHealth, L) : null;

  const facs=liveFacs||[];
  const normalCnt=facs.filter(f=>f.status==='normal').length;
  const warnCnt=facs.filter(f=>f.status==='warning'||f.status==='alarm').length;
  const rawDelta=liveDelta||{satIdx:50,mktIdx:50,gap:0,state:'ALIGNED',desc:'svDeltaAligned'};
  const delta={satIdx:rawDelta.ssScore||rawDelta.satIdx||50,mktIdx:rawDelta.smScore||rawDelta.mktIdx||50,gap:rawDelta.gap||0,state:rawDelta.state||'ALIGNED',desc:rawDelta.description?'':rawDelta.desc||'svDeltaAligned'};

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
      {/* Loading skeleton */}
      {loading&&!stockEntity&&<div style={{padding:40,textAlign:"center"}}>
        <div style={{width:32,height:32,border:`3px solid ${LT.border}`,borderTopColor:LT.text,borderRadius:"50%",margin:"0 auto 12px",animation:"spin 1s linear infinite"}}/>
        <div style={{fontSize:15,color:LT.textDim}}>{L==='ko'?'진단 데이터 로딩 중...':'Loading diagnosis...'}</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>}
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
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:10}}>🛰️ {t('svSatCompare',L)}</div>
        {/* 프리셋 + 연/월 피커 */}
        {(()=>{
          const selStyle={padding:'4px 8px',fontSize:12,borderRadius:6,border:`1px solid ${LT.border}`,background:LT.bg2,color:LT.text,cursor:'pointer',outline:'none'};
          const years=[];for(let y=new Date().getFullYear();y>=2012;y--)years.push(y);
          const months=[1,2,3,4,5,6,7,8,9,10,11,12];
          const isAuto = !satAfterYM && !satBeforeYM;
          const [aY,aM] = isAuto ? [null,null] : satAfterYM.split('-').map(Number);
          const [bY,bM] = isAuto ? [null,null] : satBeforeYM.split('-').map(Number);
          const setAY=v=>setSatAfterYM(`${v}-${String(aM||1).padStart(2,'0')}`);
          const setAM=v=>setSatAfterYM(`${aY||new Date().getFullYear()}-${String(v).padStart(2,'0')}`);
          const setBY=v=>setSatBeforeYM(`${v}-${String(bM||1).padStart(2,'0')}`);
          const setBM=v=>setSatBeforeYM(`${bY||new Date().getFullYear()-1}-${String(v).padStart(2,'0')}`);
          const activePreset=_SAT_PRESETS.find(p=>p.after===satAfterYM&&p.before===satBeforeYM);
          return(<>
            {/* 프리셋 버튼 */}
            <div style={{display:"flex",gap:4,marginBottom:8}}>
              {_SAT_PRESETS.map(p=>(
                <button key={p.id} onClick={()=>{setSatAfterYM(p.after);setSatBeforeYM(p.before);}}
                  style={{padding:'3px 10px',fontSize:12,fontWeight:activePreset?.id===p.id?700:400,borderRadius:6,
                    border:`1px solid ${activePreset?.id===p.id?LT.text:LT.border}`,
                    background:activePreset?.id===p.id?LT.text:'transparent',
                    color:activePreset?.id===p.id?LT.surface:LT.textDim,cursor:'pointer'}}>{p.label}</button>
              ))}
            </div>
            {/* 연월 드롭다운 — 자동 모드가 아닐 때만 표시 */}
            {!isAuto&&<div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <span style={{fontSize:11,color:LT.textDim,whiteSpace:"nowrap"}}>비교기준</span>
                <select value={bY} onChange={e=>setBY(Number(e.target.value))} style={selStyle}>
                  {years.map(y=><option key={y} value={y}>{y}년</option>)}
                </select>
                <select value={bM} onChange={e=>setBM(Number(e.target.value))} style={selStyle}>
                  {months.map(m=><option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
              <span style={{fontSize:12,color:LT.textDim}}>→</span>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <span style={{fontSize:11,color:LT.textDim,whiteSpace:"nowrap"}}>발행 최신월</span>
                <select value={aY} onChange={e=>setAY(Number(e.target.value))} style={selStyle}>
                  {years.map(y=><option key={y} value={y}>{y}년</option>)}
                </select>
                <select value={aM} onChange={e=>setAM(Number(e.target.value))} style={selStyle}>
                  {months.map(m=><option key={m} value={m}>{m}월</option>)}
                </select>
              </div>
            </div>}
            {/* ① 데이터 시점 + ② 계절성 안내 */}
            <div style={{marginBottom:10,display:'flex',flexWrap:'wrap',gap:6,alignItems:'center'}}>
              <div style={{fontSize:12,color:LT.textDim,padding:'4px 8px',background:LT.bg2,borderRadius:6}}>
                {isAuto ? '📅 자동 — 최근 6개월 vs 1년 전 슬라이딩 비교' : `📅 ${satBeforeYM} → ${satAfterYM} ${activePreset?`(${activePreset.label})`:'(직접 선택)'}`}
              </div>
              <div style={{fontSize:11,color:LT.textDim,padding:'4px 8px',background:LT.bg2,borderRadius:6}}>
                👉 관측 기준: VIIRS 발행 지연 약 90일 · 최신 데이터 기준 2025-11
              </div>
              <div style={{fontSize:11,color:'#f0a000',padding:'4px 8px',background:LT.bg2,borderRadius:6}}>
                🌐 계절 영향 제거: <strong>전년 동월 비교</strong> 권장 — 눈·일조·기온 변수 제거
              </div>
            </div>
          </>);
        })()}
        {satImgLoading&&<div style={{textAlign:"center",padding:"32px 0",color:LT.textDim,fontSize:15}}>🛰️ GEE 위성 이미지 수집 중… (최대 30초)</div>}
        {!satImgLoading&&satImgError&&<div style={{textAlign:"center",padding:"16px 0",color:LT.danger,fontSize:14}}>⚠️ {satImgError}</div>}
        {!satImgLoading&&(()=>{
          // liveSatImg 있으면 이미지 있는 시설 우선, 없으면 facs.slice(0,3)
          const displayFacs = liveSatImg && liveSatImg.length>0
            ? liveSatImg.slice(0,3)
            : (facs.length>0?facs.slice(0,3):[{name:'—',loc:'—'}]);
          return displayFacs;
        })().map((f,i)=>{
          const satFac=liveSatImg&&liveSatImg.find(sf=>sf.name===f.name);
          const imgs=satFac?.images||null;
          const ntl=satFac?.ntl||null;
          // 서버 계산 deltaPct 우선 (동일 조건 after/before), 없으면 ntl.anomPct 폴백
          const deltaPct=imgs?.deltaPct??ntl?.anomPct??ntl?.anomaly??f.viirs??null;
          const anomPct=deltaPct;
          const beforeUrl=imgs?.beforeUrl||null;
          const afterUrl=imgs?.afterUrl||null;
          const beforeDate=imgs?.beforeDate||null;
          const afterDate=imgs?.afterDate||null;
          // 서버에서 동일 윈도우/스케일로 계산된 값
          const afterVal=imgs?.afterValue??null;
          const beforeVal=imgs?.beforeValue??null;
          const units=imgs?.units||'nW/cm²/sr';
          const obsAfter=imgs?.obsMonthAfter||null;
          const obsBefore=imgs?.obsMonthBefore||null;
          // ③ 가동 흐름 한줄 해석
          const flowText=anomPct==null?null
            :anomPct>15?'야간 운영 강화 패턴 — 가동 밀도 증가 추정'
            :anomPct>5?'가동 흐름 안정 — 전년 대비 활동 증가'
            :anomPct>-5?'가동 흐름 안정 — 전년과 유사 수준'
            :anomPct>-15?'작업 밀도 소폭 감소 — 모니터링 권장'
            :'야간 활동 감소 감지 — 가동률 하락 가능성';
          // ④ 센서 신뢰도 — 서버 images.quality 우선, 없으면 ntl.quality 폴백
          const qStatus=(imgs?.quality)||(ntl?.quality?.status)||null;
          const qIcon=qStatus==='good'||qStatus==='GOOD'?'🟢':qStatus==='ok'||qStatus==='PARTIAL'?'🟡':'🔴';
          const qLabel=qStatus==='good'||qStatus==='GOOD'?'신뢰 높음':qStatus==='ok'||qStatus==='PARTIAL'?'관측 보통':'관측 제한';
          // ⑤ stage 아이콘
          const stageIcon=f.stage==='input'?'📥':f.stage==='output'?'📤':'⚙️';
          // ⑥ 약신호 판정 (NTL < 1 nW = 사막/외곽)
          const isLowSignal=afterVal!=null&&afterVal<1;
          return(
          <div key={i} style={{marginBottom:i<2?20:0}}>
            {/* 헤더: 시설명 + stage + desc */}
            <div style={{marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
              <div>
                <span style={{fontSize:15,fontWeight:600,color:LT.text}}>{stageIcon} {f.name}</span>
                <span style={{fontSize:12,color:LT.textDim,marginLeft:6}}>{f.stage||''}</span>
                {/* ④ 신뢰도 */}
                {qStatus&&<span style={{fontSize:11,marginLeft:8}}>{qIcon} {qLabel}</span>}
              </div>
              {f.desc&&<div style={{fontSize:12,color:LT.textDim,textAlign:'right',lineHeight:1.4,maxWidth:'55%'}}>{f.desc}</div>}
            </div>
            {/* 이미지 2컬럼 */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {/* 왼쪽: before */}
              <div style={{background:LT.bg2,borderRadius:8,padding:12,border:`1px solid ${LT.border}`}}>
                <div style={{fontSize:12,color:LT.textDim,marginBottom:4}}>🕰 이전 &nbsp;<span style={{fontSize:11}}>{beforeDate||'—'}</span></div>
                <div style={{borderRadius:6,overflow:"hidden",height:140}}>
                {beforeUrl
                  ?<img src={beforeUrl} alt="before" onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:"100%",height:140,objectFit:"cover",display:"block",filter:"blur(2px)",transform:"scale(1.04)"}}/>
                  :<div style={{background:LT.bg3,height:140,display:"flex",alignItems:"center",justifyContent:"center",color:LT.textDim,fontSize:14}}>🛰️ 이전</div>}
                <div style={{display:"none",background:LT.bg3,height:140,alignItems:"center",justifyContent:"center",color:LT.textDim,fontSize:14}}>🛰️ —</div>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:LT.text,marginTop:6,fontFamily:"monospace"}}>
                  {beforeVal!=null?`${beforeVal.toFixed(1)} ${units}`:ntl?.mean_60d!=null?`${ntl.mean_60d.toFixed(1)} ${units}`:'—'}
                </div>
                {beforeUrl&&<div style={{display:"flex",alignItems:"center",gap:4,marginTop:4}}>
                  <span style={{fontSize:10,color:LT.textDim}}>어두움</span>
                  <div style={{flex:1,height:4,borderRadius:2,background:"linear-gradient(to right,#000000,#1a1a5e,#0066cc,#00ccff,#ffff00,#ffffff)"}}/>
                  <span style={{fontSize:10,color:LT.textDim}}>밝음</span>
                </div>}
              </div>
              {/* 오른쪽: after */}
              <div style={{background:LT.bg2,borderRadius:8,padding:12,border:`1px solid ${LT.border}`}}>
                <div style={{fontSize:12,color:LT.textDim,marginBottom:4}}>📡 최신 &nbsp;<span style={{fontSize:11}}>{afterDate||'—'}</span></div>
                <div style={{borderRadius:6,overflow:"hidden",height:140,border:anomPct!=null&&anomPct<-8?`2px solid ${LT.danger}`:'none'}}>
                {afterUrl
                  ?<img src={afterUrl} alt="after" onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:"100%",height:140,objectFit:"cover",display:"block",filter:"blur(2px)",transform:"scale(1.04)"}}/>
                  :<div style={{background:LT.bg3,height:140,display:"flex",alignItems:"center",justifyContent:"center",color:LT.textDim,fontSize:14}}>🛰️ 최신</div>}
                <div style={{display:"none",background:LT.bg3,height:140,alignItems:"center",justifyContent:"center",color:LT.textDim,fontSize:14}}>🛰️ —</div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
                  <span style={{fontSize:14,fontWeight:700,color:LT.text,fontFamily:"monospace"}}>{afterVal!=null?`${afterVal.toFixed(1)} ${units}`:'—'}</span>
                  {anomPct!=null&&<span style={{fontSize:14,fontWeight:700,fontFamily:"monospace",color:anomPct>0?LT.good:LT.danger}}>{anomPct>0?'+':''}{typeof anomPct==='number'&&Math.abs(anomPct)<1?anomPct.toFixed(2):anomPct.toFixed(1)}%</span>}
                </div>
                {afterUrl&&<div style={{display:"flex",alignItems:"center",gap:4,marginTop:4}}>
                  <span style={{fontSize:10,color:LT.textDim}}>어두움</span>
                  <div style={{flex:1,height:4,borderRadius:2,background:"linear-gradient(to right,#000000,#1a1a5e,#0066cc,#00ccff,#ffff00,#ffffff)"}}/>
                  <span style={{fontSize:10,color:LT.textDim}}>밝음</span>
                </div>}
              </div>
            </div>
            {/* ③ 한줄 해석 */}
            {flowText&&<div style={{fontSize:12,color:anomPct!=null&&anomPct<-8?LT.danger:anomPct!=null&&anomPct>5?LT.good:LT.textDim,marginTop:6,padding:'4px 8px',background:LT.bg2,borderRadius:4,borderLeft:`3px solid ${anomPct!=null&&anomPct<-8?LT.danger:anomPct!=null&&anomPct>5?LT.good:LT.border}`}}>
              {flowText}
            </div>}
            {/* ⑥ 약신호 안내 */}
            {isLowSignal&&<div style={{fontSize:11,color:LT.textDim,marginTop:4,padding:'3px 8px',background:LT.bg2,borderRadius:4}}>
              ℹ️ 야간조도 기반 분석 적합도 낮음 — 실내 생산 공정 또는 야간 운영 비중이 적은 시설
            </div>}
            {/* 색상 범례 */}
            {(beforeUrl||afterUrl)&&<div style={{fontSize:11,color:LT.textDim,marginTop:5,lineHeight:1.5}}>
              <span style={{background:"#444",padding:"0 3px",borderRadius:2,color:"#ccc"}}>검정</span> 무광(사막·바다) &nbsp;
              <span style={{color:"#0099cc"}}>■</span> 파랑=외곽 &nbsp;
              <span style={{color:"#ffff00"}}>■</span> 노랑=핵심·고가동 &nbsp;
              <span style={{color:"#ffffff"}}>■</span> 흰색=극강 밀집
            </div>}
          </div>
          );
        })}
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

    {/* ═══ TAB 3: 플로우 — 공급망 물리 흐름 ═══ */}
    {tab==='flow'&&<>
      {/* Loading skeleton */}
      {loading&&!liveFlow&&<div style={{padding:40,textAlign:"center"}}>
        <div style={{width:32,height:32,border:`3px solid ${LT.border}`,borderTopColor:LT.text,borderRadius:"50%",margin:"0 auto 12px",animation:"spin 1s linear infinite"}}/>
        <div style={{fontSize:15,color:LT.textDim}}>{L==='ko'?'공급망 데이터 로딩 중...':'Loading supply chain...'}</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>}
      {/* 3-Stage 다이어그램 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text}}>🔄 {L==='ko'?'공급망 물리 흐름':'Supply Chain Physical Flow'}</div>
          <span style={{fontSize:14,padding:"2px 8px",borderRadius:4,background:LT.bg3,color:LT.textDim,fontWeight:600}}>{liveFlow?.archetypeName||ARCHETYPE_LABELS[s.a]?.[L==='ko'?'ko':'en']||s.a}</span>
        </div>

        {/* 3-Stage Cards: INPUT → PROCESS → OUTPUT */}
        {(()=>{
          const flow = liveFlow;
          const stages = flow?.stages || {};
          const stageKeys = ['input','process','output'];
          const stageLabels = {input:'INPUT',process:'PROCESS',output:'OUTPUT'};
          const stageIcons = {input:'📦',process:'🏭',output:'🚢'};

          const statusColor = (st) => st==='ALARM'?LT.danger:st==='WARN'?'#f59e0b':LT.good;
          const statusBg = (st) => st==='ALARM'?`${LT.danger}15`:st==='WARN'?'#f59e0b15':`${LT.good}15`;

          return(<>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr auto 1fr",gap:0,alignItems:"stretch",marginBottom:16}}>
              {stageKeys.map((stg,idx)=>{
                const data = stages[stg] || {};
                const score = data.score!=null ? Math.round(data.score) : '—';
                const status = data.status || 'OK';
                const evidence = data.evidence || [];

                return(<>
                  {/* Stage Card */}
                  <div key={stg} style={{background:statusBg(status),borderRadius:10,padding:14,border:`1px solid ${statusColor(status)}30`,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <span style={{fontSize:13,fontWeight:700,color:statusColor(status)}}>{stageLabels[stg]}</span>
                      <span style={{fontSize:22,fontWeight:900,color:statusColor(status),fontFamily:"monospace"}}>{score}</span>
                    </div>
                    <div style={{fontSize:14,fontWeight:600,color:LT.text,marginBottom:6}}>{stageIcons[stg]} {stg==='input'?(L==='ko'?'입고구간':'Inbound'):stg==='process'?(L==='ko'?'생산구간':'Process'):(L==='ko'?'출하구간':'Outbound')}</div>
                    {/* Evidence 2개 */}
                    {evidence.map((ev,ei)=>(
                      <div key={ei} style={{fontSize:13,color:LT.textMid,marginTop:3,display:"flex",justifyContent:"space-between"}}>
                        <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"60%"}}>{ev.nodeId}</span>
                        <span style={{fontFamily:"monospace",fontWeight:700,color:ev.grade==='ALARM'?LT.danger:ev.grade==='WARN'?'#f59e0b':LT.good,flexShrink:0}}>
                          {ev.sensor}: {ev.value!=null?(ev.value>0?'+':'')+ev.value+(ev.unit==='anomDegC'?'°C':'%'):'—'}
                        </span>
                      </div>
                    ))}
                    {evidence.length===0&&<div style={{fontSize:13,color:LT.textDim}}>—</div>}
                    {data.blocked&&<div style={{fontSize:12,fontWeight:700,color:statusColor(status),marginTop:6}}>⚠ {L==='ko'?'봉쇄':'BLOCKED'}</div>}
                  </div>
                  {/* Arrow connector */}
                  {idx<2&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px",fontSize:18,color:LT.textDim}}>→</div>}
                </>);
              })}
            </div>

            {/* Dual Lock Status Bar */}
            {flow?.dualLock&&(()=>{
              const dl = flow.dualLock;
              const combined = dl.combined || {};
              const stateColors = {BOTH:LT.danger,PHYS_ONLY:'#f59e0b',FIN_ONLY:'#f59e0b',NONE:LT.good};
              const stateLabels = {BOTH:L==='ko'?'이중봉쇄 경보':'DUAL LOCK ALARM',PHYS_ONLY:L==='ko'?'물리적 봉쇄':'PHYSICAL LOCK',FIN_ONLY:L==='ko'?'재무 봉쇄':'FINANCIAL LOCK',NONE:L==='ko'?'정상':'NORMAL'};
              const stateIcons = {BOTH:'🔒🔒',PHYS_ONLY:'🔒',FIN_ONLY:'💰',NONE:'✅'};

              return(<div style={{background:LT.bg2,borderRadius:8,padding:14,border:`1px solid ${LT.border}`,marginBottom:4}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:16}}>{stateIcons[combined.state]||'❓'}</span>
                    <span style={{fontSize:15,fontWeight:700,color:stateColors[combined.state]||LT.text}}>{stateLabels[combined.state]||combined.state}</span>
                  </div>
                  <div style={{display:"flex",gap:12,fontSize:13,color:LT.textDim}}>
                    <span>{L==='ko'?'물리':'Phys'}: <b style={{color:dl.physical?.isDualLocked?LT.danger:LT.good}}>{dl.physical?.isDualLocked?(L==='ko'?'봉쇄':'LOCKED'):'OK'}</b></span>
                    <span>{L==='ko'?'재무':'Fin'}: <b style={{color:dl.financial?.isDualLocked?LT.danger:LT.good}}>{dl.financial?.isDualLocked?(L==='ko'?'봉쇄':'LOCKED'):'OK'}</b></span>
                    {combined.confidence!=null&&<span>{L==='ko'?'신뢰도':'Conf'}: <b>{combined.confidence}%</b></span>}
                  </div>
                </div>
                {combined.reason&&<div style={{fontSize:13,color:LT.textMid,marginTop:6}}>{combined.reason}</div>}
              </div>);
            })()}
          </>);
        })()}
      </div>

      {/* 6문장 스토리 */}
      {liveFlow?.story&&liveFlow.story.lines&&(()=>{
        const st = liveFlow.story;
        const lines = st.lines;
        const lineKeys = ['factor','onset','cause','manifest','result','price'];
        const lineIcons = {factor:'🔍',onset:'📅',cause:'⚙️',manifest:'📡',result:'📊',price:'💰'};
        const isNormal = liveFlow.dualLock?.combined?.state==='NONE';

        return(<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>📖 {L==='ko'?'공급망 스토리':'Supply Chain Story'}</div>
          {lineKeys.map((k,i)=>(
            <div key={k} style={{display:"flex",gap:8,alignItems:"flex-start",padding:"6px 0",borderBottom:i<5?`1px solid ${LT.border}`:'none'}}>
              <span style={{fontSize:14,flexShrink:0,width:20,textAlign:"center"}}>{lineIcons[k]}</span>
              <span style={{fontSize:14,color:k==='price'&&!isNormal?LT.danger:k==='result'&&!isNormal?'#f59e0b':LT.textMid,fontWeight:k==='price'||k==='result'?700:400,lineHeight:1.6}}>
                {lines[k]}
              </span>
            </div>
          ))}
          {/* 가격 임팩트 요약 */}
          {st.impactRangePct&&st.impactRangePct[0]!==0&&(
            <div style={{marginTop:12,padding:12,background:LT.bg2,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:LT.danger,fontFamily:"monospace"}}>{st.impactRangePct[0]}% ~ {st.impactRangePct[1]}%</div>
                <div style={{fontSize:13,color:LT.textDim}}>{L==='ko'?'가격 압력 범위':'Price pressure range'}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:15,fontWeight:700,color:LT.text,fontFamily:"monospace"}}>{st.leadTimeDays?st.leadTimeDays[0]+'~'+st.leadTimeDays[1]+'d':'-'}</div>
                <div style={{fontSize:13,color:LT.textDim}}>{L==='ko'?'리드타임':'Lead time'}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:15,fontWeight:700,color:LT.text,fontFamily:"monospace"}}>{st.confidence||'-'}%</div>
                <div style={{fontSize:13,color:LT.textDim}}>{L==='ko'?'신뢰도':'Confidence'}</div>
              </div>
            </div>
          )}
        </div>);
      })()}
    </>}

    {/* ═══ TAB 4: 시그널 ═══ */}
    {tab==='signal'&&<>
      {/* 4 Flags — API 실데이터 우선, 없으면 로컬 추정 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text}}>🚩 {t('svFlagTitle',L)}</div>
          {liveSignals&&<span style={{fontSize:13,padding:"2px 8px",borderRadius:4,fontWeight:600,
            background:liveSignals.riskLevel==='HIGH'?LT.danger:liveSignals.riskLevel==='MEDIUM'?'#f59e0b':LT.good,
            color:'#fff'}}>{liveSignals.riskLevel}</span>}
        </div>
        {(liveSignals?.flags||[
          {id:'CROSS_SIGNAL',name:t('svFlagCross',L),active:warnCnt>0,desc:t('svFlagCrossDesc',L)},
          {id:'DUAL_LOCK',name:t('svFlagDual',L),active:warnCnt>=2,desc:t('svFlagDualDesc',L)},
          {id:'DELTA_DIVERGENCE',name:t('svFlagDelta',L),active:delta.state!=='ALIGNED',desc:t('svFlagDeltaDesc',L)},
          {id:'TREND_REVERSAL',name:t('svFlagTrend',L),active:false,desc:t('svFlagTrendDesc',L)},
        ]).map((fl,i,arr)=>(
          <div key={fl.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${LT.border}`:"none"}}>
            <span style={{width:8,height:8,borderRadius:4,marginTop:6,flexShrink:0,background:fl.active?LT.danger:LT.good}}/>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:fl.active?LT.danger:LT.text}}>{fl.name}</div>
              <div style={{fontSize:15,color:LT.textDim,marginTop:2}}>{fl.desc}</div>
            </div>
          </div>
        ))}
      </div>
      {/* contextNote — 글로벌 환경 맥락 */}
      {(liveSignals?.contextNote||liveHealth?.contextNote)&&(
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`,marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:700,color:LT.text,marginBottom:6}}>🌐 {L==='ko'?'글로벌 환경 맥락':'Global Context'}</div>
          <div style={{fontSize:14,color:LT.textMid,lineHeight:1.6}}>{liveSignals?.contextNote||liveHealth?.contextNote}</div>
        </div>
      )}
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
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text}}>💹 {t('svMarketTitle',L)}</div>
          <div style={{display:"flex",gap:4}}>
            {['1mo','3mo','6mo','1y'].map(r=>(
              <button key={r} onClick={()=>setChartRange(r)} style={{
                padding:"3px 8px",borderRadius:4,fontSize:12,cursor:"pointer",
                border:`1px solid ${chartRange===r?LT.primary:LT.border}`,
                background:chartRange===r?LT.primary:'transparent',
                color:chartRange===r?'#fff':LT.textDim,fontWeight:chartRange===r?700:400,
              }}>{r.toUpperCase()}</button>
            ))}
          </div>
        </div>
        {/* Price chart (SVG line) */}
        {(()=>{
          const candles = liveChart?.candles || [];
          if(candles.length<2) return (
            <div style={{background:LT.bg2,borderRadius:8,height:180,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${LT.border}`,marginBottom:12}}>
              <span style={{fontSize:15,color:LT.textDim}}>{candles.length===0?t('svChartPlaceholder',L):'Loading...'}</span>
            </div>
          );
          const W=360,H=160,PX=40,PY=16;
          const closes=candles.map(c=>c.c);
          const hi=Math.max(...closes),lo=Math.min(...closes);
          const rng=hi-lo||1;
          const toX=i=>PX+(i/(closes.length-1))*(W-PX*2);
          const toY=v=>PY+((hi-v)/rng)*(H-PY*2);
          const pts=closes.map((v,i)=>`${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
          const first=closes[0],last=closes[closes.length-1];
          const lineCol=last>=first?LT.good:LT.danger;
          const fillPts=pts+` ${toX(closes.length-1).toFixed(1)},${(H-PY).toFixed(1)} ${PX.toFixed(1)},${(H-PY).toFixed(1)}`;
          // Y-axis labels
          const yLabels=[lo,lo+rng*0.25,lo+rng*0.5,lo+rng*0.75,hi];
          const cur=liveChart?.currency||'';
          const fmtY=v=>v>=10000?Math.round(v).toLocaleString():v>=100?v.toFixed(0):v.toFixed(2);
          return (
            <div style={{background:LT.bg2,borderRadius:8,padding:"8px 4px",border:`1px solid ${LT.border}`,marginBottom:12,overflow:"hidden"}}>
              <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}}>
                <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lineCol} stopOpacity="0.2"/><stop offset="100%" stopColor={lineCol} stopOpacity="0"/></linearGradient></defs>
                {yLabels.map((v,i)=>(
                  <g key={i}>
                    <line x1={PX} y1={toY(v)} x2={W-PX} y2={toY(v)} stroke={LT.border} strokeWidth="0.5" strokeDasharray="3,3"/>
                    <text x={PX-4} y={toY(v)+3} textAnchor="end" fontSize="8" fill={LT.textDim}>{fmtY(v)}</text>
                  </g>
                ))}
                <polygon points={fillPts} fill="url(#cg)"/>
                <polyline points={pts} fill="none" stroke={lineCol} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx={toX(closes.length-1)} cy={toY(last)} r="3" fill={lineCol}/>
                <text x={W-PX+4} y={toY(last)+3} fontSize="9" fontWeight="700" fill={lineCol}>{fmtY(last)}</text>
              </svg>
            </div>
          );
        })()}
        {/* Key financials from gauge data */}
        {(()=>{
          const gMap={};
          (liveGauges||[]).forEach(g=>{gMap[g.id]=g;});
          const fmtV=(v,suf)=>v!=null?(typeof v==='number'?v.toFixed(1):String(v))+(suf||''):'—';
          const fmtBig=v=>{
            if(v==null)return '—';
            if(Math.abs(v)>=1e12)return (v/1e12).toFixed(2)+'T';
            if(Math.abs(v)>=1e9)return (v/1e9).toFixed(1)+'B';
            if(Math.abs(v)>=1e6)return (v/1e6).toFixed(1)+'M';
            return v.toLocaleString();
          };
          const pe=gMap.SG_V1?.value;
          const pb=gMap.SG_V2?.value;
          const evEbitda=gMap.SG_V3?.value;
          const divYld=gMap.SG_V4?.value;
          const roe=gMap.SG_Q1?.value;
          const debtEq=gMap.SG_Q2?.value;
          const rsi=gMap.SG_M1?.value;
          const w52=gMap.SG_M2?.value;
          const volTr=gMap.SG_M3?.value;
          const revGr=gMap.SG_G1?.value;
          const earnGr=gMap.SG_G2?.value;
          const items=[
            {label:t('svMktPE',L),val:fmtV(pe,'x'),grade:gMap.SG_V1?.grade},
            {label:'PBR',val:fmtV(pb,'x'),grade:gMap.SG_V2?.grade},
            {label:'EV/EBITDA',val:fmtV(evEbitda,'x'),grade:gMap.SG_V3?.grade},
            {label:L==='ko'?'배당률':'Div Yield',val:fmtV(divYld,'%'),grade:gMap.SG_V4?.grade},
            {label:'ROE',val:fmtV(roe,'%'),grade:gMap.SG_Q1?.grade},
            {label:L==='ko'?'부채비율':'D/E',val:fmtV(debtEq,'%'),grade:gMap.SG_Q2?.grade},
            {label:'RSI',val:fmtV(rsi),grade:gMap.SG_M1?.grade},
            {label:t('svMkt52',L),val:fmtV(w52,'%'),grade:gMap.SG_M2?.grade},
            {label:L==='ko'?'거래량추세':'Vol Trend',val:fmtV(volTr,'%'),grade:gMap.SG_M3?.grade},
            {label:L==='ko'?'매출성장':'Rev Growth',val:fmtV(revGr,'%'),grade:gMap.SG_G1?.grade},
            {label:L==='ko'?'이익성장':'Earn Growth',val:fmtV(earnGr,'%'),grade:gMap.SG_G2?.grade},
          ];
          const gradeCol=g=>g==='good'?LT.good:g==='alert'?LT.danger:LT.text;
          return (
            <div className="grid-2" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
              {items.map((m,i)=>(
                <div key={i} style={{background:LT.bg2,borderRadius:6,padding:"10px 12px",border:`1px solid ${LT.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:13,color:LT.textDim}}>{m.label}</div>
                  <div style={{fontSize:15,fontWeight:700,color:gradeCol(m.grade),fontFamily:"monospace"}}>{m.val}</div>
                </div>
              ))}
            </div>
          );
        })()}
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
