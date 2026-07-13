interface Props {
  sections: string[]
  selected: string | null
  onSelect: (s: string | null) => void
  dark: boolean
}

export default function FilterChips({ sections, selected, onSelect, dark }: Props) {
  const base = `text-xs px-3 py-1 rounded-full border font-medium transition-all cursor-pointer`
  const active = dark
    ? 'bg-blue-600 border-blue-500 text-white'
    : 'bg-blue-600 border-blue-600 text-white'
  const inactive = dark
    ? 'bg-slate-800 border-slate-600 text-slate-300 hover:border-blue-400 hover:text-blue-300'
    : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2">
      <button className={`${base} ${selected === null ? active : inactive}`} onClick={() => onSelect(null)}>
        All Sections
      </button>
      {sections.map(s => (
        <button
          key={s}
          className={`${base} ${selected === s ? active : inactive}`}
          onClick={() => onSelect(selected === s ? null : s)}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
