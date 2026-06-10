import { forwardRef } from "react";
import type { ColumnKind } from "../lib/ggsql";
import { ColumnKindBadge } from "./ColumnKindBadge";

interface NoDataVariable {
  name: string;
  kind: ColumnKind | null;
}

interface Props {
  hasError: boolean;
  /** The error text shown in place of the chart. */
  errorText?: string;
  /** Unrecoverable wasm-crash state — adds a "Reload page" action (a location
   *  reload is the only path back once ggsql-wasm is corrupted past recovery). */
  unrecoverable?: boolean;
  onReload: () => void;
}

export const Viz = forwardRef<HTMLDivElement, Props>(
  ({ hasError, errorText, unrecoverable, onReload }, ref) => {
    return (
      <div className="relative h-full w-full overflow-hidden">
        <div ref={ref} className="absolute inset-0 overflow-hidden p-4" />
        {hasError && (
          <div className="absolute inset-0 flex items-start justify-center overflow-auto p-4">
            <div className="max-w-full rounded-md border border-red-300 bg-red-50 px-4 py-3 font-mono text-xs text-red-800 shadow-sm">
              <div className="mb-1.5 flex items-center gap-2 font-semibold">
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
              </div>
              {errorText && (
                <pre className="whitespace-pre-wrap break-words leading-relaxed text-red-700">
                  {errorText}
                </pre>
              )}
              {unrecoverable && (
                <button
                  type="button"
                  onClick={onReload}
                  className="mt-2 rounded border border-red-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-100"
                >
                  Reload page
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);
Viz.displayName = "Viz";

/**
 * "No data selected" card rendered at the section level when the chart is
 * configured but no CSV is loaded. The whole right-hand area collapses to just
 * this card. Uses `bg-stone-50` (a dimmed off-white) and no shadow so it sits
 * gently on the stone-100 app chrome instead of competing with the rest of the
 * UI. Variables whose `kind` is null render as plain names.
 */
export function NoDataCard({ variables }: { variables: NoDataVariable[] }) {
  return (
    <div className="max-w-xs space-y-3 rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 font-mono text-xs text-stone-700">
      <div className="font-semibold text-stone-800">No data selected</div>
      {variables.length > 0 && (
        <>
          <div className="text-stone-500">A chart is defined, but the data is missing. The chart needs:</div>
          <ul className="space-y-1">
            {variables.map((v) => (
              <li key={v.name} className="flex items-center gap-2">
                <ColumnKindBadge kind={v.kind} />
                <span className="truncate" title={v.name}>
                  {v.name}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="text-stone-500">
        Choose data in the sidebar to render the chart.
      </div>
    </div>
  );
}
