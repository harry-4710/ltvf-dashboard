import axios from 'axios'
import type { LTVFParseResult } from '../types/ltvf'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL })

// ── BTP status / config info ───────────────────────────────────────────────
export interface BTPFieldMapping {
  test_name: string; rate_pct: string; diff: string; missing: string
  unexpected: string; equal: string; source: string; target: string
  level: string; parent_id: string; node_id: string; is_group: string
}

export interface BTPStatusInfo {
  available: boolean
  mode: string
  configured: boolean
  destination_name: string
  odata_service: string
  entity_set: string
  proxy_host: string
  proxy_port: string
  token_url: string
  dest_svc_url: string
  client_id_set: boolean
  client_secret_set: boolean
  missing_vars: string[]
  field_mapping: BTPFieldMapping
}

export interface BTPTestStep {
  step: string
  ok: boolean
  detail: string
}

export interface BTPTestResult {
  ok: boolean
  steps: BTPTestStep[]
  error?: string
  destination_name?: string
  destination_url?: string
  odata_endpoint?: string
  missing_vars?: string[]
}

// ── API functions ──────────────────────────────────────────────────────────

export async function checkSAPStatus(): Promise<BTPStatusInfo> {
  const { data } = await api.get<BTPStatusInfo>('/sap/status')
  return data
}

export async function testBTPConnection(): Promise<BTPTestResult> {
  const { data } = await api.get<BTPTestResult>('/sap/test')
  return data
}

export async function fetchFromSAP(systemTag = 'default'): Promise<LTVFParseResult> {
  const { data } = await api.get<LTVFParseResult>('/sap/fetch', {
    params: { system_tag: systemTag },
  })
  return data
}

