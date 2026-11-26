import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { cadastrarUsuario, traduzirErroFirebase } from '../services/authService'
import { finalizarCadastroVerificado, validarCadastroVerificado } from '../services/verifiedAccountService'
import { criarDocumentoUsuario } from '../services/userService'

const ESTADO_INICIAL = {
  nome: '',
  email: '',
  matricula: '',
  senha: '',
  confirmarSenha: '',
}

export default function Cadastro() {
  const { autenticado, carregando: carregandoAuth, refreshPerfilUsuario } = useAuth()

  const [form, setForm] = useState(ESTADO_INICIAL)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!carregandoAuth && autenticado) {
    return <Navigate to="/dashboard" replace />
  }

  function handleChange(campo) {
    return (event) => {
      setForm((atual) => ({ ...atual, [campo]: event.target.value }))
    }
  }

  function validar() {
    const { nome, email, matricula, senha, confirmarSenha } = form

    if (!nome.trim() || !email.trim() || !matricula.trim() || !senha || !confirmarSenha) {
      return 'Preencha todos os campos obrigatórios.'
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    if (!emailValido) {
      return 'Informe um e-mail em formato válido.'
    }

    if (senha.length < 6) {
      return 'A senha deve ter pelo menos 6 caracteres.'
    }

    if (senha !== confirmarSenha) {
      return 'As senhas não coincidem.'
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErro('')
    setSucesso('')

    const mensagemValidacao = validar()
    if (mensagemValidacao) {
      setErro(mensagemValidacao)
      return
    }

    setEnviando(true)
    try {
      const { nome, email, matricula, senha } = form
      const validacao = await validarCadastroVerificado({
        nome: nome.trim(),
        email: email.trim(),
        matricula: matricula.trim(),
      })

      if (!validacao.ok) {
        setErro(validacao.erro)
        return
      }

      const tipoConta = validacao.conta.tipo

      const emailNormalizado = email.trim().toLowerCase()
      const usuario = await cadastrarUsuario({ nome: nome.trim(), email: emailNormalizado, senha })

      await criarDocumentoUsuario(usuario.uid, {
        name: nome.trim(),
        email: emailNormalizado,
        role: tipoConta,
        verifiedAccountId: validacao.conta.id,
        turmaId: validacao.conta.turmaId || null,
        turmaNome: validacao.conta.turma || '',
        matricula: matricula.trim(),
      })

      await finalizarCadastroVerificado({
        verifiedAccountId: validacao.conta.id,
        authUid: usuario.uid,
      })

      await refreshPerfilUsuario(usuario.uid)

      setSucesso('Cadastro realizado com sucesso! Redirecionando...')
      // onAuthStateChanged cuida do redirecionamento para /dashboard
    } catch (error) {
      setErro(traduzirErroFirebase(error))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light py-4">
      <div className="card shadow-sm" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-body p-4">
          <h1 className="h4 text-center mb-1">Criar conta</h1>
          <p className="text-center text-muted mb-4">Use o e-mail informado no seu cadastro pré-verificado</p>

          {erro && (
            <div className="alert alert-danger py-2" role="alert">
              {erro}
            </div>
          )}
          {sucesso && (
            <div className="alert alert-success py-2" role="alert">
              {sucesso}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="nome" className="form-label">
                Nome
              </label>
              <input
                id="nome"
                type="text"
                className="form-control"
                value={form.nome}
                onChange={handleChange('nome')}
                autoComplete="name"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                className="form-control"
                placeholder="nome@exemplo.com"
                value={form.email}
                onChange={handleChange('email')}
                autoComplete="email"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="matricula" className="form-label">
                Matrícula / identificador institucional
              </label>
              <input
                id="matricula"
                type="text"
                className="form-control"
                value={form.matricula}
                onChange={handleChange('matricula')}
                autoComplete="off"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="senha" className="form-label">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                className="form-control"
                value={form.senha}
                onChange={handleChange('senha')}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="confirmarSenha" className="form-label">
                Confirmar senha
              </label>
              <input
                id="confirmarSenha"
                type="password"
                className="form-control"
                value={form.confirmarSenha}
                onChange={handleChange('confirmarSenha')}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-100" disabled={enviando}>
              {enviando ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                  Cadastrando...
                </>
              ) : (
                'Cadastrar'
              )}
            </button>
          </form>

          <p className="text-center mt-3 mb-0">
            Já tem uma conta? <Link to="/login">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
