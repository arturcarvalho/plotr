import { describe, expect, it } from "vitest";
import {
  matchSitePath,
  nextTool,
  prevTool,
  routeToPath,
  TOOL_IDS,
} from "./route";

describe("TOOL_IDS", () => {
  it("lists the tools in presentation order: plotr, ggsql, ggplot2", () => {
    expect(TOOL_IDS).toEqual(["plotr", "ggsql", "ggplot2"]);
  });
});

describe("nextTool / prevTool", () => {
  it("steps forward, null past the last", () => {
    expect(nextTool("plotr")).toBe("ggsql");
    expect(nextTool("ggsql")).toBe("ggplot2");
    expect(nextTool("ggplot2")).toBeNull();
  });

  it("steps backward, null past the first", () => {
    expect(prevTool("plotr")).toBeNull();
    expect(prevTool("ggsql")).toBe("plotr");
    expect(prevTool("ggplot2")).toBe("ggsql");
  });
});

describe("matchSitePath", () => {
  it("matches /about", () => {
    expect(matchSitePath("/about")).toEqual({ kind: "about" });
  });

  it("matches /about with a trailing slash", () => {
    expect(matchSitePath("/about/")).toEqual({ kind: "about" });
  });

  it("resolves the legacy /tools path to About (Tools merged into About)", () => {
    expect(matchSitePath("/tools")).toEqual({ kind: "about" });
    expect(matchSitePath("/tools/")).toEqual({ kind: "about" });
  });

  it("matches each known tool id", () => {
    expect(matchSitePath("/tool/ggplot2")).toEqual({ kind: "tool", tool: "ggplot2" });
    expect(matchSitePath("/tool/ggsql")).toEqual({ kind: "tool", tool: "ggsql" });
    expect(matchSitePath("/tool/plotr")).toEqual({ kind: "tool", tool: "plotr" });
  });

  it("tolerates a trailing slash on a tool path", () => {
    expect(matchSitePath("/tool/ggsql/")).toEqual({ kind: "tool", tool: "ggsql" });
  });

  it("falls back to About for an unknown tool id (still a site path)", () => {
    expect(matchSitePath("/tool/bogus")).toEqual({ kind: "about" });
    expect(matchSitePath("/tool")).toEqual({ kind: "about" });
    expect(matchSitePath("/tool/")).toEqual({ kind: "about" });
  });

  it("returns null for the builder root and unrelated paths", () => {
    expect(matchSitePath("/")).toBeNull();
    expect(matchSitePath("")).toBeNull();
    expect(matchSitePath("/x")).toBeNull();
    expect(matchSitePath("/aboutx")).toBeNull();
    expect(matchSitePath("/about/extra")).toBeNull();
  });

  it("is case-sensitive", () => {
    expect(matchSitePath("/About")).toBeNull();
    expect(matchSitePath("/Tool/ggsql")).toBeNull();
  });
});

describe("routeToPath", () => {
  it("builds the canonical path for each route", () => {
    expect(routeToPath({ kind: "about" })).toBe("/about");
    expect(routeToPath({ kind: "tool", tool: "ggsql" })).toBe("/tool/ggsql");
  });
});
