import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { LTVFSummary } from '../types/ltvf'

interface Props {
  summary: LTVFSummary
  dark: boolean
  thresholds: { pass: number; warn: number }
}

export default function RateDonut({ summary, dark, thresholds }: Props) {
  const data = [
    { name: `Pass (≥${thresholds.pass}%)`,                              value: summary.pass_count,  color: '#16a34a' },
    { name: `Warn (${thresholds.warn}–${thresholds.pass - 1}%)`,        value: summary.warn_count,  color: '#d97706' },
    { name: `Fail (<${thresholds.warn}%)`,                              value: summary.fail_count,  color: '#dc2626' },
  ]

  const rateColor =
    summary.overall_rate >= thresholds.pass ? '#16a34a' :
    summary.overall_rate >= thresholds.warn ? '#d97706' : '#dc2626'

  const bg = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  const label = dark ? 'text-slate-400' : 'text-gray-500'
  const centreLabel = dark ? 'text-slate-400' : 'text-gray-400'

  return (
    <div className={`rounded-xl border shadow-sm p-4 flex flex-col items-center ${bg}`}>
      <p className={`text-xs uppercase tracking-wider font-medium mb-2 ${label}`}>Test Case Status</p>
      <div className="relative w-full" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={80} paddingAngle={3} dataKey="value">
              {data.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: dark ? '#1e293b' : '#fff', border: `1px solid ${dark ? '#334155' : '#e5e7eb'}`, color: dark ? '#e2e8f0' : '#111', fontSize: 12 }}
              formatter={(v: number) => [`${v} tests`, '']}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: dark ? '#94a3b8' : '#6b7280' }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold" style={{ color: rateColor }}>{summary.overall_rate.toFixed(1)}%</span>
          <span className={`text-[10px] ${centreLabel}`}>Overall</span>
        </div>
      </div>
    </div>
  )
}
