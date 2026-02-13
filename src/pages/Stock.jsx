import { useState } from 'react';
import T from '../theme';
import { t } from '../i18n';
import TierLock from '../components/TierLock';
import { STOCKS, ARCHETYPE_LABELS, TIER_LABELS } from '../data/stocks';

function StockPage({user,lang}){
  const L=lang||'ko';
  const [search,setSearch]=useState('');
  const [filterTier,setFilterTier]=useState(0); // 0=all
  const [filterArch,setFilterArch]=useState('');

  const getName=s=>L==='ko'?s.n:(s.ne||s.n);

  // Filter + Search
  const filtered=STOCKS.filter(s=>{
    if(filterTier && s.tier!==filterTier) return false;
    if(filterArch && s.a!==filterArch) return false;
    if(search){
      const q=search.toLowerCase();
      return getName(s).toLowerCase().includes(q)||s.sid.toLowerCase().includes(q)||s.sec.toLowerCase().includes(q);
    }
    return true;
  });

  // Stats
  const countries=[...new Set(STOCKS.map(s=>s.c))].length;
  const totalFac=STOCKS.reduce((a,s)=>a+s.fac,0);

  return(<div style={{maxWidth:780,margin:"0 auto",padding:"20px 16px"}}>
    {/* Header */}
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <span style={{fontSize:20}}>📈</span>
        <span style={{fontSize:18,fontWeight:800,color:T.text}}>{L==='ko'?'주식종목 위성감시':'Stock Satellite Monitor'}</span>
        <span style={{fontSize:9,padding:"2px 8px",borderRadius:6,background:`${T.sat}15`,color:T.sat,fontWeight:600}}>Phase 2</span>
      </div>
      <div style={{fontSize:11,color:T.textMid}}>
        {STOCKS.length}{L==='ko'?'종목':'stocks'} · {totalFac}{L==='ko'?'시설':'facilities'} · {countries}{L==='ko'?'개국':'countries'} · {L==='ko'?'위성 직접 감시':'Direct satellite monitoring'}
      </div>
    </div>

    {/* 3-Tier Cards */}
    <div className="grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
      {[1,2,3].map(tier=>{
        const cnt=STOCKS.filter(s=>s.tier===tier).length;
        const lb=TIER_LABELS[tier];
        const active=filterTier===tier;
        return(<div key={tier} onClick={()=>setFilterTier(active?0:tier)}
          style={{background:active?`${lb.color}15`:T.surface,borderRadius:T.cardRadius,padding:14,
          border:`1px solid ${active?lb.color:T.border}`,cursor:"pointer",transition:"all .2s"}}>
          <div style={{fontSize:22,fontWeight:900,color:lb.color,fontFamily:"monospace"}}>{cnt}</div>
          <div style={{fontSize:11,fontWeight:700,color:T.text,marginTop:2}}>{L==='ko'?lb.ko:lb.en}</div>
        </div>);
      })}
    </div>

    {/* Search + Archetype Filter */}
    <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder={L==='ko'?'🔍 종목명·티커·섹터 검색':'🔍 Search name, ticker, sector'}
        style={{flex:1,minWidth:200,padding:"8px 12px",borderRadius:8,border:`1px solid ${T.border}`,
        background:T.surface,color:T.text,fontSize:12,outline:"none"}}/>
      <div style={{display:"flex",gap:4}}>
        {Object.entries(ARCHETYPE_LABELS).map(([k,v])=>{
          const active=filterArch===k;
          return(<button key={k} onClick={()=>setFilterArch(active?'':k)}
            style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${active?T.accent:T.border}`,
            background:active?`${T.accent}15`:T.surface,color:active?T.accent:T.textDim,
            fontSize:9,fontWeight:600,cursor:"pointer"}}>{L==='ko'?v.ko:v.en}</button>);
        })}
      </div>
    </div>

    {/* Result Count */}
    <div style={{fontSize:10,color:T.textDim,marginBottom:8}}>
      {filtered.length}/{STOCKS.length} {L==='ko'?'종목 표시':'shown'}
    </div>

    {/* Stock List */}
    {filtered.slice(0,user?.plan==='PRO'||user?.plan==='ENTERPRISE'?100:10).map(s=>{
      const tierLb=TIER_LABELS[s.tier];
      return(
      <div key={s.id} style={{background:T.surface,borderRadius:T.smRadius,padding:"12px 14px",
        border:`1px solid ${T.border}`,marginBottom:6,animation:"fadeIn 0.2s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14}}>{s.c}</span>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:12,fontWeight:700,color:T.text}}>{getName(s)}</span>
                <span style={{fontSize:8,color:T.textDim,fontFamily:"monospace"}}>{s.sid}</span>
                <span style={{fontSize:7,padding:"1px 5px",borderRadius:4,background:`${tierLb.color}15`,color:tierLb.color,fontWeight:700}}>T{s.tier}</span>
              </div>
              <div style={{fontSize:9,color:T.textDim}}>{s.sec} · {s.fac}{L==='ko'?'시설':' fac'} · {L==='ko'?ARCHETYPE_LABELS[s.a].ko:ARCHETYPE_LABELS[s.a].en}</div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:3,marginTop:6,flexWrap:"wrap"}}>
          {s.sat.map(st=>(<span key={st} style={{fontSize:7,padding:"2px 5px",borderRadius:3,background:`${T.sat}12`,color:T.sat,fontWeight:600}}>🛰️{st}</span>))}
        </div>
      </div>);
    })}

    {/* TierLock for non-PRO */}
    {filtered.length>10 && user?.plan!=='PRO' && user?.plan!=='ENTERPRISE' && (
      <TierLock plan={user?.plan||'FREE'} req="PRO" lang={L}>
        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:30,textAlign:"center"}}>
          <div style={{fontSize:14,fontWeight:800,color:T.text,marginBottom:6}}>
            +{filtered.length-10} {L==='ko'?'종목 더보기':'more stocks'}
          </div>
          <div style={{fontSize:10,color:T.textMid}}>PRO {L==='ko'?'플랜에서 전체 종목 감시':'plan for full stock monitoring'}</div>
        </div>
      </TierLock>
    )}

    {/* Video Funnel */}
    <div style={{background:`${T.accent}08`,borderRadius:T.cardRadius,padding:16,border:`1px solid ${T.accent}15`,marginTop:14}}>
      <div style={{fontSize:11,fontWeight:700,color:T.accent,marginBottom:6}}>📺 YouTube {L==='ko'?'연동 콘텐츠':'Content'}</div>
      <div style={{fontSize:10,color:T.textMid,lineHeight:1.6}}>{L==='ko'?
        '첫 영상: Tesla → TSMC → Samsung 순서로 공개. 위성이 본 공장 가동률 변화를 무료로 보여주고, 상세 시그널은 구독자 전용.':
        'First videos: Tesla → TSMC → Samsung. Free factory satellite views, detailed signals for subscribers only.'}</div>
    </div>
  </div>);
}

export default StockPage;
