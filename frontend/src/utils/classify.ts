import type { LTVFRow, LTVFSummary } from '../types/ltvf'

/**
 * Re-classifies leaf rows against the given thresholds and returns an updated
 * LTVFSummary with correct pass_count / warn_count / fail_count / total_rows.
 *
 * The backend parser hard-codes 95/80 thresholds when it counts pass/warn/fail.
 * This utility re-derives those counts on the frontend so they stay in sync with
 * whatever thresholds the user has configured.
 */
export function recomputeSummary(
  rows: LTVFRow[],
  baseSummary: LTVFSummary,
  thresholds: { pass: number; warn: number }
): LTVFSummary {
  let pass_count = 0
  let warn_count = 0
  let fail_count = 0

  for (const r of rows) {
    if (r.is_group || r.rate_pct === null || r.rate_pct === undefined) continue
    if (r.rate_pct >= thresholds.pass) pass_count++
    else if (r.rate_pct >= thresholds.warn) warn_count++
    else fail_count++
  }

  return {
    ...baseSummary,
    pass_count,
    warn_count,
    fail_count,
    total_rows: pass_count + warn_count + fail_count,
  }
}

/**
 * Returns 'pass' | 'warn' | 'fail' for a given rate and threshold pair.
 */
export function classify(
  rate: number | null,
  thresholds: { pass: number; warn: number }
): 'pass' | 'warn' | 'fail' {
  if (rate === null || rate === undefined) return 'fail'
  if (rate >= thresholds.pass) return 'pass'
  if (rate >= thresholds.warn) return 'warn'
  return 'fail'
}
