import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarEventosCalendario } from '../services/eventoService'
import {
  marcarAprovacaoAulaExtraComoLida,
  marcarAulaExtraComoLida,
  listarAulasInscritasAluno,
  observarAprovacoesAulaExtraProfessor,
  observarAulasExtrasDoAluno,
} from '../services/aulaExtraService'
import { observarPresencasAluno } from '../services/presencaService'
import { marcarNotificacoesComoLidas, observarNotificacoesLidas } from '../services/notificacaoService'

function diferencaEmDias(dataIso, hoje) {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  const dataCompromisso = Date.UTC(ano, mes - 1, dia)
  const dataHoje = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  return Math.round((dataCompromisso - dataHoje) / 86400000)
}

function formatarData(dataIso) {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

function notificacaoDentroDaRetencao(notificacao, agora) {
  if (!notificacao.data) return true
  const dataIso = String(notificacao.data).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return true
  const partes = dataIso.split('-').map(Number)
  const [ano, mes, dia] = partes
  const fimDoDia = new Date(ano, mes - 1, dia, 23, 59, 59, 999).getTime()
  const dataValida = new Date(ano, mes - 1, dia)
  if (Number.isNaN(fimDoDia) || dataValida.getFullYear() !== ano || dataValida.getMonth() !== mes - 1 || dataValida.getDate() !== dia) return true
  const cincoDias = 5 * 24 * 60 * 60 * 1000
  return agora <= fimDoDia + cincoDias
}

function horarioFimCompromisso(dataIso, horario, duracaoMinutos = 0) {
  if (!dataIso) return null
  const horarioEncontrado = String(horario || '').match(/(?:^|\D)([01]?\d|2[0-3]):([0-5]\d)/)
  const fim = new Date(`${dataIso}T${horarioEncontrado ? `${horarioEncontrado[1].padStart(2, '0')}:${horarioEncontrado[2]}` : '23:59:59'}`)
  if (Number.isNaN(fim.getTime())) return null
  if (horarioEncontrado) fim.setMinutes(fim.getMinutes() + duracaoMinutos)
  return fim.getTime()
}

function NotificacoesBell({ reservas = [], usuarioId = '', role = '', turmaId = '' }) {
  const [eventos, setEventos] = useState([])
  const [aulasExtras, setAulasExtras] = useState([])
  const [aulasInscritas, setAulasInscritas] = useState([])
  const [presencas, setPresencas] = useState([])
  const [aprovacoesAulas, setAprovacoesAulas] = useState([])
  const [notificacoesLidas, setNotificacoesLidas] = useState(() => new Set())
  const [aberto, setAberto] = useState(false)
  const [hoje, setHoje] = useState(() => new Date())
  const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

  useEffect(() => {
    setNotificacoesLidas(new Set())
    if (!usuarioId) return undefined
    return observarNotificacoesLidas(
      usuarioId,
      setNotificacoesLidas,
      (error) => console.error('Erro ao acompanhar notificações visualizadas:', error),
    )
  }, [usuarioId])

  useEffect(() => {
    let ativo = true
    listarEventosCalendario()
      .then((dados) => {
        if (ativo) setEventos(dados)
      })
      .catch((error) => {
        console.error('Erro ao carregar notificações do calendário:', error)
      })

    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    if (role !== 'aluno') {
      return undefined
    }
    return observarAulasExtrasDoAluno({
      uid: usuarioId,
      turmaId,
      aoAtualizar: setAulasExtras,
      aoErro: (error) => console.error('Erro ao acompanhar aulas extras da turma:', error),
    })
  }, [role, turmaId, usuarioId])

  useEffect(() => {
    if (role !== 'professor') return undefined
    return observarAprovacoesAulaExtraProfessor({
      professorUid: usuarioId,
      aoAtualizar: setAprovacoesAulas,
      aoErro: (error) => console.error('Erro ao acompanhar aprovações de aulas extras:', error),
    })
  }, [role, usuarioId])

  useEffect(() => {
    const intervalo = setInterval(() => setHoje(new Date()), 60000)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    if (role !== 'aluno') return undefined
    return observarPresencasAluno(usuarioId, setPresencas, (error) => {
      console.error('Erro ao acompanhar presenças registradas:', error)
    })
  }, [role, usuarioId])

  useEffect(() => {
    if (role !== 'aluno' || !usuarioId) return undefined

    let ativo = true
    const compromissosPassados = aulasExtras.filter((aula) => (
      aula.data && aula.data <= hojeIso && aula.statusAula !== 'cancelada'
    ))

    listarAulasInscritasAluno({ uid: usuarioId, aulas: compromissosPassados })
      .then((dados) => { if (ativo) setAulasInscritas(dados) })
      .catch((error) => console.error('Erro ao consultar inscrições para alertas de ausência:', error))

    return () => { ativo = false }
    }, [aulasExtras, hojeIso, role, usuarioId])

  const notificacoes = useMemo(() => {
    const compromissos = [
      ...eventos.map((evento) => ({
        id: `evento-${evento.id}`,
        titulo: evento.titulo,
        tipo: evento.tipo === 'Reserva' ? 'Reserva do calendário' : 'Evento',
        data: evento.data,
        detalhe: evento.descricao,
      })),
      ...reservas
        .filter((reserva) => reserva.status === 'aprovada')
        .map((reserva) => ({
          id: `reserva-${reserva.id}`,
          titulo: reserva.localNome || 'Reserva aprovada',
          tipo: 'Reserva aprovada',
          data: reserva.dataReserva,
          detalhe: [reserva.horarioInicio, reserva.horarioFim].filter(Boolean).join(' - '),
        })),
    ]

    const compromissosProximos = compromissos
      .map((compromisso) => ({
        ...compromisso,
        diasRestantes: diferencaEmDias(compromisso.data, hoje),
      }))
      .filter((compromisso) => compromisso.diasRestantes >= 0 && compromisso.diasRestantes <= 5)
      .sort((a, b) => a.diasRestantes - b.diasRestantes || a.data.localeCompare(b.data))
    const notificacoesAulas = (role === 'aluno' ? aulasExtras : [])
      .filter((aula) => !aula.lida)
      .map((aula) => ({
        id: `aula-extra-${aula.id}`,
        aulaId: aula.id,
        titulo: aula.titulo,
        tipo: 'Nova aula extra disponível',
        data: aula.data,
        detalhe: [aula.materia, aula.localNome].filter(Boolean).join(' · '),
        aulaExtra: true,
      }))
    const notificacoesAprovacoes = role === 'professor'
      ? aprovacoesAulas.filter((solicitacao) => !solicitacao.aprovacaoLida).map((solicitacao) => ({
        id: `aula-extra-aprovada-${solicitacao.id}`,
        solicitacaoId: solicitacao.id,
        titulo: solicitacao.titulo,
        tipo: 'Sua aula extra foi aprovada',
        data: solicitacao.data,
        detalhe: [solicitacao.materia, solicitacao.localNome].filter(Boolean).join(' · '),
        aprovacaoAulaExtra: true,
      }))
      : []

    const ausenciasReservas = (role === 'aluno' ? reservas : [])
      .filter((reserva) => reserva.status === 'aprovada')
      .filter((reserva) => {
        const fim = horarioFimCompromisso(reserva.dataReserva, reserva.horarioFim)
        const presencaRegistrada = presencas.some((presenca) => (
          presenca.tipo === 'local' && presenca.reservaId === reserva.id && presenca.status === 'presente'
        ))
        return fim !== null && fim < hoje.getTime() && !presencaRegistrada
      })
      .map((reserva) => ({
        id: `ausencia-reserva-${reserva.id}`,
        titulo: reserva.localNome || 'Reserva',
        tipo: 'Compromisso perdido',
        data: reserva.dataReserva,
        detalhe: [reserva.horarioInicio, reserva.horarioFim].filter(Boolean).join(' - '),
        alertaAusencia: true,
      }))

    const ausenciasAulas = (role === 'aluno' ? aulasInscritas : [])
      .filter((aula) => {
        const fim = horarioFimCompromisso(aula.data, aula.horario, 120)
        const presencaQr = presencas.some((presenca) => (
          presenca.tipo === 'aulaExtra' && presenca.alvoId === aula.id && presenca.status === 'presente'
        ))
        const presencaProfessor = aula.inscricao?.presenca === 'presente'
        return fim !== null && fim < hoje.getTime() && !presencaQr && !presencaProfessor
      })
      .map((aula) => ({
        id: `ausencia-aula-${aula.id}`,
        titulo: aula.titulo || 'Aula extra',
        tipo: 'Compromisso perdido',
        data: aula.data,
        detalhe: [aula.materia, aula.localNome].filter(Boolean).join(' · '),
        alertaAusencia: true,
      }))

    return [...ausenciasReservas, ...ausenciasAulas, ...notificacoesAulas, ...notificacoesAprovacoes, ...compromissosProximos]
      .filter((notificacao) => notificacaoDentroDaRetencao(notificacao, hoje.getTime()))
  }, [aulasExtras, aulasInscritas, aprovacoesAulas, eventos, hoje, presencas, reservas, role])

  const notificacoesNovas = notificacoes.filter((notificacao) => !notificacoesLidas.has(notificacao.id))

  function alternarPainelNotificacoes() {
    const vaiAbrir = !aberto
    setAberto(vaiAbrir)
    if (!vaiAbrir || notificacoesNovas.length === 0) return

    const novasIds = notificacoesNovas.map((notificacao) => notificacao.id)
    setNotificacoesLidas((atuais) => new Set([...atuais, ...novasIds]))
    marcarNotificacoesComoLidas(usuarioId, notificacoesNovas).catch((error) => {
      console.error('Erro ao salvar notificações visualizadas:', error)
      setNotificacoesLidas((atuais) => {
        const atualizadas = new Set(atuais)
        novasIds.forEach((id) => atualizadas.delete(id))
        return atualizadas
      })
    })
  }

  async function abrirNotificacaoAula(aulaId) {
    try {
      await marcarAulaExtraComoLida({ uid: usuarioId, aulaId })
      setAulasExtras((atuais) => atuais.map((aula) => aula.id === aulaId ? { ...aula, lida: true } : aula))
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }

  async function abrirNotificacaoAprovacao(solicitacaoId) {
    try {
      await marcarAprovacaoAulaExtraComoLida({ professorUid: usuarioId, solicitacaoId })
      setAprovacoesAulas((atuais) => atuais.map((solicitacao) => (
        solicitacao.id === solicitacaoId ? { ...solicitacao, aprovacaoLida: true } : solicitacao
      )))
    } catch (error) {
      console.error('Erro ao marcar aprovação como lida:', error)
    }
  }

  function textoPrazo(dias) {
    if (dias === 0) return 'Hoje'
    if (dias === 1) return 'Amanhã'
    return `Faltam ${dias} dias`
  }

  return (
    <div className="notification-area">
      <button
        type="button"
        className={`notification-bell ${notificacoesNovas.length ? 'has-notifications' : ''}`}
        aria-label={`Notificações${notificacoesNovas.length ? `, ${notificacoesNovas.length} novas` : ''}`}
        aria-expanded={aberto}
        aria-controls="notificacoes-proximas"
        title="Notificações de aulas extras, eventos e reservas"
        onClick={alternarPainelNotificacoes}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {notificacoesNovas.length > 0 && (
          <span className="notification-count" aria-hidden="true">
            {notificacoesNovas.length > 9 ? '9+' : notificacoesNovas.length}
          </span>
        )}
      </button>

      {aberto && (
        <div id="notificacoes-proximas" className="notification-panel" aria-label="Próximos compromissos">
          <div className="notification-panel-header">
            <strong>Notificações e compromissos</strong>
            <span>{notificacoesNovas.length} novas</span>
          </div>
          {notificacoes.length ? (
            <ul className="notification-list">
              {notificacoes.map((notificacao) => (
                <li key={notificacao.id}>
                  {notificacao.aulaExtra || notificacao.aprovacaoAulaExtra ? (
                    <Link
                      to="/dashboard/aulas-extras"
                      className="notification-item notification-item-link"
                      onClick={() => notificacao.aulaExtra
                        ? abrirNotificacaoAula(notificacao.aulaId)
                        : abrirNotificacaoAprovacao(notificacao.solicitacaoId)}
                    >
                      <span className="notification-item-date">{formatarData(notificacao.data)}</span>
                      <span className="notification-item-content">
                        <strong>{notificacao.titulo}</strong>
                        <span>{notificacao.tipo}{notificacao.detalhe ? ` · ${notificacao.detalhe}` : ''}</span>
                      </span>
                      <span className="notification-item-time">
                        {notificacoesLidas.has(notificacao.id)
                          ? 'Visualizada'
                          : notificacao.aprovacaoAulaExtra ? 'Aprovada' : 'Nova'}
                      </span>
                    </Link>
                  ) : (
                    <div className="notification-item">
                      <span className="notification-item-date">{formatarData(notificacao.data)}</span>
                      <div className="notification-item-content">
                        <strong>{notificacao.titulo}</strong>
                        <span>{notificacao.tipo}{notificacao.detalhe ? ` · ${notificacao.detalhe}` : ''}</span>
                      </div>
                      <span className={`notification-item-time ${notificacao.alertaAusencia ? 'is-missed' : ''}`}>
                        {notificacao.alertaAusencia ? 'Presença não registrada' : textoPrazo(notificacao.diasRestantes)}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="notification-empty">Nenhum aviso ou compromisso próximo.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificacoesBell
