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
        surface: { light: '#fcfcfb', dark: '#1a1a19' },
      },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.08)' },
    },
  },
  plugins: [],
}
