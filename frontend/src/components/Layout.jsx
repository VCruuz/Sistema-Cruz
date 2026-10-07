// --- LAYOUT COM NAVBAR ---
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usuarioApi } from '../services/api'

const NAV_LINKS = [
  { to: '/clientes',   label: 'Clientes',   icon: 'bi-people' },
  { to: '/servicos',   label: 'Serviços',   icon: 'bi-tools' },
  { to: '/relatorios', label: 'Relatórios', icon: 'bi-file-earmark-bar-graph' },
]

export default function Layout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await usuarioApi.logout().catch(() => {})
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* --- NAVBAR --- */}
      <header className="bg-verde-900 shadow-lg sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Marca */}
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <i className="bi bi-building text-white text-sm"></i>
              </span>
              <div>
                <span className="text-white font-bold text-sm tracking-wide">Cruz Engenharia</span>
                <span className="text-white/50 text-xs block leading-none">Sistema de Gestão</span>
              </div>
            </div>

            {/* Navegação */}
            <nav className="flex items-center gap-1">
              {NAV_LINKS.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                    ${isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'}`
                  }
                >
                  <i className={`bi ${icon} text-sm`}></i>
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Usuário */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-white text-xs font-medium leading-tight">{usuario?.nome}</p>
                <p className="text-white/50 text-xs leading-tight">{usuario?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all"
              >
                <i className="bi bi-box-arrow-right"></i>
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- CONTEÚDO --- */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
