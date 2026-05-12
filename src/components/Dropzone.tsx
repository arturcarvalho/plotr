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
  /** Marks this dropzone as a geom-required aesthetic that's missing — when
   *  true AND empty, the border switches to amber-dashed as a visual hint. */
  required?: boolean;
  source: Source;
  onDrop: (col: string, src?: Source) => void;
  onClear: () => void;
}

export function Dropzone({
  placeholder,
  value,
  required,
  source,
  onDrop,
  onClear,
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
        over
          ? "border-sky-400 bg-sky-50"
          : required && !value
            ? "border-amber-500"
            : "border-stone-300",
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
    </div>
  );
}
