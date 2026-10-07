// --- ROTEAMENTO PRINCIPAL ---
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/Layout'
import TelaLogin from './pages/TelaLogin'
import TelaCliente from './pages/TelaCliente'
import TelaServico from './pages/TelaServico'
import TelaRelatorio from './pages/TelaRelatorio'

function RotaProtegida({ children }) {
  const { usuario } = useAuth()
  return usuario ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<TelaLogin />} />
          <Route
            path="/"
            element={
              <RotaProtegida>
                <Layout />
              </RotaProtegida>
            }
          >
            <Route index element={<Navigate to="/clientes" replace />} />
            <Route path="clientes"   element={<TelaCliente />} />
            <Route path="servicos"   element={<TelaServico />} />
            <Route path="relatorios" element={<TelaRelatorio />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
