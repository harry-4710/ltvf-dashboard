"""
backend/btp_client.py
Fetches live SAP CNVLTVF3 data via SAP BTP Destination Service + Cloud Connector.

Flow:
  1. Get OAuth2 token from BTP XSUAA using client_credentials grant
  2. Resolve the named Destination (LTVF_ONPREMISE) via Destination Service API
  3. Extract on-premise SAP URL + SAP auth headers from the Destination response
  4. Call SAP OData through the BTP Connectivity on-premise proxy
  5. Map OData response → LTVFParseResult

Required env vars (set in Render Dashboard or backend/.env):
  BTP_TOKEN_URL           XSUAA token endpoint
  BTP_DEST_CLIENT_ID      Destination Service client ID
  BTP_DEST_CLIENT_SECRET  Destination Service client secret
  BTP_DEST_SVC_URL        Destination Service base URL
  BTP_CONN_PROXY_HOST     Connectivity proxy host
  BTP_CONN_PROXY_PORT     Connectivity proxy port (default 20003)
  SAP_DESTINATION_NAME    Named destination in BTP cockpit (default LTVF_ONPREMISE)
  SAP_ODATA_SERVICE       OData service path (default /sap/opu/odata/sap/CNVLTVF3_SRV)
"""

import os
import logging
from typing import Optional
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv
from schemas import LTVFParseResult, LTVFRow, LTVFSummary

load_dotenv()
log = logging.getLogger(__name__)

# ── BTP service credentials ────────────────────────────────────────────────────
BTP_TOKEN_URL          = os.getenv("BTP_TOKEN_URL", "")
BTP_DEST_CLIENT_ID     = os.getenv("BTP_DEST_CLIENT_ID", "")
BTP_DEST_CLIENT_SECRET = os.getenv("BTP_DEST_CLIENT_SECRET", "")
BTP_DEST_SVC_URL       = os.getenv("BTP_DEST_SVC_URL", "")
BTP_CONN_PROXY_HOST    = os.getenv("BTP_CONN_PROXY_HOST", "")
BTP_CONN_PROXY_PORT    = os.getenv("BTP_CONN_PROXY_PORT", "20003")
SAP_DESTINATION_NAME   = os.getenv("SAP_DESTINATION_NAME", "LTVF_ONPREMISE")
SAP_ODATA_SERVICE      = os.getenv("SAP_ODATA_SERVICE", "/sap/opu/odata/sap/CNVLTVF3_SRV")

# ── OData field name constants — overridable via env vars ─────────────────────
FIELD_TEST_NAME   = os.getenv("ODATA_FIELD_TEST_NAME",   "Description")
FIELD_RATE_PCT    = os.getenv("ODATA_FIELD_RATE_PCT",    "MatchRate")
FIELD_DIFF        = os.getenv("ODATA_FIELD_DIFF",        "DiffCount")
FIELD_MISSING     = os.getenv("ODATA_FIELD_MISSING",     "MissingCount")
FIELD_UNEXPECTED  = os.getenv("ODATA_FIELD_UNEXPECTED",  "UnexpectedCount")
FIELD_EQUAL       = os.getenv("ODATA_FIELD_EQUAL",       "EqualCount")
FIELD_SOURCE      = os.getenv("ODATA_FIELD_SOURCE",      "SourceVolume")
FIELD_TARGET      = os.getenv("ODATA_FIELD_TARGET",      "TargetVolume")
FIELD_LEVEL       = os.getenv("ODATA_FIELD_LEVEL",       "HierarchyLevel")
FIELD_PARENT_ID   = os.getenv("ODATA_FIELD_PARENT_ID",   "ParentNodeId")
FIELD_NODE_ID     = os.getenv("ODATA_FIELD_NODE_ID",     "NodeId")
FIELD_IS_GROUP    = os.getenv("ODATA_FIELD_IS_GROUP",    "IsGroup")
ODATA_ENTITY_SET  = os.getenv("ODATA_ENTITY_SET",        "LTVFResultSet")


def is_btp_configured() -> bool:
    """Returns True if the minimum required BTP env vars are all set."""
    return all([BTP_TOKEN_URL, BTP_DEST_CLIENT_ID, BTP_DEST_CLIENT_SECRET, BTP_DEST_SVC_URL])


def get_btp_info() -> dict:
    """Returns a sanitised summary of BTP config. Safe to expose via API (credentials masked)."""
    missing = [v for v, val in [
        ("BTP_TOKEN_URL", BTP_TOKEN_URL),
        ("BTP_DEST_CLIENT_ID", BTP_DEST_CLIENT_ID),
        ("BTP_DEST_CLIENT_SECRET", BTP_DEST_CLIENT_SECRET),
        ("BTP_DEST_SVC_URL", BTP_DEST_SVC_URL),
    ] if not val]
    return {
        "configured":        is_btp_configured(),
        "destination_name":  SAP_DESTINATION_NAME,
        "odata_service":     SAP_ODATA_SERVICE,
        "entity_set":        ODATA_ENTITY_SET,
        "proxy_host":        BTP_CONN_PROXY_HOST or "(not set)",
        "proxy_port":        BTP_CONN_PROXY_PORT,
        "token_url":         (BTP_TOKEN_URL[:60] + "…") if BTP_TOKEN_URL else "(not set)",
        "dest_svc_url":      (BTP_DEST_SVC_URL[:60] + "…") if BTP_DEST_SVC_URL else "(not set)",
        "client_id_set":     bool(BTP_DEST_CLIENT_ID),
        "client_secret_set": bool(BTP_DEST_CLIENT_SECRET),
        "missing_vars":      missing,
        "field_mapping": {
            "test_name": FIELD_TEST_NAME, "rate_pct": FIELD_RATE_PCT,
            "diff": FIELD_DIFF, "missing": FIELD_MISSING, "unexpected": FIELD_UNEXPECTED,
            "equal": FIELD_EQUAL, "source": FIELD_SOURCE, "target": FIELD_TARGET,
            "level": FIELD_LEVEL, "parent_id": FIELD_PARENT_ID,
            "node_id": FIELD_NODE_ID, "is_group": FIELD_IS_GROUP,
        },
    }



def _get_token(token_url: str, client_id: str, client_secret: str) -> str:
    """Fetches an OAuth2 client_credentials token from BTP XSUAA."""
    resp = requests.post(
        token_url,
        data={"grant_type": "client_credentials"},
        auth=HTTPBasicAuth(client_id, client_secret),
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def _get_destination(dest_name: str) -> dict:
    """
    Resolves a named BTP Destination to its config dict.
    Returns the full destination object including proxyHost, proxyPort,
    destinationUrl, and any SAP auth headers.
    """
    token = _get_token(BTP_TOKEN_URL, BTP_DEST_CLIENT_ID, BTP_DEST_CLIENT_SECRET)
    url = f"{BTP_DEST_SVC_URL.rstrip('/')}/destination-configuration/v1/destinations/{dest_name}"
    resp = requests.get(
        url,
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def _build_odata_request(dest: dict) -> tuple[str, dict, dict]:
    """
    Extracts OData URL, headers, and proxy settings from a resolved BTP Destination.
    Returns (odata_url, headers, proxies).
    """
    dest_url   = dest.get("destinationConfiguration", {}).get("URL", "").rstrip("/")
    sap_client = dest.get("destinationConfiguration", {}).get("sap-client", "100")

    auth_tokens = dest.get("authTokens", [])
    headers = {"Accept": "application/json", "sap-client": sap_client}
    if auth_tokens:
        t = auth_tokens[0]
        headers["Authorization"] = f"{t.get('type', 'Bearer')} {t.get('value', '')}"

    proxy_host = dest.get("onPremiseProxy", {}).get("proxyHost") or BTP_CONN_PROXY_HOST
    proxy_port = dest.get("onPremiseProxy", {}).get("proxyPort") or BTP_CONN_PROXY_PORT
    proxies = {}
    if proxy_host and proxy_port:
        proxy_addr = f"http://{proxy_host}:{proxy_port}"
        proxies = {"http": proxy_addr, "https": proxy_addr}

    odata_url = f"{dest_url}{SAP_ODATA_SERVICE.rstrip('/')}/{ODATA_ENTITY_SET}"
    return odata_url, headers, proxies


def test_btp_connection() -> dict:
    """
    Live end-to-end connectivity test: XSUAA token → Destination resolve → OData $top=1 probe.
    Never raises — always returns a structured result dict. Safe to expose from an API endpoint.
    """
    steps: list[dict] = []

    def _step(name: str, ok: bool, detail: str):
        icon = "✅" if ok else "❌"
        steps.append({"step": name, "ok": ok, "detail": f"{icon} {detail}"})
        log.info("btp_test step=%s ok=%s detail=%s", name, ok, detail)

    # Step 1 — XSUAA token
    token = None
    try:
        token = _get_token(BTP_TOKEN_URL, BTP_DEST_CLIENT_ID, BTP_DEST_CLIENT_SECRET)
        _step("XSUAA OAuth2 token", True, "Token acquired from BTP XSUAA")
    except Exception as exc:
        _step("XSUAA OAuth2 token", False,
              f"Failed — check BTP_TOKEN_URL, BTP_DEST_CLIENT_ID, BTP_DEST_CLIENT_SECRET. Error: {exc}")
        return {"ok": False, "steps": steps,
                "error": "XSUAA token request failed. Verify credential env vars and token URL."}

    # Step 2 — Resolve Destination
    dest = None
    try:
        dest = _get_destination(SAP_DESTINATION_NAME)
        dest_url = dest.get("destinationConfiguration", {}).get("URL", "(none)")
        proxy_type = dest.get("destinationConfiguration", {}).get("ProxyType", "unknown")
        _step(f"Resolve destination '{SAP_DESTINATION_NAME}'", True,
              f"URL: {dest_url} | ProxyType: {proxy_type}")
    except Exception as exc:
        _step(f"Resolve destination '{SAP_DESTINATION_NAME}'", False,
              f"Not found or auth error — ensure destination exists in BTP cockpit. Error: {exc}")
        return {"ok": False, "steps": steps,
                "error": f"Destination '{SAP_DESTINATION_NAME}' could not be resolved."}

    # Step 3 — OData $top=1 probe
    try:
        odata_url, headers, proxies = _build_odata_request(dest)
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
              f"HTTP {resp.status_code} — {count} record(s) returned")
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response else "?"
        body   = exc.response.text[:200] if exc.response else ""
        _step("SAP OData probe", False,
              f"HTTP {status} — Check SAP auth, SICF activation, and service account permissions. {body}")
        return {"ok": False, "steps": steps, "error": str(exc)}
    except Exception as exc:
        _step("SAP OData probe", False,
              f"Network error — Check Cloud Connector status and BTP_CONN_PROXY_HOST. Error: {exc}")
        return {"ok": False, "steps": steps, "error": str(exc)}

    log.info("btp_test_passed destination=%s odata=%s", SAP_DESTINATION_NAME, odata_url)
    return {
        "ok": True,
        "steps": steps,
        "destination_name": SAP_DESTINATION_NAME,
        "destination_url":  dest.get("destinationConfiguration", {}).get("URL", ""),
        "odata_endpoint":   odata_url,
    }


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


def _map_odata_to_result(raw_json: dict) -> LTVFParseResult:
    """
    Maps OData d.results[] to LTVFParseResult using the excel_parser schema.
    OData field names are controlled by the FIELD_* constants at the top of this file.
    """
    results = raw_json.get("d", {}).get("results", [])

    rows: list[LTVFRow] = []
    sections: list[str] = []
    pass_c = warn_c = fail_c = 0

    # Grand-total values — look for the root node (level 0, no parent)
    overall_rate   = 0.0
    total_equal    = 0
    total_diff     = 0
    total_missing  = 0
    total_unexp    = 0
    total_source   = 0
    total_target   = 0

    for i, item in enumerate(results):
        level     = int(item.get(FIELD_LEVEL, 0))
        parent_id = item.get(FIELD_PARENT_ID) or None
        node_id   = item.get(FIELD_NODE_ID, f"node_{i}")
        test_name = item.get(FIELD_TEST_NAME, f"Node {i}")
        is_group_raw = item.get(FIELD_IS_GROUP, "")
        is_group  = is_group_raw in ("X", "true", True, 1) if is_group_raw != "" else (level < 2)

        rate = _safe_float(item.get(FIELD_RATE_PCT))

        # Build full_path from test_name (OData doesn't provide it directly)
        full_path = test_name

        # Collect top-level sections
        if level == 0 and not parent_id:
            if test_name not in sections:
                sections.append(test_name)
            # Use root node for grand totals
            overall_rate  = _safe_float(item.get(FIELD_RATE_PCT)) or 0.0
            total_equal   = _safe_int(item.get(FIELD_EQUAL)) or 0
            total_diff    = _safe_int(item.get(FIELD_DIFF)) or 0
            total_missing = _safe_int(item.get(FIELD_MISSING)) or 0
            total_unexp   = _safe_int(item.get(FIELD_UNEXPECTED)) or 0
            total_source  = _safe_int(item.get(FIELD_SOURCE)) or 0
            total_target  = _safe_int(item.get(FIELD_TARGET)) or 0

        if not is_group and rate is not None:
            if rate >= 95:   pass_c += 1
            elif rate >= 80: warn_c += 1
            else:            fail_c += 1

        rows.append(LTVFRow(
            id=str(node_id),
            parent_id=str(parent_id) if parent_id else None,
            level=level,
            test_name=test_name,
            full_path=full_path,
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


def fetch_ltvf_via_btp() -> LTVFParseResult:
    """
    Fetches live LTVF data from on-premise SAP via BTP Destination + Cloud Connector.
    Uses _build_odata_request() to extract URL/headers/proxy from the resolved Destination.
    """
    dest = _get_destination(SAP_DESTINATION_NAME)
    sap_client = dest.get("destinationConfiguration", {}).get("sap-client", "100")
    odata_url, headers, proxies = _build_odata_request(dest)

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
