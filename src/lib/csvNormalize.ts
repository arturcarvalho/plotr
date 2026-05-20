/** Trim each comma-separated cell on the first line of a CSV's byte buffer.
 *  Data rows are passed through verbatim. CRLF on the header→body boundary
 *  is preserved.
 *
 *  Why: ggsql-wasm's CSV reader keeps leading whitespace inside header cells
 *  (so a file like `country, activity, duration` registers the column as
 *  ` activity` with a literal space prefix), but its query parser trims
 *  identifier references — so `<col> AS y` look-ups silently miss whenever
 *  the user drops a header-with-space column onto a dropzone. Trimming on
 *  upload makes the sidebar, the persisted hash, and ggsql all agree.
 *
 *  Limitation: a naive comma split. Headers with literal commas inside
 *  quoted cells (`"name, with comma",foo`) would be mangled. Real CSVs
 *  almost never put commas inside header names, and the previous behaviour
 *  for that shape was already broken — adding a full CSV parser is out of
 *  scope here. */
export function normalizeCsvHeader(bytes: Uint8Array): Uint8Array {
  if (bytes.length === 0) return bytes;

  // `ignoreBOM: true` keeps a leading U+FEFF in the decoded string instead
  // of silently dropping it — we want to round-trip byte-identically if the
  // file was BOM-prefixed, and we peel/restore the BOM explicitly below.
  const decoder = new TextDecoder("utf-8", { ignoreBOM: true });
  const encoder = new TextEncoder();
  const text = decoder.decode(bytes);

  // Peel off a leading UTF-8 BOM before normalising — `String.prototype.trim`
  // strips U+FEFF along with ASCII whitespace, which would otherwise eat the
  // BOM off the first header cell.
  let bom = "";
  let rest = text;
  if (rest.charCodeAt(0) === 0xfeff) {
    bom = "﻿";
    rest = rest.slice(1);
  }

  // Split header from body at the first LF. If the LF is preceded by CR
  // (CRLF line ending), keep the CR in the separator so the body stays
  // byte-identical to the input.
  const lfIdx = rest.indexOf("\n");
  let header: string;
  let separator: string;
  let body: string;
  if (lfIdx < 0) {
    header = rest;
    separator = "";
    body = "";
  } else {
    const headerEnd =
      lfIdx > 0 && rest.charCodeAt(lfIdx - 1) === 0x0d ? lfIdx - 1 : lfIdx;
    header = rest.slice(0, headerEnd);
    separator = rest.slice(headerEnd, lfIdx + 1);
    body = rest.slice(lfIdx + 1);
  }

  const normalizedHeader = header
    .split(",")
    .map((c) => c.trim())
    .join(",");

  return encoder.encode(bom + normalizedHeader + separator + body);
}
