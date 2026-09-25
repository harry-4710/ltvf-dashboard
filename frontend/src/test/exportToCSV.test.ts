import { describe, it, expect, beforeEach, vi } from 'vitest'
import { exportToCSV } from '../utils/exportToCSV'
import type { LTVFParseResult } from '../types/ltvf'

// ── mock the DOM APIs used by exportToCSV ────────────────────────────────────

const clickMock  = vi.fn()
const appendMock = vi.fn()
const removeMock = vi.fn()
const revokeMock = vi.fn()

beforeEach(() => {
  clickMock.mockClear()
  appendMock.mockClear()
  removeMock.mockClear()
  revokeMock.mockClear()

  // createElement returns an anchor-like object
  vi.spyOn(document, 'createElement').mockReturnValue({
    href: '',
    download: '',
    click: clickMock,
  } as unknown as HTMLAnchorElement)

  vi.spyOn(document.body, 'appendChild').mockImplementation(appendMock)
  vi.spyOn(document.body, 'removeChild').mockImplementation(removeMock)

  // URL.createObjectURL / revokeObjectURL are not in jsdom by default
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: revokeMock,
  })
})

// ── fixture data ──────────────────────────────────────────────────────────────

const mockResult: LTVFParseResult = {
  filename: 'LTVR_test.xlsx',
  sections: ['Stream A', 'Stream B'],
  summary: {
    overall_rate: 75,
    total_equal: 750,
    total_diff: 200,
    total_missing: 50,
    total_unexpected: 0,
    total_source: 1000,
    total_target: 950,
    total_rows: 2,
    pass_count: 1,
    warn_count: 0,
    fail_count: 1,
    has_signoff: false,
    total_approved: 0,
    total_rejected: 0,
    total_recheck: 0,
    total_volume: 10,
  },
  rows: [
    {
      id: 'row_1', parent_id: null, level: 1,
      test_name: 'Test with, comma', full_path: 'Stream A > Test with, comma',
      is_group: false, rate_pct: 100,
      diff: 0, accept: 0, missing: 0, unexpected: 0, equal: 100,
      oos_src: 0, oos_trg: 0, local: null, source: null, source1: null, source2: null, target: null,
      so_status: 'Approved', signed_by: null, wi_pct: null, tot: null, err: null, fin: null,
    },
    {
      id: 'row_2', parent_id: null, level: 1,
      test_name: 'Test "quoted"', full_path: 'Stream B > Test "quoted"',
      is_group: false, rate_pct: 50,
      diff: 5, accept: 0, missing: 2, unexpected: 0, equal: 50,
      oos_src: 0, oos_trg: 0, local: null, source: null, source1: null, source2: null, target: null,
      so_status: null, signed_by: null, wi_pct: null, tot: null, err: null, fin: null,
    },
  ],
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('exportToCSV()', () => {
  it('triggers a download (click is called once)', () => {
    exportToCSV(mockResult)
    expect(clickMock).toHaveBeenCalledTimes(1)
  })

  it('sets download filename derived from input filename', () => {
    const anchor = { href: '', download: '', click: clickMock } as unknown as HTMLAnchorElement
    vi.spyOn(document, 'createElement').mockReturnValue(anchor)
    exportToCSV(mockResult)
    expect(anchor.download).toBe('LTVR_test_export.csv')
  })

  it('calls URL.revokeObjectURL after click to free memory', () => {
    exportToCSV(mockResult)
    expect(revokeMock).toHaveBeenCalledWith('blob:mock-url')
  })

  it('creates a Blob (URL.createObjectURL is called)', () => {
    exportToCSV(mockResult)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('produces CSV content with correct header row', () => {
    let capturedBlob: Blob | null = null
    vi.stubGlobal('URL', {
      createObjectURL: (blob: Blob) => { capturedBlob = blob; return 'blob:mock' },
      revokeObjectURL: vi.fn(),
    })

    exportToCSV(mockResult)

    expect(capturedBlob).not.toBeNull()
    return capturedBlob!.text().then(text => {
      const lines = text.replace(/^\uFEFF/, '').split('\n')  // strip BOM
      expect(lines[0]).toContain('test_name')
      expect(lines[0]).toContain('rate_pct')
      expect(lines[0]).toContain('diff')
      expect(lines[0]).toContain('missing')
    })
  })

  it('CSV-escapes cells that contain commas', () => {
    let capturedBlob: Blob | null = null
    vi.stubGlobal('URL', {
      createObjectURL: (blob: Blob) => { capturedBlob = blob; return 'blob:mock' },
      revokeObjectURL: vi.fn(),
    })

    exportToCSV(mockResult)

    return capturedBlob!.text().then(text => {
      expect(text).toContain('"Test with, comma"')
    })
  })

  it('CSV-escapes cells that contain double-quotes', () => {
    let capturedBlob: Blob | null = null
    vi.stubGlobal('URL', {
      createObjectURL: (blob: Blob) => { capturedBlob = blob; return 'blob:mock' },
      revokeObjectURL: vi.fn(),
    })

    exportToCSV(mockResult)

    return capturedBlob!.text().then(text => {
      // RFC 4180: " in a quoted field is escaped as ""
      expect(text).toContain('"Test ""quoted"""')
    })
  })
})
