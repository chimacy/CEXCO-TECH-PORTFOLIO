/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], display: ['Fraunces', 'Georgia', '"Times New Roman"', 'serif'] },
      colors: { ink: '#0e0e0e', paper: '#f6f4ef', accent: { DEFAULT: '#c2410c', dark: '#9a3412' } },
      keyframes: { fadeUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'none' } } },
      animation: { fadeUp: 'fadeUp .6s ease-out both' },
    },
  },
  plugins: [],
                                                                                             }
