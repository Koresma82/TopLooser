import { categoria, categoriasDoEvento } from './categorias'
import { hojeISO } from './formato'

// ---------------------------------------------------------------------------
// IMC
// ---------------------------------------------------------------------------

export function calcularImc(pesoKg, alturaCm) {
  const peso = Number(pesoKg)
  const altura = Number(alturaCm)
  if (!peso || !altura) return null
  const m = altura / 100
  const imc = peso / (m * m)
  if (!Number.isFinite(imc)) return null
  return Math.round(imc * 100) / 100
}

export function classeImc(imc) {
  if (imc === null || imc === undefined) return null
  if (imc < 18.5) return 'Abaixo do peso'
  if (imc < 25) return 'Peso normal'
  if (imc < 30) return 'Excesso de peso'
  if (imc < 35) return 'Obesidade grau I'
  if (imc < 40) return 'Obesidade grau II'
  return 'Obesidade grau III'
}

// ---------------------------------------------------------------------------
// Leitura de valores
// ---------------------------------------------------------------------------

// Devolve o valor de uma categoria num registo. O IMC é calculado a partir do
// peso e da altura do participante quando não vem preenchido no registo.
export function valorRegisto(registo, catId, participante) {
  if (!registo) return null
  const direto = registo.valores?.[catId]
  if (direto !== null && direto !== undefined && direto !== '' && Number.isFinite(Number(direto))) {
    return Number(direto)
  }
  if (catId === 'imc') {
    const altura = registo.alturaCm || participante?.alturaCm
    return calcularImc(registo.valores?.peso, altura)
  }
  return null
}

export function registosDoParticipante(registos = [], uid) {
  return registos
    .filter((r) => r.uid === uid)
    .slice()
    .sort((a, b) => String(a.data).localeCompare(String(b.data)))
}

// Série temporal de um participante numa categoria: [{ data, valor, registo }]
export function serieCategoria(registos, uid, catId, participante) {
  return registosDoParticipante(registos, uid)
    .map((r) => ({ data: r.data, valor: valorRegisto(r, catId, participante), registo: r }))
    .filter((p) => p.valor !== null && p.valor !== undefined && Number.isFinite(p.valor))
}

// ---------------------------------------------------------------------------
// Variações
// ---------------------------------------------------------------------------

// Diferença entre a primeira e a última medição.
//  abs      -> variação bruta (negativa quando desce)
//  pct      -> variação em percentagem do valor inicial
//  ganho    -> quanto "contou" para o desafio, já com o sentido certo
//              (numa categoria em que descer é bom, descer 3 kg vale +3)
export function calcularVariacao(serie, cat) {
  if (!serie || serie.length < 2) {
    return { abs: null, pct: null, ganho: null, ganhoPct: null }
  }
  const inicio = serie[0].valor
  const fim = serie[serie.length - 1].valor
  const abs = fim - inicio
  const pct = inicio ? (abs / inicio) * 100 : null
  const sentido = cat?.direcao === 'subir' ? 1 : -1
  return {
    abs,
    pct,
    ganho: abs * sentido,
    ganhoPct: pct === null ? null : pct * sentido
  }
}

// ---------------------------------------------------------------------------
// Classificação
// ---------------------------------------------------------------------------

// modo: 'absoluto' (variação bruta) ou 'percentual' (variação em %)
export function classificacao(participantes = [], registos = [], catId, modo = 'percentual') {
  const cat = categoria(catId)
  const linhas = participantes.map((p) => {
    const serie = serieCategoria(registos, p.uid, catId, p)
    const variacao = calcularVariacao(serie, cat)
    return {
      participante: p,
      serie,
      primeiro: serie[0] || null,
      ultimo: serie.length ? serie[serie.length - 1] : null,
      nRegistos: serie.length,
      ...variacao,
      classificado: serie.length >= 2
    }
  })

  const chave = modo === 'absoluto' ? 'ganho' : 'ganhoPct'

  linhas.sort((a, b) => {
    if (a.classificado !== b.classificado) return a.classificado ? -1 : 1
    if (!a.classificado) {
      return String(a.participante.nome || '').localeCompare(String(b.participante.nome || ''), 'pt')
    }
    return (b[chave] ?? -Infinity) - (a[chave] ?? -Infinity)
  })

  let posicao = 0
  let anterior = null
  linhas.forEach((linha, i) => {
    if (!linha.classificado) {
      linha.posicao = null
      return
    }
    const valor = linha[chave]
    // Empates partilham a mesma posição.
    if (anterior !== null && Math.abs(valor - anterior) < 1e-9) {
      linha.posicao = posicao
    } else {
      posicao = i + 1
      linha.posicao = posicao
      anterior = valor
    }
  })

  return linhas
}

// Pódio de cada categoria do evento: primeiro, segundo e terceiro.
export function vencedores(evento, participantes, registos, modo = 'percentual') {
  return categoriasDoEvento(evento).map((cat) => {
    const linhas = classificacao(participantes, registos, cat.id, modo)
    const classificados = linhas.filter((l) => l.classificado && l.ganho !== null)
    const melhor = classificados[0] || null
    // Só há vencedor se alguém tiver efetivamente evoluído no sentido certo.
    const valido = melhor && melhor.ganho > 0
    return {
      categoria: cat,
      vencedor: valido ? melhor : null,
      podio: classificados.slice(0, 3),
      linhas
    }
  })
}

// Quem vai em primeiro neste preciso momento, numa categoria.
// É a mesma classificação, mas devolvida em jeito de resposta direta.
export function liderAtual(participantes, registos, catId, modo = 'percentual') {
  const linhas = classificacao(participantes, registos, catId, modo)
  const classificados = linhas.filter((l) => l.classificado && l.ganho !== null)
  const primeiro = classificados[0] || null
  if (!primeiro || primeiro.ganho <= 0) {
    return { lider: null, empatados: [], segundo: classificados[1] || null, linhas }
  }
  const chave = modo === 'absoluto' ? 'ganho' : 'ganhoPct'
  const empatados = classificados.filter(
    (l) => Math.abs((l[chave] ?? 0) - (primeiro[chave] ?? 0)) < 1e-9
  )
  const segundo = classificados.find((l) => !empatados.includes(l)) || null
  return { lider: primeiro, empatados, segundo, linhas }
}

// ---------------------------------------------------------------------------
// Vencedores mensais
// ---------------------------------------------------------------------------

// Lista de meses 'AAAA-MM' abrangidos pelo desafio, até hoje.
export function mesesDoEvento(evento) {
  if (!evento?.dataInicio) return []
  const fim = evento.dataFim && evento.dataFim < hojeISO() ? evento.dataFim : hojeISO()
  if (fim < evento.dataInicio) return []

  const meses = []
  let ano = Number(evento.dataInicio.slice(0, 4))
  let mes = Number(evento.dataInicio.slice(5, 7))
  const anoFim = Number(fim.slice(0, 4))
  const mesFim = Number(fim.slice(5, 7))

  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    meses.push(`${ano}-${String(mes).padStart(2, '0')}`)
    mes += 1
    if (mes > 12) {
      mes = 1
      ano += 1
    }
  }
  return meses
}

export const NOMES_MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

// 'setembro de 2026' — só a primeira letra em maiúscula, que em português
// os nomes dos meses e a preposição são minúsculos.
export function nomeDoMes(mes) {
  const [ano, m] = String(mes).split('-')
  const nome = NOMES_MESES[Number(m) - 1] || ''
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`
}

// Variação de um participante DENTRO de um mês.
//
// O ponto de partida é a última pesagem anterior ao mês — e não a primeira
// pesagem do mês. Quem só se pesa uma vez por mês ficaria sempre de fora se
// fosse preciso ter duas pesagens dentro do mesmo mês.
export function variacaoNoMes(serie, mes, cat) {
  if (!serie?.length) return { abs: null, pct: null, ganho: null, ganhoPct: null, inicio: null, fim: null }

  const antesDoMes = serie.filter((p) => p.data.slice(0, 7) < mes)
  const noMes = serie.filter((p) => p.data.slice(0, 7) === mes)

  if (!noMes.length) {
    return { abs: null, pct: null, ganho: null, ganhoPct: null, inicio: null, fim: null }
  }

  const inicio = antesDoMes.length ? antesDoMes[antesDoMes.length - 1] : noMes[0]
  const fim = noMes[noMes.length - 1]

  // Sem dois pontos distintos não há variação para medir.
  if (inicio === fim) {
    return { abs: null, pct: null, ganho: null, ganhoPct: null, inicio, fim }
  }

  const abs = fim.valor - inicio.valor
  const pct = inicio.valor ? (abs / inicio.valor) * 100 : null
  const sentido = cat?.direcao === 'subir' ? 1 : -1
  return {
    abs,
    pct,
    ganho: abs * sentido,
    ganhoPct: pct === null ? null : pct * sentido,
    inicio,
    fim
  }
}

// Classificação de um mês, numa categoria.
export function classificacaoMensal(participantes, registos, catId, mes, modo = 'percentual') {
  const cat = categoria(catId)
  const linhas = participantes.map((p) => {
    const serie = serieCategoria(registos, p.uid, catId, p)
    const variacao = variacaoNoMes(serie, mes, cat)
    return {
      participante: p,
      ...variacao,
      primeiro: variacao.inicio,
      ultimo: variacao.fim,
      classificado: variacao.ganho !== null
    }
  })

  const chave = modo === 'absoluto' ? 'ganho' : 'ganhoPct'
  linhas.sort((a, b) => {
    if (a.classificado !== b.classificado) return a.classificado ? -1 : 1
    if (!a.classificado) {
      return String(a.participante.nome || '').localeCompare(String(b.participante.nome || ''), 'pt')
    }
    return (b[chave] ?? -Infinity) - (a[chave] ?? -Infinity)
  })

  linhas.forEach((linha, i) => {
    linha.posicao = linha.classificado ? i + 1 : null
  })

  return linhas
}

// Vencedor de cada mês do desafio. O mês corrente vai marcado como em curso,
// porque ainda pode mudar até ao último dia.
export function vencedoresMensais(evento, participantes, registos, catId, modo = 'percentual') {
  const mesAtual = hojeISO().slice(0, 7)
  return mesesDoEvento(evento)
    .map((mes) => {
      const linhas = classificacaoMensal(participantes, registos, catId, mes, modo)
      const melhor = linhas.find((l) => l.classificado && l.ganho > 0) || null
      return { mes, linhas, vencedor: melhor, emCurso: mes === mesAtual }
    })
    .reverse()
}

// ---------------------------------------------------------------------------
// Dados para os gráficos
// ---------------------------------------------------------------------------

// vista: 'valor'    -> valor medido em cada data
//        'variacao' -> diferença face à primeira medição de cada participante
export function dadosGrafico(participantes = [], registos = [], catId, vista = 'valor') {
  const datas = Array.from(
    new Set(registos.filter((r) => valorRegisto(r, catId, null) !== null || catId === 'imc').map((r) => r.data))
  ).sort()

  const series = participantes.map((p) => ({
    uid: p.uid,
    pontos: serieCategoria(registos, p.uid, catId, p)
  }))

  const todasDatas = Array.from(
    new Set([...datas, ...series.flatMap((s) => s.pontos.map((pt) => pt.data))])
  ).sort()

  return todasDatas.map((data) => {
    // 't' é o instante em milissegundos: o eixo do gráfico é temporal, para que
    // o espaçamento entre pesagens corresponda aos dias que passaram mesmo.
    const linha = { data, t: new Date(`${data}T00:00:00`).getTime() }
    series.forEach((s) => {
      const ponto = s.pontos.find((pt) => pt.data === data)
      if (!ponto) return
      if (vista === 'variacao') {
        const base = s.pontos[0]?.valor
        linha[s.uid] = base === undefined ? null : Math.round((ponto.valor - base) * 100) / 100
      } else {
        linha[s.uid] = ponto.valor
      }
    })
    return linha
  })
}

// ---------------------------------------------------------------------------
// Estado do evento
// ---------------------------------------------------------------------------

export function estadoEvento(evento) {
  if (!evento) return 'desconhecido'
  if (evento.estado === 'encerrado') return 'encerrado'
  const hoje = hojeISO()
  if (evento.dataInicio && hoje < evento.dataInicio) return 'agendado'
  if (evento.dataFim && hoje > evento.dataFim) return 'terminado'
  return 'ativo'
}

export const ROTULO_ESTADO = {
  agendado: 'Por começar',
  ativo: 'A decorrer',
  terminado: 'Terminado',
  encerrado: 'Encerrado',
  desconhecido: '—'
}

export function resultadosVisiveis(evento) {
  const estado = estadoEvento(evento)
  return estado === 'terminado' || estado === 'encerrado'
}

// Percentagem de tempo já decorrido do desafio.
export function progressoEvento(evento) {
  if (!evento?.dataInicio || !evento?.dataFim) return null
  const inicio = new Date(`${evento.dataInicio}T00:00:00`).getTime()
  const fim = new Date(`${evento.dataFim}T00:00:00`).getTime()
  const agora = new Date(`${hojeISO()}T00:00:00`).getTime()
  if (fim <= inicio) return null
  const p = ((agora - inicio) / (fim - inicio)) * 100
  return Math.max(0, Math.min(100, Math.round(p)))
}
