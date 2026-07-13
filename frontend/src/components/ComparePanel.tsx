import SummaryCards from './SummaryCards'
import RateDonut from './RateDonut'
import SectionChart from './SectionChart'
import VolumeChart from './VolumeChart'
import type { LTVFParseResult } from '../types/ltvf'

interface Props {
  base: LTVFParseResult
  compare: LTVFParseResult
  dark: boolean
  thresholds: { pass: number; warn: number }
}

function DeltaBadge({ base, compare, invert = false }: { base: number; compare: number; invert?: boolean }) {
  const delta = compare - base
  if (delta === 0) return <span className="text-[10px] text-slate-400 ml-1">—</span>
  const positive = invert ? delta < 0 : delta > 0
  return (
    <span className={`text-[10px] ml-1 font-bold ${positive ? 'text-green-400' : 'text-red-400'}`}>
      {delta > 0 ? '+' : ''}{delta.toFixed(1)}
    </span>
  )
}

export default function ComparePanel({ base, compare, dark, thresholds }: Props) {
  const bg = dark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'
  const txt = dark ? 'text-slate-200' : 'text-gray-700'
  const sub = dark ? 'text-slate-400' : 'text-gray-500'

  const metrics = [
    { label: 'Overall Rate',  base: base.summary.overall_rate,      cmp: compare.summary.overall_rate,      fmt: (v: number) => `${v.toFixed(1)}%`, higher: true },
    { label: 'Equal',         base: base.summary.total_equal,        cmp: compare.summary.total_equal,        fmt: (v: number) => v.toLocaleString(), higher: true },
    { label: 'Differences',   base: base.summary.total_diff,         cmp: compare.summary.total_diff,         fmt: (v: number) => v.toLocaleString(), higher: false },
    { label: 'Missing',       base: base.summary.total_missing,      cmp: compare.summary.total_missing,      fmt: (v: number) => v.toLocaleString(), higher: false },
    { label: 'Unexpected',    base: base.summary.total_unexpected,   cmp: compare.summary.total_unexpected,   fmt: (v: number) => v.toLocaleString(), higher: false },
    { label: 'Pass Count',    base: base.summary.pass_count,         cmp: compare.summary.pass_count,         fmt: (v: number) => String(v), higher: true },
    { label: 'Fail Count',    base: base.summary.fail_count,         cmp: compare.summary.fail_count,         fmt: (v: number) => String(v), higher: false },
  ]

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className={`rounded-xl border p-3 ${bg}`}>
          <p className={`text-[11px] uppercase font-medium ${sub}`}>Base File</p>
          <p className={`text-sm font-semibold truncate ${txt}`}>{base.filename}</p>
        </div>
        <div className={`rounded-xl border p-3 ${bg} flex items-center justify-center`}>
          <span className={`text-2xl font-bold ${dark ? 'text-slate-500' : 'text-gray-300'}`}>⇄</span>
        </div>
        <div className={`rounded-xl border p-3 ${bg}`}>
          <p className={`text-[11px] uppercase font-medium ${sub}`}>Compare File</p>
          <p className={`text-sm font-semibold truncate ${txt}`}>{compare.filename}</p>
        </div>
      </div>

      {/* Delta table */}
      <div className={`rounded-xl border overflow-hidden ${dark ? 'border-slate-700' : 'border-gray-200'}`}>
        <table className="w-full text-xs">
          <thead>
            <tr className={dark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}>
              <th className="px-3 py-2 text-left font-medium">Metric</th>
              <th className="px-3 py-2 text-right font-medium">Base</th>
              <th className="px-3 py-2 text-right font-medium">Compare</th>
              <th className="px-3 py-2 text-right font-medium">Delta</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => {
              const delta = m.cmp - m.base
              const improved = m.higher ? delta > 0 : delta < 0
              const regressed = m.higher ? delta < 0 : delta > 0
              return (
                <tr key={m.label} className={`border-t ${dark ? 'border-slate-700' : 'border-gray-100'} ${i % 2 === 0 ? (dark ? 'bg-slate-800' : 'bg-white') : (dark ? 'bg-slate-750' : 'bg-gray-50')}`}>
                  <td className={`px-3 py-2 ${txt}`}>{m.label}</td>
                  <td className={`px-3 py-2 text-right ${sub}`}>{m.fmt(m.base)}</td>
                  <td className={`px-3 py-2 text-right ${sub}`}>{m.fmt(m.cmp)}</td>
                  <td className={`px-3 py-2 text-right font-bold ${delta === 0 ? (dark ? 'text-slate-500' : 'text-gray-400') : improved ? 'text-green-500' : regressed ? 'text-red-500' : ''}`}>
                    {delta === 0 ? '—' : `${delta > 0 ? '+' : ''}${m.fmt(delta)}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Side by side charts */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className={`text-[11px] uppercase font-medium mb-2 ${sub}`}>Base</p>
          <RateDonut summary={base.summary} dark={dark} thresholds={thresholds} />
        </div>
        <div>
          <p className={`text-[11px] uppercase font-medium mb-2 ${sub}`}>Compare</p>
          <RateDonut summary={compare.summary} dark={dark} thresholds={thresholds} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <SummaryCards summary={base.summary} dark={dark} thresholds={thresholds} systemTag="" />
        </div>
        <div>
          <SummaryCards summary={compare.summary} dark={dark} thresholds={thresholds} systemTag="" />
        </div>
      </div>
    </div>
  )
}
