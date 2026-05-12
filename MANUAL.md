# plotr


## Features

- **Empty state.** Cold-start shows only the data panel (left) and a 3-step arrow overlay (`1/3 Choose data` → `2/3 Select layer` → `3/3 Drag variables to X, Y, etc.`) that auto-advances with user actions and points at the next affordance. Shown only on the first browser session — once step 3 completes, the "seen" flag is written to `localStorage` (`plotr.tutorialSeen`) and the overlay never returns until storage is cleared. The first layer's side panel is **not** auto-opened during the tutorial so step 2 is observable. Picking a dataset reveals the Build panel + side panels with a fast slide-in; rendering a chart shows the chart + bottom tabs.
- **Sidebar (left).** Drag or browse a CSV — or click "Palmer Penguins" for the built-in dataset. Header strip shows the `plotr.org` brand and a GitHub link (right) to the source repo.
- **Variable list.** Once a file is loaded, the sidebar lists columns grouped by type. Non-numeric on top (`T` string, `✓` bool, `📅` date), numeric (`#`) at the bottom. Each row is **draggable** onto the build pane.
- **Change file** button at the sidebar footer resets to the empty state.
- **Build pane (middle).** Photoshop-style narrow icon column.
  - Each chart layer is a small button showing the resolved chart-type icon (▶ play icon when AUTO with no mappings; pie when AUTO with only `Fill color` mapped). Multiple `T` labels layers can coexist — each holds its own title/subtitle/caption + X/Y axis labels; the generated `LABEL` clause merges them last-wins per field. The Subtitle field carries an inline hint that it only renders when a title is set. Fresh sessions start with one chart layer **and** one labels layer pre-added below it.
  - A stacked-layers icon at the top opens **Shared variables** — variable mappings applied to every layer.
  - Click any icon to open its detail panel on the right: chart-type picker grid (incl. **Pie**, enabled when `Fill color` is mapped to a **discrete** column only — continuous / time fills break ggsql's polar projection. Emitted as `DRAW bar` + `PROJECT TO polar`. Hover any icon for an instant tooltip listing the X/Y/fill mapping conditions that make it work; the fill rule is shown as `Fill <kind>`) + dropzones for `X` / `Y` / `Fill color` / `Line color` / `Opacity` / `Size` / `Panels` (`rows` / `columns` → FACET); when the resolved geom is `text`, an additional `Label` dropzone appears (text-only aesthetic — emitted as `<col> AS label` only for the text geom); when the resolved geom is `ribbon`, additional `Y min` + `Y max` dropzones appear (ribbon-only aesthetics — emitted as `<col> AS ymin` / `AS ymax` only for ribbon). Geom-required dropzones that are still empty render with an **amber-dashed border** plus an amber `(missing)` suffix next to the field label — currently this covers `text.label` and `ribbon.ymin` + `ribbon.ymax`. Both indicators swap back to neutral as soon as you drop a column on the dropzone. Per-geom controls appear when applicable: bar = Width + Position; point = Linewidth + Position (positions limited to identity / jitter); line = Linewidth + Orientation (`aligned` / `transposed` — leave unset for ggsql's default); tile = Linewidth + Position (identity / stack / dodge / jitter — ggsql validates); violin = Linewidth + Position + Width + Bandwidth + Adjust + Kernel (8 options, rendered as a searchable dropdown — arrow keys preview each kernel live; hover doesn't commit) + Side (both / left / top / right / bottom) + Tails; pie has no panel controls yet (emits as `DRAW bar` + `PROJECT TO polar`); histogram = Position + a `Bin by: Count | Width` toggle (mutually exclusive — picking one clears the other) + the active numeric (`Bins`, default 30, or `Binwidth`, no ggsql default — free number input since the right scale is data-dependent) + `Closed` (right / left); boxplot = Linewidth + Position + Width + Outliers (true / false toggle; default `true`) + Coef (whisker coefficient, default 1.5); density = Linewidth + Position + Bandwidth (free number input, no ggsql default) + Adjust + Kernel (dropdown); area = Linewidth + Position (default `stack`) + Orientation (`aligned` / `transposed`); smooth = Linewidth (default 2.0) + Position + Method (dropdown: nw / nadaraya-watson / ols / tls) + Bandwidth (free input) + Adjust + Kernel (dropdown); ribbon = Linewidth + Position (default `identity`); range = Linewidth + Position + Width (default 10.0, range slider 0–50 step 0.5). Range shares ribbon's `ymin`/`ymax` aesthetic requirements — same dropzones appear, same missing-required highlight, same emission filter. text = Position + Italic (true / false toggle, default `false`) + Hjust (default 0.5) + Vjust (default 0.5) + Rotation (degrees, 0–360 slider) + Format (free text input — ggsql's curly-brace template, e.g. `{:num %.2f}`, `{:UPPER}`, `{:time %Y-%m-%d}`; the bare `{}` echoes the value); rule = Linewidth (default 1.0) + Slope (default 0, range slider −5 to 5). Note: ggsql requires exactly one of X / Y to be mapped for rule (XOR) — plotr surfaces a small inline hint. `offset` is intentionally deferred — needs array-literal support in the SETTING emitter. Violin's Bandwidth also switched to a free number input for consistency with histogram's Binwidth (data-dependent). When a numeric slider or text radio is at its unset state, the right-side hint reads `default (<value>)` — the actual ggsql fallback for that setting (e.g. `default (1.5)` on line's Linewidth, `default (gaussian)` on violin's Kernel). When no concrete ggsql default exists (e.g. violin's Bandwidth = null), the hint just reads `default`. Switching the chart type for a layer clears its settings (width / position / linewidth / opacity / size / fill / stroke / palettes) since most of them are geom-specific; mappings (X / Y / Fill color / etc.) are preserved. Same reset fires when the resolved chart type changes implicitly via AUTO — e.g. swapping a continuous X column for a discrete one shifts the layer from point to bar, and the old settings clear with it. Briefly emptying all mappings does NOT clear settings, so toggling a variable on/off keeps your tuned settings as long as the resulting chart type stays the same. Plot settings (clip) + a Remove-layer button below.
  - Drop a sidebar variable onto a dropzone → `<col> AS <aes>`. Drag chip away or click the cog → per-aesthetic settings panel.
  - **Fill / Line color** settings panel uses three dot-tabs anchored at the bottom of the panel (no text labels, hover for tooltip): **Settings** (fixed colour — ggsql10 swatches + free-form CSS colour input + No fill/line toggle), **Palette (discrete)** (12 qualitative palettes; ggsql's default is `ggsql10`), **Palette (Continuous)** (72 palettes grouped Sequential / Diverging / Multi-sequential / Cyclic; ggsql's default is `sequential`). Each palette tab shows an **In use** block above the dropdown — three rows: `IN USE` label, the palette swatch strip edge-to-edge, then the palette name with a ` (default)` suffix when no user pick exists. The swatch is rendered once, only in this block; the dropdown's collapsed control shows the palette name as text only. Picking the default from the dropdown writes it into the query so the chart stops depending on whatever ggsql's default happens to be at runtime.. The palette pickers are rich dropdowns: each row shows the actual palette as a gradient strip + name, with type-ahead search and keyboard navigation (arrow keys + Enter); the selected palette renders inside the control. The chart updates live as you navigate options with arrow keys — keyboard focus = preview = commit. Mouse hover only highlights the row (no commit); click or `Enter` commits the hovered row. Both pickers start empty (clearable); picking a palette — including the default — writes its name explicitly so the query stays stable across future ggsql default changes. Each tab shows a **Clear** button when its slot has a value: on Settings it wipes both the fixed colour and the No-fill/No-line toggle; on the palette tabs it clears the palette slot (the react-select × clears it too). Tab dot turns sky-blue when its slot has a user-set value. Auto-selects the tab matching the mapped column kind. Each slot emits independently in `buildQuery`: a fixed `SETTING fill <colour>` always emits when set (and now coexists with a `fill` variable mapping rather than being suppressed by it); `SCALE fill TO <palette>` (or `SCALE stroke TO <palette>`) emits for each set palette slot, regardless of mapping or column kind — so a fill colour, a discrete palette, and a continuous palette can all be present in the output simultaneously.
  - `+` at the bottom opens a `Chart` / `Custom` / `Labels` dropdown; new items append just above `+` and are auto-selected.
  - **Custom layer** (pencil icon): freeform ggsql textarea side panel. Whatever you type is inserted into the generated query at the card's position — between adjacent chart-layer `DRAW` lines, or trailing after them. Multi-line content is preserved verbatim. Use it for `SCALE`/`PROJECT`/extra `DRAW` clauses plotr's UI doesn't expose. Disable (eye) and remove (×) work like the other layer cards.
  - On hover, two corner buttons appear on each chart layer (and each labels layer): top-right `×` removes it, top-left eye toggles **disabled** (skipped from `DRAW` / `LABEL`, dimmed and grayscaled in the build pane). The shared-variables icon at the top is always present.
  - Reset: clicking `Change file` in the sidebar clears the data and the entire chart config.
  - Only one side panel (Shared mappings / a layer / a mapping / Labels) is visible at a time.
- **GGSQL tab (bottom).** Shows the generated ggsql in real time. **Copy** button writes the current query to the clipboard.
- **Chart pane (right).** Live-renders the generated ggsql via `vega-embed` (SVG renderer, export-only menu) against the sidebar's active table.
- **Bottom pane.** Tabs: **Problems** (chart errors + Vega warnings) · **GGSQL** (generated query). The Problems tab shows two pill badges — red `⨯ N` for errors, amber `⚠ N` for warnings (each hidden when zero). The error pill briefly pulses when a new error appears; the tab does not auto-switch. A red "Chart error — View" banner overlays the chart pane when there's an error; clicking **View** switches the bottom tab to Problems. Drag the top edge to resize.
- **Built-in datasets** (`ggsql:penguins`, `ggsql:airquality`) registered at boot.

## Stack

- Vite 6 + React 19 + TypeScript + Tailwind v4 (`@tailwindcss/vite`).
- `vega`, `vega-embed`, `vega-lite` for chart rendering.
- `ggsql-wasm` `pkg/` (prebuilt from `posit-dev/ggsql` v0.3.1) committed at `src/lib/ggsql-wasm/`.

## Setup

```sh
npm install
npm run dev
```

Open <http://localhost:5173>.

## Usage

1. Pick a dataset in the sidebar (Palmer Penguins or drop a CSV).
2. Drag variables from the sidebar onto the dropzones in the middle build pane.
3. Pick a chart type in the dropdown at the top of each layer.
4. Add more layers with `+ Add chart` if you want overlays (e.g. point + smooth).
5. Optionally expand `Labels` at the bottom to set title/subtitle.

The chart re-renders on every change. ggsql parse / execute errors appear in the bottom problems pane.

## Bumping ggsql-wasm

The `src/lib/ggsql-wasm/` folder holds the prebuilt wasm-pack output. To bump:

```sh
git clone https://github.com/posit-dev/ggsql /tmp/ggsql
cd /tmp/ggsql && git checkout v<X.Y.Z>
cd ggsql-wasm/library && npm install && npm run build && cd ..
PATH="$(brew --prefix llvm)/bin:$PATH" \
  CC="$(brew --prefix llvm)/bin/clang" \
  AR="$(brew --prefix llvm)/bin/llvm-ar" \
  wasm-pack build --target web --profile wasm
wasm-opt pkg/ggsql_wasm_bg.wasm -o pkg/ggsql_wasm_bg.wasm -Oz --all-features
rm -rf <plotr>/src/lib/ggsql-wasm
cp -r pkg/. <plotr>/src/lib/ggsql-wasm/
rm <plotr>/src/lib/ggsql-wasm/.gitignore
# strip the missing-sourcemap reference vite warns about:
sed -i '' '/^\/\/# sourceMappingURL=/d' \
  <plotr>/src/lib/ggsql-wasm/snippets/*/library/dist/lib.js
```

Build prereqs: Rust (1.78+), `wasm-pack`, clang with `wasm32-unknown-unknown` target (Homebrew `llvm` on macOS).

## Layout

```
src/
  App.tsx               root: layout + state orchestration + URL-hash sync
  main.tsx              react root
  index.css             tailwind + table styles
  components/
    Sidebar.tsx         left file picker / variable list (draggable)
    BuildPane.tsx       middle: narrow icon column (layers + labels + shared + add)
    LayerCard.tsx       one DRAW layer
    LayerPanel.tsx      per-layer side panel: draw-type picker + mappings + layer/plot settings
    MappingPanel.tsx    per-aesthetic settings (colour/opacity/size)
    LabelsCard.tsx      title/subtitle/caption toggle button
    LabelsPanel.tsx     labels editor side panel
    AddMenu.tsx         "+ Add" dropdown (Chart / Labels)
    Dropzone.tsx        single aesthetic drop target
    DeleteBanner.tsx    "release to remove" banner during drag
    CodePanel.tsx       generated-ggsql viewer + copy button
    Viz.tsx             right chart container
    Errors.tsx          bottom problems pane
  lib/
    ggsql.ts            GgsqlManager wrapper + column type inference
    buildQuery.ts       pure ggsql string builder
    autoChart.ts        AUTO draw resolution + axis-kind rules
    persist.ts          URL-hash serialize/deserialize
    dragSignal.ts       shared drag state for delete-on-drop UX
    ggsql-wasm/         prebuilt pkg/ (committed)
```

## Reference

- `GGSQL_DEFAULTS.md` — per-aesthetic and per-geom default values from ggsql v0.3.2 (the version used by `ggsql-wasm`; plotr currently bundles v0.3.1).
