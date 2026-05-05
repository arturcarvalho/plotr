import { chartLabel } from "../lib/buildQuery";
import { ChartIcon } from "./ChartIcon";

interface Props {
  resolvedDraw: string | null;
  selected: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}

export function LayerCard({
  resolvedDraw,
  selected,
  onToggle,
  onRemove,
}: Props) {
  const title = resolvedDraw ? chartLabel(resolvedDraw) : "Chart";

  return (
    <div className="group relative mb-1.5">
      <button
        type="button"
        onClick={onToggle}
        title={title}
        aria-label={title}
        className={[
          "flex h-10 w-10 items-center justify-center rounded transition-colors",
          selected
            ? "bg-stone-100 text-stone-800 hover:bg-stone-200"
            : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100",
        ].join(" ")}
      >
        {resolvedDraw ? (
          <ChartIcon draw={resolvedDraw} className="h-6 w-6" />
        ) : (
          <PlayIcon />
        )}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove layer"
          title="Remove layer"
          className={[
            "absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 bg-white font-mono text-xs leading-none text-stone-500 shadow-sm transition-opacity hover:border-red-300 hover:bg-red-50 hover:text-red-700",
            selected
              ? "opacity-100"
              : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100",
          ].join(" ")}
        >
          ×
        </button>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
