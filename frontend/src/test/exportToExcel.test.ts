import { describe, it, expect, beforeEach, vi } from 'vitest'
import { exportToExcel } from '../utils/exportToExcel'
import type { LTVFParseResult } from '../types/ltvf'

// ── mock xlsx (use vi.hoisted so vars are available when vi.mock is hoisted) ──

const { mockWriteFile, mockJsonToSheet, mockBookNew, mockBookAppend } = vi.hoisted(() => ({
  mockWriteFile:   vi.fn(),
  mockJsonToSheet: vi.fn(() => ({})),
  mockBookNew:     vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
  mockBookAppend:  vi.fn(),
}))

vi.mock('xlsx', () => ({
  utils: {
    book_new:          mockBookNew,
    json_to_sheet:     mockJsonToSheet,
    book_append_sheet: mockBookAppend,
  },
  writeFile: mockWriteFile,
}))

// ── helpers — cast mock.calls to unknown[][] to satisfy strict TS ─────────────

function calls(mock: ReturnType<typeof vi.fn>): unknown[][] {
  return mock.mock.calls as unknown[][]
}

// ── fixture ───────────────────────────────────────────────────────────────────

const mockResult: LTVFParseResult = {
  filename: 'LTVR_P&G_NALA.xlsx',
  sections: ['Stream A'],
  summary: {
    overall_rate: 90,
    total_equal: 900,
    total_diff: 50,
    total_missing: 25,
    total_unexpected: 0,
    total_source: 1000,
    total_target: 975,
    total_rows: 3,
    pass_count: 2,
    warn_count: 1,
    fail_count: 0,
    has_signoff: true,
    total_approved: 3,
    total_rejected: 0,
    total_recheck: 0,
    total_volume: 30,
  },
  rows: [
    {
      id: 'row_1', parent_id: null, level: 1,
      test_name: 'Customers', full_path: 'Stream A > Customers',
      is_group: false, rate_pct: 100,
      diff: 0, accept: 0, missing: 0, unexpected: 0, equal: 500,
      oos_src: 0, oos_trg: 0, local: null, source: null, source1: null, source2: null, target: null,
      so_status: 'Approved', signed_by: 'user1', wi_pct: 100, tot: 1, err: 0, fin: 1,
    },
  ],
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('exportToExcel()', () => {
  beforeEach(() => {
    mockWriteFile.mockClear()
    mockJsonToSheet.mockClear()
    mockBookNew.mockClear()
    mockBookAppend.mockClear()
  })

  it('calls XLSX.writeFile once', () => {
    exportToExcel(mockResult)
    expect(mockWriteFile).toHaveBeenCalledTimes(1)
  })

  it('output filename strips the original extension and appends _export.xlsx', () => {
    exportToExcel(mockResult)
    const [, filename] = calls(mockWriteFile)[0]
    expect(filename).toBe('LTVR_P&G_NALA_export.xlsx')
  })

  it('creates exactly two sheets (Summary + Detail Rows)', () => {
    exportToExcel(mockResult)
    expect(mockBookAppend).toHaveBeenCalledTimes(2)
    const sheetNames = calls(mockBookAppend).map(c => c[2])
    expect(sheetNames).toContain('Summary')
    expect(sheetNames).toContain('Detail Rows')
  })

  it('Summary sheet contains the overall_rate value', () => {
    exportToExcel(mockResult)
    const summaryData = calls(mockJsonToSheet)[0][0] as Record<string, unknown>[]
    expect(summaryData[0]['Overall Rate (%)']).toBe(90)
  })

  it('Summary sheet contains total_rows', () => {
    exportToExcel(mockResult)
    const summaryData = calls(mockJsonToSheet)[0][0] as Record<string, unknown>[]
    expect(summaryData[0]['Total Rows']).toBe(3)
  })

  it('Detail Rows sheet is built from data.rows array', () => {
    exportToExcel(mockResult)
    const detailData = calls(mockJsonToSheet)[1][0]
    expect(detailData).toBe(mockResult.rows)
  })

  it('Summary sheet includes filename', () => {
    exportToExcel(mockResult)
    const summaryData = calls(mockJsonToSheet)[0][0] as Record<string, unknown>[]
    expect(summaryData[0]['Filename']).toBe('LTVR_P&G_NALA.xlsx')
  })
})

