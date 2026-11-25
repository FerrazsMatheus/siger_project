import { useCallback, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { encerrarSessao } from '../../services/authService'

const abasAdmin = [
  { to: '/admin', label: 'Visão geral', end: true },
  { to: '/admin/locais', label: 'Locais' },
  { to: '/admin/solicitacoes', label: 'Solicitações' },
  { to: '/admin/aulas-extras', label: 'Aulas Extras' },
  { to: '/admin/contas', label: 'Gerenciamento de contas' },
  { to: '/admin/qrcodes', label: 'Gerenciar QR Codes' },
]

export default function AdminNavbar() {
  const navigate = useNavigate()
  const [menuMobileAberto, setMenuMobileAberto] = useState(false)

  const handleSair = useCallback(async () => {
    await encerrarSessao()
    navigate('/login', { replace: true })
  }, [navigate])

  return (
    <>
      <nav className="topbar">
        <div className="container topbar-inner">
          <div className="brand-wrap">
            <span className="brand-mark">SIGER</span>
            <span className="brand-title">Painel Administrativo</span>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="mobile-menu-toggle"
              aria-controls="admin-mobile-navigation"
              aria-expanded={menuMobileAberto}
              aria-label={menuMobileAberto ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
              onClick={() => setMenuMobileAberto((aberto) => !aberto)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Menu</span>
            </button>
            <Link to="/dashboard" className="topbar-admin-link" aria-label="Ir ao dashboard" title="Ir ao dashboard">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <rect x="3.5" y="4" width="7" height="7" rx="1" />
                <rect x="13.5" y="4" width="7" height="7" rx="1" />
                <rect x="3.5" y="14" width="7" height="6" rx="1" />
                <rect x="13.5" y="14" width="7" height="6" rx="1" />
              </svg>
              <span>Ir ao dashboard</span>
            </Link>
            <button type="button" className="btn btn-light btn-sm topbar-logout-btn" aria-label="Sair da conta" title="Sair" onClick={handleSair}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M10 17l5-5-5-5M15 12H3m9-8h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7" />
              </svg>
              <span>Sair</span>
            </button>
          </div>
        </div>
      </nav>
      <div
        id="admin-mobile-navigation"
        className={`container app-shell admin-navigation-shell ${menuMobileAberto ? 'is-open' : ''}`}
      >
        <div className="card shell-card mb-4 admin-navigation-card">
          <nav className="tab-nav admin-tabs" aria-label="Navegação do admin">
            {abasAdmin.map(({ to, label, end }) => (
              <NavLink
                key={to}
                end={end}
                to={to}
                onClick={() => setMenuMobileAberto(false)}
                className={({ isActive }) => `tab-button ${isActive ? 'active' : ''}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </>
  )
}