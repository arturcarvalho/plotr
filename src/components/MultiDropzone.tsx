import { useState } from "react";
import { dragSignal } from "../lib/dragSignal";

interface Props {
  /** Columns currently held, rendered as removable chips. */
  value: string[];
  /** Append a dropped column (parent dedupes). */
  onAdd: (col: string) => void;
  /** Remove a single column (× button or drag-away). */
  onRemove: (col: string) => void;
  placeholder?: string;
}

// Multi-column drop target: accepts several columns and renders each as a
// draggable chip. Unlike the single-value `Dropzone`, dropping appends rather
// than replaces. Chips carry only `text/plain` (no move-source type) so the
// aesthetic dropzones treat a chip dragged onto them as a fresh copy and never
// try to delete a non-existent mapping. Drag a chip out (or hit ×) to remove.
export function MultiDropzone({ value, onAdd, onRemove, placeholder }: Props) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        if (!over) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const col = e.dataTransfer.getData("text/plain");
        if (!col) return;
        dragSignal.markDropAccepted();
        onAdd(col);
      }}
      className={[
        "flex min-h-9 w-full flex-wrap items-center gap-1 rounded border-2 border-dashed bg-white px-2 py-1 transition-colors",
        over ? "border-sky-400 bg-sky-50" : "border-stone-300",
      ].join(" ")}
    >
      {value.length === 0 ? (
        <span className="font-mono text-xs italic text-stone-400">
          {placeholder ?? ""}
        </span>
      ) : (
        value.map((col) => (
          <span
            key={col}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", col);
              e.dataTransfer.effectAllowed = "move";
              setTimeout(() => dragSignal.startDrag(), 0);
            }}
            onDragEnd={() => {
              const accepted = dragSignal.wasDropAccepted();
              dragSignal.endDrag();
              if (!accepted) onRemove(col);
            }}
            className="inline-flex cursor-grab select-none items-center gap-1 rounded bg-stone-200 py-0.5 pl-1.5 pr-1 font-mono text-xs text-stone-800 active:cursor-grabbing"
            title={col}
          >
            {col}
            <button
              type="button"
              onClick={() => onRemove(col)}
              aria-label={`Remove ${col}`}
              className="flex h-3.5 w-3.5 items-center justify-center rounded-sm text-stone-500 hover:bg-stone-300 hover:text-stone-800"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
            </button>
          </span>
        ))
      )}
    </div>
  );
}
