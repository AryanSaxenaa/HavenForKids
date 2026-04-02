/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        haven: {
          purple: '#7c6af5',
          soft: '#f0e4ff',
          bg: '#1a1a2e',
        },
      },
    },
  },
  plugins: [],
}
