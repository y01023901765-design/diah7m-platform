/**
 * GlobalPulse — 세계경제 펄스 카드
 * ═══════════════════════════════════
 * Dashboard overview 탭 최상단에 배치
 * 세계 점수 + 대륙 요약 + 32개 공통지표 카테고리별 표시
 *
 * Props:
 *   worldData       - /api/v1/global/world 응답 (nullable)
 *   commoditiesData  - /api/v1/global/commodities 응답 (nullable)
 *   lang            - 'ko' | 'en'
 *
 * ★ 디자인 토큰 적용 (LT.fs / LT.fw / LT.sp)
 */
import { L as LT } from '../theme';
import { t } from '../i18n';

// ═══════════════════════════════════
// 대륙 메타 (아이콘 + 한/영 이름)
// ═══════════════════════════════════
const CONTINENT_META = {
  ASIA: { icon: '🌏', ko: '아시아', en: 'Asia' },
  EUR:  { icon: '🇪🇺', ko: '유럽',   en: 'Europe' },
  NAM:  { icon: '🌎', ko: '북미',   en: 'N.America' },
  SAM:  { icon: '🌎', ko: '남미',   en: 'S.America' },
  MEA:  { icon: '🌍', ko: '중동/아프리카', en: 'MEA' },
  OCE:  { icon: '🌏', ko: '오세아니아', en: 'Oceania' },
};

// ═══════════════════════════════════
// 카테고리별 지표 매핑 (인체 비유 포함)
// isInverse: true = 값 상승이 위험 (VIX, GSCPI 등)
// ═══════════════════════════════════
const CATEGORIES = [
  {
    id: 'energy', ko: '에너지', en: 'Energy', metaphor: '혈당',
    items: [
      { key: 'OIL_WTI',   label: 'WTI',   prefix: '$' },
      { key: 'OIL_BRENT', label: 'Brent', prefix: '$' },
      { key: 'NATGAS',    label: 'Gas',   prefix: '$' },
    ],
  },
  {
    id: 'metals', ko: '금속', en: 'Metals', metaphor: '칼슘/철분',
    items: [
      { key: 'GOLD',   label: 'Gold', prefix: '$', fmt: 'comma' },
      { key: 'COPPER', label: 'Cu',   prefix: '$', fmt: 'comma' },
    ],
  },
  {
    id: 'logistics', ko: '물류', en: 'Logistics', metaphor: '혈류',
    items: [
      { key: 'BDI',       label: 'BDI',       fmt: 'comma' },
      { key: 'CONTAINER', label: 'Container' },
    ],
  },
  {
    id: 'finance', ko: '금융', en: 'Finance', metaphor: '심박/혈압',
    items: [
      { key: 'VIX',   label: 'VIX',   isInverse: true },
      { key: 'SP500', label: 'S&P',   fmt: 'comma' },
      { key: 'DXY',   label: 'DXY' },
    ],
  },
  {
    id: 'bonds', ko: '채권', en: 'Bonds', metaphor: '체온/심전도',
    items: [
      { key: 'US10Y',       label: '10Y',  suffix: '%' },
      { key: 'YIELD_CURVE', label: '곡선',  suffix: '%' },
    ],
  },
  {
    id: 'currency', ko: '통화', en: 'FX', metaphor: '삼투압',
    items: [
      { key: 'EURUSD', label: 'EUR' },
      { key: 'USDJPY', label: 'JPY' },
      { key: 'USDCNY', label: 'CNY' },
    ],
  },
  {
    id: 'leading', ko: '선행', en: 'Leading', metaphor: '반사신경',
    items: [
      { key: 'PMI_US',   label: 'PMI🇺🇸' },
      { key: 'PMI_EU',   label: 'PMI🇪🇺' },
      { key: 'OECD_CLI', label: 'CLI' },
    ],
  },
  {
    id: 'stress', ko: '스트레스', en: 'Stress', metaphor: '코르티솔',
    items: [
      { key: 'GSCPI',         label: 'GSCPI',  isInverse: true },
      { key: 'CREDIT_SPREAD', label: 'HY스프레드', suffix: '%', isInverse: true },
      { key: 'STLFSI',        label: 'STLFSI', isInverse: true },
    ],
  },
];

// ═══════════════════════════════════
// 유틸
// ═══════════════════════════════════

/** 점수 → 색상 */
function scoreColor(score) {
  if (score == null) return LT.textDim;
  if (score >= 70) return LT.good;
  if (score >= 40) return LT.warn;
  return LT.danger;
}

/** 점수 → 대륙 칩 배경 tint (매우 약하게) */
function scoreTint(score) {
  if (score == null) return LT.bg2;
  if (score >= 70) return LT.good + '10';
  if (score >= 40) return LT.warn + '10';
  return LT.danger + '10';
}

/** 숫자 포맷 */
function fmtValue(val, item) {
  if (val == null || val === '.' || isNaN(val)) return '--';
  const n = Number(val);
  const str = item.fmt === 'comma'
    ? n.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : n.toFixed(n >= 100 ? 1 : 2);
  return (item.prefix || '') + str + (item.suffix || '');
}

/** delta 방향 + 색상 (isInverse 반영) */
function deltaInfo(current, prev, isInverse) {
  if (current == null || prev == null || current === prev) return null;
  const up = current > prev;
  // isInverse: 값 상승이 나쁜 지표 (VIX, GSCPI, Credit Spread 등)
  const isGood = isInverse ? !up : up;
  return {
    arrow: up ? '↑' : '↓',
    color: isGood ? LT.good : LT.danger,
  };
}

/** 경과 시간 텍스트 (다국어) */
function timeAgo(isoString, lang) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('timeJustNow', lang);
  if (mins < 60) return `${mins}${t('timeMinAgo', lang)}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}${t('timeHrAgo', lang)}`;
  return `${Math.floor(hrs / 24)}${t('timeDayAgo', lang)}`;
}

// ═══════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════

export default function GlobalPulse({ worldData, commoditiesData, lang = 'ko' }) {
  // 둘 다 없으면 전체 숨김
  if (!worldData && !commoditiesData) return null;

  const L = lang;
  const hasWorld = worldData && worldData.score != null;
  const hasCommodities = commoditiesData && commoditiesData.results;

  return (
    <div style={{
      background: LT.surface,
      borderRadius: LT.cardRadius,
      border: `1px solid ${LT.border}`,
      marginBottom: LT.sp['2xl'],
      overflow: 'hidden',
    }}>
      {/* ── 헤더 ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: `${LT.sp.md}px ${LT.sp['2xl']}px ${LT.sp.lg}px`,
        borderBottom: `1px solid ${LT.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: LT.sp.md }}>
          <span style={{ fontSize: LT.fs['2xl'] }}>🌍</span>
          <span style={{ fontSize: LT.fs.lg, fontWeight: LT.fw.extra, color: LT.text }}>
            {t('gpTitle', L)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: LT.sp.sm }}>
          {hasWorld && (
            <span style={{ fontSize: LT.fs.sm, color: LT.textDim }}>
              {timeAgo(worldData.lastUpdated, L)} {t('timeUpdated', L)}
            </span>
          )}
          <span style={{
            fontSize: LT.fs.xs, fontWeight: LT.fw.bold,
            padding: `2px ${LT.sp.sm}px`, borderRadius: LT.sp.xs,
            background: hasWorld ? LT.good + '15' : LT.textDim + '15',
            color: hasWorld ? LT.good : LT.textDim,
          }}>
            {hasWorld ? '● LIVE' : '● --'}
          </span>
        </div>
      </div>

      {/* ── 세계 점수 + 대륙 칩 ── */}
      {hasWorld && (
        <div style={{ padding: `${LT.sp.xl}px ${LT.sp['2xl']}px`, borderBottom: hasCommodities ? `1px solid ${LT.border}` : 'none' }}>
          {/* 세계 점수 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: LT.sp.xl, marginBottom: LT.sp.lg }}>
            <div>
              <div style={{ fontSize: LT.fs.xs, color: LT.textDim, fontWeight: LT.fw.semi, marginBottom: 2 }}>
                {t('gpHealthScore', L)}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: LT.sp.xs }}>
                <span style={{
                  fontSize: LT.fs['3xl'], fontWeight: LT.fw.black, fontFamily: 'monospace',
                  color: scoreColor(worldData.score),
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {worldData.score != null ? Number(worldData.score).toFixed(1) : '--'}
                </span>
                <span style={{ fontSize: LT.fs.md, color: LT.textDim }}>/ 100</span>
              </div>
            </div>
            <div style={{ fontSize: LT.fs.sm, color: LT.textDim, marginLeft: 'auto' }}>
              {worldData.memberCount || 43}{t('gpCountries', L)}
            </div>
          </div>

          {/* 대륙 칩 */}
          <div style={{
            display: 'flex', gap: LT.sp.sm, flexWrap: 'wrap',
          }}>
            {Object.entries(worldData.continents || {}).map(([code, cont]) => {
              const meta = CONTINENT_META[code] || { icon: '🌐', ko: code, en: code };
              const sc = cont.score != null ? Number(cont.score).toFixed(0) : '--';
              return (
                <button
                  key={code}
                  onClick={() => {/* Phase 2: 대륙 드릴다운 연결 */}}
                  style={{
                    display: 'flex', alignItems: 'center', gap: LT.sp.xs,
                    padding: `${LT.sp.xs}px ${LT.sp.lg}px`, borderRadius: LT.sp['3xl'],
                    border: `1px solid ${LT.border}`,
                    background: scoreTint(cont.score),
                    cursor: 'default', // Phase 2에서 pointer로 변경
                    fontSize: LT.fs.sm, fontWeight: LT.fw.semi,
                    color: LT.text,
                  }}
                >
                  <span>{meta.icon}</span>
                  <span>{meta[L] || meta.en}</span>
                  <span style={{
                    fontWeight: LT.fw.extra, fontFamily: 'monospace',
                    color: scoreColor(cont.score),
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {sc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 주요 지표 (카테고리별) ── */}
      {hasCommodities && (
        <div style={{
          padding: `${LT.sp.lg}px ${LT.sp['2xl']}px ${LT.sp.md}px`,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          <div style={{ display: 'flex', gap: LT.sp['2xl'], minWidth: 'max-content' }}>
            {CATEGORIES.map(cat => {
              // 각 카테고리의 아이템 중 데이터가 있는 것만
              const liveItems = cat.items.filter(it => {
                const r = commoditiesData.results[it.key];
                return r && r.data && r.data.length > 0;
              });
              if (liveItems.length === 0) return null;

              return (
                <div key={cat.id} style={{ minWidth: 0 }}>
                  {/* 카테고리 라벨 */}
                  <div style={{
                    fontSize: LT.fs.xs, fontWeight: LT.fw.bold, color: LT.textDim,
                    marginBottom: LT.sp.xs, whiteSpace: 'nowrap',
                  }}>
                    {cat[L] || cat.en}
                    <span style={{ opacity: 0.5, marginLeft: 3 }}>({cat.metaphor})</span>
                  </div>
                  {/* 지표값 행 */}
                  <div style={{ display: 'flex', gap: LT.sp.lg }}>
                    {liveItems.map(item => {
                      const r = commoditiesData.results[item.key];
                      const latest = r.data[0];
                      const prev = r.data.length > 1 ? r.data[1] : null;
                      const delta = deltaInfo(latest?.value, prev?.value, item.isInverse);

                      return (
                        <div key={item.key} style={{ whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontSize: LT.fs.xs, color: LT.textDim, fontWeight: LT.fw.medium,
                          }}>
                            {item.label}
                          </span>
                          <div style={{
                            fontSize: LT.fs.md, fontWeight: LT.fw.bold, fontFamily: 'monospace',
                            color: LT.text,
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {fmtValue(latest?.value, item)}
                            {delta && (
                              <span style={{
                                fontSize: LT.fs.xs, fontWeight: LT.fw.extra,
                                color: delta.color, marginLeft: 2,
                              }}>
                                {delta.arrow}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
