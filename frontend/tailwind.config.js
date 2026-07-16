/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0f1117',
          card: '#1a1d27',
          hover: '#1f2335',
          border: '#2a2d3e',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          light: '#818cf8',
          muted: '#6366f120',
        },
        strength: {
          mistake: '#ef4444',
          great: '#f97316',
          good: '#22c55e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(99, 102, 241, 0.15)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.25)',
        'glow-orange': '0 0 20px rgba(249, 115, 22, 0.20)',
      },
    },
  },
  plugins: [],
}
