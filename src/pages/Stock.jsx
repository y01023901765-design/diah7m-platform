import { useState } from 'react';
import T from '../theme';
import { t } from '../i18n';
import TierLock from '../components/TierLock';

function StockPage({user,lang}){
  const L=lang||'ko';
  const stocks=[
    {t:'TSLA',n:'Tesla',c:'🇺🇸',sec:'EV/Energy',fac:6,sat:['VIIRS','NO₂','Thermal','SAR'],sc:74,g:'주의',d:'+2.3%',p:'$248.50'},
    {t:'005930',n:L==='ko'?'삼성전자':'Samsung',c:'🇰🇷',sec:'Semiconductor',fac:5,sat:['VIIRS','NO₂','Thermal'],sc:82,g:'양호',d:'-0.8%',p:'₩72,400'},
    {t:'TSM',n:'TSMC',c:'🇹🇼',sec:'Semiconductor',fac:8,sat:['VIIRS','NO₂','Thermal','SAR'],sc:88,g:'양호',d:'+1.5%',p:'$178.30'},
    {t:'NVDA',n:'NVIDIA',c:'🇺🇸',sec:'AI/GPU',fac:3,sat:['VIIRS','NO₂'],sc:71,g:'주의',d:'+4.2%',p:'$721.60'},
    {t:'ASML',n:'ASML',c:'🇳🇱',sec:'Semiconductor Equip',fac:2,sat:['VIIRS','NO₂','SAR'],sc:79,g:'양호',d:'+0.9%',p:'€654.20'},
    {t:'000660',n:L==='ko'?'SK하이닉스':'SK Hynix',c:'🇰🇷',sec:'Memory',fac:4,sat:['VIIRS','NO₂','Thermal'],sc:68,g:'주의',d:'-1.2%',p:'₩198,500'},
  ];
  const tiers=[
    {n:L==='ko'?'킬러 10종목':'Killer 10',cnt:10,desc:L==='ko'?'위성 직접 감시 가능 · 시장 관심 최고':'Direct satellite monitoring · Highest market interest',c:T.danger},
    {n:L==='ko'?'섹터 40종목':'Sector 40',cnt:40,desc:L==='ko'?'핵심 산업 대표 종목 · 공급망 추적':'Key sector leaders · Supply chain tracking',c:T.warn},
    {n:L==='ko'?'글로벌 60종목':'Global 60',cnt:60,desc:L==='ko'?'21개국 주요 종목 · 매크로 연결':'21 countries · Macro correlation',c:T.info},
  ];
  return(<div style={{maxWidth:780,margin:"0 auto",padding:"20px 16px"}}>
    {/* Header */}
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <span style={{fontSize:20}}>📈</span>
        <span style={{fontSize:18,fontWeight:800,color:T.text}}>{L==='ko'?'주식종목 위성감시':'Stock Satellite Monitor'}</span>
        <span style={{fontSize:9,padding:"2px 8px",borderRadius:6,background:`${T.sat}15`,color:T.sat,fontWeight:600}}>Phase 2</span>
      </div>
      <div style={{fontSize:11,color:T.textMid}}>{L==='ko'?'100종목 · 276시설 · 21개국 · 위성 직접 감시':'100 stocks · 276 facilities · 21 countries · Direct satellite monitoring'}</div>
    </div>

    {/* 3-Tier Structure */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
      {tiers.map(tr=>(<div key={tr.n} style={{background:T.surface,borderRadius:T.cardRadius,padding:16,border:`1px solid ${tr.c}20`}}>
        <div style={{fontSize:24,fontWeight:900,color:tr.c,fontFamily:"monospace"}}>{tr.cnt}</div>
        <div style={{fontSize:12,fontWeight:700,color:T.text,marginTop:4}}>{tr.n}</div>
        <div style={{fontSize:9,color:T.textDim,marginTop:4,lineHeight:1.5}}>{tr.desc}</div>
      </div>))}
    </div>

    {/* Stock List */}
    <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>{L==='ko'?'🔥 킬러 종목 미리보기':'🔥 Killer Stocks Preview'}</div>
    {stocks.map(s=>{const col=s.g==='양호'?T.good:T.warn;return(
      <div key={s.t} style={{background:T.surface,borderRadius:T.smRadius,padding:"14px 16px",border:`1px solid ${T.border}`,marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:14}}>{s.c}</span>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13,fontWeight:700,color:T.text}}>{s.n}</span>
                <span style={{fontSize:9,color:T.textDim,fontFamily:"monospace"}}>{s.t}</span>
              </div>
              <div style={{fontSize:9,color:T.textDim}}>{s.sec} · {s.fac}{L==='ko'?'개 시설':' facilities'}</div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:15,fontWeight:800,color:T.text,fontFamily:"monospace"}}>{s.p}</div>
            <div style={{fontSize:10,color:parseFloat(s.d)>0?T.good:T.danger,fontWeight:600}}>{s.d}</div>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
          <div style={{display:"flex",gap:4}}>
            {s.sat.map(st=>(<span key={st} style={{fontSize:8,padding:"2px 6px",borderRadius:4,background:`${T.sat}12`,color:T.sat,fontWeight:600}}>🛰️ {st}</span>))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:28,height:28,borderRadius:14,background:`conic-gradient(${col} ${s.sc}%, ${T.border} ${s.sc}%)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:20,height:20,borderRadius:10,background:T.bg2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:800,color:col}}>{s.sc}</div>
            </div>
          </div>
        </div>
      </div>
    );})}

    {/* Coming Soon */}
    <TierLock plan="FREE" req="PRO" lang={L}>
      <div style={{background:T.surface,borderRadius:T.cardRadius,padding:40,textAlign:"center"}}>
        <div style={{fontSize:16,fontWeight:800,color:T.text,marginBottom:8}}>{L==='ko'?'나머지 94종목':'94 More Stocks'}</div>
        <div style={{fontSize:11,color:T.textMid}}>Sector 40 + Global 60</div>
      </div>
    </TierLock>

    {/* Video Funnel */}
    <div style={{background:`${T.accent}08`,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.accent}15`,marginTop:16}}>
      <div style={{fontSize:12,fontWeight:700,color:T.accent,marginBottom:8}}>📺 YouTube {L==='ko'?'연동 콘텐츠':'Content'}</div>
      <div style={{fontSize:11,color:T.textMid,lineHeight:1.6}}>{L==='ko'?
        '첫 영상: Tesla → TSMC → Samsung 순서로 공개. 위성이 본 공장 가동률 변화를 무료로 보여주고, 상세 종목 시그널은 구독자 전용.':
        'First videos: Tesla → TSMC → Samsung. Free factory satellite views, detailed stock signals for subscribers only.'}</div>
    </div>
  </div>);
}



export default StockPage;
