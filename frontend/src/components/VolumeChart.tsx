import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { LTVFSummary } from '../types/ltvf'

interface Props { summary: LTVFSummary; dark: boolean }

export default function VolumeChart({ summary, dark }: Props) {
  const data = [{
    name: 'Record Breakdown',
    Equal:       summary.total_equal,
    Differences: summary.total_diff,
    Missing:     summary.total_missing,
    Unexpected:  summary.total_unexpected,
  }]

  const fmt = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000   ? `${(v / 1_000).toFixed(0)}K`
    : String(v)

  const bg     = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  const label  = dark ? 'text-slate-400' : 'text-gray-500'
  const grid   = dark ? '#334155' : '#e5e7eb'
  const tick   = dark ? '#94a3b8' : '#6b7280'
  const ttBg   = dark ? '#1e293b' : '#fff'
  const ttBdr  = dark ? '#334155' : '#e5e7eb'
  const ttText = dark ? '#e2e8f0' : '#111'

  return (
    <div className={`rounded-xl border shadow-sm p-4 ${bg}`}>
      <p className={`text-xs uppercase tracking-wider font-medium mb-3 ${label}`}>
        Record Volume Breakdown
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
          <XAxis dataKey="name" tick={false} axisLine={false} />
          <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: tick }} />
          <Tooltip
            contentStyle={{ background: ttBg, border: `1px solid ${ttBdr}`, color: ttText, fontSize: 12 }}
            formatter={(v: number) => [v.toLocaleString(), '']}
          />
          <Legend
            iconType="circle" iconSize={8}
            wrapperStyle={{ fontSize: 11, color: dark ? '#94a3b8' : '#6b7280' }}
          />
          <Bar dataKey="Equal"       fill="#16a34a" radius={[4,4,0,0]} maxBarSize={60} />
          <Bar dataKey="Differences" fill="#d97706" radius={[4,4,0,0]} maxBarSize={60} />
          <Bar dataKey="Missing"     fill="#dc2626" radius={[4,4,0,0]} maxBarSize={60} />
          <Bar dataKey="Unexpected"  fill="#7c3aed" radius={[4,4,0,0]} maxBarSize={60} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
