import { memo, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import Calendario from '../../components/Calendario'
import AdminNavbar from '../../components/admin/AdminNavbar'
import { listarSolicitacoes } from '../../services/solicitacaoService'

const AdminDashboard = memo(function AdminDashboard() {
  const { usuarioAtual, perfilUsuario } = useAuth()
  const [erro, setErro] = useState('')
  const [reservasAprovadas, setReservasAprovadas] = useState([])

  const carregarDadosPainel = useCallback(async () => {
    setErro('')
    try {
      const aprovadas = await listarSolicitacoes('aprovada')
      setReservasAprovadas(aprovadas)
    } catch (error) {
      console.error('Erro ao carregar dados do painel administrativo:', error)
      setErro('Não foi possível carregar os dados do painel.')
    }
  }, [])

  useEffect(() => {
    carregarDadosPainel()
  }, [carregarDadosPainel])

  return (
    <>
      <AdminNavbar />

      <div className="container app-shell">
        <div className="card shell-card profile-card">
          <div className="card-body profile-body">
            <div>
              <span className="eyebrow">Administração</span>
              <h2 className="h3 mb-1">
                Olá, {perfilUsuario?.name || usuarioAtual?.displayName || 'admin'}!
              </h2>
            </div>
            <p className="text-muted mb-0">Gerencie a infraestrutura física do campus.</p>
          </div>
        </div>

        {erro && (
          <div className="alert alert-danger" role="alert">
            {erro}
          </div>
        )}

        <h3 className="h5 mb-3">Acesso rápido</h3>
        <div className="admin-quick-actions mb-4">
          <Link to="/admin/locais" className="btn admin-quick-action">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h1m4 0h1M9 14h1m4 0h1m-5 7v-4h2v4" />
            </svg>
            <span>Gerenciar locais</span>
          </Link>
          <Link to="/admin/solicitacoes" className="btn admin-quick-action">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M9 4h6a2 2 0 0 1 2 2v1h2v14H5V7h2V6a2 2 0 0 1 2-2Z" />
              <path d="M9 4v4h6V4M8 13h8m-8 4h8" />
            </svg>
            <span>Gerenciar solicitações</span>
          </Link>
          <Link to="/admin/contas" className="btn admin-quick-action">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m2-13a4 4 0 1 0 8 0 4 4 0 0 0-8 0Zm9 2a3 3 0 1 0 0-6m1 11h1a4 4 0 0 1 4 4v2" />
            </svg>
            <span>Gerenciar contas</span>
          </Link>
          <Link to="/admin/qrcodes" className="btn admin-quick-action">
            <span>Gerenciar QR Codes e presenças</span>
          </Link>
        </div>

        <div className="mb-4">
          <Calendario reservas={reservasAprovadas} editavel usuarioId={usuarioAtual?.uid || ''} role={perfilUsuario?.role} turmaId={perfilUsuario?.turmaId} />
        </div>
      </div>
    </>
  )
})

export default AdminDashboard
