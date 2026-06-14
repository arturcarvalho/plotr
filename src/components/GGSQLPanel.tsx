import { CopyButton } from "./CopyButton";

interface Props {
  query: string | null;
}

export function GGSQLPanel({ query }: Props) {
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
        <CopyButton text={query} label="ggsql" />
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
