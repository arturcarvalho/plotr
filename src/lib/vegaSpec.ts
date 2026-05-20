/** Pretty-print a Vega-Lite spec for display + clipboard. Returns `null`
 *  when no spec is available so the caller can render a placeholder; an
 *  empty object stringifies to `"{}"` (a valid but useless spec — distinct
 *  from "no spec yet"). */
export function formatVegaSpec(spec: unknown): string | null {
  if (spec === null || spec === undefined) return null;
  return JSON.stringify(spec, null, 2);
}
