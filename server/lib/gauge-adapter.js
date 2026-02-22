/**
 * DIAH-7M Gauge Adapter
 * dataStore 게이지 (ID: O1_EXPORT, F1_KOSPI, ...) →
 * ssot_engine 입력 data.json 형식 변환
 */

// dataStore 실제 ID → ssot_engine 코드 매핑
// dataStore ID는 data-pipeline.js의 GAUGE_MAP 키 기준 (실측값 기준)
// ssot_engine GRADE_RULES: Input(I1~I6), Output(O1~O7),
//   Axis2(S1~S3,T1~T3), Axis3(M1~M5), Axis4(R1~R9),
//   Axis5(L5/CSI), Axis6(E1~E5 물가=A6), Axis7(F1~F8 금융), Axis8(L1~L4 고용=A8), Axis9(G1~G6,A1~A5 대외/에너지=A9)
// ★ Axis# = core-engine A# 와 대응 (A6=물가, A7=금융, A8=고용, A9=대외)
const ID_MAP = {
  // ══ A1 순환계 → Input (sec2) ══
  // 경상수지·무역수지·외환보유·환율·신용·금리
  'T1_TRADE_BALANCE':  { code: 'I1', cat: 'Input',  name: '무역수지(경상)',   unit: '억$' },
  'T4_RESERVES':       { code: 'I3', cat: 'Input',  name: '외환보유고변동',   unit: '%' },
  'F4_EXCHANGE':       { code: 'I4', cat: 'Input',  name: '환율(전월비%)',     unit: '%(전월비)' },
  'S4_CREDIT':         { code: 'I5', cat: 'Input',  name: '신용스프레드',      unit: '%p' },
  'F5_INTEREST':       { code: 'I6', cat: 'Input',  name: '국채/기준금리',     unit: '%' },

  // ══ A2 호흡계 → Output (sec3) ══
  // 수출입·PMI·산업생산·실업·주가·소비
  'O1_EXPORT':         { code: 'O1', cat: 'Output', name: '수출(전년비)',       unit: '%' },
  'O2_PMI':            { code: 'O2', cat: 'Output', name: '제조업PMI',          unit: 'pt' },
  'L1_UNEMPLOYMENT':   { code: 'O3', cat: 'Output', name: '실업률변동',         unit: '%' },
  'F1_KOSPI':          { code: 'O4', cat: 'Output', name: 'KOSPI(전일비)',       unit: 'pt' },
  'S7_HOUSING':        { code: 'O5', cat: 'Output', name: '주택가격지수',        unit: 'pt' },
  'S6_RETAIL':         { code: 'O6', cat: 'Output', name: '소매판매(전년비)',    unit: '%' },
  'I1_CONSTRUCTION':   { code: 'O7', cat: 'Output', name: '건설생산(전년비)',    unit: '%' },

  // ══ A3 소화계 → Axis2 (무역/제조) ══
  'S1_BSI':            { code: 'T2', cat: 'Axis2',  name: '제조업BSI',          unit: 'pt' },
  'S2_CSI':            { code: 'L5', cat: 'Axis5',  name: '소비자심리(CSI)',     unit: 'pt' },
  'T6_CONTAINER':      { code: 'O1', cat: 'Axis2',  name: '수출(컨테이너)',      unit: '%' },
  'T2_CURRENT_ACCOUNT':{ code: 'T1', cat: 'Axis2',  name: '경상수지',            unit: '억$' },
  'T5_SHIPPING':       { code: 'S1', cat: 'Axis2',  name: '해운수지',            unit: '백만$' },
  'E5_BALTIC':         { code: 'S2', cat: 'Axis2',  name: '발틱운임지수(BDI)',   unit: 'pt' },
  'E1_CHINA_PMI':      { code: 'T3', cat: 'Axis2',  name: '중국PMI(대외)',       unit: 'pt' },

  // ══ A4 신경계 → Axis3 (소비/내수 대리지표) ══
  'O3_IP':             { code: 'M3', cat: 'Axis3',  name: '산업생산지수(전년비)', unit: '%' },
  'O4_CAPACITY':       { code: 'M4', cat: 'Axis3',  name: '설비가동률(전년비)',   unit: '%' },
  'O5_INVENTORY':      { code: 'M1', cat: 'Axis3',  name: '재고지수(전년비)',     unit: '%' },
  'O6_SHIPMENT':       { code: 'M2', cat: 'Axis3',  name: '출하지수(전년비)',     unit: '%' },
  // O7_ORDER: M3 충돌 제거 (O3_IP가 M3 단독 점유)

  // ══ A5 면역계 → Axis4 (건설/자산 대리지표) ══
  // 실측 부동산 데이터 없음 → 건설 소재 생산 대리 사용
  'I2_CEMENT':         { code: 'R2', cat: 'Axis4',  name: '시멘트생산(전년비)',   unit: '%' },
  'I3_STEEL':          { code: 'R3', cat: 'Axis4',  name: '철강재생산(전년비)',   unit: '%' },
  'I4_VEHICLE':        { code: 'R4', cat: 'Axis4',  name: '자동차생산(전년비)',   unit: '%' },
  'R6_UHI':            { code: 'R6', cat: 'Axis4',  name: '도시열섬이상(UHI)',    unit: '°C' },

  // ══ A8 인구/취약 → Axis8 (고용/가계) ← core-engine A8 고용 점수와 일치 ══
  'L2_PARTICIPATION':  { code: 'L2', cat: 'Axis8',  name: '경제활동참가율변동',   unit: '%' },
  'L3_WAGE':           { code: 'L3', cat: 'Axis8',  name: '임금(전년비)',          unit: '%' },
  'L4_HOURS':          { code: 'L4', cat: 'Axis8',  name: '근로시간변동',          unit: '%' },
  // L5_YOUTH_UNEMP: L1 충돌 제거 (S5_EMPLOY가 L1 단독 점유)
  'S5_EMPLOY':         { code: 'L1', cat: 'Axis8',  name: '취업자수증감',          unit: '천명' },

  // ══ A6 내분비계 → Axis6 (물가/재정) ← core-engine A6 물가 점수와 일치 ══
  // P3_OIL: E1 충돌 제거 (P1_CPI가 E1 단독 점유)
  'P1_CPI':            { code: 'E1', cat: 'Axis6',  name: 'CPI(소비자물가전년비)', unit: '%' },
  'P2_PPI':            { code: 'E2', cat: 'Axis6',  name: 'PPI(생산자물가전년비)', unit: '%' },
  'P4_COMMODITY':      { code: 'E5', cat: 'Axis6',  name: '상품수지(원자재대리)', unit: '백만$' },
  'P5_IMPORT':         { code: 'E3', cat: 'Axis6',  name: '수입물가지수',          unit: 'pt' },
  'P6_EXPORT_PRICE':   { code: 'E4', cat: 'Axis6',  name: '수출물가지수',          unit: 'pt' },

  // ══ 금융스트레스 → Axis7 (금융안정) ← core-engine A5 면역계와 일치 ══
  'F2_KOSDAQ':         { code: 'F1', cat: 'Axis7',  name: 'KOSDAQ(전일비%)',       unit: '%' },
  // F3_KOSPI_VOL: F4 충돌 제거 (F7_KOSDAQ_VOL이 F4 단독 점유)
  // F6_M2: F2 충돌 제거 (E4_DOLLAR_INDEX가 F2 단독 점유)
  'F7_KOSDAQ_VOL':     { code: 'F4', cat: 'Axis7',  name: 'KOSDAQ거래량',          unit: '천주' },
  'F8_FOREIGN':        { code: 'F8', cat: 'Axis7',  name: '외국인순매수',          unit: '백만원' },
  'E3_VIX':            { code: 'F3', cat: 'Axis7',  name: 'VIX(공포지수)',         unit: 'pt' },
  'E4_DOLLAR_INDEX':   { code: 'F2', cat: 'Axis7',  name: '달러인덱스(전일비)',    unit: '%' },

  // ══ A8 인구/취약 → Axis8 (고용/가계) ← core-engine A8 고용 점수와 일치 ══
  // (L2~L4, S5는 Axis5에서 이동 — A6 내분비계 주석 참조)

  // ══ A9 재생/대외 → Axis9 (에너지/환경/대외) ══
  'T3_FDI':            { code: 'G1', cat: 'Axis9',  name: '서비스수지(FDI대리)',   unit: '백만$' },
  'I5_CARGO':          { code: 'G2', cat: 'Axis9',  name: '운송수지(화물)',        unit: '백만$' },
  'I6_AIRPORT':        { code: 'G3', cat: 'Axis9',  name: '항공운송수지',          unit: '백만$' },
  'I7_RAILROAD':       { code: 'G4', cat: 'Axis9',  name: '운수창고취업자',        unit: '천명' },
  'S3_NIGHTLIGHT':     { code: 'G6', cat: 'Axis9',  name: '야간광량(위성)',        unit: 'nW/cm²/sr' },
  'E2_US_PMI':         { code: 'G5', cat: 'Axis9',  name: '미국경기(OECD CLI)',    unit: 'pt' },
  'R1_ELECTRICITY':    { code: 'A3', cat: 'Axis9',  name: '전기가스수도업생산',    unit: '%' },
  'R2_WATER':          { code: 'A4', cat: 'Axis9',  name: '수도업생산',            unit: '%' },
  // R3_GAS: A3 충돌 제거 (R1_ELECTRICITY가 A3 단독 점유)
  'R4_COAL':           { code: 'A5', cat: 'Axis9',  name: '석탄광업생산',          unit: '%' },
  'R7_WASTE':          { code: 'A2', cat: 'Axis9',  name: '폐기물처리업생산',      unit: '%' },
  'R8_FOREST':         { code: 'A1', cat: 'Axis9',  name: '농림어업취업자',        unit: '천명' },
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
  result.axis5_title = '[신경] 소비심리/CSI — 심리 점검';
  result.axis6_title = '[내분비] 물가/재정 — 인플레이션 점검';
  result.axis7_title = '[혈액의 질] 금융안정 — 스트레스 점검';
  result.axis8_title = '[근육] 고용/가계 — 노동시장 점검';
  result.axis9_title = '[신체 나이] 에너지/대외/환경 — 재생 점검';

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
