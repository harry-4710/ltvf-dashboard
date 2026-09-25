import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadHistory, saveToHistory, deleteFromHistory } from '../utils/history'
import type { LTVFParseResult } from '../types/ltvf'

// ── minimal LTVFParseResult fixture ──────────────────────────────────────────

const minimalResult: LTVFParseResult = {
  filename: 'test.xlsx',
  sections: [],
  summary: {
    overall_rate: 85, total_equal: 850, total_diff: 100, total_missing: 50,
    total_unexpected: 0, total_source: 1000, total_target: 950,
    total_rows: 5, pass_count: 3, warn_count: 1, fail_count: 1,
    has_signoff: false, total_approved: 0, total_rejected: 0, total_recheck: 0,
    total_volume: 10,
  },
  rows: [],
}

// ── localStorage stub ─────────────────────────────────────────────────────────

let store: Record<string, string> = {}

beforeEach(() => {
  store = {}
  vi.stubGlobal('localStorage', {
    getItem:    (k: string) => store[k] ?? null,
    setItem:    (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear:      () => { store = {} },
  })
})

// ── loadHistory() ─────────────────────────────────────────────────────────────

describe('loadHistory()', () => {
  it('returns an empty array when localStorage is empty', () => {
    expect(loadHistory()).toEqual([])
  })

  it('returns an empty array when localStorage value is invalid JSON', () => {
    store['ltvf-history'] = 'not-json'
    expect(loadHistory()).toEqual([])
  })

  it('returns parsed entries when localStorage has valid data', () => {
    const entry = { id: '1', filename: 'f.xlsx', timestamp: '2026-01-01', systemTag: 'default', data: minimalResult }
    store['ltvf-history'] = JSON.stringify([entry])
    const result = loadHistory()
    expect(result).toHaveLength(1)
    expect(result[0].filename).toBe('f.xlsx')
  })
})

// ── saveToHistory() ───────────────────────────────────────────────────────────

describe('saveToHistory()', () => {
  it('adds a new entry and returns it at position 0', () => {
    const result = saveToHistory({ filename: 'a.xlsx', timestamp: '2026-01-01T00:00:00Z', systemTag: '', data: minimalResult })
    expect(result).toHaveLength(1)
    expect(result[0].filename).toBe('a.xlsx')
  })

  it('assigns a unique string id to the new entry', () => {
    const result = saveToHistory({ filename: 'a.xlsx', timestamp: '2026-01-01T00:00:00Z', systemTag: '', data: minimalResult })
    expect(typeof result[0].id).toBe('string')
    expect(result[0].id.length).toBeGreaterThan(0)
  })

  it('prepends new entries (most recent first)', () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2000)
    saveToHistory({ filename: 'first.xlsx', timestamp: '2026-01-01T00:00:00Z', systemTag: '', data: minimalResult })
    const result = saveToHistory({ filename: 'second.xlsx', timestamp: '2026-01-02T00:00:00Z', systemTag: '', data: minimalResult })
    vi.restoreAllMocks()
    expect(result[0].filename).toBe('second.xlsx')
    expect(result[1].filename).toBe('first.xlsx')
  })

  it('caps history at 5 entries', () => {
    for (let i = 0; i < 7; i++) {
      saveToHistory({ filename: `file${i}.xlsx`, timestamp: '2026-01-01T00:00:00Z', systemTag: '', data: minimalResult })
    }
    expect(loadHistory()).toHaveLength(5)
  })

  it('persists entries to localStorage', () => {
    saveToHistory({ filename: 'persist.xlsx', timestamp: '2026-01-01T00:00:00Z', systemTag: '', data: minimalResult })
    expect(store['ltvf-history']).toBeDefined()
    const parsed = JSON.parse(store['ltvf-history'])
    expect(parsed[0].filename).toBe('persist.xlsx')
  })
})

// ── deleteFromHistory() ───────────────────────────────────────────────────────

describe('deleteFromHistory()', () => {
  it('removes the entry with the matching id', () => {
    const saved = saveToHistory({ filename: 'del.xlsx', timestamp: '2026-01-01T00:00:00Z', systemTag: '', data: minimalResult })
    const id = saved[0].id
    const result = deleteFromHistory(id)
    expect(result.find(e => e.id === id)).toBeUndefined()
  })

  it('leaves other entries intact', () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(2000)
    saveToHistory({ filename: 'keep.xlsx', timestamp: '2026-01-01T00:00:00Z', systemTag: '', data: minimalResult })
    const saved = saveToHistory({ filename: 'del.xlsx', timestamp: '2026-01-02T00:00:00Z', systemTag: '', data: minimalResult })
    vi.restoreAllMocks()
    const idToDel = saved[0].id  // saved[0] is 'del.xlsx' (most recent)
    const result = deleteFromHistory(idToDel)
    expect(result.some(e => e.filename === 'keep.xlsx')).toBe(true)
  })

  it('returns empty array when deleting the only entry', () => {
    const saved = saveToHistory({ filename: 'only.xlsx', timestamp: '2026-01-01T00:00:00Z', systemTag: '', data: minimalResult })
    const result = deleteFromHistory(saved[0].id)
    expect(result).toHaveLength(0)
  })

  it('persists the deletion to localStorage', () => {
    const saved = saveToHistory({ filename: 'x.xlsx', timestamp: '2026-01-01T00:00:00Z', systemTag: '', data: minimalResult })
    deleteFromHistory(saved[0].id)
    expect(JSON.parse(store['ltvf-history'])).toHaveLength(0)
  })
})
