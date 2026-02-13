# 🛰️ DIAH-7M Platform

**Satellite Economic Diagnosis System**
위성이 먼저 봅니다. 59개 경제 지표 × 위성 교차검증 = 2~4주 선행 경보

## Stack
- **Frontend**: React 19 + Vite 7
- **Styling**: Inline CSS (Dark theme, #04060e base)
- **i18n**: 28 languages built-in (0ms switch, no API)
- **Design**: DIAH-7M Design System v2.0

## Quick Start
```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # dist/ 생성
```

## Structure
```
src/
  App.jsx         # Main app (2,810 lines — monolith, refactor planned)
  main.jsx        # Vite entry point
  index.css       # Base styles
public/
  favicon.svg     # 🛰️ icon
```

## Features (v1.0 Design Demo)
- ✅ Landing page (Hero/Features/Pricing/FAQ)
- ✅ Dashboard 4-tab (Summary/59-Gauge/Satellite/Alerts)
- ✅ Stock Monitor (6 killer stocks preview)
- ✅ Admin Panel 8-tab (KPI/Members/Products/Pipeline/Billing/Engine/Audit/Settings)
- ✅ Product Management (full e-commerce: SKU/pricing/coupons/categories/stats)
- ✅ TierLock (blur + 🔒 + subscription conversion)
- ✅ Satellite Evidence Panel (8 indicators)
- ✅ 28 languages, RTL support
- ✅ Chatbot widget
- ✅ MyPage (profile/mileage/plan)

## Roadmap
- [ ] Component refactoring (split App.jsx → modules)
- [ ] Server deployment (Docker → diah7m.com)
- [ ] Real API connections (ECOS/KOSIS/NASA/Stripe)
- [ ] Stock surveillance engine (100 stocks/276 facilities)

## Architecture
```
1단계: 국가보고서 (OECD 43개국 · 진열/인프라)
2단계: 주식종목 위성감시 (100종목 · 킬러/매출)
3단계: 커스터마이징 주문제작 (268 카탈로그 · 프리미엄)
```

## License
Private — All rights reserved © 2026 Jong-Won Yoon
