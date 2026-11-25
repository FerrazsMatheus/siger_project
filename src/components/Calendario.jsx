import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  criarEventoCalendario,
  excluirEventoCalendario,
  listarEventosCalendario,
} from '../services/eventoService'
import { listarAulasExtras } from '../services/aulaExtraService'

function formatarDataIso(data) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function Calendario({ reservas = [], editavel = false, usuarioId = '', role = '', turmaId = '' }) {
  const [mesAtual, setMesAtual] = useState(() => new Date())
  const [diaSelecionado, setDiaSelecionado] = useState(() => new Date())
  const [eventos, setEventos] = useState([])
  const [aulasExtras, setAulasExtras] = useState([])
  const [novoEvento, setNovoEvento] = useState({ titulo: '', tipo: 'Evento', descricao: '' })
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [eventosDiaAberto, setEventosDiaAberto] = useState(false)
  const [posicaoPopover, setPosicaoPopover] = useState(null)
  const [formularioEventoAberto, setFormularioEventoAberto] = useState(false)
  const [erroFormularioEvento, setErroFormularioEvento] = useState('')
  const eventosDiaId = useId()
  const diaSelecionadoRef = useRef(null)
  const popoverRef = useRef(null)

  useEffect(() => {
    let ativo = true
    Promise.allSettled([
      listarEventosCalendario(),
      listarAulasExtras({ uid: usuarioId, role, turmaId }),
    ])
      .then(([resultadoEventos, resultadoAulas]) => {
        if (!ativo) return
        if (resultadoEventos.status === 'fulfilled') {
          setEventos(resultadoEventos.value)
        } else {
          console.error('Erro ao carregar eventos do calendário:', resultadoEventos.reason)
          setErro('Não foi possível carregar os eventos do calendário.')
        }
        if (resultadoAulas.status === 'fulfilled') {
          setAulasExtras(resultadoAulas.value)
        } else {
          console.error('Erro ao carregar aulas extras do calendário:', resultadoAulas.reason)
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [role, turmaId, usuarioId])

  const diasDoCalendario = useMemo(() => {
    const primeiroDiaMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1)
    const deslocamento = (primeiroDiaMes.getDay() + 6) % 7
    const inicioCalendario = new Date(primeiroDiaMes)
    inicioCalendario.setDate(primeiroDiaMes.getDate() - deslocamento)

    return Array.from({ length: 42 }, (_, indice) => {
      const dia = new Date(inicioCalendario)
      dia.setDate(inicioCalendario.getDate() + indice)
      return dia
    })
  }, [mesAtual])

  const compromissos = useMemo(() => {
    const reservasAprovadas = reservas
      .filter((reserva) => reserva.status === 'aprovada')
      .map((reserva) => ({
        id: `reserva-${reserva.id}`,
        titulo: reserva.localNome || 'Reserva aprovada',
        tipo: 'Reserva aprovada',
        data: reserva.dataReserva,
        descricao: [
          reserva.usuarioNome && editavel ? `Solicitante: ${reserva.usuarioNome}` : '',
          [reserva.horarioInicio, reserva.horarioFim].filter(Boolean).join(' - '),
          reserva.proposito,
        ].filter(Boolean).join(' · '),
        reserva: true,
      }))

    const aulasMapeadas = aulasExtras.map((aula) => ({
      id: `aula-extra-${aula.id}`,
      titulo: aula.titulo,
      tipo: 'Aula Extra',
      data: aula.data,
      descricao: [
        aula.materia,
        aula.horario,
        aula.localNome,
        aula.professorNome ? `Professor: ${aula.professorNome}` : '',
        aula.descricao,
      ].filter(Boolean).join(' · '),
      reserva: false,
      aulaExtra: true,
    }))

    return [...eventos.map((evento) => ({ ...evento, reserva: false })), ...reservasAprovadas, ...aulasMapeadas]
  }, [eventos, aulasExtras, editavel, reservas])

  const compromissosPorDia = useMemo(() => {
    return compromissos.reduce((agrupados, compromisso) => {
      agrupados[compromisso.data] = [...(agrupados[compromisso.data] || []), compromisso]
      return agrupados
    }, {})
  }, [compromissos])

  const diaSelecionadoIso = formatarDataIso(diaSelecionado)
  const compromissosSelecionados = compromissosPorDia[diaSelecionadoIso] || []

  useLayoutEffect(() => {
    if (!eventosDiaAberto) return undefined

    function posicionarPopover() {
      const ancora = diaSelecionadoRef.current
      const popover = popoverRef.current
      if (!ancora || !popover) return

      const ancoraRect = ancora.getBoundingClientRect()
      const popoverRect = popover.getBoundingClientRect()
      const espacamento = 10
      const margem = 12
      const abaixo = window.innerHeight - ancoraRect.bottom
      const acima = ancoraRect.top
      const abrirAcima = abaixo < popoverRect.height + espacamento && acima > abaixo
      const topoDesejado = abrirAcima
        ? ancoraRect.top - popoverRect.height - espacamento
        : ancoraRect.bottom + espacamento
      const esquerdaDesejada = ancoraRect.left + ancoraRect.width / 2 - popoverRect.width / 2
      const esquerda = Math.max(margem, Math.min(esquerdaDesejada, window.innerWidth - popoverRect.width - margem))

      setPosicaoPopover({
        top: Math.max(margem, Math.min(topoDesejado, window.innerHeight - popoverRect.height - margem)),
        left: esquerda,
        abrirAcima,
        setaLeft: Math.max(18, Math.min(ancoraRect.left + ancoraRect.width / 2 - esquerda, popoverRect.width - 18)),
      })
    }

    posicionarPopover()
    window.addEventListener('resize', posicionarPopover)
    window.addEventListener('scroll', posicionarPopover, true)
    return () => {
      window.removeEventListener('resize', posicionarPopover)
      window.removeEventListener('scroll', posicionarPopover, true)
    }
  }, [eventosDiaAberto, diaSelecionadoIso, compromissosSelecionados.length])

  async function adicionarEvento(event) {
    event.preventDefault()
    const titulo = novoEvento.titulo.trim()
    if (!titulo || !usuarioId) return

    setSalvando(true)
    setErroFormularioEvento('')
    try {
      const evento = await criarEventoCalendario({
        ...novoEvento,
        titulo,
        data: diaSelecionadoIso,
        criadoPor: usuarioId,
      })
      setEventos((atuais) => [...atuais, evento])
      setNovoEvento({ titulo: '', tipo: 'Evento', descricao: '' })
      setFormularioEventoAberto(false)
    } catch (error) {
      console.error('Erro ao salvar evento:', error)
      setErroFormularioEvento('Não foi possível salvar o evento. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  function fecharFormularioEvento() {
    if (salvando) return
    setFormularioEventoAberto(false)
    setErroFormularioEvento('')
  }

  async function removerEvento(id) {
    setErro('')
    try {
      await excluirEventoCalendario(id)
      setEventos((atuais) => atuais.filter((evento) => evento.id !== id))
    } catch (error) {
      console.error('Erro ao excluir evento:', error)
      setErro('Não foi possível excluir o evento. Tente novamente.')
    }
  }

  function selecionarDia(dia) {
    const mesmoDia = formatarDataIso(dia) === diaSelecionadoIso
    setDiaSelecionado(dia)
    setEventosDiaAberto((aberto) => !mesmoDia || !aberto)
    setFormularioEventoAberto(false)
    setPosicaoPopover(null)
    setNovoEvento((atual) => ({ ...atual, titulo: '', descricao: '' }))
  }

  return (
    <section className="card shell-card" aria-labelledby="calendario-titulo">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
          <div>
            <h3 id="calendario-titulo" className="h5 mb-1">Calendário de reservas e eventos</h3>
            <p className="text-muted mb-0">
              {editavel
                ? 'Acompanhe reservas aprovadas e publique eventos para todos os usuários.'
                : 'Suas reservas aprovadas e os eventos publicados pela administração.'}
            </p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              aria-label="Mês anterior"
              onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1))}
            >
              ‹
            </button>
            <span className="fw-semibold text-capitalize">
              {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              aria-label="Próximo mês"
              onClick={() => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1))}
            >
              ›
            </button>
          </div>
        </div>

        {erro && <div className="alert alert-danger py-2" role="alert">{erro}</div>}
        {carregando && <p className="small text-muted" role="status">Carregando eventos...</p>}

        <div className="calendar-grid calendar-weekdays" aria-hidden="true">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((dia) => <span key={dia}>{dia}</span>)}
        </div>
        <div className="calendar-grid">
          {diasDoCalendario.map((dia) => {
            const iso = formatarDataIso(dia)
            const eHoje = iso === formatarDataIso(new Date())
            const selecionado = iso === diaSelecionadoIso
            const eventosDoDia = compromissosPorDia[iso] || []

            return (
              <button
                key={iso}
                type="button"
                ref={selecionado ? diaSelecionadoRef : undefined}
                className={`calendar-day ${selecionado ? 'selected' : ''} ${dia.getMonth() !== mesAtual.getMonth() ? 'outside-month' : ''}`}
                aria-label={`${dia.toLocaleDateString('pt-BR')}, ${eventosDoDia.length} compromissos`}
                aria-pressed={selecionado}
                aria-expanded={selecionado && eventosDiaAberto}
                aria-controls={selecionado ? eventosDiaId : undefined}
                onClick={() => selecionarDia(dia)}
              >
                <span className={`calendar-day-number ${eHoje ? 'today' : ''}`}>{dia.getDate()}</span>
                <span className="calendar-markers" aria-hidden="true">
                  {eventosDoDia.slice(0, 3).map((compromisso) => (
                    <span
                      key={compromisso.id}
                      className={`calendar-marker ${compromisso.reserva || compromisso.tipo === 'Reserva' ? 'reservation' : 'event'}`}
                      title={compromisso.titulo}
                    />
                  ))}
                </span>
                {eventosDoDia.length > 0 && <span className="calendar-day-count">{eventosDoDia.length}</span>}
              </button>
            )
          })}
        </div>

      </div>
      {eventosDiaAberto && createPortal(
        <section
          id={eventosDiaId}
          ref={popoverRef}
          className={`calendar-day-popover ${posicaoPopover?.abrirAcima ? 'opens-above' : ''}`}
          role="region"
          aria-labelledby={`${eventosDiaId}-title`}
          aria-live="polite"
          style={{
            top: posicaoPopover?.top ?? 0,
            left: posicaoPopover?.left ?? 0,
            '--calendar-popover-arrow-left': `${posicaoPopover?.setaLeft ?? 24}px`,
            visibility: posicaoPopover ? 'visible' : 'hidden',
          }}
        >
          <div className="calendar-day-popover-header">
            <div>
              <h4 id={`${eventosDiaId}-title`} className="h6 text-capitalize mb-1">
                {diaSelecionado.toLocaleDateString('pt-BR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </h4>
              <span className="small text-muted">
                {compromissosSelecionados.length} {compromissosSelecionados.length === 1 ? 'compromisso' : 'compromissos'}
              </span>
            </div>
            <button
              type="button"
              className="calendar-day-popover-close"
              aria-label="Fechar compromissos do dia"
              onClick={() => setEventosDiaAberto(false)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div className="calendar-day-popover-list">
            {compromissosSelecionados.length ? (
              compromissosSelecionados.map((compromisso) => (
                <article key={compromisso.id} className="calendar-event-item">
                  <div className="d-flex justify-content-between align-items-center gap-2">
                    <strong className="small">{compromisso.titulo}</strong>
                    <span className={`badge ${compromisso.reserva || compromisso.tipo === 'Reserva' ? 'bg-warning text-dark' : compromisso.aulaExtra ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'}`}>
                      {compromisso.tipo}
                    </span>
                  </div>
                  {compromisso.descricao && <p className="small text-muted mb-0 mt-1">{compromisso.descricao}</p>}
                  {editavel && !compromisso.reserva && !compromisso.aulaExtra && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-danger p-0 mt-2"
                      onClick={() => removerEvento(compromisso.id)}
                    >
                      Excluir evento
                    </button>
                  )}
                </article>
              ))
            ) : (
              <p className="text-muted mb-0">Nenhum evento ou reserva para este dia.</p>
            )}
          </div>
          {editavel && (
            <button
              type="button"
              className="calendar-add-event-button"
              onClick={() => {
                setNovoEvento({ titulo: '', tipo: 'Evento', descricao: '' })
                setErroFormularioEvento('')
                setFormularioEventoAberto(true)
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Adicionar evento neste dia
            </button>
          )}
        </section>,
        document.body,
      )}
      {formularioEventoAberto && createPortal(
        <div
          className="calendar-event-dialog-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) fecharFormularioEvento()
          }}
        >
          <section
            className="calendar-event-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${eventosDiaId}-new-title`}
          >
            <header className="calendar-event-dialog-header">
              <div>
                <span className="eyebrow">Novo evento</span>
                <h3 id={`${eventosDiaId}-new-title`} className="h5 mb-1">Adicionar ao calendário</h3>
                <p className="small text-muted mb-0">
                  {diaSelecionado.toLocaleDateString('pt-BR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
              <button
                type="button"
                className="calendar-day-popover-close"
                aria-label="Fechar cadastro de evento"
                onClick={fecharFormularioEvento}
                disabled={salvando}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </header>
            <form onSubmit={adicionarEvento}>
              {erroFormularioEvento && (
                <div className="alert alert-danger py-2" role="alert">{erroFormularioEvento}</div>
              )}
              <div className="mb-3">
                <label htmlFor={`${eventosDiaId}-new-event-name`} className="form-label">Nome do evento</label>
                <input
                  id={`${eventosDiaId}-new-event-name`}
                  type="text"
                  className="form-control"
                  value={novoEvento.titulo}
                  onChange={(event) => setNovoEvento((atual) => ({ ...atual, titulo: event.target.value }))}
                  autoFocus
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor={`${eventosDiaId}-new-event-type`} className="form-label">Tipo</label>
                <select
                  id={`${eventosDiaId}-new-event-type`}
                  className="form-select"
                  value={novoEvento.tipo}
                  onChange={(event) => setNovoEvento((atual) => ({ ...atual, tipo: event.target.value }))}
                >
                  <option value="Evento">Evento</option>
                  <option value="Reserva">Reserva</option>
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor={`${eventosDiaId}-new-event-description`} className="form-label">Observação</label>
                <textarea
                  id={`${eventosDiaId}-new-event-description`}
                  className="form-control"
                  rows="3"
                  value={novoEvento.descricao}
                  onChange={(event) => setNovoEvento((atual) => ({ ...atual, descricao: event.target.value }))}
                />
              </div>
              <div className="calendar-event-dialog-actions">
                <button type="button" className="btn btn-outline-secondary" onClick={fecharFormularioEvento} disabled={salvando}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvando || !novoEvento.titulo.trim()}>
                  {salvando ? 'Salvando...' : 'Salvar evento'}
                </button>
              </div>
            </form>
          </section>
        </div>,
        document.body,
      )}
    </section>
  )
}

export default Calendario