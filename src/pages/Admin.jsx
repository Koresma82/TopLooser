import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEventos } from '../hooks/useEventos'
import { useToast } from '../contexts/ToastContext'
import { Carregar, Confirmacao, Modal, Vazio } from '../components/Comuns'
import { CATEGORIAS, CATEGORIAS_PREDEFINIDAS } from '../lib/categorias'
import { estadoEvento, ROTULO_ESTADO } from '../lib/calculos'
import { dataCurta, hojeISO } from '../lib/formato'
import { apagarEvento, atualizarEvento, criarEvento, encerrarEvento } from '../lib/servicos'
import { useEstatisticasAdmin } from '../hooks/useAdmin'
import PainelEstatisticas from '../components/admin/PainelEstatisticas'
import PainelAuditoria from '../components/admin/PainelAuditoria'

const SEPARADORES_ADMIN = [
  { id: 'eventos', nome: 'Eventos' },
  { id: 'estatisticas', nome: 'Estatísticas' },
  { id: 'auditoria', nome: 'Auditoria' }
]

const FORM_VAZIO = {
  nome: '',
  descricao: '',
  dataInicio: hojeISO(),
  dataFim: '',
  categorias: [...CATEGORIAS_PREDEFINIDAS],
  modoRanking: 'percentual',
  inscricoesAbertas: true,
  premio: ''
}

export default function Admin() {
  const { utilizador } = useAuth()
  const { eventos, aCarregar } = useEventos()
  const toast = useToast()

  const [separador, setSeparador] = useState('eventos')
  const estatisticas = useEstatisticasAdmin()
  const [form, setForm] = useState(FORM_VAZIO)
  const [aEditar, setAEditar] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [aGravar, setAGravar] = useState(false)
  const [paraApagar, setParaApagar] = useState(null)

  function abrirNovo() {
    setForm(FORM_VAZIO)
    setAEditar(null)
    setModalAberto(true)
  }

  function abrirEdicao(evento) {
    setForm({
      nome: evento.nome || '',
      descricao: evento.descricao || '',
      dataInicio: evento.dataInicio || hojeISO(),
      dataFim: evento.dataFim || '',
      categorias: evento.categorias?.length ? [...evento.categorias] : [...CATEGORIAS_PREDEFINIDAS],
      modoRanking: evento.modoRanking || 'percentual',
      inscricoesAbertas: evento.inscricoesAbertas !== false,
      premio: evento.premio || ''
    })
    setAEditar(evento)
    setModalAberto(true)
  }

  function alternarCategoria(id) {
    setForm((f) => ({
      ...f,
      categorias: f.categorias.includes(id)
        ? f.categorias.filter((c) => c !== id)
        : [...f.categorias, id]
    }))
  }

  function validar() {
    if (!form.nome.trim()) return 'Dá um nome ao desafio.'
    if (!form.dataInicio) return 'Escolhe a data de início.'
    if (!form.dataFim) return 'Escolhe a data final — é quando são revelados os vencedores.'
    if (form.dataFim < form.dataInicio) return 'A data final tem de ser depois da data de início.'
    if (!form.categorias.length) return 'Escolhe pelo menos uma categoria.'
    // O IMC precisa do peso para ser calculado.
    if (form.categorias.includes('imc') && !form.categorias.includes('peso')) {
      return 'Para acompanhar o IMC tens de incluir também o peso — é dele que o IMC é calculado.'
    }
    return null
  }

  async function gravar() {
    const problema = validar()
    if (problema) {
      toast.erro(problema)
      return
    }
    setAGravar(true)
    try {
      if (aEditar) {
        await atualizarEvento(aEditar.id, {
          nome: form.nome.trim(),
          descricao: form.descricao.trim(),
          dataInicio: form.dataInicio,
          dataFim: form.dataFim,
          categorias: form.categorias,
          modoRanking: form.modoRanking,
          inscricoesAbertas: form.inscricoesAbertas,
          premio: form.premio.trim()
        }, utilizador, form.nome.trim())
        toast.sucesso('Evento atualizado.')
      } else {
        await criarEvento(form, utilizador)
        toast.sucesso('Evento criado.')
      }
      setModalAberto(false)
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível gravar o evento.')
    } finally {
      setAGravar(false)
    }
  }

  async function alternarEncerramento(evento) {
    try {
      await encerrarEvento(evento.id, evento.estado !== 'encerrado', utilizador, evento.nome)
      toast.sucesso(evento.estado === 'encerrado' ? 'Evento reaberto.' : 'Evento encerrado.')
    } catch {
      toast.erro('Não foi possível alterar o estado do evento.')
    }
  }

  async function confirmarApagar() {
    const evento = paraApagar
    setParaApagar(null)
    try {
      await apagarEvento(evento.id, utilizador, evento.nome)
      toast.sucesso('Evento apagado.')
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível apagar o evento.')
    }
  }

  if (aCarregar) return <Carregar />

  return (
    <>
      <div className="secao__topo">
        <div>
          <h1>Administração</h1>
          <p className="subtitulo">
            Só tu vês este ecrã: criar e configurar desafios, ver quem usa a aplicação e o
            registo do que se passou.
          </p>
        </div>
        {separador === 'eventos' && (
          <button className="btn btn--principal" onClick={abrirNovo}>
            Criar evento
          </button>
        )}
      </div>

      <nav className="separadores">
        {SEPARADORES_ADMIN.map((s) => (
          <button
            key={s.id}
            className={`separador ${separador === s.id ? 'separador--ativo' : ''}`}
            onClick={() => setSeparador(s.id)}
          >
            {s.nome}
          </button>
        ))}
      </nav>

      {separador === 'estatisticas' && <PainelEstatisticas dados={estatisticas} />}
      {separador === 'auditoria' && <PainelAuditoria dados={estatisticas} />}

      {separador === 'eventos' && (!eventos.length ? (
        <Vazio titulo="Ainda não criaste nenhum evento">
          Começa por criar o desafio e depois partilha o link com o pessoal.
        </Vazio>
      ) : (
        <div className="cartao cartao--limpo">
          <div className="tabela-envolvente">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Datas</th>
                  <th>Estado</th>
                  <th>Inscrições</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {eventos.map((e) => {
                  const estado = estadoEvento(e)
                  return (
                    <tr key={e.id}>
                      <td>
                        <Link to={`/evento/${e.id}`} style={{ fontWeight: 600 }}>
                          {e.nome}
                        </Link>
                        {e.descricao && (
                          <div style={{ fontSize: '.8rem', color: 'var(--texto-fraco)' }}>
                            {e.descricao}
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {dataCurta(e.dataInicio)} → {dataCurta(e.dataFim)}
                      </td>
                      <td>
                        <span className={`distintivo distintivo--${estado}`}>{ROTULO_ESTADO[estado]}</span>
                      </td>
                      <td>{e.inscricoesAbertas !== false ? 'Abertas' : 'Fechadas'}</td>
                      <td>
                        <div className="linha linha--fim" style={{ flexWrap: 'nowrap' }}>
                          <button className="btn btn--p" onClick={() => abrirEdicao(e)}>
                            Editar
                          </button>
                          <button className="btn btn--p" onClick={() => alternarEncerramento(e)}>
                            {e.estado === 'encerrado' ? 'Reabrir' : 'Encerrar'}
                          </button>
                          <button className="btn btn--p btn--perigo" onClick={() => setParaApagar(e)}>
                            Apagar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Modal
        titulo={aEditar ? 'Editar evento' : 'Criar evento'}
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        rodape={
          <>
            <button className="btn" onClick={() => setModalAberto(false)} disabled={aGravar}>
              Cancelar
            </button>
            <button className="btn btn--principal" onClick={gravar} disabled={aGravar}>
              {aGravar ? 'A gravar…' : aEditar ? 'Guardar alterações' : 'Criar evento'}
            </button>
          </>
        }
      >
        <div className="campo">
          <label className="campo__etiqueta">Nome do desafio</label>
          <input
            type="text"
            value={form.nome}
            placeholder="Ex.: Desafio de IMC — Verão"
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        </div>

        <div className="campo">
          <label className="campo__etiqueta">Descrição</label>
          <textarea
            value={form.descricao}
            placeholder="As regras em duas linhas, o prémio, o que estiver combinado…"
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />
        </div>

        <div className="grelha-campos">
          <div className="campo">
            <label className="campo__etiqueta">Início</label>
            <input
              type="date"
              value={form.dataInicio}
              onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
            />
          </div>
          <div className="campo">
            <label className="campo__etiqueta">Fim</label>
            <input
              type="date"
              value={form.dataFim}
              onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
            />
            <span className="campo__ajuda">Os vencedores são revelados nesta data.</span>
          </div>
        </div>

        <div className="campo">
          <label className="campo__etiqueta">Categorias a acompanhar</label>
          <div className="chips">
            {CATEGORIAS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip ${form.categorias.includes(c.id) ? 'chip--ativo' : ''}`}
                onClick={() => alternarCategoria(c.id)}
              >
                {c.nome}
                {c.unidade ? ` (${c.unidade})` : ''}
              </button>
            ))}
          </div>
          <span className="campo__ajuda">
            O IMC é calculado automaticamente a partir do peso e da altura de cada participante.
          </span>
        </div>

        <div className="campo">
          <label className="campo__etiqueta">Critério de vitória</label>
          <select
            value={form.modoRanking}
            onChange={(e) => setForm({ ...form, modoRanking: e.target.value })}
          >
            <option value="percentual">Variação em percentagem (mais justo entre pesos diferentes)</option>
            <option value="absoluto">Variação absoluta (kg, pontos de IMC, cm)</option>
          </select>
          <span className="campo__ajuda">
            Durante o desafio qualquer pessoa pode alternar entre os dois na classificação. Este é o
            critério usado para apurar os vencedores no fim.
          </span>
        </div>

        <div className="campo">
          <label className="campo__etiqueta">Prémio (opcional)</label>
          <input
            type="text"
            value={form.premio}
            placeholder="Ex.: jantar pago pelos derrotados"
            onChange={(e) => setForm({ ...form, premio: e.target.value })}
          />
        </div>

        <div className="campo campo--inline">
          <input
            id="inscricoes"
            type="checkbox"
            checked={form.inscricoesAbertas}
            onChange={(e) => setForm({ ...form, inscricoesAbertas: e.target.checked })}
          />
          <label htmlFor="inscricoes" className="campo__etiqueta" style={{ margin: 0 }}>
            Aceitar inscrições, mesmo depois de o desafio ter começado
          </label>
        </div>
      </Modal>

      <Confirmacao
        aberto={Boolean(paraApagar)}
        titulo="Apagar evento"
        mensagem={`Isto apaga o evento "${paraApagar?.nome || ''}", todos os registos, fotos e documentos. Não há volta atrás.`}
        aoFechar={() => setParaApagar(null)}
        aoConfirmar={confirmarApagar}
      />
    </>
  )
}
