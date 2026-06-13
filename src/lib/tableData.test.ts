import { describe, expect, it } from "vitest";
import { displayCell, filterRows, sortRows, unquote } from "./tableData";

const rows = [
  ['"Adelie"', "39.1", '"Torgersen"'],
  ['"Gentoo"', "47.5", '"Biscoe"'],
  ['"Chinstrap"', "46.5", '"Dream"'],
  ['"Adelie"', "null", '"Dream"'],
];

describe("unquote", () => {
  it("strips one layer of surrounding double quotes", () => {
    expect(unquote('"abc"')).toBe("abc");
    expect(unquote("abc")).toBe("abc");
    expect(unquote('"')).toBe('"');
  });
});

describe("displayCell", () => {
  it("unquotes values and blanks null-ish cells", () => {
    expect(displayCell('"Adelie"')).toBe("Adelie");
    expect(displayCell("42")).toBe("42");
    expect(displayCell("null")).toBe("");
    expect(displayCell(null)).toBe("");
    expect(displayCell(undefined)).toBe("");
    expect(displayCell("")).toBe("");
  });
});

describe("filterRows", () => {
  it("matches case-insensitively across all cells, on unquoted values", () => {
    expect(filterRows(rows, "gentoo")).toHaveLength(1);
    expect(filterRows(rows, "DREAM")).toHaveLength(2);
    expect(filterRows(rows, "47.5")).toHaveLength(1);
  });

  it("returns the same reference for an empty or whitespace query", () => {
    expect(filterRows(rows, "")).toBe(rows);
    expect(filterRows(rows, "   ")).toBe(rows);
  });

  it("returns [] when nothing matches", () => {
    expect(filterRows(rows, "zzz_nope")).toEqual([]);
  });
});

describe("sortRows", () => {
  it("sorts numerically for numeric columns", () => {
    const asc = sortRows(rows, 1, "asc", "numeric");
    expect(asc.map((r) => r[1])).toEqual(["39.1", "46.5", "47.5", "null"]);
    const desc = sortRows(rows, 1, "desc", "numeric");
    expect(desc.map((r) => r[1])).toEqual(["47.5", "46.5", "39.1", "null"]);
  });

  it("sorts strings lexically on unquoted values", () => {
    const asc = sortRows(rows, 0, "asc", "string");
    expect(asc.map((r) => displayCell(r[0]))).toEqual([
      "Adelie",
      "Adelie",
      "Chinstrap",
      "Gentoo",
    ]);
  });

  it("keeps empty cells last in both directions", () => {
    expect(sortRows(rows, 1, "asc", "numeric").at(-1)?.[1]).toBe("null");
    expect(sortRows(rows, 1, "desc", "numeric").at(-1)?.[1]).toBe("null");
  });

  it("does not mutate the input and keeps ties in input order", () => {
    const copy = rows.map((r) => [...r]);
    const sorted = sortRows(rows, 0, "asc", "string");
    expect(rows).toEqual(copy);
    expect(sorted).not.toBe(rows);
    // The two Adelie rows keep their relative order (stable sort).
    const adelies = sorted.filter((r) => r[0] === '"Adelie"');
    expect(adelies[0][1]).toBe("39.1");
    expect(adelies[1][1]).toBe("null");
  });
});
