import { isMapped, type Aes, type Layer } from "./buildQuery";

// Number of mapped variables the user has configured: every filled dropzone
// across the shared mappings and each layer's mappings. Drives the header
// menu's "N variables configured" subtitle. Disabled layers count — their
// mappings are still part of the chart config that "Clear chart settings"
// wipes. Empty-string slots are ignored.
export function countConfiguredVariables(
  layers: Layer[],
  sharedMappings: Partial<Record<Aes, string>>,
): number {
  const countSet = (m: Partial<Record<Aes, string>>) =>
    Object.values(m).filter(isMapped).length;
  return (
    countSet(sharedMappings) +
    layers.reduce((sum, l) => sum + countSet(l.mappings), 0)
  );
}
