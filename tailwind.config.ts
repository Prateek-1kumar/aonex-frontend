import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans:      ["var(--font-poppins)",    "system-ui", "sans-serif"],
        serif:     ["var(--font-playfair)",   "Georgia",   "serif"],
        display:   ["var(--font-cormorant)",  "Georgia",   "serif"],
        "dm-sans": ["var(--font-dm-sans)",    "system-ui", "sans-serif"],
        "dm-mono": ["var(--font-dm-mono)",    "monospace"],
      },
      colors: {
        border:     "hsl(var(--border) / <alpha-value>)",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface) / <alpha-value>)",
          hover:   "hsl(var(--surface-hover) / <alpha-value>)",
        },
        code:    "hsl(var(--code) / <alpha-value>)",
        overlay: "hsl(var(--overlay) / <alpha-value>)",
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        danger:  "hsl(var(--danger) / <alpha-value>)",
        ld: {
          bg:             "rgb(var(--ld-bg) / <alpha-value>)",
          surface:        "rgb(var(--ld-surface) / <alpha-value>)",
          "surface-light":"rgb(var(--ld-surface-light) / <alpha-value>)",
          border:         "rgb(var(--ld-border) / <alpha-value>)",
          teal:           "rgb(var(--ld-teal) / <alpha-value>)",
          "teal-dim":     "rgb(var(--ld-teal-dim) / <alpha-value>)",
          text:           "rgb(var(--ld-text) / <alpha-value>)",
          muted:          "rgb(var(--ld-muted) / <alpha-value>)",
          dim:            "var(--ld-dim)",
          terminal:       "rgb(var(--ld-terminal) / <alpha-value>)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        ticker: "ticker 35s linear infinite",
      },
      keyframes: {
        ticker: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
