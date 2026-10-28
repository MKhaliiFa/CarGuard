import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export type ToastTone = 'ok' | 'info' | 'warn' | 'danger'

interface ToastItem {
  readonly id: number
  readonly message: string
  readonly tone: ToastTone
}

type ShowToast = (message: string, tone?: ToastTone) => void

const TOAST_MS = 3200
const MAX_TOASTS = 3

const ToastContext = createContext<ShowToast | undefined>(undefined)

function noop(): void {}

/** Returns a no-op outside a provider so components stay usable in isolation (and in tests). */
export function useToast(): ShowToast {
  return useContext(ToastContext) ?? noop
}

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [items, setItems] = useState<readonly ToastItem[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const show = useCallback<ShowToast>(
    (message, tone = 'ok') => {
      const id = nextId.current++
      setItems((list) => [...list.slice(-(MAX_TOASTS - 1)), { id, message, tone }])
      timers.current.set(id, setTimeout(() => dismiss(id), TOAST_MS))
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            <span className="toast-dot" aria-hidden="true" />
            <span className="toast-text">{t.message}</span>
            <button type="button" className="toast-close" aria-label="إغلاق التنبيه" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
