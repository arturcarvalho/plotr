import { forwardRef } from "react";

interface Props {
  hasError: boolean;
  /** Chart-error banner is in the unrecoverable wasm-crash state. The CTA
   *  swaps from "View" (jump to Problems tab) to "Reload page" (location
   *  reload — the only path back once ggsql-wasm is corrupted past recovery). */
  unrecoverable?: boolean;
  onShowProblems: () => void;
  onReload: () => void;
}

export const Viz = forwardRef<HTMLDivElement, Props>(
  ({ hasError, unrecoverable, onShowProblems, onReload }, ref) => {
    return (
      <div className="relative h-full w-full overflow-hidden">
        <div ref={ref} className="absolute inset-0 overflow-hidden p-4" />
        {hasError && (
          <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 font-mono text-xs text-red-800 shadow-sm">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <line x1="12" y1="16" x2="12" y2="16" />
            </svg>
            <span>Chart error</span>
            {unrecoverable ? (
              <button
                type="button"
                onClick={onReload}
                className="rounded border border-red-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-100"
              >
                Reload page
              </button>
            ) : (
              <button
                type="button"
                onClick={onShowProblems}
                className="rounded border border-red-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-100"
              >
                View
              </button>
            )}
          </div>
        )}
      </div>
    );
  },
);
Viz.displayName = "Viz";
