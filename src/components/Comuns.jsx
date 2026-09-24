import { useEffect } from 'react'
import { iniciais } from '../lib/formato'
import { COR_OMISSAO } from '../lib/cores'
import { ALTERNATIVO, ICONES } from '../lib/marca'

// ---------------------------------------------------------------------------
// Ícone da marca (troféu, gráfico, balança, calendário, grupo, chama)
// ---------------------------------------------------------------------------
export function IconeMarca({ nome, tamanho = '' }) {
  const src = ICONES[nome]
  if (!src) return null
  const classe = `icone-marca ${tamanho === 'p' ? 'icone-marca--p' : tamanho === 'g' ? 'icone-marca--g' : ''}`
  return <img className={classe} src={src} alt={ALTERNATIVO[nome] || ''} />
}

// ---------------------------------------------------------------------------
// Carregamento
// ---------------------------------------------------------------------------
export function Carregar({ texto = 'A carregar…' }) {
  return (
    <div className="carregar">
      <div className="roda" />
      <span>{texto}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Estado vazio
// ---------------------------------------------------------------------------
export function Vazio({ titulo, children }) {
  return (
    <div className="vazio">
      {titulo && <div className="vazio__titulo">{titulo}</div>}
      {children && <div>{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Avatar com a cor do participante
// ---------------------------------------------------------------------------
export function Avatar({ nome, fotoURL, cor, tamanho = '' }) {
  const classe = `avatar ${tamanho === 'p' ? 'avatar--p' : tamanho === 'g' ? 'avatar--g' : ''}`
  const estilo = cor ? { borderColor: cor } : undefined

  if (fotoURL) {
    return <img className={classe} style={estilo} src={fotoURL} alt={nome || ''} referrerPolicy="no-referrer" />
  }
  return (
    <span
      className={classe}
      style={{ ...estilo, background: cor || COR_OMISSAO, color: '#12151c' }}
      aria-hidden="true"
    >
      {iniciais(nome)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
export function Modal({ titulo, aberto, aoFechar, children, rodape, largo = false }) {
  useEffect(() => {
    if (!aberto) return undefined
    function tecla(e) {
      if (e.key === 'Escape') aoFechar?.()
    }
    document.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = ''
    }
  }, [aberto, aoFechar])

  if (!aberto) return null

  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar?.()}>
      <div className={`modal ${largo ? 'modal--largo' : ''}`} role="dialog" aria-modal="true">
        <div className="modal__topo">
          <h3>{titulo}</h3>
          <button className="fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="modal__corpo">{children}</div>
        {rodape && <div className="modal__fundo">{rodape}</div>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Visualizador de imagem em ecrã inteiro
// ---------------------------------------------------------------------------
export function Lupa({ url, aoFechar }) {
  useEffect(() => {
    if (!url) return undefined
    function tecla(e) {
      if (e.key === 'Escape') aoFechar?.()
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [url, aoFechar])

  if (!url) return null
  return (
    <div className="lightbox" onClick={aoFechar}>
      <img src={url} alt="" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cartão de estatística
// ---------------------------------------------------------------------------
export function Estatistica({ rotulo, valor, nota, cor, progresso }) {
  return (
    <div className="estatistica">
      <div className="estatistica__rotulo">{rotulo}</div>
      <div className="estatistica__valor" style={cor ? { color: cor } : undefined}>
        {valor}
      </div>
      {nota && <div className="estatistica__nota">{nota}</div>}
      {progresso !== null && progresso !== undefined && (
        <div className="barra-progresso">
          <div className="barra-progresso__interior" style={{ width: `${progresso}%` }} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confirmação
// ---------------------------------------------------------------------------
export function Confirmacao({ aberto, titulo, mensagem, aoConfirmar, aoFechar, textoConfirmar = 'Apagar' }) {
  return (
    <Modal
      titulo={titulo}
      aberto={aberto}
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn--perigo" onClick={aoConfirmar}>
            {textoConfirmar}
          </button>
        </>
      }
    >
      <p>{mensagem}</p>
    </Modal>
  )
}
