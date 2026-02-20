import { useState, useEffect, useCallback } from 'react';
import T, { L as LT } from '../theme';
import { t } from '../i18n';
import { SYS, sysN } from '../components/TierLock';
import ProductMgmt from './ProductMgmt';
import * as API from '../api';

function AdminPage({lang}){
  const L=lang||'ko';
  const [tab,setTab]=useState('kpi');
  const [search,setSearch]=useState('');
  // ── CB 모니터 상태 ──
  const [cbData,setCbData]=useState(null);
  const [cbLoading,setCbLoading]=useState(false);
  const [cbError,setCbError]=useState(null);
  const [adminKey,setAdminKey]=useState(()=>localStorage.getItem('diah7m-admin-key')||'');
  const [resetMsg,setResetMsg]=useState(null);

  const loadCB=useCallback(()=>{
    setCbLoading(true); setCbError(null);
    API.healthSources().then(d=>{setCbData(d);setCbLoading(false);}).catch(e=>{setCbError(e.message);setCbLoading(false);});
  },[]);

  useEffect(()=>{
    if(tab==='pipeline'){loadCB();const iv=setInterval(loadCB,15000);return()=>clearInterval(iv);}
  },[tab,loadCB]);

  const handleReset=async(source)=>{
    if(!adminKey){setResetMsg(t('adminKeyRequired',L));return;}
    localStorage.setItem('diah7m-admin-key',adminKey);
    try{
      const r=await API.cbReset(adminKey,source);
      setResetMsg((source||'ALL')+' '+t('cbResetDone',L));loadCB();
      setTimeout(()=>setResetMsg(null),3000);
    }catch(e){setResetMsg(t('cbResetFail',L)+': '+e.message);}
  };

  const handleTestAlert=async()=>{
    if(!adminKey){setResetMsg(t('adminKeyRequired',L));return;}
    try{
      const r=await API.sendTestAlert(adminKey);
      setResetMsg(t('alertSent',L)+': '+(r.sent?r.providers.join(','):t('alertNoSms',L)));
      setTimeout(()=>setResetMsg(null),5000);
    }catch(e){setResetMsg(t('alertFail',L)+': '+e.message);}
  };
  // ── SMS 관리 상태 ──
  const [smsTab,setSmsTab]=useState('balance');
  const [smsBalance,setSmsBalance]=useState(null);
  const [smsLogs,setSmsLogs]=useState([]);
  const [smsTemplates,setSmsTemplates]=useState([]);
  const [smsLoading,setSmsLoading]=useState(false);
  const [smsMsg,setSmsMsg]=useState(null);
  const [smsSendPhone,setSmsSendPhone]=useState('');
  const [smsSendMsg,setSmsSendMsg]=useState('');
  const [smsSendTpl,setSmsSendTpl]=useState('');
  const [editTpl,setEditTpl]=useState(null);

  const loadSmsBalance=useCallback(()=>{
    setSmsLoading(true);
    API.adminSmsBalance().then(d=>{setSmsBalance(d);setSmsLoading(false);}).catch(e=>{setSmsMsg(t('smsBalFail',L)+': '+e.message);setSmsLoading(false);});
  },[]);
  const loadSmsLogs=useCallback(()=>{
    setSmsLoading(true);
    API.adminSmsLog(1,50).then(d=>{setSmsLogs(d.logs||[]);setSmsLoading(false);}).catch(e=>{setSmsMsg(t('smsLogFail',L)+': '+e.message);setSmsLoading(false);});
  },[]);
  const loadSmsTemplates=useCallback(()=>{
    setSmsLoading(true);
    API.adminSmsTemplates().then(d=>{setSmsTemplates(d.templates||[]);setSmsLoading(false);}).catch(e=>{setSmsMsg(t('smsTplFail',L)+': '+e.message);setSmsLoading(false);});
  },[]);

  useEffect(()=>{
    if(tab==='sms'){
      if(smsTab==='balance') loadSmsBalance();
      else if(smsTab==='log') loadSmsLogs();
      else if(smsTab==='templates'||smsTab==='send') loadSmsTemplates();
    }
  },[tab,smsTab,loadSmsBalance,loadSmsLogs,loadSmsTemplates]);

  const handleSmsSend=async()=>{
    if(!smsSendPhone){setSmsMsg(t('smsNoPhone',L));return;}
    if(!smsSendMsg&&!smsSendTpl){setSmsMsg(t('smsNoMsg',L));return;}
    try{
      const phones=smsSendPhone.split(',').map(p=>p.trim()).filter(Boolean);
      const r=await API.adminSmsSend(phones,smsSendTpl||undefined,{},smsSendMsg||undefined);
      setSmsMsg(`${t('smsSendDone',L)}: ${r.sent}건 성공, ${r.failed}건 실패`);
      setSmsSendPhone('');setSmsSendMsg('');
      setTimeout(()=>setSmsMsg(null),5000);
    }catch(e){setSmsMsg(t('smsSendFail',L)+': '+e.message);}
  };

  const handleTplSave=async()=>{
    if(!editTpl) return;
    try{
      await API.adminSmsTemplateUpdate(editTpl.code,{title:editTpl.title,body:editTpl.body,type:editTpl.type,active:editTpl.active});
      setSmsMsg(t('smsTplSaved',L));setEditTpl(null);loadSmsTemplates();
      setTimeout(()=>setSmsMsg(null),3000);
    }catch(e){setSmsMsg(t('smsTplFailed',L)+': '+e.message);}
  };

  const tabs=[{id:'kpi',label:'📊 KPI'},{id:'members',label:'👥 회원'},{id:'products',label:'🛒 상품'},{id:'pipeline',label:'🔄 파이프라인'},{id:'sms',label:'📱 SMS'},{id:'billing',label:'💳 결제'},{id:'engine',label:'🔧 엔진'},{id:'audit',label:'📋 감사'},{id:'settings',label:'⚙️ 설정'}];
  const members=[
    {n:"김투자",e:"kim@gmail.com",p:"Pro",s:"활성",d:"2026-02-10",ml:3500},
    {n:"박분석",e:"park@naver.com",p:"Basic",s:"활성",d:"2026-02-08",ml:1200},
    {n:"이글로벌",e:"lee@yahoo.com",p:"Free",s:"활성",d:"2026-02-05",ml:500},
    {n:"최데이터",e:"choi@gmail.com",p:"Pro",s:"활성",d:"2026-01-28",ml:8200},
    {n:"정위성",e:"jung@daum.net",p:"Enterprise",s:"활성",d:"2026-01-15",ml:15000},
    {n:"한리서치",e:"han@corp.co.kr",p:"Basic",s:"정지",d:"2026-01-10",ml:0},
  ];
  const filtered=members.filter(m=>!search||m.n.includes(search)||m.e.includes(search));
  const inputS={padding:"10px 14px",borderRadius:8,border:`1px solid ${LT.border}`,background:LT.bg2,color:LT.text,fontSize:15,outline:"none",boxSizing:"border-box"};
  return(<div style={{maxWidth:860,margin:"0 auto",padding:"20px 16px"}}>
    <div className="tab-scroll" style={{display:"flex",gap:0,marginBottom:20,borderBottom:`1px solid ${LT.border}`,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      {tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"12px 16px",border:"none",background:"transparent",color:tab===t.id?LT.text:LT.textDim,borderBottom:tab===t.id?'2px solid #111':'2px solid transparent',fontSize:15,fontWeight:tab===t.id?700:500,cursor:"pointer",whiteSpace:"nowrap",marginBottom:-1,flexShrink:0}}>{t.label}</button>))}
    </div>

    {tab==='kpi'&&<>
      <div className="grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[["총 회원","1,247",LT.accent,"+12%↑"],["월 매출","₩18.5M",LT.good,"+8.3%↑"],["활성 구독","892",LT.info,"71.5%"],["마일리지","1.2M P",LT.warn,"+15%↑"]].map(([n,v,c,d])=>(<div key={n} style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}><div style={{fontSize:16,color:LT.textDim}}>{n}</div><div style={{fontSize:22,fontWeight:800,color:c,marginTop:6,fontFamily:"monospace"}}>{v}</div><div style={{fontSize:16,color:LT.good,marginTop:4}}>{d}</div></div>))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>📈 등급별 분포</div>
          {[["Free",580,"46.5%",LT.textMid],["Basic",320,"25.7%",LT.info],["Pro",285,"22.9%",LT.accent],["Enterprise",62,"5.0%","#f59e0b"]].map(([n,c,p,col])=>(<div key={n} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:16,marginBottom:4}}><span style={{color:col,fontWeight:600}}>{n}</span><span style={{color:LT.textDim}}>{c}명 ({p})</span></div><div style={{height:6,background:LT.border,borderRadius:3,overflow:"hidden"}}><div style={{width:p,height:"100%",background:col,borderRadius:3}}/></div></div>))}
        </div>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>🕐 최근 가입</div>
          {members.slice(0,4).map(u=>(<div key={u.e} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${LT.border}`}}><div><div style={{fontSize:15,fontWeight:600,color:LT.text}}>{u.n}</div><div style={{fontSize:16,color:LT.textDim}}>{u.e}</div></div><div style={{textAlign:"right"}}><span style={{fontSize:16,fontWeight:600,color:LT.accent}}>{u.p}</span><div style={{fontSize:15,color:LT.textDim}}>{u.d}</div></div></div>))}
        </div>
      </div>
    </>}

    {tab==='members'&&<>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="이름 또는 이메일 검색..." style={{...inputS,flex:1}}/>
        <select style={{...inputS,width:120}}><option>전체 등급</option><option>Free</option><option>Basic</option><option>Pro</option><option>Enterprise</option></select>
        <select style={{...inputS,width:100}}><option>전체 상태</option><option>{t("active",L)}</option><option>정지</option></select>
      </div>
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,border:`1px solid ${LT.border}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.5fr 2fr 1fr 1fr 1fr 1fr",padding:"10px 16px",background:LT.bg3,fontSize:16,fontWeight:700,color:LT.textDim}}>
          <span>이름</span><span>이메일</span><span>등급</span><span>상태</span><span>{t("mileage",L)}</span><span>가입일</span>
        </div>
        {filtered.map(m=>(<div key={m.e} style={{display:"grid",gridTemplateColumns:"1.5fr 2fr 1fr 1fr 1fr 1fr",padding:"10px 16px",borderBottom:`1px solid ${LT.border}`,fontSize:16,alignItems:"center"}}>
          <span style={{fontWeight:600,color:LT.text}}>{m.n}</span>
          <span style={{color:LT.textMid}}>{m.e}</span>
          <span style={{color:LT.accent,fontWeight:600}}>{m.p}</span>
          <span style={{color:m.s==="활성"?LT.good:LT.danger,fontWeight:600}}>{m.s}</span>
          <span style={{color:LT.warn,fontFamily:"monospace"}}>{m.ml.toLocaleString()}P</span>
          <span style={{color:LT.textDim}}>{m.d}</span>
        </div>))}
      </div>
      <div style={{fontSize:16,color:LT.textDim,marginTop:8,textAlign:"right"}}>{filtered.length}명 표시 / 전체 1,247명</div>
    </>}

    {tab==='engine'&&<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        {[["데이터 수집","59/59 게이지",LT.good,"전체 수집 완료"],["위성 연동","4/4 소스",LT.good,"NASA+ESA 정상"],["API 응답","avg 120ms",LT.good,"P95: 240ms"]].map(([n,v,c,d])=>(<div key={n} style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}><div style={{fontSize:16,color:LT.textDim}}>{n}</div><div style={{fontSize:18,fontWeight:800,color:c,marginTop:4,fontFamily:"monospace"}}>{v}</div><div style={{fontSize:16,color:LT.textDim,marginTop:4}}>{d}</div></div>))}
      </div>
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>🛰️ 위성 데이터 수집 현황</div>
        {[["VIIRS DNB (야간광)","2026-02-12 06:00","정상",LT.good],["Sentinel-5P (NO₂)","2026-02-12 04:30","정상",LT.good],["Sentinel-1 (SAR)","2026-02-08","정상 (12일 주기)",LT.good],["Landsat-9 (열적외선)","2026-02-05","정상 (16일 주기)",LT.good]].map(([n,d,s,c])=>(<div key={n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${LT.border}`}}><div><div style={{fontSize:15,fontWeight:600,color:LT.text}}>{n}</div><div style={{fontSize:16,color:LT.textDim}}>마지막 수집: {d}</div></div><span style={{fontSize:16,fontWeight:700,color:c}}>{s}</span></div>))}
      </div>
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>📊 59게이지 수집 상태</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(9,1fr)",gap:6}}>
          {Object.entries(SYS).map(([k,s])=>(<div key={k} style={{textAlign:"center"}}><div style={{fontSize:16}}>{s.icon}</div><div style={{fontSize:15,fontWeight:600,color:LT.text}}>{sysN(k,L).slice(0,3)}</div><div style={{fontSize:15,color:LT.good,fontWeight:700}}>{s.keys.length}/{s.keys.length}</div></div>))}
        </div>
      </div>
    </>}

    {tab==='products'&&<ProductMgmt/>}


    {tab==='pipeline'&&<>
      {/* 전체 상태 요약 */}
      {cbLoading && !cbData && <div style={{textAlign:'center',padding:40,color:LT.textDim}}>로딩...</div>}
      {cbError && <div style={{background:'#fef2f2',borderRadius:8,padding:12,color:'#dc2626',marginBottom:12}}>오류: {cbError}</div>}
      {cbData && <>
        {/* 전체 Overall */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
          <div style={{width:12,height:12,borderRadius:6,background:cbData.overall==='HEALTHY'?LT.good:cbData.overall==='CRITICAL'?LT.danger:LT.warn}}/>
          <span style={{fontSize:18,fontWeight:800,color:cbData.overall==='HEALTHY'?LT.good:cbData.overall==='CRITICAL'?LT.danger:LT.warn}}>{cbData.overall}</span>
          <span style={{fontSize:14,color:LT.textDim}}>
            {cbData.summary.healthy}/{cbData.summary.total} 정상 · {cbData.summary.down} 장애 · {cbData.summary.degraded} 복구중
          </span>
          <span style={{fontSize:13,color:LT.textDim,marginLeft:'auto'}}>{cbData.checkedAt?.slice(11,19)}</span>
          <button onClick={loadCB} style={{padding:'4px 10px',borderRadius:6,border:`1px solid ${LT.border}`,background:'transparent',color:LT.accent,fontSize:13,cursor:'pointer'}}>새로고침</button>
        </div>

        {/* 소스별 CB 상태 카드 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:10,marginBottom:16}}>
          {Object.entries(cbData.sources||{}).map(([name,src])=>{
            const st=src.state;
            const c=st==='CLOSED'?LT.good:st==='OPEN'?LT.danger:LT.warn;
            const lbl=st==='CLOSED'?'정상':st==='OPEN'?'차단':st==='HALF_OPEN'?'시험중':'?';
            const ls=src.stats?.lastSuccess;
            const lf=src.stats?.lastFailure;
            return(<div key={name} style={{background:LT.surface,borderRadius:LT.smRadius||8,padding:14,border:`1px solid ${c}30`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span style={{fontSize:15,fontWeight:700,color:LT.text}}>{name}</span>
                <span style={{fontSize:12,fontWeight:700,color:'#fff',background:c,borderRadius:4,padding:'2px 8px'}}>{lbl}</span>
              </div>
              <div style={{fontSize:13,color:LT.textDim,lineHeight:1.6}}>
                <div>호출: <b style={{color:LT.text}}>{src.stats?.totalCalls||0}</b> · 성공: <b style={{color:LT.good}}>{src.stats?.totalSuccess||0}</b> · 실패: <b style={{color:LT.danger}}>{src.stats?.totalFailures||0}</b></div>
                <div>거부: <b style={{color:LT.warn}}>{src.stats?.totalRejected||0}</b> · 복구실패: <b style={{color:LT.danger}}>{src.stats?.totalReopens||0}</b></div>
                {lf && <div style={{marginTop:4}}>최근 에러: <span style={{color:LT.danger,fontSize:12}}>{lf.error?.slice(0,40)}</span></div>}
                {ls && <div>마지막 성공: <span style={{color:LT.good,fontSize:12}}>{ls.time?.slice(11,19)}</span></div>}
                {src.escalated && <div style={{color:LT.danger,fontWeight:700,marginTop:4}}>SMS 발송됨</div>}
              </div>
              {st!=='CLOSED' && <button onClick={()=>handleReset(name)} style={{marginTop:8,padding:'4px 12px',borderRadius:6,border:'none',background:LT.accent,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}}>수동 리셋</button>}
            </div>);
          })}
        </div>

        {/* 상태 이력 (최근 변경) */}
        {(()=>{
          const allHistory=[];
          Object.entries(cbData.sources||{}).forEach(([name,src])=>{
            (src.stats?.stateHistory||[]).forEach(h=>{allHistory.push({source:name,...h});});
          });
          allHistory.sort((a,b)=>b.at.localeCompare(a.at));
          if(allHistory.length===0) return null;
          return(<div style={{background:LT.surface,borderRadius:LT.cardRadius||8,padding:16,border:`1px solid ${LT.border}`,marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:8}}>CB 상태 변경 이력</div>
            <div style={{maxHeight:200,overflowY:'auto'}}>
              {allHistory.slice(0,20).map((h,i)=>(
                <div key={i} style={{display:'flex',gap:10,padding:'4px 0',borderBottom:`1px solid ${LT.border}`,fontSize:13}}>
                  <span style={{color:LT.textDim,fontFamily:'monospace',minWidth:60}}>{h.at?.slice(11,19)}</span>
                  <span style={{fontWeight:600,color:LT.text,minWidth:100}}>{h.source}</span>
                  <span style={{color:h.to==='OPEN'?LT.danger:h.to==='CLOSED'?LT.good:LT.warn}}>{h.from} → {h.to}</span>
                </div>
              ))}
            </div>
          </div>);
        })()}
      </>}

      {/* 관리 도구 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius||8,padding:16,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:10}}>관리 도구</div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <input value={adminKey} onChange={e=>{setAdminKey(e.target.value);localStorage.setItem('diah7m-admin-key',e.target.value);}} placeholder="Admin Key" type="password"
            style={{padding:'8px 12px',borderRadius:8,border:`1px solid ${LT.border}`,background:LT.bg2,color:LT.text,fontSize:14,width:180}}/>
          <button onClick={()=>handleReset(null)} style={{padding:'8px 16px',borderRadius:8,border:'none',background:LT.danger,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>전체 CB 리셋</button>
          <button onClick={handleTestAlert} style={{padding:'8px 16px',borderRadius:8,border:'none',background:LT.warn,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer'}}>SMS 테스트</button>
          <button onClick={loadCB} style={{padding:'8px 16px',borderRadius:8,border:`1px solid ${LT.border}`,background:'transparent',color:LT.accent,fontSize:14,fontWeight:600,cursor:'pointer'}}>새로고침</button>
        </div>
        {resetMsg && <div style={{marginTop:8,fontSize:14,color:resetMsg.includes('실패')?LT.danger:LT.good,fontWeight:600}}>{resetMsg}</div>}
      </div>

      {/* SMS 설정 안내 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius||8,padding:16,border:`1px solid ${LT.border}`}}>
        <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:8}}>SMS 알림 설정</div>
        <div style={{fontSize:13,color:LT.textDim,lineHeight:1.8}}>
          <div>Render 환경변수에 아래를 설정하면 자동복구 실패 시 SMS가 발송됩니다:</div>
          <div style={{fontFamily:'monospace',fontSize:12,background:LT.bg2,padding:10,borderRadius:6,marginTop:6}}>
            ALERT_PHONE=01012345678<br/>
            COOLSMS_API_KEY=...<br/>
            COOLSMS_API_SECRET=...<br/>
            COOLSMS_SENDER=발신번호<br/>
            <span style={{color:LT.textDim}}># 또는 Twilio fallback:</span><br/>
            TWILIO_ACCOUNT_SID=...<br/>
            TWILIO_AUTH_TOKEN=...<br/>
            TWILIO_PHONE=+1...<br/>
            <span style={{color:LT.textDim}}># Slack/Discord webhook (선택):</span><br/>
            ALERT_WEBHOOK_URL=https://hooks.slack.com/...
          </div>
          <div style={{marginTop:8}}>CircuitBreaker 자동복구 3회 실패 → SMS 자동 발송 (5분 중복 방지)</div>
        </div>
      </div>
    </>}

    {tab==='sms'&&<>
      {/* SMS 서브탭 */}
      <div style={{display:'flex',gap:0,marginBottom:16,borderBottom:`1px solid ${LT.border}`}}>
        {[['balance','잔액/통계'],['send','발송'],['log','발송이력'],['templates','템플릿']].map(([id,label])=>(
          <button key={id} onClick={()=>setSmsTab(id)} style={{padding:'8px 14px',border:'none',background:'transparent',color:smsTab===id?LT.accent:LT.textDim,borderBottom:smsTab===id?`2px solid ${LT.accent}`:'2px solid transparent',fontSize:14,fontWeight:smsTab===id?700:500,cursor:'pointer'}}>{label}</button>
        ))}
      </div>
      {smsMsg&&<div style={{background:smsMsg.includes('실패')?'#fef2f2':'#f0fdf4',borderRadius:8,padding:'8px 12px',color:smsMsg.includes('실패')?'#dc2626':'#16a34a',fontSize:14,marginBottom:12,fontWeight:600}}>{smsMsg}</div>}

      {/* 잔액/통계 */}
      {smsTab==='balance'&&<>
        {smsLoading&&!smsBalance&&<div style={{textAlign:'center',padding:30,color:LT.textDim}}>로딩...</div>}
        {smsBalance&&<>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
            <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}>
              <div style={{fontSize:14,color:LT.textDim}}>아이코드 잔액</div>
              <div style={{fontSize:22,fontWeight:800,color:LT.accent,marginTop:4,fontFamily:'monospace'}}>{smsBalance.balance?.coin!=null?Number(smsBalance.balance.coin).toLocaleString()+'원':smsBalance.balance?.available?'조회중':'미설정'}</div>
            </div>
            <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}>
              <div style={{fontSize:14,color:LT.textDim}}>30일 발송</div>
              <div style={{fontSize:22,fontWeight:800,color:LT.good,marginTop:4,fontFamily:'monospace'}}>{smsBalance.stats?.sent||0}건</div>
            </div>
            <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}>
              <div style={{fontSize:14,color:LT.textDim}}>실패</div>
              <div style={{fontSize:22,fontWeight:800,color:LT.danger,marginTop:4,fontFamily:'monospace'}}>{smsBalance.stats?.failed||0}건</div>
            </div>
            <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}>
              <div style={{fontSize:14,color:LT.textDim}}>30일 비용</div>
              <div style={{fontSize:22,fontWeight:800,color:LT.warn,marginTop:4,fontFamily:'monospace'}}>{smsBalance.stats?.cost?Number(smsBalance.stats.cost).toLocaleString()+'원':'0원'}</div>
            </div>
          </div>
          <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}>
            <div style={{fontSize:14,fontWeight:700,color:LT.text,marginBottom:8}}>발송 채널 설정</div>
            <div style={{fontSize:13,color:LT.textDim,lineHeight:1.8}}>
              <div>국내 (01x, +82): <b style={{color:LT.good}}>아이코드</b> (16원/건) → CoolSMS fallback</div>
              <div>해외 (+1, +44 등): <b style={{color:LT.good}}>AWS SNS</b> (~8원/건) → Twilio fallback</div>
            </div>
          </div>
        </>}
      </>}

      {/* 발송 */}
      {smsTab==='send'&&<>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:12}}>개별/대량 발송</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div>
              <label style={{fontSize:13,color:LT.textDim,display:'block',marginBottom:4}}>수신번호 (콤마로 구분, 최대 100건)</label>
              <input value={smsSendPhone} onChange={e=>setSmsSendPhone(e.target.value)} placeholder="01012345678, 01098765432" style={{...inputS,width:'100%'}}/>
            </div>
            <div>
              <label style={{fontSize:13,color:LT.textDim,display:'block',marginBottom:4}}>템플릿 선택 (선택)</label>
              <select value={smsSendTpl} onChange={e=>setSmsSendTpl(e.target.value)} style={{...inputS,width:'100%'}}>
                <option value="">직접 입력</option>
                {smsTemplates.map(t=>(<option key={t.code} value={t.code}>{t.code} — {t.title}</option>))}
              </select>
            </div>
            {!smsSendTpl&&<div>
              <label style={{fontSize:13,color:LT.textDim,display:'block',marginBottom:4}}>메시지 ({smsSendMsg.length}/90자 {smsSendMsg.length>90?'LMS':'SMS'})</label>
              <textarea value={smsSendMsg} onChange={e=>setSmsSendMsg(e.target.value)} rows={3} style={{...inputS,width:'100%',resize:'vertical',fontFamily:'inherit'}} placeholder="발송할 메시지를 입력하세요"/>
            </div>}
            <button onClick={handleSmsSend} style={{padding:'10px 20px',borderRadius:8,border:'none',background:LT.accent,color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',alignSelf:'flex-start'}}>발송</button>
          </div>
        </div>
      </>}

      {/* 발송 이력 */}
      {smsTab==='log'&&<>
        {smsLoading&&smsLogs.length===0&&<div style={{textAlign:'center',padding:30,color:LT.textDim}}>로딩...</div>}
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,border:`1px solid ${LT.border}`,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1.5fr 2fr 0.8fr 0.8fr 0.8fr',padding:'8px 12px',background:LT.bg3,fontSize:13,fontWeight:700,color:LT.textDim}}>
            <span>시각</span><span>수신번호</span><span>메시지</span><span>유형</span><span>상태</span><span>비용</span>
          </div>
          {smsLogs.length===0?<div style={{padding:20,textAlign:'center',color:LT.textDim,fontSize:14}}>발송 이력이 없습니다</div>
          :smsLogs.map((l,i)=>(<div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1.5fr 2fr 0.8fr 0.8fr 0.8fr',padding:'6px 12px',borderBottom:`1px solid ${LT.border}`,fontSize:13,alignItems:'center'}}>
            <span style={{color:LT.textDim,fontFamily:'monospace'}}>{(l.created_at||'').slice(5,16)}</span>
            <span style={{color:LT.text}}>{l.phone}</span>
            <span style={{color:LT.textMid,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.message}</span>
            <span style={{color:LT.accent}}>{l.type}</span>
            <span style={{color:l.status==='sent'?LT.good:LT.danger,fontWeight:600}}>{l.status}</span>
            <span style={{color:LT.warn,fontFamily:'monospace'}}>{l.cost}원</span>
          </div>))}
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
          <button onClick={loadSmsLogs} style={{padding:'6px 14px',borderRadius:6,border:`1px solid ${LT.border}`,background:'transparent',color:LT.accent,fontSize:13,cursor:'pointer'}}>새로고침</button>
        </div>
      </>}

      {/* 템플릿 관리 */}
      {smsTab==='templates'&&<>
        {smsLoading&&smsTemplates.length===0&&<div style={{textAlign:'center',padding:30,color:LT.textDim}}>로딩...</div>}
        <div style={{display:'grid',gap:10}}>
          {smsTemplates.map(tpl=>(
            <div key={tpl.code} style={{background:LT.surface,borderRadius:LT.smRadius||8,padding:14,border:`1px solid ${LT.border}`}}>
              {editTpl&&editTpl.code===tpl.code?<>
                <div style={{display:'flex',gap:8,marginBottom:8}}>
                  <input value={editTpl.title} onChange={e=>setEditTpl({...editTpl,title:e.target.value})} style={{...inputS,flex:1}} placeholder="제목"/>
                  <select value={editTpl.type} onChange={e=>setEditTpl({...editTpl,type:e.target.value})} style={{...inputS,width:80}}>
                    <option value="SMS">SMS</option><option value="LMS">LMS</option>
                  </select>
                  <label style={{display:'flex',alignItems:'center',gap:4,fontSize:13,color:LT.textMid}}>
                    <input type="checkbox" checked={editTpl.active} onChange={e=>setEditTpl({...editTpl,active:e.target.checked?1:0})}/>활성
                  </label>
                </div>
                <textarea value={editTpl.body} onChange={e=>setEditTpl({...editTpl,body:e.target.value})} rows={2} style={{...inputS,width:'100%',resize:'vertical',fontFamily:'inherit',marginBottom:8}} placeholder="메시지 본문 ({name}, {code} 등 변수 사용)"/>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={handleTplSave} style={{padding:'6px 14px',borderRadius:6,border:'none',background:LT.accent,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}}>저장</button>
                  <button onClick={()=>setEditTpl(null)} style={{padding:'6px 14px',borderRadius:6,border:`1px solid ${LT.border}`,background:'transparent',color:LT.textDim,fontSize:13,cursor:'pointer'}}>취소</button>
                </div>
              </>:<>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <span style={{fontSize:14,fontWeight:700,color:LT.accent,fontFamily:'monospace'}}>{tpl.code}</span>
                    <span style={{fontSize:14,color:LT.text,marginLeft:8,fontWeight:600}}>{tpl.title}</span>
                    {!tpl.active&&<span style={{fontSize:12,color:LT.danger,marginLeft:6,fontWeight:600}}>비활성</span>}
                  </div>
                  <button onClick={()=>setEditTpl({...tpl})} style={{padding:'4px 10px',borderRadius:6,border:`1px solid ${LT.border}`,background:'transparent',color:LT.accent,fontSize:12,cursor:'pointer'}}>편집</button>
                </div>
                <div style={{fontSize:13,color:LT.textMid,marginTop:4,fontFamily:'monospace'}}>{tpl.body}</div>
              </>}
            </div>
          ))}
        </div>
      </>}
    </>}

    {tab==='billing'&&<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[["MRR","₩18.5M",LT.good],["활성구독","892",LT.accent],["결제실패","3건",LT.danger],["환불대기","1건",LT.warn]].map(([n,v,c])=>(<div key={n} style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}><div style={{fontSize:16,color:LT.textDim}}>{n}</div><div style={{fontSize:20,fontWeight:800,color:c,marginTop:6,fontFamily:"monospace"}}>{v}</div></div>))}
      </div>
      {/* 결제실패 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:15,fontWeight:700,color:LT.text}}>💳 결제 실패 플로우</span>
          <button style={{padding:"5px 12px",borderRadius:6,border:"none",background:LT.danger,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>일괄 리마인드</button>
        </div>
        {[{n:"박분석",p:"Basic",a:"₩19K",r:"카드만료",step:"1차 리마인드"},{n:"강데이터",p:"Pro",a:"₩49K",r:"잔액부족",step:"2차 리마인드"},{n:"오분석",p:"Basic",a:"₩19K",r:"카드분실",step:"다운그레이드 예정"}].map((x,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${LT.border}`,fontSize:16,alignItems:"center"}}>
          <span style={{fontWeight:600,color:LT.text}}>{x.n}</span><span style={{color:LT.accent}}>{x.p}</span><span style={{color:LT.danger,fontFamily:"monospace"}}>{x.a}</span><span style={{color:LT.textDim}}>{x.r}</span><span style={{color:LT.warn,fontWeight:600}}>{x.step}</span>
        </div>))}
      </div>
      {/* 매출 차트 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`}}>
        <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:12}}>📈 월별 매출</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:100}}>
          {[8.2,9.5,10.8,11.2,12.5,13.8,14.2,15.0,15.8,16.5,17.2,18.5].map((v,i)=>(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{width:"100%",height:`${v/18.5*100}%`,background:LT.accent,borderRadius:3,minHeight:3}}/><span style={{fontSize:15,color:LT.textDim}}>{i+1}</span></div>))}
        </div>
      </div>
    </>}

    {tab==='audit'&&<>
      <div style={{marginBottom:12}}><div style={{fontSize:16,fontWeight:700,color:LT.text}}>📋 감사 로그</div><div style={{fontSize:15,color:LT.textDim}}>모든 관리자 행동 자동 기록 · 90일 보관</div></div>
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,border:`1px solid ${LT.border}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 3fr 0.8fr",padding:"8px 12px",background:LT.bg3,fontSize:15,fontWeight:700,color:LT.textDim}}>
          <span>시각</span><span>행위자</span><span>행동</span><span>대상</span>
        </div>
        {[
          ["02-13 09:15","admin","Hold 수동: G6 PM2.5 (구름 92%)","G6"],
          ["02-13 08:30","system","결제실패 리마인드 자동발송 (3건)","billing"],
          ["02-12 22:10","admin","환불 검토 시작: 이글로벌 ₩49K","user"],
          ["02-12 18:00","system","KOSIS 수집 지연 경보 (72h)","pipeline"],
          ["02-12 14:30","system","S-5P 결측 Hold 자동 발동","G6"],
          ["02-12 09:00","system","ECOS 32개 지표 정상 수집","pipeline"],
          ["02-11 16:45","admin","티어 변경: 한리서치 → 정지","user"],
          ["02-11 10:20","admin","쿠폰 생성: LAUNCH2026 30%","coupon"],
          ["02-10 23:00","system","일간 백업 완료 (3.2GB)","backup"],
          ["02-10 15:30","admin","가격표 v2 적용","pricing"],
        ].map(([ts,who,act,tgt],i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 3fr 0.8fr",padding:"6px 12px",borderBottom:`1px solid ${LT.border}`,fontSize:15,alignItems:"center"}}>
          <span style={{color:LT.textDim,fontFamily:"monospace"}}>{ts}</span>
          <span style={{color:who==='system'?LT.sat:LT.accent,fontWeight:600}}>{who==='system'?'🤖 sys':'👤 adm'}</span>
          <span style={{color:LT.text}}>{act}</span>
          <span style={{color:LT.textDim,fontFamily:"monospace"}}>{tgt}</span>
        </div>))}
      </div>
      <div style={{fontSize:15,color:LT.textDim,marginTop:6,textAlign:"right"}}>최근 10건 / 전체 2,847건</div>
    </>}

    {tab==='settings'&&<>
      <div style={{display:"grid",gap:16}}>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>🔐 보안 설정</div>
          {[["JWT 토큰 만료","24시간"],[" 비밀번호 정책","8자+영문+숫자+특수"],["로그인 시도 제한","5회/15분"],["2FA 강제","Enterprise만"]].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${LT.border}`,fontSize:15}}><span style={{color:LT.textMid}}>{k}</span><span style={{color:LT.text,fontWeight:600}}>{v}</span></div>))}
        </div>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>📡 데이터 수집 주기</div>
          {[["ECOS 경제지표","매월 1일"],["KOSIS 통계","매월 5일"],["위성 데이터","자동 (매일/12일/16일)"],["환율","실시간 (30분)"]].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${LT.border}`,fontSize:15}}><span style={{color:LT.textMid}}>{k}</span><span style={{color:LT.text,fontWeight:600}}>{v}</span></div>))}
        </div>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>🗄️ 시스템</div>
          {[["데이터베이스","PostgreSQL 15.4",LT.good],["캐시","Redis 7.2",LT.good],["서버","Docker · Node 20 LTS",LT.good],["SSL","Let's Encrypt · 자동 갱신",LT.good],["백업","매일 03:00 자동",LT.good]].map(([k,v,c])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${LT.border}`,fontSize:15}}><span style={{color:LT.textMid}}>{k}</span><span style={{color:c,fontWeight:600}}>{v}</span></div>))}
        </div>
      </div>
    </>}
  </div>);
}

// ═══ 주식종목 위성감시 (진입점) ═══

export default AdminPage;
