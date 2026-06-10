import { chartLabel } from "../lib/buildQuery";
import { ChartIcon } from "./ChartIcon";
import { EyeIcon, EyeSlashIcon } from "./icons";

interface Props {
  resolvedDraw: string | null;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onToggleDisabled: () => void;
}

export function LayerCard({
  resolvedDraw,
  selected,
  disabled,
  onToggle,
  onRemove,
  onToggleDisabled,
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
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove layer"
        title="Remove layer"
        className="pointer-events-none absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 bg-white font-mono text-xs leading-none text-stone-500 opacity-0 shadow-sm transition-opacity hover:border-red-300 hover:bg-red-50 hover:text-red-700 group-hover:pointer-events-auto group-hover:opacity-100"
      >
        ×
      </button>
      <button
        type="button"
        onClick={onToggleDisabled}
        aria-label={disabled ? "Enable layer" : "Disable layer"}
        title={disabled ? "Enable layer" : "Disable layer"}
        className="pointer-events-none absolute -left-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-500 opacity-0 shadow-sm transition-opacity hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 group-hover:pointer-events-auto group-hover:opacity-100"
      >
        {disabled ? <EyeSlashIcon /> : <EyeIcon />}
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

