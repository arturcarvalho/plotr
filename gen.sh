#!/usr/bin/env bash
# gen.sh — render a ggsql query to an SVG image.
# Uses the locally installed `ggsql` CLI to produce a Vega-Lite spec,
# then renders that spec to SVG via the project's Node deps (vega, vega-lite).

set -euo pipefail
cd "$(dirname "$0")"

QUERY="${1:-}"
OUT="${2:-chart.svg}"

if [ -z "$QUERY" ]; then
  echo "Usage: $(basename "$0") '<ggsql>' [out.svg]" >&2
  exit 1
fi

case "$OUT" in
  *.svg) ;;
  *) echo "Only .svg output is supported (got: $OUT)" >&2; exit 1 ;;
esac

if ! command -v ggsql >/dev/null 2>&1; then
  echo "ggsql not found in PATH. Install from https://ggsql.org/get_started/installation.html" >&2
  exit 1
fi

SPEC=$(mktemp -t plotr-spec.XXXXXX)
trap 'rm -f "$SPEC"' EXIT

ggsql exec "$QUERY" --output "$SPEC"
node scripts/vl2svg.mjs "$SPEC" "$OUT"
echo "Wrote $OUT"
