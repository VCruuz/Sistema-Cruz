// --- BADGE DE STATUS DO SERVIÇO ---
const ESTILOS = {
  'Em Análise':   'bg-amber-100 text-amber-700 border border-amber-200',
  'Em Progresso': 'bg-sky-100 text-sky-700 border border-sky-200',
  'Concluído':    'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'Cancelado':    'bg-red-100 text-red-700 border border-red-200',
  'Remarcado':    'bg-violet-100 text-violet-700 border border-violet-200',
}

export default function BadgeStatus({ status }) {
  const cls = ESTILOS[status] || ESTILOS['Em Análise']
  return (
    <span className={`badge ${cls}`}>
      {status}
    </span>
  )
}
