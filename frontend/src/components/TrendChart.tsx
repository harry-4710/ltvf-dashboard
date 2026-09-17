import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, AlertCircle } from 'lucide-react'
import { getResults } from '../api/resultsApi'
import type { ResultEntry } from '../types/ltvf'

interface Props {
  systemTag: string
  dark: boolean
  thresholds: { pass: number; warn: number }
}

export default function TrendChart({ systemTag, dark, thresholds }: Props) {
  const [history, setHistory] = useState<ResultEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!systemTag) { setHistory([]); return }
    setLoading(true)
    setError(null)
    getResults(systemTag)
      .then(data => setHistory(data))
      .catch(() => setError('Failed to load history. Check the backend connection.'))
      .finally(() => setLoading(false))
  }, [systemTag])

  const bg   = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  const lbl  = dark ? 'text-slate-400' : 'text-gray-500'
  const grid = dark ? '#334155' : '#e5e7eb'
  const text = dark ? '#94a3b8' : '#6b7280'
  const ttBg = dark ? '#1e293b' : '#fff'

  if (!systemTag) {
    return (
      <div className={`rounded-xl border shadow-sm p-8 flex flex-col items-center justify-center gap-3 ${bg}`}>
        <TrendingUp size={36} className={lbl} />
        <p className={`text-sm font-medium ${lbl}`}>Set a System Tag to view trend history</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`rounded-xl border shadow-sm p-8 flex items-center justify-center ${bg}`}>
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`rounded-xl border shadow-sm p-8 flex flex-col items-center gap-2 ${bg}`}>
        <AlertCircle size={28} className="text-red-400" />
        <p className={`text-sm ${lbl}`}>{error}</p>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className={`rounded-xl border shadow-sm p-8 flex flex-col items-center gap-3 ${bg}`}>
        <TrendingUp size={36} className={lbl} />
        <p className={`text-sm font-medium ${lbl}`}>No history found for "{systemTag}"</p>
        <p className={`text-xs ${lbl}`}>Upload or fetch data with this system tag to build trend history.</p>
      </div>
    )
  }

  const chartData = [...history].reverse().map(r => ({
    date: new Date(r.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    rate: r.overall_rate,
  }))

  const latestRate = chartData[chartData.length - 1]?.rate ?? 0
  const rateColor  = latestRate >= thresholds.pass ? '#16a34a'
                   : latestRate >= thresholds.warn  ? '#d97706' : '#dc2626'


  return (
    <div className={`rounded-xl border shadow-sm p-4 ${bg}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className={`text-xs uppercase tracking-wider font-medium ${lbl}`}>Match Rate Trend — {systemTag}</p>
          <p className={`text-[11px] mt-0.5 ${lbl}`}>{history.length} run{history.length !== 1 ? 's' : ''} stored</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: rateColor }}>{latestRate.toFixed(1)}%</p>
          <p className={`text-[10px] ${lbl}`}>latest run</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: text }} tickLine={false} />
          <YAxis domain={[Math.max(0, Math.min(...chartData.map(d => d.rate)) - 5), 100]}
            tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: text }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: ttBg, border: `1px solid ${grid}`, fontSize: 12, borderRadius: 8 }}
            formatter={(v: number) => [`${v.toFixed(1)}%`, 'Match Rate']} />
          <Legend wrapperStyle={{ fontSize: 11, color: text, paddingTop: 8 }} formatter={() => 'Match Rate'} />
          <ReferenceLine y={thresholds.pass} stroke="#16a34a" strokeDasharray="5 4" strokeWidth={1.5}
            label={{ value: `Pass ≥${thresholds.pass}%`, fill: '#16a34a', fontSize: 10, position: 'insideTopRight' }} />
          <ReferenceLine y={thresholds.warn} stroke="#d97706" strokeDasharray="5 4" strokeWidth={1.5}
            label={{ value: `Warn ≥${thresholds.warn}%`, fill: '#d97706', fontSize: 10, position: 'insideTopRight' }} />
          <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2.5}
            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#2563eb' }} />
        </LineChart>
      </ResponsiveContainer>
      <div className={`mt-3 rounded-lg overflow-hidden border ${dark ? 'border-slate-700' : 'border-gray-200'}`}>
        <table className="w-full text-xs">
          <thead>
            <tr className={dark ? 'bg-slate-700 text-slate-300' : 'bg-gray-50 text-gray-600'}>
              <th className="px-3 py-2 text-left font-medium">Date</th>
              <th className="px-3 py-2 text-left font-medium">Filename</th>
              <th className="px-3 py-2 text-right font-medium">Rate</th>
              <th className="px-3 py-2 text-right font-medium">✅ Pass</th>
              <th className="px-3 py-2 text-right font-medium">⚠️ Warn</th>
              <th className="px-3 py-2 text-right font-medium">❌ Fail</th>
            </tr>
          </thead>
          <tbody>
            {history.slice(0, 10).map((r, i) => {
              const rc = r.overall_rate >= thresholds.pass ? 'text-green-500'
                : r.overall_rate >= thresholds.warn ? 'text-amber-500' : 'text-red-500'
              return (
                <tr key={r.id} className={`border-t ${dark ? 'border-slate-700' : 'border-gray-100'}
                  ${i % 2 === 0 ? (dark ? 'bg-slate-800' : 'bg-white') : (dark ? 'bg-slate-900/40' : 'bg-gray-50')}`}>
                  <td className={`px-3 py-1.5 ${dark ? 'text-slate-300' : 'text-gray-700'}`}>{new Date(r.uploaded_at).toLocaleString()}</td>
                  <td className={`px-3 py-1.5 truncate max-w-[180px] ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{r.filename}</td>
                  <td className={`px-3 py-1.5 text-right font-bold ${rc}`}>{r.overall_rate.toFixed(1)}%</td>
                  <td className="px-3 py-1.5 text-right text-green-500">{r.pass_count}</td>
                  <td className="px-3 py-1.5 text-right text-amber-500">{r.warn_count}</td>
                  <td className="px-3 py-1.5 text-right text-red-500">{r.fail_count}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
