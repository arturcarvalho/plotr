import { describe, expect, it } from "vitest";
import {
  deserialize,
  serialize,
  type ActivePanel,
  type Persisted,
  type SecondaryPanel,
} from "./persist";
import type { Layer } from "./buildQuery";

const empty: Persisted = {
  layers: [],
  labels: [],
  project: {},
  sharedMappings: {},
  activeTable: null,
};

const sample: Persisted = {
  layers: [
    {
      id: "L1",
      draw: "auto",
      mappings: { x: "bill_len", y: "bill_dep", fill: "species" },
      settings: { fill: "blue", opacity: 0.6 },
    } satisfies Layer,
    {
      id: "L2",
      draw: "smooth",
      mappings: { x: "bill_len", y: "bill_dep" },
    } satisfies Layer,
  ],
  labels: [{ id: "Lab1", position: 2, title: "Penguins" }],
  project: { ratio: 1.5 },
  sharedMappings: {},
  activeTable: "ggsql:penguins",
};

// Build a `s=…` hash carrying an arbitrary v=2 short-key payload — used to
// assert deserialize tolerates / rejects malformed input. Mirrors the
// gzip+base64url pipeline inside persist.ts.
async function wrap(obj: object): Promise<string> {
  const json = JSON.stringify({ v: 2, ...obj });
  const stream = new Blob([json])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `s=${b64}`;
}

describe("serialize / deserialize round-trip", () => {
  it("empty state round-trips", async () => {
    const s = await serialize(empty);
    expect(await deserialize(s)).toEqual(empty);
  });

  it("rich state round-trips", async () => {
    const s = await serialize(sample);
    expect(await deserialize(s)).toEqual(sample);
  });

  it("layer order is preserved", async () => {
    const s = await serialize(sample);
    const r = await deserialize(s);
    expect(r?.layers.map((l) => l.id)).toEqual(["L1", "L2"]);
  });

  it("labels disabled flag round-trips", async () => {
    const s = await serialize({
      layers: [],
      labels: [{ id: "L", position: 0, title: "x", disabled: true }],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.labels[0].disabled).toBe(true);
  });

  it("columnKindsCache round-trips", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
      columnKindsCache: {
        body_mass: "numeric",
        species: "string",
        is_adult: "bool",
        observed_at: "date",
      },
    });
    expect((await deserialize(s))?.columnKindsCache).toEqual({
      body_mass: "numeric",
      species: "string",
      is_adult: "bool",
      observed_at: "date",
    });
  });

  it("columnKindsCache is omitted when empty", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
      columnKindsCache: {},
    });
    const got = await deserialize(s);
    expect(got?.columnKindsCache).toBeUndefined();
  });

  it("columnKindsCache rejects bogus kinds on decode", async () => {
    const hash = await wrap({
      K: {
        body_mass: "numeric",
        bogus: "weird",
        species: "string",
      },
    });
    const got = await deserialize(hash);
    expect(got?.columnKindsCache).toEqual({
      body_mass: "numeric",
      species: "string",
    });
  });

  it("color mapping + colorSplit + color settings round-trip", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "point",
          mappings: { x: "a", y: "b", color: "c" },
          settings: {
            color: "red",
            colorPaletteDiscrete: "set1",
            colorPaletteContinuous: "viridis",
            noColor: true,
            colorSplit: true,
          },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    const got = await deserialize(s);
    expect(got?.layers[0].mappings.color).toBe("c");
    expect(got?.layers[0].settings).toEqual({
      color: "red",
      colorPaletteDiscrete: "set1",
      colorPaletteContinuous: "viridis",
      noColor: true,
      colorSplit: true,
    });
  });

  it("sharedColorSplit round-trips", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
      sharedColorSplit: true,
    });
    expect((await deserialize(s))?.sharedColorSplit).toBe(true);
  });

  it("sharedColorSplit is omitted when false / undefined", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.sharedColorSplit).toBeUndefined();
  });

  it("palette settings round-trip", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "point",
          mappings: { x: "a", y: "b" },
          settings: {
            fillPaletteDiscrete: "set1",
            fillPaletteContinuous: "viridis",
            strokePaletteDiscrete: "tableau10",
            strokePaletteContinuous: "plasma",
          },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toEqual({
      fillPaletteDiscrete: "set1",
      fillPaletteContinuous: "viridis",
      strokePaletteDiscrete: "tableau10",
      strokePaletteContinuous: "plasma",
    });
  });

  it("rule slope round-trips", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "rule",
          mappings: { x: "a" },
          settings: { slope: 0.5 },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toEqual({
      slope: 0.5,
    });
  });

  it("text geom-specific settings round-trip", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "text",
          mappings: { x: "a", y: "b", label: "c" },
          settings: {
            italic: true,
            hjust: "left",
            vjust: "top",
            offset: { x: 0, y: -11 },
            rotation: 45,
            format: "%.2f",
          },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toEqual({
      italic: true,
      hjust: "left",
      vjust: "top",
      offset: { x: 0, y: -11 },
      rotation: 45,
      format: "%.2f",
    });
  });

  it("partial offset (single axis) round-trips", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "text",
          mappings: { x: "a", y: "b", label: "c" },
          settings: { offset: { y: -7 } },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toEqual({
      offset: { y: -7 },
    });
  });

  it("legacy numeric hj/vj are silently dropped on decode", async () => {
    // Pre-change URLs carried hjust/vjust as numbers under hj/vj. The new
    // decoder only accepts the string enum, so the numeric values fall away
    // and the remaining settings round-trip intact.
    const hash = await wrap({
      L: [
        {
          i: "L",
          d: "text",
          m: { x: "a", y: "b", label: "c" },
          s: { it: true, hj: 0.3, vj: 0.7, rt: 45, fmt: "%.2f" },
        },
      ],
    });
    const got = await deserialize(hash);
    expect(got?.layers[0].settings).toEqual({
      italic: true,
      rotation: 45,
      format: "%.2f",
    });
  });

  it("bogus hjust/vjust strings are rejected", async () => {
    const hash = await wrap({
      L: [
        {
          i: "L",
          d: "text",
          m: { x: "a", y: "b", label: "c" },
          s: { hj: "diagonal", vj: "middle" },
        },
      ],
    });
    const got = await deserialize(hash);
    // 'diagonal' is not a valid Hjust; only 'middle' (valid Vjust) survives.
    expect(got?.layers[0].settings).toEqual({ vjust: "middle" });
  });

  it("malformed offset is rejected on decode", async () => {
    const arrayShape = await wrap({
      L: [
        {
          i: "L",
          d: "text",
          m: { x: "a", y: "b", label: "c" },
          s: { of: [1, 2] },
        },
      ],
    });
    expect((await deserialize(arrayShape))?.layers[0].settings).toBeUndefined();

    const nonNumeric = await wrap({
      L: [
        {
          i: "L",
          d: "text",
          m: { x: "a", y: "b", label: "c" },
          s: { of: { x: "nope", y: 5 } },
        },
      ],
    });
    // Only the valid `y` survives; the bogus `x` is dropped.
    expect((await deserialize(nonNumeric))?.layers[0].settings).toEqual({
      offset: { y: 5 },
    });
  });

  it("smooth method round-trips", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "smooth",
          mappings: { x: "a", y: "b" },
          settings: { method: "ols" },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toEqual({
      method: "ols",
    });
  });

  it("boxplot outliers (false) + coef round-trip", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "boxplot",
          mappings: { x: "a", y: "b" },
          settings: { outliers: false, coef: 2.5 },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toEqual({
      outliers: false,
      coef: 2.5,
    });
  });

  it("boxplot outliers explicit true round-trips (locks the default)", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "boxplot",
          mappings: { x: "a", y: "b" },
          settings: { outliers: true },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toEqual({
      outliers: true,
    });
  });

  it("histogram bins + closed round-trip", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "histogram",
          mappings: { x: "a" },
          settings: { bins: 50, closed: "left" },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toEqual({
      bins: 50,
      closed: "left",
    });
  });

  it("histogram binwidth round-trips (alternative bin strategy)", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "histogram",
          mappings: { x: "a" },
          settings: { binwidth: 0.25 },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toEqual({
      binwidth: 0.25,
    });
  });

  it("violin geom-specific settings round-trip", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "violin",
          mappings: { x: "a", y: "b" },
          settings: {
            bandwidth: 0.4,
            adjust: 1.3,
            kernel: "biweight",
            side: "right",
            tails: 2.5,
          },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toEqual({
      bandwidth: 0.4,
      adjust: 1.3,
      kernel: "biweight",
      side: "right",
      tails: 2.5,
    });
  });

  it("orientation setting round-trips", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "line",
          mappings: { x: "a", y: "b" },
          settings: { orientation: "transposed" },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toEqual({
      orientation: "transposed",
    });
  });

  it("linewidth setting round-trips", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "line",
          mappings: { x: "a", y: "b" },
          settings: { linewidth: 1.5 },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toEqual({
      linewidth: 1.5,
    });
  });

  it("ymin / ymax aesthetic mappings round-trip", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "ribbon",
          mappings: { x: "a", ymin: "lo", ymax: "hi" },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].mappings).toEqual({
      x: "a",
      ymin: "lo",
      ymax: "hi",
    });
  });

  it("label aesthetic mapping round-trips", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "text",
          mappings: { x: "a", y: "b", label: "species" },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].mappings).toEqual({
      x: "a",
      y: "b",
      label: "species",
    });
  });

  it("layer disabled flag round-trips", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "point",
          mappings: { x: "a", y: "b" },
          disabled: true,
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].disabled).toBe(true);
  });
});

describe("serialize strips defaults", () => {
  it("strips empty fields from labels layers", async () => {
    const s = await serialize({
      layers: [],
      labels: [
        {
          id: "L",
          position: 0,
          title: undefined,
          subtitle: "",
          caption: undefined,
        },
      ],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    const back = await deserialize(s);
    expect(back?.labels).toEqual([{ id: "L", position: 0 }]);
  });

  it("drops project.clip when true (default)", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      project: { clip: true },
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.project).toEqual({});
  });

  it("keeps project.clip when false", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      project: { clip: false },
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.project).toEqual({ clip: false });
  });

  it("drops empty layer.settings", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "point",
          mappings: { x: "a" },
          settings: {},
        } as Layer,
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    const back = await deserialize(s);
    expect(back?.layers[0].settings).toBeUndefined();
  });
});

describe("sharedMappings persistence", () => {
  it("round-trips sharedMappings", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      project: {},
      sharedMappings: { x: "bill_len", fill: "species" },
      activeTable: null,
    });
    expect((await deserialize(s))?.sharedMappings).toEqual({
      x: "bill_len",
      fill: "species",
    });
  });

  it("missing sharedMappings defaults to {}", async () => {
    const payload = await wrap({});
    expect((await deserialize(payload))?.sharedMappings).toEqual({});
  });

  it("strips bad sharedMappings entries (unknown key, non-string value)", async () => {
    const payload = await wrap({
      S: { x: "bill_len", rogue: "x", y: 42 },
    });
    expect((await deserialize(payload))?.sharedMappings).toEqual({
      x: "bill_len",
    });
  });
});

describe("activeTable", () => {
  it("persists ggsql: built-in tables", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: "ggsql:penguins",
    });
    expect((await deserialize(s))?.activeTable).toBe("ggsql:penguins");
  });

  it("round-trips user CSV table names (any non-empty string)", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: "my_csv",
    });
    expect((await deserialize(s))?.activeTable).toBe("my_csv");
  });

  it("treats empty string as null", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: "",
    });
    expect((await deserialize(s))?.activeTable).toBeNull();
  });

  it("treats null as null", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.activeTable).toBeNull();
  });

  it("missing activeTable defaults to null", async () => {
    const payload = await wrap({});
    expect((await deserialize(payload))?.activeTable).toBeNull();
  });
});

describe("deserialize validates schema", () => {
  it("drops layer with unknown draw", async () => {
    expect(
      (
        await deserialize(
          await wrap({ L: [{ i: "L", d: "evil", m: { x: "a" } }] }),
        )
      )?.layers,
    ).toEqual([]);
  });

  it("keeps layer with AUTO draw", async () => {
    expect(
      (
        await deserialize(
          await wrap({ L: [{ i: "L", d: "auto", m: { x: "a" } }] }),
        )
      )?.layers,
    ).toHaveLength(1);
  });

  it("regenerates missing id", async () => {
    const r = await deserialize(
      await wrap({ L: [{ d: "point", m: { x: "a" } }] }),
    );
    expect(r?.layers).toHaveLength(1);
    expect(typeof r!.layers[0].id).toBe("string");
    expect(r!.layers[0].id.length).toBeGreaterThan(0);
  });

  it("regenerates non-string id", async () => {
    const r = await deserialize(
      await wrap({ L: [{ i: 42, d: "point", m: { x: "a" } }] }),
    );
    expect(r?.layers).toHaveLength(1);
    expect(typeof r!.layers[0].id).toBe("string");
  });

  it("drops layer with non-string mapping value", async () => {
    expect(
      (
        await deserialize(
          await wrap({ L: [{ i: "L", d: "point", m: { x: 42 } }] }),
        )
      )?.layers,
    ).toEqual([]);
  });

  it("drops layer with unknown mapping key", async () => {
    expect(
      (
        await deserialize(
          await wrap({ L: [{ i: "L", d: "point", m: { rogue: "a" } }] }),
        )
      )?.layers,
    ).toEqual([]);
  });

  it("strips unknown settings keys but keeps layer", async () => {
    const r = await deserialize(
      await wrap({
        L: [
          {
            i: "L",
            d: "point",
            m: { x: "a" },
            s: { f: "red", rogue: "x" },
          },
        ],
      }),
    );
    expect(r?.layers).toHaveLength(1);
    expect(r!.layers[0].settings).toEqual({ fill: "red" });
  });

  it("strips settings entries with wrong type", async () => {
    const r = await deserialize(
      await wrap({
        L: [
          {
            i: "L",
            d: "point",
            m: { x: "a" },
            s: { f: 42, o: "loud" },
          },
        ],
      }),
    );
    expect(r?.layers[0].settings).toBeUndefined();
  });

  it("round-trips noFill / noStroke booleans", async () => {
    const r = await deserialize(
      await wrap({
        L: [
          {
            i: "L",
            d: "point",
            m: { x: "a" },
            s: { nf: true, ns: true },
          },
        ],
      }),
    );
    expect(r?.layers[0].settings).toEqual({
      noFill: true,
      noStroke: true,
    });
  });

  it("strips non-boolean noFill", async () => {
    const r = await deserialize(
      await wrap({
        L: [
          {
            i: "L",
            d: "point",
            m: { x: "a" },
            s: { nf: "yes" },
          },
        ],
      }),
    );
    expect(r?.layers[0].settings).toBeUndefined();
  });

  it("strips bad project.ratio", async () => {
    expect(
      (await deserialize(await wrap({ P: { r: "not-a-number" } })))?.project,
    ).toEqual({});
  });

  it("strips bad labels", async () => {
    expect(
      (
        await deserialize(
          await wrap({
            B: [
              { i: "L", p: 0, t: 42, st: "ok" },
              "garbage",
              { t: "no position" },
            ],
          }),
        )
      )?.labels,
    ).toEqual([{ id: "L", position: 0, subtitle: "ok" }]);
  });

  it("non-array labels → []", async () => {
    expect((await deserialize(await wrap({ B: { t: "x" } })))?.labels).toEqual(
      [],
    );
  });
});

describe("deserialize tolerance", () => {
  it("empty string → null", async () => {
    expect(await deserialize("")).toBeNull();
  });

  it("random garbage → null", async () => {
    expect(await deserialize("not-json-at-all")).toBeNull();
    expect(await deserialize("s=%7Bbroken")).toBeNull();
  });

  it("wrong version → null", async () => {
    const json = JSON.stringify({ v: 999 });
    const stream = new Blob([json])
      .stream()
      .pipeThrough(new CompressionStream("gzip"));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await deserialize(`s=${b64}`)).toBeNull();
  });

  it("missing fields default to []/{}", async () => {
    const payload = await wrap({});
    expect(await deserialize(payload)).toEqual({
      layers: [],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
  });

  it("accepts both leading '#' and bare payload", async () => {
    const s = await serialize(sample);
    expect(await deserialize("#" + s)).toEqual(sample);
    expect(await deserialize(s)).toEqual(sample);
  });
});

describe("customLayers persistence", () => {
  it("round-trips a custom layer", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      customLayers: [
        { id: "C1", ggsql: "SCALE x TO log", position: 0 },
      ],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.customLayers).toEqual([
      { id: "C1", ggsql: "SCALE x TO log", position: 0 },
    ]);
  });

  it("round-trips disabled flag", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      customLayers: [
        { id: "C1", ggsql: "SCALE x TO log", position: 1, disabled: true },
      ],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.customLayers?.[0].disabled).toBe(true);
  });

  it("preserves order across multi-line ggsql + multiple entries", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      customLayers: [
        { id: "A", ggsql: "FIRST\nLINE", position: 0 },
        { id: "B", ggsql: "SECOND", position: 0 },
      ],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    const back = await deserialize(s);
    expect(back?.customLayers).toEqual([
      { id: "A", ggsql: "FIRST\nLINE", position: 0 },
      { id: "B", ggsql: "SECOND", position: 0 },
    ]);
  });

  it("missing customLayers in payload defaults to undefined", async () => {
    const payload = await wrap({});
    const back = await deserialize(payload);
    expect(back?.customLayers).toBeUndefined();
  });
});

describe("layer filter persistence", () => {
  it("round-trips a non-trivial FILTER expression", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "point",
          mappings: { x: "a", y: "b" },
          settings: { filter: "species = 'Adelie' AND body_mass > 4000" },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toEqual({
      filter: "species = 'Adelie' AND body_mass > 4000",
    });
  });

  it("empty-string filter is dropped from the short form", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "point",
          mappings: { x: "a", y: "b" },
          settings: { filter: "" },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toBeUndefined();
  });
});

describe("axis format persistence", () => {
  it("round-trips xFormat + yFormat", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "point",
          mappings: { x: "a", y: "b" },
          settings: { xFormat: "{:num %.2f}", yFormat: "{:time %Y-%m}" },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toEqual({
      xFormat: "{:num %.2f}",
      yFormat: "{:time %Y-%m}",
    });
  });

  it("empty-string xFormat / yFormat are dropped from the short form", async () => {
    const s = await serialize({
      layers: [
        {
          id: "L",
          draw: "point",
          mappings: { x: "a", y: "b" },
          settings: { xFormat: "", yFormat: "" },
        },
      ],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
    });
    expect((await deserialize(s))?.layers[0].settings).toBeUndefined();
  });
});

describe("activePanel persistence", () => {
  it("round-trips a layer-kind activePanel (id resolves to an existing layer)", async () => {
    const ap: ActivePanel = { kind: "layer", layerId: "L1" };
    const s = await serialize({
      layers: [{ id: "L1", draw: "point", mappings: { x: "a" } }],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
      activePanel: ap,
    });
    expect((await deserialize(s))?.activePanel).toEqual(ap);
  });

  it("round-trips a labels-kind activePanel", async () => {
    const ap: ActivePanel = { kind: "labels", labelsId: "B1" };
    const s = await serialize({
      layers: [],
      labels: [{ id: "B1", position: 0 }],
      project: {},
      sharedMappings: {},
      activeTable: null,
      activePanel: ap,
    });
    expect((await deserialize(s))?.activePanel).toEqual(ap);
  });

  it("round-trips a custom-kind activePanel", async () => {
    const ap: ActivePanel = { kind: "custom", customId: "C1" };
    const s = await serialize({
      layers: [],
      labels: [],
      customLayers: [{ id: "C1", ggsql: "SCALE x TO log", position: 0 }],
      project: {},
      sharedMappings: {},
      activeTable: null,
      activePanel: ap,
    });
    expect((await deserialize(s))?.activePanel).toEqual(ap);
  });

  it("round-trips a shared-kind activePanel (no id needed)", async () => {
    const ap: ActivePanel = { kind: "shared" };
    const s = await serialize({
      layers: [],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
      activePanel: ap,
    });
    expect((await deserialize(s))?.activePanel).toEqual(ap);
  });

  it("omits activePanel from the payload when null (legacy default)", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
      activePanel: null,
    });
    const back = await deserialize(s);
    expect(back?.activePanel).toBeUndefined();
  });

  it("drops a layer-kind activePanel pointing at a non-existent layer id", async () => {
    const payload = await wrap({
      L: [{ i: "L1", d: "point", m: { x: "a" } }],
      A: { k: "layer", i: "MISSING" },
    });
    const back = await deserialize(payload);
    expect(back?.activePanel).toBeUndefined();
  });

  it("drops a labels-kind activePanel pointing at a non-existent labels id", async () => {
    const payload = await wrap({
      B: [{ i: "B1", p: 0 }],
      A: { k: "labels", i: "GONE" },
    });
    expect((await deserialize(payload))?.activePanel).toBeUndefined();
  });

  it("drops a custom-kind activePanel pointing at a non-existent custom id", async () => {
    const payload = await wrap({
      C: [{ i: "C1", g: "SCALE x TO log", p: 0 }],
      A: { k: "custom", i: "GONE" },
    });
    expect((await deserialize(payload))?.activePanel).toBeUndefined();
  });

  it("drops an activePanel with an unknown kind", async () => {
    const payload = await wrap({
      L: [{ i: "L1", d: "point", m: { x: "a" } }],
      A: { k: "evil", i: "L1" },
    });
    expect((await deserialize(payload))?.activePanel).toBeUndefined();
  });

  it("drops a non-shared activePanel missing its id", async () => {
    const payload = await wrap({
      L: [{ i: "L1", d: "point", m: { x: "a" } }],
      A: { k: "layer" },
    });
    expect((await deserialize(payload))?.activePanel).toBeUndefined();
  });
});

describe("secondaryPanel persistence", () => {
  it("round-trips a settings-kind secondaryPanel paired with a layer activePanel", async () => {
    const sp: SecondaryPanel = { kind: "settings" };
    const s = await serialize({
      layers: [{ id: "L1", draw: "point", mappings: { x: "a" } }],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
      activePanel: { kind: "layer", layerId: "L1" },
      secondaryPanel: sp,
    });
    expect((await deserialize(s))?.secondaryPanel).toEqual(sp);
  });

  it("round-trips a mapping-kind secondaryPanel with a valid aes", async () => {
    const sp: SecondaryPanel = { kind: "mapping", aes: "x" };
    const s = await serialize({
      layers: [{ id: "L1", draw: "point", mappings: { x: "a" } }],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: null,
      activePanel: { kind: "layer", layerId: "L1" },
      secondaryPanel: sp,
    });
    expect((await deserialize(s))?.secondaryPanel).toEqual(sp);
  });

  it("drops secondaryPanel when activePanel is not a layer (invariant)", async () => {
    const payload = await wrap({
      A: { k: "shared" },
      D: { k: "settings" },
    });
    const back = await deserialize(payload);
    expect(back?.activePanel).toEqual({ kind: "shared" });
    expect(back?.secondaryPanel).toBeUndefined();
  });

  it("drops secondaryPanel when activePanel is missing entirely", async () => {
    const payload = await wrap({
      D: { k: "settings" },
    });
    expect((await deserialize(payload))?.secondaryPanel).toBeUndefined();
  });

  it("drops a mapping secondaryPanel with an unknown aes", async () => {
    const payload = await wrap({
      L: [{ i: "L1", d: "point", m: { x: "a" } }],
      A: { k: "layer", i: "L1" },
      D: { k: "mapping", a: "rogue" },
    });
    expect((await deserialize(payload))?.secondaryPanel).toBeUndefined();
  });

  it("drops a mapping secondaryPanel missing its aes", async () => {
    const payload = await wrap({
      L: [{ i: "L1", d: "point", m: { x: "a" } }],
      A: { k: "layer", i: "L1" },
      D: { k: "mapping" },
    });
    expect((await deserialize(payload))?.secondaryPanel).toBeUndefined();
  });

  it("drops a secondaryPanel with an unknown kind", async () => {
    const payload = await wrap({
      L: [{ i: "L1", d: "point", m: { x: "a" } }],
      A: { k: "layer", i: "L1" },
      D: { k: "evil" },
    });
    expect((await deserialize(payload))?.secondaryPanel).toBeUndefined();
  });

  it("legacy hash without A / D fields decodes both panels to undefined", async () => {
    const payload = await wrap({});
    const back = await deserialize(payload);
    expect(back?.activePanel).toBeUndefined();
    expect(back?.secondaryPanel).toBeUndefined();
  });
});
