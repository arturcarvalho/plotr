import type { ColumnKind } from "./ggsql";

/** Strip one layer of surrounding double quotes — ggsql's execute_sql returns
 *  string cells quoted (`"Adelie"`) and everything else bare. */
export function unquote(v: string): string {
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1);
  }
  return v;
}

/** Cell text as shown in the Data tab: unquoted, with null-ish cells blank. */
export function displayCell(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "" || v === "null") return "";
  return unquote(v);
}

/** Case-insensitive substring match across all cells (on display values).
 *  An empty/whitespace query returns the input array unchanged. */
export function filterRows(rows: string[][], query: string): string[][] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) =>
    r.some((c) => displayCell(c).toLowerCase().includes(q)),
  );
}

/** Sorted copy of `rows` by column `col`. Numeric columns compare as numbers,
 *  everything else lexically on display values; empty cells sort last in both
 *  directions. Stable, input untouched. */
export function sortRows(
  rows: string[][],
  col: number,
  dir: "asc" | "desc",
  kind: ColumnKind | null,
): string[][] {
  const sign = dir === "desc" ? -1 : 1;
  return rows.slice().sort((a, b) => {
    const av = displayCell(a[col]);
    const bv = displayCell(b[col]);
    if (av === "" && bv === "") return 0;
    if (av === "") return 1;
    if (bv === "") return -1;
    if (kind === "numeric") return sign * (Number(av) - Number(bv));
    return sign * av.localeCompare(bv);
  });
}
