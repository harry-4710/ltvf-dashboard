import os
from typing import Optional
import requests
from dotenv import load_dotenv
from excel_parser import LTVFParseResult, LTVFRow, LTVFSummary, parse_excel

load_dotenv()

TENANT_ID          = os.getenv("SHAREPOINT_TENANT_ID", "")
CLIENT_ID          = os.getenv("SHAREPOINT_CLIENT_ID", "")
CLIENT_SECRET      = os.getenv("SHAREPOINT_CLIENT_SECRET", "")
SITE_NAME          = os.getenv("SHAREPOINT_SITE_NAME", "")
FOLDER_PATH        = os.getenv("SHAREPOINT_FOLDER_PATH", "/SAP Exports")
FILENAME           = os.getenv("SHAREPOINT_FILENAME", "ltvf_latest.xlsx")
USE_MOCK_SCHEDULED = os.getenv("USE_MOCK_SCHEDULED", "false").lower() == "true"

MOCK_LAST_MODIFIED = "2026-07-24T02:14:00Z"
GRAPH_BASE         = "https://graph.microsoft.com/v1.0"
TOKEN_URL          = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"


def is_sharepoint_configured() -> bool:
    """Returns True if mock mode is on OR all real SharePoint env vars are set."""
    return USE_MOCK_SCHEDULED or all([TENANT_ID, CLIENT_ID, CLIENT_SECRET, SITE_NAME])


def _build_mock_result() -> LTVFParseResult:
    """Returns a realistic LTVFParseResult with sample SAP migration test data."""
    rows = [
        # ── Section 1: Master Data ────────────────────────────────────────────
        LTVFRow(id="s1", parent_id=None, level=0, is_group=True,
                test_name="01. Master Data", full_path="01. Master Data",
                rate_pct=96.4, equal=48200, diff=1800, missing=320, unexpected=180,
                source=50500, target=50320),

        LTVFRow(id="s1-g1", parent_id="s1", level=1, is_group=True,
                test_name="1.1 FI-GL General Ledger",
                full_path="01. Master Data > 1.1 FI-GL General Ledger",
                rate_pct=98.2, equal=19640, diff=360, missing=80, unexpected=40,
                source=20120, target=20040),
        LTVFRow(id="s1-g1-1", parent_id="s1-g1", level=2, is_group=False,
                test_name="GL Account Master — Chart of Accounts",
                full_path="01. Master Data > 1.1 FI-GL General Ledger > GL Account Master — Chart of Accounts",
                rate_pct=99.1, equal=8910, diff=90, missing=10, unexpected=5, source=9010, target=9000),
        LTVFRow(id="s1-g1-2", parent_id="s1-g1", level=2, is_group=False,
                test_name="GL Account Master — Company Code Data",
                full_path="01. Master Data > 1.1 FI-GL General Ledger > GL Account Master — Company Code Data",
                rate_pct=97.5, equal=9750, diff=250, missing=30, unexpected=20, source=10030, target=10000),
        LTVFRow(id="s1-g1-3", parent_id="s1-g1", level=2, is_group=False,
                test_name="Cost Element Master",
                full_path="01. Master Data > 1.1 FI-GL General Ledger > Cost Element Master",
                rate_pct=95.8, equal=980, diff=20, missing=5, unexpected=3, source=1005, target=1000),

        LTVFRow(id="s1-g2", parent_id="s1", level=1, is_group=True,
                test_name="1.2 CO Cost Centers",
                full_path="01. Master Data > 1.2 CO Cost Centers",
                rate_pct=96.0, equal=14400, diff=600, missing=120, unexpected=80,
                source=15200, target=15080),
        LTVFRow(id="s1-g2-1", parent_id="s1-g2", level=2, is_group=False,
                test_name="Cost Center Master — Basic Data",
                full_path="01. Master Data > 1.2 CO Cost Centers > Cost Center Master — Basic Data",
                rate_pct=97.2, equal=6804, diff=196, missing=40, unexpected=20, source=7060, target=7020),
        LTVFRow(id="s1-g2-2", parent_id="s1-g2", level=2, is_group=False,
                test_name="Cost Center Hierarchy",
                full_path="01. Master Data > 1.2 CO Cost Centers > Cost Center Hierarchy",
                rate_pct=94.5, equal=5670, diff=330, missing=60, unexpected=40, source=6100, target=6060),
        LTVFRow(id="s1-g2-3", parent_id="s1-g2", level=2, is_group=False,
                test_name="Cost Center Assignments",
                full_path="01. Master Data > 1.2 CO Cost Centers > Cost Center Assignments",
                rate_pct=94.8, equal=1896, diff=104, missing=20, unexpected=10, source=2030, target=2010),

        LTVFRow(id="s1-g3", parent_id="s1", level=1, is_group=True,
                test_name="1.3 Business Partners",
                full_path="01. Master Data > 1.3 Business Partners",
                rate_pct=93.6, equal=14160, diff=840, missing=120, unexpected=60,
                source=15180, target=15060),
        LTVFRow(id="s1-g3-1", parent_id="s1-g3", level=2, is_group=False,
                test_name="Customer Master — General Data",
                full_path="01. Master Data > 1.3 Business Partners > Customer Master — General Data",
                rate_pct=95.3, equal=4765, diff=235, missing=30, unexpected=15, source=5045, target=5015),
        LTVFRow(id="s1-g3-2", parent_id="s1-g3", level=2, is_group=False,
                test_name="Vendor Master — General Data",
                full_path="01. Master Data > 1.3 Business Partners > Vendor Master — General Data",
                rate_pct=92.1, equal=4605, diff=395, missing=50, unexpected=25, source=5075, target=5025),
        LTVFRow(id="s1-g3-3", parent_id="s1-g3", level=2, is_group=False,
                test_name="Bank Master Data",
                full_path="01. Master Data > 1.3 Business Partners > Bank Master Data",
                rate_pct=88.0, equal=4400, diff=600, missing=80, unexpected=40, source=5120, target=5040),

        # ── Section 2: Transactional Data ────────────────────────────────────
        LTVFRow(id="s2", parent_id=None, level=0, is_group=True,
                test_name="02. Transactional Data", full_path="02. Transactional Data",
                rate_pct=91.2, equal=45600, diff=4400, missing=820, unexpected=440,
                source=51260, target=50820),

        LTVFRow(id="s2-g1", parent_id="s2", level=1, is_group=True,
                test_name="2.1 FI Open Items",
                full_path="02. Transactional Data > 2.1 FI Open Items",
                rate_pct=93.5, equal=18700, diff=1300, missing=240, unexpected=120,
                source=20360, target=20120),
        LTVFRow(id="s2-g1-1", parent_id="s2-g1", level=2, is_group=False,
                test_name="Open Customer Items",
                full_path="02. Transactional Data > 2.1 FI Open Items > Open Customer Items",
                rate_pct=95.4, equal=9540, diff=460, missing=80, unexpected=40, source=10120, target=10040),
        LTVFRow(id="s2-g1-2", parent_id="s2-g1", level=2, is_group=False,
                test_name="Open Vendor Items",
                full_path="02. Transactional Data > 2.1 FI Open Items > Open Vendor Items",
                rate_pct=91.8, equal=9160, diff=840, missing=160, unexpected=80, source=10240, target=10080),

        LTVFRow(id="s2-g2", parent_id="s2", level=1, is_group=True,
                test_name="2.2 CO Actual Postings",
                full_path="02. Transactional Data > 2.2 CO Actual Postings",
                rate_pct=89.4, equal=17880, diff=2120, missing=380, unexpected=200,
                source=20580, target=20200),
        LTVFRow(id="s2-g2-1", parent_id="s2-g2", level=2, is_group=False,
                test_name="Cost Center Actuals",
                full_path="02. Transactional Data > 2.2 CO Actual Postings > Cost Center Actuals",
                rate_pct=90.5, equal=9050, diff=950, missing=180, unexpected=90, source=10270, target=10090),
        LTVFRow(id="s2-g2-2", parent_id="s2-g2", level=2, is_group=False,
                test_name="Internal Order Actuals",
                full_path="02. Transactional Data > 2.2 CO Actual Postings > Internal Order Actuals",
                rate_pct=88.2, equal=8820, diff=1180, missing=200, unexpected=110, source=10310, target=10110),
        LTVFRow(id="s2-g2-3", parent_id="s2-g2", level=2, is_group=False,
                test_name="Profit Center Actuals",
                full_path="02. Transactional Data > 2.2 CO Actual Postings > Profit Center Actuals",
                rate_pct=75.3, equal=3765, diff=1235, missing=220, unexpected=110, source=5330, target=5110),

        LTVFRow(id="s2-g3", parent_id="s2", level=1, is_group=True,
                test_name="2.3 MM Inventory",
                full_path="02. Transactional Data > 2.3 MM Inventory",
                rate_pct=91.8, equal=9180, diff=820, missing=120, unexpected=60,
                source=10180, target=10060),
        LTVFRow(id="s2-g3-1", parent_id="s2-g3", level=2, is_group=False,
                test_name="Material Stock Balances",
                full_path="02. Transactional Data > 2.3 MM Inventory > Material Stock Balances",
                rate_pct=93.2, equal=4660, diff=340, missing=50, unexpected=25, source=5075, target=5025),
        LTVFRow(id="s2-g3-2", parent_id="s2-g3", level=2, is_group=False,
                test_name="Warehouse Management",
                full_path="02. Transactional Data > 2.3 MM Inventory > Warehouse Management",
                rate_pct=72.1, equal=3605, diff=1395, missing=180, unexpected=90, source=5270, target=5090),

        # ── Section 3: Configuration ──────────────────────────────────────────
        LTVFRow(id="s3", parent_id=None, level=0, is_group=True,
                test_name="03. Configuration", full_path="03. Configuration",
                rate_pct=98.7, equal=14805, diff=195, missing=30, unexpected=15,
                source=15045, target=15015),

        LTVFRow(id="s3-g1", parent_id="s3", level=1, is_group=True,
                test_name="3.1 Company Code Settings",
                full_path="03. Configuration > 3.1 Company Code Settings",
                rate_pct=99.2, equal=4960, diff=40, missing=8, unexpected=4, source=5012, target=5004),
        LTVFRow(id="s3-g1-1", parent_id="s3-g1", level=2, is_group=False,
                test_name="Company Code Global Parameters",
                full_path="03. Configuration > 3.1 Company Code Settings > Company Code Global Parameters",
                rate_pct=100.0, equal=2500, diff=0, missing=0, unexpected=0, source=2500, target=2500),
        LTVFRow(id="s3-g1-2", parent_id="s3-g1", level=2, is_group=False,
                test_name="Fiscal Year Variants",
                full_path="03. Configuration > 3.1 Company Code Settings > Fiscal Year Variants",
                rate_pct=98.4, equal=2460, diff=40, missing=8, unexpected=4, source=2512, target=2504),

        LTVFRow(id="s3-g2", parent_id="s3", level=1, is_group=True,
                test_name="3.2 Chart of Accounts Config",
                full_path="03. Configuration > 3.2 Chart of Accounts Config",
                rate_pct=98.3, equal=9845, diff=155, missing=22, unexpected=11, source=10033, target=10011),
        LTVFRow(id="s3-g2-1", parent_id="s3-g2", level=2, is_group=False,
                test_name="Account Groups",
                full_path="03. Configuration > 3.2 Chart of Accounts Config > Account Groups",
                rate_pct=99.5, equal=4975, diff=25, missing=5, unexpected=2, source=5007, target=5002),
        LTVFRow(id="s3-g2-2", parent_id="s3-g2", level=2, is_group=False,
                test_name="Field Status Groups",
                full_path="03. Configuration > 3.2 Chart of Accounts Config > Field Status Groups",
                rate_pct=97.1, equal=4855, diff=145, missing=20, unexpected=10, source=4885, target=4865),
        LTVFRow(id="s3-g2-3", parent_id="s3-g2", level=2, is_group=False,
                test_name="Posting Period Variants",
                full_path="03. Configuration > 3.2 Chart of Accounts Config > Posting Period Variants",
                rate_pct=100.0, equal=150, diff=0, missing=0, unexpected=0, source=150, target=150),
    ]

    pass_c = sum(1 for r in rows if not r.is_group and r.rate_pct is not None and r.rate_pct >= 95)
    warn_c = sum(1 for r in rows if not r.is_group and r.rate_pct is not None and 80 <= r.rate_pct < 95)
    fail_c = sum(1 for r in rows if not r.is_group and r.rate_pct is not None and r.rate_pct < 80)

    return LTVFParseResult(
        filename="ltvf_latest.xlsx  (Sample Data)",
        summary=LTVFSummary(
            overall_rate=94.2,
            total_equal=108605,
            total_diff=6395,
            total_missing=1170,
            total_unexpected=635,
            total_source=116805,
            total_target=116155,
            total_rows=pass_c + warn_c + fail_c,
            pass_count=pass_c,
            warn_count=warn_c,
            fail_count=fail_c,
        ),
        rows=rows,
        sections=["01. Master Data", "02. Transactional Data", "03. Configuration"],
    )


def _get_token() -> str:
    resp = requests.post(
        TOKEN_URL,
        data={
            "grant_type":    "client_credentials",
            "client_id":     CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "scope":         "https://graph.microsoft.com/.default",
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def _get_site_id(token: str) -> str:
    resp = requests.get(
        f"{GRAPH_BASE}/sites?search={SITE_NAME}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    resp.raise_for_status()
    sites = resp.json().get("value", [])
    if not sites:
        raise ValueError(f"SharePoint site '{SITE_NAME}' not found.")
    return sites[0]["id"]


def _get_file_metadata(token: str, site_id: str) -> Optional[dict]:
    folder = FOLDER_PATH.strip("/")
    path   = f"{GRAPH_BASE}/sites/{site_id}/drive/root:/{folder}/{FILENAME}"
    resp   = requests.get(path, headers={"Authorization": f"Bearer {token}"}, timeout=15)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    item = resp.json()
    return {
        "filename":      item.get("name", FILENAME),
        "last_modified": item.get("lastModifiedDateTime", ""),
        "size_bytes":    item.get("size", 0),
        "download_url":  item.get("@microsoft.graph.downloadUrl", ""),
    }


def get_file_info() -> Optional[dict]:
    """Returns file metadata. In mock mode returns a fixed timestamp."""
    if USE_MOCK_SCHEDULED:
        return {"filename": "ltvf_latest.xlsx", "last_modified": MOCK_LAST_MODIFIED}
    if not is_sharepoint_configured():
        return None
    token   = _get_token()
    site_id = _get_site_id(token)
    return _get_file_metadata(token, site_id)


def fetch_ltvf_from_sharepoint() -> LTVFParseResult:
    """Downloads and parses the latest SAP export from SharePoint. Returns mock data if USE_MOCK_SCHEDULED=true."""
    if USE_MOCK_SCHEDULED:
        return _build_mock_result()
    token    = _get_token()
    site_id  = _get_site_id(token)
    metadata = _get_file_metadata(token, site_id)
    if not metadata:
        raise FileNotFoundError(
            f"File '{FILENAME}' not found in SharePoint folder '{FOLDER_PATH}'. "
            "Check that the SAP background job has run."
        )
    dl_resp = requests.get(metadata["download_url"], timeout=60)
    dl_resp.raise_for_status()
    return parse_excel(dl_resp.content, metadata["filename"])
