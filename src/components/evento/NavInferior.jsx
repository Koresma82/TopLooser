import { useEffect, useState } from 'react'
import { ICONES } from '../../lib/marca'

// Navegação de telemóvel: barra fixa em baixo, ao alcance do polegar.
// Cabem quatro separadores; o resto vai para uma folha que sobe do fundo.
//
// Na barra vão os ícones da marca, que são os quatro que encaixam bem. Para a
// folha usam-se traços simples: a folha da marca só tem seis desenhos e nenhum
// serve para "galeria" ou "documentos" — pôr lá o troféu era pior do que não
// pôr nada.
const VISIVEIS = 4

const TRACOS = {
  galeria: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="8.5" cy="8.5" r="1.6" />
      <path d="M21 15l-5-5L5 21" />
    </>
  ),
  documentos: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  participantes: (
    <>
      <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
      <circle cx="9.5" cy="7.5" r="3.2" />
      <path d="M21 20v-1.5a4 4 0 0 0-3-3.85M16.5 4.4a3.2 3.2 0 0 1 0 6.2" />
    </>
  ),
  mais: (
    <>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  )
}

function Traco({ nome }) {
  return (
    <svg
      className="traco"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {TRACOS[nome]}
    </svg>
  )
}

function Icone({ separador }) {
  if (separador.icone && ICONES[separador.icone]) {
    return <img src={ICONES[separador.icone]} alt="" />
  }
  return <Traco nome={separador.traco || 'mais'} />
}

export default function NavInferior({ separadores, separador, aoEscolher }) {
  const [folhaAberta, setFolhaAberta] = useState(false)

  const cabem = separadores.length <= VISIVEIS + 1
  const principais = cabem ? separadores : separadores.slice(0, VISIVEIS)
  const restantes = cabem ? [] : separadores.slice(VISIVEIS)
  const escondidoAtivo = restantes.some((s) => s.id === separador)

  // Trava o scroll da página enquanto a folha está aberta.
  useEffect(() => {
    if (!folhaAberta) return undefined
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = antes
    }
  }, [folhaAberta])

  // Fechar com a tecla de escape, para quem usa teclado.
  useEffect(() => {
    if (!folhaAberta) return undefined
    const tecla = (e) => e.key === 'Escape' && setFolhaAberta(false)
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [folhaAberta])

  function escolher(id) {
    aoEscolher(id)
    setFolhaAberta(false)
  }

  return (
    <>
      <nav className="nav-inferior" aria-label="Secções do desafio">
        {principais.map((s) => (
          <button
            key={s.id}
            className={`nav-inferior__item ${separador === s.id ? 'nav-inferior__item--ativo' : ''}`}
            onClick={() => escolher(s.id)}
            aria-current={separador === s.id ? 'page' : undefined}
          >
            <Icone separador={s} />
            <span className="nav-inferior__etiqueta">{s.curto || s.nome}</span>
          </button>
        ))}

        {restantes.length > 0 && (
          <button
            className={`nav-inferior__item ${escondidoAtivo ? 'nav-inferior__item--ativo' : ''}`}
            onClick={() => setFolhaAberta(true)}
            aria-haspopup="menu"
            aria-expanded={folhaAberta}
          >
            <Traco nome="mais" />
            <span className="nav-inferior__etiqueta">Mais</span>
          </button>
        )}
      </nav>

      {folhaAberta && (
        <>
          <div className="folha-fundo" onClick={() => setFolhaAberta(false)} />
          <div className="folha" role="menu">
            <div className="folha__puxador" />
            {restantes.map((s) => (
              <button
                key={s.id}
                role="menuitem"
                className={`folha__item ${separador === s.id ? 'folha__item--ativo' : ''}`}
                onClick={() => escolher(s.id)}
              >
                <Icone separador={s} />
                {s.nome}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}
