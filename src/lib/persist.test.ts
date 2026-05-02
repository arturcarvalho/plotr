import { describe, expect, it } from "vitest";
import { deserialize, serialize, type Persisted } from "./persist";
import type { Layer } from "./buildQuery";

const empty: Persisted = {
  layers: [],
  labels: {},
  project: {},
  activeTable: null,
};

const sample: Persisted = {
  layers: [
    {
      id: "L1",
      draw: "auto",
      mappings: { x: "bill_len", y: "bill_dep", color: "species" },
      settings: { color: "blue", opacity: 0.6 },
    } satisfies Layer,
    {
      id: "L2",
      draw: "smooth",
      mappings: { x: "bill_len", y: "bill_dep" },
    } satisfies Layer,
  ],
  labels: { title: "Penguins" },
  project: { ratio: 1.5 },
  activeTable: "ggsql:penguins",
};

describe("serialize / deserialize round-trip", () => {
  it("empty state round-trips", () => {
    const s = serialize(empty);
    expect(deserialize(s)).toEqual(empty);
  });

  it("rich state round-trips", () => {
    const s = serialize(sample);
    expect(deserialize(s)).toEqual(sample);
  });

  it("layer order is preserved", () => {
    const s = serialize(sample);
    const r = deserialize(s);
    expect(r?.layers.map((l) => l.id)).toEqual(["L1", "L2"]);
  });
});

describe("serialize strips defaults", () => {
  it("drops empty labels", () => {
    const s = serialize({
      layers: [],
      labels: { title: undefined, subtitle: "", caption: undefined },
      project: {},
      activeTable: null,
    });
    const back = deserialize(s);
    expect(back?.labels).toEqual({});
  });

  it("drops project.clip when true (default)", () => {
    const s = serialize({
      layers: [],
      labels: {},
      project: { clip: true },
      activeTable: null,
    });
    expect(deserialize(s)?.project).toEqual({});
  });

  it("keeps project.clip when false", () => {
    const s = serialize({
      layers: [],
      labels: {},
      project: { clip: false },
      activeTable: null,
    });
    expect(deserialize(s)?.project).toEqual({ clip: false });
  });

  it("drops empty layer.settings", () => {
    const s = serialize({
      layers: [
        {
          id: "L",
          draw: "point",
          mappings: { x: "a" },
          settings: {},
        } as Layer,
      ],
      labels: {},
      project: {},
      activeTable: null,
    });
    const back = deserialize(s);
    expect(back?.layers[0].settings).toBeUndefined();
  });
});

describe("activeTable", () => {
  it("persists ggsql: built-in tables", () => {
    const s = serialize({
      layers: [],
      labels: {},
      project: {},
      activeTable: "ggsql:penguins",
    });
    expect(deserialize(s)?.activeTable).toBe("ggsql:penguins");
  });

  it("drops user CSV table names (no ggsql: prefix)", () => {
    const s = serialize({
      layers: [],
      labels: {},
      project: {},
      activeTable: "my_csv",
    });
    expect(deserialize(s)?.activeTable).toBeNull();
  });

  it("treats null as null", () => {
    const s = serialize({
      layers: [],
      labels: {},
      project: {},
      activeTable: null,
    });
    expect(deserialize(s)?.activeTable).toBeNull();
  });

  it("missing activeTable defaults to null", () => {
    const payload = `s=${encodeURIComponent(JSON.stringify({ v: 1 }))}`;
    expect(deserialize(payload)?.activeTable).toBeNull();
  });
});

describe("deserialize validates schema", () => {
  const wrap = (obj: object) =>
    `s=${encodeURIComponent(JSON.stringify({ v: 1, ...obj }))}`;

  it("drops layer with unknown draw", () => {
    expect(
      deserialize(
        wrap({ layers: [{ id: "L", draw: "evil", mappings: { x: "a" } }] }),
      )?.layers,
    ).toEqual([]);
  });

  it("keeps layer with AUTO draw", () => {
    expect(
      deserialize(
        wrap({ layers: [{ id: "L", draw: "auto", mappings: { x: "a" } }] }),
      )?.layers,
    ).toHaveLength(1);
  });

  it("regenerates missing id", () => {
    const r = deserialize(
      wrap({ layers: [{ draw: "point", mappings: { x: "a" } }] }),
    );
    expect(r?.layers).toHaveLength(1);
    expect(typeof r!.layers[0].id).toBe("string");
    expect(r!.layers[0].id.length).toBeGreaterThan(0);
  });

  it("regenerates non-string id", () => {
    const r = deserialize(
      wrap({ layers: [{ id: 42, draw: "point", mappings: { x: "a" } }] }),
    );
    expect(r?.layers).toHaveLength(1);
    expect(typeof r!.layers[0].id).toBe("string");
  });

  it("drops layer with non-string mapping value", () => {
    expect(
      deserialize(
        wrap({ layers: [{ id: "L", draw: "point", mappings: { x: 42 } }] }),
      )?.layers,
    ).toEqual([]);
  });

  it("drops layer with unknown mapping key", () => {
    expect(
      deserialize(
        wrap({
          layers: [{ id: "L", draw: "point", mappings: { rogue: "a" } }],
        }),
      )?.layers,
    ).toEqual([]);
  });

  it("strips unknown settings keys but keeps layer", () => {
    const r = deserialize(
      wrap({
        layers: [
          {
            id: "L",
            draw: "point",
            mappings: { x: "a" },
            settings: { color: "red", rogue: "x" },
          },
        ],
      }),
    );
    expect(r?.layers).toHaveLength(1);
    expect(r!.layers[0].settings).toEqual({ color: "red" });
  });

  it("strips settings entries with wrong type", () => {
    const r = deserialize(
      wrap({
        layers: [
          {
            id: "L",
            draw: "point",
            mappings: { x: "a" },
            settings: { color: 42, opacity: "loud" },
          },
        ],
      }),
    );
    expect(r?.layers[0].settings).toBeUndefined();
  });

  it("strips bad project.ratio", () => {
    expect(
      deserialize(
        wrap({ layers: [], project: { ratio: "not-a-number" } }),
      )?.project,
    ).toEqual({});
  });

  it("strips bad labels", () => {
    expect(
      deserialize(
        wrap({ layers: [], labels: { title: 42, subtitle: "ok" } }),
      )?.labels,
    ).toEqual({ subtitle: "ok" });
  });
});

describe("deserialize tolerance", () => {
  it("empty string → null", () => {
    expect(deserialize("")).toBeNull();
  });

  it("random garbage → null", () => {
    expect(deserialize("not-json-at-all")).toBeNull();
    expect(deserialize("s=%7Bbroken")).toBeNull();
  });

  it("wrong version → null", () => {
    const payload = `s=${encodeURIComponent(
      JSON.stringify({ v: 999, layers: [], labels: {}, project: {} }),
    )}`;
    expect(deserialize(payload)).toBeNull();
  });

  it("missing fields default to []/{}", () => {
    const payload = `s=${encodeURIComponent(JSON.stringify({ v: 1 }))}`;
    expect(deserialize(payload)).toEqual({
      layers: [],
      labels: {},
      project: {},
      activeTable: null,
    });
  });

  it("accepts both leading '#' and bare payload", () => {
    const s = serialize(sample);
    expect(deserialize("#" + s)).toEqual(sample);
    expect(deserialize(s)).toEqual(sample);
  });
});
