/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Включаем поддержку dark mode через классы
  theme: {
    extend: {
      scale: {
        '102': '1.02',
      },
      boxShadow: {
        'dark-card': '0 4px 14px 0 rgba(30, 64, 175, 0.25)',
        'dark-card-hover': '0 8px 30px 0 rgba(30, 64, 175, 0.4)',
      },
    },
  },
  plugins: [],
}
