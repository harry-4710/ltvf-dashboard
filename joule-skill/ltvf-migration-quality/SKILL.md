---
name: ltvf-migration-quality
description: >
  Analyze SAP CNVLTVF3 / LTVR migration test quality. Triggered when user says
  "Create LTVR dashboard" or similar. Prompts user to upload an LTVR Excel file,
  validates it, detects sign-off presence, asks user for preferred view (when
  sign-off exists), then generates a professional business-oriented dashboard
  suitable for customers and business stakeholders. Final dashboard is PDF-ready.
license: Proprietary - SAP Internal Use Only
metadata:
  author: hariprasad.velu@sap.com
  version: "3.0"
  backend-url: https://ltvf-backend.cfapps.us10-003.hana.ondemand.com
  dashboard-url: https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com
---

# LTVF / LTVR Migration Quality Skill

Business-oriented LTVR quality dashboard for customers and business stakeholders.
Minimal technical jargon. Maximum insight.

---

## Trigger Phrases

Activate when user says any of:
- "Create LTVR dashboard"
- "LTVR dashboard"
- "Analyze migration quality"
- "Migration quality report"
- "LTVF status"
- "Sign-off dashboard"
- "Check test results"

**On trigger respond:**
> "Please upload your LTVR Excel file (.xlsx) and I'll generate your migration quality dashboard."

---

## Step 1 — Parse the Uploaded File (always use backend API)

POST the file directly to the backend. Do NOT read it inline. Works for all sizes up to 200 MB.

```
POST https://ltvf-backend.cfapps.us10-003.hana.ondemand.com/api/upload
Content-Type: multipart/form-data
Body: file=<uploaded .xlsx>
```

Response JSON fields used:
- summary: overall_rate, total_rows, pass_count, fail_count, has_signoff
- summary: total_approved, total_rejected, total_recheck, total_volume, total_equal, total_missing, total_diff
- rows[]: rate_pct, so_status, is_group, test_name, section
- sections[]: stream names

Fallback only if backend unreachable: `python scripts/analyze_ltvr.py <file>`

---

## Step 2 — Detect Sign-Off

Check `summary.has_signoff`:

**false** -> Go directly to Step 3A. No question needed.

**true** -> Ask the user:
> "Your file contains sign-off data. How would you like the dashboard?"
> 1. Sign-off status (Approved / Rejected / Re-check statistics)
> 2. Overall match rate (%) only
> 3. Both sign-off status and overall match rate

Wait for selection, then proceed to the matching Step 3 section.


---

## Step 3A — No Sign-Off Dashboard (auto-generated, one page)

Focus: business outcomes and key observations. Technical details max 1 line only.

```
LTVR Migration Quality Dashboard | {filename} | {today}
-----------------------------------------------------
Overall Match Rate  {overall_rate}%  [green/yellow/red]
Total Test Cases    {total_rows}
Overall Status      HEALTHY / AT RISK / CRITICAL
Data Volume         {total_volume} work items
[1 line only] {total_equal} matching records - {total_missing} missing - {total_diff} differences
-----------------------------------------------------
STREAM PERFORMANCE
| Stream | Total Tests | Passing (>=85%) | Failing (<85%) | Match Rate |
-----------------------------------------------------
KEY OBSERVATIONS
- [Top business finding in plain language]
- [Second key finding]
- [Zero-data or deactivated note if present]
RECOMMENDATIONS
[2-4 prioritised actions with RED/YELLOW/GREEN priority]
```

---

## Step 3B — Match Rate Only (Scenario 2, option 2)

Same layout as Step 3A. Do NOT include any sign-off counts or approval statistics.

---

## Step 3C — Sign-Off Status Only (Scenario 2, option 1)

```
LTVR Sign-Off Dashboard | {filename} | {today}
-----------------------------------------------------
Total Tests    {total_rows}
Approved       {total_approved} ({a_pct}%)
Rejected       {total_rejected} ({r_pct}%)
Re-check       {total_recheck} ({rc_pct}%)
[1 line only] {total_equal} matching - {total_missing} missing - {total_volume} work items
-----------------------------------------------------
STREAM SIGN-OFF BREAKDOWN
| Stream | Total | Approved | Rejected | Re-check | Sign-Off % |
-----------------------------------------------------
RECOMMENDATIONS
[Actions focused on approval gaps and re-check resolution]
```

---

## Step 3D — Both Sign-Off + Match Rate (Scenario 2, option 3)

```
LTVR Migration Quality Dashboard | {filename} | {today}
-----------------------------------------------------
KPIs row 1: Overall Rate | Total Tests | Status | Data Volume
KPIs row 2: Approved | Rejected | Re-check
[1 line only] equal - missing - diff - volume
-----------------------------------------------------
| Stream | Tests | Pass(>=85%) | Fail | Rate% | Approved | Rejected | Re-check |
-----------------------------------------------------
KEY OBSERVATIONS | RECOMMENDATIONS
```

---

## Required Fields — Every Scenario

- **Overall Match Rate** — summary.overall_rate %
- **Total Test Cases** — summary.total_rows (leaf rows only, not group headers)
- **Data Volume** — summary.total_volume work items (use total_equal if volume=0)
- **Overall Status** — HEALTHY (>=95%, 0 fails) | AT RISK (80-94%) | CRITICAL (<80% or >10 fails)
- **Stream breakdown** — per stream: total tests, passing (>=85%), failing (<85%), match rate %
- **Technical snapshot** — max 1 line: equal records, missing, differences
- **Sign-off KPIs** — only when has_signoff=true AND user selected option 1 or 3

Pass threshold: **85%** match rate (LTVR standard)

---

## Exclusion Rules (apply BEFORE all calculations)

1. **GLOBAL PARAMETERS / FILTERS** — project-level config rows are NOT migration tests.
   Exclude entirely from all counts. Do not count as pass or fail.

2. **GROUP / HEADER ROWS** — is_group=true rows are stream section headers, not tests.
   Exclude from all counts and percentages.

3. **ZERO DATA TESTS** — "(Zero Data)" in name AND equal=0 are expected-zero scenarios.
   Note count separately (e.g. "61 tests have no source data - expected").
   Do NOT classify as failures.

4. **DEACTIVATED / MIGRATED TESTS** — labelled "Deactivated" or "Migrated" with 0% rate.
   Note separately. Do NOT classify as failures.

5. **BUSINESS LANGUAGE ONLY**
   - Use: "match rate", "missing records", "data quality", "work items", "data volume"
   - Avoid: "WI(%)", "OOS:Src", "DIFF", raw field names, "reconciliation delta"

6. **SIGNER NAMES** — never display signed_by values. Aggregate counts only.

---

## Recommendations Logic

| Condition | Priority | Business Recommendation |
|---|---|---|
| overall_rate < 80% | RED | "Immediate review required - match rate is below the 80% acceptable threshold" |
| overall_rate 80-94% | YELLOW | "Match rate approaching threshold - investigate [worst stream] before sign-off" |
| overall_rate >= 95% | GREEN | "Migration quality is healthy - proceed with sign-off review" |
| fail_count > 0 | RED | "{fail_count} streams below 85% pass threshold - root cause analysis required" |
| total_rejected > 0 | RED | "{total_rejected} tests rejected - must be resolved before go-live" |
| total_recheck > 0 | YELLOW | "{total_recheck} tests pending re-check - update sign-off status" |
| zero_data > 10% of total | BLUE | "{n} tests show no source data - confirm these are expected zero-data scenarios" |
| deactivated > 0 | BLUE | "{n} deactivated/migrated tests in scope - consider excluding from active metrics" |

---

## PDF Output

After generating the dashboard, always tell the user:
> "To save as PDF: use Print (Ctrl+P) and select Save as PDF, or use the download icon."
> "This dashboard has been saved to your LTVR Migration Quality - {filename} Space."

---

## Live API (no file - live SAP data)

Base: https://ltvf-backend.cfapps.us10-003.hana.ondemand.com

- GET /api/sap/fetch?system_tag=default  — live LTVR data -> LTVFParseResult
- GET /api/results/{system_tag}          — historical results list
- GET /api/results/{system_tag}/{date}   — result for YYYY-MM-DD

