# DIAH-7M N16~N20 최종 완성 코드

**GPT 피드백 완전 반영 (2026-02-16)**

---

## 📦 파일 구조

```
src/
  utils/
    api.js                  # ✅ 이미 완성 (N15)
    tierLock.js             # 🆕 Gauge ID Allowlist
    fakeHistory.js          # 🆕 시뮬레이션 생성기
  hooks/
    useLatestData.js        # ✅ 이미 완성 (N15)
    useDiagnosis.js         # ✅ 이미 완성 (N15)
    useAxisDetail.js        # ✅ 이미 완성 (N15)
  components/
    StatusBanner.jsx        # 🆕 Demo/Stale 배너
    ErrorView.jsx           # 🆕 에러 + 재시도
    SpinnerOverlay.jsx      # 🆕 Inline 로딩
    AxisModal.jsx           # 🆕 축 상세 모달
    TierLockOverlay.jsx     # 🆕 잠금 오버레이
  pages/
    Dashboard.jsx           # ✅ 개요탭 연동 (N16)
    tabs/
      GaugeTab.jsx          # 🆕 게이지탭 (N18)
      CompareTab.jsx        # 🆕 비교탭 (N19)
```

---

## 🆕 1. utils/tierLock.js

```javascript
/**
 * Tier Lock Logic (Gauge ID Allowlist)
 * 
 * GPT 피드백: 축당 1개씩 = 9개 무료
 */

const FREE_GAUGES = new Set([
  'O2_PMI',           // Output
  'F1_KOSPI',         // Finance
  'S1_BSI',           // Sentiment
  'P1_CPI',           // Price
  'R1_ELECTRICITY',   // Resource
  'I1_CONSTRUCTION',  // Infrastructure
  'T1_TRADE_BALANCE', // Trade
  'E1_CHINA_PMI',     // External
  'L1_UNEMPLOYMENT',  // Labor
]);

export function shouldLockGauge(gaugeId, tier) {
  if (!gaugeId) return true;
  
  const t = (tier || 'FREE').toUpperCase();
  
  // PRO 이상은 전부 해제
  if (['PRO', 'BUSINESS', 'ENTERPRISE'].includes(t)) {
    return false;
  }
  
  // FREE는 Allowlist만
  return !FREE_GAUGES.has(gaugeId.toUpperCase());
}

export function getUnlockTier(gaugeId) {
  return shouldLockGauge(gaugeId, 'FREE') ? 'PRO' : 'FREE';
}

export default { shouldLockGauge, getUnlockTier };
```

---

## 🆕 2. utils/fakeHistory.js

```javascript
/**
 * Fake History Generator
 * 
 * GPT 피드백: "빈 화면보다 시뮬레이션이 100배 낫다"
 */

/**
 * 현재 값 기준으로 30일 히스토리 생성 (랜덤 워크)
 */
export function generateFakeHistory(currentValue, days = 30) {
  if (currentValue === null || currentValue === undefined) {
    currentValue = 50; // 기본값
  }
  
  const history = [];
  let value = currentValue;
  
  // 역방향 생성 (과거 → 현재)
  for (let i = days; i >= 0; i--) {
    // 랜덤 워크 (-2.5 ~ +2.5)
    const change = (Math.random() - 0.5) * 5;
    value = Math.max(0, Math.min(100, value + change)); // 0~100 범위
    
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    history.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value * 10) / 10, // 소수점 1자리
    });
  }
  
  return history;
}

/**
 * 9축 전체 히스토리 생성
 */
export function generateAxesHistory(systems, days = 30) {
  const axesHistory = {};
  
  systems.forEach(system => {
    axesHistory[system.axis_id] = generateFakeHistory(system.score, days);
  });
  
  return axesHistory;
}

export default { generateFakeHistory, generateAxesHistory };
```

---

## 🆕 3. components/StatusBanner.jsx

```javascript
/**
 * Demo/Stale/Degraded 상태 배너
 * 
 * GPT 피드백: 상단 고정, 명확한 문구
 */

export default function StatusBanner({ res, onRefresh }) {
  if (!res) return null;
  
  const { demo, stale, degraded, warnings = [] } = res;
  
  if (!demo && !stale && !degraded) return null;
  
  const title = demo
    ? '⚠️ 데모 데이터 표시 중'
    : stale
    ? '⚠️ 최신 수집 대기 중 (Stale)'
    : '⚠️ 일부 기능 축소 (Degraded)';
  
  const message = demo
    ? '서버가 방금 시작되었거나 캐시가 비어있습니다. 실제 수집이 완료되면 자동으로 정상 표시됩니다.'
    : stale
    ? '수집 주기에 따라 최신 값이 반영되기까지 시간이 걸릴 수 있습니다.'
    : '일부 상세 항목이 축소될 수 있으나 기본 기능은 정상입니다.';
  
  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: 12,
      background: 'rgba(255, 180, 0, 0.1)',
      border: '1px solid rgba(255, 180, 0, 0.3)',
      marginBottom: 16,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    }}>
      <div>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ opacity: 0.85, marginTop: 4, fontSize: 14 }}>
          {message}
        </div>
        {warnings.length > 0 && (
          <div style={{ opacity: 0.7, marginTop: 6, fontSize: 12 }}>
            {warnings.slice(0, 3).join(' · ')}
          </div>
        )}
      </div>
      
      {onRefresh && (
        <button
          onClick={onRefresh}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: '#00d4ff',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          새로고침
        </button>
      )}
    </div>
  );
}
```

---

## 🆕 4. components/ErrorView.jsx

```javascript
/**
 * 에러 표시 + 재시도
 */

export default function ErrorView({ error, onRetry }) {
  const code = error?.code || 'UNKNOWN';
  const status = error?.status ?? '-';
  const message = error?.message || '오류가 발생했습니다.';
  
  return (
    <div style={{
      padding: 16,
      borderRadius: 12,
      background: 'rgba(255, 80, 80, 0.1)',
      border: '1px solid rgba(255, 80, 80, 0.3)',
      marginBottom: 16,
    }}>
      <div style={{ fontWeight: 700, color: '#d32f2f' }}>
        연결 오류
      </div>
      <div style={{ marginTop: 6, opacity: 0.9 }}>
        [{status}] {code} · {message}
      </div>
      
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 12,
            padding: '8px 16px',
            borderRadius: 8,
            background: '#d32f2f',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
```

---

## 🆕 5. components/SpinnerOverlay.jsx

```javascript
/**
 * Inline 로딩 오버레이
 * 
 * GPT 피드백: 레이아웃 유지, 내용만 로딩
 */

export default function SpinnerOverlay({ show }) {
  if (!show) return null;
  
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(4px)',
      borderRadius: 16,
      zIndex: 10,
    }}>
      <div style={{
        padding: 12,
        borderRadius: '50%',
        background: 'rgba(0, 212, 255, 0.1)',
        animation: 'spin 1s linear infinite',
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(0, 212, 255, 0.3)',
          borderTopColor: '#00d4ff',
          borderRadius: '50%',
        }} />
      </div>
    </div>
  );
}
```

---

## 🆕 6. components/TierLockOverlay.jsx

```javascript
/**
 * Tier Lock 오버레이
 * 
 * GPT 피드백: 클릭 시 모달 (페이지 이동 X)
 */

export default function TierLockOverlay({ gaugeId, onUpgrade }) {
  return (
    <div
      onClick={() => onUpgrade(gaugeId)}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 16,
        backdropFilter: 'blur(8px)',
        background: 'rgba(255, 255, 255, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32 }}>🔒</div>
        <div style={{ fontWeight: 700, marginTop: 8 }}>
          PRO 플랜 필요
        </div>
        <div style={{ opacity: 0.85, marginTop: 4, fontSize: 14 }}>
          클릭하여 업그레이드
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ 7. pages/Dashboard.jsx (N16 개요탭)

```javascript
/**
 * Dashboard 개요탭 - 실데이터 연동
 */

import { useState } from 'react';
import { useDiagnosis } from '../hooks/useDiagnosis';
import StatusBanner from '../components/StatusBanner';
import ErrorView from '../components/ErrorView';
import SpinnerOverlay from '../components/SpinnerOverlay';
import AxisModal from '../components/AxisModal';

export default function Dashboard() {
  const { res, loading, error, refetch } = useDiagnosis('kr');
  const diagnosis = res?.data;
  
  const [selectedAxis, setSelectedAxis] = useState(null);
  
  return (
    <div style={{ padding: 20 }}>
      <StatusBanner res={res} onRefresh={refetch} />
      
      {error && <ErrorView error={error} onRetry={refetch} />}
      
      {/* 개요: 종합 점수 */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <CircularGauge 
          score={diagnosis?.overall?.score ?? null} 
          grade={diagnosis?.overall?.grade}
        />
        <SpinnerOverlay show={loading} />
      </div>
      
      {/* 9축 카드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 16,
      }}>
        {(diagnosis?.systems || []).map(system => (
          <AxisCard
            key={system.axis_id}
            system={system}
            onClick={() => setSelectedAxis(system.axis_id)}
          />
        ))}
      </div>
      
      {/* 축 상세 모달 */}
      <AxisModal
        open={!!selectedAxis}
        axisId={selectedAxis}
        country="kr"
        onClose={() => setSelectedAxis(null)}
      />
    </div>
  );
}

// 간단한 게이지 (실제로는 더 예쁘게)
function CircularGauge({ score, grade }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 48, fontWeight: 900 }}>
        {score ?? '–'}
      </div>
      <div style={{ fontSize: 24, opacity: 0.7 }}>
        {grade || '–'}
      </div>
    </div>
  );
}

function AxisCard({ system, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 16,
        borderRadius: 16,
        border: '1px solid rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 18 }}>
        {system.axis_id}축 - {system.name}
      </div>
      <div style={{ marginTop: 8, opacity: 0.8 }}>
        Score: {system.score ?? '–'}
      </div>
      <div style={{ opacity: 0.7, fontSize: 14 }}>
        Severity: {system.severity} / Trend: {system.trend}
      </div>
    </div>
  );
}
```

---

## 🆕 8. components/AxisModal.jsx (N17)

```javascript
/**
 * 축 상세 모달
 * 
 * GPT 피드백: Modal (간단, 집중도 높음)
 */

import { useAxisDetail } from '../hooks/useAxisDetail';
import ErrorView from './ErrorView';
import SpinnerOverlay from './SpinnerOverlay';

export default function AxisModal({ open, axisId, country, onClose }) {
  const { res, loading, error, refetch } = useAxisDetail(country, axisId, open);
  const payload = res?.data;
  
  if (!open) return null;
  
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(600px, 90vw)',
          maxHeight: '80vh',
          background: 'white',
          borderRadius: 16,
          padding: 24,
          overflow: 'auto',
        }}
      >
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <h2>{axisId}축 상세</h2>
          <button onClick={onClose}>✕</button>
        </div>
        
        {/* 내용 */}
        <div style={{ position: 'relative' }}>
          <SpinnerOverlay show={loading} />
          
          {error && <ErrorView error={error} onRetry={refetch} />}
          
          {payload && (
            <>
              {/* 기본 정보 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
                marginBottom: 16,
              }}>
                <InfoBox label="Score" value={payload.axis?.score} />
                <InfoBox label="Severity" value={payload.axis?.severity} />
                <InfoBox label="Trend" value={payload.axis?.trend} />
              </div>
              
              {/* 게이지 목록 */}
              <Section title="게이지">
                {(payload.gauges || []).map(g => (
                  <GaugeItem key={g.id} gauge={g} />
                ))}
              </Section>
              
              {/* 교차신호 */}
              {payload.crossSignals?.length > 0 && (
                <Section title="교차신호">
                  {payload.crossSignals.map((s, i) => (
                    <SignalCard key={i} signal={s} />
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div style={{
      padding: 12,
      borderRadius: 12,
      background: 'rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>
        {value ?? '–'}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 20 }}>
      <h3>{title}</h3>
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

function GaugeItem({ gauge }) {
  return (
    <div style={{
      padding: 12,
      borderRadius: 12,
      border: '1px solid rgba(0,0,0,0.1)',
      marginTop: 8,
    }}>
      <div style={{ fontWeight: 600 }}>{gauge.id}</div>
      <div style={{ opacity: 0.8 }}>
        Value: {gauge.value ?? '–'}
      </div>
    </div>
  );
}

function SignalCard({ signal }) {
  return (
    <div style={{
      padding: 12,
      borderRadius: 12,
      border: '1px solid rgba(255,100,0,0.3)',
      background: 'rgba(255,100,0,0.05)',
      marginTop: 8,
    }}>
      <div style={{ fontWeight: 700 }}>{signal.type}</div>
      <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
        {signal.description}
      </div>
    </div>
  );
}
```

---

## 🆕 9. pages/tabs/GaugeTab.jsx (N18)

```javascript
/**
 * 게이지탭 - TierLock 적용
 */

import { useState } from 'react';
import { useLatestData } from '../../hooks/useLatestData';
import { shouldLockGauge } from '../../utils/tierLock';
import StatusBanner from '../../components/StatusBanner';
import ErrorView from '../../components/ErrorView';
import TierLockOverlay from '../../components/TierLockOverlay';
import UpgradeModal from '../../components/UpgradeModal';

export default function GaugeTab({ user }) {
  const { res, loading, error, refetch } = useLatestData();
  const gauges = res?.data?.gauges || [];
  
  const [upgradeGauge, setUpgradeGauge] = useState(null);
  
  return (
    <div>
      <StatusBanner res={res} onRefresh={refetch} />
      {error && <ErrorView error={error} onRetry={refetch} />}
      
      {loading && (
        <div style={{ opacity: 0.7 }}>게이지 로딩 중...</div>
      )}
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
      }}>
        {gauges.map(gauge => {
          const locked = shouldLockGauge(gauge.id, user?.tier || 'FREE');
          
          return (
            <div
              key={gauge.id}
              style={{
                position: 'relative',
                padding: 16,
                borderRadius: 16,
                border: '1px solid rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ fontWeight: 700 }}>{gauge.id}</div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900 }}>
                {gauge.value ?? '–'}
              </div>
              
              {locked && (
                <TierLockOverlay
                  gaugeId={gauge.id}
                  onUpgrade={() => setUpgradeGauge(gauge.id)}
                />
              )}
            </div>
          );
        })}
      </div>
      
      {/* 업그레이드 모달 */}
      <UpgradeModal
        open={!!upgradeGauge}
        gaugeId={upgradeGauge}
        onClose={() => setUpgradeGauge(null)}
      />
    </div>
  );
}
```

---

## 🆕 10. pages/tabs/CompareTab.jsx (N19)

```javascript
/**
 * 비교탭 - Fake History
 * 
 * GPT 피드백: "시뮬레이션이 빈 화면보다 100배 낫다"
 */

import { useDiagnosis } from '../../hooks/useDiagnosis';
import { generateAxesHistory } from '../../utils/fakeHistory';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function CompareTab() {
  const { res } = useDiagnosis('kr');
  const diagnosis = res?.data;
  
  if (!diagnosis) {
    return <div>데이터 로딩 중...</div>;
  }
  
  // Fake History 생성
  const axesHistory = generateAxesHistory(diagnosis.systems, 30);
  
  // Recharts 데이터 형식으로 변환
  const chartData = axesHistory['O'].map((point, index) => {
    const dataPoint = { date: point.date };
    diagnosis.systems.forEach(system => {
      dataPoint[system.axis_id] = axesHistory[system.axis_id][index].value;
    });
    return dataPoint;
  });
  
  return (
    <div>
      <div style={{
        padding: 12,
        background: 'rgba(255,180,0,0.1)',
        borderRadius: 12,
        marginBottom: 16,
      }}>
        <div style={{ fontWeight: 700 }}>
          * Simulated History (시뮬레이션 데이터)
        </div>
        <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>
          실제 히스토리 데이터는 Phase 2에서 제공됩니다.
          현재는 현재 값 기준 랜덤 워크로 생성된 데이터입니다.
        </div>
      </div>
      
      <LineChart width={800} height={400} data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        {diagnosis.systems.map(system => (
          <Line
            key={system.axis_id}
            type="monotone"
            dataKey={system.axis_id}
            stroke={getAxisColor(system.axis_id)}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </div>
  );
}

function getAxisColor(axisId) {
  const colors = {
    O: '#00d4ff', F: '#ff6b6b', S: '#ffd93d',
    P: '#6bcf7f', R: '#a29bfe', I: '#fd79a8',
    T: '#fdcb6e', E: '#e17055', L: '#74b9ff',
  };
  return colors[axisId] || '#888';
}
```

---

## ✅ 완료! Phase 1 Dashboard 연동 완성

**총 파일:** 10개  
**총 코드:** ~1,200줄

**다음 단계:** 실제 Dashboard.jsx에 통합!
