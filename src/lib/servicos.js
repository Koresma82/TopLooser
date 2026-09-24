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
  return criado.id
}

export async function atualizarEvento(eventoId, dados) {
  await updateDoc(doc(db, 'eventos', eventoId), {
    ...dados,
    atualizadoEm: serverTimestamp()
  })
}

export async function encerrarEvento(eventoId, encerrar = true) {
  await updateDoc(doc(db, 'eventos', eventoId), {
    estado: encerrar ? 'encerrado' : 'aberto',
    atualizadoEm: serverTimestamp()
  })
}

// Apaga o evento e tudo o que tem dentro (subcoleções e ficheiros).
export async function apagarEvento(eventoId) {
  const subcolecoes = ['registos', 'galeria', 'documentos', 'participantes']
  for (const nome of subcolecoes) {
    const snap = await getDocs(collection(db, 'eventos', eventoId, nome))
    for (const d of snap.docs) {
      const caminho = d.data()?.ficheiroPath
      if (caminho) await apagarFicheiro(caminho)
      await deleteDoc(d.ref)
    }
  }
  await deleteDoc(doc(db, 'eventos', eventoId))
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
}

export async function atualizarParticipante(eventoId, uid, dados) {
  await updateDoc(doc(db, 'eventos', eventoId, 'participantes', uid), dados)
}

export async function sairDoEvento(eventoId, uid) {
  // Remove primeiro os registos e ficheiros do próprio.
  for (const nome of ['registos', 'galeria', 'documentos']) {
    const snap = await getDocs(collection(db, 'eventos', eventoId, nome))
    for (const d of snap.docs) {
      if (d.data()?.uid !== uid) continue
      const caminho = d.data()?.ficheiroPath
      if (caminho) await apagarFicheiro(caminho)
      await deleteDoc(d.ref)
    }
  }
  await deleteDoc(doc(db, 'eventos', eventoId, 'participantes', uid))
}

// ---------------------------------------------------------------------------
// Registos de pesagem
// ---------------------------------------------------------------------------

// dados: { data, valores: {...}, notas, origem }
// ficheiro: foto do talão da farmácia (opcional)
export async function criarRegisto(eventoId, utilizador, participante, dados, ficheiro) {
  let anexo = null
  if (ficheiro) {
    const nome = `${Date.now()}_${nomeSeguro(ficheiro.name)}`
    anexo = await enviarFicheiro(`eventos/${eventoId}/registos/${utilizador.uid}/${nome}`, ficheiro)
  }

  const valores = limparValores(dados.valores, participante)

  await addDoc(collection(db, 'eventos', eventoId, 'registos'), {
    uid: utilizador.uid,
    data: dados.data,
    valores,
    alturaCm: Number(participante?.alturaCm) || null,
    notas: (dados.notas || '').trim(),
    origem: dados.leituraIA ? 'talao-ia' : ficheiro ? 'talao' : 'manual',
    leituraIA: dados.leituraIA || null,
    ficheiroURL: anexo?.url || '',
    ficheiroPath: anexo?.caminho || '',
    criadoEm: serverTimestamp()
  })
}

export async function atualizarRegisto(eventoId, registoId, participante, dados, ficheiro) {
  const alteracoes = {
    data: dados.data,
    valores: limparValores(dados.valores, participante),
    alturaCm: Number(participante?.alturaCm) || null,
    notas: (dados.notas || '').trim(),
    atualizadoEm: serverTimestamp()
  }

  if (dados.leituraIA) alteracoes.leituraIA = dados.leituraIA

  if (ficheiro) {
    const nome = `${Date.now()}_${nomeSeguro(ficheiro.name)}`
    const anexo = await enviarFicheiro(
      `eventos/${eventoId}/registos/${participante.uid}/${nome}`,
      ficheiro
    )
    alteracoes.ficheiroURL = anexo.url
    alteracoes.ficheiroPath = anexo.caminho
    alteracoes.origem = dados.leituraIA ? 'talao-ia' : 'talao'
  }

  await updateDoc(doc(db, 'eventos', eventoId, 'registos', registoId), alteracoes)
}

export async function apagarRegisto(eventoId, registo) {
  if (registo.ficheiroPath) await apagarFicheiro(registo.ficheiroPath)
  await deleteDoc(doc(db, 'eventos', eventoId, 'registos', registo.id))
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
}

export async function apagarDocumento(eventoId, documento) {
  if (documento.ficheiroPath) await apagarFicheiro(documento.ficheiroPath)
  await deleteDoc(doc(db, 'eventos', eventoId, 'documentos', documento.id))
}
