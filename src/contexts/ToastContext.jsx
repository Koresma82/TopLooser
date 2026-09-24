import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast tem de ser usado dentro de <ToastProvider>')
  return ctx
}

let contador = 0

export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([])

  const remover = useCallback((id) => {
    setAvisos((atuais) => atuais.filter((a) => a.id !== id))
  }, [])

  const mostrar = useCallback(
    (mensagem, tipo = 'info') => {
      const id = ++contador
      setAvisos((atuais) => [...atuais, { id, mensagem, tipo }])
      setTimeout(() => remover(id), 5000)
    },
    [remover]
  )

  const valor = useMemo(
    () => ({
      info: (m) => mostrar(m, 'info'),
      sucesso: (m) => mostrar(m, 'sucesso'),
      erro: (m) => mostrar(m, 'erro')
    }),
    [mostrar]
  )

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`toast toast--${a.tipo}`} onClick={() => remover(a.id)}>
            {a.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
