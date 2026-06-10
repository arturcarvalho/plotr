import type { ColumnInfo } from "./ggsql";
import type { Aes, Layer } from "./buildQuery";

export const AUTO = "auto";

type AxisKind = "continuous" | "discrete" | "time" | "empty";

type Role = "default" | "compatible";

// Kind that a rule requires `fill` to be mapped to. Omit when the rule
// doesn't care about fill. Use "discrete" / "continuous" / "time" to gate by
// the fill column's kind (e.g. pie only resolves with a discrete fill —
// continuous or time-typed fills break ggsql's polar coercion).
type FillRequirement = Exclude<AxisKind, "empty">;

interface Rule {
  x: AxisKind;
  y: AxisKind;
  draw: string;
  role: Role;
  fill?: FillRequirement;
}

function matchesFillRule(
  ruleFill: FillRequirement | undefined,
  fillKind: AxisKind,
): boolean {
  if (!ruleFill) return true; // rule doesn't constrain fill
  if (fillKind === "empty") return false; // rule requires fill, none mapped
  return ruleFill === fillKind;
}

const RULES: Rule[] = [
  { x: "continuous", y: "empty", draw: "histogram", role: "default" },
  // boxplot + violin require BOTH x AND y per ggsql's stat_* validators —
  // single-X compat rules removed (broke ggsql at render time).
  { x: "continuous", y: "empty", draw: "density", role: "compatible" },
  { x: "discrete", y: "empty", draw: "bar", role: "default" },
  { x: "time", y: "empty", draw: "histogram", role: "default" },
  { x: "time", y: "empty", draw: "bar", role: "compatible" },
  { x: "empty", y: "discrete", draw: "bar", role: "default" },
  // No `x: empty, y: continuous` rules — ggsql line/area need both axes;
  // without X they don't render. AUTO falls through to null so the user
  // is prompted to add an X mapping.
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
  { x: "continuous", y: "continuous", draw: "area", role: "compatible" },
  { x: "continuous", y: "continuous", draw: "smooth", role: "compatible" },
  { x: "continuous", y: "continuous", draw: "text", role: "compatible" },
  { x: "continuous", y: "continuous", draw: "tile", role: "compatible" },
  { x: "discrete", y: "discrete", draw: "tile", role: "default" },
  { x: "discrete", y: "discrete", draw: "text", role: "compatible" },
  { x: "discrete", y: "discrete", draw: "point", role: "compatible" },
  { x: "time", y: "continuous", draw: "line", role: "default" },
  { x: "time", y: "continuous", draw: "point", role: "compatible" },
  { x: "time", y: "continuous", draw: "area", role: "compatible" },
  { x: "time", y: "continuous", draw: "bar", role: "compatible" },
  { x: "time", y: "continuous", draw: "smooth", role: "compatible" },
  { x: "discrete", y: "time", draw: "tile", role: "default" },
  { x: "time", y: "discrete", draw: "tile", role: "default" },
  { x: "empty", y: "empty", fill: "discrete", draw: "pie", role: "default" },
  // ribbon needs ymin / ymax aesthetics on top of x; AUTO can't auto-resolve to
  // it (x/y type alone isn't enough), but the icon should be enabled for the
  // common x types so the user can pick it manually.
  { x: "continuous", y: "empty", draw: "ribbon", role: "compatible" },
  { x: "continuous", y: "continuous", draw: "ribbon", role: "compatible" },
  { x: "time", y: "empty", draw: "ribbon", role: "compatible" },
  { x: "time", y: "continuous", draw: "ribbon", role: "compatible" },
  // range mirrors ribbon's aesthetic profile (pos1 + pos2min + pos2max).
  { x: "continuous", y: "empty", draw: "range", role: "compatible" },
  { x: "continuous", y: "continuous", draw: "range", role: "compatible" },
  { x: "discrete", y: "empty", draw: "range", role: "compatible" },
  { x: "discrete", y: "continuous", draw: "range", role: "compatible" },
  { x: "time", y: "empty", draw: "range", role: "compatible" },
  { x: "time", y: "continuous", draw: "range", role: "compatible" },
  // rule needs EXACTLY one of x or y (XOR per ggsql). Enable the icon for any
  // single-axis combo; ggsql validates the XOR at render time.
  { x: "continuous", y: "empty", draw: "rule", role: "compatible" },
  { x: "discrete", y: "empty", draw: "rule", role: "compatible" },
  { x: "time", y: "empty", draw: "rule", role: "compatible" },
  { x: "empty", y: "continuous", draw: "rule", role: "compatible" },
  { x: "empty", y: "discrete", draw: "rule", role: "compatible" },
  { x: "empty", y: "time", draw: "rule", role: "compatible" },
];

export function resolveMappingKind(
  name: string | undefined,
  columns: ColumnInfo[],
): "fixed" | "discrete" | "continuous" {
  if (!name) return "fixed";
  const c = columns.find((c) => c.name === name);
  if (!c) return "fixed";
  switch (c.kind) {
    case "string":
    case "bool":
      return "discrete";
    case "numeric":
    case "date":
      return "continuous";
  }
}

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

interface DrawReq {
  parts: string[];
  isDefault: boolean;
}

/** Human-readable mapping conditions under which `draw` works.
 *  One entry per matching rule. Used to power the chart-grid hover tooltip. */
export function drawRequirements(draw: string): DrawReq[] {
  return RULES.filter((r) => r.draw === draw).map((r) => {
    const parts: string[] = [];
    if (r.x !== "empty") parts.push(`X ${r.x}`);
    if (r.y !== "empty") parts.push(`Y ${r.y}`);
    if (r.fill) parts.push(`Fill ${r.fill}`);
    return { parts, isDefault: r.role === "default" };
  });
}

export function compatibleDraws(
  x: AxisKind,
  y: AxisKind,
  fillKind: AxisKind = "empty",
): string[] {
  return RULES.filter(
    (r) => r.x === x && r.y === y && matchesFillRule(r.fill, fillKind),
  ).map((r) => r.draw);
}

export function defaultDraw(
  x: AxisKind,
  y: AxisKind,
  fillKind: AxisKind = "empty",
): string | null {
  return (
    RULES.find(
      (r) =>
        r.x === x &&
        r.y === y &&
        r.role === "default" &&
        matchesFillRule(r.fill, fillKind),
    )?.draw ?? null
  );
}

export function resolveDraw(
  layer: Layer,
  columns: ColumnInfo[],
  shared?: Partial<Record<Aes, string>>,
): string | null {
  if (layer.draw !== AUTO) return layer.draw;
  const xK = columnAxisKind(columns, layer.mappings.x ?? shared?.x);
  const yK = columnAxisKind(columns, layer.mappings.y ?? shared?.y);
  const fillK = columnAxisKind(columns, layer.mappings.fill ?? shared?.fill);
  return defaultDraw(xK, yK, fillK);
}
