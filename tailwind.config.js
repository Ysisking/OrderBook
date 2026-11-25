/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50: '#eef5fd', 100: '#cde2fb', 200: '#9ec5f4', 300: '#6da7ec', 400: '#3987e5',
          500: '#2a78d6', 600: '#256abf', 700: '#1c5cab', 800: '#184f95', 900: '#0d366b',
        },
        ink: { DEFAULT: '#0b0b0b', 2: '#52514e', 3: '#8a8984' },
        // Permukaan netral: kanvas (latar), panel (kartu), garis rambut.
        canvas: { DEFAULT: '#f6f6f4', dark: '#0f0f0e' },
        surface: { light: '#ffffff', dark: '#181817', raised: '#20201f' },
        line: { DEFAULT: '#e6e5e1', strong: '#d6d5d0', dark: '#2a2a28' },
        paper: { DEFAULT: '#fffdf7', dark: '#1f1e1b' },
      },
      boxShadow: {
        card: '0 1px 0 rgba(16,24,40,.03)',
        pop: '0 8px 24px -6px rgba(16,24,40,.18), 0 2px 6px rgba(16,24,40,.08)',
        ticket: '0 1px 0 rgba(16,24,40,.04), 0 2px 6px -2px rgba(16,24,40,.10)',
      },
      keyframes: {
        'slide-in': { from: { transform: 'translateX(24px)', opacity: 0 }, to: { transform: 'none', opacity: 1 } },
        'slide-up': { from: { transform: 'translateY(16px)', opacity: 0 }, to: { transform: 'none', opacity: 1 } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        pop: { from: { transform: 'scale(.97)', opacity: 0 }, to: { transform: 'none', opacity: 1 } },
      },
      animation: {
        'slide-in': 'slide-in .18s ease-out',
        'slide-up': 'slide-up .2s ease-out',
        'fade-in': 'fade-in .15s ease-out',
        pop: 'pop .12s ease-out',
      },
    },
  },
  plugins: [],
}
