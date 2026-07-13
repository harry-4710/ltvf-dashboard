import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from excel_parser import parse_excel, LTVFParseResult

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
        raise HTTPException(status_code=422, detail=f"Failed to parse file: {exc}")
    return result


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
