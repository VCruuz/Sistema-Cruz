// --- TELA DE CLIENTES ---
import { useState, useEffect, useCallback } from 'react'
import { clienteApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { mascaraTelefone, validarTelefone, validarEmail } from '../utils/validacoes'

// --- FORM VAZIO ---
const FORM_VAZIO = { nome: '', telefone: '', email: '', endereco: '' }

// --- VALIDAÇÃO SOMENTE NO SUBMIT / BLUR ---
function validarForm(form) {
  const erros = {}
  if (!form.nome.trim())          erros.nome     = 'Nome é obrigatório.'
  else if (form.nome.trim().length < 2) erros.nome = 'Mínimo 2 caracteres.'
  if (!form.telefone)             erros.telefone = 'Telefone é obrigatório.'
  else if (!validarTelefone(form.telefone)) erros.telefone = 'Use o formato (XX) 9XXXX-XXXX com DDD.'
  if (!form.email)                erros.email    = 'E-mail é obrigatório.'
  else if (!validarEmail(form.email))   erros.email = 'E-mail inválido.'
  if (!form.endereco.trim())      erros.endereco = 'Endereço é obrigatório.'
  return erros
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANTE: Os inputs são declarados FORA do componente principal para evitar
// que o React recrie o elemento do DOM a cada render, o que causaria perda de foco.
// ─────────────────────────────────────────────────────────────────────────────

function InputTexto({ label, campo, tipo = 'text', placeholder, value, onChange, onBlur, erro }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      <input
        type={tipo}
        className={`input-field ${erro ? 'error' : ''}`}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete="off"
      />
      {erro && <p className="form-error">{erro}</p>}
    </div>
  )
}

function InputTelefone({ value, onChange, onBlur, erro }) {
  return (
    <div>
      <label className="form-label">Telefone</label>
      <input
        type="tel"
        className={`input-field ${erro ? 'error' : ''}`}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder="(11) 91234-5678"
        maxLength={15}
        autoComplete="off"
      />
      {erro && <p className="form-error">{erro}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function TelaCliente() {
  const toast = useToast()

  const [clientes,          setClientes]          = useState([])
  const [carregando,        setCarregando]         = useState(true)
  const [modalAberto,       setModalAberto]        = useState(false)
  const [modalVisual,       setModalVisual]        = useState(false)
  const [confirmExcluir,    setConfirmExcluir]     = useState(null)
  const [clienteSelecionado,setClienteSelecionado] = useState(null)
  const [form,              setForm]               = useState(FORM_VAZIO)
  const [errosForm,         setErrosForm]          = useState({})
  const [loading,           setLoading]            = useState(false)
  const [loadingExcluir,    setLoadingExcluir]     = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try { setClientes(await clienteApi.listar()) }
    catch (e) { toast.erro(e.message) }
    finally { setCarregando(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // --- Limpa erro de campo ao sair (onBlur) ---
  function handleBlur(campo) {
    const erros = validarForm(form)
    if (erros[campo]) setErrosForm(er => ({ ...er, [campo]: erros[campo] }))
    else setErrosForm(er => ({ ...er, [campo]: '' }))
  }

  function abrirCriar() {
    setForm(FORM_VAZIO)
    setErrosForm({})
    setClienteSelecionado(null)
    setModalAberto(true)
  }

  function abrirEditar(c) {
    setForm({ nome: c.nome, telefone: c.telefone || '', email: c.email || '', endereco: c.endereco || '' })
    setErrosForm({})
    setClienteSelecionado(c)
    setModalAberto(true)
  }

  async function abrirVisualizar(id) {
    try {
      setClienteSelecionado(await clienteApi.buscar(id))
      setModalVisual(true)
    } catch (e) { toast.erro(e.message) }
  }

  // onChange APENAS atualiza o valor — zero setState adicional para não perder foco
  function handleChange(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  function handleTelefone(e) {
    setForm(f => ({ ...f, telefone: mascaraTelefone(e.target.value) }))
  }

  async function handleSalvar() {
    const erros = validarForm(form)
    if (Object.keys(erros).length) { setErrosForm(erros); return }

    setLoading(true)
    try {
      if (clienteSelecionado) {
        await clienteApi.editar(clienteSelecionado.idCliente, form)
        toast.sucesso('Cliente atualizado com sucesso.')
      } else {
        await clienteApi.criar(form)
        toast.sucesso('Cliente cadastrado com sucesso.')
      }
      setModalAberto(false)
      carregar()
    } catch (e) {
      if (e.campos) setErrosForm(e.campos)
      else toast.erro(e.message)
    } finally { setLoading(false) }
  }

  async function handleExcluirConfirmado() {
    setLoadingExcluir(true)
    try {
      await clienteApi.excluir(confirmExcluir)
      toast.sucesso('Cliente excluído.')
      setConfirmExcluir(null)
      carregar()
    } catch (e) { toast.erro(e.message) }
    finally { setLoadingExcluir(false) }
  }

  return (
    <>
      {/* --- CABEÇALHO --- */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-verde-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie a carteira de clientes da empresa</p>
        </div>
        <button className="btn-primary" onClick={abrirCriar}>
          <i className="bi bi-plus-lg"></i> Novo Cliente
        </button>
      </div>

      {/* --- TABELA --- */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-verde-900 text-white">
                {['Nome', 'Telefone', 'E-mail', 'Endereço', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">
                  <i className="bi bi-arrow-clockwise animate-spin text-2xl block mb-2"></i>
                  Carregando...
                </td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-400">
                  <i className="bi bi-people text-3xl block mb-2 opacity-30"></i>
                  Nenhum cliente cadastrado.
                </td></tr>
              ) : clientes.map(c => (
                <tr key={c.idCliente} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{c.telefone}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{c.endereco}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button className="btn-ghost py-1.5 px-2.5 text-xs" onClick={() => abrirVisualizar(c.idCliente)} title="Visualizar">
                        <i className="bi bi-eye"></i>
                      </button>
                      <button className="btn-warning py-1.5 px-2.5 text-xs" onClick={() => abrirEditar(c)} title="Editar">
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn-danger py-1.5 px-2.5 text-xs" onClick={() => setConfirmExcluir(c.idCliente)} title="Excluir">
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {clientes.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} cadastrado{clientes.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* --- MODAL CRIAR/EDITAR --- */}
      {modalAberto && (
        <Modal
          titulo={clienteSelecionado ? `Editar — ${clienteSelecionado.nome}` : 'Novo Cliente'}
          onFechar={() => setModalAberto(false)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModalAberto(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSalvar} disabled={loading}>
                {loading
                  ? <><i className="bi bi-arrow-clockwise animate-spin"></i> Salvando...</>
                  : 'Salvar'
                }
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <InputTexto
              label="Nome completo"
              campo="nome"
              placeholder="João da Silva"
              value={form.nome}
              onChange={e => handleChange('nome', e.target.value)}
              onBlur={() => handleBlur('nome')}
              erro={errosForm.nome}
            />
            <InputTelefone
              value={form.telefone}
              onChange={handleTelefone}
              onBlur={() => handleBlur('telefone')}
              erro={errosForm.telefone}
            />
            <InputTexto
              label="E-mail"
              campo="email"
              tipo="email"
              placeholder="joao@email.com"
              value={form.email}
              onChange={e => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              erro={errosForm.email}
            />
            <InputTexto
              label="Endereço"
              campo="endereco"
              placeholder="Rua, número, bairro, cidade"
              value={form.endereco}
              onChange={e => handleChange('endereco', e.target.value)}
              onBlur={() => handleBlur('endereco')}
              erro={errosForm.endereco}
            />
          </div>
        </Modal>
      )}

      {/* --- MODAL VISUALIZAR --- */}
      {modalVisual && clienteSelecionado && (
        <Modal titulo="Detalhes do Cliente" onFechar={() => setModalVisual(false)} tamanho="sm">
          <div className="space-y-3">
            {[
              ['ID',       clienteSelecionado.idCliente],
              ['Nome',     clienteSelecionado.nome],
              ['Telefone', clienteSelecionado.telefone],
              ['E-mail',   clienteSelecionado.email],
              ['Endereço', clienteSelecionado.endereco],
            ].map(([lbl, val]) => (
              <div key={lbl} className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{lbl}</span>
                <span className="text-sm text-slate-800">{val}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* --- CONFIRMAÇÃO DE EXCLUSÃO --- */}
      {confirmExcluir && (
        <ConfirmModal
          titulo="Excluir cliente"
          mensagem="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
          onConfirmar={handleExcluirConfirmado}
          onCancelar={() => setConfirmExcluir(null)}
          loading={loadingExcluir}
        />
      )}
    </>
  )
}
