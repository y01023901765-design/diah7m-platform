import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { t } from "../i18n";

const T={bg0:'#04060e',accent:'#00d4ff',good:'#00e5a0',warn:'#f0b429',danger:'#ff5c5c',text:'#e8ecf4',textMid:'#8b95a8',textDim:'#7a8a9e',border:'#1e2a42',surface:'#151c2e'};

const ACTIVE=[
  {iso:"KOR",n:"대한민국",en:"South Korea",lat:37.5,lon:127,home:true,score:68},
  {iso:"USA",n:"미국",en:"United States",lat:38.9,lon:-97,score:72},{iso:"JPN",n:"일본",en:"Japan",lat:36.2,lon:138.3,score:65},
  {iso:"DEU",n:"독일",en:"Germany",lat:51.2,lon:10.4,score:61},{iso:"GBR",n:"영국",en:"United Kingdom",lat:54,lon:-2,score:63},
  {iso:"FRA",n:"프랑스",en:"France",lat:46.6,lon:2.3,score:60},{iso:"CAN",n:"캐나다",en:"Canada",lat:56,lon:-96,score:70},
  {iso:"AUS",n:"호주",en:"Australia",lat:-25.3,lon:134,score:69},{iso:"ITA",n:"이탈리아",en:"Italy",lat:42.5,lon:12.5,score:55},
  {iso:"ESP",n:"스페인",en:"Spain",lat:40,lon:-4,score:58},{iso:"NLD",n:"네덜란드",en:"Netherlands",lat:52.1,lon:5.3,score:71},
  {iso:"CHE",n:"스위스",en:"Switzerland",lat:46.8,lon:8.2,score:76},{iso:"SWE",n:"스웨덴",en:"Sweden",lat:62,lon:15,score:73},
  {iso:"NOR",n:"노르웨이",en:"Norway",lat:65,lon:13,score:75},{iso:"DNK",n:"덴마크",en:"Denmark",lat:56,lon:10,score:72},
  {iso:"FIN",n:"핀란드",en:"Finland",lat:64,lon:26,score:70},{iso:"AUT",n:"오스트리아",en:"Austria",lat:47.5,lon:14.6,score:64},
  {iso:"BEL",n:"벨기에",en:"Belgium",lat:50.5,lon:4.4,score:62},{iso:"IRL",n:"아일랜드",en:"Ireland",lat:53.4,lon:-8,score:68},
  {iso:"PRT",n:"포르투갈",en:"Portugal",lat:39.4,lon:-8.2,score:57},{iso:"GRC",n:"그리스",en:"Greece",lat:39.1,lon:21.8,score:50},
  {iso:"CZE",n:"체코",en:"Czechia",lat:49.8,lon:15.5,score:63},{iso:"POL",n:"폴란드",en:"Poland",lat:51.9,lon:19.1,score:62},
  {iso:"HUN",n:"헝가리",en:"Hungary",lat:47.2,lon:19.5,score:56},{iso:"SVK",n:"슬로바키아",en:"Slovakia",lat:48.7,lon:19.7,score:58},
  {iso:"SVN",n:"슬로베니아",en:"Slovenia",lat:46.2,lon:14.8,score:61},{iso:"EST",n:"에스토니아",en:"Estonia",lat:58.6,lon:25,score:66},
  {iso:"LVA",n:"라트비아",en:"Latvia",lat:56.9,lon:24.1,score:59},{iso:"LTU",n:"리투아니아",en:"Lithuania",lat:55.2,lon:24,score:60},
  {iso:"ISL",n:"아이슬란드",en:"Iceland",lat:64.9,lon:-19,score:74},{iso:"LUX",n:"룩셈부르크",en:"Luxembourg",lat:49.8,lon:6.1,score:77},
  {iso:"NZL",n:"뉴질랜드",en:"New Zealand",lat:-41,lon:174,score:71},{iso:"ISR",n:"이스라엘",en:"Israel",lat:31.5,lon:34.8,score:64},
  {iso:"TUR",n:"튀르키예",en:"Türkiye",lat:39,lon:35,score:52},{iso:"MEX",n:"멕시코",en:"Mexico",lat:23.6,lon:-102.5,score:54},
  {iso:"CHL",n:"칠레",en:"Chile",lat:-35.7,lon:-71.5,score:59},{iso:"COL",n:"콜롬비아",en:"Colombia",lat:4.6,lon:-74.1,score:53},
  {iso:"CRI",n:"코스타리카",en:"Costa Rica",lat:10,lon:-84,score:57},{iso:"SGP",n:"싱가포르",en:"Singapore",lat:1.4,lon:103.8,score:78},
  {iso:"HKG",n:"홍콩",en:"Hong Kong",lat:22.3,lon:114.2,score:67},{iso:"TWN",n:"대만",en:"Taiwan",lat:23.7,lon:121,score:71},
  {iso:"IND",n:"인도",en:"India",lat:21,lon:78.9,score:58},{iso:"CHN",n:"중국",en:"China",lat:35,lon:105,score:62},
];

const AMBIENT=[
  [40.7,-74],[34.1,-118.2],[41.9,-87.6],[29.8,-95.4],[33.4,-112],
  [47.6,-122.3],[25.8,-80.2],[49.3,-123.1],[45.5,-73.6],[51,-114],
  [-23.5,-46.6],[-34.6,-58.4],[-12,-77],[-33.4,-70.6],[10.5,-66.9],
  [-15.8,-47.9],[-22.9,-43.2],[-0.2,-78.5],
  [30,31],[6.5,3.4],[-1.3,36.8],[-26.2,28.1],[33.9,-6.9],
  [36.8,10.2],[9,38.7],[5.6,-0.2],[-4,39.7],[14.7,-17.5],
  [24.7,46.7],[25.3,55.3],[35.7,51.4],[41,29],[29.4,48],
  [14.6,121],[13.8,100.5],[3.1,101.7],[21,105.8],[-6.2,106.8],
  [19,72.8],[13,77.6],[28.6,77.2],[22.6,88.4],
  [31.2,121.5],[39.9,116.4],[23.1,113.3],[30.6,104],
  [43.3,131.9],[35.2,136.9],[34.7,135.5],
  [55.8,37.6],[59.9,30.3],[56.3,44],
  [44.4,26.1],[50.4,30.5],[42.7,23.3],
  [-33.9,151.2],[-37.8,145],[-31.9,115.9],[-36.8,174.8],
];

function scoreColor(s){return s>=70?T.good:s>=55?T.warn:T.danger}

function ClickedPanel({country,onClose,lang='ko'}){
  if(!country)return null;const col=scoreColor(country.score);const L=lang;
  const nm=L==='ko'?country.n:(country.en||country.n);
  return(<div onClick={onClose} style={{position:"fixed",inset:0,background:`${T.bg0}c0`,backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.surface,borderRadius:16,padding:32,border:`1px solid ${col}40`,minWidth:320,maxWidth:380,textAlign:"center"}}>
      <div style={{fontSize:12,color:col,fontWeight:700,marginBottom:4}}>{country.score>=70?t('gStatGood',L):country.score>=55?t('gStatWarn',L):t('gStatAlert',L)}</div>
      <div style={{fontSize:26,fontWeight:900,color:T.text,marginBottom:4}}>{nm}</div>
      <div style={{fontSize:11,color:T.textDim,marginBottom:20}}>{country.iso}</div>
      <div style={{fontSize:48,fontWeight:900,color:col,fontFamily:"monospace"}}>{country.score}<span style={{fontSize:16,color:T.textDim}}> / 100</span></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,margin:"20px 0"}}>
        {[{l:t('gGauges',L),v:"59"},{l:t('gSystems',L),v:"9"},{l:"Satellites",v:"4"}].map(s=>(<div key={s.l} style={{background:`${T.bg0}80`,borderRadius:8,padding:"8px 4px"}}><div style={{fontSize:18,fontWeight:800,color:T.accent,fontFamily:"monospace"}}>{s.v}</div><div style={{fontSize:9,color:T.textDim}}>{s.l}</div></div>))}
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${T.border}`,background:"transparent",color:T.textDim,fontSize:12,cursor:"pointer"}}>{t('close',L)||'Close'}</button>
        <button style={{flex:2,padding:"10px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${T.accent},#0099cc)`,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>{t('gOpenReport',L)}</button>
      </div>
    </div>
  </div>);
}

// Realistic satellite SVG - Sentinel-2 inspired
function RealisticSatellite(){
  return(
    <svg width="100" height="48" viewBox="0 0 100 48" fill="none">
      {/* Left solar array */}
      <g transform="translate(0,8)">
        {/* Panel frame */}
        <rect x="2" y="4" width="28" height="24" rx="1" fill="#1a2845" stroke="#3a5a8a" strokeWidth="0.6"/>
        {/* Solar cells - 4x3 grid */}
        {[0,1,2,3].map(col=>[0,1,2].map(row=>(
          <rect key={`l${col}${row}`} x={4+col*6.5} y={6+row*7.5} width={5.5} height={6.5} rx={0.5}
            fill={`hsl(${210+col*3},${50+row*5}%,${18+row*3}%)`}
            stroke="#2a4a7a" strokeWidth="0.3"/>
        )))}
        {/* Panel shine */}
        <rect x="2" y="4" width="28" height="24" rx="1" fill="url(#panelShine)" opacity="0.15"/>
      </g>
      {/* Panel arm left */}
      <rect x="30" y="20" width="8" height="3" rx="0.5" fill="#2a3a55" stroke="#4a6a9a" strokeWidth="0.4"/>
      <circle cx="32" cy="21.5" r="1.2" fill="#3a5a8a" stroke="#5a8aba" strokeWidth="0.3"/>

      {/* Main body */}
      <g transform="translate(38,4)">
        {/* Body shell */}
        <rect x="0" y="4" width="24" height="32" rx="3" fill="#1a2540" stroke="#3a5a8a" strokeWidth="0.8"/>
        {/* Top panel */}
        <rect x="2" y="6" width="20" height="8" rx="1.5" fill="#0f1a2d" stroke="#2a4a6a" strokeWidth="0.4"/>
        {/* Status lights */}
        <circle cx="6" cy="10" r="1" fill="#00ff88" opacity="0.8"/>
        <circle cx="10" cy="10" r="1" fill={T.accent} opacity="0.6"/>
        <circle cx="14" cy="10" r="0.8" fill="#ff6644" opacity="0.3"/>
        {/* Main sensor/camera */}
        <rect x="4" y="16" width="16" height="14" rx="2" fill="#0a1220" stroke="#2a4a6a" strokeWidth="0.5"/>
        <circle cx="12" cy="23" r="5" fill="#080e1a" stroke="#3a6a9a" strokeWidth="0.6"/>
        <circle cx="12" cy="23" r="3.2" fill="#0c1828" stroke={T.accent} strokeWidth="0.4" opacity="0.7"/>
        <circle cx="12" cy="23" r="1.5" fill={`${T.accent}60`}/>
        <circle cx="12" cy="23" r="0.6" fill={T.accent}/>
        {/* Lens reflection */}
        <circle cx="10.5" cy="21.5" r="0.8" fill="white" opacity="0.15"/>
        {/* Bottom vent */}
        <rect x="3" y="32" width="18" height="2" rx="0.5" fill="#1a2540" stroke="#2a3a55" strokeWidth="0.3"/>
        {/* Antenna */}
        <line x1="12" y1="4" x2="12" y2="0" stroke="#5a7a9a" strokeWidth="0.8"/>
        <circle cx="12" cy="0" r="1.5" fill="none" stroke="#5a8aba" strokeWidth="0.5"/>
        <circle cx="12" cy="0" r="0.5" fill={T.accent} opacity="0.8"/>
      </g>

      {/* Panel arm right */}
      <rect x="62" y="20" width="8" height="3" rx="0.5" fill="#2a3a55" stroke="#4a6a9a" strokeWidth="0.4"/>
      <circle cx="68" cy="21.5" r="1.2" fill="#3a5a8a" stroke="#5a8aba" strokeWidth="0.3"/>

      {/* Right solar array */}
      <g transform="translate(70,8)">
        <rect x="0" y="4" width="28" height="24" rx="1" fill="#1a2845" stroke="#3a5a8a" strokeWidth="0.6"/>
        {[0,1,2,3].map(col=>[0,1,2].map(row=>(
          <rect key={`r${col}${row}`} x={2+col*6.5} y={6+row*7.5} width={5.5} height={6.5} rx={0.5}
            fill={`hsl(${210+col*3},${50+row*5}%,${18+row*3}%)`}
            stroke="#2a4a7a" strokeWidth="0.3"/>
        )))}
        <rect x="0" y="4" width="28" height="24" rx="1" fill="url(#panelShine2)" opacity="0.15"/>
      </g>

      <defs>
        <linearGradient id="panelShine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.3"/>
          <stop offset="50%" stopColor="white" stopOpacity="0"/>
          <stop offset="100%" stopColor="white" stopOpacity="0.1"/>
        </linearGradient>
        <linearGradient id="panelShine2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.3"/>
          <stop offset="50%" stopColor="white" stopOpacity="0"/>
          <stop offset="100%" stopColor="white" stopOpacity="0.1"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function WorldMap({hovered,setHovered,setClicked,setMousePos,lang='ko'}){
  const cN=(c)=>lang==='ko'?c.n:(c.en||c.n);
  const canvasRef=useRef(null),geoRef=useRef(null),sizeRef=useRef({w:960,h:500}),projRef=useRef(null),hovRef=useRef(null),frameRef=useRef(null),decodedRef=useRef(null);
  useEffect(()=>{hovRef.current=hovered},[hovered]);
  useEffect(()=>{fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json").then(r=>r.json()).then(d=>{geoRef.current=d}).catch(()=>{})},[]);
  useEffect(()=>{const fn=()=>{const w=Math.min(window.innerWidth,960);sizeRef.current={w,h:Math.round(w*0.52)}};fn();window.addEventListener("resize",fn);return()=>window.removeEventListener("resize",fn)},[]);

  const decode=useCallback(()=>{
    const geo=geoRef.current;if(!geo||decodedRef.current)return;
    function da(t,a){let x=0,y=0;return a.map(([dx,dy])=>{x+=dx;y+=dy;return[x*t.transform.scale[0]+t.transform.translate[0],y*t.transform.scale[1]+t.transform.translate[1]]})}
    const f=[];(geo.objects.countries.geometries||[]).forEach(g=>{let c;const dr=r=>r.reduce((a,i)=>{const rv=i<0;const arc=geo.arcs[rv?~i:i];const d=da(geo,arc);return a.concat(rv?d.reverse():d)},[]);
      if(g.type==="Polygon")c=(g.arcs||[]).map(dr);else if(g.type==="MultiPolygon")c=(g.arcs||[]).map(p=>p.map(dr));
      if(c)f.push({type:"Feature",geometry:{type:g.type,coordinates:c},properties:g.properties||{}})});
    decodedRef.current={type:"FeatureCollection",features:f};
  },[]);

  useEffect(()=>{
    let running=true;
    const animate=()=>{
      if(!running)return;
      const geo=geoRef.current,canvas=canvasRef.current;
      if(!geo||!canvas){frameRef.current=requestAnimationFrame(animate);return}
      decode();const fc=decodedRef.current;
      if(!fc){frameRef.current=requestAnimationFrame(animate);return}
      const ctx=canvas.getContext("2d"),{w,h}=sizeRef.current,dpr=window.devicePixelRatio||1;
      if(canvas.width!==w*dpr){canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+"px";canvas.style.height=h+"px"}
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const proj=d3.geoNaturalEarth1().scale(w/5.2).translate([w/2,h/2]);
      projRef.current=proj;const path=d3.geoPath(proj,ctx);
      const now=Date.now()/1000;const hov=hovRef.current;

      ctx.fillStyle="#050b14";ctx.fillRect(0,0,w,h);
      ctx.strokeStyle="#0a1422";ctx.lineWidth=0.2;ctx.beginPath();path(d3.geoGraticule10());ctx.stroke();
      fc.features.forEach(f=>{ctx.beginPath();path(f);ctx.fillStyle="#0c1828";ctx.fill();ctx.strokeStyle="#1a2d48";ctx.lineWidth=0.5;ctx.stroke()});

      ctx.globalCompositeOperation="screen";

      AMBIENT.forEach(([lat,lon],i)=>{
        const p=proj([lon,lat]);if(!p)return;
        const phase=now*0.6+i*2.1;
        const pulse=0.5+Math.sin(phase)*0.15+Math.sin(phase*2.7)*0.08;
        const g1=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],14);
        g1.addColorStop(0,`rgba(180,220,255,${pulse*0.15})`);
        g1.addColorStop(0.3,`rgba(140,200,255,${pulse*0.06})`);
        g1.addColorStop(1,"rgba(100,160,255,0)");
        ctx.fillStyle=g1;ctx.beginPath();ctx.arc(p[0],p[1],14,0,Math.PI*2);ctx.fill();
        const g2=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],3.5);
        g2.addColorStop(0,`rgba(255,255,255,${pulse*0.8})`);
        g2.addColorStop(0.5,`rgba(200,235,255,${pulse*0.3})`);
        g2.addColorStop(1,"rgba(160,210,255,0)");
        ctx.fillStyle=g2;ctx.beginPath();ctx.arc(p[0],p[1],3.5,0,Math.PI*2);ctx.fill();
      });

      ACTIVE.forEach((c,i)=>{
        const p=proj([c.lon,c.lat]);if(!p)return;
        const isH=c.home,isV=hov?.iso===c.iso;
        const phase=now*0.9+i*1.3;
        const pulse=0.6+Math.sin(phase*0.7)*0.12+Math.sin(phase*1.9)*0.06;
        const r1=isH?45:isV?30:18+Math.sin(phase*0.4)*2;
        const g1=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],r1);
        g1.addColorStop(0,isH?`rgba(0,212,255,${pulse*0.35})`:`rgba(180,230,255,${pulse*0.2})`);
        g1.addColorStop(0.3,isH?`rgba(0,180,255,${pulse*0.15})`:`rgba(140,210,255,${pulse*0.07})`);
        g1.addColorStop(1,"rgba(0,100,200,0)");
        ctx.fillStyle=g1;ctx.beginPath();ctx.arc(p[0],p[1],r1,0,Math.PI*2);ctx.fill();
        const r2=isH?20:isV?14:8;
        const g2=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],r2);
        g2.addColorStop(0,isH?`rgba(80,230,255,${pulse*0.6})`:`rgba(200,240,255,${pulse*0.45})`);
        g2.addColorStop(0.6,isH?`rgba(40,200,255,${pulse*0.15})`:`rgba(160,220,255,${pulse*0.1})`);
        g2.addColorStop(1,"rgba(100,200,255,0)");
        ctx.fillStyle=g2;ctx.beginPath();ctx.arc(p[0],p[1],r2,0,Math.PI*2);ctx.fill();
        const r3=isH?7:isV?5:3+Math.sin(phase*0.8)*0.3;
        const g3=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],r3);
        g3.addColorStop(0,"rgba(255,255,255,0.95)");
        g3.addColorStop(0.4,isH?"rgba(140,240,255,0.6)":"rgba(220,245,255,0.4)");
        g3.addColorStop(1,"rgba(180,230,255,0)");
        ctx.fillStyle=g3;ctx.beginPath();ctx.arc(p[0],p[1],r3,0,Math.PI*2);ctx.fill();
        if(isH){
          const pr=16+Math.sin(now*1.2)*6;
          ctx.strokeStyle=`rgba(0,212,255,${0.25+Math.sin(now*1.2)*0.15})`;
          ctx.lineWidth=1;ctx.beginPath();ctx.arc(p[0],p[1],pr,0,Math.PI*2);ctx.stroke();
          const pr2=26+Math.sin(now*0.8+1)*7;
          ctx.strokeStyle=`rgba(0,212,255,${0.1+Math.sin(now*0.8+1)*0.08})`;
          ctx.lineWidth=0.6;ctx.beginPath();ctx.arc(p[0],p[1],pr2,0,Math.PI*2);ctx.stroke();
        }
      });
      ctx.globalCompositeOperation="source-over";

      if(hov){const p=proj([hov.lon,hov.lat]);if(p){
        ctx.font="bold 13px 'Pretendard',sans-serif";ctx.fillStyle="#fff";ctx.textAlign="center";
        ctx.shadowColor="rgba(0,0,0,0.9)";ctx.shadowBlur=10;
        ctx.fillText(cN(hov),p[0],p[1]-28);ctx.shadowBlur=0;
      }}
      frameRef.current=requestAnimationFrame(animate);
    };
    frameRef.current=requestAnimationFrame(animate);
    return()=>{running=false;if(frameRef.current)cancelAnimationFrame(frameRef.current)};
  },[decode]);

  const handleMouse=(e)=>{
    if(!projRef.current||!canvasRef.current)return;
    const rect=canvasRef.current.getBoundingClientRect();
    const mx=e.clientX-rect.left,my=e.clientY-rect.top;
    setMousePos({x:mx,total:rect.width});
    let found=null;
    for(const c of ACTIVE){const p=projRef.current([c.lon,c.lat]);if(!p)continue;if(Math.sqrt((mx-p[0])**2+(my-p[1])**2)<(c.home?22:15)){found=c;break}}
    setHovered(found);canvasRef.current.style.cursor=found?"pointer":"default";
  };

  return <canvas ref={canvasRef} onMouseMove={handleMouse} onMouseLeave={()=>setHovered(null)} onClick={()=>{if(hovRef.current)setClicked(hovRef.current)}} style={{display:"block",width:"100%",maxWidth:960,margin:"0 auto"}}/>;
}

export default function GlobeHero({lang='ko'}){
  const L=lang;
  const cName=(c)=>L==='ko'?c.n:(c.en||c.n);
  const [hovered,setHovered]=useState(null);
  const [clicked,setClicked]=useState(null);
  const [mousePos,setMousePos]=useState({x:0,total:960});
  const popL=mousePos.x>mousePos.total*0.5;

  return(
    <div style={{minHeight:"100vh",background:T.bg0,fontFamily:"'Pretendard',-apple-system,sans-serif",color:T.text,overflow:"hidden"}}>
      <style>{`
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes satFloat{0%,100%{transform:translateX(-50%) translateY(0) rotate(-0.5deg)}50%{transform:translateX(-50%) translateY(-5px) rotate(0.5deg)}}
        @keyframes beamPulse{0%,100%{opacity:0.7}50%{opacity:1}}
      `}</style>

      <div style={{position:"relative",overflow:"hidden"}}>
        {/* Satellite - realistic, centered */}
        <div style={{
          position:"absolute",top:4,left:"50%",zIndex:10,
          animation:"satFloat 7s ease-in-out infinite",
          filter:`drop-shadow(0 2px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 15px ${T.accent}50)`,
        }}>
          <RealisticSatellite/>
        </div>

        {/* 130° BEAM - covers entire map width */}
        {/* tan(65°) ≈ 2.14, so at height 540, width = 2*540*2.14 = 2311px → well beyond 960 → full coverage */}
        <div style={{position:"absolute",top:40,left:"50%",transform:"translateX(-50%)",zIndex:3,pointerEvents:"none"}}>
          <svg width="2400" height="560" viewBox="-1200 0 2400 560" style={{display:"block"}}>
            <defs>
              <linearGradient id="bW" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.accent} stopOpacity="0.35"/>
                <stop offset="3%" stopColor={T.accent} stopOpacity="0.12"/>
                <stop offset="10%" stopColor={T.accent} stopOpacity="0.04"/>
                <stop offset="30%" stopColor={T.accent} stopOpacity="0.012"/>
                <stop offset="100%" stopColor={T.accent} stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="bC" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.accent} stopOpacity="0.6"/>
                <stop offset="5%" stopColor={T.accent} stopOpacity="0.12"/>
                <stop offset="20%" stopColor={T.accent} stopOpacity="0.025"/>
                <stop offset="100%" stopColor={T.accent} stopOpacity="0"/>
              </linearGradient>
            </defs>
            {/* 130° wide fan: tan(65°)≈2.14 → half-width at 540 = 1155 */}
            <polygon points="0,0 -1155,540 1155,540" fill="url(#bW)" style={{animation:"beamPulse 6s ease-in-out infinite"}}/>
            {/* Inner brighter cone ~60° */}
            <polygon points="0,0 -310,540 310,540" fill="url(#bC)" style={{animation:"beamPulse 6s ease-in-out infinite 1s"}}/>
          </svg>
        </div>

        <div style={{paddingTop:48}}>
          <WorldMap hovered={hovered} setHovered={setHovered} setClicked={setClicked} setMousePos={setMousePos} lang={L}/>
        </div>

        {hovered&&(
          <div style={{
            position:"absolute",top:60,
            ...(popL?{left:12}:{right:12}),
            background:`${T.surface}e8`,backdropFilter:"blur(12px)",
            borderRadius:12,padding:"14px 18px",
            border:`1px solid ${scoreColor(hovered.score)}40`,
            minWidth:180,zIndex:20,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              <span style={{fontSize:10,padding:"2px 7px",borderRadius:5,background:`${scoreColor(hovered.score)}20`,color:scoreColor(hovered.score),fontWeight:700}}>
                {hovered.score>=70?t('gStatGood',L):hovered.score>=55?t('gStatWarn',L):t('gStatAlert',L)}
              </span>
              {hovered.home&&<span style={{fontSize:8,padding:"2px 5px",borderRadius:4,background:`${T.accent}20`,color:T.accent,fontWeight:700}}>HOME</span>}
            </div>
            <div style={{fontSize:15,fontWeight:800}}>{cName(hovered)}</div>
            <div style={{fontSize:10,color:T.textDim}}>{hovered.iso} · 59 Gauges · 9 Systems</div>
            <div style={{display:"flex",alignItems:"baseline",gap:3,marginTop:8}}>
              <span style={{fontSize:24,fontWeight:900,color:scoreColor(hovered.score),fontFamily:"monospace"}}>{hovered.score}</span>
              <span style={{fontSize:10,color:T.textDim}}>/ 100</span>
            </div>
            <div style={{fontSize:9,color:T.accent,marginTop:6}}>{t('gTooltipClick',L)}</div>
          </div>
        )}
      </div>

      <div style={{textAlign:"center",padding:"36px 24px 20px",maxWidth:600,margin:"0 auto"}}>
        <div style={{fontSize:11,fontWeight:700,color:T.accent,letterSpacing:3,marginBottom:10}}>SATELLITE ECONOMIC DIAGNOSTICS</div>
        <h1 style={{fontSize:38,fontWeight:900,margin:"0 0 14px",lineHeight:1.15,letterSpacing:-2}}>{t('heroTitle1',L)}<br/>{t('heroTitle2',L)}</h1>
        <p style={{fontSize:13,color:T.textMid,lineHeight:1.7,margin:"0 auto 28px",maxWidth:460}}>
          {t('heroDesc',L)} <strong style={{color:T.accent}}>{t('heroFast',L)}</strong> {t('heroDesc2',L)}<br/>
          {t('gHeroLine',L)}
        </p>
        <div style={{display:"flex",gap:32,justifyContent:"center",marginBottom:16}}>
          {[{n:t('gGauges',L),v:"59"},{n:t('gSystems',L),v:"9"},{n:t('gCost',L),v:"$0"},{n:t('gLangs',L),v:"30"}].map(s=>(
            <div key={s.n}>
              <div style={{fontSize:22,fontWeight:800,color:T.accent,fontFamily:"monospace"}}>{s.v}</div>
              <div style={{fontSize:10,color:T.textDim,marginTop:2}}>{s.n}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:10,color:T.textDim,animation:"float 3s ease-in-out infinite"}}>{t('gClickHint',L)}</div>
      </div>

      <ClickedPanel country={clicked} onClose={()=>setClicked(null)} lang={L}/>
    </div>
  );
}
