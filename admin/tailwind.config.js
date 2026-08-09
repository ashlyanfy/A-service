/** @type {import('tailwindcss').Config} */
// Палитра A-SERVICE — токены --as-brand-* лендинга (src/assets/css/40-brand-components.css)
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f8f6fc",
          100: "#f0ecf9",
          200: "#d8ccf5",
          300: "#b8a5ed",
          500: "#6b4fd0",
          600: "#563db8",
          700: "#3e2c8d",
          800: "#29195f",
          900: "#1b1135",
          950: "#120c20",
        },
        ink: "#15131a",
        muted: "#65606d",
        line: "#e5e0ef",
        paper: "#f7f5fb",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans", "Segoe UI", "Arial", "sans-serif"],
        display: ["Manrope", "Inter", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
      },
    },
  },
  plugins: [],
};
