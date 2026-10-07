// --- MODAL DE ACOMPANHAMENTO DE SERVIÇO ---
import { useState } from 'react'
import Modal from './Modal'
import BadgeStatus from './BadgeStatus'
import { servicoApi } from '../services/api'
import { useToast } from '../context/ToastContext'
import { TIPOS_SERVICO, dataMinima, dataMinimaRecorrencia } from '../utils/validacoes'

// --- MÁQUINA DE ESTADOS: transições válidas por status ---
const TRANSICOES = {
  'Em Análise':   ['Em Progresso', 'Cancelado'],
  'Em Progresso': ['Concluído', 'Em Análise'],
  'Concluído':    ['Remarcado'],
  'Remarcado':    ['Em Progresso', 'Cancelado'],
  'Cancelado':    [],
}

const ABAS = [
  { id: 'editar',    label: 'Editar',           icon: 'bi-pencil' },
  { id: 'remarcar',  label: 'Remarcar',          icon: 'bi-calendar-event' },
  { id: 'vinculado', label: 'Serviço Vinculado', icon: 'bi-diagram-2' },
]

export default function ModalAcompanhamento({ servico: inicial, onFechar, onAtualizado }) {
  const toast = useToast()
  const hoje  = dataMinima()

  const [aba,     setAba]     = useState('editar')
  const [servico, setServico] = useState(inicial)
  const [loading, setLoading] = useState(false)

  // --- Form editar: idCliente vem do objeto cliente aninhado ---
  const [formEditar, setFormEditar] = useState({
    idCliente:   inicial.cliente?.idCliente ?? '',
    tipoServico: inicial.tipoServico ?? '',
    descricao:   inicial.descricao   ?? '',
    dataServico: inicial.dataServico ?? '',  // string "YYYY-MM-DD" ou ''
    status:      inicial.status      ?? '',
  })

  // --- Form remarcar ---
  const [novaData, setNovaData] = useState('')

  // --- Form serviço vinculado ---
  const [formVinculado, setFormVinculado] = useState({
    tipoServico: '',
    descricao:   '',
    dataServico: '',
  })

  const statusDisponiveis = TRANSICOES[servico.status] ?? []

  // Recorrência: este serviço (se derivado) só pode ocorrer após o de origem;
  // um novo derivado deste só pode ocorrer após a data deste
  const origem          = servico.servicoOrigem
  const minDataEste     = origem ? dataMinimaRecorrencia(origem.dataServico) : hoje
  const minDataDerivado = dataMinimaRecorrencia(servico.dataServico)

  // Monta o DTO para o backend — converte string vazia de data para null
  function montarDTO(f) {
    return {
      idCliente:   Number(f.idCliente),
      tipoServico: f.tipoServico,
      descricao:   f.descricao || null,
      dataServico: f.dataServico || null,   // null → backend preserva data existente
      status:      f.status || null,
    }
  }

  // --- ABA EDITAR: atualiza dados + status ---
  async function handleEditar() {
    if (!formEditar.tipoServico) { toast.aviso('Selecione o tipo de serviço.'); return }
    if (origem && formEditar.dataServico && formEditar.dataServico !== inicial.dataServico
        && formEditar.dataServico < minDataEste) {
      toast.aviso(`Serviço recorrente: a data deve ser posterior à do serviço de origem #${origem.idServico}.`)
      return
    }
    setLoading(true)
    try {
      const atualizado = await servicoApi.editar(servico.idServico, montarDTO(formEditar))
      setServico(atualizado)
      // Sincroniza formEditar com o objeto atualizado (status pode ter mudado)
      setFormEditar(f => ({ ...f, status: atualizado.status }))
      onAtualizado()
      toast.sucesso('Serviço atualizado com sucesso.')
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setLoading(false)
    }
  }

  // --- ABA REMARCAR: Concluído → Remarcado + nova data ---
  async function handleRemarcar() {
    if (!novaData) { toast.aviso('Informe a nova data.'); return }
    if (novaData < minDataEste) { toast.aviso(`A data deve ser a partir de ${minDataEste}.`); return }
    setLoading(true)
    try {
      const atualizado = await servicoApi.remarcar(servico.idServico, novaData)
      setServico(atualizado)
      onAtualizado()
      toast.sucesso('Serviço remarcado com sucesso.')
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setLoading(false)
    }
  }

  // --- ABA SERVIÇO VINCULADO: novo serviço derivado para o mesmo cliente ---
  async function handleVinculado() {
    if (!formVinculado.tipoServico) { toast.aviso('Selecione o tipo do novo serviço.'); return }
    if (!formVinculado.dataServico) { toast.aviso('Informe a data do novo serviço.');   return }
    if (formVinculado.dataServico < minDataDerivado) {
      toast.aviso(`A data do serviço recorrente deve ser posterior a ${servico.dataServico}.`)
      return
    }
    setLoading(true)
    try {
      await servicoApi.gerarVinculado(servico.idServico, {
        idCliente:   servico.cliente?.idCliente,
        tipoServico: formVinculado.tipoServico,
        descricao:   formVinculado.descricao || null,
        dataServico: formVinculado.dataServico,
      })
      onAtualizado()
      toast.sucesso(`Novo serviço "${formVinculado.tipoServico}" gerado e vinculado.`)
      setFormVinculado({ tipoServico: '', descricao: '', dataServico: '' })
    } catch (e) {
      toast.erro(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal titulo={`Acompanhar Serviço #${servico.idServico}`} onFechar={onFechar} tamanho="lg">

      {/* --- RESUMO DO SERVIÇO --- */}
      <div className="rounded-xl bg-verde-50 border border-verde-200 px-4 py-3 mb-5 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-verde-900">{servico.tipoServico}</p>
          {servico.descricao && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{servico.descricao}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
            <span><i className="bi bi-person mr-1"></i>{servico.cliente?.nome ?? '—'}</span>
            {servico.dataServico && (
              <span><i className="bi bi-calendar3 mr-1"></i>{servico.dataServico}</span>
            )}
            {origem && (
              <span className="badge bg-violet-100 text-violet-700 border border-violet-200">
                <i className="bi bi-link-45deg mr-0.5"></i>Recorrente — gerado de #{origem.idServico}
                {origem.dataServico ? ` (${origem.dataServico})` : ''}
              </span>
            )}
          </div>
        </div>
        <BadgeStatus status={servico.status} />
      </div>

      {/* --- ABAS --- */}
      <div className="flex gap-1 border-b border-slate-200 mb-5">
        {ABAS.map(a => (
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
            <label className="form-label">Tipo de Serviço</label>
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

          <div>
            <label className="form-label">Data do Serviço</label>
            <input
              type="date"
              className="input-field"
              min={minDataEste}
              value={formEditar.dataServico}
              onChange={e => setFormEditar(f => ({ ...f, dataServico: e.target.value }))}
            />
            <p className="text-xs text-slate-400 mt-1">Deixe em branco para manter a data atual.</p>
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
      {aba === 'remarcar' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <i className="bi bi-info-circle mr-1.5"></i>
            Move o status para <strong>Remarcado</strong> e define uma nova data.
            Disponível apenas quando o serviço está <strong>Concluído</strong>.
          </div>

          <div>
            <label className="form-label">Nova Data do Serviço</label>
            <input
              type="date"
              className="input-field"
              min={minDataEste}
              value={novaData}
              onChange={e => setNovaData(e.target.value)}
            />
          </div>

          <button
            className="btn-primary"
            onClick={handleRemarcar}
            disabled={loading || servico.status !== 'Concluído'}
            title={servico.status !== 'Concluído' ? 'Disponível apenas para serviços Concluídos' : ''}
          >
            {loading
              ? <><i className="bi bi-arrow-clockwise animate-spin"></i> Remarcando...</>
              : <><i className="bi bi-calendar-check"></i> Remarcar Serviço</>
            }
          </button>
        </div>
      )}

      {/* ── ABA: SERVIÇO VINCULADO ──────────────────────────────────── */}
      {aba === 'vinculado' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-sky-50 border border-sky-200 px-4 py-3 text-sm text-sky-800">
            <i className="bi bi-diagram-2 mr-1.5"></i>
            Cria um <strong>novo serviço derivado</strong> para o mesmo cliente
            <strong> {servico.cliente?.nome}</strong>, mantendo o vínculo com este serviço de origem.
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

          <div>
            <label className="form-label">Data do Novo Serviço *</label>
            <input
              type="date"
              className="input-field"
              min={minDataDerivado}
              value={formVinculado.dataServico}
              onChange={e => setFormVinculado(f => ({ ...f, dataServico: e.target.value }))}
            />
            {servico.dataServico && (
              <p className="text-xs text-slate-400 mt-1">
                Deve ser posterior à data deste serviço ({servico.dataServico}).
              </p>
            )}
          </div>

          <button className="btn-primary" onClick={handleVinculado} disabled={loading}>
            {loading
              ? <><i className="bi bi-arrow-clockwise animate-spin"></i> Gerando...</>
              : <><i className="bi bi-plus-circle"></i> Gerar Serviço Vinculado</>
            }
          </button>
        </div>
      )}
    </Modal>
  )
}
