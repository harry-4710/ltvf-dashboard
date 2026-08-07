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
- [ ] **Unit tests** — add Vitest tests for `exportToExcel.ts`, `history.ts`, classification logic in `SummaryCards`

## Backlog / Nice-to-Have

- [ ] **CDM tile icon** — provide a custom 56×56 PNG icon for the Work Zone tile instead of the generic `sap-icon://chart-bar`
- [ ] **Keyboard shortcuts** — `E` to export, `P` to print, `T` to toggle theme
- [ ] **Treemap drill-down** — clicking a treemap cell should filter the Detail Table to matching rows
- [ ] **Dark/light print stylesheet** — current print CSS forces white background; validate dark-mode print output

## Done (recent)

- [x] SAC Analytics Cloud embed, result history persistence, external REST API (v2.0.0)
- [x] Threshold persistence to backend — `/api/settings` (SQLite), debounced save, localStorage fallback (v1.4.0)
- [x] Excel export via SheetJS — `FileDown` button → `exportToExcel.ts` (v1.3.0)
- [x] SAP Build Work Zone CDM 3.0 handoff package — `workzone/cdm.json` + `workzone/README.md` (v1.2.0)
- [x] CF approuter integration — `https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com`
- [x] ARCHITECTURE.md, ROADMAP.md, CHANGELOG.md created
