// Design tokens for the explainer site (ported from the handoff's `CK`).
//
// Color policy (per the handoff): neutral surface/text colors map to the app's
// stone theme via CSS custom properties (Tailwind v4 exposes `--color-stone-*`
// / `--color-white`), so the site tracks the app's theme. The *functional
// layer-accent palette* — the semantic hues that identify each Grammar-of-
// Graphics layer — is kept verbatim as oklch literals so layers stay mutually
// distinct and consistent across the widget, legend, and accent text.
export const CK = {
  // ── neutrals → stone theme tokens ──
  ink: "var(--color-stone-800)", // primary text
  ink2: "var(--color-stone-600)", // secondary text
  faint: "var(--color-stone-500)", // muted text
  line: "var(--color-stone-200)", // hairline borders
  grid: "var(--color-stone-100)", // chart gridlines
  paper: "var(--color-white)", // card / chart surface
  page: "var(--color-stone-100)", // page backdrop
  raised: "var(--color-stone-50)", // subtle raised surface (cards, stage, controls)
  trackOff: "var(--color-stone-300)", // toggle off-state track

  // ── functional layer-accent palette (oklch, kept) ──
  data: "oklch(0.58 0.13 255)", // Data / SELECT
  map: "oklch(0.55 0.14 305)", // Mapping / Aesthetics / VISUALIZE
  geom: "oklch(0.585 0.15 150)", // Geometry / DRAW / Charts + brand/accent
  scale: "oklch(0.62 0.14 42)", // Scale + Reveal slider
  label: "oklch(0.50 0.020 260)", // Labels / LABEL
  stat: "oklch(0.56 0.12 210)", // ggplot2 Statistics
  theme: "oklch(0.58 0.07 95)", // ggplot2 Theme
  smooth: "oklch(0.46 0.10 262)", // smooth/trend toggle

  // tinted plane fills (≈ oklch 0.96 of each accent hue)
  dataBg: "oklch(0.96 0.022 255)",
  mapBg: "oklch(0.96 0.024 305)",
  geomBg: "oklch(0.96 0.024 150)",
  scaleBg: "oklch(0.96 0.026 52)",
  labelBg: "oklch(0.96 0.006 260)",
  statBg: "oklch(0.96 0.020 210)",
  themeBg: "oklch(0.96 0.018 95)",
  smoothBg: "oklch(0.96 0.016 262)",

  // species palette (distinct from the layer hues)
  sp: ["oklch(0.70 0.17 48)", "oklch(0.55 0.18 305)", "oklch(0.62 0.13 200)"],
  spName: ["Adélie", "Chinstrap", "Gentoo"],

  // ── fonts (self-hosted via @fontsource; system fallbacks) ──
  mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  sans: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  disp: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
} as const;

// Per-layer row-hover tints, keyed by layer hue family. Functional (they echo
// each layer's accent), kept as literals.
export const ROW_BG: Record<string, string> = {
  data: "#eef2fb",
  map: "#f4eefb",
  aes: "#f4eefb",
  visualize: "#f4eefb",
  geom: "#ecf6f1",
  draw: "#ecf6f1",
  charts: "#ecf6f1",
  smooth: "#eceef6",
  scale: "#fbf2ec",
  label: "#eef0f4",
  stat: "#e9f3f6",
  theme: "#f5f2e8",
};
