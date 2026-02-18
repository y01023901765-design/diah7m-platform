/**
 * DIAH-7M Backend Demo Data
 * 
 * 404 방지용 폴백 데이터
 * CommonJS 형식
 */

const DEMO_DIAGNOSIS = {
  overall: {
    score: 72,
    grade: 'B',
    trend: 'stable',
  },
  systems: [
    { axis_id: 'O', name: 'Output', score: 82, severity: 1, trend: 'up', weight: 1.2 },
    { axis_id: 'F', name: 'Finance', score: 68, severity: 2, trend: 'down', weight: 1.1 },
    { axis_id: 'S', name: 'Sentiment', score: 65, severity: 2, trend: 'down', weight: 1.0 },
    { axis_id: 'P', name: 'Price', score: 71, severity: 2, trend: 'stable', weight: 1.0 },
    { axis_id: 'R', name: 'Resource', score: 74, severity: 1, trend: 'stable', weight: 0.9 },
    { axis_id: 'I', name: 'Infrastructure', score: 69, severity: 2, trend: 'stable', weight: 1.0 },
    { axis_id: 'T', name: 'Trade', score: 78, severity: 1, trend: 'up', weight: 1.1 },
    { axis_id: 'E', name: 'External', score: 70, severity: 2, trend: 'stable', weight: 1.0 },
    { axis_id: 'L', name: 'Labor', score: 73, severity: 1, trend: 'stable', weight: 1.0 },
  ],
  crossSignals: [
    {
      source_axis: 'S',
      target_axis: 'F',
      type: 'SENTIMENT_FINANCE_COUPLING',
      severity: 2,
      description: '심리 지표와 금융시장 동조 하락 패턴',
    },
  ],
  dualLocks: [],
  actionSignals: [
    {
      type: 'AXIS_OBSERVATION',
      axis_id: 'F',
      severity: 2,
      description: 'Finance 지표 약화 관찰됨 (점수: 68)',
      timestamp: 'demo',
    },
    {
      type: 'AXIS_OBSERVATION',
      axis_id: 'S',
      severity: 2,
      description: 'Sentiment 지표 약화 관찰됨 (점수: 65)',
      timestamp: 'demo',
    },
  ],
  metadata: {
    generated_at: 'demo-2026-02-16T00:00:00Z',
    version: '1.0',
    gauge_count: 59,
  },
};

module.exports = { DEMO_DIAGNOSIS };
