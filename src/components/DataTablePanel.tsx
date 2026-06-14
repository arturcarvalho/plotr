import { useMemo, useState } from "react";
import type { ColumnInfo, SqlResult } from "../lib/ggsql";
import { displayCell, filterRows, sortRows } from "../lib/tableData";

interface Props {
  /** First rows of the active table (LIMIT 100), or null when none loaded. */
  preview: SqlResult | null;
  /** Column kinds for the active table — numeric columns sort numerically. */
  columns: ColumnInfo[];
}

type Sort = { col: number; dir: "asc" | "desc" } | null;

export function DataTablePanel({ preview, columns }: Props) {
  const [sort, setSort] = useState<Sort>(null);
  const [search, setSearch] = useState("");

  const rows = useMemo(() => preview?.rows ?? [], [preview]);
  const kindByName = useMemo(
    () => new Map(columns.map((c) => [c.name, c.kind])),
    [columns],
  );

  const visible = useMemo(() => {
    const filtered = filterRows(rows, search);
    if (!sort || !preview) return filtered;
    const kind = kindByName.get(preview.columns[sort.col]) ?? null;
    return sortRows(filtered, sort.col, sort.dir, kind);
  }, [rows, search, sort, preview, kindByName]);

  if (!preview || preview.columns.length === 0) {
    return (
      <div className="p-3 font-mono text-xs italic text-stone-400">
        No data loaded.
      </div>
    );
  }

  const searching = search.trim().length > 0;
  const countLabel = searching
    ? `${visible.length} of ${rows.length} rows`
    : preview.truncated || preview.total_rows > rows.length
      ? `first ${rows.length} of ${preview.total_rows} rows`
      : `${rows.length} rows`;

  const toggleSort = (col: number) =>
    setSort((s) =>
      s?.col === col
        ? { col, dir: s.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" },
    );

  return (
    <div className="flex h-full w-full flex-col bg-app-chrome">
      <header className="flex shrink-0 select-none items-center gap-3 px-3 py-1.5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search rows…"
          spellCheck={false}
          aria-label="Search rows"
          className="w-56 rounded border border-stone-300 bg-white px-2 py-0.5 font-mono text-xs text-stone-800 focus:border-sky-400 focus:outline-none"
        />
        <span className="ml-auto font-mono text-[10px] text-stone-500">
          {countLabel}
        </span>
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
        <table className="ggsql-table font-mono text-xs text-stone-800">
          <thead>
            <tr>
              {preview.columns.map((name, i) => (
                <th
                  key={name}
                  onClick={() => toggleSort(i)}
                  aria-sort={
                    sort?.col === i
                      ? sort.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className="sticky top-0 cursor-pointer select-none whitespace-nowrap bg-stone-50 hover:bg-stone-100"
                  title={`Sort by ${name}`}
                >
                  {name}
                  {sort?.col === i && (
                    <span className="ml-1 text-stone-400">
                      {sort.dir === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} className="whitespace-nowrap">
                    {displayCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr className="truncation-row">
                <td colSpan={preview.columns.length}>No matching rows.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
