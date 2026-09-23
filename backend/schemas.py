"""
backend/schemas.py — Single canonical Pydantic models for LTVF data.

All backend modules (excel_parser, btp_client, sharepoint_client, main)
import from here. Do NOT define LTVFRow / LTVFSummary / LTVFParseResult
anywhere else.
"""
from pydantic import BaseModel
from typing import Optional


class LTVFRow(BaseModel):
    id: str
    parent_id: Optional[str] = None
    level: int
    test_name: str
    full_path: str
    is_group: bool
    rate_pct: Optional[float] = None
    diff: Optional[int] = None
    accept: Optional[int] = None
    missing: Optional[int] = None
    unexpected: Optional[int] = None
    equal: Optional[int] = None
    oos_src: Optional[int] = None
    oos_trg: Optional[int] = None
    local: Optional[int] = None
    source: Optional[int] = None
    source1: Optional[int] = None
    source2: Optional[int] = None
    target: Optional[int] = None
    # LTVR-specific fields (present when file has Sign-Off column)
    so_status: Optional[str] = None   # "Approved" | "Rejected" | "Re-check"
    signed_by: Optional[str] = None
    wi_pct: Optional[float] = None    # WI(%) — work-item completion %
    tot: Optional[int] = None         # total work items
    err: Optional[int] = None         # error count
    fin: Optional[int] = None         # finished count


class LTVFSummary(BaseModel):
    overall_rate: float
    total_equal: int
    total_diff: int
    total_missing: int
    total_unexpected: int
    total_source: int
    total_target: int
    total_rows: int
    pass_count: int   # rate >= pass threshold (default 95)
    warn_count: int   # warn threshold <= rate < pass threshold (default 80–94)
    fail_count: int   # rate < warn threshold (default < 80)
    # LTVR sign-off summary (all zero / False for non-LTVR files)
    has_signoff: bool = False
    total_approved: int = 0
    total_rejected: int = 0
    total_recheck: int = 0
    total_volume: int = 0    # aggregate Tot (work items) from LTVR grand-total row


class LTVFParseResult(BaseModel):
    filename: str
    summary: LTVFSummary
    rows: list[LTVFRow]
    sections: list[str]
