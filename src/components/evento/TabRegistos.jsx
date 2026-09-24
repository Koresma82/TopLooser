import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Avatar, Confirmacao, IconeMarca, Lupa, Vazio } from '../Comuns'
import ModalRegisto from './ModalRegisto'
import { categoriasDoEvento } from '../../lib/categorias'
import { valorRegisto } from '../../lib/calculos'
import { corPorId } from '../../lib/cores'
import { comUnidade, dataCurta, primeiroNome } from '../../lib/formato'
import { apagarRegisto } from '../../lib/servicos'
import { useTelemovel } from '../../hooks/useEcra'

// Um cartão por pesagem, em vez de uma linha de tabela que não cabe no ecrã.
function CartaoPesagem({ registo, participante, cats, meu, isAdmin, aoEditar, aoApagar, aoVerTalao }) {
  return (
    <div className="cartao-pesagem">
      <div className="cartao-pesagem__topo">
        <Avatar
          nome={participante?.nome}
          fotoURL={participante?.fotoURL}
          cor={corPorId(participante?.cor)}
        />
        <div className="cartao-pesagem__quem">
          {primeiroNome(participante?.nome || 'Saiu do evento')}
          <div className="cartao-pesagem__data">{dataCurta(registo.data)}</div>
        </div>
        {registo.origem === 'talao-ia' && <span className="selo-ia">IA</span>}
      </div>

      <div className="cartao-pesagem__valores">
        {cats.map((c) => {
          const valor = valorRegisto(registo, c.id, participante)
          if (valor === null) return null
          return (
            <div className="cartao-pesagem__valor" key={c.id}>
              <div className="cartao-pesagem__rotulo">{c.curto}</div>
              <div className="cartao-pesagem__numero">{comUnidade(valor, c)}</div>
            </div>
          )
        })}
      </div>

      {registo.notas && <div className="cartao-pesagem__nota">{registo.notas}</div>}

      {(registo.ficheiroURL || meu || isAdmin) && (
        <div className="cartao-pesagem__fundo">
          {registo.ficheiroURL && (
            <button className="btn btn--p" onClick={() => aoVerTalao(registo.ficheiroURL)}>
              Ver talão
            </button>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 7 }}>
            {meu && (
              <button className="btn btn--p" onClick={() => aoEditar(registo)}>
                Editar
              </button>
            )}
            {(meu || isAdmin) && (
              <button className="btn btn--p btn--perigo" onClick={() => aoApagar(registo)}>
                Apagar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TabRegistos({ evento, participantes, registos, euParticipante, souParticipante }) {
  const { uid, isAdmin } = useAuth()
  const telemovel = useTelemovel()
  const toast = useToast()

  const [filtroUid, setFiltroUid] = useState('todos')
  const [aEditar, setAEditar] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [paraApagar, setParaApagar] = useState(null)
  const [lupa, setLupa] = useState('')

  const cats = categoriasDoEvento(evento)

  const lista = useMemo(() => {
    const filtrados = filtroUid === 'todos' ? registos : registos.filter((r) => r.uid === filtroUid)
    return filtrados.slice().sort((a, b) => String(b.data).localeCompare(String(a.data)))
  }, [registos, filtroUid])

  function participanteDe(uidRegisto) {
    return participantes.find((p) => p.uid === uidRegisto) || null
  }

  function abrirEdicao(registo) {
    setAEditar(registo)
    setModalAberto(true)
  }

  async function confirmarApagar() {
    const registo = paraApagar
    setParaApagar(null)
    try {
      await apagarRegisto(evento.id, registo)
      toast.sucesso('Registo apagado.')
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível apagar o registo.')
    }
  }

  return (
    <>
      <div className="secao__topo so-computador">
        <div className="linha" style={{ flexWrap: 'nowrap', gap: 12 }}>
          <IconeMarca nome="imc" />
          <div>
            <h2>Pesagens</h2>
            <p className="subtitulo">
              Todas as pesagens do desafio, com o talão de quem o fotografou.
            </p>
          </div>
        </div>
      </div>

      <div className="linha linha--espaco" style={{ marginBottom: 14 }}>
        <div className="chips">
          <button
            className={`chip ${filtroUid === 'todos' ? 'chip--ativo' : ''}`}
            onClick={() => setFiltroUid('todos')}
          >
            Todos
          </button>
          {participantes.map((p) => (
            <button
              key={p.uid}
              className={`chip ${filtroUid === p.uid ? 'chip--ativo' : ''}`}
              onClick={() => setFiltroUid(p.uid)}
            >
              {primeiroNome(p.nome)}
            </button>
          ))}
        </div>
      </div>

      {!lista.length ? (
        <Vazio titulo="Ainda não há pesagens">
          {souParticipante
            ? 'Fotografa o talão da farmácia ou escreve os valores à mão.'
            : 'Quando os participantes começarem a registar, aparece tudo aqui.'}
        </Vazio>
      ) : telemovel ? (
        <div className="lista-cartoes">
          {lista.map((r) => (
            <CartaoPesagem
              key={r.id}
              registo={r}
              participante={participanteDe(r.uid)}
              cats={cats}
              meu={r.uid === uid}
              isAdmin={isAdmin}
              aoEditar={abrirEdicao}
              aoApagar={setParaApagar}
              aoVerTalao={setLupa}
            />
          ))}
        </div>
      ) : (
        <div className="cartao cartao--limpo">
          <div className="tabela-envolvente">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Quem</th>
                  {cats.map((c) => (
                    <th key={c.id} className="num">
                      {c.curto}
                    </th>
                  ))}
                  <th>Talão</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => {
                  const p = participanteDe(r.uid)
                  const meu = r.uid === uid
                  return (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{dataCurta(r.data)}</td>
                      <td>
                        <div className="linha" style={{ flexWrap: 'nowrap', gap: 9 }}>
                          <Avatar nome={p?.nome} fotoURL={p?.fotoURL} cor={corPorId(p?.cor)} tamanho="p" />
                          <span>{primeiroNome(p?.nome || 'Saiu do evento')}</span>
                        </div>
                      </td>
                      {cats.map((c) => (
                        <td key={c.id} className="num">
                          {comUnidade(valorRegisto(r, c.id, p), c)}
                        </td>
                      ))}
                      <td>
                        {r.ficheiroURL ? (
                          <div className="linha" style={{ flexWrap: 'nowrap', gap: 6 }}>
                            <button className="btn btn--p" onClick={() => setLupa(r.ficheiroURL)}>
                              Ver
                            </button>
                            {r.origem === 'talao-ia' && (
                              <span className="selo-ia" title="Valores lidos do talão com IA">
                                IA
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="neutro" style={{ fontSize: '.8rem' }}>
                            manual
                          </span>
                        )}
                      </td>
                      <td>
                        {(meu || isAdmin) && (
                          <div className="linha linha--fim" style={{ flexWrap: 'nowrap' }}>
                            {meu && (
                              <button className="btn btn--p" onClick={() => abrirEdicao(r)}>
                                Editar
                              </button>
                            )}
                            <button className="btn btn--p btn--perigo" onClick={() => setParaApagar(r)}>
                              Apagar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!telemovel && lista.some((r) => r.notas) && (
        <div className="cartao" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 10 }}>Notas</h3>
          {lista
            .filter((r) => r.notas)
            .map((r) => (
              <div key={r.id} style={{ marginBottom: 8, fontSize: '.88rem' }}>
                <span className="neutro">
                  {dataCurta(r.data)} · {primeiroNome(participanteDe(r.uid)?.nome || '—')}:
                </span>{' '}
                {r.notas}
              </div>
            ))}
        </div>
      )}

      <ModalRegisto
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        evento={evento}
        participante={aEditar ? participanteDe(aEditar.uid) || euParticipante : euParticipante}
        registo={aEditar}
      />

      <Confirmacao
        aberto={Boolean(paraApagar)}
        titulo="Apagar registo"
        mensagem={`Apagar a pesagem de ${dataCurta(paraApagar?.data)}? A foto do talão também desaparece.`}
        aoFechar={() => setParaApagar(null)}
        aoConfirmar={confirmarApagar}
      />

      <Lupa url={lupa} aoFechar={() => setLupa('')} />
    </>
  )
}
