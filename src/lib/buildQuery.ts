import type { ColumnInfo } from "./ggsql";
import { resolveDraw } from "./autoChart";

export const AESTHETICS = ["x", "y", "fill", "stroke", "opacity", "size"] as const;
export const FACETS = ["facet_col", "facet_row"] as const;

export type Aes = (typeof AESTHETICS)[number] | (typeof FACETS)[number];

export type Position = "identity" | "stack" | "dodge" | "jitter";

export interface LayerSettings {
  width?: number;
  position?: Position;
  fill?: string;
  stroke?: string;
  opacity?: number;
  size?: number;
  noFill?: boolean;
  noStroke?: boolean;
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

export interface ProjectSettings {
  ratio?: number;
  clip?: boolean;
}

export const DRAW_TYPES = [
  "bar",
  "point",
  "line",
  "area",
  "histogram",
  "boxplot",
  "smooth",
  "density",
  "violin",
  "ribbon",
  // `range` was named `errorbar` before ggsql 0.3.0.
  "range",
  "rule",
  // `segment` requires xend/yend mappings (0.3.0+) which we don't expose; drop
  // until those aesthetics are wired up.
  "text",
  "tile",
] as const;

export const CHART_LABELS: Record<string, string> = {
  bar: "Bar chart",
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

const SETTING_ORDER = ["width", "position", "fill", "stroke", "opacity", "size"] as const;

const layerSettingClause = (s: LayerSettings | undefined): string => {
  if (!s) return "";
  const entries: Array<[string, unknown]> = [];
  for (const k of SETTING_ORDER) {
    if (k === "fill" && s.noFill) continue;
    if (k === "stroke" && s.noStroke) continue;
    if (s[k] !== undefined && s[k] !== null) entries.push([k, s[k]]);
  }
  if (s.noFill) entries.push(["fill", null]);
  if (s.noStroke) entries.push(["stroke", null]);
  return entries.length ? ` SETTING ${settingPairs(entries)}` : "";
};

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

  const drawLines: string[] = [];
  for (const l of layers) {
    if (l.disabled) continue;
    const hasOwn = AESTHETICS.some((a) => l.mappings[a]);
    if (!hasOwn && !sharedHasAesthetic) continue;
    const draw = resolveDraw(l, columns, sharedMappings);
    if (!draw) continue;
    const dataMaps = AESTHETICS.filter((a) => {
      if (!l.mappings[a]) return false;
      if (a === "fill" && l.settings?.noFill) return false;
      if (a === "stroke" && l.settings?.noStroke) return false;
      return true;
    }).map((a) => `${l.mappings[a]} AS ${a}`);
    const mappingClause = dataMaps.length
      ? ` MAPPING ${dataMaps.join(", ")}`
      : "";
    drawLines.push(
      `DRAW ${draw}${mappingClause}${layerSettingClause(l.settings)}`,
    );
  }

  if (drawLines.length === 0) return null;

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

  const projectLines = projectClause(project);

  const labelEntries = (["title", "subtitle", "caption", "x", "y"] as const)
    .filter((k) => mergedLabels[k])
    .map((k) => `${k} => '${escSql(mergedLabels[k]!)}'`);
  const labelLine = labelEntries.length ? `LABEL ${labelEntries.join(", ")}` : "";

  return [
    `FROM ${table}`,
    visualiseLine,
    ...drawLines,
    ...facetLines,
    ...projectLines,
    labelLine,
  ]
    .filter(Boolean)
    .join("\n");
}

export { AUTO } from "./autoChart";
