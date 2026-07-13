import { useMemo } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, ValueFormatterParams, CellClassParams } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import type { LTVFRow } from '../types/ltvf'

interface Props { rows: LTVFRow[]; dark: boolean }

function numFmt(p: ValueFormatterParams) {
  if (p.value === null || p.value === undefined) return ''
  return Number(p.value).toLocaleString('en-US')
}

function rateFmt(p: ValueFormatterParams) {
  if (p.value === null || p.value === undefined) return ''
  return `${Number(p.value).toFixed(1)} %`
}

function rateStyle(p: CellClassParams) {
  const v = p.value as number | null
  if (v === null || v === undefined) return {}
  if (v >= 95) return { color: '#16a34a', fontWeight: 700 }
  if (v >= 80) return { color: '#d97706', fontWeight: 700 }
  return { color: '#ef4444', fontWeight: 700 }
}

export default function LTVFTable({ rows, dark }: Props) {
  const rowData = useMemo(() => rows.map(r => ({
    ...r,
    displayName: '\u00A0'.repeat(r.level * 3) + (r.is_group ? '▸ ' : '') + r.test_name,
  })), [rows])

  const cols: ColDef[] = useMemo(() => [
    {
      headerName: 'Test Name',
      field: 'displayName',
      flex: 3, minWidth: 300, pinned: 'left',
      cellStyle: p => ({
        fontWeight: p.data?.is_group ? 700 : 400,
        fontSize: 12,
      }),
    },
    {
      headerName: 'Rate %',
      field: 'rate_pct', width: 90,
      type: 'numericColumn',
      valueFormatter: rateFmt,
      cellStyle: rateStyle,
    },
    { headerName: 'Equal',      field: 'equal',      width: 95,  type: 'numericColumn', valueFormatter: numFmt },
    { headerName: 'Diff',       field: 'diff',       width: 85,  type: 'numericColumn', valueFormatter: numFmt,
      cellStyle: (p: CellClassParams) => p.value > 0 ? { color: '#d97706', fontWeight: 600 } : {} },
    { headerName: 'Missing',    field: 'missing',    width: 95,  type: 'numericColumn', valueFormatter: numFmt,
      cellStyle: (p: CellClassParams) => p.value > 0 ? { color: '#ef4444', fontWeight: 600 } : {} },
    { headerName: 'Unexpected', field: 'unexpected', width: 105, type: 'numericColumn', valueFormatter: numFmt,
      cellStyle: (p: CellClassParams) => p.value > 0 ? { color: '#a855f7', fontWeight: 600 } : {} },
    { headerName: 'Source',     field: 'source',     width: 100, type: 'numericColumn', valueFormatter: numFmt },
    { headerName: 'Target',     field: 'target',     width: 100, type: 'numericColumn', valueFormatter: numFmt },
    { headerName: 'OOS Src',    field: 'oos_src',    width: 90,  type: 'numericColumn', valueFormatter: numFmt },
    { headerName: 'OOS Trg',    field: 'oos_trg',    width: 90,  type: 'numericColumn', valueFormatter: numFmt },
  ], [])

  return (
    <div className={dark ? 'ag-theme-alpine' : 'ag-theme-alpine'} style={{ height: '100%', width: '100%' }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={cols}
        defaultColDef={{ resizable: true, sortable: true }}
        rowHeight={26}
        headerHeight={34}
        animateRows
      />
    </div>
  )
}
