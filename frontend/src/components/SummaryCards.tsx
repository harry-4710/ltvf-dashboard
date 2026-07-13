import type { LTVFSummary } from '../types/ltvf'

interface Props { summary: LTVFSummary; dark: boolean }

function fmt(n: number) { return n.toLocaleString('en-US') }

export default function SummaryCards({ summary, dark }: Props) {
  const d = dark

  const cards = [
    {
      label: 'Overall Match Rate',
      value: `${summary.overall_rate.toFixed(1)}%`,
      sub: 'Source vs Target',
      border: summary.overall_rate >= 95 ? 'border-green-500' : summary.overall_rate >= 80 ? 'border-amber-500' : 'border-red-500',
      bg: d
        ? summary.overall_rate >= 95 ? 'bg-green-950' : summary.overall_rate >= 80 ? 'bg-amber-950' : 'bg-red-950'
        : summary.overall_rate >= 95 ? 'bg-green-50'  : summary.overall_rate >= 80 ? 'bg-amber-50'  : 'bg-red-50',
      text: summary.overall_rate >= 95 ? 'text-green-500' : summary.overall_rate >= 80 ? 'text-amber-500' : 'text-red-500',
    },
    { label: 'Equal Records',      value: fmt(summary.total_equal),      sub: 'Matching records',        border: 'border-blue-500',   bg: d ? 'bg-blue-950'   : 'bg-blue-50',   text: 'text-blue-500' },
    { label: 'Differences',        value: fmt(summary.total_diff),       sub: 'Value mismatches',        border: 'border-orange-500', bg: d ? 'bg-orange-950' : 'bg-orange-50', text: 'text-orange-500' },
    { label: 'Missing Records',    value: fmt(summary.total_missing),    sub: 'Not in target',           border: 'border-red-500',    bg: d ? 'bg-red-950'    : 'bg-red-50',    text: 'text-red-500' },
    { label: 'Unexpected Records', value: fmt(summary.total_unexpected), sub: 'Not in source',           border: 'border-purple-500', bg: d ? 'bg-purple-950' : 'bg-purple-50', text: 'text-purple-500' },
    { label: 'Source Volume',      value: fmt(summary.total_source),     sub: 'Total (source)',          border: 'border-slate-400',  bg: d ? 'bg-slate-800'  : 'bg-gray-50',   text: d ? 'text-slate-300' : 'text-gray-700' },
    { label: 'Target Volume',      value: fmt(summary.total_target),     sub: 'Total (target)',          border: 'border-slate-400',  bg: d ? 'bg-slate-800'  : 'bg-gray-50',   text: d ? 'text-slate-300' : 'text-gray-700' },
    { label: 'Test Cases',         value: String(summary.total_rows),    sub: `✅ ${summary.pass_count}  ⚠️ ${summary.warn_count}  ❌ ${summary.fail_count}`, border: 'border-indigo-500', bg: d ? 'bg-indigo-950' : 'bg-indigo-50', text: 'text-indigo-500' },
  ]

  return (
    <div className="grid grid-cols-4 gap-3 px-4 py-3">
      {cards.map(c => (
        <div key={c.label} className={`rounded-xl border-l-4 p-3 shadow-sm ${c.border} ${c.bg}`}>
          <p className={`text-[11px] uppercase tracking-wider font-medium ${d ? 'text-slate-400' : 'text-gray-500'}`}>
            {c.label}
          </p>
          <p className={`text-2xl font-bold mt-0.5 ${c.text}`}>{c.value}</p>
          <p className={`text-[11px] mt-0.5 ${d ? 'text-slate-500' : 'text-gray-400'}`}>{c.sub}</p>
        </div>
      ))}
    </div>
  )
}
