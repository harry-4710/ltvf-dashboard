import type { LTVFRow } from '../types/ltvf'

interface Props {
  rows: LTVFRow[]
  dark: boolean
  passThreshold?: number
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('en-US')
}

export default function StreamStats({ rows, dark, passThreshold = 85 }: Props) {
  // Build per-stream stats from group rows + their children
  const streamGroups = rows.filter(r => r.is_group && r.level === 0)
  if (streamGroups.length === 0) return null

  const stats = streamGroups.map(g => {
    const children = rows.filter(r => r.parent_id === g.id && !r.is_group)
    const totalTests = children.length
    const passTests  = children.filter(r => r.rate_pct !== null && r.rate_pct >= passThreshold).length
    const failTests  = totalTests - passTests
    const approved   = children.filter(r => r.so_status === 'Approved').length
    const rejected   = children.filter(r => r.so_status === 'Rejected').length
    const recheck    = children.filter(r => r.so_status === 'Re-check').length
    const hasSO      = (approved + rejected + recheck) > 0
    const totalVol   = children.reduce((s, r) => s + (r.tot ?? 0), 0)
    const rate       = g.rate_pct ?? 0
    return { name: g.test_name, rate, totalTests, passTests, failTests, approved, rejected, recheck, hasSO, totalVol }
  })

  const bg    = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  const label = dark ? 'text-slate-400' : 'text-gray-500'
  const sub   = dark ? 'text-slate-500' : 'text-gray-400'
  const th    = dark ? 'bg-slate-700/50 text-slate-400' : 'bg-gray-50 text-gray-500'
  const tr    = dark ? 'border-slate-700' : 'border-gray-100'
  const td    = dark ? 'text-slate-300' : 'text-gray-700'

  const rateColor = (r: number) =>
    r >= passThreshold ? 'text-green-500' : r >= 70 ? 'text-amber-500' : 'text-red-500'

  const hasSO = stats.some(s => s.hasSO)

  return (
    <div className={`rounded-xl border shadow-sm p-4 ${bg}`}>
      <p className={`text-xs uppercase tracking-wider font-medium mb-1 ${label}`}>Stream Breakdown</p>
      <p className={`text-[10px] mb-3 ${sub}`}>Pass threshold ≥{passThreshold}%</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className={`${th} text-[10px] uppercase tracking-wider`}>
              <th className="text-left p-2 rounded-l">Stream</th>
              <th className="p-2 text-right">Rate</th>
              <th className="p-2 text-right">Tests</th>
              <th className="p-2 text-right text-green-600">Pass</th>
              <th className="p-2 text-right text-red-600">Fail</th>
              {hasSO && <th className="p-2 text-right text-green-600">Appvd</th>}
              {hasSO && <th className="p-2 text-right text-red-600">Rjct</th>}
              {hasSO && <th className="p-2 text-right text-amber-600">Rchk</th>}
              <th className="p-2 text-right rounded-r">Vol.</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr key={i} className={`border-t ${tr}`}>
                <td className={`p-2 font-medium ${td} max-w-[160px] truncate`} title={s.name}>{s.name}</td>
                <td className={`p-2 text-right font-semibold ${rateColor(s.rate)}`}>{s.rate.toFixed(1)}%</td>
                <td className={`p-2 text-right ${td}`}>{s.totalTests}</td>
                <td className="p-2 text-right text-green-500 font-medium">{s.passTests}</td>
                <td className={`p-2 text-right font-medium ${s.failTests > 0 ? 'text-red-500' : td}`}>{s.failTests}</td>
                {hasSO && <td className="p-2 text-right text-green-500">{s.approved}</td>}
                {hasSO && <td className={`p-2 text-right ${s.rejected > 0 ? 'text-red-500' : sub}`}>{s.rejected}</td>}
                {hasSO && <td className={`p-2 text-right ${s.recheck > 0 ? 'text-amber-500' : sub}`}>{s.recheck}</td>}
                <td className={`p-2 text-right ${sub}`}>{fmt(s.totalVol)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
