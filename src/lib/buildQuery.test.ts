import { describe, expect, it } from "vitest";
import {
  layerDrawClause,
  missingRequiredWarnings,
  buildQuery,
  CHART_LABELS,
  computeMissingRequired,
  DRAW_TYPES,
  formatColumnIdentifier,
  normalizeColorScales,
  pruneColorScales,
  type Aes,
  type CustomLayer,
  type Layer,
  type ScaleSettings,
} from "./buildQuery";
import { AUTO } from "./autoChart";
import type { ColumnInfo } from "./ggsql";
import ggsqlPkg from "./ggsql-wasm/package.json";

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

  it("FROM is the second line (header occupies first)", () => {
    const q1 = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" })],
      [],
      COLS,
    );
    expect(q1?.split("\n")[0].startsWith("--")).toBe(true);
    expect(q1?.split("\n")[1]).toBe("FROM ggsql:penguins");

    const q2 = buildQuery(
      "ggsql:penguins",
      [{ id: "L", draw: "point", mappings: {} }],
      [],
      COLS,
      undefined,
      { x: "bill_len", y: "bill_dep" },
    );
    expect(q2?.split("\n")[0].startsWith("--")).toBe(true);
    expect(q2?.split("\n")[1]).toBe("FROM ggsql:penguins");
  });

  it("prepends a versioned plotr header comment sourced from ggsql-wasm/package.json", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" })],
      [],
      COLS,
    );
    expect(q?.startsWith("-- Built on plotr.org with ggsql v")).toBe(true);
    expect(q?.split("\n")[0]).toBe(
      `-- Built on plotr.org with ggsql v${ggsqlPkg.version}`,
    );
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

describe("generated column identifiers", () => {
  it("leaves simple non-keyword identifiers bare", () => {
    expect(formatColumnIdentifier("bill_len")).toBe("bill_len");
  });

  it("quotes spaces, punctuation, reserved words, and embedded quotes", () => {
    expect(formatColumnIdentifier("bill length")).toBe('"bill length"');
    expect(formatColumnIdentifier("bill-length")).toBe('"bill-length"');
    expect(formatColumnIdentifier("from")).toBe('"from"');
    expect(formatColumnIdentifier('say"what')).toBe('"say""what"');
  });

  it("uses the formatter for layer/shared mappings, facets, and partitions", () => {
    const columns: ColumnInfo[] = [
      { name: "bill length", kind: "numeric" },
      { name: "from", kind: "numeric" },
      { name: "panel name", kind: "string" },
      { name: "group-name", kind: "string" },
    ];
    const q = buildQuery(
      "uploaded",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill length" },
          partition: ["group-name"],
        },
      ],
      [],
      columns,
      undefined,
      { y: "from", facet_row: "panel name" },
    );
    expect(q).toContain('VISUALISE "from" AS y');
    expect(q).toContain('MAPPING "bill length" AS x');
    expect(q).toContain('PARTITION BY "group-name"');
    expect(q).toContain('FACET "panel name"');
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

  it("emits linewidth setting", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "line",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { linewidth: 1.5 },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("SETTING linewidth => 1.5");
  });

  it("emits orientation setting on line", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "line",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { orientation: "aligned" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("SETTING orientation => 'aligned'");
  });

  it("emits range's geom-specific stack with ymin/ymax mappings", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "range",
          mappings: { x: "bill_len", ymin: "bill_dep", ymax: "bill_len" },
          settings: { width: 8, position: "identity", linewidth: 1.5 },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW range MAPPING bill_len AS x, bill_dep AS ymin, bill_len AS ymax SETTING width => 8, position => 'identity', linewidth => 1.5",
    );
  });

  it("emits ribbon's geom-specific stack in canonical order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "ribbon",
          mappings: { x: "bill_len", ymin: "bill_dep", ymax: "bill_len" },
          settings: { position: "identity", linewidth: 0.5 },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW ribbon MAPPING bill_len AS x, bill_dep AS ymin, bill_len AS ymax SETTING position => 'identity', linewidth => 0.5",
    );
  });

  it("emits smooth's full geom-specific stack in canonical order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "smooth",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: {
            position: "identity",
            linewidth: 2,
            bandwidth: 0.4,
            adjust: 1.1,
            kernel: "gaussian",
            method: "ols",
          },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW smooth MAPPING bill_len AS x, bill_dep AS y SETTING position => 'identity', linewidth => 2, bandwidth => 0.4, adjust => 1.1, kernel => 'gaussian', method => 'ols'",
    );
  });

  it("emits area's geom-specific stack in canonical order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "area",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: {
            position: "stack",
            linewidth: 0.8,
            orientation: "transposed",
          },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW area MAPPING bill_len AS x, bill_dep AS y SETTING position => 'stack', linewidth => 0.8, orientation => 'transposed'",
    );
  });

  it("emits rule's geom-specific stack in canonical order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "rule",
          mappings: { x: "bill_len" },
          settings: { linewidth: 1.5, slope: 0.5 },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW rule MAPPING bill_len AS x SETTING linewidth => 1.5, slope => 0.5",
    );
  });

  it("emits text's full geom-specific stack in canonical order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "text",
          mappings: { x: "bill_len", y: "bill_dep", label: "species" },
          settings: {
            position: "identity",
            italic: true,
            hjust: "left",
            vjust: "top",
            offset: { x: 0, y: -11 },
            rotation: 45,
            format: "%.2f",
          },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW text MAPPING bill_len AS x, bill_dep AS y, species AS label SETTING position => 'identity', italic => true, hjust => 'left', vjust => 'top', offset => (0, -11), rotation => 45, format => '%.2f'",
    );
  });

  it("emits text offset alone (no anchors)", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "text",
          mappings: { x: "bill_len", y: "bill_dep", label: "species" },
          settings: { offset: { x: 5, y: 5 } },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW text MAPPING bill_len AS x, bill_dep AS y, species AS label SETTING offset => (5, 5)",
    );
  });

  it("emits text anchors alone (no offset)", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "text",
          mappings: { x: "bill_len", y: "bill_dep", label: "species" },
          settings: { hjust: "centre", vjust: "middle" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW text MAPPING bill_len AS x, bill_dep AS y, species AS label SETTING hjust => 'centre', vjust => 'middle'",
    );
    expect(q).not.toContain("offset");
  });

  it("zero-fills missing offset axis at emission only", () => {
    const qx = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "text",
          mappings: { x: "bill_len", y: "bill_dep", label: "species" },
          settings: { offset: { x: 5 } },
        },
      ],
      [],
      COLS,
    );
    expect(qx).toContain("offset => (5, 0)");

    const qy = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "text",
          mappings: { x: "bill_len", y: "bill_dep", label: "species" },
          settings: { offset: { y: -11 } },
        },
      ],
      [],
      COLS,
    );
    expect(qy).toContain("offset => (0, -11)");
  });

  it("drops offset entirely when both axes are undefined", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "text",
          mappings: { x: "bill_len", y: "bill_dep", label: "species" },
          settings: { offset: {} },
        },
      ],
      [],
      COLS,
    );
    expect(q).not.toContain("offset");
    expect(q).not.toContain("SETTING");
  });

  it("emits density's full geom-specific stack in canonical order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "density",
          mappings: { x: "bill_len" },
          settings: {
            position: "identity",
            linewidth: 1.5,
            bandwidth: 0.3,
            adjust: 1.2,
            kernel: "epanechnikov",
          },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW density MAPPING bill_len AS x SETTING position => 'identity', linewidth => 1.5, bandwidth => 0.3, adjust => 1.2, kernel => 'epanechnikov'",
    );
  });

  it("emits boxplot's geom-specific stack in canonical order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "boxplot",
          mappings: { x: "species", y: "bill_len" },
          settings: {
            width: 0.6,
            position: "dodge",
            linewidth: 1.2,
            outliers: false,
            coef: 2,
          },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW boxplot MAPPING species AS x, bill_len AS y SETTING width => 0.6, position => 'dodge', linewidth => 1.2, outliers => false, coef => 2",
    );
  });

  it("emits bins + position + closed on histogram in canonical order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "histogram",
          mappings: { x: "bill_len" },
          settings: { position: "stack", bins: 50, closed: "left" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW histogram MAPPING bill_len AS x SETTING position => 'stack', bins => 50, closed => 'left'",
    );
  });

  it("emits binwidth + closed on histogram (binwidth strategy)", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "histogram",
          mappings: { x: "bill_len" },
          settings: { binwidth: 0.5, closed: "right" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW histogram MAPPING bill_len AS x SETTING binwidth => 0.5, closed => 'right'",
    );
  });

  it("emits violin's full geom-specific stack in canonical order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "violin",
          mappings: { x: "species", y: "bill_len" },
          settings: {
            width: 0.7,
            position: "dodge",
            linewidth: 1,
            bandwidth: 0.5,
            adjust: 1.2,
            kernel: "epanechnikov",
            side: "left",
            tails: 2,
          },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW violin MAPPING species AS x, bill_len AS y SETTING width => 0.7, position => 'dodge', linewidth => 1, bandwidth => 0.5, adjust => 1.2, kernel => 'epanechnikov', side => 'left', tails => 2",
    );
  });

  it("emits linewidth + position on tile in canonical order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "tile",
          mappings: { x: "species", y: "species" },
          settings: { position: "identity", linewidth: 0.5 },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW tile MAPPING species AS x, species AS y SETTING position => 'identity', linewidth => 0.5",
    );
  });

  it("emits linewidth + orientation on line in canonical order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "line",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { linewidth: 2, orientation: "transposed" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW line MAPPING bill_len AS x, bill_dep AS y SETTING linewidth => 2, orientation => 'transposed'",
    );
  });

  it("bar regression: width + position + fill + opacity emit in canonical order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "bar",
          mappings: { x: "species" },
          settings: {
            width: 0.5,
            position: "stack",
            fill: "blue",
            opacity: 0.7,
          },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW bar MAPPING species AS x SETTING width => 0.5, position => 'stack', fill => 'blue', opacity => 0.7",
    );
  });

  it("emits position + linewidth on point in canonical order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { position: "jitter", linewidth: 0.5 },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW point MAPPING bill_len AS x, bill_dep AS y SETTING position => 'jitter', linewidth => 0.5",
    );
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

describe("ymin / ymax aesthetics (ribbon only)", () => {
  it("emits ymin + ymax mappings for ribbon geom", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "ribbon",
          mappings: {
            x: "bill_len",
            ymin: "bill_dep",
            ymax: "bill_len",
          },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("bill_dep AS ymin");
    expect(q).toContain("bill_len AS ymax");
  });

  it("does NOT emit y for ribbon even when mapped (ggsql rejects it)", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "ribbon",
          mappings: {
            x: "bill_len",
            y: "bill_dep",
            ymin: "bill_dep",
            ymax: "bill_len",
          },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("bill_len AS x");
    expect(q).toContain("AS ymin");
    expect(q).toContain("AS ymax");
    expect(q).not.toContain("AS y,");
    expect(q).not.toContain("AS y\n");
    expect(q).not.toMatch(/AS y$/m);
  });

  it("does NOT emit y for range even when mapped (ggsql rejects it)", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "range",
          mappings: {
            x: "bill_len",
            y: "bill_dep",
            ymin: "bill_dep",
            ymax: "bill_len",
          },
        },
      ],
      [],
      COLS,
    );
    expect(q).not.toMatch(/AS y[\s,]/);
  });

  it("does NOT emit ymin / ymax for non-ribbon geom", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: {
            x: "bill_len",
            y: "bill_dep",
            ymin: "bill_dep",
            ymax: "bill_len",
          },
        },
      ],
      [],
      COLS,
    );
    expect(q).not.toContain("AS ymin");
    expect(q).not.toContain("AS ymax");
  });
});

describe("label aesthetic (text geom only)", () => {
  it("emits label mapping for text geom", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "text",
          mappings: { x: "bill_len", y: "bill_dep", label: "species" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("species AS label");
  });

  it("does NOT emit label mapping for non-text geom", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep", label: "species" },
        },
      ],
      [],
      COLS,
    );
    expect(q).not.toContain("AS label");
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

  it("ignores disabled legacy facet mappings and finds the first enabled mapped layer", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "disabled",
          draw: "point",
          disabled: true,
          mappings: {
            x: "bill_len",
            y: "bill_dep",
            facet_col: "island",
          },
        },
        {
          id: "enabled",
          draw: "point",
          mappings: {
            x: "bill_len",
            y: "bill_dep",
            facet_col: "species",
          },
        },
      ],
      [],
      [...COLS, { name: "island", kind: "string" }],
    );
    expect(q).toContain("FACET species");
    expect(q).not.toContain("FACET island");
  });
});

describe("buildQuery emits SCALE for palettes (chart-level scales)", () => {
  const q = (
    layers: Layer[],
    scales: ScaleSettings = {},
    shared?: Partial<Record<Aes, string>>,
  ) =>
    buildQuery(
      "ggsql:penguins",
      layers,
      [],
      COLS,
      undefined,
      shared,
      undefined,
      scales,
    );
  const point = (
    mappings: Layer["mappings"],
    settings?: Layer["settings"],
  ): Layer => ({ id: "L", draw: "point", mappings, settings });

  it("discrete fill mapping + fillPaletteDiscrete → SCALE fill TO <palette>", () => {
    const out = q([point({ x: "bill_len", y: "bill_dep", fill: "species" })], {
      fillPaletteDiscrete: "set1",
    });
    expect(out).toContain("species AS fill");
    expect(out).toContain("SCALE fill TO set1");
  });

  it("continuous fill mapping + fillPaletteContinuous → SCALE fill TO <palette>", () => {
    const out = q([point({ x: "bill_len", y: "bill_dep", fill: "bill_dep" })], {
      fillPaletteContinuous: "viridis",
    });
    expect(out).toContain("bill_dep AS fill");
    expect(out).toContain("SCALE fill TO viridis");
  });

  it("palette slot is emitted regardless of mapping (no mapping)", () => {
    const out = q([point({ x: "bill_len", y: "bill_dep" })], {
      fillPaletteDiscrete: "set1",
    });
    expect(out).toContain("SCALE fill TO set1");
  });

  it("empty palette slot → no SCALE clause (ggsql default applies)", () => {
    const out = q([point({ x: "bill_len", y: "bill_dep", fill: "species" })]);
    expect(out).not.toContain("SCALE");
  });

  it("stroke palette → SCALE stroke TO <palette>", () => {
    const out = q(
      [
        {
          id: "L",
          draw: "line",
          mappings: { x: "bill_len", y: "bill_dep", stroke: "species" },
        },
      ],
      { strokePaletteDiscrete: "tableau10" },
    );
    expect(out).toContain("SCALE stroke TO tableau10");
  });

  it("fixed fill setting (per-layer) and fill mapping both emit", () => {
    const out = q([
      point({ x: "bill_len", y: "bill_dep", fill: "species" }, { fill: "blue" }),
    ]);
    expect(out).toContain("fill => 'blue'");
    expect(out).toContain("species AS fill");
  });

  it("per-layer fixed fill + chart-level palettes all emit", () => {
    const out = q([point({ x: "bill_len", y: "bill_dep" }, { fill: "blue" })], {
      fillPaletteDiscrete: "set1",
      fillPaletteContinuous: "viridis",
    });
    expect(out).toContain("fill => 'blue'");
    expect(out).toContain("SCALE fill TO set1");
    expect(out).toContain("SCALE fill TO viridis");
  });

  it("explicit default palette name still emits SCALE clause", () => {
    const out = q([point({ x: "bill_len", y: "bill_dep", fill: "species" })], {
      fillPaletteDiscrete: "ggsql10",
    });
    expect(out).toContain("SCALE fill TO ggsql10");
  });

  it("noFill (per-layer) wins over mapping; chart-level SCALE still emits", () => {
    const out = q(
      [
        point(
          { x: "bill_len", y: "bill_dep", fill: "species" },
          { noFill: true },
        ),
      ],
      { fillPaletteDiscrete: "set1" },
    );
    expect(out).toContain("fill => null");
    expect(out).not.toContain("species AS fill");
    expect(out).toContain("SCALE fill TO set1");
  });

  it("palette is chart-level: emitted with a shared fill mapping", () => {
    const out = q([point({})], { fillPaletteDiscrete: "set2" }, {
      x: "bill_len",
      y: "bill_dep",
      fill: "species",
    });
    expect(out).toContain("SCALE fill TO set2");
  });

  it("one SCALE fill regardless of layer count (chart-level, not per-layer)", () => {
    const out = q(
      [
        point({ x: "bill_len", y: "bill_dep", fill: "species" }),
        {
          id: "L2",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep", fill: "species" },
        },
      ],
      { fillPaletteDiscrete: "set1" },
    );
    expect(
      out!.split("\n").filter((l) => l.startsWith("SCALE fill")),
    ).toHaveLength(1);
  });

  it("discrete palette + reverse → SCALE fill TO <palette> SETTING reverse => true", () => {
    const out = q([point({ x: "bill_len", y: "bill_dep", fill: "species" })], {
      fillPaletteDiscrete: "set1",
      fillPaletteDiscreteReverse: true,
    });
    expect(out).toContain("SCALE fill TO set1 SETTING reverse => true");
  });

  it("continuous palette + reverse → SCALE fill TO <palette> SETTING reverse => true", () => {
    const out = q([point({ x: "bill_len", y: "bill_dep", fill: "bill_dep" })], {
      fillPaletteContinuous: "viridis",
      fillPaletteContinuousReverse: true,
    });
    expect(out).toContain("SCALE fill TO viridis SETTING reverse => true");
  });

  it("reverse without a palette → bare SCALE fill SETTING reverse => true", () => {
    const out = q([point({ x: "bill_len", y: "bill_dep", fill: "species" })], {
      fillPaletteDiscreteReverse: true,
    });
    expect(out).toContain("SCALE fill SETTING reverse => true");
    expect(out).not.toContain("SCALE fill TO");
  });

  it("stroke palette + reverse → SCALE stroke TO <palette> SETTING reverse => true", () => {
    const out = q(
      [
        {
          id: "L",
          draw: "line",
          mappings: { x: "bill_len", y: "bill_dep", stroke: "species" },
        },
      ],
      { strokePaletteDiscrete: "tableau10", strokePaletteDiscreteReverse: true },
    );
    expect(out).toContain("SCALE stroke TO tableau10 SETTING reverse => true");
  });

  it("palette without reverse omits the SETTING clause", () => {
    const out = q([point({ x: "bill_len", y: "bill_dep", fill: "species" })], {
      fillPaletteDiscrete: "set1",
    });
    expect(out).toContain("SCALE fill TO set1");
    expect(out).not.toContain("reverse");
  });
});

describe("pruneColorScales (drop the unreachable opposite-kind palette slot)", () => {
  it("discrete mode drops the continuous palette + reverse slots", () => {
    const out = pruneColorScales("fill", "discrete", {
      fillPaletteDiscrete: "set1",
      fillPaletteContinuous: "viridis",
      fillPaletteContinuousReverse: true,
    });
    expect(out).toEqual({ fillPaletteDiscrete: "set1" });
  });

  it("continuous mode drops the discrete palette + reverse slots", () => {
    const out = pruneColorScales("fill", "continuous", {
      fillPaletteContinuous: "viridis",
      fillPaletteDiscrete: "set1",
      fillPaletteDiscreteReverse: true,
    });
    expect(out).toEqual({ fillPaletteContinuous: "viridis" });
  });

  it("keeps the active-kind palette + reverse untouched", () => {
    const scales: ScaleSettings = {
      fillPaletteDiscrete: "set1",
      fillPaletteDiscreteReverse: true,
    };
    expect(pruneColorScales("fill", "discrete", scales)).toEqual(scales);
  });

  it("only prunes the requested aesthetic — stroke slots survive a fill prune", () => {
    const out = pruneColorScales("fill", "discrete", {
      fillPaletteContinuous: "viridis",
      strokePaletteContinuous: "magma",
    });
    expect(out).toEqual({ strokePaletteContinuous: "magma" });
  });

  it("prunes the stroke aesthetic independently", () => {
    const out = pruneColorScales("stroke", "continuous", {
      strokePaletteDiscrete: "tableau10",
      strokePaletteDiscreteReverse: true,
      strokePaletteContinuous: "magma",
    });
    expect(out).toEqual({ strokePaletteContinuous: "magma" });
  });

  it("fixed mode preserves both palettes (transient unmap must not lose a pick)", () => {
    const scales: ScaleSettings = {
      fillPaletteDiscrete: "set1",
      fillPaletteContinuous: "viridis",
    };
    expect(pruneColorScales("fill", "fixed", scales)).toEqual(scales);
  });

  it("drops a reverse-only opposite slot (no palette set)", () => {
    const out = pruneColorScales("fill", "discrete", {
      fillPaletteContinuousReverse: true,
    });
    expect(out).toEqual({});
  });

  it("returns the SAME reference when nothing needs pruning (skips a no-op write)", () => {
    const scales: ScaleSettings = { fillPaletteDiscrete: "set1" };
    expect(pruneColorScales("fill", "discrete", scales)).toBe(scales);
  });

  it("leaves axis scale settings alone", () => {
    const out = pruneColorScales("fill", "discrete", {
      fillPaletteContinuous: "viridis",
      xFormat: "{:num %.0f}",
      yBreaks: "0, 10",
    });
    expect(out).toEqual({ xFormat: "{:num %.0f}", yBreaks: "0, 10" });
  });
});

describe("normalizeColorScales", () => {
  it("uses the first enabled layer mapping when the colour panel is closed", () => {
    const out = normalizeColorScales(
      [
        {
          id: "disabled",
          draw: "point",
          disabled: true,
          mappings: { fill: "bill_len" },
        },
        {
          id: "enabled",
          draw: "point",
          mappings: { fill: "species" },
        },
      ],
      {},
      COLS,
      {
        fillPaletteDiscrete: "set1",
        fillPaletteContinuous: "viridis",
      },
    );
    expect(out).toEqual({ fillPaletteDiscrete: "set1" });
  });

  it("lets a shared mapping override layer mappings", () => {
    const out = normalizeColorScales(
      [{ id: "L", draw: "point", mappings: { fill: "species" } }],
      { fill: "bill_len" },
      COLS,
      {
        fillPaletteDiscrete: "set1",
        fillPaletteContinuous: "viridis",
      },
    );
    expect(out).toEqual({ fillPaletteContinuous: "viridis" });
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

describe("buildQuery pie chart (translates to bar + PROJECT TO polar)", () => {
  it("DRAW_TYPES includes 'pie'", () => {
    expect(DRAW_TYPES).toContain("pie");
  });

  it("concrete pie layer with fill emits DRAW bar + PROJECT TO polar", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("pie", { fill: "species" })],
      [],
      COLS,
    );
    expect(q).toContain("DRAW bar MAPPING species AS fill");
    expect(q).toContain("PROJECT TO polar");
    expect(q).not.toContain("DRAW pie");
  });

  it("AUTO layer with only fill resolves to pie and emits bar + polar", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer(AUTO, { fill: "species" })],
      [],
      COLS,
    );
    expect(q).toContain("DRAW bar MAPPING species AS fill");
    expect(q).toContain("PROJECT TO polar");
  });

  it("two pie layers → PROJECT TO polar appears exactly once", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        layer("pie", { fill: "species" }, "L1"),
        layer("pie", { fill: "born_at" }, "L2"),
      ],
      [],
      COLS,
    );
    const matches = q?.match(/PROJECT TO polar/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("pie overrides cartesian project settings (polar wins, no cartesian line)", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("pie", { fill: "species" })],
      [],
      COLS,
      { clip: false },
    );
    expect(q).toContain("PROJECT TO polar");
    expect(q).not.toContain("PROJECT TO cartesian");
  });

  it("disabled pie layer → no polar projection emitted", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        { ...layer("pie", { fill: "species" }), disabled: true },
        layer("point", { x: "bill_len", y: "bill_dep" }),
      ],
      [],
      COLS,
    );
    expect(q).toContain("DRAW point");
    expect(q).not.toContain("PROJECT TO polar");
    expect(q).not.toContain("DRAW bar");
  });
});

describe("buildQuery custom layers (per-position insertion)", () => {
  const customLayer = (
    ggsql: string,
    position: number,
    id = "C",
  ): CustomLayer => ({ id, ggsql, position });

  it("custom at position 0 emits before the first DRAW", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" }, "L0")],
      [],
      COLS,
      undefined,
      undefined,
      [customLayer("SCALE x TO log", 0, "C0")],
    );
    const lines = q!.split("\n");
    const customIdx = lines.indexOf("SCALE x TO log");
    const drawIdx = lines.findIndex((l) => l.startsWith("DRAW"));
    expect(customIdx).toBeGreaterThanOrEqual(0);
    expect(drawIdx).toBeGreaterThan(customIdx);
  });

  it("custom at position 1 sits between two DRAW lines", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        layer("point", { x: "bill_len", y: "bill_dep" }, "L0"),
        layer("smooth", { x: "bill_len", y: "bill_dep" }, "L1"),
      ],
      [],
      COLS,
      undefined,
      undefined,
      [customLayer("SETTING anchor => 'top'", 1, "C0")],
    );
    const lines = q!.split("\n");
    const drawIdxs = lines
      .map((l, i) => (l.startsWith("DRAW") ? i : -1))
      .filter((i) => i >= 0);
    const customIdx = lines.indexOf("SETTING anchor => 'top'");
    expect(drawIdxs.length).toBe(2);
    expect(customIdx).toBeGreaterThan(drawIdxs[0]);
    expect(customIdx).toBeLessThan(drawIdxs[1]);
  });

  it("custom at trailing position appears after all DRAW lines, before SCALE/FACET/PROJECT/LABEL", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        layer("point", { x: "bill_len", y: "bill_dep" }, "L0"),
        layer("smooth", { x: "bill_len", y: "bill_dep" }, "L1"),
      ],
      [{ title: "Hi" }],
      COLS,
      { clip: false },
      undefined,
      [customLayer("SCALE y TO sqrt", 2, "C0")],
    );
    const lines = q!.split("\n");
    const customIdx = lines.indexOf("SCALE y TO sqrt");
    const drawIdxs = lines
      .map((l, i) => (l.startsWith("DRAW") ? i : -1))
      .filter((i) => i >= 0);
    const lastDrawIdx = drawIdxs[drawIdxs.length - 1];
    const projectIdx = lines.findIndex((l) => l.startsWith("PROJECT"));
    const labelIdx = lines.findIndex((l) => l.startsWith("LABEL"));
    expect(customIdx).toBeGreaterThan(lastDrawIdx);
    expect(customIdx).toBeLessThan(projectIdx);
    expect(customIdx).toBeLessThan(labelIdx);
  });

  it("disabled custom is skipped", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" }, "L0")],
      [],
      COLS,
      undefined,
      undefined,
      [{ ...customLayer("SCALE x TO log", 0, "C0"), disabled: true }],
    );
    expect(q).not.toContain("SCALE x TO log");
  });

  it("empty / whitespace-only ggsql is skipped", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" }, "L0")],
      [],
      COLS,
      undefined,
      undefined,
      [
        customLayer("", 0, "C0"),
        customLayer("   \n  \t", 0, "C1"),
      ],
    );
    const lines = q!.split("\n");
    expect(lines.filter((l) => l === "").length).toBe(0);
    // The query has only the standard structure (no extra blank lines from skipped customs).
    expect(lines).toContain("DRAW point MAPPING bill_len AS x, bill_dep AS y");
  });

  it("multi-line ggsql is preserved verbatim", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" }, "L0")],
      [],
      COLS,
      undefined,
      undefined,
      [customLayer("SCALE x TO log\nPROJECT TO polar", 1, "C0")],
    );
    expect(q).toContain("SCALE x TO log\nPROJECT TO polar");
  });

  it("two customs at the same position emit in array order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [layer("point", { x: "bill_len", y: "bill_dep" }, "L0")],
      [],
      COLS,
      undefined,
      undefined,
      [
        customLayer("FIRST", 0, "C0"),
        customLayer("SECOND", 0, "C1"),
      ],
    );
    const lines = q!.split("\n");
    const firstIdx = lines.indexOf("FIRST");
    const secondIdx = lines.indexOf("SECOND");
    expect(firstIdx).toBeGreaterThanOrEqual(0);
    expect(secondIdx).toBeGreaterThan(firstIdx);
  });
});

describe("DRAW_TYPES order is locked", () => {
  it("matches the agreed grid order — update + ASK USER before reshuffling", () => {
    expect(DRAW_TYPES).toEqual([
      "point",
      "bar",
      "line",
      "tile",
      "violin",
      "pie",
      "histogram",
      "boxplot",
      "density",
      "area",
      "smooth",
      "ribbon",
      "range",
      "text",
      "rule",
    ]);
  });

  it("every DRAW_TYPES entry has a CHART_LABELS mapping", () => {
    for (const t of DRAW_TYPES) {
      expect(CHART_LABELS[t]).toBeDefined();
    }
  });
});

describe("computeMissingRequired", () => {
  it("text with label mapped → no missing", () => {
    expect(
      computeMissingRequired("text", { x: "a", y: "b", label: "c" }),
    ).toEqual([]);
  });

  it("text without label → [label]", () => {
    expect(computeMissingRequired("text", { x: "a", y: "b" })).toEqual([
      "label",
    ]);
  });

  it("text with label empty string treated as missing", () => {
    expect(
      computeMissingRequired("text", { x: "a", y: "b", label: "" }),
    ).toEqual(["label"]);
  });

  it("ribbon with ymin set, ymax unset → [ymax]", () => {
    expect(computeMissingRequired("ribbon", { x: "a", ymin: "lo" })).toEqual([
      "ymax",
    ]);
  });

  it("ribbon with neither → [ymin, ymax]", () => {
    expect(computeMissingRequired("ribbon", { x: "a" })).toEqual([
      "ymin",
      "ymax",
    ]);
  });

  it("ribbon with both → no missing", () => {
    expect(
      computeMissingRequired("ribbon", { x: "a", ymin: "lo", ymax: "hi" }),
    ).toEqual([]);
  });

  it("range mirrors ribbon (same required set)", () => {
    expect(computeMissingRequired("range", { x: "a" })).toEqual([
      "ymin",
      "ymax",
    ]);
  });

  it("point geom has no geom-specific required → []", () => {
    expect(computeMissingRequired("point", {})).toEqual([]);
  });

  it("null / undefined / unknown draw → [] (no constraints)", () => {
    expect(computeMissingRequired(null, { x: "a" })).toEqual([]);
    expect(computeMissingRequired(undefined, {})).toEqual([]);
    expect(computeMissingRequired("nonexistent", { x: "a" })).toEqual([]);
  });
});

describe("buildQuery emits per-layer FILTER", () => {
  it("emits FILTER at the END of the DRAW line (after MAPPING)", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { filter: "species = 'Adelie'" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW point MAPPING bill_len AS x, bill_dep AS y FILTER species = 'Adelie'",
    );
  });

  it("FILTER comes after SETTING per ggsql grammar order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "bar",
          mappings: { x: "species" },
          settings: { position: "dodge", filter: "body_mass > 4000" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW bar MAPPING species AS x SETTING position => 'dodge' FILTER body_mass > 4000",
    );
  });

  it("each layer carries its own FILTER independently", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L1",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { filter: "species = 'Adelie'" },
        },
        {
          id: "L2",
          draw: "smooth",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { filter: "species = 'Gentoo'" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW point MAPPING bill_len AS x, bill_dep AS y FILTER species = 'Adelie'",
    );
    expect(q).toContain(
      "DRAW smooth MAPPING bill_len AS x, bill_dep AS y FILTER species = 'Gentoo'",
    );
  });

  it("disabled layer skips its DRAW (and FILTER) entirely", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L1",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
        },
        {
          id: "L2",
          draw: "smooth",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { filter: "species = 'Gentoo'" },
          disabled: true,
        },
      ],
      [],
      COLS,
    );
    expect(q).not.toContain("Gentoo");
    expect(q).not.toContain("FILTER");
  });

  it("empty / whitespace-only filter is dropped (no FILTER clause)", () => {
    const empty = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { filter: "" },
        },
      ],
      [],
      COLS,
    );
    expect(empty).not.toContain("FILTER");

    const ws = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { filter: "   \t  " },
        },
      ],
      [],
      COLS,
    );
    expect(ws).not.toContain("FILTER");
  });

  it("filter value is trimmed before emission", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { filter: "   species = 'Adelie'   " },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW point MAPPING bill_len AS x, bill_dep AS y FILTER species = 'Adelie'",
    );
    expect(q).not.toContain("FILTER    species");
  });

  it("compound predicates pass through verbatim", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { filter: "sex = 'female' AND body_mass > 4000" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("FILTER sex = 'female' AND body_mass > 4000");
  });
});

describe("buildQuery emits SCALE … RENAMING for axis formatters (chart-level scales)", () => {
  const q = (scales: ScaleSettings, layers?: Layer[]) =>
    buildQuery(
      "ggsql:penguins",
      layers ?? [
        { id: "L", draw: "point", mappings: { x: "bill_len", y: "bill_dep" } },
      ],
      [],
      COLS,
      undefined,
      undefined,
      undefined,
      scales,
    );

  it("xFormat emits SCALE x RENAMING * => '<template>'", () => {
    expect(q({ xFormat: "{:num %.2f}" })).toContain(
      "SCALE x RENAMING * => '{:num %.2f}'",
    );
  });

  it("yFormat emits SCALE y RENAMING * => '<template>'", () => {
    expect(q({ yFormat: "{:time %Y-%m}" })).toContain(
      "SCALE y RENAMING * => '{:time %Y-%m}'",
    );
  });

  it("both formatters appear in x-then-y order", () => {
    const out = q({ xFormat: "{:num %.2f}", yFormat: "{:num %.1f}" });
    const xIdx = out!.indexOf("SCALE x RENAMING");
    const yIdx = out!.indexOf("SCALE y RENAMING");
    expect(xIdx).toBeGreaterThan(-1);
    expect(yIdx).toBeGreaterThan(-1);
    expect(xIdx).toBeLessThan(yIdx);
  });

  it("chart-level: one SCALE x regardless of layer count", () => {
    const out = q({ xFormat: "{:num %.2f}" }, [
      { id: "L1", draw: "point", mappings: { x: "bill_len", y: "bill_dep" } },
      { id: "L2", draw: "smooth", mappings: { x: "bill_len", y: "bill_dep" } },
    ]);
    expect(out!.split("\n").filter((l) => l.startsWith("SCALE x"))).toHaveLength(
      1,
    );
    expect(out).toContain("SCALE x RENAMING * => '{:num %.2f}'");
  });

  it("empty / whitespace-only xFormat emits no SCALE x RENAMING clause", () => {
    expect(q({ xFormat: "" })).not.toContain("RENAMING");
    expect(q({ xFormat: "  \t  " })).not.toContain("RENAMING");
  });

  it("single-quote in the template is SQL-escaped (doubled)", () => {
    expect(q({ xFormat: "it's {}" })).toContain(
      "SCALE x RENAMING * => 'it''s {}'",
    );
  });

  it("axis SCALE coexists with palette SCALE clauses", () => {
    const out = q({ xFormat: "{:num %.2f}", fillPaletteDiscrete: "ggsql10" }, [
      {
        id: "L",
        draw: "point",
        mappings: { x: "bill_len", y: "bill_dep", fill: "species" },
      },
    ]);
    expect(out).toContain("SCALE fill TO ggsql10");
    expect(out).toContain("SCALE x RENAMING * => '{:num %.2f}'");
  });
});

describe("buildQuery emits per-layer PARTITION BY", () => {
  it("emits PARTITION BY at the END of the DRAW line, comma-joined", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "line",
          mappings: { x: "born_at", y: "bill_len" },
          partition: ["species", "island"],
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW line MAPPING born_at AS x, bill_len AS y PARTITION BY species, island",
    );
  });

  it("PARTITION BY comes after FILTER per ggsql grammar order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "line",
          mappings: { x: "born_at", y: "bill_len" },
          settings: { filter: "body_mass > 4000" },
          partition: ["species"],
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW line MAPPING born_at AS x, bill_len AS y FILTER body_mass > 4000 PARTITION BY species",
    );
  });

  it("emits nothing when partition is empty or absent", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          partition: [],
        },
      ],
      [],
      COLS,
    );
    expect(q).not.toContain("PARTITION BY");
  });

  it("each layer carries its own PARTITION BY independently", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L1",
          draw: "line",
          mappings: { x: "born_at", y: "bill_len" },
          partition: ["species"],
        },
        {
          id: "L2",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW line MAPPING born_at AS x, bill_len AS y PARTITION BY species",
    );
    expect(q).toContain("DRAW point MAPPING bill_len AS x, bill_dep AS y");
    expect(q).not.toContain(
      "DRAW point MAPPING bill_len AS x, bill_dep AS y PARTITION BY",
    );
  });
});

describe("buildQuery emits SCALE … SETTING breaks for axis breaks (chart-level scales)", () => {
  const q = (scales: ScaleSettings) =>
    buildQuery(
      "ggsql:penguins",
      [{ id: "L", draw: "point", mappings: { x: "bill_len", y: "bill_dep" } }],
      [],
      COLS,
      undefined,
      undefined,
      undefined,
      scales,
    );

  it("xBreaks emits SCALE x SETTING breaks => (<values>)", () => {
    expect(q({ xBreaks: "2000, 2010" })).toContain(
      "SCALE x SETTING breaks => (2000, 2010)",
    );
  });

  it("yBreaks emits SCALE y SETTING breaks => (<values>)", () => {
    expect(q({ yBreaks: "0, 50, 100" })).toContain(
      "SCALE y SETTING breaks => (0, 50, 100)",
    );
  });

  it("breaks + format fold into ONE SCALE clause, SETTING before RENAMING", () => {
    const out = q({ xBreaks: "2000, 2010", xFormat: "{:num %.0f}" });
    expect(out).toContain(
      "SCALE x SETTING breaks => (2000, 2010) RENAMING * => '{:num %.0f}'",
    );
    expect(out!.split("\n").filter((l) => l.startsWith("SCALE x"))).toHaveLength(
      1,
    );
  });

  it("empty / whitespace breaks emits no SETTING breaks", () => {
    expect(q({ xBreaks: "   " })).not.toContain("SETTING breaks");
  });
});

describe("layerDrawClause", () => {
  it("emits the same DRAW clause buildQuery would for a mapped layer", () => {
    const r = layerDrawClause(
      layer("point", { x: "bill_len", y: "bill_dep" }),
      COLS,
    );
    expect(r).toEqual({
      draw: "point",
      clause: "DRAW point MAPPING bill_len AS x, bill_dep AS y",
    });
  });

  it("returns null when the layer has no own or shared aesthetics", () => {
    expect(layerDrawClause(layer("point"), COLS)).toBeNull();
  });

  it("resolves via shared mappings alone (clause without MAPPING)", () => {
    const r = layerDrawClause(layer("point"), COLS, {
      x: "bill_len",
      y: "bill_dep",
    });
    expect(r).toEqual({ draw: "point", clause: "DRAW point" });
  });

  it("ignores the disabled flag (caller gates on it)", () => {
    const r = layerDrawClause(
      { ...layer("point", { x: "bill_len" }), disabled: true },
      COLS,
    );
    expect(r?.clause).toBe("DRAW point MAPPING bill_len AS x");
  });

  it("resolves pie to a DRAW bar clause but reports draw 'pie'", () => {
    const r = layerDrawClause(layer("pie", { fill: "species" }), COLS);
    expect(r?.draw).toBe("pie");
    expect(r?.clause).toBe("DRAW bar MAPPING species AS fill");
  });

  it("appends SETTING, FILTER and PARTITION tails", () => {
    const r = layerDrawClause(
      {
        ...layer("point", { x: "bill_len", y: "bill_dep" }),
        settings: { linewidth: 3, filter: "species = 'Adelie'" },
        partition: ["species"],
      },
      COLS,
    );
    expect(r?.clause).toBe(
      "DRAW point MAPPING bill_len AS x, bill_dep AS y SETTING linewidth => 3 FILTER species = 'Adelie' PARTITION BY species",
    );
  });

  it("drops a stale y mapping for ribbon", () => {
    const r = layerDrawClause(
      layer("ribbon", { x: "bill_len", y: "bill_dep", ymin: "bill_len", ymax: "bill_dep" }),
      COLS,
    );
    expect(r?.clause).toBe(
      "DRAW ribbon MAPPING bill_len AS x, bill_len AS ymin, bill_dep AS ymax",
    );
  });

  it("keeps label only for the text geom", () => {
    const text = layerDrawClause(
      layer("text", { x: "bill_len", y: "bill_dep", label: "species" }),
      COLS,
    );
    expect(text?.clause).toContain("species AS label");
    const point = layerDrawClause(
      layer("point", { x: "bill_len", y: "bill_dep", label: "species" }),
      COLS,
    );
    expect(point?.clause).not.toContain("AS label");
  });
});

describe("missing required aesthetics skip the layer instead of erroring", () => {
  it("layerDrawClause returns null for text without a label mapping", () => {
    expect(
      layerDrawClause(layer("text", { x: "bill_len", y: "bill_dep" }), COLS),
    ).toBeNull();
  });

  it("layerDrawClause treats an empty-string label as missing", () => {
    expect(
      layerDrawClause(
        layer("text", { x: "bill_len", y: "bill_dep", label: "" }),
        COLS,
      ),
    ).toBeNull();
  });

  it("layerDrawClause returns null for ribbon/range with partial ymin/ymax", () => {
    expect(layerDrawClause(layer("ribbon", { x: "bill_len" }), COLS)).toBeNull();
    expect(
      layerDrawClause(layer("ribbon", { x: "bill_len", ymin: "bill_dep" }), COLS),
    ).toBeNull();
    expect(
      layerDrawClause(layer("range", { x: "bill_len", y: "bill_dep" }), COLS),
    ).toBeNull();
  });

  it("layerDrawClause returns null for a shared-mappings-only text layer", () => {
    expect(
      layerDrawClause(layer("text"), COLS, { x: "bill_len", y: "bill_dep" }),
    ).toBeNull();
  });

  it("buildQuery emits the working layers and drops the incomplete one", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        layer("point", { x: "bill_len", y: "bill_dep" }, "L1"),
        layer("text", { x: "bill_len", y: "bill_dep" }, "L2"),
      ],
      [],
      COLS,
    );
    expect(q).toContain("DRAW point");
    expect(q).not.toContain("DRAW text");

    const q2 = buildQuery(
      "ggsql:penguins",
      [
        layer("point", { x: "bill_len", y: "bill_dep" }, "L1"),
        layer("ribbon", { x: "bill_len", ymin: "bill_dep" }, "L2"),
      ],
      [],
      COLS,
    );
    expect(q2).toContain("DRAW point");
    expect(q2).not.toContain("DRAW ribbon");
  });

  it("buildQuery returns null when the only layer is incomplete", () => {
    expect(
      buildQuery(
        "ggsql:penguins",
        [layer("text", { x: "bill_len", y: "bill_dep" })],
        [],
        COLS,
      ),
    ).toBeNull();
  });

  it("a custom layer still emits when the only chart layer is incomplete", () => {
    const custom: CustomLayer = {
      id: "C",
      ggsql: "SCALE x TO log",
      position: 0,
    };
    const q = buildQuery(
      "ggsql:penguins",
      [layer("text", { x: "bill_len", y: "bill_dep" })],
      [],
      COLS,
      undefined,
      undefined,
      [custom],
    );
    expect(q).toContain("SCALE x TO log");
    expect(q).not.toContain("DRAW text");
  });
});

describe("missingRequiredWarnings", () => {
  it("reports a text layer missing its label", () => {
    expect(
      missingRequiredWarnings(
        [
          layer("point", { x: "bill_len", y: "bill_dep" }, "L1"),
          layer("text", { x: "bill_len", y: "bill_dep" }, "L2"),
        ],
        COLS,
      ),
    ).toEqual([
      "You need to drag a variable to the Label to see the Text labels",
    ]);
  });

  it("reports plural missing mappings in GEOM_SPECIFIC_REQUIRED order", () => {
    expect(
      missingRequiredWarnings([layer("ribbon", { x: "bill_len" })], COLS),
    ).toEqual([
      "You need to drag variables to the Y min and Y max to see the Ribbon",
    ]);
    expect(
      missingRequiredWarnings([layer("range", { x: "bill_len" })], COLS),
    ).toEqual([
      "You need to drag variables to the Y min and Y max to see the Error bar",
    ]);
  });

  it("stays silent for disabled and for fully-empty layers", () => {
    expect(
      missingRequiredWarnings(
        [
          {
            ...layer("text", { x: "bill_len", y: "bill_dep" }),
            disabled: true,
          },
          layer("text"),
        ],
        COLS,
      ),
    ).toEqual([]);
  });

  it("warns for a shared-mappings-only text layer", () => {
    expect(
      missingRequiredWarnings([layer("text")], COLS, {
        x: "bill_len",
        y: "bill_dep",
      }),
    ).toEqual([
      "You need to drag a variable to the Label to see the Text labels",
    ]);
  });

  it("stays silent when required aesthetics are mapped", () => {
    expect(
      missingRequiredWarnings(
        [
          layer("point", { x: "bill_len", y: "bill_dep" }),
          layer("text", { x: "bill_len", y: "bill_dep", label: "species" }),
          layer("ribbon", {
            x: "bill_len",
            ymin: "bill_dep",
            ymax: "bill_len",
          }),
        ],
        COLS,
      ),
    ).toEqual([]);
  });

  it("reports multiple offending layers in layer order", () => {
    expect(
      missingRequiredWarnings(
        [
          layer("ribbon", { x: "bill_len" }, "L1"),
          layer("text", { x: "bill_len", y: "bill_dep" }, "L2"),
        ],
        COLS,
      ),
    ).toEqual([
      "You need to drag variables to the Y min and Y max to see the Ribbon",
      "You need to drag a variable to the Label to see the Text labels",
    ]);
  });
});
