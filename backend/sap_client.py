import os
import requests
from requests.auth import HTTPBasicAuth
from models import LTVFRow
from dotenv import load_dotenv

load_dotenv()

SAP_BASE_URL = os.getenv("SAP_BASE_URL", "")
SAP_CLIENT = os.getenv("SAP_CLIENT", "100")
SAP_USER = os.getenv("SAP_USER", "")
SAP_PASSWORD = os.getenv("SAP_PASSWORD", "")
SAP_ODATA_SERVICE = os.getenv("SAP_ODATA_SERVICE", "/sap/opu/odata/sap/CNVLTVF3_SRV")


def fetch_ltvf_from_sap() -> list[LTVFRow]:
    """
    Fetches LTVF result rows from SAP via OData.
    Replace the entity set name (LTVFResultSet) once confirmed by BASIS team.
    """
    url = f"{SAP_BASE_URL}{SAP_ODATA_SERVICE}/LTVFResultSet"
    params = {
        "sap-client": SAP_CLIENT,
        "$format": "json",
        "$expand": "ToChildren",
    }
    headers = {
        "Accept": "application/json",
        "sap-client": SAP_CLIENT,
    }

    resp = requests.get(
        url,
        params=params,
        headers=headers,
        auth=HTTPBasicAuth(SAP_USER, SAP_PASSWORD),
        verify=True,
        timeout=30,
    )
    resp.raise_for_status()

    raw = resp.json()
    results = raw.get("d", {}).get("results", [])

    rows: list[LTVFRow] = []
    for i, item in enumerate(results):
        rows.append(
            LTVFRow(
                id=item.get("NodeId", str(i)),
                parent_id=item.get("ParentNodeId") or None,
                level=int(item.get("HierarchyLevel", 0)),
                label=item.get("Description", ""),
                gl_account=item.get("GLAccount") or None,
                cost_center=item.get("CostCenter") or None,
                tc1_fi=_to_float(item.get("TC1FI")),
                total=_to_float(item.get("Total")),
                net_mrp=_to_float(item.get("NetMRP")),
                local_amount=_to_float(item.get("LocalAmount")),
                global_amount=_to_float(item.get("GlobalAmount")),
                delta=_to_float(item.get("Delta")),
                delta_pct=_to_float(item.get("DeltaPct")),
                is_group=item.get("IsGroup", "X") == "X",
            )
        )
    return rows


def _to_float(val) -> float | None:
    try:
        return float(val) if val is not None else None
    except (ValueError, TypeError):
        return None
