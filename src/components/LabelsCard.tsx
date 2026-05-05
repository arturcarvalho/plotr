interface Props {
  open: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}

export function LabelsCard({ open, onToggle, onRemove }: Props) {
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
            ? "bg-stone-100 text-stone-800 hover:bg-stone-200"
            : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100",
        ].join(" ")}
      >
        T
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove labels"
          title="Remove labels"
          className={[
            "absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 bg-white font-mono text-xs leading-none text-stone-500 shadow-sm transition-opacity hover:border-red-300 hover:bg-red-50 hover:text-red-700",
            open
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
