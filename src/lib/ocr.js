// Leitura do talão da balança com IA.
//
// A foto é reduzida no browser (poupa tempo e fica dentro do limite da função)
// e enviada para a função em netlify/functions/ler-talao.js, que é quem fala com
// o modelo. A chave da API nunca passa por aqui.

import { CATEGORIAS_POR_ID } from './categorias'
import { hojeISO } from './formato'

const ENDERECO = '/.netlify/functions/ler-talao'
// 1568 px é o lado máximo que a Anthropic usa sem voltar a redimensionar a
// imagem do lado dela; acima disto só se gastava banda à toa.
const LADO_MAXIMO = 1568
const QUALIDADE = 0.85

// ---------------------------------------------------------------------------
// Preparação da imagem
// ---------------------------------------------------------------------------

async function carregarImagem(ficheiro) {
  // createImageBitmap respeita a orientação EXIF (fotos tiradas com o telemóvel).
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(ficheiro, { imageOrientation: 'from-image' })
    } catch {
      // Alguns browsers não aceitam a opção; cai para o método clássico.
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(ficheiro)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

export async function reduzirImagem(ficheiro) {
  const img = await carregarImagem(ficheiro)
  const largura = img.width
  const altura = img.height
  const escala = Math.min(1, LADO_MAXIMO / Math.max(largura, altura))

  const tela = document.createElement('canvas')
  tela.width = Math.round(largura * escala)
  tela.height = Math.round(altura * escala)

  const ctx = tela.getContext('2d')
  ctx.drawImage(img, 0, 0, tela.width, tela.height)
  if (img.close) img.close()

  const dataUrl = tela.toDataURL('image/jpeg', QUALIDADE)
  return { base64: dataUrl.split(',')[1], tipo: 'image/jpeg' }
}

// ---------------------------------------------------------------------------
// Validação do que veio do modelo
// ---------------------------------------------------------------------------

// Um valor só é aceite se for um número dentro dos limites da categoria.
// Vale mais deixar o campo em branco do que preencher um disparate.
function valorAceite(catId, bruto) {
  if (bruto === null || bruto === undefined || bruto === '') return null
  const n = Number(bruto)
  if (!Number.isFinite(n)) return null
  const cat = CATEGORIAS_POR_ID[catId]
  if (!cat) return null
  if (cat.min !== undefined && n < cat.min) return null
  if (cat.max !== undefined && n > cat.max) return null
  return n
}

function alturaAceite(bruto) {
  const n = Number(bruto)
  if (!Number.isFinite(n) || n < 100 || n > 250) return null
  return n
}

// A data tem de ser plausível: nem no futuro, nem de há mais de cinco anos.
function dataAceite(bruto) {
  if (typeof bruto !== 'string') return null
  const limpo = bruto.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(limpo)) return null
  const d = new Date(`${limpo}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const hoje = hojeISO()
  if (limpo > hoje) return null
  const limite = new Date()
  limite.setFullYear(limite.getFullYear() - 5)
  if (d < limite) return null
  return limpo
}

const CAMPOS_NUMERICOS = [
  'peso',
  'imc',
  'massaGorda',
  'massaGordaKg',
  'massaMagra',
  'massaMagraKg',
  'agua',
  'gorduraVisceral',
  'perimetro'
]

export function normalizarLeitura(bruta) {
  const valores = {}
  const ignorados = []

  CAMPOS_NUMERICOS.forEach((campo) => {
    const cru = bruta?.[campo]
    if (cru === null || cru === undefined) return
    const aceite = valorAceite(campo, cru)
    if (aceite === null) {
      ignorados.push(CATEGORIAS_POR_ID[campo]?.nome || campo)
      return
    }
    valores[campo] = aceite
  })

  return {
    valores,
    data: dataAceite(bruta?.data),
    hora: typeof bruta?.hora === 'string' ? bruta.hora.trim() : null,
    alturaCm: alturaAceite(bruta?.alturaCm),
    farmacia: typeof bruta?.farmacia === 'string' ? bruta.farmacia.trim() : null,
    confianca: ['alta', 'media', 'baixa'].includes(bruta?.confianca) ? bruta.confianca : 'media',
    observacoes: typeof bruta?.observacoes === 'string' ? bruta.observacoes.trim() : null,
    ignorados
  }
}

// ---------------------------------------------------------------------------
// Chamada à função
// ---------------------------------------------------------------------------

export class ErroLeitura extends Error {
  constructor(mensagem, codigo) {
    super(mensagem)
    this.codigo = codigo
  }
}

export async function lerTalao(ficheiro) {
  const { base64, tipo } = await reduzirImagem(ficheiro)

  let r
  try {
    r = await fetch(ENDERECO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imagemBase64: base64, tipo })
    })
  } catch {
    throw new ErroLeitura('Não foi possível contactar o serviço de leitura.', 'sem_rede')
  }

  // Em `vite dev` puro não há funções: o pedido devolve o index.html da SPA.
  const conteudo = r.headers.get('content-type') || ''
  if (!conteudo.includes('application/json')) {
    throw new ErroLeitura(
      'A leitura automática não está disponível neste ambiente. Usa "netlify dev" ou preenche à mão.',
      'indisponivel'
    )
  }

  const corpo = await r.json()

  if (!r.ok) {
    throw new ErroLeitura(corpo?.mensagem || 'Falhou a leitura do talão.', corpo?.erro || 'falha')
  }

  return { ...normalizarLeitura(corpo.leitura), modelo: corpo.modelo }
}
