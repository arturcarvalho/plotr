import { useState } from "react";

interface Props {
  query: string | null;
}

export function CodePanel({ query }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!query) return;
    try {
      await navigator.clipboard.writeText(query);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore — clipboard may be denied */
    }
  };

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col bg-slate-50 text-slate-500">
      <header className="flex items-center gap-1.5 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
          ggsql
        </span>
        <button
          type="button"
          onClick={onCopy}
          disabled={!query}
          aria-label={copied ? "Copied" : "Copy ggsql"}
          title={copied ? "Copied" : "Copy ggsql"}
          className="rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
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
        {query ?? (
          <span className="italic text-slate-400">
            (drag variables to generate ggsql)
          </span>
        )}
      </pre>
    </aside>
  );
}
