# GGSQL defaults

Reference of the fixed values ggsql falls back to when an aesthetic is not mapped to a column, plus per-geom parameter defaults.

- **Source:** [`posit-dev/ggsql`](https://github.com/posit-dev/ggsql) v0.3.2 — commit [`6bdf2a9`](https://github.com/posit-dev/ggsql/tree/6bdf2a9ae13a97210458b42c5a1a63821da9a70f) (tagged 2026-05-05).
- **Default mapping** = the constant ggsql uses for an aesthetic when no `<col> AS <aes>` mapping exists for it.
- **Default setting** = the value of a non-aesthetic geom parameter (e.g. `bar.width`, `smooth.method`, `histogram.bins`).
- **Caveat:** plotr currently bundles ggsql-wasm v0.3.1. Most defaults below are unchanged between v0.3.1 and v0.3.2, but verify against `src/lib/ggsql-wasm/` if a value matters for your use case.

Scope: only the 14 ggsql geoms exposed by plotr's UI. `pie` is a plotr-only token emitted as `DRAW bar` + `PROJECT TO polar` — it inherits `bar`'s defaults verbatim. Excluded geoms (defined in ggsql but not surfaced by plotr): `arrow`, `path`, `polygon`, `segment`, `spatial`.

## Default mappings

`—` means the aesthetic does not apply to the geom.

### Numeric — size, linewidth, fontsize, opacity

| Geom      | size | linewidth | fontsize | opacity |
| --------- | ---- | --------- | -------- | ------- |
| point     | 3.0  | 1.0       | —        | 0.8     |
| line      | —    | 1.5       | —        | 1.0     |
| bar       | —    | —         | —        | 0.8     |
| tile      | —    | 1.0       | —        | 0.8     |
| violin    | —    | 1.0       | —        | 0.8     |
| histogram | —    | —         | —        | 0.8     |
| boxplot   | 3.0¹ | 1.0       | —        | 0.8     |
| density   | —    | 1.0       | —        | 0.8     |
| area      | —    | 1.0       | —        | 0.8     |
| smooth    | —    | 2.0       | —        | 1.0     |
| ribbon    | —    | 1.0       | —        | 0.8     |
| range     | —    | 1.0       | —        | 1.0     |
| text      | —    | —         | 11.0     | 1.0     |
| rule      | —    | 1.0       | —        | 1.0     |

¹ applied to outlier markers only.

### Color — fill, stroke

| Geom      | fill  | stroke  |
| --------- | ----- | ------- |
| point     | black | black   |
| line      | —     | black   |
| bar       | black | black   |
| tile      | black | black   |
| violin    | black | black   |
| histogram | black | black   |
| boxplot   | white | black   |
| density   | black | black   |
| area      | black | black   |
| smooth    | —     | #3366FF |
| ribbon    | black | black   |
| range     | —     | black   |
| text      | black | null²   |
| rule      | —     | black   |

² text has no stroke by default — only the fill is rendered.

Palette defaults (used when a column is mapped to fill/stroke):

| Slot                   | Default palette |
| ---------------------- | --------------- |
| Discrete fill/stroke   | `ggsql10`       |
| Continuous fill/stroke | `sequential`    |

### Shape

| Geom    | shape   |
| ------- | ------- |
| point   | circle  |
| boxplot | circle¹ |

All other geoms do not take a `shape` aesthetic.

### Linetype

| Geom                                                                    | linetype |
| ----------------------------------------------------------------------- | -------- |
| line, smooth, boxplot, density, area, tile, ribbon, violin, range, rule | solid    |

Geoms that don't take `linetype`: point, bar, histogram, text.

## Default settings (per geom)

Each table lists the geom's full set of aesthetic defaults plus geom-specific parameters.

### geom_point

| Setting   | Default  | Notes |
| --------- | -------- | ----- |
| stroke    | black    |       |
| fill      | black    |       |
| size      | 3.0      |       |
| opacity   | 0.8      |       |
| shape     | circle   |       |
| linewidth | 1.0      |       |
| position  | identity |       |

### geom_line

| Setting     | Default   | Notes                      |
| ----------- | --------- | -------------------------- |
| stroke      | black     |                            |
| linewidth   | 1.5       |                            |
| opacity     | 1.0       |                            |
| linetype    | solid     |                            |
| orientation | (ALIGNED) | internal orientation param |

### geom_bar

| Setting  | Default | Notes                   |
| -------- | ------- | ----------------------- |
| fill     | black   |                         |
| stroke   | black   |                         |
| opacity  | 0.8     |                         |
| width    | 0.9     | parameter, range [0, 1] |
| position | stack   |                         |

> `pie` (plotr-only) is emitted as `DRAW bar` + `PROJECT TO polar` and uses `geom_bar`'s defaults.

### geom_tile

| Setting   | Default  | Notes |
| --------- | -------- | ----- |
| fill      | black    |       |
| stroke    | black    |       |
| opacity   | 0.8      |       |
| linewidth | 1.0      |       |
| linetype  | solid    |       |
| position  | identity |       |

### geom_violin

| Setting   | Default  | Notes                                                                                        |
| --------- | -------- | -------------------------------------------------------------------------------------------- |
| fill      | black    |                                                                                              |
| stroke    | black    |                                                                                              |
| opacity   | 0.8      |                                                                                              |
| linewidth | 1.0      |                                                                                              |
| linetype  | solid    |                                                                                              |
| bandwidth | null     | optional, must be > 0 if set                                                                 |
| adjust    | 1.0      | > 0                                                                                          |
| kernel    | gaussian | options: gaussian, epanechnikov, triangular, rectangular, uniform, biweight, quartic, cosine |
| position  | dodge    |                                                                                              |
| width     | 0.9      | > 0                                                                                          |
| side      | both     | options: both, left, top, right, bottom                                                      |
| tails     | 3.0      | >= 0                                                                                         |

### geom_histogram

| Setting  | Default | Notes                        |
| -------- | ------- | ---------------------------- |
| fill     | black   |                              |
| stroke   | black   |                              |
| opacity  | 0.8     |                              |
| bins     | 30      | bin count                    |
| closed   | right   | options: right, left         |
| binwidth | null    | optional, must be > 0 if set |
| position | stack   |                              |

### geom_boxplot

| Setting   | Default | Notes                     |
| --------- | ------- | ------------------------- |
| stroke    | black   |                           |
| fill      | white   |                           |
| linewidth | 1.0     |                           |
| opacity   | 0.8     |                           |
| linetype  | solid   |                           |
| size      | 3.0     | outlier markers           |
| shape     | circle  | outlier markers           |
| outliers  | true    | render outlier points     |
| coef      | 1.5     | whisker coefficient, >= 0 |
| width     | 0.9     | range [0, 1]              |
| position  | dodge   |                           |

### geom_density

| Setting   | Default  | Notes                                                                                        |
| --------- | -------- | -------------------------------------------------------------------------------------------- |
| fill      | black    |                                                                                              |
| stroke    | black    |                                                                                              |
| opacity   | 0.8      |                                                                                              |
| linewidth | 1.0      |                                                                                              |
| linetype  | solid    |                                                                                              |
| bandwidth | null     | optional, must be > 0 if set                                                                 |
| adjust    | 1.0      | > 0                                                                                          |
| kernel    | gaussian | options: gaussian, epanechnikov, triangular, rectangular, uniform, biweight, quartic, cosine |
| position  | identity |                                                                                              |

### geom_area

| Setting     | Default   | Notes                      |
| ----------- | --------- | -------------------------- |
| fill        | black     |                            |
| stroke      | black     |                            |
| opacity     | 0.8       |                            |
| linewidth   | 1.0       |                            |
| linetype    | solid     |                            |
| position    | stack     |                            |
| orientation | (ALIGNED) | internal orientation param |

### geom_smooth

| Setting   | Default  | Notes                                                                                        |
| --------- | -------- | -------------------------------------------------------------------------------------------- |
| stroke    | #3366FF  |                                                                                              |
| linewidth | 2.0      |                                                                                              |
| opacity   | 1.0      |                                                                                              |
| linetype  | solid    |                                                                                              |
| method    | nw       | Nadaraya-Watson; options: nw, nadaraya-watson, ols, tls                                      |
| bandwidth | null     | optional, must be > 0 if set                                                                 |
| adjust    | 1.0      | > 0                                                                                          |
| kernel    | gaussian | options: gaussian, epanechnikov, triangular, rectangular, uniform, biweight, quartic, cosine |
| position  | identity |                                                                                              |

### geom_ribbon

| Setting   | Default  | Notes |
| --------- | -------- | ----- |
| fill      | black    |       |
| stroke    | black    |       |
| opacity   | 0.8      |       |
| linewidth | 1.0      |       |
| linetype  | solid    |       |
| position  | identity |       |

### geom_range

| Setting   | Default  | Notes |
| --------- | -------- | ----- |
| stroke    | black    |       |
| opacity   | 1.0      |       |
| linewidth | 1.0      |       |
| linetype  | solid    |       |
| position  | identity |       |
| width     | 10.0     | >= 0  |

### geom_text

| Setting    | Default  | Notes                          |
| ---------- | -------- | ------------------------------ |
| stroke     | null     |                                |
| fill       | black    |                                |
| opacity    | 1.0      |                                |
| typeface   | null     | inherits chart font when unset |
| fontsize   | 11.0     |                                |
| fontweight | normal   | CSS keywords or numeric        |
| italic     | false    |                                |
| hjust      | centre   | 'left' \| 'centre' \| 'right'  |
| vjust      | middle   | 'top' \| 'middle' \| 'bottom'  |
| rotation   | 0.0      | degrees                        |
| offset     | null     | tuple (x, y) in absolute pts   |
| format     | null     | format string template         |
| position   | identity |                                |

### geom_rule

| Setting   | Default | Notes                                 |
| --------- | ------- | ------------------------------------- |
| slope     | 0.0     | default for horizontal/vertical rules |
| stroke    | black   |                                       |
| linewidth | 1.0     |                                       |
| opacity   | 1.0     |                                       |
| linetype  | solid   |                                       |

## Source files

All paths under `https://github.com/posit-dev/ggsql/blob/6bdf2a9/src/plot/layer/geom/`:

- [`point.rs`](https://github.com/posit-dev/ggsql/blob/6bdf2a9/src/plot/layer/geom/point.rs)
- [`line.rs`](https://github.com/posit-dev/ggsql/blob/6bdf2a9/src/plot/layer/geom/line.rs)
- [`bar.rs`](https://github.com/posit-dev/ggsql/blob/6bdf2a9/src/plot/layer/geom/bar.rs)
- [`tile.rs`](https://github.com/posit-dev/ggsql/blob/6bdf2a9/src/plot/layer/geom/tile.rs)
- [`violin.rs`](https://github.com/posit-dev/ggsql/blob/6bdf2a9/src/plot/layer/geom/violin.rs)
- [`histogram.rs`](https://github.com/posit-dev/ggsql/blob/6bdf2a9/src/plot/layer/geom/histogram.rs)
- [`boxplot.rs`](https://github.com/posit-dev/ggsql/blob/6bdf2a9/src/plot/layer/geom/boxplot.rs)
- [`density.rs`](https://github.com/posit-dev/ggsql/blob/6bdf2a9/src/plot/layer/geom/density.rs)
- [`area.rs`](https://github.com/posit-dev/ggsql/blob/6bdf2a9/src/plot/layer/geom/area.rs)
- [`smooth.rs`](https://github.com/posit-dev/ggsql/blob/6bdf2a9/src/plot/layer/geom/smooth.rs)
- [`ribbon.rs`](https://github.com/posit-dev/ggsql/blob/6bdf2a9/src/plot/layer/geom/ribbon.rs)
- [`range.rs`](https://github.com/posit-dev/ggsql/blob/6bdf2a9/src/plot/layer/geom/range.rs)
- [`text.rs`](https://github.com/posit-dev/ggsql/blob/6bdf2a9/src/plot/layer/geom/text.rs)
- [`rule.rs`](https://github.com/posit-dev/ggsql/blob/6bdf2a9/src/plot/layer/geom/rule.rs)
