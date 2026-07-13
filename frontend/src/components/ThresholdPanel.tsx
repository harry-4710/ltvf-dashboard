import { useState } from 'react'
import { Settings, X } from 'lucide-react'

interface Props {
  thresholds: { pass: number; warn: number }
  onChange: (t: { pass: number; warn: number }) => void
  dark: boolean
}

export default function ThresholdPanel({ thresholds, onChange, dark }: Props) {
  const [open, setOpen] = useState(false)
  const bg = dark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-gray-200 text-gray-800'
  const lbl = dark ? 'text-slate-300' : 'text-gray-600'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${
          dark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
        }`}
        title="Configure pass/warn thresholds"
      >
        <Settings size={13} />
        Thresholds
      </button>

      {open && (
        <div className={`absolute right-0 top-8 z-50 rounded-xl border shadow-xl p-4 w-72 ${bg}`}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold">Rate Thresholds</span>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-200">
              <X size={14} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className={`text-xs font-medium ${lbl}`}>Pass threshold</label>
                <span className="text-xs font-bold text-green-500">{thresholds.pass}%</span>
              </div>
              <input
                type="range" min={50} max={100} step={1}
                value={thresholds.pass}
                onChange={e => {
                  const val = Number(e.target.value)
                  onChange({ pass: val, warn: Math.min(thresholds.warn, val - 1) })
                }}
                className="w-full accent-green-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>50%</span><span>100%</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className={`text-xs font-medium ${lbl}`}>Warn threshold</label>
                <span className="text-xs font-bold text-amber-500">{thresholds.warn}%</span>
              </div>
              <input
                type="range" min={0} max={thresholds.pass - 1} step={1}
                value={thresholds.warn}
                onChange={e => onChange({ ...thresholds, warn: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0%</span><span>{thresholds.pass - 1}%</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-600 flex gap-2 text-[11px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Pass ≥{thresholds.pass}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />{thresholds.warn}–{thresholds.pass - 1}%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Fail &lt;{thresholds.warn}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
