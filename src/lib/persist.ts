import {
  AESTHETICS,
  AUTO,
  DRAW_TYPES,
  FACETS,
  type Aes,
  type Labels,
  type Layer,
  type LayerSettings,
  type ProjectSettings,
} from "./buildQuery";

export interface Persisted {
  layers: Layer[];
  labels: Labels;
  project: ProjectSettings;
  /** Built-in (ggsql:*) table name only. User CSV tables are not persisted. */
  activeTable: string | null;
}

const BUILTIN_PREFIX = "ggsql:";

const VERSION = 1;

const VALID_DRAWS: ReadonlySet<string> = new Set<string>([
  ...DRAW_TYPES,
  AUTO,
]);
const VALID_AES: ReadonlySet<string> = new Set<string>([
  ...AESTHETICS,
  ...FACETS,
]);
const SETTING_NUMERIC: ReadonlySet<string> = new Set([
  "width",
  "opacity",
  "size",
]);
const SETTING_STRING: ReadonlySet<string> = new Set(["position", "color"]);

const newId = () => Math.random().toString(36).slice(2, 9);

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0;

const isMeaningful = (v: unknown): boolean =>
  v !== undefined && v !== null && v !== "";

const cleanLabels = (l: Labels): Labels => {
  const out: Labels = {};
  if (isMeaningful(l.title)) out.title = l.title;
  if (isMeaningful(l.subtitle)) out.subtitle = l.subtitle;
  if (isMeaningful(l.caption)) out.caption = l.caption;
  return out;
};

const cleanProject = (p: ProjectSettings): ProjectSettings => {
  const out: ProjectSettings = {};
  if (typeof p.ratio === "number" && !Number.isNaN(p.ratio)) {
    out.ratio = p.ratio;
  }
  if (p.clip === false) out.clip = false;
  return out;
};

const cleanSettings = (
  s: LayerSettings | undefined,
): LayerSettings | undefined => {
  if (!s) return undefined;
  const out: LayerSettings = {};
  for (const [k, v] of Object.entries(s) as Array<
    [keyof LayerSettings, unknown]
  >) {
    if (v !== undefined && v !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (out as any)[k] = v;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

const cleanLayer = (l: Layer): Layer => {
  const out: Layer = {
    id: l.id,
    draw: l.draw,
    mappings: { ...l.mappings },
  };
  const settings = cleanSettings(l.settings);
  if (settings) out.settings = settings;
  return out;
};

export function serialize(p: Persisted): string {
  type Payload = {
    v: number;
    layers?: Layer[];
    labels?: Labels;
    project?: ProjectSettings;
    table?: string;
  };
  const payload: Payload = { v: VERSION };
  if (p.layers.length > 0) payload.layers = p.layers.map(cleanLayer);
  const labels = cleanLabels(p.labels);
  if (Object.keys(labels).length > 0) payload.labels = labels;
  const project = cleanProject(p.project);
  if (Object.keys(project).length > 0) payload.project = project;
  if (
    typeof p.activeTable === "string" &&
    p.activeTable.startsWith(BUILTIN_PREFIX)
  ) {
    payload.table = p.activeTable;
  }
  return `s=${encodeURIComponent(JSON.stringify(payload))}`;
}

function validateLayer(raw: unknown): Layer | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (typeof r.draw !== "string" || !VALID_DRAWS.has(r.draw)) return null;

  if (!r.mappings || typeof r.mappings !== "object") return null;
  const mappings: Layer["mappings"] = {};
  for (const [k, v] of Object.entries(r.mappings as Record<string, unknown>)) {
    if (!VALID_AES.has(k)) return null;
    if (!isNonEmptyString(v)) return null;
    mappings[k as Aes] = v;
  }

  const id = isNonEmptyString(r.id) ? r.id : newId();
  const out: Layer = { id, draw: r.draw, mappings };

  if (r.settings && typeof r.settings === "object") {
    const settings: LayerSettings = {};
    for (const [k, v] of Object.entries(
      r.settings as Record<string, unknown>,
    )) {
      if (SETTING_STRING.has(k) && typeof v === "string") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (settings as any)[k] = v;
      } else if (
        SETTING_NUMERIC.has(k) &&
        typeof v === "number" &&
        !Number.isNaN(v)
      ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (settings as any)[k] = v;
      }
    }
    if (Object.keys(settings).length > 0) out.settings = settings;
  }

  return out;
}

function validateLabels(raw: unknown): Labels {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: Labels = {};
  if (typeof r.title === "string") out.title = r.title;
  if (typeof r.subtitle === "string") out.subtitle = r.subtitle;
  if (typeof r.caption === "string") out.caption = r.caption;
  return out;
}

function validateProject(raw: unknown): ProjectSettings {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: ProjectSettings = {};
  if (typeof r.ratio === "number" && !Number.isNaN(r.ratio)) {
    out.ratio = r.ratio;
  }
  if (typeof r.clip === "boolean") out.clip = r.clip;
  return out;
}

export function deserialize(hash: string): Persisted | null {
  if (!hash) return null;
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const match = h.match(/(?:^|&)s=([^&]+)/);
  if (!match) return null;
  let json: string;
  try {
    json = decodeURIComponent(match[1]);
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
    layers?: unknown;
    labels?: unknown;
    project?: unknown;
    table?: unknown;
  };
  const layers = Array.isArray(obj.layers)
    ? obj.layers
        .map(validateLayer)
        .filter((l): l is Layer => l !== null)
    : [];
  return {
    layers,
    labels: validateLabels(obj.labels),
    project: validateProject(obj.project),
    activeTable:
      typeof obj.table === "string" && obj.table.startsWith(BUILTIN_PREFIX)
        ? obj.table
        : null,
  };
}
