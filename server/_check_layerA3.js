// mapFromPipeline 수정 후 Layer A 재검증
// pipeline 원시값으로 직접 채점 시뮬레이션
const acuteEngine = require('./lib/acute-engine');

// 실제 pipeline 원시값 (직전 API 확인값)
const pipelineData = {
  T2_CURRENT_ACCOUNT: -22.399,  // 경상수지 전년비%
  T4_RESERVES:        -0.8379,  // 외환보유고 MoM%
  F4_EXCHANGE:        -0.1694,  // 환율 MoM% (원화강세)
  F5_INTEREST:         0,       // 금리스프레드 %p
  P1_CPI:             -1.9814,  // CPI YoY%
  F1_KOSPI:           -0.3038,  // KOSPI 전년비%
  S6_RETAIL:          -7.4074,  // 소매판매 MoM% ← 수정 전 /12 했던 것
};

const inputs = acuteEngine.mapFromPipeline(pipelineData);

console.log('=== mapFromPipeline 수정 후 매핑 결과 ===');
Object.entries(inputs).forEach(([code, v]) => {
  if (!v) { console.log(code + ': null'); return; }
  console.log(code + ': value=' + (v.value != null ? v.value.toFixed(4) : 'null') + ' change=' + (v.change != null ? v.change.toFixed(4) : 'null'));
});

console.log('');
console.log('=== v5.0 채점 결과 ===');
const scored = acuteEngine.scoreGauges(inputs);
Object.entries(scored).forEach(([code, s]) => {
  console.log(code + ' ' + s.name + ': ' + s.grade + ' (score=' + s.score + ')');
});

const alert = acuteEngine.judgeAlert(scored, null);
console.log('');
console.log('=== 최종 판정 ===');
console.log('alertLevel:', alert.alertLevel, '(' + alert.alertLabel + ')');
console.log('inputStars:', alert.inputStars, '/ outputStars:', alert.outputStars);

console.log('');
console.log('=== O6 소비 수정 전후 비교 ===');
console.log('수정 전: S6_RETAIL(-7.4074) / 12 =', (-7.4074/12).toFixed(4), '% → v5.0 -2% 기준 → 양호(0)');
console.log('수정 후: S6_RETAIL(-7.4074) 그대로 → v5.0 -5% 초과 → 경보(2)');
