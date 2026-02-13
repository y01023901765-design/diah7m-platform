import { useState, useRef, useEffect } from 'react';
import T from '../theme';
import { LANG_LIST } from '../i18n';

function LangSelector({lang,setLang}){
  const [open,setOpen]=useState(false);
  const cur=LANG_LIST.find(function(l){return l.code===lang;})||LANG_LIST[0];
  const ref=useRef(null);
  useEffect(function(){
    function close(e){if(ref.current&&!ref.current.contains(e.target))setOpen(false);}
    document.addEventListener('mousedown',close);
    return function(){document.removeEventListener('mousedown',close);};
  },[]);
  return(
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={function(){setOpen(!open);}} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",borderRadius:8,border:"1px solid "+T.border,background:T.surface+"80",color:T.text,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>
        {cur.flag} {cur.code.toUpperCase()} <span style={{fontSize:9,opacity:0.6}}>▼</span>
      </button>
      {open&&<div style={{position:"absolute",top:"100%",right:0,marginTop:4,width:180,maxHeight:320,overflowY:"auto",background:T.bg1,border:"1px solid "+T.border,borderRadius:10,boxShadow:"0 8px 32px rgba(0,0,0,.5)",zIndex:500,padding:4}}>
        {LANG_LIST.map(function(l){return(
          <button key={l.code} onClick={function(){setLang(l.code);setOpen(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",border:"none",borderRadius:6,background:l.code===lang?T.accent+"15":"transparent",color:l.code===lang?T.accent:T.text,fontSize:11,fontWeight:l.code===lang?700:400,cursor:"pointer",textAlign:"left"}}>{l.flag} {l.name}</button>
        );})}
      </div>}
    </div>
  );
}


export default LangSelector;
