import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { LTVFRow } from '../types/ltvf'

interface Props {
  rows: LTVFRow[]
  dark: boolean
  thresholds: { pass: number; warn: number }
  selectedSection: string | null
  onSectionClick: (section: string) => void
}

export default function SectionChart({ rows, dark, thresholds, selectedSection, onSectionClick }: Props) {
  const groups = rows.filter(r => r.is_group && r.level <= 1 && r.rate_pct !== null)

  const data = groups.map(r => ({
    name: r.test_name.length > 22 ? r.test_name.slice(0, 20) + '…' : r.test_name,
    fullName: r.test_name,
    section: r.full_path.split(' > ')[0],
    rate: r.rate_pct ?? 0,
  }))

  const barColor = (rate: number) =>
    rate >= thresholds.pass ? '#16a34a' : rate >= thresholds.warn ? '#d97706' : '#dc2626'

  const bg     = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  const label  = dark ? 'text-slate-400' : 'text-gray-500'
  const grid   = dark ? '#334155' : '#e5e7eb'
  const tick   = dark ? '#94a3b8' : '#6b7280'
  const ttBg   = dark ? '#1e293b' : '#fff'
  const ttBdr  = dark ? '#334155' : '#e5e7eb'
  const ttText = dark ? '#e2e8f0' : '#111'

  return (
    <div className={`rounded-xl border shadow-sm p-4 ${bg}`}>
      <p className={`text-xs uppercase tracking-wider font-medium mb-1 ${label}`}>
        Match Rate by Section
      </p>
      <p className={`text-[10px] mb-3 ${dark ? 'text-slate-500' : 'text-gray-400'}`}>
        Click a bar to filter all charts
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={grid} />
          <XAxis
            type="number" domain={[0, 100]}
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 10, fill: tick }}
          />
          <YAxis
            type="category" dataKey="name" width={130}
            tick={{ fontSize: 10, fill: tick }}
          />
          <Tooltip
            contentStyle={{ background: ttBg, border: `1px solid ${ttBdr}`, color: ttText, fontSize: 12 }}
            formatter={(v: number) => [`${v.toFixed(1)}%`, 'Rate']}
            labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ''}
          />
          <Bar
            dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={20}
            cursor="pointer"
            onClick={(d) => onSectionClick(d.section)}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={barColor(entry.rate)}
                opacity={selectedSection && selectedSection !== entry.section ? 0.35 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
