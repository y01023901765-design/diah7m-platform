import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { t } from "../i18n";

const T={bg0:'#04060e',accent:'#00d4ff',good:'#00e5a0',warn:'#f0b429',danger:'#ff5c5c',text:'#e8ecf4',textMid:'#8b95a8',textDim:'#7a8a9e',border:'#1e2a42',surface:'#151c2e',sat:'#8b5cf6'};

// ═══ 주요 주식종목 시설 좌표 ═══
const STOCK_FAC={
  KOR:[
    {t:'005930',n:'Samsung',fn:'평택 캠퍼스',lat:36.99,lon:127.11},
    {t:'005930',n:'Samsung',fn:'화성 캠퍼스',lat:37.23,lon:126.98},
    {t:'000660',n:'SK Hynix',fn:'이천 캠퍼스',lat:37.28,lon:127.43},
    {t:'000660',n:'SK Hynix',fn:'청주 캠퍼스',lat:36.73,lon:127.45},
    {t:'005380',n:'Hyundai',fn:'울산 공장',lat:35.51,lon:129.37},
    {t:'005380',n:'Hyundai',fn:'아산 공장',lat:36.80,lon:127.00},
    {t:'051910',n:'LG Chem',fn:'대산 공장',lat:36.99,lon:126.37},
    {t:'373220',n:'LG Energy',fn:'오창 공장',lat:36.71,lon:127.46},
    {t:'006400',n:'Samsung SDI',fn:'천안 공장',lat:36.81,lon:127.15},
    {t:'035420',n:'NAVER',fn:'춘천 데이터센터',lat:37.84,lon:127.72},
  ],
  USA:[
    {t:'TSLA',n:'Tesla',fn:'Giga Texas',lat:30.22,lon:-97.62},
    {t:'TSLA',n:'Tesla',fn:'Fremont',lat:37.49,lon:-121.94},
    {t:'TSLA',n:'Tesla',fn:'Giga Nevada',lat:39.54,lon:-118.45},
    {t:'AAPL',n:'Apple',fn:'Apple Park',lat:37.33,lon:-122.01},
    {t:'NVDA',n:'NVIDIA',fn:'Santa Clara HQ',lat:37.37,lon:-121.96},
    {t:'INTC',n:'Intel',fn:'Oregon Fab',lat:45.54,lon:-122.97},
    {t:'INTC',n:'Intel',fn:'Arizona Fab',lat:33.41,lon:-111.91},
    {t:'AMZN',n:'Amazon',fn:'AWS Virginia',lat:39.04,lon:-77.49},
    {t:'MSFT',n:'Microsoft',fn:'Quincy DC',lat:47.23,lon:-119.85},
    {t:'XOM',n:'Exxon',fn:'Baytown Refinery',lat:29.75,lon:-95.01},
    {t:'CVX',n:'Chevron',fn:'Richmond Refinery',lat:37.93,lon:-122.37},
  ],
  JPN:[
    {t:'TM',n:'Toyota',fn:'Toyota City',lat:35.05,lon:137.15},
    {t:'TM',n:'Toyota',fn:'Tahara Plant',lat:34.65,lon:137.07},
    {t:'6758',n:'Sony Semi',fn:'Kumamoto Fab',lat:32.78,lon:130.74},
    {t:'6861',n:'Keyence',fn:'Osaka HQ',lat:34.77,lon:135.49},
  ],
  DEU:[
    {t:'VOW3',n:'VW',fn:'Wolfsburg',lat:52.43,lon:10.79},
    {t:'BMW',n:'BMW',fn:'Munich Plant',lat:48.18,lon:11.56},
    {t:'SIE',n:'Siemens',fn:'Amberg Factory',lat:49.44,lon:11.85},
    {t:'BAS',n:'BASF',fn:'Ludwigshafen',lat:49.49,lon:8.43},
  ],
  GBR:[
    {t:'SHEL',n:'Shell',fn:'Shell Centre',lat:51.50,lon:-0.12},
  ],
  CHN:[
    {t:'BYD',n:'BYD',fn:'Shenzhen HQ',lat:22.65,lon:114.03},
    {t:'BYD',n:'BYD',fn:'Changsha',lat:28.29,lon:113.01},
    {t:'CATL',n:'CATL',fn:'Ningde',lat:26.66,lon:119.55},
    {t:'CATL',n:'CATL',fn:'Liyang',lat:31.43,lon:119.48},
    {t:'BABA',n:'Alibaba',fn:'Hangzhou HQ',lat:30.27,lon:120.03},
  ],
  TWN:[
    {t:'TSM',n:'TSMC',fn:'Fab 18 Tainan',lat:23.06,lon:120.30},
    {t:'TSM',n:'TSMC',fn:'Fab 15 Taichung',lat:24.21,lon:120.62},
    {t:'2317',n:'Foxconn',fn:'Zhengzhou',lat:34.72,lon:113.86},
  ],
  IND:[
    {t:'TCS',n:'TCS',fn:'Mumbai HQ',lat:19.03,lon:72.86},
    {t:'INFY',n:'Infosys',fn:'Bangalore',lat:12.84,lon:77.66},
  ],
  AUS:[
    {t:'BHP',n:'BHP',fn:'Olympic Dam',lat:-30.44,lon:136.89},
    {t:'RIO',n:'Rio Tinto',fn:'Pilbara',lat:-22.72,lon:118.28},
  ],
  FRA:[
    {t:'AIR',n:'Airbus',fn:'Toulouse HQ',lat:43.63,lon:1.37},
    {t:'TTE',n:'TotalEnergies',fn:'Donges Refinery',lat:47.30,lon:-2.07},
  ],
  NLD:[
    {t:'ASML',n:'ASML',fn:'Veldhoven HQ',lat:51.41,lon:5.49},
  ],
  BRA:[
    {t:'VALE',n:'Vale',fn:'Carajás Mine',lat:-6.08,lon:-50.15},
    {t:'VALE',n:'Vale',fn:'Itabira',lat:-19.62,lon:-43.23},
  ],
};
// ISO3→ISO2 매핑 (시설 데이터는 ISO2)
const ISO3_TO_2={KOR:'KOR',USA:'USA',JPN:'JPN',DEU:'DEU',GBR:'GBR',CHN:'CHN',TWN:'TWN',IND:'IND',AUS:'AUS',FRA:'FRA',NLD:'NLD',BRA:'BRA',ESP:'ESP',ITA:'ITA',CAN:'CAN',CHE:'CHE',SWE:'SWE',NOR:'NOR',SGP:'SGP',HKG:'HKG',MEX:'MEX',TUR:'TUR'};

// ═══ 주요 행정도시 데이터 (야간광 밝기 = 경제활동 프록시) ═══
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
    {n:'창원',en:'Changwon',lat:35.23,lon:128.68,pop:1.0,light:70},
    {n:'성남',en:'Seongnam',lat:37.42,lon:127.13,pop:0.9,light:83},
    {n:'세종',en:'Sejong',lat:36.48,lon:127.00,pop:0.4,light:55},
    {n:'제주',en:'Jeju',lat:33.50,lon:126.53,pop:0.7,light:52},
    {n:'포항',en:'Pohang',lat:36.02,lon:129.37,pop:0.5,light:62},
    {n:'여수',en:'Yeosu',lat:34.76,lon:127.66,pop:0.3,light:58},
    {n:'천안',en:'Cheonan',lat:36.81,lon:127.11,pop:0.7,light:63},
  ],
  USA:[
    {n:'뉴욕',en:'New York',lat:40.71,lon:-74.01,pop:8.3,light:99},
    {n:'로스앤젤레스',en:'Los Angeles',lat:34.05,lon:-118.24,pop:4.0,light:95},
    {n:'시카고',en:'Chicago',lat:41.88,lon:-87.63,pop:2.7,light:88},
    {n:'휴스턴',en:'Houston',lat:29.76,lon:-95.37,pop:2.3,light:85},
    {n:'피닉스',en:'Phoenix',lat:33.45,lon:-112.07,pop:1.7,light:78},
    {n:'필라델피아',en:'Philadelphia',lat:39.95,lon:-75.17,pop:1.6,light:82},
    {n:'샌안토니오',en:'San Antonio',lat:29.42,lon:-98.49,pop:1.5,light:72},
    {n:'시애틀',en:'Seattle',lat:47.61,lon:-122.33,pop:0.7,light:80},
    {n:'마이애미',en:'Miami',lat:25.76,lon:-80.19,pop:0.5,light:84},
    {n:'디트로이트',en:'Detroit',lat:42.33,lon:-83.05,pop:0.6,light:58},
    {n:'보스턴',en:'Boston',lat:42.36,lon:-71.06,pop:0.7,light:86},
    {n:'샌프란시스코',en:'San Francisco',lat:37.77,lon:-122.42,pop:0.9,light:90},
  ],
  JPN:[
    {n:'도쿄',en:'Tokyo',lat:35.68,lon:139.69,pop:14.0,light:99},
    {n:'오사카',en:'Osaka',lat:34.69,lon:135.50,pop:2.7,light:90},
    {n:'나고야',en:'Nagoya',lat:35.18,lon:136.91,pop:2.3,light:82},
    {n:'요코하마',en:'Yokohama',lat:35.44,lon:139.64,pop:3.7,light:92},
    {n:'후쿠오카',en:'Fukuoka',lat:33.59,lon:130.40,pop:1.6,light:75},
    {n:'삿포로',en:'Sapporo',lat:43.06,lon:141.35,pop:2.0,light:70},
    {n:'고베',en:'Kobe',lat:34.69,lon:135.20,pop:1.5,light:78},
    {n:'교토',en:'Kyoto',lat:35.01,lon:135.77,pop:1.5,light:72},
    {n:'히로시마',en:'Hiroshima',lat:34.39,lon:132.46,pop:1.2,light:68},
    {n:'센다이',en:'Sendai',lat:38.27,lon:140.87,pop:1.1,light:65},
  ],
  DEU:[
    {n:'베를린',en:'Berlin',lat:52.52,lon:13.41,pop:3.6,light:88},
    {n:'함부르크',en:'Hamburg',lat:53.55,lon:9.99,pop:1.9,light:82},
    {n:'뮌헨',en:'Munich',lat:48.14,lon:11.58,pop:1.5,light:85},
    {n:'쾰른',en:'Cologne',lat:50.94,lon:6.96,pop:1.1,light:78},
    {n:'프랑크푸르트',en:'Frankfurt',lat:50.11,lon:8.68,pop:0.8,light:90},
    {n:'슈투트가르트',en:'Stuttgart',lat:48.78,lon:9.18,pop:0.6,light:80},
    {n:'뒤셀도르프',en:'Düsseldorf',lat:51.23,lon:6.78,pop:0.6,light:76},
    {n:'드레스덴',en:'Dresden',lat:51.05,lon:13.74,pop:0.6,light:62},
  ],
  GBR:[
    {n:'런던',en:'London',lat:51.51,lon:-0.13,pop:9.0,light:97},
    {n:'버밍엄',en:'Birmingham',lat:52.49,lon:-1.90,pop:1.1,light:75},
    {n:'맨체스터',en:'Manchester',lat:53.48,lon:-2.24,pop:0.6,light:78},
    {n:'리즈',en:'Leeds',lat:53.80,lon:-1.55,pop:0.8,light:70},
    {n:'에딘버러',en:'Edinburgh',lat:55.95,lon:-3.19,pop:0.5,light:72},
    {n:'글래스고',en:'Glasgow',lat:55.86,lon:-4.25,pop:0.6,light:68},
    {n:'리버풀',en:'Liverpool',lat:53.41,lon:-2.98,pop:0.5,light:65},
    {n:'브리스톨',en:'Bristol',lat:51.45,lon:-2.59,pop:0.5,light:70},
  ],
  CHN:[
    {n:'상하이',en:'Shanghai',lat:31.23,lon:121.47,pop:24.9,light:99},
    {n:'베이징',en:'Beijing',lat:39.90,lon:116.40,pop:21.5,light:97},
    {n:'광저우',en:'Guangzhou',lat:23.13,lon:113.26,pop:15.3,light:95},
    {n:'선전',en:'Shenzhen',lat:22.54,lon:114.06,pop:12.6,light:96},
    {n:'청두',en:'Chengdu',lat:30.57,lon:104.07,pop:16.3,light:85},
    {n:'충칭',en:'Chongqing',lat:29.43,lon:106.91,pop:32.1,light:82},
    {n:'항저우',en:'Hangzhou',lat:30.27,lon:120.15,pop:10.4,light:88},
    {n:'우한',en:'Wuhan',lat:30.59,lon:114.31,pop:11.1,light:80},
    {n:'난징',en:'Nanjing',lat:32.06,lon:118.80,pop:9.3,light:83},
    {n:'톈진',en:'Tianjin',lat:39.14,lon:117.18,pop:13.9,light:85},
  ],
  FRA:[
    {n:'파리',en:'Paris',lat:48.86,lon:2.35,pop:2.2,light:97},
    {n:'마르세유',en:'Marseille',lat:43.30,lon:5.37,pop:0.9,light:72},
    {n:'리옹',en:'Lyon',lat:45.76,lon:4.83,pop:0.5,light:78},
    {n:'툴루즈',en:'Toulouse',lat:43.60,lon:1.44,pop:0.5,light:68},
    {n:'니스',en:'Nice',lat:43.71,lon:7.26,pop:0.3,light:75},
    {n:'보르도',en:'Bordeaux',lat:44.84,lon:-0.58,pop:0.3,light:65},
  ],
  IND:[
    {n:'뭄바이',en:'Mumbai',lat:19.08,lon:72.88,pop:20.7,light:92},
    {n:'델리',en:'Delhi',lat:28.61,lon:77.21,pop:16.8,light:90},
    {n:'방갈로르',en:'Bangalore',lat:12.97,lon:77.59,pop:8.4,light:85},
    {n:'하이데라바드',en:'Hyderabad',lat:17.39,lon:78.49,pop:6.8,light:78},
    {n:'첸나이',en:'Chennai',lat:13.08,lon:80.27,pop:4.6,light:80},
    {n:'콜카타',en:'Kolkata',lat:22.57,lon:88.36,pop:4.5,light:72},
    {n:'아메다바드',en:'Ahmedabad',lat:23.02,lon:72.57,pop:5.6,light:75},
    {n:'푸네',en:'Pune',lat:18.52,lon:73.86,pop:3.1,light:76},
  ],
  AUS:[
    {n:'시드니',en:'Sydney',lat:-33.87,lon:151.21,pop:5.3,light:92},
    {n:'멜버른',en:'Melbourne',lat:-37.81,lon:144.96,pop:5.0,light:88},
    {n:'브리즈번',en:'Brisbane',lat:-27.47,lon:153.03,pop:2.5,light:78},
    {n:'퍼스',en:'Perth',lat:-31.95,lon:115.86,pop:2.1,light:75},
    {n:'애들레이드',en:'Adelaide',lat:-34.93,lon:138.60,pop:1.4,light:65},
    {n:'캔버라',en:'Canberra',lat:-35.28,lon:149.13,pop:0.5,light:60},
  ],
};

// 도시 데이터 없는 국가용 제네릭 생성
function generateCities(country){
  if(CITY_DATA[country.iso]) return CITY_DATA[country.iso];
  // 수도 + 주변 랜덤 도시 생성
  const seed=country.iso.charCodeAt(0)+country.iso.charCodeAt(1);
  const cities=[{n:country.n||country.en,en:country.en,lat:country.lat,lon:country.lon,pop:2.0,light:80}];
  for(let i=0;i<6;i++){
    const angle=(seed*37+i*60)%360;const dist=(0.5+((seed*13+i*7)%10)/10)*3;
    cities.push({
      n:`City ${i+1}`,en:`City ${i+1}`,
      lat:country.lat+dist*Math.sin(angle*Math.PI/180),
      lon:country.lon+dist*Math.cos(angle*Math.PI/180),
      pop:0.3+(seed+i)%15/10,
      light:40+((seed*11+i*17)%50),
    });
  }
  return cities;
}

function lightColor(v){
  if(v>=85) return {core:'rgba(255,255,240,0.95)',mid:'rgba(255,240,180,0.4)',outer:'rgba(255,210,100,0.08)'};
  if(v>=65) return {core:'rgba(220,240,255,0.85)',mid:'rgba(160,210,255,0.3)',outer:'rgba(100,180,255,0.06)'};
  return {core:'rgba(180,200,220,0.6)',mid:'rgba(120,160,200,0.2)',outer:'rgba(80,120,180,0.04)'};
}

export default function CountryMap({country,onBack,lang='ko',onNav}){
  const L=lang;
  const canvasRef=useRef(null);
  const geoRef=useRef(null);
  const decodedRef=useRef(null);
  const frameRef=useRef(null);
  const [hovCity,setHovCity]=useState(null);
  const hovRef=useRef(null);
  useEffect(()=>{hovRef.current=hovCity},[hovCity]);

  const cities=generateCities(country);
  const cityName=(c)=>L==='ko'?c.n:c.en;

  // TopoJSON 로드
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

      // 국가 중심으로 프로젝션 — 줌
      const proj=d3.geoMercator()
        .center([country.lon,country.lat])
        .scale(w*(country.iso==='USA'||country.iso==='CHN'||country.iso==='AUS'||country.iso==='CAN'||country.iso==='IND'?1.2:country.iso==='RUS'?0.8:4))
        .translate([w/2,h/2]);
      const path=d3.geoPath(proj,ctx);
      const now=Date.now()/1000;
      const hov=hovRef.current;

      // 배경
      ctx.fillStyle="#030810";ctx.fillRect(0,0,w,h);

      // 위도/경도 그리드 (미세)
      ctx.strokeStyle="#0a1525";ctx.lineWidth=0.3;ctx.beginPath();path(d3.geoGraticule10());ctx.stroke();

      // 모든 국가 (어두운)
      fc.features.forEach(f=>{ctx.beginPath();path(f);ctx.fillStyle="#080e1a";ctx.fill();ctx.strokeStyle="#10192d";ctx.lineWidth=0.3;ctx.stroke()});

      // 해당 국가 하이라이트
      const ISO_MAP={'KOR':'410','USA':'840','JPN':'392','DEU':'276','GBR':'826','FRA':'250','CHN':'156','IND':'356','AUS':'036','ITA':'380','ESP':'724','CAN':'124','NLD':'528','CHE':'756','SWE':'752','NOR':'578','SGP':'702','TWN':'158','BRA':'076','MEX':'484','TUR':'792','ISR':'376','RUS':'643'};
      const numCode=ISO_MAP[country.iso];
      fc.features.forEach(f=>{
        const fId=f.properties?.id||f.properties?.ISO_A3||f.id;
        if(fId===numCode||fId===country.iso){
          ctx.beginPath();path(f);
          ctx.fillStyle="#0c1a30";ctx.fill();
          ctx.strokeStyle=`${T.accent}60`;ctx.lineWidth=1.5;ctx.stroke();
        }
      });

      // 야간광 렌더링
      ctx.globalCompositeOperation="screen";
      cities.forEach((c,i)=>{
        const p=proj([c.lon,c.lat]);if(!p)return;
        if(p[0]<-50||p[0]>w+50||p[1]<-50||p[1]>h+50)return;
        const phase=now*0.5+i*1.7;
        const pulse=0.7+Math.sin(phase)*0.12+Math.sin(phase*2.3)*0.05;
        const lc=lightColor(c.light);
        const isHov=hov&&hov.en===c.en;
        const scale=isHov?1.5:1;

        // 외곽 글로우
        const r1=Math.max(12,c.light/3)*scale;
        const g1=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],r1);
        g1.addColorStop(0,lc.mid.replace(/[\d.]+\)$/,`${pulse*0.5})`));
        g1.addColorStop(0.5,lc.outer.replace(/[\d.]+\)$/,`${pulse*0.15})`));
        g1.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=g1;ctx.beginPath();ctx.arc(p[0],p[1],r1,0,Math.PI*2);ctx.fill();

        // 중간 글로우
        const r2=Math.max(6,c.light/6)*scale;
        const g2=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],r2);
        g2.addColorStop(0,lc.core.replace(/[\d.]+\)$/,`${pulse*0.8})`));
        g2.addColorStop(0.6,lc.mid.replace(/[\d.]+\)$/,`${pulse*0.25})`));
        g2.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=g2;ctx.beginPath();ctx.arc(p[0],p[1],r2,0,Math.PI*2);ctx.fill();

        // 코어 (밝은 점)
        const r3=Math.max(2,c.light/20)*scale;
        const g3=ctx.createRadialGradient(p[0],p[1],0,p[0],p[1],r3);
        g3.addColorStop(0,"rgba(255,255,255,0.95)");
        g3.addColorStop(0.5,lc.core);
        g3.addColorStop(1,"rgba(255,255,255,0)");
        ctx.fillStyle=g3;ctx.beginPath();ctx.arc(p[0],p[1],r3,0,Math.PI*2);ctx.fill();

        // 호버 시 도시명
        if(isHov){
          ctx.globalCompositeOperation="source-over";
          ctx.font="bold 13px 'Pretendard',sans-serif";
          ctx.fillStyle="#fff";ctx.textAlign="center";
          ctx.shadowColor="rgba(0,0,0,0.9)";ctx.shadowBlur=8;
          ctx.fillText(cityName(c),p[0],p[1]-r1-6);
          ctx.font="11px 'JetBrains Mono',monospace";
          ctx.fillStyle=T.accent;
          ctx.fillText(`💡 ${c.light}%`,p[0],p[1]-r1+8);
          ctx.shadowBlur=0;
          ctx.globalCompositeOperation="screen";
        }
      });
      ctx.globalCompositeOperation="source-over";

      // 도시 라벨 (상위 5개만)
      const topCities=[...cities].sort((a,b)=>b.light-a.light).slice(0,5);
      topCities.forEach(c=>{
        if(hov&&hov.en===c.en) return;
        const p=proj([c.lon,c.lat]);if(!p)return;
        if(p[0]<20||p[0]>w-20||p[1]<20||p[1]>h-20)return;
        ctx.font="10px 'Pretendard',sans-serif";
        ctx.fillStyle="rgba(200,220,240,0.5)";ctx.textAlign="center";
        ctx.fillText(cityName(c),p[0],p[1]+Math.max(8,c.light/6)+10);
      });

      // ═══ 주식종목 시설 마커 ═══
      const facs=STOCK_FAC[country.iso]||[];
      facs.forEach((f,i)=>{
        const p=proj([f.lon,f.lat]);if(!p)return;
        if(p[0]<-20||p[0]>w+20||p[1]<-20||p[1]>h+20)return;
        const phase=now*0.8+i*2.1;
        const pulse=0.6+Math.sin(phase)*0.2;

        // 보라색 다이아몬드 마커
        ctx.save();ctx.translate(p[0],p[1]);ctx.rotate(Math.PI/4);
        ctx.fillStyle=`rgba(139,92,246,${pulse*0.7})`;
        ctx.fillRect(-4,-4,8,8);
        ctx.strokeStyle=`rgba(139,92,246,${pulse})`;ctx.lineWidth=1;
        ctx.strokeRect(-4,-4,8,8);
        ctx.restore();

        // 펄스 링
        const pr=8+Math.sin(phase*1.5)*3;
        ctx.strokeStyle=`rgba(139,92,246,${0.15+Math.sin(phase)*0.1})`;
        ctx.lineWidth=0.7;ctx.beginPath();ctx.arc(p[0],p[1],pr,0,Math.PI*2);ctx.stroke();

        // 티커 라벨
        ctx.font="bold 10px 'JetBrains Mono',monospace";
        ctx.fillStyle=`rgba(139,92,246,${0.7+pulse*0.3})`;ctx.textAlign="center";
        ctx.fillText(f.t,p[0],p[1]-12);

        // 호버 상세
        if(hov&&hov.fn===f.fn){
          ctx.font="bold 12px 'Pretendard',sans-serif";
          ctx.fillStyle="#fff";ctx.shadowColor="rgba(0,0,0,0.9)";ctx.shadowBlur=8;
          ctx.fillText(f.fn,p[0],p[1]-22);
          ctx.font="10px 'Pretendard',sans-serif";
          ctx.fillStyle=T.sat;
          ctx.fillText(f.n+' · '+f.t,p[0],p[1]+20);
          ctx.shadowBlur=0;
        }
      });

      // ═══ 위성 빔 (상단 중앙에서) ═══
      const beamX=w/2,beamY=0;
      const beamSpread=w*0.6;
      ctx.globalCompositeOperation="screen";
      const bg=ctx.createLinearGradient(beamX,beamY,beamX,h*0.7);
      bg.addColorStop(0,`rgba(0,212,255,${0.08+Math.sin(now*0.5)*0.03})`);
      bg.addColorStop(0.1,`rgba(0,212,255,${0.03+Math.sin(now*0.5)*0.01})`);
      bg.addColorStop(0.4,"rgba(0,212,255,0.005)");
      bg.addColorStop(1,"rgba(0,212,255,0)");
      ctx.fillStyle=bg;
      ctx.beginPath();ctx.moveTo(beamX,beamY);ctx.lineTo(beamX-beamSpread/2,h*0.7);ctx.lineTo(beamX+beamSpread/2,h*0.7);ctx.closePath();ctx.fill();
      // 내부 밝은 빔
      const bg2=ctx.createLinearGradient(beamX,beamY,beamX,h*0.5);
      bg2.addColorStop(0,`rgba(0,212,255,${0.15+Math.sin(now*0.7)*0.05})`);
      bg2.addColorStop(0.15,`rgba(0,212,255,0.02)`);
      bg2.addColorStop(1,"rgba(0,212,255,0)");
      ctx.fillStyle=bg2;
      ctx.beginPath();ctx.moveTo(beamX,beamY);ctx.lineTo(beamX-beamSpread/6,h*0.5);ctx.lineTo(beamX+beamSpread/6,h*0.5);ctx.closePath();ctx.fill();
      ctx.globalCompositeOperation="source-over";

      frameRef.current=requestAnimationFrame(animate);
    };
    frameRef.current=requestAnimationFrame(animate);
    return()=>{running=false;if(frameRef.current)cancelAnimationFrame(frameRef.current)};
  },[decode,country,cities]);

  // 마우스 호버 — 도시 감지
  const handleMouse=(e)=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left,my=e.clientY-rect.top;
    const w=rect.width,h=rect.height;
    const proj=d3.geoMercator()
      .center([country.lon,country.lat])
      .scale(w*(country.iso==='USA'||country.iso==='CHN'||country.iso==='AUS'||country.iso==='CAN'||country.iso==='IND'?1.2:country.iso==='RUS'?0.8:4))
      .translate([w/2,h/2]);
    let found=null;
    // 시설 먼저 (더 작은 타겟이므로 우선)
    const facs=STOCK_FAC[country.iso]||[];
    for(const f of facs){
      const p=proj([f.lon,f.lat]);if(!p)continue;
      if(Math.sqrt((mx-p[0])**2+(my-p[1])**2)<14){found=f;break}
    }
    // 도시
    if(!found){
      for(const c of cities){
        const p=proj([c.lon,c.lat]);if(!p)continue;
        if(Math.sqrt((mx-p[0])**2+(my-p[1])**2)<18){found=c;break}
      }
    }
    setHovCity(found);
    canvas.style.cursor=found?"pointer":"default";
  };

  const nm=t('cnt_'+country.iso,L)||country.en||country.n;

  return(
    <div style={{background:T.bg0,borderRadius:16,overflow:"hidden",border:`1px solid ${T.border}`}}>
      <style>{`@keyframes satFloat{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-4px)}}`}</style>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{padding:"6px 12px",borderRadius:6,border:`1px solid ${T.border}`,background:"transparent",color:T.textDim,fontSize:13,cursor:"pointer"}}>← {t('gBackWorld',L)||'Back'}</button>
          <span style={{fontSize:18,fontWeight:800,color:T.text}}>{nm}</span>
          <span style={{fontSize:14,color:T.textDim}}>{country.iso} · {cities.length} cities</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,color:T.accent}}>🛰️ VIIRS DNB</span>
          <button onClick={()=>{onBack();if(onNav)onNav('dashboard',{country:country.iso});}} style={{padding:"6px 14px",borderRadius:6,border:"none",background:T.accent,color:T.bg0,fontSize:13,fontWeight:700,cursor:"pointer"}}>{t('gOpenReport',L)||'Report'}</button>
        </div>
      </div>

      {/* Satellite + Beam overlay */}
      <div style={{position:"relative"}}>
        {/* Satellite icon */}
        <div style={{position:"absolute",top:2,left:"50%",transform:"translateX(-50%)",zIndex:10,animation:"satFloat 7s ease-in-out infinite",filter:`drop-shadow(0 2px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 12px ${T.accent}40)`}}>
          <div style={{fontSize:28}}>🛰️</div>
        </div>
        {/* Beam SVG */}
        <div style={{position:"absolute",top:30,left:"50%",transform:"translateX(-50%)",zIndex:3,pointerEvents:"none"}}>
          <svg width="1200" height="400" viewBox="-600 0 1200 400" style={{display:"block"}}>
            <defs>
              <linearGradient id="cmBeam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.accent} stopOpacity="0.3"/>
                <stop offset="3%" stopColor={T.accent} stopOpacity="0.08"/>
                <stop offset="15%" stopColor={T.accent} stopOpacity="0.02"/>
                <stop offset="50%" stopColor={T.accent} stopOpacity="0.005"/>
                <stop offset="100%" stopColor={T.accent} stopOpacity="0"/>
              </linearGradient>
            </defs>
            <polygon points="0,0 -500,400 500,400" fill="url(#cmBeam)">
              <animate attributeName="opacity" values="0.7;1;0.7" dur="5s" repeatCount="indefinite"/>
            </polygon>
          </svg>
        </div>
        <canvas ref={canvasRef} onMouseMove={handleMouse} onMouseLeave={()=>setHovCity(null)} style={{display:"block",width:"100%"}}/>
      </div>

      {/* Legend + City stats + Stock facilities */}
      <div style={{padding:"12px 20px",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            <span style={{fontSize:12,color:T.textDim}}>💡</span>
            {[30,50,70,90].map(v=>(<div key={v} style={{width:7,height:7,borderRadius:4,background:`rgba(${v>70?'255,240,180':v>50?'160,210,255':'120,160,200'},${v/100})`,border:'1px solid rgba(255,255,255,0.1)'}}/>))}
            <span style={{fontSize:11,color:T.textDim}}>Nightlight</span>
          </div>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            <div style={{width:7,height:7,borderRadius:1,background:T.sat,transform:"rotate(45deg)"}}/>
            <span style={{fontSize:11,color:T.sat}}>Stock Facilities ({(STOCK_FAC[country.iso]||[]).length})</span>
          </div>
        </div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {cities.sort((a,b)=>b.light-a.light).slice(0,3).map(c=>(
            <span key={c.en} style={{fontSize:11,color:c.light>=80?T.accent:T.textDim}}>
              {cityName(c)} {c.light}%
            </span>
          ))}
          {(STOCK_FAC[country.iso]||[]).slice(0,3).map(f=>(
            <span key={f.fn} style={{fontSize:11,color:T.sat}}>
              ◆ {f.t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
