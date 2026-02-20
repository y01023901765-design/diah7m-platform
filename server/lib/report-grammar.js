/**
 * DIAH-7M 3-Layer 보고서 문법 규격 (v2.0)
 * ═══════════════════════════════════════════
 * "유기체는 장기마다 말이 달라지면 유기체가 아니다.
 *  같은 생리 언어로 모든 장기가 보고해야 유기체다."
 * 
 * 이 파일이 보고서 렌더러의 유일한 스키마입니다.
 * 59개 게이지 전부 이 구조를 반복합니다.
 */

// ═══ 게이지 코드 체계 (v2: 충돌 해결 완료) ═══
const CODE_MAP = {
  // 축(Axis) 코드: A1~A9 (9개) — 절대 게이지로 쓰지 않음
  // 게이지(Gauge) 코드: 접두사+번호 (59개)
  
  A1: { axis: '순환계',    prefixes: ['I'],    count: 6,  gauges: 'I1~I6' },
  A2: { axis: '호흡계',    prefixes: ['E'],    count: 6,  gauges: 'E1~E6' },
  A3: { axis: '소화계',    prefixes: ['C'],    count: 6,  gauges: 'C1~C6' },
  A4: { axis: '신경계',    prefixes: ['S'],    count: 6,  gauges: 'S1~S6' },
  A5: { axis: '면역계',    prefixes: ['F'],    count: 7,  gauges: 'F1~F7' },
  A6: { axis: '내분비계',  prefixes: ['P'],    count: 6,  gauges: 'P1~P6' },
  A7: { axis: '근골격계',  prefixes: ['M','O'], count: 9, gauges: 'M1~M3, O1~O6' },
  A8: { axis: '인구/취약', prefixes: ['D','L'], count: 7, gauges: 'D1~D3, L1~L4' },
  A9: { axis: '재생/대외', prefixes: ['R','G'], count: 6, gauges: 'R1,R2,R5,R6,G1,G6' },
  // 총합: 6+6+6+6+7+6+9+7+6 = 59 ✓
};

// ═══ 3-LAYER 문법 (각 게이지가 반드시 가져야 하는 키) ═══

/**
 * LAYER 1: 현상/실측 — "지금 이 장기의 상태는?"
 * 렌더러가 게이지 카드 상단에 표시
 */
const LAYER_1_SCHEMA = {
  code:     '',   // string: 게이지 코드 (예: I1, E3, D1, M2)
  name:     '',   // string: 한글명 (예: '기준금리', '합계출산율')
  value:    0,    // number: 현재 값
  unit:     '',   // string: 단위 (%, 억$, pt, 조원, 호, ㎍/m³ 등)
  period:   '',   // string: 기준 시점 (예: '2026-01')
  source:   '',   // string: 출처 (예: 'ECOS', 'KOSIS', 'NASA VIIRS')
  prev:     0,    // number: 이전 기간 값
  change:   '',   // string: 변화량/변화율 (예: '+33.9%', '-21.5억$', '동결')
  trend:    '',   // string: 'up' | 'down' | 'flat' | 'volatile'
  status:   '',   // string: 'ok' | '주기대기' | '결측'
  grade:    '',   // string: '양호' | '주의' | '경보'
  severity: 0,    // number: 0~1 (엔진 정규화 값)
};

/**
 * LAYER 2: 사각지대 — "기존 분석이 못 보는 것 3개"
 * 렌더러가 "🔭 사각지대" 섹션에 표시
 */
const LAYER_2_SCHEMA = {
  blindSpot: {
    diah:   '',   // string: DIAH-7M만 제공하는 인사이트
    others: [     // array[3]: 기존 분석 3곳의 한계
      { source: '', gap: '' },  // 기관1: 못 보는 것
      { source: '', gap: '' },  // 기관2: 못 보는 것
      { source: '', gap: '' },  // 기관3: 못 보는 것 (없으면 빈 문자열)
    ],
  },
  metaphor: {
    bodyPart: '',  // string: 인체 비유 대상 (예: '혈압', '폐활량')
    explain:  '',  // string: 비유 설명 (예: '심장이 뿜어내는 혈압...')
  },
};

/**
 * LAYER 3: 행동 — "그래서 어떻게 해야 하는가?"
 * 렌더러가 "🎯 행동 시그널" 섹션에 표시
 * ※ "투자 조언"이 아니라 "신호 변화"로 표현 (법적 방어)
 */
const LAYER_3_SCHEMA = {
  actionSignals: {
    investorActions: [  // array[3]: 시나리오별 투자 시그널
      {
        signal: '',     // string: 시그널 조건 (예: '🟢 동결 지속')
        action: '',     // string: 행동 가이드 (예: '채권 비중 유지')
        tag:    '',     // string: 10종 태그 중 1개
      },
      // ... 3개 고정
    ],
    policyNote: '',     // string: 정책 트리거 (예: '기준금리 인하 시 부동산 규제 완화')
    lifeGuide:  '',     // string: 생활 가이드 (예: '변동금리 대출자 고정금리 전환 검토')
  },
};

// ═══ 투자 시그널 태그 체계 (10종 고정) ═══
const SIGNAL_TAGS = [
  '유지',         // 현 포지션 유지
  '매수 고려',    // 진입 검토
  '비중 확대',    // 기존 포지션 강화
  '차익 실현',    // 부분 이익 확정
  '비중 축소',    // 리스크 감축
  '점검',         // 모니터링 강화
  '리스크 회피',  // 위험 자산 축소
  '방어 전환',    // 안전자산 이동
  '섹터 전환',    // 업종 교체
  '테마 주목',    // 신규 기회
];

// ═══ 등급 체계 (엔진 severity → 3단계) ═══
const GRADE_MAP = {
  '양호': { range: [0.0, 0.40], color: '#22c55e', emoji: '🟢' },
  '주의': { range: [0.40, 0.70], color: '#eab308', emoji: '🟡' },
  '경보': { range: [0.70, 1.00], color: '#ef4444', emoji: '🔴' },
};

// ═══ 알림 규칙 (Layer 3 확장 — 서버 배포 후 활성화) ═══
const ALERT_RULES = [
  { gauge: 'S2', condition: '3개월 연속 하락',   priority: 'critical', message: '야간광 기반 경기침체 조기경보' },
  { gauge: 'I4', condition: '1,500원 돌파',      priority: 'critical', message: '통화위기 경보' },
  { gauge: 'E1', condition: '3개월 연속 하락',   priority: 'high',     message: '수출 호흡곤란' },
  { gauge: 'F3', condition: '-20% 고점 대비',    priority: 'high',     message: 'KOSPI 약세장 진입' },
  { gauge: 'D1', condition: '0.6 이하',          priority: 'critical', message: '인구소멸 경보' },
  { gauge: 'P1', condition: '4% 초과',           priority: 'high',     message: '인플레이션 비상' },
  { gauge: 'L3', condition: '2,000조원 돌파',    priority: 'critical', message: '가계부채 레드라인' },
  { gauge: 'R2', condition: '80,000호 초과',     priority: 'high',     message: '미분양 위기' },
  { gauge: 'F4', condition: 'V-KOSPI 35 초과',   priority: 'high',     message: '시장 공포 지수 경보' },
  { gauge: 'M1', condition: '65% 하회',          priority: 'high',     message: '제조업 가동률 경보' },
];

// ═══ 렌더러 출력 형태 (한 줄 요약) ═══
// 상단: 9축 건강도 + "59개 가동 중" 진실값
// 중단: 축 카드(클릭/펼침)
// 하단: 축 안에서 게이지 6~9개가 동일한 3-Layer로 반복 출력
// → 보고서 자체가 "순환 고리"

module.exports = {
  CODE_MAP,
  LAYER_1_SCHEMA,
  LAYER_2_SCHEMA,
  LAYER_3_SCHEMA,
  SIGNAL_TAGS,
  GRADE_MAP,
  ALERT_RULES,
};
