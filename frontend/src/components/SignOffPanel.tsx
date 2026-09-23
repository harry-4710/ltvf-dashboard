import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { LTVFSummary } from '../types/ltvf'

interface Props {
  summary: LTVFSummary
  dark: boolean
}

export default function SignOffPanel({ summary, dark }: Props) {
  const { total_approved, total_rejected, total_recheck } = summary
  const total = total_approved + total_rejected + total_recheck
  if (total === 0) return null

  const data = [
    { name: 'Approved', value: total_approved, color: '#16a34a' },
    { name: 'Rejected', value: total_rejected, color: '#dc2626' },
    { name: 'Re-check', value: total_recheck, color: '#d97706' },
  ].filter(d => d.value > 0)

  const pct = (n: number) => total > 0 ? ((n / total) * 100).toFixed(1) + '%' : '0%'

  const bg    = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  const label = dark ? 'text-slate-400' : 'text-gray-500'
  const sub   = dark ? 'text-slate-500' : 'text-gray-400'
  const text  = dark ? 'text-slate-200' : 'text-gray-800'

  return (
    <div className={`rounded-xl border shadow-sm p-4 ${bg}`}>
      <p className={`text-xs uppercase tracking-wider font-medium mb-1 ${label}`}>Sign-Off Status</p>
      <p className={`text-[10px] mb-3 ${sub}`}>{total} test cases signed</p>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={38} outerRadius={60} paddingAngle={3}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: dark ? '#1e293b' : '#fff', border: '1px solid ' + (dark ? '#334155' : '#e5e7eb'), fontSize: 12 }}
              formatter={(v: number, name: string) => [`${v} (${pct(v)})`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-2 flex-1">
          {[
            { label: 'Approved', value: total_approved, color: 'text-green-500', dot: 'bg-green-500' },
            { label: 'Rejected', value: total_rejected, color: 'text-red-500',   dot: 'bg-red-500' },
            { label: 'Re-check', value: total_recheck,  color: 'text-amber-500', dot: 'bg-amber-500' },
          ].map(({ label: lbl, value, color, dot }) => (
            <div key={lbl} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
                <span className={`text-xs ${label}`}>{lbl}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${color}`}>{value.toLocaleString()}</span>
                <span className={`text-[10px] ${sub}`}>{pct(value)}</span>
              </div>
            </div>
          ))}
          <div className={`mt-1 pt-1 border-t ${dark ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="flex justify-between">
              <span className={`text-xs ${sub}`}>Total signed</span>
              <span className={`text-xs font-medium ${text}`}>{total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
