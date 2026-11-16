import daisyui from 'daisyui'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#a3e635',
          500: '#84cc16',
          600: '#65a30d',
          700: '#4d7c0f',
          800: '#3f6212',
          900: '#365314',
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
        card: '0 1px 3px rgba(0, 0, 0, 0.08), 0 8px 24px -8px rgba(0, 0, 0, 0.12)',
        'brand-sm': '0 2px 8px rgba(132, 204, 22, 0.3)',
        'brand-md': '0 4px 16px rgba(132, 204, 22, 0.35)',
        'brand-lg': '0 8px 32px rgba(132, 204, 22, 0.4)',
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
          primary: '#84cc16',
          'primary-content': '#1a2e05',
          secondary: '#65a30d',
          'secondary-content': '#1a2e05',
          accent: '#a3e635',
          'accent-content': '#1a2e05',
          neutral: '#f1f5f9',
          'neutral-content': '#0f172a',
          'base-100': '#ffffff',
          'base-200': '#f8fafc',
          'base-300': '#f1f5f9',
          'base-content': '#0f172a',
          info: '#0ea5e9',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
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
