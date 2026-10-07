/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        verde: {
          50:  '#f0faf4',
          100: '#d9f2e3',
          200: '#b4e5c9',
          300: '#7dcca8',
          400: '#42aa7e',
          500: '#208d61',
          600: '#14714d',
          700: '#0f5a3d',
          800: '#0b4730',
          900: '#0B4F26',  // principal
          950: '#062e17',
        },
        slate: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        modal: '0 20px 60px rgba(0,0,0,0.25)',
      },
      animation: {
        'fade-in':    'fadeIn 0.15s ease-out',
        'slide-up':   'slideUp 0.2s ease-out',
        'toast-in':   'toastIn 0.25s ease-out',
        'toast-out':  'toastOut 0.25s ease-in forwards',
      },
      keyframes: {
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:  { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        toastIn:  { from: { opacity: 0, transform: 'translateX(100%)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        toastOut: { from: { opacity: 1, transform: 'translateX(0)' }, to: { opacity: 0, transform: 'translateX(100%)' } },
      },
    },
  },
  plugins: [],
}
