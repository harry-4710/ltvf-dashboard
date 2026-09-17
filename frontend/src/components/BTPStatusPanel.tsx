import { useState } from 'react'
import { CheckCircle, XCircle, Loader2, RefreshCw, ExternalLink, X, ChevronDown, ChevronUp } from 'lucide-react'
import { testBTPConnection, type BTPStatusInfo, type BTPTestResult } from '../api/btpApi'

interface Props {
  status: BTPStatusInfo | null
  dark: boolean
  onClose: () => void
}

export default function BTPStatusPanel({ status, dark, onClose }: Props) {
  const [testing, setTesting]       = useState(false)
  const [testResult, setTestResult] = useState<BTPTestResult | null>(null)
  const [showFields, setShowFields] = useState(false)

  const bg     = dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'
  const txt    = dark ? 'text-slate-200' : 'text-gray-800'
  const sub    = dark ? 'text-slate-400' : 'text-gray-500'
  const row    = dark ? 'border-slate-700' : 'border-gray-100'
  const codeBg = dark ? 'bg-slate-900 text-blue-300' : 'bg-gray-100 text-blue-700'
  const configured = status?.configured ?? false

  const handleTest = async () => {
    setTesting(true); setTestResult(null)
    try {
      setTestResult(await testBTPConnection())
    } catch {
      setTestResult({ ok: false, steps: [], error: 'Could not reach backend.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className={`absolute right-0 top-10 z-50 w-[460px] rounded-xl border shadow-2xl overflow-hidden ${bg}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${row}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${configured ? 'bg-green-500' : 'bg-red-400'}`} />
          <span className={`text-sm font-semibold ${txt}`}>SAP BTP Connection</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
            configured
              ? (dark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700')
              : (dark ? 'bg-red-900 text-red-300'    : 'bg-red-100 text-red-700')
          }`}>{configured ? 'CONFIGURED' : 'NOT CONFIGURED'}</span>
        </div>
        <button onClick={onClose} className={`${sub} hover:text-red-400`}><X size={14} /></button>
      </div>

      <div className="p-4 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
        {/* Missing vars warning */}
        {status && status.missing_vars.length > 0 && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-xs font-semibold text-red-700 mb-1.5">
              ❌ {status.missing_vars.length} required env var{status.missing_vars.length > 1 ? 's' : ''} not set on the backend:
            </p>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {status.missing_vars.map(v => (
                <code key={v} className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-800 rounded font-mono">{v}</code>
              ))}
            </div>
            <p className="text-[10px] text-red-600">
              Set in Render Dashboard → ltvf-backend → Environment. See{' '}
              <a href="https://github.com/harry-4710/ltvf-dashboard/blob/main/SETUP_BTP.md"
                className="underline" target="_blank" rel="noreferrer">SETUP_BTP.md</a>.
            </p>
          </div>
        )}

        {/* Config table */}
        {status && (
          <table className="w-full text-xs">
            <tbody>
              {([
                ['Destination', status.destination_name],
                ['OData Service', status.odata_service],
                ['Entity Set', status.entity_set],
                ['Token URL', status.token_url],
                ['Dest Svc URL', status.dest_svc_url],
                ['Proxy Host', status.proxy_host],
                ['Proxy Port', status.proxy_port],
                ['Client ID', status.client_id_set ? '✅ Set' : '❌ Not set'],
                ['Client Secret', status.client_secret_set ? '✅ Set' : '❌ Not set'],
              ] as [string, string][]).map(([label, value]) => (
                <tr key={label} className={`border-b ${row}`}>
                  <td className={`py-1.5 pr-3 font-medium w-32 ${sub}`}>{label}</td>
                  <td className={`py-1.5 font-mono text-[11px] break-all ${txt}`}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Field mapping */}
        {status?.field_mapping && (
          <div>
            <button onClick={() => setShowFields(f => !f)}
              className={`flex items-center gap-1 text-xs ${sub} transition`}>
              {showFields ? <ChevronUp size={12} /> : <ChevronDown size={12} />} OData Field Mapping
            </button>
            {showFields && (
              <table className="w-full text-xs mt-2">
                <thead>
                  <tr className={dark ? 'text-slate-500' : 'text-gray-400'}>
                    <th className="text-left pb-1 font-medium">Dashboard Field</th>
                    <th className="text-left pb-1 font-medium">SAP OData Field</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(status.field_mapping).map(([k, v]) => (
                    <tr key={k} className={`border-b ${row}`}>
                      <td className={`py-1 ${sub}`}>{k}</td>
                      <td className="py-1"><code className={`px-1 rounded text-[11px] font-mono ${codeBg}`}>{v}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Test button */}
        <div className="flex gap-2 pt-1">
          <button onClick={handleTest} disabled={testing || !configured}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition
              ${configured ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : (dark ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}
              disabled:opacity-60`}>
            {testing ? <><Loader2 size={13} className="animate-spin" /> Testing…</>
                     : <><RefreshCw size={13} /> Run Connection Test</>}
          </button>
          <a href="https://github.com/harry-4710/ltvf-dashboard/blob/main/SETUP_BTP.md"
            target="_blank" rel="noreferrer"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition
              ${dark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            <ExternalLink size={12} /> Setup Guide
          </a>
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`rounded-lg border p-3 ${
            testResult.ok
              ? (dark ? 'border-green-700 bg-green-950' : 'border-green-200 bg-green-50')
              : (dark ? 'border-red-700 bg-red-950'    : 'border-red-200 bg-red-50')
          }`}>
            <p className={`text-xs font-bold mb-2 ${testResult.ok ? 'text-green-500' : 'text-red-500'}`}>
              {testResult.ok ? '✅ All steps passed — SAP data is reachable' : '❌ Connection test failed'}
            </p>
            {testResult.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs mb-1.5">
                {s.ok ? <CheckCircle size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
                      : <XCircle    size={13} className="text-red-500 mt-0.5 flex-shrink-0" />}
                <div>
                  <span className={`font-medium ${txt}`}>{s.step}</span>
                  <p className={`mt-0.5 leading-snug ${sub}`}>{s.detail}</p>
                </div>
              </div>
            ))}
            {testResult.ok && testResult.odata_endpoint && (
              <p className={`text-[10px] mt-2 font-mono truncate ${sub}`}>
                Endpoint: {testResult.odata_endpoint}
              </p>
            )}
            {!testResult.ok && testResult.error && !testResult.steps.length && (
              <p className="text-xs text-red-600">{testResult.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

