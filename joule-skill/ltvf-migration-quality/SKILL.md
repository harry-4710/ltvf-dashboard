---
name: ltvf-migration-quality
description: >
  Analyze SAP CNVLTVF3 migration test quality for the LTVF project. Use when asked about
  migration test results, LTVF pass/fail rates, failing test cases, section-level quality,
  threshold breaches, or SAP data migration health. Fetches live data from the LTVF Dashboard
  API and produces quality summaries, section drilldowns, and recommendations.
license: Proprietary — SAP Internal Use Only
compatibility: >
  Requires network access to LTVF Dashboard backend API.
  Primary: https://ltvf-backend.cfapps.us10-003.hana.ondemand.com
  Fallback: https://ltvf-dashboard.onrender.com
metadata:
  author: hariprasad.velu@sap.com
  project: CNVLTVF3 SAP S/4HANA Migration
  version: "1.0"
  team: SAP Migration QA
---

# LTVF Migration Quality Skill

SAP CNVLTVF3 migration test quality analysis. Fetch live data, interpret results, report.

## Activate when user asks about

LTVF test results, pass/fail rates, section quality (FI-GL, SD, MM, PP, CO),
threshold breaches, "What's failing?", "LTVF status?", quality reports, historical trends.

---

## API Reference

Base URL: `https://ltvf-backend.cfapps.us10-003.hana.ondemand.com`

- `GET /api/sap/status` — BTP connectivity check (`available: bool`)
- `GET /api/sap/fetch?system_tag=<tag>` — live SAP data → `LTVFParseResult`
- `GET /api/results/{system_tag}` — stored historical results
- `GET /api/results/{system_tag}/{date}` — result for YYYY-MM-DD
- `GET /api/settings/{system_tag}` — configured thresholds

See `references/REFERENCE.md` for full details.

---

## Workflows

### 1. Current quality summary

1. `GET /api/sap/status` — if `available:false` tell user SAP not connected.
2. `GET /api/sap/fetch?system_tag=default`
3. Report: `overall_rate`%, `pass_count`/`warn_count`/`fail_count`, top 5 failing sections,
   worst 5 individual tests (sort `is_group:false` rows by `rate_pct` asc).

### 2. Section drilldown

Fetch data, filter `rows` by `full_path.startsWith(section)`, sort by `rate_pct` asc.
Mark: ❌ `<80%`  ⚠️ `80-94%`  ✅ `>=95%`

### 3. Historical trend

`GET /api/results/{system_tag}` — show `uploaded_at`, `overall_rate`, counts per entry.
Flag if latest is 2+ points worse than previous.

### 4. Quality report

```
# LTVF Migration Quality Report
Date: {today} | System: {system_tag}

## Summary
Rate: {overall_rate}%  ✅{pass} / ⚠️{warn} / ❌{fail}  Total: {total_rows}
Status: 🟢 HEALTHY / 🟡 AT RISK / 🔴 CRITICAL

## Top 10 Failing Tests
{test_name} — {rate_pct}%  diff:{diff}  missing:{missing}

## Section Breakdown
| Section | Rate | Pass | Warn | Fail |

## Recommendations
- ...
```

---

## Data Schema

`LTVFParseResult`: `filename`, `summary`, `rows[]`, `sections[]`

`LTVFSummary`: `overall_rate`, `total_equal`, `total_diff`, `total_missing`,
`total_unexpected`, `total_source`, `total_target`, `total_rows`,
`pass_count`, `warn_count`, `fail_count`

`LTVFRow`: `id`, `parent_id`, `level`, `test_name`, `full_path`, `is_group`,
`rate_pct`, `diff`, `accept`, `missing`, `unexpected`, `equal`, `source`, `target`

---

## Thresholds (defaults)

- ✅ Pass: `rate_pct >= 95`
- ⚠️ Warn: `80 <= rate_pct < 95`
- ❌ Fail: `rate_pct < 80`

Check `/api/settings/{system_tag}` first; use those values if present.

Status: **HEALTHY** (rate>=95, fail==0) | **AT RISK** (rate>=80 or any fails) | **CRITICAL** (rate<80 or fail>10)

---

## Errors

| Symptom | Response |
|---|---|
| `available:false` | SAP BTP not connected |
| fetch 503 | BTP creds missing — show `missing_vars` |
| fetch 502 | SAP unreachable — check Cloud Connector |
| Network error | Try fallback `https://ltvf-dashboard.onrender.com` |
