import daisyui from 'daisyui'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070d19',
          900: '#0b1220',
          800: '#101a2e',
          700: '#16213a',
          600: '#1e2c4a',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(2, 8, 20, 0.4), 0 12px 32px -20px rgba(2, 8, 20, 0.9)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    logs: false,
    themes: [
      {
        sitescanner: {
          primary: '#22d3ee',
          'primary-content': '#04131c',
          secondary: '#38bdf8',
          'secondary-content': '#04131c',
          accent: '#818cf8',
          'accent-content': '#0a0f1f',
          neutral: '#1c2942',
          'neutral-content': '#dbe7f5',
          'base-100': '#0b1220',
          'base-200': '#0e1729',
          'base-300': '#16213a',
          'base-content': '#dbe7f5',
          info: '#38bdf8',
          success: '#34d399',
          warning: '#fbbf24',
          error: '#f87171',
          '--rounded-box': '0.9rem',
          '--rounded-btn': '0.6rem',
          '--rounded-badge': '0.4rem',
          '--border-btn': '1px',
          '--tab-radius': '0.5rem',
        },
      },
    ],
  },
}
