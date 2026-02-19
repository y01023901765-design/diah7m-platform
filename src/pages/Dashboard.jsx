import { useState, useEffect } from 'react';
import T, { L as LT } from '../theme';
import { t, gc } from '../i18n';
import { RadarChart, DualLockIndicator, StateIndicator, DeltaAnalysis } from '../components/Charts';
import { GaugeRow, SystemSection } from '../components/Gauges';
import TierLock, { SYS, D, sysN, sysB, isSat, SAT_META, gN, SAT_XREF, TP } from '../components/TierLock';
import { TIER_ACCESS } from '../data/gauges';
import { SatXrefBanner, SatCompare, SatEvidencePanel } from '../components/Satellite';
import * as API from '../api';

// ── 글로벌 게이지 ID → 프론트 데모 키 매핑 ──
const GLOBAL_TO_FRONT = {
  G_I1:'I1', G_I2:'I4', G_I3:'I5',           // 금리, 환율, 통화량
  G_E1:'E1', G_E2:'E2', G_E3:'E3',           // 수출, 수입, 경상수지
  G_C1:'C5', G_C2:'C2',                       // 소비, 소비자심리
  G_S1:'S3', G_S2:'S4',                       // CLI, 정부지출
  G_F1:'F3', G_F2:'P4',                       // 주식시장, 정부부채
  G_P1:'P1', G_P2:'P2',                       // CPI, PPI
  G_R1:'O1', G_R2:'O2',                       // 산업생산, PMI
  G_L1:'L2', G_L2:'L1',                       // 실업률, 경제활동참가율
  G_D1:'O4', G_D2:'C4',                       // GDP성장률, 자본형성
};

// ── 서버 새ID → 프론트 구ID 매핑 ──
const SERVER_TO_FRONT = {
  // O축 → 기존 A7(O/M)
  O1_EXPORT:'E1', O2_PMI:'O2', O3_IP:'O1', O4_CAPACITY:'M1', O5_INVENTORY:'M2_G', O6_SHIPMENT:'E4', O7_ORDER:'M3_G',
  // F축 → 기존 A5(F) + A1(I)
  F1_KOSPI:'F3', F2_KOSDAQ:'F7', F3_KOSPI_VOL:'F3', F4_EXCHANGE:'I4', F5_INTEREST:'I1', F6_M2:'I5', F7_KOSDAQ_VOL:'F7', F8_FOREIGN:'F3',
  // S축 → 기존 A4(S) + A3(C)
  S1_BSI:'S1', S2_CSI:'C2', S3_NIGHTLIGHT:'S2', S4_CREDIT:'F1', S5_EMPLOY:'L1', S6_RETAIL:'C1', S7_HOUSING:'R2',
  // P축 → 기존 A6(P)
  P1_CPI:'P1', P2_PPI:'P2', P3_OIL:'E5', P4_COMMODITY:'I2', P5_IMPORT:'E2', P6_EXPORT_PRICE:'E4',
  // R축 → 기존 A7/A9
  R1_ELECTRICITY:'O4', R2_WATER:'O5', R3_GAS:'O4', R4_COAL:'O4', R6_UHI:'R6', R7_WASTE:'O5', R8_FOREST:'O1',
  // I축 → 기존 A7(O)
  I1_CONSTRUCTION:'O3', I2_CEMENT:'O3', I3_STEEL:'O4', I4_VEHICLE:'O4', I5_CARGO:'P3', I6_AIRPORT:'E4', I7_RAILROAD:'O5',
  // T축 → 기존 A2(E) + A1(I)
  T1_TRADE_BALANCE:'E3', T2_CURRENT_ACCOUNT:'I2', T3_FDI:'G1', T4_RESERVES:'I3', T5_SHIPPING:'P3', T6_CONTAINER:'E4',
  // E축 → 기존 A4(S) + A5(F)
  E1_CHINA_PMI:'O2', E2_US_PMI:'S5', E3_VIX:'F4', E4_DOLLAR_INDEX:'I4', E5_BALTIC:'E4',
  // L축 → 기존 A8(L/D)
  L1_UNEMPLOYMENT:'L2', L2_PARTICIPATION:'L1', L3_WAGE:'L1', L4_HOURS:'L1', L5_YOUTH_UNEMP:'L2',
};

// ── 글로벌 데이터 머지: countryInfo.gauges 객체 → 프론트 데모 덮어쓰기 ──
function mergeGlobalData(demoD, globalGauges) {
  if (!globalGauges || typeof globalGauges !== 'object') return demoD;
  const merged = { ...demoD };
  const applied = new Set();
  for (const [gId, gData] of Object.entries(globalGauges)) {
    const key = GLOBAL_TO_FRONT[gId];
    if (!key || !merged[key] || applied.has(key)) continue;
    if (gData.value == null) continue;
    applied.add(key);
    const v = gData.value;
    const absV = Math.abs(v);
    const newG = absV > 10 ? '경보' : absV > 5 ? '주의' : '양호';
    merged[key] = {
      ...merged[key],
      v,
      p: merged[key].v,
      g: newG,
      n: gData.name?.ko || gData.name?.en || merged[key].n,
      u: gData.unit || merged[key].u,
      ch: v >= 0 ? `+${v.toFixed?.(1) ?? v}` : `${v.toFixed?.(1) ?? v}`,
      note: `${gData.provider || 'WB'} ${gData.date || ''}`,
      _live: true,
    };
  }
  return merged;
}

// ── 실데이터 ↔ 데모 머지: API 값이 있으면 덮어쓰기, 없으면 데모 유지 ──
function mergeGaugeData(demoD, liveResults) {
  if (!liveResults || !Array.isArray(liveResults)) return demoD;
  const merged = { ...demoD };
  const applied = new Set();
  for (const r of liveResults) {
    if (!r?.id || r.status === 'PENDING' || r.value == null) continue;
    // 새ID로 직접 매칭 시도 → 실패하면 매핑 테이블 사용
    let key = r.id;
    if (!merged[key]) key = SERVER_TO_FRONT[r.id];
    if (!key || !merged[key] || applied.has(key)) continue;
    applied.add(key);
    // 실데이터 기반 상태 재계산: 변화율 기반 판정
    const absV = Math.abs(r.value);
    const newG = absV > 10 ? '경보' : absV > 5 ? '주의' : '양호';
    merged[key] = {
      ...merged[key],
      v: r.value,
      p: merged[key].v,
      g: newG,
      ch: r.change || (r.value >= 0 ? `+${r.value.toFixed(1)}` : r.value.toFixed(1)),
      note: r.note || merged[key].note,
      _live: true,
    };
  }
  return merged;
}

function DashboardPage({user,onNav,lang,country,city}){
  const L=lang||'ko';
  const [expanded,setExpanded]=useState({});
  const [tab,setTab]=useState('overview');
  const [demoPlan,setDemoPlan]=useState(user?.plan||'PRO');
  const [apiStatus,setApiStatus]=useState('checking'); // checking|live|demo
  const [liveData,setLiveData]=useState(null); // API에서 가져온 실데이터
  const [dataInfo,setDataInfo]=useState(null); // 수집 현황 정보
  const [countryInfo,setCountryInfo]=useState(null); // 글로벌 국가 데이터
  const [satData,setSatData]=useState(null); // 위성 실데이터 (S2/R6)
  const [satMeta,setSatMeta]=useState(null); // 위성 수집 메타
  const [showOnboard,setShowOnboard]=useState(()=>{try{return !localStorage.getItem('diah7m_onboard')}catch{return true}});
  const dismissOnboard=()=>{setShowOnboard(false);try{localStorage.setItem('diah7m_onboard','1')}catch{/* localStorage unavailable */}};

  const toggle=k=>setExpanded(p=>({...p,[k]:!p[k]}));

  // 국가코드 (null이면 한국)
  const iso3 = country || 'KOR';
  const isKorea = iso3 === 'KOR';

  // 1단계: API 연결 확인 → 2단계: 데이터 fetch
  useEffect(()=>{
    let cancelled = false;
    (async()=>{
      try {
        await API.healthCheck();
        if (cancelled) return;

        if (isKorea) {
          // 한국: 기존 59게이지 실데이터
          const status = await API.dataStatus();
          if (cancelled) return;
          console.log('[Dashboard] status:', status);
          setDataInfo(status.data || status);
          if (status.data?.available || status.available) {
            try {
              const latest = await API.dataLatest();
              if (cancelled) return;
              console.log('[Dashboard] latest:', latest);
              if (latest?.data?.gauges && latest.data.gauges.length > 0) { 
                console.log('[Dashboard] Setting live data with', latest.data.gauges.length, 'gauges');
                setLiveData(latest.data); 
                setApiStatus('live'); 
                return; 
              } else {
                console.log('[Dashboard] No gauges in response');
              }
            } catch(e) { console.log('Data fetch failed:', e.message); }
          } else {
            console.log('[Dashboard] status.available is false');
          }
        } else {
          // 글로벌: 20게이지 라이트 데이터
          try {
            const cData = await API.globalCountry(iso3);
            if (cancelled) return;
            if (cData) { setCountryInfo(cData); setApiStatus('live'); return; }
          } catch(e) { console.log('Global fetch failed:', e.message); }
        }
        setApiStatus('demo');
      } catch {
        setApiStatus('demo');
      }
      // 위성 데이터 독립 로드 (S2 야간광 + R6 도시열섬)
      try {
        const sat = await API.satelliteLatest();
        if (!cancelled && sat?.available) {
          setSatData(sat.gauges);
          setSatMeta(sat.meta);
        }
      } catch { /* 위성 데이터 없어도 정상 동작 */ }
    })();
    return () => { cancelled = true; };
  },[iso3, isKorea]);

  // 실데이터 있으면 머지, 없으면 데모 그대로
  // 한국: liveData.gauges 배열 사용 | 글로벌: countryInfo.gauges 객체 사용
  const gaugeData = !isKorea && countryInfo?.gauges
    ? mergeGlobalData(D, countryInfo.gauges)
    : liveData?.gauges ? mergeGaugeData(D, liveData.gauges) : D;
  const allG=Object.values(gaugeData);
  const good=allG.filter(g=>g.g==="양호").length,caution=allG.filter(g=>g.g==="주의").length,alertCnt=allG.filter(g=>g.g==="경보").length;
  // 종합 점수: 양호=100, 주의=50, 경보=0 → 가중 평균
  const totalG=allG.length||1;
  const compositeScore=((good*100+caution*50+alertCnt*0)/totalG).toFixed(1);
  const scoreColor=compositeScore>=70?LT.good:compositeScore>=40?LT.warn:LT.danger;
  const tabs=[{id:'overview',label:t('overview',L)},{id:'report',label:t('gaugeTab',L)},{id:'satellite',label:t('satTab',L)},{id:'alerts',label:t('alertTab',L)+(alertCnt>0?` (${alertCnt})`:'')  }];
  const demoUser={...user,plan:demoPlan};
  // 43국 리스트
  const COUNTRIES=[
    {iso:'KOR',flag:'🇰🇷'},{iso:'USA',flag:'🇺🇸'},{iso:'JPN',flag:'🇯🇵'},{iso:'DEU',flag:'🇩🇪'},{iso:'GBR',flag:'🇬🇧'},
    {iso:'FRA',flag:'🇫🇷'},{iso:'CAN',flag:'🇨🇦'},{iso:'AUS',flag:'🇦🇺'},{iso:'ITA',flag:'🇮🇹'},{iso:'ESP',flag:'🇪🇸'},
    {iso:'NLD',flag:'🇳🇱'},{iso:'CHE',flag:'🇨🇭'},{iso:'SWE',flag:'🇸🇪'},{iso:'NOR',flag:'🇳🇴'},{iso:'DNK',flag:'🇩🇰'},
    {iso:'FIN',flag:'🇫🇮'},{iso:'AUT',flag:'🇦🇹'},{iso:'BEL',flag:'🇧🇪'},{iso:'IRL',flag:'🇮🇪'},{iso:'PRT',flag:'🇵🇹'},
    {iso:'GRC',flag:'🇬🇷'},{iso:'CZE',flag:'🇨🇿'},{iso:'POL',flag:'🇵🇱'},{iso:'HUN',flag:'🇭🇺'},{iso:'SVK',flag:'🇸🇰'},
    {iso:'SVN',flag:'🇸🇮'},{iso:'EST',flag:'🇪🇪'},{iso:'LVA',flag:'🇱🇻'},{iso:'LTU',flag:'🇱🇹'},{iso:'ISL',flag:'🇮🇸'},
    {iso:'LUX',flag:'🇱🇺'},{iso:'NZL',flag:'🇳🇿'},{iso:'ISR',flag:'🇮🇱'},{iso:'TUR',flag:'🇹🇷'},{iso:'MEX',flag:'🇲🇽'},
    {iso:'CHL',flag:'🇨🇱'},{iso:'COL',flag:'🇨🇴'},{iso:'CRI',flag:'🇨🇷'},{iso:'SGP',flag:'🇸🇬'},{iso:'HKG',flag:'🇭🇰'},
    {iso:'TWN',flag:'🇹🇼'},{iso:'IND',flag:'🇮🇳'},{iso:'CHN',flag:'🇨🇳'},
  ];
  const curFlag=COUNTRIES.find(c=>c.iso===iso3)?.flag||'🌍';
  const [showCountryPicker,setShowCountryPicker]=useState(false);
  return(<div style={{maxWidth:780,margin:"0 auto",padding:"20px 16px"}}>
    {/* Country Selector + Data Freshness */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div style={{position:"relative"}}>
        <button onClick={()=>setShowCountryPicker(p=>!p)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,border:`1px solid ${LT.border}`,background:LT.surface,cursor:"pointer",fontSize:15}}>
          <span>{curFlag}</span>
          <span style={{fontWeight:700,color:LT.text}}>{t('cnt_'+iso3,L)||iso3}</span>
          <span style={{color:LT.textDim,fontSize:12}}>▼</span>
        </button>
        {showCountryPicker&&<div style={{position:"absolute",top:"100%",left:0,marginTop:4,background:LT.surface,border:`1px solid ${LT.border}`,borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.12)",zIndex:100,maxHeight:320,overflowY:"auto",width:280,padding:8}}>
          {COUNTRIES.map(c=>(<button key={c.iso} onClick={()=>{onNav('dashboard',{country:c.iso});setShowCountryPicker(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",borderRadius:6,border:"none",background:c.iso===iso3?LT.bg3:"transparent",color:LT.text,fontSize:14,cursor:"pointer",textAlign:"left"}}>
            <span>{c.flag}</span>
            <span style={{fontWeight:c.iso===iso3?700:400}}>{t('cnt_'+c.iso,L)||c.iso}</span>
            {c.iso===iso3&&<span style={{marginLeft:"auto",color:LT.good,fontWeight:700}}>✓</span>}
          </button>))}
        </div>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:13,color:LT.textDim}}>{t('lastUpdate',L)} {dataInfo?.lastUpdated?new Date(dataInfo.lastUpdated).toLocaleDateString():'2026.01.15'}</span>
        <span style={{fontSize:13,color:apiStatus==='live'?LT.good:LT.warn,fontWeight:600}}>{apiStatus==='live'?'● LIVE':'● DEMO'}</span>
      </div>
    </div>
    {/* Onboarding Banner */}
    {showOnboard&&<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:16,position:"relative"}}>
      <button onClick={dismissOnboard} style={{position:"absolute",top:10,right:12,border:"none",background:"transparent",color:LT.textDim,fontSize:18,cursor:"pointer",padding:4}}>✕</button>
      <div style={{fontSize:17,fontWeight:800,color:LT.text,marginBottom:8}}>👋 {t('onboardTitle',L)}</div>
      <div style={{fontSize:15,color:LT.textMid,lineHeight:1.7,marginBottom:12}}>{t('onboardDesc',L)}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {[
          {icon:'📊',label:t('onboardStep1',L)},
          {icon:'🛰️',label:t('onboardStep2',L)},
          {icon:'📈',label:t('onboardStep3',L)},
        ].map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:6,background:LT.bg2,border:`1px solid ${LT.border}`}}>
          <span>{s.icon}</span><span style={{fontSize:14,color:LT.text,fontWeight:600}}>{s.label}</span>
        </div>))}
      </div>
    </div>}
    {/* Level 1: Content Tabs */}
    <div className="tab-scroll" style={{display:"flex",gap:0,marginBottom:20,borderBottom:`1px solid ${LT.border}`,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      {tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"12px 16px",border:"none",background:"transparent",color:tab===t.id?LT.text:LT.textDim,borderBottom:tab===t.id?'2px solid #111':'2px solid transparent',fontSize:15,fontWeight:tab===t.id?700:500,cursor:"pointer",whiteSpace:"nowrap",marginBottom:-1,flexShrink:0}}>{t.label}</button>))}
    </div>
    {/* Level 2: Utility — DEMO 스위처 (최소) */}
    <div className="demo-switch" style={{display:"flex",alignItems:"center",gap:4,marginBottom:16,flexWrap:"wrap"}}>
      <span style={{fontSize:13,color:LT.textDim}}>DEMO</span>
      {['FREE','BASIC','PRO','ENTERPRISE'].map(p=>(<button key={p} onClick={()=>setDemoPlan(p)} style={{padding:"2px 8px",borderRadius:4,border:demoPlan===p?"none":`1px solid ${LT.border}`,fontSize:13,fontWeight:demoPlan===p?700:400,
        background:demoPlan===p?'#111':`transparent`,color:demoPlan===p?"#fff":LT.textDim,cursor:"pointer"}}>{p}</button>))}
    </div>
    {tab==='overview'&&<>
      {/* 국가 헤더 — 글로벌 국가 선택 시 */}
      {!isKorea&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"12px 16px",background:LT.surface,borderRadius:LT.cardRadius,border:`1px solid ${LT.border}`}}>
        <span style={{fontSize:24}}>{countryInfo?.flag||'🌍'}</span>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:LT.text}}>{countryInfo?.name?.[L]||countryInfo?.name?.en||iso3}</div>
          <div style={{fontSize:13,color:LT.textDim}}>{iso3} · {countryInfo?.gaugeCount||20} {t('gaugesLabel',L)} · {apiStatus==='live'?'LIVE':'DEMO'}</div>
        </div>
        <button onClick={()=>onNav('dashboard')} style={{marginLeft:"auto",padding:"6px 12px",borderRadius:6,border:`1px solid ${LT.border}`,background:"transparent",color:LT.textDim,fontSize:12,cursor:"pointer"}}>🇰🇷 {t('backToKR',L)||'한국으로'}</button>
      </div>}
      {/* 도시 컨텍스트 — CountryMap에서 도시 클릭 시 */}
      {city&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"10px 16px",background:`${LT.accent}08`,borderRadius:LT.cardRadius,border:`1px solid ${LT.accent}20`}}>
        <span style={{fontSize:16}}>📍</span>
        <span style={{fontSize:15,fontWeight:700,color:LT.text}}>{city}</span>
        <span style={{fontSize:12,color:LT.textDim}}>· {t('cnt_'+iso3,L)||iso3}</span>
        <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:`${LT.warn}15`,color:LT.warn,fontWeight:600,marginLeft:"auto"}}>{t('cmCityComingSoon',L)||'Coming Soon'}</span>
      </div>}
      {/* Score + State + Radar */}
      <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={{background:LT.surface,boxShadow:'0 1px 3px rgba(0,0,0,.08)',borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`}}>
          <div style={{fontSize:16,color:LT.textDim}}>{t('dateLabel',L)}</div>
          <div style={{display:"flex",alignItems:"baseline",gap:4,marginTop:8}}>
            <span className="score-big" style={{fontSize:42,fontWeight:900,color:scoreColor,fontFamily:"monospace"}}>{compositeScore}</span>
            <span style={{fontSize:16,color:LT.textDim}}>/ 100</span>
          </div>
          <div style={{display:"flex",gap:16,marginTop:12}}>
            {[[t('good',L),good,LT.good],[t('caution',L),caution,LT.warn],[t('alert',L),alertCnt,LT.danger]].map(([l,c,col])=>(<div key={l}><span style={{fontSize:20,fontWeight:800,color:col,fontFamily:"monospace"}}>{c}</span><span style={{fontSize:16,color:LT.textDim,marginLeft:3}}>{l}</span></div>))}
          </div>
          <div style={{marginTop:12}}><StateIndicator lang={L}/></div>
        </div>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:12,border:`1px solid ${LT.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <RadarChart lang={L}/>
        </div>
      </div>
      {/* Dual Lock + Delta */}
      <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <DualLockIndicator lang={L}/>
        <DeltaAnalysis lang={L}/>
      </div>
      {/* Key Actions */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,marginBottom:16,border:`1px solid ${LT.border}`}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>{t('keyActions',L)}</div>
        {(t('actions',L)||[]).map((txt,i)=>(<div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}><span style={{width:22,height:22,borderRadius:11,background:i===4?LT.danger:i===0?LT.good:LT.warn,color:"#fff",fontSize:16,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span><span style={{fontSize:15,color:LT.text,lineHeight:1.6}}>{txt}</span></div>))}
      </div>
      {/* Verdict */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,marginBottom:16,border:`1px solid ${LT.border}`}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:10}}>{t('verdictTitle',L)}</div>
        <div style={{fontSize:15,color:LT.textMid,lineHeight:2}}>{t('verdictText',L)}</div>
      </div>
      {/* Satellite summary */}
      <div style={{background:LT.surface,boxShadow:'0 1px 3px rgba(0,0,0,.06)',borderRadius:LT.cardRadius,padding:20,marginBottom:16,border:`1px solid ${LT.border}`}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:10}}>{t('satTimeline',L)}</div>
        <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:LT.bg2,borderRadius:8,padding:12,border:`1px solid ${LT.border}`}}><div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:4}}>{t("satVerify",L)}</div><div style={{fontSize:16,color:LT.textMid,lineHeight:1.7}}>{t("satVerifyDesc",L)}</div></div>
          <div style={{background:LT.bg2,borderRadius:8,padding:12,border:`1px solid ${LT.border}`}}><div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:4}}>{t("satPredict",L)}</div><div style={{fontSize:16,color:LT.textMid,lineHeight:1.7}}>{t("satPredictDesc",L)}</div></div>
        </div>
      </div>
      {/* 9 Systems */}
      <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>{t("nineSystems",L)}</div>
      <div className="grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        {Object.entries(SYS).map(([k,s])=>{const col=gc(s.g);const alertKeys=s.keys.filter(gk=>gaugeData[gk]?.g==='경보');return(<div key={k} onClick={()=>setTab('report')} style={{background:LT.surface,boxShadow:'0 1px 2px rgba(0,0,0,.05)',borderRadius:8,padding:"12px 10px",border:`1px solid ${LT.border}`,cursor:"pointer",transition:"box-shadow .15s"}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.1)'} onMouseLeave={e=>e.currentTarget.style.boxShadow='0 1px 2px rgba(0,0,0,.05)'}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:16}}>{s.icon}</span><div style={{width:28,height:28,borderRadius:14,background:`conic-gradient(${col} ${s.sc}%, ${LT.border} ${s.sc}%)`,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:20,height:20,borderRadius:10,background:LT.bg2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:col}}>{s.sc}</div></div></div>
          <div style={{fontSize:15,fontWeight:700,color:LT.text,marginTop:4}}>{sysN(k,L)}</div>
          <div style={{fontSize:14,color:LT.textDim}}>{sysB(k,L)} · {s.keys.length} {t('gaugesLabel',L)}</div>
          {alertKeys.length>0&&<div style={{fontSize:13,color:LT.danger,fontWeight:600,marginTop:4}}>⚠ {alertKeys.length}{t('alertsDetected',L)}</div>}
        </div>);})}
      </div>
    </>}
    {tab==='report'&&<>
      <div style={{marginBottom:16}}><div style={{fontSize:18,fontWeight:800,color:LT.text}}>{t("gaugeDetail",L)}</div><div style={{fontSize:16,color:LT.textMid,marginTop:4}}>{t("gaugeDetailSub",L)}</div></div>
      {Object.entries(SYS).map(([k,sys])=>{
        const needsTier=!TIER_ACCESS[demoUser?.plan||'FREE']?.systems?.includes(k);
        const reqTier=k==='A1'?'FREE':['A2','A3'].includes(k)?'BASIC':'PRO';
        return needsTier?
          <TierLock key={k} plan={demoUser?.plan} req={reqTier} lang={L}>
            <SystemSection sysKey={k} sys={sys} expanded={expanded} toggle={toggle} lang={L} liveSat={satData}/>
          </TierLock>:
          <SystemSection key={k} sysKey={k} sys={sys} expanded={expanded} toggle={toggle} lang={L} liveSat={satData}/>;
      })}
    </>}
    {tab==='satellite'&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:18,fontWeight:800,color:LT.text}}>{t("satStatus",L)}</div>
        {satMeta&&<span style={{fontSize:12,padding:"3px 10px",borderRadius:10,background:satMeta.status==='COLLECTED'?`${LT.good}15`:satMeta.status==='PARTIAL'?`${LT.warn}15`:LT.bg3,color:satMeta.status==='COLLECTED'?LT.good:satMeta.status==='PARTIAL'?LT.warn:LT.textDim,fontWeight:600}}>{satMeta.status==='COLLECTED'?'🟢 LIVE':satMeta.status==='PARTIAL'?'🟡 PARTIAL':'⚪ DEMO'}{satMeta.last_success_asof?' · '+satMeta.last_success_asof.slice(5,16):''}</span>}
        {!satMeta&&<span style={{fontSize:12,padding:"3px 10px",borderRadius:10,background:LT.bg3,color:LT.textDim,fontWeight:600}}>⚪ DEMO</span>}
      </div>
      {/* 위성 실데이터 카드 (S2 + R6) */}
      {satData&&(satData.S2||satData.R6)&&<div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {satData.S2&&satData.S2.status==='OK'&&<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.good}30`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:15,fontWeight:700,color:LT.text}}>🌙 {t('satS2Name',L)||'야간광량'}</span>
            <span style={{fontSize:11,padding:"2px 6px",borderRadius:4,background:`${LT.good}15`,color:LT.good,fontWeight:600}}>VIIRS DNB</span>
          </div>
          <div style={{fontSize:26,fontWeight:900,color:LT.text,fontFamily:"monospace"}}>{satData.S2.value}<span style={{fontSize:14,color:LT.textDim,marginLeft:4}}>{satData.S2.unit}</span></div>
          <div style={{display:"flex",gap:12,marginTop:8,fontSize:13,color:LT.textMid}}>
            {satData.S2.mean_7d!=null&&<span>7d: {satData.S2.mean_7d}</span>}
            {satData.S2.mean_60d!=null&&<span>60d: {satData.S2.mean_60d}</span>}
            {satData.S2.baseline_365d!=null&&<span>365d: {satData.S2.baseline_365d}</span>}
          </div>
          {satData.S2.anomaly!=null&&<div style={{marginTop:6,fontSize:13,fontWeight:700,color:satData.S2.anomaly>=0?LT.good:LT.danger}}>
            {satData.S2.anomaly>=0?'▲':'▼'} {(satData.S2.anomaly*100).toFixed(2)}% vs 365d baseline
          </div>}
        </div>}
        {satData.R6&&satData.R6.status==='OK'&&<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.warn}30`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:15,fontWeight:700,color:LT.text}}>🌡️ {t('satR6Name',L)||'도시열섬'}</span>
            <span style={{fontSize:11,padding:"2px 6px",borderRadius:4,background:`${LT.warn}15`,color:LT.warn,fontWeight:600}}>Landsat-9</span>
          </div>
          <div style={{fontSize:26,fontWeight:900,color:LT.text,fontFamily:"monospace"}}>{satData.R6.value}<span style={{fontSize:14,color:LT.textDim,marginLeft:4}}>{satData.R6.unit}</span></div>
          <div style={{fontSize:13,color:LT.textMid,marginTop:8}}>{satData.R6.date} · {satData.R6.region}</div>
        </div>}
      </div>}
      {/* 기존 게이지 기반 위성 데이터 */}
      <TierLock plan={demoUser?.plan} req="PRO" lang={L}>
      <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {Object.values(gaugeData).filter(g=>isSat(g.c)).map(g=>{const s=SAT_META[g.c];return(<div key={g.c} style={{background:LT.surface,boxShadow:'0 1px 3px rgba(0,0,0,.06)',borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}><div style={{fontSize:16,fontWeight:700,color:LT.text}}>{s.icon} {gN(g.c,L)}</div><div style={{fontSize:15,color:LT.textMid}}>{s.sat} · {s.freq}</div><div style={{fontSize:22,fontWeight:800,color:LT.text,marginTop:8,fontFamily:"monospace"}}>{g.v}<span style={{fontSize:16,color:LT.textDim,marginLeft:3}}>{g.u}</span></div><div style={{fontSize:16,color:LT.textMid,marginTop:4}}>{g.note}</div></div>);})}
      </div>
      </TierLock>
      {/* ═══ 위성 교차검증 — 경제지표↔위성 연결 ═══ */}
      <div style={{marginTop:16,marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:10}}>🔗 {t('satCrossTitle',L)||'위성 교차검증'}</div>
        <div style={{fontSize:14,color:LT.textMid,marginBottom:12}}>{t('satCrossDesc',L)||'경제지표와 위성 데이터의 상관관계를 검증합니다'}</div>
        {Object.values(gaugeData).filter(g=>!isSat(g.c)&&SAT_XREF[g.c]).slice(0,4).map(g=>(
          <SatXrefBanner key={g.c} code={g.c} lang={L}/>
        ))}
      </div>
      {/* ═══ 위성 Before/After 비교 ═══ */}
      {satData&&satData.S2&&satData.S2.status==='OK'&&<div style={{marginTop:16,marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:10}}>📸 {t('satCompareTitle',L)||'위성 촬영 비교'}</div>
        <SatCompare
          before={{date:satData.S2.date?new Date(new Date(satData.S2.date).getTime()-30*86400000).toISOString().slice(0,10):'30일 전',val:satData.S2.baseline_365d||satData.S2.mean_60d||0}}
          after={{date:satData.S2.date||'최신',val:satData.S2.value||0}}
          sensor="VIIRS DNB" product={t('satS2Name',L)||'야간광량'}
          coord="37.5°N 127.0°E" radius="50km" unit={satData.S2.unit||'nW/cm²/sr'}
        />
      </div>}
      {/* Stock 연결 */}
      <div onClick={()=>onNav('stock')} style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}
        onMouseEnter={e=>e.currentTarget.style.background=LT.bg2} onMouseLeave={e=>e.currentTarget.style.background=LT.surface}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:LT.text}}>📈 {t('satToStock',L)}</div>
          <div style={{fontSize:15,color:LT.textMid,marginTop:2}}>{t('satToStockDesc',L)}</div>
        </div>
        <span style={{fontSize:20,color:LT.textDim}}>→</span>
      </div>
    </>}
    {tab==='alerts'&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:18,fontWeight:800,color:LT.text}}>{t("alertCenter",L)}</div>
        <button onClick={()=>{}} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${LT.border}`,background:"transparent",color:LT.textDim,fontSize:14,cursor:"pointer"}}>{t('markAllRead',L)}</button>
      </div>
      {/* Filter pills */}
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {[
          {id:'all',label:t('filterAll',L),cnt:6},
          {id:'alert',label:t('alert',L),cnt:3,c:LT.danger},
          {id:'caution',label:t('caution',L),cnt:2,c:LT.warn},
          {id:'watch',label:t('stWatch',L),cnt:1,c:LT.info},
        ].map(f=>(<button key={f.id} style={{padding:"5px 12px",borderRadius:16,border:`1px solid ${f.c||LT.border}`,background:`${f.c||LT.textDim}08`,color:f.c||LT.text,fontSize:14,fontWeight:600,cursor:"pointer"}}>{f.label} {f.cnt}</button>))}
      </div>
      <TierLock plan={demoUser?.plan} req="BASIC" lang={L}>
      {[
        {t:t('alert',L),c:LT.danger,g:"D1",m:t('alertD1',L),d:"2026-01-15",read:false},
        {t:t('alert',L),c:LT.danger,g:"D3",m:t('alertD3',L),d:"2026-01-15",read:false},
        {t:t('alert',L),c:LT.danger,g:"L3",m:t('alertL3',L),d:"2026-01-12",read:false},
        {t:t('caution',L),c:LT.warn,g:"R2",m:t('alertR2',L),d:"2026-01-10",read:true},
        {t:t('caution',L),c:LT.warn,g:"C2",m:t('alertC2',L),d:"2026-01-08",read:true},
        {t:t('stWatch',L),c:LT.info,g:"I4",m:t('alertI4',L),d:"2026-01-05",read:true},
      ].map((a,i)=>(<div key={i} style={{background:a.read?LT.surface:LT.bg2,borderRadius:LT.smRadius,padding:"14px 16px",border:`1px solid ${a.read?LT.border:a.c+'30'}`,marginBottom:8,display:"flex",gap:12,alignItems:"flex-start"}}>
        <span style={{width:8,height:8,borderRadius:4,background:a.c,marginTop:6,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:15,fontWeight:a.read?500:700,color:a.c}}>{a.t} · {a.g}</span>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {!a.read&&<span style={{width:6,height:6,borderRadius:3,background:LT.accent}}/>}
              <span style={{fontSize:14,color:LT.textDim}}>{a.d}</span>
            </div>
          </div>
          <div style={{fontSize:15,color:a.read?LT.textDim:LT.text,lineHeight:1.5}}>{a.m}</div>
        </div>
      </div>))}
      </TierLock>
    </>}
  </div>);
}

// ═══ 마이페이지 ═══

export default DashboardPage;
