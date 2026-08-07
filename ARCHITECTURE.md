# LTVF Cloud Dashboard — Architecture

## Overview

```
Browser
  │
  ├─ Upload .xlsx  ──►  FastAPI (Render)  ──►  pandas parse  ──►  LTVFParseResult JSON
  │                                                                        │
  └─ Fetch SAP     ──►  btpApi / scheduledApi  ──────────────────────────►┘
                                                                           │
                                               React 18 + TypeScript ◄────┘
                                               (Vite / Vercel)
                                                      │
                                    CF approuter (BTP US10-003)
                          https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com
```

## Deployment Topology

| Layer | Technology | Host |
|---|---|---|
| Frontend | React 18 + TypeScript 5.4 (Vite) | Vercel |
| Backend | FastAPI + pandas | Render |
| CF approuter | SAP BTP Node.js approuter | CF US10-003 (BTP trial) |
| Work Zone tile | CDM 3.0 descriptor | `workzone/cdm.json` — admin import |

## Directory Structure

```
ltvf-dashboard/
├── frontend/                  # React app (Vite)
│   └── src/
│       ├── App.tsx            # Root; header toolbar, tab routing
│       ├── api/
│       │   ├── sapApi.ts      # uploadLTVF → POST /parse
│       │   ├── btpApi.ts      # checkSAPStatus, fetchFromSAP
│       │   ├── scheduledApi.ts# checkScheduledStatus, fetchScheduled
│       │   ├── settingsApi.ts # getSettings, saveSettings → GET/PUT /api/settings
│       │   └── resultsApi.ts  # saveResult, getResults, getResultByDate → /api/results
│       ├── components/        # SummaryCards, RateDonut, SectionChart,
│       │                      # VolumeChart, FailChart, LTVFTable,
│       │                      # FilterChips, ThresholdPanel, TreemapChart,
│       │                      # ComparePanel, UploadHistory, UploadZone,
│       │                      # SACEmbed
│       ├── hooks/
│       ├── types/
│       │   └── ltvf.ts        # LTVFRow, LTVFSummary, LTVFParseResult, ResultEntry
│       └── utils/
│           ├── history.ts     # localStorage upload history
│           └── exportToExcel.ts # SheetJS two-sheet XLSX export
├── backend/                   # FastAPI app
│   ├── main.py                # Routes → LTVFParseResult; mounts all routers
│   ├── settings.py            # SQLite threshold persistence (settings.db)
│   └── result_history.py      # SQLite result history (result_history.db)
├── approuter/                 # CF approuter (xs-app.json, package.json)
├── workzone/
│   ├── cdm.json               # CDM 3.0 tile descriptor for Work Zone admin
│   └── README.md              # Import guide
├── mta.yaml                   # MTA descriptor for CF deployment
├── render.yaml                # Render deployment config
└── docker-compose.yml         # Local full-stack dev
```

## Data Flow

1. **Upload**: `UploadZone` → `uploadLTVF(file)` → `POST /parse` → `LTVFParseResult`
2. **SAP fetch**: `fetchFromSAP()` → BTP backend → same `LTVFParseResult` shape
3. **Scheduled fetch**: `fetchScheduled()` → SharePoint file → same shape
4. **State**: `App.tsx` holds single `data: LTVFParseResult | null`; all child components receive slices as props
5. **Export**: `handleExport()` → `exportToExcel(data)` → SheetJS `XLSX.writeFile` → browser download (no server round-trip)
6. **Result history**: after each data load, `saveResult(systemTag, result)` → `POST /api/results` → `result_history.db` (fire-and-forget)

## Key Interfaces (`frontend/src/types/ltvf.ts`)

```typescript
LTVFRow       — per-test row; id, level, is_group, rate_pct, diff, equal, missing, …
LTVFSummary   — aggregates; overall_rate, pass_count, warn_count, fail_count, totals
LTVFParseResult — { filename, summary, rows[], sections[] }
ResultEntry   — summary metadata row from result_history; id, system_tag, uploaded_at, overall_rate, …
```

## Classification Logic

Thresholds are user-configurable (default pass ≥ 95%, warn ≥ 80%):
- **Pass** — `rate_pct >= pass`
- **Warn** — `rate_pct >= warn && rate_pct < pass`
- **Fail** — `rate_pct < warn`

Thresholds are persisted to a SQLite database on Render (`backend/settings.db`) via `GET/PUT /api/settings`, keyed by system tag. The frontend loads them on mount and on system-tag change (600 ms debounced PUT on every change). If the backend is unreachable, the frontend falls back to `localStorage` key `ltvf-thresholds`.
