import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        "roboto-condensed": [
          "var(--font-roboto-condensed)",
          "Roboto Condensed",
          "system-ui",
          "sans-serif",
        ],
        "roboto-mono": ["var(--font-roboto-mono)", "Roboto Mono", "monospace"],
        inter: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#4caf50",
          hover: "#45a049",
        },
        accent: {
          DEFAULT: "#3b82f6",
        },
        background: {
          primary: "#ffffff",
          secondary: "#f8f9fa",
        },
        text: {
          primary: "#1f2937",
          secondary: "#6b7280",
        },
        border: {
          DEFAULT: "#e5e7eb",
        },
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "300ms",
        slow: "500ms",
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};

export default config;
