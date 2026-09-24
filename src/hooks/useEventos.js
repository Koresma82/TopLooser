import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  collectionGroup,
  doc,
  onSnapshot,
  orderBy,
  query,
  where
} from 'firebase/firestore'
import { db, configuracaoEmFalta } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'

function ordenarDocs(snap) {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ---------------------------------------------------------------------------
// Lista de eventos
// ---------------------------------------------------------------------------
export function useEventos() {
  const [eventos, setEventos] = useState([])
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (configuracaoEmFalta) {
      setACarregar(false)
      return undefined
    }
    const q = query(collection(db, 'eventos'), orderBy('dataInicio', 'desc'))
    return onSnapshot(
      q,
      (snap) => {
        setEventos(ordenarDocs(snap))
        setACarregar(false)
      },
      (e) => {
        setErro(e)
        setACarregar(false)
      }
    )
  }, [])

  return { eventos, aCarregar, erro }
}

// ---------------------------------------------------------------------------
// Eventos em que o utilizador está inscrito (ids)
// ---------------------------------------------------------------------------
export function useMinhasInscricoes() {
  const { uid } = useAuth()
  const [ids, setIds] = useState([])
  const [aCarregar, setACarregar] = useState(true)

  useEffect(() => {
    if (!uid || configuracaoEmFalta) {
      setIds([])
      setACarregar(false)
      return undefined
    }
    const q = query(collectionGroup(db, 'participantes'), where('uid', '==', uid))
    return onSnapshot(
      q,
      (snap) => {
        setIds(snap.docs.map((d) => d.ref.parent.parent?.id).filter(Boolean))
        setACarregar(false)
      },
      () => setACarregar(false)
    )
  }, [uid])

  return { ids, aCarregar }
}

// ---------------------------------------------------------------------------
// Um evento com tudo o que lhe pertence
// ---------------------------------------------------------------------------
export function useEvento(eventoId) {
  const { uid, isAdmin } = useAuth()

  const [evento, setEvento] = useState(null)
  const [participantes, setParticipantes] = useState([])
  const [registos, setRegistos] = useState([])
  const [galeria, setGaleria] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState(null)

  // Evento
  useEffect(() => {
    if (!eventoId || configuracaoEmFalta) return undefined
    setACarregar(true)
    return onSnapshot(
      doc(db, 'eventos', eventoId),
      (snap) => {
        setEvento(snap.exists() ? { id: snap.id, ...snap.data() } : null)
        setACarregar(false)
      },
      (e) => {
        setErro(e)
        setACarregar(false)
      }
    )
  }, [eventoId])

  // Participantes
  useEffect(() => {
    if (!eventoId || configuracaoEmFalta) return undefined
    const q = query(collection(db, 'eventos', eventoId, 'participantes'), orderBy('entrouEm', 'asc'))
    return onSnapshot(
      q,
      (snap) => setParticipantes(ordenarDocs(snap)),
      (e) => setErro(e)
    )
  }, [eventoId])

  const souParticipante = useMemo(
    () => Boolean(uid) && participantes.some((p) => p.uid === uid),
    [participantes, uid]
  )
  const podeVerDados = souParticipante || isAdmin

  // Registos, galeria e documentos: só para quem está no evento (ou admin).
  useEffect(() => {
    if (!eventoId || !podeVerDados || configuracaoEmFalta) {
      setRegistos([])
      return undefined
    }
    const q = query(collection(db, 'eventos', eventoId, 'registos'), orderBy('data', 'asc'))
    return onSnapshot(
      q,
      (snap) => setRegistos(ordenarDocs(snap)),
      (e) => setErro(e)
    )
  }, [eventoId, podeVerDados])

  useEffect(() => {
    if (!eventoId || !podeVerDados || configuracaoEmFalta) {
      setGaleria([])
      return undefined
    }
    const q = query(collection(db, 'eventos', eventoId, 'galeria'), orderBy('criadoEm', 'desc'))
    return onSnapshot(
      q,
      (snap) => setGaleria(ordenarDocs(snap)),
      () => {}
    )
  }, [eventoId, podeVerDados])

  useEffect(() => {
    if (!eventoId || !podeVerDados || configuracaoEmFalta) {
      setDocumentos([])
      return undefined
    }
    const q = query(collection(db, 'eventos', eventoId, 'documentos'), orderBy('criadoEm', 'desc'))
    return onSnapshot(
      q,
      (snap) => setDocumentos(ordenarDocs(snap)),
      () => {}
    )
  }, [eventoId, podeVerDados])

  const euParticipante = useMemo(
    () => participantes.find((p) => p.uid === uid) || null,
    [participantes, uid]
  )

  return {
    evento,
    participantes,
    registos,
    galeria,
    documentos,
    souParticipante,
    euParticipante,
    podeVerDados,
    aCarregar,
    erro
  }
}
