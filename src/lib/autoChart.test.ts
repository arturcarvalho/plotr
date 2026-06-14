import { describe, expect, it } from "vitest";
import type { ColumnInfo } from "./ggsql";
import type { Layer } from "./buildQuery";
import {
  AUTO,
  columnAxisKind,
  compatibleDraws,
  defaultDraw,
  drawRequirements,
  resolveDraw,
  resolveMappingKind,
} from "./autoChart";

const COLUMNS: ColumnInfo[] = [
  { name: "bill_len", kind: "numeric" },
  { name: "species", kind: "string" },
  { name: "alive", kind: "bool" },
  { name: "born_at", kind: "date" },
];

describe("AUTO constant", () => {
  it("equals 'auto'", () => {
    expect(AUTO).toBe("auto");
  });
});

describe("columnAxisKind", () => {
  it("returns empty for undefined", () => {
    expect(columnAxisKind(COLUMNS, undefined)).toBe("empty");
  });
  it("returns empty for unknown column", () => {
    expect(columnAxisKind(COLUMNS, "nope")).toBe("empty");
  });
  it("maps numeric → continuous", () => {
    expect(columnAxisKind(COLUMNS, "bill_len")).toBe("continuous");
  });
  it("maps string → discrete", () => {
    expect(columnAxisKind(COLUMNS, "species")).toBe("discrete");
  });
  it("maps bool → discrete", () => {
    expect(columnAxisKind(COLUMNS, "alive")).toBe("discrete");
  });
  it("maps date → time", () => {
    expect(columnAxisKind(COLUMNS, "born_at")).toBe("time");
  });
});

describe("resolveMappingKind", () => {
  it("returns fixed for undefined", () => {
    expect(resolveMappingKind(COLUMNS, undefined)).toBe("fixed");
  });
  it("returns fixed for unknown column", () => {
    expect(resolveMappingKind(COLUMNS, "nope")).toBe("fixed");
  });
  it("maps numeric → continuous", () => {
    expect(resolveMappingKind(COLUMNS, "bill_len")).toBe("continuous");
  });
  it("maps date → continuous", () => {
    expect(resolveMappingKind(COLUMNS, "born_at")).toBe("continuous");
  });
  it("maps string → discrete", () => {
    expect(resolveMappingKind(COLUMNS, "species")).toBe("discrete");
  });
  it("maps bool → discrete", () => {
    expect(resolveMappingKind(COLUMNS, "alive")).toBe("discrete");
  });
});

describe("compatibleDraws", () => {
  it("continuous,empty includes histogram + density + ribbon + range + rule", () => {
    const r = compatibleDraws("continuous", "empty");
    expect(r).toEqual(
      expect.arrayContaining([
        "histogram",
        "density",
        "ribbon",
        "range",
        "rule",
      ]),
    );
    // boxplot + violin require y per ggsql; intentionally excluded.
    expect(r).not.toContain("boxplot");
    expect(r).not.toContain("violin");
    expect(r).toHaveLength(5);
  });
  it("discrete,continuous includes bar/boxplot/point/violin/text + range", () => {
    const r = compatibleDraws("discrete", "continuous");
    expect(r).toEqual(
      expect.arrayContaining([
        "bar",
        "boxplot",
        "point",
        "violin",
        "text",
        "range",
      ]),
    );
    expect(r).toHaveLength(6);
  });
  it("continuous,continuous has 8 draws including point + ribbon + range", () => {
    const r = compatibleDraws("continuous", "continuous");
    expect(r).toContain("point");
    expect(r).toContain("ribbon");
    expect(r).toContain("range");
    expect(r).toHaveLength(8);
  });
  it("discrete,discrete includes tile/text/point", () => {
    const r = compatibleDraws("discrete", "discrete");
    expect(r).toEqual(expect.arrayContaining(["tile", "text", "point"]));
    // default still tile (point/text remain compatible-only)
    expect(defaultDraw("discrete", "discrete")).toBe("tile");
  });
  it("empty,empty returns []", () => {
    expect(compatibleDraws("empty", "empty")).toEqual([]);
  });
  it("time,time returns [] (not in table)", () => {
    expect(compatibleDraws("time", "time")).toEqual([]);
  });
  it("empty,empty + discrete fill includes pie", () => {
    expect(compatibleDraws("empty", "empty", "discrete")).toContain("pie");
  });
  it("empty,empty + continuous fill excludes pie (pie wants discrete)", () => {
    expect(compatibleDraws("empty", "empty", "continuous")).not.toContain(
      "pie",
    );
  });
  it("empty,empty + time fill excludes pie", () => {
    expect(compatibleDraws("empty", "empty", "time")).not.toContain("pie");
  });
  it("empty,empty + no fill excludes pie", () => {
    expect(compatibleDraws("empty", "empty", "empty")).not.toContain("pie");
  });
  it("empty,empty default arg (no fill) returns []", () => {
    expect(compatibleDraws("empty", "empty")).toEqual([]);
  });
  it("continuous,continuous never includes pie regardless of fill", () => {
    expect(
      compatibleDraws("continuous", "continuous", "discrete"),
    ).not.toContain("pie");
  });
});

describe("defaultDraw", () => {
  it("continuous,empty → histogram", () => {
    expect(defaultDraw("continuous", "empty")).toBe("histogram");
  });
  it("discrete,continuous → bar", () => {
    expect(defaultDraw("discrete", "continuous")).toBe("bar");
  });
  it("continuous,continuous → point", () => {
    expect(defaultDraw("continuous", "continuous")).toBe("point");
  });
  it("discrete,discrete → tile", () => {
    expect(defaultDraw("discrete", "discrete")).toBe("tile");
  });
  it("empty,empty → null", () => {
    expect(defaultDraw("empty", "empty")).toBeNull();
  });
  it("time,time → null", () => {
    expect(defaultDraw("time", "time")).toBeNull();
  });
  it("empty,empty + discrete fill → pie", () => {
    expect(defaultDraw("empty", "empty", "discrete")).toBe("pie");
  });
  it("empty,empty + continuous fill → null (pie wants discrete)", () => {
    expect(defaultDraw("empty", "empty", "continuous")).toBeNull();
  });
  it("empty,empty + time fill → null (pie wants discrete)", () => {
    expect(defaultDraw("empty", "empty", "time")).toBeNull();
  });
  it("empty,empty + no fill → null", () => {
    expect(defaultDraw("empty", "empty", "empty")).toBeNull();
  });
  it("empty,continuous → null (ggsql line/area need X)", () => {
    expect(defaultDraw("empty", "continuous")).toBeNull();
  });
  it("empty,continuous compatibles contains only rule (Y-only intercept)", () => {
    expect(compatibleDraws("empty", "continuous")).toEqual(["rule"]);
  });
});

describe("resolveDraw", () => {
  const layer = (draw: string, x?: string, y?: string): Layer => ({
    id: "L1",
    draw,
    mappings: { ...(x ? { x } : {}), ...(y ? { y } : {}) },
  });

  it("auto + numeric x → histogram", () => {
    expect(resolveDraw(layer(AUTO, "bill_len"), COLUMNS)).toBe("histogram");
  });
  it("auto + numeric x + numeric y → point", () => {
    expect(resolveDraw(layer(AUTO, "bill_len", "bill_len"), COLUMNS)).toBe(
      "point",
    );
  });
  it("auto + no mappings → null", () => {
    expect(resolveDraw(layer(AUTO), COLUMNS)).toBeNull();
  });
  it("concrete draw passes through", () => {
    expect(resolveDraw(layer("smooth", "bill_len", "bill_len"), COLUMNS)).toBe(
      "smooth",
    );
  });
  it("auto + string x → bar", () => {
    expect(resolveDraw(layer(AUTO, "species"), COLUMNS)).toBe("bar");
  });
  it("auto + date x + numeric y → line", () => {
    expect(resolveDraw(layer(AUTO, "born_at", "bill_len"), COLUMNS)).toBe(
      "line",
    );
  });

  it("auto + no own mappings + shared x,y → resolves from shared", () => {
    expect(
      resolveDraw(layer(AUTO), COLUMNS, { x: "bill_len", y: "bill_len" }),
    ).toBe("point");
  });

  it("auto + own x overrides shared x", () => {
    expect(
      resolveDraw(layer(AUTO, "species"), COLUMNS, { x: "bill_len" }),
    ).toBe("bar");
  });

  it("auto + only discrete fill mapped → pie", () => {
    const fillOnly: Layer = {
      id: "L1",
      draw: AUTO,
      mappings: { fill: "species" },
    };
    expect(resolveDraw(fillOnly, COLUMNS)).toBe("pie");
  });

  it("auto + only continuous fill → null (pie restricted to discrete)", () => {
    const fillOnly: Layer = {
      id: "L1",
      draw: AUTO,
      mappings: { fill: "bill_len" },
    };
    expect(resolveDraw(fillOnly, COLUMNS)).toBeNull();
  });

  it("auto + fill via shared, no own → pie", () => {
    const noOwn: Layer = { id: "L1", draw: AUTO, mappings: {} };
    expect(resolveDraw(noOwn, COLUMNS, { fill: "species" })).toBe("pie");
  });

  it("auto + fill + numeric x → not pie (x wins)", () => {
    const xAndFill: Layer = {
      id: "L1",
      draw: AUTO,
      mappings: { x: "bill_len", fill: "species" },
    };
    // x: continuous, y: empty → histogram (existing default), not pie
    expect(resolveDraw(xAndFill, COLUMNS)).toBe("histogram");
  });
});

describe("drawRequirements", () => {
  it("returns [] for an unknown draw", () => {
    expect(drawRequirements("nonexistent")).toEqual([]);
  });

  it("pie → single entry, default, requires discrete fill", () => {
    const reqs = drawRequirements("pie");
    expect(reqs).toEqual([{ parts: ["Fill discrete"], isDefault: true }]);
  });

  it("histogram → 2 entries (continuous x, time x), both default", () => {
    const reqs = drawRequirements("histogram");
    expect(reqs).toHaveLength(2);
    expect(reqs).toEqual(
      expect.arrayContaining([
        { parts: ["X continuous"], isDefault: true },
        { parts: ["X time"], isDefault: true },
      ]),
    );
  });

  it("bar → 6 entries; first 4 default, last 2 compatible", () => {
    const reqs = drawRequirements("bar");
    expect(reqs).toHaveLength(6);
    // spot checks
    expect(reqs).toEqual(
      expect.arrayContaining([
        { parts: ["X discrete"], isDefault: true },
        { parts: ["Y discrete"], isDefault: true },
        { parts: ["X continuous", "Y discrete"], isDefault: true },
        { parts: ["X discrete", "Y continuous"], isDefault: true },
        { parts: ["X time"], isDefault: false },
        { parts: ["X time", "Y continuous"], isDefault: false },
      ]),
    );
  });

  it("point continuous,continuous → default", () => {
    const reqs = drawRequirements("point");
    expect(reqs).toContainEqual({
      parts: ["X continuous", "Y continuous"],
      isDefault: true,
    });
  });

  it("point discrete,discrete is compatible (not default)", () => {
    const reqs = drawRequirements("point");
    expect(reqs).toContainEqual({
      parts: ["X discrete", "Y discrete"],
      isDefault: false,
    });
  });
});
