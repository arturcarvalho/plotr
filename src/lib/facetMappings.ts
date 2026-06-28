import type { Aes, Layer } from "./buildQuery";

const FACET_KEYS = ["facet_col", "facet_row"] as const;
const isMapped = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export interface NormalizedFacetMappings {
  layers: Layer[];
  sharedMappings: Partial<Record<Aes, string>>;
}

/** Facets are chart-wide state. Older hashes stored them on individual layers,
 * so promote one legacy source into shared mappings and strip every local copy.
 * Explicit shared values win. */
export function normalizeFacetMappings(
  layers: Layer[],
  sharedMappings: Partial<Record<Aes, string>>,
): NormalizedFacetMappings {
  const hasFacet = (layer: Layer) =>
    FACET_KEYS.some((aes) => isMapped(layer.mappings[aes]));
  const source =
    layers.find((layer) => !layer.disabled && hasFacet(layer)) ??
    layers.find(hasFacet);

  let sharedChanged = false;
  const nextShared = { ...sharedMappings };
  if (source) {
    for (const aes of FACET_KEYS) {
      if (!isMapped(nextShared[aes]) && isMapped(source.mappings[aes])) {
        nextShared[aes] = source.mappings[aes];
        sharedChanged = true;
      }
    }
  }

  let layersChanged = false;
  const nextLayers = layers.map((layer) => {
    if (!FACET_KEYS.some((aes) => aes in layer.mappings)) return layer;
    const mappings = { ...layer.mappings };
    for (const aes of FACET_KEYS) delete mappings[aes];
    layersChanged = true;
    return { ...layer, mappings };
  });

  return {
    layers: layersChanged ? nextLayers : layers,
    sharedMappings: sharedChanged ? nextShared : sharedMappings,
  };
}
