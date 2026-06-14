import type { ColumnInfo } from "./ggsql";
import { resolveDraw } from "./autoChart";
import ggsqlPkg from "./ggsql-wasm/package.json";

// Branded as a SQL-style line comment so it travels alongside the query
// through render + Copy + GGSQL tab without breaking ggsql parsing.
// Sourced from the bundled wasm's package.json so bumps don't require a
// separate constant update.
const QUERY_HEADER = `-- Built on plotr.org with ggsql v${ggsqlPkg.version}`;

// Aesthetics that apply to every chart type — used for render gating, shared
// mapping detection, and shared mapping emission.
export const UNIVERSAL_AESTHETICS = [
  "x",
  "y",
  "fill",
  "stroke",
  "opacity",
  "size",
] as const;

// Aesthetics that ggsql only accepts on specific geoms. Their dropzones only
// render conditionally (per `resolvedDraw`) and `dataMaps` filters them out
// for any other geom. They persist across geom switches so the value isn't
// lost when the user temporarily moves away, but they should NOT count toward
// "does this layer have any mapping" decisions.
const GEOM_SPECIFIC_AESTHETICS = ["label", "ymin", "ymax"] as const;

// Full set — use when you need to iterate every possible aesthetic (persist,
// dataMaps filter). For "does this matter to chart rendering" gates, prefer
// UNIVERSAL_AESTHETICS.
export const AESTHETICS = [
  ...UNIVERSAL_AESTHETICS,
  ...GEOM_SPECIFIC_AESTHETICS,
] as const;

/** Aesthetics that ggsql requires (beyond universal x/y) for specific geoms.
 *  When the resolved geom matches, plotr highlights any of these that the
 *  layer has NOT mapped yet — so users know which extra dropzones to fill. */
const GEOM_SPECIFIC_REQUIRED: Record<string, readonly Aes[]> = {
  text: ["label"],
  ribbon: ["ymin", "ymax"],
  range: ["ymin", "ymax"],
};

/** The aesthetic-mapping contract: a channel is mapped only when its value is a
 *  non-empty string. `""` and `undefined` both mean "unset" (a dropzone the user
 *  never filled or cleared). Single source of truth for the query emitter, the
 *  persist codec, and the config summary so the rule can't drift. */
export const isMapped = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0;

/** Returns the subset of `GEOM_SPECIFIC_REQUIRED[draw]` that the layer has
 *  not yet mapped. `null`/`undefined`/unknown draws return an empty array.
 *  Used by `ChartPanel` to drive the amber-dashed dropzone + `(missing)`
 *  suffix on the field label. Empty-string mappings count as unmapped — the
 *  same loose contract `Dropzone` uses for the amber border. */
export function computeMissingRequired(
  draw: string | null | undefined,
  mappings: Partial<Record<Aes, string>>,
): Aes[] {
  const required = GEOM_SPECIFIC_REQUIRED[draw ?? ""] ?? [];
  return required.filter((a) => !isMapped(mappings[a]));
}
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
export type Hjust = "left" | "centre" | "right";
export type Vjust = "top" | "middle" | "bottom";
export const HJUST_VALUES: readonly Hjust[] = ["left", "centre", "right"];
export const VJUST_VALUES: readonly Vjust[] = ["top", "middle", "bottom"];

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
  hjust?: Hjust;
  vjust?: Vjust;
  /** Absolute-point nudge applied on top of the (hjust, vjust) anchor.
   *  Each axis is independently optional in the model so the UI can leave a
   *  blank input blank; the emitter zero-fills missing axes only at the
   *  ggsql boundary (`offset => (x ?? 0, y ?? 0)`). Both unset = no offset
   *  setting at all. */
  offset?: { x?: number; y?: number };
  rotation?: number;
  format?: string;
  /** Per-layer SQL WHERE-style predicate emitted as `FILTER <expr>` at the
   *  tail of the DRAW clause. Free-form passthrough — ggsql parses + validates
   *  it. Empty / whitespace-only is dropped. */
  filter?: string;
  slope?: number;
  opacity?: number;
  size?: number;
  noFill?: boolean;
  noStroke?: boolean;
}

/** Chart-level scale settings — properties of the shared X / Y / fill / stroke
 *  scales, not of any single layer. ggsql emits one `SCALE <aes> …` clause per
 *  aesthetic for the whole chart, so these have a single source of truth (one
 *  value shown in every layer's axis / colour panel) rather than per-layer
 *  copies. The fixed fill/stroke colour stays per-layer in `LayerSettings`. */
export interface ScaleSettings {
  /** Axis-tick break formatters → `SCALE x|y RENAMING * => '<template>'`.
   *  Tokens: https://ggsql.org/syntax/clause/scale.html#break-formatting. */
  xFormat?: string;
  yFormat?: string;
  /** Comma-separated break values → `SCALE x|y SETTING breaks => (<values>)`,
   *  folded into the same clause as the formatter. Raw passthrough. */
  xBreaks?: string;
  yBreaks?: string;
  /** Discrete / continuous palette names → `SCALE fill|stroke TO <palette>`. */
  fillPaletteDiscrete?: string;
  fillPaletteContinuous?: string;
  strokePaletteDiscrete?: string;
  strokePaletteContinuous?: string;
  /** Reverse the scale direction → folds `SETTING reverse => true` onto the
   *  matching `SCALE fill|stroke` clause (works on the default palette too,
   *  emitting a bare `SCALE fill SETTING reverse => true`). Per palette kind. */
  fillPaletteDiscreteReverse?: boolean;
  fillPaletteContinuousReverse?: boolean;
  strokePaletteDiscreteReverse?: boolean;
  strokePaletteContinuousReverse?: boolean;
}

export interface Layer {
  id: string;
  draw: string;
  mappings: Partial<Record<Aes, string>>;
  settings?: LayerSettings;
  disabled?: boolean;
  /** Columns emitted as `PARTITION BY <col>, …` at the tail of the DRAW clause
   *  (after FILTER, per ggsql grammar). Groups records beyond the automatic
   *  grouping discrete aesthetics give — e.g. one line per series without
   *  colouring by it. Lives on the layer (not `settings`) so it survives a
   *  chart-type switch like mappings do. */
  partition?: string[];
}

interface Labels {
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
  smooth: "Smooth line",
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
  if (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === "number" &&
    typeof v[1] === "number"
  ) {
    return `(${v[0]}, ${v[1]})`;
  }
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
  "offset",
  "rotation",
  "format",
  "slope",
  "opacity",
  "size",
] as const;

/** Per-grammar, FILTER sits at the tail of the DRAW clause (after MAPPING +
 *  SETTING). Free-form passthrough — we don't parse the SQL ourselves;
 *  ggsql will surface a parse error if it's malformed. Empty + whitespace
 *  emit nothing so an untouched input doesn't pollute the query. */
const layerFilterClause = (filter: string | undefined): string => {
  const trimmed = filter?.trim();
  return trimmed ? ` FILTER ${trimmed}` : "";
};

/** Per-grammar, PARTITION BY sits after FILTER on the DRAW clause. Columns are
 *  comma-joined; empty / absent emits nothing. */
const layerPartitionClause = (partition: string[] | undefined): string =>
  partition && partition.length ? ` PARTITION BY ${partition.join(", ")}` : "";

const layerSettingClause = (s: LayerSettings | undefined): string => {
  if (!s) return "";
  const entries: Array<[string, unknown]> = [];
  for (const k of SETTING_ORDER) {
    // noFill / noStroke push an explicit `null` below; skip the colour entry
    // so we don't emit both a value and a null.
    if (k === "fill" && s.noFill) continue;
    if (k === "stroke" && s.noStroke) continue;
    if (k === "offset") {
      // Stored as `{ x?, y? }`; emit `(x ?? 0, y ?? 0)` whenever either axis
      // is set. Both undefined → drop the setting entirely.
      const o = s.offset;
      if (o && (o.x !== undefined || o.y !== undefined)) {
        entries.push(["offset", [o.x ?? 0, o.y ?? 0]]);
      }
      continue;
    }
    if (s[k] !== undefined && s[k] !== null) entries.push([k, s[k]]);
  }
  if (s.noFill) entries.push(["fill", null]);
  if (s.noStroke) entries.push(["stroke", null]);
  return entries.length ? ` SETTING ${settingPairs(entries)}` : "";
};

/** Emit the optional `SCALE <aes> [SETTING breaks => (…)] [RENAMING * => '…']`
 *  clause for the X / Y axis. ggsql takes one SCALE clause per aesthetic with
 *  optional subclauses in `SETTING … RENAMING …` order, so axis breaks and the
 *  break-formatter fold into a single line. With multiple layers we follow the
 *  same "first non-empty wins" rule used by palettes — the chart has shared
 *  axes regardless of how many layers contribute. */
function axisScaleClauseFor(
  aes: "x" | "y",
  scales: ScaleSettings | undefined,
): string[] {
  const breaks = (aes === "x" ? scales?.xBreaks : scales?.yBreaks)?.trim();
  const format = (aes === "x" ? scales?.xFormat : scales?.yFormat)?.trim();
  if (!breaks && !format) return [];
  let clause = `SCALE ${aes}`;
  if (breaks) clause += ` SETTING breaks => (${breaks})`;
  if (format) clause += ` RENAMING * => '${escSql(format)}'`;
  return [clause];
}

// The LayerSettings (fixed colour) + ScaleSettings (palette / reverse) keys for a
// colour aesthetic. Single source of truth for the fill/stroke key mapping —
// shared with MappingPanel so the UI and the emitter can't drift.
export function colorKeys(aes: "fill" | "stroke") {
  const fill = aes === "fill";
  return {
    fixed: aes,
    no: fill ? "noFill" : "noStroke",
    discrete: fill ? "fillPaletteDiscrete" : "strokePaletteDiscrete",
    continuous: fill ? "fillPaletteContinuous" : "strokePaletteContinuous",
    discreteRev: fill ? "fillPaletteDiscreteReverse" : "strokePaletteDiscreteReverse",
    continuousRev: fill ? "fillPaletteContinuousReverse" : "strokePaletteContinuousReverse",
  } as const;
}

/** Strip the palette + reverse slots for the colour mode that isn't active, so
 *  a palette set under one mode can't linger once the mapped column's kind
 *  flips the panel to the other mode. Without this, e.g. a continuous palette
 *  set while fill mapped a continuous column keeps emitting `SCALE fill TO
 *  <continuous palette>` after fill is re-mapped to a discrete column — and the
 *  panel (which now shows only the discrete picker) offers no control to clear
 *  it. `mode === "fixed"` (no column mapped) prunes nothing: a transient unmap
 *  between two same-kind mappings must not lose the user's palette pick, mirror-
 *  ing the settings-preservation contract in App's resolved-draw effect.
 *
 *  Returns the same object reference when nothing changed so callers can skip a
 *  no-op state write. */
export function pruneColorScales(
  aes: "fill" | "stroke",
  mode: "fixed" | "discrete" | "continuous",
  scales: ScaleSettings,
): ScaleSettings {
  const k = colorKeys(aes);
  const drop: (keyof ScaleSettings)[] =
    mode === "discrete"
      ? [k.continuous, k.continuousRev]
      : mode === "continuous"
        ? [k.discrete, k.discreteRev]
        : [];
  if (!drop.some((key) => scales[key] !== undefined)) return scales;
  const next = { ...scales };
  for (const key of drop) delete next[key];
  return next;
}

function scaleClausesFor(
  aes: "fill" | "stroke",
  scales: ScaleSettings | undefined,
): string[] {
  const k = colorKeys(aes);
  const out: string[] = [];
  for (const [paletteKey, reverseKey] of [
    [k.discrete, k.discreteRev],
    [k.continuous, k.continuousRev],
  ] as const) {
    const palette = scales?.[paletteKey];
    const reverse = scales?.[reverseKey];
    if (!palette && !reverse) continue;
    let clause = `SCALE ${aes}`;
    if (palette) clause += ` TO ${palette}`;
    if (reverse) clause += ` SETTING reverse => true`;
    out.push(clause);
  }
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

/** Gate + resolution shared by `layerDrawClause` and
 *  `missingRequiredWarnings` so skip and warning can't drift. Null means the
 *  layer wouldn't emit a DRAW at all (no own/shared universal aesthetics, or
 *  no resolvable draw) — NOT a warnable state. `missing` lists geom-required
 *  aesthetics the layer hasn't mapped; only the layer's own mappings matter
 *  because `label`/`ymin`/`ymax` are not universal aesthetics, so the shared
 *  panel can never supply them. */
function layerEmissionState(
  layer: Layer,
  columns: ColumnInfo[],
  sharedMappings?: Partial<Record<Aes, string>>,
): { draw: string; missing: Aes[] } | null {
  const sharedHasAesthetic = sharedMappings
    ? UNIVERSAL_AESTHETICS.some((a) => isMapped(sharedMappings[a]))
    : false;
  const hasOwn = UNIVERSAL_AESTHETICS.some((a) => isMapped(layer.mappings[a]));
  if (!hasOwn && !sharedHasAesthetic) return null;
  const draw = resolveDraw(layer, columns, sharedMappings);
  if (!draw) return null;
  return { draw, missing: computeMissingRequired(draw, layer.mappings) };
}

// Human names for the geom-specific aesthetics, matching the dropzone
// labels in MappingFields.tsx ("Label", "Y min", "Y max").
const AES_LABELS: Partial<Record<Aes, string>> = {
  label: "Label",
  ymin: "Y min",
  ymax: "Y max",
};

/** One warning string per non-disabled layer that resolves a draw but is
 *  missing a geom-required aesthetic — exactly the layers `layerDrawClause`
 *  skips for that reason. Shown as amber entries in the Problems pane and in
 *  the chart-pane banner, phrased as the action that fixes it: "You need to
 *  drag a variable to the <dropzone(s)> to see the <chart type>". */
export function missingRequiredWarnings(
  layers: Layer[],
  columns: ColumnInfo[],
  sharedMappings?: Partial<Record<Aes, string>>,
): string[] {
  const out: string[] = [];
  for (const l of layers) {
    if (l.disabled) continue;
    const state = layerEmissionState(l, columns, sharedMappings);
    if (!state || state.missing.length === 0) continue;
    const names = state.missing.map((a) => AES_LABELS[a] ?? a);
    const list =
      names.length > 1
        ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
        : names[0];
    const noun = names.length > 1 ? "variables" : "a variable";
    out.push(
      `You need to drag ${noun} to the ${list} to see the ${chartLabel(state.draw)}`,
    );
  }
  return out;
}

/** The DRAW clause `layer` would emit (plus the resolved plotr draw token),
 *  or null when the layer has no effective aesthetics (own or shared), no
 *  resolvable draw, or a missing geom-required aesthetic (text→label,
 *  ribbon/range→ymin+ymax — those layers are skipped from emission and
 *  reported by `missingRequiredWarnings`). Ignores `disabled` — callers gate
 *  on that; convert-to-custom wants the clause regardless. A `pie` layer
 *  reports draw "pie" while its clause emits `DRAW bar`; the chart-level
 *  polar projection stays with buildQuery. */
export function layerDrawClause(
  layer: Layer,
  columns: ColumnInfo[],
  sharedMappings?: Partial<Record<Aes, string>>,
): { clause: string; draw: string } | null {
  const state = layerEmissionState(layer, columns, sharedMappings);
  if (!state || state.missing.length > 0) return null;
  const draw = state.draw;
  // pie is a plotr token; ggsql draws it as a polar bar.
  const emittedDraw = draw === "pie" ? "bar" : draw;
  const dataMaps = AESTHETICS.filter((a) => {
    if (!isMapped(layer.mappings[a])) return false;
    if (a === "fill" && layer.settings?.noFill) return false;
    if (a === "stroke" && layer.settings?.noStroke) return false;
    // `label` is text-only; suppress for any other geom.
    if (a === "label" && draw !== "text") return false;
    // `ymin` / `ymax` only apply to ribbon + range (the two geoms with
    // pos2min/pos2max requirements per ggsql); suppress everywhere else.
    if ((a === "ymin" || a === "ymax") && draw !== "ribbon" && draw !== "range")
      return false;
    // ribbon + range take pos2min/pos2max for the secondary axis — plain
    // `y` is NOT in their `aesthetics()` list, so ggsql's validate_mapping
    // errors on it. Drop a stale `y` mapping rather than pass through.
    if (a === "y" && (draw === "ribbon" || draw === "range")) return false;
    return true;
  }).map((a) => `${layer.mappings[a]} AS ${a}`);
  const mappingClause = dataMaps.length
    ? ` MAPPING ${dataMaps.join(", ")}`
    : "";
  return {
    draw,
    clause: `DRAW ${emittedDraw}${mappingClause}${layerSettingClause(layer.settings)}${layerFilterClause(layer.settings?.filter)}${layerPartitionClause(layer.partition)}`,
  };
}

export function buildQuery(
  table: string,
  layers: Layer[],
  labels: Labels[],
  columns: ColumnInfo[],
  project?: ProjectSettings,
  sharedMappings?: Partial<Record<Aes, string>>,
  customLayers?: CustomLayer[],
  scales?: ScaleSettings,
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
    const r = layerDrawClause(l, columns, sharedMappings);
    if (!r) return;
    if (r.draw === "pie") anyPie = true;
    drawLines.push(r.clause);
  });
  drawLines.push(...customsAt(layers.length));

  // Only suppress output when there are no DRAW lines AND no custom output.
  // Custom lines alone (e.g. user typing escape-hatch ggsql) shouldn't blank the chart.
  if (drawLines.length === 0) return null;

  const scaleLines: string[] = [
    ...scaleClausesFor("fill", scales),
    ...scaleClausesFor("stroke", scales),
    ...axisScaleClauseFor("x", scales),
    ...axisScaleClauseFor("y", scales),
  ];

  const sharedPairs = sharedMappings
    ? UNIVERSAL_AESTHETICS.filter((a) => isMapped(sharedMappings[a])).map(
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
    QUERY_HEADER,
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
