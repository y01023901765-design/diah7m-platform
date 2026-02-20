/**
 * DIAH-7M Gauge Adapter
 * dataStore 게이지 (ID: O1_EXPORT, F1_KOSPI, ...) →
 * ssot_engine 입력 data.json 형식 변환
 */

// pipeline ID → ssot_engine 코드 매핑
// ssot_engine 기준: I1~I6, O1~O7, S1~S3, T1~T3, M1~M5,
//   R1~R9, L1~L5, G1~G7, F1~F5, E1~E5, A1~A5
const ID_MAP = {
  // ── Input (순환계/통화자금) ──
  'I1_CA':          { code: 'I1', cat: 'Input',  name: '경상수지',      unit: '억$' },
  'I2_CEMENT':      { code: 'I2', cat: 'Input',  name: '단기외채비율',   unit: '%' },
  'I3_FX':          { code: 'I3', cat: 'Input',  name: '외환보유고',     unit: '억$' },
  'I4_EXCHANGE':    { code: 'I4', cat: 'Input',  name: '환율',           unit: '원' },
  'I5_SPREAD':      { code: 'I5', cat: 'Input',  name: '신용스프레드',   unit: 'bp' },
  'I6_RATE':        { code: 'I6', cat: 'Input',  name: '국채금리',       unit: '%' },

  // ── Output (호흡계/무역수출입) ──
  'O1_EXPORT':      { code: 'O1', cat: 'Output', name: '산업생산',       unit: '%' },
  'O2_PMI':         { code: 'O2', cat: 'Output', name: '물가',           unit: '%' },
  'O3_RETAIL':      { code: 'O3', cat: 'Output', name: '실업률',         unit: '%' },
  'O4_INVESTMENT':  { code: 'O4', cat: 'Output', name: '주가',           unit: 'pt' },
  'O5_SERVICE':     { code: 'O5', cat: 'Output', name: '주택가격',       unit: '%' },
  'O6_CONSTRUCT':   { code: 'O6', cat: 'Output', name: '소비',           unit: '%' },

  // ── Axis2 무역/제조 (S계열) ──
  'S1_BSI':         { code: 'S1', cat: 'Axis2',  name: '선박대기',       unit: '일' },
  'S2_NIGHTLIGHT':  { code: 'S2', cat: 'Axis2',  name: '야간광량',       unit: '%' },
  'S3_NIGHTLIGHT':  { code: 'S3', cat: 'Axis2',  name: 'NO₂농도',        unit: 'ppb' },
  'S4_CREDIT':      { code: 'T2', cat: 'Axis2',  name: '제조업BSI',      unit: 'pt' },

  // ── 금융안정 (F계열) → Axis7 ──
  'F1_KOSPI':       { code: 'F1', cat: 'Axis7',  name: '회사채스프레드', unit: 'bp' },
  'F2_BOND':        { code: 'F2', cat: 'Axis7',  name: 'CP금리',         unit: '%' },
  'F3_VIX':         { code: 'F3', cat: 'Axis7',  name: 'BIS비율',        unit: '%' },
  'F4_CREDIT_CARD': { code: 'F4', cat: 'Axis7',  name: '코스피변동성',   unit: '%' },
  'F5_INTEREST':    { code: 'F5', cat: 'Axis7',  name: '은행채스프레드', unit: 'bp' },

  // ── 물가/재정 (P계열) → Axis8(에너지) ──
  'P1_CPI':         { code: 'E1', cat: 'Axis8',  name: '유가',           unit: '$/bbl' },
  'P2_PPI':         { code: 'E2', cat: 'Axis8',  name: '전력예비율',     unit: '%' },
  'P3_CORE_CPI':    { code: 'E3', cat: 'Axis8',  name: 'LNG재고',        unit: '만톤' },
  'P4_RENT':        { code: 'E4', cat: 'Axis8',  name: '산업전력',       unit: 'GWh' },
  'P5_EXPECT':      { code: 'E5', cat: 'Axis8',  name: '원자재지수',     unit: 'pt' },
  'P6_FISCAL':      { code: 'E5', cat: 'Axis8',  name: '원자재지수',     unit: 'pt' },

  // ── 산업/생산 (R계열) → Axis4(부동산) ──
  'R1_ELECTRICITY': { code: 'R1', cat: 'Axis4',  name: '실거래가',       unit: '만원/㎡' },
  'R2_STEEL':       { code: 'R2', cat: 'Axis4',  name: '미분양',         unit: '호' },
  'R3_PETRO':       { code: 'R3', cat: 'Axis4',  name: '전세가율',       unit: '%' },
  'R4_SEMICON':     { code: 'R4', cat: 'Axis4',  name: '경매건수',       unit: '건/1000세대' },
  'R5_SAR':         { code: 'R5', cat: 'Axis4',  name: 'SAR높이',        unit: 'm' },
  'R6_UHI':         { code: 'R6', cat: 'Axis4',  name: '신축야간광',     unit: '%' },

  // ── 인구/취약 (D계열) → Axis9 ──
  'D1_BIRTH':       { code: 'A1', cat: 'Axis9',  name: '출산율',         unit: '명' },
  'D2_AGING':       { code: 'A2', cat: 'Axis9',  name: '고령화율',       unit: '%' },
  'D3_WORKING':     { code: 'A3', cat: 'Axis9',  name: '생산인구',       unit: '만명' },

  // ── 고용/취약 (L계열) → Axis5 ──
  'L1_UNEMPLOYMENT':{ code: 'L1', cat: 'Axis5',  name: '고용동향',       unit: '만명' },
  'L2_EMPLOYMENT':  { code: 'L2', cat: 'Axis5',  name: '실업급여',       unit: '%' },
  'L3_HOUSEHOLD':   { code: 'L3', cat: 'Axis5',  name: '가계부채',       unit: '조원' },
  'L4_DELINQUENCY': { code: 'L4', cat: 'Axis5',  name: '연체율',         unit: '%' },

  // ── 재생/대외 (G계열) → Axis6(지역균형) ──
  'G1_GLOBAL_TRADE':{ code: 'G1', cat: 'Axis6',  name: '소멸지수',       unit: '개지역' },
  'G2_CHINA_TRADE': { code: 'G2', cat: 'Axis6',  name: '지역GRDP',       unit: '배' },
  'G6_NIGHTLIGHT':  { code: 'G6', cat: 'Axis6',  name: '지역야간광',     unit: '%' },

  // ── 소비/내수 (C계열) → Axis3(골목시장) ──
  'C1_CONSUMPTION': { code: 'M3', cat: 'Axis3',  name: '카드매출',       unit: '조원' },
  'C2_RETAIL':      { code: 'M2', cat: 'Axis3',  name: '유동인구',       unit: '만명' },
  'C3_SERVICE':     { code: 'M1', cat: 'Axis3',  name: '개폐업',         unit: '배' },

  // ── 심리/정책 (A계열 → Axis2 T계열) ──
  'A1_CONF':        { code: 'T2', cat: 'Axis2',  name: '제조업BSI',      unit: 'pt' },
  'A2_CSI':         { code: 'L5', cat: 'Axis5',  name: '체감경기',       unit: 'pt' },
  'A3_PMI':         { code: 'T3', cat: 'Axis2',  name: '산업전력',       unit: '%' },
  'A4_POLICY':      { code: 'I6', cat: 'Input',  name: '국채금리',       unit: '%' },

  // ── 기타 ──
  'E1_CHINA_PMI':   { code: 'T1', cat: 'Axis2',  name: '컨테이너',       unit: '만TEU' },
  'E5_BALTIC':      { code: 'S1', cat: 'Axis2',  name: '선박대기(발틱)', unit: 'pt' },
  'M1_IP':          { code: 'O1', cat: 'Output', name: '산업생산',       unit: '%' },
  'M2_SERVICE':     { code: 'O6', cat: 'Output', name: '소비',           unit: '%' },
};

// cat → ssot_engine 배열 키 매핑
const CAT_TO_KEY = {
  'Input':  'sec2_gauges',
  'Output': 'sec3_gauges',
  'Axis2':  'axis2_gauges',
  'Axis3':  'axis3_gauges',
  'Axis4':  'axis4_gauges',
  'Axis5':  'axis5_gauges',
  'Axis6':  'axis6_gauges',
  'Axis7':  'axis7_gauges',
  'Axis8':  'axis8_gauges',
  'Axis9':  'axis9_gauges',
};

/**
 * dataStore 평탄 게이지 맵 → ssot_engine data.json 형식 변환
 * @param {Object} flatGauges  { 'O1_EXPORT': 103.2, 'F1_KOSPI': 2450, ... }
 * @param {Object} meta        { period, mode, country }
 * @returns {Object} ssot_engine data.json 호환 객체
 */
function toDataJson(flatGauges, meta = {}) {
  const now = new Date();
  const period = meta.period || now.toISOString().slice(0, 7);

  const result = {
    mode: meta.mode === 'D' ? 'daily' : meta.mode === 'W' ? 'weekly' :
          meta.mode === 'Q' ? 'quarterly' : meta.mode === 'A' ? 'annual' : 'monthly',
    month: period,
    date: now.toISOString().slice(0, 10),
    datePeriod: now.toLocaleDateString('ko-KR'),
    week: '',
    quarter: '',
    year: String(now.getFullYear()),
    writeDate: now.toISOString().slice(0, 10),
    engineVersion: 'DIAH-7M 판정엔진 v5.1 + SSOT Engine v1.0',
    dataNote: `Pipeline 실시간 수집 (${now.toISOString().slice(0, 10)})`,
    gauges: [],
    auxGauges: [],
    sec2_gauges: [],
    sec3_gauges: [],
    axis2_gauges: [],
    axis3_gauges: [],
    axis4_gauges: [],
    axis5_gauges: [],
    axis6_gauges: [],
    axis7_gauges: [],
    axis8_gauges: [],
    axis9_gauges: [],
  };

  const seen = {};  // 중복 ssot 코드 방지

  for (const [pipelineId, value] of Object.entries(flatGauges)) {
    const mapping = ID_MAP[pipelineId];
    if (!mapping || value == null) continue;

    const { code, cat, name, unit } = mapping;
    if (seen[code]) continue;  // 동일 ssot 코드 중복 방지
    seen[code] = true;

    const gauge = {
      cat,
      code: `${code} ${name}`,
      raw: `${value}${unit ? unit : ''}`,
      change: '',
      grade: '',
      judge: '',
      _verified: true,
      _source: 'DIAH-7M Pipeline',
      _period: period,
      _raw_num: Number(value),
      _collectDate: now.toISOString().slice(0, 10),
      value: `${value}${unit}`,
      unit,
    };

    // 메인 gauges 배열 (Input/Output)
    if (cat === 'Input' || cat === 'Output') {
      result.gauges.push(gauge);
    }

    // cat별 배열에도 추가
    const arrKey = CAT_TO_KEY[cat];
    if (arrKey) result[arrKey].push(gauge);
  }

  // 섹션 제목 (template.json의 title_key 매핑)
  result.sec2_title = '[심폐계] Input 진단 — 순환/통화자금';
  result.sec3_title = '[순환계] Output 진단 — 무역/수출입';
  result.axis2_title = '[동맥] 무역/제조 — 산업 혈관 점검';
  result.axis3_title = '[미세혈관] 골목시장 — 소비/내수 점검';
  result.axis4_title = '[골격] 산업/생산 — 부동산/에너지 점검';
  result.axis5_title = '[근육/신경] 고용/가계 — 경제 체력 점검';
  result.axis6_title = '[좌우대칭] 재생/대외 — 지역균형 점검';
  result.axis7_title = '[혈액의 질] 금융안정 — 스트레스 점검';
  result.axis8_title = '[산소 공급원] 물가/재정 — 에너지 점검';
  result.axis9_title = '[신체 나이] 인구/취약 — 구조 점검';

  result.sec2_available = result.sec2_gauges.length > 0;
  result.sec3_available = result.sec3_gauges.length > 0;
  result.axis2_available = result.axis2_gauges.length > 0;
  result.axis3_available = result.axis3_gauges.length > 0;
  result.axis4_available = result.axis4_gauges.length > 0;
  result.axis5_available = result.axis5_gauges.length > 0;
  result.axis6_available = result.axis6_gauges.length > 0;
  result.axis7_available = result.axis7_gauges.length > 0;
  result.axis8_available = result.axis8_gauges.length > 0;
  result.axis9_available = result.axis9_gauges.length > 0;

  // ── report_renderer 호환 한글 키 ──
  // report_renderer.js가 data["기준월"], data["수집일"], data["수집완료_요약"] 등을 기대함
  result['기준월'] = period;
  result['수집일'] = now.toISOString().slice(0, 10);
  result['수집상태'] = '정상';

  // 판정 분류 (grade가 아직 없으므로 게이지 코드 목록만 기록, ssot_engine 이후 갱신)
  const good = [], caution = [], alert = [];
  for (const g of [...result.sec2_gauges, ...result.sec3_gauges,
    ...result.axis2_gauges, ...result.axis3_gauges, ...result.axis4_gauges,
    ...result.axis5_gauges, ...result.axis6_gauges, ...result.axis7_gauges,
    ...result.axis8_gauges, ...result.axis9_gauges]) {
    const id = g.code ? g.code.split(' ')[0] : '';
    if (!id) continue;
    good.push(id); // 초기값 전부 양호, ssot_engine.transform() 이후 갱신됨
  }
  result['수집완료_요약'] = {
    총게이지: good.length + caution.length + alert.length,
    판정_양호: good,
    판정_주의: caution,
    판정_경보: alert,
  };

  // 보조정보
  result['보조정보'] = {
    '수집엔진': 'DIAH-7M Pipeline v5.1',
    '기간모드': meta.mode || 'M',
    '대상국가': meta.country || 'KR',
  };

  return result;
}

module.exports = { toDataJson, ID_MAP, CAT_TO_KEY };
