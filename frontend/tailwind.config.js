/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#020509",
          900: "#040811",
          800: "#0a0f1e",
          700: "#0d1b2a",
          600: "#1a2744",
          500: "#243358",
          400: "#2e4070",
        },
        gold: {
          50: "#fefce8",
          100: "#fef9c3",
          200: "#fef08a",
          300: "#fde047",
          400: "#d4af37",
          500: "#b8960c",
          600: "#9a7d0a",
          700: "#7c6408",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        serif: ["Georgia", "Cambria", "serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      animation: {
        "spin-slow": "spin 1.5s linear infinite",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
      },
      keyframes: {
        "pulse-gold": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
