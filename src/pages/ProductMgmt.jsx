import { useState } from 'react';
import T, { L as LT } from '../theme';

function ProductMgmt(){
  const [sub,setSub]=useState('list');
  const [detail,setDetail]=useState(null);
  
  const subs=[{id:'list',lb:'📋 상품목록'},{id:'price',lb:'💰 가격관리'},{id:'coupon',lb:'🎫 쿠폰'},{id:'category',lb:'📂 카테고리'},{id:'stats',lb:'📊 판매통계'}];
  const statusC={판매중:LT.good,판매중지:LT.danger,품절:LT.textDim,준비중:LT.warn,시즌종료:'#8b5cf6'};
  const products=[
    {id:'NAT-KR',name:'🇰🇷 한국 경제 진단',cat:'국가보고서',price:0,salePrice:null,tier:'Free',status:'판매중',stock:'무제한',sold:847,revenue:'₩0',desc:'한국 59게이지 전체 진단 · 9축 시스템 · 위성 교차검증 포함',recipe:'NATIONAL_REPORT',created:'2026-01-15',updated:'2026-02-10',views:12450,cvr:'6.8%',options:['위성 심층분석','국가 비교']},
    {id:'NAT-US',name:'🇺🇸 미국 경제 진단',cat:'국가보고서',price:19000,salePrice:15200,tier:'Basic+',status:'판매중',stock:'무제한',sold:234,revenue:'₩3.6M',desc:'미국 FRED 기반 59게이지 · 달러 경제권 심층 · 연준 정책 연동',recipe:'NATIONAL_REPORT',created:'2026-01-20',updated:'2026-02-08',views:8920,cvr:'2.6%',options:['위성 심층분석','한미 비교']},
    {id:'NAT-JP',name:'🇯🇵 일본 경제 진단',cat:'국가보고서',price:19000,salePrice:null,tier:'Basic+',status:'판매중',stock:'무제한',sold:156,revenue:'₩3.0M',desc:'일본 e-Stat 기반 · 엔화 경제권 · BOJ 정책 연동',recipe:'NATIONAL_REPORT',created:'2026-02-01',updated:'2026-02-10',views:4230,cvr:'3.7%',options:['위성 심층분석','한일 비교']},
    {id:'NAT-OECD',name:'🌍 OECD 38개국 패키지',cat:'국가보고서',price:49000,salePrice:39200,tier:'Pro',status:'판매중',stock:'무제한',sold:89,revenue:'₩3.5M',desc:'OECD 전체 38개국 라이트 진단 · 국가간 비교 · 위성 전체 커버',recipe:'NATIONAL_REPORT',created:'2026-02-05',updated:'2026-02-12',views:3100,cvr:'2.9%',options:['심층 업그레이드','PDF 보고서']},
    {id:'STK-KILLER',name:'🔥 킬러 10종목 위성감시',cat:'주식감시',price:29000,salePrice:null,tier:'Basic+',status:'준비중',stock:'100명 한정',sold:0,revenue:'₩0',desc:'Tesla·TSMC·삼성전자 등 위성 직접 감시 가능 10종목 · 공장 가동률+괴리Δ',recipe:'STOCK_SURVEILLANCE',created:'2026-02-10',updated:'2026-02-12',views:1560,cvr:'0%',options:['알림 설정','PDF 리포트']},
    {id:'STK-SECTOR',name:'📊 섹터 40종목 패키지',cat:'주식감시',price:49000,salePrice:null,tier:'Pro',status:'준비중',stock:'무제한',sold:0,revenue:'₩0',desc:'반도체·EV·에너지·물류 4대 섹터 대표 40종목 · 공급망 추적',recipe:'STOCK_SURVEILLANCE',created:'2026-02-10',updated:'2026-02-12',views:890,cvr:'0%',options:['섹터 비교','알림']},
    {id:'STK-GLOBAL',name:'🌐 글로벌 100종목 올인원',cat:'주식감시',price:99000,salePrice:79200,tier:'Pro',status:'준비중',stock:'무제한',sold:0,revenue:'₩0',desc:'21개국 100종목 · 276시설 좌표 · 전 센서 커버 · 월간 리포트',recipe:'STOCK_SURVEILLANCE',created:'2026-02-10',updated:'2026-02-12',views:620,cvr:'0%',options:['API 접근','맞춤 알림']},
    {id:'CMP-2NATION',name:'⚖️ 국가 비교 분석',cat:'애드온',price:9900,salePrice:null,tier:'Basic+',status:'판매중',stock:'무제한',sold:67,revenue:'₩660K',desc:'2개국 게이지 나란히 비교 · 차이 분석 · 위성 비교 이미지',recipe:'COMPARISON',created:'2026-02-01',updated:'2026-02-08',views:2100,cvr:'3.2%',options:['3개국 확장']},
    {id:'CST-BASIC',name:'🏭 위성 촬영 주문(기본)',cat:'커스터마이징',price:890000,salePrice:null,tier:'Enterprise',status:'판매중',stock:'월 5건',sold:2,revenue:'₩1.8M',desc:'지정 좌표 10m 위성 촬영 · 분석 보고서 · 3영업일 납품',recipe:'CUSTOM',created:'2026-01-20',updated:'2026-02-05',views:340,cvr:'0.6%',options:['30cm 업그레이드','긴급(1일)']},
    {id:'CST-PREMIUM',name:'💎 30cm 정밀 촬영 주문',cat:'커스터마이징',price:3500000,salePrice:null,tier:'Enterprise',status:'품절',stock:'월 2건 (소진)',sold:2,revenue:'₩7.0M',desc:'Maxar 30cm 초고해상도 · 전문 분석 · 기관 전용',recipe:'CUSTOM',created:'2026-01-25',updated:'2026-02-12',views:180,cvr:'1.1%',options:['정기 계약']},
    {id:'ADD-SEASON',name:'📅 계절 패턴 분석',cat:'애드온',price:4900,salePrice:null,tier:'Pro',status:'시즌종료',stock:'-',sold:45,revenue:'₩220K',desc:'계절성 지표 과거 5년 패턴 대비 현재 위치 진단',recipe:'COMPARISON',created:'2026-01-10',updated:'2026-02-01',views:980,cvr:'4.6%',options:[]},
  ];
  const cats=[...new Set(products.map(p=>p.cat))];
  const [filterCat,setFilterCat]=useState('전체');
  const [filterStatus,setFilterStatus]=useState('전체');
  const [searchQ,setSearchQ]=useState('');
  const filtered=products.filter(p=>(filterCat==='전체'||p.cat===filterCat)&&(filterStatus==='전체'||p.status===filterStatus)&&(!searchQ||p.name.includes(searchQ)||p.id.toLowerCase().includes(searchQ.toLowerCase())));
  const inputS={padding:"8px 12px",borderRadius:8,border:`1px solid ${LT.border}`,background:LT.bg2,color:LT.text,fontSize:16,outline:"none"};

  // 상품 상세
  if(detail){const p=detail;return(<div>
    <button onClick={()=>setDetail(null)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${LT.border}`,background:"transparent",color:LT.accent,fontSize:16,cursor:"pointer",marginBottom:16}}>← 목록으로</button>
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
      {/* 왼쪽: 상품 정보 */}
      <div>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div><div style={{fontSize:16,fontWeight:800,color:LT.text}}>{p.name}</div><div style={{fontSize:16,color:LT.textDim,fontFamily:"monospace",marginTop:2}}>SKU: {p.id}</div></div>
            <span style={{fontSize:15,padding:"3px 10px",borderRadius:6,background:`${statusC[p.status]}15`,color:statusC[p.status],fontWeight:700}}>{p.status}</span>
          </div>
          <div style={{fontSize:16,color:LT.textMid,lineHeight:1.8,padding:"12px 0",borderTop:`1px solid ${LT.border}`,borderBottom:`1px solid ${LT.border}`}}>{p.desc}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginTop:12}}>
            {[["카테고리",p.cat],["Recipe",p.recipe],["최소 티어",p.tier],["재고",p.stock],["등록일",p.created],["최종수정",p.updated]].map(([k,v])=>(<div key={k}><div style={{fontSize:15,color:LT.textDim}}>{k}</div><div style={{fontSize:16,fontWeight:600,color:LT.text,marginTop:2}}>{v}</div></div>))}
          </div>
        </div>
        {/* 가격 */}
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:10}}>💰 가격 정보</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div><div style={{fontSize:15,color:LT.textDim}}>정가</div><div style={{fontSize:18,fontWeight:800,color:LT.text,fontFamily:"monospace",marginTop:2}}>₩{p.price.toLocaleString()}</div></div>
            <div><div style={{fontSize:15,color:LT.textDim}}>판매가 {p.salePrice?'(할인중)':''}</div><div style={{fontSize:18,fontWeight:800,color:p.salePrice?LT.danger:LT.text,fontFamily:"monospace",marginTop:2}}>₩{(p.salePrice||p.price).toLocaleString()}</div></div>
            <div><div style={{fontSize:15,color:LT.textDim}}>할인율</div><div style={{fontSize:18,fontWeight:800,color:p.salePrice?LT.good:LT.textDim,fontFamily:"monospace",marginTop:2}}>{p.salePrice?Math.round((1-p.salePrice/p.price)*100)+'%':'-'}</div></div>
          </div>
          <div style={{display:"flex",gap:6,marginTop:12}}>
            <button style={{padding:"6px 14px",borderRadius:6,border:"none",background:LT.accent,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer"}}>가격 수정</button>
            <button style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${LT.danger}30`,background:`${LT.danger}08`,color:LT.danger,fontSize:16,fontWeight:600,cursor:"pointer"}}>할인 설정</button>
            <button style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${LT.border}`,background:"transparent",color:LT.textMid,fontSize:16,fontWeight:600,cursor:"pointer"}}>가격 이력</button>
          </div>
        </div>
        {/* 옵션 */}
        {p.options.length>0&&<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`,marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:8}}>🧩 옵션 / 애드온</div>
          {p.options.map(o=>(<div key={o} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${LT.border}`}}>
            <span style={{fontSize:16,color:LT.text}}>{o}</span>
            <div style={{display:"flex",gap:4}}><span style={{fontSize:15,padding:"2px 8px",borderRadius:4,background:`${LT.good}15`,color:LT.good}}>활성</span></div>
          </div>))}
        </div>}
      </div>
      {/* 오른쪽: 판매 현황 + 조치 */}
      <div>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`,marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:10}}>📊 판매 현황</div>
          {[["누적 판매",p.sold+"건"],["누적 매출",p.revenue],["조회수",p.views.toLocaleString()],["전환율",p.cvr]].map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${LT.border}`,fontSize:16}}>
            <span style={{color:LT.textDim}}>{k}</span><span style={{fontWeight:700,color:LT.text,fontFamily:"monospace"}}>{v}</span>
          </div>))}
        </div>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`,marginBottom:12}}>
          <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:10}}>⚡ 즉시 조치</div>
          <div style={{display:"grid",gap:6}}>
            {[["판매 중지",LT.danger,"이 상품을 즉시 비공개합니다"],["품절 처리",LT.warn,"재고 소진 표시 (페이지 유지)"],["가격 변경",LT.accent,"정가/할인가 즉시 변경"],["시즌 종료","#8b5cf6","시즌 상품 마감 처리"],["상품 복제",LT.info,"동일 구성으로 새 상품 생성"],["삭제",LT.danger,"영구 삭제 (복구 불가)"]].map(([lb,c,desc])=>(<button key={lb} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderRadius:8,border:`1px solid ${c}20`,background:`${c}06`,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:16,fontWeight:700,color:c}}>{lb}</span>
              <span style={{fontSize:15,color:LT.textDim}}>{desc}</span>
            </button>))}
          </div>
        </div>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}>
          <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:8}}>📝 변경 이력</div>
          {[["02-12","가격 v2 적용"],["02-10","할인 20% 설정"],["02-05","상품 등록"],].map(([d,a])=>(<div key={d+a} style={{display:"flex",gap:8,padding:"4px 0",fontSize:15}}>
            <span style={{color:LT.textDim,fontFamily:"monospace"}}>{d}</span><span style={{color:LT.textMid}}>{a}</span>
          </div>))}
        </div>
      </div>
    </div>
  </div>);}

  return(<div>
    {/* 서브탭 */}
    <div style={{display:"flex",gap:4,marginBottom:16}}>
      {subs.map(s=>(<button key={s.id} onClick={()=>setSub(s.id)} style={{padding:"6px 12px",borderRadius:8,border:"none",background:sub===s.id?`${LT.accent}15`:"transparent",color:sub===s.id?LT.accent:LT.textDim,fontSize:16,fontWeight:sub===s.id?700:500,cursor:"pointer"}}>{s.lb}</button>))}
    </div>

    {sub==='list'&&<>
      {/* 요약 카드 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:16}}>
        {[["전체 상품",products.length,LT.accent],["판매중",products.filter(p=>p.status==='판매중').length,LT.good],["준비중",products.filter(p=>p.status==='준비중').length,LT.warn],["품절",products.filter(p=>p.status==='품절').length,LT.danger],["총 매출","₩19.8M",LT.accent]].map(([n,v,c])=>(<div key={n} style={{background:LT.surface,borderRadius:LT.smRadius,padding:10,border:`1px solid ${LT.border}`,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:800,color:c,fontFamily:"monospace"}}>{v}</div><div style={{fontSize:15,color:LT.textDim}}>{n}</div>
        </div>))}
      </div>
      {/* 필터 + 검색 + 신규버튼 */}
      <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center"}}>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="상품명 / SKU 검색..." style={{...inputS,flex:1}}/>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={inputS}><option>전체</option>{cats.map(c=>(<option key={c}>{c}</option>))}</select>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={inputS}><option>전체</option>{Object.keys(statusC).map(s=>(<option key={s}>{s}</option>))}</select>
        <button style={{padding:"8px 14px",borderRadius:8,border:"none",background:LT.accent,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>+ 신규 상품</button>
      </div>
      {/* 상품 테이블 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,border:`1px solid ${LT.border}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"2.5fr 1fr 1fr 1fr 0.8fr 0.8fr 0.6fr",padding:"8px 12px",background:LT.bg3,fontSize:15,fontWeight:700,color:LT.textDim}}>
          <span>상품명</span><span>카테고리</span><span>판매가</span><span>상태</span><span>재고</span><span>판매</span><span>상세</span>
        </div>
        {filtered.map(p=>(<div key={p.id} style={{display:"grid",gridTemplateColumns:"2.5fr 1fr 1fr 1fr 0.8fr 0.8fr 0.6fr",padding:"10px 12px",borderBottom:`1px solid ${LT.border}`,fontSize:16,alignItems:"center"}}>
          <div><div style={{fontWeight:600,color:LT.text}}>{p.name}</div><div style={{fontSize:15,color:LT.textDim,fontFamily:"monospace"}}>{p.id}</div></div>
          <span style={{color:LT.textMid}}>{p.cat}</span>
          <div>{p.salePrice&&<span style={{textDecoration:"line-through",color:LT.textDim,fontSize:15,marginRight:4}}>₩{(p.price/1000).toFixed(0)}K</span>}<span style={{fontWeight:700,color:p.salePrice?LT.danger:LT.text,fontFamily:"monospace"}}>₩{((p.salePrice||p.price)/1000).toFixed(0)}K</span></div>
          <span style={{fontSize:15,padding:"2px 8px",borderRadius:4,background:`${statusC[p.status]}12`,color:statusC[p.status],fontWeight:700,display:"inline-block",width:"fit-content"}}>{p.status}</span>
          <span style={{fontSize:15,color:p.stock==='무제한'?LT.textDim:p.stock.includes('소진')?LT.danger:LT.warn}}>{p.stock}</span>
          <span style={{fontWeight:700,color:LT.text,fontFamily:"monospace"}}>{p.sold}</span>
          <button onClick={()=>setDetail(p)} style={{padding:"4px 8px",borderRadius:4,border:`1px solid ${LT.accent}30`,background:`${LT.accent}08`,color:LT.accent,fontSize:15,fontWeight:600,cursor:"pointer"}}>상세</button>
        </div>))}
      </div>
      <div style={{fontSize:15,color:LT.textDim,marginTop:6,textAlign:"right"}}>{filtered.length}개 표시 / 전체 {products.length}개</div>
    </>}

    {sub==='price'&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:16,fontWeight:700,color:LT.text}}>💰 가격 정책 관리</span>
        <div style={{display:"flex",gap:6}}><span style={{fontSize:15,padding:"3px 10px",borderRadius:6,background:`${LT.good}15`,color:LT.good,fontWeight:600}}>현행 v2 · 2026-02-10</span>
          <button style={{padding:"4px 10px",borderRadius:6,border:"none",background:LT.accent,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>새 버전</button></div>
      </div>
      {/* 구독 플랜 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:10}}>📋 구독 플랜 (월간/연간)</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
          {[["Free","₩0","₩0","7게이지·1축",LT.textMid,580],["Basic","₩19,000","₩190,000","21게이지·3축·알림",LT.info,320],["Pro","₩49,000","₩490,000","59게이지·위성·전체",LT.accent,285],["Enterprise","₩450,000","협의","API·팀·커스텀","#f59e0b",62]].map(([n,m,y,d,c,cnt])=>(<div key={n} style={{padding:12,borderRadius:8,background:`${c}06`,border:`1px solid ${c}15`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:15,fontWeight:700,color:c}}>{n}</span><span style={{fontSize:15,color:LT.textDim}}>{cnt}명</span></div>
            <div style={{fontSize:16,fontWeight:800,color:LT.text,fontFamily:"monospace",marginTop:6}}>{m}</div>
            <div style={{fontSize:15,color:LT.textDim}}>연간: {y}</div>
            <div style={{fontSize:15,color:LT.textDim,marginTop:4}}>{d}</div>
            <button style={{marginTop:8,padding:"4px 10px",borderRadius:4,border:`1px solid ${c}30`,background:"transparent",color:c,fontSize:15,fontWeight:600,cursor:"pointer",width:"100%"}}>가격 수정</button>
          </div>))}
        </div>
      </div>
      {/* 개별 상품 가격 일괄수정 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:16,fontWeight:700,color:LT.text}}>🏷️ 개별 상품 가격</span>
          <div style={{display:"flex",gap:6}}>
            <button style={{padding:"4px 10px",borderRadius:4,border:`1px solid ${LT.warn}30`,background:LT.bg2,color:LT.warn,fontSize:15,fontWeight:600,cursor:"pointer"}}>일괄 할인</button>
            <button style={{padding:"4px 10px",borderRadius:4,border:`1px solid ${LT.danger}30`,background:`${LT.danger}08`,color:LT.danger,fontSize:15,fontWeight:600,cursor:"pointer"}}>할인 해제</button>
          </div>
        </div>
        {products.filter(p=>p.price>0).map(p=>(<div key={p.id} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 0.8fr",padding:"6px 0",borderBottom:`1px solid ${LT.border}`,fontSize:16,alignItems:"center"}}>
          <span style={{fontWeight:600,color:LT.text}}>{p.name}</span>
          <span style={{fontFamily:"monospace",color:LT.textDim}}>₩{p.price.toLocaleString()}</span>
          <span style={{fontFamily:"monospace",color:p.salePrice?LT.danger:LT.textDim}}>₩{(p.salePrice||p.price).toLocaleString()}</span>
          <span style={{color:p.salePrice?LT.good:LT.textDim}}>{p.salePrice?Math.round((1-p.salePrice/p.price)*100)+'% 할인':'-'}</span>
          <button style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${LT.accent}30`,background:`${LT.accent}08`,color:LT.accent,fontSize:15,cursor:"pointer"}}>수정</button>
        </div>))}
      </div>
      {/* 가격 이력 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:8}}>📜 가격 변경 이력</div>
        {[["v2","2026-02-10","Pro ₩49K, 연간 할인 도입, OECD 패키지 20%할인","현행"],["v1","2026-01-15","초기 가격 설정, Basic ₩19K/Pro ₩49K/Enterprise ₩450K","만료"]].map(([ver,d,desc,s])=>(<div key={ver} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`1px solid ${LT.border}`,alignItems:"center"}}>
          <span style={{fontSize:16,fontWeight:700,color:s==='현행'?LT.good:LT.textDim,minWidth:24}}>{ver}</span>
          <span style={{fontSize:15,color:LT.textDim,fontFamily:"monospace",minWidth:70}}>{d}</span>
          <span style={{fontSize:15,color:LT.textMid,flex:1}}>{desc}</span>
          <span style={{fontSize:15,padding:"2px 6px",borderRadius:4,background:s==='현행'?`${LT.good}15`:`${LT.textDim}15`,color:s==='현행'?LT.good:LT.textDim}}>{s}</span>
        </div>))}
      </div>
    </>}

    {sub==='coupon'&&<>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:16,fontWeight:700,color:LT.text}}>🎫 쿠폰 / 프로모션</span>
        <button style={{padding:"6px 14px",borderRadius:8,border:"none",background:LT.accent,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer"}}>+ 새 쿠폰 생성</button>
      </div>
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,border:`1px solid ${LT.border}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.5fr 0.6fr 1fr 1fr 0.8fr 1.2fr 0.6fr",padding:"8px 12px",background:LT.bg3,fontSize:15,fontWeight:700,color:LT.textDim}}>
          <span>코드</span><span>할인</span><span>적용 범위</span><span>기간</span><span>사용/한도</span><span>남용감지</span><span>상태</span>
        </div>
        {[
          {code:"LAUNCH2026",disc:"30%",scope:"전체 플랜",start:"02-01",expire:"03-31",used:47,max:100,abuse:0,status:"활성"},
          {code:"YOUTUBE50",disc:"50%",scope:"Pro 첫달·신규만",start:"02-10",expire:"06-30",used:12,max:500,abuse:0,status:"활성"},
          {code:"EARLYBIRD",disc:"20%",scope:"연간 결제",start:"01-15",expire:"02-28",used:89,max:100,abuse:2,status:"만료임박"},
          {code:"PARTNER10",disc:"₩10K",scope:"Basic+·재구매",start:"02-05",expire:"12-31",used:5,max:50,abuse:0,status:"활성"},
          {code:"TEST100",disc:"100%",scope:"내부 테스트",start:"02-01",expire:"02-28",used:3,max:5,abuse:0,status:"내부"},
        ].map(cp=>(<div key={cp.code} style={{display:"grid",gridTemplateColumns:"1.5fr 0.6fr 1fr 1fr 0.8fr 1.2fr 0.6fr",padding:"8px 12px",borderBottom:`1px solid ${LT.border}`,fontSize:16,alignItems:"center"}}>
          <span style={{fontWeight:700,color:LT.accent,fontFamily:"monospace"}}>{cp.code}</span>
          <span style={{fontWeight:700,color:LT.good}}>{cp.disc}</span>
          <span style={{color:LT.textDim,fontSize:15}}>{cp.scope}</span>
          <span style={{color:LT.textDim,fontSize:15}}>{cp.start}~{cp.expire}</span>
          <div><div style={{height:4,background:LT.border,borderRadius:2,overflow:"hidden",marginBottom:2}}><div style={{width:`${cp.used/cp.max*100}%`,height:"100%",background:cp.used/cp.max>0.8?LT.warn:LT.accent}}/></div><span style={{fontSize:15,color:LT.textDim}}>{cp.used}/{cp.max}</span></div>
          <span style={{fontSize:15,color:cp.abuse>0?LT.danger:LT.textDim}}>{cp.abuse>0?`⚠️ ${cp.abuse}건 의심`:'정상'}</span>
          <span style={{fontSize:15,padding:"2px 6px",borderRadius:4,background:`${cp.status==='활성'?LT.good:cp.status==='만료임박'?LT.warn:cp.status==='내부'?LT.sat:LT.textDim}15`,color:cp.status==='활성'?LT.good:cp.status==='만료임박'?LT.warn:cp.status==='내부'?LT.sat:LT.textDim,fontWeight:600}}>{cp.status}</span>
        </div>))}
      </div>
      <div style={{background:LT.bg2,borderRadius:LT.smRadius,padding:12,border:`1px solid ${LT.border}`,marginTop:10}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.warn}}>🔍 남용 감지 정책</div>
        <div style={{fontSize:15,color:LT.textDim,marginTop:4,lineHeight:1.6}}>동일 카드 3회 이상 · 동일 이메일 도메인 5회 이상 · VPN/프록시 차단 · 가입 24시간 내 쿠폰 사용 제한</div>
      </div>
    </>}

    {sub==='category'&&<>
      <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>📂 상품 카테고리 관리</div>
      {[
        {name:"국가보고서",icon:"🌍",cnt:4,active:3,desc:"OECD 38개국 + 아시아 4개국 + 중국(위성전용) = 43개국 경제 진단 보고서",phase:"1단계 · 진열/인프라",c:LT.accent},
        {name:"주식감시",icon:"📈",cnt:3,active:0,desc:"100종목 · 276시설 · 21개국 · 위성 직접 감시 기반 종목 시그널",phase:"2단계 · 킬러/매출",c:LT.sat},
        {name:"애드온",icon:"🧩",cnt:2,active:1,desc:"국가 비교, 계절 패턴 등 기본 상품에 추가 가능한 부가 서비스",phase:"보조 상품",c:LT.info},
        {name:"커스터마이징",icon:"🏭",cnt:2,active:1,desc:"268개 카탈로그 · 10m~30cm 촬영 · 주문제작 · Enterprise 전용",phase:"3단계 · 프리미엄",c:"#f59e0b"},
      ].map(cat=>(<div key={cat.name} style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${cat.c}15`,marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22}}>{cat.icon}</span>
            <div><div style={{fontSize:16,fontWeight:700,color:LT.text}}>{cat.name}</div><div style={{fontSize:15,color:cat.c,fontWeight:600}}>{cat.phase}</div></div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:15,color:LT.textDim}}>{cat.cnt}개 상품 · {cat.active}개 판매중</div>
            <div style={{display:"flex",gap:4,marginTop:4,justifyContent:"flex-end"}}>
              <button style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${LT.accent}30`,background:`${LT.accent}08`,color:LT.accent,fontSize:15,cursor:"pointer"}}>수정</button>
              <button style={{padding:"3px 8px",borderRadius:4,border:`1px solid ${LT.border}`,background:"transparent",color:LT.textDim,fontSize:15,cursor:"pointer"}}>숨김</button>
            </div>
          </div>
        </div>
        <div style={{fontSize:16,color:LT.textMid,marginTop:8,lineHeight:1.6}}>{cat.desc}</div>
      </div>))}
    </>}

    {sub==='stats'&&<>
      <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>📊 판매 통계</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[["총 매출","₩19.8M",LT.good],["총 판매","1,440건",LT.accent],["평균 객단가","₩13,750",LT.info],["전환율","3.2%",LT.warn]].map(([n,v,c])=>(<div key={n} style={{background:LT.surface,borderRadius:LT.smRadius,padding:12,border:`1px solid ${LT.border}`,textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:800,color:c,fontFamily:"monospace"}}>{v}</div><div style={{fontSize:15,color:LT.textDim}}>{n}</div>
        </div>))}
      </div>
      {/* 상품별 매출 랭킹 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`,marginBottom:12}}>
        <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:10}}>🏆 상품별 매출 순위</div>
        {products.filter(p=>p.sold>0).sort((a,b)=>{const parse=s=>{const n=parseFloat(s.replace(/[₩,KM]/g,''));return s.includes('M')?n*1e6:s.includes('K')?n*1e3:n};return parse(b.revenue)-parse(a.revenue)}).map((p,i)=>(<div key={p.id} style={{display:"grid",gridTemplateColumns:"0.3fr 2fr 1fr 1fr 1.5fr",padding:"8px 0",borderBottom:`1px solid ${LT.border}`,fontSize:16,alignItems:"center"}}>
          <span style={{fontWeight:800,color:i<3?LT.accent:LT.textDim}}>{i+1}</span>
          <span style={{fontWeight:600,color:LT.text}}>{p.name}</span>
          <span style={{fontFamily:"monospace",color:LT.accent}}>{p.revenue}</span>
          <span style={{color:LT.textDim}}>{p.sold}건</span>
          <div style={{height:6,background:LT.border,borderRadius:3,overflow:"hidden"}}><div style={{width:`${Math.min(p.sold/847*100,100)}%`,height:"100%",background:i<3?LT.accent:LT.info,borderRadius:3}}/></div>
        </div>))}
      </div>
      {/* 카테고리별 */}
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`}}>
        <div style={{fontSize:15,fontWeight:700,color:LT.text,marginBottom:10}}>📂 카테고리별 비중</div>
        {[["국가보고서","₩10.1M","51%",LT.accent],["커스터마이징","₩8.8M","44%","#f59e0b"],["애드온","₩880K","5%",LT.info],["주식감시","₩0","0%",LT.sat]].map(([n,rev,pct,c])=>(<div key={n} style={{marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:16,marginBottom:3}}><span style={{color:c,fontWeight:600}}>{n}</span><span style={{color:LT.textDim}}>{rev} ({pct})</span></div>
          <div style={{height:6,background:LT.border,borderRadius:3,overflow:"hidden"}}><div style={{width:pct,height:"100%",background:c,borderRadius:3}}/></div>
        </div>))}
      </div>
    </>}
  </div>);
}


export default ProductMgmt;
