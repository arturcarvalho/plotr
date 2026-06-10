import type { ColumnKind } from "../lib/ggsql";

// Glyph rendered inside the square badge for each column type. Visible to the
// user so it's intentionally short — see also DataPanel's sidebar list and
// the "no data" card in Viz.tsx where these chips appear together.
const GLYPH: Record<ColumnKind, string> = {
  numeric: "#",
  string: "T",
  bool: "✓",
  date: "📅",
};

const CLASS_BY_KIND: Record<ColumnKind, string> = {
  numeric: "bg-sky-100 text-sky-700",
  bool: "bg-emerald-100 text-emerald-700",
  date: "bg-amber-100 text-amber-700",
  string: "bg-stone-200 text-stone-700",
};

/**
 * 20×20 square chip that signals a column's type via colour + glyph. Returns
 * `null` when `kind` is unknown so callers can render the column's name on
 * its own (e.g. the no-data card after a fresh page reload, where the
 * in-memory kind cache hasn't been seeded yet).
 */
export function ColumnKindBadge({
  kind,
}: {
  kind: ColumnKind | null | undefined;
}) {
  if (!kind) return null;
  return (
    <span
      className={[
        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold",
        CLASS_BY_KIND[kind],
      ].join(" ")}
      title={kind}
    >
      {GLYPH[kind]}
    </span>
  );
}
