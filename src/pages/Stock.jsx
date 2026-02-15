import { useState } from 'react';
import T, { L as LT } from '../theme';
import { t } from '../i18n';
import TierLock from '../components/TierLock';
import { STOCKS, ARCHETYPE_LABELS, TIER_LABELS } from '../data/stocks';

// Dummy price data (→ Yahoo Finance API 연동 시 교체)
const DUMMY_PRICE={
  'TSLA':{p:342.50,ch:2.8},'TSMC':{p:185.20,ch:1.2},'005930':{p:82400,ch:-0.5,krw:true},
  '000660':{p:218000,ch:1.8,krw:true},'NVDA':{p:892.40,ch:3.5},'ASML':{p:985.30,ch:0.8},
  'AAPL':{p:228.50,ch:-0.3},'XOM':{p:118.90,ch:0.4},'005380':{p:265000,ch:1.1,krw:true},
  'VALE3':{p:58.20,ch:-1.2},'INTC':{p:32.80,ch:-2.1},'MU':{p:108.50,ch:2.2},
  'QCOM':{p:172.30,ch:0.6},'AMD':{p:168.90,ch:1.9},'TXN':{p:195.40,ch:0.3},
  '035420':{p:215000,ch:-0.8,krw:true},'035720':{p:42500,ch:-1.5,krw:true},
  '051910':{p:368000,ch:0.9,krw:true},'006400':{p:412000,ch:1.3,krw:true},
  '373220':{p:385000,ch:2.1,krw:true},'BABA':{p:118.50,ch:3.2},'9988':{p:118.50,ch:3.2},
  'AMZN':{p:198.20,ch:1.5},'MSFT':{p:415.80,ch:0.7},'GOOGL':{p:178.90,ch:1.1},
  'META':{p:585.30,ch:2.4},'2317':{p:185.00,ch:0.5},'TM':{p:192.40,ch:-0.2},
  'VOW3':{p:118.50,ch:-0.8},'SHEL':{p:32.80,ch:0.3},'CVX':{p:162.50,ch:0.6},
  'RIO':{p:68.90,ch:-0.4},'BHP':{p:42.30,ch:-0.7},'NUE':{p:158.20,ch:1.4},
  '005490':{p:312000,ch:0.8,krw:true},'LMT':{p:485.20,ch:0.2},'BA':{p:178.90,ch:-1.8},
  '009540':{p:128000,ch:2.5,krw:true},'ZTS':{p:178.50,ch:0.4},'COST':{p:892.30,ch:0.9},
  'WMT':{p:185.40,ch:0.5},'UPS':{p:142.80,ch:-0.6},'MAERSK':{p:1285.00,ch:-1.2},
};

function fmtPrice(sid){
  const d=DUMMY_PRICE[sid];
  if(!d) return {price:'—',change:'—',isUp:true};
  const price=d.krw?(d.p>=10000?(d.p/10000).toFixed(1)+'만':d.p.toLocaleString()):('$'+d.p.toFixed(2));
  return {price,change:(d.ch>0?'+':'')+d.ch.toFixed(1)+'%',isUp:d.ch>=0};
}

function StockPage({user,lang}){
  const L=lang||'ko';
  const [search,setSearch]=useState('');
  const [filterTier,setFilterTier]=useState(0);
  const [filterArch,setFilterArch]=useState('');

  const getName=s=>L==='ko'?s.n:(s.ne||s.n);

  const filtered=STOCKS.filter(s=>{
    if(filterTier && s.tier!==filterTier) return false;
    if(filterArch && s.a!==filterArch) return false;
    if(search){
      const q=search.toLowerCase();
      return getName(s).toLowerCase().includes(q)||s.sid.toLowerCase().includes(q)||s.sec.toLowerCase().includes(q);
    }
    return true;
  });

  const countries=[...new Set(STOCKS.map(s=>s.c))].length;
  const totalFac=STOCKS.reduce((a,s)=>a+s.fac,0);

  return(<div style={{maxWidth:780,margin:"0 auto",padding:"20px 16px"}}>
    {/* Header */}
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <span style={{fontSize:20}}>📈</span>
        <span style={{fontSize:18,fontWeight:800,color:LT.text}}>{t('stockTitle',L)}</span>
        <span style={{fontSize:14,padding:"2px 8px",borderRadius:4,background:LT.bg3,color:LT.textDim,fontWeight:600}}>Phase 2</span>
      </div>
      <div style={{fontSize:15,color:LT.textMid}}>
        {STOCKS.length}{t('stockStocks',L)} · {totalFac}{t('stockFac',L)} · {countries}{t('stockCountries',L)}
        <span style={{color:LT.textDim,marginLeft:8,fontSize:14}}>15min delayed</span>
      </div>
    </div>

    {/* 3-Tier Summary — monochrome */}
    <div className="grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
      {[1,2,3].map(tier=>{
        const cnt=STOCKS.filter(s=>s.tier===tier).length;
        const lb=TIER_LABELS[tier];
        const active=filterTier===tier;
        return(<div key={tier} onClick={()=>setFilterTier(active?0:tier)}
          style={{background:active?LT.bg3:LT.surface,borderRadius:LT.cardRadius,padding:14,
          border:`1px solid ${active?LT.text:LT.border}`,cursor:"pointer",transition:"all .2s"}}>
          <div style={{fontSize:22,fontWeight:900,color:LT.text,fontFamily:"monospace"}}>{cnt}</div>
          <div style={{fontSize:15,fontWeight:600,color:LT.textMid,marginTop:2}}>{L==='ko'?lb.ko:(lb.en||lb.ko)}</div>
        </div>);
      })}
    </div>

    {/* Search + Archetype Filter */}
    <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
      <input value={search} onChange={e=>setSearch(e.target.value)}
        placeholder={t('stockSearch',L)}
        style={{flex:1,minWidth:200,padding:"8px 12px",borderRadius:8,border:`1px solid ${LT.border}`,
        background:LT.surface,color:LT.text,fontSize:15,outline:"none"}}/>
      <div style={{display:"flex",gap:4}}>
        {Object.entries(ARCHETYPE_LABELS).map(([k,v])=>{
          const active=filterArch===k;
          return(<button key={k} onClick={()=>setFilterArch(active?'':k)}
            style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${active?LT.text:LT.border}`,
            background:active?LT.bg3:LT.surface,color:active?LT.text:LT.textDim,
            fontSize:15,fontWeight:active?700:500,cursor:"pointer"}}>{L==='ko'?v.ko:(v.en||v.ko)}</button>);
        })}
      </div>
    </div>

    {/* Column Header */}
    <div style={{display:"flex",alignItems:"center",padding:"8px 14px",fontSize:14,color:LT.textDim,fontWeight:600,borderBottom:`1px solid ${LT.border}`,marginBottom:2}}>
      <span style={{width:36}}></span>
      <span style={{flex:1}}>{t('stockCol',L)}</span>
      <span style={{width:80,textAlign:"right"}}>{t('stockColSat',L)}</span>
      <span style={{width:100,textAlign:"right"}}>{t('stockColPrice',L)}</span>
      <span style={{width:70,textAlign:"right"}}>{t('stockColChg',L)}</span>
    </div>

    {/* Stock List — table-style rows */}
    {filtered.slice(0,user?.plan==='PRO'||user?.plan==='ENTERPRISE'?100:10).map(s=>{
      const {price,change,isUp}=fmtPrice(s.sid);
      return(
      <div key={s.id} style={{display:"flex",alignItems:"center",padding:"10px 14px",
        borderBottom:`1px solid ${LT.border}`,cursor:"pointer",transition:"background .15s"}}
        onMouseEnter={e=>e.currentTarget.style.background=LT.bg2}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        {/* Country */}
        <span style={{width:36,fontSize:14,flexShrink:0}}>{s.c}</span>
        {/* Name + Ticker + Info */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:15,fontWeight:700,color:LT.text}}>{getName(s)}</span>
            <span style={{fontSize:14,color:LT.textDim,fontFamily:"monospace"}}>{s.sid}</span>
            <span style={{fontSize:13,padding:"1px 4px",borderRadius:3,background:LT.bg3,color:LT.textDim,fontWeight:600}}>T{s.tier}</span>
          </div>
          <div style={{fontSize:14,color:LT.textDim,marginTop:1}}>{s.sec} · {s.fac}{t('stockFacLabel',L)}</div>
        </div>
        {/* Satellite badges — compact */}
        <div style={{width:80,display:"flex",gap:2,justifyContent:"flex-end",flexWrap:"wrap",flexShrink:0}}>
          {s.sat.slice(0,3).map(st=>(<span key={st} style={{fontSize:12,padding:"1px 3px",borderRadius:2,background:LT.bg3,color:LT.textDim,fontWeight:600,lineHeight:1.3}}>{st}</span>))}
          {s.sat.length>3&&<span style={{fontSize:12,color:LT.textDim}}>+{s.sat.length-3}</span>}
        </div>
        {/* Price */}
        <div style={{width:100,textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text,fontFamily:"monospace"}}>{price}</div>
        </div>
        {/* Change */}
        <div style={{width:70,textAlign:"right",flexShrink:0}}>
          <span style={{fontSize:15,fontWeight:700,fontFamily:"monospace",
            color:isUp?LT.good:LT.danger}}>{change}</span>
        </div>
      </div>);
    })}

    {/* TierLock for non-PRO */}
    {filtered.length>10 && user?.plan!=='PRO' && user?.plan!=='ENTERPRISE' && (
      <TierLock plan={user?.plan||'FREE'} req="PRO" lang={L}>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:30,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:6}}>
            +{filtered.length-10} {t('stockMore',L)}
          </div>
          <div style={{fontSize:15,color:LT.textMid}}>PRO {t('stockMoreDesc',L)}</div>
        </div>
      </TierLock>
    )}

    {/* Video Funnel */}
    <div style={{background:LT.bg2,borderRadius:LT.cardRadius,padding:16,border:`1px solid ${LT.border}`,marginTop:14}}>
      <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:6}}>📺 YouTube {t('stockYT',L)}</div>
      <div style={{fontSize:15,color:LT.textMid,lineHeight:1.6}}>{t('stockYTDesc',L)}</div>
    </div>
  </div>);
}

export default StockPage;
