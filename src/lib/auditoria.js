import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { hojeISO } from './formato'

// Registo de ações, para o administrador saber o que se passou e quando.
//
// LIMITE QUE CONVÉM SABER: isto é escrito pelo browser de cada pessoa. As
// regras impedem que alguém escreva em nome de outro, que altere ou que apague
// — mas nada obriga o browser a escrever. Serve para perceber a atividade do
// grupo, não para provar nada contra quem queira enganar o sistema. Para isso
// seria preciso escrever do lado do servidor, com uma conta de serviço.

export const ACOES = {
  entrada: 'Entrou na aplicação',
  'evento-criado': 'Criou um evento',
  'evento-editado': 'Editou um evento',
  'evento-apagado': 'Apagou um evento',
  'evento-encerrado': 'Encerrou um evento',
  'evento-reaberto': 'Reabriu um evento',
  'inscricoes-abertas': 'Abriu as inscrições',
  'inscricoes-fechadas': 'Fechou as inscrições',
  inscricao: 'Inscreveu-se num evento',
  saida: 'Saiu de um evento',
  'participante-removido': 'Removeu um participante',
  'pesagem-criada': 'Registou uma pesagem',
  'pesagem-editada': 'Editou uma pesagem',
  'pesagem-apagada': 'Apagou uma pesagem',
  'foto-publicada': 'Publicou uma foto',
  'documento-carregado': 'Carregou um documento'
}

// Ações que o administrador faz sobre o desafio, por oposição às do dia a dia.
export const ACOES_DE_GESTAO = [
  'evento-criado',
  'evento-editado',
  'evento-apagado',
  'evento-encerrado',
  'evento-reaberto',
  'inscricoes-abertas',
  'inscricoes-fechadas',
  'participante-removido'
]

export function rotuloAcao(acao) {
  return ACOES[acao] || acao
}

// Nunca interrompe o que o utilizador estava a fazer: se o registo falhar,
// fica no console e a operação segue. Um log não vale uma ação perdida.
export async function registar(utilizador, acao, detalhe = '', extra = {}) {
  if (!utilizador?.uid) return
  try {
    await addDoc(collection(db, 'auditoria'), {
      uid: utilizador.uid,
      email: (utilizador.email || '').toLowerCase(),
      nome: utilizador.displayName || utilizador.email || '',
      acao,
      detalhe: String(detalhe || '').slice(0, 160),
      dia: hojeISO(),
      quando: serverTimestamp(),
      ...extra
    })
  } catch (e) {
    console.error('Não foi possível registar a ação de auditoria:', acao, e)
  }
}
