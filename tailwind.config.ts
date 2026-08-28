import type { Config } from "tailwindcss";

// Paleta derivada de los dos colores de marca ya en uso (#eb6c36 / #1f3864):
// se agregan escalas numeradas para tener superficies e interacciones
// consistentes (fondos tenues, hover, bordes) sin perder las clases
// `bg-brand`, `text-brand-dark`, etc. que ya usa el resto del código.
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef6f1",
          100: "#fce8dc",
          200: "#f8ccb0",
          300: "#f3a97e",
          400: "#ef8a5a",
          500: "#eb6c36",
          600: "#d2551f",
          700: "#ac4419",
          800: "#7a3115",
          900: "#1f3864",
          DEFAULT: "#eb6c36",
          dark: "#1f3864",
          darkLight: "#2c4f81",
        },
        success: { 50: "#eefdf3", 100: "#d6f7e2", 600: "#16a34a", 700: "#0f7c39" },
        warning: { 50: "#fffbeb", 100: "#fef3c7", 600: "#d97706", 700: "#b45309" },
        danger: { 50: "#fef2f2", 100: "#fee2e2", 600: "#dc2626", 700: "#b91c1c" },
        info: { 50: "#eff6ff", 100: "#dbeafe", 600: "#2563eb", 700: "#1d4ed8" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 6px -1px rgb(15 23 42 / 0.06)",
        popover: "0 12px 32px -8px rgb(15 23 42 / 0.18)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};

export default config;
