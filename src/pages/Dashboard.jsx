import { useState, useEffect } from 'react';
import T, { L as LT } from '../theme';
import { t, gc } from '../i18n';
import { RadarChart, DualLockIndicator, StateIndicator, DeltaAnalysis } from '../components/Charts';
import { GaugeRow, SystemSection } from '../components/Gauges';
import TierLock, { SYS, D, sysN, sysB, isSat, SAT_META, gN, SAT_XREF, TP } from '../components/TierLock';
import { TIER_ACCESS } from '../data/gauges';
import { SatXrefBanner, SatCompare, SatEvidencePanel } from '../components/Satellite';
import GlobalPulse from '../components/GlobalPulse';
import * as API from '../api';

// ── [Phase 1] 혼용 봉인 가드 + 엔티티 변환기 ──

/** 혼용 봉인 자동 안전장치 — datasetId=GLOBAL인데 한국 D 키와 겹치면 경고 */
function assertNoMix(entityInfo, isKorea) {
  if (!isKorea && entityInfo?.datasetId === 'GLOBAL') {
    const globalKeys = Object.keys(entityInfo.gauges || {});
    const koreaKeys = Object.keys(D);
    const overlap = globalKeys.filter(k => koreaKeys.includes(k));
    if (overlap.length > 0) {
      console.error('[DIAH-7M] 혼용 감지! 글로벌 키가 한국 D에 존재:', overlap);
    }
  }
}

/** 서버 응답 → 프론트 렌더링 데이터 변환 (모든 엔티티 공용) */
function buildEntityData(entityInfo, lang) {
  const L = lang || 'ko';
  const gaugeData = {};
  const sysData = {};

  // 1) gauges → 프론트 GaugeRow 형식
  for (const [gId, g] of Object.entries(entityInfo.gauges || {})) {
    if (g.value == null) continue;
    const v = g.value;
    // 상태 판정: 서버 thresholds 있으면 신뢰, 없으면 프론트 임시
    let grade;
    if (g.thresholds) {
      const { good: gd, warn: wn, alarm: al } = g.thresholds;
      grade = v >= al ? '경보' : v >= wn ? '주의' : '양호';
    } else {
      const absV = Math.abs(v);
      grade = absV > 10 ? '경보' : absV > 5 ? '주의' : '양호';
    }
    gaugeData[gId] = {
      c: gId,
      n: g.name?.[L] || g.name?.en || gId,
      s: g.axis,
      u: g.unit || '',
      v,
      p: g.history?.[1]?.value ?? v,
      ch: v >= 0 ? `+${v.toFixed?.(1) ?? v}` : `${v.toFixed?.(1) ?? v}`,
      g: grade,
      note: `${g.provider || ''} ${g.date || ''}`.trim(),
      t: null,
      m: null,
      act: [],
      bs: null,
      _live: true,
      _global: true,
    };
  }

  // 2) axes → 프론트 SYS 형식
  const axesSource = entityInfo.axes || reverseAxesFromGauges(entityInfo.gauges);

  for (const [axId, ax] of Object.entries(axesSource)) {
    const keys = (ax.keys || ax.gauges || []).filter(k => gaugeData[k]);
    if (keys.length === 0) continue;
    const scores = keys.map(k => gaugeData[k].g === '양호' ? 100 : gaugeData[k].g === '주의' ? 50 : 0);
    const sc = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const g = sc >= 70 ? '양호' : sc >= 40 ? '주의' : '경보';
    sysData[axId] = {
      tK: ax.tierKey || axId,
      name: ax.name,
      icon: ax.icon || '📊',
      color: ax.color || '#888',
      g,
      sc,
      keys,
    };
  }

  return { gaugeData, sysData };
}

/** 폴백: 구버전 서버 (axes 필드 없을 때) */
function reverseAxesFromGauges(gauges) {
  const axMap = {};
  for (const [gId, g] of Object.entries(gauges || {})) {
    if (!g.axis) continue;
    if (!axMap[g.axis]) axMap[g.axis] = { keys: [] };
    axMap[g.axis].keys.push(gId);
  }
  return axMap;
}

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

// ── 실데이터 ↔ 데모 머지 (한국 전용): API 값이 있으면 덮어쓰기, 없으면 데모 유지 ──
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
  const [worldData,setWorldData]=useState(null); // 세계경제 펄스 (world score + 대륙)
  const [commoditiesData,setCommoditiesData]=useState(null); // 32개 공통지표
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

  // ── 세계경제 펄스 데이터 (탭 전환 시 재요청 방지 — 한 번 로드 후 캐시)
  useEffect(()=>{
    if (worldData || commoditiesData) return; // 이미 로드됨 → skip
    let cancelled = false;
    (async()=>{
      const [wRes, cRes] = await Promise.allSettled([
        API.globalWorld(),
        API.globalCommodities(),
      ]);
      if (cancelled) return;
      if (wRes.status === 'fulfilled' && wRes.value) setWorldData(wRes.value);
      if (cRes.status === 'fulfilled' && cRes.value) setCommoditiesData(cRes.value);
    })();
    return () => { cancelled = true; };
  },[]); // eslint-disable-line react-hooks/exhaustive-deps

  // ★ datasetId 봉인: GLOBAL 데이터는 한국 D와 절대 병합하지 않음
  const isGlobalMode = !isKorea && countryInfo?.gauges;
  if (isGlobalMode) assertNoMix(countryInfo, isKorea);

  const { gaugeData: globalGD, sysData: globalSys } =
    isGlobalMode ? buildEntityData(countryInfo, L) : {};

  const gaugeData = isGlobalMode ? globalGD
    : (liveData?.gauges ? mergeGaugeData(D, liveData.gauges) : D);
  const activeSys = isGlobalMode ? globalSys : SYS;

  const allG=Object.values(gaugeData);
  const good=allG.filter(g=>g.g==="양호").length,caution=allG.filter(g=>g.g==="주의").length,alertCnt=allG.filter(g=>g.g==="경보").length;
  const totalG=allG.length||1;
  const rawScore=((good*100+caution*50+alertCnt*0)/totalG);

  // ★ 커버리지 기반 점수 감쇠 (coverage < 70% → 예비 판정)
  const coveragePct = countryInfo?.gaugeCount && countryInfo?.totalGauges
    ? Math.round(countryInfo.gaugeCount / countryInfo.totalGauges * 100) : 100;
  const isPreliminary = isGlobalMode && coveragePct < 70;
  const confidence = Math.min(1, coveragePct / 70);
  const compositeScore = isGlobalMode
    ? (rawScore * confidence).toFixed(1)
    : rawScore.toFixed(1);
  const scoreColor=compositeScore>=70?LT.good:compositeScore>=40?LT.warn:LT.danger;

  // ★ 글로벌 모드: 위성 탭 숨김
  const tabs=[
    {id:'overview',label:t('overview',L)},
    {id:'report',label:t('gaugeTab',L)},
    ...(!isGlobalMode ? [{id:'satellite',label:t('satTab',L)}] : []),
    {id:'alerts',label:t('alertTab',L)+(alertCnt>0?` (${alertCnt})`:'')}
  ];
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
  return(<div style={{maxWidth:780,margin:"0 auto",padding:`${LT.sp['3xl']}px ${LT.sp['2xl']}px`}}>
    {/* Country Selector + Data Freshness */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:LT.sp.xl}}>
      <div style={{position:"relative"}}>
        <button onClick={()=>setShowCountryPicker(p=>!p)} style={{display:"flex",alignItems:"center",gap:LT.sp.sm,padding:`${LT.sp.sm}px ${LT.sp.xl}px`,borderRadius:LT.sp.md,border:`1px solid ${LT.border}`,background:LT.surface,cursor:"pointer",fontSize:LT.fs.lg}}>
          <span>{curFlag}</span>
          <span style={{fontWeight:LT.fw.bold,color:LT.text}}>{t('cnt_'+iso3,L)||iso3}</span>
          <span style={{color:LT.textDim,fontSize:LT.fs.sm}}>▼</span>
        </button>
        {showCountryPicker&&<div style={{position:"absolute",top:"100%",left:0,marginTop:LT.sp.xs,background:LT.surface,border:`1px solid ${LT.border}`,borderRadius:LT.sp.lg,boxShadow:"0 8px 24px rgba(0,0,0,.12)",zIndex:100,maxHeight:320,overflowY:"auto",width:280,padding:LT.sp.md}}>
          {COUNTRIES.map(c=>(<button key={c.iso} onClick={()=>{onNav('dashboard',{country:c.iso});setShowCountryPicker(false);}} style={{display:"flex",alignItems:"center",gap:LT.sp.md,width:"100%",padding:`${LT.sp.md}px ${LT.sp.lg}px`,borderRadius:LT.sp.sm,border:"none",background:c.iso===iso3?LT.bg3:"transparent",color:LT.text,fontSize:LT.fs.md,cursor:"pointer",textAlign:"left"}}>
            <span>{c.flag}</span>
            <span style={{fontWeight:c.iso===iso3?LT.fw.bold:LT.fw.normal}}>{t('cnt_'+c.iso,L)||c.iso}</span>
            {c.iso===iso3&&<span style={{marginLeft:"auto",color:LT.good,fontWeight:LT.fw.bold}}>✓</span>}
          </button>))}
        </div>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:LT.sp.md}}>
        <span style={{fontSize:LT.fs.sm,color:LT.textDim}}>{t('lastUpdate',L)} {dataInfo?.lastUpdated?new Date(dataInfo.lastUpdated).toLocaleDateString():'2026.01.15'}</span>
        <span style={{fontSize:LT.fs.sm,color:apiStatus==='live'?LT.good:LT.warn,fontWeight:LT.fw.semi}}>{apiStatus==='live'?'● LIVE':'● DEMO'}</span>
      </div>
    </div>
    {/* Onboarding Banner */}
    {showOnboard&&<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:LT.sp['3xl'],border:`1px solid ${LT.border}`,marginBottom:LT.sp['2xl'],position:"relative"}}>
      <button onClick={dismissOnboard} style={{position:"absolute",top:LT.sp.lg,right:LT.sp.xl,border:"none",background:"transparent",color:LT.textDim,fontSize:LT.fs['2xl'],cursor:"pointer",padding:LT.sp.xs}}>✕</button>
      <div style={{fontSize:LT.fs['2xl'],fontWeight:LT.fw.extra,color:LT.text,marginBottom:LT.sp.md}}>👋 {t('onboardTitle',L)}</div>
      <div style={{fontSize:LT.fs.lg,color:LT.textMid,lineHeight:1.7,marginBottom:LT.sp.xl}}>{t('onboardDesc',L)}</div>
      <div style={{display:"flex",gap:LT.sp.md,flexWrap:"wrap"}}>
        {[
          {icon:'📊',label:t('onboardStep1',L)},
          {icon:'🛰️',label:t('onboardStep2',L)},
          {icon:'📈',label:t('onboardStep3',L)},
        ].map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:LT.sp.sm,padding:`${LT.sp.sm}px ${LT.sp.xl}px`,borderRadius:LT.sp.sm,background:LT.bg2,border:`1px solid ${LT.border}`}}>
          <span>{s.icon}</span><span style={{fontSize:LT.fs.md,color:LT.text,fontWeight:LT.fw.semi}}>{s.label}</span>
        </div>))}
      </div>
    </div>}
    {/* Level 1: Content Tabs */}
    <div className="tab-scroll" style={{display:"flex",gap:0,marginBottom:LT.sp['3xl'],borderBottom:`1px solid ${LT.border}`,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      {tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:`${LT.sp.xl}px ${LT.sp['2xl']}px`,border:"none",background:"transparent",color:tab===t.id?LT.text:LT.textDim,borderBottom:tab===t.id?`2px solid ${LT.accent}`:'2px solid transparent',fontSize:LT.fs.lg,fontWeight:tab===t.id?LT.fw.bold:LT.fw.medium,cursor:"pointer",whiteSpace:"nowrap",marginBottom:-1,flexShrink:0}}>{t.label}</button>))}
    </div>
    {/* Level 2: Utility — DEMO 스위처 (최소) */}
    <div className="demo-switch" style={{display:"flex",alignItems:"center",gap:LT.sp.xs,marginBottom:LT.sp['2xl'],flexWrap:"wrap"}}>
      <span style={{fontSize:LT.fs.sm,color:LT.textDim}}>DEMO</span>
      {['FREE','BASIC','PRO','ENTERPRISE'].map(p=>(<button key={p} onClick={()=>setDemoPlan(p)} style={{padding:`2px ${LT.sp.md}px`,borderRadius:LT.sp.xs,border:demoPlan===p?"none":`1px solid ${LT.border}`,fontSize:LT.fs.sm,fontWeight:demoPlan===p?LT.fw.bold:LT.fw.normal,
        background:demoPlan===p?LT.btnPrimary:`transparent`,color:demoPlan===p?LT.btnPrimaryText:LT.textDim,cursor:"pointer"}}>{p}</button>))}
    </div>
    {tab==='overview'&&<>
      {/* ── 세계경제 펄스 (공통지표 + 대륙 요약) ── */}
      <GlobalPulse worldData={worldData} commoditiesData={commoditiesData} lang={L}/>
      {/* 국가 헤더 — 글로벌 국가 선택 시 */}
      {!isKorea&&<div style={{display:"flex",alignItems:"center",gap:LT.sp.lg,marginBottom:LT.sp['2xl'],padding:`${LT.sp.xl}px ${LT.sp['2xl']}px`,background:LT.surface,borderRadius:LT.cardRadius,border:`1px solid ${LT.border}`}}>
        <span style={{fontSize:LT.fs['3xl']}}>  {countryInfo?.flag||'🌍'}</span>
        <div>
          <div style={{fontSize:LT.fs['2xl'],fontWeight:LT.fw.extra,color:LT.text}}>{countryInfo?.name?.[L]||countryInfo?.name?.en||iso3}</div>
          <div style={{fontSize:LT.fs.sm,color:LT.textDim}}>{iso3} · {countryInfo?.gaugeCount||0}/{countryInfo?.totalGauges||0} {t('gaugesLabel',L)} · {countryInfo?.coverageRate||''} · {apiStatus==='live'?'LIVE':'DEMO'}</div>
        </div>
        <button onClick={()=>onNav('dashboard')} style={{marginLeft:"auto",padding:`${LT.sp.sm}px ${LT.sp.xl}px`,borderRadius:LT.sp.sm,border:`1px solid ${LT.border}`,background:"transparent",color:LT.textDim,fontSize:LT.fs.sm,cursor:"pointer"}}>🇰🇷 {t('backToKR',L)||'한국으로'}</button>
      </div>}
      {/* ★ 커버리지 배너 + 예비 판정 경고 */}
      {isGlobalMode&&<div style={{background:isPreliminary?`${LT.warn}10`:LT.bg2,borderRadius:LT.smRadius,padding:`${LT.sp.lg}px ${LT.sp['2xl']}px`,marginBottom:LT.sp.xl,border:`1px solid ${isPreliminary?LT.warn+'30':LT.border}`,display:"flex",alignItems:"center",gap:LT.sp.md,flexWrap:"wrap"}}>
        <span style={{fontSize:LT.fs.md}}>🌍</span>
        <span style={{fontSize:LT.fs.sm,color:LT.textMid,fontWeight:LT.fw.semi}}>{countryInfo?.gaugeCount||0}/{countryInfo?.totalGauges||0} {t('globalCoverage',L)||'데이터 커버리지'} · {countryInfo?.coverageRate||'0%'}</span>
        {isPreliminary&&<span style={{fontSize:LT.fs.sm,color:LT.warn,fontWeight:LT.fw.bold,marginLeft:"auto"}}>⚠ {coveragePct}% {t('globalCoverage',L)||'커버리지'} — 예비 판정</span>}
      </div>}
      {/* 도시 컨텍스트 — CountryMap에서 도시 클릭 시 */}
      {city&&<div style={{display:"flex",alignItems:"center",gap:LT.sp.md,marginBottom:LT.sp.xl,padding:`${LT.sp.lg}px ${LT.sp['2xl']}px`,background:`${LT.accent}08`,borderRadius:LT.cardRadius,border:`1px solid ${LT.accent}20`}}>
        <span style={{fontSize:LT.fs.xl}}>📍</span>
        <span style={{fontSize:LT.fs.lg,fontWeight:LT.fw.bold,color:LT.text}}>{city}</span>
        <span style={{fontSize:LT.fs.sm,color:LT.textDim}}>· {t('cnt_'+iso3,L)||iso3}</span>
        <span style={{fontSize:LT.fs.xs,padding:`2px ${LT.sp.md}px`,borderRadius:LT.sp.lg,background:`${LT.warn}15`,color:LT.warn,fontWeight:LT.fw.semi,marginLeft:"auto"}}>{t('cmCityComingSoon',L)||'Coming Soon'}</span>
      </div>}
      {/* Score + State + Radar */}
      <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:LT.sp.xl,marginBottom:LT.sp['2xl']}}>
        <div style={{background:LT.surface,boxShadow:LT.cardShadow,borderRadius:LT.cardRadius,padding:LT.sp['3xl'],border:`1px solid ${LT.border}`}}>
          <div style={{fontSize:LT.fs.xl,color:LT.textDim}}>2026.02 · {t('cnt_'+iso3,L)||iso3}</div>
          <div style={{display:"flex",alignItems:"baseline",gap:LT.sp.xs,marginTop:LT.sp.md}}>
            <span className="score-big" style={{fontSize:LT.fs['4xl'],fontWeight:LT.fw.black,color:scoreColor,fontFamily:"monospace"}}>{compositeScore}</span>
            <span style={{fontSize:LT.fs.xl,color:LT.textDim}}>/ 100</span>
            {isPreliminary&&<span style={{fontSize:LT.fs.sm,color:LT.warn,fontWeight:LT.fw.bold,padding:`2px ${LT.sp.sm}px`,borderRadius:LT.sp.xs,background:`${LT.warn}10`,marginLeft:LT.sp.xs}}>예비</span>}
          </div>
          <div style={{display:"flex",gap:LT.sp['2xl'],marginTop:LT.sp.xl}}>
            {[[t('good',L),good,LT.good],[t('caution',L),caution,LT.warn],[t('alert',L),alertCnt,LT.danger]].map(([l,c,col])=>(<div key={l}><span style={{fontSize:LT.fs['2xl'],fontWeight:LT.fw.extra,color:col,fontFamily:"monospace"}}>{c}</span><span style={{fontSize:LT.fs.xl,color:LT.textDim,marginLeft:3}}>{l}</span></div>))}
          </div>
          <div style={{marginTop:LT.sp.xl}}><StateIndicator lang={L}/></div>
        </div>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:LT.sp.xl,border:`1px solid ${LT.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <RadarChart lang={L} sysData={activeSys}/>
        </div>
      </div>
      {/* Dual Lock + Delta */}
      <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:LT.sp.xl,marginBottom:LT.sp['2xl']}}>
        <DualLockIndicator lang={L}/>
        <DeltaAnalysis lang={L}/>
      </div>
      {/* Key Actions */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:LT.sp['3xl'],marginBottom:LT.sp['2xl'],border:`1px solid ${LT.border}`}}>
        <div style={{fontSize:LT.fs.xl,fontWeight:LT.fw.bold,color:LT.text,marginBottom:LT.sp.xl}}>{t('keyActions',L)}</div>
        {(t('actions',L)||[]).map((txt,i)=>(<div key={i} style={{display:"flex",gap:LT.sp.lg,alignItems:"flex-start",marginBottom:LT.sp.md}}><span style={{width:22,height:22,borderRadius:11,background:i===4?LT.danger:i===0?LT.good:LT.warn,color:"#fff",fontSize:LT.fs.xl,fontWeight:LT.fw.extra,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</span><span style={{fontSize:LT.fs.lg,color:LT.text,lineHeight:1.6}}>{txt}</span></div>))}
      </div>
      {/* Verdict */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:LT.sp['3xl'],marginBottom:LT.sp['2xl'],border:`1px solid ${LT.border}`}}>
        <div style={{fontSize:LT.fs.xl,fontWeight:LT.fw.bold,color:LT.text,marginBottom:LT.sp.lg}}>{t('verdictTitle',L)}</div>
        <div style={{fontSize:LT.fs.lg,color:LT.textMid,lineHeight:2}}>{t('verdictText',L)}</div>
      </div>
      {/* Satellite summary */}
      <div style={{background:LT.surface,boxShadow:LT.cardShadow,borderRadius:LT.cardRadius,padding:LT.sp['3xl'],marginBottom:LT.sp['2xl'],border:`1px solid ${LT.border}`}}>
        <div style={{fontSize:LT.fs.xl,fontWeight:LT.fw.bold,color:LT.text,marginBottom:LT.sp.lg}}>{t('satTimeline',L)}</div>
        <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:LT.sp.lg}}>
          <div style={{background:LT.bg2,borderRadius:LT.smRadius,padding:LT.sp.xl,border:`1px solid ${LT.border}`}}><div style={{fontSize:LT.fs.xl,fontWeight:LT.fw.bold,color:LT.text,marginBottom:LT.sp.xs}}>{t("satVerify",L)}</div><div style={{fontSize:LT.fs.xl,color:LT.textMid,lineHeight:1.7}}>{t("satVerifyDesc",L)}</div></div>
          <div style={{background:LT.bg2,borderRadius:LT.smRadius,padding:LT.sp.xl,border:`1px solid ${LT.border}`}}><div style={{fontSize:LT.fs.xl,fontWeight:LT.fw.bold,color:LT.text,marginBottom:LT.sp.xs}}>{t("satPredict",L)}</div><div style={{fontSize:LT.fs.xl,color:LT.textMid,lineHeight:1.7}}>{t("satPredictDesc",L)}</div></div>
        </div>
      </div>
      {/* 9 Systems */}
      <div style={{fontSize:LT.fs.xl,fontWeight:LT.fw.bold,color:LT.text,marginBottom:LT.sp.xl}}>{t("nineSystems",L)}</div>
      <div className="grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:LT.sp.md}}>
        {Object.entries(activeSys).map(([k,s])=>{const col=gc(s.g);const alertKeys=s.keys.filter(gk=>gaugeData[gk]?.g==='경보');const sName=s.name?.[L]||s.name?.en||sysN(k,L);const sBrief=s.name?'':sysB(k,L);return(<div key={k} onClick={()=>setTab('report')} style={{background:LT.surface,boxShadow:LT.cardShadow,borderRadius:LT.smRadius,padding:`${LT.sp.xl}px ${LT.sp.lg}px`,border:`1px solid ${LT.border}`,cursor:"pointer",transition:"box-shadow .15s"}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow=LT.cardShadowHover} onMouseLeave={e=>e.currentTarget.style.boxShadow=LT.cardShadow}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:LT.fs.xl}}>{s.icon}</span><div style={{width:28,height:28,borderRadius:14,background:`conic-gradient(${col} ${s.sc}%, ${LT.border} ${s.sc}%)`,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:20,height:20,borderRadius:10,background:LT.bg2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:LT.fs.lg,fontWeight:LT.fw.extra,color:col}}>{s.sc}</div></div></div>
          <div style={{fontSize:LT.fs.lg,fontWeight:LT.fw.bold,color:LT.text,marginTop:LT.sp.xs}}>{sName}</div>
          <div style={{fontSize:LT.fs.md,color:LT.textDim}}>{sBrief}{sBrief?' · ':''}{s.keys.length} {t('gaugesLabel',L)}</div>
          {alertKeys.length>0&&<div style={{fontSize:LT.fs.sm,color:LT.danger,fontWeight:LT.fw.semi,marginTop:LT.sp.xs}}>⚠ {alertKeys.length}{t('alertsDetected',L)}</div>}
        </div>);})}
      </div>
    </>}
    {tab==='report'&&<>
      <div style={{marginBottom:LT.sp['2xl']}}><div style={{fontSize:LT.fs['2xl'],fontWeight:LT.fw.extra,color:LT.text}}>{t("gaugeDetail",L)}</div><div style={{fontSize:LT.fs.xl,color:LT.textMid,marginTop:LT.sp.xs}}>{t("gaugeDetailSub",L)}</div></div>
      {Object.entries(activeSys).map(([k,sys])=>{
        const tierKey = sys.tK || k;
        const needsTier=!TIER_ACCESS[demoUser?.plan||'FREE']?.systems?.includes(tierKey);
        const reqTier=tierKey==='A1'?'FREE':['A2','A3'].includes(tierKey)?'BASIC':'PRO';
        return needsTier?
          <TierLock key={k} plan={demoUser?.plan} req={reqTier} lang={L}>
            <SystemSection sysKey={k} sys={sys} expanded={expanded} toggle={toggle} lang={L} liveSat={satData} gaugeData={isGlobalMode?gaugeData:null} isGlobal={isGlobalMode}/>
          </TierLock>:
          <SystemSection key={k} sysKey={k} sys={sys} expanded={expanded} toggle={toggle} lang={L} liveSat={satData} gaugeData={isGlobalMode?gaugeData:null} isGlobal={isGlobalMode}/>;
      })}
    </>}
    {tab==='satellite'&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:LT.sp['2xl']}}>
        <div style={{fontSize:LT.fs['2xl'],fontWeight:LT.fw.extra,color:LT.text}}>{t("satStatus",L)}</div>
        {satMeta&&<span style={{fontSize:LT.fs.sm,padding:`3px ${LT.sp.lg}px`,borderRadius:LT.sp.lg,background:satMeta.status==='COLLECTED'?`${LT.good}15`:satMeta.status==='PARTIAL'?`${LT.warn}15`:LT.bg3,color:satMeta.status==='COLLECTED'?LT.good:satMeta.status==='PARTIAL'?LT.warn:LT.textDim,fontWeight:LT.fw.semi}}>{satMeta.status==='COLLECTED'?'🟢 LIVE':satMeta.status==='PARTIAL'?'🟡 PARTIAL':'⚪ DEMO'}{satMeta.last_success_asof?' · '+satMeta.last_success_asof.slice(5,16):''}</span>}
        {!satMeta&&<span style={{fontSize:LT.fs.sm,padding:`3px ${LT.sp.lg}px`,borderRadius:LT.sp.lg,background:LT.bg3,color:LT.textDim,fontWeight:LT.fw.semi}}>⚪ DEMO</span>}
      </div>
      {/* 위성 실데이터 카드 (S2 + R6) */}
      {satData&&(satData.S2||satData.R6)&&<div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:LT.sp.lg,marginBottom:LT.sp['2xl']}}>
        {satData.S2&&satData.S2.status==='OK'&&<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:LT.sp['2xl'],border:`1px solid ${LT.good}30`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:LT.sp.md}}>
            <span style={{fontSize:LT.fs.lg,fontWeight:LT.fw.bold,color:LT.text}}>🌙 {t('satS2Name',L)||'야간광량'}</span>
            <span style={{fontSize:LT.fs.xs,padding:`2px ${LT.sp.sm}px`,borderRadius:LT.sp.xs,background:`${LT.good}15`,color:LT.good,fontWeight:LT.fw.semi}}>VIIRS DNB</span>
          </div>
          <div style={{fontSize:LT.fs['3xl'],fontWeight:LT.fw.black,color:LT.text,fontFamily:"monospace"}}>{satData.S2.value}<span style={{fontSize:LT.fs.md,color:LT.textDim,marginLeft:LT.sp.xs}}>{satData.S2.unit}</span></div>
          <div style={{display:"flex",gap:LT.sp.xl,marginTop:LT.sp.md,fontSize:LT.fs.sm,color:LT.textMid}}>
            {satData.S2.mean_7d!=null&&<span>7d: {satData.S2.mean_7d}</span>}
            {satData.S2.mean_60d!=null&&<span>60d: {satData.S2.mean_60d}</span>}
            {satData.S2.baseline_365d!=null&&<span>365d: {satData.S2.baseline_365d}</span>}
          </div>
          {satData.S2.anomaly!=null&&<div style={{marginTop:LT.sp.sm,fontSize:LT.fs.sm,fontWeight:LT.fw.bold,color:satData.S2.anomaly>=0?LT.good:LT.danger}}>
            {satData.S2.anomaly>=0?'▲':'▼'} {(satData.S2.anomaly*100).toFixed(2)}% vs 365d baseline
          </div>}
        </div>}
        {satData.R6&&satData.R6.status==='OK'&&<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:LT.sp['2xl'],border:`1px solid ${LT.warn}30`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:LT.sp.md}}>
            <span style={{fontSize:LT.fs.lg,fontWeight:LT.fw.bold,color:LT.text}}>🌡️ {t('satR6Name',L)||'도시열섬'}</span>
            <span style={{fontSize:LT.fs.xs,padding:`2px ${LT.sp.sm}px`,borderRadius:LT.sp.xs,background:`${LT.warn}15`,color:LT.warn,fontWeight:LT.fw.semi}}>Landsat-9</span>
          </div>
          <div style={{fontSize:LT.fs['3xl'],fontWeight:LT.fw.black,color:LT.text,fontFamily:"monospace"}}>{satData.R6.value}<span style={{fontSize:LT.fs.md,color:LT.textDim,marginLeft:LT.sp.xs}}>{satData.R6.unit}</span></div>
          <div style={{fontSize:LT.fs.sm,color:LT.textMid,marginTop:LT.sp.md}}>{satData.R6.date} · {satData.R6.region}</div>
        </div>}
      </div>}
      {/* 기존 게이지 기반 위성 데이터 */}
      <TierLock plan={demoUser?.plan} req="PRO" lang={L}>
      <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:LT.sp.md,marginBottom:LT.sp['2xl']}}>
        {Object.values(gaugeData).filter(g=>isSat(g.c)).map(g=>{const s=SAT_META[g.c];return(<div key={g.c} style={{background:LT.surface,boxShadow:LT.cardShadow,borderRadius:LT.cardRadius,padding:LT.sp['2xl'],border:`1px solid ${LT.border}`}}><div style={{fontSize:LT.fs.xl,fontWeight:LT.fw.bold,color:LT.text}}>{s.icon} {gN(g.c,L)}</div><div style={{fontSize:LT.fs.lg,color:LT.textMid}}>{s.sat} · {s.freq}</div><div style={{fontSize:LT.fs['2xl'],fontWeight:LT.fw.extra,color:LT.text,marginTop:LT.sp.md,fontFamily:"monospace"}}>{g.v}<span style={{fontSize:LT.fs.xl,color:LT.textDim,marginLeft:3}}>{g.u}</span></div><div style={{fontSize:LT.fs.xl,color:LT.textMid,marginTop:LT.sp.xs}}>{g.note}</div></div>);})}
      </div>
      </TierLock>
      {/* ═══ 위성 교차검증 — 경제지표↔위성 연결 ═══ */}
      <div style={{marginTop:LT.sp['2xl'],marginBottom:LT.sp.xl}}>
        <div style={{fontSize:LT.fs.xl,fontWeight:LT.fw.bold,color:LT.text,marginBottom:LT.sp.lg}}>🔗 {t('satCrossTitle',L)||'위성 교차검증'}</div>
        <div style={{fontSize:LT.fs.md,color:LT.textMid,marginBottom:LT.sp.xl}}>{t('satCrossDesc',L)||'경제지표와 위성 데이터의 상관관계를 검증합니다'}</div>
        {Object.values(gaugeData).filter(g=>!isSat(g.c)&&SAT_XREF[g.c]).slice(0,4).map(g=>(
          <SatXrefBanner key={g.c} code={g.c} lang={L}/>
        ))}
      </div>
      {/* ═══ 위성 Before/After 비교 ═══ */}
      {satData&&satData.S2&&satData.S2.status==='OK'&&<div style={{marginTop:LT.sp['2xl'],marginBottom:LT.sp.xl}}>
        <div style={{fontSize:LT.fs.xl,fontWeight:LT.fw.bold,color:LT.text,marginBottom:LT.sp.lg}}>📸 {t('satCompareTitle',L)||'위성 촬영 비교'}</div>
        <SatCompare
          before={{date:satData.S2.images?.before?.date||(satData.S2.date?new Date(new Date(satData.S2.date).getTime()-30*86400000).toISOString().slice(0,10):'이전'),val:satData.S2.baseline_365d||satData.S2.mean_60d||0,imageUrl:satData.S2.images?.before?.url}}
          after={{date:satData.S2.images?.after?.date||satData.S2.date||'최신',val:satData.S2.value||0,imageUrl:satData.S2.images?.after?.url}}
          sensor="VIIRS DNB" product={t('satS2Name',L)||'야간광량'}
          coord="37.5°N 127.0°E" radius="50km" unit={satData.S2.unit||'nW/cm²/sr'}
          palette={satData.S2.images?.palette} paletteLabels={satData.S2.images?.paletteLabels}
        />
      </div>}
      {/* Landsat R6 이미지 비교 */}
      {satData&&satData.R6&&satData.R6.status==='OK'&&satData.R6.images&&<div style={{marginTop:LT.sp['2xl'],marginBottom:LT.sp.xl}}>
        <div style={{fontSize:LT.fs.xl,fontWeight:LT.fw.bold,color:LT.text,marginBottom:LT.sp.lg}}>🌡️ {t('satR6Name',L)||'도시열섬'} Before / After</div>
        <SatCompare
          before={{date:satData.R6.images?.before?.date||'이전',val:null,imageUrl:satData.R6.images?.before?.url}}
          after={{date:satData.R6.images?.after?.date||satData.R6.date||'최신',val:satData.R6.value||0,imageUrl:satData.R6.images?.after?.url}}
          sensor="Landsat-9" product={t('satR6Name',L)||'도시열섬 (ST_B10)'}
          coord="37.5°N 127.0°E" radius="50km" unit={satData.R6.unit||'°C'}
          palette={satData.R6.images?.palette} paletteLabels={satData.R6.images?.paletteLabels}
        />
      </div>}
      {/* Stock 연결 */}
      <div onClick={()=>onNav('stock')} style={{background:LT.surface,borderRadius:LT.cardRadius,padding:LT.sp['2xl'],border:`1px solid ${LT.border}`,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:LT.sp.md}}
        onMouseEnter={e=>e.currentTarget.style.background=LT.bg2} onMouseLeave={e=>e.currentTarget.style.background=LT.surface}>
        <div>
          <div style={{fontSize:LT.fs.xl,fontWeight:LT.fw.bold,color:LT.text}}>📈 {t('satToStock',L)}</div>
          <div style={{fontSize:LT.fs.lg,color:LT.textMid,marginTop:2}}>{t('satToStockDesc',L)}</div>
        </div>
        <span style={{fontSize:LT.fs['2xl'],color:LT.textDim}}>→</span>
      </div>
    </>}
    {tab==='alerts'&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:LT.sp.xl}}>
        <div style={{fontSize:LT.fs['2xl'],fontWeight:LT.fw.extra,color:LT.text}}>{t("alertCenter",L)}</div>
        <button onClick={()=>{}} style={{padding:`${LT.sp.sm}px ${LT.sp.xl}px`,borderRadius:LT.sp.sm,border:`1px solid ${LT.border}`,background:"transparent",color:LT.textDim,fontSize:LT.fs.md,cursor:"pointer"}}>{t('markAllRead',L)}</button>
      </div>
      {/* Filter pills */}
      <div style={{display:"flex",gap:LT.sp.sm,marginBottom:LT.sp.xl}}>
        {[
          {id:'all',label:t('filterAll',L),cnt:6},
          {id:'alert',label:t('alert',L),cnt:3,c:LT.danger},
          {id:'caution',label:t('caution',L),cnt:2,c:LT.warn},
          {id:'watch',label:t('stWatch',L),cnt:1,c:LT.info},
        ].map(f=>(<button key={f.id} style={{padding:`5px ${LT.sp.xl}px`,borderRadius:LT.sp['2xl'],border:`1px solid ${f.c||LT.border}`,background:`${f.c||LT.textDim}08`,color:f.c||LT.text,fontSize:LT.fs.md,fontWeight:LT.fw.semi,cursor:"pointer"}}>{f.label} {f.cnt}</button>))}
      </div>
      <TierLock plan={demoUser?.plan} req="BASIC" lang={L}>
      {[
        {t:t('alert',L),c:LT.danger,g:"D1",m:t('alertD1',L),d:"2026-01-15",read:false},
        {t:t('alert',L),c:LT.danger,g:"D3",m:t('alertD3',L),d:"2026-01-15",read:false},
        {t:t('alert',L),c:LT.danger,g:"L3",m:t('alertL3',L),d:"2026-01-12",read:false},
        {t:t('caution',L),c:LT.warn,g:"R2",m:t('alertR2',L),d:"2026-01-10",read:true},
        {t:t('caution',L),c:LT.warn,g:"C2",m:t('alertC2',L),d:"2026-01-08",read:true},
        {t:t('stWatch',L),c:LT.info,g:"I4",m:t('alertI4',L),d:"2026-01-05",read:true},
      ].map((a,i)=>(<div key={i} style={{background:a.read?LT.surface:LT.bg2,borderRadius:LT.smRadius,padding:`${LT.sp.md}px ${LT.sp['2xl']}px`,border:`1px solid ${a.read?LT.border:a.c+'30'}`,marginBottom:LT.sp.md,display:"flex",gap:LT.sp.xl,alignItems:"flex-start"}}>
        <span style={{width:8,height:8,borderRadius:4,background:a.c,marginTop:LT.sp.sm,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:LT.sp.xs}}>
            <span style={{fontSize:LT.fs.lg,fontWeight:a.read?LT.fw.medium:LT.fw.bold,color:a.c}}>{a.t} · {a.g}</span>
            <div style={{display:"flex",alignItems:"center",gap:LT.sp.sm}}>
              {!a.read&&<span style={{width:6,height:6,borderRadius:3,background:LT.accent}}/>}
              <span style={{fontSize:LT.fs.md,color:LT.textDim}}>{a.d}</span>
            </div>
          </div>
          <div style={{fontSize:LT.fs.lg,color:a.read?LT.textDim:LT.text,lineHeight:1.5}}>{a.m}</div>
        </div>
      </div>))}
      </TierLock>
    </>}
  </div>);
}

// ═══ 마이페이지 ═══

export default DashboardPage;
