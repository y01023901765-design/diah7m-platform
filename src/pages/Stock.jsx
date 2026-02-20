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

    {/* ═══ TAB 2: 공급망 조기경보 ═══ */}
    {tab==='sat'&&<>

      {/* ── ① 종합 경보 헤더 ── */}
      {(()=>{
        const allFacs = liveSatImg&&liveSatImg.length>0 ? liveSatImg : facs;
        const worstNo2  = allFacs.reduce((m,f)=>{ const v=f.no2?.anomPct??f.no2?.anomaly??null; return(v!=null&&v<m)?v:m; },0);
        const worstTherm= allFacs.reduce((m,f)=>{ const v=f.thermal?.anomaly_degC??f.thermal?.anomaly??f.therm??null; return(v!=null&&v<m)?v:m; },0);
        const worstViirs= allFacs.reduce((m,f)=>{ const v=f.ntl?.anomPct??f.ntl?.anomaly??f.viirs??null; return(v!=null&&v<m)?v:m; },0);
        // 경보 판정: NO₂ 주력, VIIRS는 추세 경고 보조
        const alarmNow   = worstNo2<-15 || (worstNo2<-8 && worstTherm<-2); // 급성: NO₂+Thermal
        const warnNow    = !alarmNow && (worstNo2<-8 || worstTherm<-2);
        const trendWarn  = !alarmNow && !warnNow && worstViirs<-10; // 구조: VIIRS 장기 하락
        const state = alarmNow?'ALARM':warnNow?'WARN':trendWarn?'TREND':'OK';
        const stateColor = state==='ALARM'?LT.danger:state==='WARN'?LT.warn:state==='TREND'?LT.textDim:LT.good;
        const stateBg    = state==='ALARM'?'#fff0f0':state==='WARN'?'#fffbeb':state==='TREND'?'#f8f8f8':'#f0fdf4';
        const stateBorder= state==='ALARM'?`${LT.danger}33`:state==='WARN'?`${LT.warn}33`:state==='TREND'?`${LT.textDim}33`:`${LT.good}33`;
        const stateLabel = state==='ALARM'?'공급망 급성 경보':state==='WARN'?'공급망 변화 감지':state==='TREND'?'구조 추세 경고':'공급망 정상';
        const stateDesc  = state==='ALARM'
          ?'NO₂ 급락 감지 · 향후 1~2주 리스크 구간 — 단기 대응 검토'
          :state==='WARN'?'생산 신호 이상 감지 · 향후 2~4주 확인 구간 — 모니터링 강화'
          :state==='TREND'?'야간광 구조 하락 · 향후 3~6개월 관찰 구간 — 장기 포지션 점검'
          :'관측 가능한 물리 신호 범위 내 정상';
        return(
          <div style={{borderRadius:10,padding:'18px 20px',marginBottom:4,background:stateBg,border:`1px solid ${stateBorder}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:stateColor,letterSpacing:'0.06em',marginBottom:6,textTransform:'uppercase'}}>공급망 조기경보 · 최근 확인 물리 신호 기준</div>
                <div style={{fontSize:22,fontWeight:900,color:stateColor,marginBottom:6}}>
                  {stateLabel}
                  {/* 추세 경고 툴팁 */}
                  {state==='TREND'&&<span title="장기 활동 감소 신호 — 급성 위험 아님. VIIRS D-90 기준 누적 하락." style={{fontSize:13,fontWeight:500,color:LT.textDim,marginLeft:10,cursor:'help',borderBottom:`1px dashed ${LT.textDim}`}}>급성 위험 아님</span>}
                </div>
                <div style={{fontSize:14,color:stateColor,opacity:0.85,lineHeight:1.6}}>{stateDesc}</div>
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                {(()=>{
                  const cards=[];
                  if(worstNo2!==0) cards.push({label:'NO₂',fresh:'D-5',role:'단기 가동 경보',valLabel:'최근 8주 대비 NO₂ 변화',desc:'이산화질소 농도 변화',window:'1~2주',val:worstNo2,alarm:worstNo2<-15,warn:worstNo2<-8});
                  if(worstTherm!==0) cards.push({label:'Thermal',fresh:'D-16',role:'중기 생산 신호',valLabel:'전년 동기간 대비 온도 변화',desc:'공장 지표온도 변화',window:'2~4주',val:worstTherm,alarm:worstTherm<-3,warn:worstTherm<-1,isDeg:true});
                  if(worstViirs!==0) cards.push({label:'야간광',fresh:'D-90',role:'장기 구조 추세',valLabel:'1년 평균 대비 밝기 변화',desc:'공장 불빛 밝기 변화',window:'3~6개월',val:worstViirs,alarm:worstViirs<-15,warn:worstViirs<-8});
                  return cards.map((c,ci)=>(
                    <div key={ci} style={{textAlign:'left',padding:'10px 14px',background:'#fff',borderRadius:10,border:`1px solid ${c.alarm?LT.danger:c.warn?LT.warn:LT.border}`,minWidth:110}}>
                      <div style={{fontSize:13,color:LT.textDim,fontWeight:600,marginBottom:2}}>{c.label} <span style={{color:c.fresh==='D-5'?LT.good:c.fresh==='D-16'?LT.warn:LT.textDim,fontSize:13,fontWeight:700}}>{c.fresh}</span></div>
                      <div style={{fontSize:20,fontWeight:900,fontFamily:'monospace',color:c.alarm?LT.danger:c.warn?LT.warn:LT.good,marginBottom:2}}>{c.val>0?'+':''}{c.isDeg?c.val.toFixed(1)+'°C':c.val.toFixed(1)+'%'}</div>
                      <div style={{fontSize:13,color:LT.textMid,marginBottom:2}}>{c.valLabel}</div>
                      <div style={{fontSize:13,color:LT.textDim,fontWeight:600}}>{c.role} · 관찰 시기 {c.window}</div>
                      <div style={{fontSize:13,color:LT.textDim,marginTop:3,lineHeight:'1.4'}}>{c.desc}</div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 경보 철학 한 줄 ── */}
      <div style={{fontSize:13,color:LT.textDim,marginBottom:10,marginTop:4,padding:'0 4px'}}>
        단기(NO₂) · 중기(Thermal) · 장기(야간광) 신호를 겹쳐 투자 시기 창을 제시합니다. 매수/매도 추천이 아닌 물리 신호 기반 상태 안내입니다.
      </div>

      {/* ── ② 시간축 스위치 + 신선도 안내 ── */}
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
        {/* 신선도 배지 */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
          <span style={{fontSize:13,padding:'3px 10px',borderRadius:20,background:'#f0fdf4',border:`1px solid ${LT.good}`,color:LT.good,fontWeight:700}}>NO₂ D-5 최신</span>
          <span style={{fontSize:13,padding:'3px 10px',borderRadius:20,background:'#fffbeb',border:`1px solid ${LT.warn}`,color:LT.warn,fontWeight:700}}>Thermal D-16 중기</span>
          <span style={{fontSize:13,padding:'3px 10px',borderRadius:20,background:'#eff6ff',border:'1px solid #2563eb',color:'#2563eb',fontWeight:700}}>VIIRS D-90 추세용</span>
        </div>
      </div>
      {/* 모드 설명 */}
      <div style={{fontSize:13,color:LT.textDim,marginBottom:12,padding:'0 4px'}}>
        {satMode==='now'
          ?'지금 경보: NO₂(D-5)+Thermal(D-16) — 급성 공급망 막힘 확인.'
          :'구조 추세: VIIRS 야간광(D-90) — 장기 구조 변화 확인.'}
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
                    style={{padding:'4px 10px',fontSize:13,fontWeight:activePreset?.id===p.id?700:400,borderRadius:6,
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
          const selStyle={padding:'4px 8px',fontSize:13,borderRadius:6,border:`1px solid ${LT.border}`,background:LT.bg2,color:LT.text,cursor:'pointer',outline:'none'};
          const years=[];for(let y=new Date().getFullYear();y>=2012;y--)years.push(y);
          const months=[1,2,3,4,5,6,7,8,9,10,11,12];
          const [aY,aM]=satAfterYM?satAfterYM.split('-').map(Number):[null,null];
          const [bY,bM]=satBeforeYM?satBeforeYM.split('-').map(Number):[null,null];
          return(
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
              <span style={{fontSize:13,color:LT.textDim}}>비교기준</span>
              <select value={bY} onChange={e=>setSatBeforeYM(`${e.target.value}-${String(bM||1).padStart(2,'0')}`)} style={selStyle}>{years.map(y=><option key={y} value={y}>{y}년</option>)}</select>
              <select value={bM} onChange={e=>setSatBeforeYM(`${bY||new Date().getFullYear()-1}-${String(e.target.value).padStart(2,'0')}`)} style={selStyle}>{months.map(m=><option key={m} value={m}>{m}월</option>)}</select>
              <span style={{fontSize:13,color:LT.textDim}}>→ 최신</span>
              <select value={aY} onChange={e=>setSatAfterYM(`${e.target.value}-${String(aM||1).padStart(2,'0')}`)} style={selStyle}>{years.map(y=><option key={y} value={y}>{y}년</option>)}</select>
              <select value={aM} onChange={e=>setSatAfterYM(`${aY||new Date().getFullYear()}-${String(e.target.value).padStart(2,'0')}`)} style={selStyle}>{months.map(m=><option key={m} value={m}>{m}월</option>)}</select>
            </div>
          );
        })()}
        <div style={{fontSize:13,color:LT.textDim,marginBottom:12,padding:'6px 10px',background:LT.bg2,borderRadius:6,display:'inline-block'}}>
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

            {/* ── 시설 헤더 ── */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:18,fontWeight:800,color:LT.text}}>{stageIcon} {f.name}</span>
                <span style={{fontSize:13,padding:'2px 8px',borderRadius:4,background:LT.bg3,color:LT.textMid,fontWeight:600}}>{f.stage?.toUpperCase()||''}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                {qStatus&&<span style={{fontSize:13,fontWeight:600,color:qStatus==='good'||qStatus==='GOOD'?LT.good:qStatus==='ok'||qStatus==='PARTIAL'?LT.warn:LT.danger}}>{qIcon} {qLabel}</span>}
                {alignIcon&&<span style={{fontSize:13,fontWeight:700,padding:'3px 10px',borderRadius:6,
                  background:alignIcon.icon==='🟢'?`${LT.good}18`:alignIcon.icon==='🔴'?`${LT.danger}18`:alignIcon.mixed?`${LT.warn}18`:'#f8f8f8',
                  color:alignIcon.icon==='🟢'?LT.good:alignIcon.icon==='🔴'?LT.danger:alignIcon.mixed?LT.warn:LT.textDim}}>
                  {alignIcon.icon} {alignIcon.label}
                </span>}
              </div>
            </div>
            {alignIcon?.detail&&<div style={{fontSize:13,color:LT.textMid,marginBottom:8,paddingLeft:4}}>{alignIcon.detail}</div>}

            {/* ── 이미지 2컬럼 ── */}
            <div style={{fontSize:13,color:LT.textDim,marginBottom:6,padding:'0 2px'}}>
              해당 기간 야간광(VIIRS) 평균 신호 — 실시간 사진 아님
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {/* 왼쪽: before */}
              <div style={{background:LT.bg2,borderRadius:8,padding:12,border:`1px solid ${LT.border}`}}>
                <div style={{fontSize:13,fontWeight:600,color:LT.textMid,marginBottom:6}}>이전 &nbsp;<span style={{fontSize:13,fontWeight:400,color:LT.textDim}}>{beforeDate||'—'}</span></div>
                <div style={{borderRadius:6,overflow:"hidden",height:140}}>
                {beforeUrl
                  ?<img src={beforeUrl} alt="before" onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:"100%",height:140,objectFit:"cover",display:"block",filter:"blur(2px)",transform:"scale(1.04)"}}/>
                  :<div style={{background:LT.bg3,height:140,display:"flex",alignItems:"center",justifyContent:"center",color:LT.textDim,fontSize:14}}>🛰️ 이전</div>}
                <div style={{display:"none",background:LT.bg3,height:140,alignItems:"center",justifyContent:"center",color:LT.textDim,fontSize:14}}>🛰️ —</div>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:LT.text,marginTop:8,fontFamily:"monospace"}}>
                  {beforeVal!=null?`${beforeVal.toFixed(1)} ${units}`:ntl?.mean_60d!=null?`${ntl.mean_60d.toFixed(1)} ${units}`:'—'}
                </div>
                {beforeUrl&&<div style={{display:"flex",alignItems:"center",gap:4,marginTop:6}}>
                  <span style={{fontSize:13,color:LT.textDim}}>어두움</span>
                  <div style={{flex:1,height:5,borderRadius:2,background:"linear-gradient(to right,#000000,#1a1a5e,#0066cc,#00ccff,#ffff00,#ffffff)"}}/>
                  <span style={{fontSize:13,color:LT.textDim}}>밝음</span>
                </div>}
              </div>
              {/* 오른쪽: after */}
              <div style={{background:LT.bg2,borderRadius:8,padding:12,border:`1px solid ${LT.border}`}}>
                <div style={{fontSize:13,fontWeight:600,color:LT.textMid,marginBottom:6}}>최신 &nbsp;<span style={{fontSize:13,fontWeight:400,color:LT.textDim}}>{afterDate||'—'}</span></div>
                <div style={{borderRadius:6,overflow:"hidden",height:140}}>
                {afterUrl
                  ?<img src={afterUrl} alt="after" onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}} style={{width:"100%",height:140,objectFit:"cover",display:"block",filter:"blur(2px)",transform:"scale(1.04)"}}/>
                  :<div style={{background:LT.bg3,height:140,display:"flex",alignItems:"center",justifyContent:"center",color:LT.textDim,fontSize:14}}>🛰️ 최신</div>}
                <div style={{display:"none",background:LT.bg3,height:140,alignItems:"center",justifyContent:"center",color:LT.textDim,fontSize:14}}>🛰️ —</div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                  <span style={{fontSize:14,fontWeight:700,color:LT.text,fontFamily:"monospace"}}>{afterVal!=null?`${afterVal.toFixed(1)} ${units}`:'—'}</span>
                  {anomPct!=null&&<span style={{fontSize:16,fontWeight:900,fontFamily:"monospace",color:anomPct>0?LT.good:LT.danger}}>{anomPct>0?'+':''}{typeof anomPct==='number'&&Math.abs(anomPct)<1?anomPct.toFixed(2):anomPct.toFixed(1)}%</span>}
                </div>
                {afterUrl&&<div style={{display:"flex",alignItems:"center",gap:4,marginTop:6}}>
                  <span style={{fontSize:13,color:LT.textDim}}>어두움</span>
                  <div style={{flex:1,height:5,borderRadius:2,background:"linear-gradient(to right,#000000,#1a1a5e,#0066cc,#00ccff,#ffff00,#ffffff)"}}/>
                  <span style={{fontSize:13,color:LT.textDim}}>밝음</span>
                </div>}
              </div>
            </div>
            {/* ── 색상 범례 (이미지 아래) ── */}
            {(beforeUrl||afterUrl)&&<div style={{display:'flex',gap:10,marginBottom:12,fontSize:13,color:LT.textDim,alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontWeight:600,color:LT.textMid}}>색상 범례</span>
              <span><span style={{color:'#222',fontWeight:700}}>■</span> 무광(사막·바다)</span>
              <span><span style={{color:'#0077bb',fontWeight:700}}>■</span> 외곽·저밀도</span>
              <span><span style={{color:'#cc9900',fontWeight:700}}>■</span> 핵심·고가동</span>
              <span><span style={{color:'#fff',fontWeight:700,textShadow:'0 0 2px #999'}}>■</span> 극강 밀집</span>
            </div>}

            {/* ── 센서 패널 — satMode 기반 필터 ── */}
            {(()=>{
              const FRESHNESS = {NTL:{label:'D-90',color:'#2563eb',bg:'#eff6ff'},NO2:{label:'D-5 실시간',color:LT.good,bg:'#f0fdf4'},THERMAL:{label:'D-16',color:LT.warn,bg:'#fffbeb'},SAR:{label:'예정',color:LT.textDim,bg:'#f8f8f8'}};
              // satMode에 따라 표시 센서 필터: now=NO₂+Thermal 우선, trend=NTL 우선
              const modeFilter = satMode==='now'
                ? (sk=>['NO2','THERMAL','SAR'].includes(sk))
                : (sk=>['NTL','NO2'].includes(sk));
              const sortedSensors = [...sensors].filter(modeFilter).sort((a,b)=>{ const o={NO2:0,THERMAL:1,NTL:2,SAR:3}; return (o[a]??9)-(o[b]??9); });
              return(
            <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
              {sortedSensors.map(sk=>{
                const b=SENSOR_BADGE[sk];
                if(!b) return null;
                const hasData = b.val!=null;
                const fresh = FRESHNESS[sk]||{label:'',color:'#aaa',bg:'#f5f5f5'};
                const isPrimary = sk==='NO2';
                return(
                  <div key={sk} style={{display:'flex',alignItems:'stretch',gap:0,background:'#fff',border:`1px solid ${LT.border}`,borderRadius:12,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
                    {/* 왼쪽: 위성명 + 신선도 */}
                    <div style={{width:110,minWidth:110,padding:'16px 12px',background:LT.bg2,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,borderRight:`1px solid ${LT.border}`}}>
                      <span style={{fontSize:13,fontWeight:700,color:isPrimary?LT.good:LT.textMid,textAlign:'center'}}>
                        {sk==='NTL'?'VIIRS':sk==='NO2'?'Sentinel-5P':sk==='THERMAL'?'Landsat-9':sk==='SAR'?'Sentinel-1':sk}
                      </span>
                      <span style={{fontSize:13,fontWeight:700,padding:'2px 7px',borderRadius:10,background:fresh.bg,color:fresh.color,border:`1px solid ${fresh.color}55`}}>{fresh.label}</span>
                    </div>
                    {/* 중앙: 수치 */}
                    <div style={{width:140,minWidth:140,padding:'16px 16px',display:'flex',flexDirection:'column',justifyContent:'center',borderRight:`1px solid ${LT.border}`}}>
                      {hasData
                        ?<><span style={{fontSize:22,fontWeight:900,color:b.valColor,fontFamily:'monospace',lineHeight:1}}>{b.val}</span>
                          <span style={{fontSize:13,color:LT.textDim,marginTop:4,lineHeight:1.4}}>{b.valLabel}</span></>
                        :<span style={{fontSize:14,color:LT.textDim}}>— 대기</span>}
                    </div>
                    {/* 오른쪽: 설명 + 민감도 */}
                    <div style={{flex:1,padding:'16px 16px',display:'flex',flexDirection:'column',justifyContent:'center',gap:8}}>
                      <span style={{fontSize:14,color:LT.textMid,lineHeight:1.6}}>{b.desc}</span>
                      {hasData&&b.band&&<span title={b.band.tip} style={{display:'inline-block',fontSize:13,fontWeight:700,color:b.band.color,background:b.band.bg,padding:'3px 10px',borderRadius:6,alignSelf:'flex-start',cursor:'help',border:`1px solid ${b.band.color}44`}}>
                        {b.band.label}
                      </span>}
                      {!hasData&&<span style={{fontSize:13,color:LT.textDim}}>데이터 수집 대기 중</span>}
                    </div>
                  </div>
                );
              })}
            </div>
              );
            })()}

            {/* ── 운영 패턴 태그 ── */}
            {patternTag&&<div style={{borderRadius:8,padding:'12px 16px',marginBottom:12,background:patternTag.bg,border:`1px solid ${patternTag.color}55`}}>
              <div style={{fontSize:15,fontWeight:700,color:patternTag.color,marginBottom:4}}>{patternTag.label}</div>
              <div style={{fontSize:13,color:patternTag.color,opacity:0.85,lineHeight:1.6}}>{patternTag.sub}</div>
            </div>}

            {/* ── 한줄 해석 ── */}
            {flowText&&<div style={{fontSize:14,fontWeight:600,color:anomPct!=null&&anomPct<-8?LT.danger:anomPct!=null&&anomPct>5?LT.good:LT.textMid,marginTop:10,padding:'10px 14px',background:anomPct!=null&&anomPct<-8?`${LT.danger}08`:anomPct!=null&&anomPct>5?`${LT.good}08`:LT.bg2,borderRadius:6,borderLeft:`3px solid ${anomPct!=null&&anomPct<-8?LT.danger:anomPct!=null&&anomPct>5?LT.good:LT.border}`}}>
              {flowText}
            </div>}

            {/* ── 약신호 안내 ── */}
            {isLowSignal&&<div style={{fontSize:13,color:LT.textDim,marginTop:6,padding:'0 2px'}}>
              야간조도 기반 분석 적합도 낮음 — 실내 생산 공정 또는 야간 운영 비중이 적은 시설
            </div>}

            {/* ── 시설 종합 요약 ── */}
            {(()=>{
              const sp=[];
              if(no2Pct!=null)  sp.push(`NO₂ ${no2Pct>0?'+':''}${no2Pct.toFixed(1)}%`);
              if(thermDeg!=null) sp.push(`지표온도 ${thermDeg>0?'+':''}${thermDeg.toFixed(1)}°C`);
              if(anomPct!=null)  sp.push(`야간광 ${anomPct>0?'+':''}${anomPct.toFixed(1)}%`);
              if(sp.length===0) return null;
              const worst=Math.min(no2Pct??0,thermDeg??0,anomPct??0);
              const facAlarm=no2Pct!=null&&no2Pct<-15||thermDeg!=null&&thermDeg<-3;
              const facWarn=!facAlarm&&(no2Pct!=null&&no2Pct<-8||thermDeg!=null&&thermDeg<-1);
              let note='';
              if(facAlarm) note='이상 신호 감지 — 단기 확인 필요';
              else if(facWarn) note='변화 감지 — 모니터링 권장';
              else note='정상 범위 내 운영 중';
              return(
                <div style={{marginTop:10,padding:'10px 14px',background:LT.bg2,borderRadius:8,border:`1px solid ${LT.border}`}}>
                  <div style={{fontSize:13,color:LT.textMid,lineHeight:1.6}}>
                    {f.name}: {sp.join(' · ')} → <span style={{fontWeight:700,color:facAlarm?LT.danger:facWarn?LT.warn:LT.good}}>{note}</span>
                  </div>
                </div>
              );
            })()}

          </div>
          );
        })}
      </div>
      {/* Delta 괴리 차트 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text}}>{t('svDeltaTitle',L)}</div>
          <div style={{fontSize:13,color:LT.textDim,marginTop:3}}>최근 6개월 물리 신호 변화와 가격 반응의 동행 여부 — 예측이 아닌 상관 확인</div>
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
      {/* Trust: Past→Present */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text}}>{t('svTrustTitle',L)}</div>
          <div style={{fontSize:13,color:LT.textDim,marginTop:3}}>과거 물리 신호가 실제 실적과 어떻게 연결됐는지 — 상관 검증 사례</div>
        </div>
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
