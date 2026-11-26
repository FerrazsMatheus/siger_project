const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send'

export async function enviarEmailDecisao({ destinatario, nome, tipo, status, detalhes = {} }) {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('Configure VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID e VITE_EMAILJS_PUBLIC_KEY.')
  }
  if (!destinatario) throw new Error('O usuário não possui e-mail cadastrado.')

  const aprovada = status === 'aprovada'
  const horarioInicio = detalhes.horarioInicio || detalhes.horario || ''
  const horarioFim = detalhes.horarioFim || ''
  const horario = horarioFim ? `${horarioInicio} às ${horarioFim}` : horarioInicio
  const data = detalhes.data || ''
  const assunto = detalhes.assunto || tipo
  const localNome = detalhes.localNome || ''
  const observacao = detalhes.observacao || ''
  const nomeUsuario = nome || 'Usuário'
  const statusLabel = aprovada ? 'Aprovada' : 'Recusada'
  const dataFormatada = /^\d{4}-\d{2}-\d{2}$/.test(data)
    ? new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR')
    : data
  const dataHorario = [dataFormatada, horario].filter(Boolean).join(', ')
  const params = {
    // Aliases comuns para acomodar os nomes usados nos templates EmailJS.
    to_email: destinatario,
    email: destinatario,
    user_email: destinatario,
    usuario_email: destinatario,
    to_name: nomeUsuario,
    user_name: nomeUsuario,
    name: nomeUsuario,
    nome: nomeUsuario,
    usuario: nomeUsuario,
    usuario_nome: nomeUsuario,
    nome_usuario: nomeUsuario,
    tipo_solicitacao: tipo,
    tipo: tipo,
    request_type: tipo,
    status,
    status_label: statusLabel,
    status_texto: statusLabel,
    assunto,
    subject: assunto,
    titulo: assunto,
    title: assunto,
    item_titulo: assunto,
    local_nome: localNome,
    local: localNome,
    data,
    data_reserva: data,
    data_horario: dataHorario,
    horario,
    horario_inicio: horarioInicio,
    horario_fim: horarioFim,
    proposito: detalhes.proposito || '',
    descricao: detalhes.descricao || '',
    materia: detalhes.materia || '',
    turmas: detalhes.turmas || '',
    professor_nome: detalhes.professorNome || '',
    observacao,
    observacao_admin: observacao,
    justificativa: observacao,
    mensagem: `Sua solicitação de ${tipo.toLowerCase()} foi ${aprovada ? 'aprovada' : 'recusada'}.${observacao ? ` Observação: ${observacao}` : ''}`,
  }

  const response = await fetch(EMAILJS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service_id: serviceId, template_id: templateId, user_id: publicKey, template_params: params }),
  })

  if (!response.ok) {
    const motivo = await response.text()
    throw new Error(`EmailJS retornou ${response.status}: ${motivo}`)
  }
}
