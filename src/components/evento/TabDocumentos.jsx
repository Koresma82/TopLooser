import { useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Confirmacao, Lupa, Modal, Vazio } from '../Comuns'
import { primeiroNome, tamanhoFicheiro } from '../../lib/formato'
import { adicionarDocumento, apagarDocumento } from '../../lib/servicos'

const TAMANHO_MAXIMO = 15 * 1024 * 1024

export default function TabDocumentos({ evento, participantes, documentos, souParticipante }) {
  const { uid, utilizador, isAdmin } = useAuth()
  const toast = useToast()
  const inputFicheiro = useRef(null)

  const [ficheiro, setFicheiro] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [aEnviar, setAEnviar] = useState(false)
  const [paraApagar, setParaApagar] = useState(null)
  const [lupa, setLupa] = useState('')

  function escolher(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const aceite = f.type.startsWith('image/') || f.type === 'application/pdf'
    if (!aceite) {
      toast.erro('O contrato tem de ser um PDF ou uma imagem.')
      return
    }
    if (f.size > TAMANHO_MAXIMO) {
      toast.erro('O ficheiro é demasiado grande (máximo 15 MB).')
      return
    }
    setFicheiro(f)
    setTitulo(f.name.replace(/\.[^.]+$/, ''))
  }

  function fechar() {
    setFicheiro(null)
    setTitulo('')
    if (inputFicheiro.current) inputFicheiro.current.value = ''
  }

  async function enviar() {
    if (!ficheiro) return
    setAEnviar(true)
    try {
      await adicionarDocumento(evento.id, utilizador, ficheiro, titulo)
      toast.sucesso('Documento guardado.')
      fechar()
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível guardar o documento.')
    } finally {
      setAEnviar(false)
    }
  }

  async function confirmarApagar() {
    const doc = paraApagar
    setParaApagar(null)
    try {
      await apagarDocumento(evento.id, doc)
      toast.sucesso('Documento apagado.')
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível apagar o documento.')
    }
  }

  return (
    <>
      <div className="linha linha--espaco" style={{ marginBottom: 14 }}>
        <p className="subtitulo" style={{ margin: 0 }}>
          O contrato assinado, o regulamento, o que houver. PDF ou foto.
        </p>
        {souParticipante && (
          <>
            <input
              ref={inputFicheiro}
              type="file"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={escolher}
            />
            <button className="btn btn--principal" onClick={() => inputFicheiro.current?.click()}>
              Carregar documento
            </button>
          </>
        )}
      </div>

      {!documentos.length ? (
        <Vazio titulo="Ainda não há documentos">
          {souParticipante
            ? 'Carrega aqui o contrato assinado por todos — fica guardado para o caso de haver discussão no fim.'
            : 'Entra no desafio para veres os documentos.'}
        </Vazio>
      ) : (
        <div className="grelha grelha--2">
          {documentos.map((d) => {
            const p = participantes.find((x) => x.uid === d.uid)
            const meu = d.uid === uid
            const imagem = String(d.tipo || '').startsWith('image/')
            return (
              <div className="cartao" key={d.id}>
                <div className="linha linha--espaco" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <h3>{d.titulo}</h3>
                    <p className="subtitulo" style={{ fontSize: '.8rem', marginTop: 4 }}>
                      {imagem ? 'Imagem' : 'PDF'} · {tamanhoFicheiro(d.tamanho)} · carregado por{' '}
                      {primeiroNome(p?.nome || d.nome)}
                    </p>
                  </div>
                  {(meu || isAdmin) && (
                    <button className="btn btn--p btn--perigo" onClick={() => setParaApagar(d)}>
                      Apagar
                    </button>
                  )}
                </div>

                {imagem && (
                  <img
                    src={d.ficheiroURL}
                    alt={d.titulo}
                    onClick={() => setLupa(d.ficheiroURL)}
                    style={{
                      width: '100%',
                      height: 170,
                      objectFit: 'cover',
                      borderRadius: 'var(--raio-p)',
                      border: '1px solid var(--borda)',
                      margin: '12px 0',
                      cursor: 'zoom-in'
                    }}
                  />
                )}

                <a
                  className="btn btn--largo"
                  href={d.ficheiroURL}
                  target="_blank"
                  rel="noreferrer"
                  style={{ marginTop: imagem ? 0 : 12 }}
                >
                  Abrir documento
                </a>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        titulo="Carregar documento"
        aberto={Boolean(ficheiro)}
        aoFechar={fechar}
        rodape={
          <>
            <button className="btn" onClick={fechar} disabled={aEnviar}>
              Cancelar
            </button>
            <button className="btn btn--principal" onClick={enviar} disabled={aEnviar}>
              {aEnviar ? 'A enviar…' : 'Guardar'}
            </button>
          </>
        }
      >
        <div className="campo">
          <label className="campo__etiqueta">Título</label>
          <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <span className="campo__ajuda">
            {ficheiro?.name} · {tamanhoFicheiro(ficheiro?.size)}
          </span>
        </div>
      </Modal>

      <Confirmacao
        aberto={Boolean(paraApagar)}
        titulo="Apagar documento"
        mensagem={`Apagar "${paraApagar?.titulo || ''}"? Deixa de estar disponível para todos.`}
        aoFechar={() => setParaApagar(null)}
        aoConfirmar={confirmarApagar}
      />

      <Lupa url={lupa} aoFechar={() => setLupa('')} />
    </>
  )
}
