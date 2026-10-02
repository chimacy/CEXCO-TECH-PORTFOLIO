import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

type Kind = 'success' | 'error'
interface Toast { id: number; kind: Kind; message: string }
const ToastCtx = createContext<{ success: (m: string) => void; error: (m: string) => void }>({ success: () => undefined, error: () => undefined })
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))
  const push = useCallback((kind: Kind, message: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t.slice(-3), { id, kind, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3500)
  }, [])
  const api = { success: (m: string) => push('success', m), error: (m: string) => push('error', m) }
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role="status" className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-xl animate-fadeUp">
            {t.kind === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden /> : <XCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss notification"><X className="h-4 w-4 opacity-60 hover:opacity-100" /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
