import axios from 'axios'
import type { LTVFParseResult, ResultEntry } from '../types/ltvf'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL })

export async function saveResult(tag: string, result: LTVFParseResult): Promise<void> {
  await api.post('/results', {
    system_tag: tag,
    filename: result.filename,
    summary: result.summary,
    rows: result.rows,
    sections: result.sections,
  })
}

export async function getResults(system: string): Promise<ResultEntry[]> {
  const { data } = await api.get<ResultEntry[]>(`/results/${encodeURIComponent(system)}`)
  return data
}

export async function getResultByDate(system: string, date: string): Promise<LTVFParseResult> {
  const { data } = await api.get<LTVFParseResult>(
    `/results/${encodeURIComponent(system)}/${date}`
  )
  return data
}

export async function deleteResult(id: string): Promise<void> {
  await api.delete(`/results/${encodeURIComponent(id)}`)
}

export interface SystemMeta {
  system_tag: string
  last_run: string
  run_count: number
}

export async function getSystems(): Promise<SystemMeta[]> {
  const { data } = await api.get<SystemMeta[]>('/systems')
  return data
}

