# Changelog

All notable changes to the LTVF Cloud Dashboard are documented here.

## [2.2.0] — 2026-09-25

### Added

- **Unit test suite** — Vitest 2.1.9 + jsdom; 39 tests across 4 test files, all passing
  - `classify.test.ts` — 13 tests covering `classify()` (null, boundary, LTVR thresholds) and `recomputeSummary()` (group skipping, null rate skipping, empty array, field preservation)
  - `exportToCSV.test.ts` — 7 tests covering download trigger, filename derivation, Blob creation, BOM, CSV header, comma-escaping, and quote-escaping
  - `exportToExcel.test.ts` — 7 tests covering SheetJS mock (via `vi.hoisted`), writeFile call, filename, two-sheet structure, Summary content, Detail Rows passthrough
  - `history.test.ts` — 12 tests covering `loadHistory` (empty/invalid/valid), `saveToHistory` (prepend, id, cap-at-5, persistence), `deleteFromHistory` (remove, preserve others, empty result)
- **`vitest.config.ts`** — jsdom environment, globals, `@testing-library/jest-dom` setup
- **`src/test/setup.ts`** — imports `@testing-library/jest-dom` matchers
- **Test scripts in `package.json`** — `npm test` (run once), `npm run test:watch` (interactive), `npm run test:coverage` (v8 coverage)

### Fixed (backend + deploy)

- **Upload limit raised from 10 MB → 200 MB** — `backend/main.py` `_MAX_UPLOAD_BYTES`; resolves HTTP 413 on large LTVR files (e.g. 88 MB)
- **CF memory raised from 256 MB → 1024 MB** — `backend/manifest.yml`; resolves OOM crash on large xlsx parse
- **CF push from correct directory** — `cd backend && cf push ltvf-backend`; previously pushed from repo root causing `uvicorn: command not found`



### Added

- **Keyboard shortcuts** — global `keydown` listener in `App.tsx`; `E` exports to Excel, `P` prints, `T` toggles dark/light theme. Skipped when focus is inside an input field. Button tooltips updated to show shortcut keys (`[E]`, `[P]`, `[T]`).
- **Treemap drill-down** — clicking a cell in `TreemapChart` sets `selectedSection` to the cell name and switches to the Detail Table tab. Hint text shown above the chart. `onCellClick` prop added to `TreemapChart`.
- **Custom CDM tile icon** — `frontend/public/ltvf-tile-icon.svg` (56×56, SAP-blue background with pass/warn/fail bars); `workzone/cdm.json` updated to reference it via the CF approuter URL.
- **Improved print stylesheet** (`index.css`) — added `print-color-adjust: exact` so chart colours survive PDF export; Recharts SVG text and axis ticks forced to black; AG Grid print overrides for white background/black text; replaced blunt `.dark *` reset with targeted surface selectors to avoid nuking chart fill colours.

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
