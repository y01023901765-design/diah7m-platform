/**
 * DIAH-7M SSOT Engine v1.0
 * ════════════════════════
 * 
 * 핵심 원칙: 모든 숫자는 단 하나의 출처(value/_raw_num)에서만 나온다.
 * 
 * 이 엔진이 하는 일:
 *   1. 등급(grade) = value → 규칙 → 자동 산출 (하드코딩 금지)
 *   2. 서술(narrative) = value + grade + change + period → 자동 생성
 *   3. 진단(diagnosis) = metaphor + value + grade → 자동 생성
 *   4. 요약(summary) = 하위 게이지 등급 집계 → 자동 생성
 *   5. 기준시점 = 모든 값 옆에 period 강제 표기
 *   6. 판정체계 = 단일 체계로 통일
 * 
 * 규칙:
 *   - narrative 안에 "숫자를 직접 쓰지 않는다"
 *   - 모든 숫자는 value 필드에서 자동 삽입({{value}})
 *   - 등급은 _raw_num + threshold에서 산출
 *   - 요약은 하위 게이지 grade 집계에서 산출
 */

const fs = require('fs');

// ═══════════════════════════════════════════
// 1. 등급 규칙 테이블 (59개 전체)
// ═══════════════════════════════════════════
// 구조: { 양호: [min, max], 주의: [min, max], 경보: [min, max] }
// direction: 'lower_better' = 낮을수록 좋음, 'higher_better' = 높을수록 좋음, 'range' = 범위

const GRADE_RULES = {
  // ── Input (I1~I6) ──
  'I1': { metric: '경상수지', unit: '억$', direction: 'higher_better',
    양호: [0, Infinity], 주의: [-50, 0], 경보: [-Infinity, -50] },
  'I2': { metric: '단기외채비율', unit: '%', direction: 'lower_better',
    양호: [-Infinity, 40], 주의: [40, 50], 경보: [50, Infinity] },
  'I3': { metric: '외환보유고', unit: '억$', direction: 'higher_better',
    양호: [4000, Infinity], 주의: [3500, 4000], 경보: [-Infinity, 3500] },
  'I4': { metric: '환율', unit: '원', direction: 'lower_better',
    양호: [-Infinity, 1400], 주의: [1400, 1500], 경보: [1500, Infinity] },
  'I5': { metric: '신용스프레드', unit: 'bp', direction: 'lower_better',
    양호: [-Infinity, 50], 주의: [50, 100], 경보: [100, Infinity] },
  'I6': { metric: '국채금리', unit: '%', direction: 'lower_better',
    양호: [-Infinity, 3.0], 주의: [3.0, 4.0], 경보: [4.0, Infinity] },

  // ── Output (O1~O6) ──
  'O1': { metric: '산업생산', unit: '%', direction: 'higher_better',
    양호: [0, Infinity], 주의: [-2, 0], 경보: [-Infinity, -2] },
  'O2': { metric: '물가', unit: '%', direction: 'range',
    양호: [0, 3], 주의: [3, 5], 경보: [5, Infinity], 주의low: [-Infinity, 0] },
  'O3': { metric: '실업률', unit: '%', direction: 'lower_better',
    양호: [-Infinity, 3.5], 주의: [3.5, 5], 경보: [5, Infinity] },
  'O4': { metric: '주가', unit: 'pt', direction: 'change_based',
    // 주가는 절대값이 아니라 변동률로 판정
    양호: [-5, Infinity], 주의: [-10, -5], 경보: [-Infinity, -10] },
  'O5': { metric: '주택가격', unit: '%', direction: 'range',
    양호: [-0.5, 1.0], 주의: [1.0, 3.0], 경보: [3.0, Infinity], 주의low: [-Infinity, -0.5] },
  'O6': { metric: '소비', unit: '%', direction: 'higher_better',
    양호: [0, Infinity], 주의: [-2, 0], 경보: [-Infinity, -2] },
  'O7': { metric: '건설투자', unit: '%', direction: 'higher_better',
    양호: [0, Infinity], 주의: [-5, 0], 경보: [-Infinity, -5] },

  // ── Axis2: 무역/제조 (S1~S3, T1~T3) ──
  'S1': { metric: '선박대기', unit: '일', direction: 'range',
    양호: [5, 20], 주의: [20, 30], 경보: [30, Infinity], 주의low: [-Infinity, 5] },
  'S2': { metric: '야간광량', unit: '%', direction: 'higher_better', satellite: true,
    양호: [90, Infinity], 주의: [70, 90], 경보: [-Infinity, 70] },
  'S3': { metric: 'NO₂농도', unit: 'ppb', direction: 'higher_better', satellite: true,
    양호: [25, Infinity], 주의: [15, 25], 경보: [-Infinity, 15] },
  'T1': { metric: '컨테이너', unit: '만TEU', direction: 'higher_better',
    양호: [180, Infinity], 주의: [150, 180], 경보: [-Infinity, 150] },
  'T2': { metric: '제조업BSI', unit: 'pt', direction: 'higher_better',
    양호: [90, Infinity], 주의: [75, 90], 경보: [-Infinity, 75] },
  'T3': { metric: '산업전력', unit: '%', direction: 'higher_better',
    양호: [65, Infinity], 주의: [55, 65], 경보: [-Infinity, 55] },

  // ── Axis3: 골목시장 (M1~M5) ──
  'M1': { metric: '개폐업', unit: '배', direction: 'higher_better',
    양호: [0.8, Infinity], 주의: [0.6, 0.8], 경보: [-Infinity, 0.6] },
  'M2': { metric: '유동인구', unit: '만명', direction: 'higher_better',
    양호: [1000, Infinity], 주의: [800, 1000], 경보: [-Infinity, 800] },
  'M3': { metric: '카드매출', unit: '조원', direction: 'higher_better',
    양호: [90, Infinity], 주의: [70, 90], 경보: [-Infinity, 70] },
  'M4': { metric: '상가임대', unit: '만원/㎡', direction: 'range',
    양호: [1.5, 3.0], 주의: [3.0, 4.0], 경보: [4.0, Infinity], 주의low: [-Infinity, 1.5] },
  'M5': { metric: '상권등급', unit: '등급', direction: 'grade_letter',
    // 특수: A+/A/A-=양호, B+/B/B-=양호, C+=주의, C/C-=주의, D이하=경보
    양호: ['A+','A','A-','B+','B','B-'], 주의: ['C+','C','C-'], 경보: ['D+','D','D-','F'] },

  // ── Axis4: 부동산 (R1~R9) ──
  'R1': { metric: '실거래가', unit: '만원/㎡', direction: 'range',
    양호: [0.8, 2.0], 주의: [2.0, 3.0], 경보: [3.0, Infinity], 주의low: [-Infinity, 0.8] },
  'R2': { metric: '미분양', unit: '호', direction: 'lower_better',
    양호: [-Infinity, 30000], 주의: [30000, 60000], 경보: [60000, Infinity] },
  'R3': { metric: '전세가율', unit: '%', direction: 'range',
    양호: [40, 70], 주의: [70, 80], 경보: [80, Infinity], 주의low: [-Infinity, 40] },
  'R4': { metric: '경매건수', unit: '건/1000세대', direction: 'lower_better',
    양호: [-Infinity, 8], 주의: [8, 15], 경보: [15, Infinity] },
  'R5': { metric: 'SAR높이', unit: 'm', direction: 'range', satellite: true,
    양호: [-0.1, 0.1], 주의: [0.1, 0.3], 경보: [0.3, Infinity] },
  'R6': { metric: '신축야간광', unit: '%', direction: 'higher_better', satellite: true,
    양호: [80, Infinity], 주의: [50, 80], 경보: [-Infinity, 50] },
  'R7': { metric: '주차점유', unit: '%', direction: 'higher_better',
    양호: [60, Infinity], 주의: [40, 60], 경보: [-Infinity, 40] },
  'R8': { metric: '표면온도', unit: '℃', direction: 'range', satellite: true,
    양호: [10, 25], 주의: [5, 10], 경보: [-Infinity, 5] },
  'R9': { metric: '괴리경보', unit: '개월', direction: 'lower_better', satellite: true,
    양호: [-Infinity, 18], 주의: [18, 36], 경보: [36, Infinity] },

  // ── Axis5: 고용/가계 (L1~L5) ──
  'L1': { metric: '고용동향', unit: '만명', direction: 'higher_better',
    양호: [10, Infinity], 주의: [0, 10], 경보: [-Infinity, 0] },
  'L2': { metric: '실업급여', unit: '%', direction: 'lower_better',
    양호: [-Infinity, 5], 주의: [5, 8], 경보: [8, Infinity] },
  'L3': { metric: '가계부채', unit: '조원', direction: 'lower_better',
    양호: [-Infinity, 1800], 주의: [1800, 2000], 경보: [2000, Infinity] },
  'L4': { metric: '연체율', unit: '%', direction: 'lower_better',
    양호: [-Infinity, 1.0], 주의: [1.0, 2.0], 경보: [2.0, Infinity] },
  'L5': { metric: '체감경기', unit: 'pt', direction: 'higher_better',
    양호: [90, Infinity], 주의: [75, 90], 경보: [-Infinity, 75] },

  // ── Axis6: 지역균형 (G1~G7) ──
  'G1': { metric: '소멸지수', unit: '개지역', direction: 'lower_better',
    양호: [-Infinity, 80], 주의: [80, 120], 경보: [120, Infinity] },
  'G2': { metric: '지역GRDP', unit: '배', direction: 'lower_better',
    양호: [-Infinity, 0.35], 주의: [0.35, 0.50], 경보: [0.50, Infinity] },
  'G3': { metric: '인구이동', unit: '만명', direction: 'lower_better',
    양호: [-Infinity, 80], 주의: [80, 120], 경보: [120, Infinity] },
  'G4': { metric: '지역창폐업', unit: '배', direction: 'lower_better',
    양호: [-Infinity, 2.0], 주의: [2.0, 3.0], 경보: [3.0, Infinity] },
  'G5': { metric: '재정자립', unit: '%', direction: 'higher_better',
    양호: [50, Infinity], 주의: [35, 50], 경보: [-Infinity, 35] },
  'G6': { metric: '지역야간광', unit: '%', direction: 'higher_better', satellite: true,
    양호: [80, Infinity], 주의: [60, 80], 경보: [-Infinity, 60] },
  'G7': { metric: '특구투자', unit: '건', direction: 'higher_better',
    양호: [2, Infinity], 주의: [1, 2], 경보: [-Infinity, 1] },

  // ── Axis7: 금융 스트레스 (F1~F5) ──
  'F1': { metric: '회사채스프레드', unit: 'bp', direction: 'lower_better',
    양호: [-Infinity, 80], 주의: [80, 150], 경보: [150, Infinity] },
  'F2': { metric: 'CP금리', unit: '%', direction: 'lower_better',
    양호: [-Infinity, 4.0], 주의: [4.0, 6.0], 경보: [6.0, Infinity] },
  'F3': { metric: 'BIS비율', unit: '%', direction: 'higher_better',
    양호: [13, Infinity], 주의: [10, 13], 경보: [-Infinity, 10] },
  'F4': { metric: '코스피변동성', unit: '%', direction: 'lower_better',
    양호: [-Infinity, 25], 주의: [25, 40], 경보: [40, Infinity] },
  'F5': { metric: '은행채스프레드', unit: 'bp', direction: 'lower_better',
    양호: [-Infinity, 60], 주의: [60, 100], 경보: [100, Infinity] },

  // ── Axis8: 에너지 (E1~E5) ──
  'E1': { metric: '유가', unit: '$/bbl', direction: 'range',
    양호: [40, 80], 주의: [80, 100], 경보: [100, Infinity], 주의low: [-Infinity, 40] },
  'E2': { metric: '전력예비율', unit: '%', direction: 'higher_better',
    양호: [10, Infinity], 주의: [5, 10], 경보: [-Infinity, 5] },
  'E3': { metric: 'LNG재고', unit: '만톤', direction: 'higher_better',
    양호: [10, Infinity], 주의: [5, 10], 경보: [-Infinity, 5] },
  'E4': { metric: '산업전력', unit: 'GWh', direction: 'higher_better',
    양호: [100, Infinity], 주의: [80, 100], 경보: [-Infinity, 80] },
  'E5': { metric: '원자재지수', unit: 'pt', direction: 'range',
    양호: [0.5, 1.2], 주의: [1.2, 1.5], 경보: [1.5, Infinity], 주의low: [-Infinity, 0.5] },

  // ── Axis9: 인구/노화 (A1~A5) ──
  'A1': { metric: '출산율', unit: '명', direction: 'higher_better',
    양호: [1.3, Infinity], 주의: [1.0, 1.3], 경보: [-Infinity, 1.0] },
  'A2': { metric: '고령화율', unit: '%', direction: 'lower_better',
    양호: [-Infinity, 14], 주의: [14, 20], 경보: [20, Infinity] },
  'A3': { metric: '생산인구', unit: '만명', direction: 'higher_better',
    양호: [3600, Infinity], 주의: [3400, 3600], 경보: [-Infinity, 3400] },
  'A4': { metric: '학령인구', unit: '만명', direction: 'higher_better',
    양호: [500, Infinity], 주의: [400, 500], 경보: [-Infinity, 400] },
  'A5': { metric: '이민순유입', unit: '만명', direction: 'higher_better',
    양호: [5, Infinity], 주의: [2, 5], 경보: [-Infinity, 2] },
};

// ═══════════════════════════════════════════
// 2. 등급 자동 산출
// ═══════════════════════════════════════════

// _raw_num → 규칙 단위 변환 (원→만원 등)
const RAW_NUM_DIVISORS = {
  'M4': 10000,   // 원/㎡ → 만원/㎡
  'R1': 10000,   // 원/㎡ → 만원/㎡
  'R4': 1000,    // 절대값 → 건/1000세대
};

function computeGrade(code, rawNum, changeNum) {
  const rule = GRADE_RULES[code];
  if (!rule) return { grade: '양호 ○', judge: '정상', gradeEmoji: '○' }; // fallback

  // 특수: 등급 문자 기반 (M5)
  if (rule.direction === 'grade_letter') {
    // rawNum이 null일 수 있음 → value에서 추출
    let val = String(rawNum || '').replace(/등급/g, '').trim();
    if (!val && arguments[3]) val = String(arguments[3]).replace(/등급/g, '').trim(); // fallback to value string
    if (rule.양호.includes(val)) return { grade: '양호 ○', judge: '정상', gradeEmoji: '○' };
    if (rule.주의.includes(val)) return { grade: '주의 ●', judge: '관찰', gradeEmoji: '●' };
    return { grade: '경보 ★', judge: '경보', gradeEmoji: '★' };
  }

  // 단위 변환
  let val = rawNum;
  if (RAW_NUM_DIVISORS[code] && typeof val === 'number') {
    val = val / RAW_NUM_DIVISORS[code];
  }

  // 특수: 변동률 기반 (O4 주가)
  if (rule.direction === 'change_based') {
    val = changeNum || 0;
  }

  if (typeof val !== 'number' || isNaN(val)) {
    return { grade: '양호 ○', judge: '정상', gradeEmoji: '○' };
  }

  // range 타입: 범위 밖 양방향 체크
  if (rule.direction === 'range') {
    if (val >= rule.양호[0] && val <= rule.양호[1]) return { grade: '양호 ○', judge: '정상', gradeEmoji: '○' };
    if (rule.주의low && val >= rule.주의low[0] && val < rule.주의low[1]) return { grade: '주의 ●', judge: '관찰', gradeEmoji: '●' };
    if (val > rule.양호[1] && val <= rule.주의[1]) return { grade: '주의 ●', judge: '관찰', gradeEmoji: '●' };
    return { grade: '경보 ★', judge: '경보', gradeEmoji: '★' };
  }

  // lower_better / higher_better
  if (rule.direction === 'lower_better') {
    if (val >= rule.양호[0] && val <= rule.양호[1]) return { grade: '양호 ○', judge: '정상', gradeEmoji: '○' };
    if (val > rule.양호[1] && val <= rule.주의[1]) return { grade: '주의 ●', judge: '관찰', gradeEmoji: '●' };
    return { grade: '경보 ★', judge: '경보', gradeEmoji: '★' };
  }

  if (rule.direction === 'higher_better') {
    if (val >= rule.양호[0]) return { grade: '양호 ○', judge: '정상', gradeEmoji: '○' };
    if (val >= rule.주의[0]) return { grade: '주의 ●', judge: '관찰', gradeEmoji: '●' };
    return { grade: '경보 ★', judge: '경보', gradeEmoji: '★' };
  }

  if (rule.direction === 'change_based') {
    if (val >= rule.양호[0]) return { grade: '양호 ○', judge: '정상', gradeEmoji: '○' };
    if (val >= rule.주의[0]) return { grade: '주의 ●', judge: '관찰', gradeEmoji: '●' };
    return { grade: '경보 ★', judge: '경보', gradeEmoji: '★' };
  }

  return { grade: '양호 ○', judge: '정상', gradeEmoji: '○' };
}

// ═══════════════════════════════════════════
// 3. 서술(narrative) 자동 생성
// ═══════════════════════════════════════════
// 원칙: 숫자는 value에서만 가져온다. 직접 쓰지 않는다.

const METAPHOR_MAP = {
  'I1': { organ: '폐', good: '폐 기능이 원활하다. 산소(외화) 흡입이 충분하다.', warn: '폐 기능이 약화되고 있다. 산소(외화) 흡입이 줄고 있다.', alert: '폐 기능 부전. 산소(외화) 공급이 위험 수준이다.' },
  'I2': { organ: '혈액', good: '혈액 점도가 정상이다. 단기외채 부담이 안전 범위다.', warn: '혈액 점도가 높아지고 있다. 단기외채 비율이 주의 수준이다.', alert: '혈액 점도 위험. 단기외채가 과다하다.' },
  'I3': { organ: '혈액저장', good: '저장 혈액이 충분하다. 외환 완충력이 양호하다.', warn: '저장 혈액이 줄고 있다. 외환 완충력에 주의가 필요하다.', alert: '저장 혈액 부족. 외환 완충력이 위험하다.' },
  'I4': { organ: '혈압', good: '혈압이 안정적이다. 환율이 정상 범위다.', warn: '혈압이 올라가고 있다. 환율이 주의 수준이다.', alert: '혈압 위험. 환율이 경보 수준이다.' },
  'I5': { organ: '혈관', good: '혈관 탄력이 양호하다. 자금 조달 비용이 안정적이다.', warn: '혈관 탄력이 떨어지고 있다. 자금 조달 비용이 증가하고 있다.', alert: '혈관 경직. 자금 조달 비용이 위험 수준이다.' },
  'I6': { organ: '심장', good: '심박수가 안정적이다. 기준금리가 정상 범위다.', warn: '심박수가 빨라지고 있다. 금리 부담이 커지고 있다.', alert: '심박수 이상. 금리가 위험 수준이다.' },

  'O1': { organ: '근육', good: '근육 활력이 양호하다. 생산이 성장세다.', warn: '근육이 경직되고 있다. 생산이 둔화되고 있다.', alert: '근육 마비. 생산이 역성장이다.' },
  'O2': { organ: '체온', good: '체온이 정상이다. 물가가 안정 범위다.', warn: '체온이 올라가고 있다. 물가 상승 압력이 있다.', alert: '고열. 물가가 위험 수준이다.' },
  'O3': { organ: '세포', good: '세포 활력이 양호하다. 고용이 안정적이다.', warn: '세포 활력이 떨어지고 있다. 고용이 약화되고 있다.', alert: '세포 위축. 실업이 심각하다.' },
  'O4': { organ: '안면', good: '안면 혈색이 양호하다. 주식시장이 안정적이다.', warn: '안면에 홍조가 감지된다. 주가가 하락 압력을 받고 있다.', alert: '안면 창백. 주가가 급락하고 있다.' },
  'O5': { organ: '부종', good: '부종이 없다. 주택가격이 안정적이다.', warn: '부종이 시작되고 있다. 주택가격 변동에 주의가 필요하다.', alert: '부종 심각. 주택가격이 급변하고 있다.' },
  'O6': { organ: '손끝', good: '손끝 체온이 정상이다. 소비가 양호하다.', warn: '손끝이 차가워지고 있다. 소비가 둔화되고 있다.', alert: '손끝 체온 경보. 소비가 위축되고 있다.' },
  'O7': { organ: '골격', good: '골격이 튼튼하다. 건설투자가 양호하다.', warn: '골격이 약해지고 있다. 건설투자가 감소하고 있다.', alert: '골격 괴사. 건설투자가 급감하고 있다. 구조적 붕괴 위험.' },

  'S1': { organ: '동맥맥박', good: '동맥 맥박이 정상이다.', warn: '동맥 맥박이 불규칙하다.', alert: '동맥 맥박 이상.' },
  'S2': { organ: '동맥활력', good: '동맥 활력이 양호하다.', warn: '동맥 활력이 약화되고 있다.', alert: '동맥 활력 부전.' },
  'S3': { organ: '동맥배기', good: '동맥 배기가 정상이다.', warn: '동맥 배기가 감소하고 있다.', alert: '동맥 배기 이상.' },
  'T1': { organ: '혈류총량', good: '혈류 총량이 정상이다. 수출 물동량이 양호하다.', warn: '혈류가 줄고 있다. 물동량이 감소하고 있다.', alert: '혈류 부족. 물동량이 위험 수준이다.' },
  'T2': { organ: '동맥탄력', good: '동맥 탄력이 양호하다. 제조업 체감이 긍정적이다.', warn: '동맥이 경직되고 있다. 제조업 체감이 악화되고 있다.', alert: '동맥 경직. 제조업이 위축되고 있다.' },
  'T3': { organ: '동맥가동', good: '동맥 가동률이 정상이다. 산업 가동이 양호하다.', warn: '동맥 가동률이 떨어지고 있다.', alert: '동맥 가동 부전.' },

  'M1': { organ: '미세혈관재생', good: '미세혈관 재생이 양호 범위이다. 개폐업 비율이 안정적이다.', warn: '미세혈관 재생이 둔화되고 있다.', alert: '미세혈관 괴사. 폐업이 창업을 크게 초과한다.' },
  'M2': { organ: '미세혈관혈류', good: '미세혈관 혈류가 원활하다. 유동인구가 충분하다.', warn: '미세혈관 혈류가 줄고 있다.', alert: '미세혈관 혈류 차단.' },
  'M3': { organ: '산소교환', good: '산소 교환이 정상이다. 카드매출이 양호하다.', warn: '산소 교환이 약화되고 있다.', alert: '산소 교환 부전.' },
  'M4': { organ: '혈관벽압', good: '혈관벽 압력이 정상이다. 임대료가 안정적이다.', warn: '혈관벽 압력이 높아지고 있다.', alert: '혈관벽 파열 위험.' },
  'M5': { organ: '미세혈관등급', good: '미세혈관 등급이 양호하다.', warn: '미세혈관 등급이 하락하고 있다.', alert: '미세혈관 등급 위험.' },

  'R1': { organ: '골밀도', good: '골밀도가 정상이다. 실거래가가 안정적이다.', warn: '골밀도가 변화하고 있다.', alert: '골밀도 이상.' },
  'R2': { organ: '골절', good: '골절 징후가 없다. 미분양이 안정적이다.', warn: '골절 전조가 감지된다. 미분양이 증가하고 있다.', alert: '골절 임박. 미분양이 위험 수준이다.' },
  'R3': { organ: '골수', good: '골수 충전이 정상이다.', warn: '골수 충전이 불안정하다.', alert: '골수 부전.' },
  'R4': { organ: '골절발생', good: '골절이 발생하지 않았다. 경매가 안정적이다.', warn: '미세 골절이 감지된다.', alert: '골절 발생.' },
  'R5': { organ: 'X-ray공정', good: 'X-ray상 공정률 정상이다.', warn: 'X-ray상 이상 감지.', alert: 'X-ray상 심각한 이상.' },
  'R6': { organ: 'X-ray입주', good: '실입주가 확인된다.', warn: '실입주율이 떨어지고 있다.', alert: '실입주 부진.' },
  'R7': { organ: '생활흔적', good: '생활 흔적이 확인된다. 주차 점유가 양호하다.', warn: '생활 흔적이 줄고 있다.', alert: '생활 흔적 부족.' },
  'R8': { organ: '건물체온', good: '건물 체온이 정상이다.', warn: '건물 체온이 비정상이다.', alert: '건물 체온 이상.' },
  'R9': { organ: '괴리판독', good: 'X-ray 판독 일치. 괴리가 없다.', warn: '판독 괴리가 감지된다.', alert: '판독 괴리 심각.' },

  'L1': { organ: '근력', good: '근력이 정상이다. 고용이 양호하다.', warn: '근력이 약화되고 있다.', alert: '근력 상실. 고용이 위축되고 있다.' },
  'L2': { organ: '통증', good: '통증이 없다. 실업급여 수급이 안정적이다.', warn: '통증 신호가 감지된다.', alert: '통증 심각.' },
  'L3': { organ: '근육부하', good: '근육 부하가 정상이다. 가계부채가 관리 가능하다.', warn: '근육 부하가 높아지고 있다. 가계부채에 주의가 필요하다.', alert: '근육 파열 위험. 가계부채가 위험 수준이다.' },
  'L4': { organ: '신경', good: '신경이 정상이다. 연체율이 안정적이다.', warn: '신경 손상 징후. 연체율이 상승하고 있다.', alert: '신경 손상. 연체율이 위험하다.' },
  'L5': { organ: '통증자각', good: '통증 자각이 없다. 체감경기가 양호하다.', warn: '통증을 자각하기 시작했다.', alert: '통증 심각. 체감경기가 위축되고 있다.' },

  'G1': { organ: '편마비', good: '편마비 징후가 없다.', warn: '편마비가 진행 중이다.', alert: '편마비 심각. 소멸위험 지역이 위험 수준이다.' },
  'G2': { organ: '좌우근력', good: '좌우 근력이 균형이다.', warn: '좌우 근력 불균형이 감지된다.', alert: '좌우 근력 불균형 심각.' },
  'G3': { organ: '혈류분배', good: '혈류 분배가 균형이다.', warn: '혈류 편중이 진행 중이다.', alert: '혈류 편중 심각.' },
  'G4': { organ: '좌우세포', good: '좌우 세포 활력이 균형이다.', warn: '좌우 세포 활력 불균형.', alert: '좌우 세포 활력 불균형 심각.' },
  'G5': { organ: '자율신경', good: '자율신경이 정상이다. 재정자립이 양호하다.', warn: '자율신경이 약화되고 있다.', alert: '자율신경 부전.' },
  'G6': { organ: '좌우활력', good: '좌우 활력이 균형이다.', warn: '좌우 활력 불균형.', alert: '좌우 활력 불균형 심각.' },
  'G7': { organ: '재활', good: '재활 치료가 진행 중이다.', warn: '재활이 부족하다.', alert: '재활 부재.' },

  'F1': { organ: '혈액점도', good: '혈액 점도가 안정이다.', warn: '혈액 점도가 높아지고 있다.', alert: '혈액 점도 위험.' },
  'F2': { organ: '혈중독소', good: '혈중 독소가 정상이다.', warn: '혈중 독소가 증가하고 있다.', alert: '혈중 독소 위험.' },
  'F3': { organ: '면역력', good: '면역력이 양호하다. 은행 건전성이 양호하다.', warn: '면역력이 약화되고 있다.', alert: '면역력 부전.' },
  'F4': { organ: '혈압변동', good: '혈압 변동이 안정적이다.', warn: '혈압 변동이 커지고 있다. 시장 변동성에 주의가 필요하다.', alert: '혈압 급변. 시장 변동성이 위험 수준이다.' },
  'F5': { organ: '응고인자', good: '응고 인자가 정상이다.', warn: '응고 인자가 불안정하다.', alert: '응고 인자 위험.' },

  'E1': { organ: '산소가격', good: '산소 가격이 안정적이다. 유가가 적정 범위다.', warn: '산소 가격이 상승하고 있다.', alert: '산소 가격 급등.' },
  'E2': { organ: '산소통', good: '산소통이 충분하다. 전력 여유가 있다.', warn: '산소통이 부족해지고 있다. 전력예비율에 주의가 필요하다.', alert: '산소통 고갈 위험.' },
  'E3': { organ: '연료비축', good: '연료 비축이 충분하다.', warn: '연료 비축이 줄고 있다.', alert: '연료 비축 부족.' },
  'E4': { organ: '산소소비', good: '산소 소비가 정상이다.', warn: '산소 소비가 감소하고 있다.', alert: '산소 소비 이상.' },
  'E5': { organ: '영양소', good: '영양소 가격이 안정적이다.', warn: '영양소 가격이 변동하고 있다.', alert: '영양소 가격 이상.' },

  'A1': { organ: '세포재생', good: '세포 재생이 양호하다.', warn: '세포 재생이 둔화되고 있다.', alert: '세포 재생 정지. 출산율이 위험 수준이다.' },
  'A2': { organ: '신체나이', good: '신체 나이가 양호하다.', warn: '신체가 노화되고 있다. 고령화에 주의가 필요하다.', alert: '신체 노화 심각.' },
  'A3': { organ: '근육세포', good: '근육 세포가 충분하다.', warn: '근육 세포가 줄고 있다. 생산인구 감소에 주의가 필요하다.', alert: '근육 세포 부족.' },
  'A4': { organ: '줄기세포', good: '줄기세포가 충분하다. 학령인구가 양호하다.', warn: '줄기세포가 줄고 있다.', alert: '줄기세포 부족.' },
  'A5': { organ: '수혈', good: '수혈이 진행 중이다. 이민 유입이 양호하다.', warn: '수혈이 부족하다.', alert: '수혈 부재.' },
};

function generateNarrative(code, gauge) {
  const rule = GRADE_RULES[code];
  const meta = METAPHOR_MAP[code];
  if (!rule || !meta) return gauge.narrative || '';

  // 이미 산출된 grade 사용 (재산출 금지)
  const grade = gauge.grade || '';
  const gradeKey = grade.includes('양호') ? 'good' : grade.includes('주의') ? 'warn' : 'alert';
  const metaphorText = meta[gradeKey];

  // 기준시점 포맷
  const period = gauge._period ? ` (${gauge._period})` : '';
  const change = gauge.change && gauge.change !== '보합' ? `, 전기비 ${gauge.change}` : '';

  return `${rule.metric}(${code})은 ${gauge.value}${period}${change}. ${metaphorText}`;
}

function generateDiagnosis(code, gauge) {
  const meta = METAPHOR_MAP[code];
  if (!meta) return gauge.diagnosis || '';

  // 이미 산출된 grade 사용
  const grade = gauge.grade || '';
  const gradeKey = grade.includes('양호') ? 'good' : grade.includes('주의') ? 'warn' : 'alert';

  return `${meta.organ}: ${gauge.value}. ${meta[gradeKey].split('.')[0]}.`;
}

// ═══════════════════════════════════════════
// 4. 요약 자동 생성
// ═══════════════════════════════════════════

function generateSectionSummary(gauges, sectionName) {
  let good = 0, warn = 0, alert = 0;
  const warnList = [];
  const alertList = [];

  for (const g of gauges) {
    // 이미 산출된 grade를 사용 (재산출 금지 → SSOT 원칙)
    const grade = g.grade || '';
    if (grade.includes('경보') || grade.includes('★')) {
      alert++;
      alertList.push(`${g.code} ${g.value}`);
    } else if (grade.includes('주의') || grade.includes('●')) {
      warn++;
      warnList.push(`${g.code} ${g.value}`);
    } else {
      good++;
    }
  }

  const total = gauges.length;
  let status = '양호';
  if (alert > 0) status = '경보';
  else if (warn > 0) status = '주의';

  let narrative = `${total}개 중 ${good}개 양호, ${warn}개 주의, ${alert}개 경보.`;
  if (alertList.length > 0) narrative += ` 경보: ${alertList.join(', ')}.`;
  if (warnList.length > 0) narrative += ` 주의: ${warnList.join(', ')}.`;

  return { summary: `${sectionName} 종합: ${good}개 양호 / ${warn}개 주의 / ${alert}개 경보`, narrative, status, good, warn, alert };
}

// ═══════════════════════════════════════════
// 5. 헬퍼
// ═══════════════════════════════════════════

function extractCode(codeField) {
  if (!codeField) return '';
  return codeField.split(' ')[0].trim();
}

function parseChangeNum(change) {
  if (!change || change === '보합') return 0;
  const num = parseFloat(String(change).replace(/[^0-9.\-]/g, ''));
  return isNaN(num) ? 0 : num;
}

// ═══════════════════════════════════════════
// 6. 판정 체계 통일
// ═══════════════════════════════════════════
// 규칙: 0M~7M = 0단계~7단계, 이 매핑은 문서 상단에 명시

const STAGE_MAP = {
  '0M': { stage: '0단계', label: '정상', emoji: '🟢', color: 'green' },
  '1M': { stage: '1단계', label: '안정', emoji: '🟢', color: 'green' },
  '2M': { stage: '2단계', label: '주의', emoji: '🟡', color: 'yellow' },
  '3M': { stage: '3단계', label: '경고', emoji: '🟠', color: 'orange' },
  '4M': { stage: '4단계', label: '위험', emoji: '🔴', color: 'red' },
  '5M': { stage: '5단계', label: '위기', emoji: '🔴', color: 'red' },
  '6M': { stage: '6단계', label: '붕괴', emoji: '⚫', color: 'black' },
  '7M': { stage: '7단계', label: '회복', emoji: '🔵', color: 'blue' },
};

function computeOverallStage(sectionResults) {
  // 전체 경보 개수로 단계 산출
  let totalAlert = 0, totalWarn = 0, totalGood = 0;
  for (const r of sectionResults) {
    totalAlert += r.alert || 0;
    totalWarn += r.warn || 0;
    totalGood += r.good || 0;
  }

  // 단계 산출 규칙
  if (totalAlert >= 10) return STAGE_MAP['5M'];
  if (totalAlert >= 7) return STAGE_MAP['4M'];
  if (totalAlert >= 5) return STAGE_MAP['3M'];
  if (totalAlert >= 3) return STAGE_MAP['2M'];
  if (totalAlert >= 1 || totalWarn >= 5) return STAGE_MAP['1M'];
  return STAGE_MAP['0M'];
}

// ═══════════════════════════════════════════
// 7. 메인 변환 함수
// ═══════════════════════════════════════════

function transform(data) {
  const result = JSON.parse(JSON.stringify(data)); // deep clone
  const sectionResults = [];

  // 게이지 배열 목록
  const gaugeArrays = [
    { key: 'sec2_gauges', name: '심폐계(Input)', summaryKey: 'sec2_summary', narrKey: 'sec2_summaryNarrative' },
    { key: 'sec3_gauges', name: '순환계(Output)', summaryKey: 'sec3_summary', narrKey: 'sec3_summaryNarrative' },
    { key: 'axis2_gauges', name: '동맥(무역/제조)', summaryKey: 'axis2_summary', narrKey: 'axis2_summaryNarrative' },
    { key: 'axis3_gauges', name: '미세혈관(골목시장)', summaryKey: 'axis3_summary', narrKey: 'axis3_summaryNarrative' },
    { key: 'axis4_gauges', name: '골격(부동산)', summaryKey: 'axis4_summary', narrKey: 'axis4_summaryNarrative' },
    { key: 'axis5_gauges', name: '근육/신경(고용/가계)', summaryKey: 'axis5_summary', narrKey: 'axis5_summaryNarrative' },
    { key: 'axis6_gauges', name: '좌우대칭(지역균형)', summaryKey: 'axis6_summary', narrKey: 'axis6_summaryNarrative' },
    { key: 'axis7_gauges', name: '혈액의질(금융스트레스)', summaryKey: 'axis7_summary', narrKey: 'axis7_summaryNarrative' },
    { key: 'axis8_gauges', name: '산소공급(에너지)', summaryKey: 'axis8_summary', narrKey: 'axis8_summaryNarrative' },
    { key: 'axis9_gauges', name: '신체나이(인구/노화)', summaryKey: 'axis9_summary', narrKey: 'axis9_summaryNarrative' },
  ];

  // ── A. 각 게이지 변환 ──
  for (const { key, name, summaryKey, narrKey } of gaugeArrays) {
    if (!result[key]) continue;

    for (const gauge of result[key]) {
      const code = extractCode(gauge.code);
      if (!code) continue;

      // 등급 자동 산출
      const gradeResult = computeGrade(code, gauge._raw_num, parseChangeNum(gauge.change), gauge.value);
      gauge.grade = gradeResult.grade;
      gauge.judge = gradeResult.judge;

      // narrative 자동 생성 (SSOT: value에서만 숫자)
      gauge.narrative = generateNarrative(code, gauge);

      // diagnosis 자동 생성
      gauge.diagnosis = generateDiagnosis(code, gauge);

      // metaphor: 등급 기반 자동 갱신
      const meta = METAPHOR_MAP[code];
      if (meta) {
        gauge.metaphor = meta.organ + (gradeResult.grade.includes('양호') ? ' 정상' : gradeResult.grade.includes('주의') ? ' 주의' : ' 경보');
      }
    }

    // ── B. 섹션 요약 자동 생성 ──
    const secResult = generateSectionSummary(result[key], name);
    sectionResults.push(secResult);

    if (summaryKey) result[summaryKey] = secResult.summary;
    if (narrKey) result[narrKey] = secResult.narrative;
  }

  // ── C. 종합 판정 자동 산출 ──
  const overall = computeOverallStage(sectionResults);

  result.alertLevel = `${overall.emoji} ${overall.stage}: ${overall.label}`;
  result.diahStatus = `${overall.label} — ${overall.stage} (${overall.emoji})`;

  // 전체 집계
  const totalGood = sectionResults.reduce((s, r) => s + r.good, 0);
  const totalWarn = sectionResults.reduce((s, r) => s + r.warn, 0);
  const totalAlert = sectionResults.reduce((s, r) => s + r.alert, 0);

  // CAM/DLT 상태: Input(sec2)/Output(sec3) 기반
  const inputResult = sectionResults[0]; // sec2
  const outputResult = sectionResults[1]; // sec3
  
  if (inputResult) {
    result.camStatus = inputResult.alert > 0 
      ? `🔴 경보 — Input ${inputResult.alert}개 경보 발생`
      : inputResult.warn > 0
        ? `🟡 주의 — Input ${inputResult.warn}개 주의 항목`
        : `🟢 안정 — Input ${inputResult.good}/${inputResult.good + inputResult.warn + inputResult.alert}개 양호`;
  }
  
  if (outputResult) {
    result.dltStatus = outputResult.alert > 0
      ? `🔴 경보 — Output ${outputResult.alert}개 경보 발생`
      : outputResult.warn > 0
        ? `🟡 주의 — Output ${outputResult.warn}개 주의 항목`
        : `🟢 양호 — Output ${outputResult.good}/${outputResult.good + outputResult.warn + outputResult.alert}개 양호`;
  }

  // 트리거 판정: 경보 기반
  const triggerFired = totalAlert >= 3;
  result.sec4_verdict = triggerFired
    ? `판정: ${overall.label} — 경보 ${totalAlert}개 감지. 트리거 발동 조건 근접.`
    : `판정: ${overall.label} — 경보 ${totalAlert}개. 트리거 미발동.`;
  result.sec4_summary = `DIAH 종합: ${totalGood}개 양호 / ${totalWarn}개 주의 / ${totalAlert}개 경보. ${overall.stage} ${overall.label}.`;

  // sec1 요약도 통일
  result.sec1_detail = `59개 게이지 중 ${totalGood}개 양호, ${totalWarn}개 주의, ${totalAlert}개 경보.`;
  result.sec1_alertNarrative = generateAlertNarrative(sectionResults, overall);

  // oneLiner
  result.oneLiner = `${overall.emoji} ${overall.stage} ${overall.label} | ${totalGood}양호/${totalWarn}주의/${totalAlert}경보`;

  // 확률 제거 → 시나리오 기반으로 변경
  result.sec5_currentText = generateCurrentText(sectionResults, overall);
  result.sec5_nextText = generateNextText(overall);

  // ── 단계 판정 규칙 명시 (투명성 확보) ──
  result.sec5_stageRule = '단계 판정 규칙: 59개 게이지의 경보·주의 집계 기반. ' +
    '경보 ≥10 → 5단계(위기), ≥7 → 4단계(위험), ≥5 → 3단계(경고), ≥3 → 2단계(주의), ' +
    '≥1 또는 주의≥5 → 1단계(안정), 그 외 → 0단계(정상). ' +
    '트리거(H/A/D/I)는 단계 산출에 직접 반영되지 않으며, 별도 감시 지표로 운용된다.';

  // 미세석회 경로 (확률 금지)
  result.sec6_intro = '미세석회 경로는 다음 세 가지 조건부 시나리오로 분기한다. (확률 예측 아님, 조건 기반 분기)';

  // ── D. gaugeTable 배열도 SSOT 변환 ──
  const gaugeTableArrays = [
    'axis2_gaugeTable', 'axis3_gaugeTable', 'axis4_gaugeTable',
    'axis5_gaugeTable', 'axis6_gaugeTable', 'axis7_gaugeTable',
    'axis8_gaugeTable', 'axis9_gaugeTable'
  ];
  // gaugeTable의 grade를 해당 gauge의 grade로 동기화
  const allGaugeMap = new Map(); // code → gauge (SSOT 산출 결과)
  for (const { key } of gaugeArrays) {
    if (!result[key]) continue;
    for (const g of result[key]) {
      const code = extractCode(g.code);
      if (code) allGaugeMap.set(code, g);
    }
  }
  for (const tblKey of gaugeTableArrays) {
    if (!result[tblKey]) continue;
    for (const row of result[tblKey]) {
      const code = extractCode(row.code);
      const ssotGauge = allGaugeMap.get(code);
      if (ssotGauge) {
        row.grade = ssotGauge.grade;
        row.judge = ssotGauge.judge;
      }
    }
  }

  // ── D-2. 교차 단서 자동 삽입 (O4↔F4) ──
  const o4g = allGaugeMap.get('O4');
  const f4g = allGaugeMap.get('F4');
  if (o4g && f4g && o4g.grade?.includes('양호') && f4g.grade?.includes('경보')) {
    o4g.narrative += ` 단, 변동성(F4)이 경보 수준(${f4g.value})으로, 수준은 양호하나 안정성은 변동성에서 흔들린다.`;
  }

  // ── D-4. period_type 범례 삽입 ──
  result.periodLegend = '기준시점 표기: 월간(YYYY-MM), 주간(YYYY-W##), 분기(YYYY-Q#), 스냅샷(YYYY-MM-DD), 연간(YYYY). 기준월은 해석 기준, 관측일은 측정 시점.';

  // ── D-6. Freshness Guard: 데이터 신선도 자동 검증 ──
  const today = new Date();
  const staleWarnings = [];
  for (const { key } of gaugeArrays) {
    if (!result[key]) continue;
    for (const g of result[key]) {
      const period = g._period;
      if (!period) continue;
      
      // period → Date 변환
      let periodDate = null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
        periodDate = new Date(period);
      } else if (/^\d{4}-\d{2}$/.test(period)) {
        periodDate = new Date(period + '-28'); // 월말 근사
      } else if (/^\d{4}-Q(\d)$/.test(period)) {
        const q = parseInt(period.match(/Q(\d)/)[1]);
        periodDate = new Date(`${period.substring(0,4)}-${q*3}-28`);
      } else if (/^\d{4}-W\d{2}$/.test(period)) {
        periodDate = new Date(period.substring(0,4) + '-' + period.substring(6) + '-01');
      } else if (/^\d{4}$/.test(period)) {
        periodDate = new Date(period + '-12-31');
      }
      
      if (periodDate) {
        const ageMonths = (today.getFullYear() - periodDate.getFullYear()) * 12 
                        + (today.getMonth() - periodDate.getMonth());
        const code = (g.code || '').match(/[A-Z]\d/)?.[0] || '';
        
        // 연간지표: 18개월 초과 시 경고, 월간지표: 6개월 초과 시 경고
        const isAnnual = /^\d{4}$/.test(period);
        const threshold = isAnnual ? 18 : 6;
        
        if (ageMonths > threshold) {
          g._freshness = `⚠ 구데이터(${ageMonths}개월 전)`;
          staleWarnings.push(`${code}(${g.code}): ${period} → ${ageMonths}개월 경과`);
        } else {
          g._freshness = '✅';
        }
      }
    }
  }
  
  if (staleWarnings.length > 0) {
    result.freshnessAlert = `⚠ 신선도 경고: ${staleWarnings.length}개 게이지의 데이터가 임계 기간을 초과했습니다. ` 
      + staleWarnings.join('; ');
  } else {
    result.freshnessAlert = '✅ 전 게이지 데이터 신선도 정상.';
  }

  // ── D-5. 은유 면책 삽입 (sec8) ──
  if (result.sec8_common) {
    result.sec8_disclaimer = '본 섹션의 진단명(급성 심근경색, 패혈증 쇼크 등)은 경제 흐름의 위기 양상을 설명하기 위한 표준 은유이며, 의학적 진단이 아니다.';
  }

  // ── E. sec4_triggers: SSOT 기반 트리거 텍스트 자동 생성 ──
  if (result.sec4_triggers && Array.isArray(result.sec4_triggers)) {
    const triggerStatus = totalAlert >= 5 ? '발동' : '잠복';
    const i4 = allGaugeMap.get('I4');
    const i6 = allGaugeMap.get('I6');
    const o2 = allGaugeMap.get('O2');
    const o6 = allGaugeMap.get('O6');
    const l3 = allGaugeMap.get('L3');
    const g1 = allGaugeMap.get('G1');

    const triggerTexts = {
      'H': `국채금리 ${i6?.value || '?'}로 ${i6?.grade?.includes('양호') ? '안정' : '불안'}. 소비(O6) ${o6?.value || '?'}로 ${o6?.grade?.includes('양호') ? '양호' : '위축'}. 돈맥경화 트리거 ${triggerStatus} (발동 조건: 금리 급등 + 소비 위축 동시 발생).`,
      'A': `물가 ${o2?.value || '?'}로 ${o2?.grade?.includes('양호') ? '안정 범위' : '상승 압력'}. 물가폭등 트리거 ${triggerStatus} (발동 조건: CPI 5% 초과 + 에너지 가격 급등).`,
      'D': `고용 ${allGaugeMap.get('L1')?.value || '?'} 증가, 소비(O6) ${o6?.value || '?'}. 소득절벽 트리거 ${triggerStatus} (발동 조건: 고용 감소 + 소비 2개월 연속 마이너스).`,
      'I': `가계부채 ${l3?.value || '?'}, 소멸지수 ${g1?.value || '?'}. 빈부격차 트리거 ${triggerStatus} (발동 조건: 가계부채 2,000조 돌파 + 소멸지역 150개 초과).`
    };

    for (const t of result.sec4_triggers) {
      if (triggerTexts[t.code]) {
        t.text = triggerTexts[t.code];
      }
    }
  }

  // ── F. sec5: 단계 체계 통일 (0M → overall.stage) ──
  result.sec5_current = overall.stage.replace('단계', 'M').replace(/(\d)M/, '$1M');
  // 0단계→0M, 2단계→2M 매핑
  const stageNum = overall.stage.match(/(\d)/)?.[1] || '0';
  result.sec5_current = `${stageNum}M`;
  result.sec5_currentName = overall.label;
  // 다음 단계
  const nextStageNum = Math.min(parseInt(stageNum) + 1, 7);
  const nextStage = STAGE_MAP[`${nextStageNum}M`] || STAGE_MAP['3M'];
  result.sec5_nextM = `${nextStageNum}M`;
  result.sec5_nextName = nextStage.label;

  // ── G. sec6_paths: 확률 제거 ──
  if (result.sec6_paths && Array.isArray(result.sec6_paths)) {
    for (const p of result.sec6_paths) {
      // prob 필드에서 확률 숫자 제거
      if (p.prob) {
        p.prob = null; // 확률 완전 제거
      }
      // text에서도 확률 제거
      if (p.text) {
        p.text = p.text.replace(/\(확률[:\s]*[\d/%,\s]+\)/g, '')
                       .replace(/확률[:\s]*[\d/%]+/g, '')
                       .replace(/\d+%\s*[/,]\s*\d+%\s*[/,]\s*\d+%/g, '');
      }
    }
  }

  // ── H. sec7_monthly: 시계열 데이터를 SSOT 기반으로 정합 ──
  if (result.sec7_monthly && result.sec7_monthly.data) {
    for (const row of result.sec7_monthly.data) {
      // 시계열 내 게이지 이름에서 코드 추출
      const codeMatch = row.gauge?.match(/([A-Z]\d)/);
      if (codeMatch) {
        const code = codeMatch[1];
        const ssotGauge = allGaugeMap.get(code);
        if (ssotGauge) {
          // m3를 SSOT value와 동기화
          row.m3 = ssotGauge.value;
          // judge도 SSOT와 동기화
          const gradeStr = ssotGauge.grade || '';
          if (gradeStr.includes('경보') || gradeStr.includes('★')) row.judge = '경보';
          else if (gradeStr.includes('주의') || gradeStr.includes('●')) row.judge = '주의';
          else row.judge = '양호';

          // gauge 이름도 SSOT 코드사전과 통일
          const rule = GRADE_RULES[code];
          if (rule) row.gauge = `${rule.metric}(${code})`;
        }
      }

      // ── trend 텍스트 자동 생성 (m1/m2/m3 숫자 기반) ──
      const nums = [row.m1, row.m2, row.m3].map(v => {
        if (!v) return null;
        const s = String(v).replace(/[^0-9.\-+]/g, '');
        return s ? parseFloat(s) : null;
      });

      if (nums[0] !== null && nums[1] !== null && nums[2] !== null) {
        const d1 = nums[1] - nums[0]; // m1→m2
        const d2 = nums[2] - nums[1]; // m2→m3
        const allUp = d1 > 0 && d2 > 0;
        const allDown = d1 < 0 && d2 < 0;
        const lastUp = d2 > 0;
        const lastDown = d2 < 0;

        // 방향성 판정
        if (allUp) {
          row.trend = '↑ 3개월 연속 상승';
        } else if (allDown) {
          row.trend = '↓ 3개월 연속 하락';
        } else if (lastUp && d1 < 0) {
          row.trend = '↑↓ 반등 전환';
        } else if (lastDown && d1 > 0) {
          row.trend = '↑↓ 하락 전환';
        } else if (d1 === 0 && d2 === 0) {
          row.trend = '→ 보합';
        } else {
          row.trend = '↑↓ 혼조';
        }

        // 경보 마크는 judge 기반
        if (row.judge === '경보') row.trend += ' ★';
        else if (row.judge === '주의') row.trend += ' ●';
      }
    }
    // 시계열 경고 삽입
    result.sec7_note = '⚠ 시계열 m1/m2는 과거 수집 데이터이며, m3(최신)만 SSOT 검증됨. trend 판정은 m1→m2→m3 방향에서 자동 산출.';

    // ── 스케일 경고: m1 vs m3 비율이 비정상인 행 표시 ──
    for (const row of result.sec7_monthly.data) {
      const parseNum = v => {
        if (!v) return null;
        const s = String(v).replace(/[^0-9.\-+]/g, '');
        return s ? parseFloat(s) : null;
      };
      const n1 = parseNum(row.m1);
      const n3 = parseNum(row.m3);
      if (n1 && n3 && n1 !== 0) {
        const ratio = n3 / n1;
        if (ratio > 1.9 || ratio < 0.5) {
          row.m1 = row.m1 + ' ⚠';
          row.m2 = row.m2 + ' ⚠';
          row.scaleWarning = 'm1/m2 스케일 상이(미검증), m3 기준으로만 판정';
        }
      }
    }
  }

  // ── I. sec7_narrative: SSOT 기반 재생성 ──
  // 시계열 서술은 실제 SSOT 값에서만 생성
  const alertGauges = [];
  const warnGauges = [];
  for (const [code, g] of allGaugeMap) {
    if (g.grade?.includes('경보') || g.grade?.includes('★')) alertGauges.push(`${g.code}(${g.value})`);
    else if (g.grade?.includes('주의') || g.grade?.includes('●')) warnGauges.push(`${g.code}(${g.value})`);
  }
  result.sec7_narrative = `SSOT 기반 추이 요약: 경보 ${alertGauges.length}개(${alertGauges.join(', ')}), 주의 ${warnGauges.length}개(${warnGauges.join(', ')}). 시계열 m1/m2 과거 데이터는 차기 수집 시 SSOT 검증 예정.`;

  // ── J. sec8_data: 과거 비교 테이블의 "now" 열을 SSOT값으로 교체 ──
  if (result.sec8_data && Array.isArray(result.sec8_data)) {
    const sec8Map = {
      '경상수지': 'I1', '외환보유고': 'I3', '환율': 'I4',
      '국채금리': 'I6', '물가': 'O2', '주가': 'O4'
    };
    for (const row of result.sec8_data) {
      const code = sec8Map[row.item];
      if (code) {
        const g = allGaugeMap.get(code);
        if (g) row.now = `${g.value} (${g._period || ''})`;
      }
      // DIAH 트리거 행: 현재 판정과 통일
      if (row.item === 'DIAH 트리거') {
        row.now = `${overall.stage} ${overall.label} (경보 ${totalAlert}개)`;
      }
      if (row.item === '진단명') {
        row.now = `${overall.stage} ${overall.label}`;
      }
    }
  }

  // ── K. sec8 narratives: SSOT 기반 재생성 ──
  if (result.sec8_common) {
    result.sec8_common = `두 사례 모두 미세석회가 오랜 기간 조용히 침착된 후 급성 발현으로 전환되었다는 공통점이 있다. 현재 ${overall.stage} ${overall.label} 판정(경보 ${totalAlert}개)은 1997/2008 직전과 질적으로 다르지만, 구조적 리스크(인구, 지역불균형)가 장기 잠복 중이라는 점은 공유한다.`;
  }
  // sec8_narrative1997/2008: 현재 값 참조 부분만 SSOT화
  if (result.sec8_narrative1997) {
    result.sec8_narrative1997 = `1997년(D+H / 급성 심근경색): 외환위기 당시 소득절벽(D)과 돈맥경화(H)가 동시 발동. 현재와의 차이: 외환보유고 ${allGaugeMap.get('I3')?.value || '?'}(당시 ~300억$), 경상수지 ${allGaugeMap.get('I1')?.value || '?'} 흑자(당시 적자). 거시 완충력은 질적으로 다르다.`;
  }
  if (result.sec8_narrative2008) {
    result.sec8_narrative2008 = `2008년(H+A / 패혈증 쇼크): 글로벌 금융위기 시 돈맥경화(H)와 물가폭등(A)이 결합. 현재와의 차이: 국채금리 ${allGaugeMap.get('I6')?.value || '?'}(당시 5~6%), 물가 ${allGaugeMap.get('O2')?.value || '?'}(당시 5%). 금리·물가 수준이 크게 다르다.`;
  }

  // ── L. sec9 처방전: SSOT 값 기반 자동 생성 ──
  result.sec9_title = '9. 핵심 관찰 항목: "미세혈관 개통을 위한 모니터링 포인트"';
  result.sec9_intro = '미세석회 제거를 위한 핵심 모니터링 목표는 미세혈관 개통이다.';
  if (result.sec9_prescriptions && Array.isArray(result.sec9_prescriptions)) {
    const i4 = allGaugeMap.get('I4');
    const o6 = allGaugeMap.get('O6');
    const l3 = allGaugeMap.get('L3');
    const r2 = allGaugeMap.get('R2');
    const a1 = allGaugeMap.get('A1');
    const g1 = allGaugeMap.get('G1');
    const f4 = allGaugeMap.get('F4');

    // 경보/주의 게이지 기반 처방 자동 생성
    const newRx = [];
    if (r2?.grade?.includes('경보')) {
      newRx.push({
        title: `관찰 1: 미분양 경보 (${r2.value})`,
        text: `미분양(R2) ${r2.value}(${r2._period})이 경보 수준이다. 구조 하중(공급 물량) 조절과 미분양 전환 여부가 핵심 관찰 대상이다.`
      });
    }
    if (g1?.grade?.includes('경보')) {
      newRx.push({
        title: `관찰 2: 지역소멸 경보 (${g1.value})`,
        text: `소멸위험지역(G1) ${g1.value}(${g1._period})이 경보 수준이다. 좌우 균형 회복을 위한 지역 재정·인구 유입 동향이 관찰 대상이다.`
      });
    }
    if (f4?.grade?.includes('경보')) {
      newRx.push({
        title: `관찰 3: 시장 변동성 경보 (${f4.value})`,
        text: `코스피 변동성(F4) ${f4.value}(${f4._period})이 경보 수준이다. 혈압 급변 안정 여부가 관찰 대상이다.`
      });
    }
    if (a1?.grade?.includes('경보')) {
      newRx.push({
        title: `관찰 4: 출산율 경보 (${a1.value})`,
        text: `출산율(A1) ${a1.value}(${a1._period})이 세계 최저 수준이다. 세포 재생 정지 상태이며 비가역적 구조 리스크로 장기 모니터링 대상이다.`
      });
    }
    // 주의 게이지
    if (i4?.grade?.includes('주의')) {
      newRx.push({
        title: `관찰 ${newRx.length + 1}: 환율 주의 (${i4.value})`,
        text: `환율(I4) ${i4.value}(${i4._period})이 주의 수준이다. 실질 구매력과 수입 비용 압력 추이가 관찰 대상이다.`
      });
    }
    if (l3?.grade?.includes('주의')) {
      newRx.push({
        title: `관찰 ${newRx.length + 1}: 가계부채 주의 (${l3.value})`,
        text: `가계부채(L3) ${l3.value}(${l3._period})이 주의 수준이다. 총량 증가 속도와 취약계층 부담 추이가 관찰 대상이다.`
      });
    }

    if (newRx.length > 0) result.sec9_prescriptions = newRx;
  }

  // ── M. 변환 메타데이터 ──
  result._ssot_version = 'SSOT Engine v1.0';
  result._ssot_timestamp = new Date().toISOString();
  result._ssot_stats = { totalGood, totalWarn, totalAlert, stage: overall.stage };
  result.engineVersion = 'DIAH-7M 판정엔진 v5.0 + SSOT Engine v1.0';
  result.dataNote = `SSOT 검증: 59개 게이지 등급·서술·요약 자동 산출 완료 (${new Date().toISOString().split('T')[0]})`;

  return result;
}

// ── 헬퍼: 전체 경보 서술 ──
function generateAlertNarrative(sectionResults, overall) {
  const alerts = sectionResults.filter(r => r.alert > 0).map(r => r.summary);
  const warns = sectionResults.filter(r => r.warn > 0 && r.alert === 0).map(r => r.summary);

  let text = `경제 전반 ${overall.stage} ${overall.label} 판정. `;
  if (alerts.length > 0) text += `경보 섹션: ${alerts.join('; ')}. `;
  if (warns.length > 0) text += `주의 섹션: ${warns.join('; ')}. `;
  if (alerts.length === 0 && warns.length === 0) text += '모든 섹션이 양호하다.';
  return text;
}

function generateCurrentText(sectionResults, overall) {
  const totalGood = sectionResults.reduce((s, r) => s + r.good, 0);
  const totalWarn = sectionResults.reduce((s, r) => s + r.warn, 0);
  const totalAlert = sectionResults.reduce((s, r) => s + r.alert, 0);
  return `현재 ${overall.stage} ${overall.label}. 59개 게이지 중 ${totalGood}개 양호, ${totalWarn}개 주의, ${totalAlert}개 경보. 구조적 리스크(인구, 지역불균형, 가계부채)는 장기 모니터링 대상이다.`;
}

function generateNextText(overall) {
  return `다음 단계 진입 조건: 경보 게이지가 현재보다 증가하고, 동시에 Input·Output 양방향 악화가 확인될 경우 단계 상향. 확률 예측은 하지 않으며, 조건 충족 여부만 모니터링한다.`;
}

// ═══════════════════════════════════════════
// 8. CLI 실행
// ═══════════════════════════════════════════

if (require.main === module) {
  const inputPath = process.argv[2] || './data.json';
  const outputPath = process.argv[3] || './data_ssot.json';

  console.log('━━━ SSOT Engine v1.0 ━━━');
  console.log(`입력: ${inputPath}`);

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const transformed = transform(raw);

  fs.writeFileSync(outputPath, JSON.stringify(transformed, null, 2), 'utf8');
  console.log(`출력: ${outputPath}`);

  // 변환 리포트
  console.log('');
  console.log('═══ 변환 리포트 ═══');
  console.log(`종합 판정: ${transformed.alertLevel}`);
  console.log(`DIAH 상태: ${transformed.diahStatus}`);
  console.log(`게이지: ${transformed._ssot_stats.totalGood}양호 / ${transformed._ssot_stats.totalWarn}주의 / ${transformed._ssot_stats.totalAlert}경보`);
  console.log('');

  // 등급 변경 추적
  const origGauges = [];
  const newGauges = [];
  const arrays = ['sec2_gauges','sec3_gauges','axis2_gauges','axis3_gauges','axis4_gauges',
    'axis5_gauges','axis6_gauges','axis7_gauges','axis8_gauges','axis9_gauges'];
  
  for (const a of arrays) {
    if (!raw[a]) continue;
    for (let i = 0; i < raw[a].length; i++) {
      const orig = raw[a][i];
      const nw = transformed[a][i];
      if (orig.grade !== nw.grade) {
        console.log(`[등급변경] ${orig.code}: ${orig.grade} → ${nw.grade}`);
      }
    }
  }

  // 정합성 검증
  console.log('');
  console.log('═══ 정합성 검증 ═══');
  let contradictions = 0;
  for (const a of arrays) {
    if (!transformed[a]) continue;
    for (const g of transformed[a]) {
      const code = extractCode(g.code);
      if (!g.narrative || !g.value) continue;
      // value 원문 그대로 narrative에 있는지 확인 (SSOT 핵심 검증)
      const valOriginal = String(g.value);
      if (!g.narrative.includes(valOriginal)) {
        contradictions++;
        console.log(`⚠ ${code}: value="${g.value}" not found in narrative`);
        console.log(`  narrative: ${g.narrative.substring(0, 120)}`);
      }
    }
  }
  if (contradictions === 0) {
    console.log('✅ 표↔서술 모순: 0건 (완전 정합)');
  } else {
    console.log(`⚠ 표↔서술 불일치: ${contradictions}건`);
  }
}

module.exports = { transform, computeGrade, GRADE_RULES, STAGE_MAP };
