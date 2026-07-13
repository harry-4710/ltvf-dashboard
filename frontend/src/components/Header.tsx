import { Database, RefreshCw } from 'lucide-react'

interface Props {
  title: string
  system: string
  client: string
  source: 'mock' | 'sap'
  onRefresh: () => void
  loading: boolean
}

export default function Header({ title, system, client, source, onRefresh, loading }: Props) {
  return (
    <div className="bg-[#003366] text-white px-6 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <Database size={20} />
        <div>
          <h1 className="text-lg font-semibold tracking-wide">{title}</h1>
          <p className="text-xs text-blue-200">
            System: <span className="font-medium">{system}</span> &nbsp;|&nbsp;
            Client: <span className="font-medium">{client}</span> &nbsp;|&nbsp;
            Source:{' '}
            <span className={`font-medium ${source === 'mock' ? 'text-yellow-300' : 'text-green-300'}`}>
              {source === 'mock' ? 'Mock Data' : 'Live SAP'}
            </span>
          </p>
        </div>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition px-3 py-1.5 rounded text-sm"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        Refresh
      </button>
    </div>
  )
}
