import { describe, expect, it } from "vitest";
import { linearSmoothFit, PENG, SMOOTH } from "./data";

describe("linearSmoothFit", () => {
  it("produces an increasing trend line for the penguin sample", () => {
    const { line } = SMOOTH;
    expect(line[line.length - 1].y).toBeGreaterThan(line[0].y);
  });

  it("emits steps+1 points across the data x-range", () => {
    const fit = linearSmoothFit(
      PENG.map((d) => ({ x: d.x, y: d.y })),
      40,
    );
    expect(fit.line).toHaveLength(41);
    expect(fit.line[0].x).toBe(Math.min(...PENG.map((d) => d.x)));
    expect(fit.line[40].x).toBe(Math.max(...PENG.map((d) => d.x)));
  });

  it("has a confidence band that brackets the line and is narrowest near the centre", () => {
    const { line, band } = SMOOTH;
    band.forEach((b, i) => {
      expect(b.lo).toBeLessThan(line[i].y);
      expect(b.hi).toBeGreaterThan(line[i].y);
    });
    const width = band.map((b) => b.hi - b.lo);
    const mid = Math.floor(width.length / 2);
    expect(width[mid]).toBeLessThan(width[0]);
    expect(width[mid]).toBeLessThan(width[width.length - 1]);
  });
});
