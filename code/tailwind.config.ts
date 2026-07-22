import type { Config } from "tailwindcss";

/*
 * Restrained-minimal theme. Colours resolve to the CSS variables in
 * globals.css so there is exactly one place to retune the palette.
 *
 * The old `brand-*` blue scale is gone on purpose: a single accent, applied
 * sparingly, is what makes the rest of the UI read as calm.
 */
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        page: "var(--page)",
        surface: {
          DEFAULT: "var(--surface)",
          sunken: "var(--surface-sunken)",
        },
        ink: {
          DEFAULT: "var(--text)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        line: {
          DEFAULT: "var(--line)",
          strong: "var(--line-strong)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          bg: "var(--accent-bg)",
          soft: "var(--accent-soft)",
        },
        badge: {
          bg: "var(--badge-bg)",
          line: "var(--badge-line)",
          ink: "var(--badge-ink)",
        },
        prog: {
          DEFAULT: "var(--prog)",
          track: "var(--prog-track)",
        },
        positive: {
          DEFAULT: "var(--positive)",
          bg: "var(--positive-bg)",
          text: "var(--positive-text)",
        },
        negative: {
          DEFAULT: "var(--negative)",
          bg: "var(--negative-bg)",
          text: "var(--negative-text)",
        },
        warning: {
          bg: "var(--warning-bg)",
          text: "var(--warning-text)",
        },
      },
      borderRadius: {
        // Small, deliberate. Cards 9, controls 6.
        card: "9px",
        control: "6px",
      },
      fontSize: {
        // A closed scale. Anything outside these is a mistake.
        // `hero` exists for exactly one thing: the refund/owing figure on the
        // results page, which is the answer the whole tool was built to give.
        // NOTE: these names are registered with tailwind-merge in lib/utils.ts --
        // without that it treats `text-body` as a colour and eats `text-white`.
        micro: ["11px", { lineHeight: "16px" }],
        label: ["13px", { lineHeight: "18px" }],
        body: ["14px", { lineHeight: "21px" }],
        amount: ["16px", { lineHeight: "22px" }],
        title: ["17px", { lineHeight: "24px" }],
        display: ["24px", { lineHeight: "31px" }],
        hero: ["38px", { lineHeight: "44px" }],
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
