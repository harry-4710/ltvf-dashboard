import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from schemas import LTVFParseResult
from excel_parser import parse_excel
from btp_client import fetch_ltvf_via_btp, is_btp_configured
from sharepoint_client import fetch_ltvf_from_sharepoint, is_sharepoint_configured, get_file_info
from settings import settings_router
from result_history import results_router
from alerting import send_alert_if_needed

app = FastAPI(
    title="LTVF Dashboard API",
    version="3.0.0",
    description="SAP CNVLTVF3 migration test results — parse, persist, and query.",
)

# In production set ALLOWED_ORIGINS=https://your-app.vercel.app
# Falls back to wildcard for local dev
_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
_origins = [o.strip() for o in _origins_env.split(",")] if _origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(settings_router)
app.include_router(results_router)

_MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


@app.post("/api/upload", response_model=LTVFParseResult, tags=["Parse"],
          summary="Upload LTVF Excel file and receive parsed results")
async def upload_ltvf(request: Request, file: UploadFile = File(...)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .xlsx or .xls files are accepted.")
    contents = await file.read(_MAX_UPLOAD_BYTES + 1)
    if len(contents) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum upload size is 10 MB.")
    try:
        result = parse_excel(contents, file.filename)
    except Exception as exc:
        import traceback
        raise HTTPException(status_code=422, detail=f"Failed to parse file: {exc}\n{traceback.format_exc()}")
    return result


@app.get("/api/sap/status", tags=["SAP"],
         summary="Check if BTP SAP integration is configured")
def sap_status():
    """Returns whether BTP connectivity is configured and available."""
    return {"available": is_btp_configured(), "mode": "btp"}


@app.get("/api/sap/fetch", response_model=LTVFParseResult, tags=["SAP"],
         summary="Fetch live LTVF data from SAP via BTP Destination + Cloud Connector")
def sap_fetch():
    if not is_btp_configured():
        raise HTTPException(status_code=503, detail="SAP BTP integration is not configured on this server.")
    try:
        return fetch_ltvf_via_btp()
    except Exception as exc:
        import traceback
        raise HTTPException(status_code=502, detail=f"Failed to fetch from SAP via BTP: {exc}\n{traceback.format_exc()}")


@app.get("/", tags=["Meta"])
def root():
    return {"service": "LTVF Dashboard API", "status": "ok", "version": "3.0.0"}


@app.get("/api/health", tags=["Meta"])
def health():
    return {"status": "ok", "version": "3.0.0"}


@app.get("/api/scheduled/status", tags=["Scheduled"],
         summary="Check if SharePoint scheduled export is configured")
def scheduled_status():
    """
    Returns whether SharePoint scheduled export is configured,
    and metadata of the latest file (filename, last_modified timestamp).
    """
    if not is_sharepoint_configured():
        return {"available": False, "last_modified": None, "filename": None}
    try:
        info = get_file_info()
        if info:
            return {
                "available":     True,
                "last_modified": info["last_modified"],
                "filename":      info["filename"],
            }
        return {"available": True, "last_modified": None, "filename": None}
    except Exception:
        return {"available": False, "last_modified": None, "filename": None}


@app.get("/api/scheduled/fetch", response_model=LTVFParseResult, tags=["Scheduled"],
         summary="Download latest SAP export from SharePoint and return parsed results")
def scheduled_fetch(system_tag: str = "default"):
    """Downloads the latest SAP export from SharePoint and returns parsed results.
    Also triggers an email alert if the overall rate drops below the warn threshold.
    """
    if not is_sharepoint_configured():
        raise HTTPException(status_code=503, detail="SharePoint integration is not configured.")
    try:
        result = fetch_ltvf_from_sharepoint()
        # Fire alert if rate is below warn threshold (non-blocking)
        try:
            send_alert_if_needed(system_tag, result.summary.overall_rate)
        except Exception:
            pass  # Never let alerting break the main response
        return result
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        import traceback
        raise HTTPException(status_code=502, detail=f"Failed to fetch from SharePoint: {exc}\n{traceback.format_exc()}")

