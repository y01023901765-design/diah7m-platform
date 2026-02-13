/**
 * DIAH-7M Core Diagnosis Engine
 * ═══════════════════════════════════════════
 * 59게이지 × 9축 인체 시스템 진단
 * 교차신호 15쌍 + 이중봉쇄 판정
 */

// ── 9축 시스템 정의 ──
const SYSTEMS = {
  C: { name: '순환계(무역)', keys: ['C1','C2','C3','C4','C5'] },
  R: { name: '호흡계(산업)', keys: ['R1','R2','R3','R4','R5','R6','R7'] },
  D: { name: '소화계(소비)', keys: ['D1','D2','D3','D4','D5','D6'] },
  N: { name: '신경계(금융시장)', keys: ['N1','N2','N3','N4','N5','N6'] },
  E: { name: '내분비(재정)', keys: ['E1','E2','E3','E4','E5','E6'] },
  I: { name: '면역계(금융안정)', keys: ['I1','I2','I3','I4','I5','I6','I7','I8','I9'] },
  M: { name: '근골격(인프라)', keys: ['M1','M2','M3','M4','M5'] },
  G: { name: '감각계(대외)', keys: ['G1','G2','G3','G4','G5','G6'] },
  O: { name: '통합조절(정책)', keys: ['O1','O2','O3','O4','O5','O6'] },
};

// ── 교차신호 쌍 ──
const CROSS_SIGNALS = [
  ['C1','E1'], ['C2','I7'], ['R1','D1'], ['R3','M1'],
  ['D2','N1'], ['D4','E3'], ['N2','I1'], ['N4','G1'],
  ['E2','O1'], ['E5','G5'], ['I3','M3'], ['I8','N5'],
  ['M2','G3'], ['G4','O4'], ['O2','R5'],
];

// ── 심각도 레벨 ──
function severity(val, thresholds) {
  if (!thresholds || val == null) return 2; // 기본 보통
  const { good, warn, danger } = thresholds;
  if (danger !== undefined && val >= danger) return 4;
  if (warn !== undefined && val >= warn) return 3;
  if (good !== undefined && val <= good) return 1;
  return 2;
}

// ── 메인 진단 함수 ──
function diagnose(gaugeData, thresholds = {}) {
  const systemScores = {};
  let totalScore = 0;
  let totalCount = 0;

  // 9축별 심각도 계산
  for (const [sysKey, sys] of Object.entries(SYSTEMS)) {
    let sum = 0;
    let cnt = 0;
    for (const key of sys.keys) {
      if (gaugeData[key] !== undefined) {
        const sev = severity(gaugeData[key], thresholds[key]);
        sum += sev;
        cnt++;
      }
    }
    const avg = cnt > 0 ? sum / cnt : 2;
    systemScores[sysKey] = {
      name: sys.name,
      score: Math.round(avg * 100) / 100,
      level: avg <= 1.5 ? 1 : avg <= 2.0 ? 2 : avg <= 2.5 ? 3 : avg <= 3.0 ? 4 : 5,
      gaugeCount: cnt,
    };
    totalScore += sum;
    totalCount += cnt;
  }

  // 교차신호
  const crossSignals = [];
  for (const [a, b] of CROSS_SIGNALS) {
    if (gaugeData[a] !== undefined && gaugeData[b] !== undefined) {
      const sevA = severity(gaugeData[a], thresholds[a]);
      const sevB = severity(gaugeData[b], thresholds[b]);
      if (sevA >= 3 && sevB >= 3) {
        crossSignals.push({ pair: [a, b], severity: Math.max(sevA, sevB) });
      }
    }
  }

  // 이중봉쇄 판정
  const borderSystems = Object.values(systemScores).filter(s => s.level >= 3).length;
  const dualLock = borderSystems >= 3 && crossSignals.length >= 5;

  const overallScore = totalCount > 0 ? Math.round(totalScore / totalCount * 100) / 100 : 2;
  const overallLevel = overallScore <= 1.5 ? 1 : overallScore <= 2.0 ? 2 : overallScore <= 2.5 ? 3 : overallScore <= 3.0 ? 4 : 5;

  return {
    overall: { score: overallScore, level: overallLevel },
    systems: systemScores,
    crossSignals,
    dualLock,
    gaugeCount: totalCount,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { diagnose, SYSTEMS, CROSS_SIGNALS };
