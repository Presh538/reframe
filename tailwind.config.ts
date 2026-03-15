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
          DEFAULT: '#3f37c9',
          hover:   '#4f46e5',
          muted:   'rgba(63,55,201,0.14)',
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
        'spin-slow':    'spin 1.4s linear infinite',
        'fade-in':      'fadeIn 0.15s ease-out',
        'pop-in':       'popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        'panel-in':     'panelIn 0.2s cubic-bezier(0.22,1,0.36,1)',
        'slide-up':     'slideUp 0.22s cubic-bezier(0.22,1,0.36,1)',
        'slide-down':   'slideDown 0.18s cubic-bezier(0.4,0,1,1)',
        'press-bounce': 'pressBounce 0.35s cubic-bezier(0.34,1.56,0.64,1)',
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
        // Panel unfolds downward from the triggering tab
        panelIn: {
          from: { opacity: '0', transform: 'translateY(-6px) scale(0.98)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        // Toast enters from below
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        // Toast exits upward
        slideDown: {
          from: { opacity: '1', transform: 'translateY(0)' },
          to:   { opacity: '0', transform: 'translateY(6px)' },
        },
        // Play button burst on click
        pressBounce: {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(0.88)' },
          '70%':  { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
