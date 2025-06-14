// tailwind.config.ts
import type { Config } from "tailwindcss";

// ✅ Assign to variable before exporting
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        analytics: {
          blue: {
            50: "#f0f8ff",
            100: "#e0f0ff",
            500: "#1862c7",
            600: "#186fb2",
            700: "#18627b",
          },
          yellow: {
            100: "#fff7d6",
            500: "#ffe671",
          },
        },
      },
      fontFamily: {
        sans: [
          "var(--font-roboto-condensed)",
          "Roboto Condensed",
          "system-ui",
          "sans-serif",
        ],
        mono: ["var(--font-roboto-condensed)", "Roboto Condensed", "monospace"],
        "roboto-condensed": [
          "var(--font-roboto-condensed)",
          "Roboto Condensed",
          "system-ui",
          "sans-serif",
        ],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
