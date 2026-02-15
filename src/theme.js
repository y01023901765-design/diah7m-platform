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
// 고급 단색: 검정/회색 명암비 + 볼드 위계로 고급스럽게
const L = {
  bg0:'#FFFFFF', bg1:'#FAFAFA', bg2:'#F5F5F5', bg3:'#EEEEEE',
  surface:'#FFFFFF', surfaceHover:'#FAFAFA',
  border:'#E0E0E0', borderLight:'#EEEEEE',
  // 텍스트: 검정~회색 3단계 명암비
  text:'#111111',       // 제목, 핵심 수치 — 거의 검정
  textMid:'#444444',    // 본문, 설명 — 진한 회색 (배경 대비 선명)
  textDim:'#777777',    // 보조, 라벨 — 중간 회색 (뿌옇지 않게)
  white:'#ffffff',
  // 컬러는 상태 표시에만 최소 사용
  accent:'#111111',     // 버튼, 링크 — 검정 (고급)
  accentDim:'#11111108', accentMid:'#11111120',
  good:'#059669', warn:'#D97706', danger:'#DC2626', info:'#444444',
  orange:'#EA580C', orangeDim:'#EA580C08', enterprise:'#D97706',
  sat:'#444444', satDim:'#44444408', satBorder:'#333333',
  cardRadius:12, smRadius:8,
  // 라이트 전용
  cardShadow:'0 1px 3px rgba(0,0,0,0.06)',
  cardShadowHover:'0 4px 12px rgba(0,0,0,0.08)',
  inputBg:'#FFFFFF',
  inputBorder:'#D0D0D0',
  divider:'#F0F0F0',
  tableHeaderBg:'#FAFAFA',
  tableStripeBg:'#FAFAFA',
  activeBg:'#F5F5F5',
  activeBorder:'#11111120',
  // 버튼 스타일
  btnPrimary:'#111111',      // 검정 배경 + 흰 글씨
  btnPrimaryText:'#FFFFFF',
  btnSecondary:'#FFFFFF',     // 흰 배경 + 검정 테두리
  btnSecondaryBorder:'#D0D0D0',
  btnSecondaryText:'#333333',
};

export default T;
export { L };
