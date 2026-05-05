interface Props {
  show: boolean;
}

export function DeleteBanner({ show }: Props) {
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-center justify-center gap-2 rounded-md border border-dashed border-red-400 bg-red-50 px-3 py-1.5 font-mono text-xs text-red-700 shadow-sm">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
      <span>Release to remove</span>
    </div>
  );
}
