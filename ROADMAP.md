# LTVF Cloud Dashboard — Roadmap

## Released

### v1.4.0 — Threshold Persistence to Backend

- Save pass/warn thresholds per system tag to SQLite via FastAPI `/api/settings` (GET + PUT)
- Debounced frontend save with silent localStorage fallback
- Restore thresholds automatically on load by system tag

### v1.3.0 — Excel Export

- Client-side `.xlsx` download via SheetJS (`exportToExcel.ts`)
- Two-sheet workbook: Summary + Detail Rows
- `FileDown` button in header toolbar

### v1.2.0 — SAP Build Work Zone Integration

- CDM 3.0 descriptor (`workzone/cdm.json`) for Fiori Launchpad tile registration
- Admin import guide (`workzone/README.md`)

### v1.1.0 — Feature Pack

- Upload history with localStorage persistence
- Side-by-side compare mode (`ComparePanel`)
- Treemap visualisation (`TreemapChart`)
- Threshold persistence (`localStorage`)
- BTP/SAP live fetch (`btpApi.ts`)
- SharePoint scheduled fetch (`scheduledApi.ts`)
- Dark/light theme toggle

### v1.0.0 — Initial Release

- Excel upload → FastAPI parse → React dashboard
- Summary cards, donut chart, section chart, fail chart, volume chart
- Detail table with section filter chips
- Print/PDF export
- Vercel + Render + CF approuter deployment

### v2.1.0 — Backlog Polish

- Keyboard shortcuts: `E` export, `P` print, `T` theme toggle (global `keydown` in `App.tsx`)
- Treemap drill-down: clicking a cell switches to the Detail Table filtered to that section
- Custom CDM tile icon: `frontend/public/ltvf-tile-icon.svg` (56×56 SVG); `workzone/cdm.json` updated
- Improved print stylesheet: `print-color-adjust: exact`, Recharts/AG Grid print overrides, targeted dark reset

### v2.0.0 — Embedded Analytics

- SAP Analytics Cloud story embed (`SACEmbed` component, `VITE_SAC_STORY_URL` env var, Analytics tab)
- Result history persistence to SQLite via `POST /api/results` (auto-save on every data load)
- External REST API: `GET /api/results/{system}` and `GET /api/results/{system}/{date}`

---

## Planned

### v1.5.0 — Auth & Role-Based Access

- CF approuter XSUAA integration for login
- Role attribute: `ltvf.viewer` (read-only) vs `ltvf.admin` (can delete history, export)
- Remove public-facing approuter endpoint

### v1.6.0 — Email Alerts

- Scheduled fetch triggers alert if overall_rate drops below configurable threshold
- Email via SAP Alert Notification Service or SMTP relay

### v1.7.0 — Multi-File Batch Compare

- Upload N files → ranked comparison table
- Delta trend line across upload timestamps
- Export multi-file comparison as XLSX
