#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import * as vega from "vega";
import * as vl from "vega-lite";

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: vl2svg.mjs <input.json> <output.svg>");
  process.exit(1);
}

const spec = JSON.parse(await readFile(inPath, "utf8"));
const vg = vl.compile(spec).spec;
const view = new vega.View(vega.parse(vg), { renderer: "none" });
const svg = await view.toSVG();
await writeFile(outPath, svg);
