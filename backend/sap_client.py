import os
from typing import Optional
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv
from excel_parser import LTVFParseResult, LTVFRow, LTVFSummary

load_dotenv()

SAP_BASE_URL      = os.getenv("SAP_BASE_URL", "")
SAP_CLIENT        = os.getenv("SAP_CLIENT", "100")
SAP_USER          = os.getenv("SAP_USER", "")
SAP_PASSWORD      = os.getenv("SAP_PASSWORD", "")
SAP_ODATA_SERVICE = os.getenv("SAP_ODATA_SERVICE", "/sap/opu/odata/sap/CNVLTVF3_SRV")

# OData field name constants — adjust if BASIS exposes different field names
FIELD_NODE_ID    = "NodeId"
FIELD_PARENT_ID  = "ParentNodeId"
FIELD_LEVEL      = "HierarchyLevel"
FIELD_TEST_NAME  = "Description"
FIELD_IS_GROUP   = "IsGroup"
FIELD_RATE_PCT   = "MatchRate"
FIELD_DIFF       = "DiffCount"
FIELD_MISSING    = "MissingCount"
FIELD_UNEXPECTED = "UnexpectedCount"
FIELD_EQUAL      = "EqualCount"
FIELD_SOURCE     = "SourceVolume"
FIELD_TARGET     = "TargetVolume"
ODATA_ENTITY_SET = "LTVFResultSet"


def is_sap_configured() -> bool:
    """Returns True if all required direct SAP env vars are set."""
    return all([SAP_BASE_URL, SAP_USER, SAP_PASSWORD])


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
    Field names are controlled by the FIELD_* constants above.
    """
    results = raw_json.get("d", {}).get("results", [])

    rows: list[LTVFRow] = []
    sections: list[str] = []
    pass_c = warn_c = fail_c = 0

    overall_rate  = 0.0
    total_equal   = 0
    total_diff    = 0
    total_missing = 0
    total_unexp   = 0
    total_source  = 0
    total_target  = 0

    for i, item in enumerate(results):
        level     = int(item.get(FIELD_LEVEL, 0))
        parent_id = item.get(FIELD_PARENT_ID) or None
        node_id   = item.get(FIELD_NODE_ID, f"node_{i}")
        test_name = item.get(FIELD_TEST_NAME, f"Node {i}")
        is_group_raw = item.get(FIELD_IS_GROUP, "")
        is_group  = is_group_raw in ("X", "true", True, 1) if is_group_raw != "" else (level < 2)
        rate      = _safe_float(item.get(FIELD_RATE_PCT))

        # Root node (level 0, no parent) → grand total
        if level == 0 and not parent_id:
            if test_name not in sections:
                sections.append(test_name)
            overall_rate  = _safe_float(item.get(FIELD_RATE_PCT)) or 0.0
            total_equal   = _safe_int(item.get(FIELD_EQUAL))   or 0
            total_diff    = _safe_int(item.get(FIELD_DIFF))    or 0
            total_missing = _safe_int(item.get(FIELD_MISSING)) or 0
            total_unexp   = _safe_int(item.get(FIELD_UNEXPECTED)) or 0
            total_source  = _safe_int(item.get(FIELD_SOURCE))  or 0
            total_target  = _safe_int(item.get(FIELD_TARGET))  or 0

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
            total_rows=pass_c + warn_c + fail_c,
            pass_count=pass_c,
            warn_count=warn_c,
            fail_count=fail_c,
        ),
        rows=rows,
        sections=sections,
    )


def fetch_ltvf_from_sap() -> LTVFParseResult:
    """
    Fetches live LTVF data directly from SAP OData using Basic Auth.
    Requires SAP_BASE_URL, SAP_USER, SAP_PASSWORD in .env.
    No BTP or Cloud Connector needed — SAP host must be reachable from the backend server.
    """
    url = f"{SAP_BASE_URL.rstrip('/')}{SAP_ODATA_SERVICE}/{ODATA_ENTITY_SET}"
    params  = {"sap-client": SAP_CLIENT, "$format": "json", "$expand": "ToChildren"}
    headers = {"Accept": "application/json", "sap-client": SAP_CLIENT}

    resp = requests.get(
        url,
        params=params,
        headers=headers,
        auth=HTTPBasicAuth(SAP_USER, SAP_PASSWORD),
        verify=True,
        timeout=30,
    )
    resp.raise_for_status()
    return _map_odata_to_result(resp.json())
