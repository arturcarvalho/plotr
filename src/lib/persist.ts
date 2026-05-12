import {
  AESTHETICS,
  AUTO,
  DRAW_TYPES,
  FACETS,
  type Aes,
  type CustomLayer,
  type LabelsLayer,
  type Layer,
  type LayerSettings,
  type ProjectSettings,
} from "./buildQuery";

export interface Persisted {
  layers: Layer[];
  labels: LabelsLayer[];
  /** Optional. Omitted when there are no custom layers, for shorter URL hashes. */
  customLayers?: CustomLayer[];
  project: ProjectSettings;
  sharedMappings: Partial<Record<Aes, string>>;
  /** Built-in (ggsql:*) table name only. User CSV tables are not persisted. */
  activeTable: string | null;
}

const BUILTIN_PREFIX = "ggsql:";
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
  hj?: number;
  vj?: number;
  rt?: number;
  fmt?: string;
  slp?: number;
  o?: number;
  z?: number;
  nf?: true;
  ns?: true;
  fpd?: string;
  fpc?: string;
  kpd?: string;
  kpc?: string;
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
interface Payload {
  v: number;
  L?: ShortLayer[];
  B?: ShortLabels[];
  C?: ShortCustom[];
  P?: ShortProject;
  S?: Partial<Record<Aes, string>>;
  t?: string;
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
  if (typeof s.hjust === "number" && !Number.isNaN(s.hjust)) out.hj = s.hjust;
  if (typeof s.vjust === "number" && !Number.isNaN(s.vjust)) out.vj = s.vjust;
  if (typeof s.rotation === "number" && !Number.isNaN(s.rotation))
    out.rt = s.rotation;
  if (typeof s.format === "string" && s.format.length > 0) out.fmt = s.format;
  if (typeof s.slope === "number" && !Number.isNaN(s.slope))
    out.slp = s.slope;
  if (typeof s.opacity === "number" && !Number.isNaN(s.opacity)) out.o = s.opacity;
  if (typeof s.size === "number" && !Number.isNaN(s.size)) out.z = s.size;
  if (s.noFill === true) out.nf = true;
  if (s.noStroke === true) out.ns = true;
  if (isNonEmptyString(s.fillPaletteDiscrete)) out.fpd = s.fillPaletteDiscrete;
  if (isNonEmptyString(s.fillPaletteContinuous))
    out.fpc = s.fillPaletteContinuous;
  if (isNonEmptyString(s.strokePaletteDiscrete))
    out.kpd = s.strokePaletteDiscrete;
  if (isNonEmptyString(s.strokePaletteContinuous))
    out.kpc = s.strokePaletteContinuous;
  return Object.keys(out).length > 0 ? out : undefined;
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
  if (typeof r.hj === "number" && !Number.isNaN(r.hj)) out.hjust = r.hj;
  if (typeof r.vj === "number" && !Number.isNaN(r.vj)) out.vjust = r.vj;
  if (typeof r.rt === "number" && !Number.isNaN(r.rt)) out.rotation = r.rt;
  if (typeof r.fmt === "string") out.format = r.fmt;
  if (typeof r.slp === "number" && !Number.isNaN(r.slp)) out.slope = r.slp;
  if (typeof r.o === "number" && !Number.isNaN(r.o)) out.opacity = r.o;
  if (typeof r.z === "number" && !Number.isNaN(r.z)) out.size = r.z;
  if (r.nf === true) out.noFill = true;
  if (r.ns === true) out.noStroke = true;
  if (typeof r.fpd === "string") out.fillPaletteDiscrete = r.fpd;
  if (typeof r.fpc === "string") out.fillPaletteContinuous = r.fpc;
  if (typeof r.kpd === "string") out.strokePaletteDiscrete = r.kpd;
  if (typeof r.kpc === "string") out.strokePaletteContinuous = r.kpc;
  return Object.keys(out).length > 0 ? out : undefined;
}

function decodeLayer(raw: unknown): Layer | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (typeof r.d !== "string" || !VALID_DRAWS.has(r.d)) return null;

  if (!r.m || typeof r.m !== "object") return null;
  const mappings: Layer["mappings"] = {};
  for (const [k, v] of Object.entries(r.m as Record<string, unknown>)) {
    if (!VALID_AES.has(k)) return null;
    if (!isNonEmptyString(v)) return null;
    mappings[k as Aes] = v;
  }

  const id = isNonEmptyString(r.i) ? r.i : newId();
  const out: Layer = { id, draw: r.d, mappings };
  const settings = decodeLayerSettings(r.s);
  if (settings) out.settings = settings;
  if (r.x === true) out.disabled = true;
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
  const shared = encodeMappings(p.sharedMappings);
  if (Object.keys(shared).length > 0) payload.S = shared;
  if (
    typeof p.activeTable === "string" &&
    p.activeTable.startsWith(BUILTIN_PREFIX)
  ) {
    payload.t = p.activeTable;
  }
  const json = JSON.stringify(payload);
  const gz = await gzipString(json);
  return `s=${base64UrlEncode(gz)}`;
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
    S?: unknown;
    t?: unknown;
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
      typeof obj.t === "string" && obj.t.startsWith(BUILTIN_PREFIX)
        ? obj.t
        : null,
  };
  if (customLayers && customLayers.length > 0) {
    out.customLayers = customLayers;
  }
  return out;
}
