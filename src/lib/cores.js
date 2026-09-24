// Paleta que cada participante escolhe para se identificar nos gráficos,
// nas tabelas e nos cartões.
//
// As cores e a ordem vêm de uma paleta categórica validada para fundo escuro
// (banda de luminosidade, saturação mínima, separação para daltonismo e
// contraste com o fundo). Como cada pessoa escolhe a sua cor livremente, pode
// sempre acontecer que duas escolham um par difícil de distinguir — por isso os
// gráficos nunca identificam ninguém só pela cor: cada participante tem também
// um tipo de traço e uma forma de ponto próprios, além do nome no fim da linha.

export const CORES = [
  { id: 'azul', nome: 'Azul', hex: '#3987e5' },
  { id: 'laranja', nome: 'Laranja', hex: '#d95926' },
  { id: 'agua', nome: 'Verde-água', hex: '#199e70' },
  { id: 'amarelo', nome: 'Amarelo', hex: '#c98500' },
  { id: 'magenta', nome: 'Magenta', hex: '#d55181' },
  { id: 'verde', nome: 'Verde', hex: '#008300' },
  { id: 'violeta', nome: 'Violeta', hex: '#9085e9' },
  { id: 'vermelho', nome: 'Vermelho', hex: '#e66767' }
]

export const COR_OMISSAO = '#8f9bb3'

// Traços e formas usados como segunda marca de identidade nos gráficos.
export const TRACOS = ['0', '7 4', '2 3', '10 4 2 4', '14 4', '4 3 1 3', '1 4', '9 3 3 3']
export const FORMAS = ['circulo', 'quadrado', 'triangulo', 'losango', 'cruz', 'estrela', 'circuloVazio', 'quadradoVazio']

export function corPorId(id) {
  return CORES.find((c) => c.id === id)?.hex || COR_OMISSAO
}

export function indiceCor(id) {
  const i = CORES.findIndex((c) => c.id === id)
  return i === -1 ? 0 : i
}

export function tracoPorCor(id) {
  return TRACOS[indiceCor(id) % TRACOS.length]
}

export function formaPorCor(id) {
  return FORMAS[indiceCor(id) % FORMAS.length]
}

// Primeira cor ainda livre no evento, pela ordem validada da paleta.
export function primeiraCorLivre(participantes = []) {
  const usadas = new Set(participantes.map((p) => p.cor))
  return (CORES.find((c) => !usadas.has(c.id)) || CORES[0]).id
}

// Versão translúcida de uma cor hex, para fundos suaves.
export function comTransparencia(hex, alfa = 0.15) {
  const limpo = String(hex || COR_OMISSAO).replace('#', '')
  const r = parseInt(limpo.substring(0, 2), 16)
  const g = parseInt(limpo.substring(2, 4), 16)
  const b = parseInt(limpo.substring(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return `rgba(143, 155, 179, ${alfa})`
  return `rgba(${r}, ${g}, ${b}, ${alfa})`
}
