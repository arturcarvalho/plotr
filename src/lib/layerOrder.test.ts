import { describe, expect, it } from "vitest";
import type { CustomLayer, LabelsLayer, Layer } from "./buildQuery";
import {
  convertLayerToCustom,
  reorderStrip,
  stripOrder,
  type StripItem,
} from "./layerOrder";

const layer = (id: string, extra?: Partial<Layer>): Layer => ({
  id,
  draw: "point",
  mappings: {},
  ...extra,
});
const lab = (
  id: string,
  position: number,
  extra?: Partial<LabelsLayer>,
): LabelsLayer => ({ id, position, ...extra });
const cus = (
  id: string,
  position: number,
  extra?: Partial<CustomLayer>,
): CustomLayer => ({ id, ggsql: "DRAW rule", position, ...extra });

const ids = (items: StripItem[]) => items.map((i) => i.id);

describe("stripOrder", () => {
  it("lists a lone layer", () => {
    expect(stripOrder([layer("a")], [], [])).toEqual([
      { kind: "layer", id: "a" },
    ]);
  });

  it("slots labels at their position, before the layer at that index", () => {
    const order = stripOrder([layer("a"), layer("b")], [lab("t", 1)], []);
    expect(ids(order)).toEqual(["a", "t", "b"]);
  });

  it("slots a custom at position 0 before the first layer", () => {
    const order = stripOrder([layer("a")], [], [cus("c", 0)]);
    expect(ids(order)).toEqual(["c", "a"]);
  });

  it("puts trailing labels and customs after the last layer, labels first", () => {
    const order = stripOrder(
      [layer("a")],
      [lab("t", 1)],
      [cus("c", 1)],
    );
    expect(ids(order)).toEqual(["a", "t", "c"]);
  });

  it("clamps stale positions beyond the layer count to the trailing slot", () => {
    const order = stripOrder([layer("a")], [lab("t", 5)], [cus("c", 9)]);
    expect(ids(order)).toEqual(["a", "t", "c"]);
  });

  it("keeps array order within a slot, all labels before all customs", () => {
    const order = stripOrder(
      [layer("a")],
      [lab("t1", 0), lab("t2", 0)],
      [cus("c1", 0), cus("c2", 0)],
    );
    expect(ids(order)).toEqual(["t1", "t2", "c1", "c2", "a"]);
  });

  it("with zero layers everything lands in the trailing slot", () => {
    const order = stripOrder([], [lab("t", 0)], [cus("c", 3)]);
    expect(ids(order)).toEqual(["t", "c"]);
  });
});

describe("reorderStrip", () => {
  it("flips two layers (the DRAW-order flip)", () => {
    const next = reorderStrip(
      [layer("a"), layer("b")],
      [],
      [],
      "a",
      "b",
    );
    expect(next.layers.map((l) => l.id)).toEqual(["b", "a"]);
  });

  it("moving a layer over a labels card re-derives the labels position", () => {
    // [a, t(1), b] — drag b over t → [a, b, t]; t now trails both layers.
    const next = reorderStrip(
      [layer("a"), layer("b")],
      [lab("t", 1)],
      [],
      "b",
      "t",
    );
    expect(next.layers.map((l) => l.id)).toEqual(["a", "b"]);
    expect(next.labels[0].position).toBe(2);
  });

  it("moving a trailing labels card to the top gives position 0", () => {
    const next = reorderStrip(
      [layer("a"), layer("b")],
      [lab("t", 2)],
      [],
      "t",
      "a",
    );
    expect(next.labels[0].position).toBe(0);
    expect(ids(stripOrder(next.layers, next.labels, next.customLayers))).toEqual(
      ["t", "a", "b"],
    );
  });

  it("moving a custom to the trailing slot gives position === layers.length", () => {
    // [c(0), a, b] — drag c over b → [a, b, c]
    const next = reorderStrip(
      [layer("a"), layer("b")],
      [],
      [cus("c", 0)],
      "c",
      "b",
    );
    expect(next.customLayers[0].position).toBe(2);
  });

  it("returns the same references when active === over", () => {
    const layers = [layer("a"), layer("b")];
    const labels = [lab("t", 1)];
    const customs = [cus("c", 0)];
    const next = reorderStrip(layers, labels, customs, "a", "a");
    expect(next.layers).toBe(layers);
    expect(next.labels).toBe(labels);
    expect(next.customLayers).toBe(customs);
  });

  it("returns the same references for unknown ids", () => {
    const layers = [layer("a")];
    const labels: LabelsLayer[] = [];
    const customs: CustomLayer[] = [];
    expect(reorderStrip(layers, labels, customs, "nope", "a").layers).toBe(
      layers,
    );
    expect(reorderStrip(layers, labels, customs, "a", "nope").layers).toBe(
      layers,
    );
  });

  it("moves first to last and last to first across a mixed strip", () => {
    const layers = [layer("a"), layer("b")];
    const labels = [lab("t", 1)];
    const customs = [cus("c", 2)];
    // display: [a, t, b, c]
    const down = reorderStrip(layers, labels, customs, "a", "c");
    expect(ids(stripOrder(down.layers, down.labels, down.customLayers))).toEqual(
      ["t", "b", "c", "a"],
    );
    const up = reorderStrip(layers, labels, customs, "c", "a");
    expect(ids(stripOrder(up.layers, up.labels, up.customLayers))).toEqual([
      "c", "a", "t", "b",
    ]);
  });

  it("moving a layer past several cards re-derives every position", () => {
    // display: [t0, a, c1, b] with t0@0, c1@1 — drag a to the end (over b).
    const next = reorderStrip(
      [layer("a"), layer("b")],
      [lab("t0", 0)],
      [cus("c1", 1)],
      "a",
      "b",
    );
    // new display: [t0, c1, b, a]
    expect(next.labels[0].position).toBe(0);
    expect(next.customLayers[0].position).toBe(0);
    expect(next.layers.map((l) => l.id)).toEqual(["b", "a"]);
  });

  it("two labels sharing a position keep relative order after an unrelated move", () => {
    const next = reorderStrip(
      [layer("a"), layer("b")],
      [lab("t1", 2), lab("t2", 2)],
      [],
      "a",
      "b",
    );
    expect(next.labels.map((l) => l.id)).toEqual(["t1", "t2"]);
    expect(next.labels.map((l) => l.position)).toEqual([2, 2]);
  });

  it("round-trips: stripOrder(reorderStrip(...)) equals arrayMove of stripOrder", () => {
    const layers = [layer("a"), layer("b"), layer("c")];
    const labels = [lab("t", 1)];
    const customs = [cus("k", 3)];
    const before = stripOrder(layers, labels, customs); // [a, t, b, c, k]
    const move = (arr: StripItem[], from: number, to: number) => {
      const copy = arr.slice();
      const [it] = copy.splice(from, 1);
      copy.splice(to, 0, it);
      return copy;
    };
    for (const [activeId, overId] of [
      ["a", "k"],
      ["k", "a"],
      ["t", "c"],
      ["b", "a"],
    ] as const) {
      const from = ids(before).indexOf(activeId);
      const to = ids(before).indexOf(overId);
      const next = reorderStrip(layers, labels, customs, activeId, overId);
      expect(
        ids(stripOrder(next.layers, next.labels, next.customLayers)),
      ).toEqual(ids(move(before, from, to)));
    }
  });

  it("normalizes a labels card dropped into a slot to render before customs there", () => {
    // display: [a, c(1), t(2)] — drag t over c. Slot model can't put a labels
    // card after a custom in the same slot; it normalizes to labels-first.
    const next = reorderStrip(
      [layer("a")],
      [lab("t", 2)],
      [cus("c", 1)],
      "t",
      "c",
    );
    expect(next.labels[0].position).toBe(1);
    expect(next.customLayers[0].position).toBe(1);
    expect(ids(stripOrder(next.layers, next.labels, next.customLayers))).toEqual(
      ["a", "t", "c"],
    );
  });
});

describe("convertLayerToCustom", () => {
  it("replaces the layer with a custom in the same strip slot", () => {
    // display: [t0, a, b, t2, c2] with t0@0, t2@2, c2@2 — convert a.
    const res = convertLayerToCustom(
      [layer("a"), layer("b")],
      [lab("t0", 0), lab("t2", 2)],
      [cus("c2", 2)],
      "a",
      "new",
      "DRAW point MAPPING x AS x",
    );
    expect(res).not.toBeNull();
    expect(res!.layers.map((l) => l.id)).toEqual(["b"]);
    expect(res!.custom).toMatchObject({
      id: "new",
      ggsql: "DRAW point MAPPING x AS x",
      position: 0,
    });
    expect(
      ids(stripOrder(res!.layers, res!.labels, res!.customLayers)),
    ).toEqual(["t0", "new", "b", "t2", "c2"]);
    // positions past the removed layer decrement
    expect(res!.labels.find((l) => l.id === "t2")!.position).toBe(1);
    expect(res!.customLayers.find((c) => c.id === "c2")!.position).toBe(1);
  });

  it("keeps a custom that sat right after the converted layer below the new custom", () => {
    // display: [a, c1, b] — convert a; new custom must render before c1.
    const res = convertLayerToCustom(
      [layer("a"), layer("b")],
      [],
      [cus("c1", 1)],
      "a",
      "new",
      "DRAW area",
    );
    expect(
      ids(stripOrder(res!.layers, res!.labels, res!.customLayers)),
    ).toEqual(["new", "c1", "b"]);
  });

  it("carries the disabled flag over", () => {
    const res = convertLayerToCustom(
      [layer("a", { disabled: true })],
      [],
      [],
      "a",
      "new",
      "DRAW point",
    );
    expect(res!.custom.disabled).toBe(true);
    const res2 = convertLayerToCustom(
      [layer("a")],
      [],
      [],
      "a",
      "new",
      "DRAW point",
    );
    expect(res2!.custom.disabled).toBeUndefined();
  });

  it("returns null for an unknown layer id", () => {
    expect(convertLayerToCustom([layer("a")], [], [], "zzz", "new", "DRAW point")).toBeNull();
  });
});
