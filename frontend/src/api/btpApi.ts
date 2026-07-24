import axios from 'axios'
import type { LTVFParseResult } from '../types/ltvf'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL })

export async function checkSAPStatus(): Promise<{ available: boolean }> {
  const { data } = await api.get<{ available: boolean }>('/sap/status')
  return data
}

export async function fetchFromSAP(): Promise<LTVFParseResult> {
  const { data } = await api.get<LTVFParseResult>('/sap/fetch')
  return data
}
