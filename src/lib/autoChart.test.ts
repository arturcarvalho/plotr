import { describe, expect, it } from "vitest";
import type { ColumnInfo } from "./ggsql";
import type { Layer } from "./buildQuery";
import {
  AUTO,
  columnAxisKind,
  compatibleDraws,
  defaultDraw,
  resolveDraw,
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

describe("compatibleDraws", () => {
  it("continuous,empty includes histogram/boxplot/violin/density", () => {
    const r = compatibleDraws("continuous", "empty");
    expect(r).toEqual(
      expect.arrayContaining(["histogram", "boxplot", "violin", "density"]),
    );
    expect(r).toHaveLength(4);
  });
  it("discrete,continuous includes bar/boxplot/point/violin/text", () => {
    const r = compatibleDraws("discrete", "continuous");
    expect(r).toEqual(
      expect.arrayContaining(["bar", "boxplot", "point", "violin", "text"]),
    );
    expect(r).toHaveLength(5);
  });
  it("continuous,continuous has 6 draws including point", () => {
    const r = compatibleDraws("continuous", "continuous");
    expect(r).toContain("point");
    expect(r).toHaveLength(6);
  });
  it("empty,empty returns []", () => {
    expect(compatibleDraws("empty", "empty")).toEqual([]);
  });
  it("time,time returns [] (not in table)", () => {
    expect(compatibleDraws("time", "time")).toEqual([]);
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
});
