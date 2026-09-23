"""
backend/btp_client.py
Fetches live SAP CNVLTVF3 data via SAP BTP Destination Service + Cloud Connector.

Credential resolution order (first found wins):
  1. Explicit env vars: BTP_TOKEN_URL, BTP_DEST_CLIENT_ID, BTP_DEST_CLIENT_SECRET, BTP_DEST_SVC_URL
  2. VCAP_SERVICES (auto-injected by CF when destination/connectivity services are bound)

Flow:
  1. Resolve credentials from env vars OR VCAP_SERVICES
  2. GET OAuth2 token from XSUAA (client_credentials grant) for Destination Service
  3. GET /destination-configuration/v1/destinations/<name> -> resolve SAP URL + auth headers
  4. GET separate connectivity token (for on-premise proxy Proxy-Authorization header)
  5. Call SAP OData through BTP Connectivity on-premise proxy
  6. Map OData response -> LTVFParseResult
"""

import json
import logging
import os
from typing import Optional

import requests
from dotenv import load_dotenv
from requests.auth import HTTPBasicAuth

from schemas import LTVFParseResult, LTVFRow, LTVFSummary

load_dotenv()
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# VCAP_SERVICES parser — auto-extracts CF service credentials when bound
# ---------------------------------------------------------------------------

def _parse_vcap_services() -> dict:
    """Parse VCAP_SERVICES env var (injected by CF when services are bound)."""
    raw = os.getenv("VCAP_SERVICES", "{}")
    try:
        return json.loads(raw)
    except Exception:
        return {}


def _vcap_creds(service_name: str) -> dict:
    """Return credentials dict for the first instance of a bound CF service."""
    vcap = _parse_vcap_services()
    instances = vcap.get(service_name, [])
    if instances:
        return instances[0].get("credentials", {})
    return {}


# ---------------------------------------------------------------------------
# Credential resolution: env vars first, VCAP_SERVICES fallback
# ---------------------------------------------------------------------------

def _resolve_dest_creds() -> dict:
    """
    Returns destination service credentials from explicit env vars or VCAP_SERVICES.
    Keys: token_url, client_id, client_secret, svc_url
    """
    token_url     = os.getenv("BTP_TOKEN_URL", "")
    client_id     = os.getenv("BTP_DEST_CLIENT_ID", "")
    client_secret = os.getenv("BTP_DEST_CLIENT_SECRET", "")
    svc_url       = os.getenv("BTP_DEST_SVC_URL", "")

    # Fall back to VCAP_SERVICES if any explicit var is missing
    if not all([token_url, client_id, client_secret, svc_url]):
        creds = _vcap_creds("destination")
        if creds:
            log.debug("btp_client: using VCAP_SERVICES destination credentials")
            token_url     = token_url     or (creds.get("url", "").rstrip("/") + "/oauth/token")
            client_id     = client_id     or creds.get("clientid", "")
            client_secret = client_secret or creds.get("clientsecret", "")
            svc_url       = svc_url       or creds.get("uri", "")

    return {
        "token_url":     token_url,
        "client_id":     client_id,
        "client_secret": client_secret,
        "svc_url":       svc_url,
    }


def _resolve_conn_creds() -> dict:
    """
    Returns connectivity service credentials from explicit env vars or VCAP_SERVICES.
    Keys: proxy_host, proxy_port, token_url, client_id, client_secret
    """
    proxy_host    = os.getenv("BTP_CONN_PROXY_HOST", "")
    proxy_port    = os.getenv("BTP_CONN_PROXY_PORT", "20003")
    conn_token_url    = ""
    conn_client_id    = ""
    conn_client_secret = ""

    creds = _vcap_creds("connectivity")
    if creds:
        log.debug("btp_client: using VCAP_SERVICES connectivity credentials")
        proxy_host         = proxy_host or creds.get("onpremise_proxy_host", "")
        proxy_port         = proxy_port or str(creds.get("onpremise_proxy_port", "20003"))
        conn_token_url     = creds.get("url", "").rstrip("/") + "/oauth/token"
        conn_client_id     = creds.get("clientid", "")
        conn_client_secret = creds.get("clientsecret", "")

    return {
        "proxy_host":     proxy_host,
        "proxy_port":     proxy_port,
        "token_url":      conn_token_url,
        "client_id":      conn_client_id,
        "client_secret":  conn_client_secret,
    }


# ---------------------------------------------------------------------------
# OData field name constants (overridable via env vars)
# ---------------------------------------------------------------------------

FIELD_TEST_NAME  = os.getenv("ODATA_FIELD_TEST_NAME",  "Description")
FIELD_RATE_PCT   = os.getenv("ODATA_FIELD_RATE_PCT",   "MatchRate")
FIELD_DIFF       = os.getenv("ODATA_FIELD_DIFF",       "DiffCount")
FIELD_MISSING    = os.getenv("ODATA_FIELD_MISSING",    "MissingCount")
FIELD_UNEXPECTED = os.getenv("ODATA_FIELD_UNEXPECTED", "UnexpectedCount")
FIELD_EQUAL      = os.getenv("ODATA_FIELD_EQUAL",      "EqualCount")
FIELD_SOURCE     = os.getenv("ODATA_FIELD_SOURCE",     "SourceVolume")
FIELD_TARGET     = os.getenv("ODATA_FIELD_TARGET",     "TargetVolume")
FIELD_LEVEL      = os.getenv("ODATA_FIELD_LEVEL",      "HierarchyLevel")
FIELD_PARENT_ID  = os.getenv("ODATA_FIELD_PARENT_ID",  "ParentNodeId")
FIELD_NODE_ID    = os.getenv("ODATA_FIELD_NODE_ID",    "NodeId")
FIELD_IS_GROUP   = os.getenv("ODATA_FIELD_IS_GROUP",   "IsGroup")
ODATA_ENTITY_SET = os.getenv("ODATA_ENTITY_SET",       "LTVFResultSet")

SAP_DESTINATION_NAME = os.getenv("SAP_DESTINATION_NAME", "LTVF_ONPREMISE")
SAP_ODATA_SERVICE    = os.getenv("SAP_ODATA_SERVICE",    "/sap/opu/odata/sap/CNVLTVF3_SRV")

# ---------------------------------------------------------------------------
# Public API: is_btp_configured / get_btp_info
# ---------------------------------------------------------------------------

def is_btp_configured() -> bool:
    """True if minimum required credentials are available (env vars or VCAP_SERVICES)."""
    d = _resolve_dest_creds()
    return all([d["token_url"], d["client_id"], d["client_secret"], d["svc_url"]])


def get_btp_info() -> dict:
    """Sanitised config summary — safe to expose via API (credentials masked)."""
    d = _resolve_dest_creds()
    c = _resolve_conn_creds()
    missing = [k for k, v in [
        ("BTP_TOKEN_URL",          d["token_url"]),
        ("BTP_DEST_CLIENT_ID",     d["client_id"]),
        ("BTP_DEST_CLIENT_SECRET", d["client_secret"]),
        ("BTP_DEST_SVC_URL",       d["svc_url"]),
    ] if not v]
    return {
        "configured":        is_btp_configured(),
        "destination_name":  SAP_DESTINATION_NAME,
        "odata_service":     SAP_ODATA_SERVICE,
        "entity_set":        ODATA_ENTITY_SET,
        "proxy_host":        c["proxy_host"] or "(not set)",
        "proxy_port":        c["proxy_port"],
        "token_url":         (d["token_url"][:60] + "...") if d["token_url"] else "(not set)",
        "dest_svc_url":      (d["svc_url"][:60]   + "...") if d["svc_url"]   else "(not set)",
        "client_id_set":     bool(d["client_id"]),
        "client_secret_set": bool(d["client_secret"]),
        "missing_vars":      missing,
        "vcap_dest_bound":   bool(_vcap_creds("destination")),
        "vcap_conn_bound":   bool(_vcap_creds("connectivity")),
        "field_mapping": {
            "test_name":  FIELD_TEST_NAME,  "rate_pct":  FIELD_RATE_PCT,
            "diff":       FIELD_DIFF,       "missing":   FIELD_MISSING,
            "unexpected": FIELD_UNEXPECTED, "equal":     FIELD_EQUAL,
            "source":     FIELD_SOURCE,     "target":    FIELD_TARGET,
            "level":      FIELD_LEVEL,      "parent_id": FIELD_PARENT_ID,
            "node_id":    FIELD_NODE_ID,    "is_group":  FIELD_IS_GROUP,
        },
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _safe_int(val) -> Optional[int]:
    try:
        return int(float(val)) if val is not None else None
    except (ValueError, TypeError):
        return None


def _safe_float(val) -> Optional[float]:
    try:
        return round(float(val), 2) if val is not None else None
    except (ValueError, TypeError):
        return None


def _get_token(token_url: str, client_id: str, client_secret: str) -> str:
    """Acquire an OAuth2 client_credentials token from a XSUAA endpoint."""
    resp = requests.post(
        token_url,
        data={"grant_type": "client_credentials"},
        auth=HTTPBasicAuth(client_id, client_secret),
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def _get_destination(dest_name: str, d: dict) -> dict:
    """
    Resolve a named BTP Destination.
    d = _resolve_dest_creds() output.
    """
    token = _get_token(d["token_url"], d["client_id"], d["client_secret"])
    url = f"{d['svc_url'].rstrip('/')}/destination-configuration/v1/destinations/{dest_name}"
    resp = requests.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def _build_odata_request(dest: dict, conn: dict) -> tuple:
    """
    Extract OData URL, headers, and proxy config from a resolved BTP Destination.
    Adds Proxy-Authorization header when connectivity service credentials are available
    (required when ltvf-backend runs inside CF with the connectivity service bound).

    Returns (odata_url, request_headers, proxies_dict).
    """
    dest_cfg   = dest.get("destinationConfiguration", {})
    dest_url   = dest_cfg.get("URL", "").rstrip("/")
    sap_client = dest_cfg.get("sap-client", "100")

    # SAP auth headers from Destination Service (Basic creds encoded as Bearer token)
    auth_tokens = dest.get("authTokens", [])
    headers = {
        "Accept":     "application/json",
        "sap-client": sap_client,
    }
    if auth_tokens:
        t = auth_tokens[0]
        tok_type  = t.get("type", "Bearer")
        tok_value = t.get("value", "")
        headers["Authorization"] = f"{tok_type} {tok_value}"

    # On-premise proxy from Destination response or fallback env vars
    proxy_host = (
        dest.get("onPremiseProxy", {}).get("proxyHost")
        or conn["proxy_host"]
    )
    proxy_port = (
        dest.get("onPremiseProxy", {}).get("proxyPort")
        or conn["proxy_port"]
    )

    proxies = {}
    if proxy_host and proxy_port:
        # Proxy-Authorization header: required when running inside CF
        # Uses the connectivity service XSUAA token (technical user)
        proxy_auth_header = ""
        if conn["token_url"] and conn["client_id"] and conn["client_secret"]:
            try:
                conn_token = _get_token(
                    conn["token_url"], conn["client_id"], conn["client_secret"]
                )
                proxy_auth_header = f"Bearer {conn_token}"
                log.debug("btp_client: connectivity token acquired for proxy auth")
            except Exception as exc:
                log.warning("btp_client: could not acquire connectivity token: %s", exc)

        if proxy_auth_header:
            headers["SAP-Connectivity-Authentication"] = proxy_auth_header
            headers["Proxy-Authorization"] = proxy_auth_header

        proxy_addr = f"http://{proxy_host}:{proxy_port}"
        proxies = {"http": proxy_addr, "https": proxy_addr}
        log.debug("btp_client: using proxy %s", proxy_addr)

    odata_url = f"{dest_url}{SAP_ODATA_SERVICE.rstrip('/')}/{ODATA_ENTITY_SET}"
    return odata_url, headers, proxies

def _map_odata_to_result(raw_json: dict) -> LTVFParseResult:
    """
    Map OData d.results[] -> LTVFParseResult.
    Handles both flat and hierarchical OData responses.
    """
    results = raw_json.get("d", {}).get("results", [])

    rows: list[LTVFRow] = []
    sections: list[str] = []
    pass_c = warn_c = fail_c = 0
    overall_rate = total_equal = total_diff = 0
    total_missing = total_unexp = total_source = total_target = 0

    for i, item in enumerate(results):
        level     = int(item.get(FIELD_LEVEL, 0))
        parent_id = item.get(FIELD_PARENT_ID) or None
        node_id   = item.get(FIELD_NODE_ID, f"node_{i}")
        test_name = item.get(FIELD_TEST_NAME, f"Node {i}")

        is_group_raw = item.get(FIELD_IS_GROUP, "")
        is_group = (
            is_group_raw in ("X", "true", True, 1)
            if is_group_raw != ""
            else (level < 2)
        )

        rate = _safe_float(item.get(FIELD_RATE_PCT))

        # Root node (level 0, no parent) = grand totals row
        if level == 0 and not parent_id:
            if test_name not in sections:
                sections.append(test_name)
            overall_rate  = _safe_float(item.get(FIELD_RATE_PCT)) or 0.0
            total_equal   = _safe_int(item.get(FIELD_EQUAL))      or 0
            total_diff    = _safe_int(item.get(FIELD_DIFF))       or 0
            total_missing = _safe_int(item.get(FIELD_MISSING))    or 0
            total_unexp   = _safe_int(item.get(FIELD_UNEXPECTED)) or 0
            total_source  = _safe_int(item.get(FIELD_SOURCE))     or 0
            total_target  = _safe_int(item.get(FIELD_TARGET))     or 0

        if not is_group and rate is not None:
            if rate >= 95:   pass_c += 1
            elif rate >= 80: warn_c += 1
            else:            fail_c += 1

        rows.append(LTVFRow(
            id=str(node_id),
            parent_id=str(parent_id) if parent_id else None,
            level=level,
            test_name=test_name,
            full_path=test_name,
            is_group=is_group,
            rate_pct=rate,
            diff=_safe_int(item.get(FIELD_DIFF)),
            missing=_safe_int(item.get(FIELD_MISSING)),
            unexpected=_safe_int(item.get(FIELD_UNEXPECTED)),
            equal=_safe_int(item.get(FIELD_EQUAL)),
            source=_safe_int(item.get(FIELD_SOURCE)),
            target=_safe_int(item.get(FIELD_TARGET)),
        ))

    leaf_count = pass_c + warn_c + fail_c
    return LTVFParseResult(
        filename="SAP Live Data",
        summary=LTVFSummary(
            overall_rate=overall_rate,
            total_equal=total_equal,
            total_diff=total_diff,
            total_missing=total_missing,
            total_unexpected=total_unexp,
            total_source=total_source,
            total_target=total_target,
            total_rows=leaf_count,
            pass_count=pass_c,
            warn_count=warn_c,
            fail_count=fail_c,
        ),
        rows=rows,
        sections=sections,
    )


# ---------------------------------------------------------------------------
# Public fetch function
# ---------------------------------------------------------------------------

def fetch_ltvf_via_btp() -> LTVFParseResult:
    """
    Fetch live LTVF data from on-premise SAP via BTP Destination + Cloud Connector.
    Credentials resolved automatically from env vars or VCAP_SERVICES.
    """
    d    = _resolve_dest_creds()
    c    = _resolve_conn_creds()
    dest = _get_destination(SAP_DESTINATION_NAME, d)
    sap_client = dest.get("destinationConfiguration", {}).get("sap-client", "100")
    odata_url, headers, proxies = _build_odata_request(dest, c)

    params = {"sap-client": sap_client, "$format": "json", "$expand": "ToChildren"}
    log.info("btp_fetch url=%s destination=%s", odata_url, SAP_DESTINATION_NAME)

    resp = requests.get(
        odata_url,
        params=params,
        headers=headers,
        proxies=proxies,
        timeout=30,
        verify=True,
    )
    resp.raise_for_status()
    result = _map_odata_to_result(resp.json())
    log.info("btp_fetch_success rows=%d rate=%.1f", len(result.rows), result.summary.overall_rate)
    return result


# ---------------------------------------------------------------------------
# 3-step live connection test
# ---------------------------------------------------------------------------

def test_btp_connection() -> dict:
    """
    End-to-end test: XSUAA token -> Destination resolve -> OData probe.
    Never raises. Returns structured result dict with per-step pass/fail.
    """
    d = _resolve_dest_creds()
    c = _resolve_conn_creds()
    steps: list[dict] = []

    def _step(name: str, ok: bool, detail: str):
        steps.append({"step": name, "ok": ok, "detail": detail})
        log.info("btp_test step=%s ok=%s", name, ok)

    # Step 1 - XSUAA token
    token = None
    try:
        token = _get_token(d["token_url"], d["client_id"], d["client_secret"])
        _step("XSUAA OAuth2 token", True,
              "Token acquired from BTP XSUAA")
    except Exception as exc:
        _step("XSUAA OAuth2 token", False,
              f"Failed - check BTP_TOKEN_URL, BTP_DEST_CLIENT_ID/SECRET. Error: {exc}")
        return {"ok": False, "steps": steps,
                "error": "XSUAA token request failed. Verify credential env vars and token URL."}

    # Step 2 - Resolve Destination
    dest = None
    try:
        dest = _get_destination(SAP_DESTINATION_NAME, d)
        dest_url   = dest.get("destinationConfiguration", {}).get("URL", "(none)")
        proxy_type = dest.get("destinationConfiguration", {}).get("ProxyType", "unknown")
        _step(f"Resolve destination '{SAP_DESTINATION_NAME}'", True,
              f"URL: {dest_url}  |  ProxyType: {proxy_type}")
    except Exception as exc:
        _step(f"Resolve destination '{SAP_DESTINATION_NAME}'", False,
              f"Not found or auth error - ensure destination exists in BTP cockpit. Error: {exc}")
        return {"ok": False, "steps": steps,
                "error": f"Destination '{SAP_DESTINATION_NAME}' could not be resolved."}

    # Step 3 - OData probe ($top=1)
    try:
        odata_url, headers, proxies = _build_odata_request(dest, c)
        sap_client = dest.get("destinationConfiguration", {}).get("sap-client", "100")
        resp = requests.get(
            odata_url,
            params={"sap-client": sap_client, "$format": "json", "$top": "1"},
            headers=headers,
            proxies=proxies,
            timeout=20,
            verify=True,
        )
        resp.raise_for_status()
        count = len(resp.json().get("d", {}).get("results", []))
        _step(f"SAP OData probe ({ODATA_ENTITY_SET}?$top=1)", True,
              f"HTTP {resp.status_code} - {count} record(s) returned")
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response else "?"
        body   = exc.response.text[:200]  if exc.response else ""
        _step("SAP OData probe", False,
              f"HTTP {status} - Check SAP auth, SICF activation, service account. Body: {body}")
        return {"ok": False, "steps": steps, "error": str(exc)}
    except Exception as exc:
        _step("SAP OData probe", False,
              f"Network/proxy error - check Cloud Connector status. Error: {exc}")
        return {"ok": False, "steps": steps, "error": str(exc)}

    log.info("btp_test_passed destination=%s", SAP_DESTINATION_NAME)
    return {
        "ok":               True,
        "steps":            steps,
        "destination_name": SAP_DESTINATION_NAME,
        "destination_url":  dest.get("destinationConfiguration", {}).get("URL", ""),
        "odata_endpoint":   odata_url,
    }