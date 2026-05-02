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
}

export interface Layer {
  id: string;
  draw: string;
  mappings: Partial<Record<Aes, string>>;
  settings?: LayerSettings;
}

export interface Labels {
  title?: string;
  subtitle?: string;
  caption?: string;
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
  "path",
  "ribbon",
  "polygon",
  // `range` was named `errorbar` before ggsql 0.3.0.
  "range",
  "rule",
  // `segment` requires xend/yend mappings (0.3.0+) which we don't expose; drop
  // until those aesthetics are wired up.
  "text",
  "tile",
] as const;

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
  const entries = SETTING_ORDER.filter(
    (k) => s[k] !== undefined && s[k] !== null,
  ).map((k) => [k, s[k]] as [string, unknown]);
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
  labels: Labels,
  columns: ColumnInfo[],
  project?: ProjectSettings,
): string | null {
  if (!table) return null;

  const drawLines: string[] = [];
  for (const l of layers) {
    const hasMappings = AESTHETICS.some((a) => l.mappings[a]);
    if (!hasMappings) continue;
    const draw = resolveDraw(l, columns);
    if (!draw) continue;
    const dataMaps = AESTHETICS.filter((a) => l.mappings[a]).map(
      (a) => `${l.mappings[a]} AS ${a}`,
    );
    drawLines.push(
      `DRAW ${draw} MAPPING ${dataMaps.join(", ")}${layerSettingClause(l.settings)}`,
    );
  }

  if (drawLines.length === 0) return null;

  const facetLines: string[] = [];
  const f = layers[0]?.mappings;
  if (f?.facet_row && f?.facet_col) {
    facetLines.push(`FACET ${f.facet_row} BY ${f.facet_col}`);
  } else if (f?.facet_row) {
    facetLines.push(`FACET ${f.facet_row}`);
  } else if (f?.facet_col) {
    facetLines.push(`FACET ${f.facet_col}`);
  }

  const projectLines = projectClause(project);

  const labelEntries = (["title", "subtitle", "caption"] as const)
    .filter((k) => labels[k])
    .map((k) => `${k} => '${escSql(labels[k]!)}'`);
  const labelLine = labelEntries.length ? `LABEL ${labelEntries.join(", ")}` : "";

  return [
    `VISUALISE FROM ${table}`,
    ...drawLines,
    ...facetLines,
    ...projectLines,
    labelLine,
  ]
    .filter(Boolean)
    .join("\n");
}

export { AUTO } from "./autoChart";
