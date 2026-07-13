import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import type { LTVFRow } from '../types/ltvf'

interface Props {
  rows: LTVFRow[]
  dark: boolean
  thresholds: { pass: number; warn: number }
  selectedSection: string | null
}

interface TreeNode {
  name: string
  size?: number
  rate?: number
  children?: TreeNode[]
}

function rateColor(rate: number | undefined, thresholds: { pass: number; warn: number }) {
  if (rate == null) return '#94a3b8'
  if (rate >= thresholds.pass) return '#16a34a'
  if (rate >= thresholds.warn) return '#d97706'
  return '#dc2626'
}

function CustomContent(props: {
  x?: number; y?: number; width?: number; height?: number
  name?: string; rate?: number; depth?: number
  thresholds: { pass: number; warn: number }
  dark: boolean
}) {
  const { x = 0, y = 0, width = 0, height = 0, name, rate, depth, thresholds, dark } = props
  if (width < 20 || height < 20) return null
  const fill = rateColor(rate, thresholds)
  const alpha = depth === 1 ? 'cc' : 'ff'
  return (
    <g>
      <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2}
        fill={`${fill}${alpha}`} stroke={dark ? '#1e293b' : '#fff'} strokeWidth={2} rx={4} />
      {width > 60 && height > 28 && (
        <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle"
          fill="#fff" fontSize={Math.min(12, width / 8)} fontWeight={600} style={{ pointerEvents: 'none' }}>
          {name && name.length > 18 ? name.slice(0, 16) + '…' : name}
        </text>
      )}
      {width > 60 && height > 44 && rate != null && (
        <text x={x + width / 2} y={y + height / 2 + 14} textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.8)" fontSize={10} style={{ pointerEvents: 'none' }}>
          {rate.toFixed(1)}%
        </text>
      )}
    </g>
  )
}

export default function TreemapChart({ rows, dark, thresholds, selectedSection }: Props) {
  const filtered = selectedSection
    ? rows.filter(r => r.full_path.startsWith(selectedSection))
    : rows

  // Build tree: group by level-0 section → level-1 sub-groups → leaf rows
  const sectionMap = new Map<string, TreeNode>()

  filtered.forEach(r => {
    if (!r.is_group) return
    const parts = r.full_path.split(' > ')
    const top = parts[0]
    if (!sectionMap.has(top)) sectionMap.set(top, { name: top, children: [] })
    if (r.level === 1) {
      sectionMap.get(top)!.children!.push({
        name: r.test_name,
        size: 1,
        rate: r.rate_pct ?? undefined,
      })
    }
  })

  // For sections with no level-1 children, add leaf rows directly
  filtered.forEach(r => {
    if (r.is_group || r.rate_pct == null) return
    const parts = r.full_path.split(' > ')
    const top = parts[0]
    if (!sectionMap.has(top)) sectionMap.set(top, { name: top, children: [] })
    const sec = sectionMap.get(top)!
    if ((sec.children ?? []).length === 0) {
      sec.children!.push({ name: r.test_name, size: 1, rate: r.rate_pct ?? undefined })
    }
  })

  const treeData = {
    name: 'root',
    children: Array.from(sectionMap.values()).filter(s => (s.children ?? []).length > 0),
  }

  const bg = dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
  const lbl = dark ? 'text-slate-400' : 'text-gray-500'
  const ttBg = dark ? '#1e293b' : '#fff'
  const ttBdr = dark ? '#334155' : '#e5e7eb'
  const ttText = dark ? '#e2e8f0' : '#111'

  return (
    <div className={`rounded-xl border shadow-sm p-4 ${bg}`}>
      <p className={`text-xs uppercase tracking-wider font-medium mb-3 ${lbl}`}>
        Test Hierarchy Treemap
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <Treemap
          data={treeData.children}
          dataKey="size"
          aspectRatio={4 / 3}
          content={
            <CustomContent
              thresholds={thresholds}
              dark={dark}
              rate={undefined}
              depth={undefined}
            /> as unknown as React.ReactElement
          }
        >
          <Tooltip
            contentStyle={{ background: ttBg, border: `1px solid ${ttBdr}`, color: ttText, fontSize: 12 }}
            formatter={(_: unknown, name: string, props: { payload?: { rate?: number } }) => [
              props.payload?.rate != null ? `${props.payload.rate.toFixed(1)}%` : '—',
              name,
            ]}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  )
}
