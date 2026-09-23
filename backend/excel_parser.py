import pandas as pd
import io
from typing import Optional
from schemas import LTVFRow, LTVFSummary, LTVFParseResult


def _safe_int(val):
    try:
        v = float(val)
        return int(v) if not pd.isna(v) else None
    except (TypeError, ValueError):
        return None


def _safe_float(val):
    try:
        v = float(val)
        return round(v, 2) if not pd.isna(v) else None
    except (TypeError, ValueError):
        return None


def _safe_str(val):
    if val is None:
        return None
    s = str(val).strip()
    return s if s and s.lower() not in ('nan', 'none', '') else None


def _parse_group_row(raw_name):
    cleaned = raw_name.strip().lstrip('>').strip()
    parts   = [p.strip() for p in cleaned.split('>') if p.strip()]
    display = parts[-1] if parts else cleaned
    return display, parts


def _is_ltvr_format(df):
    return 's/o' in [str(c).strip().lower() for c in df.columns]


def _build_ltvr_df(df):
    aliases = {
        'test name': 'test_name', 's/o': 'so_status', 'signed by': 'signed_by',
        'signed at': 'signed_at', 'rate(%)': 'rate_pct', 'diff.': 'diff',
        'accept.': 'accept', 'missing': 'missing', 'unexp.': 'unexpected',
        'equal': 'equal', 'oos:src': 'oos_src', 'oos:trg': 'oos_trg',
        'wi(%)': 'wi_pct', 'tot': 'tot', 'err': 'err', 'fin': 'fin',
    }
    rmap = {c: aliases[str(c).strip().lower()]
            for c in df.columns if str(c).strip().lower() in aliases}
    df = df.rename(columns=rmap)
    for col in ['test_name','so_status','signed_by','rate_pct','diff','accept',
                'missing','unexpected','equal','oos_src','oos_trg',
                'wi_pct','tot','err','fin']:
        if col not in df.columns:
            df[col] = None
    return df

def _parse_ltvr(df, filename):
    df = _build_ltvr_df(df)
    blank = df["test_name"].isna() | (df["test_name"].astype(str).str.strip() == "")
    grand = df[blank]
    tr    = grand.iloc[0] if not grand.empty else None
    s_rate  = _safe_float(tr["rate_pct"])  if tr is not None else 0.0
    s_equal = _safe_int(tr["equal"])       if tr is not None else 0
    s_diff  = _safe_int(tr["diff"])        if tr is not None else 0
    s_miss  = _safe_int(tr["missing"])     if tr is not None else 0
    s_unexp = _safe_int(tr["unexpected"])  if tr is not None else 0
    s_vol   = _safe_int(tr["tot"])         if tr is not None else 0
    df = df[~blank].reset_index(drop=True)
    rows = []; sections = []
    id_counter = 0
    pass_c = fail_c = approved_c = rejected_c = recheck_c = 0
    cur_id = None; cur_name = ""; LTVR_PASS = 85.0
    for _, raw in df.iterrows():
        name_raw = str(raw["test_name"]).strip()
        id_counter += 1
        row_id = "row_" + str(id_counter)
        is_group = ">" in name_raw
        if is_group:
            parts = [p.strip().rstrip(">").strip() for p in name_raw.split(">")]
            parts = [p for p in parts if p]
            label = parts[-1] if parts else name_raw
            cur_id = row_id; cur_name = label
            if label not in sections: sections.append(label)
            rows.append(LTVFRow(id=row_id, parent_id=None, level=0,
                test_name=label, full_path=label, is_group=True,
                rate_pct=_safe_float(raw["rate_pct"]),
                diff=_safe_int(raw["diff"]), accept=_safe_int(raw["accept"]),
                missing=_safe_int(raw["missing"]), unexpected=_safe_int(raw["unexpected"]),
                equal=_safe_int(raw["equal"]), oos_src=_safe_int(raw["oos_src"]),
                oos_trg=_safe_int(raw["oos_trg"]), wi_pct=_safe_float(raw["wi_pct"]),
                tot=_safe_int(raw["tot"]), err=_safe_int(raw["err"]),
                fin=_safe_int(raw["fin"])))
        else:
            so = _safe_str(raw["so_status"]); spb = _safe_str(raw["signed_by"])
            rate = _safe_float(raw["rate_pct"])
            if so == "Approved": approved_c += 1
            elif so == "Rejected": rejected_c += 1
            elif so == "Re-check": recheck_c += 1
            if rate is not None:
                if rate >= LTVR_PASS: pass_c += 1
                else: fail_c += 1
            full_path = (cur_name + " > " + name_raw) if cur_name else name_raw
            rows.append(LTVFRow(id=row_id, parent_id=cur_id, level=1,
                test_name=name_raw, full_path=full_path, is_group=False,
                rate_pct=rate, diff=_safe_int(raw["diff"]), accept=_safe_int(raw["accept"]),
                missing=_safe_int(raw["missing"]), unexpected=_safe_int(raw["unexpected"]),
                equal=_safe_int(raw["equal"]), oos_src=_safe_int(raw["oos_src"]),
                oos_trg=_safe_int(raw["oos_trg"]), wi_pct=_safe_float(raw["wi_pct"]),
                tot=_safe_int(raw["tot"]), err=_safe_int(raw["err"]),
                fin=_safe_int(raw["fin"]), so_status=so, signed_by=spb))
    has_so = (approved_c + rejected_c + recheck_c) > 0
    total_src = (s_equal or 0) + (s_miss or 0)
    return LTVFParseResult(filename=filename, rows=rows, sections=sections,
        summary=LTVFSummary(
            overall_rate=s_rate or 0.0, total_equal=s_equal or 0,
            total_diff=s_diff or 0, total_missing=s_miss or 0,
            total_unexpected=s_unexp or 0, total_source=total_src,
            total_target=s_equal or 0, total_rows=pass_c + fail_c,
            pass_count=pass_c, warn_count=0, fail_count=fail_c,
            has_signoff=has_so, total_approved=approved_c,
            total_rejected=rejected_c, total_recheck=recheck_c,
            total_volume=s_vol or 0))

def _parse_ltvf(df, filename):
    _col_names = [
        "test_name","rate_pct","eval","diff","accept","missing","unexpected",
        "equal","oos_src","oos_trg","_ll","local","_sl","source",
        "_s1l","source1","_s2l","source2","_tl","target",
    ]
    col_map = {df.columns[i]: _col_names[i]
               for i in range(min(len(df.columns), len(_col_names)))}
    df.rename(columns=col_map, inplace=True)
    for c in ["rate_pct","diff","accept","missing","unexpected","equal",
              "oos_src","oos_trg","local","source","source1","source2","target"]:
        if c not in df.columns: df[c] = None
    t = df.iloc[0]
    sr = _safe_float(t["rate_pct"]) or 0.0
    se = _safe_int(t["equal"]) or 0; sd = _safe_int(t["diff"]) or 0
    sm = _safe_int(t["missing"]) or 0; su = _safe_int(t["unexpected"]) or 0
    ss = _safe_int(t["source"]) or 0; stt = _safe_int(t["target"]) or 0
    df = df.iloc[1:].reset_index(drop=True)
    df = df[df["test_name"].notna()].reset_index(drop=True)
    rows = []; path_stack = []; sections = []
    id_counter = 0; pass_c = warn_c = fail_c = 0
    for _, raw in df.iterrows():
        name_raw = str(raw["test_name"]).strip()
        id_counter += 1
        row_id = "row_" + str(id_counter)
        is_group = name_raw.startswith(">>")
        if is_group:
            display, pp = _parse_group_row(name_raw)
            while path_stack and len(path_stack) >= len(pp): path_stack.pop()
            pid = path_stack[-1][1] if path_stack else None
            lvl = len(pp) - 1
            fp = " > ".join(pp)
            path_stack.append((pp, row_id))
            if pp[0] not in sections: sections.append(pp[0])
            rows.append(LTVFRow(id=row_id, parent_id=pid, level=lvl,
                test_name=display, full_path=fp, is_group=True,
                rate_pct=_safe_float(raw["rate_pct"]),
                diff=_safe_int(raw["diff"]), accept=_safe_int(raw["accept"]),
                missing=_safe_int(raw["missing"]), unexpected=_safe_int(raw["unexpected"]),
                equal=_safe_int(raw["equal"]), oos_src=_safe_int(raw["oos_src"]),
                oos_trg=_safe_int(raw["oos_trg"]), local=_safe_int(raw["local"]),
                source=_safe_int(raw["source"]), source1=_safe_int(raw["source1"]),
                source2=_safe_int(raw["source2"]), target=_safe_int(raw["target"])))
        else:
            pid = path_stack[-1][1] if path_stack else None
            lvl = len(path_stack)
            fp = (" > ".join(path_stack[-1][0])+" > "+name_raw) if path_stack else name_raw
            rate = _safe_float(raw["rate_pct"])
            if rate is not None:
                if rate >= 95: pass_c += 1
                elif rate >= 80: warn_c += 1
                else: fail_c += 1
            rows.append(LTVFRow(id=row_id, parent_id=pid, level=lvl,
                test_name=name_raw, full_path=fp, is_group=False, rate_pct=rate,
                diff=_safe_int(raw["diff"]), accept=_safe_int(raw["accept"]),
                missing=_safe_int(raw["missing"]), unexpected=_safe_int(raw["unexpected"]),
                equal=_safe_int(raw["equal"]), oos_src=_safe_int(raw["oos_src"]),
                oos_trg=_safe_int(raw["oos_trg"]), local=_safe_int(raw["local"]),
                source=_safe_int(raw["source"]), source1=_safe_int(raw["source1"]),
                source2=_safe_int(raw["source2"]), target=_safe_int(raw["target"])))
    lc = pass_c + warn_c + fail_c
    return LTVFParseResult(filename=filename, rows=rows, sections=sections,
        summary=LTVFSummary(overall_rate=sr, total_equal=se, total_diff=sd,
            total_missing=sm, total_unexpected=su, total_source=ss,
            total_target=stt, total_rows=lc,
            pass_count=pass_c, warn_count=warn_c, fail_count=fail_c))


def parse_excel(file_bytes, filename):
    df_raw = pd.read_excel(io.BytesIO(file_bytes), header=0)
    if _is_ltvr_format(df_raw):
        return _parse_ltvr(df_raw, filename)
    return _parse_ltvf(df_raw, filename)
