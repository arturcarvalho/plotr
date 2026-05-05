import {
  AESTHETICS,
  AUTO,
  DRAW_TYPES,
  FACETS,
  type Aes,
  type LabelsLayer,
  type Layer,
  type LayerSettings,
  type ProjectSettings,
} from "./buildQuery";

export interface Persisted {
  layers: Layer[];
  labels: LabelsLayer[];
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
  o?: number;
  z?: number;
  nf?: true;
  ns?: true;
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
interface ShortProject {
  r?: number;
  c?: false;
}
interface Payload {
  v: number;
  L?: ShortLayer[];
  B?: ShortLabels[];
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
  if (typeof s.opacity === "number" && !Number.isNaN(s.opacity)) out.o = s.opacity;
  if (typeof s.size === "number" && !Number.isNaN(s.size)) out.z = s.size;
  if (s.noFill === true) out.nf = true;
  if (s.noStroke === true) out.ns = true;
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
  return {
    layers,
    labels,
    project: decodeProject(obj.P),
    sharedMappings: decodeMappings(obj.S),
    activeTable:
      typeof obj.t === "string" && obj.t.startsWith(BUILTIN_PREFIX)
        ? obj.t
        : null,
  };
}
