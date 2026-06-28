import { useRef, useState } from "react";
import type { ColumnInfo } from "../lib/ggsql";
import { columnAxisKind } from "../lib/autoChart";
import { ColumnKindBadge } from "./ColumnKindBadge";
import { HeaderMenu } from "./HeaderMenu";

interface Props {
  ready: boolean;
  activeTable: string | null;
  columns: ColumnInfo[];
  variableCount: number;
  onLoadCsv: (name: string, bytes: Uint8Array) => void;
  onLoadPenguins: () => void;
  onResetFile: () => void;
  onClearChart: () => void;
}

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
  variableCount,
  onLoadCsv,
  onLoadPenguins,
  onResetFile,
  onClearChart,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!ready) return;
    const name = sanitiseTableName(file.name) || `csv_${Date.now()}`;
    const buf = await file.arrayBuffer();
    onLoadCsv(name, new Uint8Array(buf));
  };

  if (activeTable) {
    // Group by the same axis-kind mapping the chart logic uses
    // (string/bool → discrete, numeric → continuous, date → time).
    const group = (kind: "discrete" | "continuous" | "time") =>
      columns
        .filter((c) => columnAxisKind(columns, c.name) === kind)
        .sort((a, b) => a.name.localeCompare(b.name));
    const discrete = group("discrete");
    const continuous = group("continuous");
    const time = group("time");

    return (
      <aside className="flex h-full w-[252px] shrink-0 flex-col bg-app-chrome">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-l-lg border border-stone-300 bg-white">
            <BrandStrip
              activeTable={activeTable}
              variableCount={variableCount}
              onReplaceData={onResetFile}
              onClearChart={onClearChart}
            />
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
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              <div className="px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-stone-500">
                Variables
              </div>
              <Section title="Discrete" rows={discrete} />
              <Section title="Continuous" rows={continuous} />
              <Section title="Time" rows={time} />
            </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-[252px] shrink-0 flex-col overflow-y-auto bg-app-chrome">
      <div className="flex flex-1 flex-col rounded-l-lg border border-stone-300 bg-white">
        <BrandStrip
          activeTable={activeTable}
          variableCount={variableCount}
          onReplaceData={onResetFile}
          onClearChart={onClearChart}
        />
        <div className="flex flex-1 flex-col p-3">
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-wide text-stone-500">
            Choose data
          </h2>

          <label
            onDragOver={(e) => {
              e.preventDefault();
              if (ready) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (!ready) return;
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            className={[
              "mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed px-3 py-3 text-center text-xs transition-colors",
              !ready
                ? "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 opacity-50"
                : dragOver
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
              disabled={!ready}
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
            or use
          </div>
          <button
            type="button"
            disabled={!ready}
            onClick={onLoadPenguins}
            className="rounded border border-stone-300 bg-white px-3 py-1.5 font-mono text-xs text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Demo Dataset
          </button>
        </div>
      </div>
    </aside>
  );
}

function BrandStrip({
  activeTable,
  variableCount,
  onReplaceData,
  onClearChart,
}: {
  activeTable: string | null;
  variableCount: number;
  onReplaceData: () => void;
  onClearChart: () => void;
}) {
  return (
    <div className="flex h-[52px] shrink-0 items-stretch justify-between border-b border-stone-200 font-mono">
      <div className="flex flex-col justify-center leading-tight pl-3">
        <span className="text-sm font-semibold text-stone-800">plotr.org</span>
        <span className="text-xs tracking-wide text-stone-400">
          A ggsql chart builder
        </span>
      </div>
      <HeaderMenu
        activeTable={activeTable}
        variableCount={variableCount}
        onReplaceData={onReplaceData}
        onClearChart={onClearChart}
      />
    </div>
  );
}

/** One axis-kind group in the variable list: a faint sub-header (under the
 *  main VARIABLES heading) plus its draggable column rows. */
function Section({ title, rows }: { title: string; rows: ColumnInfo[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mb-2">
      <div className="px-3 pb-0.5 pt-2 font-mono text-[10px] uppercase tracking-wide text-stone-400">
        {title}
      </div>
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
            <ColumnKindBadge kind={col.kind} />
            <span
              className="flex-1 truncate font-mono text-xs text-stone-800"
              title={col.name}
            >
              {col.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
