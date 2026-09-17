import { useEffect, useState, useCallback } from 'react'
import { History, RefreshCw, Trash2, FolderOpen, AlertCircle } from 'lucide-react'
import { getResults, deleteResult, getResultByDate } from '../api/resultsApi'
import type { LTVFParseResult, ResultEntry } from '../types/ltvf'

interface Props {
  systemTag: string
  dark: boolean
  thresholds: { pass: number; warn: number }
  onLoad: (result: LTVFParseResult) => void
}

export default function HistoryViewer({ systemTag, dark, thresholds, onLoad }: Props) {
  const [entries, setEntries]       = useState<ResultEntry[]>([])
  const [loading, setLoading]       = useState(false)
  const [loadingId, setLoadingId]   = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)

  const bg  = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  const lbl = dark ? 'text-slate-400' : 'text-gray-500'
  const txt = dark ? 'text-slate-200' : 'text-gray-800'

  const fetchHistory = useCallback(() => {
    if (!systemTag) { setEntries([]); return }
    setLoading(true); setError(null)
    getResults(systemTag)
      .then(setEntries)
      .catch(() => setError('Failed to load history from backend.'))
      .finally(() => setLoading(false))
  }, [systemTag])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const handleLoad = async (entry: ResultEntry) => {
    setLoadingId(entry.id)
    try {
      const result = await getResultByDate(entry.system_tag, entry.uploaded_at.slice(0, 10))
      onLoad(result)
    } catch { setError(`Failed to load result.`) }
    finally { setLoadingId(null) }
  }

  const handleDelete = async (entry: ResultEntry) => {
    if (!confirm(`Delete result from ${new Date(entry.uploaded_at).toLocaleString()}?`)) return
    setDeletingId(entry.id)
    try {
      await deleteResult(entry.id)
      setEntries(prev => prev.filter(e => e.id !== entry.id))
    } catch { setError('Failed to delete entry.') }
    finally { setDeletingId(null) }
  }


  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={16} className={lbl} />
          <span className={`text-sm font-semibold ${txt}`}>Result History {systemTag ? `— ${systemTag}` : ''}</span>
          {entries.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${dark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-500'}`}>
              {entries.length} run{entries.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button onClick={fetchHistory} disabled={loading}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition
            ${dark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={14} /><span>{error}</span>
          <button className="ml-auto text-xs underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {!systemTag && (
        <div className={`rounded-xl border p-8 flex flex-col items-center gap-3 ${bg}`}>
          <History size={36} className={lbl} />
          <p className={`text-sm font-medium ${lbl}`}>Set a System Tag in the header to view stored results</p>
        </div>
      )}

      {systemTag && loading && (
        <div className={`rounded-xl border p-8 flex items-center justify-center ${bg}`}>
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {systemTag && !loading && entries.length === 0 && !error && (
        <div className={`rounded-xl border p-8 flex flex-col items-center gap-3 ${bg}`}>
          <History size={36} className={lbl} />
          <p className={`text-sm font-medium ${lbl}`}>No results stored for "{systemTag}"</p>
          <p className={`text-xs ${lbl}`}>Upload or fetch data with this tag to populate history.</p>
        </div>
      )}

      {entries.length > 0 && !loading && (
        <div className={`rounded-xl border overflow-hidden ${dark ? 'border-slate-700' : 'border-gray-200'}`}>
          <table className="w-full text-xs">
            <thead>
              <tr className={dark ? 'bg-slate-700 text-slate-300' : 'bg-gray-50 text-gray-600'}>
                <th className="px-3 py-2.5 text-left font-medium">Uploaded</th>
                <th className="px-3 py-2.5 text-left font-medium">Filename</th>
                <th className="px-3 py-2.5 text-right font-medium">Rate</th>
                <th className="px-3 py-2.5 text-right font-medium">Tests</th>
                <th className="px-3 py-2.5 text-right font-medium">✅</th>
                <th className="px-3 py-2.5 text-right font-medium">⚠️</th>
                <th className="px-3 py-2.5 text-right font-medium">❌</th>
                <th className="px-3 py-2.5 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((r, i) => {
                const rc = r.overall_rate >= thresholds.pass ? 'text-green-500'
                  : r.overall_rate >= thresholds.warn ? 'text-amber-500' : 'text-red-500'
                return (
                  <tr key={r.id} className={`border-t ${dark ? 'border-slate-700' : 'border-gray-100'}
                    ${i % 2 === 0 ? (dark ? 'bg-slate-800' : 'bg-white') : (dark ? 'bg-slate-900/30' : 'bg-gray-50')}`}>
                    <td className={`px-3 py-2 ${dark ? 'text-slate-300' : 'text-gray-700'}`}>{new Date(r.uploaded_at).toLocaleString()}</td>
                    <td className={`px-3 py-2 truncate max-w-[180px] ${lbl}`}>{r.filename}</td>
                    <td className={`px-3 py-2 text-right font-bold ${rc}`}>{r.overall_rate.toFixed(1)}%</td>
                    <td className={`px-3 py-2 text-right ${lbl}`}>{r.total_rows}</td>
                    <td className="px-3 py-2 text-right text-green-500">{r.pass_count}</td>
                    <td className="px-3 py-2 text-right text-amber-500">{r.warn_count}</td>
                    <td className="px-3 py-2 text-right text-red-500">{r.fail_count}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleLoad(r)} disabled={!!loadingId || !!deletingId}
                          className="p-1 text-blue-400 hover:text-blue-300 disabled:opacity-40" title="Load this result">
                          {loadingId === r.id
                            ? <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            : <FolderOpen size={13} />}
                        </button>
                        <button onClick={() => handleDelete(r)} disabled={!!loadingId || !!deletingId}
                          className="p-1 text-slate-400 hover:text-red-400 disabled:opacity-40" title="Delete this result">
                          {deletingId === r.id
                            ? <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <Trash2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
