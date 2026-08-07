import * as XLSX from 'xlsx'
import type { LTVFParseResult } from '../types/ltvf'

export function exportToExcel(data: LTVFParseResult): void {
  const wb = XLSX.utils.book_new()

  const summarySheet = XLSX.utils.json_to_sheet([{
    Filename: data.filename,
    'Overall Rate (%)': data.summary.overall_rate,
    'Total Rows': data.summary.total_rows,
    Pass: data.summary.pass_count,
    Warn: data.summary.warn_count,
    Fail: data.summary.fail_count,
    Equal: data.summary.total_equal,
    Diff: data.summary.total_diff,
    Missing: data.summary.total_missing,
    Unexpected: data.summary.total_unexpected,
    Source: data.summary.total_source,
    Target: data.summary.total_target,
  }])
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.rows), 'Detail Rows')

  const safeName = data.filename.replace(/\.[^.]+$/, '')
  XLSX.writeFile(wb, `${safeName}_export.xlsx`)
}
