import { useState } from "react";

interface Props {
  query: string | null;
}

export function GGSQLPanel({ query }: Props) {
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

  // Split the leading `-- ...` header line off so it can be rendered dimmer
  // than the rest of the query without altering the underlying string. Copy
  // via the icon still ships the raw `query`; user-driven text selection
  // inside <pre> still picks up the dimmed line because it's a child of the
  // same selectable region.
  const newlineIdx = query?.indexOf("\n") ?? -1;
  const hasHeader = !!query && query.startsWith("-- ") && newlineIdx >= 0;
  const headerLine = hasHeader ? query!.slice(0, newlineIdx) : null;
  const body = hasHeader ? query!.slice(newlineIdx + 1) : query;

  return (
    <div className="flex h-full w-full flex-col bg-app-chrome text-stone-500">
      <header className="flex select-none items-center gap-1.5 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-stone-500">
          ggsql
        </span>
        <button
          type="button"
          onClick={onCopy}
          disabled={!query}
          aria-label={copied ? "Copied" : "Copy ggsql"}
          title={copied ? "Copied" : "Copy ggsql"}
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
        {query ? (
          <>
            {headerLine && (
              <>
                <span className="text-stone-400">{headerLine}</span>
                {"\n"}
              </>
            )}
            {body}
          </>
        ) : (
          <span className="select-none italic text-stone-400">
            (drag variables to generate ggsql)
          </span>
        )}
      </pre>
    </div>
  );
}
