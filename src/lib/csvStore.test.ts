import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { clearLastCsv, loadLastCsv, saveLastCsv } from "./csvStore";

const enc = new TextEncoder();
const dec = new TextDecoder();

describe("csvStore", () => {
  beforeEach(async () => {
    // fake-indexeddb persists across tests within a process — clear before each.
    await clearLastCsv();
  });

  it("loadLastCsv returns null when nothing is stored", async () => {
    expect(await loadLastCsv()).toBeNull();
  });

  it("save then load round-trips name + bytes content", async () => {
    const bytes = enc.encode("a,b,c\n1,2,3\n");
    await saveLastCsv("penguins.csv", bytes);
    const got = await loadLastCsv();
    expect(got).not.toBeNull();
    expect(got?.name).toBe("penguins.csv");
    expect(got?.bytes).toBeInstanceOf(Uint8Array);
    expect(dec.decode(got!.bytes)).toBe("a,b,c\n1,2,3\n");
  });

  it("second save overrides the first (single-slot store)", async () => {
    await saveLastCsv("first.csv", enc.encode("x\n1\n"));
    await saveLastCsv("second.csv", enc.encode("y\n2\n"));
    const got = await loadLastCsv();
    expect(got?.name).toBe("second.csv");
    expect(dec.decode(got!.bytes)).toBe("y\n2\n");
  });

  it("clearLastCsv removes the record", async () => {
    await saveLastCsv("tmp.csv", enc.encode("col\nv\n"));
    await clearLastCsv();
    expect(await loadLastCsv()).toBeNull();
  });

  it("preserves binary bytes exactly (not just length)", async () => {
    const bytes = new Uint8Array([0x00, 0xff, 0x7f, 0x80, 0x42]);
    await saveLastCsv("binary.csv", bytes);
    const got = await loadLastCsv();
    expect(Array.from(got!.bytes)).toEqual([0x00, 0xff, 0x7f, 0x80, 0x42]);
  });
});
