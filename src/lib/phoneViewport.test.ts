import { describe, expect, it } from "vitest";
import { isPhoneViewportWidth } from "./phoneViewport";

describe("phone viewport detection", () => {
  it("treats widths below 768px as phone viewports", () => {
    expect(isPhoneViewportWidth(767)).toBe(true);
    expect(isPhoneViewportWidth(390)).toBe(true);
  });

  it("treats 768px and wider as non-phone viewports", () => {
    expect(isPhoneViewportWidth(768)).toBe(false);
    expect(isPhoneViewportWidth(1024)).toBe(false);
  });
});
