import { useState } from "react";
import type { Aes } from "../lib/buildQuery";
import { dragSignal } from "../lib/dragSignal";

const SRC_TYPE = "application/x-plotr-src";

interface Source {
  layerId: string;
  aes: Aes;
}

interface Props {
  placeholder?: string;
  value?: string;
  source: Source;
  settingsOpen?: boolean;
  onDrop: (col: string, src?: Source) => void;
  onClear: () => void;
  onToggleSettings?: () => void;
}

export function Dropzone({
  placeholder,
  value,
  source,
  settingsOpen,
  onDrop,
  onClear,
  onToggleSettings,
}: Props) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = e.dataTransfer.types.includes(SRC_TYPE)
          ? "move"
          : "copy";
        if (!over) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const col = e.dataTransfer.getData("text/plain");
        if (!col) return;
        const srcRaw = e.dataTransfer.getData(SRC_TYPE);
        let src: Source | undefined;
        if (srcRaw) {
          try {
            src = JSON.parse(srcRaw) as Source;
          } catch {
            src = undefined;
          }
        }
        dragSignal.markDropAccepted();
        if (
          src &&
          src.layerId === source.layerId &&
          src.aes === source.aes
        ) {
          return;
        }
        onDrop(col, src);
      }}
      className={[
        "flex h-9 w-full items-center gap-1 rounded border-2 border-dashed bg-white px-2 transition-colors",
        over ? "border-sky-400 bg-sky-50" : "border-stone-300",
      ].join(" ")}
    >
      {value ? (
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", value);
            e.dataTransfer.setData(SRC_TYPE, JSON.stringify(source));
            e.dataTransfer.effectAllowed = "move";
            setTimeout(() => dragSignal.startDrag(), 0);
          }}
          onDragEnd={() => {
            const accepted = dragSignal.wasDropAccepted();
            dragSignal.endDrag();
            if (!accepted) onClear();
          }}
          className="inline-flex cursor-grab select-none items-center gap-1 rounded bg-stone-200 px-1.5 py-0.5 font-mono text-xs text-stone-800 active:cursor-grabbing"
          title={value}
        >
          {value}
        </span>
      ) : (
        <span className="font-mono text-xs italic text-stone-400">
          {placeholder ?? ""}
        </span>
      )}
      {onToggleSettings && (
        <button
          type="button"
          onClick={onToggleSettings}
          aria-label="Settings"
          title={settingsOpen ? "Close settings" : "Open settings"}
          className={[
            "ml-auto rounded p-0.5 transition-colors",
            settingsOpen
              ? "bg-stone-800 text-stone-100"
              : "text-stone-400 hover:bg-stone-100 hover:text-stone-700",
          ].join(" ")}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
