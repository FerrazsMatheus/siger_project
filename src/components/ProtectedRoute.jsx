import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { encerrarSessao } from '../services/authService'

function CarregandoTelaCheia() {
  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Carregando...</span>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { autenticado, carregando, perfilUsuario } = useAuth()

  if (carregando) {
    return <CarregandoTelaCheia />
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />
  }

  if (!perfilUsuario) {
    return (
      <main className="d-flex justify-content-center align-items-center min-vh-100 bg-light p-3">
        <section className="card shadow-sm" style={{ maxWidth: 480 }}>
          <div className="card-body p-4 text-center">
            <h1 className="h4">Acesso ao SIGER indisponível</h1>
            <p className="text-muted">Este login não possui um perfil ativo no sistema. Se você acredita que isso é um erro, procure a administração.</p>
            <button type="button" className="btn btn-primary" onClick={() => void encerrarSessao()}>
              Sair da conta
            </button>
          </div>
        </section>
      </main>
    )
  }

  if (allowedRoles && !allowedRoles.includes(perfilUsuario?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
