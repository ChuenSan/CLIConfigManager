/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#0f172a',
          surface: '#1e293b',
          'surface-hover': '#334155',
          border: '#334155',
          text: '#f8fafc',
          'text-muted': '#94a3b8'
        },
        primary: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          active: '#4338ca'
        },
        danger: {
          DEFAULT: '#ef4444',
          surface: 'rgba(239, 68, 68, 0.1)'
        },
        success: {
          DEFAULT: '#10b981',
          surface: 'rgba(16, 185, 129, 0.1)'
        }
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-in': 'slideIn 200ms ease-out',
        'column-in': 'columnIn 200ms ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        columnIn: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        }
      }
    }
  },
  plugins: []
}
