import type { ColumnInfo } from "./ggsql";
import { resolveDraw } from "./autoChart";

export const AESTHETICS = [
  "x",
  "y",
  "fill",
  "stroke",
  "opacity",
  "size",
  "label",
  "ymin",
  "ymax",
] as const;

/** Aesthetics that ggsql requires (beyond universal x/y) for specific geoms.
 *  When the resolved geom matches, plotr highlights any of these that the
 *  layer has NOT mapped yet — so users know which extra dropzones to fill. */
export const GEOM_SPECIFIC_REQUIRED: Record<string, readonly Aes[]> = {
  text: ["label"],
  ribbon: ["ymin", "ymax"],
  range: ["ymin", "ymax"],
};
export const FACETS = ["facet_col", "facet_row"] as const;

export type Aes = (typeof AESTHETICS)[number] | (typeof FACETS)[number];

export type Position = "identity" | "stack" | "dodge" | "jitter";
export type Orientation = "aligned" | "transposed";
export type Kernel =
  | "gaussian"
  | "epanechnikov"
  | "triangular"
  | "rectangular"
  | "uniform"
  | "biweight"
  | "quartic"
  | "cosine";
export type ViolinSide = "both" | "left" | "top" | "right" | "bottom";
export type HistogramClosed = "right" | "left";
export type SmoothMethod = "nw" | "nadaraya-watson" | "ols" | "tls";

export interface LayerSettings {
  width?: number;
  position?: Position;
  fill?: string;
  stroke?: string;
  linewidth?: number;
  orientation?: Orientation;
  bandwidth?: number;
  adjust?: number;
  kernel?: Kernel;
  method?: SmoothMethod;
  side?: ViolinSide;
  tails?: number;
  bins?: number;
  binwidth?: number;
  closed?: HistogramClosed;
  outliers?: boolean;
  coef?: number;
  italic?: boolean;
  hjust?: number;
  vjust?: number;
  rotation?: number;
  format?: string;
  slope?: number;
  opacity?: number;
  size?: number;
  noFill?: boolean;
  noStroke?: boolean;
  fillPaletteDiscrete?: string;
  fillPaletteContinuous?: string;
  strokePaletteDiscrete?: string;
  strokePaletteContinuous?: string;
}

export interface Layer {
  id: string;
  draw: string;
  mappings: Partial<Record<Aes, string>>;
  settings?: LayerSettings;
  disabled?: boolean;
}

export interface Labels {
  title?: string;
  subtitle?: string;
  caption?: string;
  x?: string;
  y?: string;
}

export interface LabelsLayer extends Labels {
  id: string;
  position: number;
  disabled?: boolean;
}

/** Free-form ggsql lines slotted between chart-layer DRAW lines. `position`
 *  shares the labels-layer convention: position N inserts between DRAW(N-1)
 *  and DRAW(N); position >= layers.length emits at the end of the DRAW block
 *  (still before SCALE / FACET / PROJECT / LABEL). */
export interface CustomLayer {
  id: string;
  ggsql: string;
  position: number;
  disabled?: boolean;
}

export interface ProjectSettings {
  ratio?: number;
  clip?: boolean;
}

// Order is intentional and exercised by the "DRAW_TYPES order is locked" test
// in buildQuery.test.ts — update both together when adding a new draw, and
// confirm the order with the user before changing.
//
// `pie` is a plotr-only token; emitted as `DRAW bar` + `PROJECT TO polar`
// because ggsql 0.3.x has no pie/arc geom.
// `range` was named `errorbar` before ggsql 0.3.0.
// `segment` requires xend/yend mappings (0.3.0+) which we don't expose; drop
// until those aesthetics are wired up.
export const DRAW_TYPES = [
  "point",
  "bar",
  "line",
  "tile",
  "violin",
  "pie",
  "histogram",
  "boxplot",
  "density",
  "area",
  "smooth",
  "ribbon",
  "range",
  "text",
  "rule",
] as const;

export const CHART_LABELS: Record<string, string> = {
  bar: "Bar chart",
  pie: "Pie chart",
  point: "Scatter plot",
  line: "Line chart",
  area: "Area chart",
  histogram: "Histogram",
  boxplot: "Box plot",
  smooth: "Trend line",
  density: "Density plot",
  violin: "Violin plot",
  ribbon: "Ribbon",
  range: "Error bar",
  rule: "Reference line",
  text: "Text labels",
  tile: "Heatmap",
};

export const chartLabel = (draw: string): string =>
  CHART_LABELS[draw] ?? draw;

export const shortChartLabel = (draw: string): string =>
  chartLabel(draw).replace(/ (chart|plot)$/, "");

const escSql = (s: string) => s.replace(/'/g, "''");

const formatSettingValue = (v: unknown): string => {
  if (typeof v === "string") return `'${escSql(v)}'`;
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
};

const settingPairs = (entries: Array<[string, unknown]>): string =>
  entries.map(([k, v]) => `${k} => ${formatSettingValue(v)}`).join(", ");

const SETTING_ORDER = [
  "width",
  "position",
  "fill",
  "stroke",
  "linewidth",
  "orientation",
  "bandwidth",
  "adjust",
  "kernel",
  "method",
  "side",
  "tails",
  "bins",
  "binwidth",
  "closed",
  "outliers",
  "coef",
  "italic",
  "hjust",
  "vjust",
  "rotation",
  "format",
  "slope",
  "opacity",
  "size",
] as const;

const layerSettingClause = (s: LayerSettings | undefined): string => {
  if (!s) return "";
  const entries: Array<[string, unknown]> = [];
  for (const k of SETTING_ORDER) {
    // noFill / noStroke push an explicit `null` below; skip the colour entry.
    if (k === "fill" && s.noFill) continue;
    if (k === "stroke" && s.noStroke) continue;
    if (s[k] !== undefined && s[k] !== null) entries.push([k, s[k]]);
  }
  if (s.noFill) entries.push(["fill", null]);
  if (s.noStroke) entries.push(["stroke", null]);
  return entries.length ? ` SETTING ${settingPairs(entries)}` : "";
};

function scaleClausesFor(aes: "fill" | "stroke", layers: Layer[]): string[] {
  const discreteKey =
    aes === "fill" ? "fillPaletteDiscrete" : "strokePaletteDiscrete";
  const continuousKey =
    aes === "fill" ? "fillPaletteContinuous" : "strokePaletteContinuous";
  let firstDiscrete: string | undefined;
  let firstContinuous: string | undefined;
  for (const l of layers) {
    if (l.disabled || !l.settings) continue;
    if (!firstDiscrete) firstDiscrete = l.settings[discreteKey];
    if (!firstContinuous) firstContinuous = l.settings[continuousKey];
  }
  const out: string[] = [];
  if (firstDiscrete) out.push(`SCALE ${aes} TO ${firstDiscrete}`);
  if (firstContinuous) out.push(`SCALE ${aes} TO ${firstContinuous}`);
  return out;
}

const projectClause = (p: ProjectSettings | undefined): string[] => {
  if (!p) return [];
  const entries: Array<[string, unknown]> = [];
  if (p.ratio !== undefined && p.ratio !== null) entries.push(["ratio", p.ratio]);
  // clip default is true; only emit if explicitly false
  if (p.clip === false) entries.push(["clip", false]);
  if (!entries.length) return [];
  return ["PROJECT TO cartesian", `  SETTING ${settingPairs(entries)}`];
};

export function buildQuery(
  table: string,
  layers: Layer[],
  labels: Labels[],
  columns: ColumnInfo[],
  project?: ProjectSettings,
  sharedMappings?: Partial<Record<Aes, string>>,
  customLayers?: CustomLayer[],
): string | null {
  const mergedLabels: Labels = {};
  for (const l of labels) {
    if ((l as LabelsLayer).disabled) continue;
    if (l.title) mergedLabels.title = l.title;
    if (l.subtitle) mergedLabels.subtitle = l.subtitle;
    if (l.caption) mergedLabels.caption = l.caption;
    if (l.x) mergedLabels.x = l.x;
    if (l.y) mergedLabels.y = l.y;
  }
  if (!table) return null;

  const sharedHasAesthetic = sharedMappings
    ? AESTHETICS.some((a) => sharedMappings[a])
    : false;

  // Custom layers slot in by `position`: same convention as `LabelsLayer`.
  // Position N inserts the custom block(s) just before the i-th DRAW line;
  // position >= layers.length emits at the trailing slot.
  const customsAt = (i: number): string[] => {
    if (!customLayers) return [];
    return customLayers
      .filter((c) => {
        if (c.disabled) return false;
        if (c.ggsql.trim().length === 0) return false;
        return i >= layers.length ? c.position >= i : c.position === i;
      })
      .map((c) => c.ggsql);
  };

  const drawLines: string[] = [];
  let anyPie = false;
  layers.forEach((l, i) => {
    drawLines.push(...customsAt(i));
    if (l.disabled) return;
    const hasOwn = AESTHETICS.some((a) => l.mappings[a]);
    if (!hasOwn && !sharedHasAesthetic) return;
    const draw = resolveDraw(l, columns, sharedMappings);
    if (!draw) return;
    if (draw === "pie") anyPie = true;
    // pie is a plotr token; ggsql draws it as a polar bar.
    const emittedDraw = draw === "pie" ? "bar" : draw;
    const dataMaps = AESTHETICS.filter((a) => {
      if (!l.mappings[a]) return false;
      if (a === "fill" && l.settings?.noFill) return false;
      if (a === "stroke" && l.settings?.noStroke) return false;
      // `label` is text-only; suppress for any other geom.
      if (a === "label" && draw !== "text") return false;
      // `ymin` / `ymax` only apply to ribbon + range (the two geoms with
       // pos2min/pos2max requirements per ggsql); suppress everywhere else.
      if (
        (a === "ymin" || a === "ymax") &&
        draw !== "ribbon" &&
        draw !== "range"
      )
        return false;
      // ribbon + range take pos2min/pos2max for the secondary axis — plain
      // `y` is NOT in their `aesthetics()` list, so ggsql's validate_mapping
      // errors on it. Drop a stale `y` mapping rather than pass through.
      if (a === "y" && (draw === "ribbon" || draw === "range")) return false;
      return true;
    }).map((a) => `${l.mappings[a]} AS ${a}`);
    const mappingClause = dataMaps.length
      ? ` MAPPING ${dataMaps.join(", ")}`
      : "";
    drawLines.push(
      `DRAW ${emittedDraw}${mappingClause}${layerSettingClause(l.settings)}`,
    );
  });
  drawLines.push(...customsAt(layers.length));

  // Only suppress output when there are no DRAW lines AND no custom output.
  // Custom lines alone (e.g. user typing escape-hatch ggsql) shouldn't blank the chart.
  if (drawLines.length === 0) return null;

  const scaleLines: string[] = [
    ...scaleClausesFor("fill", layers),
    ...scaleClausesFor("stroke", layers),
  ];

  const sharedPairs = sharedMappings
    ? AESTHETICS.filter((a) => sharedMappings[a]).map(
        (a) => `${sharedMappings[a]} AS ${a}`,
      )
    : [];
  const visualiseLine = sharedPairs.length
    ? `VISUALISE ${sharedPairs.join(", ")}`
    : `VISUALISE`;

  const facetLines: string[] = [];
  const fc = sharedMappings?.facet_col ?? layers[0]?.mappings.facet_col;
  const fr = sharedMappings?.facet_row ?? layers[0]?.mappings.facet_row;
  if (fr && fc) {
    facetLines.push(`FACET ${fr} BY ${fc}`);
  } else if (fr) {
    facetLines.push(`FACET ${fr}`);
  } else if (fc) {
    facetLines.push(`FACET ${fc}`);
  }

  // pie forces polar projection and overrides any cartesian project settings.
  const projectLines = anyPie ? ["PROJECT TO polar"] : projectClause(project);

  const labelEntries = (["title", "subtitle", "caption", "x", "y"] as const)
    .filter((k) => mergedLabels[k])
    .map((k) => `${k} => '${escSql(mergedLabels[k]!)}'`);
  const labelLine = labelEntries.length ? `LABEL ${labelEntries.join(", ")}` : "";

  return [
    `FROM ${table}`,
    visualiseLine,
    ...drawLines,
    ...scaleLines,
    ...facetLines,
    ...projectLines,
    labelLine,
  ]
    .filter(Boolean)
    .join("\n");
}

export { AUTO } from "./autoChart";
