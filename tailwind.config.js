export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#d4af35",
        "background-light": "#f8f7f6",
        "background-dark": "#1a1812",
        "surface-dark": "#2a261a",
        brand: {
          charcoal: '#16130C',
          surface: '#221D12',
          surfaceMuted: '#2B2519',
          border: '#3A311E',
          borderLight: '#4A3F29',
          amber: '#E5B83B',
          amberHover: '#f5c94d',
          emerald: '#00A878',
          emeraldBg: '#09291E',
          cream: '#D8D0C0',
          muted: '#9C917A',
          cardDark: '#1A160E'
        }
      },
      fontFamily: {
        "display": ["Work Sans", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
    },
  },
  plugins: [],
}
