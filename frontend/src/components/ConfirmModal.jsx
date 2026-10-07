// --- MODAL DE CONFIRMAÇÃO (substitui window.confirm) ---
export default function ConfirmModal({ titulo, mensagem, onConfirmar, onCancelar, loading }) {
  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onCancelar()}
    >
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-sm animate-slide-up">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <i className="bi bi-exclamation-triangle-fill text-red-600 text-lg"></i>
            </span>
            <h3 className="text-base font-semibold text-slate-800">{titulo}</h3>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">{mensagem}</p>
        </div>
        <div className="flex gap-2 justify-end px-6 pb-5">
          <button className="btn-secondary" onClick={onCancelar} disabled={loading}>
            Cancelar
          </button>
          <button className="btn-danger" onClick={onConfirmar} disabled={loading}>
            {loading ? 'Excluindo...' : 'Confirmar exclusão'}
          </button>
        </div>
      </div>
    </div>
  )
}
