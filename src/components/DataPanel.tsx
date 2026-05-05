import { useRef, useState } from "react";
import type { ColumnInfo, ColumnKind } from "../lib/ggsql";

interface Props {
  ready: boolean;
  activeTable: string | null;
  columns: ColumnInfo[];
  onLoadCsv: (name: string, bytes: Uint8Array) => void;
  onLoadPenguins: () => void;
  onChangeFile: () => void;
}

const GLYPH: Record<ColumnKind, string> = {
  numeric: "#",
  string: "T",
  bool: "✓",
  date: "📅",
};

const TYPE_LABEL: Record<ColumnKind, string> = {
  numeric: "num",
  string: "str",
  bool: "bool",
  date: "date",
};

function sanitiseTableName(filename: string): string {
  return filename
    .replace(/\.(csv|parquet|pq)$/i, "")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toLowerCase();
}

export function DataPanel({
  ready,
  activeTable,
  columns,
  onLoadCsv,
  onLoadPenguins,
  onChangeFile,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    const name = sanitiseTableName(file.name) || `csv_${Date.now()}`;
    const buf = await file.arrayBuffer();
    onLoadCsv(name, new Uint8Array(buf));
  };

  if (activeTable) {
    const nonNumeric = columns
      .filter((c) => c.kind !== "numeric")
      .sort((a, b) => a.name.localeCompare(b.name));
    const numeric = columns
      .filter((c) => c.kind === "numeric")
      .sort((a, b) => a.name.localeCompare(b.name));

    return (
      <aside className="flex h-full w-[252px] shrink-0 flex-col bg-app-chrome">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-l-lg border border-stone-300 bg-white">
            <BrandStrip />
            <div className="flex h-[52px] items-center gap-2 border-b border-stone-200 px-3">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] uppercase tracking-wide text-stone-500">
                  Table
                </div>
                <div
                  className="truncate font-mono text-sm font-semibold text-stone-800"
                  title={activeTable}
                >
                  {activeTable}
                </div>
              </div>
              <button
                type="button"
                onClick={onChangeFile}
                title="Change file"
                aria-label="Change file"
                className="shrink-0 rounded p-3 text-stone-500 hover:bg-stone-200 hover:text-stone-800"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              <Section title="Variables" rows={nonNumeric} />
              <Section divider={nonNumeric.length > 0} rows={numeric} />
            </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[252px] shrink-0 flex-col overflow-y-auto bg-app-chrome">
      <div className="flex flex-1 flex-col rounded-l-lg border border-stone-300 bg-white">
        <BrandStrip />
        <div className="flex flex-1 flex-col p-3">
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-wide text-stone-500">
            Choose data
          </h2>

          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className={[
              "mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed px-3 py-3 text-center text-xs transition-colors",
              dragOver
                ? "border-sky-400 bg-sky-50 text-sky-700"
                : "border-stone-300 bg-stone-100 text-stone-500 hover:border-stone-400 hover:bg-stone-100",
            ].join(" ")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-stone-400"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>
              <span className="font-medium text-stone-700">Drop CSV</span>{" "}
              <span className="text-stone-400">or browse</span>
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </label>

          <div className="mb-2 text-center font-mono text-[10px] uppercase tracking-wide text-stone-400">
            or use built-in
          </div>
          <button
            type="button"
            disabled={!ready}
            onClick={onLoadPenguins}
            className="rounded border border-stone-300 bg-white px-3 py-1.5 font-mono text-xs text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Palmer Penguins
          </button>
        </div>
      </div>
    </aside>
  );
}

function BrandStrip() {
  return (
    <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-stone-200 px-3 font-mono">
      <span className="text-sm font-semibold text-stone-800">plotr</span>
      <span className="text-[10px] tracking-wide text-stone-400">
        A ggsql chart builder
      </span>
      <span className="rounded border border-amber-300 bg-amber-100 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-amber-800">
        Alpha
      </span>
    </div>
  );
}

function Section({
  title,
  divider,
  rows,
}: {
  title?: string;
  divider?: boolean;
  rows: ColumnInfo[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="mb-2">
      {title ? (
        <div className="px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-stone-500">
          {title}
        </div>
      ) : divider ? (
        <div className="my-1 border-t border-stone-200" />
      ) : null}
      <ul>
        {rows.map((col) => (
          <li
            key={col.name}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", col.name);
              e.dataTransfer.effectAllowed = "copy";
            }}
            className="flex cursor-grab items-center gap-2 px-3 py-1 hover:bg-stone-100 active:cursor-grabbing"
          >
            <span
              className={[
                "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[11px] font-bold",
                col.kind === "numeric"
                  ? "bg-sky-100 text-sky-700"
                  : col.kind === "bool"
                    ? "bg-emerald-100 text-emerald-700"
                    : col.kind === "date"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-stone-200 text-stone-700",
              ].join(" ")}
              title={col.kind}
            >
              {GLYPH[col.kind]}
            </span>
            <span
              className="flex-1 truncate font-mono text-xs text-stone-800"
              title={col.name}
            >
              {col.name}
            </span>
            <span className="font-mono text-[10px] text-stone-400">
              {TYPE_LABEL[col.kind]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
