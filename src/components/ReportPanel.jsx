/**
 * ReportPanel — 국가 경제 진단 보고서 패널
 * ============================================
 * /api/v1/diagnosis/kr/narrative 데이터를 소비해
 * 한국어 서사 산문 + 9축 요약 + Delta를 렌더링
 */
import { useState, useEffect } from 'react';
import { L as LT } from '../theme';
import * as API from '../api';

// ── 색상 헬퍼 ──
const COLOR_MAP = {
  good: LT.good,
  warn: LT.warn,
  danger: LT.danger,
};
const col = (c) => COLOR_MAP[c] || LT.textMid;

// ── 로딩 스피너 ──
function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: `${LT.sp['4xl']}px 0`, color: LT.textDim, fontSize: LT.fs.lg }}>
      진단 보고서를 생성하는 중...
    </div>
  );
}

// ── 오류 표시 ──
function ErrorBox({ msg }) {
  return (
    <div style={{ background: `${LT.danger}10`, border: `1px solid ${LT.danger}30`, borderRadius: LT.smRadius, padding: LT.sp['3xl'], color: LT.danger, fontSize: LT.fs.lg }}>
      보고서를 불러오지 못했습니다: {msg}
    </div>
  );
}

// ── 데이터 신선도 배너 ──
function FreshnessBanner({ isDemo }) {
  if (!isDemo) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: LT.sp.md, padding: `${LT.sp.sm}px ${LT.sp.xl}px`, background: `${LT.good}10`, border: `1px solid ${LT.good}30`, borderRadius: LT.smRadius, marginBottom: LT.sp['2xl'], fontSize: LT.fs.sm, color: LT.good, fontWeight: LT.fw.semi }}>
        🟢 LIVE — 실시간 수집 데이터 기반
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: LT.sp.md, padding: `${LT.sp.sm}px ${LT.sp.xl}px`, background: `${LT.warn}10`, border: `1px solid ${LT.warn}30`, borderRadius: LT.smRadius, marginBottom: LT.sp['2xl'], fontSize: LT.fs.sm, color: LT.warn, fontWeight: LT.fw.semi }}>
      🟡 DEMO — 실시간 데이터 없음. 데모 데이터 기반 (참고용)
    </div>
  );
}

// ── 섹션1: 종합 현황 ──
function OverviewCard({ overview }) {
  const c = col(overview.color);
  return (
    <div style={{ background: LT.surface, border: `1px solid ${c}30`, borderRadius: LT.cardRadius, padding: LT.sp['3xl'], marginBottom: LT.sp['2xl'] }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: LT.sp.xl }}>
        <div style={{ fontSize: LT.fs['2xl'], fontWeight: LT.fw.extra, color: LT.text }}>
          {overview.icon} 종합 현황
        </div>
        <div style={{ display: 'flex', gap: LT.sp.md, alignItems: 'center' }}>
          <span style={{ fontSize: LT.fs['3xl'], fontWeight: LT.fw.black, fontFamily: 'monospace', color: c }}>
            {overview.score}
          </span>
          <span style={{ fontSize: LT.fs.lg, color: LT.textDim }}>/5.0</span>
          <span style={{ fontSize: LT.fs.md, padding: `2px ${LT.sp.lg}px`, borderRadius: LT.sp.lg, background: `${c}15`, color: c, fontWeight: LT.fw.semi }}>
            {overview.status}
          </span>
        </div>
      </div>
      <p style={{ fontSize: LT.fs.lg, color: LT.textMid, lineHeight: 1.8, margin: 0 }}>
        {overview.text}
      </p>
    </div>
  );
}

// ── 섹션2: 9축 진단 ──
const AXIS_ICON = { O: '⚙️', F: '💰', S: '💡', P: '🌡️', R: '⚡', I: '🏗️', T: '🚢', E: '🌍', L: '💪' };

function SystemsSection({ section }) {
  const [expanded, setExpanded] = useState(false);
  const items = section.items || [];
  const visible = expanded ? items : items.slice(0, 4);

  return (
    <div style={{ background: LT.surface, border: `1px solid ${LT.border}`, borderRadius: LT.cardRadius, padding: LT.sp['3xl'], marginBottom: LT.sp['2xl'] }}>
      <div style={{ fontSize: LT.fs.xl, fontWeight: LT.fw.bold, color: LT.text, marginBottom: LT.sp.xl }}>
        📊 9축 진단
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: LT.sp.lg }}>
        {visible.map(s => {
          const c = col(s.color);
          return (
            <div key={s.system_id} style={{ display: 'flex', alignItems: 'flex-start', gap: LT.sp.xl, padding: `${LT.sp.lg}px ${LT.sp.xl}px`, background: LT.bg2, borderRadius: LT.smRadius, border: `1px solid ${c}20` }}>
              <div style={{ flexShrink: 0, textAlign: 'center', width: 48 }}>
                <div style={{ fontSize: LT.fs.xl }}>{AXIS_ICON[s.system_id] || '📌'}</div>
                <div style={{ fontSize: LT.fs['3xl'], fontWeight: LT.fw.black, fontFamily: 'monospace', color: c, lineHeight: 1.1 }}>
                  {s.score}
                </div>
                <div style={{ fontSize: LT.fs.xs, color: LT.textDim }}>/5</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: LT.sp.md, marginBottom: LT.sp.xs }}>
                  <span style={{ fontSize: LT.fs.lg, fontWeight: LT.fw.bold, color: LT.text }}>
                    {s.body_name}
                  </span>
                  <span style={{ fontSize: LT.fs.sm, color: LT.textDim }}>({s.system_name})</span>
                  <span style={{ fontSize: LT.fs.xs, padding: `1px ${LT.sp.sm}px`, borderRadius: LT.sp.xs, background: `${c}15`, color: c, fontWeight: LT.fw.semi }}>
                    {s.icon} {s.status}
                  </span>
                </div>
                <p style={{ fontSize: LT.fs.md, color: LT.textMid, lineHeight: 1.7, margin: 0 }}>
                  {s.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {items.length > 4 && (
        <button onClick={() => setExpanded(e => !e)}
          style={{ marginTop: LT.sp.xl, fontSize: LT.fs.md, color: LT.textDim, background: 'none', border: `1px solid ${LT.border}`, borderRadius: LT.smRadius, padding: `${LT.sp.sm}px ${LT.sp.xl}px`, cursor: 'pointer' }}>
          {expanded ? '▲ 접기' : `▼ 나머지 ${items.length - 4}개 보기`}
        </button>
      )}
    </div>
  );
}

// ── 섹션3: 교차신호 ──
function CrossSection({ section }) {
  return (
    <div style={{ background: LT.surface, border: `1px solid ${section.active ? LT.warn + '40' : LT.border}`, borderRadius: LT.cardRadius, padding: LT.sp['3xl'], marginBottom: LT.sp['2xl'] }}>
      <div style={{ fontSize: LT.fs.xl, fontWeight: LT.fw.bold, color: LT.text, marginBottom: LT.sp.xl }}>
        🔗 교차신호 & 이중봉쇄
      </div>
      {!section.active ? (
        <p style={{ fontSize: LT.fs.lg, color: LT.good, margin: 0 }}>{section.text}</p>
      ) : (
        <>
          {(section.signals || []).map((sig, i) => (
            <div key={i} style={{ display: 'flex', gap: LT.sp.lg, alignItems: 'flex-start', marginBottom: LT.sp.lg, padding: `${LT.sp.lg}px ${LT.sp.xl}px`, background: `${LT.warn}08`, borderRadius: LT.smRadius, border: `1px solid ${LT.warn}20` }}>
              <span style={{ fontSize: LT.fs.xl, flexShrink: 0 }}>⚡</span>
              <p style={{ fontSize: LT.fs.md, color: LT.textMid, margin: 0, lineHeight: 1.7 }}>{sig.text}</p>
            </div>
          ))}
          {section.dualLock && (
            <div style={{ padding: `${LT.sp.lg}px ${LT.sp.xl}px`, background: `${LT.danger}08`, borderRadius: LT.smRadius, border: `1px solid ${LT.danger}20` }}>
              <span style={{ fontSize: LT.fs.lg, fontWeight: LT.fw.bold, color: LT.danger }}>🔒 이중봉쇄 감지</span>
              <p style={{ fontSize: LT.fs.md, color: LT.textMid, margin: `${LT.sp.sm}px 0 0` }}>{section.dualLock}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── 섹션4: Delta 분석 ──
function DeltaSection({ section }) {
  const gapColor = section.gap == null ? LT.textDim
    : Math.abs(section.gap) < 5 ? LT.good
    : Math.abs(section.gap) < 15 ? LT.warn
    : LT.danger;

  return (
    <div style={{ background: LT.surface, border: `1px solid ${LT.border}`, borderRadius: LT.cardRadius, padding: LT.sp['3xl'], marginBottom: LT.sp['2xl'] }}>
      <div style={{ fontSize: LT.fs.xl, fontWeight: LT.fw.bold, color: LT.text, marginBottom: LT.sp.xl }}>
        📡 Delta 분석 (위성 vs 시장)
      </div>
      {section.gap != null && (
        <div style={{ display: 'flex', gap: LT.sp['3xl'], marginBottom: LT.sp.xl, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: LT.fs.sm, color: LT.textDim, marginBottom: LT.sp.xs }}>위성 지수</div>
            <div style={{ fontSize: LT.fs['3xl'], fontWeight: LT.fw.black, fontFamily: 'monospace', color: LT.text }}>
              {section.satelliteIndex?.toFixed(1) ?? '—'}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: LT.fs.sm, color: LT.textDim, marginBottom: LT.sp.xs }}>시장 지수</div>
            <div style={{ fontSize: LT.fs['3xl'], fontWeight: LT.fw.black, fontFamily: 'monospace', color: LT.text }}>
              {section.marketIndex?.toFixed(1) ?? '—'}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: LT.fs.sm, color: LT.textDim, marginBottom: LT.sp.xs }}>괴리</div>
            <div style={{ fontSize: LT.fs['3xl'], fontWeight: LT.fw.black, fontFamily: 'monospace', color: gapColor }}>
              {section.gap >= 0 ? '+' : ''}{section.gap}
            </div>
          </div>
        </div>
      )}
      <p style={{ fontSize: LT.fs.lg, color: LT.textMid, lineHeight: 1.8, margin: 0 }}>{section.text}</p>
    </div>
  );
}

// ── 섹션5: 관찰 시그널 ──
function ActionsSection({ section }) {
  const items = (section.items || []).filter(a => a.type !== 'context');
  if (items.length === 0) return null;

  const typeColor = { observation: LT.danger, watch: LT.warn, context: LT.textDim };
  const typeLabel = { observation: '관찰', watch: '주시', context: '맥락' };

  return (
    <div style={{ background: LT.surface, border: `1px solid ${LT.border}`, borderRadius: LT.cardRadius, padding: LT.sp['3xl'], marginBottom: LT.sp['2xl'] }}>
      <div style={{ fontSize: LT.fs.xl, fontWeight: LT.fw.bold, color: LT.text, marginBottom: LT.sp.xl }}>
        🎯 관찰 시그널
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: LT.sp.lg }}>
        {items.map((a, i) => {
          const tc = typeColor[a.type] || LT.textDim;
          return (
            <div key={i} style={{ display: 'flex', gap: LT.sp.lg, alignItems: 'flex-start', padding: `${LT.sp.md}px ${LT.sp.xl}px`, background: `${tc}06`, borderRadius: LT.smRadius, borderLeft: `3px solid ${tc}` }}>
              <span style={{ fontSize: LT.fs.xs, padding: `2px ${LT.sp.sm}px`, borderRadius: LT.sp.xs, background: `${tc}15`, color: tc, fontWeight: LT.fw.semi, flexShrink: 0, marginTop: 2 }}>
                {typeLabel[a.type] || a.type}
              </span>
              <p style={{ fontSize: LT.fs.md, color: LT.textMid, margin: 0, lineHeight: 1.7 }}>{a.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 면책 조항 ──
function DisclaimerCard({ disclaimer }) {
  return (
    <div style={{ background: LT.bg2, border: `1px solid ${LT.border}`, borderRadius: LT.smRadius, padding: `${LT.sp.xl}px ${LT.sp['3xl']}px`, marginTop: LT.sp['2xl'] }}>
      <div style={{ fontSize: LT.fs.sm, color: LT.textDim, lineHeight: 1.8 }}>
        ⚠️ {disclaimer.text}
      </div>
      {disclaimer.reportId && (
        <div style={{ fontSize: LT.fs.xs, color: LT.textDim, marginTop: LT.sp.sm, fontFamily: 'monospace' }}>
          Report ID: {disclaimer.reportId} · Engine {disclaimer.engineVersion}
        </div>
      )}
    </div>
  );
}

// ── 메인 컴포넌트 ──
// entityContext: { entityType, entityName, entityCode, parentName }
// 없으면 국가(KR) 기본값
export default function ReportPanel({ lang, entityContext }) {
  const [state, setState] = useState('loading'); // loading|ok|error
  const [narrative, setNarrative] = useState(null);
  const [isDemo, setIsDemo] = useState(true);
  const [error, setError] = useState(null);

  const ctxKey = JSON.stringify(entityContext || {});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setState('loading');
        const res = await API.getNarrative('kr', entityContext || {});
        if (cancelled) return;
        if (res?.data) {
          setNarrative(res.data);
          setIsDemo(!!res.demo);
          setState('ok');
        } else {
          setState('error');
          setError('빈 응답');
        }
      } catch (e) {
        if (!cancelled) { setState('error'); setError(e.message); }
      }
    })();
    return () => { cancelled = true; };
  }, [ctxKey]); // entityContext가 바뀌면 재요청

  if (state === 'loading') return <Spinner />;
  if (state === 'error') return <ErrorBox msg={error} />;
  if (!narrative) return null;

  const { overview, sections = [], disclaimer } = narrative;
  const systemsSec = sections.find(s => s.id === 'systems');
  const crossSec = sections.find(s => s.id === 'cross');
  const deltaSec = sections.find(s => s.id === 'delta');
  const actionsSec = sections.find(s => s.id === 'actions');

  return (
    <div>
      <FreshnessBanner isDemo={isDemo} />
      {/* 헤더 — 엔티티명 동적 표시 */}
      <div style={{ marginBottom: LT.sp['2xl'] }}>
        {narrative.parent_name && (
          <div style={{ fontSize: LT.fs.md, color: LT.textDim, marginBottom: LT.sp.xs }}>
            {narrative.parent_name} &rsaquo;
          </div>
        )}
        <div style={{ fontSize: LT.fs['2xl'], fontWeight: LT.fw.extra, color: LT.text }}>
          {narrative.entity_name || narrative.country} 진단 보고서
        </div>
        <div style={{ fontSize: LT.fs.lg, color: LT.textDim, marginTop: LT.sp.xs }}>
          {narrative.date} 기준 · {narrative.entity_type === 'country' ? '국가 경제 진단' : narrative.entity_type === 'province' ? '광역 경제 진단' : '지역 지표 진단'} · DIAH-7M Engine v{narrative.engineVersion || '2.0'}
        </div>
      </div>

      {/* 종합 현황 */}
      {overview && <OverviewCard overview={overview} />}

      {/* 9축 진단 */}
      {systemsSec && <SystemsSection section={systemsSec} />}

      {/* 교차신호 */}
      {crossSec && <CrossSection section={crossSec} />}

      {/* Delta */}
      {deltaSec && <DeltaSection section={deltaSec} />}

      {/* 관찰 시그널 */}
      {actionsSec && <ActionsSection section={actionsSec} />}

      {/* 면책 조항 */}
      {disclaimer && <DisclaimerCard disclaimer={disclaimer} />}
    </div>
  );
}
