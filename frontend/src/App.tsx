import { useState, useCallback } from 'react'
import { Database, Upload, Sun, Moon } from 'lucide-react'
import UploadZone from './components/UploadZone'
import SummaryCards from './components/SummaryCards'
import RateDonut from './components/RateDonut'
import SectionChart from './components/SectionChart'
import VolumeChart from './components/VolumeChart'
import FailChart from './components/FailChart'
import LTVFTable from './components/LTVFTable'
import { uploadLTVF } from './api/sapApi'
import type { LTVFParseResult } from './types/ltvf'
import './index.css'

type Tab = 'overview' | 'table'

function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('ltvf-theme')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const toggle = useCallback(() => {
    setDark(prev => {
      const next = !prev
      localStorage.setItem('ltvf-theme', next ? 'dark' : 'light')
      return next
    })
  }, [])

  return { dark, toggle }
}

export default function App() {
  const { dark, toggle } = useTheme()
  const [data, setData]       = useState<LTVFParseResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [tab, setTab]         = useState<Tab>('overview')

  const handleFile = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      const result = await uploadLTVF(file)
      setData(result)
      setTab('overview')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="flex flex-col h-screen bg-gray-100 dark:bg-slate-900 transition-colors duration-200">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="bg-[#003366] dark:bg-slate-950 text-white px-5 py-2.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <Database size={18} />
            <div>
              <h1 className="text-sm font-bold tracking-wide">LTVF Cloud Dashboard</h1>
              {data && (
                <p className="text-[11px] text-blue-200">
                  {data.filename} &nbsp;·&nbsp; {data.summary.total_rows} test cases
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <>
                {(['overview', 'table'] as Tab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`text-xs px-3 py-1 rounded transition ${
                      tab === t
                        ? 'bg-white text-[#003366] font-semibold'
                        : 'text-blue-200 hover:text-white'
                    }`}
                  >
                    {t === 'overview' ? 'Overview' : 'Detail Table'}
                  </button>
                ))}
                <button
                  onClick={() => { setData(null); setError(null) }}
                  className="ml-1 text-blue-300 hover:text-white transition"
                  title="Upload new file"
                >
                  <Upload size={15} />
                </button>
              </>
            )}
            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="ml-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-white"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>

        {/* ── Error banner ──────────────────────────────────────────── */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm flex justify-between">
            <span>{error}</span>
            <span className="cursor-pointer" onClick={() => setError(null)}>✕</span>
          </div>
        )}

        {/* ── Upload screen ─────────────────────────────────────────── */}
        {!data && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <UploadZone onFile={handleFile} loading={loading} dark={dark} />
          </div>
        )}

        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-slate-500">
            <div className="w-10 h-10 border-4 border-blue-200 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm">Parsing LTVF export…</p>
          </div>
        )}

        {/* ── Dashboard ─────────────────────────────────────────────── */}
        {data && !loading && (
          <div className="flex-1 flex flex-col min-h-0 overflow-auto">
            <SummaryCards summary={data.summary} dark={dark} />

            {tab === 'overview' && (
              <div className="px-4 pb-4 flex flex-col gap-4 flex-1">
                <div className="grid grid-cols-3 gap-4">
                  <RateDonut summary={data.summary} dark={dark} />
                  <SectionChart rows={data.rows} dark={dark} />
                  <VolumeChart summary={data.summary} dark={dark} />
                </div>
                <FailChart rows={data.rows} dark={dark} />
              </div>
            )}

            {tab === 'table' && (
              <div className="px-4 pb-4 flex-1 min-h-0" style={{ height: 'calc(100vh - 220px)' }}>
                <LTVFTable rows={data.rows} dark={dark} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
