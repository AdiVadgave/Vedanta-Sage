/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Industrial dark theme
        ink: {
          900: "#0b1120",
          800: "#0f172a",
          700: "#1e293b",
          600: "#334155",
        },
        // Safety accent (hazard amber)
        sage: {
          50: "#fff7ed",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
        },
        accent: {
          teal: "#2dd4bf",
          blue: "#38bdf8",
          green: "#34d399",
          red: "#f87171",
          amber: "#fbbf24",
          purple: "#a78bfa",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px -4px rgba(249,115,22,0.4)",
        card: "0 8px 30px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(248,113,113,0.5)" },
          "70%": { boxShadow: "0 0 0 10px rgba(248,113,113,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(248,113,113,0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
        pulseRing: "pulseRing 2s infinite",
      },
    },
  },
  plugins: [],
};
