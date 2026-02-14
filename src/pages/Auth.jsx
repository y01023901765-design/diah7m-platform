import { useState } from 'react';
import T from '../theme';
import { t, LANG_LIST } from '../i18n';
import * as API from '../api';

function AuthPage({mode,onNavigate,onLogin,lang}){
  const L=lang||'ko';
  const [authMode,setAuthMode]=useState(mode==='signup'?'register':'login'); // login | register | reset
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({name:'',email:'',password:'',plan:'FREE',terms:false,privacy:false,marketing:false});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [showPw,setShowPw]=useState(false);
  const [resetSent,setResetSent]=useState(false);
  const update=(k,v)=>setForm(p=>({...p,[k]:v}));
  const switchMode=(m)=>{setAuthMode(m);setError('');setStep(1);setResetSent(false);};

  // ── 지역별 소셜로그인 ──
  const blang=L;
  const GLOBAL_SOCIAL=[
    {id:'google',name:'Google',icon:'G',bg:'#4285F4',fg:'#fff'},
    {id:'apple',name:'Apple',icon:'',bg:'#000',fg:'#fff'},
  ];
  const REGIONAL={
    ko:[{id:'kakao',name:'Kakao',icon:'💬',bg:'#FEE500',fg:'#000'},{id:'naver',name:'Naver',icon:'N',bg:'#03C75A',fg:'#fff'}],
    ja:[{id:'line',name:'LINE',icon:'L',bg:'#06C755',fg:'#fff'}],
  };
  const socialProviders=[...GLOBAL_SOCIAL,...(REGIONAL[L]||[])];
  const continueWith=L==='ko'?null:L==='ja'?'で続行':L==='zh'?'继续使用':L==='es'?'Continuar con':L==='ar'?'تابع باستخدام':'Continue with';

  // ── 비밀번호 강도 ──
  const pwChecks=[
    {label:t('pwCheck8',L),ok:form.password.length>=8},
    {label:t('pwCheckAlpha',L),ok:/[a-zA-Z]/.test(form.password)},
    {label:t('pwCheckNum',L),ok:/\d/.test(form.password)},
    {label:t('pwCheckSpecial',L),ok:/[^a-zA-Z0-9]/.test(form.password)},
  ];
  const pwStrength=pwChecks.filter(c=>c.ok).length;
  const pwAllPass=pwStrength===4;

  // ── 4등급 플랜 (확정 설계) ──
  const plans=[
    {id:'FREE',name:'Free',icon:'🔍',price:'₩0',usd:'$0',period:t('perMonth',L),desc:t('planFreeDesc',L),features:t('planFreeFeat',L),color:T.textMid,badge:'',mileage:t('mileageBonus',L)},
    {id:'BASIC',name:'Basic',icon:'📊',price:'₩19,000',usd:'$15',period:t('perMonth',L),desc:t('planBasicDesc',L),features:t('planBasicFeat',L),color:T.info,badge:'',mileage:t('milBasic',L)},
    {id:'PRO',name:'Pro',icon:'🛰️',price:'₩49,000',usd:'$39',period:t('perMonth',L),desc:t('planProDesc',L),features:t('planProFeat',L),color:T.accent,badge:'POPULAR',mileage:t('milPro',L)},
    {id:'ENTERPRISE',name:'Enterprise',icon:'🏛️',price:'₩450,000',usd:'$350',period:t('perMonth',L),desc:t('planEntDesc',L),features:t('planEntFeat',L),color:'#f59e0b',badge:'',mileage:t('milEnt',L)},
  ];

  // ── 핸들러 ──
  const handleNext=async()=>{
    setError('');
    if(step===1){
      if(!form.name.trim()){setError(t('nameRequired',L));return;}
      if(!form.email.includes('@')){setError(t('emailInvalid',L));return;}
      if(!pwAllPass){setError(t('pwRequired',L));return;}
      setStep(2);
    } else if(step===2){
      setStep(3);
    } else if(step===3){
      if(!form.terms||!form.privacy){setError(t('termsRequired',L));return;}
      setLoading(true);
      try {
        const data = await API.register(form.name, form.email, form.password);
        API.storeUser({ email: form.email, name: form.name, plan: form.plan, ...data.user });
        onLogin({ email: form.email, name: form.name, plan: form.plan, ...data.user });
      } catch(e) {
        // 서버 미연결 시 데모 가입 폴백
        if(e.message?.includes('Failed to fetch') || e.status === undefined) {
          onLogin({ email: form.email, name: form.name, plan: form.plan, demo: true });
        } else {
          setError(e.data?.error || e.message || 'Registration failed');
        }
      } finally { setLoading(false); }
    }
  };
  const handleLoginSubmit=async()=>{
    setError('');
    if(!form.email.includes('@')){setError(t('emailInvalid',L));return;}
    if(form.password.length<1){setError(t('pwEnterRequired',L));return;}
    setLoading(true);
    try {
      const data = await API.login(form.email, form.password);
      const user = data.user || { email: form.email, name: data.name || 'Investor' };
      API.storeUser(user);
      onLogin(user);
    } catch(e) {
      // 서버 미연결 시 데모 로그인 폴백
      if(e.message?.includes('Failed to fetch') || e.status === undefined) {
        onLogin({ email: form.email, name: 'Investor', plan: 'PRO', demo: true });
      } else {
        setError(e.data?.error || e.message || 'Login failed');
      }
    } finally { setLoading(false); }
  };
  const handleReset=()=>{
    setError('');
    if(!form.email.includes('@')){setError(t('emailInvalid',L));return;}
    setLoading(true);
    setTimeout(()=>{setLoading(false);setResetSent(true);},1000);
  };

  const inputStyle={width:"100%",padding:"14px 16px",borderRadius:10,border:`1px solid ${T.border}`,background:T.bg2,color:T.text,fontSize:14,outline:"none",boxSizing:"border-box",transition:"border-color .2s"};
  const labelStyle={display:"block",color:T.text,fontSize:12,fontWeight:600,marginBottom:6};
  const btnStyle=(dis)=>({width:"100%",padding:"14px",borderRadius:10,border:"none",background:dis?T.textDim:`linear-gradient(135deg,${T.accent},#0099cc)`,color:"#fff",fontSize:15,fontWeight:700,cursor:dis?"wait":"pointer",transition:"all .2s",boxShadow:`0 4px 16px ${T.accent}30`});
  const dividerEl=(<div style={{display:"flex",alignItems:"center",gap:12,margin:"20px 0"}}><div style={{flex:1,height:1,background:T.border}}/><span style={{fontSize:14,color:T.textDim}}>{t("or",L)}</span><div style={{flex:1,height:1,background:T.border}}/></div>);

  // ── 소셜 버튼 렌더러 ──
  const [socialLoading,setSocialLoading]=useState('');
  const handleSocial=(provider)=>{
    setSocialLoading(provider);
    setError('');
    // 실제 배포 시: window.location.href = `/api/v1/auth/oauth/${provider}`;
    setTimeout(()=>{
      setSocialLoading('');
      onLogin({email:`user@${provider}.com`,name:provider==='kakao'?'Kakao User':provider==='naver'?'Naver User':'User',plan:'PRO'});
    },1200);
  };
  const socialButtons=(<div style={{display:"flex",flexDirection:"column",gap:8}}>
    {socialProviders.map(s=>(<button key={s.id} onClick={()=>handleSocial(s.id)} disabled={!!socialLoading} style={{width:"100%",padding:"12px",borderRadius:10,border:`1px solid ${T.border}`,background:socialLoading===s.id?s.bg:T.bg2,color:socialLoading===s.id?s.fg:T.text,fontSize:13,fontWeight:600,cursor:socialLoading?"wait":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"all .2s",opacity:socialLoading&&socialLoading!==s.id?0.5:1}}>
      <span style={{width:24,height:24,borderRadius:6,background:socialLoading===s.id?"transparent":s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:socialLoading===s.id?"inherit":s.fg}}>{socialLoading===s.id?"⏳":s.icon}</span>
      {socialLoading===s.id?`${s.name} ${t('connecting',L)}`:continueWith?`${continueWith} ${s.name}`:s.name}
    </button>))}
  </div>);

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(180deg,${T.bg0},${T.bg1})`,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:authMode==='register'?480:420}}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:28,cursor:"pointer"}} onClick={()=>onNavigate('landing')}>🛰️</div>
          <div style={{fontSize:16,fontWeight:800,color:T.text,marginTop:8,letterSpacing:-.5}}>DIAH-7M</div>
          <div style={{fontSize:12,color:T.textMid,marginTop:4}}>{t("satPlatform",L)}</div>
        </div>

        <div style={{background:T.surface,borderRadius:T.cardRadius,padding:32,border:`1px solid ${T.border}`}}>

          {/* ════ 로그인 ════ */}
          {authMode==='login'&&(<>
            <h2 style={{fontSize:20,fontWeight:800,color:T.text,margin:"0 0 24px",letterSpacing:-.5}}>{t("loginTitle",L)}</h2>
            <div style={{marginBottom:16}}><label style={labelStyle}>{t('email',L)}</label><input type="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="name@company.com" style={inputStyle}/></div>
            <div style={{marginBottom:8}}><label style={labelStyle}>{t('password',L)}</label><input type="password" value={form.password} onChange={e=>update('password',e.target.value)} placeholder="" style={inputStyle} onKeyDown={e=>e.key==='Enter'&&handleLoginSubmit()}/></div>
            <div style={{textAlign:"right",marginBottom:16}}><span onClick={()=>switchMode('reset')} style={{fontSize:14,color:T.accent,cursor:"pointer"}}>{t("forgotPw",L)}</span></div>
            {error&&<div style={{fontSize:12,color:T.danger,marginBottom:12,padding:"8px 12px",background:`${T.danger}10`,borderRadius:8}}>{error}</div>}
            <button onClick={handleLoginSubmit} disabled={loading} style={btnStyle(loading)}>{loading?t("login",L)+"...":t("login",L)}</button>
            {dividerEl}
            {socialButtons}
            <div style={{textAlign:"center",marginTop:24,fontSize:12,color:T.textDim}}>{t("noAccount",L)} <span onClick={()=>switchMode('register')} style={{color:T.accent,cursor:"pointer",fontWeight:700}}>{t("freeSignup",L)}</span></div>
          </>)}

          {/* ════ 비밀번호 찾기 ════ */}
          {authMode==='reset'&&(<>
            <h2 style={{fontSize:20,fontWeight:800,color:T.text,margin:"0 0 8px",letterSpacing:-.5}}>{t('resetTitle',L)}</h2>
            <p style={{fontSize:12,color:T.textMid,margin:"0 0 24px",lineHeight:1.6}}>{t("resetDesc",L)}</p>
            {resetSent?(<div style={{textAlign:"center",padding:"24px 0"}}>
              <div style={{fontSize:32,marginBottom:12}}>✉️</div>
              <div style={{fontSize:14,fontWeight:700,color:T.good,marginBottom:8}}>{t('resetSent',L)}</div>
              <div style={{fontSize:12,color:T.textMid,lineHeight:1.6}}>{form.email}</div>
              <button onClick={()=>switchMode('login')} style={{...btnStyle(false),marginTop:20}}>{t("backToLogin",L)}</button>
            </div>):(<>
              <div style={{marginBottom:16}}><label style={labelStyle}>{t('email',L)}</label><input type="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="name@company.com" style={inputStyle}/></div>
              {error&&<div style={{fontSize:12,color:T.danger,marginBottom:12,padding:"8px 12px",background:`${T.danger}10`,borderRadius:8}}>{error}</div>}
              <button onClick={handleReset} disabled={loading} style={btnStyle(loading)}>{loading?t("resetBtn",L)+"...":t("resetBtn",L)}</button>
            </>)}
            <div style={{textAlign:"center",marginTop:20,fontSize:12,color:T.textDim}}><span onClick={()=>switchMode('login')} style={{color:T.accent,cursor:"pointer",fontWeight:600}}>{t("backToLogin",L)}</span></div>
          </>)}

          {/* ════ 회원가입 (3단계) ════ */}
          {authMode==='register'&&(<>
            {/* Back + Title */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <button onClick={()=>step>1?setStep(step-1):switchMode('login')} style={{background:"none",border:"none",color:T.text,cursor:"pointer",fontSize:18,padding:0}}>←</button>
              <h2 style={{fontSize:20,fontWeight:800,color:T.text,margin:0,letterSpacing:-.5}}>
                {step===1?t("createAccount",L):step===2?t("selectPlan",L):t("agreeTerms",L)}
              </h2>
              <span style={{fontSize:14,color:T.textDim,marginLeft:"auto"}}>{step}/3</span>
            </div>
            {/* Progress Bar */}
            <div style={{display:"flex",gap:6,marginBottom:28}}>
              {[1,2,3].map(s=>(<div key={s} style={{flex:1,height:4,borderRadius:2,background:s<=step?T.accent:T.border,transition:"background .3s"}}/>))}
            </div>

            {/* Step 1: 계정 정보 */}
            {step===1&&(<div style={{display:"flex",flexDirection:"column",gap:18}}>
              {/* 소셜 가입 (먼저 표시) */}
              <div style={{marginBottom:4}}>
                <div style={{fontSize:12,fontWeight:600,color:T.textMid,marginBottom:10}}>{t("quickSignup",L)}</div>
                {socialButtons}
              </div>
              {dividerEl}
              <div><label style={labelStyle}>{t('name',L)} *</label><input value={form.name} onChange={e=>update('name',e.target.value)} placeholder="" style={inputStyle}/></div>
              <div><label style={labelStyle}>{t("email",L)} *</label><input type="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="name@company.com" style={inputStyle}/></div>
              <div>
                <label style={labelStyle}>{t("password",L)} *</label>
                <div style={{position:"relative"}}>
                  <input type={showPw?"text":"password"} value={form.password} onChange={e=>update('password',e.target.value)} placeholder="" style={{...inputStyle,paddingRight:44}}/>
                  <button onClick={()=>setShowPw(!showPw)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:13}}>{showPw?"🙈":"👁️"}</button>
                </div>
                <div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap"}}>
                  {pwChecks.map((r,i)=>(<span key={i} style={{fontSize:14,fontWeight:600,color:r.ok?T.good:T.textDim,transition:"color .2s"}}>{r.ok?"✓":"○"} {r.label}</span>))}
                </div>
                {form.password.length>0&&<div style={{display:"flex",gap:3,marginTop:8}}>
                  {[1,2,3,4].map(i=>(<div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=pwStrength?(pwStrength<=1?T.danger:pwStrength<=2?T.warn:pwStrength<=3?T.warn:T.good):T.border,transition:"background .3s"}}/>))}
                </div>}
              </div>
            </div>)}

            {/* Step 2: 플랜 선택 */}
            {step===2&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>
              {plans.map(p=>(
                <div key={p.id} onClick={()=>update('plan',p.id)} style={{borderRadius:12,padding:"16px 18px",border:`2px solid ${form.plan===p.id?p.color||T.accent:T.border}`,background:form.plan===p.id?`${(p.color||T.accent)}08`:T.bg2,cursor:"pointer",transition:"all .2s",position:"relative"}}>
                  {p.badge&&<span style={{position:"absolute",top:-8,right:12,fontSize:12,fontWeight:800,padding:"2px 10px",borderRadius:10,background:T.accent,color:T.bg0}}>{p.badge}</span>}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{width:18,height:18,borderRadius:9,border:`2px solid ${form.plan===p.id?p.color||T.accent:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}>{form.plan===p.id&&<span style={{width:10,height:10,borderRadius:5,background:p.color||T.accent}}/>}</span>
                        <span style={{fontSize:15,fontWeight:700,color:T.text}}>{p.icon} {p.name}</span>
                      </div>
                      <div style={{fontSize:14,color:T.textDim,marginTop:4,marginLeft:26}}>{p.desc}</div>
                    </div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:800,color:T.text}}>{p.price}</div><div style={{fontSize:13,color:T.textDim}}>{p.usd}{p.period}</div></div>
                  </div>
                  {form.plan===p.id&&<div style={{marginTop:12,marginLeft:26}}>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {p.features.map((f,i)=>(<div key={i} style={{fontSize:14,color:T.textMid}}>✓ {f}</div>))}
                    </div>
                    <div style={{marginTop:8,fontSize:13,color:T.accent,fontWeight:600}}>🎁 {p.mileage}</div>
                  </div>}
                </div>
              ))}
              <div style={{fontSize:13,color:T.textDim,textAlign:"center",marginTop:4}}>{t("trialNote",L)}</div>
            </div>)}

            {/* Step 3: 약관 동의 */}
            {step===3&&(<div style={{display:"flex",flexDirection:"column",gap:14}}>
              {/* 선택 플랜 요약 */}
              <div style={{padding:"14px 16px",background:T.bg2,borderRadius:10,border:`1px solid ${T.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:14,color:T.textDim,marginBottom:2}}>{t("selectedPlan",L)}</div><span style={{fontSize:14,fontWeight:700,color:T.accent}}>{plans.find(p=>p.id===form.plan)?.icon} {plans.find(p=>p.id===form.plan)?.name}</span></div>
                  <div style={{textAlign:"right"}}><span style={{fontSize:16,fontWeight:800,color:T.text}}>{plans.find(p=>p.id===form.plan)?.price}</span><div style={{fontSize:13,color:T.textDim}}>{plans.find(p=>p.id===form.plan)?.period}</div></div>
                </div>
              </div>
              {/* 마일리지 안내 */}
              <div style={{padding:"10px 16px",background:`${T.good}08`,borderRadius:10,border:`1px solid ${T.good}15`,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>🎁</span>
                <span style={{fontSize:12,color:T.good,fontWeight:600}}>{t('mileageBonus',L)}</span>
              </div>
              {/* 전체 동의 */}
              <div onClick={()=>{const all=!(form.terms&&form.privacy&&form.marketing);update('terms',all);update('privacy',all);update('marketing',all);}} style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",background:`${T.accent}08`,borderRadius:10,border:`1px solid ${T.accent}20`,cursor:"pointer"}}>
                <span style={{width:20,height:20,borderRadius:4,border:`2px solid ${(form.terms&&form.privacy&&form.marketing)?T.accent:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:T.accent,fontWeight:800}}>{(form.terms&&form.privacy&&form.marketing)?"✓":""}</span>
                <span style={{fontSize:13,fontWeight:700,color:T.text}}>{t("agreeAll",L)}</span>
              </div>
              {[{k:'terms',label:t('termsService',L),req:true},{k:'privacy',label:t('termsPrivacy',L),req:true},{k:'marketing',label:t('termsMarketing',L),req:false}].map(item=>(
                <div key={item.k} onClick={()=>update(item.k,!form[item.k])} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",cursor:"pointer"}}>
                  <span style={{width:18,height:18,borderRadius:4,border:`2px solid ${form[item.k]?T.accent:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:T.accent,fontWeight:800}}>{form[item.k]?"✓":""}</span>
                  <span style={{fontSize:12,color:T.textMid,flex:1}}>{item.label}</span>
                  <span style={{fontSize:13,color:item.req?T.danger:T.textDim,fontWeight:600}}>{item.req?t('required',L):t('optional',L)}</span>
                </div>
              ))}
            </div>)}

            {/* Error */}
            {error&&<div style={{fontSize:12,color:T.danger,marginTop:14,padding:"8px 12px",background:`${T.danger}10`,borderRadius:8}}>{error}</div>}

            {/* Next / Submit */}
            <button onClick={handleNext} disabled={loading} style={{...btnStyle(loading),marginTop:24}}>
              {loading?t("createAccount",L)+"...":step<3?t("next",L):form.plan==='FREE'?t("free",L):t("trial",L)}
            </button>

            <div style={{textAlign:"center",marginTop:16,fontSize:12,color:T.textDim}}>{t("hasAccount",L)} <span onClick={()=>switchMode('login')} style={{color:T.accent,cursor:"pointer",fontWeight:700}}>{t("login",L)}</span></div>
          </>)}
        </div>
        <div style={{textAlign:"center",marginTop:20,fontSize:13,color:T.textDim}}>© DIAH-7M · Human Body National Economics · Jong-Won Yoon</div>
      </div>
    </div>
  );
}

// ═══ 9축 레이더 차트 ═══

export default AuthPage;
