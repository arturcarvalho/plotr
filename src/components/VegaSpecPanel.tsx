import { useState } from "react";
import { formatVegaSpec } from "../lib/vegaSpec";

interface Props {
  spec: unknown;
}

export function VegaSpecPanel({ spec }: Props) {
  const [copied, setCopied] = useState(false);
  const formatted = formatVegaSpec(spec);

  const onCopy = async () => {
    if (!formatted) return;
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore — clipboard may be denied */
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-app-chrome text-stone-500">
      <header className="flex items-center gap-1.5 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-stone-500">
          vega-lite
        </span>
        <button
          type="button"
          onClick={onCopy}
          disabled={!formatted}
          aria-label={copied ? "Copied" : "Copy Vega-Lite spec"}
          title={copied ? "Copied" : "Copy Vega-Lite spec"}
          className="rounded p-0.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copied ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>
      </header>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words px-3 pb-3 font-mono text-xs leading-relaxed">
        {formatted ?? (
          <span className="italic text-stone-400">
            (spec appears here once the chart renders)
          </span>
        )}
      </pre>
    </div>
  );
}
