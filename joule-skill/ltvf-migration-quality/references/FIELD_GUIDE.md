# LTVF Field Guide — OData Fields & Migration Concepts

## What is CNVLTVF3?

**CNVLTVF3** is the SAP standard transaction and OData service for **LTVF (Load Test
Verification Framework)** — the tool used during SAP S/4HANA migrations to verify that
data migrated correctly from the source system to the target system.

Each test case compares source vs. target record counts and flags:
- **Equal** — records that match exactly
- **Diff** — records with differences in key fields
- **Missing** — records present in source but absent in target (data loss risk)
- **Unexpected** — records present in target but absent in source (phantom data)

---

## Match Rate Calculation

```
rate_pct = (equal / source) * 100
```

A test is considered "passing" when the match rate meets or exceeds the configured
pass threshold (default: 95%).

---

## SAP Module Sections (typical CNVLTVF3 structure)

| Code | Module |
|---|---|
| FI-GL | Financial Accounting — General Ledger |
| FI-AP | Financial Accounting — Accounts Payable |
| FI-AR | Financial Accounting — Accounts Receivable |
| FI-AA | Asset Accounting |
| CO | Controlling |
| SD | Sales & Distribution |
| MM | Materials Management |
| PP | Production Planning |
| PM | Plant Maintenance |
| QM | Quality Management |
| HR / HCM | Human Resources |
| PS | Project Systems |
| WM / EWM | Warehouse Management |

---

## Hierarchy Structure

```
Level 1: Module (is_group: true)  — e.g. "FI-GL"
  Level 2: Sub-module (is_group: true)  — e.g. "FI-GL / Balance Sheet"
    Level 3+: Individual test (is_group: false)  — e.g. specific table/object check
```

Group rows aggregate their children's rates. Leaf rows are the actual test cases.

---

## BTP Connectivity Architecture

```
Joule / AI Agent
    ↓ HTTP
LTVF Backend (CF, US10-003)
    ↓ XSUAA OAuth2 → Destination Service → Cloud Connector
SAP On-Premise System (CNVLTVF3 OData)
    GET /sap/opu/odata/sap/CNVLTVF3_SRV/LTVFResultSet
```

**Cloud Connector** must be running and paired with the BTP subaccount
(`d73dca5etrial`, US10) for live data to work.

---

## System Tags

The `system_tag` parameter identifies which SAP system a result belongs to.
Common values used in this project:

| Tag | System |
|---|---|
| `default` | Default/unnamed system |
| `DEV` | Development system |
| `QA` | Quality Assurance system |
| `PRD` | Production system |

---

## Quality Benchmarks

| Rate | Interpretation | Action |
|---|---|---|
| >= 98% | Excellent — migration on track | No action needed |
| 95–97% | Good — minor issues | Monitor, investigate diff causes |
| 90–94% | Acceptable — warn zone | Plan remediation for failing tests |
| 80–89% | Concerning | Escalate to migration team |
| < 80% | Critical — fail | Halt go-live decision; investigate immediately |

---

## Key Questions to Answer

**"Is there missing data?"**
→ Check `total_missing`. If `total_missing > 0`, investigate which sections have `missing > 0`.

**"Are there phantom records in target?"**
→ Check `total_unexpected`. If high, check delta loads or initial load re-runs.

**"What's the root cause of diffs?"**
→ Look at `diff` count per test — high diff often means field mapping issues.

**"Which section is most critical?"**
→ Sort `is_group:true, level:1` rows by `rate_pct` asc — lowest rate = most critical.

**"Is the migration ready for go-live?"**
→ `overall_rate >= 95` AND `fail_count == 0` AND `total_missing < 100` (project-specific).
