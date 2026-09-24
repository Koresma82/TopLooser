// Formatação de datas e números em português de Portugal.

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

// As datas do evento e dos registos são guardadas como texto 'AAAA-MM-DD',
// o que evita problemas de fuso horário.
export function hojeISO() {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export function dataCurta(iso) {
  if (!iso) return '—'
  const [a, m, d] = String(iso).split('-')
  if (!a || !m || !d) return iso
  return `${d}/${m}/${a}`
}

// Instante em milissegundos -> '01/06' (eixo dos gráficos)
export function diaMes(ms) {
  if (!ms && ms !== 0) return ''
  const d = new Date(ms)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Instante em milissegundos -> '01/06/2026'
export function dataDeMs(ms) {
  if (!ms && ms !== 0) return ''
  const d = new Date(ms)
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${dia}/${mes}/${d.getFullYear()}`
}

export function dataExtenso(iso) {
  if (!iso) return '—'
  const [a, m, d] = String(iso).split('-').map(Number)
  if (!a || !m || !d) return iso
  return `${d} de ${MESES[m - 1]} de ${a}`
}

export function diasEntre(isoA, isoB) {
  if (!isoA || !isoB) return 0
  const a = new Date(`${isoA}T00:00:00`)
  const b = new Date(`${isoB}T00:00:00`)
  return Math.round((b - a) / 86400000)
}

export function numero(valor, casas = 1) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'
  return Number(valor).toLocaleString('pt-PT', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  })
}

export function comUnidade(valor, cat) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'
  const texto = numero(valor, cat?.casas ?? 1)
  return cat?.unidade ? `${texto} ${cat.unidade}` : texto
}

// Variação com sinal explícito: +1,2 kg / −3,4 kg
export function comSinal(valor, casas = 1, unidade = '') {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'
  const sinal = valor > 0 ? '+' : valor < 0 ? '−' : ''
  const texto = numero(Math.abs(valor), casas)
  return `${sinal}${texto}${unidade ? ` ${unidade}` : ''}`
}

export function percentagemComSinal(valor, casas = 1) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'
  const sinal = valor > 0 ? '+' : valor < 0 ? '−' : ''
  return `${sinal}${numero(Math.abs(valor), casas)} %`
}

export function primeiroNome(nome = '') {
  return String(nome).trim().split(/\s+/)[0] || 'Sem nome'
}

export function iniciais(nome = '') {
  const partes = String(nome).trim().split(/\s+/).filter(Boolean)
  if (!partes.length) return '?'
  if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

export function tamanhoFicheiro(bytes) {
  if (!bytes && bytes !== 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Data e hora de um instante (para a auditoria): '24/09/2026 às 20:15'
export function dataHora(data) {
  if (!data) return '—'
  const d = data instanceof Date ? data : new Date(data)
  if (Number.isNaN(d.getTime())) return '—'
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${d.getFullYear()} às ${h}:${m}`
}

// 'há 3 dias', 'há 2 h', 'agora mesmo' — para listas onde a data exata não importa
export function haQuantoTempo(data) {
  if (!data) return '—'
  const d = data instanceof Date ? data : new Date(data)
  if (Number.isNaN(d.getTime())) return '—'
  const segundos = Math.floor((Date.now() - d.getTime()) / 1000)
  if (segundos < 60) return 'agora mesmo'
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  const dias = Math.floor(horas / 24)
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
  const anos = Math.floor(meses / 12)
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}`
}
