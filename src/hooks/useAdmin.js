import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  collectionGroup,
  limit,
  onSnapshot,
  orderBy,
  query
} from 'firebase/firestore'
import { db, configuracaoEmFalta } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import { hojeISO } from '../lib/formato'

const MAXIMO_AUDITORIA = 500

function docs(snap) {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// Datas: os registos trazem um Timestamp do Firestore.
export function paraData(valor) {
  if (!valor) return null
  if (typeof valor.toDate === 'function') return valor.toDate()
  if (valor instanceof Date) return valor
  return null
}

function diasAtras(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// ---------------------------------------------------------------------------
// Tudo o que o administrador vê. Só corre para o administrador; as regras
// recusariam a leitura a qualquer outra pessoa.
// ---------------------------------------------------------------------------
export function useEstatisticasAdmin() {
  const { isAdmin } = useAuth()

  const [utilizadores, setUtilizadores] = useState([])
  const [auditoria, setAuditoria] = useState([])
  const [eventos, setEventos] = useState([])
  const [participacoes, setParticipacoes] = useState([])
  const [registos, setRegistos] = useState([])
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!isAdmin || configuracaoEmFalta) {
      setACarregar(false)
      return undefined
    }

    const cancelar = []
    let porCarregar = 5
    const feito = () => {
      porCarregar -= 1
      if (porCarregar <= 0) setACarregar(false)
    }

    cancelar.push(
      onSnapshot(
        collection(db, 'utilizadores'),
        (s) => {
          setUtilizadores(docs(s))
          feito()
        },
        (e) => {
          setErro(e)
          feito()
        }
      )
    )

    cancelar.push(
      onSnapshot(
        query(collection(db, 'auditoria'), orderBy('quando', 'desc'), limit(MAXIMO_AUDITORIA)),
        (s) => {
          setAuditoria(docs(s))
          feito()
        },
        (e) => {
          setErro(e)
          feito()
        }
      )
    )

    cancelar.push(
      onSnapshot(
        collection(db, 'eventos'),
        (s) => {
          setEventos(docs(s))
          feito()
        },
        () => feito()
      )
    )

    // Grupos de coleções: apanham as subcoleções de todos os eventos de uma vez.
    cancelar.push(
      onSnapshot(
        collectionGroup(db, 'participantes'),
        (s) => {
          setParticipacoes(docs(s))
          feito()
        },
        () => feito()
      )
    )

    cancelar.push(
      onSnapshot(
        collectionGroup(db, 'registos'),
        (s) => {
          setRegistos(docs(s))
          feito()
        },
        () => feito()
      )
    )

    return () => cancelar.forEach((c) => c())
  }, [isAdmin])

  // -------------------------------------------------------------------------
  // Números agregados
  // -------------------------------------------------------------------------
  const resumo = useMemo(() => {
    const seteDias = diasAtras(7)
    const trintaDias = diasAtras(30)

    const visitaDe = (u) => paraData(u.ultimaVisita) || paraData(u.ultimaEntrada)
    const ativos7 = utilizadores.filter((u) => {
      const v = visitaDe(u)
      return v && v >= seteDias
    }).length
    const ativos30 = utilizadores.filter((u) => {
      const v = visitaDe(u)
      return v && v >= trintaDias
    }).length

    const entradasTotais = utilizadores.reduce((t, u) => t + (u.entradas || 0), 0)
    const comIA = registos.filter((r) => r.origem === 'talao-ia').length
    const comTalao = registos.filter((r) => r.origem === 'talao' || r.origem === 'talao-ia').length

    // Quem nunca se inscreveu em evento nenhum: são os espectadores.
    const uidsInscritos = new Set(participacoes.map((p) => p.uid))
    const espectadores = utilizadores.filter((u) => !uidsInscritos.has(u.uid)).length

    return {
      utilizadores: utilizadores.length,
      entradasTotais,
      ativos7,
      ativos30,
      espectadores,
      eventos: eventos.length,
      eventosAbertos: eventos.filter((e) => e.estado !== 'encerrado').length,
      participacoes: participacoes.length,
      registos: registos.length,
      comTalao,
      comIA,
      percentagemIA: registos.length ? Math.round((comIA / registos.length) * 100) : 0
    }
  }, [utilizadores, eventos, participacoes, registos])

  // -------------------------------------------------------------------------
  // Uma linha por pessoa, com o que interessa numa auditoria
  // -------------------------------------------------------------------------
  const porUtilizador = useMemo(() => {
    const contagemRegistos = new Map()
    registos.forEach((r) => contagemRegistos.set(r.uid, (contagemRegistos.get(r.uid) || 0) + 1))

    const contagemEventos = new Map()
    participacoes.forEach((p) => contagemEventos.set(p.uid, (contagemEventos.get(p.uid) || 0) + 1))

    const ultimaAcao = new Map()
    auditoria.forEach((a) => {
      if (!ultimaAcao.has(a.uid)) ultimaAcao.set(a.uid, a)
    })

    return utilizadores
      .map((u) => ({
        ...u,
        entradas: u.entradas || 0,
        eventos: contagemEventos.get(u.uid) || 0,
        pesagens: contagemRegistos.get(u.uid) || 0,
        primeira: paraData(u.primeiraEntrada) || paraData(u.criadoEm),
        ultima: paraData(u.ultimaVisita) || paraData(u.ultimaEntrada),
        ultimaAcao: ultimaAcao.get(u.uid) || null
      }))
      .sort((a, b) => (b.ultima?.getTime() || 0) - (a.ultima?.getTime() || 0))
  }, [utilizadores, registos, participacoes, auditoria])

  // -------------------------------------------------------------------------
  // Entradas por dia, para o gráfico (últimos 30 dias, incluindo os vazios)
  // -------------------------------------------------------------------------
  const entradasPorDia = useMemo(() => {
    const contagem = new Map()
    auditoria
      .filter((a) => a.acao === 'entrada')
      .forEach((a) => {
        const dia = a.dia || (paraData(a.quando)?.toISOString().slice(0, 10) ?? null)
        if (dia) contagem.set(dia, (contagem.get(dia) || 0) + 1)
      })

    const dias = []
    const hoje = new Date(`${hojeISO()}T00:00:00`)
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(hoje)
      d.setDate(d.getDate() - i)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`
      dias.push({ dia: iso, entradas: contagem.get(iso) || 0 })
    }
    return dias
  }, [auditoria])

  return {
    utilizadores,
    auditoria,
    eventos,
    resumo,
    porUtilizador,
    entradasPorDia,
    aCarregar,
    erro,
    limiteAuditoria: MAXIMO_AUDITORIA
  }
}
