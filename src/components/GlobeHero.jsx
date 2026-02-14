import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import T from '../theme';
import { t } from '../i18n';

/* ═══════════════════════════════════════════════════════════
   DIAH-7M Globe Hero — 2D 위성 지도 + Sentinel-2 빔
   130° 빔 + 45/18/14px 블룸 + IP 기반 HOME
   ═══════════════════════════════════════════════════════════ */

// ═══ 43개국 좌표 ═══
const COUNTRIES = [
  {iso3:"KOR",ko:"대한민국",en:"South Korea",lat:37.5,lon:127.0,tier:"home",score:78},
  {iso3:"USA",ko:"미국",en:"United States",lat:38.9,lon:-77.0,tier:"active",score:82},
  {iso3:"JPN",ko:"일본",en:"Japan",lat:35.7,lon:139.7,tier:"active",score:74},
  {iso3:"DEU",ko:"독일",en:"Germany",lat:52.5,lon:13.4,tier:"active",score:76},
  {iso3:"GBR",ko:"영국",en:"United Kingdom",lat:51.5,lon:-0.1,tier:"active",score:71},
  {iso3:"FRA",ko:"프랑스",en:"France",lat:48.9,lon:2.3,tier:"active",score:69},
  {iso3:"CAN",ko:"캐나다",en:"Canada",lat:45.4,lon:-75.7,tier:"active",score:80},
  {iso3:"AUS",ko:"호주",en:"Australia",lat:-25.3,lon:133.8,tier:"active",score:77},
  {iso3:"ITA",ko:"이탈리아",en:"Italy",lat:41.9,lon:12.5,tier:"active",score:65},
  {iso3:"ESP",ko:"스페인",en:"Spain",lat:40.4,lon:-3.7,tier:"active",score:68},
  {iso3:"NLD",ko:"네덜란드",en:"Netherlands",lat:52.4,lon:4.9,tier:"active",score:81},
  {iso3:"CHE",ko:"스위스",en:"Switzerland",lat:46.9,lon:7.4,tier:"active",score:88},
  {iso3:"SWE",ko:"스웨덴",en:"Sweden",lat:59.3,lon:18.1,tier:"active",score:83},
  {iso3:"NOR",ko:"노르웨이",en:"Norway",lat:59.9,lon:10.7,tier:"active",score:85},
  {iso3:"DNK",ko:"덴마크",en:"Denmark",lat:55.7,lon:12.6,tier:"active",score:82},
  {iso3:"FIN",ko:"핀란드",en:"Finland",lat:60.2,lon:25.0,tier:"active",score:80},
  {iso3:"AUT",ko:"오스트리아",en:"Austria",lat:48.2,lon:16.4,tier:"active",score:77},
  {iso3:"BEL",ko:"벨기에",en:"Belgium",lat:50.8,lon:4.4,tier:"active",score:73},
  {iso3:"IRL",ko:"아일랜드",en:"Ireland",lat:53.3,lon:-6.3,tier:"active",score:79},
  {iso3:"PRT",ko:"포르투갈",en:"Portugal",lat:38.7,lon:-9.1,tier:"active",score:67},
  {iso3:"GRC",ko:"그리스",en:"Greece",lat:37.9,lon:23.7,tier:"active",score:58},
  {iso3:"CZE",ko:"체코",en:"Czechia",lat:50.1,lon:14.4,tier:"active",score:72},
  {iso3:"POL",ko:"폴란드",en:"Poland",lat:52.2,lon:21.0,tier:"active",score:70},
  {iso3:"HUN",ko:"헝가리",en:"Hungary",lat:47.5,lon:19.0,tier:"active",score:64},
  {iso3:"SVK",ko:"슬로바키아",en:"Slovakia",lat:48.1,lon:17.1,tier:"active",score:66},
  {iso3:"SVN",ko:"슬로베니아",en:"Slovenia",lat:46.1,lon:14.5,tier:"active",score:71},
  {iso3:"EST",ko:"에스토니아",en:"Estonia",lat:59.4,lon:24.8,tier:"active",score:76},
  {iso3:"LVA",ko:"라트비아",en:"Latvia",lat:56.9,lon:24.1,tier:"active",score:68},
  {iso3:"LTU",ko:"리투아니아",en:"Lithuania",lat:54.7,lon:25.3,tier:"active",score:69},
  {iso3:"ISL",ko:"아이슬란드",en:"Iceland",lat:64.1,lon:-21.9,tier:"active",score:84},
  {iso3:"LUX",ko:"룩셈부르크",en:"Luxembourg",lat:49.6,lon:6.1,tier:"active",score:87},
  {iso3:"NZL",ko:"뉴질랜드",en:"New Zealand",lat:-41.3,lon:174.8,tier:"active",score:81},
  {iso3:"ISR",ko:"이스라엘",en:"Israel",lat:31.8,lon:35.2,tier:"active",score:75},
  {iso3:"TUR",ko:"튀르키예",en:"Türkiye",lat:39.9,lon:32.9,tier:"active",score:55},
  {iso3:"MEX",ko:"멕시코",en:"Mexico",lat:19.4,lon:-99.1,tier:"active",score:60},
  {iso3:"CHL",ko:"칠레",en:"Chile",lat:-33.4,lon:-70.6,tier:"active",score:72},
  {iso3:"COL",ko:"콜롬비아",en:"Colombia",lat:4.6,lon:-74.1,tier:"active",score:58},
  {iso3:"CRI",ko:"코스타리카",en:"Costa Rica",lat:9.9,lon:-84.1,tier:"active",score:66},
  {iso3:"SGP",ko:"싱가포르",en:"Singapore",lat:1.3,lon:103.8,tier:"active",score:90},
  {iso3:"HKG",ko:"홍콩",en:"Hong Kong",lat:22.3,lon:114.2,tier:"active",score:78},
  {iso3:"TWN",ko:"대만",en:"Taiwan",lat:25.0,lon:121.5,tier:"active",score:80},
  {iso3:"IND",ko:"인도",en:"India",lat:28.6,lon:77.2,tier:"active",score:62},
  {iso3:"CHN",ko:"중국",en:"China",lat:35.0,lon:105.0,tier:"satOnly",score:70},
];

// ═══ Mercator 투영 ═══
const MAP_W = 1080, MAP_H = 540;
const lonToX = lon => ((lon + 180) / 360) * MAP_W;
const latToY = lat => {
  const latRad = lat * Math.PI / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  return (MAP_H / 2) - (MAP_W * mercN) / (2 * Math.PI);
};

// ═══ 건강도 색상 ═══
const scoreColor = s => s >= 80 ? T.good : s >= 60 ? T.warn : T.danger;

// ═══ Sentinel-2 위성 SVG ═══
function SatelliteSVG({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`} style={{ filter: `drop-shadow(0 2px 8px ${T.accent}60)` }}>
      {/* 태양전지판 - 왼쪽 */}
      <rect x={-38} y={-6} width={24} height={12} rx={1}
        fill={`${T.sat}30`} stroke={T.sat} strokeWidth={0.5} />
      {[0,1,2,3].map(r => [0,1,2].map(c => (
        <rect key={`l${r}${c}`} x={-37 + c * 7.5} y={-5 + r * 3} width={6} height={2.2}
          fill={`${T.sat}${40 + r * 10}`} rx={0.3} />
      )))}
      {/* 연결 암 - 왼쪽 */}
      <rect x={-14} y={-1} width={6} height={2} fill={T.border} />
      {/* 본체 */}
      <rect x={-8} y={-8} width={16} height={16} rx={2}
        fill={T.surface} stroke={T.border} strokeWidth={0.8} />
      {/* 상태 LED */}
      <circle cx={-3} cy={-4} r={1.2} fill={T.good}>
        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* 카메라 렌즈 */}
      <circle cx={0} cy={2} r={3} fill={T.bg0} stroke={T.accent} strokeWidth={0.6} />
      <circle cx={0} cy={2} r={1.5} fill={`${T.accent}40`} />
      <circle cx={-1} cy={1} r={0.6} fill={`${T.accent}80`} />
      {/* 안테나 */}
      <line x1={4} y1={-8} x2={6} y2={-13} stroke={T.textDim} strokeWidth={0.5} />
      <circle cx={6} cy={-13.5} r={1} fill={T.textDim} />
      {/* 연결 암 - 오른쪽 */}
      <rect x={8} y={-1} width={6} height={2} fill={T.border} />
      {/* 태양전지판 - 오른쪽 */}
      <rect x={14} y={-6} width={24} height={12} rx={1}
        fill={`${T.sat}30`} stroke={T.sat} strokeWidth={0.5} />
      {[0,1,2,3].map(r => [0,1,2].map(c => (
        <rect key={`r${r}${c}`} x={15 + c * 7.5} y={-5 + r * 3} width={6} height={2.2}
          fill={`${T.sat}${40 + r * 10}`} rx={0.3} />
      )))}
      {/* 레이블 */}
      <text x={0} y={-18} textAnchor="middle" fill={T.sat} fontSize={7} fontWeight={700}
        fontFamily="monospace" opacity={0.7}>SENTINEL-2</text>
    </g>
  );
}

// ═══ 클릭 패널 ═══
function ClickedPanel({ country, onClose, lang }) {
  if (!country) return null;
  const L = lang || 'ko';
  const name = L === 'ko' ? country.ko : country.en;
  return (
    <div style={{
      position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)',
      zIndex: 20, width: 260, padding: 18, borderRadius: T.cardRadius,
      background: `${T.bg0}e8`, border: `1px solid ${T.border}`,
      backdropFilter: 'blur(16px)', animation: 'ghSlide 0.4s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.text }}>{name}</div>
          <div style={{ fontSize: 11, color: T.textDim }}>{country.iso3} · {country.tier === 'satOnly' ? '🛰️ Satellite Only' : '📊 Active'}</div>
        </div>
        <button onClick={onClose} style={{
          width: 26, height: 26, borderRadius: '50%', border: `1px solid ${T.border}`,
          background: T.surface, color: T.textDim, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>×</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: scoreColor(country.score), fontFamily: 'monospace' }}>{country.score}</span>
        <span style={{ fontSize: 11, color: T.textDim }}>/ 100</span>
      </div>
      {[
        { label: L === 'ko' ? '순환계 (금융)' : 'Circulation', value: Math.round(country.score * 1.05), color: T.accent },
        { label: L === 'ko' ? '골격계 (인프라)' : 'Skeleton', value: Math.round(country.score * 0.91), color: T.warn },
        { label: L === 'ko' ? '위성 감시' : 'Satellite', value: 'ACTIVE', color: T.sat },
      ].map(row => (
        <div key={row.label} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '7px 10px', borderRadius: T.smRadius, background: T.surface, marginBottom: 6,
        }}>
          <span style={{ fontSize: 11, color: T.textMid }}>{row.label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: row.color, fontFamily: 'monospace' }}>
            {typeof row.value === 'number' ? Math.min(row.value, 99) : row.value}
          </span>
        </div>
      ))}
      <button style={{
        width: '100%', marginTop: 10, padding: '10px 0', borderRadius: T.smRadius, border: 'none',
        background: T.accent, color: T.bg0, fontWeight: 700, fontSize: 12, cursor: 'pointer',
      }}>{L === 'ko' ? '상세 진단서 보기 →' : 'View Report →'}</button>
    </div>
  );
}

// ═══ Main GlobeHero Component ═══
export default function GlobeHero({ onNavigate, lang }) {
  const L = lang || 'ko';
  const [hovered, setHovered] = useState(null);
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 });
  const [clicked, setClicked] = useState(null);
  const [pulsePhase, setPulsePhase] = useState(0);
  const mapRef = useRef(null);

  // 펄스 애니메이션
  useEffect(() => {
    const iv = setInterval(() => setPulsePhase(p => (p + 1) % 60), 50);
    return () => clearInterval(iv);
  }, []);

  const home = useMemo(() => COUNTRIES.find(c => c.tier === 'home'), []);
  const homeX = home ? lonToX(home.lon) : 0;
  const homeY = home ? latToY(home.lat) : 0;

  // 위성 위치 (HOME 위 상단)
  const satY = homeY - 100;

  const handleHover = useCallback((c, e) => {
    setHovered(c);
    if (e) setTipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const pulseVal = Math.sin(pulsePhase * 0.1) * 0.5 + 0.5;

  return (
    <section style={{
      width: '100%', height: '100vh', position: 'relative', overflow: 'hidden', background: T.bg0,
    }}>
      <style>{`
        @keyframes ghFade{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ghSlide{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes scanLine{0%{top:-2px}100%{top:100%}}
        @keyframes homeRing{0%{r:8;opacity:0.7}100%{r:24;opacity:0}}
      `}</style>

      {/* 배경 효과 */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 40%,${T.accent}06,transparent 60%),radial-gradient(ellipse at 70% 20%,${T.sat}05,transparent 50%)` }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.02, backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 2px,${T.accent}50 2px,${T.accent}50 3px)` }} />

      {/* 지도 영역 */}
      <div ref={mapRef} style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{
          width: '100%', maxWidth: 1080, height: 'auto', maxHeight: '70vh',
          opacity: 0.9, overflow: 'hidden',
        }}>
          <defs>
            {/* HOME 블룸 그라디언트 — 45px */}
            <radialGradient id="bloomHome">
              <stop offset="0%" stopColor={T.accent} stopOpacity="0.6" />
              <stop offset="40%" stopColor={T.accent} stopOpacity="0.2" />
              <stop offset="100%" stopColor={T.accent} stopOpacity="0" />
            </radialGradient>
            {/* ACTIVE 블룸 — 18px */}
            <radialGradient id="bloomActive">
              <stop offset="0%" stopColor={T.accent} stopOpacity="0.4" />
              <stop offset="50%" stopColor={T.accent} stopOpacity="0.1" />
              <stop offset="100%" stopColor={T.accent} stopOpacity="0" />
            </radialGradient>
            {/* AMBIENT 블룸 — 14px */}
            <radialGradient id="bloomAmbient">
              <stop offset="0%" stopColor={T.sat} stopOpacity="0.3" />
              <stop offset="60%" stopColor={T.sat} stopOpacity="0.08" />
              <stop offset="100%" stopColor={T.sat} stopOpacity="0" />
            </radialGradient>
            {/* 빔 그라디언트 — 130° 부채꼴 */}
            <linearGradient id="beamGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.accent} stopOpacity="0.15" />
              <stop offset="30%" stopColor={T.accent} stopOpacity="0.08" />
              <stop offset="100%" stopColor={T.accent} stopOpacity="0.02" />
            </linearGradient>
            {/* 지도 배경 패턴 */}
            <pattern id="gridPattern" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d={`M 36 0 L 0 0 0 36`} fill="none" stroke={T.border} strokeWidth="0.3" opacity="0.3" />
            </pattern>
          </defs>

          {/* 격자 배경 */}
          <rect width={MAP_W} height={MAP_H} fill="url(#gridPattern)" opacity="0.4" />

          {/* 대륙 윤곽 (간략화) */}
          <g opacity="0.15" fill="none" stroke={T.accent} strokeWidth="0.5">
            {/* 유럽 */}
            <ellipse cx={525} cy={155} rx={60} ry={45} />
            {/* 아시아 */}
            <ellipse cx={710} cy={185} rx={120} ry={80} />
            {/* 북미 */}
            <ellipse cx={230} cy={160} rx={90} ry={70} />
            {/* 남미 */}
            <ellipse cx={300} cy={340} rx={50} ry={80} />
            {/* 아프리카 */}
            <ellipse cx={540} cy={300} rx={55} ry={80} />
            {/* 호주 */}
            <ellipse cx={850} cy={360} rx={45} ry={30} />
          </g>

          {/* ═══ 130° 위성 빔 — tan(65°)≈2.14 ═══ */}
          {home && (
            <g>
              {/* 빔 부채꼴: 위성에서 지표로 */}
              <polygon
                points={`${homeX},${satY} ${Math.max(0, homeX - 1155)},${MAP_H} ${Math.min(MAP_W, homeX + 1155)},${MAP_H}`}
                fill="url(#beamGrad)"
                opacity={0.6 + pulseVal * 0.15}
              />
              {/* 빔 엣지 라인 */}
              <line x1={homeX} y1={satY} x2={Math.max(0, homeX - 1155)} y2={MAP_H}
                stroke={T.accent} strokeWidth="0.3" opacity="0.15" />
              <line x1={homeX} y1={satY} x2={Math.min(MAP_W, homeX + 1155)} y2={MAP_H}
                stroke={T.accent} strokeWidth="0.3" opacity="0.15" />
              {/* 스캔 라인 효과 */}
              <line x1={homeX - 200} y1={homeY - 20 + pulsePhase % 40} x2={homeX + 200} y2={homeY - 20 + pulsePhase % 40}
                stroke={T.accent} strokeWidth="0.4" opacity={0.15 * (1 - (pulsePhase % 40) / 40)} />
            </g>
          )}

          {/* ═══ 국가 마커 ═══ */}
          {COUNTRIES.map(c => {
            const cx = lonToX(c.lon), cy = latToY(c.lat);
            const isHome = c.tier === 'home';
            const isSat = c.tier === 'satOnly';
            const isHov = hovered?.iso3 === c.iso3;

            return (
              <g key={c.iso3}
                onMouseEnter={(e) => handleHover(c, e)}
                onMouseLeave={() => handleHover(null)}
                onClick={() => setClicked(c)}
                style={{ cursor: 'pointer' }}
              >
                {/* 블룸 (HOME:45px, ACTIVE:18px, SAT:14px) */}
                <circle cx={cx} cy={cy}
                  r={isHome ? 22 : isSat ? 7 : 9}
                  fill={isHome ? 'url(#bloomHome)' : isSat ? 'url(#bloomAmbient)' : 'url(#bloomActive)'}
                  opacity={isHome ? 0.7 + pulseVal * 0.3 : isHov ? 0.8 : 0.6}
                />

                {/* HOME 펄스링 */}
                {isHome && (
                  <>
                    <circle cx={cx} cy={cy} r={8 + pulseVal * 16} fill="none"
                      stroke={T.accent} strokeWidth="1" opacity={0.6 * (1 - pulseVal)} />
                    <circle cx={cx} cy={cy} r={8 + ((pulseVal + 0.5) % 1) * 16} fill="none"
                      stroke={T.accent} strokeWidth="0.6" opacity={0.4 * (1 - ((pulseVal + 0.5) % 1))} />
                  </>
                )}

                {/* 코어 점 (HOME:6px, ACTIVE:3.5px, SAT:2.5px) */}
                <circle cx={cx} cy={cy}
                  r={isHome ? 6 : isSat ? 2.5 : (isHov ? 4.5 : 3.5)}
                  fill={isSat ? T.sat : T.accent}
                  opacity={isHome ? 1 : isHov ? 1 : 0.85}
                />

                {/* HOME 레이블 */}
                {isHome && (
                  <text x={cx} y={cy + 18} textAnchor="middle"
                    fill={T.accent} fontSize={8} fontWeight={800} fontFamily="monospace"
                    opacity={0.8 + pulseVal * 0.2}>
                    🏠 HOME
                  </text>
                )}

                {/* 호버 확대 효과 */}
                {isHov && !isHome && (
                  <circle cx={cx} cy={cy} r={12} fill="none"
                    stroke={isSat ? T.sat : T.accent} strokeWidth="0.8" opacity="0.5" />
                )}
              </g>
            );
          })}

          {/* ═══ Sentinel-2 위성 ═══ */}
          {home && <SatelliteSVG x={homeX} y={satY} />}
        </svg>
      </div>

      {/* 호버 툴팁 */}
      {hovered && !clicked && (
        <div style={{
          position: 'fixed', left: tipPos.x + 16, top: tipPos.y - 10,
          zIndex: 100, pointerEvents: 'none',
          background: `${T.bg0}ee`, border: `1px solid ${T.border}`,
          borderRadius: T.smRadius, padding: '10px 14px', backdropFilter: 'blur(12px)',
          animation: 'ghFade 0.2s ease',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{L === 'ko' ? hovered.ko : hovered.en}</div>
          <div style={{ fontSize: 10, color: T.textDim }}>{hovered.iso3}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
            <span style={{ fontSize: 10, color: T.textDim }}>{L === 'ko' ? '건강도' : 'Score'}</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: scoreColor(hovered.score), fontFamily: 'monospace' }}>{hovered.score}</span>
            <span style={{ fontSize: 9, color: T.textDim }}>/ 100</span>
          </div>
          <div style={{ fontSize: 9, color: T.accent, marginTop: 4 }}>{L === 'ko' ? '클릭 → 진단 보고서' : 'Click → Report'}</div>
        </div>
      )}

      {/* 클릭 패널 */}
      <ClickedPanel country={clicked} onClose={() => setClicked(null)} lang={L} />

      {/* 헤드라인 */}
      <div style={{
        textAlign: 'center', padding: '36px 24px 20px',
        maxWidth: 600, margin: '0 auto',
        position: 'relative', zIndex: 10,
        animation: 'ghFade 1s ease',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 3, marginBottom: 10 }}>
          SATELLITE ECONOMIC DIAGNOSTICS
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 900, margin: '0 0 14px', lineHeight: 1.15, letterSpacing: -2 }}>
          {t('heroTitle1', L)}<br />{t('heroTitle2', L)}
        </h1>
        <p style={{ fontSize: 13, color: T.textMid, lineHeight: 1.7, margin: '0 auto 28px', maxWidth: 460 }}>
          NASA·ESA {L === 'ko' ? '위성 데이터로 정부 통계보다' : 'satellite data—'} <strong style={{ color: T.accent }}>{t('heroFast', L)}</strong> {L === 'ko' ? '경제 진단.' : 'economic diagnostics.'}<br />
          59 {t('gauges', L)} · 9 {t('bodySys', L)} · 🛰️ {t('satTab', L)}
        </p>
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginBottom: 16 }}>
          {[
            { n: L === 'ko' ? '경제 게이지' : 'Gauges', v: '59' },
            { n: L === 'ko' ? '인체 시스템' : 'Systems', v: '9' },
            { n: L === 'ko' ? '위성 비용' : 'Satellite Cost', v: '$0' },
            { n: L === 'ko' ? '지원 언어' : 'Languages', v: '30' },
          ].map(s => (
            <div key={s.n}>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.accent, fontFamily: 'monospace' }}>{s.v}</div>
              <div style={{ fontSize: 10, color: T.textDim, marginTop: 2 }}>{s.n}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: T.textDim, animation: 'float 3s ease-in-out infinite' }}>
          🛰️ {L === 'ko' ? '국가를 클릭하면 경제 진단 보고서를 확인할 수 있습니다' : 'Click a country to view its economic report'}
        </div>
      </div>

      {/* 하단 지표 바 */}
      <div style={{
        position: 'absolute', bottom: 60, left: 20, right: 20, zIndex: 10,
        display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4,
        justifyContent: 'center',
      }}>
        {[
          { l: 'Countries', v: '43', c: T.accent },
          { l: 'WTI', v: '$64.53', c: T.warn },
          { l: 'Gold', v: '$3,340', c: T.warn },
          { l: 'VIX', v: '20.82', c: T.danger },
          { l: 'Yield', v: '+0.64%', c: T.good },
          { l: 'SOFR', v: '3.65%', c: T.accent },
        ].map(s => (
          <div key={s.l} style={{
            padding: '6px 12px', background: `${T.bg0}d0`,
            border: `1px solid ${T.border}`, borderRadius: T.smRadius,
            backdropFilter: 'blur(12px)', whiteSpace: 'nowrap',
          }}>
            <div style={{ fontSize: 8, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.l}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: s.c, fontFamily: 'monospace' }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
        display: 'flex', gap: 16, padding: '5px 14px',
        background: `${T.bg0}d0`, borderRadius: T.smRadius,
        border: `1px solid ${T.border}`, backdropFilter: 'blur(12px)',
      }}>
        {[
          { c: T.accent, l: 'Active (43)' },
          { c: T.sat, l: 'Satellite Only' },
          { c: T.textDim, l: 'Coming Soon' },
        ].map(i => (
          <div key={i.l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: i.c }} />
            <span style={{ fontSize: 9, color: T.textMid }}>{i.l}</span>
          </div>
        ))}
      </div>

      {/* 스크롤 힌트 */}
      <div style={{
        position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
        textAlign: 'center', opacity: 0.5,
      }}>
        <div style={{ fontSize: 14, color: T.textDim, animation: 'float 2s ease-in-out infinite' }}>↓</div>
      </div>
    </section>
  );
}
