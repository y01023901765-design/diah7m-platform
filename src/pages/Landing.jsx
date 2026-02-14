import { useState } from 'react';
import T from '../theme';
import { t, LANG_LIST } from '../i18n';
import LangSelector from '../components/LangSelector';
import { SYS, sysN, sysB } from '../components/TierLock';
import GlobeHero from '../components/GlobeHero';

function LandingPage({onNavigate,lang,setLang}){
  const L=lang||'ko';
  const [faqOpen,setFaqOpen]=useState({});
  const toggleFaq=k=>setFaqOpen(p=>({...p,[k]:!p[k]}));
  const isKR=L==='ko';
  const showPrice=(kr,usd)=>isKR?kr:usd;
  const plans=[
    {id:'FREE',name:'Free',icon:'🔍',price:showPrice('₩0','$0'),period:t('perMonth',L),desc:t('planFreeDesc',L),features:t('planFreeFeat',L),color:T.textMid,pop:false},
    {id:'BASIC',name:'Basic',icon:'📊',price:showPrice('₩19,000','$15'),period:t('perMonth',L),desc:t('planBasicDesc',L),features:t('planBasicFeat',L),color:T.info,pop:false},
    {id:'PRO',name:'Pro',icon:'🛰️',price:showPrice('₩49,000','$39'),period:t('perMonth',L),desc:t('planProDesc',L),features:t('planProFeat',L),color:T.accent,pop:true},
    {id:'ENT',name:'Enterprise',icon:'🏛️',price:showPrice('₩450,000','$350'),period:t('perMonth',L),desc:t('planEntDesc',L),features:t('planEntFeat',L),color:'#f59e0b',pop:false},
  ];
  const faqs=[
    {q:t('faq1q',L),a:t('faq1a',L)},
    {q:t('faq2q',L),a:t('faq2a',L)},
    {q:t('faq3q',L),a:t('faq3a',L)},
    {q:t('faq4q',L),a:t('faq4a',L)},
    {q:t('faq5q',L),a:t('faq5a',L)},
    {q:t('faq6q',L),a:t('faq6a',L)},
  ];
  const faqList=faqs;
  const featList=[
    {icon:"🛰️",title:t('feat1',L),desc:t('featDesc1',L),color:T.accent},
    {icon:"⏱️",title:t('feat2',L),desc:t('featDesc2',L),color:T.good},
    {icon:"🏥",title:t('feat3',L),desc:t('featDesc3',L),color:T.warn},
    {icon:"🔒",title:t('feat4',L),desc:t('featDesc4',L),color:T.orange},
    {icon:"📐",title:t('feat5',L),desc:t('featDesc5',L),color:T.info},
    {icon:"🎯",title:t('feat6',L),desc:t('featDesc6',L),color:T.danger},
  ];
  const stepList=[t('step1',L),t('step2',L),t('step3',L),t('step4',L),t('step5',L)];
  const sectionStyle={maxWidth:900,margin:"0 auto",padding:"80px 24px"};
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(180deg,${T.bg0},${T.bg1} 30%,${T.bg2} 70%,${T.bg0})`,color:T.text}}>
      {/* ═══ NAV ═══ */}
      <nav style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 24px",borderBottom:`1px solid ${T.border}`,background:`${T.bg0}d0`,backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:100,direction:"ltr"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>🛰️</span><span style={{fontSize:16,fontWeight:800,letterSpacing:-.5}}>DIAH-7M</span></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <LangSelector lang={L} setLang={setLang}/>
          <button onClick={()=>onNavigate('login')} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${T.border}`,background:"transparent",color:T.text,fontSize:12,fontWeight:600,cursor:"pointer"}}>{t('login',L)}</button>
          <button onClick={()=>onNavigate('signup')} style={{padding:"8px 16px",borderRadius:8,border:"none",background:T.accent,color:T.bg0,fontSize:12,fontWeight:700,cursor:"pointer"}}>{t('signup',L)}</button>
        </div>
      </nav>
      <GlobeHero lang={L}/>

      {/* ═══ FEATURES ═══ */}
      <div id="features" style={sectionStyle}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:11,fontWeight:700,color:T.sat,letterSpacing:2,marginBottom:8}}>WHY DIAH-7M</div>
          <h2 style={{fontSize:28,fontWeight:800,margin:0,letterSpacing:-1}}>{t('whyTitle',L)}</h2>
        </div>
        <div className="grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {featList.map(f=>(<div key={f.title} style={{background:T.surface,borderRadius:T.cardRadius,padding:24,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:28,marginBottom:12}}>{f.icon}</div>
            <div style={{fontSize:15,fontWeight:700,color:f.color,marginBottom:8}}>{f.title}</div>
            <div style={{fontSize:12,color:T.textMid,lineHeight:1.8}}>{f.desc}</div>
          </div>))}
        </div>
      </div>

      {/* ═══ HOW IT WORKS ═══ */}
      <div style={{...sectionStyle,background:`linear-gradient(180deg,${T.bg2}80,transparent)`}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:11,fontWeight:700,color:T.accent,letterSpacing:2,marginBottom:8}}>HOW IT WORKS</div>
          <h2 style={{fontSize:28,fontWeight:800,margin:0,letterSpacing:-1}}>{t('howTitle',L)}</h2>
        </div>
        <div style={{display:"flex",gap:0,justifyContent:"center",flexWrap:"wrap"}}>
          {stepList.map((s,i)=>(<div key={i} style={{display:"flex",alignItems:"center"}}>
            <div style={{width:140,textAlign:"center",padding:"0 8px"}}>
              <div style={{width:48,height:48,borderRadius:24,background:`${T.accent}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 10px"}}>{["🛰️","📡","🏥","✅","🎯"][i]}</div>
              <div style={{fontSize:10,fontWeight:800,color:T.accent,marginBottom:4}}>0{i+1}</div>
              <div style={{fontSize:13,fontWeight:700,color:T.text}}>{s}</div>
            </div>
            {i<4&&<div style={{width:30,height:2,background:T.border,flexShrink:0}}/>}
          </div>))}
        </div>
      </div>

      {/* ═══ SATELLITES ═══ */}
      <div style={sectionStyle}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,fontWeight:700,color:T.sat,letterSpacing:2,marginBottom:8}}>DATA SOURCES</div>
          <h2 style={{fontSize:28,fontWeight:800,margin:0,letterSpacing:-1}}>4 {t('satTab',L)} — {t('satCost',L)}</h2>
        </div>
        <div className="grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {[
            {icon:"🛰️",name:"VIIRS DNB",sat:"Suomi NPP",freq:t("freqDaily",L),res:"750m"},
            {icon:"💨",name:"Sentinel-5P",sat:"TROPOMI",freq:t("freqDaily",L),res:"7km"},
            {icon:"🌊",name:"Sentinel-1",sat:"C-band SAR",freq:t("freq12d",L),res:"5m"},
            {icon:"🌡️",name:"Landsat-9",sat:"OLI/TIRS",freq:t("freq16d",L),res:"30m"},
          ].map(s=>(<div key={s.name} style={{background:`${T.sat}06`,borderRadius:T.cardRadius,padding:20,border:`1px solid ${T.sat}20`,textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:8}}>{s.icon}</div>
            <div style={{fontSize:14,fontWeight:700,color:T.text}}>{s.name}</div>
            <div style={{fontSize:10,color:T.sat,marginTop:2}}>{s.sat}</div>
            <div style={{display:"flex",justifyContent:"center",gap:12,marginTop:12}}>
              <span style={{fontSize:10,color:T.textDim}}>{s.freq}</span>
              <span style={{fontSize:10,color:T.textDim}}>{s.res}</span>
              <span style={{fontSize:10,color:T.good,fontWeight:700}}>$0</span>
            </div>
          </div>))}
        </div>
      </div>

      {/* ═══ 9 SYSTEMS ═══ */}
      <div style={sectionStyle}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,fontWeight:700,color:T.warn,letterSpacing:2,marginBottom:8}}>9 BODY SYSTEMS</div>
          <h2 style={{fontSize:28,fontWeight:800,margin:0,letterSpacing:-1}}>{t('nineSystems',L)}</h2>
        </div>
        <div className="grid-3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {Object.entries(SYS).map(([k,s])=>(<div key={k} style={{background:`${s.color}06`,borderRadius:T.cardRadius,padding:"18px 16px",border:`1px solid ${s.color}15`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:20}}>{s.icon}</span>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:`${s.color}15`,color:s.color,fontWeight:700}}>{s.keys.length}</span>
            </div>
            <div style={{fontSize:14,fontWeight:700,color:T.text}}>{sysN(k,L)}</div>
            <div style={{fontSize:10,color:s.color,marginTop:2}}>{sysB(k,L)}</div>
          </div>))}
        </div>
      </div>

      {/* ═══ PRICING ═══ */}
      <div id="pricing" style={sectionStyle}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,fontWeight:700,color:T.good,letterSpacing:2,marginBottom:8}}>PRICING</div>
          <h2 style={{fontSize:28,fontWeight:800,margin:0,letterSpacing:-1}}>{t('pricingTitle',L)}</h2>
          <p style={{fontSize:13,color:T.textMid,marginTop:10}}>{t('pricingSub',L)}</p>
        </div>
        <div className="grid-4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {plans.map(p=>(<div key={p.id} style={{background:T.surface,borderRadius:T.cardRadius,padding:24,border:`2px solid ${p.pop?T.accent:T.border}`,position:"relative",display:"flex",flexDirection:"column"}}>
            {p.pop&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",fontSize:10,fontWeight:800,padding:"3px 14px",borderRadius:10,background:T.accent,color:T.bg0}}>POPULAR</div>}
            <div style={{fontSize:24,marginBottom:8}}>{p.icon}</div>
            <div style={{fontSize:18,fontWeight:800,color:p.color}}>{p.name}</div>
            <div style={{fontSize:10,color:T.textDim,marginTop:2}}>{p.desc}</div>
            <div style={{marginTop:16,marginBottom:16}}>
              <span style={{fontSize:28,fontWeight:900,color:T.text}}>{p.price}</span>
              <span style={{fontSize:11,color:T.textDim}}>{p.period}</span>
            </div>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
              {p.features.map((f,i)=>(<div key={i} style={{fontSize:11,color:T.textMid,display:"flex",gap:6}}><span style={{color:p.color}}>✓</span>{f}</div>))}
            </div>
            <button onClick={()=>onNavigate('signup')} style={{width:"100%",padding:"12px",borderRadius:10,border:p.pop?"none":`1px solid ${T.border}`,background:p.pop?`linear-gradient(135deg,${T.accent},#0099cc)`:T.bg2,color:p.pop?"#fff":T.text,fontSize:13,fontWeight:700,cursor:"pointer",marginTop:20}}>{p.id==='FREE'?t('free',L):t('trial',L)}</button>
          </div>))}
        </div>
      </div>

      {/* ═══ FAQ ═══ */}
      <div style={sectionStyle}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,fontWeight:700,color:T.info,letterSpacing:2,marginBottom:8}}>FAQ</div>
          <h2 style={{fontSize:28,fontWeight:800,margin:0,letterSpacing:-1}}>{t('faqTitle',L)}</h2>
        </div>
        <div style={{maxWidth:680,margin:"0 auto"}}>
          {faqList.map((f,i)=>(<div key={i} style={{borderBottom:`1px solid ${T.border}`,padding:"16px 0"}}>
            <div onClick={()=>toggleFaq(i)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
              <span style={{fontSize:14,fontWeight:600,color:T.text}}>{f.q}</span>
              <span style={{fontSize:16,color:T.textDim,transition:"transform .2s",transform:faqOpen[i]?"rotate(45deg)":"none"}}>+</span>
            </div>
            {faqOpen[i]&&<div style={{fontSize:12,color:T.textMid,lineHeight:1.8,marginTop:10}}>{f.a}</div>}
          </div>))}
        </div>
      </div>

      {/* ═══ CTA ═══ */}
      <div style={{textAlign:"center",padding:"80px 24px",background:`linear-gradient(180deg,transparent,${T.accent}04,transparent)`}}>
        <h2 style={{fontSize:30,fontWeight:900,margin:"0 0 12px",letterSpacing:-1}}>{t('ctaTitle',L)}</h2>
        <p style={{fontSize:14,color:T.textMid,margin:"0 0 32px"}}>{t('ctaDesc',L)}</p>
        <button onClick={()=>onNavigate('signup')} style={{padding:"16px 48px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${T.accent},#0099cc)`,color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:`0 6px 32px ${T.accent}40`}}>{t('ctaBtn',L)}</button>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer style={{borderTop:`1px solid ${T.border}`,padding:"40px 24px"}}>
        <div style={{maxWidth:900,margin:"0 auto",textAlign:"center"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:12}}><span>🛰️</span><span style={{fontWeight:800}}>DIAH-7M</span></div>
          <div style={{fontSize:11,color:T.textDim}}>© 2026 DIAH-7M · Human Body National Economics · NASA VIIRS · Copernicus Sentinel-1/5P · Landsat-9</div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
