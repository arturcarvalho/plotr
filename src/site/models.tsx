// Per-tool layer models + the layer-content renderer for the Layer-Reveal
// widget (ported from the handoff's layers-demo2.jsx data + site.jsx TOOLS_INFO).
import type { ReactNode } from "react";
import { CK } from "./tokens";
import { ChannelMap, DataGrid, Legend, ScatterPlot } from "./charts";
import type { ToolId } from "../lib/route";

// ── widget geometry (shared by the widget and the plane-content renderer) ──
const PLOTW = 312;
const PLOTH = 256;
const GUT = 120;
export const PW = PLOTW + GUT;
export const PH = PLOTH;
const PAD = { t: 32, r: 18, b: 54, l: 66 };
const titleFor = (isBar: boolean) =>
  isBar ? "Mean body mass by species" : "Body mass vs. flipper length";

export type ModelKey = "gog" | "ggplot" | "ggsql" | "plotr";
type RenderType =
  | "table"
  | "sql"
  | "mapping"
  | "stat"
  | "marks"
  | "smooth"
  | "frame"
  | "frameLegend"
  | "theme"
  | "labels"
  | "charts";

interface LayerDef {
  key: string;
  n: number;
  color: string;
  fill?: string;
  baseShadow?: boolean;
  panel?: string;
  transform?: boolean;
  frameOn?: boolean;
  isGeom?: boolean;
  name: string;
  tag: string;
  render: RenderType;
  line: (isBar: boolean) => string;
}

interface ModelDef {
  label: string;
  short: string;
  section: string;
  gap: number;
  stageH: number;
  stageHN: number;
  desc: string;
  foot: () => ReactNode;
  geomKey: string;
  smoothLayer?: Omit<LayerDef, "n">;
  layers: LayerDef[];
}

// pick a string by chart variant (scatter / bar)
const T = (b: boolean, p: [string, string]) => (b ? p[1] : p[0]);

export const MODELS: Record<ModelKey, ModelDef> = {
  gog: {
    label: "Grammar of Graphics",
    short: "Grammar of Graphics",
    section: "Some of the layers",
    gap: 98,
    stageH: 540,
    stageHN: 480,
    desc: "Leland Wilkinson's original theory — the core building blocks shared by every statistical chart.",
    foot: () => (
      <>
        Switch the chart type on the <b style={{ color: CK.geom }}>Geometry</b> layer and only that layer
        changes. Try the other models to see how each tool slices the same chart differently.
      </>
    ),
    geomKey: "geom",
    layers: [
      { key: "data", n: 1, color: CK.data, fill: CK.dataBg, transform: true, name: "Data", tag: "the table", render: "table", line: () => "A tidy table — one row per penguin, one column per variable." },
      { key: "map", n: 2, color: CK.map, fill: CK.mapBg, transform: true, name: "Mapping", tag: "columns → channels", render: "mapping", line: (b) => T(b, ["flipper → x, mass → y, species → color.", "species → x, mean mass → y, species → color."]) },
      { key: "scale", n: 4, color: CK.scale, fill: "#fff", baseShadow: true, name: "Scale", tag: "data → pixels", render: "frame", line: () => "Values become positions; axes, ticks and a grid place every mark." },
      { key: "geom", n: 3, color: CK.geom, frameOn: true, isGeom: true, name: "Geometry", tag: "the chart", render: "marks", line: (b) => T(b, ["One point per row.", "One bar per group."]) },
      { key: "label", n: 5, color: CK.label, frameOn: true, name: "Labels", tag: "the words", render: "labels", line: () => "Axis titles and a legend — the words that say what it all means." },
    ],
  },

  ggplot: {
    label: "ggplot2",
    short: "ggplot2",
    section: "ggplot2's grammar",
    gap: 84,
    stageH: 564,
    stageHN: 504,
    desc: "The R implementation of the grammar — the most granular, adding a Statistics step and a Theme.",
    foot: () => (
      <>
        Each <code style={{ fontFamily: CK.mono, fontSize: 12 }}>geom_*()</code> sits on the Geometry layer;{" "}
        <code style={{ fontFamily: CK.mono, fontSize: 12 }}>stat_*()</code> on Statistics;{" "}
        <code style={{ fontFamily: CK.mono, fontSize: 12 }}>theme_*()</code> on Theme. ggplot2 also has
        Coordinates &amp; Facets — at their defaults here (Cartesian, one panel).
      </>
    ),
    geomKey: "geom",
    layers: [
      { key: "data", n: 1, color: CK.data, fill: CK.dataBg, transform: true, name: "Data", tag: "data = penguins", render: "table", line: () => "The dataset passed to ggplot()." },
      { key: "aes", n: 2, color: CK.map, fill: CK.mapBg, transform: true, name: "Aesthetics", tag: "aes(x, y, colour)", render: "mapping", line: (b) => T(b, ["aes(x = species, y = mass, colour = species).", "aes(x = flipper, y = mass, colour = species)."]) },
      { key: "stat", n: 3, color: CK.stat, fill: CK.statBg, transform: true, name: "Statistics", tag: "stat", render: "stat", line: (b) => T(b, ["Identity — every row is drawn as-is.", "Summarise — rows collapse to a mean per group."]) },
      { key: "scale", n: 5, color: CK.scale, fill: "#fff", baseShadow: true, panel: "#ebe9e6", name: "Scales", tag: "scale_* + guides", render: "frameLegend", line: () => "Map values to pixels & colours; draw axes, ticks and the legend." },
      { key: "geom", n: 4, color: CK.geom, frameOn: true, isGeom: true, name: "Geometry", tag: "geom_point()", render: "marks", line: (b) => T(b, ["geom_point() — one point per row.", "geom_bar() — one bar per group."]) },
      { key: "theme", n: 6, color: CK.theme, frameOn: true, name: "Theme", tag: "theme_* + labs()", render: "theme", line: () => "Non-data ink: title, fonts, the grey panel and gridline styling." },
    ],
  },

  ggsql: {
    label: "ggsql",
    short: "ggsql",
    section: "ggsql's clauses",
    gap: 98,
    stageH: 540,
    stageHN: 480,
    desc: "Posit's SQL extension — the same grammar written as composable query clauses.",
    foot: () => (
      <>
        Each layer is a clause you read top-to-bottom, just like the query:{" "}
        <code style={{ fontFamily: CK.mono, fontSize: 12 }}>VISUALIZE … DRAW … SCALE … LABEL</code>. The same
        composable parts as ggplot2, expressed in SQL.
      </>
    ),
    geomKey: "draw",
    smoothLayer: { key: "smooth", color: CK.geom, frameOn: true, name: "DRAW smooth", tag: "trend line", render: "smooth", line: () => "A second DRAW clause overlays a fitted regression line and its confidence band." },
    layers: [
      { key: "data", n: 1, color: CK.data, fill: CK.dataBg, transform: true, name: "SELECT", tag: "the SQL query", render: "sql", line: () => "A normal SQL query produces the table to plot." },
      { key: "visualize", n: 2, color: CK.map, fill: CK.mapBg, transform: true, name: "VISUALIZE", tag: "flipper AS x …", render: "mapping", line: (b) => T(b, ["Alias columns to aesthetics: flipper AS x, mass AS y.", "Alias columns to aesthetics: species AS x, mass AS y."]) },
      { key: "scale", n: 4, color: CK.scale, fill: "#fff", baseShadow: true, name: "SCALE", tag: "SCALE x, color", render: "frame", line: () => "Control how values map to pixels and colours; draw axes." },
      { key: "draw", n: 3, color: CK.geom, frameOn: true, isGeom: true, name: "DRAW Points", tag: "the marks", render: "marks", line: () => "DRAW point — one mark per row, a scatter layer." },
      { key: "label", n: 5, color: CK.label, frameOn: true, name: "LABEL", tag: "LABEL title =>", render: "labels", line: () => "Add the title, axis names and legend with LABEL." },
    ],
  },

  plotr: {
    label: "plotr",
    short: "plotr",
    section: "plotr's three layers",
    gap: 132,
    stageH: 490,
    stageHN: 440,
    desc: "A pared-back model — Mapping, Geometry and Scale merged into one Charts layer.",
    foot: () => (
      <>
        plotr trades fine control for fewer moving parts: one <b style={{ color: CK.geom }}>Charts</b> layer
        instead of three. Same data, same picture — just fewer dials.
      </>
    ),
    geomKey: "charts",
    smoothLayer: { key: "smooth", color: CK.geom, frameOn: true, name: "Chart Layer", tag: "smooth line", render: "smooth", line: () => "A trend line. Just another layer on top of the Scatter Plot." },
    layers: [
      { key: "data", n: 1, color: CK.data, fill: CK.dataBg, transform: true, name: "Data", tag: "the table", render: "table", line: () => "A tidy table — one row per penguin, one column per variable." },
      { key: "charts", n: 2, color: CK.geom, fill: "#fff", baseShadow: true, isGeom: true, name: "Chart Layer", tag: "scatter plot", render: "charts", line: () => "We map the data points in the table to circles in the chart." },
      { key: "label", n: 3, color: CK.label, frameOn: true, name: "Labels", tag: "the words", render: "labels", line: () => "Where we define the title, subtitle, and axis titles." },
    ],
  },
};

// A model with a `smoothLayer` can carry an extra trend layer. Insert it right
// after the geometry-owning layer and renumber the layers behind it.
export function withSmoothLayers(modelKey: ModelKey, on: boolean): LayerDef[] {
  const M = MODELS[modelKey];
  if (!on || !M.smoothLayer) return M.layers;
  const geomN = M.layers.find((l) => l.isGeom)?.n ?? 0;
  const out: LayerDef[] = [];
  for (const l of M.layers) {
    out.push({ ...l, n: l.n > geomN ? l.n + 1 : l.n });
    if (l.isGeom) out.push({ ...M.smoothLayer, n: geomN + 1, isGeom: false });
  }
  return out;
}

// ── plane-content pieces ────────────────────────────────────────────────────
function SqlCard() {
  const kw = { color: CK.data, fontWeight: 700 } as const;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 22px" }}>
      <pre style={{ margin: 0, fontFamily: CK.mono, fontSize: 12.5, lineHeight: 1.7, color: CK.ink, whiteSpace: "pre-wrap" }}>
        <span style={kw}>SELECT</span> flipper_mm,{"\n"}       body_mass_g, species{"\n"}
        <span style={kw}>FROM</span> penguins
      </pre>
    </div>
  );
}

function StatGlyph({ isBar }: { isBar: boolean }) {
  const dots = [0, 1, 2, 3, 4, 5, 6];
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <svg width="200" height="74" style={{ overflow: "visible" }}>
        {dots.map((_, i) => <circle key={i} cx={18} cy={8 + i * 9.5} r="3.4" fill={CK.stat} fillOpacity="0.7" />)}
        <line x1="40" y1="37" x2="92" y2="37" stroke={CK.faint} strokeWidth="1.5" />
        <path d="M92 32 l8 5 l-8 5 z" fill={CK.faint} />
        {isBar ? (
          <g>{[0, 1, 2].map((i) => <rect key={i} x={120 + i * 26} y={20 + i * 6} width="16" height={34 - i * 6} fill={CK.stat} fillOpacity="0.7" rx="1.5" />)}</g>
        ) : (
          <g>{dots.map((_, i) => <circle key={i} cx={150} cy={8 + i * 9.5} r="3.4" fill={CK.stat} fillOpacity="0.7" />)}</g>
        )}
      </svg>
      <div style={{ fontFamily: CK.mono, fontSize: 11.5, color: CK.stat, fontWeight: 600 }}>
        {isBar ? "stat_summary → 3 means" : "stat_identity → 20 points"}
      </div>
    </div>
  );
}

interface RenderCtx {
  isBar: boolean;
  Plot: typeof ScatterPlot;
  panel?: string;
}

// Render one layer's contribution, keyed by render type.
export function renderContent(type: RenderType, ctx: RenderCtx): ReactNode {
  const { isBar, Plot, panel } = ctx;
  switch (type) {
    case "table":
      return (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
          <DataGrid rows={7} compact w={270} />
        </div>
      );
    case "sql":
      return <SqlCard />;
    case "mapping":
      return (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChannelMap rows={isBar ? [{ col: "species", ch: "x position" }, { col: "body_mass_g", ch: "y (mean)" }, { col: "species", ch: "color" }] : undefined} />
        </div>
      );
    case "stat":
      return <StatGlyph isBar={isBar} />;
    case "marks":
      return (
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <Plot w={PLOTW} h={PLOTH} pad={PAD} grid={false} ticks={false} axisTitles={false} frame={false} />
        </div>
      );
    case "smooth":
      return (
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <ScatterPlot w={PLOTW} h={PLOTH} pad={PAD} grid={false} ticks={false} axisTitles={false} frame={false} points={false} smooth />
        </div>
      );
    case "frame":
      return (
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          {panel && <div style={{ position: "absolute", left: PAD.l, top: PAD.t, width: PLOTW - PAD.l - PAD.r, height: PLOTH - PAD.t - PAD.b, background: panel, borderRadius: 3 }} />}
          <Plot w={PLOTW} h={PLOTH} pad={PAD} points={false} bars={false} axisTitles={false} />
        </div>
      );
    case "frameLegend":
      return (
        <>
          <div style={{ position: "absolute", left: 0, top: 0 }}>
            {panel && <div style={{ position: "absolute", left: PAD.l, top: PAD.t, width: PLOTW - PAD.l - PAD.r, height: PLOTH - PAD.t - PAD.b, background: panel, borderRadius: 3 }} />}
            <Plot w={PLOTW} h={PLOTH} pad={PAD} points={false} bars={false} axisTitles />
          </div>
          <div style={{ position: "absolute", left: PLOTW + 6, top: 0, bottom: 0, width: GUT - 14, display: "flex", alignItems: "center" }}>
            <Legend dir="column" />
          </div>
        </>
      );
    case "theme":
      return <div style={{ position: "absolute", left: PAD.l, top: 6, fontFamily: CK.disp, fontSize: 13.5, fontWeight: 600, color: CK.ink, letterSpacing: -0.2 }}>{titleFor(isBar)}</div>;
    case "labels":
      return (
        <>
          <div style={{ position: "absolute", left: 0, top: 0 }}>
            <Plot w={PLOTW} h={PLOTH} pad={PAD} grid={false} ticks={false} points={false} bars={false} frame={false} axisTitles />
          </div>
          <div style={{ position: "absolute", left: PAD.l, top: 6, fontFamily: CK.disp, fontSize: 13.5, fontWeight: 600, color: CK.ink, letterSpacing: -0.2 }}>{titleFor(isBar)}</div>
          <div style={{ position: "absolute", left: PLOTW + 6, top: 0, bottom: 0, width: GUT - 14, display: "flex", alignItems: "center" }}>
            <Legend dir="column" />
          </div>
        </>
      );
    case "charts":
      return (
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <Plot w={PLOTW} h={PLOTH} pad={PAD} axisTitles={false} />
        </div>
      );
    default:
      return null;
  }
}

// ── Tool page content (id → copy + which layer model it locks to) ────────────
interface ToolInfo {
  model: ModelKey;
  name: string;
  tagline: string;
  blurb: string;
  intro: string;
  strengths: string[];
}

export const TOOLS_INFO: Record<ToolId, ToolInfo> = {
  ggplot2: {
    model: "ggplot",
    name: "ggplot2",
    tagline: "The grammar, realised in R.",
    blurb: "The R library that made the grammar famous.",
    intro:
      "ggplot2 is the R implementation that made the Grammar of Graphics famous. You compose a plot by adding layers: data, geoms, stats, scales, a coordinate system and a theme — building rich graphics piece by piece.",
    strengths: [
      "The most complete, battle-tested grammar implementation.",
      "A dedicated Statistics layer. Summarise data as you plot it.",
      "A vast ecosystem of extensions and a Theme layer for fine control.",
    ]
  },
  ggsql: {
    model: "ggsql",
    name: "ggsql",
    tagline: "Query. Visualize. Understand.",
    blurb: "The Grammar of Graphics, written as SQL clauses.",
    intro:
      "ggsql brings the elegance of the Grammar of Graphics to SQL. Write a familiar query, add visualization clauses, and watch your data become a composable chart — no context switching, no separate tools.",
    strengths: [
      "Familiar SQL syntax — your existing knowledge transfers directly.",
      "Composable layers, scales and coordinates — one model for every plot.",
      "Built for humans and AI to read, write and verify.",
    ]
  },
  plotr: {
    model: "plotr",
    name: "plotr",
    tagline: "Variables go in, ggsql comes out.",
    blurb: "A visual builder that writes ggsql for you.",
    intro:
      "Plotr is a visual chart builder. Choose your variables and a chart type, and plotr writes the ggsql for you which in turn makes a chart. It's the fastest way to feel how the layers fit together without memorising any syntax.",
    strengths: [
      "No syntax to learn — build a chart by picking variables.",
      "Generates real, reproducible ggsql you can keep.",
      "The gentlest on-ramp to the whole grammar family.",
    ]
  },
};
