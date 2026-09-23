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
  // LTVR sign-off fields (null for plain LTVF files)
  so_status: string | null
  signed_by: string | null
  wi_pct: number | null
  tot: number | null
  err: number | null
  fin: number | null
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
  // LTVR sign-off summary (false/0 for plain LTVF)
  has_signoff: boolean
  total_approved: number
  total_rejected: number
  total_recheck: number
  total_volume: number
}

export interface LTVFParseResult {
  filename: string
  summary: LTVFSummary
  rows: LTVFRow[]
  sections: string[]
}

export interface ResultEntry {
  id: string
  system_tag: string
  uploaded_at: string
  filename: string
  overall_rate: number
  pass_count: number
  warn_count: number
  fail_count: number
  total_rows: number
}

