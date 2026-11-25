import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import AdminNavbar from '../../components/admin/AdminNavbar'
import {
  criarLocal,
  listarLocais,
  atualizarLocal,
  excluirLocal,
  TIPOS_LOCAL,
  STATUS_LOCAL,
} from '../../services/locationService'
import { contarSolicitacoesPorLocal } from '../../services/solicitacaoService'
import LocalFormModal from '../../components/admin/LocalFormModal'
import ConfirmDialog from '../../components/admin/ConfirmDialog'
import { enviarImagemCloudinary } from '../../services/cloudinaryService'
import { obterImagensLocal } from '../../services/locationService'

const BADGE_STATUS = {
  Disponível: 'bg-success',
  Indisponível: 'bg-secondary',
  'Em manutenção': 'bg-warning text-dark',
}

const Locais = memo(function Locais() {
  const [locais, setLocais] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState('')

  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  const [modalAberto, setModalAberto] = useState(false)
  const [localEditando, setLocalEditando] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erroFormulario, setErroFormulario] = useState('')
  const [localDescricao, setLocalDescricao] = useState(null)

  const [localExcluindo, setLocalExcluindo] = useState(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState('')
  const [solicitacoesCount, setSolicitacoesCount] = useState(0)

  const carregarLocais = useCallback(async () => {
    setCarregando(true)
    setErroCarregamento('')
    try {
      const dados = await listarLocais()
      setLocais(dados)
    } catch (error) {
      console.error('Erro ao carregar locais:', error)
      setErroCarregamento('Não foi possível carregar os locais. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarLocais()
  }, [carregarLocais])

  const locaisFiltrados = useMemo(() => {
    const buscaNormalizada = busca.trim().toLowerCase()

    return locais.filter((local) => {
      const combinaBusca = !buscaNormalizada || local.name?.toLowerCase().includes(buscaNormalizada)
      const combinaTipo = !filtroTipo || local.type === filtroTipo
      const combinaStatus = !filtroStatus || local.status === filtroStatus
      return combinaBusca && combinaTipo && combinaStatus
    })
  }, [locais, busca, filtroTipo, filtroStatus])

  const resumo = useMemo(() => ({
    total: locais.length,
    disponiveis: locais.filter((local) => local.status === 'Disponível').length,
    manutencao: locais.filter((local) => local.status === 'Em manutenção').length,
    indisponiveis: locais.filter((local) => local.status === 'Indisponível').length,
  }), [locais])

  function abrirNovo() {
    setLocalEditando(null)
    setErroFormulario('')
    setModalAberto(true)
  }

  function abrirEdicao(local) {
    setLocalEditando(local)
    setErroFormulario('')
    setModalAberto(true)
  }

  function abrirDescricao(local) {
    setLocalDescricao(local)
  }

  async function handleSalvar(dadosFormulario) {
    setSalvando(true)
    setErroFormulario('')
    try {
      const { images, ...dadosLocal } = dadosFormulario
      const imagensSalvas = await Promise.all((images || []).map(async (imagem) => {
        if (imagem.file) {
          const enviada = await enviarImagemCloudinary(imagem.file)
          return { url: enviada.imageUrl, publicId: enviada.imagePublicId }
        }
        return { url: imagem.url, publicId: imagem.publicId || '' }
      }))
      const dadosParaSalvar = { ...dadosLocal, images: imagensSalvas }

      if (localEditando) {
        await atualizarLocal(localEditando.id, dadosParaSalvar)
      } else {
        await criarLocal(dadosParaSalvar)
      }
      setModalAberto(false)
      await carregarLocais()
    } catch (error) {
      console.error('Erro ao salvar local:', error)
      setErroFormulario(error.message || 'Não foi possível salvar o local. Verifique os dados e tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  async function pedirExclusao(local) {
    setLocalExcluindo(local)
    setErroExclusao('')
    try {
      const count = await contarSolicitacoesPorLocal(local.id)
      setSolicitacoesCount(count)
    } catch (error) {
      console.error('Erro ao contar solicitações:', error)
      setSolicitacoesCount(0)
    }
  }

  async function confirmarExclusao() {
    if (!localExcluindo) return
    setExcluindo(true)
    setErroExclusao('')
    try {
      await excluirLocal(localExcluindo.id)
      setLocalExcluindo(null)
      setSolicitacoesCount(0)
      await carregarLocais()
    } catch (error) {
      console.error('Erro ao excluir local:', error)
      setErroExclusao('Não foi possível excluir o local. Tente novamente.')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <>
      <AdminNavbar />

      <div className="container app-shell admin-locations-page">
        <div className="stat-grid admin-location-stats mb-4">
          <div className="stat-card">
            <span className="stat-label">Total de locais</span>
            <strong className="stat-value">{carregando ? '—' : resumo.total}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Disponíveis</span>
            <strong className="stat-value success">{carregando ? '—' : resumo.disponiveis}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Em manutenção</span>
            <strong className="stat-value warning">{carregando ? '—' : resumo.manutencao}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Indisponíveis</span>
            <strong className="stat-value muted">{carregando ? '—' : resumo.indisponiveis}</strong>
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4 admin-locations-heading">
          <div>
            <span className="eyebrow">Infraestrutura</span>
            <h2 className="h4 mb-0">Locais cadastrados</h2>
          </div>
          <button type="button" className="btn btn-primary" onClick={abrirNovo}>
            Adicionar local
          </button>
        </div>

        <div className="card mb-4 admin-locations-filters">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-12 col-md-5">
                <label htmlFor="busca" className="form-label">
                  Pesquisar por nome
                </label>
                <input
                  id="busca"
                  type="text"
                  className="form-control"
                  placeholder="Ex: Laboratório de Informática"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              <div className="col-6 col-md-3">
                <label htmlFor="filtro-tipo" className="form-label">
                  Tipo
                </label>
                <select
                  id="filtro-tipo"
                  className="form-select"
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                >
                  <option value="">Todos</option>
                  {TIPOS_LOCAL.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-6 col-md-3">
                <label htmlFor="filtro-status" className="form-label">
                  Status
                </label>
                <select
                  id="filtro-status"
                  className="form-select"
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                >
                  <option value="">Todos</option>
                  {STATUS_LOCAL.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {erroCarregamento && (
          <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
            <span>{erroCarregamento}</span>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={carregarLocais}>
              Tentar novamente
            </button>
          </div>
        )}

        {carregando ? (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        ) : !erroCarregamento && locaisFiltrados.length === 0 ? (
          <div className="card">
            <div className="card-body text-center text-muted py-5">
              {locais.length === 0
                ? 'Nenhum local cadastrado.'
                : 'Nenhum local encontrado para os filtros selecionados.'}
            </div>
          </div>
        ) : (
          !erroCarregamento && (
            <div className="admin-locations-results">
              <div className="card admin-locations-table">
                <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Imagem</th>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>Bloco</th>
                      <th>Andar</th>
                      <th>Capacidade</th>
                      <th>Status</th>
                      <th>Descrição</th>
                      <th className="text-end">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locaisFiltrados.map((local) => (
                      <tr key={local.id}>
                        <td>
                          {obterImagensLocal(local)[0]?.url ? (
                            <img
                              src={obterImagensLocal(local)[0].url}
                              alt={`Imagem de ${local.name}`}
                              className="rounded border"
                              style={{ width: 56, height: 40, objectFit: 'cover' }}
                            />
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="fw-semibold">{local.name}</td>
                        <td>{local.type}</td>
                        <td>{local.building || '-'}</td>
                        <td>{local.floor ?? '-'}</td>
                        <td>{local.capacity}</td>
                        <td>
                          <span className={`badge ${BADGE_STATUS[local.status] || 'bg-secondary'}`}>
                            {local.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-info"
                            onClick={() => abrirDescricao(local)}
                          >
                            Ver descrição
                          </button>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-2"
                            onClick={() => abrirEdicao(local)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => pedirExclusao(local)}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              <div className="admin-locations-cards">
                {locaisFiltrados.map((local) => {
                  const imagem = obterImagensLocal(local)[0]?.url
                  return (
                    <article className="admin-location-card" key={local.id}>
                      <div className="admin-location-card-heading">
                        {imagem ? (
                          <img src={imagem} alt={`Imagem de ${local.name}`} />
                        ) : (
                          <div className="admin-location-image-placeholder" aria-hidden="true">Local</div>
                        )}
                        <div className="admin-location-card-title">
                          <div className="d-flex align-items-start justify-content-between gap-2">
                            <h3 className="h6 mb-1">{local.name}</h3>
                            <span className={`badge ${BADGE_STATUS[local.status] || 'bg-secondary'}`}>
                              {local.status || 'Sem status'}
                            </span>
                          </div>
                          <span className="small text-muted">{local.type || 'Tipo não informado'}</span>
                        </div>
                      </div>

                      <dl className="admin-location-facts">
                        <div><dt>Bloco</dt><dd>{local.building || '—'}</dd></div>
                        <div><dt>Andar</dt><dd>{local.floor ?? '—'}</dd></div>
                        <div><dt>Capacidade</dt><dd>{local.capacity ? `${local.capacity} pessoas` : '—'}</dd></div>
                      </dl>

                      <div className="admin-location-actions">
                        <button type="button" className="btn btn-sm btn-outline-info" onClick={() => abrirDescricao(local)}>
                          Descrição
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => abrirEdicao(local)}>
                          Editar
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => pedirExclusao(local)}>
                          Excluir
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )
        )}
      </div>

      {modalAberto && <LocalFormModal
        aberto={modalAberto}
        local={localEditando}
        salvando={salvando}
        erro={erroFormulario}
        onCancelar={() => setModalAberto(false)}
        onSalvar={handleSalvar}
      />}

      {localDescricao && (
        <>
          <div className="modal d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Detalhes do local</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setLocalDescricao(null)}
                    aria-label="Fechar"
                  />
                </div>
                <div className="modal-body">
                  <h6 className="mb-3">{localDescricao.name}</h6>
                  {obterImagensLocal(localDescricao).length > 0 && (
                    <div className="row g-2 mb-3">
                      {obterImagensLocal(localDescricao).map((imagem, index) => (
                        <div className="col-6" key={`${imagem.publicId || imagem.url}-${index}`}>
                          <img
                            src={imagem.url}
                            alt={`Imagem ${index + 1} de ${localDescricao.name}`}
                            className="img-fluid rounded border w-100"
                            style={{ aspectRatio: '4 / 3', objectFit: 'cover' }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <section className="mb-3">
                    <h6>Descrição</h6>
                    {localDescricao.description?.trim() ? (
                      <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                        {localDescricao.description}
                      </p>
                    ) : (
                      <p className="text-muted mb-0">Nenhuma descrição cadastrada.</p>
                    )}
                  </section>
                  <section className="mb-3">
                    <h6>Acessibilidade</h6>
                    {Array.isArray(localDescricao.accessibility) && localDescricao.accessibility.length > 0 ? (
                      <ul className="mb-0">
                        {localDescricao.accessibility.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : (
                      <p className="text-muted mb-0">Nenhum item informado.</p>
                    )}
                  </section>
                  <section>
                    <h6>Equipamentos e recursos</h6>
                    {Array.isArray(localDescricao.resources) && localDescricao.resources.length > 0 ? (
                      <ul className="mb-0">
                        {localDescricao.resources.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    ) : (
                      <p className="text-muted mb-0">Nenhum item informado.</p>
                    )}
                  </section>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-primary" onClick={() => setLocalDescricao(null)}>
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show" />
        </>
      )}

      <ConfirmDialog
        aberto={!!localExcluindo}
        titulo="Excluir local"
        mensagem={`Tem certeza de que deseja excluir "${localExcluindo?.name}"?${solicitacoesCount > 0 ? ` Essa ação também excluirá ${solicitacoesCount} solicitação(ões) associada(s) a este local.` : ''} Essa ação não poderá ser desfeita.`}
        erro={erroExclusao}
        confirmando={excluindo}
        onCancelar={() => { setLocalExcluindo(null); setSolicitacoesCount(0) }}
        onConfirmar={confirmarExclusao}
      />
    </>
  )
})

export default Locais
