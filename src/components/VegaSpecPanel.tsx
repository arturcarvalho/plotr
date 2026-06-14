import { formatVegaSpec } from "../lib/vegaSpec";
import { CopyButton } from "./CopyButton";

interface Props {
  spec: unknown;
}

export function VegaSpecPanel({ spec }: Props) {
  const formatted = formatVegaSpec(spec);

  return (
    <div className="flex h-full w-full flex-col bg-app-chrome text-stone-500">
      <header className="flex items-center gap-1.5 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-stone-500">
          vega-lite
        </span>
        <CopyButton text={formatted} label="Vega-Lite spec" />
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
