import { useCallback, useState } from 'react'
import { UploadCloud, CloudDownload, CalendarClock } from 'lucide-react'

interface Props {
  onFile: (file: File) => void
  loading: boolean
  dark: boolean
  sapAvailable?: boolean
  onFetchFromSAP?: () => void
  scheduledAvailable?: boolean
  lastExportTime?: string | null
  onFetchScheduled?: () => void
}

function formatExportTime(iso: string | null | undefined): string {
  if (!iso) return 'No export found yet'
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function UploadZone({
  onFile, loading, dark,
  sapAvailable = false, onFetchFromSAP,
  scheduledAvailable = false, lastExportTime, onFetchScheduled,
}: Props) {
  const [dragging, setDragging] = useState(false)

  const handle = useCallback((file: File) => {
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      onFile(file)
    }
  }, [onFile])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handle(file)
  }

  const hasSapOptions = sapAvailable || scheduledAvailable

  return (
    <div className="flex flex-col items-center justify-center h-full">

      {/* ── Upload zone ─────────────────────────────────────────── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`
          border-2 border-dashed rounded-2xl p-16 flex flex-col items-center gap-4 cursor-pointer
          transition-all duration-200 w-[480px]
          ${dragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 scale-105'
            : dark
              ? 'border-slate-600 bg-slate-800 hover:border-blue-500 hover:bg-slate-700'
              : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
          }
          ${loading ? 'opacity-60 pointer-events-none' : ''}
        `}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <UploadCloud
          size={52}
          className={dragging ? 'text-blue-500' : dark ? 'text-slate-400' : 'text-gray-400'}
        />
        <div className="text-center">
          <p className={`text-lg font-semibold ${dark ? 'text-slate-200' : 'text-gray-700'}`}>
            {loading ? 'Processing...' : 'Upload LTVF Export'}
          </p>
          <p className={`text-sm mt-1 ${dark ? 'text-slate-400' : 'text-gray-400'}`}>
            Drag & drop your SAP export here, or click to browse
          </p>
          <p className={`text-xs mt-2 ${dark ? 'text-slate-600' : 'text-gray-300'}`}>
            Accepts .xlsx / .xls
          </p>
        </div>
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handle(f) }}
        />
      </div>

      {/* ── SAP live options ────────────────────────────────────── */}
      {hasSapOptions && (
        <>
          <div className="flex items-center gap-3 my-4 w-[480px]">
            <div className={`flex-1 h-px ${dark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            <span className={`text-xs ${dark ? 'text-slate-500' : 'text-gray-400'}`}>or connect to SAP</span>
            <div className={`flex-1 h-px ${dark ? 'bg-slate-700' : 'bg-gray-200'}`} />
          </div>

          <div className="flex flex-col gap-2.5 w-[480px]">

            {/* Load Latest from SharePoint (scheduled export) */}
            {scheduledAvailable && onFetchScheduled && (
              <button
                onClick={onFetchScheduled}
                disabled={loading}
                className={`
                  flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm
                  bg-[#003366] hover:bg-[#00264d] text-white
                  transition-all duration-200 w-full justify-between
                  ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99]'}
                `}
              >
                <div className="flex items-center gap-2.5">
                  <CalendarClock size={18} />
                  <div className="text-left">
                    <p className="leading-tight">Load Latest from SAP</p>
                    <p className={`text-[10px] font-normal leading-tight mt-0.5 ${dark ? 'text-blue-300' : 'text-blue-200'}`}>
                      Last export: {formatExportTime(lastExportTime)}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-normal bg-green-700 text-green-100">
                  Daily
                </span>
              </button>
            )}

            {/* Fetch live via BTP */}
            {sapAvailable && onFetchFromSAP && (
              <button
                onClick={onFetchFromSAP}
                disabled={loading}
                className={`
                  flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm
                  border-2 border-[#003366] text-[#003366] dark:border-blue-400 dark:text-blue-300
                  hover:bg-[#003366] hover:text-white dark:hover:bg-blue-900
                  transition-all duration-200 w-full justify-between
                  ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99]'}
                `}
              >
                <div className="flex items-center gap-2.5">
                  <CloudDownload size={18} />
                  <div className="text-left">
                    <p className="leading-tight">Fetch from SAP BTP</p>
                    <p className="text-[10px] font-normal leading-tight mt-0.5 opacity-70">
                      Real-time via BTP Cloud Connector
                    </p>
                  </div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-normal bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  Live
                </span>
              </button>
            )}

          </div>
        </>
      )}

      <p className={`text-xs mt-6 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
        Export from SAP GUI:{' '}
        <span className={`font-mono px-1 rounded ${dark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100'}`}>
          System → List → Save → Local File → Spreadsheet
        </span>
      </p>
    </div>
  )
}
