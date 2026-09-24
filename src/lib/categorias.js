// Catalogo de categorias que podem ser medidas num desafio.
//
// direcao: 'descer' -> quanto menor, melhor (peso, IMC, massa gorda)
//          'subir'  -> quanto maior, melhor (massa magra, agua)
// derivado: calculado pela app a partir de outros valores (o IMC vem do peso + altura)

export const CATEGORIAS = [
  {
    id: 'peso',
    nome: 'Peso',
    curto: 'Peso',
    unidade: 'kg',
    direcao: 'descer',
    casas: 1,
    min: 20,
    max: 400,
    base: true,
    ajuda: 'Peso em quilogramas, tal como aparece no talão.'
  },
  {
    id: 'imc',
    nome: 'IMC',
    curto: 'IMC',
    unidade: '',
    direcao: 'descer',
    casas: 2,
    min: 8,
    max: 90,
    derivado: true,
    ajuda: 'Calculado automaticamente a partir do peso e da altura.'
  },
  {
    id: 'massaGorda',
    nome: 'Massa gorda',
    curto: 'M. gorda',
    unidade: '%',
    direcao: 'descer',
    casas: 1,
    min: 1,
    max: 80,
    ajuda: 'Percentagem de massa gorda.'
  },
  {
    id: 'massaGordaKg',
    nome: 'Massa de gordura',
    curto: 'Gord. kg',
    unidade: 'kg',
    direcao: 'descer',
    casas: 1,
    min: 1,
    max: 200,
    ajuda: 'Quilos de gordura indicados pela balança.'
  },
  {
    id: 'massaMagra',
    nome: 'Massa magra',
    curto: 'M. magra',
    unidade: '%',
    direcao: 'subir',
    casas: 1,
    min: 1,
    max: 100,
    ajuda: 'Percentagem de massa magra. Aqui subir é bom.'
  },
  {
    id: 'massaMagraKg',
    nome: 'Massa sem gordura',
    curto: 'Magra kg',
    unidade: 'kg',
    direcao: 'subir',
    casas: 1,
    min: 10,
    max: 200,
    ajuda: 'Quilos de massa sem gordura. Manter ou subir é bom sinal.'
  },
  {
    id: 'agua',
    nome: 'Água corporal',
    curto: 'Água',
    unidade: '%',
    direcao: 'subir',
    casas: 1,
    min: 1,
    max: 100,
    ajuda: 'Percentagem de água corporal.'
  },
  {
    id: 'gorduraVisceral',
    nome: 'Gordura visceral',
    curto: 'G. visceral',
    unidade: '',
    direcao: 'descer',
    casas: 0,
    min: 1,
    max: 60,
    ajuda: 'Índice de gordura visceral indicado pela balança.'
  },
  {
    id: 'perimetro',
    nome: 'Perímetro abdominal',
    curto: 'Perímetro',
    unidade: 'cm',
    direcao: 'descer',
    casas: 1,
    min: 30,
    max: 250,
    ajuda: 'Medido com fita métrica ao nível do umbigo.'
  }
]

export const CATEGORIAS_POR_ID = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]))

// Categorias ligadas por omissão num evento novo.
export const CATEGORIAS_PREDEFINIDAS = ['peso', 'imc', 'massaGorda']

export function categoria(id) {
  return CATEGORIAS_POR_ID[id] || null
}

// Categorias de um evento, pela ordem do catálogo, ignorando ids desconhecidos.
export function categoriasDoEvento(evento) {
  const ativas = evento?.categorias?.length ? evento.categorias : CATEGORIAS_PREDEFINIDAS
  return CATEGORIAS.filter((c) => ativas.includes(c.id))
}

// Categorias que o utilizador preenche à mão (o IMC é calculado).
export function categoriasEditaveis(evento) {
  return categoriasDoEvento(evento).filter((c) => !c.derivado)
}
