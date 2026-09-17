import type { LTVFParseResult } from '../types/ltvf'

/**
 * Exports the full LTVFParseResult as a CSV file and triggers a browser download.
 * No server round-trip required — runs entirely in the browser.
 */
export function exportToCSV(data: LTVFParseResult): void {
  const headers = [
    'test_name', 'full_path', 'level', 'is_group',
    'rate_pct', 'diff', 'accept', 'missing', 'unexpected',
    'equal', 'oos_src', 'oos_trg', 'local',
    'source', 'source1', 'source2', 'target',
  ]

  const escapeCell = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    // Quote strings containing commas, quotes, or newlines
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const rows = data.rows.map(r =>
    headers.map(h => escapeCell((r as unknown as Record<string, unknown>)[h])).join(',')
  )

  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${data.filename.replace(/\.[^.]+$/, '')}_export.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
