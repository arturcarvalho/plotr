import { describe, expect, it } from "vitest";
import { buildQuery, type Layer } from "./buildQuery";
import { AUTO } from "./autoChart";
import type { ColumnInfo } from "./ggsql";

const COLS: ColumnInfo[] = [
  { name: "bill_len", kind: "numeric" },
  { name: "bill_dep", kind: "numeric" },
  { name: "species", kind: "string" },
  { name: "born_at", kind: "date" },
];

const layer = (
  draw: string,
  mappings: Layer["mappings"] = {},
  id = "L",
): Layer => ({ id, draw, mappings });

describe("buildQuery without auto resolution (existing)", () => {
  it("returns null with empty table", () => {
    expect(buildQuery("", [], {}, COLS)).toBeNull();
  });
  it("returns null when no layer has mappings", () => {
    expect(buildQuery("ggsql:penguins", [layer("point")], {}, COLS)).toBeNull();
  });
  it("emits a single DRAW line for one mapped concrete layer", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" })],
      {},
      COLS,
    );
    expect(q).toContain("VISUALISE FROM ggsql:penguins");
    expect(q).toContain("DRAW point MAPPING bill_len AS x, bill_dep AS y");
  });
  it("emits LABEL with single-quote escaping", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" })],
      { title: "Pen's" },
      COLS,
    );
    expect(q).toContain("LABEL title => 'Pen''s'");
  });
});

describe("buildQuery resolves AUTO via column kinds", () => {
  it("auto + continuous x → DRAW histogram", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer(AUTO, { x: "bill_len" })],
      {},
      COLS,
    );
    expect(q).toContain("DRAW histogram MAPPING bill_len AS x");
  });

  it("auto + continuous x + continuous y → DRAW point", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer(AUTO, { x: "bill_len", y: "bill_dep" })],
      {},
      COLS,
    );
    expect(q).toContain("DRAW point MAPPING bill_len AS x, bill_dep AS y");
  });

  it("auto + discrete x → DRAW bar", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer(AUTO, { x: "species" })],
      {},
      COLS,
    );
    expect(q).toContain("DRAW bar MAPPING species AS x");
  });

  it("auto + time x + continuous y → DRAW line", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer(AUTO, { x: "born_at", y: "bill_len" })],
      {},
      COLS,
    );
    expect(q).toContain("DRAW line MAPPING born_at AS x, bill_len AS y");
  });

  it("auto with no mappings produces no chart (returns null when sole layer)", () => {
    expect(
      buildQuery("ggsql:penguins", [layer(AUTO)], {}, COLS),
    ).toBeNull();
  });

  it("auto with combo without default (time x + time y) is dropped", () => {
    const dateCols: ColumnInfo[] = [
      { name: "a", kind: "date" },
      { name: "b", kind: "date" },
    ];
    expect(
      buildQuery(
        "t",
        [layer(AUTO, { x: "a", y: "b" })],
        {},
        dateCols,
      ),
    ).toBeNull();
  });

  it("mixed: one auto layer + one concrete layer emits both DRAW lines in order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        layer(AUTO, { x: "bill_len", y: "bill_dep" }, "L1"),
        layer("smooth", { x: "bill_len", y: "bill_dep" }, "L2"),
      ],
      {},
      COLS,
    );
    expect(q).not.toBeNull();
    const lines = q!.split("\n");
    const drawIdxs = lines
      .map((l, i) => (l.startsWith("DRAW ") ? i : -1))
      .filter((i) => i >= 0);
    expect(drawIdxs).toHaveLength(2);
    expect(lines[drawIdxs[0]]).toContain("DRAW point");
    expect(lines[drawIdxs[1]]).toContain("DRAW smooth");
  });
});

describe("color routing per layer type", () => {
  it("solid layer (point) emits AS fill instead of AS color", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep", color: "species" },
        } as Layer,
      ],
      {},
      COLS,
    );
    expect(q).toContain("species AS fill");
    expect(q).not.toContain("species AS color");
  });

  it("solid layer (bar) emits AS fill", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "bar",
          mappings: { x: "species", color: "species" },
        } as Layer,
      ],
      {},
      COLS,
    );
    expect(q).toContain("species AS fill");
  });

  it("line-like layer (line) emits AS color", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "line",
          mappings: { x: "bill_len", y: "bill_dep", color: "species" },
        } as Layer,
      ],
      {},
      COLS,
    );
    expect(q).toContain("species AS color");
    expect(q).not.toContain("species AS fill");
  });

  it("line-like layer (smooth) emits AS color", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "smooth",
          mappings: { x: "bill_len", y: "bill_dep", color: "species" },
        } as Layer,
      ],
      {},
      COLS,
    );
    expect(q).toContain("species AS color");
  });

  it("auto-resolved bar (discrete x) emits AS fill", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: AUTO,
          mappings: { x: "species", color: "species" },
        } as Layer,
      ],
      {},
      COLS,
    );
    expect(q).toContain("species AS fill");
    expect(q).toContain("DRAW bar");
  });
});

describe("buildQuery emits per-layer SETTING", () => {
  it("string setting wrapped in single quotes", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "bar",
          mappings: { x: "species" },
          settings: { position: "dodge" },
        },
      ],
      {},
      COLS,
    );
    expect(q).toContain(
      "DRAW bar MAPPING species AS x SETTING position => 'dodge'",
    );
  });

  it("multiple settings comma-separated, numbers bare, strings quoted", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "bar",
          mappings: { x: "species" },
          settings: { width: 0.5, position: "stack" },
        },
      ],
      {},
      COLS,
    );
    expect(q).toContain(
      "DRAW bar MAPPING species AS x SETTING width => 0.5, position => 'stack'",
    );
  });

  it("color/opacity/size on point", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { color: "blue", opacity: 0.6, size: 3 },
        },
      ],
      {},
      COLS,
    );
    expect(q).toContain(
      "DRAW point MAPPING bill_len AS x, bill_dep AS y SETTING color => 'blue', opacity => 0.6, size => 3",
    );
  });

  it("escapes single quotes in string settings", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { color: "O'Brien" },
        },
      ],
      {},
      COLS,
    );
    expect(q).toContain("SETTING color => 'O''Brien'");
  });

  it("undefined or empty settings → no SETTING clause", () => {
    const noSettings = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" })],
      {},
      COLS,
    );
    expect(noSettings).not.toContain("SETTING");
    const emptySettings = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: {},
        },
      ],
      {},
      COLS,
    );
    expect(emptySettings).not.toContain("SETTING");
  });
});

describe("buildQuery emits PROJECT clause", () => {
  const baseLayers: Layer[] = [
    { id: "L", draw: "point", mappings: { x: "bill_len", y: "bill_dep" } },
  ];

  it("ratio only", () => {
    const q = buildQuery("ggsql:penguins", baseLayers, {}, COLS, {
      ratio: 1.5,
    });
    expect(q).toContain("PROJECT TO cartesian\n  SETTING ratio => 1.5");
  });

  it("clip false", () => {
    const q = buildQuery("ggsql:penguins", baseLayers, {}, COLS, {
      clip: false,
    });
    expect(q).toContain("PROJECT TO cartesian\n  SETTING clip => false");
  });

  it("ratio and clip together, comma-separated", () => {
    const q = buildQuery("ggsql:penguins", baseLayers, {}, COLS, {
      ratio: 2,
      clip: false,
    });
    expect(q).toContain(
      "PROJECT TO cartesian\n  SETTING ratio => 2, clip => false",
    );
  });

  it("clip: true (default) does not emit PROJECT", () => {
    const q = buildQuery("ggsql:penguins", baseLayers, {}, COLS, {
      clip: true,
    });
    expect(q).not.toContain("PROJECT");
  });

  it("undefined project → no PROJECT line", () => {
    const q = buildQuery("ggsql:penguins", baseLayers, {}, COLS);
    expect(q).not.toContain("PROJECT");
  });
});
