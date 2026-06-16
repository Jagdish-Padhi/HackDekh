module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      borderRadius: {
        md: '12px',
        lg: '16px',
      },
      boxShadow: {
        violet: '0 0 12px 0 rgba(124, 58, 237, 0.25)',
        'cyan-glow': '0 0 16px 0 rgba(34, 211, 238, 0.18)',
      },
      colors: {
        'bg-main': 'var(--color-bg-main)',
        'bg-card': 'var(--color-bg-card)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'violet': 'var(--color-violet)',
        'violet-hover': 'var(--color-violet-hover)',
        'violet-tint': 'var(--color-violet-tint)',
        // Add more as needed for new theme
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
        26: '6.5rem',
      },
    },
  },
  plugins: [],
}
