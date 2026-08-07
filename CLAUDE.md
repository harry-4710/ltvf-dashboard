# LTVF Dashboard — Claude Code Guide

## Important directories (read these)
- `backend/` — FastAPI app, main logic
- `frontend/src/` — React + Vite source
- `workzone/` — SAP Build Work Zone integration files

## Ignore (regenerable or sensitive)
- `node_modules/`, `dist/`, `__pycache__/`, `.vercel/` — regenerable
- `.cf-credentials` — NEVER read or commit (CF credentials)
- `mta_archives/` — deployment archives, not source
- `*.log` — runtime logs, not source

## Restore commands (if needed after cleanup)
- `cd frontend && npm install` — restore frontend deps
- `cd mcp-server && npm install` — restore MCP server deps
- `cd frontend && npm run build` — rebuild dist
