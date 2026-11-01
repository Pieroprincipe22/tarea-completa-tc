import type { Config } from "tailwindcss";

// Tokens semánticos de la paleta «Plano».
// Los valores reales viven en src/app/globals.css (variables --tc-*),
// así que cambiar de paleta (o añadir modo oscuro) es tocar solo ese archivo.
const token = (name: string) => `rgb(var(--tc-${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: token("canvas"),
        surface: {
          DEFAULT: token("surface"),
          2: token("surface-2"),
          3: token("surface-3"),
        },
        line: {
          DEFAULT: token("line"),
          strong: token("line-strong"),
        },
        ink: {
          DEFAULT: token("ink"),
          2: token("ink-2"),
        },
        muted: token("muted"),
        subtle: token("subtle"),
        accent: {
          DEFAULT: token("accent"),
          hover: token("accent-hover"),
          soft: token("accent-soft"),
        },
        success: { DEFAULT: token("success"), soft: token("success-soft") },
        warning: { DEFAULT: token("warning"), soft: token("warning-soft") },
        danger: { DEFAULT: token("danger"), soft: token("danger-soft") },
        special: { DEFAULT: token("special"), soft: token("special-soft") },
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
