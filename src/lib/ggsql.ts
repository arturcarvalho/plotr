import init, {
  GgsqlContext,
  __plotr_reset,
} from "./ggsql-wasm/ggsql_wasm.js";
import wasmUrl from "./ggsql-wasm/ggsql_wasm_bg.wasm?url";

export interface SqlResult {
  columns: string[];
  rows: string[][];
  total_rows: number;
  truncated: boolean;
}

export type ColumnKind = "numeric" | "string" | "bool" | "date";

export interface ColumnInfo {
  name: string;
  kind: ColumnKind;
}

class GgsqlManager {
  private context: GgsqlContext | null = null;
  private initPromise: Promise<void> | null = null;

  initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      await init({ module_or_path: wasmUrl });
      this.context = new GgsqlContext();
      await this.context.register_builtin_datasets();
    })();
    return this.initPromise;
  }

  /** Tear the wasm runtime down and rebuild it from scratch. Used by the
   *  chart-render recovery path: after a wasm crash (OOB / unreachable Rust
   *  panic) the runtime state is corrupted and a plain `initialize()` would
   *  just return the cached resolved promise. We call `__plotr_reset()` —
   *  a patched export on `ggsql_wasm.js` (see MANUAL.md bumping section) —
   *  to clear the bindgen module's private `wasm`/`wasmModule` refs, then
   *  re-run `init(...)` which re-fetches and re-instantiates the wasm bytes.
   *  The next `new GgsqlContext()` allocates in the fresh wasm memory. */
  async reinitialize(): Promise<void> {
    this.context = null;
    this.initPromise = null;
    __plotr_reset();
    await this.initialize();
  }

  private ctx(): GgsqlContext {
    if (!this.context) throw new Error("GgsqlManager not initialized");
    return this.context;
  }

  hasVisual(query: string): boolean {
    return this.ctx().has_visual(query);
  }

  execute(query: string): string {
    return this.ctx().execute(query);
  }

  executeSql(query: string): SqlResult {
    return JSON.parse(this.ctx().execute_sql(query));
  }

  listTables(): string[] {
    return Array.from(this.ctx().list_tables() as Iterable<string>);
  }

  registerCsv(name: string, bytes: Uint8Array): void {
    this.ctx().register_csv(name, bytes);
  }

  describeColumns(table: string): ColumnInfo[] {
    const sample = this.executeSql(`SELECT * FROM ${table} LIMIT 100`);
    return sample.columns.map((name, idx) => ({
      name,
      kind: classify(sample.rows.map((r) => r[idx])),
    }));
  }
}

function classify(values: (string | null | undefined)[]): ColumnKind {
  const nonNull = values
    .filter(
      (v): v is string =>
        v !== null && v !== undefined && v !== "" && v !== "null",
    )
    .map(unquote);
  if (nonNull.length === 0) return "string";

  if (nonNull.every((v) => Number.isFinite(Number(v)))) return "numeric";

  const lc = (v: string) => v.toLowerCase();
  if (nonNull.every((v) => lc(v) === "true" || lc(v) === "false")) {
    return "bool";
  }

  const dateLike = /^\d{4}-\d{2}-\d{2}/;
  if (
    nonNull.every(
      (v) => dateLike.test(v) && !Number.isNaN(new Date(v).getTime()),
    )
  ) {
    return "date";
  }

  return "string";
}

function unquote(v: string): string {
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1);
  }
  return v;
}

export const ggsql = new GgsqlManager();
