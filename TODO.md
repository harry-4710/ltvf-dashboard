# TODO — LTVF Cloud Dashboard

Last updated: 2026-09-29

## Short-Term (next sprint)

- [x] **Export CSV** — `exportToCSV.ts` + `FileText` button in header toolbar (done, unit-tested)
- [x] **Section filter persistence** — persisted to `localStorage` via `useEffect` in `App.tsx`
- [x] **Error boundary** — `ErrorBoundary.tsx` wraps `<App>` in `main.tsx`
- [x] **Unit tests** — Vitest 2.1.9 + jsdom; 39 tests across 4 files; `npm test` (v2.2.0)

## Medium-Term

- [ ] **Auth / role-based access** — add OAuth (SAP IAS or Azure AD) so the dashboard is protected behind login; map roles to read-only vs admin
- [ ] **Email alerts** — `backend/alerting.py` exists and is wired; needs SMTP env vars set in CF (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `ALERT_EMAIL_TO`)
- [ ] **Multi-file batch compare** — allow loading 2+ files side-by-side in the Compare tab instead of just two
- [ ] **Joule Skill — publish v3.0** — upload updated `joule-skill/ltvf-migration-quality/SKILL.md` to `https://hub.joule.only.sap/skills/ltvf-migration-quality` → Edit → Save → Publish

## Backlog / Nice-to-Have

- [x] **CDM tile icon** — custom 56×56 SVG icon (`public/ltvf-tile-icon.svg`) for the Work Zone tile (v2.1.0)
- [x] **Keyboard shortcuts** — `E` export, `P` print, `T` toggle theme (v2.1.0)
- [x] **Treemap drill-down** — clicking a treemap cell filters Detail Table (v2.1.0)
- [x] **Dark/light print stylesheet** — `print-color-adjust: exact`, chart colours preserved (v2.1.0)

## Done (recent)

- [x] Joule Skill v3.0 — SKILL.md rewritten: 4 dashboard scenarios, business language, global param exclusion, PDF output, sign-off option prompt (v2.2.0)
- [x] CI fixed — Node 20→22, package-lock.json committed, vitest run step added, TS errors resolved (v2.2.0)
- [x] Backend upload limit 10 MB → 200 MB; CF memory 256 M → 1024 M; correct cf push directory (v2.2.0)
- [x] SAC Analytics Cloud embed, result history persistence, external REST API (v2.0.0)
- [x] Threshold persistence to backend — `/api/settings` (SQLite), debounced save, localStorage fallback (v1.4.0)
- [x] Excel export via SheetJS — `FileDown` button → `exportToExcel.ts` (v1.3.0)
- [x] SAP Build Work Zone CDM 3.0 handoff package — `workzone/cdm.json` + `workzone/README.md` (v1.2.0)
- [x] CF approuter integration — `https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com`

