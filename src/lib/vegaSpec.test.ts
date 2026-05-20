import { describe, expect, it } from "vitest";
import { formatVegaSpec } from "./vegaSpec";

describe("formatVegaSpec", () => {
  it("pretty-prints a Vega-Lite spec with 2-space indent", () => {
    const spec = { $schema: "vega-lite/v5", mark: "bar" };
    expect(formatVegaSpec(spec)).toBe(
      '{\n  "$schema": "vega-lite/v5",\n  "mark": "bar"\n}',
    );
  });

  it("returns null for null", () => {
    expect(formatVegaSpec(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(formatVegaSpec(undefined)).toBeNull();
  });

  it("formats an empty object as '{}'", () => {
    // Empty object is a valid (if useless) spec — the caller decides whether
    // to display it. We distinguish "no spec yet" (null) from "empty spec".
    expect(formatVegaSpec({})).toBe("{}");
  });

  it("preserves nested structure (sanity)", () => {
    const spec = {
      mark: "point",
      encoding: {
        x: { field: "bill_len", type: "quantitative" },
        y: { field: "bill_dep", type: "quantitative" },
      },
    };
    const out = formatVegaSpec(spec);
    expect(out).not.toBeNull();
    // Round-trip parses back to the same object — JSON.stringify shape is
    // not load-bearing beyond "pretty + valid JSON".
    expect(JSON.parse(out!)).toEqual(spec);
    // And the 2-space indent is visible.
    expect(out).toContain('\n  "mark": "point",');
    expect(out).toContain('\n    "x": {');
  });
});
