export interface LTVFRow {
  id: string
  parent_id: string | null
  level: number
  test_name: string
  full_path: string
  is_group: boolean
  rate_pct: number | null
  diff: number | null
  accept: number | null
  missing: number | null
  unexpected: number | null
  equal: number | null
  oos_src: number | null
  oos_trg: number | null
  local: number | null
  source: number | null
  source1: number | null
  source2: number | null
  target: number | null
}

export interface LTVFSummary {
  overall_rate: number
  total_equal: number
  total_diff: number
  total_missing: number
  total_unexpected: number
  total_source: number
  total_target: number
  total_rows: number
  pass_count: number
  warn_count: number
  fail_count: number
}

export interface LTVFParseResult {
  filename: string
  summary: LTVFSummary
  rows: LTVFRow[]
  sections: string[]
}
