/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0B252E',       // Midnight teal
          navy: '#0F3B46',       // Deep oceanic teal
          teal: '#0F4C5C',       // Primary deep teal
          emerald: '#0A9396',    // Vibrant emerald
          sage: '#94D2BD',       // Soft sage mint
          sand: '#E9D8A6',       // Warm sand golden
          amber: '#EE9B00',      // Golden amber accent
          rust: '#CA6702',       // Warm terracotta
          crimson: '#BB3E03',    // Vibrant crimson
          ruby: '#9B2226',       // Deep ruby
          cream: '#F8F9FA',      // Crisp light neutral
          surface: '#F4F6F6',    // Background warm light
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Calistoga', 'Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(15, 76, 92, 0.08), 0 2px 6px -1px rgba(15, 76, 92, 0.04)',
        'elevated': '0 12px 32px -4px rgba(15, 76, 92, 0.12), 0 4px 12px -2px rgba(15, 76, 92, 0.06)',
        'glow': '0 0 25px -5px rgba(10, 147, 150, 0.4)',
      }
    },
  },
  plugins: [],
}
