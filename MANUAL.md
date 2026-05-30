# plotr


## Features

- **Empty state.** Cold-start shows only the data panel (left) and a 3-step arrow overlay (`1/3 Choose data` → `2/3 Select layer` → `3/3 Drag variables to X, Y, etc.`) that auto-advances with user actions and points at the next affordance. Shown only on the first browser session — once step 3 completes, the "seen" flag is written to `localStorage` (`plotr.tutorialSeen`) and the overlay never returns until storage is cleared. The first layer's side panel is **not** auto-opened during the tutorial so step 2 is observable. Picking a dataset reveals the Build panel + side panels with a fast slide-in; rendering a chart shows the chart + bottom tabs.
- **Sidebar (left).** Drag or browse a CSV — or click "Palmer Penguins" for the built-in dataset. Header strip shows the `plotr.org` brand (left) and a **⋮ menu** (right). Uploaded CSVs have their header row trimmed cell-by-cell before registration: `country, activity, duration` becomes `country,activity,duration`, so the column shows up as `activity` in the sidebar and `<col> AS y` look-ups work without invisible leading spaces. Data rows are left untouched. Caveat: the trim is a naive comma split — header cells containing commas inside quotes would be mangled, but those are vanishingly rare.
- **Variable list.** Once a file is loaded, the sidebar lists columns grouped by type. Non-numeric on top (`T` string, `✓` bool, `📅` date), numeric (`#`) at the bottom. Each row is **draggable** onto the build pane.
- **Header ⋮ menu.** Hover the ⋮ at the top-right of the sidebar header — a menu opens on hover, stays open while the pointer is over it, and closes shortly after the pointer leaves (Escape also closes). It's portaled at a fixed position so its ~340 px panel never widens the 252 px sidebar. Entries: **Replace data** (drops the loaded CSV and clears it from IndexedDB, returning to the Choose-data state; chart config — layers / labels / settings — is kept so you can re-upload a compatible file; subtitle shows the current table name, disabled when no file is loaded), **Clear chart settings** (clears all layers, labels, custom blocks, and shared settings while keeping the loaded file; subtitle shows a live `N variables configured` count of filled dropzones across every layer + shared mappings, disabled at 0), a divider, then links to **plotr on GitHub** (source & issues) and **ggsql.org** (the query language behind plotr) — both open in a new tab — and an **ALPHA** note that plotr is in early development.
- **Persisted file.** Uploaded CSVs are saved to IndexedDB (single record, last-upload-wins). On page reload the bytes are re-registered with ggsql before plotr restores `activeTable` from the URL hash — your file survives reloads transparently. Panel selection survives reloads too: whichever side panel (chart layer / labels / custom / shared) was open and whichever secondary panel (settings / mapping) was open re-open on the next visit. Stale ids (e.g. you deleted the previously-selected layer) silently fall back to the first-chart-layer auto-open default. The ⋮ menu's "Replace data" is the only way to drop it; private-mode / quota / IDB-missing failures fall back to per-session-only behavior with a console warning. Browser **Back** / **Forward** step through previous chart edits — dropping a variable, typing a label, switching dataset, picking a chart type, etc. Rapid edits within 600 ms coalesce into a single history entry so a burst of typing in the Labels field is one step rather than per-keystroke. Pure UI navigation (clicking a layer card or the settings cog to open / switch the side panel) doesn't add history entries — only the URL is updated silently, so Back never just closes a panel.
- **Build pane (middle).** Photoshop-style narrow icon column.
  - Each chart layer is a small button showing the resolved chart-type icon (▶ play icon when AUTO with no mappings; pie when AUTO with only `Fill color` mapped). Multiple `T` labels layers can coexist — each holds its own title/subtitle + X/Y axis labels; the generated `LABEL` clause merges them last-wins per field. The Subtitle field carries an inline hint that it only renders when a title is set. Fresh sessions start with one chart layer; add a labels layer via `+` when needed.
  - A stacked-layers icon at the top opens **Shared variables** — variable mappings applied to every layer.
  - Click any icon to open its detail panel on the right: chart-type picker grid (incl. **Pie**, enabled when `Fill color` is mapped to a **discrete** column only — continuous / time fills break ggsql's polar projection. Emitted as `DRAW bar` + `PROJECT TO polar`. Hover any icon for an instant tooltip listing the X/Y/fill mapping conditions that make it work; the fill rule is shown as `Fill <kind>`) + dropzones for `X` / `Y` / **Fill color** + **Line color** (two separate dropzones, emitted as `<col> AS fill` / `<col> AS stroke`; each chevron opens that aesthetic's colour mapping panel) / `Opacity` / `Size` / `Panels` (`rows` / `columns` → FACET); when the resolved geom is `text`, an additional `Label` dropzone appears (text-only aesthetic — emitted as `<col> AS label` only for the text geom); when the resolved geom is `ribbon`, additional `Y min` + `Y max` dropzones appear (ribbon-only aesthetics — emitted as `<col> AS ymin` / `AS ymax` only for ribbon). Geom-required dropzones that are still empty render with an **amber-dashed border** plus an amber `(missing)` suffix next to the field label — currently this covers `text.label` and `ribbon.ymin` + `ribbon.ymax`. Both indicators swap back to neutral as soon as you drop a column on the dropzone. Per-geom controls appear when applicable: bar = Width + Position; point = Linewidth + Position (positions limited to identity / jitter); line = Linewidth + Orientation (`aligned` / `transposed` — leave unset for ggsql's default); tile = Linewidth + Position (identity / stack / dodge / jitter — ggsql validates); violin = Linewidth + Position + Width + Bandwidth + Adjust + Kernel (8 options, rendered as a searchable dropdown — arrow keys preview each kernel live; hover doesn't commit) + Side (both / left / top / right / bottom) + Tails; pie has no panel controls yet (emits as `DRAW bar` + `PROJECT TO polar`); histogram = Position + a `Bin by: Count | Width` toggle (mutually exclusive — picking one clears the other) + the active numeric (`Bins`, default 30, or `Binwidth`, no ggsql default — free number input since the right scale is data-dependent) + `Closed` (right / left); boxplot = Linewidth + Position + Width + Outliers (true / false toggle; default `true`) + Coef (whisker coefficient, default 1.5); density = Linewidth + Position + Bandwidth (free number input, no ggsql default) + Adjust + Kernel (dropdown); area = Linewidth + Position (default `stack`) + Orientation (`aligned` / `transposed`); smooth = Linewidth (default 2.0) + Position + Method (dropdown: nw / nadaraya-watson / ols / tls) + Bandwidth (free input) + Adjust + Kernel (dropdown); ribbon = Linewidth + Position (default `identity`); range = Linewidth + Position + Width (default 10.0, range slider 0–50 step 0.5). Range shares ribbon's `ymin`/`ymax` aesthetic requirements — same dropzones appear, same missing-required highlight, same emission filter. text = Position + Italic (true / false toggle, default `false`) + Anchor (9-dot 3×3 grid picker — rows = `top` / `middle` / `bottom` (vjust), columns = `left` / `centre` / `right` (hjust); clicking a dot writes both axes; both unset = ggsql defaults `centre` / `middle`, header shows `default (centre, middle)`; × clears both back to default) + Offset (two independent number inputs stacked X-over-Y, sitting to the right of the Anchor grid, in absolute points; either input may stay blank — the missing axis is zero-filled only at ggsql emission time as `offset => (x ?? 0, y ?? 0)`; both blank emits no `offset` setting; × in the header clears both back to default) + Rotation (degrees, 0–360 slider) + Format (free text input — ggsql's curly-brace template, e.g. `{:num %.2f}`, `{:UPPER}`, `{:time %Y-%m-%d}`; the bare `{}` echoes the value); rule = Linewidth (default 1.0) + Slope (default 0, range slider −5 to 5). Note: ggsql requires exactly one of X / Y to be mapped for rule (XOR) — plotr surfaces a small inline hint. **Partition** (geom-independent, shown under `Panels` for every chart layer) — a multi-column drag-drop dropzone: drop one or more sidebar columns (each a removable chip — `×` button or drag the chip out) to emit ggsql's `PARTITION BY <col>, …` at the tail of the DRAW line, after `FILTER` per the grammar. Groups records beyond the automatic grouping discrete aesthetics already give — e.g. one line per series without colouring by it. Empty emits nothing. Lives on the layer (not its settings) so it survives a chart-type switch like mappings; not shown in the Shared variables panel. **Filter** (geom-independent, shown for every chart layer in the side panel under the mappings) — a free-form SQL WHERE-style predicate (`species = 'Adelie'`, `body_mass > 4000 AND sex = 'female'`) emitted as a `FILTER` clause at the tail of the DRAW line, after `MAPPING` and `SETTING` per the ggsql grammar. Empty / whitespace-only input emits nothing; invalid SQL surfaces in the Problems pane. The input is **debounced ~400 ms** (and commits on blur / Enter) so a half-written predicate doesn't error the chart mid-typing. Filter clears on chart-type switch alongside other settings. Violin's Bandwidth is a free number input for consistency with histogram's Binwidth (data-dependent). When a numeric slider or text radio is at its unset state, the right-side hint reads `default (<value>)` — the actual ggsql fallback for that setting (e.g. `default (1.5)` on line's Linewidth, `default (gaussian)` on violin's Kernel). When no concrete ggsql default exists (e.g. violin's Bandwidth = null), the hint just reads `default`. Switching the chart type for a layer clears its settings (width / position / linewidth / opacity / size / fill / stroke / palettes) since most of them are geom-specific; mappings (X / Y / Fill color / etc.) are preserved. Same reset fires when the resolved chart type changes implicitly via AUTO — e.g. swapping a continuous X column for a discrete one shifts the layer from point to bar, and the old settings clear with it. Briefly emptying all mappings does NOT clear settings, so toggling a variable on/off keeps your tuned settings as long as the resulting chart type stays the same.
  - Drop a sidebar variable onto a dropzone → `<col> AS <aes>`. Drag chip away to clear. Click anywhere in a mapping field (the label area, the padding flanking the dropzone, or the chevron button on the right) — except the dropzone itself — to open the per-aesthetic settings panel. The field keeps the panel's natural background on hover; only the chevron button highlights (stone-100/stone-200, no blue). For the facet rows nested inside "Panels", the hover/click region is just each individual row (rows / columns) since there's no per-row label to fold in.
  - **Fill / Line color** settings panel uses three dot-tabs anchored at the bottom of the panel (no text labels, hover for tooltip): **Settings** (fixed colour — ggsql10 swatches + free-form CSS colour input + No fill/line toggle), **Palette (discrete)** (12 qualitative palettes; ggsql's default is `ggsql10`), **Palette (Continuous)** (72 palettes grouped Sequential / Diverging / Multi-sequential / Cyclic; ggsql's default is `sequential`). Each palette tab shows an **In use** block above the dropdown — three rows: `IN USE` label, the palette swatch strip edge-to-edge, then the palette name with a ` (default)` suffix when no user pick exists. The swatch is rendered once, only in this block; the dropdown's collapsed control shows the palette name as text only. Picking the default from the dropdown writes it into the query so the chart stops depending on whatever ggsql's default happens to be at runtime.. The palette pickers are rich dropdowns: each row shows the actual palette as a gradient strip + name, with type-ahead search and keyboard navigation (arrow keys + Enter); the selected palette renders inside the control. The chart updates live as you navigate options with arrow keys — keyboard focus = preview = commit. Mouse hover only highlights the row (no commit); click or `Enter` commits the hovered row. Both pickers start empty (clearable); picking a palette — including the default — writes its name explicitly so the query stays stable across future ggsql default changes. Each tab shows a **Clear** button when its slot has a value: on Settings it wipes both the fixed colour and the No-fill/No-line toggle; on the palette tabs it clears the palette slot (the react-select × clears it too). Tab dot turns sky-blue when its slot has a user-set value. Auto-selects the tab matching the mapped column kind. Each slot emits independently in `buildQuery`: a fixed `SETTING fill <colour>` always emits when set (and now coexists with a `fill` variable mapping rather than being suppressed by it); `SCALE fill TO <palette>` (or `SCALE stroke TO <palette>`) emits for each set palette slot, regardless of mapping or column kind — so a fill colour, a discrete palette, and a continuous palette can all be present in the output simultaneously. **The palettes are a chart-level scale setting — a single source of truth: set in any layer's colour panel, the same value shows in every layer's panel and survives chart-type switches. Only the fixed colour (Settings tab) and the No-fill/No-line toggle stay per-layer.** The X and Y aesthetic panels each carry a **Format** input that maps to ggsql's `SCALE <aes> RENAMING * => '<template>'` break-formatter — see [docs](https://ggsql.org/syntax/clause/scale.html#break-formatting) for the full token list (`{}`, `{:UPPER}`, `{:lower}`, `{:Title}`, `{:num <printf>}`, `{:time <strftime>}`). One `SCALE x RENAMING` is emitted per chart; empty input emits nothing. Directly above Format, a **Breaks** input limits the visible axis ticks — type the comma-separated values (e.g. `2000, 2010`) and plotr wraps them as `SCALE <aes> SETTING breaks => (2000, 2010)` (free-form passthrough — numbers bare, quote strings/dates yourself; ggsql validates). Breaks + Format fold into a single `SCALE <aes>` clause (`SETTING` before `RENAMING` per the grammar). Like the palettes, **Breaks and Format are chart-level** (one value per axis, shown in every layer's panel, survive chart-type switches); empty emits nothing. Both inputs are **debounced ~400 ms** (and commit on blur / Enter) so a half-written break list / template doesn't error the chart mid-typing.
  - `+` at the bottom opens a `Chart` / `Custom` / `Labels` dropdown; new items append just above `+` and are auto-selected.
  - **Custom layer** (pencil icon): freeform ggsql textarea side panel. Whatever you type is inserted into the generated query at the card's position — between adjacent chart-layer `DRAW` lines, or trailing after them. Multi-line content is preserved verbatim. Use it for `SCALE`/`PROJECT`/extra `DRAW` clauses plotr's UI doesn't expose. Disable (eye) and remove (×) work like the other layer cards.
  - On hover, two corner buttons appear on each chart layer (and each labels layer): top-right `×` removes it, top-left eye toggles **disabled** (skipped from `DRAW` / `LABEL`, dimmed and grayscaled in the build pane). The shared-variables icon at the top is always present.
  - Only one side panel (Shared mappings / a layer / a mapping / Labels) is visible at a time.
- **GGSQL tab (bottom).** Shows the generated ggsql in real time. Every query is prefixed with a single-line header comment — `-- Built on plotr.org with ggsql v<version>` — emitted by `buildQuery` so it appears in the render path, the GGSQL tab, and the clipboard alike. The version string is read from `src/lib/ggsql-wasm/package.json` so it tracks the bundled engine automatically; no separate constant to update when bumping ggsql-wasm. The header line renders in a dimmer stone-400 inside the GGSQL panel (vs stone-500 for the rest of the query) — it stays part of the selectable region, so user-driven text selection still picks it up alongside the body. The panel toolbar (the "ggsql" label and the copy-icon button) is marked `select-none` so dragging across the panel doesn't sweep that chrome into the clipboard. The **Copy** icon writes the full current query (header + body) to the clipboard regardless of any current text selection.
- **Chart pane (right).** Live-renders the generated ggsql via `vega-embed` (SVG renderer, export-only menu) against the sidebar's active table. When a chart has variables but no CSV is loaded (e.g. just after **Replace data**, or a shared URL whose CSV isn't in IndexedDB), the chart pane and the bottom tabs are both hidden and the entire right-hand section collapses to a single "No data selected" card. The card uses a dimmed `bg-stone-50` background with a rounded `border-stone-300` border (no shadow), and is centered geometrically between the DataPanel's right edge and the window's right edge. The left column drops its `flex-1` in this state so it collapses to the DataPanel's natural width (instead of grabbing 50 % of the window like in the normal layout) and the chart section takes over the whole remaining strip; the section's `pr-2` is canceled with `-mr-2` on the wrapper so the centering isn't pulled left by the chrome padding. The card lists the chart's variables with their type glyph (`#` numeric, `T` string, `✓` bool, `📅` date) followed by the column name, plus a "Drop a CSV in the sidebar to render." hint. Variable types come from an additive `columnKindsCache` in `App.tsx` that's seeded whenever `describeColumns` succeeds and is never pruned mid-session — so the badges keep working after the file is dropped. The cache is also serialized into the URL hash (short key `K`) so the badges survive page reloads and travel with shared URLs even when the recipient doesn't have the CSV in IndexedDB. Variables whose kind still isn't known (e.g. a hand-edited URL that doesn't carry the cache) render as plain names without a badge. Disabled layers' mappings are excluded.
- **Bottom pane.** Tabs (left → right): **GGSQL** (generated query, selected by default on fresh sessions) · **Problems** (chart errors + Vega warnings) · **Vega Lite** (the Vega-Lite JSON spec ggsql produced for the chart — pretty-printed and copy-button-ready so it can be pasted straight into <https://vega.github.io/editor/>. Shows an italic placeholder until the first successful render; cleared back to the placeholder on chart error or empty query). The Problems tab shows two pill badges — red `⨯ N` for errors, amber `⚠ N` for warnings (each hidden when zero). The error pill briefly pulses when a new error appears, and the bottom pane auto-switches to **Problems** whenever the error count grows (a new failure arrived). Warnings never trigger the switch — they surface only via the amber badge — so users can keep the GGSQL or Vega Lite tab in view while Vega complains about non-actionable things. A red "Chart error — View" banner overlays the chart pane when there's an error; clicking **View** switches the bottom tab to Problems. When the error is **unrecoverable**, the CTA on the banner swaps from "View" to "Reload page" and clicking it does `window.location.reload()`. An error is treated as unrecoverable when it matches one of the patterns in `src/lib/errorClass.ts`: an **exact** match for the bare `"Chart error:"` (the no-body sentinel form) OR a **prefix** match for `"ggsql-wasm crashed"` (the explicit messages set after the in-place re-init exhausts itself). Regular `"Chart error: <body>"` messages — usually ggsql validation problems like a missing required aesthetic — are NOT unrecoverable; the user just fixes the chart. Successful renders auto-clear all stale `Chart error:` and unrecoverable messages from the Problems pane; the banner disappears the same instant the chart redraws. Consecutive failures replace the previous `Chart error:` rather than stacking, so the pane shows the current cause only. The flag is derived from the displayed error list, so the moment the next successful render filters those messages out the CTA reverts to "View". Drag the top edge to resize.
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

**Then re-apply the `__plotr_reset()` patch** — wasm-bindgen's generated `ggsql_wasm.js` caches the wasm instance in a module-private `wasm` var and `__wbg_init()` short-circuits on subsequent calls, so we can't recover from a wasm crash without it. After the copy above, append to `<plotr>/src/lib/ggsql-wasm/ggsql_wasm.js` (just before the final `export { initSync, … }` line):

```js
export function __plotr_reset() {
    wasm = undefined;
    wasmModule = undefined;
    cachedDataViewMemory0 = null;
    cachedFloat64ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
}
```

And re-declare it in `ggsql_wasm.d.ts` (next to `__wbg_init`):

```ts
export function __plotr_reset(): void;
```

If wasm-bindgen's generator stops emitting one of the `cached*` vars, drop those lines accordingly — `__plotr_reset` only needs to reset whatever caches the new generator declares.

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
    LabelsCard.tsx      title/subtitle toggle button
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
