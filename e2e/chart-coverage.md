# Chart-building test guide

A short list of charts to build that, between them, exercise most of plotr's
chart-building features. Use it two ways:

- **Manually** — a quick smoke-test checklist. Build each chart, glance at the
  result and the **GGSQL** tab, tick it off.
- **As E2E coverage** — each chart's URL (`#s=…`) is captured once and replayed
  by the Playwright suite, which re-renders it and checks the ggsql output.

You don't need to test every chart type — these seven cover the
render-distinct geoms, every major channel (x, y, colour, size, panels, labels,
band), both palette kinds, facets, multi-layer charts, the polar (pie) path, and
the error case.

---

## Datasets

| Dataset | How to load it | Columns |
|---|---|---|
| **Palmer Penguins** (built in) | Click **Demo Dataset** in the sidebar | `species`, `island`, `sex` · `bill_len`, `bill_dep`, `flipper_len`, `body_mass`, `year` |
| **penguin_summary.csv** | Drag the file onto the sidebar (or click *browse*) | `species` · `bill_dep_mean`, `bill_dep_min`, `bill_dep_max` |
| **CO2_emissions_top.csv** | Drag the file onto the sidebar | `country` · `year`, `emissions` |
| **pat_lab_users.csv** | Drag the file onto the sidebar | `Year`, `NewUsers`, `Users`, `Loans` |

The CSVs live in [`../examples/`](../examples). To build a variable into a chart,
**drag it from the sidebar onto a dropzone** (X, Y, Colour, Panels, …). Open a
layer's chart-type grid by clicking the layer's icon in the middle column.

---

# Essentials — build these if short on time

These four alone cover scatter / smooth / bar / pie + facets + scales +
multi-layer + the error case — roughly 70 % of the surface.

## 1. Colored scatter + trend line

**Dataset:** Palmer Penguins (built in)

1. Click **Demo Dataset**.
2. Drag `bill_dep` → **X**, `body_mass` → **Y**, `species` → **Fill color**.
3. Click **`+`** → **Chart** to add a second layer; set its type to **smooth**;
   drag `bill_dep` → **X**, `body_mass` → **Y** on it.

**You should see:** a scatter of points coloured by species (3-colour legend)
with a smooth trend line + shaded confidence band on top.
**GGSQL contains:** `DRAW point …` and a second `DRAW smooth …`, `FROM ggsql:penguins`.
*Exercises: multi-layer overlay, auto→point, trend band, discrete colour scale.*

## 2. Grouped bars, faceted, gradient fill

**Dataset:** CO2_emissions_top.csv

1. Drag the CSV onto the sidebar.
2. Drag `country` → **X**, `emissions` → **Y**, `emissions` → **Fill color**.
3. Drag `year` → **Panels → columns** (one panel per year).
4. Open the **Fill color** panel (chevron) → **Palette (Continuous)** → pick one
   and turn on **Reverse**.

**You should see:** bars per country, split into a panel for each year, shaded by
a reversed colour gradient.
**GGSQL contains:** `DRAW bar`, `FACET … year`, `SCALE fill TO … SETTING reverse => true`.
*Exercises: auto→bar (discrete X), facets, continuous palette + reverse.*

## 3. Pie

**Dataset:** Palmer Penguins (built in)

1. Click **Demo Dataset**.
2. Drag `species` → **Fill color** (leave X and Y empty).
3. The layer icon should switch to a pie; if not, pick **Pie** in the chart-type grid.

**You should see:** a 3-slice pie (one slice per species).
**GGSQL contains:** `DRAW bar` + `PROJECT TO polar`.
*Exercises: the special polar projection (fill-only, discrete).*

## 4. Broken chart (error path)

**Dataset:** Palmer Penguins (built in)

1. Click **Demo Dataset**, drag `bill_dep` → **X**, `body_mass` → **Y**.
2. Click **`+`** → **Custom** and type invalid ggsql (e.g. `DRAW nonsense`), **or**
   reference a column that doesn't exist.

**You should see:** the chart pane replaced by a red **“Chart error”** box and a
red count badge on the **Problems** tab; the previous chart is cleared.
*Exercises: the error/recovery path.*

---

# Extended coverage

## 5. Histogram

**Dataset:** Palmer Penguins (built in)

1. Click **Demo Dataset**.
2. Drag `body_mass` → **X**.
3. Set the chart type to **histogram**; in its settings try **Bins = 30**, then
   switch to **Binwidth** (the two are mutually exclusive).

**You should see:** a distribution of body-mass bars.
**GGSQL contains:** `DRAW histogram …` with `bins` (or `binwidth`).
*Exercises: single-variable / binned geom, the bin toggle.*

## 6. Ribbon band (min–max)

**Dataset:** penguin_summary.csv

1. Drag the CSV onto the sidebar.
2. Set the chart type to **ribbon** (or **range**).
3. Drag `species` → **X**, `bill_dep_min` → **Y min**, `bill_dep_max` → **Y max**.

**You should see:** a band per species spanning its min→max bill depth.
(Until both Y min and Y max are filled, they show an amber *“(missing)”* hint.)
**GGSQL contains:** `DRAW ribbon …`, `bill_dep_min AS ymin`, `bill_dep_max AS ymax`.
*Exercises: the band-only aesthetics + the “drop Y” path.*

## 7. Text labels + a Labels layer + custom ggsql

**Dataset:** Palmer Penguins (built in)

1. Click **Demo Dataset**.
2. Set the chart type to **text**; drag `bill_dep` → **X**, `body_mass` → **Y**,
   `species` → **Label**. Tweak **Anchor** (the 3×3 dots) and **Format**.
3. Open the **X** panel and set **Breaks** (e.g. `15, 20`) and a **Format**
   template (e.g. `{:num %.0f}`).
4. Click **`+`** → **Labels**; set a **Title**. Click **`+`** → **Custom** and paste the
   clause below (`path` is a real ggsql geom plotr's UI doesn't surface — it links the
   points in row order):

```sql
DRAW path MAPPING bill_dep AS x, body_mass AS y
```

**You should see:** species names plotted as text, a chart title, custom X ticks,
and a thin path threading the points (your custom clause, folded into the query).
**GGSQL contains:** `species AS label`, a `LABEL title => …`, `SCALE x SETTING breaks => …`,
and the custom `DRAW path …` line verbatim.
*Exercises: the text geom + all the non-geom layers (labels, scales, custom).*

---

## Notes for the E2E suite

- The page rebuilds full chart state from the URL `#s=…` hash, so each chart
  above becomes a one-line fixture: navigate to its hash, assert it renders + the
  ggsql is right. Capture a hash by building the chart and copying the address bar.
- **Built-in** datasets (Penguins) hydrate from a hash on their own — best for the
  automated tests.
- **Example CSVs** are stored only in your browser (IndexedDB), so their bytes
  don't travel in the hash. For those charts the E2E test must first upload the
  CSV via the hidden file input, *then* apply the hash. (Manually, just drop the
  file first — same idea.)
