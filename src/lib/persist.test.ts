import { describe, expect, it } from "vitest";
import { deserialize, serialize, type Persisted } from "./persist";
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

  it("drops user CSV table names (no ggsql: prefix)", async () => {
    const s = await serialize({
      layers: [],
      labels: [],
      project: {},
      sharedMappings: {},
      activeTable: "my_csv",
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
