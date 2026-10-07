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
