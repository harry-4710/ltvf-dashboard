import { useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, ValueFormatterParams, CellClassParams, GridApi } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import type { LTVFRow } from '../types/ltvf'
import { Search, Download, Columns } from 'lucide-react'

interface Props {
  rows: LTVFRow[]
  dark: boolean
  thresholds: { pass: number; warn: number }
  selectedSection: string | null
}

function numFmt(p: ValueFormatterParams) {
  if (p.value === null || p.value === undefined) return ''
  return Number(p.value).toLocaleString('en-US')
}

function rateFmt(p: ValueFormatterParams) {
  if (p.value === null || p.value === undefined) return ''
  return `${Number(p.value).toFixed(1)} %`
}

const ALL_COLS = [
  'equal', 'diff', 'missing', 'unexpected',
  'source', 'target', 'oos_src', 'oos_trg',
  'local', 'source1', 'source2',
]

const COL_LABELS: Record<string, string> = {
  equal: 'Equal', diff: 'Diff', missing: 'Missing', unexpected: 'Unexpected',
  source: 'Source', target: 'Target', oos_src: 'OOS Src', oos_trg: 'OOS Trg',
  local: 'Local', source1: 'Source1', source2: 'Source2',
}

export default function LTVFTable({ rows, dark, thresholds, selectedSection }: Props) {
  const [quickFilter, setQuickFilter] = useState('')
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(['equal', 'diff', 'missing', 'unexpected', 'source', 'target', 'oos_src', 'oos_trg'])
  )
  const [colMenuOpen, setColMenuOpen] = useState(false)
  const gridRef = useRef<GridApi | null>(null)

  const filtered = selectedSection
    ? rows.filter(r => r.full_path.startsWith(selectedSection) || r.full_path === selectedSection)
    : rows

  const rowData = useMemo(() => filtered.map(r => ({
    ...r,
    displayName: '\u00A0'.repeat(r.level * 3) + (r.is_group ? '▸ ' : '') + r.test_name,
  })), [filtered])

  const rateStyle = (p: CellClassParams, pass: number, warn: number) => {
    const v = p.value as number | null
    if (v === null || v === undefined) return null
    if (v >= pass) return { color: '#16a34a', fontWeight: 700 }
    if (v >= warn) return { color: '#d97706', fontWeight: 700 }
    return { color: '#ef4444', fontWeight: 700 }
  }

  const cols: ColDef[] = useMemo(() => [
    {
      headerName: 'Test Name',
      field: 'displayName',
      flex: 3, minWidth: 300, pinned: 'left' as const,
      cellStyle: p => ({ fontWeight: p.data?.is_group ? 700 : 400, fontSize: 12 }),
    },
    {
      headerName: 'Rate %',
      field: 'rate_pct', width: 90,
      type: 'numericColumn',
      valueFormatter: rateFmt,
      cellStyle: (p: CellClassParams) => rateStyle(p, thresholds.pass, thresholds.warn),
    },
    ...ALL_COLS
      .filter(c => visibleCols.has(c))
      .map(c => ({
        headerName: COL_LABELS[c],
        field: c,
        width: c === 'unexpected' ? 110 : 90,
        type: 'numericColumn' as const,
        valueFormatter: numFmt,
        cellStyle: (p: CellClassParams) => {
          if ((c === 'diff' || c === 'missing' || c === 'unexpected') && p.value > 0)
            return { color: c === 'diff' ? '#d97706' : c === 'missing' ? '#ef4444' : '#a855f7', fontWeight: 600 }
          return null
        },
      })),
  ], [visibleCols, thresholds])

  const toggleCol = (col: string) => {
    setVisibleCols(prev => {
      const next = new Set(prev)
      next.has(col) ? next.delete(col) : next.add(col)
      return next
    })
  }

  const exportCsv = () => gridRef.current?.exportDataAsCsv({ fileName: 'ltvf_export.csv' })

  const inputCls = `text-xs px-2 py-1.5 rounded-lg border outline-none transition w-52 ${
    dark
      ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400 focus:border-blue-400'
  }`

  const btnCls = `flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${
    dark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
  }`

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={12} className={`absolute left-2 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-gray-400'}`} />
          <input
            className={`${inputCls} pl-6`}
            placeholder="Search test names…"
            value={quickFilter}
            onChange={e => setQuickFilter(e.target.value)}
          />
        </div>

        {/* Column visibility */}
        <div className="relative">
          <button className={btnCls} onClick={() => setColMenuOpen(o => !o)}>
            <Columns size={13} /> Columns
          </button>
          {colMenuOpen && (
            <div className={`absolute top-8 left-0 z-50 rounded-xl border shadow-xl p-3 w-48 ${
              dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'
            }`}>
              <p className={`text-[11px] font-semibold mb-2 ${dark ? 'text-slate-300' : 'text-gray-600'}`}>
                Toggle Columns
              </p>
              {ALL_COLS.map(c => (
                <label key={c} className={`flex items-center gap-2 text-xs py-0.5 cursor-pointer ${
                  dark ? 'text-slate-300' : 'text-gray-600'
                }`}>
                  <input
                    type="checkbox"
                    checked={visibleCols.has(c)}
                    onChange={() => toggleCol(c)}
                    className="accent-blue-500"
                  />
                  {COL_LABELS[c]}
                </label>
              ))}
            </div>
          )}
        </div>

        <button className={btnCls} onClick={exportCsv}>
          <Download size={13} /> Export CSV
        </button>

        {selectedSection && (
          <span className={`text-xs px-2 py-1 rounded-full ${dark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
            Filtered: {selectedSection}
          </span>
        )}

        <span className={`text-xs ml-auto ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
          {rowData.length} rows
        </span>
      </div>

      {/* Grid */}
      <div
        className={dark ? 'ag-theme-alpine flex-1' : 'ag-theme-alpine flex-1'}
        style={{ minHeight: 400 }}
      >
        <AgGridReact
          ref={r => { if (r) gridRef.current = r.api }}
          rowData={rowData}
          columnDefs={cols}
          defaultColDef={{ resizable: true, sortable: true }}
          rowHeight={26}
          headerHeight={34}
          animateRows
          quickFilterText={quickFilter}
          onGridReady={p => { gridRef.current = p.api }}
        />
      </div>
    </div>
  )
}
