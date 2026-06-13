interface Props {
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function LabelsCard({ open, disabled, onToggle }: Props) {
  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={onToggle}
        title="Labels"
        aria-label="Labels"
        className={[
          "flex h-10 w-10 cursor-grab items-center justify-center rounded font-mono text-base font-bold transition-colors active:cursor-grabbing",
          open
            ? "bg-stone-300 text-stone-900 hover:bg-stone-400"
            : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100",
          disabled ? "opacity-50 grayscale" : "",
        ].join(" ")}
      >
        T
      </button>
    </div>
  );
}
