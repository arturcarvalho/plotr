// Per-geom numeric-setting defaults and validation limits, mirrored from
// ggsql (posit-dev/ggsql v0.3.3 — the bundled version; cross-checked against
// GGSQL_DEFAULTS.md). Drives the chart-type panel's number inputs: the default
// is shown as a placeholder when empty, values clamp to ggsql's real limits,
// and a value equal to the default is treated as unset (so it's never emitted).

/** Numeric settings that have a ggsql default and/or validation limits. */
export type NumericSettingKey =
  | "linewidth"
  | "width"
  | "adjust"
  | "tails"
  | "bins"
  | "coef"
  | "rotation"
  | "slope"
  | "opacity"
  | "size"
  | "bandwidth"
  | "binwidth";

export interface SettingConstraint {
  /** ggsql's fallback value, or undefined when it's data-dependent (auto). */
  default?: number;
  /** Inclusive bounds — only present where ggsql actually constrains the value. */
  min?: number;
  max?: number;
  step?: number;
  /** Rounded to a whole number on clamp (histogram bins). */
  integer?: boolean;
}

const LINEWIDTH_DEFAULT: Record<string, number> = {
  point: 1,
  line: 1.5,
  tile: 1,
  violin: 1,
  boxplot: 1,
  density: 1,
  area: 1,
  smooth: 2,
  ribbon: 1,
  range: 1,
  rule: 1,
};

const WIDTH: Record<string, SettingConstraint> = {
  bar: { default: 0.9, min: 0, max: 1, step: 0.05 },
  violin: { default: 0.9, min: 0, max: 1, step: 0.05 },
  boxplot: { default: 0.9, min: 0, max: 1, step: 0.05 },
  range: { default: 10, min: 0, step: 0.5 },
};

// opacity defaults to 0.8 for filled/area-ish geoms and 1.0 for the line-ish
// ones (line, smooth, range, text, rule).
const OPACITY_ONE = new Set(["line", "smooth", "range", "text", "rule"]);

/** The constraint for a (geom, setting) pair. Unknown pairs return {} so the
 *  control is an unbounded number input with no default. */
export function settingConstraint(
  geom: string,
  key: NumericSettingKey,
): SettingConstraint {
  switch (key) {
    case "linewidth":
      return { default: LINEWIDTH_DEFAULT[geom], min: 0, step: 0.1 };
    case "width":
      return WIDTH[geom] ?? {};
    case "adjust":
      return { default: 1, min: 0.1, step: 0.1 };
    case "tails":
      return { default: 3, min: 0, step: 0.5 };
    case "bins":
      return { default: 30, min: 1, step: 1, integer: true };
    case "coef":
      return { default: 1.5, min: 0, step: 0.1 };
    case "rotation":
      return { default: 0, step: 1 };
    case "slope":
      return { default: 0, step: 0.1 };
    case "opacity":
      return { default: OPACITY_ONE.has(geom) ? 1 : 0.8, min: 0, max: 1, step: 0.05 };
    case "size":
      return { default: 3, min: 0, step: 0.5 };
    case "bandwidth":
      return { min: 0, step: 0.05 };
    case "binwidth":
      return { min: 0, step: 0.1 };
  }
}

/** Clamp `v` to the setting's real limits (and round integer settings). */
export function clampSettingValue(
  geom: string,
  key: NumericSettingKey,
  v: number,
): number {
  const c = settingConstraint(geom, key);
  let out = v;
  if (c.integer) out = Math.round(out);
  if (c.min !== undefined) out = Math.max(c.min, out);
  if (c.max !== undefined) out = Math.min(c.max, out);
  return out;
}

/** A short message describing how `typed` was adjusted to fit the setting's
 *  limits, or null when it was already valid. Names the bound that was hit so
 *  the field can flag a silent clamp. */
export function clampNotice(
  geom: string,
  key: NumericSettingKey,
  typed: number,
): string | null {
  const c = settingConstraint(geom, key);
  const clamped = clampSettingValue(geom, key, typed);
  if (clamped === typed) return null;
  if (c.max !== undefined && typed > c.max) {
    return `Limited to ${c.max} (max ${c.max})`;
  }
  if (c.min !== undefined && typed < c.min) {
    return `Limited to ${c.min} (min ${c.min})`;
  }
  return `Rounded to ${clamped}`;
}

/** True when `v` is exactly the setting's ggsql default (no default → false). */
export function isDefaultSettingValue(
  geom: string,
  key: NumericSettingKey,
  v: number,
): boolean {
  const d = settingConstraint(geom, key).default;
  return d !== undefined && v === d;
}

/** Normalize a control's write-back: clamp, then collapse a default-valued
 *  result to null so it's stored as unset (and never emitted). */
export function normalizeSettingValue(
  geom: string,
  key: NumericSettingKey,
  v: number | null,
): number | null {
  if (v === null || Number.isNaN(v)) return null;
  const clamped = clampSettingValue(geom, key, v);
  return isDefaultSettingValue(geom, key, clamped) ? null : clamped;
}
