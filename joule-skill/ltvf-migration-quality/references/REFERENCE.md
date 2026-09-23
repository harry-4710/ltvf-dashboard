# LTVF Dashboard API — Full Reference

## Base URLs

| Environment | URL |
|---|---|
| CF Backend (primary) | `https://ltvf-backend.cfapps.us10-003.hana.ondemand.com` |
| Render (fallback) | `https://ltvf-dashboard.onrender.com` |
| BTP Approuter | `https://d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com` |

---

## Endpoints

### `GET /api/health`
Returns `{"status":"ok","version":"3.0.0"}`. Use to check if backend is alive.

### `GET /api/sap/status`
```json
{
  "available": true,
  "mode": "btp",
  "destination_name": "LTVF_ONPREMISE",
  "missing_vars": []
}
```
`available: false` means SAP BTP credentials are not configured.

### `GET /api/sap/test`
3-step live BTP connectivity test. Returns per-step pass/fail details.
Steps: 1) XSUAA token  2) Destination resolution  3) OData probe ($top=1)

### `GET /api/sap/fetch?system_tag=<tag>`
Returns `LTVFParseResult` with live CNVLTVF3 data via BTP Destination + Cloud Connector.
- `system_tag` (optional, default: `"default"`) — labels which SAP system this result belongs to.
- **503** — BTP not configured
- **502** — SAP unreachable via Cloud Connector

### `POST /api/upload`
Upload an LTVF Excel file (.xlsx/.xls). Max 10 MB.
Returns `LTVFParseResult`.

### `GET /api/results/{system_tag}`
List of stored historical result summaries for a system tag.
```json
[
  {
    "id": 1,
    "system_tag": "default",
    "uploaded_at": "2025-01-15T10:30:00",
    "filename": "LTVF_PRD_20250115.xlsx",
    "overall_rate": 92.4,
    "pass_count": 45,
    "warn_count": 8,
    "fail_count": 3,
    "total_rows": 56
  }
]
```

### `GET /api/results/{system_tag}/{date}`
Single result for a specific date (format: `YYYY-MM-DD`).
Returns full `LTVFParseResult`.

### `GET /api/settings/{system_tag}`
```json
{
  "system_tag": "default",
  "pass_threshold": 95.0,
  "warn_threshold": 80.0
}
```

### `PUT /api/settings/{system_tag}`
```json
{"pass_threshold": 95.0, "warn_threshold": 80.0}
```

---

## `LTVFParseResult` Schema

```json
{
  "filename": "LTVF_PRD_20250115.xlsx",
  "summary": {
    "overall_rate": 87.3,
    "total_equal": 45230,
    "total_diff": 3410,
    "total_missing": 2100,
    "total_unexpected": 890,
    "total_source": 50740,
    "total_target": 49530,
    "total_rows": 56,
    "pass_count": 38,
    "warn_count": 12,
    "fail_count": 6
  },
  "rows": [ /* LTVFRow[] */ ],
  "sections": ["FI-GL", "SD", "MM", "PP", "CO", "HR"]
}
```

## `LTVFRow` Schema

```json
{
  "id": "001",
  "parent_id": null,
  "level": 1,
  "test_name": "FI-GL",
  "full_path": "FI-GL",
  "is_group": true,
  "rate_pct": 91.2,
  "diff": 1200,
  "accept": 0,
  "missing": 800,
  "unexpected": 400,
  "equal": 12400,
  "source": 14400,
  "target": 13000
}
```

**Key fields:**
- `is_group: true` — section/group header; `rate_pct` is the aggregate for that section
- `is_group: false` — individual test case (leaf); `rate_pct` is the test's specific rate
- `full_path` — use this for section filtering (e.g. `full_path.startsWith("FI-GL")`)
- `level` — 1 = top section, 2+ = sub-section or individual test

---

## SAP OData Field Mapping (CNVLTVF3_SRV / LTVFResultSet)

| API field | SAP OData field |
|---|---|
| `id` | `NodeId` |
| `parent_id` | `ParentNodeId` |
| `level` | `HierarchyLevel` |
| `test_name` | `Description` |
| `is_group` | `IsGroup` |
| `rate_pct` | `MatchRate` |
| `diff` | `DiffCount` |
| `missing` | `MissingCount` |
| `unexpected` | `UnexpectedCount` |
| `equal` | `EqualCount` |
| `source` | `SourceCount` |
| `target` | `TargetCount` |

---

## Common Query Patterns

### All failing tests (leaf level)
```
rows.filter(r => !r.is_group && r.rate_pct !== null && r.rate_pct < 80)
    .sort((a, b) => a.rate_pct - b.rate_pct)
```

### Section summary table
```
rows.filter(r => r.is_group && r.level === 1)
    .sort((a, b) => a.rate_pct - b.rate_pct)
```

### Tests in a specific section
```
rows.filter(r => r.full_path.startsWith("FI-GL"))
    .sort((a, b) => a.rate_pct - b.rate_pct)
```

### Top N worst performers
```
rows.filter(r => !r.is_group && r.rate_pct !== null)
    .sort((a, b) => a.rate_pct - b.rate_pct)
    .slice(0, N)
```
