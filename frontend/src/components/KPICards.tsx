import type { LTVFRow } from '../types/ltvf'

interface Props {
  rows: LTVFRow[]
}

function fmt(val: number | null): string {
  if (val === null || val === undefined) return ''
  return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtPct(val: number | null): string {
  if (val === null || val === undefined) return ''
  return `${val > 0 ? '+' : ''}${val.toFixed(1)} %`
}

export default function KPICards({ rows }: Props) {
  const totals = rows.filter(r => r.level === 0 && !r.is_group === false)
  const totalNetMRP = rows.reduce((s, r) => s + (r.level === 0 ? (r.net_mrp ?? 0) : 0), 0)
  const totalGlobal = rows.reduce((s, r) => s + (r.level === 0 ? (r.global_amount ?? 0) : 0), 0)
  const totalDelta = rows.reduce((s, r) => s + (r.level === 0 ? (r.delta ?? 0) : 0), 0)
  const totalRows = rows.filter(r => !r.is_group).length

  const cards = [
    { label: 'Total Net MRP', value: fmt(totalNetMRP), color: 'bg-blue-50 border-blue-200' },
    { label: 'Global Amount', value: fmt(totalGlobal), color: 'bg-green-50 border-green-200' },
    { label: 'Delta', value: fmt(totalDelta), color: totalDelta < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200' },
    { label: 'Line Items', value: String(totalRows), color: 'bg-gray-50 border-gray-200' },
  ]

  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      {cards.map(c => (
        <div key={c.label} className={`rounded-lg border p-4 ${c.color}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{c.label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{c.value}</p>
        </div>
      ))}
    </div>
  )
}
