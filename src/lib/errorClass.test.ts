import { describe, expect, it } from "vitest";
import {
  dropAllRenderErrors,
  dropStaleChartErrors,
  isChartError,
  isUnrecoverableError,
  isWasmCrashError,
} from "./errorClass";

describe("isUnrecoverableError", () => {
  it("matches bare 'Chart error:' exactly", () => {
    expect(isUnrecoverableError("Chart error:")).toBe(true);
  });

  it("does NOT match 'Chart error: <body>' — those are usually recoverable validation errors", () => {
    expect(
      isUnrecoverableError(
        `Chart error: Execute error: ValidationError("Layer 3: Layer 'text' mapping requires the \`label\` aesthetic.")`,
      ),
    ).toBe(false);
    expect(
      isUnrecoverableError("Chart error: RuntimeError: out of memory"),
    ).toBe(false);
    expect(isUnrecoverableError("Chart error: foo")).toBe(false);
  });

  it("matches 'ggsql-wasm crashed' prefix", () => {
    expect(
      isUnrecoverableError(
        "ggsql-wasm crashed and re-init failed: foo. Please reload.",
      ),
    ).toBe(true);
    expect(
      isUnrecoverableError("ggsql-wasm crashed again after re-init. Reload."),
    ).toBe(true);
  });

  it("does NOT match unrelated errors", () => {
    expect(isUnrecoverableError("Failed to inspect 'foo': bar")).toBe(false);
    expect(isUnrecoverableError("Failed to load CSV 'x': bad bytes")).toBe(
      false,
    );
    expect(isUnrecoverableError("warning: something")).toBe(false);
  });

  it("prefix matchers reject suffix occurrences", () => {
    expect(
      isUnrecoverableError("Some error containing ggsql-wasm crashed text"),
    ).toBe(false);
  });

  it("handles empty string", () => {
    expect(isUnrecoverableError("")).toBe(false);
  });

  it("still returns false for 'Chart error: <body>' alongside isChartError", () => {
    // Regression guard: the banner CTA must not flip to "Reload page" for
    // ordinary validation errors. isChartError covers the auto-clear case;
    // isUnrecoverableError stays narrowly scoped to the bare-sentinel form
    // and "ggsql-wasm crashed" prefix.
    expect(isUnrecoverableError("Chart error: bad mapping")).toBe(false);
  });
});

describe("isWasmCrashError", () => {
  it("matches an OOB heap-overrun message", () => {
    expect(
      isWasmCrashError(
        new Error("RuntimeError: memory access out of bounds"),
      ),
    ).toBe(true);
    expect(isWasmCrashError("memory access out of bounds")).toBe(true);
  });

  it("matches an `unreachable` Rust-panic message", () => {
    expect(isWasmCrashError(new Error("unreachable executed"))).toBe(true);
    expect(isWasmCrashError("unreachable")).toBe(true);
  });

  it("matches a raw wasm RuntimeError by constructor name", () => {
    class RuntimeError extends Error {}
    // Body carries none of the substrings — the constructor name is the signal.
    expect(isWasmCrashError(new RuntimeError("boom"))).toBe(true);
  });

  it("does NOT match ordinary ggsql validation / data errors", () => {
    expect(
      isWasmCrashError(
        new Error(
          `ValidationError("Layer 1: aesthetic 'y' references non-existent column")`,
        ),
      ),
    ).toBe(false);
    expect(isWasmCrashError("no such table: pat_lab_users")).toBe(false);
    expect(isWasmCrashError("Failed to inspect 'foo': bar")).toBe(false);
    expect(isWasmCrashError("")).toBe(false);
  });
});

describe("isChartError", () => {
  it("matches bare 'Chart error:' exactly", () => {
    expect(isChartError("Chart error:")).toBe(true);
  });

  it("matches 'Chart error: <body>' — the common validation case", () => {
    expect(
      isChartError(
        `Chart error: Execute error: ValidationError("Layer 1: aesthetic 'y' references non-existent column 'duration'")`,
      ),
    ).toBe(true);
    expect(isChartError("Chart error: RuntimeError: out of memory")).toBe(true);
    expect(isChartError("Chart error: foo")).toBe(true);
  });

  it("does NOT match other error shapes", () => {
    expect(isChartError("ggsql-wasm crashed and re-init failed: x")).toBe(
      false,
    );
    expect(isChartError("Failed to inspect 'foo': bar")).toBe(false);
    expect(isChartError("Failed to load CSV 'x': bad bytes")).toBe(false);
    expect(isChartError("warning: something")).toBe(false);
    expect(isChartError("")).toBe(false);
  });

  it("rejects suffix / mid-string occurrences (prefix-only)", () => {
    expect(isChartError("Wrapped: Chart error: foo")).toBe(false);
  });
});

// These two `Array.filter` predicates (true = keep) name the two ways the
// render effect prunes stale messages. Centralising them keeps the subtle
// "drop recoverable chart errors but keep the wasm crash" vs "drop both"
// distinction a name instead of a boolean to re-parse at each call site.
describe("dropStaleChartErrors", () => {
  it("drops a recoverable 'Chart error: <body>' (stale validation message)", () => {
    expect(dropStaleChartErrors("Chart error: bad mapping")).toBe(false);
  });

  it("keeps the bare unrecoverable 'Chart error:' sentinel", () => {
    expect(dropStaleChartErrors("Chart error:")).toBe(true);
  });

  it("keeps an unrecoverable 'ggsql-wasm crashed' message", () => {
    expect(
      dropStaleChartErrors("ggsql-wasm crashed. Reload the page to recover."),
    ).toBe(true);
  });

  it("keeps non-chart errors (CSV / inspect failures, warnings)", () => {
    expect(dropStaleChartErrors("Failed to inspect 'foo': bar")).toBe(true);
    expect(dropStaleChartErrors("warning: something")).toBe(true);
  });
});

describe("dropAllRenderErrors", () => {
  it("drops a recoverable 'Chart error: <body>'", () => {
    expect(dropAllRenderErrors("Chart error: bad mapping")).toBe(false);
  });

  it("drops the bare 'Chart error:' sentinel", () => {
    expect(dropAllRenderErrors("Chart error:")).toBe(false);
  });

  it("drops an unrecoverable 'ggsql-wasm crashed' message", () => {
    expect(
      dropAllRenderErrors("ggsql-wasm crashed. Reload the page to recover."),
    ).toBe(false);
  });

  it("keeps non-render errors (CSV / inspect failures, warnings)", () => {
    expect(dropAllRenderErrors("Failed to inspect 'foo': bar")).toBe(true);
    expect(dropAllRenderErrors("warning: something")).toBe(true);
  });
});
