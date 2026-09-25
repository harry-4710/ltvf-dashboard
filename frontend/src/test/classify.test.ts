import { describe, it, expect } from 'vitest'
import { classify, recomputeSummary } from '../utils/classify'
import type { LTVFRow, LTVFSummary } from '../types/ltvf'

// ── helpers ──────────────────────────────────────────────────────────────────

const makeRow = (overrides: Partial<LTVFRow> = {}): LTVFRow => ({
  id: 'row_1',
  parent_id: null,
  level: 1,
  test_name: 'Test A',
  full_path: 'Stream > Test A',
  is_group: false,
  rate_pct: 100,
  diff: 0,
  accept: 0,
  missing: 0,
  unexpected: 0,
  equal: 100,
  oos_src: 0,
  oos_trg: 0,
  local: null,
  source: null,
  source1: null,
  source2: null,
  target: null,
  so_status: null,
  signed_by: null,
  wi_pct: null,
  tot: null,
  err: null,
  fin: null,
  ...overrides,
})

const baseSummary: LTVFSummary = {
  overall_rate: 80,
  total_equal: 800,
  total_diff: 100,
  total_missing: 50,
  total_unexpected: 0,
  total_source: 1000,
  total_target: 900,
  total_rows: 10,
  pass_count: 5,
  warn_count: 3,
  fail_count: 2,
  has_signoff: false,
  total_approved: 0,
  total_rejected: 0,
  total_recheck: 0,
  total_volume: 100,
}

// ── classify() ───────────────────────────────────────────────────────────────

describe('classify()', () => {
  const thresholds = { pass: 95, warn: 80 }

  it('returns "pass" when rate equals pass threshold', () => {
    expect(classify(95, thresholds)).toBe('pass')
  })

  it('returns "pass" when rate is above pass threshold', () => {
    expect(classify(100, thresholds)).toBe('pass')
  })

  it('returns "warn" when rate equals warn threshold', () => {
    expect(classify(80, thresholds)).toBe('warn')
  })

  it('returns "warn" when rate is between warn and pass', () => {
    expect(classify(87, thresholds)).toBe('warn')
  })

  it('returns "fail" when rate is below warn threshold', () => {
    expect(classify(79.9, thresholds)).toBe('fail')
  })

  it('returns "fail" when rate is 0', () => {
    expect(classify(0, thresholds)).toBe('fail')
  })

  it('returns "fail" when rate is null', () => {
    expect(classify(null, thresholds)).toBe('fail')
  })

  it('works with LTVR thresholds (pass=85, warn=70)', () => {
    const ltvrThresholds = { pass: 85, warn: 70 }
    expect(classify(85, ltvrThresholds)).toBe('pass')
    expect(classify(75, ltvrThresholds)).toBe('warn')
    expect(classify(69, ltvrThresholds)).toBe('fail')
  })
})

// ── recomputeSummary() ───────────────────────────────────────────────────────

describe('recomputeSummary()', () => {
  const thresholds = { pass: 95, warn: 80 }

  it('correctly counts pass/warn/fail leaf rows', () => {
    const rows: LTVFRow[] = [
      makeRow({ id: 'r1', rate_pct: 100 }),  // pass
      makeRow({ id: 'r2', rate_pct: 95 }),   // pass
      makeRow({ id: 'r3', rate_pct: 82 }),   // warn
      makeRow({ id: 'r4', rate_pct: 79 }),   // fail
      makeRow({ id: 'r5', rate_pct: 0 }),    // fail
    ]

    const result = recomputeSummary(rows, baseSummary, thresholds)

    expect(result.pass_count).toBe(2)
    expect(result.warn_count).toBe(1)
    expect(result.fail_count).toBe(2)
    expect(result.total_rows).toBe(5)
  })

  it('skips group rows (is_group=true)', () => {
    const rows: LTVFRow[] = [
      makeRow({ id: 'g1', is_group: true, rate_pct: 50 }),  // skipped
      makeRow({ id: 'r1', rate_pct: 100 }),                  // pass
    ]

    const result = recomputeSummary(rows, baseSummary, thresholds)

    expect(result.pass_count).toBe(1)
    expect(result.warn_count).toBe(0)
    expect(result.fail_count).toBe(0)
    expect(result.total_rows).toBe(1)
  })

  it('skips rows where rate_pct is null', () => {
    const rows: LTVFRow[] = [
      makeRow({ id: 'r1', rate_pct: null }),
      makeRow({ id: 'r2', rate_pct: 100 }),
    ]

    const result = recomputeSummary(rows, baseSummary, thresholds)

    expect(result.pass_count).toBe(1)
    expect(result.fail_count).toBe(0)
    expect(result.total_rows).toBe(1)
  })

  it('preserves all other summary fields unchanged', () => {
    const rows: LTVFRow[] = [makeRow({ rate_pct: 100 })]
    const result = recomputeSummary(rows, baseSummary, thresholds)

    expect(result.overall_rate).toBe(baseSummary.overall_rate)
    expect(result.total_equal).toBe(baseSummary.total_equal)
    expect(result.total_source).toBe(baseSummary.total_source)
    expect(result.has_signoff).toBe(baseSummary.has_signoff)
  })

  it('returns zero counts for an empty row array', () => {
    const result = recomputeSummary([], baseSummary, thresholds)

    expect(result.pass_count).toBe(0)
    expect(result.warn_count).toBe(0)
    expect(result.fail_count).toBe(0)
    expect(result.total_rows).toBe(0)
  })
})
