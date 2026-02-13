import { useState, useEffect } from "react";

const A = "#00d4ff";
const S = "#8b5cf6";
const BG = "#04060e";
const SF = "#151c2e";
const BD = "#1e2a42";
const DM = "#6b7fa3";
const GN = "#10b981";
const YL = "#f59e0b";
const RD = "#ef4444";
const OG = "#f97316";

/* ── Gauge Arc ── */
function G({ v, mx, c, lb, u, sz = 62, d }) {
  const p = Math.min(v / mx, 1), r = (sz - 8) / 2, ci = 2 * Math.PI * r;
  const da = ci * .75, fi = da * p;
  return (
    <div style={{ textAlign: "center", width: sz + 4 }}>
      <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={BD} strokeWidth={3}
          strokeDasharray={`${da} ${ci}`} strokeLinecap="round" transform={`rotate(135 ${sz/2} ${sz/2})`} />
        <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={c} strokeWidth={3}
          strokeDasharray={`${fi} ${ci}`} strokeLinecap="round" transform={`rotate(135 ${sz/2} ${sz/2})`}
          style={{ transition: "stroke-dasharray 1s", filter: `drop-shadow(0 0 3px ${c}55)` }} />
        <text x={sz/2} y={sz/2-1} textAnchor="middle" fill="#fff"
          style={{ fontSize: sz > 55 ? 13 : 10, fontFamily: "monospace", fontWeight: 700 }}>
          {typeof v === "number" ? (v >= 100 ? Math.round(v) : v.toFixed(1)) : v}
        </text>
        <text x={sz/2} y={sz/2+10} textAnchor="middle" fill={DM}
          style={{ fontSize: 7, fontFamily: "monospace" }}>{u}</text>
      </svg>
      <div style={{ fontSize: 7, color: DM, marginTop: -2, fontFamily: "monospace" }}>{lb}</div>
      {d !== undefined && <div style={{ fontSize: 7, fontFamily: "monospace", marginTop: 1,
        color: d > 0 ? GN : d < 0 ? RD : DM }}>{d > 0 ? "▲" : d < 0 ? "▼" : "—"}{Math.abs(d)}%</div>}
    </div>
  );
}

/* ── Severity ── */
function Sev({ lv }) {
  const L = ["정상", "관심", "주의", "경고", "위험", "붕괴"];
  const C = [GN, "#22d3ee", YL, OG, RD, "#dc2626"];
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {[0,1,2,3,4,5].map(i => <div key={i} style={{ width: 24, height: 6, borderRadius: 2,
        background: i <= lv ? C[i] : BD, boxShadow: i <= lv ? `0 0 4px ${C[i]}44` : "none" }} />)}
      <span style={{ fontSize: 9, fontFamily: "monospace", color: C[lv], marginLeft: 4, fontWeight: 700 }}>
        Lv.{lv} {L[lv]}</span>
    </div>
  );
}

/* ── Spark ── */
function Sp({ data, c, w = 100, h = 26 }) {
  const mx = Math.max(...data), mn = Math.min(...data), rg = mx - mn || 1;
  const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h-((v-mn)/rg)*(h-4)-2}`).join(" ");
  const l = pts.split(" ").pop().split(",");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={c} strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 2px ${c}44)` }} />
      <circle cx={parseFloat(l[0])} cy={parseFloat(l[1])} r={2} fill={c} style={{ filter: `drop-shadow(0 0 3px ${c})` }} />
    </svg>
  );
}

/* ── Price Chart ── */
function PriceChart({ data, w = 300, h = 55 }) {
  const mx = Math.max(...data), mn = Math.min(...data), rg = mx - mn || 1;
  const isUp = data[data.length-1] >= data[0]; const c = isUp ? GN : RD;
  const aD = `M0,${h} ` + data.map((v, i) => `L${(i/(data.length-1))*w},${h-6-((v-mn)/rg)*(h-12)}`).join(" ") + ` L${w},${h} Z`;
  const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h-6-((v-mn)/rg)*(h-12)}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={c} stopOpacity={.2} /><stop offset="100%" stopColor={c} stopOpacity={0} />
      </linearGradient></defs>
      <path d={aD} fill="url(#pg)" />
      <polyline points={pts} fill="none" stroke={c} strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 3px ${c}44)` }} />
    </svg>
  );
}

/* ── Sat Card ── */
function SC({ n, ic, str, v, st, tm, lk }) {
  const dots = [1,2,3].map(i => <span key={i} style={{ display: "inline-block", width: 4, height: 4,
    borderRadius: 2, background: i <= str ? A : BD, marginRight: 1 }} />);
  if (lk) return (<div style={{ background: SF, border: `1px solid ${BD}`, borderRadius: 7,
    padding: "8px 10px", filter: "blur(2px)", opacity: .35 }}><div style={{ fontSize: 10, color: "#fff" }}>{ic} {n}</div></div>);
  const sc = st === "NORMAL" ? GN : st === "ELEVATED" ? YL : st === "CLOUD" ? DM : RD;
  return (
    <div style={{ background: SF, border: `1px solid ${BD}`, borderRadius: 7, padding: "8px 10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>{ic} {n}</span><span>{dots}</span></div>
      <div style={{ fontSize: 14, fontFamily: "monospace", color: A, fontWeight: 700 }}>{v}</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 7, fontFamily: "monospace", color: sc, background: `${sc}15`,
          padding: "1px 4px", borderRadius: 2 }}>{st}</span>
        <span style={{ fontSize: 7, color: DM, fontFamily: "monospace" }}>{tm}</span></div>
    </div>
  );
}

/* ── Flow Dots ── */
function FD({ stages, issue }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", padding: "2px 0" }}>
      {stages.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%",
            background: i === issue ? `${OG}30` : i < 6 ? `${GN}20` : `${A}15`,
            border: `1.5px solid ${i === issue ? OG : i < 6 ? GN : A}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 6, color: i === issue ? OG : i < 6 ? GN : A,
            fontFamily: "monospace", fontWeight: 700, flexShrink: 0 }}>
            {i === issue ? "!" : i+1}</div>
          {i < stages.length - 1 && <div style={{ width: 8, height: 1.5,
            background: i < 5 ? GN : i === issue-1 ? OG : A, flexShrink: 0 }} />}
        </div>
      ))}
    </div>
  );
}

/* ── 9축 Axis Bar — removed, inlined in diag tab ── */

/* ═══════════════════════════════════════════ */
/* ═══  MAIN  ═══ */
/* ═══════════════════════════════════════════ */
export default function DIAH7MStockV3() {
  const [tab, setTab] = useState("diag");
  const [rdy, setRdy] = useState(false);
  useEffect(() => { setTimeout(() => setRdy(true), 80); }, []);

  const priceData = [58200,58800,59100,58500,59400,60100,59800,60500,61200,60800,
    61500,62000,61300,62200,63100,62800,63500,64200,63800,64500,
    65100,64700,65500,66200,65800,66500,67100,66700,67500,68000];
  const no2Data = [4.2,4.5,4.3,4.8,5.1,4.9,5.3,5.6,5.2,5.8,6.1,5.9,6.3,6.0,5.7,
    5.5,5.8,6.2,6.5,6.3,6.1,5.9,6.4,6.7,6.5,6.8,7.0,6.8,7.2,7.1];
  const thermalData = [35.2,35.5,35.1,35.8,36.0,35.7,36.2,36.5,36.1,36.8,37.0,36.5,
    37.2,36.8,36.5,36.2,36.8,37.1,37.5,37.2,36.9,37.3,37.6,37.2,37.8,38.0,37.5,38.2,37.8,38.1];
  const flow11 = ["섹터","하역","통관","운송","입고","변환","출고","수출","선적","출항","정산"];

  const TABS = [
    { id: "diag", label: "🩺 진단" },
    { id: "market", label: "💹 시장" },
    { id: "satellite", label: "🛰️ 위성" },
    { id: "flow", label: "🔄 흐름" },
    { id: "signal", label: "📡 시그널" },
  ];

  return (
    <div style={{ background: BG, minHeight: "100vh", color: "#fff",
      fontFamily: "'Noto Sans KR', 'SF Pro Display', sans-serif",
      maxWidth: 480, margin: "0 auto", opacity: rdy ? 1 : 0, transition: "opacity .5s" }}>

      {/* ═══ HEADER ═══ */}
      <div style={{ padding: "12px 14px 0", background: `linear-gradient(180deg, ${SF}ee, ${BG})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
          <span style={{ fontSize: 9, background: `${S}25`, color: S, padding: "2px 6px", borderRadius: 3,
            fontFamily: "monospace", fontWeight: 600 }}>A 변환형</span>
          <span style={{ fontSize: 9, background: `${A}15`, color: A, padding: "2px 6px", borderRadius: 3,
            fontFamily: "monospace" }}>반도체</span>
          <span style={{ fontSize: 8, color: DM }}>🇰🇷</span>
          <div style={{ marginLeft: "auto", fontSize: 7, color: A, fontFamily: "monospace" }}>🛰️ LIVE</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -.5 }}>삼성전자</div>
            <div style={{ fontSize: 9, color: DM, fontFamily: "monospace" }}>005930.KS</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "monospace" }}>68,000</div>
            <div style={{ fontSize: 10, fontFamily: "monospace", color: RD }}>▲ 1,500 (+2.26%)</div>
          </div>
        </div>
        <div style={{ margin: "6px -4px 0", overflow: "hidden" }}>
          <PriceChart data={priceData} w={310} h={48} />
        </div>
        <div style={{ padding: "6px 0 8px" }}><Sev lv={2} /></div>
      </div>

      {/* ═══ TABS ═══ */}
      <div style={{ display: "flex", borderBottom: `1px solid ${BD}`, background: SF, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: "0 0 auto", padding: "8px 12px", border: "none", cursor: "pointer", background: "none",
            color: tab === t.id ? A : DM, fontSize: 10, fontWeight: tab === t.id ? 700 : 400,
            borderBottom: tab === t.id ? `2px solid ${A}` : "2px solid transparent",
            fontFamily: "'Noto Sans KR', sans-serif", transition: "all .3s", whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ padding: 12 }}>

        {/* ════ 진단엔진 탭 ════ */}
        {tab === "diag" && (
          <div>
            {/* DIAH Flag */}
            <div style={{
              background: `linear-gradient(135deg, ${SF}, ${S}08)`,
              borderRadius: 8, padding: 14, border: `1px solid ${S}30`, marginBottom: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 8, color: DM, fontFamily: "monospace", marginBottom: 2 }}>DIAH-7M 경제 진단</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>🇰🇷 대한민국 경제 건강</div>
                  <div style={{ fontSize: 7, color: DM, fontStyle: "italic", marginTop: 1 }}>인체국가경제론 기반 9축 진단</div>
                </div>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: `conic-gradient(${GN} 0% 62%, ${YL} 62% 78%, ${OG} 78% 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 0 12px ${GN}33`,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: SF,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexDirection: "column" }}>
                    <span style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 800, color: YL }}>62</span>
                    <span style={{ fontSize: 6, color: DM }}>/ 100</span>
                  </div>
                </div>
              </div>

              {/* Alert level */}
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {["양호", "관심", "주의", "경보", "위기"].map((l, i) => (
                  <div key={i} style={{
                    flex: 1, textAlign: "center", padding: "4px 0", borderRadius: 4,
                    background: i === 2 ? `${YL}20` : `${BD}`,
                    border: i === 2 ? `1px solid ${YL}50` : `1px solid transparent`,
                    fontSize: 8, fontFamily: "monospace",
                    color: i === 2 ? YL : DM, fontWeight: i === 2 ? 700 : 400,
                  }}>{i === 2 && "▶ "}{l}</div>
                ))}
              </div>

              {/* Diagnosis sentence */}
              <div style={{ padding: "8px 10px", borderRadius: 6, background: BG, border: `1px solid ${BD}` }}>
                <div style={{ fontSize: 10, color: "#ddd", lineHeight: 1.7 }}>
                  <span style={{ color: A, fontWeight: 700 }}>📊 경제 진단:</span> 한국 경제는 현재 <span style={{ color: YL, fontWeight: 700 }}>
                  주의 단계</span>입니다. 수출(+18.3%)은 양호하나 내수 소비(-2.1%)에 경직 신호가 감지됩니다.
                  반도체 섹터는 통화·수출·소비·환율 4개 축에 직결되어 국가 경제 건강에 높은 영향력을 가집니다.
                </div>
                <div style={{ fontSize: 8, color: DM, fontStyle: "italic", marginTop: 4, lineHeight: 1.5,
                  padding: "4px 8px", borderRadius: 4, background: `${S}08` }}>
                  🫀 인체 비유: 수출은 폐로 산소를 들이마시는 것, 내수는 위장에서 음식을 소화하는 것.
                  폐 기능은 좋으나 소화력이 떨어진 상태입니다. 반도체는 이 몸의 심장 역할을 합니다.
                </div>
              </div>
            </div>

            {/* 9-Axis Scores */}
            <div style={{ background: SF, borderRadius: 8, padding: 12, border: `1px solid ${BD}`, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600 }}>📊 9축 경제 건강도</span>
                <span style={{ fontSize: 7, color: DM, fontFamily: "monospace" }}>삼성전자 연관축 강조</span>
              </div>
              {[
                { econ: "통화·금리", body: "순환계", icon: "💰", score: 58,
                  metric: "기준금리 3.00%", metaphor: "🫀 혈압이 높아 혈류 속도 변동 중", rel: true },
                { econ: "수출·무역", body: "호흡계", icon: "🚢", score: 72,
                  metric: "수출 +18.3% YoY", metaphor: "🫁 깊은 호흡으로 산소 충분히 유입", rel: true },
                { econ: "내수·소비", body: "소화계", icon: "🛒", score: 45,
                  metric: "소매판매 -2.1%", metaphor: "🟡 소화력 저하, 영양 흡수 둔화", rel: true },
                { econ: "정책·규제", body: "신경계", icon: "🏛️", score: 65,
                  metric: "규제불확실성 중립", metaphor: "🧠 신경 전달은 정상 범위", rel: false },
                { econ: "금융안정", body: "면역계", icon: "🛡️", score: 70,
                  metric: "CDS 42bp", metaphor: "🛡️ 면역력 양호, 외부 충격 방어 가능", rel: false },
                { econ: "물가·환율", body: "내분비계", icon: "💱", score: 52,
                  metric: "CPI 2.8% / ₩1,385", metaphor: "⚗️ 호르몬 불균형 — 환율 변동성 확대", rel: true },
                { econ: "고용·산업", body: "근골격계", icon: "👷", score: 68,
                  metric: "실업률 3.2%", metaphor: "💪 근력 유지 중, 일부 피로 누적", rel: false },
                { econ: "부채·구조조정", body: "비뇨계", icon: "📉", score: 55,
                  metric: "가계부채 GDP 102%", metaphor: "🔄 노폐물 배출 지연, 순환 부담", rel: false },
                { econ: "인프라·국토", body: "구조계", icon: "🏗️", score: 74,
                  metric: "SOC투자 +5.2%", metaphor: "🦴 골격 견고, 증설 여력 충분", rel: false },
              ].map((ax, i) => (
                <div key={i} style={{
                  padding: "7px 0", borderBottom: i < 8 ? `1px solid ${BD}` : "none",
                  opacity: ax.rel ? 1 : 0.45,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, width: 20, textAlign: "center" }}>{ax.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: ax.rel ? "#fff" : DM, fontWeight: 600 }}>
                          {ax.econ}
                          <span style={{ fontSize: 7, color: DM, fontWeight: 400, marginLeft: 4 }}>({ax.body})</span>
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          {ax.rel && <span style={{ fontSize: 6, color: A, background: `${A}15`,
                            padding: "1px 3px", borderRadius: 2, fontFamily: "monospace" }}>연관</span>}
                          <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700,
                            color: ax.score >= 70 ? GN : ax.score >= 50 ? YL : ax.score >= 30 ? OG : RD }}>{ax.score}</span>
                        </div>
                      </div>
                      {/* Score bar */}
                      <div style={{ height: 3, background: BD, borderRadius: 2, marginTop: 3 }}>
                        <div style={{ height: "100%", width: `${ax.score}%`, borderRadius: 2,
                          background: ax.score >= 70 ? GN : ax.score >= 50 ? YL : ax.score >= 30 ? OG : RD,
                          transition: "width 1s" }} />
                      </div>
                      {/* Economic metric — PRIMARY */}
                      <div style={{ fontSize: 9, fontFamily: "monospace", color: ax.rel ? "#ccc" : DM, marginTop: 3 }}>
                        {ax.metric}
                      </div>
                      {/* Body metaphor — SECONDARY */}
                      <div style={{ fontSize: 7, color: DM, marginTop: 1, fontStyle: "italic" }}>
                        {ax.metaphor}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dual Blockade — National */}
            <div style={{ background: SF, borderRadius: 8, padding: 12, border: `1px solid ${BD}`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>🔒 이중봉쇄 판정</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, padding: "8px", borderRadius: 6, background: BG, textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: "#ccc", fontFamily: "monospace", fontWeight: 600 }}>자본대사 봉쇄</div>
                  <div style={{ fontSize: 6, color: DM, marginTop: 1 }}>CAM · Capital Metabolism</div>
                  <div style={{ fontSize: 20, marginTop: 4 }}>🟢</div>
                  <div style={{ fontSize: 9, color: GN, fontFamily: "monospace", fontWeight: 600 }}>정상</div>
                  <div style={{ fontSize: 7, color: "#ccc", marginTop: 2 }}>자본 유입·환전·배분 원활</div>
                  <div style={{ fontSize: 6, color: DM, fontStyle: "italic", marginTop: 1 }}>🫀 혈액 공급 정상</div>
                </div>
                <div style={{ flex: 1, padding: "8px", borderRadius: 6, background: BG, textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: "#ccc", fontFamily: "monospace", fontWeight: 600 }}>말단순환 봉쇄</div>
                  <div style={{ fontSize: 6, color: DM, marginTop: 1 }}>DLT · Distal Liquidity Trap</div>
                  <div style={{ fontSize: 20, marginTop: 4 }}>🟡</div>
                  <div style={{ fontSize: 9, color: YL, fontFamily: "monospace", fontWeight: 600 }}>주의</div>
                  <div style={{ fontSize: 7, color: "#ccc", marginTop: 2 }}>중소기업 자금 경색 감지</div>
                  <div style={{ fontSize: 6, color: DM, fontStyle: "italic", marginTop: 1 }}>🫀 말단 혈류 저하</div>
                </div>
              </div>
              <div style={{ padding: "6px 10px", borderRadius: 4, background: `${GN}08`,
                border: `1px solid ${GN}20`, textAlign: "center" }}>
                <span style={{ fontSize: 9, color: GN, fontFamily: "monospace" }}>
                  ✓ 이중봉쇄 미발동 — DLT 단독 관찰 중
                </span>
              </div>
              <div style={{ fontSize: 7, color: DM, fontStyle: "italic", marginTop: 4, textAlign: "center" }}>
                🫀 두 봉쇄가 동시 발동하면 = 심장(자본)과 사지(실물) 모두 막힌 상태
              </div>
            </div>

            {/* Stock ↔ National Connection */}
            <div style={{ background: SF, borderRadius: 8, padding: 12, border: `1px solid ${BD}`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>🔗 삼성전자 ↔ 국가경제 연결</div>
              {[
                { axis: "💰 통화·금리", indicator: "기준금리 3.00%", impact: "설비투자 비용 직결",
                  detail: "금리↑ → 팹 증설 투자 부담↑", metaphor: "혈압 상승 → 심장(팹) 부하 증가", color: YL },
                { axis: "🚢 수출·무역", indicator: "반도체 수출 +18.3%", impact: "매출의 85% 수출",
                  detail: "수출 호조 = 외화 획득 안정적", metaphor: "산소 유입 충분 → 전신 활력", color: GN },
                { axis: "🛒 내수·소비", indicator: "소매판매 -2.1%", impact: "국내 전자제품 판매",
                  detail: "내수 부진이나 수출 비중이 커 영향 제한", metaphor: "소화 둔화 → 영양분 부족이나 외부 수혈로 보완", color: YL },
                { axis: "💱 물가·환율", indicator: "원/달러 1,385원", impact: "수출 채산성",
                  detail: "원화 약세 → 수출 경쟁력↑ but 원자재↑", metaphor: "호르몬 변동 → 체온(마진) 불안정", color: YL },
              ].map((c, i) => (
                <div key={i} style={{ padding: "7px 0", borderBottom: i < 3 ? `1px solid ${BD}` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 600 }}>{c.axis}</span>
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: c.color }}>{c.indicator}</span>
                  </div>
                  <div style={{ fontSize: 9, color: "#ccc" }}>{c.impact}</div>
                  <div style={{ fontSize: 8, color: c.color, fontFamily: "monospace", marginTop: 2 }}>→ {c.detail}</div>
                  <div style={{ fontSize: 7, color: DM, fontStyle: "italic", marginTop: 1 }}>🫀 {c.metaphor}</div>
                </div>
              ))}
            </div>

            {/* 7M Stage */}
            <div style={{ background: SF, borderRadius: 8, padding: 12, border: `1px solid ${BD}`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>🩺 7M 경제위기 진행단계</div>
              <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 8, overflowX: "auto" }}>
                {[
                  "M1\n유동성\n경색",
                  "M2\n자금순환\n둔화",
                  "M3\n생산성\n저하",
                  "M4\n구조\n왜곡",
                  "M5\n부문\n부실",
                  "M6\n전이\n확산",
                  "M7\n시스템\n위기"
                ].map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center" }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%",
                      background: i === 1 ? `${YL}25` : i < 1 ? `${GN}20` : `${BD}`,
                      border: `1.5px solid ${i === 1 ? YL : i < 1 ? GN : BD}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexDirection: "column", flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 6, fontFamily: "monospace",
                        color: i === 1 ? YL : i < 1 ? GN : DM, fontWeight: 700, lineHeight: 1.1,
                        textAlign: "center", whiteSpace: "pre" }}>{m}</span>
                    </div>
                    {i < 6 && <div style={{ width: 5, height: 1.5,
                      background: i < 1 ? GN : BD, flexShrink: 0 }} />}
                  </div>
                ))}
              </div>
              <div style={{ padding: "6px 10px", borderRadius: 4, background: `${YL}10`, border: `1px solid ${YL}20` }}>
                <div style={{ fontSize: 9, color: YL, fontWeight: 600, marginBottom: 3 }}>현재: M2 자금순환 둔화 단계</div>
                <div style={{ fontSize: 8, color: "#ccc", lineHeight: 1.5 }}>
                  📊 경제: 중소기업 자금조달 비용 상승, 회사채 스프레드 확대.
                  대기업(삼성)은 직접 영향 제한적이나, 부품 협력사 납기 지연 가능성 존재.
                </div>
                <div style={{ fontSize: 7, color: DM, fontStyle: "italic", marginTop: 3, lineHeight: 1.4 }}>
                  🫀 인체 비유: 미세혈관에 침착물이 쌓여 혈류가 느려지는 단계.
                  아직 주요 장기(대기업) 기능은 정상이나, 말단(중소기업)에 산소 공급 부족.
                </div>
              </div>
            </div>

            {/* Historical Scenario Distribution */}
            <div style={{ background: SF, borderRadius: 8, padding: 12, border: `1px solid ${BD}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>📊 과거 유사 구간 후행 분포</div>
              <div style={{ fontSize: 7, color: DM, marginBottom: 8 }}>
                현재와 유사한 경제 상태(M2단계·소화계↓·호흡계↑)가 과거에 관찰된 후 어떤 경로로 전개되었는지의 분포
              </div>
              {[
                { label: "개선 경로", freq: "5/11", color: GN, icon: "🟢",
                  econ: "금리 인하 + 수출 유지 → 설비투자 확대, 자금순환 회복",
                  body: "혈압 안정 + 산소 충분 → 전신 활력 회복" },
                { label: "유지 경로", freq: "4/11", color: YL, icon: "🟡",
                  econ: "현 상태 장기 지속 → 가동률 보합, 점진 변화",
                  body: "현재 체력 유지, 뚜렷한 악화·호전 없이 경과" },
                { label: "악화 경로", freq: "2/11", color: RD, icon: "🔴",
                  econ: "DLT 심화 + 환율 급등 → 부품사 자금난, 공급 차질",
                  body: "말단 순환 악화 → 주요 장기로 부담 전이" },
              ].map((p, i) => (
                <div key={i} style={{
                  display: "flex", gap: 8, alignItems: "flex-start",
                  padding: "7px 0", borderBottom: i < 2 ? `1px solid ${BD}` : "none",
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{p.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: p.color }}>{p.label}</span>
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: p.color }}>{p.freq}회</span>
                    </div>
                    <div style={{ fontSize: 8, color: "#ccc", lineHeight: 1.5, marginTop: 2 }}>{p.econ}</div>
                    <div style={{ fontSize: 7, color: DM, fontStyle: "italic", marginTop: 1 }}>🫀 {p.body}</div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 6, color: DM, fontStyle: "italic", marginTop: 6,
                padding: "3px 6px", borderRadius: 3, background: `${RD}06`, textAlign: "center" }}>
                표본 N=11 (2015~2025). 과거 분포이며 미래 경로를 예측하지 않습니다.
              </div>
            </div>
          </div>
        )}

        {/* ════ 시장 탭 ════ */}
        {tab === "market" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 10 }}>
              {[{ l: "시가총액", v: "405.8조", s: "KRW" },{ l: "거래량", v: "27.5M", s: "주" },
                { l: "거래대금", v: "1.87조", s: "KRW" }].map((m, i) => (
                <div key={i} style={{ background: SF, borderRadius: 7, padding: "8px", border: `1px solid ${BD}`, textAlign: "center" }}>
                  <div style={{ fontSize: 7, color: DM, fontFamily: "monospace", marginBottom: 3 }}>{m.l}</div>
                  <div style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 700 }}>{m.v}</div>
                  <div style={{ fontSize: 7, color: DM }}>{m.s}</div>
                </div>
              ))}
            </div>

            {/* Valuation */}
            <div style={{ background: SF, borderRadius: 7, padding: 10, border: `1px solid ${BD}`, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 8 }}>💰 밸류에이션</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                {[{ l: "PER", v: "12.8", c: GN, d: "업종15.2" },{ l: "PBR", v: "1.42", c: A, d: "업종1.85" },
                  { l: "배당률", v: "2.1%", c: YL, d: "연간" },{ l: "ROE", v: "11.2%", c: S, d: "TTM" }].map((v, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 7, color: DM, fontFamily: "monospace" }}>{v.l}</div>
                    <div style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 700, color: v.c }}>{v.v}</div>
                    <div style={{ fontSize: 6, color: DM }}>{v.d}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical */}
            <div style={{ background: SF, borderRadius: 7, padding: 10, border: `1px solid ${BD}`, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 8 }}>📐 기술지표</div>
              <div style={{ display: "flex", gap: 10 }}>
                <G v={62.5} mx={100} c={YL} lb="RSI(14)" u="" sz={66} />
                <div style={{ flex: 1 }}>
                  {[{ l: "MA5", v: "67,120", c: GN },{ l: "MA20", v: "64,350", c: GN },
                    { l: "MA60", v: "61,800", c: GN },{ l: "MA120", v: "58,200", c: GN },
                    { l: "볼밴↑", v: "71,200", c: DM },{ l: "볼밴↓", v: "60,800", c: DM }].map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "1.5px 0",
                      borderBottom: i < 5 ? `1px solid ${BD}` : "none" }}>
                      <span style={{ fontSize: 8, color: DM, fontFamily: "monospace" }}>{r.l}</span>
                      <span style={{ fontSize: 8, fontFamily: "monospace", color: r.c }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, padding: "6px 0 0", borderTop: `1px solid ${BD}` }}>
                {[{ l: "MACD", v: "+1,240", c: GN },{ l: "Signal", v: "+980", c: GN },
                  { l: "Hist", v: "+260", c: GN },{ l: "Stoch", v: "71.2", c: YL }].map((m, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 6, color: DM, fontFamily: "monospace" }}>{m.l}</div>
                    <div style={{ fontSize: 9, fontFamily: "monospace", color: m.c, fontWeight: 600 }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Supply */}
            <div style={{ background: SF, borderRadius: 7, padding: 10, border: `1px solid ${BD}`, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 8 }}>🏦 수급</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {[{ l: "외국인", d1: "+2,340억", d5: "+8,120억", d20: "-1.2조", tr: "매수 전환" },
                  { l: "기관", d1: "-890억", d5: "+3,450억", d20: "+2.8조", tr: "연속 매수" }].map((f, i) => (
                  <div key={i} style={{ padding: "7px 8px", borderRadius: 5, background: BG, border: `1px solid ${BD}` }}>
                    <div style={{ fontSize: 9, fontWeight: 600, marginBottom: 4 }}>{f.l}</div>
                    {[{ p: "1일", v: f.d1 },{ p: "5일", v: f.d5 },{ p: "20일", v: f.d20 }].map((r, j) => (
                      <div key={j} style={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
                        <span style={{ fontSize: 7, color: DM, fontFamily: "monospace" }}>{r.p}</span>
                        <span style={{ fontSize: 8, fontFamily: "monospace",
                          color: r.v.startsWith("+") ? RD : "#3b82f6" }}>{r.v}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 7, color: A, fontFamily: "monospace", marginTop: 3,
                      background: `${A}10`, padding: "1px 4px", borderRadius: 2, textAlign: "center" }}>{f.tr}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 52w */}
            <div style={{ background: SF, borderRadius: 7, padding: 10, border: `1px solid ${BD}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 6 }}>📏 52주 범위</div>
              <div style={{ position: "relative", height: 14, background: BD, borderRadius: 7, overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%",
                  width: `${((68000-48200)/(74500-48200))*100}%`,
                  background: `linear-gradient(90deg, #3b82f6, ${A})`, borderRadius: 7 }} />
                <div style={{ position: "absolute", left: `${((68000-48200)/(74500-48200))*100}%`,
                  top: -1, width: 2, height: 16, background: "#fff", borderRadius: 1,
                  transform: "translateX(-50%)", boxShadow: "0 0 4px #fff8" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                <span style={{ fontSize: 8, fontFamily: "monospace", color: "#3b82f6" }}>48,200</span>
                <span style={{ fontSize: 8, fontFamily: "monospace", color: "#fff", fontWeight: 700 }}>68,000</span>
                <span style={{ fontSize: 8, fontFamily: "monospace", color: RD }}>74,500</span>
              </div>
            </div>
          </div>
        )}

        {/* ════ 위성 탭 ════ */}
        {tab === "satellite" && (
          <div>
            {/* Satellite gauges */}
            <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 10 }}>
              <G v={6.8} mx={10} c={A} lb="NO₂" u="×10⁻⁵" sz={58} d={12} />
              <G v={38.1} mx={50} c={OG} lb="열" u="°C" sz={58} d={3} />
              <G v={7.2} mx={10} c={S} lb="야간광" u="nW" sz={58} d={-2} />
              <G v={3.0} mx={5} c={GN} lb="SAR" u="M·m²" sz={58} d={0} />
            </div>

            {/* ═══ 위성 영상 비교 — 핵심 ═══ */}
            <div style={{ background: SF, borderRadius: 8, padding: 12, border: `1px solid ${BD}`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>🛰️ 위성 영상 비교</div>

              {/* Layer selector */}
              <div style={{ display: "flex", gap: 4, marginBottom: 10, overflowX: "auto" }}>
                {["NO₂", "열적외선", "야간광", "SAR", "광학"].map((l, i) => (
                  <button key={i} style={{
                    padding: "4px 8px", borderRadius: 4, border: `1px solid ${i === 0 ? A : BD}`,
                    background: i === 0 ? `${A}15` : "transparent",
                    color: i === 0 ? A : DM, fontSize: 9, fontFamily: "monospace",
                    cursor: "pointer", whiteSpace: "nowrap", fontWeight: i === 0 ? 600 : 400,
                  }}>{l}</button>
                ))}
              </div>

              {/* BEFORE / AFTER 비교 */}
              <div style={{ display: "flex", gap: 6 }}>
                {/* BEFORE */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8, color: DM, fontFamily: "monospace", marginBottom: 4, textAlign: "center" }}>
                    30일 전 · 2026-01-13
                  </div>
                  <div style={{
                    width: "100%", aspectRatio: "1", borderRadius: 6,
                    border: `1px solid ${BD}`, overflow: "hidden", position: "relative",
                    background: `linear-gradient(135deg, #0a1628, #0d1f3c)`,
                  }}>
                    {/* Real image placeholder - API 연결 시 <img src={url} /> 교체 */}
                    <div style={{ position: "absolute", inset: 0, display: "flex",
                      alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>🛰️</div>
                      <div style={{ fontSize: 8, color: DM, fontFamily: "monospace", textAlign: "center",
                        padding: "0 8px", lineHeight: 1.4 }}>
                        Sentinel-5P<br/>NO₂ L2<br/>수집 후 표시
                      </div>
                    </div>
                    {/* Metadata overlay */}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0,
                      padding: "4px 6px", background: "rgba(0,0,0,0.7)" }}>
                      <div style={{ fontSize: 7, fontFamily: "monospace", color: DM }}>
                        36.992°N 127.113°E · 5km
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "center", marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "#fff" }}>5.2</span>
                    <span style={{ fontSize: 8, color: DM, fontFamily: "monospace" }}> ×10⁻⁵mol</span>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{ display: "flex", alignItems: "center", flexDirection: "column",
                  justifyContent: "center", gap: 2 }}>
                  <div style={{ fontSize: 16, color: GN }}>→</div>
                  <div style={{ fontSize: 8, fontFamily: "monospace", color: GN, fontWeight: 700 }}>▲31%</div>
                </div>

                {/* AFTER (today) */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8, color: A, fontFamily: "monospace", marginBottom: 4, textAlign: "center",
                    fontWeight: 600 }}>
                    오늘 · 2026-02-12
                  </div>
                  <div style={{
                    width: "100%", aspectRatio: "1", borderRadius: 6,
                    border: `1px solid ${A}40`, overflow: "hidden", position: "relative",
                    background: `linear-gradient(135deg, #0a1628, #0d1f3c)`,
                    boxShadow: `0 0 8px ${A}15`,
                  }}>
                    <div style={{ position: "absolute", inset: 0, display: "flex",
                      alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>🛰️</div>
                      <div style={{ fontSize: 8, color: A, fontFamily: "monospace", textAlign: "center",
                        padding: "0 8px", lineHeight: 1.4 }}>
                        Sentinel-5P<br/>NO₂ L2<br/>최신 촬영분
                      </div>
                    </div>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0,
                      padding: "4px 6px", background: "rgba(0,0,0,0.7)" }}>
                      <div style={{ fontSize: 7, fontFamily: "monospace", color: A }}>
                        36.992°N 127.113°E · 5km
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "center", marginTop: 4 }}>
                    <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: A }}>6.8</span>
                    <span style={{ fontSize: 8, color: DM, fontFamily: "monospace" }}> ×10⁻⁵mol</span>
                  </div>
                </div>
              </div>

              {/* Image source — Evidence Package */}
              <div style={{ marginTop: 8, padding: "6px 8px", borderRadius: 4, background: BG,
                border: `1px solid ${BD}` }}>
                <div style={{ fontSize: 8, fontWeight: 600, color: "#ccc", marginBottom: 3 }}>📎 증거 패키지 (Evidence Package)</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  <div style={{ fontSize: 6, color: DM, fontFamily: "monospace", lineHeight: 1.5 }}>
                    출처: ESA Copernicus<br/>
                    센서: Sentinel-5P TROPOMI<br/>
                    제품: L2 NO₂ Column<br/>
                    해상도: 5.5km × 3.5km
                  </div>
                  <div style={{ fontSize: 6, color: DM, fontFamily: "monospace", lineHeight: 1.5 }}>
                    처리: 원본 무보정<br/>
                    크롭: 5km 반경<br/>
                    해시: a3f7..2e1b<br/>
                    결측: 0/30일 (완전)
                  </div>
                </div>
                {/* Quality Gate */}
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  {[
                    { label: "원본성", ok: true },
                    { label: "연속성", ok: true },
                    { label: "해상도", ok: true },
                    { label: "결측률", ok: true },
                  ].map((g, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center", padding: "2px 0", borderRadius: 2,
                      background: g.ok ? `${GN}10` : `${RD}10`,
                      border: `1px solid ${g.ok ? GN : RD}20` }}>
                      <span style={{ fontSize: 6, fontFamily: "monospace", color: g.ok ? GN : RD }}>
                        {g.ok ? "✓" : "✗"} {g.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 6, color: DM, fontFamily: "monospace", marginTop: 3, textAlign: "center" }}>
                  🔗 원본 링크: dataspace.copernicus.eu/odata/… · 검증 가능
                </div>
              </div>
            </div>

            {/* ═══ 신뢰 + 가치 — 예측 아닌 선행 신호 모니터링 ═══ */}
            <div style={{ background: SF, borderRadius: 8, padding: 12, border: `1px solid ${S}30`, marginBottom: 12 }}>
              <div style={{ textAlign: "center", fontSize: 10, color: "#ddd", lineHeight: 1.6, marginBottom: 10,
                fontWeight: 600 }}>
                "이 데이터는 통계를 해석하는 것이 아니라,<br/>
                물리를 통해 통계의 시간을 앞당깁니다."
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {/* 과거 물리 → 오늘 결과 = 신뢰 (검증) */}
                <div style={{ flex: 1, padding: "8px", borderRadius: 6, background: BG,
                  border: `1px solid ${A}25` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: A, marginBottom: 4 }}>
                    📡 과거 신호 → 오늘 결과
                  </div>
                  <div style={{ fontSize: 8, color: "#ccc", lineHeight: 1.5, marginBottom: 6 }}>
                    30일 전 NO₂ ▲31% 감지.<br/>
                    오늘 삼성전자 Q4 실적 호조 확인.
                  </div>
                  <div style={{ padding: "3px 6px", borderRadius: 3, background: `${A}10`,
                    textAlign: "center" }}>
                    <span style={{ fontSize: 8, color: A, fontFamily: "monospace", fontWeight: 700 }}>
                      "이 계기판은 정확하다" = 신뢰
                    </span>
                  </div>
                </div>

                {/* 오늘 물리 → 선행 신호 추적 = 가치 (모니터링) */}
                <div style={{ flex: 1, padding: "8px", borderRadius: 6, background: BG,
                  border: `1px solid ${YL}25` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: YL, marginBottom: 4 }}>
                    🔎 선행 신호 추적 중
                  </div>
                  <div style={{ fontSize: 8, color: "#ccc", lineHeight: 1.5, marginBottom: 6 }}>
                    NO₂ 상승 14일간 유지 중.<br/>
                    과거 유사 구간의 후행 분포 표시.
                  </div>
                  <div style={{ padding: "3px 6px", borderRadius: 3, background: `${YL}10`,
                    textAlign: "center" }}>
                    <span style={{ fontSize: 8, color: YL, fontFamily: "monospace", fontWeight: 700 }}>
                      "남보다 먼저 본다" = 가치
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ 검증 카드 (Backtest Log) ═══ */}
            <div style={{ background: SF, borderRadius: 8, padding: 12, border: `1px solid ${BD}`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8 }}>🔬 반복 검증 기록</div>
              <div style={{ fontSize: 8, color: DM, marginBottom: 8 }}>
                과거 유사 신호 발생 후 후행 이벤트 분포 (관측 사실만 표시)
              </div>
              {/* Backtest entries */}
              {[
                { signal: "NO₂ ▲20% 이상 (14일 지속)", n: 12, period: "12개월",
                  result: "후행 공시/실적 동반", hit: 9, miss: 3,
                  median: "18일", iqr: "11~28일" },
                { signal: "열적외선 ▲15% + NO₂ 동반 상승", n: 7, period: "12개월",
                  result: "가동률 상향 공시", hit: 5, miss: 2,
                  median: "22일", iqr: "14~35일" },
              ].map((b, i) => (
                <div key={i} style={{ padding: "8px", borderRadius: 5, background: BG,
                  border: `1px solid ${BD}`, marginBottom: i === 0 ? 6 : 0 }}>
                  <div style={{ fontSize: 9, color: A, fontWeight: 600, marginBottom: 4 }}>{b.signal}</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 7, color: DM }}>표본</div>
                      <div style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: "#fff" }}>
                        N={b.n} <span style={{ fontSize: 7, color: DM, fontWeight: 400 }}>({b.period})</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 7, color: DM }}>후행 동반</div>
                      <div style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: GN }}>
                        {b.hit}/{b.n}
                        <span style={{ fontSize: 7, color: DM, fontWeight: 400 }}> ({Math.round(b.hit/b.n*100)}%)</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 7, color: DM }}>리드타임</div>
                      <div style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: YL }}>
                        {b.median}
                      </div>
                      <div style={{ fontSize: 7, color: DM }}>IQR {b.iqr}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 7, color: DM, fontStyle: "italic" }}>
                    "{b.result}" 이벤트가 과거에 이 빈도로 관찰됨. 미래 반복을 보장하지 않음.
                  </div>
                </div>
              ))}
            </div>

            {/* ═══ 위성 레이어별 리드타임 분포 ═══ */}
            <div style={{ background: SF, borderRadius: 8, padding: 12, border: `1px solid ${BD}`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>⏱️ 위성 → 시장 리드타임 분포</div>
              <div style={{ fontSize: 7, color: DM, marginBottom: 8 }}>
                과거 관측에서 위성 물리 변화 후 후행 이벤트까지의 시차 (예측 아님, 역사적 분포)
              </div>
              {[
                { layer: "🟡 NO₂", median: "18일", iqr: "11~28", n: 42, desc: "가동률 변화" },
                { layer: "🔴 열적외선", median: "12일", iqr: "7~22", n: 38, desc: "생산열 변동" },
                { layer: "🟣 야간광", median: "52일", iqr: "30~85", n: 24, desc: "경제활동 추세" },
                { layer: "🔵 SAR", median: "35일", iqr: "18~56", n: 18, desc: "면적 변화" },
                { layer: "🟢 광학", median: "28일", iqr: "14~45", n: 31, desc: "시설 확장" },
                { layer: "⚪ AIS", median: "8일", iqr: "3~14", n: 55, desc: "출하량 추적" },
              ].map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8,
                  padding: "5px 0", borderBottom: i < 5 ? `1px solid ${BD}` : "none" }}>
                  <span style={{ fontSize: 9, width: 52, flexShrink: 0 }}>{l.layer}</span>
                  <div style={{ flex: 1 }}>
                    {/* Distribution bar visualization */}
                    <div style={{ position: "relative", height: 10, background: BD, borderRadius: 5 }}>
                      {/* IQR range */}
                      <div style={{ position: "absolute", height: "100%",
                        left: `${(parseInt(l.iqr) / 100) * 100}%`,
                        width: `${((parseInt(l.iqr.split("~")[1]) - parseInt(l.iqr)) / 100) * 100}%`,
                        background: `${A}30`, borderRadius: 3 }} />
                      {/* Median dot */}
                      <div style={{ position: "absolute", top: 1, width: 8, height: 8, borderRadius: 4,
                        background: A, left: `${(parseInt(l.median) / 100) * 100}%`,
                        transform: "translateX(-50%)", boxShadow: `0 0 4px ${A}66` }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 9, fontFamily: "monospace", color: A, fontWeight: 700 }}>
                      중앙 {l.median}
                    </div>
                    <div style={{ fontSize: 6, color: DM, fontFamily: "monospace" }}>
                      IQR {l.iqr}일 · N={l.n}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 6, color: DM, fontStyle: "italic", marginTop: 6 }}>
                리드타임은 과거 관측의 통계적 분포이며, 미래 시차를 보장하지 않습니다.
              </div>
            </div>

            {/* 30-day trend */}
            <div style={{ background: SF, borderRadius: 7, padding: 10, border: `1px solid ${BD}`, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 600 }}>📈 30일 추세</span>
                <span style={{ fontSize: 7, color: DM, fontFamily: "monospace" }}>01.13~02.12</span>
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                <div><div style={{ fontSize: 7, color: A, fontFamily: "monospace", marginBottom: 2 }}>NO₂</div>
                  <Sp data={no2Data} c={A} /><div style={{ fontSize: 7, color: GN, fontFamily: "monospace" }}>▲12%</div></div>
                <div><div style={{ fontSize: 7, color: OG, fontFamily: "monospace", marginBottom: 2 }}>열</div>
                  <Sp data={thermalData} c={OG} /><div style={{ fontSize: 7, color: GN, fontFamily: "monospace" }}>▲3%</div></div>
              </div>
            </div>

            {/* Satellite layer cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
              <SC n="NO₂" ic="🟡" str={3} v="6.8×10⁻⁵" st="ELEVATED" tm="2h전" />
              <SC n="열적외선" ic="🔴" str={3} v="38.1°C" st="NORMAL" tm="3h전" />
              <SC n="야간광" ic="🟣" str={2} v="7.2nW" st="NORMAL" tm="2일전" />
              <SC n="SAR" ic="🔵" str={2} v="3.01Mm²" st="NORMAL" tm="6일전" />
              <SC n="광학" ic="🟢" str={2} v="10m" st="CLOUD" tm="구름☁" />
              <SC n="AIS" ic="⚪" str={1} v="—" st="N/A" tm="" lk />
            </div>

            {/* Facilities */}
            <div style={{ background: SF, borderRadius: 7, padding: 10, border: `1px solid ${BD}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 6 }}>📍 감시 시설</div>
              {[{ n: "평택 P1/P2/P3", s: "가동", lv: 2 },{ n: "화성", s: "가동", lv: 1 },
                { n: "기흥", s: "가동", lv: 1 },{ n: "Austin TX", s: "가동", lv: 1 },
                { n: "Taylor TX", s: "건설37%", lv: 0 }].map((f, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between",
                  padding: "4px 0", borderBottom: i < 4 ? `1px solid ${BD}` : "none" }}>
                  <span style={{ fontSize: 9 }}>{f.n}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <span style={{ fontSize: 7, fontFamily: "monospace",
                      color: f.s.includes("건설") ? S : GN, background: f.s.includes("건설") ? `${S}15` : `${GN}15`,
                      padding: "1px 4px", borderRadius: 2 }}>{f.s}</span>
                    <span style={{ fontSize: 7, color: DM, fontFamily: "monospace" }}>Lv.{f.lv}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════ 흐름 탭 ════ */}
        {tab === "flow" && (
          <div>
            <div style={{ background: SF, borderRadius: 7, padding: 10, border: `1px solid ${BD}`, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 6 }}>🔄 11단계 물리 흐름</div>
              <FD stages={flow11} issue={4} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 6 }}>
                {flow11.map((s, i) => <span key={i} style={{ fontSize: 6, fontFamily: "monospace",
                  color: i === 4 ? OG : i < 6 ? GN : DM, background: i === 4 ? `${OG}15` : "transparent",
                  padding: "1px 2px", borderRadius: 2 }}>{i+1}.{s}</span>)}
              </div>
            </div>
            <div style={{ background: SF, borderRadius: 7, padding: 10, border: `1px solid ${BD}`, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 6 }}>🔒 이중봉쇄</div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, padding: "6px", borderRadius: 5, background: BG, border: `1px solid ${GN}30`, textAlign: "center" }}>
                  <div style={{ fontSize: 6, color: DM, fontFamily: "monospace" }}>INPUT</div>
                  <div style={{ fontSize: 9, color: GN, fontFamily: "monospace" }}>✓ 정상</div></div>
                <div style={{ flex: 1, padding: "6px", borderRadius: 5, background: BG, border: `1px solid ${OG}30`, textAlign: "center" }}>
                  <div style={{ fontSize: 6, color: DM, fontFamily: "monospace" }}>OUTPUT</div>
                  <div style={{ fontSize: 9, color: OG, fontFamily: "monospace" }}>⚠ 재고적체</div></div>
              </div>
            </div>
            <div style={{ padding: "8px 10px", borderRadius: 5, marginBottom: 10,
              background: `${YL}10`, border: `1px solid ${YL}30` }}>
              <div style={{ fontSize: 9, color: YL, fontWeight: 600 }}>⚡ Δ sat_up_market_flat</div>
              <div style={{ fontSize: 8, color: DM, lineHeight: 1.4, marginTop: 2 }}>위성(NO₂▲12%) vs 시장(주가▬) — 괴리 상태 추적 중</div>
            </div>
            <div style={{ background: SF, borderRadius: 7, padding: 10, border: `1px solid ${BD}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 4 }}>🏗️ Archetype A — 제조 변환형</div>
              <div style={{ fontSize: 8, color: "#ccc", lineHeight: 1.5 }}>
                원자재/부품 투입 → [공정 변환] → 완제품 산출. 핵심 측정: 투입량·가동률·산출량.
              </div>
              <div style={{ fontSize: 7, color: DM, fontStyle: "italic", marginTop: 2, lineHeight: 1.4 }}>
                🫀 소화기관이 음식→영양분 변환하듯, 팹은 웨이퍼→칩 변환. 열/NO₂는 변환의 부산물.
              </div>
            </div>
          </div>
        )}

        {/* ════ 시그널 탭 ════ */}
        {tab === "signal" && (
          <div>
            {/* Sat vs Market */}
            <div style={{ background: SF, borderRadius: 7, padding: 10, border: `1px solid ${BD}`, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 8 }}>🔀 위성 vs 시장</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                <div style={{ textAlign: "center", padding: 7, background: BG, borderRadius: 5 }}>
                  <div style={{ fontSize: 7, color: A, fontFamily: "monospace" }}>🛰️ 위성</div>
                  <div style={{ fontSize: 16, fontFamily: "monospace", fontWeight: 700, color: GN }}>▲</div>
                  <div style={{ fontSize: 8, color: DM }}>NO₂+12% 열+3%</div>
                  <div style={{ fontSize: 7, color: GN, fontFamily: "monospace" }}>가동률↑</div></div>
                <div style={{ textAlign: "center", padding: 7, background: BG, borderRadius: 5 }}>
                  <div style={{ fontSize: 7, color: S, fontFamily: "monospace" }}>📊 시장</div>
                  <div style={{ fontSize: 16, fontFamily: "monospace", fontWeight: 700, color: YL }}>▬</div>
                  <div style={{ fontSize: 8, color: DM }}>주가+2.3%</div>
                  <div style={{ fontSize: 7, color: YL, fontFamily: "monospace" }}>횡보</div></div>
              </div>
              <div style={{ marginTop: 6, padding: "4px 8px", borderRadius: 3, background: `${YL}10`,
                border: `1px solid ${YL}20`, textAlign: "center" }}>
                <span style={{ fontSize: 8, color: YL, fontFamily: "monospace" }}>괴리 감지: 유사 구간 과거 12회 중 8회 시장 후행 반응 관찰</span>
              </div>
            </div>
            {/* Observations */}
            <div style={{ background: SF, borderRadius: 7, padding: 10, border: `1px solid ${BD}`, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 8 }}>📋 관측 문장</div>
              {[
                { t: "관측", tx: "평택 NO₂가 30일 평균 대비 12% 상승. 14일간 유지 중.", tm: "2h전", c: A },
                { t: "비교", tx: "외국인 순매수 전환 시점과 NO₂ 상승 시점이 동기화됨.", tm: "3h전", c: S },
                { t: "역사", tx: "유사 패턴 과거 12회 관찰. 후행 이벤트 동반 9회(75%). N=12, 90일.", tm: "1d전", c: GN },
              ].map((s, i) => (
                <div key={i} style={{ padding: "6px 8px", marginBottom: 4, borderRadius: 4,
                  background: BG, borderLeft: `3px solid ${s.c}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
                    <span style={{ fontSize: 7, fontFamily: "monospace", fontWeight: 700, color: s.c }}>{s.t}</span>
                    <span style={{ fontSize: 6, color: DM, fontFamily: "monospace" }}>{s.tm}</span></div>
                  <div style={{ fontSize: 9, color: "#ddd", lineHeight: 1.4 }}>{s.tx}</div>
                </div>
              ))}
            </div>
            {/* Weights */}
            <div style={{ background: SF, borderRadius: 7, padding: 10, border: `1px solid ${BD}`, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 6 }}>⚖️ 가중치</div>
              {[{ n: "물리(위성)", p: 50, c: A },{ n: "시장(세력)", p: 20, c: S },
                { n: "신용", p: 10, c: YL },{ n: "공시", p: 10, c: GN },{ n: "섹터", p: 10, c: OG }].map((l, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
                    <span style={{ fontSize: 8, color: DM }}>{l.n}</span>
                    <span style={{ fontSize: 8, fontFamily: "monospace", color: l.c }}>{l.p}%</span></div>
                  <div style={{ height: 3, background: BD, borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${l.p}%`, background: l.c, borderRadius: 2 }} /></div>
                </div>
              ))}
            </div>
            {/* Confidence */}
            <div style={{ background: SF, borderRadius: 7, padding: 10, border: `1px solid ${BD}`, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontFamily: "monospace", fontWeight: 700, color: GN }}>72%</div>
                  <div style={{ fontSize: 7, color: DM }}>confidence</div></div>
                <div style={{ flex: 1, fontSize: 7, fontFamily: "monospace" }}>
                  {[{ l: "NO₂", o: true },{ l: "열", o: true },{ l: "SAR(6일전)", o: true },
                    { l: "광학(구름)", o: false },{ l: "AIS(해당없음)", o: null }].map((c, i) => (
                    <div key={i} style={{ color: c.o === null ? DM : c.o ? GN : RD, marginBottom: 1 }}>
                      {c.o === null ? "—" : c.o ? "✓" : "✗"} {c.l}</div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: "6px 8px", borderRadius: 4, background: `${RD}08`, border: `1px solid ${RD}20` }}>
              <div style={{ fontSize: 7, color: RD, fontFamily: "monospace", fontWeight: 600 }}>⚠ 관측 전용 · 예측 금지</div>
              <div style={{ fontSize: 7, color: DM, lineHeight: 1.4, marginTop: 1 }}>
                본 시스템은 관측·비교·역사 문장만 생성합니다. 전망·예상·확률·추천·매수·매도 표현은
                시스템 레벨에서 차단됩니다. 판단은 투자자의 몫입니다.</div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ BOTTOM ═══ */}
      <div style={{ position: "sticky", bottom: 0, padding: "7px 12px",
        background: `linear-gradient(0deg, ${BG}, ${BG}ee, transparent)`,
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 7, color: DM, fontFamily: "monospace" }}>2026-02-12 14:32 KST</div>
        <div style={{ fontSize: 8, color: BG, background: A, padding: "4px 10px",
          borderRadius: 4, fontWeight: 700, boxShadow: `0 0 8px ${A}44`, cursor: "pointer" }}>📊 전체 보고서</div>
      </div>
    </div>
  );
}
