import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        nexus: {
          base: "rgb(var(--nexus-base) / <alpha-value>)",
          surface: "rgb(var(--nexus-surface) / <alpha-value>)",
          "surface-raised": "rgb(var(--nexus-surface-raised) / <alpha-value>)",
          border: "rgb(var(--nexus-border) / <alpha-value>)",
          "border-subtle": "rgb(var(--nexus-border-subtle) / <alpha-value>)",
          accent: "rgb(var(--nexus-accent) / <alpha-value>)",
          "accent-muted": "rgb(var(--nexus-accent-muted) / <alpha-value>)",
          "accent-dim": "rgb(var(--nexus-accent-dim) / <alpha-value>)",
          text: "rgb(var(--nexus-text) / <alpha-value>)",
          "text-muted": "rgb(var(--nexus-text-muted) / <alpha-value>)",
          "text-dim": "rgb(var(--nexus-text-dim) / <alpha-value>)",
          success: "rgb(var(--nexus-success) / <alpha-value>)",
          warning: "rgb(var(--nexus-warning) / <alpha-value>)",
          error: "rgb(var(--nexus-error) / <alpha-value>)",
          info: "rgb(var(--nexus-info) / <alpha-value>)",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
