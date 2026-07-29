#!/usr/bin/env node
/**
 * LTVF MCP Server
 * Exposes SAP CNVLTVF3 test results as Claude Code tools.
 *
 * Tools:
 *   get_ltvf_status  - Check if SAP is reachable and configured
 *   fetch_ltvf_data  - Fetch live CNVLTVF3 test results from SAP
 *   query_ltvf       - Query specific sections or filter by pass/warn/fail
 *
 * Config (env vars or .env in this directory):
 *   SAP_BASE_URL       - e.g. https://sap-host:8000
 *   SAP_USER           - SAP service account username
 *   SAP_PASSWORD       - SAP service account password
 *   SAP_CLIENT         - SAP client number (default: 100)
 *   SAP_ODATA_SERVICE  - OData service path (default: /sap/opu/odata/sap/CNVLTVF3_SRV)
 *
 *   Optional BTP mode (uses Destination Service instead of direct):
 *   BTP_TOKEN_URL          - XSUAA token endpoint
 *   BTP_DEST_CLIENT_ID     - Destination Service client ID
 *   BTP_DEST_CLIENT_SECRET - Destination Service client secret
 *   BTP_DEST_SVC_URL       - Destination Service base URL
 *   BTP_CONN_PROXY_HOST    - Connectivity proxy host
 *   BTP_CONN_PROXY_PORT    - Connectivity proxy port (default: 20003)
 *   SAP_DESTINATION_NAME   - BTP destination name (default: LTVF_ONPREMISE)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env if present ───────────────────────────────────────────────────
const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}

// ── Config ─────────────────────────────────────────────────────────────────
const SAP_BASE_URL      = process.env.SAP_BASE_URL      || "";
const SAP_USER          = process.env.SAP_USER          || "";
const SAP_PASSWORD      = process.env.SAP_PASSWORD      || "";
const SAP_CLIENT        = process.env.SAP_CLIENT        || "100";
const SAP_ODATA_SERVICE = process.env.SAP_ODATA_SERVICE || "/sap/opu/odata/sap/CNVLTVF3_SRV";
const ODATA_ENTITY_SET  = "LTVFResultSet";

const BTP_TOKEN_URL          = process.env.BTP_TOKEN_URL          || "";
const BTP_DEST_CLIENT_ID     = process.env.BTP_DEST_CLIENT_ID     || "";
const BTP_DEST_CLIENT_SECRET = process.env.BTP_DEST_CLIENT_SECRET || "";
const BTP_DEST_SVC_URL       = process.env.BTP_DEST_SVC_URL       || "";
const BTP_CONN_PROXY_HOST    = process.env.BTP_CONN_PROXY_HOST    || "";
const BTP_CONN_PROXY_PORT    = process.env.BTP_CONN_PROXY_PORT    || "20003";
const SAP_DESTINATION_NAME   = process.env.SAP_DESTINATION_NAME   || "LTVF_ONPREMISE";

// OData field names — adjust if BASIS exposes different names
const FIELD = {
  NODE_ID:   "NodeId",
  PARENT_ID: "ParentNodeId",
  LEVEL:     "HierarchyLevel",
  TEST_NAME: "Description",
  IS_GROUP:  "IsGroup",
  RATE_PCT:  "MatchRate",
  DIFF:      "DiffCount",
  MISSING:   "MissingCount",
  UNEXPECTED:"UnexpectedCount",
  EQUAL:     "EqualCount",
  SOURCE:    "SourceVolume",
  TARGET:    "TargetVolume",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function isDirectConfigured() {
  return !!(SAP_BASE_URL && SAP_USER && SAP_PASSWORD);
}

function isBtpConfigured() {
  return !!(BTP_TOKEN_URL && BTP_DEST_CLIENT_ID && BTP_DEST_CLIENT_SECRET && BTP_DEST_SVC_URL);
}

function safeFloat(val) {
  const n = parseFloat(val);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}

function safeInt(val) {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} from ${url}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ── BTP token + destination ────────────────────────────────────────────────

async function getBtpToken() {
  const creds = Buffer.from(`${BTP_DEST_CLIENT_ID}:${BTP_DEST_CLIENT_SECRET}`).toString("base64");
  const data = await fetchJson(BTP_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${creds}`,
    },
    body: "grant_type=client_credentials",
  });
  return data.access_token;
}

async function getBtpDestination() {
  const token = await getBtpToken();
  const url = `${BTP_DEST_SVC_URL.replace(/\/$/, "")}/destination-configuration/v1/destinations/${SAP_DESTINATION_NAME}`;
  return fetchJson(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Raw OData fetch ────────────────────────────────────────────────────────

const LTVF_BACKEND_URL = process.env.LTVF_BACKEND_URL || "";

function isBackendConfigured() {
  return !!LTVF_BACKEND_URL;
}

async function fetchOData() {
  // If neither direct nor BTP is configured, fall back to backend API
  if (!isDirectConfigured() && !isBtpConfigured()) {
    if (isBackendConfigured()) return fetchViaBackendApi();
    throw new Error(
      "SAP not configured. Set SAP_BASE_URL + SAP_USER + SAP_PASSWORD in mcp-server/.env"
    );
  }

  let oDataUrl, headers = {}, fetchOptions = {};

  if (isDirectConfigured()) {
    oDataUrl = `${SAP_BASE_URL.replace(/\/$/, "")}${SAP_ODATA_SERVICE}/${ODATA_ENTITY_SET}`;
    const creds = Buffer.from(`${SAP_USER}:${SAP_PASSWORD}`).toString("base64");
    headers = {
      Accept: "application/json",
      "sap-client": SAP_CLIENT,
      Authorization: `Basic ${creds}`,
    };
  } else if (isBtpConfigured()) {
    const dest = await getBtpDestination();
    const destUrl = dest?.destinationConfiguration?.URL || "";
    const sapClient = dest?.destinationConfiguration?.["sap-client"] || SAP_CLIENT;
    const authTokens = dest?.authTokens || [];
    const authHeader = authTokens[0]
      ? `${authTokens[0].type || "Bearer"} ${authTokens[0].value}`
      : null;
    const proxyHost = dest?.onPremiseProxy?.proxyHost || BTP_CONN_PROXY_HOST;
    const proxyPort = dest?.onPremiseProxy?.proxyPort || BTP_CONN_PROXY_PORT;

    oDataUrl = `${destUrl.replace(/\/$/, "")}/sap/opu/odata/sap/CNVLTVF3_SRV/${ODATA_ENTITY_SET}`;
    headers = { Accept: "application/json", "sap-client": sapClient };
    if (authHeader) headers.Authorization = authHeader;

    // Note: native fetch doesn't support HTTP proxies — for BTP via proxy,
    // either use node-fetch with HttpsProxyAgent or run through the backend API
    if (proxyHost && proxyPort) {
      // Signal that proxy is needed — handled below
      fetchOptions._btpProxy = `http://${proxyHost}:${proxyPort}`;
    }
  } else {
    throw new Error(
      "SAP not configured. Set SAP_BASE_URL + SAP_USER + SAP_PASSWORD in mcp-server/.env"
    );
  }

  const params = new URLSearchParams({
    "sap-client": SAP_CLIENT,
    "$format": "json",
    "$expand": "ToChildren",
  });

  const fullUrl = `${oDataUrl}?${params}`;

  // If BTP proxy needed, fall through to backend API instead
  if (fetchOptions._btpProxy) {
    return fetchViaBackendApi();
  }

  return fetchJson(fullUrl, { headers });
}

// ── Fallback: call our own FastAPI backend (already has BTP logic) ─────────

async function fetchViaBackendApi() {
  const base = LTVF_BACKEND_URL.replace(/\/$/, "");

  // Try live SAP fetch first; fall back to scheduled (mock) data
  try {
    const live = await fetchJson(`${base}/api/sap/fetch`);
    return { _fromBackend: true, data: live };
  } catch {
    // SAP not configured on backend — use scheduled/mock data
    const scheduled = await fetchJson(`${base}/api/scheduled/fetch`);
    return { _fromBackend: true, data: scheduled };
  }
}

// ── OData → structured result ──────────────────────────────────────────────

function mapODataResult(raw) {
  // If from backend API, data is already LTVFParseResult
  if (raw._fromBackend) return raw.data;

  const results = raw?.d?.results || [];
  const rows = [];
  const sections = [];
  let passCount = 0, warnCount = 0, failCount = 0;
  let overallRate = 0, totalEqual = 0, totalDiff = 0,
      totalMissing = 0, totalUnexpected = 0, totalSource = 0, totalTarget = 0;

  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    const level     = parseInt(item[FIELD.LEVEL] || "0", 10);
    const parentId  = item[FIELD.PARENT_ID] || null;
    const nodeId    = item[FIELD.NODE_ID]   || `node_${i}`;
    const testName  = item[FIELD.TEST_NAME] || `Node ${i}`;
    const isGroupRaw = item[FIELD.IS_GROUP] || "";
    const isGroup   = ["X", "true", true, 1].includes(isGroupRaw) || level < 2;
    const rate      = safeFloat(item[FIELD.RATE_PCT]);

    if (level === 0 && !parentId) {
      if (!sections.includes(testName)) sections.push(testName);
      overallRate    = safeFloat(item[FIELD.RATE_PCT]) || 0;
      totalEqual     = safeInt(item[FIELD.EQUAL])      || 0;
      totalDiff      = safeInt(item[FIELD.DIFF])       || 0;
      totalMissing   = safeInt(item[FIELD.MISSING])    || 0;
      totalUnexpected= safeInt(item[FIELD.UNEXPECTED]) || 0;
      totalSource    = safeInt(item[FIELD.SOURCE])     || 0;
      totalTarget    = safeInt(item[FIELD.TARGET])     || 0;
    }

    if (!isGroup && rate !== null) {
      if (rate >= 95) passCount++;
      else if (rate >= 80) warnCount++;
      else failCount++;
    }

    rows.push({
      id: String(nodeId),
      parent_id: parentId ? String(parentId) : null,
      level,
      test_name: testName,
      full_path: testName,
      is_group: isGroup,
      rate_pct: rate,
      diff:       safeInt(item[FIELD.DIFF]),
      missing:    safeInt(item[FIELD.MISSING]),
      unexpected: safeInt(item[FIELD.UNEXPECTED]),
      equal:      safeInt(item[FIELD.EQUAL]),
      source:     safeInt(item[FIELD.SOURCE]),
      target:     safeInt(item[FIELD.TARGET]),
    });
  }

  return {
    filename: "SAP Live Data",
    summary: {
      overall_rate:     overallRate,
      total_equal:      totalEqual,
      total_diff:       totalDiff,
      total_missing:    totalMissing,
      total_unexpected: totalUnexpected,
      total_source:     totalSource,
      total_target:     totalTarget,
      total_rows:       passCount + warnCount + failCount,
      pass_count:       passCount,
      warn_count:       warnCount,
      fail_count:       failCount,
    },
    rows,
    sections,
  };
}

// ── Formatting helpers for Claude ──────────────────────────────────────────

function formatSummary(result) {
  const s = result.summary;
  const total = s.pass_count + s.warn_count + s.fail_count;
  const lines = [
    `📊 LTVF Test Results Summary`,
    `Overall Match Rate: ${s.overall_rate}%`,
    ``,
    `Test Cases: ${total} total`,
    `  ✅ Pass  (≥95%): ${s.pass_count}`,
    `  ⚠️  Warn (80-94%): ${s.warn_count}`,
    `  ❌ Fail  (<80%): ${s.fail_count}`,
    ``,
    `Record Counts:`,
    `  Equal:      ${s.total_equal?.toLocaleString()}`,
    `  Different:  ${s.total_diff?.toLocaleString()}`,
    `  Missing:    ${s.total_missing?.toLocaleString()}`,
    `  Unexpected: ${s.total_unexpected?.toLocaleString()}`,
    `  Source:     ${s.total_source?.toLocaleString()}`,
    `  Target:     ${s.total_target?.toLocaleString()}`,
    ``,
    `Sections: ${result.sections.join(", ")}`,
  ];
  return lines.join("\n");
}

function formatFailingTests(rows, limit = 15) {
  const failing = rows
    .filter(r => !r.is_group && r.rate_pct !== null && r.rate_pct < 80)
    .sort((a, b) => a.rate_pct - b.rate_pct)
    .slice(0, limit);

  if (!failing.length) return "No failing test cases found.";

  const lines = [`❌ Failing Test Cases (${failing.length} shown):\n`];
  for (const r of failing) {
    lines.push(`  ${r.rate_pct}%  ${r.test_name}`);
    if (r.diff)    lines.push(`        Diff: ${r.diff}, Missing: ${r.missing || 0}, Unexpected: ${r.unexpected || 0}`);
  }
  return lines.join("\n");
}

function formatSection(rows, sectionName) {
  const section = rows.filter(r =>
    r.full_path?.startsWith(sectionName) || r.test_name === sectionName
  );
  if (!section.length) return `No rows found for section: ${sectionName}`;

  const lines = [`📁 Section: ${sectionName}\n`];
  for (const r of section) {
    const indent = "  ".repeat(r.level);
    const rate = r.rate_pct !== null ? `${r.rate_pct}%` : "—";
    const icon = r.is_group ? "📂" : r.rate_pct >= 95 ? "✅" : r.rate_pct >= 80 ? "⚠️" : "❌";
    lines.push(`${indent}${icon} ${r.test_name}  ${rate}`);
  }
  return lines.join("\n");
}

// ── MCP Server ─────────────────────────────────────────────────────────────

const server = new Server(
  { name: "ltvf-sap-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_ltvf_status",
      description: "Check if SAP CNVLTVF3 connection is configured and reachable. Use this before fetching data.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "fetch_ltvf_data",
      description:
        "Fetch live CNVLTVF3 test results from SAP. Returns summary statistics and all test cases with pass/warn/fail status. Use this to analyze SAP migration quality.",
      inputSchema: {
        type: "object",
        properties: {
          include_rows: {
            type: "boolean",
            description: "Include full row data (default: false — summary only). Set true for detailed analysis.",
          },
        },
        required: [],
      },
    },
    {
      name: "query_ltvf",
      description:
        "Query LTVF test results with filters. Use after fetch_ltvf_data to analyze specific sections or failure patterns.",
      inputSchema: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            enum: ["all", "fail", "warn", "pass"],
            description: "Filter by test case status. Default: all",
          },
          section: {
            type: "string",
            description: "Filter to a specific section (e.g. '01. Master Data'). Optional.",
          },
          top_n_failing: {
            type: "integer",
            description: "Return only the N worst-performing test cases. Optional.",
          },
        },
        required: [],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_ltvf_status") {
      const direct  = isDirectConfigured();
      const btp     = isBtpConfigured();
      const backend = isBackendConfigured();
      const mode    = direct  ? "direct (Basic Auth)"
                    : btp     ? "BTP Destination Service"
                    : backend ? `backend fallback (${LTVF_BACKEND_URL})`
                    : "not configured";

      const lines = [
        `SAP Connection Status`,
        `Mode: ${mode}`,
        direct  ? `SAP URL:    ${SAP_BASE_URL}` : "",
        direct  ? `SAP User:   ${SAP_USER}` : "",
        direct  ? `SAP Client: ${SAP_CLIENT}` : "",
        btp     ? `BTP Destination: ${SAP_DESTINATION_NAME}` : "",
        backend && !direct && !btp ? `Backend URL: ${LTVF_BACKEND_URL}` : "",
        ``,
        direct || btp || backend
          ? "✅ Configuration found — run fetch_ltvf_data to retrieve data."
          : "❌ Not configured. Set SAP_BASE_URL + SAP_USER + SAP_PASSWORD, or LTVF_BACKEND_URL in mcp-server/.env",
      ].filter(l => l !== "").join("\n");

      return { content: [{ type: "text", text: lines }] };
    }

    if (name === "fetch_ltvf_data") {
      const raw    = await fetchOData();
      const result = mapODataResult(raw);
      const summary = formatSummary(result);
      const failing = formatFailingTests(result.rows);

      let text = summary + "\n\n" + failing;

      if (args?.include_rows) {
        text += "\n\nFull row data (JSON):\n" + JSON.stringify(result.rows, null, 2);
      }

      // Cache result for query_ltvf
      server._cachedResult = result;

      return { content: [{ type: "text", text }] };
    }

    if (name === "query_ltvf") {
      const result = server._cachedResult;
      if (!result) {
        return {
          content: [{
            type: "text",
            text: "No data loaded yet. Run fetch_ltvf_data first.",
          }],
        };
      }

      let rows = result.rows;
      const filter = args?.filter || "all";
      const section = args?.section;
      const topN = args?.top_n_failing;

      // Section filter
      if (section) {
        return {
          content: [{ type: "text", text: formatSection(rows, section) }],
        };
      }

      // Status filter
      if (filter !== "all") {
        const thresholds = { fail: r => r.rate_pct < 80, warn: r => r.rate_pct >= 80 && r.rate_pct < 95, pass: r => r.rate_pct >= 95 };
        rows = rows.filter(r => !r.is_group && r.rate_pct !== null && thresholds[filter](r));
      }

      // Top N failing
      if (topN) {
        rows = rows
          .filter(r => !r.is_group && r.rate_pct !== null)
          .sort((a, b) => a.rate_pct - b.rate_pct)
          .slice(0, topN);
      }

      const lines = rows.map(r => {
        const icon = r.rate_pct >= 95 ? "✅" : r.rate_pct >= 80 ? "⚠️" : "❌";
        return `${icon} ${r.rate_pct}%  ${r.test_name}  (diff: ${r.diff || 0}, missing: ${r.missing || 0})`;
      });

      const text = lines.length
        ? `${filter.toUpperCase()} tests (${lines.length}):\n\n` + lines.join("\n")
        : `No ${filter} tests found.`;

      return { content: [{ type: "text", text }] };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };

  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

// ── Start ──────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
