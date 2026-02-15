import { useState, useEffect } from 'react';
import T, { L as LT } from '../theme';
import { t, gc } from '../i18n';
import { RadarChart, DualLockIndicator, StateIndicator, DeltaAnalysis } from '../components/Charts';
import { GaugeRow, SystemSection } from '../components/Gauges';
import TierLock, { SYS, D, sysN, sysB, isSat, SAT_META, gN } from '../components/TierLock';
import { TIER_ACCESS, tierLevel } from '../data/gauges';
import * as API from '../api';

function DashboardPage({user,onNav,lang}){
  const L=lang||'ko';
  const [expanded,setExpanded]=useState({});
  const [tab,setTab]=useState('overview');
  const [demoPlan,setDemoPlan]=useState(user?.plan||'PRO');
  const [apiStatus,setApiStatus]=useState('checking'); // checking|live|demo
  const toggle=k=>setExpanded(p=>({...p,[k]:!p[k]}));

  // API 연결 확인
  useEffect(()=>{
    API.healthCheck()
      .then(()=>setApiStatus('live'))
      .catch(()=>setApiStatus('demo'));
  },[]);

  const allG=Object.values(D);
  const good=allG.filter(g=>g.g==="양호").length,caution=allG.filter(g=>g.g==="주의").length,alertCnt=allG.filter(g=>g.g==="경보").length;
  const tabs=[{id:'overview',label:t('overview',L)},{id:'report',label:t('gaugeTab',L)},{id:'satellite',label:t('satTab',L)},{id:'alerts',label:t('alertTab',L)}];
  const demoUser={...user,plan:demoPlan};
  return(<div style={{maxWidth:780,margin:"0 auto",padding:"20px 16px"}}>
    {/* Connection Status */}
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
      <span style={{fontSize:15,fontWeight:600,padding:"2px 8px",borderRadius:10,
        background:LT.bg2,
        color:apiStatus==='live'?LT.good:apiStatus==='demo'?LT.warn:LT.textDim}}>
        {apiStatus==='live'?'● LIVE':apiStatus==='demo'?'● DEMO':'● ...'}
      </span>
    </div>
    {/* Demo Plan Switcher */}
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,padding:"6px 10px",borderRadius:8,background:LT.bg2,border:`1px solid ${LT.border}`}}>
      <span style={{fontSize:15,color:LT.textDim,fontFamily:"monospace"}}>DEMO</span>
      {['FREE','BASIC','PRO','ENTERPRISE'].map(p=>(<button key={p} onClick={()=>setDemoPlan(p)} style={{padding:"4px 12px",borderRadius:6,border:demoPlan===p?"none":`1px solid ${LT.border}`,fontSize:16,fontWeight:demoPlan===p?700:600,
        background:demoPlan===p?'#111111':`${LT.surface}`,color:demoPlan===p?"#fff":LT.text,cursor:"pointer"}}>{p}</button>))}
    </div>
    <div style={{display:"flex",gap:4,marginBottom:20,overflowX:"auto",paddingBottom:4}}>
      {tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 16px",borderRadius:8,border:"none",background:"transparent",color:tab===t.id?LT.text:LT.textDim,borderBottom:tab===t.id?'2px solid #111':'2px solid transparent',fontSize:15,fontWeight:tab===t.id?700:500,cursor:"pointer",whiteSpace:"nowrap"}}>{t.label}</button>))}
    </div>
    {tab==='overview'&&<>
      {/* Score + State + Radar */}
      <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={{background:LT.surface,boxShadow:'0 1px 3px rgba(0,0,0,.08)',borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`}}>
          <div style={{fontSize:16,color:LT.textDim}}>{t('dateLabel',L)}</div>
          <div style={{display:"flex",alignItems:"baseline",gap:4,marginTop:8}}>
            <span style={{fontSize:42,fontWeight:900,color:LT.good,fontFamily:"monospace"}}>68.5</span>
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
        {Object.entries(SYS).map(([k,s])=>{const col=gc(s.g);return(<div key={k} style={{background:LT.surface,boxShadow:'0 1px 2px rgba(0,0,0,.05)',borderRadius:8,padding:"12px 10px",border:`1px solid ${LT.border}`}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:16}}>{s.icon}</span><div style={{width:28,height:28,borderRadius:14,background:`conic-gradient(${col} ${s.sc}%, ${LT.border} ${s.sc}%)`,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:20,height:20,borderRadius:10,background:LT.bg2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:col}}>{s.sc}</div></div></div><div style={{fontSize:15,fontWeight:700,color:LT.text,marginTop:4}}>{sysN(k,L)}</div><div style={{fontSize:15,color:LT.textDim}}>{sysB(k,L)} · {s.keys.length} {t('gaugesLabel',L)}</div></div>);})}
      </div>
    </>}
    {tab==='report'&&<>
      <div style={{marginBottom:16}}><div style={{fontSize:18,fontWeight:800,color:LT.text}}>{t("gaugeDetail",L)}</div><div style={{fontSize:16,color:LT.textMid,marginTop:4}}>{t("gaugeDetailSub",L)}</div></div>
      {Object.entries(SYS).map(([k,sys])=>{
        const needsTier=!TIER_ACCESS[demoUser?.plan||'FREE']?.systems?.includes(k);
        const reqTier=k==='A1'?'FREE':['A2','A3'].includes(k)?'BASIC':'PRO';
        return needsTier?
          <TierLock key={k} plan={demoUser?.plan} req={reqTier} lang={L}>
            <SystemSection sysKey={k} sys={sys} expanded={expanded} toggle={toggle} lang={L}/>
          </TierLock>:
          <SystemSection key={k} sysKey={k} sys={sys} expanded={expanded} toggle={toggle} lang={L}/>;
      })}
    </>}
    {tab==='satellite'&&<>
      <div style={{marginBottom:16}}><div style={{fontSize:18,fontWeight:800,color:LT.text}}>{t("satStatus",L)}</div></div>
      <TierLock plan={demoUser?.plan} req="PRO" lang={L}>
      <div className="grid-2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {Object.values(D).filter(g=>isSat(g.c)).map(g=>{const s=SAT_META[g.c];return(<div key={g.c} style={{background:LT.surface,boxShadow:'0 1px 3px rgba(0,0,0,.06)',borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}><div style={{fontSize:16,fontWeight:700,color:LT.text}}>{s.icon} {gN(g.c,L)}</div><div style={{fontSize:15,color:LT.textMid}}>{s.sat} · {s.freq}</div><div style={{fontSize:22,fontWeight:800,color:LT.text,marginTop:8,fontFamily:"monospace"}}>{g.v}<span style={{fontSize:16,color:LT.textDim,marginLeft:3}}>{g.u}</span></div><div style={{fontSize:16,color:LT.textMid,marginTop:4}}>{g.note}</div></div>);})}
      </div>
      </TierLock>
    </>}
    {tab==='alerts'&&<>
      <div style={{marginBottom:16}}><div style={{fontSize:18,fontWeight:800,color:LT.text}}>{t("alertCenter",L)}</div></div>
      <TierLock plan={demoUser?.plan} req="BASIC" lang={L}>
      {[{t:t('alert',L),c:LT.danger,g:"D1",m:t('alertD1',L),d:"2026-01-15"},{t:t('alert',L),c:LT.danger,g:"D3",m:t('alertD3',L),d:"2026-01-15"},{t:t('alert',L),c:LT.danger,g:"L3",m:t('alertL3',L),d:"2026-01-12"},{t:t('caution',L),c:LT.warn,g:"R2",m:t('alertR2',L),d:"2026-01-10"},{t:t('caution',L),c:LT.warn,g:"C2",m:t('alertC2',L),d:"2026-01-08"},{t:t('stWatch',L),c:LT.info,g:"I4",m:t('alertI4',L),d:"2026-01-05"}].map((a,i)=>(<div key={i} style={{background:LT.surface,borderRadius:LT.smRadius,padding:"14px 16px",border:`1px solid ${LT.border}`,marginBottom:8,display:"flex",gap:12,alignItems:"flex-start"}}>
        <span style={{width:8,height:8,borderRadius:4,background:a.c,marginTop:4,flexShrink:0}}/>
        <div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:16,fontWeight:700,color:a.c}}>{a.t} · {a.g}</span><span style={{fontSize:16,color:LT.textDim}}>{a.d}</span></div><div style={{fontSize:15,color:LT.text,lineHeight:1.5}}>{a.m}</div></div>
      </div>))}
      </TierLock>
    </>}
  </div>);
}

// ═══ 마이페이지 ═══

export default DashboardPage;
