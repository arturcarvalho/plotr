interface Props {
  open: boolean;
  onToggle: () => void;
}

export function LabelsCard({ open, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "flex w-full items-center justify-between rounded px-3 py-2 font-mono text-xs transition-colors",
        open
          ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
      ].join(" ")}
    >
      <span>Labels</span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={open ? "text-slate-300" : "text-slate-500"}
        aria-hidden
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}
