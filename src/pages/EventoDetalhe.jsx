import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useEvento } from '../hooks/useEventos'
import { useAuth } from '../contexts/AuthContext'
import { Carregar, Vazio } from '../components/Comuns'
import ModalInscricao from '../components/evento/ModalInscricao'
import ModalRegisto from '../components/evento/ModalRegisto'
import TabResumo from '../components/evento/TabResumo'
import TabRegistos from '../components/evento/TabRegistos'
import TabEvolucao from '../components/evento/TabEvolucao'
import TabClassificacao from '../components/evento/TabClassificacao'
import TabGaleria from '../components/evento/TabGaleria'
import TabDocumentos from '../components/evento/TabDocumentos'
import TabParticipantes from '../components/evento/TabParticipantes'
import { estadoEvento, ROTULO_ESTADO } from '../lib/calculos'
import { dataCurta } from '../lib/formato'

const SEPARADORES = [
  { id: 'resumo', nome: 'Resumo' },
  { id: 'registos', nome: 'Pesagens' },
  { id: 'evolucao', nome: 'Evolução' },
  { id: 'classificacao', nome: 'Classificação' },
  { id: 'galeria', nome: 'Galeria' },
  { id: 'documentos', nome: 'Documentos' },
  { id: 'participantes', nome: 'Participantes' }
]

export default function EventoDetalhe() {
  const { eventoId } = useParams()
  const { isAdmin } = useAuth()
  const {
    evento,
    participantes,
    registos,
    galeria,
    documentos,
    souParticipante,
    euParticipante,
    podeVerDados,
    aCarregar
  } = useEvento(eventoId)

  const [separador, setSeparador] = useState('resumo')
  const [modalInscricao, setModalInscricao] = useState(false)
  const [modalRegisto, setModalRegisto] = useState(false)

  if (aCarregar) return <Carregar texto="A carregar o desafio…" />

  if (!evento) {
    return (
      <Vazio titulo="Evento não encontrado">
        Pode ter sido apagado. <Link to="/">Voltar à lista</Link>.
      </Vazio>
    )
  }

  const estado = estadoEvento(evento)
  const podeInscrever =
    !souParticipante && evento.inscricoesAbertas !== false && estado !== 'encerrado'

  return (
    <>
      <div className="secao__topo">
        <div>
          <div className="linha" style={{ gap: 10 }}>
            <h1>{evento.nome}</h1>
            <span className={`distintivo distintivo--${estado}`}>{ROTULO_ESTADO[estado]}</span>
          </div>
          <p className="subtitulo" style={{ marginTop: 6 }}>
            {dataCurta(evento.dataInicio)} → {dataCurta(evento.dataFim)} ·{' '}
            {participantes.length} {participantes.length === 1 ? 'inscrito' : 'inscritos'}
          </p>
        </div>

        <div className="linha">
          {podeInscrever && (
            <button className="btn btn--principal" onClick={() => setModalInscricao(true)}>
              Entrar no desafio
            </button>
          )}
          {souParticipante && (
            <button className="btn btn--principal" onClick={() => setModalRegisto(true)}>
              Registar pesagem
            </button>
          )}
          {isAdmin && (
            <Link to="/admin" className="btn">
              Gerir
            </Link>
          )}
        </div>
      </div>

      {!souParticipante && !isAdmin && (
        <div className="alerta alerta--aviso" style={{ marginBottom: 18 }}>
          {podeInscrever ? (
            <>
              Ainda não estás inscrito. Entra no desafio para veres as pesagens, os gráficos e as
              fotos do grupo.
            </>
          ) : (
            <>As inscrições deste desafio estão fechadas. Fala com o administrador.</>
          )}
        </div>
      )}

      {estado === 'ativo' && evento.inscricoesAbertas !== false && souParticipante && (
        <div className="alerta" style={{ marginBottom: 18 }}>
          O desafio já começou, mas as inscrições continuam abertas — quem entrar agora começa a
          contar a partir da primeira pesagem.
        </div>
      )}

      {podeVerDados ? (
        <>
          <nav className="separadores">
            {SEPARADORES.map((s) => (
              <button
                key={s.id}
                className={`separador ${separador === s.id ? 'separador--ativo' : ''}`}
                onClick={() => setSeparador(s.id)}
              >
                {s.nome}
              </button>
            ))}
          </nav>

          {separador === 'resumo' && (
            <TabResumo
              evento={evento}
              participantes={participantes}
              registos={registos}
              euParticipante={euParticipante}
            />
          )}
          {separador === 'registos' && (
            <TabRegistos
              evento={evento}
              participantes={participantes}
              registos={registos}
              euParticipante={euParticipante}
              souParticipante={souParticipante}
            />
          )}
          {separador === 'evolucao' && (
            <TabEvolucao evento={evento} participantes={participantes} registos={registos} />
          )}
          {separador === 'classificacao' && (
            <TabClassificacao evento={evento} participantes={participantes} registos={registos} />
          )}
          {separador === 'galeria' && (
            <TabGaleria
              evento={evento}
              participantes={participantes}
              galeria={galeria}
              souParticipante={souParticipante}
            />
          )}
          {separador === 'documentos' && (
            <TabDocumentos
              evento={evento}
              participantes={participantes}
              documentos={documentos}
              souParticipante={souParticipante}
            />
          )}
          {separador === 'participantes' && (
            <TabParticipantes
              evento={evento}
              participantes={participantes}
              registos={registos}
              euParticipante={euParticipante}
            />
          )}
        </>
      ) : (
        <Vazio titulo="Conteúdo reservado aos participantes">
          As pesagens, os gráficos e as fotos só ficam visíveis depois de entrares no desafio.
        </Vazio>
      )}

      <ModalInscricao
        aberto={modalInscricao}
        aoFechar={() => setModalInscricao(false)}
        eventoId={evento.id}
        participantes={participantes}
        euParticipante={euParticipante}
      />

      <ModalRegisto
        aberto={modalRegisto}
        aoFechar={() => setModalRegisto(false)}
        evento={evento}
        participante={euParticipante}
      />
    </>
  )
}
