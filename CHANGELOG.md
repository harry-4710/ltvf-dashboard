# Changelog

All notable changes to the LTVF Cloud Dashboard are documented here.

## [2.0.0] — 2026-08-07

### Added
- **SAP Analytics Cloud embed** — new Analytics tab with `SACEmbed` component; reads `VITE_SAC_STORY_URL` env var; shows a branded configuration placeholder when unset
- **Result history persistence** — every upload/fetch auto-saves the full `LTVFParseResult` to SQLite (`backend/result_history.db`) via `POST /api/results`
  - New backend module: `backend/result_history.py` — `POST /api/results`, `GET /api/results/{system}`, `GET /api/results/{system}/{date}`
  - New frontend module: `frontend/src/api/resultsApi.ts` — `saveResult`, `getResults`, `getResultByDate`
  - Save is fire-and-forget; failures are silent (doesn't interrupt the upload flow)
- **External REST API** — `GET /api/results/{system}` returns summary metadata list; `GET /api/results/{system}/{date}` returns full `LTVFParseResult` for a given day (public, no auth)
- `ResultEntry` TypeScript interface added to `frontend/src/types/ltvf.ts`
- `VITE_SAC_STORY_URL` documented in `backend/.env.example`

## [1.4.0] — 2026-08-07

### Added
- **Threshold persistence to backend** — pass/warn thresholds now saved to a SQLite database on Render via `/api/settings`
  - New backend module: `backend/settings.py` — SQLite-backed GET/PUT endpoints keyed by system tag
  - New frontend module: `frontend/src/api/settingsApi.ts` — `getSettings` / `saveSettings` via axios
  - Thresholds loaded from backend on mount and on system-tag change; 600 ms debounced PUT on every change
  - Silent fallback to `localStorage` (`ltvf-thresholds`) if backend is unreachable
  - CORS updated to allow `PUT` method

## [1.3.0] — 2026-08-07

### Added
- **Excel Export** — `FileDown` icon button in header toolbar triggers client-side XLSX download via SheetJS
  - Two-sheet workbook: `Summary` (aggregates) + `Detail Rows` (full `LTVFRow` array)
  - New utility: `frontend/src/utils/exportToExcel.ts`
  - No backend call required; runs entirely in the browser

## [1.2.0] — 2026-08-07

### Added
- **SAP Build Work Zone CDM 3.0 integration** — handoff package for Work Zone admin
  - `workzone/cdm.json`: CDM descriptor registering the dashboard as a Fiori Launchpad tile
  - `workzone/README.md`: step-by-step import guide for the Work Zone administrator
  - Tile points to CF approuter URL; no changes to the dashboard itself required

## [1.1.0] — Prior

### Added
- Upload history (localStorage) with load/delete
- Compare mode (`ComparePanel`) for diffing two LTVF exports
- Treemap visualisation (`TreemapChart`)
- Threshold persistence (`ThresholdPanel`)
- SAP BTP backend fetch (`btpApi`) and scheduled SharePoint fetch (`scheduledApi`)
- Dark / light theme toggle with `localStorage` persistence

## [1.0.0] — Initial release

### Added
- Excel upload → FastAPI parse → React dashboard
- `SummaryCards`, `RateDonut`, `SectionChart`, `VolumeChart`, `FailChart`, `LTVFTable`
- Pass / Warn / Fail classification with configurable thresholds
- Print / PDF export
- Deployment on Vercel (frontend) + Render (backend) via CF approuter
