import os
from typing import Optional
import requests
from dotenv import load_dotenv
from excel_parser import LTVFParseResult, parse_excel

load_dotenv()

TENANT_ID     = os.getenv("SHAREPOINT_TENANT_ID", "")
CLIENT_ID     = os.getenv("SHAREPOINT_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("SHAREPOINT_CLIENT_SECRET", "")
SITE_NAME     = os.getenv("SHAREPOINT_SITE_NAME", "")
FOLDER_PATH   = os.getenv("SHAREPOINT_FOLDER_PATH", "/SAP Exports")
FILENAME      = os.getenv("SHAREPOINT_FILENAME", "ltvf_latest.xlsx")

GRAPH_BASE    = "https://graph.microsoft.com/v1.0"
TOKEN_URL     = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"


def is_sharepoint_configured() -> bool:
    """Returns True if all required SharePoint env vars are set."""
    return all([TENANT_ID, CLIENT_ID, CLIENT_SECRET, SITE_NAME])


def _get_token() -> str:
    """Fetches an OAuth2 client_credentials token from Microsoft Entra ID."""
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
    """Resolves the SharePoint site name to a Graph API site ID."""
    resp = requests.get(
        f"{GRAPH_BASE}/sites?search={SITE_NAME}",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    resp.raise_for_status()
    sites = resp.json().get("value", [])
    if not sites:
        raise ValueError(f"SharePoint site '{SITE_NAME}' not found. Check SHAREPOINT_SITE_NAME.")
    return sites[0]["id"]


def _get_file_metadata(token: str, site_id: str) -> Optional[dict]:
    """
    Returns metadata dict for the target file, or None if not found.
    Includes lastModifiedDateTime so the frontend can show 'Last export: ...'
    """
    folder = FOLDER_PATH.strip("/")
    path   = f"{GRAPH_BASE}/sites/{site_id}/drive/root:/{folder}/{FILENAME}"
    resp   = requests.get(
        path,
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
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
    """
    Public helper — returns file metadata without downloading the file.
    Used by /api/scheduled/status to show last export timestamp.
    """
    if not is_sharepoint_configured():
        return None
    token   = _get_token()
    site_id = _get_site_id(token)
    return _get_file_metadata(token, site_id)


def fetch_ltvf_from_sharepoint() -> LTVFParseResult:
    """
    Downloads the latest SAP export from SharePoint and parses it.
    Uses the existing parse_excel() function — identical to manual upload flow.
    """
    token    = _get_token()
    site_id  = _get_site_id(token)
    metadata = _get_file_metadata(token, site_id)

    if not metadata:
        raise FileNotFoundError(
            f"File '{FILENAME}' not found in SharePoint folder '{FOLDER_PATH}'. "
            "Check that the SAP background job has run and deposited the file."
        )

    # Download file bytes via pre-authenticated download URL
    dl_resp = requests.get(metadata["download_url"], timeout=60)
    dl_resp.raise_for_status()

    # Re-use the existing Excel parser — same as manual upload
    result = parse_excel(dl_resp.content, metadata["filename"])
    return result
