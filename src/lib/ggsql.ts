import init, { GgsqlContext } from "./ggsql-wasm/ggsql_wasm.js";
import wasmUrl from "./ggsql-wasm/ggsql_wasm_bg.wasm?url";

export interface SqlResult {
  columns: string[];
  rows: string[][];
  total_rows: number;
  truncated: boolean;
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
}

export const ggsql = new GgsqlManager();
