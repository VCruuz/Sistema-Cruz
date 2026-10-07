// --- COMPONENTE MODAL GENÉRICO ---
export default function Modal({ titulo, onFechar, children, footer, tamanho = 'md' }) {
  const largura = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div className={`bg-white rounded-2xl shadow-modal w-full ${largura[tamanho]} max-h-[90vh] flex flex-col animate-slide-up`}>
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 bg-verde-900 rounded-t-2xl shrink-0">
          <h4 className="text-sm font-semibold text-white">{titulo}</h4>
          <button
            onClick={onFechar}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <i className="bi bi-x-lg text-sm"></i>
          </button>
        </div>
        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
        {/* Rodapé */}
        {footer && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
