# LeanIX MCP Server Registration Guide

> How to register `ltvf-mcp-server` in LeanIX so it appears in Joule Work Desktop Hub.

---

## Background

As of September 2026, the Joule Hub no longer accepts direct MCP server submissions.
All MCP servers must be registered via the **LeanIX registry**:

1. Register in LeanIX with "Joule Desktop Hub" as Interface Consumer
2. Submit required approvals
3. Hub auto-syncs within 24 hours once status = **Approved**

Reference: `https://hub.joule.only.sap/help#mcp-servers`

---

## Step-by-Step Registration

### Step 1: Open LeanIX

Go to the SAP internal LeanIX instance (ask your LeanIX admin if you don't have access):
- Internal LeanIX URL: `https://sap.leanix.net` (or your org's instance)
- Also check the [MCP Server Registry SharePoint page](https://sap.sharepoint.com) linked from the Joule Hub help

### Step 2: Create/Find the Application Fact Sheet

1. In LeanIX, find or create a **Fact Sheet** for this system
2. Type: **IT Component** or **Application** (check the MCP Registry guidance)
3. Name: `LTVF Migration Quality MCP Server`

### Step 3: Fill in Required Fields

Use these values:

| LeanIX Field | Value |
|---|---|
| **Name** | LTVF Migration Quality MCP Server |
| **Description** | Exposes SAP CNVLTVF3/LTVR migration test quality data to AI agents. Provides tools to check SAP connectivity, fetch live test results, and query pass/fail status for S/4HANA data migration quality assurance. |
| **MCP Server Endpoint** | `https://ltvf-mcp-server.cfapps.us10-003.hana.ondemand.com` |
| **MCP Server Classification** | Internal |
| **MCP Playbook URL** | Link to `mcp-server/MCP_PLAYBOOK.md` (host on SharePoint or GitHub Pages) |
| **Available Tools** | `get_ltvf_status`, `fetch_ltvf_data`, `query_ltvf` |
| **Owner / Responsible** | hariprasad.velu@sap.com |

### Step 4: Set Interface Consumer

In the LeanIX Fact Sheet, under **Interfaces** or **Consumers**:
- Add **"Joule Desktop Hub"** as an Interface Consumer
- This is what triggers the sync to the Joule Hub

### Step 5: Submit Approvals

- Follow your org's LeanIX approval workflow
- Required approvals typically include: Application Owner, Security review, Data Privacy
- Once all approvals pass → status changes to **Approved**

### Step 6: Wait for Hub Sync

- Hub checks LeanIX every 24 hours
- Once synced, `ltvf-mcp-server` will appear under **MCP Servers** tab in Joule Hub
- Users can then connect to it from Joule Work Desktop

---

## What the Hub Will Display

From the Joule Hub help page, the Hub pulls these fields from LeanIX:

| Hub Display | Source |
|---|---|
| Name | LeanIX Fact Sheet name |
| Description | LeanIX description |
| Endpoint | MCP server endpoint field |
| Classification | MCP server classification |
| Tools | Available tools list |
| Documentation | MCP Playbook link |

---

## MCP Server Details for Registration

```
Name:        LTVF Migration Quality MCP Server
Version:     2.0.0
Endpoint:    https://ltvf-mcp-server.cfapps.us10-003.hana.ondemand.com
SSE path:    /sse
Messages:    /messages?sessionId={id}
Health:      /health
Auth:        SAP BTP XSUAA JWT (bearer token)
XSUAA app:   sb-ltvf-mcp-server!t686826

Tools (3):
  - get_ltvf_status   : Check SAP connectivity and config
  - fetch_ltvf_data   : Fetch live CNVLTVF3 test results
  - query_ltvf        : Filter results by pass/warn/fail/section

Platform:    SAP BTP Cloud Foundry, US10-003, space: dev
Owner:       hariprasad.velu@sap.com
Team:        SAP Migration QA (CNVLTVF3)
```

---

## Parallel Action: Publish the Joule Skill

While waiting for LeanIX approval, **publish the Joule Skill** (no approval needed):

1. Go to: `https://hub.joule.only.sap/skills/new`
2. Upload `joule-skill/ltvf-migration-quality/SKILL.md`
3. Upload reference files from `joule-skill/ltvf-migration-quality/references/`:
   - `REFERENCE.md`
   - `FIELD_GUIDE.md`
4. The Skill works standalone (LTVR Excel file upload) even without the MCP server

The Skill + MCP Server combination gives users the full experience:
- **Skill only**: LTVR Excel analysis via local Python script
- **Skill + MCP**: Live SAP data access from Joule chat
