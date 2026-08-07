import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL })

export async function getSettings(tag: string): Promise<{ pass: number; warn: number }> {
  const { data } = await api.get<{ pass: number; warn: number }>('/settings', { params: { tag } })
  return data
}

export async function saveSettings(
  tag: string,
  thresholds: { pass: number; warn: number }
): Promise<void> {
  await api.put('/settings', {
    system_tag: tag,
    pass_threshold: thresholds.pass,
    warn_threshold: thresholds.warn,
  })
}
