import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { t } from "../i18n";

const T={bg0:'#04060e',accent:'#00d4ff',good:'#00e5a0',warn:'#f0b429',danger:'#ff5c5c',text:'#e8ecf4',textMid:'#8b95a8',textDim:'#7a8a9e',border:'#1e2a42',surface:'#151c2e',sat:'#8b5cf6'};

// ═══ LAYER COLORS ═══
const LC={
  city:{core:'#ffe8a0',mid:'#ffd060',label:'#ffe8a0',icon:'💡'},
  stock:{core:'#b388ff',mid:'#8b5cf6',label:'#b388ff',icon:'◆'},
  port:{core:'#4dd0e1',mid:'#00acc1',label:'#4dd0e1',icon:'⚓'},
  industry:{core:'#ff8a65',mid:'#f4511e',label:'#ff8a65',icon:'🏭'},
};

// ═══ 도시 데이터 ═══
const CITY_DATA={
  KOR:[
    {n:'서울',en:'Seoul',lat:37.57,lon:126.98,pop:9.7,light:98},
    {n:'부산',en:'Busan',lat:35.18,lon:129.07,pop:3.4,light:82},
    {n:'인천',en:'Incheon',lat:37.46,lon:126.70,pop:2.9,light:85},
    {n:'대구',en:'Daegu',lat:35.87,lon:128.60,pop:2.4,light:72},
    {n:'대전',en:'Daejeon',lat:36.35,lon:127.38,pop:1.5,light:68},
    {n:'광주',en:'Gwangju',lat:35.16,lon:126.85,pop:1.5,light:65},
    {n:'울산',en:'Ulsan',lat:35.54,lon:129.31,pop:1.1,light:78},
    {n:'수원',en:'Suwon',lat:37.26,lon:127.03,pop:1.2,light:80},
    {n:'제주',en:'Jeju',lat:33.50,lon:126.53,pop:0.7,light:52},
    {n:'포항',en:'Pohang',lat:36.02,lon:129.37,pop:0.5,light:62},
    {n:'천안',en:'Cheonan',lat:36.81,lon:127.11,pop:0.7,light:63},
    {n:'세종',en:'Sejong',lat:36.48,lon:127.00,pop:0.4,light:55},
  ],
  USA:[
    {n:'뉴욕',en:'New York',lat:40.71,lon:-74.01,pop:8.3,light:99},
    {n:'LA',en:'Los Angeles',lat:34.05,lon:-118.24,pop:4.0,light:95},
    {n:'시카고',en:'Chicago',lat:41.88,lon:-87.63,pop:2.7,light:88},
    {n:'휴스턴',en:'Houston',lat:29.76,lon:-95.37,pop:2.3,light:85},
    {n:'피닉스',en:'Phoenix',lat:33.45,lon:-112.07,pop:1.7,light:78},
    {n:'시애틀',en:'Seattle',lat:47.61,lon:-122.33,pop:0.7,light:80},
    {n:'마이애미',en:'Miami',lat:25.76,lon:-80.19,pop:0.5,light:84},
    {n:'보스턴',en:'Boston',lat:42.36,lon:-71.06,pop:0.7,light:86},
    {n:'SF',en:'San Francisco',lat:37.77,lon:-122.42,pop:0.9,light:90},
    {n:'디트로이트',en:'Detroit',lat:42.33,lon:-83.05,pop:0.6,light:58},
  ],
  JPN:[
    {n:'도쿄',en:'Tokyo',lat:35.68,lon:139.69,pop:14.0,light:99},
    {n:'오사카',en:'Osaka',lat:34.69,lon:135.50,pop:2.7,light:90},
    {n:'나고야',en:'Nagoya',lat:35.18,lon:136.91,pop:2.3,light:82},
    {n:'후쿠오카',en:'Fukuoka',lat:33.59,lon:130.40,pop:1.6,light:75},
    {n:'삿포로',en:'Sapporo',lat:43.06,lon:141.35,pop:2.0,light:70},
    {n:'교토',en:'Kyoto',lat:35.01,lon:135.77,pop:1.5,light:72},
    {n:'히로시마',en:'Hiroshima',lat:34.39,lon:132.46,pop:1.2,light:68},
    {n:'센다이',en:'Sendai',lat:38.27,lon:140.87,pop:1.1,light:65},
  ],
  DEU:[
    {n:'베를린',en:'Berlin',lat:52.52,lon:13.41,pop:3.6,light:88},
    {n:'함부르크',en:'Hamburg',lat:53.55,lon:9.99,pop:1.9,light:82},
    {n:'뮌헨',en:'Munich',lat:48.14,lon:11.58,pop:1.5,light:85},
    {n:'프랑크푸르트',en:'Frankfurt',lat:50.11,lon:8.68,pop:0.8,light:90},
    {n:'드레스덴',en:'Dresden',lat:51.05,lon:13.74,pop:0.6,light:62},
  ],
  GBR:[
    {n:'런던',en:'London',lat:51.51,lon:-0.13,pop:9.0,light:97},
    {n:'버밍엄',en:'Birmingham',lat:52.49,lon:-1.90,pop:1.1,light:75},
    {n:'맨체스터',en:'Manchester',lat:53.48,lon:-2.24,pop:0.6,light:78},
    {n:'에딘버러',en:'Edinburgh',lat:55.95,lon:-3.19,pop:0.5,light:72},
    {n:'글래스고',en:'Glasgow',lat:55.86,lon:-4.25,pop:0.6,light:68},
  ],
  CHN:[
    {n:'상하이',en:'Shanghai',lat:31.23,lon:121.47,pop:24.9,light:99},
    {n:'베이징',en:'Beijing',lat:39.90,lon:116.40,pop:21.5,light:97},
    {n:'광저우',en:'Guangzhou',lat:23.13,lon:113.26,pop:15.3,light:95},
    {n:'선전',en:'Shenzhen',lat:22.54,lon:114.06,pop:12.6,light:96},
    {n:'청두',en:'Chengdu',lat:30.57,lon:104.07,pop:16.3,light:85},
    {n:'우한',en:'Wuhan',lat:30.59,lon:114.31,pop:11.1,light:80},
    {n:'항저우',en:'Hangzhou',lat:30.27,lon:120.15,pop:10.4,light:88},
    {n:'톈진',en:'Tianjin',lat:39.14,lon:117.18,pop:13.9,light:85},
  ],
  FRA:[
    {n:'파리',en:'Paris',lat:48.86,lon:2.35,pop:2.2,light:97},
    {n:'마르세유',en:'Marseille',lat:43.30,lon:5.37,pop:0.9,light:72},
    {n:'리옹',en:'Lyon',lat:45.76,lon:4.83,pop:0.5,light:78},
    {n:'툴루즈',en:'Toulouse',lat:43.60,lon:1.44,pop:0.5,light:68},
  ],
  IND:[
    {n:'뭄바이',en:'Mumbai',lat:19.08,lon:72.88,pop:20.7,light:92},
    {n:'델리',en:'Delhi',lat:28.61,lon:77.21,pop:16.8,light:90},
    {n:'방갈로르',en:'Bangalore',lat:12.97,lon:77.59,pop:8.4,light:85},
    {n:'첸나이',en:'Chennai',lat:13.08,lon:80.27,pop:4.6,light:80},
    {n:'콜카타',en:'Kolkata',lat:22.57,lon:88.36,pop:4.5,light:72},
  ],
  AUS:[
    {n:'시드니',en:'Sydney',lat:-33.87,lon:151.21,pop:5.3,light:92},
    {n:'멜버른',en:'Melbourne',lat:-37.81,lon:144.96,pop:5.0,light:88},
    {n:'브리즈번',en:'Brisbane',lat:-27.47,lon:153.03,pop:2.5,light:78},
    {n:'퍼스',en:'Perth',lat:-31.95,lon:115.86,pop:2.1,light:75},
  ],
};

// ═══ 주식 시설 ═══
const STOCK_FAC={
  KOR:[
    {t:'005930',n:'Samsung',fn:'평택 Fab',lat:36.99,lon:127.11},
    {t:'000660',n:'SK Hynix',fn:'이천 Fab',lat:37.28,lon:127.43},
    {t:'005380',n:'Hyundai',fn:'울산 공장',lat:35.51,lon:129.37},
    {t:'051910',n:'LG Chem',fn:'대산',lat:36.99,lon:126.37},
    {t:'373220',n:'LG Energy',fn:'오창',lat:36.71,lon:127.46},
    {t:'035420',n:'NAVER',fn:'춘천 DC',lat:37.84,lon:127.72},
  ],
  USA:[
    {t:'TSLA',n:'Tesla',fn:'Giga Texas',lat:30.22,lon:-97.62},
    {t:'TSLA',n:'Tesla',fn:'Fremont',lat:37.49,lon:-121.94},
    {t:'AAPL',n:'Apple',fn:'Apple Park',lat:37.33,lon:-122.01},
    {t:'INTC',n:'Intel',fn:'Oregon Fab',lat:45.54,lon:-122.97},
    {t:'AMZN',n:'Amazon',fn:'AWS Virginia',lat:39.04,lon:-77.49},
    {t:'XOM',n:'Exxon',fn:'Baytown',lat:29.75,lon:-95.01},
  ],
  JPN:[
    {t:'TM',n:'Toyota',fn:'Toyota City',lat:35.05,lon:137.15},
    {t:'6758',n:'Sony',fn:'Kumamoto Fab',lat:32.78,lon:130.74},
  ],
  DEU:[
    {t:'VOW3',n:'VW',fn:'Wolfsburg',lat:52.43,lon:10.79},
    {t:'BMW',n:'BMW',fn:'Munich',lat:48.18,lon:11.56},
    {t:'BAS',n:'BASF',fn:'Ludwigshafen',lat:49.49,lon:8.43},
  ],
  CHN:[
    {t:'BYD',n:'BYD',fn:'Shenzhen',lat:22.65,lon:114.03},
    {t:'CATL',n:'CATL',fn:'Ningde',lat:26.66,lon:119.55},
    {t:'BABA',n:'Alibaba',fn:'Hangzhou',lat:30.27,lon:120.03},
  ],
  TWN:[{t:'TSM',n:'TSMC',fn:'Fab 18 Tainan',lat:23.06,lon:120.30}],
  IND:[{t:'TCS',n:'TCS',fn:'Mumbai',lat:19.03,lon:72.86}],
  AUS:[{t:'BHP',n:'BHP',fn:'Olympic Dam',lat:-30.44,lon:136.89}],
  FRA:[{t:'AIR',n:'Airbus',fn:'Toulouse',lat:43.63,lon:1.37}],
  GBR:[{t:'SHEL',n:'Shell',fn:'London',lat:51.50,lon:-0.12}],
  BRA:[{t:'VALE',n:'Vale',fn:'Carajás',lat:-6.08,lon:-50.15}],
  NLD:[{t:'ASML',n:'ASML',fn:'Veldhoven',lat:51.41,lon:5.49}],
};

// ═══ 항만·공항 ═══
const PORT_DATA={
  KOR:[
    {n:'부산항',en:'Busan Port',lat:35.10,lon:129.04,type:'port',rank:7},
    {n:'인천항',en:'Incheon Port',lat:37.45,lon:126.60,type:'port',rank:38},
    {n:'인천공항',en:'Incheon Airport',lat:37.46,lon:126.44,type:'airport',rank:5},
    {n:'광양항',en:'Gwangyang Port',lat:34.93,lon:127.72,type:'port',rank:45},
    {n:'울산항',en:'Ulsan Port',lat:35.50,lon:129.39,type:'port'},
    {n:'평택항',en:'Pyeongtaek Port',lat:36.97,lon:126.83,type:'port'},
  ],
  USA:[
    {n:'LA/Long Beach',en:'LA/Long Beach',lat:33.74,lon:-118.26,type:'port',rank:1},
    {n:'JFK',en:'JFK Airport',lat:40.64,lon:-73.78,type:'airport',rank:1},
    {n:'Houston Port',en:'Houston Port',lat:29.73,lon:-95.00,type:'port',rank:3},
    {n:'Savannah',en:'Savannah Port',lat:32.08,lon:-81.09,type:'port',rank:4},
    {n:'Newark',en:'Newark Port',lat:40.68,lon:-74.15,type:'port',rank:2},
  ],
  JPN:[
    {n:'도쿄항',en:'Tokyo Port',lat:35.63,lon:139.78,type:'port'},
    {n:'나리타',en:'Narita Airport',lat:35.77,lon:140.39,type:'airport',rank:3},
    {n:'고베항',en:'Kobe Port',lat:34.67,lon:135.20,type:'port',rank:25},
    {n:'요코하마항',en:'Yokohama Port',lat:35.45,lon:139.65,type:'port'},
  ],
  CHN:[
    {n:'상하이항',en:'Shanghai Port',lat:30.63,lon:122.07,type:'port',rank:1},
    {n:'선전항',en:'Shenzhen Port',lat:22.48,lon:113.90,type:'port',rank:4},
    {n:'닝보항',en:'Ningbo Port',lat:29.87,lon:121.88,type:'port',rank:3},
    {n:'광저우항',en:'Guangzhou Port',lat:22.93,lon:113.55,type:'port',rank:5},
    {n:'칭다오항',en:'Qingdao Port',lat:36.07,lon:120.37,type:'port',rank:6},
  ],
  DEU:[
    {n:'함부르크항',en:'Hamburg Port',lat:53.54,lon:9.97,type:'port',rank:18},
    {n:'프랑크푸르트공항',en:'Frankfurt Airport',lat:50.03,lon:8.57,type:'airport',rank:4},
  ],
  GBR:[
    {n:'펠릭스토',en:'Felixstowe Port',lat:51.96,lon:1.31,type:'port',rank:30},
    {n:'히드로',en:'Heathrow Airport',lat:51.47,lon:-0.46,type:'airport',rank:2},
  ],
};

// ═══ 산업단지·에너지 ═══
const INDUSTRY_DATA={
  KOR:[
    {n:'구미 산단',en:'Gumi Industrial',lat:36.12,lon:128.33,type:'electronics'},
    {n:'여수 석유화학',en:'Yeosu Petrochemical',lat:34.76,lon:127.66,type:'petrochem'},
    {n:'창원 산단',en:'Changwon Industrial',lat:35.22,lon:128.68,type:'machinery'},
    {n:'반월·시화 산단',en:'Banwol-Sihwa',lat:37.31,lon:126.74,type:'mixed'},
    {n:'새만금',en:'Saemangeum',lat:35.80,lon:126.62,type:'energy'},
  ],
  USA:[
    {n:'실리콘밸리',en:'Silicon Valley',lat:37.39,lon:-122.03,type:'tech'},
    {n:'텍사스 정유벨트',en:'Texas Refinery Belt',lat:29.95,lon:-93.90,type:'petrochem'},
    {n:'디트로이트 자동차',en:'Detroit Auto Belt',lat:42.33,lon:-83.05,type:'auto'},
  ],
  JPN:[
    {n:'중경 공업지대',en:'Chukyo Industrial',lat:35.10,lon:136.90,type:'auto'},
    {n:'게이힌 공업지대',en:'Keihin Industrial',lat:35.52,lon:139.72,type:'mixed'},
  ],
  CHN:[
    {n:'주강 삼각주',en:'Pearl River Delta',lat:22.80,lon:113.30,type:'electronics'},
    {n:'장강 삼각주',en:'Yangtze River Delta',lat:31.00,lon:121.00,type:'mixed'},
    {n:'환보하이',en:'Bohai Rim',lat:39.00,lon:117.50,type:'heavy'},
  ],
  DEU:[{n:'루르 공업지대',en:'Ruhr Area',lat:51.45,lon:7.01,type:'heavy'}],
};

function generateCities(country){
  if(CITY_DATA[country.iso]) return CITY_DATA[country.iso];
  const seed=country.iso.charCodeAt(0)+country.iso.charCodeAt(1);
  const cities=[{n:country.n||country.en,en:country.en,lat:country.lat,lon:country.lon,pop:2.0,light:80}];
  for(let i=0;i<5;i++){
    const angle=(seed*37+i*60)%360;const dist=(0.5+((seed*13+i*7)%10)/10)*3;
    cities.push({n:`City ${i+1}`,en:`City ${i+1}`,lat:country.lat+dist*Math.sin(angle*Math.PI/180),lon:country.lon+dist*Math.cos(angle*Math.PI/180),pop:0.3+(seed+i)%15/10,light:40+((seed*11+i*17)%50)});
  }
  return cities;
}

const ISO_NUM={'KOR':'410','USA':'840','JPN':'392','DEU':'276','GBR':'826','FRA':'250','CHN':'156','IND':'356','AUS':'036','ITA':'380','ESP':'724','CAN':'124','NLD':'528','CHE':'756','SWE':'752','NOR':'578','SGP':'702','TWN':'158','BRA':'076','MEX':'484','TUR':'792','ISR':'376','RUS':'643'};

function getScale(iso,w){
  const big=['USA','CHN','AUS','CAN','IND','BRA','RUS'];
  const mid=['FRA','DEU','JPN','GBR','ESP','ITA','TUR','MEX'];
  if(big.includes(iso)) return w*1.2;
  if(mid.includes(iso)) return w*3;
  return w*5;
}

export default function CountryMap({country,onBack,lang='ko',onNav}){
  const L=lang;
  const canvasRef=useRef(null);
  const geoRef=useRef(null);
  const decodedRef=useRef(null);
  const frameRef=useRef(null);
  const [hovItem,setHovItem]=useState(null);
  const hovRef=useRef(null);
  useEffect(()=>{hovRef.current=hovItem},[hovItem]);

  // ═══ LAYER TOGGLE ═══
  const [layers,setLayers]=useState({city:true,stock:false,port:false,industry:false});
  const toggleLayer=(k)=>setLayers(p=>({...p,[k]:!p[k]}));

  const cities=generateCities(country);
  const stocks=STOCK_FAC[country.iso]||[];
  const ports=PORT_DATA[country.iso]||[];
  const industries=INDUSTRY_DATA[country.iso]||[];
  const cityName=(c)=>L==='ko'?c.n:c.en;

  useEffect(()=>{
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json")
      .then(r=>r.json()).then(d=>{geoRef.current=d}).catch(()=>{});
  },[]);

  const decode=useCallback(()=>{
    const geo=geoRef.current;if(!geo||decodedRef.current)return;
    function da(topo,a){let x=0,y=0;return a.map(([dx,dy])=>{x+=dx;y+=dy;return[x*topo.transform.scale[0]+topo.transform.translate[0],y*topo.transform.scale[1]+topo.transform.translate[1]]})}
    const f=[];(geo.objects.countries.geometries||[]).forEach(g=>{
      const dr=r=>r.reduce((a,i)=>{const rv=i<0;const arc=geo.arcs[rv?~i:i];const d=da(geo,arc);return a.concat(rv?d.reverse():d)},[]);
      let c;if(g.type==="Polygon")c=(g.arcs||[]).map(dr);else if(g.type==="MultiPolygon")c=(g.arcs||[]).map(p=>p.map(dr));
      if(c)f.push({type:"Feature",geometry:{type:g.type,coordinates:c},properties:g.properties||{}});
    });
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

      const ctx=canvas.getContext("2d");
      const w=Math.min(window.innerWidth,960),h=Math.round(w*0.65);
      const dpr=window.devicePixelRatio||1;
      if(canvas.width!==w*dpr){canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+"px";canvas.style.height=h+"px"}
      ctx.setTransform(dpr,0,0,dpr,0,0);

      const proj=d3.geoMercator().center([country.lon,country.lat]).scale(getScale(country.iso,w)).translate([w/2,h/2]);
      const path=d3.geoPath(proj,ctx);
      const now=Date.now()/1000;
      const hov=hovRef.current;
      const isMobile=w<600;

      // ═══ BACKGROUND — 밝게 ═══
      ctx.fillStyle="#060d18";ctx.fillRect(0,0,w,h);

      // 그리드 (더 밝게)
      ctx.strokeStyle="#12203a";ctx.lineWidth=0.4;ctx.beginPath();path(d3.geoGraticule10());ctx.stroke();

      // 주변 국가 (밝은 회색)
      fc.features.forEach(f=>{ctx.beginPath();path(f);ctx.fillStyle="#0e1a2e";ctx.fill();ctx.strokeStyle="#1a2d4a";ctx.lineWidth=0.5;ctx.stroke()});

      // ═══ 해당 국가 하이라이트 (밝게!) ═══
      const numCode=ISO_NUM[country.iso];
      fc.features.forEach(f=>{
        const fId=f.properties?.id||f.id;
        if(fId===numCode||fId===country.iso){
          ctx.beginPath();path(f);
          ctx.fillStyle="#142240";ctx.fill();
          ctx.strokeStyle=`${T.accent}90`;ctx.lineWidth=2;ctx.stroke();
          // 내부 글로우
          ctx.strokeStyle=`${T.accent}25`;ctx.lineWidth=6;ctx.stroke();
        }
      });

      // ═══ 위성 빔 ═══
      const beamX=w/2;
      ctx.globalCompositeOperation="screen";
      const bg=ctx.createLinearGradient(beamX,0,beamX,h*0.6);
      bg.addColorStop(0,`rgba(0,212,255,${0.06+Math.sin(now*0.5)*0.02})`);
      bg.addColorStop(0.15,"rgba(0,212,255,0.015)");
      bg.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=bg;ctx.beginPath();ctx.moveTo(beamX,0);ctx.lineTo(beamX-w*0.35,h*0.6);ctx.lineTo(beamX+w*0.35,h*0.6);ctx.closePath();ctx.fill();
      ctx.globalCompositeOperation="source-over";

      // ═══ LAYER: 도시 야간광 ═══
      if(layers.city){
        ctx.globalCompositeOperation="screen";
        cities.forEach((c,i)=>{
          const p=proj([c.lon,c.lat]);if(!p||p[0]<-30||p[0]>w+30||p[1]<-30||p[1]>h+30)return;
          const phase=now*0.5+i*1.7;
          const pulse=0.7+Math.sin(phase)*0.12;
          const isHov=hov&&hov.en===c.en&&!hov.t;
          const scale=isHov?1.4:1;

          // Glow
          const r1=Math.max(isMobile?8:12,c.light/(isMobile?5:3.5))*scale;
          const g1=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],r1);
          g1.addColorStop(0,`rgba(255,230,160,${pulse*0.4})`);
          g1.addColorStop(0.5,`rgba(255,200,100,${pulse*0.12})`);
          g1.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=g1;ctx.beginPath();ctx.arc(p[0],p[1],r1,0,Math.PI*2);ctx.fill();
          // Core
          const r2=Math.max(2,c.light/(isMobile?15:12))*scale;
          const g2=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],r2);
          g2.addColorStop(0,"rgba(255,255,240,0.95)");
          g2.addColorStop(1,"rgba(255,230,160,0)");
          ctx.fillStyle=g2;ctx.beginPath();ctx.arc(p[0],p[1],r2,0,Math.PI*2);ctx.fill();
        });
        ctx.globalCompositeOperation="source-over";

        // 도시 라벨 (모바일: 상위 3개, PC: 상위 6개)
        const topN=isMobile?3:6;
        [...cities].sort((a,b)=>b.light-a.light).slice(0,topN).forEach(c=>{
          if(hov&&hov.en===c.en)return;
          const p=proj([c.lon,c.lat]);if(!p||p[0]<15||p[0]>w-15||p[1]<15||p[1]>h-15)return;
          ctx.font=`${isMobile?9:10}px 'Pretendard',sans-serif`;
          ctx.fillStyle="rgba(255,230,160,0.45)";ctx.textAlign="center";
          ctx.fillText(cityName(c),p[0],p[1]+12);
        });

        // 호버 상세
        if(hov&&!hov.t&&hov.en){
          const p=proj([hov.lon,hov.lat]);if(p){
            ctx.font="bold 13px 'Pretendard',sans-serif";ctx.fillStyle="#fff";ctx.textAlign="center";
            ctx.shadowColor="rgba(0,0,0,0.9)";ctx.shadowBlur=8;
            ctx.fillText(cityName(hov),p[0],p[1]-16);
            ctx.font="11px 'JetBrains Mono',monospace";ctx.fillStyle=LC.city.mid;
            ctx.fillText(`💡 ${hov.light}%`,p[0],p[1]+22);
            ctx.shadowBlur=0;
          }
        }
      }

      // ═══ LAYER: 주식시설 ═══
      if(layers.stock){
        stocks.forEach((f,i)=>{
          const p=proj([f.lon,f.lat]);if(!p||p[0]<-20||p[0]>w+20||p[1]<-20||p[1]>h+20)return;
          const phase=now*0.8+i*2.1;const pulse=0.6+Math.sin(phase)*0.2;
          const isHov=hov&&hov.fn===f.fn;
          // Diamond
          ctx.save();ctx.translate(p[0],p[1]);ctx.rotate(Math.PI/4);
          ctx.fillStyle=isHov?`rgba(179,136,255,0.9)`:`rgba(139,92,246,${pulse*0.7})`;
          const sz=isHov?6:4;ctx.fillRect(-sz,-sz,sz*2,sz*2);
          ctx.restore();
          // Pulse ring
          if(!isMobile){const pr=8+Math.sin(phase*1.5)*3;ctx.strokeStyle=`rgba(139,92,246,${0.15+Math.sin(phase)*0.1})`;ctx.lineWidth=0.7;ctx.beginPath();ctx.arc(p[0],p[1],pr,0,Math.PI*2);ctx.stroke();}
          // Label
          ctx.font=`bold ${isMobile?8:10}px 'JetBrains Mono',monospace`;
          ctx.fillStyle=`rgba(179,136,255,${0.5+pulse*0.3})`;ctx.textAlign="center";
          ctx.fillText(f.t,p[0],p[1]-10);
          // Hover detail
          if(isHov){
            ctx.font="bold 12px 'Pretendard',sans-serif";ctx.fillStyle="#fff";ctx.shadowColor="rgba(0,0,0,0.9)";ctx.shadowBlur=8;
            ctx.fillText(f.fn,p[0],p[1]-22);
            ctx.font="10px 'Pretendard',sans-serif";ctx.fillStyle=T.sat;
            ctx.fillText(f.n,p[0],p[1]+18);ctx.shadowBlur=0;
          }
        });
      }

      // ═══ LAYER: 항만·공항 ═══
      if(layers.port){
        ports.forEach((pt,i)=>{
          const p=proj([pt.lon,pt.lat]);if(!p||p[0]<-20||p[0]>w+20||p[1]<-20||p[1]>h+20)return;
          const phase=now*0.6+i*1.9;const pulse=0.6+Math.sin(phase)*0.15;
          const isHov=hov&&hov.en===pt.en&&hov.type;
          const isPort=pt.type==='port';
          // Circle marker
          const r=isHov?7:isMobile?3:4;
          ctx.beginPath();ctx.arc(p[0],p[1],r,0,Math.PI*2);
          ctx.fillStyle=isPort?`rgba(77,208,225,${pulse*0.8})`:`rgba(77,225,180,${pulse*0.8})`;ctx.fill();
          ctx.strokeStyle=isPort?`rgba(0,172,193,${pulse})`:`rgba(0,193,140,${pulse})`;ctx.lineWidth=1;ctx.stroke();
          // Label
          ctx.font=`${isMobile?8:10}px 'Pretendard',sans-serif`;
          ctx.fillStyle=`rgba(77,208,225,${0.5+pulse*0.3})`;ctx.textAlign="center";
          ctx.fillText((isPort?'⚓':'✈️')+' '+(L==='ko'?pt.n:pt.en),p[0],p[1]-(isMobile?8:12));
          if(isHov){
            ctx.font="bold 12px 'Pretendard',sans-serif";ctx.fillStyle="#fff";ctx.shadowColor="rgba(0,0,0,0.9)";ctx.shadowBlur=8;
            ctx.fillText(L==='ko'?pt.n:pt.en,p[0],p[1]-18);
            if(pt.rank){ctx.font="10px monospace";ctx.fillStyle=LC.port.mid;ctx.fillText(`World #${pt.rank}`,p[0],p[1]+16);}
            ctx.shadowBlur=0;
          }
        });
      }

      // ═══ LAYER: 산업단지 ═══
      if(layers.industry){
        industries.forEach((ind,i)=>{
          const p=proj([ind.lon,ind.lat]);if(!p||p[0]<-20||p[0]>w+20||p[1]<-20||p[1]>h+20)return;
          const phase=now*0.4+i*2.7;const pulse=0.5+Math.sin(phase)*0.2;
          const isHov=hov&&hov.en===ind.en&&hov.type;
          // Hexagon-like square
          const sz=isHov?7:isMobile?3:4;
          ctx.fillStyle=`rgba(255,138,101,${pulse*0.7})`;
          ctx.fillRect(p[0]-sz,p[1]-sz,sz*2,sz*2);
          ctx.strokeStyle=`rgba(244,81,30,${pulse})`;ctx.lineWidth=0.8;ctx.strokeRect(p[0]-sz,p[1]-sz,sz*2,sz*2);
          // Label
          ctx.font=`${isMobile?8:10}px 'Pretendard',sans-serif`;
          ctx.fillStyle=`rgba(255,138,101,${0.5+pulse*0.3})`;ctx.textAlign="center";
          ctx.fillText(L==='ko'?ind.n:ind.en,p[0],p[1]-(isMobile?8:12));
          if(isHov){
            ctx.font="bold 12px 'Pretendard',sans-serif";ctx.fillStyle="#fff";ctx.shadowColor="rgba(0,0,0,0.9)";ctx.shadowBlur=8;
            ctx.fillText(L==='ko'?ind.n:ind.en,p[0],p[1]-18);
            ctx.font="10px monospace";ctx.fillStyle=LC.industry.mid;ctx.fillText(ind.type,p[0],p[1]+16);
            ctx.shadowBlur=0;
          }
        });
      }

      frameRef.current=requestAnimationFrame(animate);
    };
    frameRef.current=requestAnimationFrame(animate);
    return()=>{running=false;if(frameRef.current)cancelAnimationFrame(frameRef.current)};
  },[decode,country,cities,layers]);

  // ═══ Mouse hover — detect items by active layer ═══
  const handleMouse=(e)=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left,my=e.clientY-rect.top;
    const w=rect.width,h=rect.height;
    const proj=d3.geoMercator().center([country.lon,country.lat]).scale(getScale(country.iso,w)).translate([w/2,h/2]);
    let found=null;
    const hitR=14;
    // Check layers in priority order
    if(layers.stock&&!found){for(const f of stocks){const p=proj([f.lon,f.lat]);if(p&&Math.hypot(mx-p[0],my-p[1])<hitR){found=f;break}}}
    if(layers.port&&!found){for(const pt of ports){const p=proj([pt.lon,pt.lat]);if(p&&Math.hypot(mx-p[0],my-p[1])<hitR){found=pt;break}}}
    if(layers.industry&&!found){for(const ind of industries){const p=proj([ind.lon,ind.lat]);if(p&&Math.hypot(mx-p[0],my-p[1])<hitR){found=ind;break}}}
    if(layers.city&&!found){for(const c of cities){const p=proj([c.lon,c.lat]);if(p&&Math.hypot(mx-p[0],my-p[1])<18){found=c;break}}}
    setHovItem(found);
    canvas.style.cursor=found?"pointer":"default";
  };

  const nm=t('cnt_'+country.iso,L)||country.en||country.n;

  // Layer config
  const LAYER_CFG=[
    {key:'city',label:L==='ko'?'도시 야간광':'City Lights',icon:'💡',color:LC.city.mid,count:cities.length},
    {key:'stock',label:L==='ko'?'주식 시설':'Stock Facilities',icon:'◆',color:LC.stock.mid,count:stocks.length},
    {key:'port',label:L==='ko'?'항만·공항':'Ports & Airports',icon:'⚓',color:LC.port.mid,count:ports.length},
    {key:'industry',label:L==='ko'?'산업단지':'Industrial Zones',icon:'🏭',color:LC.industry.mid,count:industries.length},
  ];

  return(
    <div style={{background:T.bg0,borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`}}>
      <style>{`@keyframes satFloat{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-4px)}}`}</style>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${T.border}`,flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={onBack} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${T.border}`,background:"transparent",color:T.textDim,fontSize:12,cursor:"pointer"}}>← {t('gBackWorld',L)||'Back'}</button>
          <span style={{fontSize:16,fontWeight:800,color:T.text}}>{nm}</span>
          <span style={{fontSize:12,color:T.textDim}}>{country.iso}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:12,color:T.accent}}>🛰️ VIIRS</span>
          <button onClick={()=>{onBack();if(onNav)onNav('dashboard',{country:country.iso});}} style={{padding:"5px 12px",borderRadius:6,border:"none",background:T.accent,color:T.bg0,fontSize:12,fontWeight:700,cursor:"pointer"}}>{t('gOpenReport',L)||'Report'}</button>
        </div>
      </div>

      {/* ═══ LAYER TOGGLE BUTTONS ═══ */}
      <div style={{display:"flex",gap:6,padding:"10px 16px",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        {LAYER_CFG.map(lc=>(
          <button key={lc.key} onClick={()=>toggleLayer(lc.key)} style={{
            display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:20,
            border:`1.5px solid ${layers[lc.key]?lc.color:`${T.border}`}`,
            background:layers[lc.key]?`${lc.color}15`:'transparent',
            color:layers[lc.key]?lc.color:T.textDim,
            fontSize:12,fontWeight:layers[lc.key]?700:400,cursor:"pointer",whiteSpace:"nowrap",
            transition:"all .2s",
          }}>
            <span>{lc.icon}</span>
            <span>{lc.label}</span>
            {lc.count>0&&<span style={{fontSize:10,opacity:0.7}}>({lc.count})</span>}
          </button>
        ))}
      </div>

      {/* Map with satellite overlay */}
      <div style={{position:"relative"}}>
        <div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",zIndex:10,animation:"satFloat 7s ease-in-out infinite",filter:`drop-shadow(0 2px 6px rgba(0,0,0,0.8)) drop-shadow(0 0 10px ${T.accent}30)`}}>
          <div style={{fontSize:24}}>🛰️</div>
        </div>
        <canvas ref={canvasRef} onMouseMove={handleMouse} onTouchStart={e=>{const touch=e.touches[0];if(touch)handleMouse({clientX:touch.clientX,clientY:touch.clientY})}} onMouseLeave={()=>setHovItem(null)} style={{display:"block",width:"100%"}}/>
      </div>

      {/* Active layers summary */}
      <div style={{padding:"8px 16px",borderTop:`1px solid ${T.border}`,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",fontSize:11,color:T.textDim}}>
        {layers.city&&<span style={{color:LC.city.label}}>💡 {cities.length} cities</span>}
        {layers.stock&&<span style={{color:LC.stock.label}}>◆ {stocks.length} facilities</span>}
        {layers.port&&<span style={{color:LC.port.label}}>⚓ {ports.length} ports/airports</span>}
        {layers.industry&&<span style={{color:LC.industry.label}}>🏭 {industries.length} zones</span>}
        {!layers.city&&!layers.stock&&!layers.port&&!layers.industry&&<span>Select a layer above</span>}
      </div>
    </div>
  );
}
