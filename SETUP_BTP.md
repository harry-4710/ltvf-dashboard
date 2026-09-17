# LTVF Dashboard — SAP BTP Cloud Connector Setup Guide

## Architecture

```
LTVF Dashboard (Vercel)
      ↓ HTTPS
Render Backend (FastAPI)
      ↓ OAuth2 (XSUAA) → BTP Destination Service → LTVF_ONPREMISE
      ↓ HTTP via BTP Connectivity proxy
Cloud Connector (inside corporate network, outbound-only)
      ↓
SAP on-premise → CNVLTVF3_SRV OData → LTVFResultSet
```

---

## Step 1 — Activate the SAP OData Service

In SAP transaction **SICF**, navigate to:
```
/default_host/sap/opu/odata/sap/CNVLTVF3_SRV
```
Right-click → **Activate Service**. Test from SAP network:
```
https://<sap-host>:<port>/sap/opu/odata/sap/CNVLTVF3_SRV/LTVFResultSet?sap-client=100&$format=json&$top=1
```

## Step 2 — Install Cloud Connector

On a server **inside your corporate network**:
1. Download from https://tools.hana.ondemand.com/#cloud → SAP Cloud Connector
2. Install, start, open `https://localhost:8443`
3. Login (`Administrator` / `manage`) → change password

## Step 3 — Connect Cloud Connector to BTP Subaccount

Cloud Connector Admin → **Add Subaccount**:
- Region Host: `cf.us10.hana.ondemand.com` *(match your region)*
- Subaccount ID: from BTP cockpit → Subaccount → Overview
- Login/Password: your BTP credentials

## Step 4 — Expose SAP via Cloud Connector

Cloud Connector → your subaccount → **Cloud To On-Premise** → **Add**:

| Field | Value |
|---|---|
| Back-end Type | ABAP System |
| Protocol | HTTP |
| Internal Host | `sap-ecc.company.com` |
| Internal Port | `8000` |
| Virtual Host | `sap-ecc.company.com` |
| Virtual Port | `8000` |

Add Resource: URL Path = `/sap/opu/odata/sap/CNVLTVF3_SRV`, Active = ✅

## Step 5 — Create BTP Destination Service Instance

BTP cockpit → **Service Marketplace** → **Destination** → Create (plan: `lite`).
Create a Service Key → download JSON. Extract:
- `url` + `/oauth/token` → `BTP_TOKEN_URL`
- `clientid` → `BTP_DEST_CLIENT_ID`
- `clientsecret` → `BTP_DEST_CLIENT_SECRET`
- `uri` → `BTP_DEST_SVC_URL`

## Step 6 — Create BTP Connectivity Service Instance

BTP cockpit → **Connectivity** → Create (plan: `lite`).
Create a Service Key → download JSON. Extract:
- `onpremise_proxy_host` → `BTP_CONN_PROXY_HOST`
- `onpremise_proxy_port` → `BTP_CONN_PROXY_PORT`

## Step 7 — Create Named Destination in BTP Cockpit

BTP cockpit → **Connectivity** → **Destinations** → **New Destination**:

| Field | Value |
|---|---|
| Name | `LTVF_ONPREMISE` |
| Type | HTTP |
| URL | `http://sap-ecc.company.com:8000` |
| Proxy Type | **OnPremise** |
| Authentication | BasicAuthentication |
| User / Password | SAP service account credentials |

Additional Property: `sap-client` = `100`

Click **Check Connection** → should show ✅ green.

## Step 8 — Set Environment Variables on Render

**Render Dashboard** → `ltvf-backend` → **Environment**:

| Variable | Source |
|---|---|
| `BTP_TOKEN_URL` | Destination service key → `url` + `/oauth/token` |
| `BTP_DEST_CLIENT_ID` | Destination service key → `clientid` |
| `BTP_DEST_CLIENT_SECRET` | Destination service key → `clientsecret` |
| `BTP_DEST_SVC_URL` | Destination service key → `uri` |
| `BTP_CONN_PROXY_HOST` | Connectivity service key → `onpremise_proxy_host` |
| `BTP_CONN_PROXY_PORT` | Connectivity service key → `onpremise_proxy_port` |
| `SAP_DESTINATION_NAME` | `LTVF_ONPREMISE` |
| `SAP_ODATA_SERVICE` | `/sap/opu/odata/sap/CNVLTVF3_SRV` |

## Step 9 — Test the Connection

**In the Dashboard:** Click the **BTP** button in the header → **Run Connection Test**.
All 3 steps (XSUAA token → Destination resolve → OData probe) must show ✅.

**Via API:**
```bash
curl https://ltvf-backend.onrender.com/api/sap/test    # diagnostic test
curl https://ltvf-backend.onrender.com/api/sap/status  # config info
curl https://ltvf-backend.onrender.com/api/sap/fetch   # full live data
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| XSUAA token fails | Check `BTP_TOKEN_URL` ends with `/oauth/token`; re-download service key |
| Destination not found | Check destination name matches `SAP_DESTINATION_NAME` exactly |
| OData HTTP 404 | Verify SICF activation; check `SAP_ODATA_SERVICE` path |
| OData HTTP 401 | Update SAP credentials in BTP Destination |
| OData timeout | Check Cloud Connector is running and resource is exposed |
| OData HTTP 403 | Ask BASIS to grant CNVLTVF3 display authorisation to service account |
| Empty data | Inspect actual OData field names with `$top=1` and set `ODATA_FIELD_*` overrides |

## OData Field Name Overrides

If field names differ from defaults, set on Render (all optional):
```
ODATA_FIELD_TEST_NAME=Description
ODATA_FIELD_RATE_PCT=MatchRate
ODATA_FIELD_DIFF=DiffCount
ODATA_FIELD_MISSING=MissingCount
ODATA_FIELD_UNEXPECTED=UnexpectedCount
ODATA_FIELD_EQUAL=EqualCount
ODATA_FIELD_SOURCE=SourceVolume
ODATA_FIELD_TARGET=TargetVolume
ODATA_FIELD_LEVEL=HierarchyLevel
ODATA_FIELD_PARENT_ID=ParentNodeId
ODATA_FIELD_NODE_ID=NodeId
ODATA_FIELD_IS_GROUP=IsGroup
ODATA_ENTITY_SET=LTVFResultSet
```
