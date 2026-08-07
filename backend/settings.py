import os
import sqlite3
from contextlib import contextmanager
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "settings.db")

_DEFAULTS = {"pass": 95, "warn": 80}


def _init_db() -> None:
    with sqlite3.connect(_DB_PATH) as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings "
            "(system_tag TEXT PRIMARY KEY, pass_threshold INTEGER NOT NULL, warn_threshold INTEGER NOT NULL)"
        )
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


def get_settings(tag: str) -> dict:
    key = tag.strip() or "default"
    with _db() as conn:
        row = conn.execute(
            "SELECT pass_threshold, warn_threshold FROM settings WHERE system_tag = ?", (key,)
        ).fetchone()
    if row:
        return {"pass": row["pass_threshold"], "warn": row["warn_threshold"]}
    return dict(_DEFAULTS)


def save_settings(tag: str, pass_t: int, warn_t: int) -> None:
    key = tag.strip() or "default"
    with _db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO settings (system_tag, pass_threshold, warn_threshold) "
            "VALUES (?, ?, ?)",
            (key, pass_t, warn_t),
        )


class _SettingsBody(BaseModel):
    system_tag: str
    pass_threshold: int
    warn_threshold: int


settings_router = APIRouter()


@settings_router.get("/api/settings")
def settings_get(tag: str = ""):
    """Return pass/warn thresholds for the given system tag (defaults to 'default')."""
    return get_settings(tag)


@settings_router.put("/api/settings")
def settings_put(body: _SettingsBody):
    """Persist pass/warn thresholds for the given system tag."""
    if not (0 <= body.pass_threshold <= 100 and 0 <= body.warn_threshold <= 100):
        raise HTTPException(status_code=422, detail="Thresholds must be integers 0–100")
    save_settings(body.system_tag, body.pass_threshold, body.warn_threshold)
    return {"ok": True}
