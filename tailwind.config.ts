import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "rgb(var(--navy) / <alpha-value>)",
          light: "rgb(var(--light-navy) / <alpha-value>)",
          lightest: "rgb(var(--lightest-navy) / <alpha-value>)",
        },
        slate: {
          DEFAULT: "rgb(var(--slate) / <alpha-value>)",
          light: "rgb(var(--light-slate) / <alpha-value>)",
          lightest: "rgb(var(--lightest-slate) / <alpha-value>)",
        },
        white: "rgb(var(--white) / <alpha-value>)",
        green: {
          DEFAULT: "rgb(var(--green) / <alpha-value>)",
          tint: "rgb(var(--green-tint) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"SF Mono"', '"Fira Code"', '"Fira Mono"', "monospace"],
      },
      transitionTimingFunction: {
        'bc': 'cubic-bezier(0.645, 0.045, 0.355, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
