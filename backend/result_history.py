import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "result_history.db")


def _init_db() -> None:
    with sqlite3.connect(_DB_PATH) as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS results ("
            "  id TEXT PRIMARY KEY,"
            "  system_tag TEXT NOT NULL,"
            "  uploaded_at TEXT NOT NULL,"
            "  filename TEXT NOT NULL,"
            "  overall_rate REAL NOT NULL,"
            "  pass_count INTEGER NOT NULL,"
            "  warn_count INTEGER NOT NULL,"
            "  fail_count INTEGER NOT NULL,"
            "  total_rows INTEGER NOT NULL,"
            "  result_json TEXT NOT NULL"
            ")"
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_system_tag ON results (system_tag, uploaded_at DESC)")
        conn.commit()


_init_db()


@contextmanager
def _db():
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


class ResultSaveBody(BaseModel):
    system_tag: str
    filename: str
    summary: dict
    rows: list[dict]
    sections: list[str]


results_router = APIRouter()


@results_router.post("/api/results")
def results_save(body: ResultSaveBody):
    """Persist a full LTVFParseResult for a system tag."""
    now = datetime.now(timezone.utc).isoformat()
    record_id = f"{now[:19]}_{uuid.uuid4().hex[:6]}"
    summary = body.summary
    payload = json.dumps({
        "filename": body.filename,
        "summary": summary,
        "rows": body.rows,
        "sections": body.sections,
    })
    with _db() as conn:
        conn.execute(
            "INSERT INTO results "
            "(id, system_tag, uploaded_at, filename, overall_rate, pass_count, warn_count, fail_count, total_rows, result_json) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                record_id,
                body.system_tag.strip() or "default",
                now,
                body.filename,
                summary.get("overall_rate", 0.0),
                summary.get("pass_count", 0),
                summary.get("warn_count", 0),
                summary.get("fail_count", 0),
                summary.get("total_rows", 0),
                payload,
            ),
        )
    return {"id": record_id, "uploaded_at": now}


@results_router.get("/api/results/{system}")
def results_list(system: str):
    """Return summary metadata for all stored results for the given system tag."""
    key = system.strip() or "default"
    with _db() as conn:
        rows = conn.execute(
            "SELECT id, system_tag, uploaded_at, filename, overall_rate, "
            "pass_count, warn_count, fail_count, total_rows "
            "FROM results WHERE system_tag = ? ORDER BY uploaded_at DESC",
            (key,),
        ).fetchall()
    return [dict(r) for r in rows]


@results_router.get("/api/results/{system}/{date}")
def results_by_date(system: str, date: str):
    """Return the most-recent full LTVFParseResult for the given system tag and date (YYYY-MM-DD)."""
    key = system.strip() or "default"
    with _db() as conn:
        row = conn.execute(
            "SELECT result_json FROM results "
            "WHERE system_tag = ? AND uploaded_at LIKE ? "
            "ORDER BY uploaded_at DESC LIMIT 1",
            (key, f"{date}%"),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"No result found for system '{system}' on {date}")
    return json.loads(row["result_json"])
@results_router.delete("/api/results/{result_id}", tags=["History"],
                       summary="Delete a stored result by ID")
def results_delete(result_id: str):
    """Delete a single stored result record by its ID."""
    with _db() as conn:
        affected = conn.execute(
            "DELETE FROM results WHERE id = ?", (result_id,)
        ).rowcount
    if affected == 0:
        raise HTTPException(status_code=404, detail=f"Result '{result_id}' not found.")
    return {"ok": True, "deleted": result_id}


@results_router.get("/api/systems", tags=["History"],
                    summary="List all system tags that have stored results")
def list_systems():
    """Return all distinct system tags with their last run time and run count."""
    with _db() as conn:
        rows = conn.execute(
            "SELECT system_tag, MAX(uploaded_at) as last_run, COUNT(*) as run_count "
            "FROM results GROUP BY system_tag ORDER BY last_run DESC"
        ).fetchall()
    return [dict(r) for r in rows]

