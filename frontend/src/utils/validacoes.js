// --- UTILITÁRIOS DE VALIDAÇÃO E MÁSCARA ---

// Aplica máscara de telefone celular brasileiro (XX) 9XXXX-XXXX — 11 dígitos
export function mascaraTelefone(valor) {
  // Remove tudo que não for dígito e limita a 11
  const n = valor.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 2)  return n.replace(/^(\d{0,2})/, '($1')
  if (n.length <= 6)  return n.replace(/^(\d{2})(\d{0,4})/, '($1) $2')
  return n.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
}

// Valida celular estrito: (XX) 9XXXX-XXXX — DDD + 9 + 8 dígitos = 11 total
export function validarTelefone(valor) {
  return /^\(\d{2}\) 9\d{4}-\d{4}$/.test(valor)
}

// Valida e-mail básico
export function validarEmail(valor) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)
}

// Data mínima = hoje (para inputs type="date")
export function dataMinima() {
  return new Date().toISOString().split('T')[0]
}

// Dia seguinte a uma data "YYYY-MM-DD" (cálculo em UTC para não sofrer com fuso)
export function diaSeguinte(data) {
  if (!data) return ''
  const d = new Date(`${data}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().split('T')[0]
}

// Data mínima para um serviço recorrente: dia seguinte ao serviço de origem (nunca antes de hoje)
export function dataMinimaRecorrencia(dataOrigem) {
  const hoje = dataMinima()
  const apos = diaSeguinte(dataOrigem)
  return apos && apos > hoje ? apos : hoje
}

// Tipos de serviço predefinidos
export const TIPOS_SERVICO = [
  'Laudo Técnico',
  'Vistoria Predial / Imobiliária',
  'Acompanhamento / Gestão de Obra',
  'Projeto Arquitetônico / Estrutural',
  'Perícia e Avaliação de Imóvel',
  'Regularização de Imóvel (Habite-se)',
  'Consulta / Assessoria Técnica',
]

// --- MOEDA (R$) ---
const FORMATADOR_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// Formata número como "R$ 1.234,56"; null/undefined → "—"
export function formatarReais(valor) {
  if (valor === null || valor === undefined || valor === '' || isNaN(Number(valor))) return '—'
  return FORMATADOR_BRL.format(Number(valor))
}

// Preço válido: número ≥ 0,01
export function precoValido(valor) {
  const n = Number(valor)
  return valor !== null && valor !== '' && !isNaN(n) && n >= 0.01
}

// --- DATAS: "YYYY-MM-DD" → "DD/MM/YYYY" ---
export function formatarData(data) {
  if (!data) return '—'
  const [a, m, d] = String(data).split('-')
  return d && m && a ? `${d}/${m}/${a}` : String(data)
}

// --- ORDENAÇÃO HIERÁRQUICA: recorrentes logo abaixo do serviço que os gerou ---
// Retorna nova lista; cada item ganha "nivel" (0 = primário, 1+ = recorrente)
export function ordenarHierarquia(servicos) {
  const porId  = new Map(servicos.map(s => [s.idServico, s]))
  const filhos = new Map()
  const raizes = []
  for (const s of [...servicos].sort((a, b) => a.idServico - b.idServico)) {
    const idOrigem = s.servicoOrigem?.idServico
    if (idOrigem && porId.has(idOrigem)) {
      if (!filhos.has(idOrigem)) filhos.set(idOrigem, [])
      filhos.get(idOrigem).push(s)
    } else {
      raizes.push(s)
    }
  }
  const saida = []
  const vistos = new Set()
  const visitar = (s, nivel) => {
    if (vistos.has(s.idServico)) return
    vistos.add(s.idServico)
    saida.push({ ...s, nivel })
    for (const f of filhos.get(s.idServico) ?? []) visitar(f, nivel + 1)
  }
  raizes.forEach(r => visitar(r, 0))
  servicos.forEach(s => visitar(s, 0)) // segurança contra ciclos
  return saida
}

// --- STATUS FINALIZADOS: serviço somente leitura (sem edição, remarcação ou exclusão) ---
export const STATUS_FINALIZADOS = ['Concluído', 'Cancelado']
export const servicoFinalizado = s => STATUS_FINALIZADOS.includes(s?.status)

// --- CLIENTE EXCLUÍDO (soft delete) ---
// Excluído = cliente inativo (ativo === false) ou não mais vinculado ao serviço
export function clienteExcluido(servico) {
  return !servico?.cliente || servico.cliente.ativo === false
}

// Nome para exibição: nome atual/histórico + marcação de excluído
export function nomeClienteServico(servico, nomeHistorico) {
  const nome = servico?.cliente?.nome || servico?.clienteNome || nomeHistorico
  if (!clienteExcluido(servico)) return nome || 'Cliente não informado'
  return nome ? `${nome} (Excluído)` : 'Cliente Desativado/Excluído'
}
