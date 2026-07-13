import axios from 'axios'
import type { LTVFParseResult } from '../types/ltvf'

// In dev: Vite proxy rewrites /api → localhost:8000
// In production (Vercel): VITE_API_URL is set to the Render backend URL
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL })

export async function uploadLTVF(file: File): Promise<LTVFParseResult> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<LTVFParseResult>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
