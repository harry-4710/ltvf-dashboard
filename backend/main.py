import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from excel_parser import parse_excel, LTVFParseResult
from btp_client import fetch_ltvf_via_btp, is_btp_configured
from sharepoint_client import fetch_ltvf_from_sharepoint, is_sharepoint_configured, get_file_info

app = FastAPI(title="LTVF Dashboard API", version="2.0.0")

# In production set ALLOWED_ORIGINS=https://your-app.vercel.app
# Falls back to wildcard for local dev
_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
_origins = [o.strip() for o in _origins_env.split(",")] if _origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.post("/api/upload", response_model=LTVFParseResult)
async def upload_ltvf(file: UploadFile = File(...)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .xlsx or .xls files are accepted.")
    contents = await file.read()
    try:
        result = parse_excel(contents, file.filename)
    except Exception as exc:
        import traceback
        raise HTTPException(status_code=422, detail=f"Failed to parse file: {exc}\n{traceback.format_exc()}")
    return result


@app.get("/api/sap/status")
def sap_status():
    """Returns whether BTP connectivity is configured and available."""
    return {"available": is_btp_configured(), "mode": "btp"}


@app.get("/api/sap/fetch", response_model=LTVFParseResult)
def sap_fetch():
    """Fetches live LTVF data from on-premise SAP via BTP Destination + Cloud Connector."""
    if not is_btp_configured():
        raise HTTPException(status_code=503, detail="SAP BTP integration is not configured on this server.")
    try:
        return fetch_ltvf_via_btp()
    except Exception as exc:
        import traceback
        raise HTTPException(status_code=502, detail=f"Failed to fetch from SAP via BTP: {exc}\n{traceback.format_exc()}")


@app.get("/")
def root():
    return {"service": "LTVF Dashboard API", "status": "ok", "version": "2.0.0"}


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


@app.get("/api/scheduled/status")
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


@app.get("/api/scheduled/fetch", response_model=LTVFParseResult)
def scheduled_fetch():
    """Downloads the latest SAP export from SharePoint and returns parsed results."""
    if not is_sharepoint_configured():
        raise HTTPException(status_code=503, detail="SharePoint integration is not configured.")
    try:
        return fetch_ltvf_from_sharepoint()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        import traceback
        raise HTTPException(status_code=502, detail=f"Failed to fetch from SharePoint: {exc}\n{traceback.format_exc()}")
