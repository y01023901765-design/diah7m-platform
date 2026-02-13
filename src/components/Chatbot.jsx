import { useState } from 'react';
import T from '../theme';
import { t } from '../i18n';

function ChatbotWidget({lang}){
  const L=lang||'ko';
  const [open,setOpen]=useState(false);
  const [msgs,setMsgs]=useState([{from:'bot',text:t('chatGreeting',L)}]);
  const [input,setInput]=useState('');
  const faqs=[
    {q:t('chatQ1',L),a:t('chatA1',L)},
    {q:t('chatQ2',L),a:t('chatA2',L)},
    {q:t('chatQ3',L),a:t('chatA3',L)},
    {q:t('chatQ4',L),a:t('chatA4',L)},
  ];
  const send=(text)=>{
    const q=text||input;if(!q.trim())return;
    setMsgs(p=>[...p,{from:'user',text:q}]);setInput('');
    const faq=faqs.find(f=>q.includes(f.q.slice(0,4)));
    setTimeout(()=>setMsgs(p=>[...p,{from:'bot',text:faq?faq.a:t('chatDefault',L)}]),800);
  };
  if(!open) return(<button onClick={()=>setOpen(true)} style={{position:"fixed",bottom:20,right:20,width:56,height:56,borderRadius:28,background:`linear-gradient(135deg,${T.accent},#0099cc)`,border:"none",color:"#fff",fontSize:24,cursor:"pointer",boxShadow:`0 4px 20px ${T.accent}40`,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>💬</button>);
  return(<div style={{position:"fixed",bottom:20,right:20,width:360,height:480,borderRadius:T.cardRadius,background:T.bg1,border:`1px solid ${T.border}`,boxShadow:"0 8px 32px rgba(0,0,0,.5)",zIndex:1000,display:"flex",flexDirection:"column",overflow:"hidden"}}>
    <div style={{padding:"14px 16px",background:T.surface,borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:700,color:T.text}}>🛰️ DIAH-7M {t('chatHelper',L)}</span><button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:T.textDim,fontSize:16,cursor:"pointer"}}>✕</button></div>
    <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
      {msgs.map((m,i)=>(<div key={i} style={{alignSelf:m.from==='user'?"flex-end":"flex-start",maxWidth:"80%",padding:"10px 14px",borderRadius:12,background:m.from==='user'?T.accent:T.surface,color:m.from==='user'?"#fff":T.text,fontSize:12,lineHeight:1.6}}>{m.text}</div>))}
    </div>
    {/* Quick questions */}
    <div style={{padding:"8px 12px",display:"flex",gap:6,overflowX:"auto",borderTop:`1px solid ${T.border}`}}>
      {faqs.slice(0,2).map(f=>(<button key={f.q} onClick={()=>send(f.q)} style={{padding:"6px 10px",borderRadius:16,border:`1px solid ${T.accent}30`,background:`${T.accent}08`,color:T.accent,fontSize:10,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{f.q}</button>))}
    </div>
    <div style={{padding:"10px 12px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8}}>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={t('chatPlaceholder',L)} style={{flex:1,padding:"10px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:T.bg2,color:T.text,fontSize:12,outline:"none"}}/>
      <button onClick={()=>send()} style={{padding:"10px 16px",borderRadius:10,border:"none",background:T.accent,color:T.white,fontWeight:700,cursor:"pointer",fontSize:12}}>{t('chatSend',L)}</button>
    </div>
  </div>);
}

// ═══ 글로벌 네비게이션 ═══

export default ChatbotWidget;
