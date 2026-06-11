import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Dawn-tone palette — warm, intimate, soft
        rose: {
          DEFAULT: "#f4a7b9",
          50: "#fdf2f5",
          100: "#fce7ed",
          200: "#f9d0de",
          300: "#f4a7b9",
          400: "#ef7a97",
          500: "#e44d74",
          600: "#d02d5a",
          700: "#ae2148",
          800: "#8f1e3c",
          900: "#761d35",
        },
        cream: {
          DEFAULT: "#fdf6ec",
          50: "#fefdf9",
          100: "#fdf6ec",
          200: "#fbecd6",
          300: "#f6d9a8",
          400: "#f0c070",
          500: "#e9a43c",
          600: "#d98a22",
          700: "#b56d1a",
          800: "#92561b",
          900: "#77461b",
        },
        sage: {
          DEFAULT: "#a8c5a0",
          50: "#f3f8f2",
          100: "#e4f0e2",
          200: "#c9e1c6",
          300: "#a8c5a0",
          400: "#7fa877",
          500: "#5d8b55",
          600: "#496e42",
          700: "#3b5737",
          800: "#31472e",
          900: "#293b27",
        },
        warm: {
          white: "#fefefe",
          50: "#fefefe",
          100: "#fef9f4",
          200: "#fdf0e3",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
        full: "9999px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(244, 167, 185, 0.15), 0 4px 6px -2px rgba(244, 167, 185, 0.08)",
        warm: "0 4px 24px -4px rgba(244, 167, 185, 0.25)",
        card: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
