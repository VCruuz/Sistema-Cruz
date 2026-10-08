// --- CAMADA DE COMUNICAÇÃO COM O BACKEND ---
const BASE = '/api'

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store', // evita listas desatualizadas após criar/excluir
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(`${BASE}${path}`, opts)

  if (res.status === 204) return null

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    // O GlobalExceptionHandler retorna { erro, campos? }
    const mensagem = data?.erro || data?.message || res.statusText || 'Erro na requisição'
    const err = new Error(mensagem)
    err.campos = data?.campos || null   // erros de validação por campo
    throw err
  }

  return data
}

// --- DOWNLOAD DE ARQUIVO (PDF) via blob ---
async function baixarArquivo(path, nomeArquivo) {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' })
  if (res.status === 204) return false // registro não existe mais
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.erro || data?.message || 'Não foi possível gerar o arquivo.')
  }
  const blob = await res.blob()
  const url  = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => window.URL.revokeObjectURL(url), 1000)
  return true
}

// --- CLIENTES ---
export const clienteApi = {
  listar:  ()          => request('GET',    '/clientes'),
  buscar:  (id)        => request('GET',    `/clientes/${id}`),
  criar:   (dados)     => request('POST',   '/clientes', dados),
  editar:  (id, dados) => request('PUT',    `/clientes/${id}`, dados),
  excluir: (id)        => request('DELETE', `/clientes/${id}`),
}

// --- SERVIÇOS (usa ServicoRequestDTO no backend) ---
export const servicoApi = {
  listar:          ()              => request('GET',    '/servicos'),
  buscar:          (id)            => request('GET',    `/servicos/${id}`),
  acompanhar:      (id)            => request('GET',    `/servicos/${id}/acompanhar`),
  criar:           (dto)           => request('POST',   '/servicos', dto),
  editar:          (id, dto)       => request('PUT',    `/servicos/${id}`, dto),
  remarcar:        (id, novaData)  => request('PUT',    `/servicos/${id}/remarcar?novaData=${novaData}`),
  gerarVinculado:  (id, dto)       => request('POST',   `/servicos/${id}/vinculado`, dto),
  excluir:         (id)            => request('DELETE', `/servicos/${id}`),
}

// --- USUÁRIOS ---
export const usuarioApi = {
  login:  (email, senha) => request('POST', '/usuarios/login',  { email, senha }),
  logout: ()             => request('POST', '/usuarios/logout'),
}

// --- RELATÓRIOS (usa RelatorioRequestDTO no backend) ---
export const relatorioApi = {
  listar:  ()    => request('GET',  '/relatorios'),
  buscar:  (id)  => request('GET',  `/relatorios/${id}`),
  gerar:   (dto) => request('POST', '/relatorios/gerar', dto),
  excluir: (id)  => request('DELETE', `/relatorios/${id}`),
  exportarPdf: (id) => baixarArquivo(`/relatorios/${id}/pdf`, `relatorio-${id}.pdf`),
}
