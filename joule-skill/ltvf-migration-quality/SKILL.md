---
name: ltvf-migration-quality
description: >
  Analyze SAP CNVLTVF3 / LTVR migration test quality. Use when asked to create an LTVR
  dashboard, analyze migration test results, check pass/fail rates, review sign-off status
  (Approved/Rejected/Re-check), get stream-wise quality stats, or assess overall SAP data
  migration health. Accepts an uploaded LTVR Excel file or fetches live data from the LTVF
  Dashboard API, then produces a structured business-oriented quality dashboard.
license: Proprietary — SAP Internal Use Only
compatibility: >
  Designed for Joule Work Desktop. Python 3.9+ required for scripts/analyze_ltvr.py.
  Network access to https://ltvf-backend.cfapps.us10-003.hana.ondemand.com for live data.
metadata:
  author: hariprasad.velu@sap.com
  project: CNVLTVF3 / LTVR SAP S/4HANA Migration
  version: "2.0"
  team: SAP Migration QA
  dashboard-url: https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com
  backend-url: https://ltvf-backend.cfapps.us10-003.hana.ondemand.com
---

# LTVF / LTVR Migration Quality Skill

Analyze SAP data migration quality from LTVR Excel uploads or live SAP data.
Produces business-oriented dashboards with sign-off stats and stream breakdowns.

## Trigger keywords
"Create LTVR dashboard", "LTVR dashboard", "analyze migration quality",
"LTVF status", "which tests are failing?", "sign-off status", "stream breakdown"

---

## Step 1 — Determine data source

**A. User uploads an LTVR Excel file** → run `scripts/analyze_ltvr.py <file_path>`
**B. User wants live SAP data** → `GET /api/sap/fetch?system_tag=<tag>` on the backend
**C. Neither** → direct user to `metadata.dashboard-url`

---

## Step 2 — Detect Sign-Off presence

Check `summary.has_signoff` in the parsed result:

- **false** → Scenario 1: Generate one-page overall summary automatically.
- **true** → Scenario 2: Ask:
  > "How would you like the dashboard presented?"
  > 1. Sign-off status only (Approved/Rejected/Re-check)
  > 2. Overall match rate only
  > 3. Both sign-off + overall rate

---

## Step 3 — Generate the Dashboard

### Required KPIs (always show)
- Overall Match Rate — `summary.overall_rate`%
- Total Test Cases — `summary.total_rows`
- Data Volume — `summary.total_volume` (LTVR) or `summary.total_equal`
- Stream-wise stats — per stream: total tests, pass ≥85%, fail <85%

### Sign-off KPIs (when has_signoff = true)
- Approved: `summary.total_approved` + %
- Rejected: `summary.total_rejected` + %
- Re-check: `summary.total_recheck` + %

### Pass threshold
- LTVR (has_signoff=true): pass ≥ **85%**, fail < 85%
- LTVF/CNVLTVF3: pass ≥ **95%**, warn 80–94%, fail < 80%

---

## Dashboard Template

```
# LTVR Migration Quality Dashboard
Date: {today} | File: {filename} | System: {system_tag}

## Executive Summary
| Metric | Value |
|---|---|
| Overall Match Rate | {overall_rate}% 🟢/🟡/🔴 |
| Total Test Cases | {total_rows} |
| Data Volume | {total_volume:,} work items |
| Status | 🟢 HEALTHY / 🟡 AT RISK / 🔴 CRITICAL |

_Technical: {total_equal:,} equal records, {total_missing} missing, {total_diff} diff._

## Sign-Off Summary  [only when has_signoff]
| Status | Count | % |
|---|---|---|
| ✅ Approved | {total_approved} | {pct}% |
| ❌ Rejected | {total_rejected} | {pct}% |
| 🔄 Re-check | {total_recheck} | {pct}% |

## Stream Breakdown
| Stream | Rate | Tests | Pass(≥85%) | Fail | Approved | Rejected | Re-check |

## Top Issues (worst 10 tests)
{test_name} — {rate_pct}%  diff:{diff}  missing:{missing}  status:{so_status}

## Recommendations
- ...
```

**Status rules**: 🟢 HEALTHY = rate≥95% AND fail=0 | 🟡 AT RISK = rate≥80% or any fails | 🔴 CRITICAL = rate<80% or fail>10

---

## Exclusion Rules

1. Rows with `is_group: true` (test_name contains `>`) = stream headers, NOT individual tests
2. Tests with `(Zero Data)` in name + `equal=0` = expected zero; note separately, NOT failures
3. Use business language only: "match rate", "data quality", NOT "OOS:Src", "WI(%)", etc.
4. Do NOT display individual signer names (`signed_by`). Aggregate counts only.

---

## Running the Script (Option A — file upload)

```bash
python scripts/analyze_ltvr.py /path/to/LTVR_file.xlsx
```

Output: JSON with `summary`, `rows`, `sections`. Use as data source for Step 3.

If script unavailable, POST the file to the backend instead:
```
POST https://ltvf-backend.cfapps.us10-003.hana.ondemand.com/api/upload
Content-Type: multipart/form-data; file=<xlsx>
```

---

## Live API (Option B — no file)

Base: `https://ltvf-backend.cfapps.us10-003.hana.ondemand.com`

- `GET /api/sap/status` — BTP connectivity (`available: bool`)
- `GET /api/sap/fetch?system_tag=default` — live data → LTVFParseResult
- `GET /api/results/{system_tag}` — historical results
- `GET /api/results/{system_tag}/{date}` — result on YYYY-MM-DD

See `references/REFERENCE.md` for full schema.

