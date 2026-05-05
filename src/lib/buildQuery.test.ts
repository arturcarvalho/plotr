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
    expect(buildQuery("", [], [], COLS)).toBeNull();
  });
  it("returns null when no layer has mappings", () => {
    expect(buildQuery("ggsql:penguins", [layer("point")], [], COLS)).toBeNull();
  });
  it("emits a single DRAW line for one mapped concrete layer", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" })],
      [],
      COLS,
    );
    expect(q).toContain("FROM ggsql:penguins");
    expect(q).toContain("VISUALISE");
    expect(q).toContain("DRAW point MAPPING bill_len AS x, bill_dep AS y");
  });

  it("FROM is always the first line", () => {
    const q1 = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" })],
      [],
      COLS,
    );
    expect(q1?.split("\n")[0]).toBe("FROM ggsql:penguins");

    const q2 = buildQuery(
      "ggsql:penguins",
      [{ id: "L", draw: "point", mappings: {} }],
      [],
      COLS,
      undefined,
      { x: "bill_len", y: "bill_dep" },
    );
    expect(q2?.split("\n")[0]).toBe("FROM ggsql:penguins");
  });
  it("emits LABEL with single-quote escaping", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" })],
      [{ title: "Pen's" }],
      COLS,
    );
    expect(q).toContain("LABEL title => 'Pen''s'");
  });

  it("merges multiple labels last-wins per field", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" })],
      [
        { title: "first", subtitle: "sub1" },
        { title: "second", caption: "cap2" },
      ],
      COLS,
    );
    expect(q).toContain("title => 'second'");
    expect(q).toContain("subtitle => 'sub1'");
    expect(q).toContain("caption => 'cap2'");
  });

  it("disabled labels layer is skipped during merge", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" })],
      [
        { title: "OldTitle", x: "ignored x" },
        // simulate a LabelsLayer with disabled=true; cast to satisfy Labels[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { title: "DisabledTitle", x: "should not appear", disabled: true } as any,
      ],
      COLS,
    );
    expect(q).toContain("title => 'OldTitle'");
    expect(q).not.toContain("DisabledTitle");
    expect(q).not.toContain("should not appear");
  });

  it("empty labels array → no LABEL line", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" })],
      [],
      COLS,
    );
    expect(q).not.toContain("LABEL");
  });

  it("emits x and y axis label entries", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" })],
      [{ x: "Bill length (mm)", y: "Bill depth (mm)" }],
      COLS,
    );
    expect(q).toContain("x => 'Bill length (mm)'");
    expect(q).toContain("y => 'Bill depth (mm)'");
  });
});

describe("buildQuery resolves AUTO via column kinds", () => {
  it("auto + continuous x → DRAW histogram", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer(AUTO, { x: "bill_len" })],
      [],
      COLS,
    );
    expect(q).toContain("DRAW histogram MAPPING bill_len AS x");
  });

  it("auto + continuous x + continuous y → DRAW point", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer(AUTO, { x: "bill_len", y: "bill_dep" })],
      [],
      COLS,
    );
    expect(q).toContain("DRAW point MAPPING bill_len AS x, bill_dep AS y");
  });

  it("auto + discrete x → DRAW bar", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer(AUTO, { x: "species" })],
      [],
      COLS,
    );
    expect(q).toContain("DRAW bar MAPPING species AS x");
  });

  it("auto + time x + continuous y → DRAW line", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer(AUTO, { x: "born_at", y: "bill_len" })],
      [],
      COLS,
    );
    expect(q).toContain("DRAW line MAPPING born_at AS x, bill_len AS y");
  });

  it("auto with no mappings produces no chart (returns null when sole layer)", () => {
    expect(
      buildQuery("ggsql:penguins", [layer(AUTO)], [], COLS),
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
        [],
        dateCols,
      ),
    ).toBeNull();
  });

  it("disabled layer is skipped (no DRAW line)", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L1",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          disabled: true,
        },
        layer("smooth", { x: "bill_len", y: "bill_dep" }, "L2"),
      ],
      [],
      COLS,
    );
    expect(q).not.toBeNull();
    const lines = q!.split("\n");
    const drawIdxs = lines
      .map((l, i) => (l.startsWith("DRAW ") ? i : -1))
      .filter((i) => i >= 0);
    expect(drawIdxs).toHaveLength(1);
    expect(lines[drawIdxs[0]]).toContain("DRAW smooth");
  });

  it("all layers disabled → no DRAW, returns null", () => {
    expect(
      buildQuery(
        "ggsql:penguins",
        [
          {
            id: "L1",
            draw: "point",
            mappings: { x: "bill_len", y: "bill_dep" },
            disabled: true,
          },
        ],
        [],
        COLS,
      ),
    ).toBeNull();
  });

  it("empty layers array → null", () => {
    expect(buildQuery("ggsql:penguins", [], [], COLS)).toBeNull();
  });

  it("mixed: one auto layer + one concrete layer emits both DRAW lines in order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        layer(AUTO, { x: "bill_len", y: "bill_dep" }, "L1"),
        layer("smooth", { x: "bill_len", y: "bill_dep" }, "L2"),
      ],
      [],
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

describe("buildQuery emits fill/stroke directly", () => {
  it("mapping fill emits AS fill", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep", fill: "species" },
        } as Layer,
      ],
      [],
      COLS,
    );
    expect(q).toContain("species AS fill");
  });

  it("mapping stroke emits AS stroke", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "line",
          mappings: { x: "bill_len", y: "bill_dep", stroke: "species" },
        } as Layer,
      ],
      [],
      COLS,
    );
    expect(q).toContain("species AS stroke");
  });

  it("mapping both fill and stroke emits both clauses", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: {
            x: "bill_len",
            y: "bill_dep",
            fill: "species",
            stroke: "species",
          },
        } as Layer,
      ],
      [],
      COLS,
    );
    expect(q).toContain("species AS fill");
    expect(q).toContain("species AS stroke");
  });

  it("line layer with stroke emits AS stroke (no implicit color routing)", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "line",
          mappings: { x: "bill_len", y: "bill_dep", stroke: "species" },
        } as Layer,
      ],
      [],
      COLS,
    );
    expect(q).not.toContain("AS color");
    expect(q).toContain("species AS stroke");
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
      [],
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
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW bar MAPPING species AS x SETTING width => 0.5, position => 'stack'",
    );
  });

  it("fill/opacity/size on point", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { fill: "blue", opacity: 0.6, size: 3 },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW point MAPPING bill_len AS x, bill_dep AS y SETTING fill => 'blue', opacity => 0.6, size => 3",
    );
  });

  it("stroke setting on line", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "line",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { stroke: "red" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("SETTING stroke => 'red'");
  });

  it("escapes single quotes in string settings", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { fill: "O'Brien" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("SETTING fill => 'O''Brien'");
  });

  it("undefined or empty settings → no SETTING clause", () => {
    const noSettings = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" })],
      [],
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
      [],
      COLS,
    );
    expect(emptySettings).not.toContain("SETTING");
  });
});

describe("noFill / noStroke toggles", () => {
  it("noFill skips fill mapping and emits fill => null", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep", fill: "species" },
          settings: { noFill: true },
        },
      ],
      [],
      COLS,
    );
    expect(q).not.toContain("species AS fill");
    expect(q).toContain("SETTING fill => null");
  });

  it("noStroke skips stroke mapping and emits stroke => null", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "line",
          mappings: { x: "bill_len", y: "bill_dep", stroke: "species" },
          settings: { noStroke: true },
        },
      ],
      [],
      COLS,
    );
    expect(q).not.toContain("species AS stroke");
    expect(q).toContain("SETTING stroke => null");
  });

  it("noFill overrides an explicit fill colour setting", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { fill: "blue", noFill: true },
        },
      ],
      [],
      COLS,
    );
    expect(q).not.toContain("fill => 'blue'");
    expect(q).toContain("fill => null");
  });

  it("noFill false (or undefined) leaves fill behaviour unchanged", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep", fill: "species" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("species AS fill");
    expect(q).not.toContain("=> null");
  });
});

describe("shared mappings (VISUALISE level)", () => {
  it("emits FROM and VISUALISE with shared mappings", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [{ id: "L", draw: "point", mappings: {} }],
      [],
      COLS,
      undefined,
      { x: "bill_len", y: "bill_dep" },
    );
    expect(q).toContain("FROM ggsql:penguins\n");
    expect(q).toContain("VISUALISE bill_len AS x, bill_dep AS y");
    expect(q).toContain("DRAW point");
    expect(q).not.toContain("DRAW point MAPPING");
  });

  it("layer with own fill alongside shared x/y emits both", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [{ id: "L", draw: "point", mappings: { fill: "species" } }],
      [],
      COLS,
      undefined,
      { x: "bill_len", y: "bill_dep" },
    );
    expect(q).toContain("FROM ggsql:penguins\n");
    expect(q).toContain("VISUALISE bill_len AS x, bill_dep AS y");
    expect(q).toContain("DRAW point MAPPING species AS fill");
  });

  it("empty shared mappings → bare VISUALISE line", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [{ id: "L", draw: "point", mappings: { x: "bill_len", y: "bill_dep" } }],
      [],
      COLS,
      undefined,
      {},
    );
    expect(q).toContain("FROM ggsql:penguins\n");
    expect(q).toContain("VISUALISE\n");
    expect(q).not.toContain("VISUALISE bill_len");
  });

  it("layer with no own mappings still emits DRAW when shared provides aesthetics", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        { id: "L1", draw: "point", mappings: {} },
        { id: "L2", draw: "smooth", mappings: {} },
      ],
      [],
      COLS,
      undefined,
      { x: "bill_len", y: "bill_dep" },
    );
    expect(q).toContain("DRAW point");
    expect(q).toContain("DRAW smooth");
  });

  it("AUTO resolves using shared x/y when layer has none", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [{ id: "L", draw: AUTO, mappings: {} }],
      [],
      COLS,
      undefined,
      { x: "bill_len", y: "bill_dep" },
    );
    expect(q).toContain("DRAW point");
  });

  it("returns null when neither shared nor layer mappings exist", () => {
    expect(
      buildQuery(
        "ggsql:penguins",
        [{ id: "L", draw: "point", mappings: {} }],
        [],
        COLS,
        undefined,
        undefined,
      ),
    ).toBeNull();
  });

  it("shared facet_col / facet_row drives FACET clause", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [{ id: "L", draw: "point", mappings: { x: "bill_len", y: "bill_dep" } }],
      [],
      COLS,
      undefined,
      { facet_col: "species" },
    );
    expect(q).toContain("FACET species");
  });
});

describe("buildQuery emits PROJECT clause", () => {
  const baseLayers: Layer[] = [
    { id: "L", draw: "point", mappings: { x: "bill_len", y: "bill_dep" } },
  ];

  it("ratio only", () => {
    const q = buildQuery("ggsql:penguins", baseLayers, [], COLS, {
      ratio: 1.5,
    });
    expect(q).toContain("PROJECT TO cartesian\n  SETTING ratio => 1.5");
  });

  it("clip false", () => {
    const q = buildQuery("ggsql:penguins", baseLayers, [], COLS, {
      clip: false,
    });
    expect(q).toContain("PROJECT TO cartesian\n  SETTING clip => false");
  });

  it("ratio and clip together, comma-separated", () => {
    const q = buildQuery("ggsql:penguins", baseLayers, [], COLS, {
      ratio: 2,
      clip: false,
    });
    expect(q).toContain(
      "PROJECT TO cartesian\n  SETTING ratio => 2, clip => false",
    );
  });

  it("clip: true (default) does not emit PROJECT", () => {
    const q = buildQuery("ggsql:penguins", baseLayers, [], COLS, {
      clip: true,
    });
    expect(q).not.toContain("PROJECT");
  });

  it("undefined project → no PROJECT line", () => {
    const q = buildQuery("ggsql:penguins", baseLayers, [], COLS);
    expect(q).not.toContain("PROJECT");
  });
});
