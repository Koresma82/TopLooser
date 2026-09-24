import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Avatar, Confirmacao, IconeMarca, Vazio } from '../Comuns'
import ModalInscricao from './ModalInscricao'
import { corPorId } from '../../lib/cores'
import { registosDoParticipante } from '../../lib/calculos'
import { dataCurta } from '../../lib/formato'
import { sairDoEvento } from '../../lib/servicos'

export default function TabParticipantes({ evento, participantes, registos, euParticipante }) {
  const { uid, isAdmin } = useAuth()
  const toast = useToast()
  const [modalFicha, setModalFicha] = useState(false)
  const [paraRemover, setParaRemover] = useState(null)

  async function confirmarRemocao() {
    const p = paraRemover
    setParaRemover(null)
    try {
      await sairDoEvento(evento.id, p.uid)
      toast.sucesso(p.uid === uid ? 'Saíste do desafio.' : 'Participante removido.')
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível concluir a operação.')
    }
  }

  if (!participantes.length) {
    return <Vazio titulo="Ainda ninguém se inscreveu">Sê o primeiro a entrar.</Vazio>
  }

  return (
    <>
      <div className="secao__topo so-computador">
        <div className="linha" style={{ flexWrap: 'nowrap', gap: 12 }}>
          <IconeMarca nome="comunidade" />
          <div>
            <h2>Participantes</h2>
            <p className="subtitulo">
              {participantes.length} {participantes.length === 1 ? 'inscrito' : 'inscritos'} neste
              desafio.
            </p>
          </div>
        </div>
        {euParticipante && (
          <button className="btn" onClick={() => setModalFicha(true)}>
            Editar a minha ficha
          </button>
        )}
      </div>

      <div className="grelha grelha--3">
        {participantes.map((p) => {
          const cor = corPorId(p.cor)
          const meus = registosDoParticipante(registos, p.uid)
          const sou = p.uid === uid
          return (
            <div className="cartao" key={p.uid}>
              <div className="linha" style={{ flexWrap: 'nowrap', gap: 12 }}>
                <Avatar nome={p.nome} fotoURL={p.fotoURL} cor={cor} tamanho="g" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 650 }}>
                    {p.nome} {sou && <span className="neutro">(tu)</span>}
                  </div>
                  <div className="subtitulo" style={{ fontSize: '.82rem' }}>
                    {p.alturaCm ? `${p.alturaCm} cm` : 'altura por preencher'} ·{' '}
                    {meus.length} {meus.length === 1 ? 'pesagem' : 'pesagens'}
                  </div>
                </div>
              </div>

              <div className="linha linha--espaco" style={{ marginTop: 13 }}>
                <span className="linha" style={{ gap: 7, fontSize: '.8rem', color: 'var(--texto-fraco)' }}>
                  <span
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: '50%',
                      background: cor,
                      display: 'inline-block'
                    }}
                  />
                  {meus.length
                    ? `desde ${dataCurta(meus[0].data)}`
                    : 'ainda sem registos'}
                </span>

                {(sou || isAdmin) && (
                  <button className="btn btn--p btn--perigo" onClick={() => setParaRemover(p)}>
                    {sou ? 'Sair' : 'Remover'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ModalInscricao
        aberto={modalFicha}
        aoFechar={() => setModalFicha(false)}
        eventoId={evento.id}
        participantes={participantes}
        euParticipante={euParticipante}
      />

      <Confirmacao
        aberto={Boolean(paraRemover)}
        titulo={paraRemover?.uid === uid ? 'Sair do desafio' : 'Remover participante'}
        mensagem={
          paraRemover?.uid === uid
            ? 'Saem contigo todas as tuas pesagens, fotos e documentos deste evento. Não há volta atrás.'
            : `Remover ${paraRemover?.nome || ''} apaga também todos os registos, fotos e documentos desta pessoa neste evento.`
        }
        textoConfirmar={paraRemover?.uid === uid ? 'Sair' : 'Remover'}
        aoFechar={() => setParaRemover(null)}
        aoConfirmar={confirmarRemocao}
      />
    </>
  )
}
