import { useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'warn' | 'error' | 'info'

export interface ToastMessage {
  id: number
  type: ToastType
  message: string
}

// ── Toast Container ────────────────────────────────────────────────────────
const ICONS: Record<ToastType, ReactNode> = {
  success: <CheckCircle size={16} className="text-green-400 flex-shrink-0" />,
  warn:    <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />,
  error:   <XCircle size={16} className="text-red-400 flex-shrink-0" />,
  info:    <CheckCircle size={16} className="text-blue-400 flex-shrink-0" />,
}

const BORDER_COLORS: Record<ToastType, string> = {
  success: 'border-green-700',
  warn:    'border-amber-700',
  error:   'border-red-700',
  info:    'border-blue-700',
}

interface ContainerProps {
  toasts: ToastMessage[]
  onDismiss: (id: number) => void
}

export function ToastContainer({ toasts, onDismiss }: ContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`
            flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl
            bg-slate-800 text-slate-100 text-sm min-w-[280px] max-w-sm
            border ${BORDER_COLORS[t.type]}
            pointer-events-auto
            animate-fade-in
          `}
        >
          {ICONS[t.type]}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-slate-400 hover:text-white transition flex-shrink-0 mt-0.5"
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── useToast hook ──────────────────────────────────────────────────────────
const AUTO_DISMISS_MS = 4500

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const add = useCallback((type: ToastType, message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), AUTO_DISMISS_MS)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (msg: string) => add('success', msg),
    warn:    (msg: string) => add('warn', msg),
    error:   (msg: string) => add('error', msg),
    info:    (msg: string) => add('info', msg),
  }

  return { toasts, toast, dismiss }
}
