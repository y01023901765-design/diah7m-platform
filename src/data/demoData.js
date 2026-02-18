/**
 * DIAH-7M Demo/Fallback Data
 * 
 * GPT 피드백 반영:
 * - Cold Start 시 즉시 응답
 * - 404 방지
 * - "항상 200" 원칙
 */

export const DEMO_LATEST = {
  timestamp: 'demo-2026-02-16T00:00:00Z',
  summary: {
    success: 59,
    failed: 0,
    manual: 0,
    invalid: 0,
    total: 59,
  },
  gauges: [
    // O축
    { id: 'O1_EXPORT', value: 5.2, status: 'OK', timestamp: 'demo' },
    { id: 'O2_PMI', value: 2.1, status: 'OK', timestamp: 'demo' },
    { id: 'O3_IP', value: 3.5, status: 'OK', timestamp: 'demo' },
    { id: 'O4_CAPACITY', value: 1.8, status: 'OK', timestamp: 'demo' },
    { id: 'O5_INVENTORY', value: -2.3, status: 'OK', timestamp: 'demo' },
    { id: 'O6_SHIPMENT', value: 4.1, status: 'OK', timestamp: 'demo' },
    { id: 'O7_ORDER', value: 2.9, status: 'OK', timestamp: 'demo' },
    
    // F축
    { id: 'F1_KOSPI', value: 0.8, status: 'OK', timestamp: 'demo' },
    { id: 'F2_KOSDAQ', value: -1.2, status: 'OK', timestamp: 'demo' },
    { id: 'F3_KOSPI_VOL', value: 5.3, status: 'OK', timestamp: 'demo' },
    { id: 'F4_EXCHANGE', value: -0.5, status: 'OK', timestamp: 'demo' },
    { id: 'F5_INTEREST', value: 0.0, status: 'OK', timestamp: 'demo' },
    { id: 'F6_M2', value: 4.2, status: 'OK', timestamp: 'demo' },
    { id: 'F7_KOSDAQ_VOL', value: 3.8, status: 'OK', timestamp: 'demo' },
    { id: 'F8_FOREIGN', value: 2.1, status: 'OK', timestamp: 'demo' },
    
    // S축
    { id: 'S1_BSI', value: -5.0, status: 'OK', timestamp: 'demo' },
    { id: 'S2_CSI', value: -3.2, status: 'OK', timestamp: 'demo' },
    { id: 'S3_NIGHTLIGHT', value: 1.8, status: 'OK', timestamp: 'demo' },
    { id: 'S4_CREDIT', value: 4.5, status: 'OK', timestamp: 'demo' },
    { id: 'S5_EMPLOY', value: 0.3, status: 'OK', timestamp: 'demo' },
    { id: 'S6_RETAIL', value: 2.7, status: 'OK', timestamp: 'demo' },
    { id: 'S7_HOUSING', value: 1.2, status: 'OK', timestamp: 'demo' },
    
    // P, R, I, T, E, L축 (간소화)
    { id: 'P1_CPI', value: 2.5, status: 'OK', timestamp: 'demo' },
    { id: 'P2_PPI', value: 1.8, status: 'OK', timestamp: 'demo' },
    { id: 'P3_OIL', value: -3.2, status: 'OK', timestamp: 'demo' },
    { id: 'P4_COMMODITY', value: 0.5, status: 'OK', timestamp: 'demo' },
    { id: 'P5_IMPORT', value: 1.2, status: 'OK', timestamp: 'demo' },
    { id: 'P6_EXPORT_PRICE', value: 0.8, status: 'OK', timestamp: 'demo' },
    
    { id: 'R1_ELECTRICITY', value: 3.1, status: 'OK', timestamp: 'demo' },
    { id: 'R2_WATER', value: 0.5, status: 'OK', timestamp: 'demo' },
    { id: 'R3_GAS', value: 2.3, status: 'OK', timestamp: 'demo' },
    { id: 'R4_COAL', value: -1.5, status: 'OK', timestamp: 'demo' },
    { id: 'R6_UHI', value: 1.8, status: 'OK', timestamp: 'demo' },
    { id: 'R7_WASTE', value: 0.9, status: 'OK', timestamp: 'demo' },
    { id: 'R8_FOREST', value: -0.2, status: 'OK', timestamp: 'demo' },
    
    { id: 'I1_CONSTRUCTION', value: -2.1, status: 'OK', timestamp: 'demo' },
    { id: 'I2_CEMENT', value: -1.8, status: 'OK', timestamp: 'demo' },
    { id: 'I3_STEEL', value: 1.2, status: 'OK', timestamp: 'demo' },
    { id: 'I4_VEHICLE', value: 3.5, status: 'OK', timestamp: 'demo' },
    { id: 'I5_CARGO', value: 4.8, status: 'OK', timestamp: 'demo' },
    { id: 'I6_AIRPORT', value: 8.2, status: 'OK', timestamp: 'demo' },
    { id: 'I7_RAILROAD', value: 2.3, status: 'OK', timestamp: 'demo' },
    
    { id: 'T1_TRADE_BALANCE', value: 3.2, status: 'OK', timestamp: 'demo' },
    { id: 'T2_CURRENT_ACCOUNT', value: 2.8, status: 'OK', timestamp: 'demo' },
    { id: 'T3_FDI', value: 5.1, status: 'OK', timestamp: 'demo' },
    { id: 'T4_RESERVES', value: 1.2, status: 'OK', timestamp: 'demo' },
    { id: 'T5_SHIPPING', value: 3.8, status: 'OK', timestamp: 'demo' },
    { id: 'T6_CONTAINER', value: 4.5, status: 'OK', timestamp: 'demo' },
    
    { id: 'E1_CHINA_PMI', value: 0.5, status: 'OK', timestamp: 'demo' },
    { id: 'E2_US_PMI', value: 1.2, status: 'OK', timestamp: 'demo' },
    { id: 'E3_VIX', value: -2.3, status: 'OK', timestamp: 'demo' },
    { id: 'E4_DOLLAR_INDEX', value: 0.8, status: 'OK', timestamp: 'demo' },
    { id: 'E5_BALTIC', value: 2.1, status: 'OK', timestamp: 'demo' },
    
    { id: 'L1_UNEMPLOYMENT', value: -0.2, status: 'OK', timestamp: 'demo' },
    { id: 'L2_PARTICIPATION', value: 0.3, status: 'OK', timestamp: 'demo' },
    { id: 'L3_WAGE', value: 3.2, status: 'OK', timestamp: 'demo' },
    { id: 'L4_HOURS', value: -1.1, status: 'OK', timestamp: 'demo' },
    { id: 'L5_YOUTH_UNEMP', value: -0.5, status: 'OK', timestamp: 'demo' },
  ],
};

export const DEMO_DIAGNOSIS = {
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

export default { DEMO_LATEST, DEMO_DIAGNOSIS };
