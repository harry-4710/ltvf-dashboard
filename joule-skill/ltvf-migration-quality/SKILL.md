---
name: ltvf-migration-quality
description: >-
  Analyze SAP CNVLTVF3 / LTVR migration test quality. Use when asked to create an LTVR dashboard, analyze migration test results, check pass/fail rates, review sign-off status (Approved/Rejected/Re-check), get stream-wise quality stats, or assess overall SAP data migration health. Accepts an uploaded LTVR Excel file or fetches live data from the LTVF Dashboard API, then produces a visual card-based Space dashboard and a downloadable PDF report (HTML fallback if PDF unavailable).
metadata:
  version: "5.0"
---

# LTVF / LTVR Migration Quality Skill

Business-oriented LTVR quality dashboard for customers and business stakeholders.
Minimal technical jargon. Maximum insight. Modern visual cards.

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
- "Validate LTVR file"

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

Fallback only if backend unreachable: parse the Excel locally using openpyxl with the following logic:
- Read all rows from the first sheet
- Identify group rows (Test Name ending with ">") vs leaf test rows
- Extract sections from group row names (e.g. "3. Test cases > 2. High > 23. OBLB >" -> stream "OBLB")
- Classify leaf rows: Zero Data ("(Zero Data)" in name + equal=0), Deactivated ("Deactivated" or "Migrated" in name), Active (all others with rate > 0)
- Detect sign-off from S/O column values (Approved, Rejected, Re-check)

---

## Step 2 — Detect Sign-Off

Check `summary.has_signoff` AND the actual sign-off counts:

**No sign-off** → Go directly to Step 3A (no question needed):
- `has_signoff` is false, OR
- Sign-off column exists but all values are blank: `total_approved + total_rejected + total_recheck = 0`

**Sign-off present** → Ask the user:
> "Your file contains sign-off data. How would you like the dashboard to be presented?"
> 1. Sign-off status statistics (Approved / Rejected / Re-check counts)
> 2. Overall match rate (%) only
> 3. Both — sign-off statistics and overall match rate

Wait for selection, then proceed to the matching Step 3 section.

---

## Step 3 — Build the Space Dashboard (Visual Cards)

Create a Space named **"LTVR Migration Quality — {filename}"**.

Use visual card types for a clean, scannable dashboard. Aim for **5–7 focused cards**.

### Card Layout — All Scenarios

**Card 1 — Overall Status (size: S, hint: kpi)**
```
Metric: Overall Match Rate
Value: {overall_rate}%
Status: HEALTHY (>=95%) | AT RISK (80-94%) | CRITICAL (<80%)
```

**Card 2 — Key Metrics (size: M, hint: kpi)**
```
Total Tests: {total_rows}
Active Passing: {pass_count}/{active_tests}
Data Volume: {total_volume} records
Technical Snapshot (1 line, upper deck): {total_equal} matching · {total_missing} missing · {total_diff} differences
```

**Card 3 — Stream Match Rates (size: L, hint: chart)**
Bar chart showing match rate % per stream. Colour-code bars: green >=85%, yellow 70-84%, red <70%.

**Card 4 — Stream Performance Detail (size: L, hint: table)**
Columns: Stream | Total Tests | Active | Passing (>=85%) | Failing (<85%) | Match Rate %
Keep the table compact — no extra decoration.

**Card 5 — Observations & Recommendations (size: M, hint: text)**
Bulleted list of 2–4 key findings + prioritised actions with RED/YELLOW/GREEN/BLUE tags.

### Additional Cards for Sign-Off Scenarios

**If user selected option 1 (sign-off only) or option 3 (both):**

**Card 6 — Sign-Off Summary (size: S, hint: kpi)**
```
Approved: {total_approved}
Rejected: {total_rejected}
Re-check: {total_recheck}
```

**Card 7 — Sign-Off by Stream (size: L, hint: table)**
Columns: Stream | Total | Approved | Rejected | Re-check | Sign-Off %

### Scenario-Specific Notes

- **3A (no sign-off):** Cards 1–5 only.
- **3B (match rate only):** Cards 1–5 only. Same as 3A.
- **3C (sign-off only):** Cards 1, 2 (replace match rate focus with sign-off counts), 6, 7, 5. Skip the match rate chart (Card 3) and match rate table (Card 4).
- **3D (both):** All cards 1–7.

### Card Sizing Guide

| Card Type | Size | Hint |
|---|---|---|
| Single KPI (match rate, status) | S | kpi |
| Multi-metric KPI row | M | kpi |
| Bar chart (stream rates) | L | chart |
| Data table (stream detail) | L | table |
| Observations / recommendations | M | text |

---

## Step 4 — Generate PDF Report (ALWAYS — every scenario)

After the Space dashboard, ALWAYS generate a downloadable PDF report.

### 4a — Install the PDF library
Run as a standalone shell command (NOT inside a Python script — the outer shell has network access):
```
pip install weasyprint
```

### 4b — Generate the report
Write a wrapper script in the scratch directory and run it:
```python
import json, sys, os
# Use the absolute path to this skill's scripts/ directory
# (find it in the skill resources list in your system prompt)
skill_scripts = r"<ABSOLUTE_PATH_TO_SKILL_SCRIPTS_DIR>"
sys.path.insert(0, skill_scripts)
from generate_html_report import generate_pdf_report

with open("ltvr_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

pdf_path, html_path = generate_pdf_report(data)

if pdf_path and os.path.exists(pdf_path):
    print(f"PDF:{pdf_path}")
else:
    print(f"HTML:{html_path}")
```

Before running the wrapper, write the full parsed data dict to `ltvr_data.json` in the scratch directory.

### 4c — Confirm to the user

**If PDF succeeded:**
> "Your dashboard report has been saved as **LTVR_Migration_Quality_Report.pdf** in your Downloads folder."

**If PDF failed (weasyprint error or unavailable):**
> "The PDF could not be generated on this system. Your report has been saved as **LTVR_Migration_Quality_Report.html** — open it in any browser and use **File → Print → Save as PDF** to export a PDF copy."

---

## Required Fields — Every Scenario

- **Overall Match Rate** — summary.overall_rate %
- **Total Test Cases** — summary.total_rows (leaf rows only, not group headers)
- **Data Volume** — summary.total_volume work items (use total_equal if volume=0)
- **Overall Status** — HEALTHY (>=95%, 0 fails) | AT RISK (80-94%) | CRITICAL (<80% or >10 fails)
- **Stream breakdown** — per stream: total tests, passing (>=85%), failing (<85%), match rate %
- **Technical snapshot** — max 1 line in the upper deck (Key Metrics section): equal records, missing, differences
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