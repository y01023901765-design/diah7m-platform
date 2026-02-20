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
// VIIRS 발행 지연 약 90일 → 실제 최신 발행월 = 현재 -3개월
const _SAT_LATEST = _satYM(-3);   // 예: 2025-11
const _SAT_PREV1  = _satYM(-4);   // 직전월: 2025-10
const _SAT_PREV12 = _satYM(-15);  // 전년동월: 2024-11
const _SAT_PREV3Y = _satYM(-39);  // 3년 전 동월: 2022-11
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
  const [satMode,setSatMode]=useState('now'); // 'now'=지금경보(NO₂+Thermal) | 'trend'=구조추세(VIIRS)
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

      {/* ① 결론 + 점수 통합 카드 (가장 먼저) */}
      {stockEntity&&(()=>{
        const sc=liveHealth?.score??null;
        const sev=liveHealth?.severity??null;
        const scColor=sc==null?LT.textDim:sc>=70?LT.good:sc>=40?LT.warn:LT.danger;
        const scLabel=sc==null?'—':sc>=70?(L==='ko'?'양호':'Good'):sc>=40?(L==='ko'?'주의':'Caution'):(L==='ko'?'경보':'Alert');
        const axSummary=Object.entries(stockEntity.sysData).map(([id,sys])=>({id,label:sys.name?.[L]||sys.name?.ko||id,sc:sys.sc,g:sys.g,hasAlert:sys.hasAlert}));
        const alertAxes=axSummary.filter(a=>a.hasAlert);
        return(
          <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`2px solid ${scColor}44`,marginBottom:12}}>
            {/* 점수 + 레이더 나란히 */}
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,marginBottom:14,flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:160}}>
                <div style={{fontSize:14,fontWeight:700,color:LT.textDim,letterSpacing:'0.06em',marginBottom:6,textTransform:'uppercase'}}>{L==='ko'?'종합 건강도':'Overall Health'}</div>
                <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:8}}>
                  <span style={{fontSize:52,fontWeight:900,color:scColor,fontFamily:'monospace',lineHeight:1}}>{sc??'—'}</span>
                  <span style={{fontSize:18,fontWeight:700,color:scColor}}>{scLabel}</span>
                </div>
                {sev!=null&&<div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:14,color:LT.textDim}}>{L==='ko'?'리스크':'Risk'}</span>
                  <div style={{width:80,height:5,background:LT.bg3,borderRadius:3,overflow:'hidden'}}>
                    <div style={{width:`${(sev/5)*100}%`,height:'100%',borderRadius:3,background:sev>=3.5?LT.danger:sev>=2?LT.warn:LT.good}}/>
                  </div>
                  <span style={{fontSize:14,fontWeight:700,color:sev>=3.5?LT.danger:sev>=2?LT.warn:LT.good}}>{sev.toFixed(1)}/5</span>
                </div>}
                {alertAxes.length>0&&<div style={{marginTop:10,padding:'6px 10px',background:'#fff0f0',borderRadius:6,border:`1px solid ${LT.danger}33`}}>
                  <span style={{fontSize:14,fontWeight:700,color:LT.danger}}>⚠ {L==='ko'?'경보':'Alert'}: </span>
                  <span style={{fontSize:14,color:LT.danger}}>{alertAxes.map(a=>a.label).join(' · ')}</span>
                </div>}
                {!alertAxes.length&&sc>=70&&<div style={{marginTop:10,padding:'6px 10px',background:'#f0fdf4',borderRadius:6,border:`1px solid ${LT.good}33`}}>
                  <span style={{fontSize:14,color:LT.good}}>{L==='ko'?'✓ 모든 축 정상 범위':'✓ All axes within normal range'}</span>
                </div>}
              </div>
              <RadarChart lang={L} sysData={stockEntity.sysData}/>
            </div>
            {/* 축별 점수 한눈에 */}
            <div style={{display:'flex',gap:6,flexWrap:'wrap',paddingTop:12,borderTop:`1px solid ${LT.border}`}}>
              {axSummary.map(a=>(
                <div key={a.id} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,
                  background:a.hasAlert?`${LT.danger}12`:a.g==='양호'?`${LT.good}12`:`${LT.warn}12`,
                  border:`1px solid ${a.hasAlert?`${LT.danger}44`:a.g==='양호'?`${LT.good}44`:`${LT.warn}44`}`}}>
                  <span style={{fontSize:14,fontWeight:800,color:a.hasAlert?LT.danger:a.g==='양호'?LT.good:LT.warn,fontFamily:'monospace'}}>{a.sc}</span>
                  <span style={{fontSize:14,color:LT.textDim}}>{a.label}</span>
                </div>
              ))}
            </div>
            {liveHealth?.contextNote&&<div style={{fontSize:14,color:LT.textMid,marginTop:10,padding:'8px 12px',background:LT.bg2,borderRadius:6,borderLeft:`3px solid ${LT.border}`,lineHeight:1.6}}>{liveHealth.contextNote}</div>}
          </div>
        );
      })()}

      {/* ② 시설 현황 (간결) */}
      {facs.length>0&&<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <div style={{fontSize:15,fontWeight:700,color:LT.text}}>{t('svFacTitle',L)}</div>
          <div style={{display:'flex',gap:10,fontSize:14}}>
            {normalCnt>0&&<span style={{color:LT.good,fontWeight:700}}>● {normalCnt} {L==='ko'?'정상':'Normal'}</span>}
            {warnCnt>0&&<span style={{color:LT.danger,fontWeight:700}}>● {warnCnt} {L==='ko'?'이상':'Alert'}</span>}
          </div>
        </div>
        <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          <div style={{display:'flex',padding:'5px 0',fontSize:14,color:LT.textDim,fontWeight:600,borderBottom:`1px solid ${LT.border}`,minWidth:400}}>
            <span style={{flex:1}}>{t('svFacName',L)}</span>
            <span style={{width:54,textAlign:'right'}}>VIIRS</span>
            <span style={{width:54,textAlign:'right'}}>NO₂</span>
            <span style={{width:54,textAlign:'right'}}>{t('svTherm',L)}</span>
            <span style={{width:60,textAlign:'right'}}>{t('svStatus',L)}</span>
          </div>
          {facs.map((f,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',padding:'8px 0',borderBottom:i<facs.length-1?`1px solid ${LT.border}`:'none'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:600,color:LT.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</div>
                <div style={{fontSize:14,color:LT.textDim}}>{f.loc}</div>
              </div>
              {[f.viirs,f.no2,f.therm].map((v,j)=>{const c=chgCell(v);return(
                <span key={j} style={{width:54,textAlign:'right',fontSize:14,fontFamily:'monospace',fontWeight:700,color:c.col}}>{c.txt}</span>
              );})}
              <span style={{width:60,textAlign:'right'}}>
                <span style={{fontSize:14,padding:'2px 5px',borderRadius:4,fontWeight:600,
                  background:f.status==='normal'?`${LT.good}15`:f.status==='warning'?`${LT.danger}15`:LT.bg3,
                  color:f.status==='normal'?LT.good:f.status==='warning'?LT.danger:LT.textDim}}>
                  {t('svStat_'+f.status,L)}
                </span>
              </span>
            </div>
          ))}
          {facs.length===0&&<div style={{padding:20,textAlign:'center',color:LT.textDim,fontSize:15}}>{t('svNoData',L)}</div>}
        </div>
      </div>}

      {/* ③ 5축 상세 게이지 */}
      {stockEntity&&<div style={{marginBottom:12}}>
        <div style={{fontSize:14,color:LT.textDim,marginBottom:8,padding:'0 2px'}}>{L==='ko'?'▼ 축별 상세 지표 (클릭하여 확장)':'▼ Axis detail — click to expand'}</div>
        {Object.entries(stockEntity.sysData).map(([axId,sys])=>(
          <SystemSection key={axId} sysKey={axId} sys={sys} expanded={expanded} toggle={toggleGauge} lang={L} gaugeData={stockEntity.gaugeData} isGlobal={false}/>
        ))}
      </div>}
    </>}

    {/* ═══ TAB 2: 공급망 조기경보 ═══ */}
    {tab==='sat'&&<>

      {/* ── ① 종합 경보 상태 카드 (결론 먼저) ── */}
      {(()=>{
        const allFacs = liveSatImg&&liveSatImg.length>0 ? liveSatImg : facs;
        const worstNo2  = allFacs.reduce((m,f)=>{ const v=f.no2?.anomPct??f.no2?.anomaly??null; return(v!=null&&v<m)?v:m; },0);
        const worstTherm= allFacs.reduce((m,f)=>{ const v=f.thermal?.anomaly_degC??f.thermal?.anomaly??f.therm??null; return(v!=null&&v<m)?v:m; },0);
        const worstViirs= allFacs.reduce((m,f)=>{ const v=f.ntl?.anomPct??f.ntl?.anomaly??f.viirs??null; return(v!=null&&v<m)?v:m; },0);
        const alarmNow   = worstNo2<-15 || (worstNo2<-8 && worstTherm<-2);
        const warnNow    = !alarmNow && (worstNo2<-8 || worstTherm<-2);
        const trendWarn  = !alarmNow && !warnNow && worstViirs<-10;
        const state = alarmNow?'ALARM':warnNow?'WARN':trendWarn?'TREND':'OK';
        const stateColor = state==='ALARM'?LT.danger:state==='WARN'?LT.warn:state==='TREND'?'#6366f1':LT.good;
        const stateBg    = state==='ALARM'?'#fff0f0':state==='WARN'?'#fffbeb':state==='TREND'?'#f5f3ff':'#f0fdf4';
        const stateLabel = state==='ALARM'?'공급망 급성 경보':state==='WARN'?'공급망 변화 감지':state==='TREND'?'구조 추세 경고':'공급망 정상';
        const stateDesc  = state==='ALARM'?'NO₂ 급락 — 단기(1~2주) 대응 검토'
          :state==='WARN'?'생산 신호 이상 — 중기(2~4주) 모니터링'
          :state==='TREND'?'야간광 구조 하락 — 장기(3~6개월) 관찰'
          :'물리 신호 정상 범위';
        // 3개 센서 요약
        const sensors3=[
          worstNo2!==0&&{label:'NO₂',fresh:'D-5',val:worstNo2,isDeg:false,alarm:worstNo2<-15,warn:worstNo2<-8},
          worstTherm!==0&&{label:'Thermal',fresh:'D-16',val:worstTherm,isDeg:true,alarm:worstTherm<-3,warn:worstTherm<-1},
          worstViirs!==0&&{label:'VIIRS',fresh:'D-90',val:worstViirs,isDeg:false,alarm:worstViirs<-15,warn:worstViirs<-8},
        ].filter(Boolean);
        return(
          <div style={{background:stateBg,borderRadius:LT.cardRadius,padding:'16px 18px',border:`2px solid ${stateColor}44`,marginBottom:12}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:stateColor,letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:4}}>공급망 조기경보</div>
                <div style={{fontSize:20,fontWeight:900,color:stateColor,marginBottom:2}}>{stateLabel}</div>
                <div style={{fontSize:14,color:stateColor,opacity:0.8}}>{stateDesc}</div>
              </div>
              {/* 3개 센서 수치 요약 */}
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {sensors3.map((c,ci)=>(
                  <div key={ci} style={{textAlign:'center',padding:'8px 12px',background:'rgba(255,255,255,0.8)',borderRadius:8,border:`1px solid ${c.alarm?LT.danger:c.warn?LT.warn:LT.border}`,minWidth:80}}>
                    <div style={{fontSize:14,color:LT.textDim,fontWeight:600,marginBottom:2}}>{c.label} <span style={{fontWeight:700,color:c.fresh==='D-5'?LT.good:c.fresh==='D-16'?LT.warn:'#6366f1'}}>{c.fresh}</span></div>
                    <div style={{fontSize:18,fontWeight:900,fontFamily:'monospace',color:c.alarm?LT.danger:c.warn?LT.warn:LT.good}}>{c.val>0?'+':''}{c.isDeg?c.val.toFixed(1)+'°C':c.val.toFixed(1)+'%'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── ② 시간축 스위치 + 신선도 (간결) ── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:8,padding:'8px 0'}}>
        {/* 스위치 2버튼 */}
        <div style={{display:'flex',gap:0,borderRadius:8,overflow:'hidden',border:`1px solid ${LT.border}`}}>
          <button onClick={()=>setSatMode('now')} style={{padding:'8px 18px',fontSize:14,fontWeight:satMode==='now'?800:500,background:satMode==='now'?'#111':'#fff',color:satMode==='now'?'#fff':LT.textDim,border:'none',cursor:'pointer',borderRight:`1px solid ${LT.border}`}}>
            지금 경보
          </button>
          <button onClick={()=>setSatMode('trend')} style={{padding:'8px 18px',fontSize:14,fontWeight:satMode==='trend'?800:500,background:satMode==='trend'?'#111':'#fff',color:satMode==='trend'?'#fff':LT.textDim,border:'none',cursor:'pointer'}}>
            구조 추세
          </button>
        </div>
        {/* 신선도 배지 — 현재 모드에 맞는 것만 강조 */}
        <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
          {satMode==='now'
            ?<><span style={{fontSize:14,padding:'2px 8px',borderRadius:20,background:'#f0fdf4',border:`1px solid ${LT.good}`,color:LT.good,fontWeight:700}}>NO₂ D-5</span>
              <span style={{fontSize:14,padding:'2px 8px',borderRadius:20,background:'#fffbeb',border:`1px solid ${LT.warn}`,color:LT.warn,fontWeight:700}}>Thermal D-16</span></>
            :<span style={{fontSize:14,padding:'2px 8px',borderRadius:20,background:'#eff6ff',border:'1px solid #6366f1',color:'#6366f1',fontWeight:700}}>VIIRS D-90</span>}
        </div>
      </div>

      {/* ── ③ 시설별 Before/After + 센서 상세 ── */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontSize:17,fontWeight:800,color:LT.text}}>시설별 위성 관측</div>
          {/* 프리셋 버튼 */}
          {(()=>{
            const activePreset=_SAT_PRESETS.find(p=>p.after===satAfterYM&&p.before===satBeforeYM);
            return(
              <div style={{display:"flex",gap:4}}>
                {_SAT_PRESETS.map(p=>(
                  <button key={p.id} onClick={()=>{setSatAfterYM(p.after);setSatBeforeYM(p.before);}}
                    style={{padding:'4px 10px',fontSize:14,fontWeight:activePreset?.id===p.id?700:400,borderRadius:6,
                      border:`1px solid ${activePreset?.id===p.id?LT.text:LT.border}`,
                      background:activePreset?.id===p.id?LT.text:'transparent',
                      color:activePreset?.id===p.id?LT.surface:LT.textDim,cursor:'pointer'}}>{p.label}</button>
                ))}
              </div>
            );
          })()}
        </div>
        {/* 연월 드롭다운 */}
        {(satAfterYM||satBeforeYM)&&(()=>{
          const selStyle={padding:'4px 8px',fontSize:14,borderRadius:6,border:`1px solid ${LT.border}`,background:LT.bg2,color:LT.text,cursor:'pointer',outline:'none'};
          const years=[];for(let y=new Date().getFullYear();y>=2012;y--)years.push(y);
          const months=[1,2,3,4,5,6,7,8,9,10,11,12];
          const [aY,aM]=satAfterYM?satAfterYM.split('-').map(Number):[null,null];
          const [bY,bM]=satBeforeYM?satBeforeYM.split('-').map(Number):[null,null];
          return(
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
              <span style={{fontSize:14,color:LT.textDim}}>비교기준</span>
              <select value={bY} onChange={e=>setSatBeforeYM(`${e.target.value}-${String(bM||1).padStart(2,'0')}`)} style={selStyle}>{years.map(y=><option key={y} value={y}>{y}년</option>)}</select>
              <select value={bM} onChange={e=>setSatBeforeYM(`${bY||new Date().getFullYear()-1}-${String(e.target.value).padStart(2,'0')}`)} style={selStyle}>{months.map(m=><option key={m} value={m}>{m}월</option>)}</select>
              <span style={{fontSize:14,color:LT.textDim}}>→ 최신</span>
              <select value={aY} onChange={e=>setSatAfterYM(`${e.target.value}-${String(aM||1).padStart(2,'0')}`)} style={selStyle}>{years.map(y=><option key={y} value={y}>{y}년</option>)}</select>
              <select value={aM} onChange={e=>setSatAfterYM(`${aY||new Date().getFullYear()}-${String(e.target.value).padStart(2,'0')}`)} style={selStyle}>{months.map(m=><option key={m} value={m}>{m}월</option>)}</select>
            </div>
          );
        })()}
        <div style={{fontSize:14,color:LT.textDim,marginBottom:12,padding:'6px 10px',background:LT.bg2,borderRadius:6,display:'inline-block'}}>
          {!satAfterYM&&!satBeforeYM?'자동 — 최근 6개월 vs 1년 전 슬라이딩 비교':`${satBeforeYM} → ${satAfterYM}`}
          &nbsp;·&nbsp; 계절 영향 제거: <strong>전년 동월 비교</strong> 권장
        </div>
        {satImgLoading&&<div style={{textAlign:"center",padding:"32px 0",color:LT.textDim,fontSize:15}}>위성 이미지 수집 중… (최대 30초)</div>}
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
            :anomPct>5?'가동 흐름 안정 — 1년 평균 대비 활동 증가'
            :anomPct>-5?'가동 흐름 안정 — 1년 평균과 유사 수준'
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
          // ── 센서 실수치 ──
          const no2Data   = satFac?.no2    || null;
          const thermData = satFac?.thermal|| null;
          const no2Pct    = no2Data?.anomPct  ?? no2Data?.anomaly  ?? null;
          const thermDeg  = thermData?.anomaly_degC ?? thermData?.anomaly ?? null;

          // ② 변화 민감도 구간 판정 + 툴팁
          const _band = (v, isDeg) => {
            if(v==null) return null;
            const a=Math.abs(v);
            const t1=isDeg?1:3, t2=isDeg?3:10;
            if(a<=t1) return {
              label:'정상 변동', color:LT.textDim, bg:'#f8f8f8',
              tip: isDeg ? '지표온도는 계절·구름 영향으로 ±1°C 내 변동이 일반적' : '야간조도는 기상·스케줄 영향으로 ±3% 내 변동이 일반적',
            };
            if(a<=t2) return {
              label:'변화 신호', color:LT.warn, bg:'#fffbeb',
              tip: isDeg ? '±1~3°C 변화는 공정 부하 변화 또는 계절 외 요인 가능성' : '±3~10% 변화는 가동 스케줄 또는 생산량 조정 신호',
            };
            return {
              label:'구조 변화 가능', color:LT.danger, bg:'#fff0f0',
              tip: isDeg ? '±3°C 초과는 공정 구조적 변화 또는 설비 교체 수준' : '±10% 초과는 생산 구조 변화 또는 대규모 운영 전환 수준',
            };
          };
          const ntlBand  = _band(anomPct, false);
          const no2Band  = _band(no2Pct,  false);
          const thermBand= _band(thermDeg, true);

          // ① 센서 방향 일치 판정
          const _dir = v => v==null?0 : v>3?1 : v<-3?-1 : 0;
          const dirs = [_dir(anomPct), _dir(no2Pct), _dir(thermDeg)].filter((_,idx)=>{
            const ss=f.sensors||['NTL'];
            return (idx===0&&ss.includes('NTL'))||(idx===1&&ss.includes('NO2'))||(idx===2&&ss.includes('THERMAL'));
          });
          const activeDirs = dirs.filter(d=>d!==0);
          const allSame    = activeDirs.length>1 && activeDirs.every(d=>d===activeDirs[0]);
          const allOpposite= activeDirs.length>1 && !allSame && activeDirs.some(d=>d!==activeDirs[0]);
          // ① 혼합 신호 시 구체적 방향 해석 추가
          const _mixedDetail = () => {
            const ntlD=_dir(anomPct), no2D=_dir(no2Pct), thermD=_dir(thermDeg);
            if(ntlD<0 && (no2D>0||thermD>0)) return '야간광↓+열·배기↑ → 운영 패턴 전환 신호';
            if(ntlD>0 && (no2D<0||thermD<0)) return '야간광↑+열·배기↓ → 에너지효율 개선 신호';
            if(no2D>0 && thermD<0) return 'NO₂↑+온도↓ → 연료 전환 또는 냉각 공정 가능';
            return '센서별 방향 상이 — 복합 요인 분석 필요';
          };
          const alignIcon = activeDirs.length===0 ? null
            : allSame && activeDirs[0]>0  ? {icon:'🟢', label:'센서 방향 일치 — 가동 상승', detail:null}
            : allSame && activeDirs[0]<0  ? {icon:'🔴', label:'센서 방향 일치 — 가동 하락', detail:null}
            : allOpposite                 ? {icon:'🟡', label:'혼합 신호', detail:_mixedDetail(), mixed:true}
            : null;

          // ③ 운영 패턴 태그
          const _patternTag = () => {
            const ntlD=_dir(anomPct), no2D=_dir(no2Pct), thermD=_dir(thermDeg);
            const has=(a,b)=>a!==0&&b!==0;
            if(has(ntlD,no2D)&&ntlD<0&&no2D>0)
              return {label:'운영 패턴 전환 신호', sub:'야간광↓ + NO₂↑ — 야간→주간 교대 전환 또는 연료 전환 추정. 단순 가동 감소가 아닌 운영 구조 변화 가능', color:LT.warn, bg:'#fffbeb'};
            if(has(ntlD,thermD)&&ntlD<0&&thermD>0)
              return {label:'운영 패턴 전환 신호', sub:'야간광↓ + 지표온도↑ — 공정 변경 또는 고열 설비 교체 추정. 물류 흐름보다 내부 공정 변화 가능성', color:LT.warn, bg:'#fffbeb'};
            if(has(ntlD,no2D)&&ntlD>0&&no2D>0)
              return {label:'생산 확대 신호', sub:'야간광↑ + NO₂↑ — 가동률·연소량 동반 상승. 증산 또는 신규 라인 가동 추정', color:LT.good, bg:'#f0fdf4'};
            if(has(ntlD,no2D)&&ntlD<0&&no2D<0)
              return {label:'생산 축소 신호', sub:'야간광↓ + NO₂↓ — 가동률·연소량 동반 하락. 감산 또는 유지보수 기간 추정', color:LT.danger, bg:'#fff0f0'};
            if(has(ntlD,thermD)&&ntlD>0&&thermD>0)
              return {label:'고부하 운영 신호', sub:'야간광↑ + 지표온도↑ — 고강도 가동. 풀가동 또는 비상 생산 추정', color:LT.warn, bg:'#fffbeb'};
            return null;
          };
          const patternTag = _patternTag();

          // 뱃지 포맷 유틸
          const _fmtPct = v => v==null?null:`${v>0?'+':''}${v.toFixed(1)}%`;
          const _fmtDeg = v => v==null?null:`${v>0?'+':''}${v.toFixed(1)}°C`;
          const _valColor = v => v==null?LT.textDim:v>5?LT.good:v<-5?LT.danger:LT.text;

          // ③ 센서 의미 아이콘
          const SENSOR_BADGE={
            NTL:    {icon:'🌙', desc:'VIIRS · 야간광 (NASA 위성 — 공장·도시 불빛 밝기를 월 단위로 측정)',          val:_fmtPct(anomPct), valColor:_valColor(anomPct), valLabel:'1년 평균 대비 밝기 변화',  band:ntlBand},
            NO2:    {icon:'🚛', desc:'Sentinel-5P · NO₂ (ESA 위성 — 공장 굴뚝·배기의 이산화질소 농도를 일 단위로 측정)', val:_fmtPct(no2Pct),  valColor:_valColor(no2Pct),  valLabel:'최근 8주 대비 NO₂ 변화', band:no2Band},
            THERMAL:{icon:'🔥', desc:'Landsat-9 · 지표온도 (NASA 위성 — 공장 열 방출량을 16일 주기로 측정)',          val:_fmtDeg(thermDeg),valColor:_valColor(thermDeg),valLabel:'전년 동기간 대비 온도 변화', band:thermBand},
            SAR:    {icon:'📡', desc:'Sentinel-1 · SAR (ESA 위성 — 레이더 반사파로 시설 가동 감지, Phase 3 예정)',    val:null, valColor:LT.textDim, valLabel:null, band:null},
          };
          const sensors=f.sensors||['NTL'];
          return(
          <div key={i} style={{marginBottom:i<2?28:0,paddingBottom:i<2?28:0,borderBottom:i<2?`1px solid ${LT.border}`:'none'}}>

            {/* ── ① 시설 헤더 ── */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:18,fontWeight:800,color:LT.text}}>{stageIcon} {f.name}</span>
                <span style={{fontSize:14,padding:'2px 8px',borderRadius:4,background:LT.bg3,color:LT.textMid,fontWeight:600}}>{f.stage?.toUpperCase()||''}</span>
              </div>
              {qStatus&&<span style={{fontSize:14,fontWeight:600,color:qStatus==='good'||qStatus==='GOOD'?LT.good:qStatus==='ok'||qStatus==='PARTIAL'?LT.warn:LT.danger}}>{qIcon} {qLabel}</span>}
            </div>

            {/* ── ② 센서 데이터 3개 (NO₂ → Thermal → 야간광) ── */}
            {(()=>{
              const FRESHNESS = {NTL:{label:'D-90',color:'#2563eb',bg:'#eff6ff'},NO2:{label:'D-5',color:LT.good,bg:'#f0fdf4'},THERMAL:{label:'D-16',color:LT.warn,bg:'#fffbeb'},SAR:{label:'예정',color:LT.textDim,bg:'#f8f8f8'}};
              const allSensors = [...sensors].sort((a,b)=>{ const o={NO2:0,THERMAL:1,NTL:2,SAR:3}; return (o[a]??9)-(o[b]??9); });
              return(
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
              {allSensors.map(sk=>{
                const b=SENSOR_BADGE[sk];
                if(!b) return null;
                const hasData = b.val!=null;
                const fresh = FRESHNESS[sk]||{label:'',color:'#aaa',bg:'#f5f5f5'};
                return(
                  <div key={sk} style={{display:'flex',alignItems:'stretch',gap:0,background:'#fff',border:`1px solid ${LT.border}`,borderRadius:12,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                    <div style={{width:110,minWidth:110,padding:'14px 12px',background:LT.bg2,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,borderRight:`1px solid ${LT.border}`}}>
                      <span style={{fontSize:14,fontWeight:700,color:LT.textMid,textAlign:'center'}}>
                        {sk==='NTL'?'VIIRS':sk==='NO2'?'Sentinel-5P':sk==='THERMAL'?'Landsat-9':sk==='SAR'?'Sentinel-1':sk}
                      </span>
                      <span style={{fontSize:14,fontWeight:700,padding:'2px 7px',borderRadius:10,background:fresh.bg,color:fresh.color,border:`1px solid ${fresh.color}55`}}>{fresh.label}</span>
                    </div>
                    <div style={{width:140,minWidth:140,padding:'14px 16px',display:'flex',flexDirection:'column',justifyContent:'center',borderRight:`1px solid ${LT.border}`}}>
                      {hasData
                        ?<><span style={{fontSize:22,fontWeight:900,color:b.valColor,fontFamily:'monospace',lineHeight:1}}>{b.val}</span>
                          <span style={{fontSize:14,color:LT.textDim,marginTop:4,lineHeight:1.4}}>{b.valLabel}</span></>
                        :<span style={{fontSize:14,color:LT.textDim}}>— 대기</span>}
                    </div>
                    <div style={{flex:1,padding:'14px 16px',display:'flex',flexDirection:'column',justifyContent:'center',gap:6}}>
                      <span style={{fontSize:14,color:LT.textMid,lineHeight:1.5}}>{b.desc}</span>
                      {hasData&&b.band&&<span title={b.band.tip} style={{display:'inline-block',fontSize:14,fontWeight:700,color:b.band.color,background:b.band.bg,padding:'3px 10px',borderRadius:6,alignSelf:'flex-start',cursor:'help',border:`1px solid ${b.band.color}44`}}>
                        {b.band.label}
                      </span>}
                      {!hasData&&<span style={{fontSize:14,color:LT.textDim}}>데이터 수집 대기 중</span>}
                    </div>
                  </div>
                );
              })}
            </div>
              );
            })()}

            {/* ── ③ 종합 설명 ── */}
            {(()=>{
              const sp=[];
              if(no2Pct!=null)  sp.push(`NO₂ ${no2Pct>0?'+':''}${no2Pct.toFixed(1)}%`);
              if(thermDeg!=null) sp.push(`지표온도 ${thermDeg>0?'+':''}${thermDeg.toFixed(1)}°C`);
              if(anomPct!=null)  sp.push(`야간광 ${anomPct>0?'+':''}${anomPct.toFixed(1)}%`);
              if(sp.length===0) return null;
              const facAlarm=(no2Pct!=null&&no2Pct<-15)||(thermDeg!=null&&thermDeg<-3);
              const facWarn=!facAlarm&&((no2Pct!=null&&no2Pct<-8)||(thermDeg!=null&&thermDeg<-1));
              let note='';
              if(facAlarm) note='이상 신호 감지 — 단기 확인 필요';
              else if(facWarn) note='변화 감지 — 모니터링 권장';
              else note='정상 범위 내 운영 중';
              return(
                <div style={{padding:'10px 14px',background:LT.bg2,borderRadius:8,border:`1px solid ${LT.border}`,marginBottom:12}}>
                  <div style={{fontSize:14,color:LT.textMid,lineHeight:1.6}}>
                    {f.name}: {sp.join(' · ')} → <span style={{fontWeight:700,color:facAlarm?LT.danger:facWarn?LT.warn:LT.good}}>{note}</span>
                  </div>
                </div>
              );
            })()}

            {/* ── ④ 위성 이미지 (보여주기식) ── */}
            {(beforeUrl||afterUrl)&&<>
            <div style={{fontSize:14,color:LT.textDim,marginBottom:6,padding:'0 2px'}}>
              야간광(VIIRS) 위성 이미지 — 해당 기간 평균 신호, 실시간 사진 아님
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div style={{background:LT.bg2,borderRadius:8,padding:12,border:`1px solid ${LT.border}`}}>
                <div style={{fontSize:14,fontWeight:600,color:LT.textMid,marginBottom:6}}>이전 &nbsp;<span style={{fontSize:14,fontWeight:400,color:LT.textDim}}>{beforeDate||'—'}</span></div>
                <div style={{borderRadius:6,overflow:"hidden",height:120}}>
                {beforeUrl
                  ?<img src={beforeUrl} alt="before" onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:"100%",height:120,objectFit:"cover",display:"block",filter:"blur(2px)",transform:"scale(1.04)"}}/>
                  :<div style={{background:LT.bg3,height:120,display:"flex",alignItems:"center",justifyContent:"center",color:LT.textDim,fontSize:14}}>🛰️ 이전</div>}
                <div style={{display:"none",background:LT.bg3,height:120,alignItems:"center",justifyContent:"center",color:LT.textDim,fontSize:14}}>🛰️ —</div>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:LT.text,marginTop:6,fontFamily:"monospace"}}>
                  {beforeVal!=null?`${beforeVal.toFixed(1)} ${units}`:ntl?.mean_60d!=null?`${ntl.mean_60d.toFixed(1)} ${units}`:'—'}
                </div>
                {/* 그라디언트 막대 */}
                <div style={{display:'flex',alignItems:'center',gap:4,marginTop:5}}>
                  <span style={{fontSize:14,color:LT.textDim,flexShrink:0}}>어두움</span>
                  <div style={{flex:1,height:8,borderRadius:4,background:'linear-gradient(to right, #000000, #1a3a6b, #c8a020, #ffffff)',border:'1px solid #ccc'}}/>
                  <span style={{fontSize:14,color:LT.textDim,flexShrink:0}}>밝음</span>
                </div>
              </div>
              <div style={{background:LT.bg2,borderRadius:8,padding:12,border:`1px solid ${LT.border}`}}>
                <div style={{fontSize:14,fontWeight:600,color:LT.textMid,marginBottom:6}}>최신 &nbsp;<span style={{fontSize:14,fontWeight:400,color:LT.textDim}}>{afterDate||'—'}</span></div>
                <div style={{borderRadius:6,overflow:"hidden",height:120}}>
                {afterUrl
                  ?<img src={afterUrl} alt="after" onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:"100%",height:120,objectFit:"cover",display:"block",filter:"blur(2px)",transform:"scale(1.04)"}}/>
                  :<div style={{background:LT.bg3,height:120,display:"flex",alignItems:"center",justifyContent:"center",color:LT.textDim,fontSize:14}}>🛰️ 최신</div>}
                <div style={{display:"none",background:LT.bg3,height:120,alignItems:"center",justifyContent:"center",color:LT.textDim,fontSize:14}}>🛰️ —</div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
                  <span style={{fontSize:14,fontWeight:700,color:LT.text,fontFamily:"monospace"}}>{afterVal!=null?`${afterVal.toFixed(1)} ${units}`:'—'}</span>
                  {anomPct!=null&&<span style={{fontSize:15,fontWeight:900,fontFamily:"monospace",color:anomPct>0?LT.good:LT.danger}}>{anomPct>0?'+':''}{typeof anomPct==='number'&&Math.abs(anomPct)<1?anomPct.toFixed(2):anomPct.toFixed(1)}%</span>}
                </div>
                {/* 그라디언트 막대 */}
                <div style={{display:'flex',alignItems:'center',gap:4,marginTop:5}}>
                  <span style={{fontSize:14,color:LT.textDim,flexShrink:0}}>어두움</span>
                  <div style={{flex:1,height:8,borderRadius:4,background:'linear-gradient(to right, #000000, #1a3a6b, #c8a020, #ffffff)',border:'1px solid #ccc'}}/>
                  <span style={{fontSize:14,color:LT.textDim,flexShrink:0}}>밝음</span>
                </div>
              </div>
            </div>
            {/* 색상 범례 — 이전/최신 이미지 공통 */}
            <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',padding:'8px 2px',borderTop:`1px solid ${LT.border}`,marginTop:4}}>
              <span style={{fontSize:14,color:LT.textDim,fontWeight:600,flexShrink:0}}>색상 범례</span>
              {[
                {color:'#000000',label:'무광 (사막·바다)'},
                {color:'#1a3a6b',label:'외곽·저밀도'},
                {color:'#c8a020',label:'핵심·고가동'},
                {color:'#ffffff',border:true,label:'극강 밀집'},
              ].map((item,idx)=>(
                <div key={idx} style={{display:'flex',alignItems:'center',gap:5}}>
                  <span style={{width:12,height:12,borderRadius:2,flexShrink:0,
                    background:item.color,
                    border:item.border?'1px solid #ccc':'none',
                    display:'inline-block'}}/>
                  <span style={{fontSize:14,color:LT.textDim}}>{item.label}</span>
                </div>
              ))}
            </div>
            </>}

          </div>
          );
        })}
      </div>
      {/* Delta 괴리 차트 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text}}>{t('svDeltaTitle',L)}</div>
          <div style={{fontSize:14,color:LT.textDim,marginTop:3}}>최근 6개월 물리 신호 변화와 가격 반응의 동행 여부 — 예측이 아닌 상관 확인</div>
        </div>
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
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text}}>{L==='ko'?'공급망 물리 흐름':'Supply Chain Physical Flow'}</div>
          <span style={{fontSize:14,padding:'2px 8px',borderRadius:4,background:LT.bg3,color:LT.textDim,fontWeight:600}}>{liveFlow?.archetypeName||ARCHETYPE_LABELS[s.a]?.[L==='ko'?'ko':'en']||s.a}</span>
        </div>

        {(()=>{
          const flow = liveFlow;
          const stages = flow?.stages || {};
          const stageKeys = ['input','process','output'];
          const stageIcons = {input:'📦',process:'🏭',output:'🚢'};
          const stageNames = {input:L==='ko'?'입고':'Inbound',process:L==='ko'?'생산':'Process',output:L==='ko'?'출하':'Outbound'};
          const statusColor = (st) => st==='ALARM'?LT.danger:st==='WARN'?'#f59e0b':LT.good;
          const statusBg = (st) => st==='ALARM'?`${LT.danger}12`:st==='WARN'?'#f59e0b12':`${LT.good}12`;

          // ① DualLock 상태 — 가장 먼저
          const dl = flow?.dualLock;
          const dlCombined = dl?.combined || {};
          const dlColors = {BOTH:LT.danger,PHYS_ONLY:'#f59e0b',FIN_ONLY:'#f59e0b',NONE:LT.good};
          const dlLabels = {BOTH:L==='ko'?'이중봉쇄 경보':'DUAL LOCK ALARM',PHYS_ONLY:L==='ko'?'물리적 봉쇄':'PHYSICAL LOCK',FIN_ONLY:L==='ko'?'재무 봉쇄':'FINANCIAL LOCK',NONE:L==='ko'?'공급망 정상':'NORMAL'};
          const dlIcons = {BOTH:'🔒',PHYS_ONLY:'⚠',FIN_ONLY:'💰',NONE:'✅'};
          const dlColor = dlColors[dlCombined.state]||LT.text;

          return(<>
            {/* DualLock 요약 배너 — 결론 우선 */}
            {dl&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:8,
              background:dlCombined.state==='NONE'?'#f0fdf4':dlCombined.state==='BOTH'?'#fff0f0':'#fffbeb',
              border:`1px solid ${dlColor}33`,marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:16}}>{dlIcons[dlCombined.state]||'❓'}</span>
                <span style={{fontSize:15,fontWeight:700,color:dlColor}}>{dlLabels[dlCombined.state]||dlCombined.state}</span>
                {dlCombined.reason&&<span style={{fontSize:14,color:LT.textMid,marginLeft:4}}>— {dlCombined.reason}</span>}
              </div>
              <div style={{display:'flex',gap:10,fontSize:14,color:LT.textDim}}>
                <span>{L==='ko'?'물리':'Phys'} <b style={{color:dl.physical?.isDualLocked?LT.danger:LT.good}}>{dl.physical?.isDualLocked?'LOCK':'OK'}</b></span>
                <span>{L==='ko'?'재무':'Fin'} <b style={{color:dl.financial?.isDualLocked?LT.danger:LT.good}}>{dl.financial?.isDualLocked?'LOCK':'OK'}</b></span>
                {dlCombined.confidence!=null&&<span>{L==='ko'?'신뢰':'Conf'} <b>{dlCombined.confidence}%</b></span>}
              </div>
            </div>}

            {/* ② 3단계 흐름 다이어그램 */}
            <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr auto 1fr',gap:0,alignItems:'stretch'}}>
              {stageKeys.map((stg,idx)=>{
                const data = stages[stg] || {};
                const score = data.score!=null ? Math.round(data.score) : '—';
                const status = data.status || 'OK';
                const evidence = data.evidence || [];
                return(<>
                  <div key={stg} style={{background:statusBg(status),borderRadius:10,padding:12,border:`1px solid ${statusColor(status)}30`,minWidth:0}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                      <span style={{fontSize:14,fontWeight:700,color:LT.text}}>{stageIcons[stg]} {stageNames[stg]}</span>
                      <span style={{fontSize:20,fontWeight:900,color:statusColor(status),fontFamily:'monospace'}}>{score}</span>
                    </div>
                    {evidence.slice(0,2).map((ev,ei)=>(
                      <div key={ei} style={{fontSize:14,color:LT.textMid,marginTop:3,display:'flex',justifyContent:'space-between',gap:4}}>
                        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{ev.nodeId}</span>
                        <span style={{fontFamily:'monospace',fontWeight:700,color:ev.grade==='ALARM'?LT.danger:ev.grade==='WARN'?'#f59e0b':LT.good,flexShrink:0}}>
                          {ev.sensor} {ev.value!=null?(ev.value>0?'+':'')+ev.value+(ev.unit==='anomDegC'?'°C':'%'):'—'}
                        </span>
                      </div>
                    ))}
                    {evidence.length===0&&<div style={{fontSize:14,color:LT.textDim}}>—</div>}
                    {data.blocked&&<div style={{fontSize:14,fontWeight:700,color:statusColor(status),marginTop:4}}>⚠ {L==='ko'?'봉쇄':'BLOCKED'}</div>}
                  </div>
                  {idx<2&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px',fontSize:16,color:LT.textDim}}>→</div>}
                </>);
              })}
            </div>
          </>);
        })()}
      </div>

      {/* ③ 공급망 스토리 — 6문장 서사 */}
      {liveFlow?.story&&liveFlow.story.lines&&(()=>{
        const st = liveFlow.story;
        const lines = st.lines;
        const isNormal = liveFlow.dualLock?.combined?.state==='NONE';
        // 핵심 문장만: result + price 강조, 나머지는 보조
        const lineConfig=[
          {k:'factor',icon:'🔍',label:L==='ko'?'원인':'Factor',primary:false},
          {k:'onset',icon:'📅',label:L==='ko'?'시점':'Onset',primary:false},
          {k:'cause',icon:'⚙️',label:L==='ko'?'기제':'Mechanism',primary:false},
          {k:'manifest',icon:'📡',label:L==='ko'?'신호':'Signal',primary:false},
          {k:'result',icon:'📊',label:L==='ko'?'결과':'Result',primary:true},
          {k:'price',icon:'💰',label:L==='ko'?'가격영향':'Price Impact',primary:true},
        ];

        return(<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:12}}>{L==='ko'?'공급망 스토리':'Supply Chain Story'}</div>
          {lineConfig.map(({k,icon,label,primary},i)=>(
            <div key={k} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'7px 0',
              borderBottom:i<lineConfig.length-1?`1px solid ${LT.border}`:'none',
              background:primary&&!isNormal?'transparent':'transparent'}}>
              <span style={{fontSize:14,flexShrink:0,width:18,textAlign:'center',color:LT.textDim}}>{icon}</span>
              <span style={{fontSize:14,fontWeight:700,color:LT.textDim,flexShrink:0,width:44,paddingTop:2}}>{label}</span>
              <span style={{fontSize:14,color:k==='price'&&!isNormal?LT.danger:k==='result'&&!isNormal?'#f59e0b':LT.textMid,
                fontWeight:primary?700:400,lineHeight:1.6,flex:1}}>
                {lines[k]}
              </span>
            </div>
          ))}
          {/* 가격 임팩트 수치 강조 */}
          {st.impactRangePct&&st.impactRangePct[0]!==0&&(
            <div style={{marginTop:12,padding:'10px 14px',background:LT.bg2,borderRadius:8,display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
              <div>
                <div style={{fontSize:16,fontWeight:900,color:LT.danger,fontFamily:'monospace'}}>{st.impactRangePct[0]}%~{st.impactRangePct[1]}%</div>
                <div style={{fontSize:14,color:LT.textDim}}>{L==='ko'?'가격 압력 범위':'Price pressure'}</div>
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:LT.text,fontFamily:'monospace'}}>{st.leadTimeDays?st.leadTimeDays[0]+'~'+st.leadTimeDays[1]+'d':'-'}</div>
                <div style={{fontSize:14,color:LT.textDim}}>{L==='ko'?'리드타임':'Lead time'}</div>
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:LT.text,fontFamily:'monospace'}}>{st.confidence||'-'}%</div>
                <div style={{fontSize:14,color:LT.textDim}}>{L==='ko'?'신뢰도':'Confidence'}</div>
              </div>
            </div>
          )}
        </div>);
      })()}
    </>}

    {/* ═══ TAB 4: 시그널 ═══ */}
    {tab==='signal'&&<>
      {/* 리스크 레벨 배너 */}
      {liveSignals&&<div style={{padding:'12px 16px',borderRadius:8,marginBottom:12,
        background:liveSignals.riskLevel==='HIGH'?'#fff0f0':liveSignals.riskLevel==='MEDIUM'?'#fffbeb':'#f0fdf4',
        border:`1px solid ${liveSignals.riskLevel==='HIGH'?LT.danger:liveSignals.riskLevel==='MEDIUM'?LT.warn:LT.good}44`}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:16,fontWeight:900,color:liveSignals.riskLevel==='HIGH'?LT.danger:liveSignals.riskLevel==='MEDIUM'?LT.warn:LT.good}}>
            {liveSignals.riskLevel==='HIGH'?(L==='ko'?'고위험':'HIGH RISK'):liveSignals.riskLevel==='MEDIUM'?(L==='ko'?'중위험':'MEDIUM RISK'):(L==='ko'?'저위험':'LOW RISK')}
          </span>
          {liveSignals.contextNote&&<span style={{fontSize:14,color:LT.textMid}}>{liveSignals.contextNote}</span>}
        </div>
      </div>}

      {/* 경보 플래그 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:14}}>{t('svFlagTitle',L)}</div>
        {(liveSignals?.flags||[
          {id:'CROSS_SIGNAL',name:t('svFlagCross',L),active:warnCnt>0,desc:t('svFlagCrossDesc',L)},
          {id:'DUAL_LOCK',name:t('svFlagDual',L),active:warnCnt>=2,desc:t('svFlagDualDesc',L)},
          {id:'DELTA_DIVERGENCE',name:t('svFlagDelta',L),active:delta.state!=='ALIGNED',desc:t('svFlagDeltaDesc',L)},
          {id:'TREND_REVERSAL',name:t('svFlagTrend',L),active:false,desc:t('svFlagTrendDesc',L)},
        ]).map((fl,i,arr)=>(
          <div key={fl.id} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'10px 0',borderBottom:i<arr.length-1?`1px solid ${LT.border}`:'none'}}>
            <span style={{width:10,height:10,borderRadius:5,marginTop:5,flexShrink:0,background:fl.active?LT.danger:LT.good}}/>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:fl.active?LT.danger:LT.text}}>{fl.name}</div>
              <div style={{fontSize:14,color:LT.textDim,marginTop:3,lineHeight:1.5}}>{fl.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 글로벌 맥락 — contextNote가 있을 때만 */}
      {!(liveSignals)&&(liveHealth?.contextNote)&&(
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`,marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:8}}>{L==='ko'?'글로벌 환경 맥락':'Global Context'}</div>
          <div style={{fontSize:14,color:LT.textMid,lineHeight:1.6}}>{liveHealth.contextNote}</div>
        </div>
      )}
    </>}

    {/* ═══ TAB 5: 시장 ═══ */}
    {tab==='market'&&<>
      {/* 주가 차트 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text}}>{t('svMarketTitle',L)}</div>
          <div style={{display:'flex',gap:4}}>
            {['1mo','3mo','6mo','1y'].map(r=>(
              <button key={r} onClick={()=>setChartRange(r)} style={{
                padding:'4px 10px',borderRadius:4,fontSize:14,cursor:'pointer',
                border:`1px solid ${chartRange===r?'#111':LT.border}`,
                background:chartRange===r?'#111':'transparent',
                color:chartRange===r?'#fff':LT.textDim,fontWeight:chartRange===r?700:400,
              }}>{r.toUpperCase()}</button>
            ))}
          </div>
        </div>
        {(()=>{
          const candles = liveChart?.candles || [];
          if(candles.length<2) return (
            <div style={{background:LT.bg2,borderRadius:8,height:200,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${LT.border}`,marginBottom:12}}>
              <span style={{fontSize:15,color:LT.textDim}}>{candles.length===0?t('svChartPlaceholder',L):'Loading...'}</span>
            </div>
          );
          const W=360,H=180,PX=44,PY=16;
          const closes=candles.map(c=>c.c);
          const hi=Math.max(...closes),lo=Math.min(...closes);
          const rng=hi-lo||1;
          const toX=i=>PX+(i/(closes.length-1))*(W-PX*2);
          const toY=v=>PY+((hi-v)/rng)*(H-PY*2);
          const pts=closes.map((v,i)=>`${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
          const first=closes[0],last=closes[closes.length-1];
          const pctChg=((last-first)/first*100).toFixed(1);
          const lineCol=last>=first?LT.good:LT.danger;
          const fillPts=pts+` ${toX(closes.length-1).toFixed(1)},${(H-PY).toFixed(1)} ${PX.toFixed(1)},${(H-PY).toFixed(1)}`;
          const yLabels=[lo,lo+rng*0.5,hi];
          const fmtY=v=>v>=10000?Math.round(v).toLocaleString():v>=100?v.toFixed(0):v.toFixed(2);
          return (
            <div>
              <div style={{display:'flex',gap:16,marginBottom:8,alignItems:'baseline'}}>
                <span style={{fontSize:22,fontWeight:900,color:LT.text,fontFamily:'monospace'}}>{fmtY(last)}</span>
                <span style={{fontSize:16,fontWeight:700,color:lineCol,fontFamily:'monospace'}}>{last>=first?'+':''}{pctChg}%</span>
                <span style={{fontSize:14,color:LT.textDim}}>{chartRange.toUpperCase()} {L==='ko'?'기간 수익률':'return'}</span>
              </div>
              <div style={{background:LT.bg2,borderRadius:8,padding:'8px 4px',border:`1px solid ${LT.border}`,overflow:'hidden'}}>
                <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:'auto',display:'block'}}>
                  <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lineCol} stopOpacity="0.18"/><stop offset="100%" stopColor={lineCol} stopOpacity="0"/></linearGradient></defs>
                  {yLabels.map((v,i)=>(
                    <g key={i}>
                      <line x1={PX} y1={toY(v)} x2={W-PX} y2={toY(v)} stroke={LT.border} strokeWidth="0.5" strokeDasharray="3,3"/>
                      <text x={PX-4} y={toY(v)+4} textAnchor="end" fontSize="11" fill={LT.textDim}>{fmtY(v)}</text>
                    </g>
                  ))}
                  <polygon points={fillPts} fill="url(#cg)"/>
                  <polyline points={pts} fill="none" stroke={lineCol} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx={toX(closes.length-1)} cy={toY(last)} r="4" fill={lineCol}/>
                </svg>
              </div>
            </div>
          );
        })()}
      </div>

      {/* 핵심 밸류에이션 지표 */}
      {(()=>{
        const gMap={};
        (liveGauges||[]).forEach(g=>{gMap[g.id]=g;});
        const fmtV=(v,suf)=>v!=null?(typeof v==='number'?v.toFixed(1):String(v))+(suf||''):'—';
        const gradeCol=g=>g==='good'?LT.good:g==='alert'?LT.danger:LT.text;

        // 핵심 6개 (가치+수익성+모멘텀)
        const primary=[
          {label:t('svMktPE',L),val:fmtV(gMap.SG_V1?.value,'x'),grade:gMap.SG_V1?.grade,tip:L==='ko'?'주가수익비율 — 낮을수록 저평가':'Lower = cheaper valuation'},
          {label:'PBR',val:fmtV(gMap.SG_V2?.value,'x'),grade:gMap.SG_V2?.grade,tip:L==='ko'?'주가순자산비율 — 1배 이하 자산 대비 저평가':'Price-to-book ratio'},
          {label:'ROE',val:fmtV(gMap.SG_Q1?.value,'%'),grade:gMap.SG_Q1?.grade,tip:L==='ko'?'자기자본이익률 — 높을수록 자본 효율적':'Return on equity'},
          {label:L==='ko'?'매출성장':'Rev Growth',val:fmtV(gMap.SG_G1?.value,'%'),grade:gMap.SG_G1?.grade,tip:L==='ko'?'전년 대비 매출 증가율':'YoY revenue growth'},
          {label:'RSI',val:fmtV(gMap.SG_M1?.value),grade:gMap.SG_M1?.grade,tip:L==='ko'?'14일 RSI — 70 이상 과매수, 30 이하 과매도':'RSI 14d — >70 overbought, <30 oversold'},
          {label:t('svMkt52',L),val:fmtV(gMap.SG_M2?.value,'%'),grade:gMap.SG_M2?.grade,tip:L==='ko'?'52주 최고가 대비 현재가 위치':'Position vs 52-week high'},
        ];
        // 보조 5개
        const secondary=[
          {label:'EV/EBITDA',val:fmtV(gMap.SG_V3?.value,'x'),grade:gMap.SG_V3?.grade},
          {label:L==='ko'?'배당률':'Div Yield',val:fmtV(gMap.SG_V4?.value,'%'),grade:gMap.SG_V4?.grade},
          {label:L==='ko'?'부채비율':'D/E',val:fmtV(gMap.SG_Q2?.value,'%'),grade:gMap.SG_Q2?.grade},
          {label:L==='ko'?'이익성장':'Earn Growth',val:fmtV(gMap.SG_G2?.value,'%'),grade:gMap.SG_G2?.grade},
          {label:L==='ko'?'거래량추세':'Vol Trend',val:fmtV(gMap.SG_M3?.value,'%'),grade:gMap.SG_M3?.grade},
        ];
        return(<>
          {/* 핵심 6개 — 큰 카드 */}
          <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:8}}>
            <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:12}}>{L==='ko'?'핵심 지표':'Key Metrics'}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
              {primary.map((m,i)=>(
                <div key={i} title={m.tip} style={{background:LT.bg2,borderRadius:8,padding:'12px 14px',border:`1px solid ${LT.border}`,cursor:'help'}}>
                  <div style={{fontSize:14,color:LT.textDim,marginBottom:4}}>{m.label}</div>
                  <div style={{fontSize:20,fontWeight:800,color:gradeCol(m.grade),fontFamily:'monospace'}}>{m.val}</div>
                </div>
              ))}
            </div>
          </div>
          {/* 보조 5개 — 작은 목록 */}
          <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:'14px 20px',border:`1px solid ${LT.border}`,marginBottom:12}}>
            <div style={{fontSize:14,color:LT.textDim,fontWeight:600,marginBottom:10}}>{L==='ko'?'참고 지표':'Reference Metrics'}</div>
            {secondary.map((m,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:i<secondary.length-1?`1px solid ${LT.border}`:'none'}}>
                <span style={{fontSize:14,color:LT.textDim}}>{m.label}</span>
                <span style={{fontSize:15,fontWeight:700,color:gradeCol(m.grade),fontFamily:'monospace'}}>{m.val}</span>
              </div>
            ))}
          </div>
        </>);
      })()}
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
        {L==='ko'?'전체':'All'} <span style={{fontSize:14,color:LT.textDim}}>({STOCKS.length})</span>
      </button>
      {countryList.map(({flag,cnt})=>{
        const active=filterCountry===flag;
        return(<button key={flag} onClick={()=>setFilterCountry(active?'':flag)}
          style={{padding:"4px 8px",borderRadius:6,border:`1px solid ${active?LT.text:LT.border}`,background:active?LT.bg3:LT.surface,fontSize:14,fontWeight:active?700:500,cursor:"pointer",color:active?LT.text:LT.textDim}}>
          {flag}<span style={{fontSize:14,marginLeft:2}}>{cnt}</span>
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
            <span style={{fontSize:14,padding:"1px 4px",borderRadius:3,background:LT.bg3,color:LT.textDim,fontWeight:600}}>T{s.tier}</span>
          </div>
          <div style={{fontSize:14,color:LT.textDim,marginTop:1}}>{s.sec} · {s.fac}{t('stockFacLabel',L)}</div>
        </div>
        <div style={{width:80,display:"flex",gap:2,justifyContent:"flex-end",flexWrap:"wrap",flexShrink:0}}>
          {s.sat.slice(0,3).map(st=>(<span key={st} style={{fontSize:14,padding:"1px 3px",borderRadius:2,background:LT.bg3,color:LT.textDim,fontWeight:600,lineHeight:1.3}}>{st}</span>))}
          {s.sat.length>3&&<span style={{fontSize:14,color:LT.textDim}}>+{s.sat.length-3}</span>}
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
