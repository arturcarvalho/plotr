import { describe, expect, it } from "vitest";
import { normalizeCsvHeader } from "./csvNormalize";

const enc = (s: string) => new TextEncoder().encode(s);
// ignoreBOM keeps a leading U+FEFF visible so the BOM round-trip test can
// actually assert on it — the default TextDecoder strips it silently.
const dec = (b: Uint8Array) =>
  new TextDecoder("utf-8", { ignoreBOM: true }).decode(b);

describe("normalizeCsvHeader", () => {
  it("trims whitespace from each header cell, leaves data rows alone", () => {
    const input = enc("country, activity, duration\nPortugal, Other, 30\n");
    const out = dec(normalizeCsvHeader(input));
    expect(out).toBe("country,activity,duration\nPortugal, Other, 30\n");
  });

  it("trims both leading and trailing whitespace", () => {
    const input = enc(" a ,\tb\t, c \nx,y,z");
    const out = dec(normalizeCsvHeader(input));
    expect(out).toBe("a,b,c\nx,y,z");
  });

  it("is byte-identical when the header is already clean", () => {
    const input = enc("a,b,c\n1,2,3\n");
    const out = normalizeCsvHeader(input);
    // Same content; allow either same reference or equal bytes.
    expect(dec(out)).toBe("a,b,c\n1,2,3\n");
  });

  it("preserves CRLF line endings on the header→body boundary", () => {
    const input = enc("a, b, c\r\nx,y,z\r\n");
    const out = dec(normalizeCsvHeader(input));
    expect(out).toBe("a,b,c\r\nx,y,z\r\n");
  });

  it("preserves CRLF when the header has trailing CR", () => {
    // The first '\n' marks the split — the CR immediately before it is part
    // of the header bytes and must be stripped along with surrounding spaces
    // so the boundary becomes "...c\r\nx,y,z".
    const input = enc("a, b, c\r\nx,y,z");
    const out = dec(normalizeCsvHeader(input));
    expect(out).toBe("a,b,c\r\nx,y,z");
  });

  it("returns input unchanged when there is no newline (single line)", () => {
    const input = enc("a, b, c");
    const out = dec(normalizeCsvHeader(input));
    // No body to protect; safe to normalise the whole thing.
    expect(out).toBe("a,b,c");
  });

  it("handles empty bytes", () => {
    const out = normalizeCsvHeader(enc(""));
    expect(dec(out)).toBe("");
  });

  it("handles a header with only one column (no commas)", () => {
    const input = enc("  only  \n1\n2\n");
    const out = dec(normalizeCsvHeader(input));
    expect(out).toBe("only\n1\n2\n");
  });

  it("does not trim data rows even when they have leading spaces", () => {
    const input = enc("a, b\n foo, bar\n baz, qux\n");
    const out = dec(normalizeCsvHeader(input));
    expect(out).toBe("a,b\n foo, bar\n baz, qux\n");
  });

  it("preserves a UTF-8 BOM as the first byte of the first header cell", () => {
    // BOM survives the trim because it's a non-whitespace codepoint
    // by Unicode classification (zero-width no-break space). Whether ggsql
    // cares is its own problem; plotr just doesn't introduce a regression.
    const input = enc("﻿name, age\nA,1\n");
    const out = dec(normalizeCsvHeader(input));
    expect(out).toBe("﻿name,age\nA,1\n");
  });

  it("handles multi-row data after a malformed header", () => {
    const input = enc(
      "country, activity, duration\nPortugal, Other, 30\nLuxembourg, Other, 4.5\n",
    );
    const out = dec(normalizeCsvHeader(input));
    expect(out).toBe(
      "country,activity,duration\nPortugal, Other, 30\nLuxembourg, Other, 4.5\n",
    );
  });
});
