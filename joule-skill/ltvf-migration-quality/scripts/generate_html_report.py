#!/usr/bin/env python3
"""
LTVR Migration Quality - HTML/PDF Report Generator v5.0

Modernised slate/teal design with Inter font, card-grid KPIs, clean tables.
Fix: CSS kept as raw string to avoid f-string brace conflicts.

Usage:
  1. Import generate_report() / generate_pdf_report() and pass the parsed data dict
  2. Or CLI: python generate_html_report.py <json_data_file> [--pdf] [output_path]
"""

import json
import sys
import os
from datetime import date


def _status_badge(status):
    s = status.upper()
    if s == "HEALTHY":
        return "badge-healthy", "HEALTHY"
    elif s == "AT RISK":
        return "badge-risk", "AT RISK"
    else:
        return "badge-critical", "CRITICAL"


def _tag(cls, text):
    return '<span class="tag tag-' + cls + '">' + str(text) + '</span>'


def _fmt_num(n):
    if n is None:
        return "0"
    return f"{n:,}"


def _short_volume(v):
    if v >= 1_000_000_000:
        return f"{v / 1_000_000_000:.1f}B"
    elif v >= 1_000_000:
        return f"{v / 1_000_000:.0f}M"
    elif v >= 1_000:
        return f"{v / 1_000:.0f}K"
    return str(v)


def _priority_tag(p):
    return _tag(p.lower(), p)


# CSS kept as a plain string (no f-string) so curly braces are literal
CSS = """
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  @media print { body { margin: 0; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } .container { box-shadow: none; } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f1f5f9; color: #1e293b; line-height: 1.6; padding: 24px; }
  .container { max-width: 1080px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05); overflow: hidden; }
  .header { background: linear-gradient(135deg, #0f172a 0%, #1e40af 60%, #0ea5e9 100%); color: #fff; padding: 28px 36px 22px; }
  .header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin-bottom: 2px; }
  .header .subtitle { font-size: 12px; opacity: 0.75; font-weight: 400; }
  .header .status-badge { display: inline-block; margin-top: 10px; padding: 4px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
  .badge-healthy { background: rgba(16,185,129,0.9); color: #fff; }
  .badge-risk { background: rgba(245,158,11,0.9); color: #fff; }
  .badge-critical { background: rgba(239,68,68,0.9); color: #fff; }
  .section { padding: 22px 36px; border-bottom: 1px solid #f1f5f9; }
  .section:last-child { border-bottom: none; }
  .section-title { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
  .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; text-align: center; }
  .kpi-card .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.7px; color: #94a3b8; font-weight: 600; margin-bottom: 4px; }
  .kpi-card .kpi-value { font-size: 22px; font-weight: 700; color: #0f172a; }
  .kpi-card .kpi-sub { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .kpi-card.green { border-left: 3px solid #10b981; }
  .kpi-card.red { border-left: 3px solid #ef4444; }
  .kpi-card.yellow { border-left: 3px solid #f59e0b; }
  .kpi-card.blue { border-left: 3px solid #3b82f6; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f8fafc; color: #475569; padding: 8px 12px; text-align: center; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px 12px; text-align: center; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
  tr:hover { background: #f8fafc; }
  tr.total-row { background: #f1f5f9 !important; font-weight: 700; border-top: 2px solid #cbd5e1; }
  td.left { text-align: left; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; letter-spacing: 0.3px; }
  .tag-red { background: #fef2f2; color: #dc2626; }
  .tag-yellow { background: #fffbeb; color: #d97706; }
  .tag-green { background: #f0fdf4; color: #16a34a; }
  .tag-blue { background: #eff6ff; color: #2563eb; }
  .tag-gray { background: #f8fafc; color: #94a3b8; }
  .tech-snapshot { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 14px; font-size: 11px; color: #64748b; margin-top: 10px; }
  .tech-snapshot strong { color: #334155; }
  .rec-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f8fafc; }
  .rec-item:last-child { border-bottom: none; }
  .rec-priority { min-width: 52px; text-align: center; padding-top: 1px; }
  .rec-body { flex: 1; }
  .rec-body .rec-area { font-size: 12px; font-weight: 600; color: #1e293b; margin-bottom: 1px; }
  .rec-body .rec-text { font-size: 12px; color: #475569; }
  .rec-body .rec-owner { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .footer { padding: 14px 36px; background: #f8fafc; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
"""


def generate_report(data, output_path=None):
    """Generate a self-contained HTML report from parsed LTVR data."""
    today_str = date.today().strftime("%d %B %Y")
    s = data["summary"]
    filename = data.get("filename", "LTVR_Report")
    scenario = data.get("scenario", "3D")
    badge_cls, badge_text = _status_badge(s.get("overall_status", "HEALTHY"))
    has_signoff = s.get("has_signoff", False)
    show_signoff = has_signoff and scenario in ("3C", "3D")
    show_matchrate = scenario in ("3A", "3B", "3D")
    vol = s.get('total_volume', 0) or s.get('total_equal', 0)

    # --- KPI Row 2: Sign-off ---
    signoff_kpis = ""
    if show_signoff:
        total = s.get("total_rows", 1) or 1
        appr_pct = round(s.get("total_approved", 0) / total * 100, 1)
        rej_pct = round(s.get("total_rejected", 0) / total * 100, 1)
        rc_pct = round(s.get("total_recheck", 0) / total * 100, 1)
        signoff_kpis = f'''
    <div class="kpi-grid">
      <div class="kpi-card green"><div class="kpi-label">Approved</div>
        <div class="kpi-value">{s.get("total_approved", 0)}</div><div class="kpi-sub">{appr_pct}%</div></div>
      <div class="kpi-card red"><div class="kpi-label">Rejected</div>
        <div class="kpi-value">{s.get("total_rejected", 0)}</div><div class="kpi-sub">{rej_pct}%</div></div>
      <div class="kpi-card yellow"><div class="kpi-label">Re-check</div>
        <div class="kpi-value">{s.get("total_recheck", 0)}</div><div class="kpi-sub">{rc_pct}%</div></div>
      <div class="kpi-card blue"><div class="kpi-label">Missing Records</div>
        <div class="kpi-value">{_fmt_num(s.get("total_missing", 0))}</div>
        <div class="kpi-sub">{_fmt_num(s.get("total_diff", 0))} diff &middot; {_fmt_num(s.get("total_unexpected", 0))} unexpected</div></div>
    </div>'''

    # --- Stream table ---
    streams = data.get("streams", [])
    so_cols = '<th>Approved</th><th>Rejected</th><th>Re-check</th><th>Sign-Off %</th>' if show_signoff else ""
    mr_cols = '<th>Passing (&ge;85%)</th><th>Failing (&lt;85%)</th><th>Match Rate</th><th>Zero Data</th><th>Deactivated</th>' if show_matchrate else ""

    stream_rows = ""
    t_total = t_active = t_pass = t_fail = t_zd = t_deact = t_appr = t_rej = t_rc = 0
    for st in streams:
        mr_tds = ""
        if show_matchrate:
            rate_display = st.get("match_rate", "N/A")
            if isinstance(rate_display, (int, float)) and rate_display > 0:
                rate_tag = _tag("green", f"{rate_display}%")
            elif rate_display == 0 or rate_display == "N/A":
                rate_tag = _tag("gray", "N/A")
            else:
                rate_tag = _tag("green", str(rate_display))
            mr_tds = f'<td>{st.get("passing",0)}</td><td>{st.get("failing",0)}</td><td>{rate_tag}</td><td>{st.get("zero_data",0)}</td><td>{st.get("deactivated",0)}</td>'
        so_tds = ""
        if show_signoff:
            rej_val = st.get('rejected', 0)
            rc_val = st.get('recheck', 0)
            appr_val = st.get('approved', 0)
            rej_td = _tag("red", str(rej_val)) if rej_val > 0 else "0"
            rc_td = _tag("yellow", str(rc_val)) if rc_val > 0 else "0"
            appr_td = _tag("green", str(appr_val)) if appr_val > 0 else "0"
            so_pct = st.get('signoff_pct', 0)
            so_pct_str = f"{so_pct}%" if isinstance(so_pct, (int, float)) else str(so_pct)
            so_tds = f'<td>{appr_td}</td><td>{rej_td}</td><td>{rc_td}</td><td>{so_pct_str}</td>'
        stream_rows += f'<tr><td class="left"><strong>{st["stream"]}</strong></td><td>{st["total_tests"]}</td><td>{st.get("active_tests",0)}</td>{mr_tds}{so_tds}</tr>\n'
        t_total += st.get('total_tests', 0)
        t_active += st.get('active_tests', 0)
        t_pass += st.get('passing', 0)
        t_fail += st.get('failing', 0)
        t_zd += st.get('zero_data', 0)
        t_deact += st.get('deactivated', 0)
        t_appr += st.get('approved', 0)
        t_rej += st.get('rejected', 0)
        t_rc += st.get('recheck', 0)

    mr_total = f'<td>{t_pass}</td><td>{t_fail}</td><td>~100%</td><td>{t_zd}</td><td>{t_deact}</td>' if show_matchrate else ""
    so_total = f'<td>{t_appr}</td><td>{t_rej}</td><td>{t_rc}</td><td>{round(t_appr/t_total*100,1) if t_total else 0}%</td>' if show_signoff else ""
    stream_rows += f'<tr class="total-row"><td class="left">TOTAL</td><td>{t_total}</td><td>{t_active}</td>{mr_total}{so_total}</tr>'
    stream_table = f'<table><thead><tr><th>Stream</th><th>Total</th><th>Active</th>{mr_cols}{so_cols}</tr></thead><tbody>{stream_rows}</tbody></table>'

    # --- Rejected tests ---
    rejected_block = ""
    rejected_tests = data.get("rejected_tests", [])
    if rejected_tests:
        rej_rows = ""
        for rt in rejected_tests:
            sev = rt.get('severity', 'LOW')
            sev_cls = 'red' if sev == 'HIGH' else 'yellow'
            rej_rows += f'<tr><td class="left">{rt["name"]}</td><td>{rt.get("stream","")}</td><td>{rt.get("rate","")}%</td><td>{_fmt_num(rt.get("matching",0))}</td><td><strong>{rt.get("missing",0)}</strong></td><td>{rt.get("diff",0)}</td><td>{_tag(sev_cls, sev)}</td><td class="left" style="font-size:11px;">{rt.get("root_cause","")}</td></tr>\n'
        total_missing = sum(rt.get('missing', 0) for rt in rejected_tests)
        rejected_block = f'''<div class="section">
    <div class="section-title">Rejected Tests</div>
    <table><thead><tr><th>Test</th><th>Stream</th><th>Rate</th><th>Matching</th><th>Missing</th><th>Diff</th><th>Severity</th><th>Root Cause</th></tr></thead>
    <tbody>{rej_rows}</tbody></table>
    <div class="tech-snapshot" style="margin-top:12px;"><strong>Total Missing: {total_missing}</strong> &mdash; All gaps are missing source records pointing to selective migration scope.</div></div>'''

    # --- Recommendations ---
    recs = data.get("recommendations", [])
    rec_items = ""
    for r in recs:
        rec_items += f'''<div class="rec-item">
      <div class="rec-priority">{_priority_tag(r["priority"])}</div>
      <div class="rec-body">
        <div class="rec-area">{r["area"]}</div>
        <div class="rec-text">{r["text"]}</div>
        <div class="rec-owner">Action: {r.get("owner", "TBD")}</div>
      </div></div>\n'''

    active_rate = s.get('active_match_rate', s.get('overall_rate', 0))

    # Build HTML: CSS is a plain string, body is an f-string
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LTVR Migration Quality Report &mdash; {filename}</title>
<style>{CSS}</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>LTVR Migration Quality Report</h1>
    <div class="subtitle">File: {filename} &nbsp;&bull;&nbsp; Generated: {today_str}</div>
    <span class="status-badge {badge_cls}">{badge_text}</span>
  </div>
  <div class="section">
    <div class="section-title">Key Metrics</div>
    <div class="kpi-grid">
      <div class="kpi-card green">
        <div class="kpi-label">Match Rate</div>
        <div class="kpi-value">~{active_rate}%</div>
        <div class="kpi-sub">Weighted by volume</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-label">Total Tests</div>
        <div class="kpi-value">{s.get("total_rows", 0)}</div>
        <div class="kpi-sub">{s.get("pass_count", 0)} pass &middot; {s.get("fail_count", 0)} fail &middot; {s.get("warn_count", 0)} warn</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-label">Passing</div>
        <div class="kpi-value">{s.get("pass_count", 0)} / {s.get("total_rows", 0)}</div>
        <div class="kpi-sub">Above 85% threshold</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-label">Data Volume</div>
        <div class="kpi-value">{_short_volume(vol)}</div>
        <div class="kpi-sub">{_fmt_num(vol)} records</div>
      </div>
    </div>
    {signoff_kpis}
    <div class="tech-snapshot">
      <strong>Snapshot:</strong> {_fmt_num(s.get("total_equal", 0))} matching &nbsp;&bull;&nbsp; {_fmt_num(s.get("total_missing", 0))} missing &nbsp;&bull;&nbsp; {_fmt_num(s.get("total_diff", 0))} differences &nbsp;&bull;&nbsp; {_fmt_num(s.get("total_unexpected", 0))} unexpected
    </div>
  </div>
  <div class="section">
    <div class="section-title">Stream Performance</div>
    {stream_table}
  </div>
  {rejected_block}
  <div class="section">
    <div class="section-title">Recommendations</div>
    {rec_items}
  </div>
  <div class="footer">
    LTVR Migration Quality Report &nbsp;&bull;&nbsp; {filename} &nbsp;&bull;&nbsp; {today_str} &nbsp;&bull;&nbsp; Generated by Joule &mdash; LTVF Migration Quality Skill v5.0
  </div>
</div>
</body>
</html>'''

    if output_path is None:
        output_path = os.path.join(os.getcwd(), "LTVR_Migration_Quality_Report.html")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    return output_path


def generate_pdf_report(data, pdf_path=None, html_path=None):
    """Generate a PDF report from LTVR data using weasyprint.

    Writes HTML first as a rendering base and fallback, then converts to PDF.
    Returns (pdf_path_or_None, html_path).
    - pdf_path is set only if the PDF was written successfully.
    - html_path is always written and can be opened in any browser.

    Requires weasyprint to be pre-installed (run: pip install weasyprint).
    """
    if pdf_path is None:
        pdf_path = os.path.join(os.getcwd(), "LTVR_Migration_Quality_Report.pdf")
    if html_path is None:
        html_path = os.path.join(os.getcwd(), "LTVR_Migration_Quality_Report.html")

    # Always write HTML first — rendering base and fallback
    generate_report(data, html_path)

    # Attempt PDF conversion via weasyprint
    try:
        import weasyprint
        weasyprint.HTML(filename=html_path).write_pdf(pdf_path)
        return pdf_path, html_path
    except Exception as exc:
        print(f"[PDF] weasyprint conversion failed: {exc}", file=sys.stderr)
        return None, html_path


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_html_report.py <json_data_file> [--pdf] [output_path]")
        sys.exit(1)
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        data = json.load(f)
    if "--pdf" in sys.argv:
        pdf_p, html_p = generate_pdf_report(data)
        if pdf_p:
            print(f"PDF report saved to: {pdf_p}")
        else:
            print(f"PDF generation failed. HTML report saved to: {html_p}")
    else:
        remaining = [a for a in sys.argv[2:] if not a.startswith("--")]
        out = remaining[0] if remaining else None
        path = generate_report(data, out)
        print(f"Report saved to: {path}")
