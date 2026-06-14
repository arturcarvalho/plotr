import {
  AESTHETICS,
  AUTO,
  DRAW_TYPES,
  FACETS,
  HJUST_VALUES,
  VJUST_VALUES,
  type Aes,
  type CustomLayer,
  type Hjust,
  type LabelsLayer,
  type Layer,
  type LayerSettings,
  type ProjectSettings,
  type ScaleSettings,
  type Vjust,
} from "./buildQuery";
import type { ColumnKind } from "./ggsql";

const VALID_KINDS: ReadonlySet<string> = new Set<string>([
  "numeric",
  "string",
  "bool",
  "date",
]);

/** UI side-panel selection (3rd column in the build pane). Null = nothing
 *  open; defined in persist so both App.tsx and the URL-hash codec share one
 *  source of truth. The four open kinds mirror the BuildPanel icon rows. */
export type ActivePanel =
  | null
  | { kind: "labels"; labelsId: string }
  | { kind: "shared" }
  | { kind: "layer"; layerId: string }
  | { kind: "custom"; customId: string };

/** UI secondary-panel selection (4th column). Only meaningful while
 *  `activePanel` is a chart layer — settings and per-aesthetic mapping
 *  panels both operate on the active layer. */
export type SecondaryPanel =
  | null
  | { kind: "settings" }
  | { kind: "mapping"; aes: Aes };

export interface Persisted {
  layers: Layer[];
  labels: LabelsLayer[];
  /** Optional. Omitted when there are no custom layers, for shorter URL hashes. */
  customLayers?: CustomLayer[];
  project: ProjectSettings;
  /** Chart-level scale settings (axis format / breaks, fill/stroke palettes). */
  scales?: ScaleSettings;
  sharedMappings: Partial<Record<Aes, string>>;
  /** Built-in (ggsql:*) table name only. User CSV tables are not persisted. */
  activeTable: string | null;
  /** Optional. Undefined / null = legacy hash or user-closed; App.tsx falls
   *  back to the first-chart-layer auto-open default. */
  activePanel?: ActivePanel;
  /** Optional. Undefined / null = collapsed. Decoder enforces the invariant
   *  that this is only present when `activePanel` is a chart layer. */
  secondaryPanel?: SecondaryPanel;
  /** Optional name → kind cache so the no-data card can render type badges
   *  for chart variables even after a full page reload or on a shared URL
   *  whose CSV isn't in the recipient's IndexedDB. Additive in-session;
   *  serialised here so the type info travels with the chart. */
  columnKindsCache?: Record<string, ColumnKind>;
}

const VERSION = 2;

const VALID_DRAWS: ReadonlySet<string> = new Set<string>([
  ...DRAW_TYPES,
  AUTO,
]);
const VALID_AES: ReadonlySet<string> = new Set<string>([
  ...AESTHETICS,
  ...FACETS,
]);

const newId = () => Math.random().toString(36).slice(2, 9);
const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0;
const isMeaningful = (v: unknown): boolean =>
  v !== undefined && v !== null && v !== "";

// ────────────────────────────────────────────────────────────────────────────
// Encoders (long → short, drop empty)
// ────────────────────────────────────────────────────────────────────────────

interface ShortLayer {
  i: string;
  d: string;
  m: Partial<Record<Aes, string>>;
  s?: ShortLayerSettings;
  x?: true;
  p?: string[];
}
interface ShortLayerSettings {
  w?: number;
  pos?: string;
  f?: string;
  k?: string;
  lw?: number;
  or?: string;
  bw?: number;
  adj?: number;
  krn?: string;
  mth?: string;
  sd?: string;
  tl?: number;
  bn?: number;
  bnw?: number;
  cl?: string;
  ot?: boolean;
  cf?: number;
  it?: boolean;
  hj?: string;
  vj?: string;
  /** Partial offset record mirroring `LayerSettings.offset`. Each axis is
   *  independent so the UI can keep a side blank without zero-filling. */
  of?: { x?: number; y?: number };
  rt?: number;
  fmt?: string;
  /** Per-layer FILTER predicate (LayerSettings.filter). Short key intentionally
   *  distinct from `f` (fill) — `flt` for filter. */
  flt?: string;
  slp?: number;
  o?: number;
  z?: number;
  nf?: true;
  ns?: true;
}

/** Chart-level scale settings (Persisted.scales). Reuses the short keys these
 *  fields had when they lived per-layer, so an old hash migrates trivially. */
interface ShortScales {
  xfmt?: string;
  yfmt?: string;
  xbrk?: string;
  ybrk?: string;
  fpd?: string;
  fpc?: string;
  kpd?: string;
  kpc?: string;
  fpdr?: true;
  fpcr?: true;
  kpdr?: true;
  kpcr?: true;
}
interface ShortLabels {
  i: string;
  p: number;
  t?: string;
  st?: string;
  c?: string;
  x?: string;
  y?: string;
  // Note: `x` is already the X-axis label; `dx` carries the disabled flag.
  dx?: true;
}
interface ShortCustom {
  i: string;
  g: string;
  p: number;
  x?: true;
}
interface ShortProject {
  r?: number;
  c?: false;
}
interface ShortActivePanel {
  k: "labels" | "shared" | "layer" | "custom";
  i?: string;
}
interface ShortSecondaryPanel {
  k: "settings" | "mapping";
  a?: Aes;
}
interface Payload {
  v: number;
  L?: ShortLayer[];
  B?: ShortLabels[];
  C?: ShortCustom[];
  P?: ShortProject;
  /** Chart-level scale settings. */
  SC?: ShortScales;
  S?: Partial<Record<Aes, string>>;
  t?: string;
  A?: ShortActivePanel;
  D?: ShortSecondaryPanel;
  /** columnKindsCache — column name → ggsql ColumnKind string. */
  K?: Record<string, string>;
}

function encodeMappings(
  m: Partial<Record<Aes, string>>,
): Partial<Record<Aes, string>> {
  const out: Partial<Record<Aes, string>> = {};
  for (const k of [...AESTHETICS, ...FACETS]) {
    const v = m[k as Aes];
    if (typeof v === "string" && v.length > 0) out[k as Aes] = v;
  }
  return out;
}

function encodeLayerSettings(
  s: LayerSettings | undefined,
): ShortLayerSettings | undefined {
  if (!s) return undefined;
  const out: ShortLayerSettings = {};
  if (typeof s.width === "number" && !Number.isNaN(s.width)) out.w = s.width;
  if (typeof s.position === "string") out.pos = s.position;
  if (isNonEmptyString(s.fill)) out.f = s.fill;
  if (isNonEmptyString(s.stroke)) out.k = s.stroke;
  if (typeof s.linewidth === "number" && !Number.isNaN(s.linewidth))
    out.lw = s.linewidth;
  if (typeof s.orientation === "string") out.or = s.orientation;
  if (typeof s.bandwidth === "number" && !Number.isNaN(s.bandwidth))
    out.bw = s.bandwidth;
  if (typeof s.adjust === "number" && !Number.isNaN(s.adjust))
    out.adj = s.adjust;
  if (typeof s.kernel === "string") out.krn = s.kernel;
  if (typeof s.method === "string") out.mth = s.method;
  if (typeof s.side === "string") out.sd = s.side;
  if (typeof s.tails === "number" && !Number.isNaN(s.tails)) out.tl = s.tails;
  if (typeof s.bins === "number" && !Number.isNaN(s.bins)) out.bn = s.bins;
  if (typeof s.binwidth === "number" && !Number.isNaN(s.binwidth))
    out.bnw = s.binwidth;
  if (typeof s.closed === "string") out.cl = s.closed;
  if (typeof s.outliers === "boolean") out.ot = s.outliers;
  if (typeof s.coef === "number" && !Number.isNaN(s.coef)) out.cf = s.coef;
  if (typeof s.italic === "boolean") out.it = s.italic;
  if (typeof s.hjust === "string") out.hj = s.hjust;
  if (typeof s.vjust === "string") out.vj = s.vjust;
  if (s.offset && typeof s.offset === "object") {
    const o: { x?: number; y?: number } = {};
    if (typeof s.offset.x === "number" && !Number.isNaN(s.offset.x)) {
      o.x = s.offset.x;
    }
    if (typeof s.offset.y === "number" && !Number.isNaN(s.offset.y)) {
      o.y = s.offset.y;
    }
    if (o.x !== undefined || o.y !== undefined) out.of = o;
  }
  if (typeof s.rotation === "number" && !Number.isNaN(s.rotation))
    out.rt = s.rotation;
  if (typeof s.format === "string" && s.format.length > 0) out.fmt = s.format;
  if (typeof s.filter === "string" && s.filter.length > 0) out.flt = s.filter;
  if (typeof s.slope === "number" && !Number.isNaN(s.slope))
    out.slp = s.slope;
  if (typeof s.opacity === "number" && !Number.isNaN(s.opacity)) out.o = s.opacity;
  if (typeof s.size === "number" && !Number.isNaN(s.size)) out.z = s.size;
  if (s.noFill === true) out.nf = true;
  if (s.noStroke === true) out.ns = true;
  return Object.keys(out).length > 0 ? out : undefined;
}

function encodeScales(s: ScaleSettings): ShortScales {
  const out: ShortScales = {};
  if (isNonEmptyString(s.xFormat)) out.xfmt = s.xFormat;
  if (isNonEmptyString(s.yFormat)) out.yfmt = s.yFormat;
  if (isNonEmptyString(s.xBreaks)) out.xbrk = s.xBreaks;
  if (isNonEmptyString(s.yBreaks)) out.ybrk = s.yBreaks;
  if (isNonEmptyString(s.fillPaletteDiscrete)) out.fpd = s.fillPaletteDiscrete;
  if (isNonEmptyString(s.fillPaletteContinuous))
    out.fpc = s.fillPaletteContinuous;
  if (isNonEmptyString(s.strokePaletteDiscrete))
    out.kpd = s.strokePaletteDiscrete;
  if (isNonEmptyString(s.strokePaletteContinuous))
    out.kpc = s.strokePaletteContinuous;
  if (s.fillPaletteDiscreteReverse === true) out.fpdr = true;
  if (s.fillPaletteContinuousReverse === true) out.fpcr = true;
  if (s.strokePaletteDiscreteReverse === true) out.kpdr = true;
  if (s.strokePaletteContinuousReverse === true) out.kpcr = true;
  return out;
}

/** Decode a chart-level scales object. `raw` is either the new top-level
 *  `SC` payload or an old per-layer `s` object (same short keys), so this
 *  doubles as the migration reader. */
function decodeScales(raw: unknown): ScaleSettings {
  const out: ScaleSettings = {};
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  if (typeof r.xfmt === "string") out.xFormat = r.xfmt;
  if (typeof r.yfmt === "string") out.yFormat = r.yfmt;
  if (typeof r.xbrk === "string") out.xBreaks = r.xbrk;
  if (typeof r.ybrk === "string") out.yBreaks = r.ybrk;
  if (typeof r.fpd === "string") out.fillPaletteDiscrete = r.fpd;
  if (typeof r.fpc === "string") out.fillPaletteContinuous = r.fpc;
  if (typeof r.kpd === "string") out.strokePaletteDiscrete = r.kpd;
  if (typeof r.kpc === "string") out.strokePaletteContinuous = r.kpc;
  if (r.fpdr === true) out.fillPaletteDiscreteReverse = true;
  if (r.fpcr === true) out.fillPaletteContinuousReverse = true;
  if (r.kpdr === true) out.strokePaletteDiscreteReverse = true;
  if (r.kpcr === true) out.strokePaletteContinuousReverse = true;
  return out;
}

function encodeLayer(l: Layer): ShortLayer {
  const out: ShortLayer = {
    i: l.id,
    d: l.draw,
    m: encodeMappings(l.mappings),
  };
  const settings = encodeLayerSettings(l.settings);
  if (settings) out.s = settings;
  if (l.disabled === true) out.x = true;
  if (l.partition && l.partition.length > 0) out.p = l.partition;
  return out;
}

function encodeCustom(c: CustomLayer): ShortCustom {
  const out: ShortCustom = { i: c.id, g: c.ggsql, p: c.position };
  if (c.disabled === true) out.x = true;
  return out;
}

function encodeLabels(l: LabelsLayer): ShortLabels {
  const out: ShortLabels = { i: l.id, p: l.position };
  if (isMeaningful(l.title)) out.t = l.title;
  if (isMeaningful(l.subtitle)) out.st = l.subtitle;
  if (isMeaningful(l.caption)) out.c = l.caption;
  if (isMeaningful(l.x)) out.x = l.x;
  if (isMeaningful(l.y)) out.y = l.y;
  if (l.disabled === true) out.dx = true;
  return out;
}

function encodeProject(p: ProjectSettings): ShortProject {
  const out: ShortProject = {};
  if (typeof p.ratio === "number" && !Number.isNaN(p.ratio)) out.r = p.ratio;
  if (p.clip === false) out.c = false;
  return out;
}

function encodeActivePanel(
  ap: ActivePanel | undefined,
): ShortActivePanel | undefined {
  if (!ap) return undefined;
  switch (ap.kind) {
    case "shared":
      return { k: "shared" };
    case "layer":
      return { k: "layer", i: ap.layerId };
    case "labels":
      return { k: "labels", i: ap.labelsId };
    case "custom":
      return { k: "custom", i: ap.customId };
  }
}

function encodeSecondaryPanel(
  sp: SecondaryPanel | undefined,
): ShortSecondaryPanel | undefined {
  if (!sp) return undefined;
  if (sp.kind === "settings") return { k: "settings" };
  return { k: "mapping", a: sp.aes };
}

// ────────────────────────────────────────────────────────────────────────────
// Decoders (short → long, validate)
// ────────────────────────────────────────────────────────────────────────────

function decodeMappings(raw: unknown): Partial<Record<Aes, string>> {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<Record<Aes, string>> = {};
  for (const [k, v] of Object.entries(r)) {
    if (!VALID_AES.has(k)) continue;
    if (!isNonEmptyString(v)) continue;
    out[k as Aes] = v;
  }
  return out;
}

function decodeLayerSettings(raw: unknown): LayerSettings | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const out: LayerSettings = {};
  if (typeof r.w === "number" && !Number.isNaN(r.w)) out.width = r.w;
  if (typeof r.pos === "string") {
    out.position = r.pos as LayerSettings["position"];
  }
  if (typeof r.f === "string") out.fill = r.f;
  if (typeof r.k === "string") out.stroke = r.k;
  if (typeof r.lw === "number" && !Number.isNaN(r.lw)) out.linewidth = r.lw;
  if (typeof r.or === "string") {
    out.orientation = r.or as LayerSettings["orientation"];
  }
  if (typeof r.bw === "number" && !Number.isNaN(r.bw)) out.bandwidth = r.bw;
  if (typeof r.adj === "number" && !Number.isNaN(r.adj)) out.adjust = r.adj;
  if (typeof r.krn === "string") {
    out.kernel = r.krn as LayerSettings["kernel"];
  }
  if (typeof r.mth === "string") {
    out.method = r.mth as LayerSettings["method"];
  }
  if (typeof r.sd === "string") {
    out.side = r.sd as LayerSettings["side"];
  }
  if (typeof r.tl === "number" && !Number.isNaN(r.tl)) out.tails = r.tl;
  if (typeof r.bn === "number" && !Number.isNaN(r.bn)) out.bins = r.bn;
  if (typeof r.bnw === "number" && !Number.isNaN(r.bnw)) out.binwidth = r.bnw;
  if (typeof r.cl === "string") {
    out.closed = r.cl as LayerSettings["closed"];
  }
  if (typeof r.ot === "boolean") out.outliers = r.ot;
  if (typeof r.cf === "number" && !Number.isNaN(r.cf)) out.coef = r.cf;
  if (typeof r.it === "boolean") out.italic = r.it;
  if (typeof r.hj === "string" && (HJUST_VALUES as readonly string[]).includes(r.hj)) {
    out.hjust = r.hj as Hjust;
  }
  if (typeof r.vj === "string" && (VJUST_VALUES as readonly string[]).includes(r.vj)) {
    out.vjust = r.vj as Vjust;
  }
  if (r.of && typeof r.of === "object" && !Array.isArray(r.of)) {
    const raw = r.of as { x?: unknown; y?: unknown };
    const o: { x?: number; y?: number } = {};
    if (typeof raw.x === "number" && !Number.isNaN(raw.x)) o.x = raw.x;
    if (typeof raw.y === "number" && !Number.isNaN(raw.y)) o.y = raw.y;
    if (o.x !== undefined || o.y !== undefined) out.offset = o;
  }
  if (typeof r.rt === "number" && !Number.isNaN(r.rt)) out.rotation = r.rt;
  if (typeof r.fmt === "string") out.format = r.fmt;
  if (typeof r.flt === "string") out.filter = r.flt;
  if (typeof r.slp === "number" && !Number.isNaN(r.slp)) out.slope = r.slp;
  if (typeof r.o === "number" && !Number.isNaN(r.o)) out.opacity = r.o;
  if (typeof r.z === "number" && !Number.isNaN(r.z)) out.size = r.z;
  if (r.nf === true) out.noFill = true;
  if (r.ns === true) out.noStroke = true;
  return Object.keys(out).length > 0 ? out : undefined;
}

function decodeLayer(raw: unknown): Layer | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (typeof r.d !== "string" || !VALID_DRAWS.has(r.d)) return null;

  if (!r.m || typeof r.m !== "object") return null;
  const mappings: Layer["mappings"] = {};
  for (const [k, v] of Object.entries(r.m as Record<string, unknown>)) {
    if (!VALID_AES.has(k)) continue;
    if (!isNonEmptyString(v)) continue;
    mappings[k as Aes] = v;
  }

  const id = isNonEmptyString(r.i) ? r.i : newId();
  const out: Layer = { id, draw: r.d, mappings };
  const settings = decodeLayerSettings(r.s);
  if (settings) out.settings = settings;
  if (r.x === true) out.disabled = true;
  if (Array.isArray(r.p)) {
    const cols = r.p.filter(isNonEmptyString);
    if (cols.length > 0) out.partition = cols;
  }
  return out;
}

function decodeCustom(raw: unknown): CustomLayer | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.g !== "string") return null;
  if (typeof r.p !== "number" || !Number.isInteger(r.p)) return null;
  const id = isNonEmptyString(r.i) ? r.i : newId();
  const out: CustomLayer = {
    id,
    ggsql: r.g,
    position: Math.max(0, r.p),
  };
  if (r.x === true) out.disabled = true;
  return out;
}

function decodeLabels(raw: unknown): LabelsLayer | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.p !== "number" || !Number.isInteger(r.p)) return null;
  const id = isNonEmptyString(r.i) ? r.i : newId();
  const out: LabelsLayer = { id, position: Math.max(0, r.p) };
  if (typeof r.t === "string") out.title = r.t;
  if (typeof r.st === "string") out.subtitle = r.st;
  if (typeof r.c === "string") out.caption = r.c;
  if (typeof r.x === "string") out.x = r.x;
  if (typeof r.y === "string") out.y = r.y;
  if (r.dx === true) out.disabled = true;
  return out;
}

function decodeProject(raw: unknown): ProjectSettings {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: ProjectSettings = {};
  if (typeof r.r === "number" && !Number.isNaN(r.r)) out.ratio = r.r;
  if (typeof r.c === "boolean") out.clip = r.c;
  return out;
}

/** Decode an ActivePanel, cross-validating any referenced id against the
 *  payload's just-decoded layers / labels / custom-layers. A stale id
 *  collapses the panel back to undefined — App.tsx then runs its first-layer
 *  auto-open default. */
function decodeActivePanel(
  raw: unknown,
  layers: Layer[],
  labels: LabelsLayer[],
  customLayers: CustomLayer[] | undefined,
): ActivePanel | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.k !== "string") return undefined;
  switch (r.k) {
    case "shared":
      return { kind: "shared" };
    case "layer": {
      if (!isNonEmptyString(r.i)) return undefined;
      if (!layers.some((l) => l.id === r.i)) return undefined;
      return { kind: "layer", layerId: r.i };
    }
    case "labels": {
      if (!isNonEmptyString(r.i)) return undefined;
      if (!labels.some((l) => l.id === r.i)) return undefined;
      return { kind: "labels", labelsId: r.i };
    }
    case "custom": {
      if (!isNonEmptyString(r.i)) return undefined;
      if (!customLayers || !customLayers.some((c) => c.id === r.i)) {
        return undefined;
      }
      return { kind: "custom", customId: r.i };
    }
    default:
      return undefined;
  }
}

/** Decode a SecondaryPanel and enforce the invariant that it only exists
 *  alongside a layer-kind activePanel. */
function decodeSecondaryPanel(
  raw: unknown,
  activePanel: ActivePanel | undefined,
): SecondaryPanel | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  if (!activePanel || activePanel.kind !== "layer") return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.k !== "string") return undefined;
  if (r.k === "settings") return { kind: "settings" };
  if (r.k === "mapping") {
    if (!isNonEmptyString(r.a) || !VALID_AES.has(r.a)) return undefined;
    return { kind: "mapping", aes: r.a as Aes };
  }
  return undefined;
}

// ────────────────────────────────────────────────────────────────────────────
// Compression + URL-safe base64
// ────────────────────────────────────────────────────────────────────────────

function bytesToBinaryString(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function binaryStringToBytes(bin: string): Uint8Array {
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function base64UrlEncode(bytes: Uint8Array): string {
  return btoa(bytesToBinaryString(bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded =
    str.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((str.length + 3) % 4);
  return binaryStringToBytes(atob(padded));
}

async function gzipString(s: string): Promise<Uint8Array> {
  const stream = new Blob([s])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function ungzipString(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).text();
}

// ────────────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────────────

export async function serialize(p: Persisted): Promise<string> {
  const payload: Payload = { v: VERSION };
  if (p.layers.length > 0) payload.L = p.layers.map(encodeLayer);
  const labels = p.labels.map(encodeLabels);
  if (labels.length > 0) payload.B = labels;
  if (p.customLayers && p.customLayers.length > 0) {
    payload.C = p.customLayers.map(encodeCustom);
  }
  const project = encodeProject(p.project);
  if (Object.keys(project).length > 0) payload.P = project;
  if (p.scales) {
    const scales = encodeScales(p.scales);
    if (Object.keys(scales).length > 0) payload.SC = scales;
  }
  const shared = encodeMappings(p.sharedMappings);
  if (Object.keys(shared).length > 0) payload.S = shared;
  // Any non-empty table name round-trips. Built-in (`ggsql:*`) tables are
  // already registered with ggsql by the wasm init; user-uploaded CSVs are
  // re-registered from IndexedDB before App reads `activeTable` from the hash.
  if (typeof p.activeTable === "string" && p.activeTable.length > 0) {
    payload.t = p.activeTable;
  }
  const ap = encodeActivePanel(p.activePanel);
  if (ap) payload.A = ap;
  const sp = encodeSecondaryPanel(p.secondaryPanel);
  if (sp) payload.D = sp;
  // columnKindsCache — only store entries with a recognised kind.
  if (p.columnKindsCache) {
    const out: Record<string, string> = {};
    for (const [name, kind] of Object.entries(p.columnKindsCache)) {
      if (typeof name === "string" && name.length > 0 && VALID_KINDS.has(kind)) {
        out[name] = kind;
      }
    }
    if (Object.keys(out).length > 0) payload.K = out;
  }
  const json = JSON.stringify(payload);
  const gz = await gzipString(json);
  return `s=${base64UrlEncode(gz)}`;
}

// A layer carries content when it has any mapping, any settings, any partition,
// or an explicit (non-AUTO) draw choice. The disabled flag alone is not content.
function layerHasContent(l: Layer): boolean {
  const e = encodeLayer(l);
  return (
    Object.keys(e.m).length > 0 ||
    e.s !== undefined ||
    (e.p !== undefined && e.p.length > 0) ||
    e.d !== AUTO
  );
}

// A labels layer carries content when any text field is set. id/position and the
// disabled flag are not content.
function labelHasContent(l: LabelsLayer): boolean {
  const e = encodeLabels(l);
  return (
    e.t !== undefined ||
    e.st !== undefined ||
    e.c !== undefined ||
    e.x !== undefined ||
    e.y !== undefined
  );
}

// True when the state holds nothing worth encoding into the URL — no data and no
// chart content. Ephemeral UI (activePanel / secondaryPanel / columnKindsCache)
// is ignored, so App can drop the hash entirely on a cold start or a full reset.
export function isEmptyState(p: Persisted): boolean {
  if (isNonEmptyString(p.activeTable)) return false;
  if (Object.keys(encodeMappings(p.sharedMappings)).length > 0) return false;
  if (Object.keys(encodeProject(p.project)).length > 0) return false;
  if (p.scales && Object.keys(encodeScales(p.scales)).length > 0) return false;
  if (p.customLayers?.some((c) => c.ggsql.trim().length > 0)) return false;
  if (p.labels.some(labelHasContent)) return false;
  if (p.layers.some(layerHasContent)) return false;
  return true;
}

export async function deserialize(hash: string): Promise<Persisted | null> {
  if (!hash) return null;
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const match = h.match(/(?:^|&)s=([^&]+)/);
  if (!match) return null;
  let json: string;
  try {
    json = await ungzipString(base64UrlDecode(match[1]));
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as { v?: unknown }).v !== VERSION
  ) {
    return null;
  }
  const obj = parsed as {
    L?: unknown;
    B?: unknown;
    C?: unknown;
    P?: unknown;
    SC?: unknown;
    S?: unknown;
    t?: unknown;
    A?: unknown;
    D?: unknown;
    K?: unknown;
  };
  const layers = Array.isArray(obj.L)
    ? obj.L
        .map(decodeLayer)
        .filter((l): l is Layer => l !== null)
    : [];
  const labels = Array.isArray(obj.B)
    ? obj.B
        .map(decodeLabels)
        .filter((l): l is LabelsLayer => l !== null)
    : [];
  const customLayers = Array.isArray(obj.C)
    ? obj.C
        .map(decodeCustom)
        .filter((c): c is CustomLayer => c !== null)
    : undefined;
  const out: Persisted = {
    layers,
    labels,
    project: decodeProject(obj.P),
    sharedMappings: decodeMappings(obj.S),
    activeTable:
      typeof obj.t === "string" && obj.t.length > 0 ? obj.t : null,
  };
  if (customLayers && customLayers.length > 0) {
    out.customLayers = customLayers;
  }
  // Chart-level scales: the new `SC` payload, plus migration of the old
  // per-layer scale keys (first non-empty across layers wins, SC takes
  // precedence) so existing hashes keep their format / breaks / palettes.
  let scales = decodeScales(obj.SC);
  if (Array.isArray(obj.L)) {
    for (const sl of obj.L) {
      const fromLayer = decodeScales(
        sl && typeof sl === "object"
          ? (sl as { s?: unknown }).s
          : undefined,
      );
      scales = { ...fromLayer, ...scales };
    }
  }
  if (Object.keys(scales).length > 0) out.scales = scales;
  const activePanel = decodeActivePanel(obj.A, layers, labels, customLayers);
  if (activePanel) out.activePanel = activePanel;
  const secondaryPanel = decodeSecondaryPanel(obj.D, activePanel);
  if (secondaryPanel) out.secondaryPanel = secondaryPanel;
  if (obj.K && typeof obj.K === "object" && !Array.isArray(obj.K)) {
    const cache: Record<string, ColumnKind> = {};
    for (const [name, kind] of Object.entries(
      obj.K as Record<string, unknown>,
    )) {
      if (
        typeof name === "string" &&
        name.length > 0 &&
        typeof kind === "string" &&
        VALID_KINDS.has(kind)
      ) {
        cache[name] = kind as ColumnKind;
      }
    }
    if (Object.keys(cache).length > 0) out.columnKindsCache = cache;
  }
  return out;
}
