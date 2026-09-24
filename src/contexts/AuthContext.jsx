import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider, EMAIL_ADMIN, configuracaoEmFalta } from '../firebase/config'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth tem de ser usado dentro de <AuthProvider>')
  return ctx
}

// Guarda/atualiza o perfil do utilizador para podermos mostrar nome e foto
// aos outros participantes sem depender do token de autenticação.
async function guardarPerfil(utilizador) {
  const ref = doc(db, 'utilizadores', utilizador.uid)
  const existente = await getDoc(ref)
  const dados = {
    uid: utilizador.uid,
    nome: utilizador.displayName || utilizador.email?.split('@')[0] || 'Sem nome',
    email: utilizador.email || '',
    fotoURL: utilizador.photoURL || '',
    atualizadoEm: serverTimestamp()
  }
  if (!existente.exists()) dados.criadoEm = serverTimestamp()
  await setDoc(ref, dados, { merge: true })
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

    // Resultado de um login por redirecionamento (browsers que bloqueiam popups).
    getRedirectResult(auth).catch(() => {})

    const cancelar = onAuthStateChanged(
      auth,
      async (u) => {
        setUtilizador(u)
        if (u) {
          try {
            await guardarPerfil(u)
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
