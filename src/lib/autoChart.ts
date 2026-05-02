import type { ColumnInfo } from "./ggsql";
import type { Layer } from "./buildQuery";

export const AUTO = "auto";

export type AxisKind = "continuous" | "discrete" | "time" | "empty";

type Role = "default" | "compatible";

interface Rule {
  x: AxisKind;
  y: AxisKind;
  draw: string;
  role: Role;
}

const RULES: Rule[] = [
  { x: "continuous", y: "empty", draw: "histogram", role: "default" },
  { x: "continuous", y: "empty", draw: "boxplot", role: "compatible" },
  { x: "continuous", y: "empty", draw: "violin", role: "compatible" },
  { x: "continuous", y: "empty", draw: "density", role: "compatible" },
  { x: "discrete", y: "empty", draw: "bar", role: "default" },
  { x: "time", y: "empty", draw: "histogram", role: "default" },
  { x: "time", y: "empty", draw: "bar", role: "compatible" },
  { x: "empty", y: "discrete", draw: "bar", role: "default" },
  { x: "empty", y: "continuous", draw: "line", role: "default" },
  { x: "empty", y: "continuous", draw: "path", role: "compatible" },
  { x: "empty", y: "continuous", draw: "area", role: "compatible" },
  { x: "continuous", y: "discrete", draw: "bar", role: "default" },
  { x: "continuous", y: "discrete", draw: "boxplot", role: "compatible" },
  { x: "continuous", y: "discrete", draw: "point", role: "compatible" },
  { x: "continuous", y: "discrete", draw: "violin", role: "compatible" },
  { x: "discrete", y: "continuous", draw: "bar", role: "default" },
  { x: "discrete", y: "continuous", draw: "boxplot", role: "compatible" },
  { x: "discrete", y: "continuous", draw: "point", role: "compatible" },
  { x: "discrete", y: "continuous", draw: "violin", role: "compatible" },
  { x: "discrete", y: "continuous", draw: "text", role: "compatible" },
  { x: "continuous", y: "continuous", draw: "point", role: "default" },
  { x: "continuous", y: "continuous", draw: "line", role: "compatible" },
  { x: "continuous", y: "continuous", draw: "path", role: "compatible" },
  { x: "continuous", y: "continuous", draw: "area", role: "compatible" },
  { x: "continuous", y: "continuous", draw: "smooth", role: "compatible" },
  { x: "continuous", y: "continuous", draw: "text", role: "compatible" },
  { x: "continuous", y: "continuous", draw: "tile", role: "compatible" },
  { x: "discrete", y: "discrete", draw: "tile", role: "default" },
  { x: "discrete", y: "discrete", draw: "text", role: "compatible" },
  { x: "time", y: "continuous", draw: "line", role: "default" },
  { x: "time", y: "continuous", draw: "point", role: "compatible" },
  { x: "time", y: "continuous", draw: "area", role: "compatible" },
  { x: "time", y: "continuous", draw: "bar", role: "compatible" },
  { x: "time", y: "continuous", draw: "smooth", role: "compatible" },
  { x: "discrete", y: "time", draw: "tile", role: "default" },
  { x: "time", y: "discrete", draw: "tile", role: "default" },
];

export function columnAxisKind(
  columns: ColumnInfo[],
  name: string | undefined,
): AxisKind {
  if (!name) return "empty";
  const c = columns.find((c) => c.name === name);
  if (!c) return "empty";
  switch (c.kind) {
    case "numeric":
      return "continuous";
    case "string":
    case "bool":
      return "discrete";
    case "date":
      return "time";
  }
}

export function compatibleDraws(x: AxisKind, y: AxisKind): string[] {
  return RULES.filter((r) => r.x === x && r.y === y).map((r) => r.draw);
}

export function defaultDraw(x: AxisKind, y: AxisKind): string | null {
  return (
    RULES.find((r) => r.x === x && r.y === y && r.role === "default")?.draw ??
    null
  );
}

export function resolveDraw(
  layer: Layer,
  columns: ColumnInfo[],
): string | null {
  if (layer.draw !== AUTO) return layer.draw;
  const xK = columnAxisKind(columns, layer.mappings.x);
  const yK = columnAxisKind(columns, layer.mappings.y);
  return defaultDraw(xK, yK);
}
