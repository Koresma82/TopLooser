// Leitura automática do talão da balança da farmácia.
//
// Corre no servidor (Netlify Functions) precisamente para a chave da API nunca
// chegar ao browser. O cliente envia a foto já reduzida em base64; esta função
// pede ao modelo os valores num formato fixo e devolve-os.
//
// Funciona com qualquer um dos dois fornecedores — usa o que tiver chave:
//
//   ANTHROPIC_API_KEY   chave da Anthropic (https://console.anthropic.com)
//   ANTHROPIC_MODELO    opcional, por omissão 'claude-haiku-4-5-20251001'
//
//   GEMINI_API_KEY      chave do Google AI Studio (https://aistudio.google.com/apikey)
//   GEMINI_MODELO       opcional, por omissão 'gemini-2.0-flash'
//
// Se ambas estiverem definidas, a da Anthropic tem precedência. Para forçar uma
// delas, define FORNECEDOR_TALAO como 'anthropic' ou 'gemini'.

const MODELO_ANTHROPIC = 'claude-haiku-4-5-20251001'
const MODELO_GEMINI = 'gemini-2.0-flash'
const TAMANHO_MAXIMO = 6 * 1024 * 1024
const ESPERA_MAXIMA = 25000

const INSTRUCOES = `És um leitor de talões de balanças de farmácia portuguesas (KEITO e semelhantes).

Extrai APENAS os valores medidos que estão mesmo impressos no talão.

Regras:
- Os números vêm com vírgula decimal ("107,5"). Devolve-os como número com ponto (107.5).
- Se um valor não estiver no talão, OMITE o campo. NUNCA inventes, estimes ou calcules um valor a partir de outro.
- IGNORA por completo as linhas de referência e de aconselhamento, que não são medições desta pessoa. Por exemplo: "Peso normal entre: 56,7 kg-76,3 kg", "índice normal gordura...17-23 %", "Massa gordura normal 13,3-19,4 kg", "Normalmente deverá estar entre 18,5 e 24,9". Estes intervalos NÃO são valores medidos.
- IGNORA a idade e o sexo.

Correspondência dos campos:
- "Peso" em kg -> peso
- "Altura" em cm -> alturaCm
- "Índice de gordura" ou "Gordura corporal" em % -> massaGorda
- "Massa de gordura" em kg -> massaGordaKg
- "Massa sem gordura" ou "Massa magra" em kg -> massaMagraKg
- "Massa magra" em % -> massaMagra
- "Água" ou "Água corporal" em % -> agua
- "Gordura visceral" (índice, sem unidade) -> gorduraVisceral
- "Perímetro abdominal" ou "Cintura" em cm -> perimetro
- "O seu Índice de Massa Corporal é de X kg/m²" ou uma linha "IMC" -> imc

Data e hora:
- A data aparece normalmente numa linha como "24/09/26,5ª feira......15:39:47", no formato dia/mês/ano com o ano em dois dígitos.
- Devolve a data como "AAAA-MM-DD". Um ano de dois dígitos refere-se sempre a 20AA (26 -> 2026).
- Devolve a hora como "HH:MM" se estiver impressa.

Preenche ainda:
- farmacia: o nome da farmácia, se estiver no talão.
- confianca: "alta" se o talão está nítido e os valores são inequívocos, "media" se houve algum campo difícil de ler, "baixa" se a foto está tremida, cortada ou pouco legível.
- observacoes: uma frase curta em português, só se houver algo que a pessoa deva conferir (campo duvidoso, talão cortado). Caso contrário, omite.`

// Descrições partilhadas pelos dois fornecedores.
const CAMPOS = {
  data: ['string', 'Data da pesagem em AAAA-MM-DD'],
  hora: ['string', 'Hora da pesagem em HH:MM'],
  peso: ['number', 'Peso em kg'],
  alturaCm: ['number', 'Altura em cm'],
  imc: ['number', 'Índice de massa corporal'],
  massaGorda: ['number', 'Índice de gordura em %'],
  massaGordaKg: ['number', 'Massa de gordura em kg'],
  massaMagra: ['number', 'Massa magra em %'],
  massaMagraKg: ['number', 'Massa sem gordura em kg'],
  agua: ['number', 'Água corporal em %'],
  gorduraVisceral: ['number', 'Índice de gordura visceral'],
  perimetro: ['number', 'Perímetro abdominal em cm'],
  farmacia: ['string', 'Nome da farmácia'],
  observacoes: ['string', 'Aviso curto, só se houver algo a conferir']
}

function resposta(corpo, estado = 200) {
  return new Response(JSON.stringify(corpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  })
}

function comLimiteDeTempo() {
  const controlo = new AbortController()
  const temporizador = setTimeout(() => controlo.abort(), ESPERA_MAXIMA)
  return { sinal: controlo.signal, limpar: () => clearTimeout(temporizador) }
}

// ---------------------------------------------------------------------------
// Anthropic — o formato é forçado por uma ferramenta, que o modelo tem de usar
// ---------------------------------------------------------------------------

function esquemaAnthropic() {
  const properties = {}
  Object.entries(CAMPOS).forEach(([nome, [tipo, descricao]]) => {
    properties[nome] = { type: tipo, description: descricao }
  })
  properties.confianca = {
    type: 'string',
    enum: ['alta', 'media', 'baixa'],
    description: 'Quão legível estava o talão'
  }
  return { type: 'object', properties, required: ['confianca'] }
}

async function lerComAnthropic(chave, modelo, imagemBase64, tipo) {
  const { sinal, limpar } = comLimiteDeTempo()

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: sinal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': chave,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 1024,
        temperature: 0,
        tools: [
          {
            name: 'registar_talao',
            description: 'Regista os valores medidos que estão impressos no talão.',
            input_schema: esquemaAnthropic()
          }
        ],
        tool_choice: { type: 'tool', name: 'registar_talao' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: tipo || 'image/jpeg', data: imagemBase64 }
              },
              { type: 'text', text: INSTRUCOES }
            ]
          }
        ]
      })
    })

    if (!r.ok) {
      const detalhe = await r.text()
      console.error('Anthropic respondeu', r.status, detalhe.slice(0, 500))
      return { erro: true, estado: r.status }
    }

    const dados = await r.json()
    const ferramenta = dados?.content?.find((b) => b.type === 'tool_use')
    return { leitura: ferramenta?.input || null }
  } finally {
    limpar()
  }
}

// ---------------------------------------------------------------------------
// Gemini — o formato é forçado por um esquema de resposta
// ---------------------------------------------------------------------------

function esquemaGemini() {
  const properties = {}
  Object.entries(CAMPOS).forEach(([nome, [tipo, descricao]]) => {
    properties[nome] = {
      type: tipo === 'number' ? 'NUMBER' : 'STRING',
      nullable: true,
      description: descricao
    }
  })
  properties.confianca = { type: 'STRING', enum: ['alta', 'media', 'baixa'] }
  return { type: 'OBJECT', properties, required: ['confianca'] }
}

async function lerComGemini(chave, modelo, imagemBase64, tipo) {
  const { sinal, limpar } = comLimiteDeTempo()
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${chave}`

  try {
    const r = await fetch(url, {
      method: 'POST',
      signal: sinal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: INSTRUCOES },
              { inline_data: { mime_type: tipo || 'image/jpeg', data: imagemBase64 } }
            ]
          }
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: esquemaGemini()
        }
      })
    })

    if (!r.ok) {
      const detalhe = await r.text()
      console.error('Gemini respondeu', r.status, detalhe.slice(0, 500))
      return { erro: true, estado: r.status }
    }

    const dados = await r.json()
    const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!texto) return { leitura: null }

    try {
      return { leitura: JSON.parse(texto) }
    } catch {
      console.error('JSON inválido do modelo:', texto.slice(0, 500))
      return { leitura: null }
    }
  } finally {
    limpar()
  }
}

// ---------------------------------------------------------------------------

function escolherFornecedor() {
  const anthropic = process.env.ANTHROPIC_API_KEY
  const gemini = process.env.GEMINI_API_KEY
  const forcado = (process.env.FORNECEDOR_TALAO || '').toLowerCase()

  if (forcado === 'anthropic' && anthropic) {
    return { nome: 'anthropic', chave: anthropic, modelo: process.env.ANTHROPIC_MODELO || MODELO_ANTHROPIC }
  }
  if (forcado === 'gemini' && gemini) {
    return { nome: 'gemini', chave: gemini, modelo: process.env.GEMINI_MODELO || MODELO_GEMINI }
  }
  if (anthropic) {
    return { nome: 'anthropic', chave: anthropic, modelo: process.env.ANTHROPIC_MODELO || MODELO_ANTHROPIC }
  }
  if (gemini) {
    return { nome: 'gemini', chave: gemini, modelo: process.env.GEMINI_MODELO || MODELO_GEMINI }
  }
  return null
}

export default async (req) => {
  if (req.method !== 'POST') {
    return resposta({ erro: 'metodo_nao_permitido' }, 405)
  }

  const fornecedor = escolherFornecedor()
  if (!fornecedor) {
    return resposta(
      {
        erro: 'sem_chave',
        mensagem:
          'A leitura automática não está configurada: falta a ANTHROPIC_API_KEY (ou a GEMINI_API_KEY) no Netlify.'
      },
      503
    )
  }

  let pedido
  try {
    pedido = await req.json()
  } catch {
    return resposta({ erro: 'pedido_invalido' }, 400)
  }

  const { imagemBase64, tipo } = pedido || {}
  if (!imagemBase64 || typeof imagemBase64 !== 'string') {
    return resposta({ erro: 'sem_imagem' }, 400)
  }
  if (imagemBase64.length > TAMANHO_MAXIMO) {
    return resposta({ erro: 'imagem_grande', mensagem: 'A imagem é demasiado grande.' }, 413)
  }

  try {
    const ler = fornecedor.nome === 'anthropic' ? lerComAnthropic : lerComGemini
    const { leitura, erro, estado } = await ler(
      fornecedor.chave,
      fornecedor.modelo,
      imagemBase64,
      tipo
    )

    if (erro) {
      // 401 e 403 são quase sempre chave errada ou sem saldo: vale a pena dizê-lo.
      const mensagem =
        estado === 401 || estado === 403
          ? 'A chave da API foi recusada. Confirma-a nas variáveis de ambiente.'
          : estado === 429
            ? 'O serviço de leitura está a recusar pedidos por excesso de uso. Tenta daqui a pouco.'
            : 'O serviço de leitura não respondeu como esperado.'
      return resposta({ erro: 'modelo_falhou', mensagem }, 502)
    }

    if (!leitura) {
      return resposta(
        { erro: 'sem_resposta', mensagem: 'Não foi possível ler nada do talão.' },
        502
      )
    }

    return resposta({ leitura, modelo: fornecedor.modelo, fornecedor: fornecedor.nome })
  } catch (e) {
    if (e.name === 'AbortError') {
      return resposta(
        { erro: 'demorou', mensagem: 'A leitura demorou demasiado. Tenta outra vez.' },
        504
      )
    }
    console.error(e)
    return resposta({ erro: 'falha', mensagem: 'Falhou a leitura do talão.' }, 500)
  }
}
