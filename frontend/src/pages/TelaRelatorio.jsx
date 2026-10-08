// --- TELA DE RELATÓRIOS ---
import { useState, useEffect, useCallback } from 'react'
import { relatorioApi, servicoApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import BadgeStatus from '../components/BadgeStatus'
import { formatarReais, formatarData, nomeClienteServico } from '../utils/validacoes'

const FORM_VAZIO = { idServico: '', descricao: '' }

function validarForm(form) {
  const e = {}
  if (!form.idServico)       e.idServico  = 'Selecione o serviço vinculado.'
  if (!form.descricao.trim()) e.descricao = 'Descrição é obrigatória.'
  return e
}

export default function TelaRelatorio() {
  const toast = useToast()

  const [relatorios,     setRelatorios]     = useState([])
  const [servicos,       setServicos]       = useState([])
  const [carregando,     setCarregando]     = useState(true)
  const [modalGerar,     setModalGerar]     = useState(false)
  const [modalDetalhe,   setModalDetalhe]   = useState(false)
  const [selecionado,    setSelecionado]    = useState(null)
  const [form,           setForm]           = useState(FORM_VAZIO)
  const [errosForm,      setErrosForm]      = useState({})
  const [loading,        setLoading]        = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      // allSettled: falha ao listar serviços não impede a lista de relatórios (e vice-versa)
      const [r, s] = await Promise.allSettled([relatorioApi.listar(), servicoApi.listar()])
      if (r.status === 'fulfilled') setRelatorios(r.value)
      else toast.erro('Erro ao carregar relatórios: ' + r.reason.message)
      if (s.status === 'fulfilled') setServicos(s.value)
      else toast.erro('Erro ao carregar serviços: ' + s.reason.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // --- Abre modal: garante que servicos já estejam carregados ---
  async function abrirGerar() {
    setForm(FORM_VAZIO)
    setErrosForm({})
    if (servicos.length === 0) {
      try {
        const s = await servicoApi.listar()
        setServicos(s)
      } catch (e) { toast.erro(e.message) }
    }
    setModalGerar(true)
  }

  // onChange apenas atualiza — sem validação instantânea
  function handleChange(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
    if (errosForm[campo]) setErrosForm(er => ({ ...er, [campo]: '' }))
  }

  async function handleGerar() {
    const erros = validarForm(form)
    if (Object.keys(erros).length) { setErrosForm(erros); return }

    setLoading(true)
    try {
      const novo = await relatorioApi.gerar({
        idServico: Number(form.idServico),
        descricao: form.descricao.trim(),
      })
      // Mostra o novo relatório imediatamente e sincroniza com o backend
      if (novo) setRelatorios(prev => [...prev.filter(r => r.idRelatorio !== novo.idRelatorio), novo])
      toast.sucesso('Relatório gerado com sucesso.')
      setModalGerar(false)
      carregar()
    } catch (e) {
      if (e.campos) setErrosForm(e.campos)
      else toast.erro(e.message)
    } finally {
      setLoading(false)
    }
  }

  // --- PDF: baixa via blob e trata erro do backend ---
  const [baixando, setBaixando] = useState(null)
  async function handleExportarPdf(id) {
    setBaixando(id)
    try {
      const ok = await relatorioApi.exportarPdf(id)
      if (!ok) removerInexistente(id)
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setBaixando(null)
    }
  }

  // Relatório que não existe mais no backend: tira da lista e sincroniza, sem erro na tela
  function removerInexistente(id) {
    setRelatorios(prev => prev.filter(r => r.idRelatorio !== id))
    setModalDetalhe(false)
    carregar()
  }

  // --- EXCLUIR RELATÓRIO: fecha a confirmação, remove da lista e sincroniza ---
  async function handleExcluirConfirmado() {
    const idExcluido = confirmExcluir
    setConfirmExcluir(null)
    try {
      await relatorioApi.excluir(idExcluido)
      setRelatorios(prev => prev.filter(r => r.idRelatorio !== idExcluido))
      if (selecionado?.idRelatorio === idExcluido) setModalDetalhe(false)
      toast.sucesso('Relatório excluído.')
      carregar()
    } catch (e) {
      toast.erro(e.message)
    }
  }

  async function handleVerDetalhe(id) {
    try {
      const rel = await relatorioApi.buscar(id)
      if (!rel) { removerInexistente(id); return }
      setSelecionado(rel)
      setModalDetalhe(true)
    } catch (e) {
      toast.erro(e.message)
    }
  }

  // Serviço selecionado no form (para exibir contexto)
  const servicoNoForm = servicos.find(s => String(s.idServico) === String(form.idServico))
  // Regra estrita: relatório só pode ser gerado para serviço "Concluído"
  const servicoNaoConcluido = !!servicoNoForm && servicoNoForm.status !== 'Concluído'
  const servicosDisponiveis = servicos.filter(s => s.status === 'Concluído')
  const qtdIndisponiveis    = servicos.length - servicosDisponiveis.length

  return (
    <>
      {/* --- CABEÇALHO --- */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-verde-900">Relatórios</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gere e exporte relatórios técnicos por serviço</p>
        </div>
        <button className="btn-primary" onClick={abrirGerar}>
          <i className="bi bi-plus-lg"></i> Gerar Relatório
        </button>
      </div>

      {/* --- LISTA DE RELATÓRIOS --- */}
      {carregando ? (
        <div className="text-center py-16 text-slate-400">
          <i className="bi bi-arrow-clockwise animate-spin text-2xl block mb-2"></i>
          Carregando...
        </div>
      ) : relatorios.length === 0 ? (
        <div className="card p-16 text-center text-slate-400">
          <i className="bi bi-file-earmark-x text-4xl block mb-3 opacity-30"></i>
          <p className="text-sm">Nenhum relatório gerado.</p>
          <p className="text-xs mt-1">Clique em "Gerar Relatório" para criar o primeiro.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {relatorios.map(r => (
            <div
              key={r.idRelatorio}
              className="card px-5 py-4 flex items-start justify-between gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-verde-50 border border-verde-200">
                  <i className="bi bi-file-earmark-text text-verde-700"></i>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {/* Serviço excluído: usa os dados registrados na geração do relatório */}
                    {(() => {
                      const tipo = r.servico?.tipoServico ?? r.servicoTipo
                      return `Relatório${tipo ? ` · ${tipo}` : ''}`
                    })()}
                    <span className="font-normal text-slate-500">
                      {' - Cliente: '}{r.servico ? nomeClienteServico(r.servico, r.clienteNome) : (r.clienteNome || 'Cliente não informado')}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {r.descricao}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs text-slate-400">
                      <i className="bi bi-calendar3 mr-1"></i>
                      {r.dataGeracao}
                    </span>
                    {r.servico
                      ? <BadgeStatus status={r.servico.status} />
                      : (
                        <span className="badge bg-slate-100 text-slate-500 border border-slate-200">
                          <i className="bi bi-link-45deg mr-0.5"></i>Serviço excluído
                        </span>
                      )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  className="btn-ghost py-1.5 px-3 text-xs"
                  onClick={() => handleVerDetalhe(r.idRelatorio)}
                >
                  <i className="bi bi-eye"></i> Ver
                </button>
                <button
                  className="btn-primary py-1.5 px-3 text-xs"
                  onClick={() => handleExportarPdf(r.idRelatorio)}
                  disabled={baixando === r.idRelatorio}
                >
                  {baixando === r.idRelatorio
                    ? <><i className="bi bi-arrow-clockwise animate-spin"></i> Gerando...</>
                    : <><i className="bi bi-file-earmark-pdf"></i> PDF</>}
                </button>
                <button
                  className="btn-danger py-1.5 px-3 text-xs"
                  onClick={() => setConfirmExcluir(r.idRelatorio)}
                  title="Excluir relatório"
                >
                  <i className="bi bi-trash"></i> Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL GERAR RELATÓRIO --- */}
      {modalGerar && (
        <Modal
          titulo="Gerar Novo Relatório"
          onFechar={() => setModalGerar(false)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setModalGerar(false)}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={handleGerar}
                disabled={loading || servicosDisponiveis.length === 0 || servicoNaoConcluido}
                title={servicoNaoConcluido ? 'Relatórios só podem ser gerados para serviços Concluídos' : ''}
              >
                {loading
                  ? <><i className="bi bi-arrow-clockwise animate-spin"></i> Gerando...</>
                  : <><i className="bi bi-file-earmark-plus"></i> Gerar</>
                }
              </button>
            </>
          }
        >
          <div className="space-y-4">

            {/* Seletor de serviço — valor padrão vazio */}
            <div>
              <label className="form-label">Serviço Vinculado *</label>
              <select
                className={`input-field ${errosForm.idServico ? 'error' : ''}`}
                value={form.idServico}
                onChange={e => handleChange('idServico', e.target.value)}
              >
                <option value="">— Selecione o serviço —</option>
                {servicosDisponiveis.map(s => (
                  <option key={s.idServico} value={s.idServico}>
                    Cliente: {nomeClienteServico(s)} — {s.tipoServico}
                    {s.dataInicio ? ` (${formatarData(s.dataInicio)})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                <i className="bi bi-info-circle mr-1"></i>
                Apenas serviços <strong>Concluídos</strong> podem receber relatório
                {qtdIndisponiveis > 0 && ` (${qtdIndisponiveis} em outros status não ${qtdIndisponiveis !== 1 ? 'aparecem' : 'aparece'})`}.
              </p>
              {errosForm.idServico && <p className="form-error">{errosForm.idServico}</p>}
              {!carregando && servicosDisponiveis.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  <i className="bi bi-exclamation-triangle mr-1"></i>
                  Nenhum serviço Concluído disponível para gerar relatório.
                </p>
              )}
            </div>

            {/* Contexto do serviço selecionado */}
            {servicoNoForm && (
              <div className="rounded-lg bg-verde-50 border border-verde-200 px-3 py-2.5 text-xs text-verde-900 space-y-1">
                <p><strong>Cliente:</strong> {nomeClienteServico(servicoNoForm)}</p>
                <p><strong>Tipo:</strong> {servicoNoForm.tipoServico}</p>
                <p><strong>Status:</strong> {servicoNoForm.status}</p>
              </div>
            )}

            {/* Descrição — onChange simples */}
            <div>
              <label className="form-label">Descrição do Relatório *</label>
              <textarea
                rows={4}
                className={`input-field resize-none ${errosForm.descricao ? 'error' : ''}`}
                placeholder="Ex: Relatório de vistoria predial — Setembro 2026"
                value={form.descricao}
                onChange={e => handleChange('descricao', e.target.value)}
              />
              {errosForm.descricao && <p className="form-error">{errosForm.descricao}</p>}
            </div>

            <p className="text-xs text-slate-400">
              O PDF gerado incluirá os dados do cliente, do serviço e do relatório.
            </p>
          </div>
        </Modal>
      )}

      {/* --- MODAL DETALHE DO RELATÓRIO --- */}
      {modalDetalhe && selecionado && (
        <Modal
          titulo="Detalhes do Relatório"
          onFechar={() => setModalDetalhe(false)}
          tamanho="md"
          footer={
            <button
              className="btn-primary"
              onClick={() => handleExportarPdf(selecionado.idRelatorio)}
              disabled={baixando === selecionado.idRelatorio}
            >
              <i className="bi bi-file-earmark-pdf"></i> Exportar PDF
            </button>
          }
        >
          <div className="space-y-5">
            {/* Dados do relatório */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Relatório</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Data Geração', selecionado.dataGeracao],
                ].map(([lbl, val]) => (
                  <div key={lbl} className="flex flex-col gap-0.5">
                    <span className="text-xs text-slate-400">{lbl}</span>
                    <span className="text-sm font-medium text-slate-800">{val}</span>
                  </div>
                ))}
                <div className="col-span-2 flex flex-col gap-0.5">
                  <span className="text-xs text-slate-400">Descrição</span>
                  <span className="text-sm text-slate-800">{selecionado.descricao}</span>
                </div>
              </div>
            </section>

            {/* Serviço excluído: exibe os dados registrados na geração */}
            {!selecionado.servico && (
              <>
                <hr className="border-slate-100" />
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
                    Serviço Vinculado <span className="normal-case font-normal">(excluído — dados registrados)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Tipo',           selecionado.servicoTipo || '—'],
                      ['Cliente',        selecionado.clienteNome ? `${selecionado.clienteNome} (Inativo)` : 'Cliente não informado'],
                      ['Data de Início', formatarData(selecionado.servicoDataInicio)],
                      ['Preço',          formatarReais(selecionado.servicoPreco)],
                    ].map(([lbl, val]) => (
                      <div key={lbl} className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-400">{lbl}</span>
                        <span className="text-sm font-medium text-slate-800">{val}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* Dados do serviço */}
            {selecionado.servico && (
              <>
                <hr className="border-slate-100" />
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Serviço Vinculado</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Tipo',       selecionado.servico.tipoServico],
                      ['Data de Início',   formatarData(selecionado.servico.dataInicio)],
                      ['Prazo de Entrega', formatarData(selecionado.servico.prazoEntrega)],
                      ['Preço',            formatarReais(selecionado.servico.preco)],
                    ].map(([lbl, val]) => (
                      <div key={lbl} className="flex flex-col gap-0.5">
                        <span className="text-xs text-slate-400">{lbl}</span>
                        <span className="text-sm font-medium text-slate-800">{val}</span>
                      </div>
                    ))}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-slate-400">Status</span>
                      <BadgeStatus status={selecionado.servico.status} />
                    </div>
                    {selecionado.servico.descricao && (
                      <div className="col-span-2 flex flex-col gap-0.5">
                        <span className="text-xs text-slate-400">Observações</span>
                        <span className="text-sm text-slate-800">{selecionado.servico.descricao}</span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Dados do cliente — sempre exibidos; cliente excluído usa o nome histórico */}
                {(() => {
                  const cli = selecionado.servico.cliente
                  const nd  = 'Não disponível (cliente excluído)'
                  return (
                  <>
                    <hr className="border-slate-100" />
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Cliente</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          ['Nome',     nomeClienteServico(selecionado.servico, selecionado.clienteNome)],
                          ['Telefone', cli?.telefone || nd],
                          ['E-mail',   cli?.email    || nd],
                          ['Endereço', cli?.endereco || nd],
                        ].map(([lbl, val]) => (
                          <div key={lbl} className={`flex flex-col gap-0.5 ${lbl === 'Endereço' ? 'col-span-2' : ''}`}>
                            <span className="text-xs text-slate-400">{lbl}</span>
                            <span className="text-sm font-medium text-slate-800">{val}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                  )
                })()}
              </>
            )}
          </div>
        </Modal>
      )}
      {/* --- CONFIRMAÇÃO DE EXCLUSÃO --- */}
      {confirmExcluir && (
        <ConfirmModal
          titulo="Excluir relatório"
          mensagem="Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita."
          onConfirmar={handleExcluirConfirmado}
          onCancelar={() => setConfirmExcluir(null)}
        />
      )}
    </>
  )
}
