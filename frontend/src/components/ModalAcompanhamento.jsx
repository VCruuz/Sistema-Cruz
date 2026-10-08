// --- MODAL DE ACOMPANHAMENTO DE SERVIÇO ---
import { useState, useEffect } from 'react'
import Modal from './Modal'
import BadgeStatus from './BadgeStatus'
import InputMoeda from './InputMoeda'
import { servicoApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import {
  TIPOS_SERVICO, dataMinima, dataMinimaRecorrencia, formatarReais, formatarData, precoValido,
  STATUS_FINALIZADOS,
} from '../utils/validacoes'

// --- MÁQUINA DE ESTADOS (Diagrama de Estados) — opções do select "Alterar Status" ---
// Em Análise   → Em Progresso (aprovado) | Cancelado
// Remarcado    → Em Progresso (aprovado) | Cancelado (rejeitado novamente)
// Em Progresso → Concluído | Cancelado
// Concluído / Cancelado → finais (somente leitura)
// "Remarcado" nunca aparece no select: só é aplicado pelo fluxo "Remarcar" (com nova data)
const TRANSICOES = {
  'Em Análise':   ['Em Progresso', 'Cancelado'],
  'Remarcado':    ['Em Progresso', 'Cancelado'],
  'Em Progresso': ['Concluído', 'Cancelado'],
  'Concluído':    [],
  'Cancelado':    [],
}

// Status em que cada aba aparece (sem a chave = sempre visível enquanto editável)
const ABAS = [
  { id: 'editar',    label: 'Editar',            icon: 'bi-pencil' },
  // Remarcar: pode ser repetido enquanto o serviço estiver Em Análise ou Remarcado
  { id: 'remarcar',  label: 'Remarcar',          icon: 'bi-calendar-event', status: ['Em Análise', 'Remarcado'] },
  // Gerar Recorrência: somente quando o serviço está exatamente "Em Progresso"
  { id: 'vinculado', label: 'Gerar Recorrência', icon: 'bi-arrow-repeat',   status: ['Em Progresso'] },
]

const VINCULADO_VAZIO = { tipoServico: '', descricao: '', dataInicio: '', prazoEntrega: '', preco: null }

export default function ModalAcompanhamento({ servico: inicial, onFechar, onAtualizado }) {
  const toast = useToast()
  const hoje  = dataMinima()

  const [aba,     setAba]     = useState('editar')
  const [servico, setServico] = useState(inicial)
  const [loading, setLoading] = useState(false)

  // --- Form editar: idCliente vem do objeto cliente aninhado ---
  const [formEditar, setFormEditar] = useState({
    idCliente:    inicial.cliente?.idCliente ?? '',
    tipoServico:  inicial.tipoServico  ?? '',
    descricao:    inicial.descricao    ?? '',
    dataInicio:   inicial.dataInicio   ?? '',
    prazoEntrega: inicial.prazoEntrega ?? '',
    preco:        inicial.preco        ?? null,
    status:       inicial.status       ?? '',
  })

  // --- Form remarcar: nova data de início obrigatória + prazo opcional ---
  const [novaData,  setNovaData]  = useState('')
  const [novoPrazo, setNovoPrazo] = useState('')

  // --- Form recorrência ---
  const [formVinculado, setFormVinculado] = useState(VINCULADO_VAZIO)

  const statusDisponiveis = TRANSICOES[servico.status] ?? []
  const abasVisiveis      = ABAS.filter(a => !a.status || a.status.includes(servico.status))
  const somenteLeitura    = STATUS_FINALIZADOS.includes(servico.status)

  // Se o status mudar e a aba atual deixar de existir, volta para "Editar"
  useEffect(() => {
    if (!abasVisiveis.some(a => a.id === aba)) setAba('editar')
  }, [servico.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Recorrência: este serviço (se derivado) só pode iniciar após o de origem;
  // um novo recorrente deste só pode iniciar após a data de início deste
  const origem          = servico.servicoOrigem
  const minDataEste     = origem ? dataMinimaRecorrencia(origem.dataInicio) : hoje
  const minDataDerivado = dataMinimaRecorrencia(servico.dataInicio)

  // Monta o DTO para o backend
  function montarDTO(f) {
    return {
      idCliente:    Number(f.idCliente),
      tipoServico:  f.tipoServico,
      descricao:    f.descricao || null,
      dataInicio:   f.dataInicio || null,
      prazoEntrega: f.prazoEntrega || null,
      preco:        f.preco,
      status:       f.status || null,
    }
  }

  function aplicarAtualizado(atualizado) {
    setServico(atualizado)
    setFormEditar(f => ({
      ...f,
      status:       atualizado.status,
      dataInicio:   atualizado.dataInicio   ?? '',
      prazoEntrega: atualizado.prazoEntrega ?? '',
    }))
    onAtualizado()
  }

  // --- ABA EDITAR: atualiza dados + status ---
  async function handleEditar() {
    const f = formEditar
    if (!f.tipoServico)            { toast.aviso('Selecione o tipo de serviço.'); return }
    if (!f.prazoEntrega)           { toast.aviso('Informe o prazo de entrega.'); return }
    if (f.dataInicio && f.prazoEntrega < f.dataInicio) { toast.aviso('O prazo de entrega não pode ser anterior à data de início.'); return }
    if (!precoValido(f.preco))     { toast.aviso('Informe um preço de no mínimo R$ 0,01.'); return }

    setLoading(true)
    try {
      aplicarAtualizado(await servicoApi.editar(servico.idServico, montarDTO(f)))
      toast.sucesso('Serviço atualizado com sucesso.')
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setLoading(false)
    }
  }

  // --- ABA REMARCAR: Em Análise / Remarcado → Remarcado + nova data de início (repetível) ---
  async function handleRemarcar() {
    if (!novaData) { toast.aviso('Informe a nova data de início.'); return }
    if (novaData === servico.dataInicio) { toast.aviso('A nova data deve ser diferente da data atual.'); return }
    if (novaData < minDataEste) { toast.aviso(`A data deve ser a partir de ${formatarData(minDataEste)}.`); return }
    const prazoFinal = novoPrazo || servico.prazoEntrega
    if (prazoFinal && prazoFinal < novaData) {
      toast.aviso('O prazo de entrega ficou anterior à nova data de início. Informe um novo prazo.')
      return
    }
    setLoading(true)
    try {
      aplicarAtualizado(await servicoApi.remarcar(servico.idServico, novaData, novoPrazo || null))
      setNovaData('')
      setNovoPrazo('')
      toast.sucesso('Serviço remarcado com sucesso.')
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setLoading(false)
    }
  }

  // --- ABA GERAR RECORRÊNCIA: novo serviço derivado (mesmo cliente), só se "Em Progresso" ---
  async function handleVinculado() {
    const f = formVinculado
    if (servico.status !== 'Em Progresso') { toast.aviso('Recorrência só pode ser gerada para serviços Em Progresso.'); return }
    if (!f.tipoServico)  { toast.aviso('Selecione o tipo do novo serviço.'); return }
    if (!f.dataInicio)   { toast.aviso('Informe a data de início do novo serviço.'); return }
    if (f.dataInicio < minDataDerivado) {
      toast.aviso(`A data de início do serviço recorrente deve ser posterior a ${formatarData(servico.dataInicio)}.`)
      return
    }
    if (!f.prazoEntrega) { toast.aviso('Informe o prazo de entrega do novo serviço.'); return }
    if (f.prazoEntrega < f.dataInicio) { toast.aviso('O prazo de entrega não pode ser anterior à data de início.'); return }
    if (!precoValido(f.preco)) { toast.aviso('Informe um preço de no mínimo R$ 0,01.'); return }

    setLoading(true)
    try {
      await servicoApi.gerarVinculado(servico.idServico, {
        idCliente:    servico.cliente?.idCliente,
        tipoServico:  f.tipoServico,
        descricao:    f.descricao || null,
        dataInicio:   f.dataInicio,
        prazoEntrega: f.prazoEntrega,
        preco:        f.preco,
      })
      onAtualizado()
      toast.sucesso(`Serviço recorrente "${f.tipoServico}" gerado e vinculado.`)
      setFormVinculado(VINCULADO_VAZIO)
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal titulo="Acompanhar Serviço" onFechar={onFechar} tamanho="lg">

      {/* --- RESUMO DO SERVIÇO --- */}
      <div className="rounded-xl bg-verde-50 border border-verde-200 px-4 py-3 mb-5 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-verde-900">{servico.tipoServico}</p>
          {servico.descricao && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{servico.descricao}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
            <span><i className="bi bi-person mr-1"></i>{servico.cliente?.nome ?? '—'}</span>
            <span><i className="bi bi-cash-coin mr-1"></i>{formatarReais(servico.preco)}</span>
            <span><i className="bi bi-calendar3 mr-1"></i>Início: {formatarData(servico.dataInicio)}</span>
            <span><i className="bi bi-flag mr-1"></i>Entrega: {formatarData(servico.prazoEntrega)}</span>
            {origem && (
              <span className="badge bg-violet-100 text-violet-700 border border-violet-200">
                <i className="bi bi-link-45deg mr-0.5"></i>Recorrente — gerado de {origem.tipoServico ?? 'serviço de origem'}
                {origem.dataInicio ? ` (${formatarData(origem.dataInicio)})` : ''}
              </span>
            )}
          </div>
        </div>
        <BadgeStatus status={servico.status} />
      </div>

      {/* --- MODO SOMENTE LEITURA: Concluído / Cancelado --- */}
      {somenteLeitura && (
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <i className="bi bi-lock mr-1.5"></i>
            Serviço <strong>{servico.status}</strong>: disponível apenas para consulta.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ['Tipo de Serviço',  servico.tipoServico],
              ['Cliente',          servico.cliente?.nome ?? '—'],
              ['Status',           servico.status],
              ['Preço',            formatarReais(servico.preco)],
              ['Data de Início',   formatarData(servico.dataInicio)],
              ['Prazo de Entrega', formatarData(servico.prazoEntrega)],
              ['Marcado em',       formatarData(servico.dataCriado)],
              ['Última atualização', formatarData(servico.dataUltimo)],
              ['Origem',           origem
                ? `Recorrente — ${origem.tipoServico ?? 'serviço de origem'} (${formatarData(origem.dataInicio)})`
                : 'Primário'],
            ].map(([lbl, val]) => (
              <div key={lbl} className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-400">{lbl}</span>
                <span className="text-sm font-medium text-slate-800">{val || '—'}</span>
              </div>
            ))}
            <div className="sm:col-span-2 flex flex-col gap-0.5">
              <span className="text-xs text-slate-400">Descrição</span>
              <span className="text-sm text-slate-800 whitespace-pre-line">{servico.descricao || '—'}</span>
            </div>
          </div>
        </div>
      )}

      {!somenteLeitura && (<>
      {/* --- ABAS --- */}
      <div className="flex gap-1 border-b border-slate-200 mb-5">
        {abasVisiveis.map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all
              ${aba === a.id
                ? 'border-verde-700 text-verde-900 bg-verde-50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            <i className={`bi ${a.icon}`}></i>
            {a.label}
          </button>
        ))}
      </div>

      {/* ── ABA: EDITAR ─────────────────────────────────────────────── */}
      {aba === 'editar' && (
        <div className="space-y-4">
          <div>
            <label className="form-label">Tipo de Serviço *</label>
            <select
              className="input-field"
              value={formEditar.tipoServico}
              onChange={e => setFormEditar(f => ({ ...f, tipoServico: e.target.value }))}
            >
              <option value="">— Selecione —</option>
              {TIPOS_SERVICO.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Descrição</label>
            <textarea
              rows={3}
              className="input-field resize-none"
              value={formEditar.descricao}
              onChange={e => setFormEditar(f => ({ ...f, descricao: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Data de Início</label>
              <input
                type="date"
                className="input-field bg-slate-50 text-slate-500 cursor-not-allowed"
                value={formEditar.dataInicio}
                disabled
                readOnly
              />
              <p className="text-xs text-slate-400 mt-1">
                {abasVisiveis.some(a => a.id === 'remarcar')
                  ? 'Para alterar a data, use a aba Remarcar.'
                  : 'A data de início não pode ser alterada neste status.'}
              </p>
            </div>
            <div>
              <label className="form-label">Prazo de Entrega *</label>
              <input
                type="date"
                className="input-field"
                min={formEditar.dataInicio || hoje}
                value={formEditar.prazoEntrega}
                onChange={e => setFormEditar(f => ({ ...f, prazoEntrega: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Preço (R$) *</label>
            <InputMoeda
              className="input-field"
              value={formEditar.preco}
              onChange={v => setFormEditar(f => ({ ...f, preco: v }))}
            />
          </div>

          <div>
            <label className="form-label">Alterar Status</label>
            <select
              className="input-field"
              value={formEditar.status}
              onChange={e => setFormEditar(f => ({ ...f, status: e.target.value }))}
            >
              <option value={servico.status}>{servico.status} (atual)</option>
              {statusDisponiveis.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {statusDisponiveis.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Nenhuma transição de status disponível.
              </p>
            )}
          </div>

          <button className="btn-primary" onClick={handleEditar} disabled={loading}>
            {loading
              ? <><i className="bi bi-arrow-clockwise animate-spin"></i> Salvando...</>
              : 'Salvar Alterações'
            }
          </button>
        </div>
      )}

      {/* ── ABA: REMARCAR ───────────────────────────────────────────── */}
      {aba === 'remarcar' && abasVisiveis.some(a => a.id === 'remarcar') && (
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <i className="bi bi-info-circle mr-1.5"></i>
            Define uma nova <strong>Data de Início</strong> e move o status para <strong>Remarcado</strong>.
            Pode ser feito quantas vezes for necessário enquanto o serviço estiver <strong>Em Análise</strong> ou
            <strong> Remarcado</strong>. Depois, o serviço segue para <strong>Em Progresso</strong> (aprovado) ou
            <strong> Cancelado</strong>.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Nova Data de Início *</label>
              <input
                type="date"
                className="input-field"
                min={minDataEste}
                value={novaData}
                onChange={e => setNovaData(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">Atual: {formatarData(servico.dataInicio)}</p>
            </div>
            <div>
              <label className="form-label">Novo Prazo de Entrega</label>
              <input
                type="date"
                className="input-field"
                min={novaData || minDataEste}
                value={novoPrazo}
                onChange={e => setNovoPrazo(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">Em branco mantém: {formatarData(servico.prazoEntrega)}</p>
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleRemarcar}
            disabled={loading}
          >
            {loading
              ? <><i className="bi bi-arrow-clockwise animate-spin"></i> Remarcando...</>
              : <><i className="bi bi-calendar-check"></i> Remarcar Serviço</>
            }
          </button>
        </div>
      )}

      {/* ── ABA: GERAR RECORRÊNCIA (somente Em Progresso) ───────────── */}
      {aba === 'vinculado' && servico.status === 'Em Progresso' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-800">
            <i className="bi bi-arrow-repeat mr-1.5"></i>
            Gera um <strong>serviço recorrente</strong> para o mesmo cliente
            <strong> {servico.cliente?.nome}</strong>, vinculado a este serviço. A data de início deve ser
            posterior a <strong>{formatarData(servico.dataInicio)}</strong>.
          </div>

          <div>
            <label className="form-label">Tipo do Novo Serviço *</label>
            <select
              className="input-field"
              value={formVinculado.tipoServico}
              onChange={e => setFormVinculado(f => ({ ...f, tipoServico: e.target.value }))}
            >
              <option value="">— Selecione o tipo —</option>
              {TIPOS_SERVICO.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Observações</label>
            <textarea
              rows={3}
              className="input-field resize-none"
              placeholder="Descreva o escopo do novo serviço..."
              value={formVinculado.descricao}
              onChange={e => setFormVinculado(f => ({ ...f, descricao: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Data de Início *</label>
              <input
                type="date"
                className="input-field"
                min={minDataDerivado}
                value={formVinculado.dataInicio}
                onChange={e => setFormVinculado(f => ({ ...f, dataInicio: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Prazo de Entrega *</label>
              <input
                type="date"
                className="input-field"
                min={formVinculado.dataInicio || minDataDerivado}
                value={formVinculado.prazoEntrega}
                onChange={e => setFormVinculado(f => ({ ...f, prazoEntrega: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Preço (R$) *</label>
            <InputMoeda
              className="input-field"
              value={formVinculado.preco}
              onChange={v => setFormVinculado(f => ({ ...f, preco: v }))}
            />
          </div>

          <button className="btn-primary" onClick={handleVinculado} disabled={loading}>
            {loading
              ? <><i className="bi bi-arrow-clockwise animate-spin"></i> Gerando...</>
              : <><i className="bi bi-arrow-repeat"></i> Gerar Recorrência</>
            }
          </button>
        </div>
      )}
      </>)}
    </Modal>
  )
}
