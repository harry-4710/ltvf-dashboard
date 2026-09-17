import { useEffect, useState } from 'react'
import { Tag } from 'lucide-react'
import { getSystems, type SystemMeta } from '../api/resultsApi'

interface Props {
  value: string
  onChange: (tag: string) => void
  dark: boolean
}

/**
 * A combo-box for the SAP system tag.
 * Shows a free-text input backed by a <datalist> populated from /api/systems,
 * so users can either type a new tag or pick a previously used one.
 */
export default function SystemTagSelector({ value, onChange, dark }: Props) {
  const [systems, setSystems] = useState<SystemMeta[]>([])

  useEffect(() => {
    getSystems()
      .then(setSystems)
      .catch(() => {}) // silent — no systems history yet
  }, [])

  const inputCls = `
    text-xs px-2 py-1.5 rounded-lg border outline-none transition w-36
    ${dark
      ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400 focus:border-blue-400'
    }
  `

  return (
    <div className="flex items-center gap-1.5">
      <Tag size={12} className={dark ? 'text-slate-500' : 'text-gray-400'} />
      <input
        list="ltvf-system-tags"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="System tag…"
        className={inputCls}
        title={systems.length > 0 ? `${systems.length} known system(s)` : 'Enter a system tag (e.g. QA, PROD)'}
      />
      {systems.length > 0 && (
        <datalist id="ltvf-system-tags">
          {systems.map(s => (
            <option key={s.system_tag} value={s.system_tag}>
              {s.system_tag} — {s.run_count} run{s.run_count !== 1 ? 's' : ''}
            </option>
          ))}
        </datalist>
      )}
    </div>
  )
}
