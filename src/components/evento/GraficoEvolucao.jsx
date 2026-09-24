import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { dadosGrafico } from '../../lib/calculos'
import { corPorId, formaPorCor, tracoPorCor } from '../../lib/cores'
import { comSinal, comUnidade, dataDeMs, diaMes, primeiroNome } from '../../lib/formato'

const COR_SUPERFICIE = '#171b25'
const COR_GRELHA = '#262c3a'
const COR_TEXTO = '#98a1b5'

// Marcador com forma própria por participante: a cor nunca é a única pista.
function Marcador(props) {
  const { cx, cy, forma, cor } = props
  if (cx === null || cy === null || cx === undefined || cy === undefined) return null
  const r = 4.5
  const comum = { fill: cor, stroke: COR_SUPERFICIE, strokeWidth: 2 }

  switch (forma) {
    case 'quadrado':
      return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx={1} {...comum} />
    case 'quadradoVazio':
      return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx={1} fill={COR_SUPERFICIE} stroke={cor} strokeWidth={2.2} />
    case 'triangulo':
      return <polygon points={`${cx},${cy - r - 1} ${cx + r + 1},${cy + r} ${cx - r - 1},${cy + r}`} {...comum} />
    case 'losango':
      return <polygon points={`${cx},${cy - r - 1} ${cx + r + 1},${cy} ${cx},${cy + r + 1} ${cx - r - 1},${cy}`} {...comum} />
    case 'cruz':
      return (
        <g stroke={cor} strokeWidth={2.6} strokeLinecap="round">
          <line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} />
          <line x1={cx - r} y1={cy + r} x2={cx + r} y2={cy - r} />
        </g>
      )
    case 'estrela':
      return (
        <g stroke={cor} strokeWidth={2.4} strokeLinecap="round">
          <line x1={cx} y1={cy - r - 1} x2={cx} y2={cy + r + 1} />
          <line x1={cx - r - 1} y1={cy} x2={cx + r + 1} y2={cy} />
          <line x1={cx - r} y1={cy - r} x2={cx + r} y2={cy + r} />
        </g>
      )
    case 'circuloVazio':
      return <circle cx={cx} cy={cy} r={r} fill={COR_SUPERFICIE} stroke={cor} strokeWidth={2.2} />
    default:
      return <circle cx={cx} cy={cy} r={r} {...comum} />
  }
}

// Miniatura do traço usada na legenda.
function AmostraLinha({ cor, traco, forma }) {
  return (
    <svg width="30" height="12" aria-hidden="true">
      <line
        x1="1"
        y1="6"
        x2="29"
        y2="6"
        stroke={cor}
        strokeWidth="2"
        strokeDasharray={traco === '0' ? undefined : traco}
      />
      <g transform="translate(15,6)">
        <Marcador cx={0} cy={0} cor={cor} forma={forma} />
      </g>
    </svg>
  )
}

function Dica({ active, payload, label, participantes, cat, vista }) {
  if (!active || !payload?.length) return null
  const linhas = payload
    .filter((p) => p.value !== null && p.value !== undefined)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

  if (!linhas.length) return null

  return (
    <div className="dica">
      <div className="dica__data">{dataDeMs(label)}</div>
      {linhas.map((p) => {
        const participante = participantes.find((x) => x.uid === p.dataKey)
        const cor = corPorId(participante?.cor)
        return (
          <div className="dica__linha" key={p.dataKey}>
            <AmostraLinha cor={cor} traco={tracoPorCor(participante?.cor)} forma={formaPorCor(participante?.cor)} />
            <span style={{ flex: 1 }}>{primeiroNome(participante?.nome)}</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
              {vista === 'variacao'
                ? comSinal(p.value, cat.casas, cat.unidade)
                : comUnidade(p.value, cat)}
            </strong>
          </div>
        )
      })}
    </div>
  )
}

export default function GraficoEvolucao({ participantes, registos, cat, vista }) {
  const [ocultos, setOcultos] = useState([])

  const visiveis = participantes.filter((p) => !ocultos.includes(p.uid))
  const dados = useMemo(
    () => dadosGrafico(visiveis, registos, cat.id, vista),
    [visiveis, registos, cat.id, vista]
  )

  const temDados = dados.some((linha) =>
    visiveis.some((p) => linha[p.uid] !== undefined && linha[p.uid] !== null)
  )

  // Índice do último ponto de cada série, para lá pousar o nome do participante:
  // assim a identidade não depende só da cor.
  const ultimoIndice = useMemo(() => {
    const mapa = {}
    visiveis.forEach((p) => {
      let indice = -1
      dados.forEach((linha, i) => {
        if (linha[p.uid] !== undefined && linha[p.uid] !== null) indice = i
      })
      mapa[p.uid] = indice
    })
    return mapa
  }, [dados, visiveis])

  const comEtiquetas = visiveis.length <= 4

  function alternar(uid) {
    setOcultos((atuais) =>
      atuais.includes(uid) ? atuais.filter((u) => u !== uid) : [...atuais, uid]
    )
  }

  return (
    <div>
      {temDados ? (
        <>
          <div className="grafico">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dados} margin={{ top: 12, right: comEtiquetas ? 86 : 24, bottom: 4, left: 0 }}>
                <CartesianGrid stroke={COR_GRELHA} strokeDasharray="3 4" vertical={false} />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={diaMes}
                  stroke={COR_GRELHA}
                  tick={{ fill: COR_TEXTO, fontSize: 12 }}
                  tickMargin={8}
                  minTickGap={36}
                />
                <YAxis
                  stroke={COR_GRELHA}
                  tick={{ fill: COR_TEXTO, fontSize: 12 }}
                  tickMargin={6}
                  width={54}
                  domain={['auto', 'auto']}
                  unit={cat.unidade ? ` ${cat.unidade}` : ''}
                />
                <Tooltip
                  content={<Dica participantes={participantes} cat={cat} vista={vista} />}
                  cursor={{ stroke: '#45506a', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                {vista === 'variacao' && <ReferenceLine y={0} stroke="#45506a" strokeWidth={1.5} />}

                {visiveis.map((p) => {
                  const cor = corPorId(p.cor)
                  const traco = tracoPorCor(p.cor)
                  const forma = formaPorCor(p.cor)
                  return (
                    <Line
                      key={p.uid}
                      type="monotone"
                      dataKey={p.uid}
                      name={p.nome}
                      stroke={cor}
                      strokeWidth={2}
                      strokeDasharray={traco === '0' ? undefined : traco}
                      connectNulls
                      isAnimationActive={false}
                      dot={<Marcador cor={cor} forma={forma} />}
                      activeDot={<Marcador cor={cor} forma={forma} />}
                    >
                      {comEtiquetas && (
                        <LabelList
                          dataKey={p.uid}
                          content={(props) =>
                            props.index === ultimoIndice[p.uid] ? (
                              <text
                                x={props.x + 10}
                                y={props.y}
                                dy={4}
                                fill={COR_TEXTO}
                                fontSize={12}
                                fontWeight={600}
                              >
                                {primeiroNome(p.nome)}
                              </text>
                            ) : null
                          }
                        />
                      )}
                    </Line>
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grafico-legenda">
            {participantes.map((p) => {
              const escondido = ocultos.includes(p.uid)
              return (
                <button
                  key={p.uid}
                  type="button"
                  className={`grafico-legenda__item ${escondido ? 'grafico-legenda__item--off' : ''}`}
                  onClick={() => alternar(p.uid)}
                  style={{ background: 'none', border: 'none', padding: 0 }}
                  title={escondido ? 'Mostrar no gráfico' : 'Esconder do gráfico'}
                >
                  <AmostraLinha cor={corPorId(p.cor)} traco={tracoPorCor(p.cor)} forma={formaPorCor(p.cor)} />
                  {primeiroNome(p.nome)}
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div className="vazio">
          <div className="vazio__titulo">Ainda não há dados para este gráfico</div>
          Assim que houver pesagens registadas em {cat.nome.toLowerCase()}, a evolução aparece aqui.
        </div>
      )}
    </div>
  )
}
