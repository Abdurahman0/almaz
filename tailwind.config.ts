import type { Config } from 'tailwindcss';

/**
 * All colors are semantic CSS variables switched by data-theme / data-accent
 * on <html>. Components must never reference raw color values.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    /* The ONLY 8 type tokens in the app — no other font sizes exist. */
    fontSize: {
      '2xs': ['11px', { lineHeight: '16px', fontWeight: '500' }],
      xs: ['12px', { lineHeight: '18px' }],
      sm: ['13px', { lineHeight: '20px' }],
      base: ['14px', { lineHeight: '22px' }],
      md: ['16px', { lineHeight: '24px', fontWeight: '600' }],
      lg: ['18px', { lineHeight: '26px', fontWeight: '600', letterSpacing: '-0.01em' }],
      xl: ['22px', { lineHeight: '28px', fontWeight: '650', letterSpacing: '-0.01em' }],
      stat: ['26px', { lineHeight: '32px', fontWeight: '650', letterSpacing: '-0.01em' }],
    },
    extend: {
      colors: {
        bg: 'var(--bg)',
        glass: 'var(--bg-glass)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        text: 'var(--text)',
        muted: 'var(--text-muted)',
        'muted-soft': 'var(--muted-soft)',
        border: 'var(--border)',
        strong: 'var(--border-strong)',
        accent: 'var(--accent)',
        'accent-strong': 'var(--accent-strong)',
        'accent-ink': 'var(--accent-ink)',
        'accent-btn': 'var(--accent-btn)',
        'accent-btn-hover': 'var(--accent-btn-hover)',
        'accent-soft': 'var(--accent-soft)',
        'on-accent': 'var(--on-accent)',
        success: 'var(--success)',
        'success-soft': 'var(--success-soft)',
        danger: 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        scrim: 'var(--scrim)',
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono Variable"',
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      letterSpacing: {
        caps: '0.04em',
      },
      maxWidth: {
        content: '1600px',
      },
      boxShadow: {
        card: 'var(--shadow)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s linear infinite',
        'pulse-soft': 'pulse-soft 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
