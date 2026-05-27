import { describe, expect, it } from "vitest";
import {
  buildQuery,
  CHART_LABELS,
  computeMissingRequired,
  DRAW_TYPES,
  type CustomLayer,
  type Layer,
} from "./buildQuery";
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
            hjust: 0.3,
            vjust: 0.7,
            rotation: 45,
            format: "%.2f",
          },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain(
      "DRAW text MAPPING bill_len AS x, bill_dep AS y, species AS label SETTING position => 'identity', italic => true, hjust => 0.3, vjust => 0.7, rotation => 45, format => '%.2f'",
    );
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
});

describe("buildQuery emits SCALE for palettes", () => {
  it("discrete fill mapping + fillPaletteDiscrete → SCALE fill TO <palette>", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep", fill: "species" },
          settings: { fillPaletteDiscrete: "set1" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("species AS fill");
    expect(q).toContain("SCALE fill TO set1");
  });

  it("continuous fill mapping + fillPaletteContinuous → SCALE fill TO <palette>", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep", fill: "bill_dep" },
          settings: { fillPaletteContinuous: "viridis" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("bill_dep AS fill");
    expect(q).toContain("SCALE fill TO viridis");
  });

  it("date fill mapping uses fillPaletteContinuous", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep", fill: "born_at" },
          settings: { fillPaletteContinuous: "viridis" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("SCALE fill TO viridis");
  });

  it("palette slot is emitted regardless of mapping (no mapping)", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { fillPaletteDiscrete: "set1" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("SCALE fill TO set1");
  });

  it("empty palette slot → no SCALE clause (ggsql default applies)", () => {
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
    expect(q).not.toContain("SCALE");
  });

  it("stroke mapping + strokePaletteDiscrete emits SCALE stroke", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "line",
          mappings: { x: "bill_len", y: "bill_dep", stroke: "species" },
          settings: { strokePaletteDiscrete: "tableau10" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("SCALE stroke TO tableau10");
  });

  it("fixed fill setting and fill mapping both emit (mapping does not suppress SETTING)", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep", fill: "species" },
          settings: { fill: "blue" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("fill => 'blue'");
    expect(q).toContain("species AS fill");
  });

  it("all three slots set → SETTING + both SCALE clauses emitted", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: {
            fill: "blue",
            fillPaletteDiscrete: "set1",
            fillPaletteContinuous: "viridis",
          },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("fill => 'blue'");
    expect(q).toContain("SCALE fill TO set1");
    expect(q).toContain("SCALE fill TO viridis");
  });

  it("explicit default palette name still emits SCALE clause", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep", fill: "species" },
          settings: { fillPaletteDiscrete: "ggsql10" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("SCALE fill TO ggsql10");
  });

  it("noFill still wins over mapping (emits SETTING fill => null) and SCALE still emits", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep", fill: "species" },
          settings: { noFill: true, fillPaletteDiscrete: "set1" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("fill => null");
    expect(q).not.toContain("species AS fill");
    expect(q).toContain("SCALE fill TO set1");
  });

  it("shared fill mapping picks up first layer's palette", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: {},
          settings: { fillPaletteDiscrete: "set2" },
        },
      ],
      [],
      COLS,
      undefined,
      { x: "bill_len", y: "bill_dep", fill: "species" },
    );
    expect(q).toContain("SCALE fill TO set2");
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

describe("buildQuery emits SCALE … RENAMING for axis formatters", () => {
  it("xFormat emits SCALE x RENAMING * => '<template>'", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { xFormat: "{:num %.2f}" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("SCALE x RENAMING * => '{:num %.2f}'");
  });

  it("yFormat emits SCALE y RENAMING * => '<template>'", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { yFormat: "{:time %Y-%m}" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("SCALE y RENAMING * => '{:time %Y-%m}'");
  });

  it("both formatters appear in x-then-y order", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { xFormat: "{:num %.2f}", yFormat: "{:num %.1f}" },
        },
      ],
      [],
      COLS,
    );
    const xIdx = q!.indexOf("SCALE x RENAMING");
    const yIdx = q!.indexOf("SCALE y RENAMING");
    expect(xIdx).toBeGreaterThan(-1);
    expect(yIdx).toBeGreaterThan(-1);
    expect(xIdx).toBeLessThan(yIdx);
  });

  it("first non-empty xFormat across layers wins", () => {
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
          settings: { xFormat: "{:num %.2f}" },
        },
        {
          id: "L3",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { xFormat: "{:num %.5f}" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("SCALE x RENAMING * => '{:num %.2f}'");
    expect(q).not.toContain("{:num %.5f}");
  });

  it("disabled layer's xFormat is ignored", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L1",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { xFormat: "{:UPPER}" },
          disabled: true,
        },
        {
          id: "L2",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { xFormat: "{:Title}" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("SCALE x RENAMING * => '{:Title}'");
    expect(q).not.toContain("{:UPPER}");
  });

  it("empty / whitespace-only xFormat emits no SCALE x RENAMING clause", () => {
    const empty = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { xFormat: "" },
        },
      ],
      [],
      COLS,
    );
    expect(empty).not.toContain("RENAMING");

    const ws = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { xFormat: "  \t  " },
        },
      ],
      [],
      COLS,
    );
    expect(ws).not.toContain("RENAMING");
  });

  it("single-quote in the template is SQL-escaped (doubled)", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep" },
          settings: { xFormat: "it's {}" },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("SCALE x RENAMING * => 'it''s {}'");
  });

  it("axis SCALE coexists with palette SCALE clauses (palettes still emit unchanged)", () => {
    const q = buildQuery(
      "ggsql:penguins",
      [
        {
          id: "L",
          draw: "point",
          mappings: { x: "bill_len", y: "bill_dep", fill: "species" },
          settings: {
            xFormat: "{:num %.2f}",
            fillPaletteDiscrete: "ggsql10",
          },
        },
      ],
      [],
      COLS,
    );
    expect(q).toContain("SCALE fill TO ggsql10");
    expect(q).toContain("SCALE x RENAMING * => '{:num %.2f}'");
  });
});
