/**
 * DIAH-7M Customization Catalog v1.0
 * 8대분류 → 24카테고리(A~X) → 268서비스
 * 확장 축: 수평(서비스추가), 수직(카테고리추가), 깊이(티어추가)
 */

const CATEGORIES = {
  // 매크로 경제
  A: { name: '거시경제 진단', group: 'macro', count: 15 },
  B: { name: '통화·금리 분석', group: 'macro', count: 12 },
  C: { name: '재정·세수 분석', group: 'macro', count: 10 },
  // 산업
  D: { name: '제조업 분석', group: 'industry', count: 14 },
  E: { name: '서비스업 분석', group: 'industry', count: 12 },
  F: { name: '건설·부동산', group: 'industry', count: 11 },
  // 공급망
  G: { name: '무역·물류', group: 'supply_chain', count: 13 },
  H: { name: '에너지·원자재', group: 'supply_chain', count: 12 },
  I: { name: '반도체·테크 공급망', group: 'supply_chain', count: 10 },
  // 리스크
  J: { name: '금융 리스크', group: 'risk', count: 14 },
  K: { name: '지정학 리스크', group: 'risk', count: 10 },
  L: { name: '기후·환경 리스크', group: 'risk', count: 11 },
  // 인프라
  M: { name: '교통·물류 인프라', group: 'infra', count: 10 },
  N: { name: '디지털·통신 인프라', group: 'infra', count: 9 },
  O: { name: '에너지 인프라', group: 'infra', count: 10 },
  // 소비
  P: { name: '소비·유통', group: 'consumer', count: 12 },
  Q: { name: '관광·여행', group: 'consumer', count: 10 },
  R: { name: '인구·노동', group: 'consumer', count: 11 },
  // 특수
  S: { name: '위성 전용 분석', group: 'special', count: 13 },
  T: { name: '교차검증 패키지', group: 'special', count: 10 },
  U: { name: '시나리오 분석', group: 'special', count: 9 },
  // 플랫폼
  V: { name: 'API·데이터 피드', group: 'platform', count: 11 },
  W: { name: '알림·모니터링', group: 'platform', count: 10 },
  X: { name: '커스텀 보고서', group: 'platform', count: 9 },
};

// 서비스 생성기 (268개)
function generateServices() {
  const services = [];
  let id = 1;

  // A: 거시경제 진단
  const macroServices = [
    'GDP 성장률 추세', 'GDP 구성요소 분해', '경기선행지수 분석', '경기동행지수 분석', '경기후행지수 분석',
    '잠재성장률 추정', '산출갭 분석', '경기순환 위치 판단', '글로벌 동조화 분석', '주요국 비교 진단',
    'IMF 전망 대비 실측', '분기 GDP 나우캐스트', '경기 전환점 감지', '구매력평가 비교', '경제자유도 추적',
  ];
  macroServices.forEach(name => services.push({ id: id++, category: 'A', name, instant: true, tier_min: 'standard', source_type: 'traditional', gauges: ['gS3','gS6'] }));

  // B: 통화·금리
  const monetaryServices = [
    '기준금리 영향 분석', 'M2 유동성 추세', '통화승수 변화', '환율 변동 진단', '외환보유고 적정성',
    '국채 수익률 곡선', '금리스프레드 분석', '실질금리 추적', '통화정책 방향성', '글로벌 금리차 비교',
    'CDS 프리미엄 추적', '외국인 채권투자 흐름',
  ];
  monetaryServices.forEach(name => services.push({ id: id++, category: 'B', name, instant: true, tier_min: 'standard', source_type: 'traditional', gauges: ['gI1','gI5','gI6'] }));

  // C: 재정·세수
  const fiscalServices = [
    '세수 실적 추적', '재정수지 분석', '국가채무 비율', '재정건전성 평가', '세수 탄력성',
    '복지지출 추세', '재정승수 추정', '국가신용등급 추적', '지자체 재정자립도', 'SOC 투자 추이',
  ];
  fiscalServices.forEach(name => services.push({ id: id++, category: 'C', name, instant: true, tier_min: 'standard', source_type: 'traditional', gauges: ['gP3','gP4','gP5'] }));

  // D: 제조업
  const mfgServices = [
    '산업생산지수 분석', '제조업 가동률', '제조업PMI 분석', '재고율 변화', '신규주문 동향',
    '출하·재고 비율', '설비투자 추세', '첨단산업 생산', '반도체 생산지수', '자동차 생산추적',
    '조선 수주 추적', '철강 생산량', '석유화학 가동', '방산 수출 추적',
  ];
  mfgServices.forEach(name => services.push({ id: id++, category: 'D', name, instant: true, tier_min: 'standard', source_type: 'traditional', gauges: ['gO1','gO2','gM1'] }));

  // E: 서비스업
  const svcServices = [
    '서비스업 생산지수', '도소매 판매', 'IT 서비스 성장', '금융업 성장', '의료·보건 성장',
    '교육 서비스', '숙박·음식 업종', '운수·창고', '부동산 서비스', '전문·과학 서비스',
    '정보통신', '예술·스포츠',
  ];
  svcServices.forEach(name => services.push({ id: id++, category: 'E', name, instant: true, tier_min: 'standard', source_type: 'traditional', gauges: ['gO5','gC6'] }));

  // F: 건설·부동산
  const constServices = [
    '건설기성 추적', '주택가격 동향', '미분양 현황', '건설수주 추세', '토지거래 동향',
    '전세가격 변동', '건축허가 추이', '재건축·재개발', '상업용부동산', '공공주택 공급',
    '건설자재 가격',
  ];
  constServices.forEach(name => services.push({ id: id++, category: 'F', name, instant: true, tier_min: 'standard', source_type: 'traditional', gauges: ['gR1','gR2','gO3'] }));

  // G: 무역·물류
  const tradeServices = [
    '수출입 동향', '무역수지 분석', '품목별 수출', '국가별 수출', '컨테이너 물동량',
    '항만 처리량 (위성)', '선박 AIS 추적 (위성)', '항공화물 추적', '물류비 지수', '글로벌 공급망 압력',
    '관세 영향 분석', '원산지 규칙', 'FTA 활용률',
  ];
  tradeServices.forEach(name => {
    const isSat = name.includes('위성');
    services.push({ id: id++, category: 'G', name, instant: !isSat, tier_min: isSat ? 'professional' : 'standard', source_type: isSat ? 'satellite' : 'traditional', gauges: ['gE1','gE2','gE4'] });
  });

  // H~X: 나머지 카테고리 (간결하게)
  const remaining = {
    H: ['원유가격 추적','천연가스 가격','석탄 가격','구리 가격','리튬 가격','철광석 가격','희토류 추적','전력 수급','신재생에너지 비중','탄소배출권 가격','에너지 안보지수','원자재 종합지수'],
    I: ['반도체 재고 (위성)','DRAM 가격','NAND 가격','파운드리 가동률 (위성)','반도체 장비 투자','테크 IPO 동향','AI 칩 수요','디스플레이 패널','배터리 셀 가격','EV 배터리 공급망'],
    J: ['주식시장 변동성','신용스프레드','부도율 추적','가계부채 리스크','기업부채 리스크','그림자금융','은행 건전성','보험사 지급여력','연기금 수익률','PF 리스크','레버리지 추적','유동성 리스크','시스템 리스크','외환위기 지표'],
    K: ['지정학 리스크지수','제재 영향 분석','무역분쟁 추적','대만해협 긴장','중동 리스크','러시아·우크라이나','북한 리스크','남중국해','공급망 재편','동맹관계 변화'],
    L: ['탄소배출 추적','대기질 (위성)','산림 변화 (위성)','해수면 변화','도시열섬 (위성)','수질 오염','자연재해 빈도','기후 적응 투자','ESG 점수','그린본드','폐기물 관리'],
    M: ['도로교통량','철도 이용','항만 효율','공항 처리량','물류 인프라 투자','교통 혼잡도','신도시 개발','도시철도 확장','고속도로 건설','물류센터 분포'],
    N: ['5G 커버리지','데이터센터 (위성)','클라우드 투자','사이버보안','디지털 전환지수','전자정부','핀테크 성장','AI 투자','IoT 보급률'],
    O: ['발전소 가동률 (위성)','전력 예비율','태양광 설비','풍력 설비','원전 가동','수소 인프라','에너지 저장','송배전망','에너지 효율','탄소중립 진도'],
    P: ['소매판매 추적','온라인쇼핑','대형마트 매출','편의점 매출','소비자심리','카드매출','소비패턴 변화','명품 소비','필수재 소비','할인점 매출','배달 시장','구독경제'],
    Q: ['인바운드 관광','아웃바운드 관광','호텔 점유율','항공 예약','크루즈 입항','관광 수입','MICE 산업','의료관광','한류 효과','면세점 매출'],
    R: ['고용률','실업률','청년실업','임금 상승률','비정규직 비율','노동시간','구인배율','인구 증감','출생률','고령화율','이민 추세'],
    S: ['야간광 도시활력 (위성)','NO₂ 산업활동 (위성)','열적외선 생산활동 (위성)','SAR 재고변화 (위성)','광학 건설진행 (위성)','해수면 (위성)','산림벌채 (위성)','빙하변화 (위성)','대기오염 (위성)','도시확장 (위성)','농작물 (위성)','수위변화 (위성)','선박밀도 (위성)'],
    T: ['L2↔L4 교차검증','섹터↔국가 비교','위성↔전통 비교','수출↔내수 비교','고용↔생산 비교','금리↔물가 비교','환율↔무역 비교','부동산↔금융 비교','소비↔생산 비교','투자↔저축 비교'],
    U: ['금리인상 시나리오','환율급등 시나리오','원유폭등 시나리오','부동산하락 시나리오','무역전쟁 시나리오','팬데믹 시나리오','금융위기 시나리오','스태그플레이션','디플레이션'],
    V: ['실시간 게이지 API','위성 데이터 API','보고서 API','알림 API','차트 위젯','대시보드 임베드','데이터 다운로드','CSV 내보내기','PDF 자동생성','연간 데이터셋','벌크 다운로드'],
    W: ['이중봉쇄 알림','severity 급변 알림','위성 괴리 알림','게이지 임계값 알림','주간 다이제스트','월간 리포트','종목 알림','섹터 알림','글로벌 알림','커스텀 트리거'],
    X: ['맞춤 국가 보고서','맞춤 산업 보고서','맞춤 종목 보고서','맞춤 지역 보고서','경영진 브리핑','이사회 보고서','투자위원회 보고서','리서치 노트','백서'],
  };

  for (const [cat, names] of Object.entries(remaining)) {
    names.forEach(name => {
      const isSat = name.includes('위성');
      services.push({
        id: id++, category: cat, name,
        instant: !isSat || cat === 'S',
        tier_min: isSat ? 'professional' : 'standard',
        source_type: isSat ? 'satellite' : (cat === 'V' || cat === 'W' ? 'platform' : 'traditional'),
        gauges: [],
      });
    });
  }

  return services;
}

const CATALOG = generateServices();
const GROUPS = { macro: ['A','B','C'], industry: ['D','E','F'], supply_chain: ['G','H','I'], risk: ['J','K','L'], infra: ['M','N','O'], consumer: ['P','Q','R'], special: ['S','T','U'], platform: ['V','W','X'] };

function search(query) {
  const q = query.toLowerCase();
  return CATALOG.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
}

function getByCategory(cat) { return CATALOG.filter(s => s.category === cat); }
function getByGroup(group) { const cats = GROUPS[group] || []; return CATALOG.filter(s => cats.includes(s.category)); }
function getInstant() { return CATALOG.filter(s => s.instant); }
function getReserved() { return CATALOG.filter(s => !s.instant); }

module.exports = { CATALOG, CATEGORIES, GROUPS, search, getByCategory, getByGroup, getInstant, getReserved, total: CATALOG.length };
