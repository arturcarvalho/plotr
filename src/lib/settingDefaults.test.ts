import { describe, expect, it } from "vitest";
import {
  clampNotice,
  clampSettingValue,
  isDefaultSettingValue,
  normalizeSettingValue,
  settingConstraint,
} from "./settingDefaults";

describe("settingConstraint", () => {
  it("returns the per-geom numeric default", () => {
    expect(settingConstraint("line", "linewidth").default).toBe(1.5);
    expect(settingConstraint("point", "linewidth").default).toBe(1);
    expect(settingConstraint("smooth", "linewidth").default).toBe(2);
    expect(settingConstraint("bar", "width").default).toBe(0.9);
    expect(settingConstraint("range", "width").default).toBe(10);
    expect(settingConstraint("histogram", "bins").default).toBe(30);
    expect(settingConstraint("boxplot", "coef").default).toBe(1.5);
  });

  it("gives opacity a per-geom default (0.8 vs 1.0)", () => {
    expect(settingConstraint("point", "opacity").default).toBe(0.8);
    expect(settingConstraint("line", "opacity").default).toBe(1);
    expect(settingConstraint("smooth", "opacity").default).toBe(1);
    expect(settingConstraint("bar", "opacity").default).toBe(0.8);
  });

  it("has no default for data-dependent settings", () => {
    expect(settingConstraint("violin", "bandwidth").default).toBeUndefined();
    expect(settingConstraint("histogram", "binwidth").default).toBeUndefined();
  });

  it("exposes ggsql's real limits and nothing more", () => {
    expect(settingConstraint("point", "opacity")).toMatchObject({ min: 0, max: 1 });
    expect(settingConstraint("bar", "width")).toMatchObject({ min: 0, max: 1 });
    expect(settingConstraint("range", "width").max).toBeUndefined();
    expect(settingConstraint("histogram", "bins")).toMatchObject({
      min: 1,
      integer: true,
    });
    // linewidth / slope / rotation have no ggsql upper bound
    expect(settingConstraint("line", "linewidth").max).toBeUndefined();
    expect(settingConstraint("rule", "slope").min).toBeUndefined();
    expect(settingConstraint("rule", "slope").max).toBeUndefined();
    expect(settingConstraint("text", "rotation").max).toBeUndefined();
  });
});

describe("clampSettingValue", () => {
  it("clamps to min and max where they exist", () => {
    expect(clampSettingValue("point", "opacity", 1.5)).toBe(1);
    expect(clampSettingValue("bar", "width", -0.2)).toBe(0);
    expect(clampSettingValue("boxplot", "coef", -3)).toBe(0);
  });

  it("rounds integer settings", () => {
    expect(clampSettingValue("histogram", "bins", 0)).toBe(1); // min wins
    expect(clampSettingValue("histogram", "bins", 12.7)).toBe(13);
  });

  it("leaves unbounded settings untouched", () => {
    expect(clampSettingValue("line", "linewidth", 42)).toBe(42);
    expect(clampSettingValue("rule", "slope", -99)).toBe(-99);
  });
});

describe("isDefaultSettingValue", () => {
  it("is true when the value equals the geom default", () => {
    expect(isDefaultSettingValue("line", "linewidth", 1.5)).toBe(true);
    expect(isDefaultSettingValue("point", "linewidth", 1)).toBe(true);
    expect(isDefaultSettingValue("point", "opacity", 0.8)).toBe(true);
  });

  it("is false for non-defaults and for settings without a default", () => {
    expect(isDefaultSettingValue("line", "linewidth", 1.4999)).toBe(false);
    expect(isDefaultSettingValue("violin", "bandwidth", 0.5)).toBe(false);
  });
});

describe("clampNotice", () => {
  it("names the bound that was hit", () => {
    expect(clampNotice("point", "opacity", 5)).toBe("Limited to 1 (max 1)");
    expect(clampNotice("bar", "width", -0.2)).toBe("Limited to 0 (min 0)");
  });

  it("reports the min when an integer setting falls below it", () => {
    expect(clampNotice("histogram", "bins", 0)).toBe("Limited to 1 (min 1)");
  });

  it("reports rounding for a non-integer bins entry in range", () => {
    expect(clampNotice("histogram", "bins", 12.7)).toBe("Rounded to 13");
  });

  it("is null when the value is already valid", () => {
    expect(clampNotice("point", "opacity", 0.5)).toBeNull();
    expect(clampNotice("line", "linewidth", 42)).toBeNull();
  });
});

describe("normalizeSettingValue", () => {
  it("returns null unchanged", () => {
    expect(normalizeSettingValue("line", "linewidth", null)).toBeNull();
  });

  it("clamps then unsets a value that lands on the default", () => {
    expect(normalizeSettingValue("line", "linewidth", 1.5)).toBeNull();
    expect(normalizeSettingValue("point", "linewidth", 1)).toBeNull();
    // opacity default for line is 1.0, and a 1.5 entry clamps to 1 → unset
    expect(normalizeSettingValue("line", "opacity", 1.5)).toBeNull();
  });

  it("keeps a clamped non-default value", () => {
    expect(normalizeSettingValue("line", "linewidth", 2)).toBe(2);
    expect(normalizeSettingValue("point", "opacity", 1.5)).toBe(1); // clamp 1.5→1, point default 0.8 ≠ 1
    expect(normalizeSettingValue("histogram", "bins", 12.7)).toBe(13);
  });

  it("never unsets a setting that has no default", () => {
    expect(normalizeSettingValue("violin", "bandwidth", 0.5)).toBe(0.5);
  });
});
