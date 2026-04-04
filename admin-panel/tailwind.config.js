/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          primary: '#6366f1', // Indigo
          secondary: '#4f46e5',
          bg: '#f9fafb',
          sidebar: '#1e293b'
        }
      }
    },
  },
  plugins: [],
}
