import { EyeIcon, EyeSlashIcon } from "./icons";

interface Props {
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  onToggleDisabled: () => void;
}

export function LabelsCard({
  open,
  disabled,
  onToggle,
  onRemove,
  onToggleDisabled,
}: Props) {
  return (
    <div className="group relative mb-1.5">
      <button
        type="button"
        onClick={onToggle}
        title="Labels"
        aria-label="Labels"
        className={[
          "flex h-10 w-10 items-center justify-center rounded font-mono text-base font-bold transition-colors",
          open
            ? "bg-stone-300 text-stone-900 hover:bg-stone-400"
            : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100",
          disabled ? "opacity-50 grayscale" : "",
        ].join(" ")}
      >
        T
      </button>
      <button
        type="button"
        onClick={onToggleDisabled}
        aria-label={disabled ? "Enable labels" : "Disable labels"}
        title={disabled ? "Enable labels" : "Disable labels"}
        className="pointer-events-none absolute -left-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-500 opacity-0 shadow-sm transition-opacity hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 group-hover:pointer-events-auto group-hover:opacity-100"
      >
        {disabled ? <EyeSlashIcon /> : <EyeIcon />}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove labels"
          title="Remove labels"
          className="pointer-events-none absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 bg-white font-mono text-xs leading-none text-stone-500 opacity-0 shadow-sm transition-opacity hover:border-red-300 hover:bg-red-50 hover:text-red-700 group-hover:pointer-events-auto group-hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}

