# 🛰️ DIAH-7M Platform

**Satellite-Powered Economic Diagnostics**

위성이 먼저 봅니다. 59개 경제 지표 × 위성 교차검증 = 2~4주 선행 경보

> *"증권사는 실적 발표를 기다립니다. DIAH-7M은 위성으로 공장 불빛을 먼저 봅니다."*

[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black)](https://diah7m-platform.vercel.app)
[![Commits](https://img.shields.io/badge/Commits-121+-blue)]()
[![i18n](https://img.shields.io/badge/Languages-30-green)]()

---

## What is DIAH-7M?

DIAH-7M maps 59 economic indicators to 9 human body systems using the **"Human Body National Economics"** theory (인체국가경제론, ISBN 978-89-01-29340-3). Free satellite data from NASA VIIRS, Copernicus Sentinel, and Landsat provides 2-4 week lead indicators through cross-verification with economic statistics.

**Core principle:** *Measurement, not opinion. Observation, not prediction.*

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Vercel (Frontend)           Render (Backend)    │
│  ┌───────────────┐          ┌──────────────────┐│
│  │ React + Vite  │  ←API→  │ Express + SQLite  ││
│  │ 30 languages  │          │ 7 route modules   ││
│  │ Tailwind-free │          │ Core Engine       ││
│  └───────────────┘          │ Data Pipeline     ││
│                              │ Cron (06:00 KST) ││
│                              └──────────────────┘│
│                                     ↕            │
│  ┌────────────────────────────────────┐          │
│  │ Data Sources (all free)            │          │
│  │ ECOS · KOSIS · FRED · Yahoo Finance│         │
│  │ NASA VIIRS · Sentinel-5P/1 · Landsat-9       │
│  └────────────────────────────────────┘          │
└─────────────────────────────────────────────────┘
```

## Product Roadmap

| Phase | Product | Status |
|-------|---------|--------|
| **1** | National Reports — 43 countries (OECD 38 + 5) | 🟡 Frontend complete, API connected |
| **2** | Stock Satellite Monitor — 100 stocks, 276 facilities | 🟡 5-tab UI + API routes ready |
| **3** | Custom Solutions — 268 catalog services | 🔵 Catalog API ready |

## Tech Stack

**Frontend** (2,866 lines)
- React 19, Vite 7, inline CSS design system
- Dark/Light dual theme, 30 languages (agentic i18n)
- PWA manifest, Error Boundary, a11y (skip-nav, landmarks)

**Backend** (5,521 lines)
- Express, Node.js 20, SQLite/PostgreSQL
- 7 route modules: auth, diagnosis, data, admin, stock, catalog, notification
- Core engine: 5-stage diagnostic (Factor→Start→Cause→Manifestation→Result)
- Daily cron: 06:00 KST auto-collection, zero manual inputs

**Data Pipeline**
- 59 gauges from ECOS, KOSIS, FRED, Yahoo Finance
- 4 satellite sources: VIIRS DNB, Sentinel-5P, Sentinel-1, Landsat-9
- Ajv schema validation: 14/14 tests passing

## Quick Start

```bash
# Frontend
npm install
npm run dev          # http://localhost:5173

# Backend
cp .env.example .env # Add API keys
cd server && node server.js  # http://localhost:3700
```

## Project Structure

```
src/
├── pages/           # 7 pages (Landing, Auth, Dashboard, Stock, MyPage, Admin, 404)
├── components/      # 9 components (GlobeHero, Charts, TierLock, Chatbot, etc.)
├── locales/         # 30 language files (ko=SSOT → auto-generate)
├── data/            # Gauge data, stock definitions
├── api.js           # Frontend API client (27 endpoints)
├── theme.js         # Dark(T) + Light(L) design tokens
└── i18n.js          # Agentic internationalization engine

server/
├── routes/          # 7 route modules (auth/data/diagnosis/admin/stock/catalog/notification)
├── lib/             # Core engine, pipeline, DB, auth, satellite fetch
├── data/            # stock-profiles-100.js, catalog_data.js
└── server.js        # Express app, middleware, cron scheduler
```

## Key Pages

| Page | Lines | Highlights |
|------|-------|-----------|
| Stock | 472 | 5-tab detail (Diagnosis/Satellite/Flow/Signal/Market) |
| Dashboard | 285 | 43-country selector, 4-tab, 9-axis cards, alert center |
| Auth | 280 | Sign up/login/reset, password strength, terms |
| ProductMgmt | 269 | Full e-commerce: SKU, pricing, coupons, catalog |
| Landing | 224 | GlobeHero, killer stats, old-vs-new, pricing, FAQ |
| Admin | 194 | 8-tab ops dashboard (KPI, members, engine, audit) |
| MyPage | 142 | Profile, subscription, mileage history, settings |

## API Endpoints

```
Auth:          POST /auth/register, /auth/login, GET /me
Diagnosis:     POST /diagnose, GET /diagnoses, /report
Data:          GET /data/status, /data/latest, POST /data/refresh
Stock:         GET /stock/list, /:ticker, /:ticker/facilities|delta|flow|signals
Catalog:       GET /catalog/categories, /category/:id, POST /catalog/quote
Notifications: GET /notifications, /unread, PATCH /:id/read, /read-all
Admin:         GET /admin/kpi, /users, /audit, /engine
Global:        GET /global/countries, /country/:iso3, /overview
```

## Subscription Tiers

| Tier | Price | Access |
|------|-------|--------|
| Free | ₩0 | 7 gauges, 3 systems |
| Basic | ₩19,000/mo | Alerts, all 9 axes, cross signals |
| Pro | ₩49,000/mo | 59 gauges, satellite, stock monitor |
| Enterprise | ₩450,000/mo | Custom reports, API, dedicated support |

## Intellectual Property

- **Theory:** Human Body National Economics (인체국가경제론)
- **ISBN:** 978-89-01-29340-3
- **Author:** Jong-Won Yoon (윤종원)
- **Copyright:** All rights reserved © 2026

## License

Private — Unauthorized use prohibited.
