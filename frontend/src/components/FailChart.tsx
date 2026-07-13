import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { LTVFRow } from '../types/ltvf'

interface Props { rows: LTVFRow[]; dark: boolean }

export default function FailChart({ rows, dark }: Props) {
  const failing = rows
    .filter(r => !r.is_group && r.rate_pct !== null && r.rate_pct < 95)
    .sort((a, b) => (a.rate_pct ?? 0) - (b.rate_pct ?? 0))
    .slice(0, 15)

  const data = failing.map(r => ({
    name: r.test_name.length > 28 ? r.test_name.slice(0, 26) + '…' : r.test_name,
    fullName: r.test_name,
    rate: r.rate_pct ?? 0,
  }))

  const color  = (rate: number) => rate >= 80 ? '#d97706' : '#dc2626'
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
        Lowest Performing Tests (rate &lt; 95%)
      </p>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 22)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={grid} />
          <XAxis
            type="number" domain={[0, 100]}
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 10, fill: tick }}
          />
          <YAxis
            type="category" dataKey="name" width={200}
            tick={{ fontSize: 9, fill: tick }}
          />
          <Tooltip
            contentStyle={{ background: ttBg, border: `1px solid ${ttBdr}`, color: ttText, fontSize: 12 }}
            formatter={(v: number) => [`${v.toFixed(1)}%`, 'Rate']}
            labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ''}
          />
          <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={16}>
            {data.map((entry, i) => (
              <Cell key={i} fill={color(entry.rate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
