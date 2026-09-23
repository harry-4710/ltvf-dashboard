# MCP Server Registration Guide — SAP MCP Registry via LeanIX

> How to register `ltvf-mcp-server` in the **SAP MCP Registry** so it appears in Joule Work Desktop Hub.

---

## Official References

| Resource | URL |
|---|---|
| **SAP MCP Registry (knowledge hub)** | `https://pages.github.tools.sap/Enterprise-AI-PPM/enterprise-ai-knowledge-hub/agent-hub/mcp-registry/` |
| **Joule Hub help — Register MCP servers** | `https://hub.joule.only.sap/help#mcp-servers` |
| **MCP Servers tab in Joule Hub** | `https://hub.joule.only.sap/mcp-servers` |

---

## How It Works (summary from Joule Hub help)

1. MCP servers visible in Joule Work Desktop Hub are sourced from the **LeanIX registry**
2. Registration must be done by the **application owner** (or authorized party)
3. Steps:
   - Register the MCP server in LeanIX
   - Set **"Joule Desktop Hub"** as an Interface Consumer
   - Submit all required approvals
4. Once status = **Approved** in LeanIX → Hub syncs automatically within **24 hours**
5. What the Hub pulls from LeanIX: Name, Description, Endpoint, Classification, Available tools, MCP Playbook link

> ⚠️ **Warning**: Going forward, access to unregistered MCP servers in Joule Work Desktop may be restricted to comply with Works Council requirements.

---

## Step 1 — Read the SAP MCP Registry Guide

**Before starting**, read the full process on the official SAP knowledge hub:

👉 `https://pages.github.tools.sap/Enterprise-AI-PPM/enterprise-ai-knowledge-hub/agent-hub/mcp-registry/`

This page (maintained by the Enterprise AI PPM team, i.e. CPIT) contains:
- The exact LeanIX Fact Sheet type to use
- Required fields and accepted values
- Approval workflow specifics
- Any Works Council / data privacy requirements
- Contact for questions

---

## Step 2 — Open LeanIX

SAP uses LeanIX for enterprise architecture management:
- URL: `https://sap.leanix.net` (authenticate with your SAP SSO / I-number)
- If you don't have edit access, contact your LeanIX admin or the Enterprise AI PPM team

---

## Step 3 — Create the Fact Sheet

1. Click **"New Fact Sheet"**
2. Select the type specified in the MCP Registry guide (likely **IT Component** or **Application**)
3. Fill in the values below

### Copy-Paste Values for Registration

```
Name:
  LTVF Migration Quality MCP Server

Short description (1 line):
  Exposes SAP CNVLTVF3/LTVR migration test quality data to Joule AI agents via MCP.

Full description:
  MCP server for SAP S/4HANA data migration quality assurance. Provides Joule Work Desktop
  with tools to check SAP system connectivity, fetch live CNVLTVF3 test results, and query
  pass/fail/warn status across LTVR test streams. Deployed on SAP BTP Cloud Foundry.
  Companion to the ltvf-migration-quality Joule Skill.

MCP Server Endpoint:
  https://ltvf-mcp-server.cfapps.us10-003.hana.ondemand.com

SSE path:      /sse
Messages path: /messages?sessionId={id}
Health check:  /health (unauthenticated)

Authentication:
  SAP BTP XSUAA JWT bearer token
  XSUAA client ID: sb-ltvf-mcp-server!t686826

MCP Server Classification:
  Internal

Available Tools (3):
  1. get_ltvf_status  - Check SAP system connectivity and LTVF integration config
  2. fetch_ltvf_data  - Fetch live CNVLTVF3 migration test results from SAP
  3. query_ltvf       - Filter test results by pass/warn/fail status or stream section

MCP Playbook URL:
  https://github.com/harry-4710/ltvf-dashboard/blob/main/mcp-server/MCP_PLAYBOOK.md
  (see mcp-server/MCP_PLAYBOOK.md in repo — copy to SharePoint if internal link required)

Application Owner / Responsible:
  hariprasad.velu@sap.com

Team:
  SAP Migration QA — CNVLTVF3 / LTVR project

Platform:
  SAP BTP Cloud Foundry, region: US10-003, subaccount: d73dca5etrial, space: dev

Version:
  2.0.0
```

---

## Step 4 — Set Interface Consumer

In the LeanIX Fact Sheet, navigate to the **Interfaces / Consumers** section:
- Add **"Joule Desktop Hub"** as an Interface Consumer
- This is the trigger that makes the Hub pick up the server

---

## Step 5 — Submit Required Approvals

The approval workflow is defined on the MCP Registry page. Typically includes:
- **Application Owner** approval (you / hariprasad.velu@sap.com)
- **Security review** — XSUAA auth is already in place ✅
- **Data Privacy / Works Council** — internal SAP migration data only ✅
- **Enterprise AI PPM** sign-off (CPIT team)

Once all approvals complete → LeanIX status changes to **Approved**.

---

## Step 6 — Wait for Joule Hub Sync

- Hub syncs from LeanIX every **24 hours**
- Server will appear under the **MCP Servers** tab at `https://hub.joule.only.sap/mcp-servers`
- Users can then add it via **Connect** in Joule Work Desktop

---

## MCP Playbook

The MCP Playbook (required by LeanIX) is at:
```
c:\Users\I750407\ltvf-dashboard\mcp-server\MCP_PLAYBOOK.md
```

Host it at one of:
1. GitHub (public): `https://github.com/harry-4710/ltvf-dashboard/blob/main/mcp-server/MCP_PLAYBOOK.md`
2. SAP SharePoint: copy content to a SharePoint page and use that URL in LeanIX
3. SAP Confluence / internal wiki

---

## Parallel Action: Publish the Joule Skill

While waiting for LeanIX approval (can take 1–3 days), **publish the Joule Skill now** (no approval needed, instant):

1. Go to: `https://hub.joule.only.sap/skills/new`
2. Upload `joule-skill/ltvf-migration-quality/SKILL.md`
3. Upload reference files:
   - `joule-skill/ltvf-migration-quality/references/REFERENCE.md`
   - `joule-skill/ltvf-migration-quality/references/FIELD_GUIDE.md`

The Skill works **standalone** (LTVR Excel analysis via local Python script) even without the MCP server connected. Users get immediate value while MCP registration completes.

---

## Combined Experience

| Mode | Capability |
|---|---|
| **Skill only** | Upload LTVR Excel → instant dashboard (local Python) |
| **Skill + MCP Server** | Live SAP CNVLTVF3 data fetch from Joule chat |
| **MCP Server only** | Raw tool calls from any MCP-compatible agent |
