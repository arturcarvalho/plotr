# plotr

> **Alpha** — work in progress; expect breaking changes.

Browser ggsql playground. Paste ggsql in the editor on the left, get a chart on the right.

## Features

- **Empty state.** Cold-start shows only the data panel (left) and a 2-step "Get started" tutorial in place of the chart. Picking a dataset reveals the Build panel + side panels with a fast slide-in; rendering a chart hides the tutorial and shows the chart + bottom tabs.
- **Sidebar (left).** Drag or browse a CSV — or click "Palmer Penguins" for the built-in dataset.
- **Variable list.** Once a file is loaded, the sidebar lists columns grouped by type. Non-numeric on top (`T` string, `✓` bool, `📅` date), numeric (`#`) at the bottom. Each row is **draggable** onto the build pane.
- **Change file** button at the sidebar footer resets to the empty state.
- **Build pane (middle).** Photoshop-style narrow icon column.
  - Each chart layer is a small button showing the resolved chart-type icon (▶ play icon when AUTO with no mappings). Multiple `T` labels layers can coexist — each holds its own title/subtitle/caption + X/Y axis labels; the generated `LABEL` clause merges them last-wins per field.
  - A stacked-layers icon at the top opens **Shared variables** — variable mappings applied to every layer.
  - Click any icon to open its detail panel on the right: chart-type picker grid + dropzones for `X` / `Y` / `Fill` / `Stroke` / `Opacity` / `Size` / `Panels` (`rows` / `columns` → FACET), bar Width/Position when applicable, Plot settings (clip), and a Remove-layer button.
  - Drop a sidebar variable onto a dropzone → `<col> AS <aes>`. Drag chip away or click the cog → per-aesthetic settings panel.
  - `+` at the bottom opens a `Chart` / `Labels` dropdown; new items append just above `+` and are auto-selected.
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
