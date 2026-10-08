// --- INPUT DE MOEDA (R$) COM MÁSCARA ---
// Recebe/emite número (ex.: 1234.56) ou null; exibe "R$ 1.234,56" enquanto digita
import { formatarReais } from '../utils/validacoes'

export default function InputMoeda({ value, onChange, className = '', ...props }) {
  function handleChange(e) {
    const digitos = e.target.value.replace(/\D/g, '').slice(0, 12)
    onChange(digitos ? Number(digitos) / 100 : null)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      placeholder="R$ 0,00"
      value={value === null || value === undefined || value === '' ? '' : formatarReais(value)}
      onChange={handleChange}
      {...props}
    />
  )
}
