import axios from 'axios'
import type { LTVFParseResult } from '../types/ltvf'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL })

export interface ScheduledStatus {
  available: boolean
  last_modified: string | null
  filename: string | null
}

export async function checkScheduledStatus(): Promise<ScheduledStatus> {
  const { data } = await api.get<ScheduledStatus>('/scheduled/status')
  return data
}

export async function fetchScheduled(): Promise<LTVFParseResult> {
  const { data } = await api.get<LTVFParseResult>('/scheduled/fetch')
  return data
}
