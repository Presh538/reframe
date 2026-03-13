import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // All colors reference CSS variables so dark/light themes work automatically
        bg:      'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2:       'var(--surface-2)',
          3:       'var(--surface-3)',
        },
        border: {
          DEFAULT: 'var(--border)',
          subtle:  'var(--border-subtle)',
        },
        muted:       'var(--muted)',
        soft:        'var(--text-soft)',
        faint:       'var(--text-faint)',
        'very-faint':'var(--text-very-faint)',
        // Fixed accent / semantic colours (same in both themes)
        accent: {
          DEFAULT: '#7c5cfc',
          hover:   '#9b84ff',
          muted:   'rgba(124,92,252,0.14)',
        },
        success: '#3ddc84',
        warning: '#f5a623',
        danger:  '#f56565',
      },
      fontFamily: {
        sans: [
          'var(--font-geist-sans)',
          '-apple-system',
          'BlinkMacSystemFont',
          "'Segoe UI'",
          'sans-serif',
        ],
        mono: [
          'var(--font-geist-mono)',
          'ui-monospace',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs:    ['11px', { lineHeight: '16px' }],
        sm:    ['12px', { lineHeight: '18px' }],
        base:  ['13px', { lineHeight: '20px' }],
      },
      borderRadius: {
        DEFAULT: '6px',
        sm:      '4px',
        lg:      '10px',
        xl:      '14px',
      },
      animation: {
        'spin-slow': 'spin 1.4s linear infinite',
        'fade-in':   'fadeIn 0.15s ease-out',
        'pop-in':    'popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        popIn: {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
