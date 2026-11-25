import Calendario from '../components/Calendario'

function Inicio({
  nomeExibido,
  usuarioAtual,
  perfilUsuario,
  perfilLabel,
  tipoUsuario,
  reservas,
}) {
  return (
    <div className="space-y-4">
      <div className="card shell-card profile-card">
        <div className="card-body profile-body">
          <div>
            <span className="eyebrow">Acesso</span>
            <h2 className="h3 mb-2">Olá, {nomeExibido}!</h2>
          </div>
          <div className="profile-meta">
            <div className="profile-item">
              <span className="label">E-mail</span>
              <strong>{usuarioAtual?.email}</strong>
            </div>
            <div className="profile-item">
              <span className="label">Perfil</span>
              <span className="user-badge">{perfilLabel}</span>
            </div>
          </div>
          {tipoUsuario === 'professor' && (
            <div className="alert alert-info py-2 small mb-0" role="alert">
              Você está acessando como professor. Seu perfil é de usuário comum, sem privilégios de administrador.
            </div>
          )}
          {tipoUsuario === 'aluno' && (
            <div className="alert alert-light border py-2 small mb-0" role="alert">
              Você está acessando como aluno.
            </div>
          )}
        </div>
      </div>

      <Calendario reservas={reservas} usuarioId={usuarioAtual?.uid || ''} role={tipoUsuario} turmaId={perfilUsuario?.turmaId} />
    </div>
  )
}

export default Inicio