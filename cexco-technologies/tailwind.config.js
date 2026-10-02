/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'] },
      colors: { ink: '#0b0b0c', paper: '#fafaf7', accent: { DEFAULT: '#ff4d1c', dark: '#d93a0e' } },
      keyframes: { fadeUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'none' } } },
      animation: { fadeUp: 'fadeUp .5s ease-out both' },
    },
  },
  plugins: [],
}
