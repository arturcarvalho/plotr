import { chartLabel } from "../lib/buildQuery";
import { ChartIcon } from "./ChartIcon";

interface Props {
  resolvedDraw: string | null;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function LayerCard({ resolvedDraw, selected, disabled, onToggle }: Props) {
  const title = resolvedDraw ? chartLabel(resolvedDraw) : "Chart";

  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={onToggle}
        title={title}
        aria-label={title}
        className={[
          "flex h-10 w-10 cursor-grab items-center justify-center rounded transition-colors active:cursor-grabbing",
          selected
            ? "bg-stone-300 text-stone-900 hover:bg-stone-400"
            : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100",
          disabled ? "opacity-50 grayscale" : "",
        ].join(" ")}
      >
        {resolvedDraw ? (
          <ChartIcon draw={resolvedDraw} className="h-6 w-6" />
        ) : (
          <PlayIcon />
        )}
      </button>
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
