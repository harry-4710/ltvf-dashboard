import { Clock, Trash2, X } from 'lucide-react'
import type { HistoryEntry } from '../utils/history'

interface Props {
  history: HistoryEntry[]
  onLoad: (entry: HistoryEntry) => void
  onDelete: (id: string) => void
  onClose: () => void
  dark: boolean
}

export default function UploadHistory({ history, onLoad, onDelete, onClose, dark }: Props) {
  const bg = dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'
  const row = dark ? 'hover:bg-slate-700 border-slate-700' : 'hover:bg-gray-50 border-gray-100'
  const txt = dark ? 'text-slate-200' : 'text-gray-800'
  const sub = dark ? 'text-slate-400' : 'text-gray-500'

  return (
    <div className={`absolute right-0 top-10 z-50 rounded-xl border shadow-xl w-80 ${bg}`}>
      <div className={`flex justify-between items-center px-4 py-3 border-b ${dark ? 'border-slate-700' : 'border-gray-100'}`}>
        <span className={`text-sm font-semibold flex items-center gap-2 ${txt}`}>
          <Clock size={14} /> Recent Uploads
        </span>
        <button onClick={onClose} className={`${sub} hover:text-red-400`}><X size={14} /></button>
      </div>

      {history.length === 0 ? (
        <p className={`text-xs p-4 ${sub}`}>No previous uploads in this browser.</p>
      ) : (
        <div className="divide-y divide-slate-700">
          {history.map(entry => (
            <div key={entry.id} className={`flex items-center gap-2 px-3 py-2.5 border-b ${row}`}>
              <button className="flex-1 text-left min-w-0" onClick={() => onLoad(entry)}>
                <p className={`text-xs font-medium truncate ${txt}`}>{entry.filename}</p>
                <p className={`text-[10px] ${sub}`}>
                  {entry.systemTag && <span className="text-blue-400 mr-1">[{entry.systemTag}]</span>}
                  {new Date(entry.timestamp).toLocaleString()}
                  {' · '}{entry.data.summary.total_rows} tests
                  {' · '}{entry.data.summary.overall_rate.toFixed(1)}%
                </p>
              </button>
              <button
                onClick={() => onDelete(entry.id)}
                className="text-slate-500 hover:text-red-400 flex-shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
