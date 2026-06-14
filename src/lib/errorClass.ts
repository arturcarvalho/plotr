/** Errors that need a page reload to recover from. The chart-error banner
 *  swaps its CTA from "View" to "Reload page" when at least one currently-
 *  displayed error matches one of these patterns.
 *
 *  Two match kinds:
 *  - `exact`: full-string equality. Use for sentinel messages that, with no
 *    body, can't be interpreted as a recoverable user / data problem.
 *  - `prefix`: `String.startsWith` match. Use for fixed-stem messages whose
 *    body varies (e.g. our explicit "ggsql-wasm crashed …" set after the
 *    in-place re-init recovery is exhausted).
 *
 *  `Chart error: <body>` messages are NOT unrecoverable — they're usually
 *  ggsql validation errors (bad mapping, missing aesthetic) that the user
 *  fixes by adjusting the chart, no reload required. Only the bare
 *  `Chart error:` form (no body, currently never produced) trips this list.
 *
 *  Extend here when new unrecoverable shapes appear. */
type UnrecoverableMatcher =
  | { readonly kind: "exact"; readonly text: string }
  | { readonly kind: "prefix"; readonly text: string };

const UNRECOVERABLE_ERROR_MATCHERS: readonly UnrecoverableMatcher[] = [
  { kind: "exact", text: "Chart error:" },
  { kind: "prefix", text: "ggsql-wasm crashed" },
];

export function isUnrecoverableError(msg: string): boolean {
  return UNRECOVERABLE_ERROR_MATCHERS.some((m) =>
    m.kind === "exact" ? msg === m.text : msg.startsWith(m.text),
  );
}

/** Matches any `Chart error:` message — the bare sentinel form and the
 *  common `Chart error: <body>` validation / runtime messages. Use this to
 *  decide whether a previously-displayed message is *stale* once the chart
 *  next renders successfully (or the next chart error supersedes it).
 *
 *  Distinct from `isUnrecoverableError`: every `Chart error:` is a chart
 *  error, but only the bare sentinel form is unrecoverable. Keeping the two
 *  predicates separate avoids flipping the banner CTA to "Reload page" on
 *  ordinary validation errors. */
const CHART_ERROR_PREFIX = "Chart error:";

export function isChartError(msg: string): boolean {
  return msg.startsWith(CHART_ERROR_PREFIX);
}

/** `Array.filter` predicate (true = keep) for pruning *stale* chart errors:
 *  drop recoverable `Chart error: <body>` messages tied to an earlier query,
 *  but keep unrecoverable ones (bare sentinel / "ggsql-wasm crashed") and any
 *  non-chart error. Used when the current query yields nothing to draw. */
export const dropStaleChartErrors = (msg: string): boolean =>
  !isChartError(msg) || isUnrecoverableError(msg);

/** `Array.filter` predicate (true = keep) for clearing *every* render error —
 *  both chart errors and unrecoverable messages — once a frame draws (or a new
 *  render error supersedes them). Leaves non-render errors (CSV / inspect
 *  failures) untouched. */
export const dropAllRenderErrors = (msg: string): boolean =>
  !isUnrecoverableError(msg) && !isChartError(msg);

/** A hard ggsql-wasm crash: the wasm linear memory is corrupted (heap OOB,
 *  a Rust `unreachable` panic, or a raw wasm `RuntimeError`). ggsql-wasm
 *  throws these under rapid / multi-layer `execute()` calls. Unlike a chart
 *  validation error, the user can't fix it by editing the chart — only a full
 *  page reload rebuilds a clean runtime, so the chart pane warns and offers a
 *  "Reload page" action instead of silently resetting. */
export function isWasmCrashError(e: unknown): boolean {
  const msg = String(e);
  return (
    msg.includes("memory access out of bounds") ||
    msg.includes("unreachable") ||
    (e instanceof Error && e.constructor.name === "RuntimeError")
  );
}
