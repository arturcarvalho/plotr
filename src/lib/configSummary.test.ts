import { describe, expect, it } from "vitest";
import type { Layer } from "./buildQuery";
import { countConfiguredVariables } from "./configSummary";

const layer = (mappings: Layer["mappings"]): Layer => ({
  id: Math.random().toString(36).slice(2),
  draw: "AUTO",
  mappings,
});

describe("countConfiguredVariables", () => {
  it("returns 0 for a single empty layer and no shared mappings", () => {
    expect(countConfiguredVariables([layer({})], {})).toBe(0);
  });

  it("counts each set mapping in a layer", () => {
    expect(
      countConfiguredVariables([layer({ x: "a", y: "b" })], {}),
    ).toBe(2);
  });

  it("sums mappings across multiple layers", () => {
    expect(
      countConfiguredVariables(
        [layer({ x: "a", y: "b" }), layer({ color: "c" })],
        {},
      ),
    ).toBe(3);
  });

  it("includes shared mappings in the count", () => {
    expect(
      countConfiguredVariables([layer({ x: "a" })], { color: "c", size: "d" }),
    ).toBe(3);
  });

  it("skips empty-string values", () => {
    expect(
      countConfiguredVariables([layer({ x: "a", y: "" })], { color: "" }),
    ).toBe(1);
  });

  it("counts disabled layers' mappings too", () => {
    expect(
      countConfiguredVariables(
        [{ ...layer({ x: "a", y: "b" }), disabled: true }],
        {},
      ),
    ).toBe(2);
  });

  it("counts facet and geom-specific mapping slots", () => {
    expect(
      countConfiguredVariables(
        [layer({ facet_col: "g", label: "lab", ymin: "lo", ymax: "hi" })],
        {},
      ),
    ).toBe(4);
  });
});
