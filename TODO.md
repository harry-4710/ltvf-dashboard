# TODO — LTVF Cloud Dashboard

Last updated: 2026-08-07

## Short-Term (next sprint)

- [x] **Threshold persistence to backend** — `/api/settings` endpoint (FastAPI + SQLite), debounced PUT, localStorage fallback (v1.4.0)
- [ ] **Export CSV** — add a second export option alongside the existing Excel export (`exportToCSV.ts`)
- [ ] **Section filter persistence** — selected section chip resets on tab switch; preserve it across tab changes via `useReducer` or URL param
- [ ] **Error boundary** — wrap `<App>` in a React error boundary so a rendering crash shows a recoverable UI instead of a blank screen

## Medium-Term

- [ ] **Auth / role-based access** — add OAuth (SAP IAS or Azure AD) so the dashboard is protected behind login; map roles to read-only vs admin
- [ ] **Email alerts** — trigger an email when overall rate drops below the warn threshold after a scheduled fetch
- [ ] **Multi-file batch compare** — allow loading 2+ files side-by-side in the Compare tab instead of just two
- [x] **Unit tests** — Vitest 2.1.9 + jsdom; 39 tests across `classify.test.ts`, `exportToCSV.test.ts`, `exportToExcel.test.ts`, `history.test.ts`; run with `npm test` (v2.2.0)

## Backlog / Nice-to-Have

- [x] **CDM tile icon** — custom 56×56 SVG icon (`public/ltvf-tile-icon.svg`) for the Work Zone tile; `cdm.json` updated to reference it (v2.1.0)
- [x] **Keyboard shortcuts** — `E` to export, `P` to print, `T` to toggle theme — global `keydown` listener in `App.tsx` (v2.1.0)
- [x] **Treemap drill-down** — clicking a treemap cell now filters the Detail Table to matching rows and switches to the table tab (v2.1.0)
- [x] **Dark/light print stylesheet** — `print-color-adjust: exact`, Recharts SVG text forced black, AG Grid print overrides, selective dark reset (v2.1.0)

## Done (recent)

- [x] SAC Analytics Cloud embed, result history persistence, external REST API (v2.0.0)
- [x] Threshold persistence to backend — `/api/settings` (SQLite), debounced save, localStorage fallback (v1.4.0)
- [x] Excel export via SheetJS — `FileDown` button → `exportToExcel.ts` (v1.3.0)
- [x] SAP Build Work Zone CDM 3.0 handoff package — `workzone/cdm.json` + `workzone/README.md` (v1.2.0)
- [x] CF approuter integration — `https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com`
- [x] ARCHITECTURE.md, ROADMAP.md, CHANGELOG.md created
