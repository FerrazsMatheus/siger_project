import { useState } from 'react'
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail } from 'firebase/auth'
import { useAuth } from '../contexts/useAuth'
import { auth } from '../services/firebase'
import { concluirMigracaoEmailUsuario } from '../services/userService'

export default function EmailMigrationGate({ children }) {
  const { usuarioAtual, perfilUsuario, refreshPerfilUsuario } = useAuth()
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(false)
  const emailPendente = perfilUsuario?.emailPendente || ''

  if (!emailPendente || !usuarioAtual) return children

  async function concluirAtualizacao(event) {
    event?.preventDefault()
    setErro('')
    setProcessando(true)

    try {
      const emailAtual = String(usuarioAtual.email || '').trim().toLowerCase()
      const emailNovo = String(emailPendente).trim().toLowerCase()

      if (emailAtual !== emailNovo) {
        if (!senha) {
          setErro('Informe sua senha atual para confirmar a troca de e-mail.')
          return
        }
        const credencial = EmailAuthProvider.credential(usuarioAtual.email, senha)
        await reauthenticateWithCredential(auth.currentUser, credencial)
        await updateEmail(auth.currentUser, emailNovo)
        await auth.currentUser.getIdToken(true)
      }

      await concluirMigracaoEmailUsuario({ uid: usuarioAtual.uid, novoEmail: emailNovo })
      await refreshPerfilUsuario(usuarioAtual.uid)
      setSenha('')
    } catch (error) {
      console.error('Erro ao concluir a troca de e-mail:', error)
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setErro('A senha atual está incorreta.')
      } else if (error.code === 'auth/email-already-in-use') {
        setErro('Esse novo e-mail já está vinculado a outra conta do Firebase Authentication.')
      } else if (error.code === 'auth/invalid-email') {
        setErro('O novo e-mail cadastrado pelo administrador é inválido.')
      } else if (error.code === 'permission-denied') {
        setErro('O Firestore bloqueou a conclusão. Publique as regras atualizadas e tente novamente.')
      } else {
        setErro('Não foi possível atualizar seu e-mail. Confira sua conexão e tente novamente.')
      }
    } finally {
      setProcessando(false)
    }
  }

  const jaAtualizadoNoAuth = String(usuarioAtual.email || '').trim().toLowerCase() === String(emailPendente).trim().toLowerCase()

  return (
    <main className="d-flex justify-content-center align-items-center min-vh-100 bg-light p-3">
      <section className="card shadow-sm w-100" style={{ maxWidth: 520 }}>
        <div className="card-body p-4">
          <span className="eyebrow">Atualização da conta</span>
          <h1 className="h4 mt-2">Confirme seu novo e-mail</h1>
          <p className="text-muted">
            A administração atualizou seu e-mail institucional. Para continuar usando o SIGER, conclua a atualização do acesso.
          </p>
          <dl className="mb-3">
            <div><dt className="small text-muted">Novo e-mail de acesso</dt><dd className="mb-2"><strong>{emailPendente}</strong></dd></div>
          </dl>
          {erro && <div className="alert alert-danger py-2" role="alert">{erro}</div>}
          {jaAtualizadoNoAuth ? (
            <button type="button" className="btn btn-primary w-100" onClick={() => concluirAtualizacao()} disabled={processando}>
              {processando ? 'Salvando atualização...' : 'Concluir atualização'}
            </button>
          ) : (
            <form onSubmit={concluirAtualizacao}>
              <label htmlFor="senha-migracao-email" className="form-label">Senha atual</label>
              <input
                id="senha-migracao-email"
                className="form-control mb-3"
                type="password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                autoComplete="current-password"
                required
              />
              <p className="small text-muted">Entre uma última vez com seu e-mail antigo. Depois desta confirmação, use o novo e-mail nos próximos acessos.</p>
              <button type="submit" className="btn btn-primary w-100" disabled={processando}>
                {processando ? 'Atualizando e-mail...' : 'Atualizar e-mail de acesso'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
