import pandas as pd
import io
import re
from typing import Optional
from pydantic import BaseModel


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


class LTVFSummary(BaseModel):
    overall_rate: float
    total_equal: int
    total_diff: int
    total_missing: int
    total_unexpected: int
    total_source: int
    total_target: int
    total_rows: int
    pass_count: int     # rate >= 95
    warn_count: int     # 80 <= rate < 95
    fail_count: int     # rate < 80


class LTVFParseResult(BaseModel):
    filename: str
    summary: LTVFSummary
    rows: list[LTVFRow]
    sections: list[str]


def _safe_int(val) -> Optional[int]:
    try:
        v = float(val)
        return int(v) if not pd.isna(v) else None
    except (TypeError, ValueError):
        return None


def _safe_float(val) -> Optional[float]:
    try:
        v = float(val)
        return round(v, 2) if not pd.isna(v) else None
    except (TypeError, ValueError):
        return None


def _parse_group_row(raw_name: str) -> tuple[str, list[str]]:
    """
    '>> 02. Test Cases > 1 MASTER DATA > 1.2 FI-GL > '
    Returns (display_name, path_segments)
    """
    cleaned = raw_name.strip().lstrip(">").strip()
    parts   = [p.strip() for p in cleaned.split(">") if p.strip()]
    display = parts[-1] if parts else cleaned
    return display, parts


def parse_excel(file_bytes: bytes, filename: str) -> LTVFParseResult:
    # Try header=0 first; if row 0 looks like a data row (numeric), try header=None
    df = pd.read_excel(io.BytesIO(file_bytes), header=0)

    # Rename columns by position — map only the columns that exist
    _col_names = [
        "test_name", "rate_pct", "eval", "diff", "accept",
        "missing", "unexpected", "equal", "oos_src", "oos_trg",
        "_local_lbl", "local", "_src_lbl", "source",
        "_src1_lbl", "source1", "_src2_lbl", "source2",
        "_tgt_lbl", "target",
    ]
    col_map = {df.columns[i]: _col_names[i] for i in range(min(len(df.columns), len(_col_names)))}
    df.rename(columns=col_map, inplace=True)

    # Ensure all expected numeric columns exist (fill missing ones with None)
    for col in ["rate_pct", "diff", "accept", "missing", "unexpected", "equal",
                "oos_src", "oos_trg", "local", "source", "source1", "source2", "target"]:
        if col not in df.columns:
            df[col] = None

    # Row 0 (index 0) is the grand-total row — extract summary then drop
    totals_row = df.iloc[0]
    summary_rate    = _safe_float(totals_row["rate_pct"]) or 0.0
    summary_equal   = _safe_int(totals_row["equal"]) or 0
    summary_diff    = _safe_int(totals_row["diff"]) or 0
    summary_missing = _safe_int(totals_row["missing"]) or 0
    summary_unexp   = _safe_int(totals_row["unexpected"]) or 0
    summary_source  = _safe_int(totals_row["source"]) or 0
    summary_target  = _safe_int(totals_row["target"]) or 0

    df = df.iloc[1:].reset_index(drop=True)
    df = df[df["test_name"].notna()].reset_index(drop=True)

    rows: list[LTVFRow] = []
    # path_stack: list of (path_segments, node_id)
    path_stack: list[tuple[list[str], str]] = []
    sections: list[str] = []
    id_counter = 0
    pass_c = warn_c = fail_c = 0

    for _, raw in df.iterrows():
        name_raw = str(raw["test_name"]).strip()
        id_counter += 1
        row_id = f"row_{id_counter}"

        is_group = name_raw.startswith(">>")

        if is_group:
            display, path_parts = _parse_group_row(name_raw)

            # Match stack depth to how many path segments this group has
            while path_stack and len(path_stack) >= len(path_parts):
                path_stack.pop()

            parent_id = path_stack[-1][1] if path_stack else None
            level     = len(path_parts) - 1
            full_path = " > ".join(path_parts)

            path_stack.append((path_parts, row_id))

            # collect all unique top-level path segments as sections
            top = path_parts[0]
            if top not in sections:
                sections.append(top)

            rows.append(LTVFRow(
                id=row_id,
                parent_id=parent_id,
                level=level,
                test_name=display,
                full_path=full_path,
                is_group=True,
                rate_pct=_safe_float(raw["rate_pct"]),
                diff=_safe_int(raw["diff"]),
                accept=_safe_int(raw["accept"]),
                missing=_safe_int(raw["missing"]),
                unexpected=_safe_int(raw["unexpected"]),
                equal=_safe_int(raw["equal"]),
                oos_src=_safe_int(raw["oos_src"]),
                oos_trg=_safe_int(raw["oos_trg"]),
                local=_safe_int(raw["local"]),
                source=_safe_int(raw["source"]),
                source1=_safe_int(raw["source1"]),
                source2=_safe_int(raw["source2"]),
                target=_safe_int(raw["target"]),
            ))
        else:
            parent_id = path_stack[-1][1] if path_stack else None
            level     = len(path_stack)
            full_path = (" > ".join(path_stack[-1][0]) + " > " + name_raw) if path_stack else name_raw

            rate = _safe_float(raw["rate_pct"])
            if rate is not None:
                if rate >= 95:  pass_c += 1
                elif rate >= 80: warn_c += 1
                else:            fail_c += 1

            rows.append(LTVFRow(
                id=row_id,
                parent_id=parent_id,
                level=level,
                test_name=name_raw,
                full_path=full_path,
                is_group=False,
                rate_pct=rate,
                diff=_safe_int(raw["diff"]),
                accept=_safe_int(raw["accept"]),
                missing=_safe_int(raw["missing"]),
                unexpected=_safe_int(raw["unexpected"]),
                equal=_safe_int(raw["equal"]),
                oos_src=_safe_int(raw["oos_src"]),
                oos_trg=_safe_int(raw["oos_trg"]),
                local=_safe_int(raw["local"]),
                source=_safe_int(raw["source"]),
                source1=_safe_int(raw["source1"]),
                source2=_safe_int(raw["source2"]),
                target=_safe_int(raw["target"]),
            ))

    leaf_count = pass_c + warn_c + fail_c

    return LTVFParseResult(
        filename=filename,
        summary=LTVFSummary(
            overall_rate=summary_rate,
            total_equal=summary_equal,
            total_diff=summary_diff,
            total_missing=summary_missing,
            total_unexpected=summary_unexp,
            total_source=summary_source,
            total_target=summary_target,
            total_rows=leaf_count,
            pass_count=pass_c,
            warn_count=warn_c,
            fail_count=fail_c,
        ),
        rows=rows,
        sections=sections,
    )
