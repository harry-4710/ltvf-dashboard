import type { LTVFParseResult, LTVFRow } from '../types/ltvf'

function classify(rate: number | null, pass: number, warn: number): 'pass' | 'warn' | 'fail' {
  if (rate === null) return 'fail'
  if (rate >= pass) return 'pass'
  if (rate >= warn) return 'warn'
  return 'fail'
}

function fmt(n: number | null): string {
  return n === null ? '—' : n.toLocaleString()
}

function fmtPct(n: number | null): string {
  return n === null ? '—' : `${n.toFixed(1)}%`
}

function badgeStyle(status: 'pass' | 'warn' | 'fail'): string {
  if (status === 'pass') return 'background:#16a34a;color:#fff;'
  if (status === 'warn') return 'background:#d97706;color:#fff;'
  return 'background:#dc2626;color:#fff;'
}

function rowStyle(status: 'pass' | 'warn' | 'fail'): string {
  if (status === 'pass') return 'background:#f0fdf4;'
  if (status === 'warn') return 'background:#fffbeb;'
  return 'background:#fef2f2;'
}

function sectionRows(rows: LTVFRow[], pass: number, warn: number) {
  const map = new Map<string, { total: number; passC: number; warnC: number; failC: number; rateSum: number; rateCount: number }>()
  for (const r of rows) {
    if (r.is_group) continue
    const section = r.full_path.split(' > ')[0] ?? 'Unknown'
    if (!map.has(section)) map.set(section, { total: 0, passC: 0, warnC: 0, failC: 0, rateSum: 0, rateCount: 0 })
    const s = map.get(section)!
    s.total++
    const cls = classify(r.rate_pct, pass, warn)
    if (cls === 'pass') s.passC++
    else if (cls === 'warn') s.warnC++
    else s.failC++
    if (r.rate_pct !== null) { s.rateSum += r.rate_pct; s.rateCount++ }
  }
  return Array.from(map.entries())
    .map(([name, s]) => ({ name, ...s, avgRate: s.rateCount ? s.rateSum / s.rateCount : null }))
    .sort((a, b) => (a.avgRate ?? 0) - (b.avgRate ?? 0))
}

function worstRows(rows: LTVFRow[], pass: number, warn: number, limit = 15): LTVFRow[] {
  return rows
    .filter(r => !r.is_group && r.rate_pct !== null)
    .sort((a, b) => (a.rate_pct ?? 0) - (b.rate_pct ?? 0))
    .slice(0, limit)
}

export function generateHTMLReport(
  data: LTVFParseResult,
  thresholds: { pass: number; warn: number },
  systemTag: string,
  uploadedAt: Date | null
): void {
  const { summary, rows, filename } = data
  const { pass, warn } = thresholds
  const overallStatus = classify(summary.overall_rate, pass, warn)
  const generated = new Date().toLocaleString()
  const uploadTime = uploadedAt ? uploadedAt.toLocaleString() : '—'

  const sections = sectionRows(rows, pass, warn)
  const worst = worstRows(rows, pass, warn)

  const sectionTableRows = sections.map(s => {
    const avg = s.avgRate
    const cls = classify(avg, pass, warn)
    return `
      <tr style="${rowStyle(cls)}">
        <td style="padding:6px 10px;border:1px solid #e5e7eb;">${s.name}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;">${s.total}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;">
          <span style="padding:2px 7px;border-radius:999px;font-size:12px;${badgeStyle(cls)}">${fmtPct(avg)}</span>
        </td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;color:#16a34a;">${s.passC}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;color:#d97706;">${s.warnC}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;color:#dc2626;">${s.failC}</td>
      </tr>`
  }).join('')

  const worstTableRows = worst.map(r => {
    const cls = classify(r.rate_pct, pass, warn)
    return `
      <tr style="${rowStyle(cls)}">
        <td style="padding:6px 10px;border:1px solid #e5e7eb;font-size:12px;max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.full_path}">${r.test_name}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;font-size:11px;color:#6b7280;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.full_path}">${r.full_path}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;">
          <span style="padding:2px 7px;border-radius:999px;font-size:12px;${badgeStyle(cls)}">${fmtPct(r.rate_pct)}</span>
        </td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;">${fmt(r.equal)}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;color:#dc2626;">${fmt(r.diff)}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:center;color:#d97706;">${fmt(r.missing)}</td>
      </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>LTVF Report — ${filename}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; }
  .header { background: #003366; color: #fff; padding: 18px 28px; }
  .header h1 { font-size: 18px; font-weight: 700; letter-spacing: 0.03em; }
  .header p { font-size: 12px; color: #93c5fd; margin-top: 3px; }
  .content { max-width: 960px; margin: 0 auto; padding: 24px 20px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .kpi { background: #fff; border-radius: 8px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
  .kpi-value { font-size: 24px; font-weight: 700; }
  .kpi-value.pass { color: #16a34a; }
  .kpi-value.warn { color: #d97706; }
  .kpi-value.fail { color: #dc2626; }
  .section-title { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); margin-bottom: 28px; }
  thead th { background: #003366; color: #fff; padding: 9px 10px; text-align: left; font-size: 12px; font-weight: 600; border: 1px solid #1e4080; }
  thead th:not(:first-child) { text-align: center; }
  .footer { text-align: center; font-size: 11px; color: #94a3b8; padding: 16px 0 24px; }
  @media print { body { background: #fff; } .kpi { box-shadow: none; border: 1px solid #e5e7eb; } }
</style>
</head>
<body>
<div class="header">
  <h1>LTVF Cloud Dashboard — Test Results Report</h1>
  <p>${filename}${systemTag ? ` &nbsp;·&nbsp; System: ${systemTag}` : ''} &nbsp;·&nbsp; Uploaded: ${uploadTime} &nbsp;·&nbsp; Generated: ${generated}</p>
</div>

<div class="content">

  <!-- KPI grid -->
  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Overall Match Rate</div>
      <div class="kpi-value ${overallStatus}">${fmtPct(summary.overall_rate)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Pass (&ge;${pass}%)</div>
      <div class="kpi-value pass">${fmt(summary.pass_count)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Warn (${warn}–${pass - 1}%)</div>
      <div class="kpi-value warn">${fmt(summary.warn_count)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Fail (&lt;${warn}%)</div>
      <div class="kpi-value fail">${fmt(summary.fail_count)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Test Cases</div>
      <div class="kpi-value" style="color:#1e293b;">${fmt(summary.total_rows)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Equal</div>
      <div class="kpi-value" style="color:#16a34a;">${fmt(summary.total_equal)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Different</div>
      <div class="kpi-value" style="color:#dc2626;">${fmt(summary.total_diff)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Missing</div>
      <div class="kpi-value" style="color:#d97706;">${fmt(summary.total_missing)}</div>
    </div>
  </div>

  <!-- Section breakdown -->
  <div class="section-title">Section Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>Section</th>
        <th>Tests</th>
        <th>Avg Rate</th>
        <th>Pass</th>
        <th>Warn</th>
        <th>Fail</th>
      </tr>
    </thead>
    <tbody>${sectionTableRows}</tbody>
  </table>

  <!-- Worst performers -->
  <div class="section-title">Bottom 15 — Lowest Match Rate</div>
  <table>
    <thead>
      <tr>
        <th>Test Name</th>
        <th>Path</th>
        <th>Rate</th>
        <th>Equal</th>
        <th>Diff</th>
        <th>Missing</th>
      </tr>
    </thead>
    <tbody>${worstTableRows}</tbody>
  </table>

</div>
<div class="footer">LTVF Cloud Dashboard &mdash; Thresholds: Pass &ge;${pass}% / Warn &ge;${warn}% &mdash; ${generated}</div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ltvf-report-${filename.replace(/\.[^.]+$/, '')}.html`
  a.click()
  URL.revokeObjectURL(url)
}
