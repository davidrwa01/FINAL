/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        yellow: {
          DEFAULT: '#FFD700',
          light: '#FFE44D',
          dark: '#E6C200',
        },
        black: {
          DEFAULT: '#0B0B0B',
          light: '#1A1A1A',
          lighter: '#252525',
        },
        green: {
          DEFAULT: '#00D26A',
        },
        red: {
          DEFAULT: '#FF4757',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
