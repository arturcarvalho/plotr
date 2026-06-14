import { describe, expect, it } from "vitest";
import { compile } from "vega-lite";
import type { TopLevelSpec } from "vega-lite";

// Guards plotr's merged-legend behavior, which pins the vega-lite version.
//
// When one column drives two aesthetics (e.g. `NewUsers AS fill, NewUsers AS
// size`), ggsql materializes each aesthetic into its own data column
// (`__ggsql_aes_fill__`, `__ggsql_aes_size__`) with a shared title, and an
// explicit scale domain/range per channel. vega-lite 6.4.1 compiles that to a
// single merged legend; 6.4.2+ split it into two (vega-lite #9696, "merge
// legends on explicit color scale/range/domain").
//
// Policy: merged legends are required, and plotr tracks the vega-lite version
// the ggsql playground (ggsql.org/wasm) bundles — currently 6.4.1 for both
// reasons. Merged legends win if the two ever conflict: do not follow the
// playground onto a vega-lite that fails this test.

// A unit spec shaped like ggsql's output for a point layer with one column on
// both fill and size: distinct per-aesthetic fields, shared title, explicit
// palette/size scale ranges.
const unitSpec: TopLevelSpec = {
  $schema: "https://vega.github.io/schema/vega-lite/v6.json",
  data: {
    values: [
      { x: 1, y: 2, __ggsql_aes_fill__: 10, __ggsql_aes_size__: 10 },
      { x: 2, y: 3, __ggsql_aes_fill__: 80, __ggsql_aes_size__: 80 },
    ],
  },
  mark: { type: "point", filled: false },
  encoding: {
    x: { field: "x", type: "quantitative" },
    y: { field: "y", type: "quantitative" },
    fill: {
      field: "__ggsql_aes_fill__",
      type: "quantitative",
      title: "NewUsers",
      scale: { domain: [0, 83], range: ["#ffffcc", "#bd0026"] },
    },
    size: {
      field: "__ggsql_aes_size__",
      type: "quantitative",
      title: "NewUsers",
      scale: { domain: [0, 83], range: [5, 200] },
    },
  },
};

interface VegaLegend {
  fill?: string;
  size?: string;
  title?: string;
}

const compiledLegends = (spec: TopLevelSpec): VegaLegend[] =>
  (compile(spec).spec.legends ?? []) as VegaLegend[];

describe("legend merging (vega-lite version pin)", () => {
  it("merges fill+size legends for one column on two aesthetics", () => {
    const legends = compiledLegends(unitSpec);
    expect(legends).toHaveLength(1);
    expect(legends[0].fill).toBeDefined();
    expect(legends[0].size).toBeDefined();
    expect(legends[0].title).toBe("NewUsers");
  });

  it("merges across layers too (line layer + fill/size point layer)", () => {
    const { mark, encoding, ...top } = unitSpec as typeof unitSpec & {
      mark: unknown;
      encoding: { x: unknown; y: unknown };
    };
    const layered = {
      ...top,
      layer: [
        {
          mark: { type: "line" },
          encoding: { x: encoding.x, y: encoding.y },
        },
        { mark, encoding },
      ],
    } as TopLevelSpec;
    expect(compiledLegends(layered)).toHaveLength(1);
  });
});
