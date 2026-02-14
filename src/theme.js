// DIAH-7M Design Tokens v2.0 — 정본
const T = {
  bg0:'#04060e', bg1:'#0a0f1e', bg2:'#111827', bg3:'#1a2235',
  surface:'#151c2e', surfaceHover:'#1c2540',
  border:'#1e2a42', borderLight:'#2a3a58',
  text:'#e8ecf4', textMid:'#8b95a8', textDim:'#7a8a9e', white:'#ffffff',
  accent:'#00d4ff', accentDim:'#00d4ff30', accentMid:'#00d4ff60',
  good:'#00e5a0', warn:'#f0b429', danger:'#ff5c5c', info:'#6e8efb',
  orange:'#f97316', orangeDim:'#f9731630', enterprise:'#f59e0b',
  sat:'#8b5cf6', satDim:'#8b5cf620', satBorder:'#6d28d9',
  cardRadius:14, smRadius:8,
};

// Light mode — Dashboard, 보고서, MyPage, Admin
// 단색 원칙: 흑백+회색, 컬러는 이모티콘/상태만
const L = {
  bg0:'#FFFFFF', bg1:'#F9FAFB', bg2:'#F3F4F6', bg3:'#E5E7EB',
  surface:'#FFFFFF', surfaceHover:'#F9FAFB',
  border:'#E5E7EB', borderLight:'#D1D5DB',
  text:'#111827', textMid:'#4B5563', textDim:'#9CA3AF', white:'#ffffff',
  accent:'#0891B2', accentDim:'#0891B210', accentMid:'#0891B230',
  good:'#059669', warn:'#D97706', danger:'#DC2626', info:'#4F6AE8',
  orange:'#EA580C', orangeDim:'#EA580C10', enterprise:'#D97706',
  sat:'#7C3AED', satDim:'#7C3AED10', satBorder:'#6D28D9',
  cardRadius:12, smRadius:8,
  // 라이트 전용
  cardShadow:'0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  cardShadowHover:'0 4px 12px rgba(0,0,0,0.1)',
  inputBg:'#FFFFFF',
  inputBorder:'#D1D5DB',
  divider:'#F3F4F6',
  tableHeaderBg:'#F9FAFB',
  tableStripeBg:'#FAFAFA',
  activeBg:'#F0FDFA',
  activeBorder:'#0891B230',
};

export default T;
export { L };
