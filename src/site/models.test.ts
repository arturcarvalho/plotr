import { describe, expect, it } from "vitest";
import { MODELS, withSmoothLayers } from "./models";

const byKey = (layers: { key: string; n: number }[]) =>
  Object.fromEntries(layers.map((l) => [l.key, l.n]));

describe("withSmoothLayers", () => {
  it("inserts the trend layer after the geom layer and renumbers behind it (ggsql)", () => {
    const base = withSmoothLayers("ggsql", false);
    expect(base).toBe(MODELS.ggsql.layers); // unchanged reference when off
    expect(base).toHaveLength(5);

    const on = withSmoothLayers("ggsql", true);
    expect(on).toHaveLength(6);
    const smoothIdx = on.findIndex((l) => l.key === "smooth");
    const drawIdx = on.findIndex((l) => l.key === "draw");
    expect(smoothIdx).toBe(drawIdx + 1); // sits right after the geom layer

    const n = byKey(on);
    expect(n.draw).toBe(3); // geom keeps its number
    expect(n.smooth).toBe(4); // trend takes geomN + 1
    expect(n.scale).toBe(5); // everything after geom shifts up by one
    expect(n.label).toBe(6);
    expect(n.data).toBe(1);
    expect(n.visualize).toBe(2);
  });

  it("inserts the trend layer for plotr (geom = Chart Points)", () => {
    const on = withSmoothLayers("plotr", true);
    expect(on.map((l) => l.key)).toEqual(["data", "charts", "smooth", "label"]);
    expect(byKey(on)).toEqual({ data: 1, charts: 2, smooth: 3, label: 4 });
  });

  it("leaves models without a smoothLayer untouched even when on", () => {
    expect(withSmoothLayers("gog", true)).toBe(MODELS.gog.layers);
    expect(withSmoothLayers("ggplot", true)).toBe(MODELS.ggplot.layers);
  });
});
