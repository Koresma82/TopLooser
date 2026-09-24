import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Avatar, Carregar, Estatistica, IconeMarca, Vazio } from '../Comuns'
import { useTelemovel } from '../../hooks/useEcra'
import { dataHora, diaMes, haQuantoTempo, numero } from '../../lib/formato'
import { rotuloAcao } from '../../lib/auditoria'

const COR_GRELHA = '#262c3a'
const COR_TEXTO = '#98a1b5'
const COR_BARRA = '#22d36f'

function Dica({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const n = payload[0].value
  return (
    <div className="dica">
      <div className="dica__data">{label}</div>
      <strong>
        {n} {n === 1 ? 'entrada' : 'entradas'}
      </strong>
    </div>
  )
}

function GraficoEntradas({ dados }) {
  const total = dados.reduce((t, d) => t + d.entradas, 0)

  if (!total) {
    return (
      <Vazio titulo="Ainda não há entradas registadas">
        A contagem começa a partir do momento em que esta versão estiver no ar.
      </Vazio>
    )
  }

  const paraGrafico = dados.map((d) => ({
    ...d,
    etiqueta: diaMes(new Date(`${d.dia}T00:00:00`).getTime())
  }))

  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={paraGrafico} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={COR_GRELHA} strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="etiqueta"
            stroke={COR_GRELHA}
            tick={{ fill: COR_TEXTO, fontSize: 11 }}
            tickMargin={8}
            minTickGap={22}
          />
          <YAxis
            stroke={COR_GRELHA}
            tick={{ fill: COR_TEXTO, fontSize: 11 }}
            width={32}
            allowDecimals={false}
            // Sem isto o eixo subia até 4 quando o máximo era 1, e as barras
            // ficavam esmagadas no fundo do gráfico.
            domain={[0, (max) => Math.max(1, max)]}
          />
          <Tooltip content={<Dica />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
          <Bar
            dataKey="entradas"
            fill={COR_BARRA}
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function PainelEstatisticas({ dados }) {
  const telemovel = useTelemovel()
  const { resumo, porUtilizador, entradasPorDia, aCarregar, erro } = dados

  if (aCarregar) return <Carregar texto="A reunir as estatísticas…" />

  if (erro) {
    return (
      <div className="alerta alerta--erro">
        Não foi possível ler as estatísticas. Publica as regras novas com{' '}
        <code>npm run regras:todos</code> — a coleção de auditoria e a de utilizadores só abrem
        ao administrador depois disso.
      </div>
    )
  }

  return (
    <>
      <div className="grelha grelha--4" style={{ marginBottom: 22 }}>
        <Estatistica
          rotulo="Pessoas com conta"
          valor={resumo.utilizadores}
          nota={`${resumo.espectadores} nunca se inscreveram`}
        />
        <Estatistica
          rotulo="Entradas contadas"
          valor={numero(resumo.entradasTotais, 0)}
          nota="desde que a contagem começou"
        />
        <Estatistica
          rotulo="Ativos em 7 dias"
          valor={resumo.ativos7}
          nota={`${resumo.ativos30} nos últimos 30`}
        />
        <Estatistica
          rotulo="Pesagens"
          valor={resumo.registos}
          nota={`${resumo.percentagemIA} % lidas do talão por IA`}
        />
      </div>

      <div className="grelha grelha--4" style={{ marginBottom: 22 }}>
        <Estatistica rotulo="Desafios" valor={resumo.eventos} nota={`${resumo.eventosAbertos} por encerrar`} />
        <Estatistica rotulo="Inscrições" valor={resumo.participacoes} nota="somando todos os desafios" />
        <Estatistica rotulo="Com foto do talão" valor={resumo.comTalao} nota={`de ${resumo.registos} pesagens`} />
        <Estatistica rotulo="Lidas por IA" valor={resumo.comIA} nota="preenchidas automaticamente" />
      </div>

      <section className="secao">
        <div className="secao__topo">
          <div className="linha" style={{ flexWrap: 'nowrap', gap: 12 }}>
            <IconeMarca nome="datas" />
            <div>
              <h2>Entradas por dia</h2>
              <p className="subtitulo">Últimos 30 dias. Uma entrada é uma autenticação nova, não um recarregamento.</p>
            </div>
          </div>
        </div>
        <div className="cartao">
          <GraficoEntradas dados={entradasPorDia} />
        </div>
      </section>

      <section className="secao">
        <div className="secao__topo">
          <div className="linha" style={{ flexWrap: 'nowrap', gap: 12 }}>
            <IconeMarca nome="comunidade" />
            <div>
              <h2>Por pessoa</h2>
              <p className="subtitulo">Quem entrou, quantas vezes e o que anda a fazer.</p>
            </div>
          </div>
        </div>

        {!porUtilizador.length ? (
          <Vazio titulo="Ainda ninguém entrou na aplicação" />
        ) : telemovel ? (
          <div className="lista-cartoes">
            {porUtilizador.map((u) => (
              <div className="cartao-pesagem" key={u.uid}>
                <div className="cartao-pesagem__topo">
                  <Avatar nome={u.nome} fotoURL={u.fotoURL} />
                  <div className="cartao-pesagem__quem">
                    {u.nome}
                    <div className="cartao-pesagem__data">{u.email}</div>
                  </div>
                </div>
                <div className="cartao-pesagem__valores">
                  <div className="cartao-pesagem__valor">
                    <div className="cartao-pesagem__rotulo">Entradas</div>
                    <div className="cartao-pesagem__numero">{u.entradas}</div>
                  </div>
                  <div className="cartao-pesagem__valor">
                    <div className="cartao-pesagem__rotulo">Desafios</div>
                    <div className="cartao-pesagem__numero">{u.eventos}</div>
                  </div>
                  <div className="cartao-pesagem__valor">
                    <div className="cartao-pesagem__rotulo">Pesagens</div>
                    <div className="cartao-pesagem__numero">{u.pesagens}</div>
                  </div>
                </div>
                <div className="cartao-pesagem__nota">
                  Última visita {haQuantoTempo(u.ultima)}
                  {u.ultimaAcao && ` · ${rotuloAcao(u.ultimaAcao.acao).toLowerCase()}`}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="cartao cartao--limpo">
            <div className="tabela-envolvente">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Pessoa</th>
                    <th>Email</th>
                    <th className="num">Entradas</th>
                    <th className="num">Desafios</th>
                    <th className="num">Pesagens</th>
                    <th>Primeira vez</th>
                    <th>Última visita</th>
                  </tr>
                </thead>
                <tbody>
                  {porUtilizador.map((u) => (
                    <tr key={u.uid}>
                      <td>
                        <div className="linha" style={{ flexWrap: 'nowrap', gap: 9 }}>
                          <Avatar nome={u.nome} fotoURL={u.fotoURL} tamanho="p" />
                          <span>{u.nome}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--texto-suave)' }}>{u.email}</td>
                      <td className="num" style={{ fontWeight: 650 }}>
                        {u.entradas}
                      </td>
                      <td className="num">{u.eventos}</td>
                      <td className="num">{u.pesagens}</td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--texto-fraco)', fontSize: '.84rem' }}>
                        {u.primeira ? dataHora(u.primeira) : '—'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {haQuantoTempo(u.ultima)}
                        {u.ultimaAcao && (
                          <div style={{ fontSize: '.76rem', color: 'var(--texto-fraco)' }}>
                            {rotuloAcao(u.ultimaAcao.acao)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
