import { useCountUp } from '../hooks/useCountUp'
import type { LTVFSummary } from '../types/ltvf'

interface Props {
  summary: LTVFSummary
  dark: boolean
  thresholds: { pass: number; warn: number }
  systemTag: string
}

function AnimatedRate({ value, dark, thresholds }: { value: number; dark: boolean; thresholds: { pass: number; warn: number } }) {
  const animated = useCountUp(Math.round(value * 10), 900)
  const display = (animated / 10).toFixed(1) + '%'
  const color = value >= thresholds.pass ? 'text-green-500' : value >= thresholds.warn ? 'text-amber-500' : 'text-red-500'
  const barColor = value >= thresholds.pass ? 'bg-green-500' : value >= thresholds.warn ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div>
      <p className={`text-2xl font-bold mt-0.5 ${color}`}>{display}</p>
      <div className={`h-1 rounded-full mt-1.5 ${dark ? 'bg-slate-700' : 'bg-gray-200'}`}>
        <div className={`h-1 rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  )
}

function AnimatedInt({ value, color }: { value: number; color: string }) {
  const animated = useCountUp(value, 900)
  return <p className={`text-2xl font-bold mt-0.5 ${color}`}>{animated.toLocaleString('en-US')}</p>
}

export default function SummaryCards({ summary, dark, thresholds, systemTag }: Props) {
  const d = dark
  const pass = thresholds.pass
  const warn = thresholds.warn

  const rateColor  = summary.overall_rate >= pass ? 'border-green-500' : summary.overall_rate >= warn ? 'border-amber-500' : 'border-red-500'
  const rateBg     = d ? summary.overall_rate >= pass ? 'bg-green-950' : summary.overall_rate >= warn ? 'bg-amber-950' : 'bg-red-950'
                       : summary.overall_rate >= pass ? 'bg-green-50'  : summary.overall_rate >= warn ? 'bg-amber-50'  : 'bg-red-50'

  const sub = d ? 'text-slate-500' : 'text-gray-400'
  const lbl = d ? 'text-slate-400' : 'text-gray-500'

  return (
    <div className="px-4 py-3">
      {systemTag && (
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${d ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
            SAP System: {systemTag}
          </span>
          <span className={`text-[11px] ${sub}`}>{summary.total_rows} test cases</span>
        </div>
      )}
      <div className="grid grid-cols-4 gap-3">

        {/* Overall Rate */}
        <div className={`rounded-xl border-l-4 p-3 shadow-sm ${rateColor} ${rateBg}`}>
          <p className={`text-[11px] uppercase tracking-wider font-medium ${lbl}`}>Overall Match Rate</p>
          <AnimatedRate value={summary.overall_rate} dark={dark} thresholds={thresholds} />
          <p className={`text-[11px] mt-1 ${sub}`}>Source vs Target</p>
        </div>

        {/* Equal */}
        <div className={`rounded-xl border-l-4 p-3 shadow-sm border-blue-500 ${d ? 'bg-blue-950' : 'bg-blue-50'}`}>
          <p className={`text-[11px] uppercase tracking-wider font-medium ${lbl}`}>Equal Records</p>
          <AnimatedInt value={summary.total_equal} color="text-blue-500" />
          <div className={`h-1 rounded-full mt-1.5 ${d ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div className="h-1 rounded-full bg-blue-500 transition-all duration-700"
              style={{ width: `${summary.total_source > 0 ? Math.min(summary.total_equal / summary.total_source * 100, 100) : 0}%` }} />
          </div>
          <p className={`text-[11px] mt-1 ${sub}`}>Matching records</p>
        </div>

        {/* Differences */}
        <div className={`rounded-xl border-l-4 p-3 shadow-sm border-orange-500 ${d ? 'bg-orange-950' : 'bg-orange-50'}`}>
          <p className={`text-[11px] uppercase tracking-wider font-medium ${lbl}`}>Differences</p>
          <AnimatedInt value={summary.total_diff} color="text-orange-500" />
          <div className={`h-1 rounded-full mt-1.5 ${d ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div className="h-1 rounded-full bg-orange-500 transition-all duration-700"
              style={{ width: `${summary.total_source > 0 ? Math.min(summary.total_diff / summary.total_source * 100, 100) : 0}%` }} />
          </div>
          <p className={`text-[11px] mt-1 ${sub}`}>Value mismatches</p>
        </div>

        {/* Missing */}
        <div className={`rounded-xl border-l-4 p-3 shadow-sm border-red-500 ${d ? 'bg-red-950' : 'bg-red-50'}`}>
          <p className={`text-[11px] uppercase tracking-wider font-medium ${lbl}`}>Missing Records</p>
          <AnimatedInt value={summary.total_missing} color="text-red-500" />
          <div className={`h-1 rounded-full mt-1.5 ${d ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div className="h-1 rounded-full bg-red-500 transition-all duration-700"
              style={{ width: `${summary.total_source > 0 ? Math.min(summary.total_missing / summary.total_source * 100, 100) : 0}%` }} />
          </div>
          <p className={`text-[11px] mt-1 ${sub}`}>Not in target</p>
        </div>

        {/* Unexpected */}
        <div className={`rounded-xl border-l-4 p-3 shadow-sm border-purple-500 ${d ? 'bg-purple-950' : 'bg-purple-50'}`}>
          <p className={`text-[11px] uppercase tracking-wider font-medium ${lbl}`}>Unexpected Records</p>
          <AnimatedInt value={summary.total_unexpected} color="text-purple-500" />
          <div className={`h-1 rounded-full mt-1.5 ${d ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div className="h-1 rounded-full bg-purple-500 transition-all duration-700"
              style={{ width: `${summary.total_target > 0 ? Math.min(summary.total_unexpected / summary.total_target * 100, 100) : 0}%` }} />
          </div>
          <p className={`text-[11px] mt-1 ${sub}`}>Not in source</p>
        </div>

        {/* Source Volume */}
        <div className={`rounded-xl border-l-4 p-3 shadow-sm border-slate-400 ${d ? 'bg-slate-800' : 'bg-gray-50'}`}>
          <p className={`text-[11px] uppercase tracking-wider font-medium ${lbl}`}>Source Volume</p>
          <AnimatedInt value={summary.total_source} color={d ? 'text-slate-300' : 'text-gray-700'} />
          <p className={`text-[11px] mt-1 ${sub}`}>Total records (source)</p>
        </div>

        {/* Target Volume */}
        <div className={`rounded-xl border-l-4 p-3 shadow-sm border-slate-400 ${d ? 'bg-slate-800' : 'bg-gray-50'}`}>
          <p className={`text-[11px] uppercase tracking-wider font-medium ${lbl}`}>Target Volume</p>
          <AnimatedInt value={summary.total_target} color={d ? 'text-slate-300' : 'text-gray-700'} />
          <p className={`text-[11px] mt-1 ${sub}`}>Total records (target)</p>
        </div>

        {/* Test Cases */}
        <div className={`rounded-xl border-l-4 p-3 shadow-sm border-indigo-500 ${d ? 'bg-indigo-950' : 'bg-indigo-50'}`}>
          <p className={`text-[11px] uppercase tracking-wider font-medium ${lbl}`}>Test Cases</p>
          <AnimatedInt value={summary.total_rows} color="text-indigo-500" />
          <p className={`text-[11px] mt-1 ${sub}`}>
            ✅ {summary.pass_count} &nbsp; ⚠️ {summary.warn_count} &nbsp; ❌ {summary.fail_count}
          </p>
        </div>

      </div>
    </div>
  )
}
