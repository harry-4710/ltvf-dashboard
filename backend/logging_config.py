"""
backend/logging_config.py — Structured JSON logging for the LTVF backend.

Outputs one JSON object per log line so logs are directly ingestible by
Render log drains, Datadog, Splunk, or any log aggregator.

Usage:
    from logging_config import setup_logging
    setup_logging()          # call once at startup, before app = FastAPI(...)
"""

import json
import logging
import sys
from datetime import datetime, timezone


class _JSONFormatter(logging.Formatter):
    """Formats log records as single-line JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "ts":      datetime.now(timezone.utc).isoformat(),
            "level":   record.levelname,
            "logger":  record.name,
            "message": record.getMessage(),
        }

        # Include structured extra fields if provided
        for key, value in record.__dict__.items():
            if key not in (
                "args", "created", "exc_info", "exc_text", "filename",
                "funcName", "levelname", "levelno", "lineno", "message",
                "module", "msecs", "msg", "name", "pathname", "process",
                "processName", "relativeCreated", "stack_info", "thread",
                "threadName", "taskName",
            ):
                payload[key] = value

        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)


def setup_logging(level: int = logging.INFO) -> None:
    """
    Install the JSON formatter on the root logger and suppress
    the default uvicorn access log format.
    Call once at application startup.
    """
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_JSONFormatter())

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers = [handler]

    # Suppress uvicorn's own plain-text formatter — use ours instead
    for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error", "fastapi"):
        lgr = logging.getLogger(logger_name)
        lgr.handlers = [handler]
        lgr.propagate = False
