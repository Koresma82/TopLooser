import { useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Avatar, Confirmacao, Lupa, Modal, Vazio } from '../Comuns'
import { corPorId } from '../../lib/cores'
import { primeiroNome } from '../../lib/formato'
import { adicionarFoto, apagarFoto } from '../../lib/servicos'

const TAMANHO_MAXIMO = 10 * 1024 * 1024

export default function TabGaleria({ evento, participantes, galeria, souParticipante }) {
  const { uid, utilizador, isAdmin } = useAuth()
  const toast = useToast()
  const inputFicheiro = useRef(null)

  const [ficheiro, setFicheiro] = useState(null)
  const [prever, setPrever] = useState('')
  const [legenda, setLegenda] = useState('')
  const [aEnviar, setAEnviar] = useState(false)
  const [paraApagar, setParaApagar] = useState(null)
  const [lupa, setLupa] = useState('')

  function escolher(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      toast.erro('Só são aceites imagens.')
      return
    }
    if (f.size > TAMANHO_MAXIMO) {
      toast.erro('A imagem é demasiado grande (máximo 10 MB).')
      return
    }
    setFicheiro(f)
    setPrever(URL.createObjectURL(f))
    setLegenda('')
  }

  function fechar() {
    if (prever) URL.revokeObjectURL(prever)
    setFicheiro(null)
    setPrever('')
    setLegenda('')
    if (inputFicheiro.current) inputFicheiro.current.value = ''
  }

  async function enviar() {
    if (!ficheiro) return
    setAEnviar(true)
    try {
      await adicionarFoto(evento.id, utilizador, ficheiro, legenda)
      toast.sucesso('Foto publicada.')
      fechar()
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível publicar a foto.')
    } finally {
      setAEnviar(false)
    }
  }

  async function confirmarApagar() {
    const foto = paraApagar
    setParaApagar(null)
    try {
      await apagarFoto(evento.id, foto)
      toast.sucesso('Foto apagada.')
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível apagar a foto.')
    }
  }

  return (
    <>
      <div className="linha linha--espaco" style={{ marginBottom: 14 }}>
        <p className="subtitulo" style={{ margin: 0 }}>
          Fotos partilhadas com quem está no desafio. Publicar é opcional.
        </p>
        {souParticipante && (
          <>
            <input
              ref={inputFicheiro}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={escolher}
            />
            <button className="btn btn--principal" onClick={() => inputFicheiro.current?.click()}>
              Adicionar foto
            </button>
          </>
        )}
      </div>

      {!galeria.length ? (
        <Vazio titulo="Ainda não há fotos">
          {souParticipante
            ? 'Podes juntar fotos de progresso, do grupo, do talão ou do jantar que te tramou.'
            : 'Entra no desafio para veres e publicares fotos.'}
        </Vazio>
      ) : (
        <div className="galeria">
          {galeria.map((f) => {
            const p = participantes.find((x) => x.uid === f.uid)
            const meu = f.uid === uid
            return (
              <div className="galeria__item" key={f.id}>
                <img src={f.ficheiroURL} alt={f.legenda || ''} onClick={() => setLupa(f.ficheiroURL)} />
                {(meu || isAdmin) && (
                  <button
                    className="galeria__apagar"
                    onClick={() => setParaApagar(f)}
                    aria-label="Apagar foto"
                  >
                    ×
                  </button>
                )}
                {f.legenda && <div className="galeria__legenda">{f.legenda}</div>}
                <div className="galeria__autor">
                  <Avatar nome={p?.nome || f.nome} fotoURL={p?.fotoURL} cor={corPorId(p?.cor)} tamanho="p" />
                  {primeiroNome(p?.nome || f.nome)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        titulo="Publicar foto"
        aberto={Boolean(ficheiro)}
        aoFechar={fechar}
        rodape={
          <>
            <button className="btn" onClick={fechar} disabled={aEnviar}>
              Cancelar
            </button>
            <button className="btn btn--principal" onClick={enviar} disabled={aEnviar}>
              {aEnviar ? 'A enviar…' : 'Publicar'}
            </button>
          </>
        }
      >
        {prever && (
          <img
            src={prever}
            alt=""
            style={{
              width: '100%',
              maxHeight: 340,
              objectFit: 'contain',
              borderRadius: 'var(--raio-p)',
              border: '1px solid var(--borda)',
              background: 'var(--fundo-2)',
              marginBottom: 14
            }}
          />
        )}
        <div className="campo">
          <label className="campo__etiqueta">Legenda (opcional)</label>
          <input
            type="text"
            value={legenda}
            placeholder="Ex.: pesagem oficial, com testemunha"
            onChange={(e) => setLegenda(e.target.value)}
          />
        </div>
      </Modal>

      <Confirmacao
        aberto={Boolean(paraApagar)}
        titulo="Apagar foto"
        mensagem="A foto é apagada para todos os participantes."
        aoFechar={() => setParaApagar(null)}
        aoConfirmar={confirmarApagar}
      />

      <Lupa url={lupa} aoFechar={() => setLupa('')} />
    </>
  )
}
