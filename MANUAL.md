# plotr

Browser ggsql playground. Paste ggsql in the editor on the left, get a chart on the right.

## Features

- **Sidebar (left).** Drag or browse a CSV — or click "Palmer Penguins" for the built-in dataset.
- **Variable list.** Once a file is loaded, the sidebar lists columns grouped by type. Non-numeric on top (`T` string, `✓` bool, `📅` date), numeric (`#`) at the bottom. Each row is **draggable** onto the build pane.
- **Change file** button at the sidebar footer resets to the empty state.
- **Build pane (middle).** Composes a ggsql query layer-by-layer.
  - Each layer (DRAW) is a card with a chart-type select (point, bar, histogram, line, smooth, ...) and dropzones for `X` / `Y` / `Fill` / `Stroke` / `Opacity` / `Size` / `Panels` (Top + Right axes → FACET).
  - Drop a sidebar variable onto a dropzone → `<col> AS <aes>` is added to the layer's MAPPING. Click `×` on a chip to clear.
  - Only one card is expanded at a time; click the header to toggle.
  - `+ Add chart` adds a new layer; the `×` in an expanded header removes it.
  - `Labels` is pinned at the bottom — expand to set Title, Subtitle (emitted as `LABEL title => '...', ...`).
- **Code panel (between build pane and chart).** Shows the generated ggsql in real time. **Copy** button writes the current query to the clipboard.
- **Chart pane (right).** Live-renders the generated ggsql via `vega-embed` (SVG renderer, export-only menu) against the sidebar's active table.
- **Errors / warnings (bottom).** Chart errors and Vega warnings appear here.
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
    BuildPane.tsx       middle: layer cards + add-chart + labels
    LayerCard.tsx       one DRAW layer
    ChartPanel.tsx      draw-type picker + plot-level settings
    MappingPanel.tsx    per-aesthetic settings (colour/opacity/size)
    LabelsCard.tsx      title/subtitle/caption toggle button
    LabelsPanel.tsx     labels editor side panel
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
