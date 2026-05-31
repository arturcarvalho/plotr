import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type LayerKind = "chart" | "labels" | "custom";

interface Props {
  onClose: () => void;
  onConfirm: (kind: LayerKind) => void;
}

// Tailwind `stone` hexes — the icons need two independent inks (bright / dim)
// that flip with selection, so they're passed as colours rather than classes.
const STONE = {
  50: "#fafaf9",
  300: "#d6d3d1",
  400: "#a8a29e",
  500: "#78716c",
  900: "#1c1917",
} as const;

const OPTIONS: { kind: LayerKind; label: string; desc: string }[] = [
  {
    kind: "chart",
    label: "Chart",
    desc: "Add different types of chart.",
  },
  {
    kind: "labels",
    label: "Labels",
    desc: "Set title, subtitle, and axis labels.",
  },
  {
    kind: "custom",
    label: "Custom",
    desc: "Write GGSQL code directly.",
  },
];

/** Centered "Add layer" modal (design handoff L8). Three option cards — one
 *  always selected (Chart default) — confirmed by the primary "Add {kind}"
 *  button. Sharp-cornered, contrast-only selection, no accent colour. */
export function AddLayerModal({ onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<LayerKind>("chart");
  const dialogRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const indexOf = (kind: LayerKind) => OPTIONS.findIndex((o) => o.kind === kind);

  // Focus the selected card on open.
  useEffect(() => {
    cardRefs.current[indexOf("chart")]?.focus();
  }, []);

  // ←/→ move the selection between cards (wrapping), keeping focus on the
  // newly-selected card.
  const moveSelection = (delta: number) => {
    const next = (indexOf(selected) + delta + OPTIONS.length) % OPTIONS.length;
    setSelected(OPTIONS[next].kind);
    cardRefs.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      moveSelection(1);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveSelection(-1);
      return;
    }
    if (e.key !== "Tab") return;
    // Trap focus within the dialog.
    const items = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled])",
      ) ?? [],
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center pt-[10vh] bg-[rgba(28,25,23,0.55)] font-mono"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-layer-title"
        onKeyDown={onKeyDown}
        className="w-[760px] max-w-[calc(100vw-32px)] border border-stone-200 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.22),0_2px_6px_rgba(0,0,0,0.08)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-[18px] py-[14px]">
          <div
            id="add-layer-title"
            className="text-[15px] tracking-[0.01em] text-stone-900"
          >
            Add layer
          </div>
          <button
            type="button"
            aria-label="close"
            onClick={onClose}
            className="inline-flex p-1 text-stone-500 hover:text-stone-800"
          >
            <XIcon />
          </button>
        </div>

        {/* Card grid */}
        <div
          role="radiogroup"
          aria-labelledby="add-layer-title"
          className="grid grid-cols-3 gap-2 p-[14px]"
        >
          {OPTIONS.map((o, idx) => {
            const isSelected = selected === o.kind;
            return (
              <button
                key={o.kind}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-kind={o.kind}
                onClick={() => onConfirm(o.kind)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onConfirm(o.kind);
                  }
                }}
                className={[
                  "flex items-stretch gap-[10px] border p-[12px] text-left transition-colors",
                  isSelected
                    ? "border-stone-300 bg-stone-200"
                    : "border-stone-200 bg-white hover:bg-stone-50",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex w-12 flex-none items-center justify-center border",
                    isSelected
                      ? "border-stone-300 bg-white"
                      : "border-stone-200 bg-stone-50",
                  ].join(" ")}
                >
                  <OptionIcon
                    kind={o.kind}
                    bright={isSelected ? STONE[900] : STONE[500]}
                    dim={isSelected ? STONE[400] : STONE[300]}
                  />
                </span>
                <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                  <span
                    className={[
                      "text-[14px]",
                      isSelected ? "text-stone-900" : "text-stone-500",
                    ].join(" ")}
                  >
                    {o.label}
                  </span>
                  <span
                    className={[
                      "line-clamp-2 min-h-[calc(12px*1.45*2)] overflow-hidden text-[12px] leading-[1.45]",
                      isSelected ? "text-stone-600" : "text-stone-400",
                    ].join(" ")}
                  >
                    {o.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-[18px] py-[10px]">
          <button
            type="button"
            onClick={onClose}
            className="border border-stone-200 px-3 py-[5px] text-[13px] text-stone-500 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="border border-stone-900 bg-white px-[14px] py-[5px] text-[13px] text-stone-900 hover:bg-stone-100"
          >
            Add{" "}
            <span className="inline-block w-[6ch]">{selected}</span>
            <span className="ml-1 opacity-55">↵</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Chart + Labels share one geometry; the inking inverts (strict inverse).
 *  `mode="chart"` inks the axes + dots bright and the squiggle titles dim;
 *  `mode="labels"` flips it. */
function PlotIcon({
  bright,
  dim,
  mode,
}: {
  bright: string;
  dim: string;
  mode: "chart" | "labels";
}) {
  const sq = mode === "labels" ? bright : dim; // squiggly title strokes
  const ax = mode === "labels" ? dim : bright; // axis lines
  const dt = mode === "labels" ? dim : bright; // scatter dots
  return (
    <svg width={30} height={30} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M9 3 Q10 1.7 11 3 T13 3 T15 3 T17 3 T19 3 T21 3 T23 3"
        stroke={sq}
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M2.5 9 Q1.2 10 2.5 11 T2.5 13 T2.5 15 T2.5 17 T2.5 19 T2.5 21 T2.5 23"
        stroke={sq}
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line x1="7" y1="6" x2="7" y2="24" stroke={ax} strokeWidth="1.1" strokeLinecap="round" />
      <line x1="7" y1="24" x2="28" y2="24" stroke={ax} strokeWidth="1.1" strokeLinecap="round" />
      <path
        d="M11 29 Q12 27.7 13 29 T15 29 T17 29 T19 29 T21 29 T23 29 T25 29"
        stroke={sq}
        strokeWidth="1"
        strokeLinecap="round"
      />
      {(
        [
          [11, 20],
          [14, 16],
          [17, 18],
          [20, 12],
          [23, 15],
          [26, 10],
        ] as const
      ).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill={dt} />
      ))}
    </svg>
  );
}

function OptionIcon({
  kind,
  bright,
  dim,
}: {
  kind: LayerKind;
  bright: string;
  dim: string;
}) {
  if (kind === "chart") return <PlotIcon mode="chart" bright={bright} dim={dim} />;
  if (kind === "labels") return <PlotIcon mode="labels" bright={bright} dim={dim} />;
  return (
    <svg width={30} height={30} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M12 8 L6 16 L12 24 M20 8 L26 16 L20 24"
        stroke={bright}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path
        d="M2.5 2.5 L7.5 7.5 M7.5 2.5 L2.5 7.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
