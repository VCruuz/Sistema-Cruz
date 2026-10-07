// --- CONTEXTO DE AUTENTICAÇÃO ---
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const salvo = localStorage.getItem('ce_usuario')
    return salvo ? JSON.parse(salvo) : null
  })

  function login(dados) {
    setUsuario(dados)
    localStorage.setItem('ce_usuario', JSON.stringify(dados))
  }

  function logout() {
    setUsuario(null)
    localStorage.removeItem('ce_usuario')
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
