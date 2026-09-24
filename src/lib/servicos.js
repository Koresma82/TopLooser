import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../firebase/config'
import { calcularImc } from './calculos'
import { registar } from './auditoria'

// ---------------------------------------------------------------------------
// Ficheiros
// ---------------------------------------------------------------------------

function nomeSeguro(nome = 'ficheiro') {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .slice(-80)
}

async function enviarFicheiro(caminho, ficheiro) {
  const destino = ref(storage, caminho)
  await uploadBytes(destino, ficheiro, { contentType: ficheiro.type })
  const url = await getDownloadURL(destino)
  return { url, caminho }
}

async function apagarFicheiro(caminho) {
  if (!caminho) return
  try {
    await deleteObject(ref(storage, caminho))
  } catch (e) {
    // Ficheiro já não existe: não vale a pena interromper o resto.
    if (e?.code !== 'storage/object-not-found') console.error(e)
  }
}

// ---------------------------------------------------------------------------
// Eventos (apenas administrador)
// ---------------------------------------------------------------------------

export async function criarEvento(dados, utilizador) {
  const registo = {
    nome: dados.nome.trim(),
    descricao: (dados.descricao || '').trim(),
    dataInicio: dados.dataInicio,
    dataFim: dados.dataFim,
    categorias: dados.categorias,
    modoRanking: dados.modoRanking || 'percentual',
    inscricoesAbertas: dados.inscricoesAbertas !== false,
    estado: 'aberto',
    premio: (dados.premio || '').trim(),
    criadoPor: utilizador.uid,
    criadoPorNome: utilizador.displayName || utilizador.email || '',
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp()
  }
  const criado = await addDoc(collection(db, 'eventos'), registo)
  await registar(utilizador, 'evento-criado', registo.nome, { eventoId: criado.id })
  return criado.id
}

export async function atualizarEvento(eventoId, dados, utilizador, nomeEvento = '') {
  await updateDoc(doc(db, 'eventos', eventoId), {
    ...dados,
    atualizadoEm: serverTimestamp()
  })

  // Abrir e fechar inscrições fica registado à parte: é a alteração que mais
  // interessa saber quem fez e quando.
  if (utilizador) {
    const acao =
      dados.inscricoesAbertas === true
        ? 'inscricoes-abertas'
        : dados.inscricoesAbertas === false
          ? 'inscricoes-fechadas'
          : 'evento-editado'
    await registar(utilizador, acao, nomeEvento, { eventoId })
  }
}

export async function encerrarEvento(eventoId, encerrar = true, utilizador, nomeEvento = '') {
  await updateDoc(doc(db, 'eventos', eventoId), {
    estado: encerrar ? 'encerrado' : 'aberto',
    atualizadoEm: serverTimestamp()
  })
  await registar(utilizador, encerrar ? 'evento-encerrado' : 'evento-reaberto', nomeEvento, {
    eventoId
  })
}

// Apaga o evento e tudo o que tem dentro (subcoleções e ficheiros).
export async function apagarEvento(eventoId, utilizador, nomeEvento = '') {
  const subcolecoes = ['registos', 'anexos', 'galeria', 'documentos', 'participantes']
  for (const nome of subcolecoes) {
    const snap = await getDocs(collection(db, 'eventos', eventoId, nome))
    for (const d of snap.docs) {
      const caminho = d.data()?.ficheiroPath
      if (caminho) await apagarFicheiro(caminho)
      await deleteDoc(d.ref)
    }
  }
  await deleteDoc(doc(db, 'eventos', eventoId))
  await registar(utilizador, 'evento-apagado', nomeEvento, { eventoId })
}

// ---------------------------------------------------------------------------
// Participantes
// ---------------------------------------------------------------------------

export async function inscrever(eventoId, utilizador, dados) {
  const referencia = doc(db, 'eventos', eventoId, 'participantes', utilizador.uid)
  await setDoc(referencia, {
    uid: utilizador.uid,
    nome: dados.alcunha?.trim() || utilizador.displayName || utilizador.email || 'Sem nome',
    email: utilizador.email || '',
    fotoURL: utilizador.photoURL || '',
    cor: dados.cor,
    alturaCm: Number(dados.alturaCm) || null,
    entrouEm: serverTimestamp()
  })
  await registar(utilizador, 'inscricao', dados.nomeEvento || '', { eventoId })
}

export async function atualizarParticipante(eventoId, uid, dados) {
  await updateDoc(doc(db, 'eventos', eventoId, 'participantes', uid), dados)
}

export async function sairDoEvento(eventoId, uid, utilizador, nomeEvento = '') {
  // Remove primeiro os registos, anexos e ficheiros do próprio.
  for (const nome of ['registos', 'anexos', 'galeria', 'documentos']) {
    const snap = await getDocs(collection(db, 'eventos', eventoId, nome))
    for (const d of snap.docs) {
      if (d.data()?.uid !== uid) continue
      const caminho = d.data()?.ficheiroPath
      if (caminho) await apagarFicheiro(caminho)
      await deleteDoc(d.ref)
    }
  }
  await deleteDoc(doc(db, 'eventos', eventoId, 'participantes', uid))
  if (utilizador) {
    const proprio = utilizador.uid === uid
    await registar(
      utilizador,
      proprio ? 'saida' : 'participante-removido',
      proprio ? nomeEvento : `${nomeEvento} — ${uid}`,
      { eventoId, alvo: uid }
    )
  }
}

// ---------------------------------------------------------------------------
// Registos de pesagem
// ---------------------------------------------------------------------------
//
// Cada pesagem fica em dois documentos com o MESMO id:
//
//   registos/{id}   os números e a data  -> qualquer pessoa com conta lê,
//                                           para os gráficos funcionarem
//   anexos/{id}     foto do talão, notas -> só quem está no evento lê
//                   e a leitura da IA
//
// O Firestore não tem regras ao nível do campo. Se a foto ficasse ao lado dos
// números, quem lesse os números levava com o endereço da foto atrás.

// Monta o documento de anexo, ou null se não houver nada para guardar.
function montarAnexo(uid, dados, anexoFicheiro) {
  const notas = (dados.notas || '').trim()
  if (!anexoFicheiro && !notas && !dados.leituraIA) return null
  return {
    uid,
    notas,
    leituraIA: dados.leituraIA || null,
    ficheiroURL: anexoFicheiro?.url || '',
    ficheiroPath: anexoFicheiro?.caminho || ''
  }
}

// dados: { data, valores: {...}, notas, leituraIA }
// ficheiro: foto do talão da farmácia (opcional)
export async function criarRegisto(eventoId, utilizador, participante, dados, ficheiro) {
  let anexoFicheiro = null
  if (ficheiro) {
    const nome = `${Date.now()}_${nomeSeguro(ficheiro.name)}`
    anexoFicheiro = await enviarFicheiro(
      `eventos/${eventoId}/registos/${utilizador.uid}/${nome}`,
      ficheiro
    )
  }

  const criado = await addDoc(collection(db, 'eventos', eventoId, 'registos'), {
    uid: utilizador.uid,
    data: dados.data,
    valores: limparValores(dados.valores, participante),
    alturaCm: Number(participante?.alturaCm) || null,
    origem: dados.leituraIA ? 'talao-ia' : ficheiro ? 'talao' : 'manual',
    temAnexo: Boolean(anexoFicheiro),
    criadoEm: serverTimestamp()
  })

  const anexo = montarAnexo(utilizador.uid, dados, anexoFicheiro)
  if (anexo) {
    await setDoc(doc(db, 'eventos', eventoId, 'anexos', criado.id), {
      ...anexo,
      criadoEm: serverTimestamp()
    })
  }

  await registar(utilizador, 'pesagem-criada', dados.data, {
    eventoId,
    comTalao: Boolean(anexoFicheiro),
    comIA: Boolean(dados.leituraIA)
  })
}

export async function atualizarRegisto(eventoId, registoId, participante, dados, ficheiro, utilizador) {
  let anexoFicheiro = null
  if (ficheiro) {
    const nome = `${Date.now()}_${nomeSeguro(ficheiro.name)}`
    anexoFicheiro = await enviarFicheiro(
      `eventos/${eventoId}/registos/${participante.uid}/${nome}`,
      ficheiro
    )
  }

  const alteracoes = {
    data: dados.data,
    valores: limparValores(dados.valores, participante),
    alturaCm: Number(participante?.alturaCm) || null,
    atualizadoEm: serverTimestamp()
  }
  if (anexoFicheiro) {
    alteracoes.origem = dados.leituraIA ? 'talao-ia' : 'talao'
    alteracoes.temAnexo = true
  }
  await updateDoc(doc(db, 'eventos', eventoId, 'registos', registoId), alteracoes)

  // O anexo é reescrito por inteiro quando há foto nova; sem foto nova,
  // só se mexe nas notas e na leitura, para não apagar a foto que lá estava.
  const referencia = doc(db, 'eventos', eventoId, 'anexos', registoId)
  const parcial = {
    uid: participante.uid,
    notas: (dados.notas || '').trim(),
    atualizadoEm: serverTimestamp()
  }
  if (dados.leituraIA) parcial.leituraIA = dados.leituraIA
  if (anexoFicheiro) {
    parcial.ficheiroURL = anexoFicheiro.url
    parcial.ficheiroPath = anexoFicheiro.caminho
  }
  await setDoc(referencia, parcial, { merge: true })

  await registar(utilizador, 'pesagem-editada', dados.data, { eventoId })
}

export async function apagarRegisto(eventoId, registo, utilizador) {
  if (registo.ficheiroPath) await apagarFicheiro(registo.ficheiroPath)
  await deleteDoc(doc(db, 'eventos', eventoId, 'registos', registo.id))
  try {
    await deleteDoc(doc(db, 'eventos', eventoId, 'anexos', registo.id))
  } catch (e) {
    // O registo pode nao ter anexo nenhum; nao vale a pena interromper.
    console.error(e)
  }
  await registar(utilizador, 'pesagem-apagada', registo.data, { eventoId, alvo: registo.uid })
}

// Converte os campos do formulário em números e calcula o IMC quando dá.
function limparValores(valores = {}, participante) {
  const limpos = {}
  Object.entries(valores).forEach(([chave, valor]) => {
    if (valor === '' || valor === null || valor === undefined) return
    const numero = Number(String(valor).replace(',', '.'))
    if (Number.isFinite(numero)) limpos[chave] = numero
  })
  if (limpos.imc === undefined && limpos.peso !== undefined) {
    const imc = calcularImc(limpos.peso, participante?.alturaCm)
    if (imc !== null) limpos.imc = imc
  }
  return limpos
}

// ---------------------------------------------------------------------------
// Galeria
// ---------------------------------------------------------------------------

export async function adicionarFoto(eventoId, utilizador, ficheiro, legenda = '') {
  const nome = `${Date.now()}_${nomeSeguro(ficheiro.name)}`
  const anexo = await enviarFicheiro(`eventos/${eventoId}/galeria/${utilizador.uid}/${nome}`, ficheiro)
  await addDoc(collection(db, 'eventos', eventoId, 'galeria'), {
    uid: utilizador.uid,
    nome: utilizador.displayName || utilizador.email || '',
    legenda: legenda.trim(),
    ficheiroURL: anexo.url,
    ficheiroPath: anexo.caminho,
    criadoEm: serverTimestamp()
  })
  await registar(utilizador, 'foto-publicada', legenda, { eventoId })
}

export async function apagarFoto(eventoId, foto) {
  if (foto.ficheiroPath) await apagarFicheiro(foto.ficheiroPath)
  await deleteDoc(doc(db, 'eventos', eventoId, 'galeria', foto.id))
}

// ---------------------------------------------------------------------------
// Documentos (contrato assinado, regulamento)
// ---------------------------------------------------------------------------

export async function adicionarDocumento(eventoId, utilizador, ficheiro, titulo = '') {
  const nome = `${Date.now()}_${nomeSeguro(ficheiro.name)}`
  const anexo = await enviarFicheiro(
    `eventos/${eventoId}/documentos/${utilizador.uid}/${nome}`,
    ficheiro
  )
  await addDoc(collection(db, 'eventos', eventoId, 'documentos'), {
    uid: utilizador.uid,
    nome: utilizador.displayName || utilizador.email || '',
    titulo: titulo.trim() || ficheiro.name,
    tipo: ficheiro.type || '',
    tamanho: ficheiro.size || 0,
    ficheiroURL: anexo.url,
    ficheiroPath: anexo.caminho,
    criadoEm: serverTimestamp()
  })
  await registar(utilizador, 'documento-carregado', titulo || ficheiro.name, { eventoId })
}

export async function apagarDocumento(eventoId, documento) {
  if (documento.ficheiroPath) await apagarFicheiro(documento.ficheiroPath)
  await deleteDoc(doc(db, 'eventos', eventoId, 'documentos', documento.id))
}
