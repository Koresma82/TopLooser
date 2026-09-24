import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut
} from 'firebase/auth'
import { doc, getDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider, EMAIL_ADMIN, configuracaoEmFalta } from '../firebase/config'
import { registar } from '../lib/auditoria'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth tem de ser usado dentro de <AuthProvider>')
  return ctx
}

// Guarda/atualiza o perfil e conta as entradas.
//
// A contagem NÃO pode ser feita a cada vez que isto corre: o onAuthStateChanged
// dispara em todos os carregamentos da página, mesmo quando a sessão já estava
// aberta, e o número inflava com F5. O Firebase diz-nos quando foi a última
// autenticação de verdade (metadata.lastSignInTime); só se conta quando esse
// instante for diferente do que ficou guardado da vez anterior.
async function guardarPerfil(utilizador) {
  const ref = doc(db, 'utilizadores', utilizador.uid)
  const existente = await getDoc(ref)
  const anterior = existente.exists() ? existente.data() : null

  const autenticadoEm = utilizador.metadata?.lastSignInTime || ''
  const entradaNova = Boolean(autenticadoEm) && anterior?.ultimaAutenticacao !== autenticadoEm

  const dados = {
    uid: utilizador.uid,
    nome: utilizador.displayName || utilizador.email?.split('@')[0] || 'Sem nome',
    email: (utilizador.email || '').toLowerCase(),
    fotoURL: utilizador.photoURL || '',
    atualizadoEm: serverTimestamp(),
    ultimaVisita: serverTimestamp()
  }

  if (!existente.exists()) {
    dados.criadoEm = serverTimestamp()
    dados.primeiraEntrada = serverTimestamp()
  }

  if (entradaNova) {
    dados.ultimaAutenticacao = autenticadoEm
    dados.ultimaEntrada = serverTimestamp()
    dados.entradas = increment(1)
  }

  await setDoc(ref, dados, { merge: true })
  return entradaNova
}

// No iPhone e numa app instalada no ecrã inicial, a janela de popup é quase
// sempre bloqueada. Nesses casos vai-se logo por redirecionamento, em vez de
// tentar o popup, falhar e só depois mudar de ideias.
function preferirRedirecionamento() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const instalada =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true
  return iOS || instalada
}

export function AuthProvider({ children }) {
  const [utilizador, setUtilizador] = useState(null)
  const [aCarregar, setACarregar] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (configuracaoEmFalta) {
      setACarregar(false)
      return undefined
    }

    // Resultado de um login por redirecionamento. Se falhou, mostra-se o erro:
    // engolir isto em silêncio deixava a pessoa a olhar para o ecrã de entrada
    // sem perceber porque e que nao entrou.
    getRedirectResult(auth).catch((e) => {
      console.error('Falhou o regresso do login:', e)
      setErro(e)
    })

    const cancelar = onAuthStateChanged(
      auth,
      async (u) => {
        setUtilizador(u)
        if (u) {
          try {
            const entradaNova = await guardarPerfil(u)
            if (entradaNova) await registar(u, 'entrada')
          } catch (e) {
            console.error('Não foi possível guardar o perfil:', e)
          }
        }
        setACarregar(false)
      },
      (e) => {
        setErro(e)
        setACarregar(false)
      }
    )
    return cancelar
  }, [])

  async function entrarComGoogle() {
    setErro(null)

    if (preferirRedirecionamento()) {
      await signInWithRedirect(auth, googleProvider)
      return
    }

    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      // Popup bloqueado ou fechado: tenta por redirecionamento.
      if (
        e.code === 'auth/popup-blocked' ||
        e.code === 'auth/operation-not-supported-in-this-environment' ||
        e.code === 'auth/cancelled-popup-request'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider)
          return
        } catch (e2) {
          setErro(e2)
          throw e2
        }
      }
      if (e.code !== 'auth/popup-closed-by-user') setErro(e)
      throw e
    }
  }

  async function sair() {
    await firebaseSignOut(auth)
  }

  const valor = useMemo(() => {
    const email = (utilizador?.email || '').toLowerCase()
    return {
      utilizador,
      uid: utilizador?.uid || null,
      nome: utilizador?.displayName || utilizador?.email || '',
      email,
      fotoURL: utilizador?.photoURL || '',
      isAdmin: Boolean(utilizador) && email === EMAIL_ADMIN,
      aCarregar,
      erro,
      entrarComGoogle,
      sair
    }
  }, [utilizador, aCarregar, erro])

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
