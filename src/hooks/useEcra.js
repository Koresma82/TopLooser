import { useEffect, useState } from 'react'

// Saber se estamos num ecrã de telemóvel. Em vez de esconder metade das coisas
// com CSS, há sítios onde vale mais desenhar outra coisa — uma tabela de seis
// colunas nunca vai ficar bem em 390 px, por muito CSS que se lhe ponha.
export function useConsulta(consulta) {
  const [corresponde, setCorresponde] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(consulta).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia(consulta)
    const aoMudar = (e) => setCorresponde(e.matches)
    setCorresponde(mq.matches)
    mq.addEventListener('change', aoMudar)
    return () => mq.removeEventListener('change', aoMudar)
  }, [consulta])

  return corresponde
}

export function useTelemovel() {
  return useConsulta('(max-width: 760px)')
}
