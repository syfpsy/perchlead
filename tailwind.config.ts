import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        tightish: "-0.012em",
      },
      colors: {
        ink: {
          50: "#f7f8fa",
          100: "#eef0f4",
          200: "#dde1e8",
          300: "#bcc2cf",
          400: "#8b94a7",
          500: "#5e6779",
          600: "#434b5d",
          700: "#2f3543",
          800: "#1d212c",
          900: "#0f1218",
          950: "#080a0e",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 18, 24, 0.04), 0 1px 1px rgba(15, 18, 24, 0.03)",
        card: "0 1px 0 rgba(15, 18, 24, 0.04), 0 4px 16px -8px rgba(15, 18, 24, 0.08)",
        pop: "0 8px 28px -10px rgba(15, 18, 24, 0.18)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(2px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
      },
    },
  },
  darkMode: "class",
  // The HeroUI plugin ships its own (slightly newer) Tailwind types; cast to
  // any to avoid a phantom `prefix` mismatch on PluginAPI.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [
    (heroui as any)({
      themes: {
        light: {
          colors: {
            background: "#ffffff",
            foreground: "#0f1218",
            primary: {
              50: "#eef4ff",
              100: "#dde9ff",
              200: "#b9d0ff",
              300: "#8aafff",
              400: "#5d8aff",
              500: "#3a6bff",
              600: "#2752ec",
              700: "#1f40c2",
              800: "#1c3697",
              900: "#1a2f7a",
              DEFAULT: "#2752ec",
              foreground: "#ffffff",
            },
          },
        },
        dark: {
          colors: {
            background: "#0b0d12",
            foreground: "#f0f2f6",
            primary: {
              50: "#0f1a3a",
              100: "#142353",
              200: "#1c3597",
              300: "#2a4ac7",
              400: "#3d63ee",
              500: "#5d80ff",
              600: "#7e98ff",
              700: "#a3b6ff",
              800: "#cbd6ff",
              900: "#e6ecff",
              DEFAULT: "#5d80ff",
              foreground: "#0b0d12",
            },
          },
        },
      },
    }),
  ],
};

export default config;
