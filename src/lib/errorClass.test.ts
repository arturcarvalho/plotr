import { describe, expect, it } from "vitest";
import { isChartError, isUnrecoverableError } from "./errorClass";

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
