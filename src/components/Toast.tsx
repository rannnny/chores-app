import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface ToastState {
  message: string
  kind: 'success' | 'error'
}

const ToastContext = createContext<(message: string, kind?: 'success' | 'error') => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback((message: string, kind: 'success' | 'error' = 'success') => {
    setToast({ message, kind })
    setTimeout(() => setToast(null), 2400)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className="fixed bottom-24 inset-x-0 flex justify-center px-4 z-50 pointer-events-none">
          <div
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg ${
              toast.kind === 'success' ? 'bg-slate-900' : 'bg-rose-500'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
