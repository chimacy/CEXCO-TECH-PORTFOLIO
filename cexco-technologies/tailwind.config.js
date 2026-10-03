/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#0b0b0c',
        paper: '#ffffff',
        // Brand green: derived from the logo at runtime (see src/lib/settings.tsx), with a safe default in index.css
        accent: { DEFAULT: 'rgb(var(--accent) / <alpha-value>)', dark: 'rgb(var(--accent-dark) / <alpha-value>)' },
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'none' } },
        fade: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
      animation: { fadeUp: 'fadeUp .7s cubic-bezier(.22,1,.36,1) both', fade: 'fade .4s ease-out both' },
    },
  },
  plugins: [],
        }
