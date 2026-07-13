import type { LTVFRow } from '../types/ltvf'

interface Props {
  rows: LTVFRow[]
}

function fmt(val: number | null): string {
  if (val === null || val === undefined) return ''
  return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function KPICards({ rows }: Props) {
  const leafRows = rows.filter(r => !r.is_group)
  const totalEqual = leafRows.reduce((s, r) => s + (r.equal ?? 0), 0)
  const totalDiff = leafRows.reduce((s, r) => s + (r.diff ?? 0), 0)
  const totalMissing = leafRows.reduce((s, r) => s + (r.missing ?? 0), 0)
  const totalUnexpected = leafRows.reduce((s, r) => s + (r.unexpected ?? 0), 0)

  const cards = [
    { label: 'Equal', value: fmt(totalEqual), color: 'bg-green-50 border-green-200' },
    { label: 'Differences', value: fmt(totalDiff), color: totalDiff > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200' },
    { label: 'Missing', value: fmt(totalMissing), color: totalMissing > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200' },
    { label: 'Unexpected', value: fmt(totalUnexpected), color: totalUnexpected > 0 ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200' },
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
