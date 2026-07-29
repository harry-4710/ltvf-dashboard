# LTVF MCP Server

Connects Claude Code directly to SAP CNVLTVF3 via MCP (Model Context Protocol).

Once configured, you can ask Claude Code things like:
- *"Fetch the latest LTVF results from SAP"*
- *"Which test cases are failing in the Master Data section?"*
- *"Show me the 10 worst performing test cases"*

---

## Setup in SAP BAS

### Step 1 — Install dependencies

```bash
cd /home/user/projects/ltvf-dashboard/mcp-server
npm install
```

### Step 2 — Create .env file

```bash
cp .env.example .env
```

Edit `.env` and fill in your SAP credentials once BASIS provides them:

```
SAP_BASE_URL=https://your-sap-host:8000
SAP_USER=your-service-account
SAP_PASSWORD=your-password
SAP_CLIENT=100
```

**Before SAP credentials are available**, use the backend fallback mode — it connects via the deployed CF backend which already has mock data:

```
LTVF_BACKEND_URL=https://ltvf-backend.cfapps.us10-003.hana.ondemand.com
```

### Step 3 — Register the MCP server in Claude Code

Create or edit `~/.claude/settings.json` in BAS:

```bash
mkdir -p ~/.claude
cat > ~/.claude/settings.json << 'EOF'
{
  "mcpServers": {
    "ltvf-sap": {
      "command": "node",
      "args": ["/home/user/projects/ltvf-dashboard/mcp-server/index.js"],
      "env": {}
    }
  }
}
EOF
```

### Step 4 — Restart Claude Code

In BAS, open the Command Palette (`F1`) → `Claude: Restart MCP Servers`

Or restart the Claude Code extension entirely.

### Step 5 — Test it

In Claude Code, try:

```
Check LTVF SAP connection status
```

Then:

```
Fetch the latest LTVF test results from SAP
```

---

## Available Tools

| Tool | Description |
|---|---|
| `get_ltvf_status` | Check if SAP is configured and reachable |
| `fetch_ltvf_data` | Fetch live CNVLTVF3 results — summary + failing tests |
| `query_ltvf` | Filter by pass/warn/fail, specific section, or top N failing |

---

## Example Prompts for Claude Code

```
Fetch LTVF data and tell me the overall pass rate

Show me all failing test cases in the FI-GL section

What are the 5 worst performing test cases and what's wrong with them?

Compare the missing vs unexpected record counts across all sections

Generate a summary report of the current LTVF migration quality
```

---

## How It Works

```
Claude Code
    ↓ MCP tool call
LTVF MCP Server (Node.js)
    ↓ HTTP (Basic Auth or BTP)
SAP CNVLTVF3 OData
    OR
    ↓ HTTPS
Dashboard Backend API (fallback)
```

The server supports three connection modes, tried in order:
1. **Direct** — `SAP_BASE_URL` + `SAP_USER` + `SAP_PASSWORD` set
2. **BTP** — `BTP_TOKEN_URL` + `BTP_DEST_*` set (routes through BTP Destination + Cloud Connector)
3. **Backend fallback** — `LTVF_BACKEND_URL` set (calls the deployed FastAPI backend)
