import { useCallback, useState } from 'react'
import { UploadCloud } from 'lucide-react'

interface Props {
  onFile: (file: File) => void
  loading: boolean
  dark: boolean
}

export default function UploadZone({ onFile, loading, dark }: Props) {
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

  return (
    <div className="flex flex-col items-center justify-center h-full">
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
      <p className={`text-xs mt-6 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
        Export from SAP GUI:{' '}
        <span className={`font-mono px-1 rounded ${dark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100'}`}>
          System → List → Save → Local File → Spreadsheet
        </span>
      </p>
    </div>
  )
}
