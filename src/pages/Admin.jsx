import { useState } from 'react';
import T from '../theme';
import { t } from '../i18n';
import { SYS, sysN } from '../components/TierLock';
import ProductMgmt from './ProductMgmt';

function AdminPage({lang}){
  const L=lang||'ko';
  const [tab,setTab]=useState('kpi');
  const [search,setSearch]=useState('');
  const tabs=[{id:'kpi',label:'📊 KPI'},{id:'members',label:'👥 회원'},{id:'products',label:'🛒 상품'},{id:'pipeline',label:'🔄 파이프라인'},{id:'billing',label:'💳 결제'},{id:'engine',label:'🔧 엔진'},{id:'audit',label:'📋 감사'},{id:'settings',label:'⚙️ 설정'}];
  const members=[
    {n:"김투자",e:"kim@gmail.com",p:"Pro",s:"활성",d:"2026-02-10",ml:3500},
    {n:"박분석",e:"park@naver.com",p:"Basic",s:"활성",d:"2026-02-08",ml:1200},
    {n:"이글로벌",e:"lee@yahoo.com",p:"Free",s:"활성",d:"2026-02-05",ml:500},
    {n:"최데이터",e:"choi@gmail.com",p:"Pro",s:"활성",d:"2026-01-28",ml:8200},
    {n:"정위성",e:"jung@daum.net",p:"Enterprise",s:"활성",d:"2026-01-15",ml:15000},
    {n:"한리서치",e:"han@corp.co.kr",p:"Basic",s:"정지",d:"2026-01-10",ml:0},
  ];
  const filtered=members.filter(m=>!search||m.n.includes(search)||m.e.includes(search));
  const inputS={padding:"10px 14px",borderRadius:8,border:`1px solid ${T.border}`,background:T.bg2,color:T.text,fontSize:12,outline:"none",boxSizing:"border-box"};
  return(<div style={{maxWidth:860,margin:"0 auto",padding:"20px 16px"}}>
    <h2 style={{fontSize:18,fontWeight:800,color:T.text,marginBottom:16}}>⚙️ 관리자 패널</h2>
    <div style={{display:"flex",gap:4,marginBottom:20,overflowX:"auto"}}>
      {tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 14px",borderRadius:8,border:"none",background:tab===t.id?`${T.accent}15`:"transparent",color:tab===t.id?T.accent:T.textDim,fontSize:12,fontWeight:tab===t.id?700:500,cursor:"pointer",whiteSpace:"nowrap"}}>{t.label}</button>))}
    </div>

    {tab==='kpi'&&<>
      <div className="grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[["총 회원","1,247",T.accent,"+12%↑"],["월 매출","₩18.5M",T.good,"+8.3%↑"],["활성 구독","892",T.info,"71.5%"],["마일리지","1.2M P",T.warn,"+15%↑"]].map(([n,v,c,d])=>(<div key={n} style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`}}><div style={{fontSize:10,color:T.textDim}}>{n}</div><div style={{fontSize:22,fontWeight:800,color:c,marginTop:6,fontFamily:"monospace"}}>{v}</div><div style={{fontSize:10,color:T.good,marginTop:4}}>{d}</div></div>))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>📈 등급별 분포</div>
          {[["Free",580,"46.5%",T.textMid],["Basic",320,"25.7%",T.info],["Pro",285,"22.9%",T.accent],["Enterprise",62,"5.0%","#f59e0b"]].map(([n,c,p,col])=>(<div key={n} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}><span style={{color:col,fontWeight:600}}>{n}</span><span style={{color:T.textDim}}>{c}명 ({p})</span></div><div style={{height:6,background:T.border,borderRadius:3,overflow:"hidden"}}><div style={{width:p,height:"100%",background:col,borderRadius:3}}/></div></div>))}
        </div>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>🕐 최근 가입</div>
          {members.slice(0,4).map(u=>(<div key={u.e} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.border}`}}><div><div style={{fontSize:12,fontWeight:600,color:T.text}}>{u.n}</div><div style={{fontSize:10,color:T.textDim}}>{u.e}</div></div><div style={{textAlign:"right"}}><span style={{fontSize:10,fontWeight:600,color:T.accent}}>{u.p}</span><div style={{fontSize:9,color:T.textDim}}>{u.d}</div></div></div>))}
        </div>
      </div>
    </>}

    {tab==='members'&&<>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="이름 또는 이메일 검색..." style={{...inputS,flex:1}}/>
        <select style={{...inputS,width:120}}><option>전체 등급</option><option>Free</option><option>Basic</option><option>Pro</option><option>Enterprise</option></select>
        <select style={{...inputS,width:100}}><option>전체 상태</option><option>{t("active",L)}</option><option>정지</option></select>
      </div>
      <div style={{background:T.surface,borderRadius:T.cardRadius,border:`1px solid ${T.border}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.5fr 2fr 1fr 1fr 1fr 1fr",padding:"10px 16px",background:T.bg3,fontSize:10,fontWeight:700,color:T.textDim}}>
          <span>이름</span><span>이메일</span><span>등급</span><span>상태</span><span>{t("mileage",L)}</span><span>가입일</span>
        </div>
        {filtered.map(m=>(<div key={m.e} style={{display:"grid",gridTemplateColumns:"1.5fr 2fr 1fr 1fr 1fr 1fr",padding:"10px 16px",borderBottom:`1px solid ${T.border}`,fontSize:11,alignItems:"center"}}>
          <span style={{fontWeight:600,color:T.text}}>{m.n}</span>
          <span style={{color:T.textMid}}>{m.e}</span>
          <span style={{color:T.accent,fontWeight:600}}>{m.p}</span>
          <span style={{color:m.s==="활성"?T.good:T.danger,fontWeight:600}}>{m.s}</span>
          <span style={{color:T.warn,fontFamily:"monospace"}}>{m.ml.toLocaleString()}P</span>
          <span style={{color:T.textDim}}>{m.d}</span>
        </div>))}
      </div>
      <div style={{fontSize:10,color:T.textDim,marginTop:8,textAlign:"right"}}>{filtered.length}명 표시 / 전체 1,247명</div>
    </>}

    {tab==='engine'&&<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        {[["데이터 수집","59/59 게이지",T.good,"전체 수집 완료"],["위성 연동","4/4 소스",T.good,"NASA+ESA 정상"],["API 응답","avg 120ms",T.good,"P95: 240ms"]].map(([n,v,c,d])=>(<div key={n} style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`}}><div style={{fontSize:10,color:T.textDim}}>{n}</div><div style={{fontSize:18,fontWeight:800,color:c,marginTop:4,fontFamily:"monospace"}}>{v}</div><div style={{fontSize:10,color:T.textDim,marginTop:4}}>{d}</div></div>))}
      </div>
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>🛰️ 위성 데이터 수집 현황</div>
        {[["VIIRS DNB (야간광)","2026-02-12 06:00","정상",T.good],["Sentinel-5P (NO₂)","2026-02-12 04:30","정상",T.good],["Sentinel-1 (SAR)","2026-02-08","정상 (12일 주기)",T.good],["Landsat-9 (열적외선)","2026-02-05","정상 (16일 주기)",T.good]].map(([n,d,s,c])=>(<div key={n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.border}`}}><div><div style={{fontSize:12,fontWeight:600,color:T.text}}>{n}</div><div style={{fontSize:10,color:T.textDim}}>마지막 수집: {d}</div></div><span style={{fontSize:11,fontWeight:700,color:c}}>{s}</span></div>))}
      </div>
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
        <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>📊 59게이지 수집 상태</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(9,1fr)",gap:6}}>
          {Object.entries(SYS).map(([k,s])=>(<div key={k} style={{textAlign:"center"}}><div style={{fontSize:14}}>{s.icon}</div><div style={{fontSize:9,fontWeight:600,color:T.text}}>{sysN(k,L).slice(0,3)}</div><div style={{fontSize:9,color:T.good,fontWeight:700}}>{s.keys.length}/{s.keys.length}</div></div>))}
        </div>
      </div>
    </>}

    {tab==='products'&&<ProductMgmt/>}


    {tab==='pipeline'&&<>
      {/* 이상징후 경보 */}
      <div style={{background:`${T.danger}08`,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.danger}20`,marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:T.danger,marginBottom:8}}>⚠️ 이상 징후 (2건)</div>
        {[["KOSIS 실업률 수집 지연","예상 2/10 → 미수신 · 72시간 초과","2026-02-13"],["Sentinel-5P NO₂ 결측","구름 피복 92% · 한반도 전역","2026-02-12"]].map(([tt,d,ts])=>(<div key={tt} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${T.danger}10`}}>
          <div><div style={{fontSize:11,fontWeight:600,color:T.text}}>{tt}</div><div style={{fontSize:9,color:T.textDim}}>{d}</div></div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:9,color:T.textDim}}>{ts}</span>
            <button style={{padding:"4px 10px",borderRadius:6,border:"none",background:T.warn,color:"#fff",fontSize:9,fontWeight:700,cursor:"pointer"}}>Hold</button></div>
        </div>))}
      </div>
      {/* 소스별 상태 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
        {[["ECOS",32,"정상","2/12",T.good],["KOSIS",27,"지연","미수신",T.warn],["VIIRS",1,"정상","2/12",T.good],["S-5P",1,"결측","구름92%",T.danger],["S-1 SAR",1,"정상","2/08",T.good],["Landsat",1,"정상","2/05",T.good]].map(([n,cnt,s,d,c])=>(<div key={n} style={{background:T.surface,borderRadius:T.smRadius,padding:12,border:`1px solid ${c}20`}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,fontWeight:700,color:T.text}}>{n}</span><span style={{width:6,height:6,borderRadius:3,background:c}}/></div>
          <div style={{fontSize:9,color:c,fontWeight:600,marginTop:4}}>{s}</div><div style={{fontSize:9,color:T.textDim}}>{cnt}지표 · {d}</div>
        </div>))}
      </div>
      {/* QA/Hold */}
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`,marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:10}}>🎯 QA / Hold</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}}>
          {[["관측품질",94,T.good],["센서일관",87,T.good],["결측안정",71,T.warn],["Hold",2,T.danger]].map(([n,v,c])=>(<div key={n} style={{textAlign:"center",padding:6,background:`${c}08`,borderRadius:6}}>
            <div style={{fontSize:16,fontWeight:800,color:c,fontFamily:"monospace"}}>{n==='Hold'?v+'건':v+'%'}</div><div style={{fontSize:9,color:T.textDim}}>{n}</div>
          </div>))}
        </div>
      </div>
      {/* 재처리 */}
      <div style={{display:"flex",gap:8}}>
        <button style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${T.accent}30`,background:`${T.accent}08`,color:T.accent,fontSize:10,fontWeight:600,cursor:"pointer"}}>KOSIS 재수집</button>
        <button style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${T.warn}30`,background:`${T.warn}08`,color:T.warn,fontSize:10,fontWeight:600,cursor:"pointer"}}>2월 재계산</button>
      </div>
    </>}

    {tab==='billing'&&<>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[["MRR","₩18.5M",T.good],["활성구독","892",T.accent],["결제실패","3건",T.danger],["환불대기","1건",T.warn]].map(([n,v,c])=>(<div key={n} style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.border}`}}><div style={{fontSize:10,color:T.textDim}}>{n}</div><div style={{fontSize:20,fontWeight:800,color:c,marginTop:6,fontFamily:"monospace"}}>{v}</div></div>))}
      </div>
      {/* 결제실패 */}
      <div style={{background:`${T.danger}06`,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.danger}15`,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:12,fontWeight:700,color:T.text}}>💳 결제 실패 플로우</span>
          <button style={{padding:"5px 12px",borderRadius:6,border:"none",background:T.danger,color:"#fff",fontSize:9,fontWeight:700,cursor:"pointer"}}>일괄 리마인드</button>
        </div>
        {[{n:"박분석",p:"Basic",a:"₩19K",r:"카드만료",step:"1차 리마인드"},{n:"강데이터",p:"Pro",a:"₩49K",r:"잔액부족",step:"2차 리마인드"},{n:"오분석",p:"Basic",a:"₩19K",r:"카드분실",step:"다운그레이드 예정"}].map((x,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.danger}10`,fontSize:10,alignItems:"center"}}>
          <span style={{fontWeight:600,color:T.text}}>{x.n}</span><span style={{color:T.accent}}>{x.p}</span><span style={{color:T.danger,fontFamily:"monospace"}}>{x.a}</span><span style={{color:T.textDim}}>{x.r}</span><span style={{color:T.warn,fontWeight:600}}>{x.step}</span>
        </div>))}
      </div>
      {/* 매출 차트 */}
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
        <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:12}}>📈 월별 매출</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:100}}>
          {[8.2,9.5,10.8,11.2,12.5,13.8,14.2,15.0,15.8,16.5,17.2,18.5].map((v,i)=>(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{width:"100%",height:`${v/18.5*100}%`,background:`linear-gradient(180deg,${T.accent},${T.accent}60)`,borderRadius:3,minHeight:3}}/><span style={{fontSize:9,color:T.textDim}}>{i+1}</span></div>))}
        </div>
      </div>
    </>}

    {tab==='audit'&&<>
      <div style={{marginBottom:12}}><div style={{fontSize:13,fontWeight:700,color:T.text}}>📋 감사 로그</div><div style={{fontSize:9,color:T.textDim}}>모든 관리자 행동 자동 기록 · 90일 보관</div></div>
      <div style={{background:T.surface,borderRadius:T.cardRadius,border:`1px solid ${T.border}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 3fr 0.8fr",padding:"8px 12px",background:T.bg3,fontSize:9,fontWeight:700,color:T.textDim}}>
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
        ].map(([ts,who,act,tgt],i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 3fr 0.8fr",padding:"6px 12px",borderBottom:`1px solid ${T.border}`,fontSize:9,alignItems:"center"}}>
          <span style={{color:T.textDim,fontFamily:"monospace"}}>{ts}</span>
          <span style={{color:who==='system'?T.sat:T.accent,fontWeight:600}}>{who==='system'?'🤖 sys':'👤 adm'}</span>
          <span style={{color:T.text}}>{act}</span>
          <span style={{color:T.textDim,fontFamily:"monospace"}}>{tgt}</span>
        </div>))}
      </div>
      <div style={{fontSize:9,color:T.textDim,marginTop:6,textAlign:"right"}}>최근 10건 / 전체 2,847건</div>
    </>}

    {tab==='settings'&&<>
      <div style={{display:"grid",gap:16}}>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>🔐 보안 설정</div>
          {[["JWT 토큰 만료","24시간"],[" 비밀번호 정책","8자+영문+숫자+특수"],["로그인 시도 제한","5회/15분"],["2FA 강제","Enterprise만"]].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`,fontSize:12}}><span style={{color:T.textMid}}>{k}</span><span style={{color:T.text,fontWeight:600}}>{v}</span></div>))}
        </div>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>📡 데이터 수집 주기</div>
          {[["ECOS 경제지표","매월 1일"],["KOSIS 통계","매월 5일"],["위성 데이터","자동 (매일/12일/16일)"],["환율","실시간 (30분)"]].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`,fontSize:12}}><span style={{color:T.textMid}}>{k}</span><span style={{color:T.text,fontWeight:600}}>{v}</span></div>))}
        </div>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.border}`}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>🗄️ 시스템</div>
          {[["데이터베이스","PostgreSQL 15.4",T.good],["캐시","Redis 7.2",T.good],["서버","Docker · Node 20 LTS",T.good],["SSL","Let's Encrypt · 자동 갱신",T.good],["백업","매일 03:00 자동",T.good]].map(([k,v,c])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.border}`,fontSize:12}}><span style={{color:T.textMid}}>{k}</span><span style={{color:c,fontWeight:600}}>{v}</span></div>))}
        </div>
      </div>
    </>}
  </div>);
}

// ═══ 주식종목 위성감시 (진입점) ═══

export default AdminPage;
