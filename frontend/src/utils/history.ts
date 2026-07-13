import type { LTVFParseResult } from '../types/ltvf'

export interface HistoryEntry {
  id: string
  filename: string
  timestamp: string
  systemTag: string
  data: LTVFParseResult
}

const KEY = 'ltvf-history'
const MAX = 5

export function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveToHistory(entry: Omit<HistoryEntry, 'id'>): HistoryEntry[] {
  const history = loadHistory()
  const newEntry: HistoryEntry = { ...entry, id: Date.now().toString() }
  const updated = [newEntry, ...history].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(updated))
  return updated
}

export function deleteFromHistory(id: string): HistoryEntry[] {
  const updated = loadHistory().filter(e => e.id !== id)
  localStorage.setItem(KEY, JSON.stringify(updated))
  return updated
}
