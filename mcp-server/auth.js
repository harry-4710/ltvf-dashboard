/**
 * auth.js — XSUAA JWT verification middleware for the LTVF MCP HTTP server.
 *
 * When MCP_TRANSPORT=http and XSUAA_DISABLED != 'true', every /sse and /messages
 * request must carry a valid SAP XSUAA Bearer token.
 *
 * Credential resolution order:
 *   1. VCAP_SERVICES.xsuaa[0].credentials   (CF auto-inject when service is bound)
 *   2. Env vars: XSUAA_URL, XSUAA_CLIENT_ID, XSUAA_CLIENT_SECRET, XSUAA_APP_NAME
 *
 * Requires: @sap/xssec  (npm install @sap/xssec)
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Resolve XSUAA credentials ───────────────────────────────────────────────

function getXsuaaCredentials() {
  // 1. VCAP_SERVICES (CF runtime — automatically injected when xsuaa service is bound)
  try {
    const vcap = JSON.parse(process.env.VCAP_SERVICES || "{}");
    const instances = vcap.xsuaa || vcap["user-account-and-authentication"] || [];
    if (instances.length > 0) {
      return instances[0].credentials;
    }
  } catch {
    // ignore parse errors
  }

  // 2. Explicit env vars (local dev / manual config)
  const url      = process.env.XSUAA_URL;
  const clientid = process.env.XSUAA_CLIENT_ID;
  const secret   = process.env.XSUAA_CLIENT_SECRET;
  const appname  = process.env.XSUAA_APP_NAME || "ltvf-mcp";

  if (url && clientid && secret) {
    return { url, clientid, clientsecret: secret, xsappname: appname };
  }

  return null;
}

// ── Load @sap/xssec lazily (not installed for stdio-only mode) ───────────────

let xssec = null;
function loadXssec() {
  if (xssec) return xssec;
  try {
    xssec = require("@sap/xssec");
  } catch {
    throw new Error(
      "@sap/xssec is not installed. Run: npm install @sap/xssec @sap/xsenv\n" +
      "Or set XSUAA_DISABLED=true for local development without auth."
    );
  }
  return xssec;
}

// ── Express middleware ───────────────────────────────────────────────────────

/**
 * XSUAA Bearer token verification middleware.
 *
 * Set XSUAA_DISABLED=true to bypass auth (local development only).
 * In CF production the xsuaa service must be bound — no env vars needed.
 */
export function xsuaaAuth(req, res, next) {
  // Bypass for local dev
  if (process.env.XSUAA_DISABLED === "true") {
    req.user = { name: "dev-bypass", scope: [] };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Missing or malformed Authorization header. Expected: Bearer <xsuaa-jwt>",
    });
  }

  const token = authHeader.slice(7);

  const credentials = getXsuaaCredentials();
  if (!credentials) {
    console.error(
      "[auth] XSUAA credentials not found. " +
      "Bind an xsuaa service in CF, or set XSUAA_URL + XSUAA_CLIENT_ID + XSUAA_CLIENT_SECRET, " +
      "or set XSUAA_DISABLED=true for local dev."
    );
    return res.status(500).json({
      error: "Server misconfiguration",
      message: "XSUAA credentials not configured on this server.",
    });
  }

  try {
    const lib = loadXssec();
    lib.createSecurityContext(token, credentials, (err, ctx) => {
      if (err) {
        console.warn("[auth] Token validation failed:", err.message);
        return res.status(401).json({
          error: "Unauthorized",
          message: "Token validation failed: " + err.message,
        });
      }
      req.user = ctx;
      next();
    });
  } catch (err) {
    console.error("[auth] xssec error:", err.message);
    return res.status(500).json({ error: "Auth error", message: err.message });
  }
}

/**
 * Returns a sanitised object describing the current XSUAA config state
 * (for the /health endpoint — never expose secrets).
 */
export function getAuthInfo() {
  if (process.env.XSUAA_DISABLED === "true") {
    return { mode: "disabled (XSUAA_DISABLED=true)" };
  }
  const creds = getXsuaaCredentials();
  if (!creds) {
    return { mode: "not_configured", hint: "Set XSUAA_URL+XSUAA_CLIENT_ID+XSUAA_CLIENT_SECRET or bind xsuaa CF service" };
  }
  return {
    mode: "xsuaa",
    url: creds.url,
    clientid: creds.clientid,
    xsappname: creds.xsappname || "(not set)",
  };
}
