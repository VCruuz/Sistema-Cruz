// --- TELA DE LOGIN ---
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usuarioApi } from '../services/api'

export default function TelaLogin() {
  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [erro, setErro]       = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const dados = await usuarioApi.login(email, senha)
      login(dados)
      navigate('/')
    } catch (err) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-verde-900 via-verde-700 to-verde-500 p-4">
      {/* Decoração de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-modal overflow-hidden">
          {/* Cabeçalho do card */}
          <div className="bg-verde-900 px-8 pt-8 pb-6 text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 mb-4">
              <i className="bi bi-building text-white text-2xl"></i>
            </span>
            <h1 className="text-white font-bold text-xl tracking-tight">Cruz Engenharia</h1>
            <p className="text-white/60 text-sm mt-1">Sistema de Gestão</p>
          </div>

          {/* Formulário */}
          <div className="px-8 py-7">
            {erro && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 mb-5 text-sm text-red-700 animate-fade-in">
                <i className="bi bi-exclamation-circle-fill shrink-0"></i>
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">E-mail</label>
                <div className="relative">
                  <i className="bi bi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
                  <input
                    type="email"
                    className="input-field pl-9"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Senha</label>
                <div className="relative">
                  <i className="bi bi-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    className="input-field pl-9 pr-10"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setMostrarSenha(v => !v)}
                  >
                    <i className={`bi ${mostrarSenha ? 'bi-eye-slash' : 'bi-eye'} text-sm`}></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-2.5 mt-2"
              >
                {loading
                  ? <><i className="bi bi-arrow-clockwise animate-spin"></i> Entrando...</>
                  : <><i className="bi bi-box-arrow-in-right"></i> Entrar</>
                }
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          © 2026 Cruz Engenharia · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
