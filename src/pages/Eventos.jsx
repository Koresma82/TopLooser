import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEventos, useMinhasInscricoes } from '../hooks/useEventos'
import { Carregar, Vazio } from '../components/Comuns'
import { estadoEvento, ROTULO_ESTADO, progressoEvento } from '../lib/calculos'
import { categoriasDoEvento } from '../lib/categorias'
import { dataCurta } from '../lib/formato'

function CartaoEvento({ evento, inscrito }) {
  const estado = estadoEvento(evento)
  const progresso = progressoEvento(evento)
  const cats = categoriasDoEvento(evento)

  return (
    <Link to={`/evento/${evento.id}`} className="cartao-evento">
      <div className="linha linha--espaco" style={{ alignItems: 'flex-start' }}>
        <h3>{evento.nome}</h3>
        <span className={`distintivo distintivo--${estado}`}>{ROTULO_ESTADO[estado]}</span>
      </div>

      {evento.descricao && (
        <p className="subtitulo" style={{ marginTop: 8 }}>
          {evento.descricao}
        </p>
      )}

      <div className="subtitulo" style={{ marginTop: 10, fontSize: '.84rem' }}>
        {dataCurta(evento.dataInicio)} → {dataCurta(evento.dataFim)}
      </div>

      {progresso !== null && estado === 'ativo' && (
        <div className="barra-progresso" style={{ marginTop: 10 }}>
          <div className="barra-progresso__interior" style={{ width: `${progresso}%` }} />
        </div>
      )}

      <div className="chips" style={{ marginTop: 13 }}>
        {cats.slice(0, 4).map((c) => (
          <span key={c.id} className="chip" style={{ pointerEvents: 'none' }}>
            {c.curto}
          </span>
        ))}
        {cats.length > 4 && <span className="chip" style={{ pointerEvents: 'none' }}>+{cats.length - 4}</span>}
      </div>

      <div className="linha" style={{ marginTop: 13 }}>
        {inscrito ? (
          <span className="distintivo distintivo--ativo">Estás inscrito</span>
        ) : evento.inscricoesAbertas && estado !== 'encerrado' ? (
          <span className="distintivo">Inscrições abertas</span>
        ) : (
          <span className="distintivo">Inscrições fechadas</span>
        )}
      </div>
    </Link>
  )
}

export default function Eventos() {
  const { isAdmin, nome } = useAuth()
  const { eventos, aCarregar, erro } = useEventos()
  const { ids } = useMinhasInscricoes()

  if (aCarregar) return <Carregar texto="A carregar eventos…" />

  const meus = eventos.filter((e) => ids.includes(e.id))
  const outros = eventos.filter((e) => !ids.includes(e.id))

  return (
    <>
      <div className="secao__topo">
        <div>
          <h1>Olá, {String(nome).split(' ')[0]}</h1>
          <p className="subtitulo">Os teus desafios e os que estão abertos a inscrições.</p>
        </div>
        {isAdmin && (
          <Link to="/admin" className="btn btn--principal">
            Criar evento
          </Link>
        )}
      </div>

      {erro && (
        <div className="alerta alerta--erro" style={{ marginBottom: 20 }}>
          Não foi possível carregar os eventos. Confirma as regras do Firestore.
        </div>
      )}

      {!eventos.length && (
        <Vazio titulo="Ainda não há eventos">
          {isAdmin
            ? 'Cria o primeiro desafio em "Criar evento".'
            : 'Assim que o administrador criar um desafio, ele aparece aqui.'}
        </Vazio>
      )}

      {meus.length > 0 && (
        <section className="secao">
          <div className="secao__topo">
            <h2>Os meus desafios</h2>
          </div>
          <div className="grelha grelha--2">
            {meus.map((e) => (
              <CartaoEvento key={e.id} evento={e} inscrito />
            ))}
          </div>
        </section>
      )}

      {outros.length > 0 && (
        <section className="secao">
          <div className="secao__topo">
            <h2>{meus.length ? 'Outros desafios' : 'Desafios'}</h2>
          </div>
          <div className="grelha grelha--2">
            {outros.map((e) => (
              <CartaoEvento key={e.id} evento={e} inscrito={false} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
