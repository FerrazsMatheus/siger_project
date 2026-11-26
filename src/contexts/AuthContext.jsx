import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import { buscarDocumentoUsuario } from '../services/userService'
import { finalizarCadastroVerificado } from '../services/verifiedAccountService'
import { AuthContext } from './authContextValue'

export function AuthProvider({ children }) {
  const [usuarioAtual, setUsuarioAtual] = useState(null)
  const [perfilUsuario, setPerfilUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)

  const carregarPerfilUsuario = useCallback(async (uid) => {
    if (!uid) {
      setPerfilUsuario(null)
      return
    }

    try {
      const perfil = await buscarDocumentoUsuario(uid)

      if (perfil?.verifiedAccountId) {
        try {
          await finalizarCadastroVerificado({
            verifiedAccountId: perfil.verifiedAccountId,
            authUid: uid,
          })
        } catch (error) {
          console.error('Erro ao sincronizar status da conta verificada:', error)
        }
      }

      setPerfilUsuario(perfil)
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error)
      setPerfilUsuario(null)
    }
  }, [])

  useEffect(() => {
    let geracaoPerfil = 0
    let unsubscribePerfil = null
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      const geracaoAtual = ++geracaoPerfil
      unsubscribePerfil?.()
      unsubscribePerfil = null
      setUsuarioAtual(user)
      setCarregando(true)

      if (user) {
        await carregarPerfilUsuario(user.uid)
        if (geracaoAtual === geracaoPerfil) {
          unsubscribePerfil = onSnapshot(
            doc(db, 'users', user.uid),
            (snapshot) => setPerfilUsuario(snapshot.exists() ? snapshot.data() : null),
            (error) => console.error('Erro ao observar o perfil do usuário:', error),
          )
        }
      } else {
        setPerfilUsuario(null)
      }

      if (geracaoAtual === geracaoPerfil) {
        setCarregando(false)
      }
    })

    return () => {
      geracaoPerfil += 1
      unsubscribePerfil?.()
      unsubscribeAuth()
    }
  }, [carregarPerfilUsuario])

  const value = {
    usuarioAtual,
    perfilUsuario,
    carregando,
    autenticado: !!usuarioAtual,
    refreshPerfilUsuario: carregarPerfilUsuario,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

