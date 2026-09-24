import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useEvento } from '../hooks/useEventos'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
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
import NavInferior from '../components/evento/NavInferior'
import { useTelemovel } from '../hooks/useEcra'
import { estadoEvento, ROTULO_ESTADO } from '../lib/calculos'
import { dataCurta } from '../lib/formato'
import { atualizarEvento } from '../lib/servicos'

// Separadores de quem está no evento (ou do admin).
// 'curto' e 'icone' são para a barra de baixo, no telemóvel.
const SEPARADORES = [
  { id: 'resumo', nome: 'Resumo', curto: 'Resumo', icone: 'desafios' },
  { id: 'evolucao', nome: 'Evolução', curto: 'Evolução', icone: 'datas' },
  { id: 'classificacao', nome: 'Classificação', curto: 'Tops', icone: 'tops' },
  { id: 'registos', nome: 'Pesagens', curto: 'Pesagens', icone: 'imc' },
  { id: 'galeria', nome: 'Galeria', curto: 'Galeria', traco: 'galeria' },
  { id: 'documentos', nome: 'Documentos', curto: 'Docs', traco: 'documentos' },
  { id: 'participantes', nome: 'Participantes', curto: 'Grupo', traco: 'participantes' }
]

// Quem só está a assistir vê os números e mais nada: nem fotos dos talões,
// nem galeria, nem o contrato assinado.
const SEPARADORES_ESPECTADOR = [
  { id: 'evolucao', nome: 'Evolução', curto: 'Evolução', icone: 'datas' },
  { id: 'classificacao', nome: 'Classificação', curto: 'Tops', icone: 'tops' }
]

export default function EventoDetalhe() {
  const { eventoId } = useParams()
  const { isAdmin, utilizador } = useAuth()
  const toast = useToast()
  const telemovel = useTelemovel()
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
  const [aAlternar, setAAlternar] = useState(false)

  const separadores = podeVerDados ? SEPARADORES : SEPARADORES_ESPECTADOR

  // Se o papel mudar (inscrever-se, ou ser removido), o separador aberto pode
  // deixar de existir.
  useEffect(() => {
    if (!separadores.some((s) => s.id === separador)) {
      setSeparador(separadores[0]?.id || 'evolucao')
    }
  }, [separadores, separador])

  if (aCarregar) return <Carregar texto="A carregar o desafio…" />

  if (!evento) {
    return (
      <Vazio titulo="Evento não encontrado">
        Pode ter sido apagado. <Link to="/">Voltar à lista</Link>.
      </Vazio>
    )
  }

  const estado = estadoEvento(evento)
  const inscricoesAbertas = evento.inscricoesAbertas !== false && estado !== 'encerrado'
  const podeInscrever = !souParticipante && inscricoesAbertas

  async function alternarInscricoes() {
    setAAlternar(true)
    try {
      await atualizarEvento(
        evento.id,
        { inscricoesAbertas: evento.inscricoesAbertas === false },
        utilizador,
        evento.nome
      )
      toast.sucesso(
        evento.inscricoesAbertas === false ? 'Inscrições abertas.' : 'Inscrições fechadas.'
      )
    } catch {
      toast.erro('Não foi possível alterar as inscrições.')
    } finally {
      setAAlternar(false)
    }
  }

  return (
    <>
      <div className="secao__topo">
        <div>
          <div className="linha" style={{ gap: 10 }}>
            <h1>{evento.nome}</h1>
            <span className={`distintivo distintivo--${estado}`}>{ROTULO_ESTADO[estado]}</span>
            {!souParticipante && !isAdmin && <span className="distintivo">A assistir</span>}
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
          {souParticipante && !telemovel && (
            <button className="btn btn--principal" onClick={() => setModalRegisto(true)}>
              Registar pesagem
            </button>
          )}
          {isAdmin && !telemovel && (
            <Link to="/admin" className="btn">
              Gerir
            </Link>
          )}
        </div>
      </div>

      {/* Barra do administrador: abrir e fechar inscrições sem sair daqui */}
      {isAdmin && (
        <div className="barra-admin">
          <span className="barra-admin__rotulo">Administração</span>
          <span>
            Inscrições{' '}
            <strong className={inscricoesAbertas ? 'bom' : 'neutro'}>
              {evento.inscricoesAbertas === false ? 'fechadas' : 'abertas'}
            </strong>
            {estado === 'encerrado' && ' · evento encerrado'}
          </span>
          <button className="btn btn--p" onClick={alternarInscricoes} disabled={aAlternar}>
            {evento.inscricoesAbertas === false ? 'Abrir' : 'Fechar'}
          </button>
          {telemovel && (
            <Link to="/admin" className="btn btn--p">
              Gerir
            </Link>
          )}
          <span className="barra-admin__nota so-computador">
            Para remover alguém, vai ao separador <em>Participantes</em>.
          </span>
        </div>
      )}

      {!souParticipante && !isAdmin && (separador === 'evolucao' || !telemovel) && (
        <div className="alerta" style={{ marginBottom: 18 }}>
          {podeInscrever ? (
            <>
              Estás a assistir a este desafio: vês a evolução e a classificação, mas não
              registas pesagens. <strong>Entra no desafio</strong> para competires.
            </>
          ) : (
            <>
              Estás a assistir a este desafio. Vês a evolução e a classificação; as pesagens
              com os talões, as fotos e os documentos são só para quem está inscrito.
              {evento.inscricoesAbertas === false && ' As inscrições estão fechadas.'}
            </>
          )}
        </div>
      )}

      {estado === 'ativo' && inscricoesAbertas && souParticipante && !telemovel && (
        <div className="alerta" style={{ marginBottom: 18 }}>
          O desafio já começou, mas as inscrições continuam abertas — quem entrar agora começa a
          contar a partir da primeira pesagem.
        </div>
      )}

      <nav className="separadores separadores--evento">
        {separadores.map((s) => (
          <button
            key={s.id}
            className={`separador ${separador === s.id ? 'separador--ativo' : ''}`}
            onClick={() => setSeparador(s.id)}
          >
            {s.nome}
          </button>
        ))}
      </nav>

      {separador === 'resumo' && podeVerDados && (
        <TabResumo
          evento={evento}
          participantes={participantes}
          registos={registos}
          euParticipante={euParticipante}
        />
      )}
      {separador === 'registos' && podeVerDados && (
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
      {separador === 'galeria' && podeVerDados && (
        <TabGaleria
          evento={evento}
          participantes={participantes}
          galeria={galeria}
          souParticipante={souParticipante}
        />
      )}
      {separador === 'documentos' && podeVerDados && (
        <TabDocumentos
          evento={evento}
          participantes={participantes}
          documentos={documentos}
          souParticipante={souParticipante}
        />
      )}
      {separador === 'participantes' && podeVerDados && (
        <TabParticipantes
          evento={evento}
          participantes={participantes}
          registos={registos}
          euParticipante={euParticipante}
        />
      )}

      {telemovel && (
        <>
          <div className="espaco-nav" />
          <NavInferior
            separadores={separadores}
            separador={separador}
            aoEscolher={setSeparador}
          />
          {souParticipante && (
            <button
              className="acao-flutuante"
              onClick={() => setModalRegisto(true)}
              aria-label="Registar pesagem"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Pesagem
            </button>
          )}
        </>
      )}

      <ModalInscricao
        aberto={modalInscricao}
        aoFechar={() => setModalInscricao(false)}
        eventoId={evento.id}
        nomeEvento={evento.nome}
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
