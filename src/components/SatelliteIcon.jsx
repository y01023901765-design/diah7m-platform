// ═══ DIAH-7M 공식 위성 아이콘 — Sentinel-2 스타일 ═══
// 모든 페이지에서 동일한 위성 사용 (size prop으로 크기 조절)
const T_ACCENT='#00d4ff';

export default function SatelliteIcon({size=100}){
  const s=size/100; // scale factor
  return(
    <svg width={100*s} height={48*s} viewBox="0 0 100 48" fill="none" style={{display:"block"}}>
      {/* Left solar array */}
      <g transform="translate(0,8)">
        <rect x="2" y="4" width="28" height="24" rx="1" fill="#1a2845" stroke="#3a5a8a" strokeWidth="0.6"/>
        {[0,1,2,3].map(col=>[0,1,2].map(row=>(
          <rect key={`l${col}${row}`} x={4+col*6.5} y={6+row*7.5} width={5.5} height={6.5} rx={0.5}
            fill={`hsl(${210+col*3},${50+row*5}%,${18+row*3}%)`}
            stroke="#2a4a7a" strokeWidth="0.3"/>
        )))}
        <rect x="2" y="4" width="28" height="24" rx="1" fill="url(#pSL)" opacity="0.15"/>
      </g>
      {/* Panel arm left */}
      <rect x="30" y="20" width="8" height="3" rx="0.5" fill="#2a3a55" stroke="#4a6a9a" strokeWidth="0.4"/>
      <circle cx="32" cy="21.5" r="1.2" fill="#3a5a8a" stroke="#5a8aba" strokeWidth="0.3"/>
      {/* Main body */}
      <g transform="translate(38,4)">
        <rect x="0" y="4" width="24" height="32" rx="3" fill="#1a2540" stroke="#3a5a8a" strokeWidth="0.8"/>
        <rect x="2" y="6" width="20" height="8" rx="1.5" fill="#0f1a2d" stroke="#2a4a6a" strokeWidth="0.4"/>
        <circle cx="6" cy="10" r="1" fill="#00ff88" opacity="0.8"/>
        <circle cx="10" cy="10" r="1" fill={T_ACCENT} opacity="0.6"/>
        <circle cx="14" cy="10" r="0.8" fill="#ff6644" opacity="0.3"/>
        <rect x="4" y="16" width="16" height="14" rx="2" fill="#0a1220" stroke="#2a4a6a" strokeWidth="0.5"/>
        <circle cx="12" cy="23" r="5" fill="#080e1a" stroke="#3a6a9a" strokeWidth="0.6"/>
        <circle cx="12" cy="23" r="3.2" fill="#0c1828" stroke={T_ACCENT} strokeWidth="0.4" opacity="0.7"/>
        <circle cx="12" cy="23" r="1.5" fill={`${T_ACCENT}60`}/>
        <circle cx="12" cy="23" r="0.6" fill={T_ACCENT}/>
        <circle cx="10.5" cy="21.5" r="0.8" fill="white" opacity="0.15"/>
        <rect x="3" y="32" width="18" height="2" rx="0.5" fill="#1a2540" stroke="#2a3a55" strokeWidth="0.3"/>
        <line x1="12" y1="4" x2="12" y2="0" stroke="#5a7a9a" strokeWidth="0.8"/>
        <circle cx="12" cy="0" r="1.5" fill="none" stroke="#5a8aba" strokeWidth="0.5"/>
        <circle cx="12" cy="0" r="0.5" fill={T_ACCENT} opacity="0.8"/>
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
        <rect x="0" y="4" width="28" height="24" rx="1" fill="url(#pSR)" opacity="0.15"/>
      </g>
      <defs>
        <linearGradient id="pSL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.3"/>
          <stop offset="50%" stopColor="white" stopOpacity="0"/>
          <stop offset="100%" stopColor="white" stopOpacity="0.1"/>
        </linearGradient>
        <linearGradient id="pSR" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.3"/>
          <stop offset="50%" stopColor="white" stopOpacity="0"/>
          <stop offset="100%" stopColor="white" stopOpacity="0.1"/>
        </linearGradient>
      </defs>
    </svg>
  );
}
