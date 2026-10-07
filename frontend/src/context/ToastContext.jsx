// --- CONTEXTO E COMPONENTE DE TOAST (substitui alertas e barras de erro) ---
import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

let _id = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((tipo, mensagem) => {
    const id = ++_id
    setToasts(prev => [...prev, { id, tipo, mensagem, saindo: false }])

    // Inicia saída após 3.2s, remove após 3.5s
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, saindo: true } : t))
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300)
    }, 3200)
  }, [])

  const toast = {
    sucesso: (msg) => push('sucesso', msg),
    erro:    (msg) => push('erro',    msg),
    aviso:   (msg) => push('aviso',   msg),
    info:    (msg) => push('info',    msg),
  }

  const ICONE = { sucesso: 'bi-check-circle-fill', erro: 'bi-x-circle-fill', aviso: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' }
  const COR   = {
    sucesso: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    erro:    'bg-red-50 border-red-300 text-red-800',
    aviso:   'bg-amber-50 border-amber-300 text-amber-800',
    info:    'bg-blue-50 border-blue-300 text-blue-800',
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* --- CONTAINER DE TOASTS --- */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg w-80 text-sm
              pointer-events-auto ${COR[t.tipo]}
              ${t.saindo ? 'animate-toast-out' : 'animate-toast-in'}`}
          >
            <i className={`bi ${ICONE[t.tipo]} text-base shrink-0 mt-0.5`}></i>
            <span className="flex-1 leading-snug">{t.mensagem}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
