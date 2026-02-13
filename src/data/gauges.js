// DIAH-7M Tier Access + Gauge Utilities
export const TIER_ACCESS={
  FREE:{systems:['A1'],gauges:7,satTab:false,alerts:false},
  BASIC:{systems:['A1','A2','A3'],gauges:21,satTab:false,alerts:true},
  PRO:{systems:['A1','A2','A3','A4','A5','A6','A7','A8','A9'],gauges:59,satTab:true,alerts:true},
  ENTERPRISE:{systems:['A1','A2','A3','A4','A5','A6','A7','A8','A9'],gauges:59,satTab:true,alerts:true},
};
export const tierLevel=p=>p==='ENTERPRISE'?4:p==='PRO'?3:p==='BASIC'?2:1;
