// --- TELA DE SERVIÇOS ---
import { useState, useEffect, useCallback } from 'react'
import { servicoApi, clienteApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import BadgeStatus from '../components/BadgeStatus'
import ModalAcompanhamento from '../components/ModalAcompanhamento'
import ConfirmModal from '../components/ConfirmModal'
import InputMoeda from '../components/InputMoeda'
import {
  TIPOS_SERVICO, dataMinima, formatarReais, formatarData, precoValido, ordenarHierarquia,
} from '../utils/validacoes'

const FORM_VAZIO = {
  idCliente: '', tipoServico: '', descricao: '', dataInicio: '', prazoEntrega: '', preco: null,
}

// Extrai o ID real do cliente (backend serializa como idCliente; aceita "id" por segurança)
const idDoCliente = c => c?.idCliente ?? c?.id

// Converte o valor do <select> para um ID numérico válido (> 0) ou null
function idClienteValido(valor) {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : null
}

function validarForm(form) {
  const e = {}
  // Verifica string vazia OU número 0 (Number('') === 0)
  if (!idClienteValido(form.idCliente)) e.idCliente = 'Selecione um cliente.'
  if (!form.tipoServico) e.tipoServico = 'Selecione o tipo de serviço.'
  if (!form.dataInicio) e.dataInicio = 'Data de início é obrigatória.'
  if (!form.prazoEntrega) e.prazoEntrega = 'Prazo de entrega é obrigatório.'
  else if (form.dataInicio && form.prazoEntrega < form.dataInicio)
    e.prazoEntrega = 'O prazo não pode ser anterior à data de início.'
  if (!precoValido(form.preco)) e.preco = 'Informe um preço de no mínimo R$ 0,01.'
  return e
}

export default function TelaServico() {
  const toast = useToast()
  const hoje  = dataMinima()

  const [servicos,       setServicos]       = useState([])
  const [clientes,       setClientes]       = useState([])
  const [carregando,     setCarregando]     = useState(true)
  const [carregandoClientes, setCarregandoClientes] = useState(false)
  const [modalCriar,     setModalCriar]     = useState(false)
  const [modalAcomp,     setModalAcomp]     = useState(null)
  const [confirmExcluir, setConfirmExcluir] = useState(null)
  const [form,           setForm]           = useState(FORM_VAZIO)
  const [errosForm,      setErrosForm]      = useState({})
  const [loading,        setLoading]        = useState(false)

  // --- Carrega serviços + clientes na montagem da tela ---
  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      // allSettled: falha em uma lista não impede a outra de atualizar
      const [s, c] = await Promise.allSettled([servicoApi.listar(), clienteApi.listar()])
      if (s.status === 'fulfilled') setServicos(ordenarHierarquia(s.value))
      else toast.erro('Erro ao carregar serviços: ' + s.reason.message)
      if (c.status === 'fulfilled') setClientes(c.value)
      else toast.erro('Erro ao carregar clientes: ' + c.reason.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // --- Abre modal: SEMPRE busca clientes frescos do backend ---
  async function abrirCriar() {
    setForm(FORM_VAZIO)
    setErrosForm({})
    setModalCriar(true)         // abre o modal imediatamente
    setCarregandoClientes(true) // mostra loading no select
    try {
      const c = await clienteApi.listar()
      setClientes(c)
    } catch (e) {
      toast.erro('Não foi possível carregar os clientes: ' + e.message)
    } finally {
      setCarregandoClientes(false)
    }
  }

  // onChange apenas atualiza estado — validação apenas no submit
  function handleChange(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
    if (errosForm[campo]) setErrosForm(er => ({ ...er, [campo]: '' }))
  }

  async function handleCriar() {
    const erros = validarForm(form)
    if (Object.keys(erros).length) { setErrosForm(erros); return }

    setLoading(true)
    try {
      const idClienteNum = idClienteValido(form.idCliente)
      // Última guarda: impede envio se id inválido mesmo após validação
      if (!idClienteNum) {
        setErrosForm(er => ({ ...er, idCliente: 'Selecione um cliente válido.' }))
        return
      }
      await servicoApi.criar({
        idCliente:   idClienteNum,
        tipoServico: form.tipoServico,
        descricao:   form.descricao || null,
        dataInicio:   form.dataInicio,
        prazoEntrega: form.prazoEntrega,
        preco:        form.preco,
      })
      toast.sucesso('Serviço cadastrado. Status inicial: Em Análise.')
      setModalCriar(false)
      carregar()
    } catch (e) {
      if (e.campos) setErrosForm(e.campos)
      else toast.erro(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleExcluirConfirmado() {
    const idExcluido = confirmExcluir
    setConfirmExcluir(null) // fecha a confirmação imediatamente
    try {
      await servicoApi.excluir(idExcluido)
      // Atualiza o estado local na hora: remove o serviço e desvincula os derivados dele
      setServicos(prev => prev
        .filter(s => s.idServico !== idExcluido)
        .map(s => s.servicoOrigem?.idServico === idExcluido ? { ...s, servicoOrigem: null, nivel: 0 } : s))
      toast.sucesso('Serviço excluído.')
      carregar() // sincroniza com o backend
    } catch (e) {
      toast.erro(e.message)
    }
  }

  async function abrirAcompanhamento(id) {
    try {
      const servico = await servicoApi.acompanhar(id)
      if (!servico) {
        // Serviço não existe mais no backend: tira da lista e sincroniza, sem erro na tela
        setServicos(prev => prev.filter(s => s.idServico !== id))
        carregar()
        return
      }
      setModalAcomp(servico)
    } catch (e) {
      toast.erro(e.message)
    }
  }

  return (
    <>
      {/* --- CABEÇALHO --- */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-verde-900">Serviços</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie os serviços e acompanhe o ciclo de vida</p>
        </div>
        <button className="btn-primary" onClick={abrirCriar}>
          <i className="bi bi-plus-lg"></i> Novo Serviço
        </button>
      </div>

      {/* --- TABELA --- */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-verde-900 text-white">
                {['Tipo', 'Cliente', 'Status', 'Preço (R$)', 'Data Início', 'Prazo de Entrega', 'Origem', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">
                  <i className="bi bi-arrow-clockwise animate-spin text-2xl block mb-2"></i>
                  Carregando...
                </td></tr>
              ) : servicos.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">
                  <i className="bi bi-tools text-3xl block mb-2 opacity-30"></i>
                  Nenhum serviço cadastrado.
                </td></tr>
              ) : servicos.map(s => (
                <tr
                  key={s.idServico}
                  className={`transition-colors ${s.servicoOrigem
                    ? 'bg-violet-50/60 hover:bg-violet-50 shadow-[inset_3px_0_0_0_#8b5cf6]'
                    : 'hover:bg-slate-50'}`}
                >
                  <td className="px-4 py-3 max-w-[220px]">
                    <div className="flex items-center gap-1.5" style={{ paddingLeft: `${(s.nivel ?? 0) * 16}px` }}>
                      {s.nivel > 0 && <i className="bi bi-arrow-return-right text-violet-500"></i>}
                      <p className="font-medium text-slate-800 truncate" title={s.tipoServico}>{s.tipoServico}</p>
                    </div>
                    {s.servicoOrigem && (
                      <span
                        className="badge bg-violet-100 text-violet-700 border border-violet-200 mt-1"
                        style={{ marginLeft: `${(s.nivel ?? 0) * 16}px` }}
                      >
                        <i className="bi bi-arrow-repeat mr-1"></i>Recorrente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.cliente?.nome || '—'}</td>
                  <td className="px-4 py-3"><BadgeStatus status={s.status} /></td>
                  <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">{formatarReais(s.preco)}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatarData(s.dataInicio)}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatarData(s.prazoEntrega)}</td>
                  <td className="px-4 py-3">
                    {s.servicoOrigem
                      ? (
                        <span
                          className="badge bg-violet-100 text-violet-700 border border-violet-200 whitespace-nowrap"
                          title={`Recorrente — gerado a partir de: ${s.servicoOrigem.tipoServico ?? 'serviço de origem'}`
                            + (s.servicoOrigem.dataInicio ? ` (${formatarData(s.servicoOrigem.dataInicio)})` : '')}
                        >
                          <i className="bi bi-link-45deg mr-0.5"></i>
                          Gerado após {s.servicoOrigem.dataInicio ? formatarData(s.servicoOrigem.dataInicio) : 'serviço de origem'}
                        </span>
                      )
                      : <span className="text-xs text-slate-400">Primário</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        className="btn-primary py-1.5 px-2.5 text-xs"
                        onClick={() => abrirAcompanhamento(s.idServico)}
                      >
                        <i className="bi bi-search"></i> Acompanhar
                      </button>
                      <button
                        className="btn-danger py-1.5 px-2.5 text-xs"
                        onClick={() => setConfirmExcluir(s.idServico)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {servicos.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
            {servicos.length} serviço{servicos.length !== 1 ? 's' : ''} registrado{servicos.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* --- MODAL CRIAR SERVIÇO --- */}
      {modalCriar && (
        <Modal
          titulo="Novo Serviço"
          onFechar={() => setModalCriar(false)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModalCriar(false)}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={handleCriar}
                disabled={loading || carregandoClientes || !idClienteValido(form.idCliente)}
              >
                {loading
                  ? <><i className="bi bi-arrow-clockwise animate-spin"></i> Salvando...</>
                  : 'Cadastrar'
                }
              </button>
            </>
          }
        >
          <div className="space-y-4">

            {/* Cliente — select com valor vazio como padrão */}
            <div>
              <label className="form-label">Cliente *</label>
              <select
                className={`input-field ${errosForm.idCliente ? 'error' : ''}`}
                value={form.idCliente}
                onChange={e => handleChange('idCliente', e.target.value)}
                disabled={carregandoClientes}
              >
                <option value="">
                  {carregandoClientes ? 'Carregando clientes...' : '— Selecione o cliente —'}
                </option>
                {clientes.filter(c => idClienteValido(idDoCliente(c))).map(c => (
                  <option key={idDoCliente(c)} value={String(idDoCliente(c))}>
                    {c.nome}
                  </option>
                ))}
              </select>
              {errosForm.idCliente && <p className="form-error">{errosForm.idCliente}</p>}
              {!carregandoClientes && clientes.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  <i className="bi bi-exclamation-triangle mr-1"></i>
                  Nenhum cliente encontrado. Cadastre um cliente primeiro.
                </p>
              )}
            </div>

            {/* Tipo de serviço predefinido */}
            <div>
              <label className="form-label">Tipo de Serviço *</label>
              <select
                className={`input-field ${errosForm.tipoServico ? 'error' : ''}`}
                value={form.tipoServico}
                onChange={e => handleChange('tipoServico', e.target.value)}
              >
                <option value="">— Selecione o tipo —</option>
                {TIPOS_SERVICO.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {errosForm.tipoServico && <p className="form-error">{errosForm.tipoServico}</p>}
            </div>

            {/* Descrição — onChange simples, sem validação */}
            <div>
              <label className="form-label">Descrição / Observações</label>
              <textarea
                rows={3}
                className="input-field resize-none"
                placeholder="Detalhes sobre o escopo do serviço..."
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              />
            </div>

            {/* Datas: início (não retroativa) e prazo de entrega (≥ início) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Data de Início *</label>
                <input
                  type="date"
                  className={`input-field ${errosForm.dataInicio ? 'error' : ''}`}
                  min={hoje}
                  value={form.dataInicio}
                  onChange={e => handleChange('dataInicio', e.target.value)}
                />
                {errosForm.dataInicio && <p className="form-error">{errosForm.dataInicio}</p>}
              </div>
              <div>
                <label className="form-label">Prazo de Entrega *</label>
                <input
                  type="date"
                  className={`input-field ${errosForm.prazoEntrega ? 'error' : ''}`}
                  min={form.dataInicio || hoje}
                  value={form.prazoEntrega}
                  onChange={e => handleChange('prazoEntrega', e.target.value)}
                />
                {errosForm.prazoEntrega && <p className="form-error">{errosForm.prazoEntrega}</p>}
              </div>
            </div>

            {/* Preço (R$) — mínimo R$ 0,01 */}
            <div>
              <label className="form-label">Preço (R$) *</label>
              <InputMoeda
                className={`input-field ${errosForm.preco ? 'error' : ''}`}
                value={form.preco}
                onChange={v => handleChange('preco', v)}
              />
              {errosForm.preco && <p className="form-error">{errosForm.preco}</p>}
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-500">
              <i className="bi bi-info-circle mr-1"></i>
              O status inicial será <strong>Em Análise</strong> automaticamente.
            </div>
          </div>
        </Modal>
      )}

      {/* --- MODAL DE ACOMPANHAMENTO --- */}
      {modalAcomp && (
        <ModalAcompanhamento
          servico={modalAcomp}
          onFechar={() => setModalAcomp(null)}
          onAtualizado={carregar}
        />
      )}

      {/* --- CONFIRMAÇÃO DE EXCLUSÃO --- */}
      {confirmExcluir && (
        <ConfirmModal
          titulo="Excluir serviço"
          mensagem="Tem certeza que deseja excluir este serviço? Os relatórios dele também serão excluídos e serviços gerados a partir dele perderão o vínculo. Esta ação não pode ser desfeita."
          onConfirmar={handleExcluirConfirmado}
          onCancelar={() => setConfirmExcluir(null)}
        />
      )}
    </>
  )
}
