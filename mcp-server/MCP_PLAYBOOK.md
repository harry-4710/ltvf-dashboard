# LTVF MCP Server — MCP Playbook

> **LeanIX documentation link** — this document is required for Joule Desktop Hub registration.
> Submit this URL (or a SharePoint/Confluence copy) as the "MCP Playbook" field in LeanIX.

---

## Overview

| Field | Value |
|---|---|
| **Server name** | LTVF Migration Quality MCP Server |
| **Version** | 2.0.0 |
| **Owner / Author** | hariprasad.velu@sap.com |
| **Team** | SAP Migration QA (CNVLTVF3) |
| **Endpoint** | `https://ltvf-mcp-server.cfapps.us10-003.hana.ondemand.com` |
| **Transport** | HTTP + SSE (`/sse` endpoint, JSON-RPC via `/messages`) |
| **Auth** | SAP BTP XSUAA (JWT bearer token required) |
| **Classification** | Internal — SAP S/4HANA Migration Quality |
| **Platform** | SAP BTP Cloud Foundry, space: dev, region: US10-003 |

---

## Purpose

This MCP server exposes SAP CNVLTVF3 / LTVR migration test result data to AI agents (e.g., Joule Work Desktop). It enables:

- Real-time check of SAP system connectivity and configuration
- Fetching live migration test results from CNVLTVF3 OData services or the LTVF dashboard backend
- Querying and filtering test results by pass/warn/fail status

Primary use case: **SAP S/4HANA data migration quality assurance** — checking that source-to-target data comparisons (LTVR/LTVF tests) meet business sign-off thresholds before go-live.

---

## Available Tools

### 1. `get_ltvf_status`

**Description**: Check if the SAP system is reachable and the LTVF integration is configured.

**Input parameters**: _(none)_

**Output**: JSON with:
```json
{
  "configured": true,
  "sap_url": "https://...",
  "btp_mode": false,
  "available": true,
  "message": "SAP system is reachable"
}
```

**When to use**: First call before any data fetch. Verify connectivity.

---

### 2. `fetch_ltvf_data`

**Description**: Fetch live CNVLTVF3 test results from SAP (or the LTVF backend API).

**Input parameters**:
| Parameter | Type | Required | Description |
|---|---|---|---|
| `system_tag` | string | No | Tag/label for the SAP system (default: `"default"`) |
| `top` | integer | No | Max records to fetch (default: 200) |

**Output**: JSON with `summary` and `rows` arrays:
```json
{
  "summary": {
    "total_rows": 120,
    "overall_rate": 94.2,
    "has_signoff": false,
    "total_equal": 11400,
    "total_missing": 80,
    "total_diff": 620
  },
  "rows": [
    {
      "test_name": "FI > GL Accounts",
      "rate_pct": 98.5,
      "status": "pass",
      "equal": 985,
      "missing": 5,
      "diff": 10,
      "is_group": true
    }
  ]
}
```

---

### 3. `query_ltvf`

**Description**: Query specific sections of test results or filter by status.

**Input parameters**:
| Parameter | Type | Required | Description |
|---|---|---|---|
| `system_tag` | string | No | SAP system tag (default: `"default"`) |
| `status_filter` | string | No | Filter: `"pass"`, `"warn"`, `"fail"`, or `"all"` (default: `"all"`) |
| `section` | string | No | Filter to a specific test section/stream |
| `top` | integer | No | Max records (default: 50) |

**Output**: Same as `fetch_ltvf_data` but filtered.

---

## Authentication

The `/sse` and `/messages` endpoints require a valid **XSUAA JWT bearer token** from the bound XSUAA service instance `ltvf-xsuaa` (`clientid: sb-ltvf-mcp-server!t686826`).

Joule Work Desktop must be configured as an authorized client for this XSUAA service instance.

The `/health` endpoint is **unauthenticated** and returns service health + XSUAA config.

---

## Endpoint Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Health check + XSUAA config |
| `GET` | `/sse` | XSUAA JWT | Establish SSE stream (MCP connection) |
| `POST` | `/messages?sessionId=<id>` | XSUAA JWT | Send JSON-RPC MCP messages |

---

## Companion Skill

This MCP server is designed to be used alongside the **LTVF Migration Quality Skill** published on Joule Hub:
- Skill name: `ltvf-migration-quality`
- The skill handles LTVR Excel file uploads locally (no backend required)
- The MCP server provides live SAP data access

---

## Infrastructure

- **CF App**: `ltvf-mcp-server` (BTP CF, US10-003, space: dev)
- **XSUAA**: `ltvf-xsuaa` service instance (plan: application)
- **Backend**: `ltvf-backend.cfapps.us10-003.hana.ondemand.com` (FastAPI, Python)
- **Approuter**: `d73dca5etrial-dev-ltvf-approuter.cfapps.us10-003.hana.ondemand.com`

---

## Support

- **Owner**: hariprasad.velu@sap.com
- **GitHub / Source**: SAP internal — `ltvf-dashboard` repository
- **Issues**: Contact the CNVLTVF3 / Migration QA team
