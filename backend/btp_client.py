import os
from typing import Optional
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv
from excel_parser import LTVFParseResult, LTVFRow, LTVFSummary

load_dotenv()

# ── BTP service credentials ────────────────────────────────────────────────────
BTP_TOKEN_URL         = os.getenv("BTP_TOKEN_URL", "")
BTP_DEST_CLIENT_ID    = os.getenv("BTP_DEST_CLIENT_ID", "")
BTP_DEST_CLIENT_SECRET= os.getenv("BTP_DEST_CLIENT_SECRET", "")
BTP_DEST_SVC_URL      = os.getenv("BTP_DEST_SVC_URL", "")
BTP_CONN_PROXY_HOST   = os.getenv("BTP_CONN_PROXY_HOST", "")
BTP_CONN_PROXY_PORT   = os.getenv("BTP_CONN_PROXY_PORT", "20003")
SAP_DESTINATION_NAME  = os.getenv("SAP_DESTINATION_NAME", "LTVF_ONPREMISE")

# ── OData field name constants — adjust if BASIS uses different names ──────────
FIELD_TEST_NAME   = "Description"
FIELD_RATE_PCT    = "MatchRate"
FIELD_DIFF        = "DiffCount"
FIELD_MISSING     = "MissingCount"
FIELD_UNEXPECTED  = "UnexpectedCount"
FIELD_EQUAL       = "EqualCount"
FIELD_SOURCE      = "SourceVolume"
FIELD_TARGET      = "TargetVolume"
FIELD_LEVEL       = "HierarchyLevel"
FIELD_PARENT_ID   = "ParentNodeId"
FIELD_NODE_ID     = "NodeId"
FIELD_IS_GROUP    = "IsGroup"
ODATA_ENTITY_SET  = "LTVFResultSet"


def is_btp_configured() -> bool:
    """Returns True if all required BTP env vars are set."""
    return all([
        BTP_TOKEN_URL,
        BTP_DEST_CLIENT_ID,
        BTP_DEST_CLIENT_SECRET,
        BTP_DEST_SVC_URL,
    ])


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

    Flow:
      1. Resolve SAP_DESTINATION_NAME via BTP Destination Service
      2. Extract on-premise URL, proxy host/port, and SAP auth headers
      3. Call OData endpoint through the BTP Connectivity proxy
      4. Map response to LTVFParseResult
    """
    dest = _get_destination(SAP_DESTINATION_NAME)

    # Extract destination URL and SAP auth headers from BTP response
    dest_url    = dest.get("destinationConfiguration", {}).get("URL", "")
    sap_client  = dest.get("destinationConfiguration", {}).get("sap-client", "100")

    # Auth headers injected by BTP Destination Service (BasicAuthentication or PrincipalPropagation)
    auth_tokens = dest.get("authTokens", [])
    auth_header = None
    if auth_tokens:
        first = auth_tokens[0]
        auth_header = f"{first.get('type', 'Bearer')} {first.get('value', '')}"

    # On-premise proxy — use env override or destination service proxy info
    proxy_host = dest.get("onPremiseProxy", {}).get("proxyHost") or BTP_CONN_PROXY_HOST
    proxy_port = dest.get("onPremiseProxy", {}).get("proxyPort") or BTP_CONN_PROXY_PORT

    odata_url = f"{dest_url.rstrip('/')}/sap/opu/odata/sap/CNVLTVF3_SRV/{ODATA_ENTITY_SET}"
    params = {
        "sap-client": sap_client,
        "$format": "json",
        "$expand": "ToChildren",
    }
    headers = {"Accept": "application/json"}
    if auth_header:
        headers["Authorization"] = auth_header

    proxies = {}
    if proxy_host and proxy_port:
        proxies = {"https": f"http://{proxy_host}:{proxy_port}"}

    resp = requests.get(
        odata_url,
        params=params,
        headers=headers,
        proxies=proxies,
        timeout=30,
        verify=True,
    )
    resp.raise_for_status()

    return _map_odata_to_result(resp.json())
