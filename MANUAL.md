# plotr

Browser ggsql playground. Paste ggsql in the editor on the left, get a chart on the right.

## Features

- **Editor (left).** Plain `<textarea>`, debounced 300 ms auto-run.
- **Chart pane (right).** Vega-Lite specs from ggsql rendered via `vega-embed` (SVG renderer, export-only action menu).
- **Errors / warnings (bottom).** Query errors and Vega warnings appear here.
- **SQL fallback.** Queries without a `VISUALISE` clause render as an HTML table.
- **Built-in datasets.** `register_builtin_datasets()` is called at boot, so palmer-penguins, airquality, etc. are available as `ggsql:<name>` without any upload.

## Stack

- Vite 6 + React 19 + TypeScript + Tailwind v4 (`@tailwindcss/vite`).
- `vega`, `vega-embed`, `vega-lite` for chart rendering.
- `ggsql-wasm` `pkg/` (prebuilt from `posit-dev/ggsql` v0.2.7) committed at `src/lib/ggsql-wasm/`.

## Setup

```sh
npm install
npm run dev
```

Open <http://localhost:5173>.

## Usage

The default query renders a bar chart of penguin species counts. Edit the textarea — the chart updates automatically after 300 ms of inactivity.

Example queries:

```sql
VISUALISE FROM ggsql:penguins DRAW bar MAPPING species AS x

VISUALISE FROM ggsql:airquality
DRAW line
  MAPPING Day AS x, Temp AS y, Month AS color

SELECT * FROM ggsql:penguins LIMIT 5
```

A query that fails to parse / execute shows the error in the bottom pane and leaves the previous chart in place.

## Bumping ggsql-wasm

The `src/lib/ggsql-wasm/` folder holds the prebuilt wasm-pack output. To bump:

```sh
git clone https://github.com/posit-dev/ggsql /tmp/ggsql
cd /tmp/ggsql && git checkout v<X.Y.Z>
cd ggsql-wasm && wasm-pack build --target web --profile wasm
rm -rf <plotr>/src/lib/ggsql-wasm
cp -r pkg <plotr>/src/lib/ggsql-wasm
```

Build prereqs: Rust (1.78+), `wasm-pack`, clang with `wasm32-unknown-unknown` target (Homebrew `llvm` on macOS).

## Layout

```
src/
  App.tsx               root: layout + debounced execute loop
  main.tsx              react root
  index.css             tailwind + table styles
  components/
    Editor.tsx          left textarea
    Viz.tsx             right chart / table container
    Errors.tsx          bottom problems pane
  lib/
    ggsql.ts            GgsqlManager wrapper around wasm-pack output
    ggsql-wasm/         prebuilt pkg/ (committed)
```
