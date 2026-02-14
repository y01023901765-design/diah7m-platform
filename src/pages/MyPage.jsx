import { useState, useEffect } from 'react';
import T, { L as LT } from '../theme';
import { t, LANG_LIST } from '../i18n';
import * as API from '../api';

function MyPage({user,onNav,lang,setGlobalLang}){
  const [tab,setTab]=useState('profile');
  const [msg,setMsg]=useState('');
  const [profile,setProfile]=useState({name:user.name||'',phone:''});
  const [mileage,setMileage]=useState(3500);

  useEffect(()=>{
    API.getMileage().then(d=>setMileage(d.balance||d.mileage||3500)).catch(()=>{});
  },[]);
  const [pw,setPw]=useState({cur:'',new1:'',new2:''});
  const [notifs,setNotifs]=useState({email:true,sms:false,kakao:true,slack:false,push:true});
  const [selectedLang,setSelectedLang]=useState(LANG_LIST.findIndex(l=>l.code===lang)||0);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [confirmCancel,setConfirmCancel]=useState(false);
  const L=lang||'ko';
  const flash=(m)=>{setMsg(m);setTimeout(()=>setMsg(''),2500);};
  const tabs=[{id:'profile',label:`👤 ${t('profile',L)}`},{id:'subscription',label:`💳 ${t('subscription',L)}`},{id:'mileage',label:`💎 ${t('mileage',L)}`},{id:'settings',label:`⚙️ ${t('settings',L)}`}];
  const inputStyle={width:"100%",padding:"12px 16px",borderRadius:10,border:`1px solid ${LT.border}`,background:LT.bg2,color:LT.text,fontSize:16,outline:"none",boxSizing:"border-box"};
  const exchanges=[{n:t("exReport",L),p:500},{n:t("exHistory",L),p:300},{n:t("exApi",L),p:1000},{n:t("exExport",L),p:300},{n:t("exDiscount",L),p:100}];
  return(<div style={{maxWidth:680,margin:"0 auto",padding:"20px 16px"}}>
    {/* Toast */}
    {msg&&<div style={{position:"fixed",top:70,left:"50%",transform:"translateX(-50%)",padding:"10px 24px",borderRadius:10,background:LT.good,color:"#fff",fontSize:16,fontWeight:700,zIndex:300,boxShadow:"0 4px 20px rgba(0,0,0,.3)",animation:"fadeIn .3s ease"}}>{msg}</div>}
    <div style={{display:"flex",gap:4,marginBottom:20}}>
      {tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 14px",borderRadius:8,border:"none",background:"transparent",color:tab===t.id?LT.text:LT.textDim,borderBottom:tab===t.id?'2px solid #111':'2px solid transparent',fontSize:15,fontWeight:tab===t.id?700:500,cursor:"pointer"}}>{t.label}</button>))}
    </div>
    {tab==='profile'&&<div>
      <h2 style={{fontSize:18,fontWeight:800,color:LT.text,marginBottom:20}}>{t('profile',L)}</h2>
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:24,border:`1px solid ${LT.border}`,display:"grid",gap:16}}>
        <div><label style={{fontSize:15,fontWeight:600,color:LT.textMid,display:"block",marginBottom:6}}>{t("name",L)}</label><input value={profile.name} onChange={e=>setProfile(p=>({...p,name:e.target.value}))} style={inputStyle}/></div>
        <div><label style={{fontSize:15,fontWeight:600,color:LT.textMid,display:"block",marginBottom:6}}>{t("email",L)}</label><input defaultValue={user.email} style={{...inputStyle,opacity:.6}} disabled/></div>
        <div><label style={{fontSize:15,fontWeight:600,color:LT.textMid,display:"block",marginBottom:6}}>{t("phone",L)}</label><input value={profile.phone} onChange={e=>setProfile(p=>({...p,phone:e.target.value}))} placeholder="+82 10-0000-0000" style={inputStyle}/></div>
        <button onClick={()=>flash(t('profileSaved',L))} style={{padding:"12px",borderRadius:10,border:"none",background:'#111',color:'#fff',fontWeight:700,cursor:"pointer",width:"fit-content"}}>{t("save",L)}</button>
      </div>
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:24,border:`1px solid ${LT.border}`,marginTop:16}}>
        <h3 style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>{t("changePw",L)}</h3>
        <div style={{display:"grid",gap:12,maxWidth:360}}>
          <input type="password" placeholder={t("curPw",L)} value={pw.cur} onChange={e=>setPw(p=>({...p,cur:e.target.value}))} style={inputStyle}/>
          <input type="password" placeholder={t("newPw",L)} value={pw.new1} onChange={e=>setPw(p=>({...p,new1:e.target.value}))} style={inputStyle}/>
          <input type="password" placeholder={t("confirmPw",L)} value={pw.new2} onChange={e=>setPw(p=>({...p,new2:e.target.value}))} style={inputStyle}/>
          <button onClick={()=>{if(!pw.cur||!pw.new1){flash(t('fillAllFields',L));return;}if(pw.new1!==pw.new2){flash(t('pwMismatch',L));return;}flash(t('pwChanged',L));setPw({cur:'',new1:'',new2:''});}} style={{padding:"10px",borderRadius:8,border:`1px solid ${LT.border}`,background:LT.bg2,color:LT.text,fontWeight:600,cursor:"pointer",width:"fit-content"}}>{t("change",L)}</button>
        </div>
      </div>
    </div>}
    {tab==='subscription'&&<div>
      <h2 style={{fontSize:18,fontWeight:800,color:LT.text,marginBottom:20}}>{t("subscription",L)}</h2>
      {confirmCancel?<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:32,border:`1px solid ${LT.danger}30`,textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:12}}>⚠️</div>
        <div style={{fontSize:16,fontWeight:700,color:LT.danger,marginBottom:8}}>{t("confirmCancelSub",L)}</div>
        <div style={{fontSize:15,color:LT.textMid,lineHeight:1.8,marginBottom:20}}>{t("cancelInfo",L)}</div>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          <button onClick={()=>{setConfirmCancel(false);flash(t('subCancelled',L));}} style={{padding:"10px 24px",borderRadius:8,border:"none",background:LT.danger,color:"#fff",fontWeight:700,cursor:"pointer"}}>{t("confirmCancelBtn",L)}</button>
          <button onClick={()=>setConfirmCancel(false)} style={{padding:"10px 24px",borderRadius:8,border:`1px solid ${LT.border}`,background:"transparent",color:LT.text,fontWeight:600,cursor:"pointer"}}>{t("goBack",L)}</button>
        </div>
      </div>:<div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:24,border:`1px solid ${LT.accent}30`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontSize:16,color:LT.textDim}}>{t("curPlan",L)}</div><div style={{fontSize:24,fontWeight:900,color:LT.accent,marginTop:4}}>🛰️ Pro</div><div style={{fontSize:16,color:LT.text,marginTop:2}}>₩49,000{t('perMonth',L)}</div></div>
          <span style={{padding:"6px 14px",borderRadius:20,background:`${LT.good}15`,color:LT.good,fontSize:15,fontWeight:700}}>{t("active",L)}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {[[t("nextBill",L),"2026-03-01"],[t("payMethod",L),"Visa ****4242"],[t("streak",L),"3 months 🔥"]].map(([k,v])=>(<div key={k} style={{padding:12,background:LT.bg2,borderRadius:8}}><div style={{fontSize:16,color:LT.textDim}}>{k}</div><div style={{fontSize:16,fontWeight:700,color:LT.text,marginTop:4}}>{v}</div></div>))}
        </div>
        <div style={{display:"flex",gap:8,marginTop:16}}>
          <button onClick={()=>flash(t('paymentPending',L))} style={{padding:"10px 16px",borderRadius:8,border:"none",background:'#111',color:'#fff',fontWeight:600,cursor:"pointer"}}>{t("changePlan",L)}</button>
          <button onClick={()=>flash(t('paymentPending',L))} style={{padding:"10px 16px",borderRadius:8,border:`1px solid ${LT.border}`,background:"transparent",color:LT.textMid,fontWeight:600,cursor:"pointer"}}>{t("changePayment",L)}</button>
          <button onClick={()=>setConfirmCancel(true)} style={{padding:"10px 16px",borderRadius:8,border:`1px solid ${LT.danger}30`,background:`${LT.danger}08`,color:LT.danger,fontWeight:600,cursor:"pointer"}}>{t("cancelSub",L)}</button>
        </div>
      </div>}
    </div>}
    {tab==='mileage'&&<div>
      <h2 style={{fontSize:18,fontWeight:800,color:LT.text,marginBottom:20}}>{t("mileage",L)}</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,textAlign:"center"}}><div style={{fontSize:16,color:LT.textDim}}>{t("balance",L)}</div><div style={{fontSize:28,fontWeight:900,color:LT.warn,marginTop:4}}>{mileage.toLocaleString()}</div><div style={{fontSize:16,color:LT.textDim}}>P</div></div>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,textAlign:"center"}}><div style={{fontSize:16,color:LT.textDim}}>{t("earned",L)}</div><div style={{fontSize:28,fontWeight:900,color:LT.good,marginTop:4}}>+420</div><div style={{fontSize:16,color:LT.textDim}}>P</div></div>
        <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`,textAlign:"center"}}><div style={{fontSize:16,color:LT.textDim}}>{t("spent",L)}</div><div style={{fontSize:28,fontWeight:900,color:LT.info,marginTop:4}}>-200</div><div style={{fontSize:16,color:LT.textDim}}>P</div></div>
      </div>
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:20,border:`1px solid ${LT.border}`}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>{t("exchangeMenu",L)}</div>
        {exchanges.map(m=>(<div key={m.n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${LT.border}`}}><span style={{fontSize:15,color:LT.text}}>{m.n}</span><button onClick={()=>{if(mileage<m.p){flash(`⚠️ ${t('milInsufficient',L)} (${m.p}P)`);return;}setMileage(prev=>prev-m.p);flash(`✅ ${m.n} (-${m.p}P)`);}} style={{padding:"4px 12px",borderRadius:6,border:`1px solid ${LT.warn}30`,background:`${LT.warn}08`,color:LT.warn,fontSize:16,fontWeight:700,cursor:"pointer"}}>{m.p}P</button></div>))}
      </div>
    </div>}
    {tab==='settings'&&<div>
      <h2 style={{fontSize:18,fontWeight:800,color:LT.text,marginBottom:20}}>{t("notifSettings",L)}</h2>
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:24,border:`1px solid ${LT.border}`}}>
        {[{k:"email",n:t("emailNotif",L),d:t("emailNotifDesc",L)},{k:"sms",n:t("smsNotif",L),d:t("smsNotifDesc",L)},{k:"kakao",n:t("kakaoNotif",L),d:t("kakaoNotifDesc",L)},{k:"slack",n:t("slackNotif",L),d:t("slackNotifDesc",L)},{k:"push",n:t("pushNotif",L),d:t("pushNotifDesc",L)}].map((s,i)=>(<div key={s.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:i<4?`1px solid ${LT.border}`:"none"}}><div><div style={{fontSize:16,fontWeight:600,color:LT.text}}>{s.n}</div><div style={{fontSize:16,color:LT.textDim,marginTop:2}}>{s.d}</div></div><div onClick={()=>{setNotifs(p=>({...p,[s.k]:!p[s.k]}));flash(`${!notifs[s.k]?'✅':'⬜'} ${s.n}`);}} style={{width:44,height:24,borderRadius:12,background:notifs[s.k]?LT.accent:LT.border,cursor:"pointer",position:"relative",transition:"background .2s"}}><div style={{width:20,height:20,borderRadius:10,background:"#fff",position:"absolute",top:2,left:notifs[s.k]?22:2,transition:"left .2s"}}/></div></div>))}
      </div>
      <div style={{background:LT.surface,borderRadius:LT.cardRadius,padding:24,border:`1px solid ${LT.border}`,marginTop:16}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.text,marginBottom:12}}>{t('langSetting',L)}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {LANG_LIST.map((l,i)=>(<button key={i} onClick={()=>{setSelectedLang(i);if(setGlobalLang)setGlobalLang(l.code);flash(`✅ ${l.flag} ${l.name}`);}} style={{padding:"8px 14px",borderRadius:8,border:`1px solid ${i===selectedLang?'#111':LT.border}`,background:i===selectedLang?'#F5F5F5':'transparent',color:i===selectedLang?'#111':LT.textDim,fontSize:15,fontWeight:i===selectedLang?700:500,cursor:"pointer"}}>{l.flag} {l.name}</button>))}
        </div>
      </div>
      {confirmDelete?<div style={{background:`${LT.danger}06`,borderRadius:LT.cardRadius,padding:24,border:`1px solid ${LT.danger}30`,marginTop:16}}>
        <div style={{fontSize:16,fontWeight:700,color:LT.danger,marginBottom:8}}>{t("confirmDeleteTitle",L)}</div>
        <div style={{fontSize:15,color:LT.textMid,lineHeight:1.8,marginBottom:16}}>{t("confirmDeleteDesc",L)}</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{setConfirmDelete(false);flash(t('accountDeleted',L));}} style={{padding:"10px 20px",borderRadius:8,border:"none",background:LT.danger,color:"#fff",fontWeight:700,cursor:"pointer"}}>{t("permDelete",L)}</button>
          <button onClick={()=>setConfirmDelete(false)} style={{padding:"10px 20px",borderRadius:8,border:`1px solid ${LT.border}`,background:"transparent",color:LT.text,fontWeight:600,cursor:"pointer"}}>{t("cancel",L)}</button>
        </div>
      </div>:<button onClick={()=>setConfirmDelete(true)} style={{marginTop:16,padding:"10px 16px",borderRadius:8,border:`1px solid ${LT.danger}30`,background:"transparent",color:LT.danger,fontSize:15,fontWeight:600,cursor:"pointer"}}>{t("deleteAccount",L)}</button>}
    </div>}
  </div>);
}

// ═══ 관리자 패널 ═══
// ═══ 상품관리 (쇼핑몰 풀기능) ═══

export default MyPage;
