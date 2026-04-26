import { useEffect, useRef, useState } from "react";
import vegaEmbed from "vega-embed";
import { Warn } from "vega";
import { ggsql, type SqlResult } from "./lib/ggsql";
import { Editor } from "./components/Editor";
import { Viz } from "./components/Viz";
import { Errors } from "./components/Errors";

const DEFAULT_QUERY = `VISUALISE FROM ggsql:penguins
DRAW bar
  MAPPING species AS x`;

const DEBOUNCE_MS = 300;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderTable(data: SqlResult): string {
  const ths = data.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
  const bodyRows = data.rows
    .map(
      (row) =>
        `<tr>${row.map((v) => `<td>${escapeHtml(v ?? "")}</td>`).join("")}</tr>`,
    )
    .join("");
  const truncationRow = data.truncated
    ? `<tr class="truncation-row"><td colspan="${data.columns.length}">Showing ${data.rows.length} of ${data.total_rows} rows</td></tr>`
    : "";
  return `<table class="ggsql-table"><thead><tr>${ths}</tr></thead><tbody>${bodyRows}${truncationRow}</tbody></table>`;
}

export default function App() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isEmpty, setIsEmpty] = useState(false);
  const vizRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ggsql
      .initialize()
      .then(() => setReady(true))
      .catch((e) => setErrors([`Failed to initialise ggsql-wasm: ${e}`]));
  }, []);

  useEffect(() => {
    if (!ready) return;
    const handle = window.setTimeout(async () => {
      const q = query.trim();
      if (!q) {
        if (vizRef.current) vizRef.current.innerHTML = "";
        setErrors([]);
        setWarnings([]);
        setIsEmpty(true);
        return;
      }
      try {
        if (ggsql.hasVisual(q)) {
          const spec = JSON.parse(ggsql.execute(q));
          setIsEmpty(false);

          const collected: string[] = [];
          let level = Warn;
          const logger = {
            level(l?: number) {
              if (l !== undefined) {
                level = l;
                return this;
              }
              return level;
            },
            error: (...args: unknown[]) => {
              console.error(...args);
              return logger;
            },
            warn: (...args: unknown[]) => {
              collected.push(args.map(String).join(" "));
              return logger;
            },
            info: () => logger,
            debug: () => logger,
          };

          if (vizRef.current) {
            vizRef.current.innerHTML = "";
            await vegaEmbed(vizRef.current, spec, {
              actions: { export: true, source: false, compiled: false, editor: false },
              renderer: "svg",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              logger: logger as any,
            });
          }
          setWarnings(collected);
          setErrors([]);
        } else {
          const result = ggsql.executeSql(q);
          if (vizRef.current) vizRef.current.innerHTML = renderTable(result);
          setIsEmpty(false);
          setErrors([]);
          setWarnings([]);
        }
      } catch (e) {
        setErrors([String(e)]);
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query, ready]);

  return (
    <div className="flex h-screen w-screen flex-col bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <h1 className="font-mono text-sm font-semibold text-slate-700">
          plotr — ggsql playground
        </h1>
        <span className="font-mono text-xs text-slate-500">
          {ready ? "ready" : "loading wasm…"}
        </span>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-slate-200">
          <section className="min-h-0 overflow-hidden">
            <Editor value={query} onChange={setQuery} />
          </section>
          <section className="min-h-0 overflow-auto bg-white">
            <Viz ref={vizRef} empty={isEmpty} />
          </section>
        </div>

        <div className="h-40 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5">
            <span className="font-mono text-xs font-semibold text-slate-600">
              Problems
            </span>
            <span className="font-mono text-xs text-slate-400">
              {errors.length} error{errors.length === 1 ? "" : "s"} ·{" "}
              {warnings.length} warning{warnings.length === 1 ? "" : "s"}
            </span>
          </div>
          <Errors errors={errors} warnings={warnings} />
        </div>
      </main>
    </div>
  );
}
