/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <--- IMPORTANT: Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Adding your Army Gold as a custom variable for easy use
        armyGold: '#d4af37',
      },
    },
  },
  plugins: [],
}