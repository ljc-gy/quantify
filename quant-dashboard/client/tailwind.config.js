/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        accent: '#06b6d4',
        cyber: {
          dark:   '#0a0e17',
          darker: '#060b14',
          navy:   '#0f1629',
          sidebar:'#0f172a',
          card:   '#111827',
          blue:   '#1e3a8a',
          'blue-bright': '#3b82f6',
          indigo: '#6366f1',
          purple: '#8b5cf6',
          'purple-deep': '#4c1d95',
          cyan:   '#00e5ff',
          pink:   '#ff4081',
          white:  '#e2e8f0',
          gray:   '#94a3b8',
          'gray-dark': '#475569',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 8px rgba(99, 102, 241, 0.25)',
        glow: '0 0 12px rgba(99, 102, 241, 0.30)',
        'glow-md': '0 0 18px rgba(99, 102, 241, 0.35)',
        'glow-lg': '0 0 28px rgba(99, 102, 241, 0.45)',
        'glow-cyan': '0 0 12px rgba(0, 229, 255, 0.25)',
        'glow-pink': '0 0 10px rgba(255, 64, 129, 0.25)',
        'glow-green': '0 0 10px rgba(34, 197, 94, 0.30)',
        'sidebar-glow': '2px 0 12px rgba(99, 102, 241, 0.15)',
      },
      borderRadius: {
        'card': '12px',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 6px rgba(34, 197, 94, 0.4)' },
          '50%': { opacity: '0.4', boxShadow: '0 0 16px rgba(34, 197, 94, 0.8)' },
        },
      },
      animation: {
        breathe: 'breathe 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
