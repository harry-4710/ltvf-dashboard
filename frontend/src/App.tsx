import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Database, Upload, Sun, Moon, GitCompare, Clock, Printer, FileDown, Mail, FileText, History } from 'lucide-react'
import UploadZone from './components/UploadZone'
import SummaryCards from './components/SummaryCards'
import RateDonut from './components/RateDonut'
import SectionChart from './components/SectionChart'
import VolumeChart from './components/VolumeChart'
import FailChart from './components/FailChart'
import LTVFTable from './components/LTVFTable'
import FilterChips from './components/FilterChips'
import ThresholdPanel from './components/ThresholdPanel'
import TreemapChart from './components/TreemapChart'
import ComparePanel from './components/ComparePanel'
import UploadHistory from './components/UploadHistory'
import TrendChart from './components/TrendChart'
import HistoryViewer from './components/HistoryViewer'
import SystemTagSelector from './components/SystemTagSelector'
import { ToastContainer, useToast } from './components/Toast'
import { uploadLTVF } from './api/sapApi'
import { checkSAPStatus, fetchFromSAP } from './api/btpApi'
import { checkScheduledStatus, fetchScheduled } from './api/scheduledApi'
import { getSettings, saveSettings } from './api/settingsApi'
import { saveResult } from './api/resultsApi'
import SACEmbed from './components/SACEmbed'
import type { LTVFParseResult } from './types/ltvf'
import { loadHistory, saveToHistory, deleteFromHistory, type HistoryEntry } from './utils/history'
import { exportToExcel } from './utils/exportToExcel'
import { exportToCSV } from './utils/exportToCSV'
import { generateHTMLReport } from './utils/generateReport'
import { recomputeSummary } from './utils/classify'
import './index.css'

type Tab = 'overview' | 'table' | 'treemap' | 'compare' | 'analytics' | 'trend' | 'history'

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
  const { toasts, toast, dismiss } = useToast()
  const [data, setData]               = useState<LTVFParseResult | null>(null)
  const [compareData, setCompareData] = useState<LTVFParseResult | null>(null)
  const [loading, setLoading]         = useState(false)
  const [compareLoading, setCompareLoading] = useState(false)
  const [tab, setTab]                 = useState<Tab>('overview')
  const [selectedSection, setSelectedSection] = useState<string | null>(() =>
    localStorage.getItem('ltvf-section')
  )
  const [thresholds, setThresholds]   = useState({ pass: 95, warn: 80 })
  const [systemTag, setSystemTag]     = useState('')
  const [history, setHistory]         = useState<HistoryEntry[]>(() => loadHistory())
  const [showHistory, setShowHistory] = useState(false)
  const [uploadedAt, setUploadedAt]   = useState<Date | null>(null)
  const [sapAvailable, setSapAvailable] = useState(false)
  const [scheduledAvailable, setScheduledAvailable] = useState(false)
  const [lastExportTime, setLastExportTime] = useState<string | null>(null)

  // Re-compute pass/warn/fail counts using the live frontend thresholds,
  // overriding the hardcoded 95/80 values from the backend parser.
  const displaySummary = useMemo(() =>
    data ? recomputeSummary(data.rows, data.summary, thresholds) : null,
    [data, thresholds]
  )

  useEffect(() => {
    checkSAPStatus().then(r => setSapAvailable(r.available)).catch(() => setSapAvailable(false))
    checkScheduledStatus().then(r => {
      setScheduledAvailable(r.available)
      setLastExportTime(r.last_modified)
    }).catch(() => setScheduledAvailable(false))
  }, [])

  useEffect(() => {
    if (selectedSection === null) {
      localStorage.removeItem('ltvf-section')
    } else {
      localStorage.setItem('ltvf-section', selectedSection)
    }
  }, [selectedSection])

  useEffect(() => {
    getSettings(systemTag)
      .then(t => setThresholds(t))
      .catch(() => {
        const raw = localStorage.getItem('ltvf-thresholds')
        if (raw) {
          try { setThresholds(JSON.parse(raw)) } catch { /* keep defaults */ }
        }
      })
  }, [systemTag])

  const _saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (_saveTimer.current) clearTimeout(_saveTimer.current)
    _saveTimer.current = setTimeout(() => {
      localStorage.setItem('ltvf-thresholds', JSON.stringify(thresholds))
      saveSettings(systemTag, thresholds).catch(() => { /* best-effort */ })
    }, 600)
    return () => { if (_saveTimer.current) clearTimeout(_saveTimer.current) }
  }, [thresholds, systemTag])

  const handleFile = useCallback(async (file: File) => {
    setLoading(true)
    try {
      const result = await uploadLTVF(file)
      setData(result)
      setTab('overview')
      setSelectedSection(null)
      setUploadedAt(new Date())
      const updated = saveToHistory({ filename: result.filename, timestamp: new Date().toISOString(), systemTag, data: result })
      setHistory(updated)
      saveResult(systemTag, result).catch(() => { /* best-effort */ })
      toast.success(`Loaded ${result.summary.total_rows} test cases — ${result.summary.overall_rate.toFixed(1)}% match rate`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Upload failed. Check the file format and try again.')
    } finally {
      setLoading(false)
    }
  }, [systemTag, toast])

  const handleFetchScheduled = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchScheduled()
      setData(result)
      setTab('overview')
      setSelectedSection(null)
      setUploadedAt(new Date())
      const updated = saveToHistory({ filename: result.filename, timestamp: new Date().toISOString(), systemTag, data: result })
      setHistory(updated)
      saveResult(systemTag, result).catch(() => { /* best-effort */ })
      toast.success(`Scheduled export loaded — ${result.summary.overall_rate.toFixed(1)}% match rate`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load SAP export from SharePoint')
    } finally {
      setLoading(false)
    }
  }, [systemTag, toast])

  const handleFetchFromSAP = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchFromSAP()
      setData(result)
      setTab('overview')
      setSelectedSection(null)
      setUploadedAt(new Date())
      const updated = saveToHistory({ filename: result.filename, timestamp: new Date().toISOString(), systemTag, data: result })
      setHistory(updated)
      saveResult(systemTag, result).catch(() => { /* best-effort */ })
      toast.success(`SAP live data fetched — ${result.summary.overall_rate.toFixed(1)}% match rate`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch from SAP')
    } finally {
      setLoading(false)
    }
  }, [systemTag, toast])

  const handleCompareFile = useCallback(async (file: File) => {
    setCompareLoading(true)
    try {
      const result = await uploadLTVF(file)
      setCompareData(result)
      setTab('compare')
      toast.info(`Compare file loaded: ${result.filename}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Compare upload failed')
    } finally {
      setCompareLoading(false)
    }
  }, [toast])

  const handleHistoryLoad = (entry: HistoryEntry) => {
    setData(entry.data)
    setSystemTag(entry.systemTag)
    setTab('overview')
    setSelectedSection(null)
    setShowHistory(false)
    setUploadedAt(new Date(entry.timestamp))
  }

  const handleHistoryDelete = (id: string) => {
    setHistory(deleteFromHistory(id))
  }

  const handleSectionClick = (section: string) => {
    setSelectedSection(prev => prev === section ? null : section)
  }

  const handlePrint   = () => window.print()
  const handleExport  = () => { if (data) { exportToExcel(data); toast.success('Excel file downloaded') } }
  const handleExportCSV = () => { if (data) { exportToCSV(data); toast.success('CSV file downloaded') } }
  const handleReport  = () => { if (data) generateHTMLReport(data, thresholds, systemTag, uploadedAt) }

  // Global keyboard shortcuts — skip when focus is inside an input/textarea
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'e' || e.key === 'E') { if (data) exportToExcel(data) }
      if (e.key === 'p' || e.key === 'P') { window.print() }
      if (e.key === 'r' || e.key === 'R') { if (data) generateHTMLReport(data, thresholds, systemTag, uploadedAt) }
      if (e.key === 't' || e.key === 'T') { toggle() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [data, toggle])

  const tabLabels: { key: Tab; label: string }[] = [
    { key: 'overview',   label: 'Overview' },
    { key: 'treemap',    label: 'Treemap' },
    { key: 'table',      label: 'Detail Table' },
    { key: 'compare',    label: 'Compare' },
    { key: 'trend',      label: 'Trend' },
    { key: 'history',    label: 'History' },
    { key: 'analytics',  label: 'Analytics' },
  ]

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="flex flex-col h-screen bg-gray-100 dark:bg-slate-900 transition-colors duration-200">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="bg-[#003366] dark:bg-slate-950 text-white px-5 py-2.5 flex items-center justify-between shadow-lg sticky top-0 z-40 no-print">
          <div className="flex items-center gap-3">
            <Database size={18} />
            <div>
              <h1 className="text-sm font-bold tracking-wide">LTVF Cloud Dashboard</h1>
              {data && (
                <p className="text-[11px] text-blue-200">
                  {data.filename}
                  {systemTag && <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-800 text-blue-200 text-[10px]">{systemTag}</span>}
                  {' '}&nbsp;·&nbsp; {data.summary.total_rows} test cases
                  {uploadedAt && <span className="ml-1 opacity-60">· {uploadedAt.toLocaleTimeString()}</span>}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {data && (
              <>
                {tabLabels.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`text-xs px-3 py-1 rounded transition ${
                      tab === t.key
                        ? 'bg-white text-[#003366] font-semibold'
                        : 'text-blue-200 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
                <div className="w-px h-4 bg-blue-700 mx-1" />

                {/* System tag selector (combo-box) */}
                <SystemTagSelector value={systemTag} onChange={setSystemTag} dark={dark} />

                {/* Compare */}
                <label
                  className="cursor-pointer text-blue-300 hover:text-white transition p-1"
                  title="Upload file to compare"
                >
                  <GitCompare size={15} />
                  <input type="file" accept=".xlsx,.xls" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleCompareFile(f) }} />
                </label>

                {/* History */}
                <div className="relative">
                  <button
                    onClick={() => setShowHistory(o => !o)}
                    className="text-blue-300 hover:text-white transition p-1"
                    title="Recent uploads"
                  >
                    <Clock size={15} />
                  </button>
                  {showHistory && (
                    <UploadHistory
                      history={history}
                      onLoad={handleHistoryLoad}
                      onDelete={handleHistoryDelete}
                      onClose={() => setShowHistory(false)}
                      dark={dark}
                    />
                  )}
                </div>

                {/* Print */}
                <button
                  onClick={handlePrint}
                  className="text-blue-300 hover:text-white transition p-1"
                  title="Print / Export PDF [P]"
                >
                  <Printer size={15} />
                </button>

                {/* HTML Report */}
                <button
                  onClick={handleReport}
                  className="text-blue-300 hover:text-white transition p-1"
                  title="Export HTML Report [R]"
                >
                  <Mail size={15} />
                </button>

                {/* Export to CSV */}
                <button
                  onClick={handleExportCSV}
                  className="text-blue-300 hover:text-white transition p-1"
                  title="Export to CSV"
                >
                  <FileText size={15} />
                </button>

                {/* Export to Excel */}
                <button
                  onClick={handleExport}
                  className="text-blue-300 hover:text-white transition p-1"
                  title="Export to Excel [E]"
                >
                  <FileDown size={15} />
                </button>

                {/* New upload */}
                <button
                  onClick={() => { setData(null); setCompareData(null); setSelectedSection(null) }}
                  className="text-blue-300 hover:text-white transition p-1"
                  title="Upload new file"
                >
                  <Upload size={15} />
                </button>
              </>
            )}

            {/* Threshold panel */}
            {data && (
              <ThresholdPanel thresholds={thresholds} onChange={setThresholds} dark={dark} />
            )}

            {/* History Viewer shortcut */}
            <button
              onClick={() => setTab('history')}
              className={`p-1.5 rounded-lg transition text-white ${tab === 'history' ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
              title="Result History"
            >
              <History size={15} />
            </button>

            {/* Dark mode */}
            <button
              onClick={toggle}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-white"
              title={dark ? 'Light mode [T]' : 'Dark mode [T]'}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>

        {/* ── Upload screen ─────────────────────────────────────────── */}
        {!data && !loading && tab !== 'analytics' && tab !== 'history' && (
          <div className="flex-1 flex items-center justify-center">
            <UploadZone
              onFile={handleFile}
              loading={loading}
              dark={dark}
              sapAvailable={sapAvailable}
              onFetchFromSAP={handleFetchFromSAP}
              scheduledAvailable={scheduledAvailable}
              lastExportTime={lastExportTime}
              onFetchScheduled={handleFetchScheduled}
            />
          </div>
        )}

        {/* ── Analytics tab (no data required) ─────────────────────── */}
        {!data && !loading && tab === 'analytics' && (
          <div className="flex-1 flex flex-col min-h-0">
            <SACEmbed dark={dark} />
          </div>
        )}

        {/* ── History tab (no data required) ────────────────────────── */}
        {(tab === 'history') && !loading && (
          <div className="flex-1 flex flex-col min-h-0 overflow-auto">
            <HistoryViewer systemTag={systemTag} dark={dark} thresholds={thresholds}
              onLoad={(result) => { setData(result); setTab('overview'); setSelectedSection(null); setUploadedAt(new Date()) }}
            />
          </div>
        )}

        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 dark:text-slate-500">
            <div className="w-10 h-10 border-4 border-blue-200 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm">Parsing LTVF export…</p>
          </div>
        )}

        {/* ── Dashboard ─────────────────────────────────────────────── */}
        {data && !loading && tab !== 'history' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-auto">

            <SummaryCards summary={displaySummary ?? data.summary} dark={dark} thresholds={thresholds} systemTag={systemTag} />

            {/* Section filter chips */}
            {tab !== 'compare' && tab !== 'trend' && (
              <FilterChips
                sections={data.sections}
                selected={selectedSection}
                onSelect={setSelectedSection}
                dark={dark}
              />
            )}

            {/* Overview tab */}
            {tab === 'overview' && (
              <div className="px-4 pb-4 flex flex-col gap-4 flex-1">
                <div className="grid grid-cols-3 gap-4">
                  <RateDonut summary={displaySummary ?? data.summary} dark={dark} thresholds={thresholds} />
                  <SectionChart
                    rows={data.rows}
                    dark={dark}
                    thresholds={thresholds}
                    selectedSection={selectedSection}
                    onSectionClick={handleSectionClick}
                  />
                  <VolumeChart summary={data.summary} dark={dark} />
                </div>
                <FailChart rows={data.rows} dark={dark} thresholds={thresholds} selectedSection={selectedSection} />
              </div>
            )}

            {/* Treemap tab */}
            {tab === 'treemap' && (
              <div className="px-4 pb-4 flex-1">
                <TreemapChart
                  rows={data.rows}
                  dark={dark}
                  thresholds={thresholds}
                  selectedSection={selectedSection}
                  onCellClick={(section) => {
                    setSelectedSection(section)
                    setTab('table')
                  }}
                />
              </div>
            )}

            {/* Detail Table tab */}
            {tab === 'table' && (
              <div className="px-4 pb-4 flex-1 min-h-0" style={{ height: 'calc(100vh - 220px)' }}>
                <LTVFTable
                  rows={data.rows}
                  dark={dark}
                  thresholds={thresholds}
                  selectedSection={selectedSection}
                />
              </div>
            )}

            {/* Compare tab */}
            {tab === 'compare' && (
              <div className="flex-1 overflow-auto">
                {compareLoading && (
                  <div className="flex items-center justify-center h-48 gap-3 text-gray-400">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-sm">Loading compare file…</p>
                  </div>
                )}
                {!compareLoading && compareData ? (
                  <ComparePanel base={data} compare={compareData} dark={dark} thresholds={thresholds} />
                ) : !compareLoading && (
                  <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <GitCompare size={40} className={dark ? 'text-slate-600' : 'text-gray-300'} />
                    <p className={`text-sm ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
                      Click the <strong>⇄</strong> icon in the header to upload a second file for comparison
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Trend tab */}
            {tab === 'trend' && (
              <div className="px-4 pb-4 flex-1">
                <TrendChart systemTag={systemTag} dark={dark} thresholds={thresholds} />
              </div>
            )}

            {/* Analytics tab */}
            {tab === 'analytics' && (
              <div className="flex-1 flex flex-col min-h-0">
                <SACEmbed dark={dark} />
              </div>
            )}
          </div>
        )}

        {/* ── Toast notifications ────────────────────────────────────── */}
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    </div>
  )
}