import type { CustomLayer, LabelsLayer, Layer } from "./buildQuery";

/** One reorderable card in the build-pane strip, in display order. */
export interface StripItem {
  kind: "layer" | "labels" | "custom";
  id: string;
}

/** Shift labels/custom positions down by one after the chart layer at `idx`
 *  is removed — every item with `position > idx` loses a leading layer slot.
 *  Pure: items at/below `idx` keep their reference; the input is never
 *  mutated, so it's safe to call inside a React state updater. */
export function decrementPositionsAfter<T extends { position: number }>(
  items: T[],
  idx: number,
): T[] {
  return items.map((it) =>
    it.position > idx ? { ...it, position: it.position - 1 } : it,
  );
}

/** Display order of the build strip's reorderable cards. For each chart-layer
 *  index i: labels at position i (array order), then customs at position i
 *  (array order), then layer i. Positions >= layers.length — including stale
 *  positions from a hash that outlived a layer removal — clamp to a trailing
 *  slot after the last layer. BuildPanel renders from this list, so display
 *  and reorder logic share one source of truth. */
export function stripOrder(
  layers: Layer[],
  labels: LabelsLayer[],
  customs: CustomLayer[],
): StripItem[] {
  const out: StripItem[] = [];
  const slot = (i: number) => {
    const match = (p: number) => (i >= layers.length ? p >= i : p === i);
    for (const l of labels)
      if (match(l.position)) out.push({ kind: "labels", id: l.id });
    for (const c of customs)
      if (match(c.position)) out.push({ kind: "custom", id: c.id });
  };
  layers.forEach((l, i) => {
    slot(i);
    out.push({ kind: "layer", id: l.id });
  });
  slot(layers.length);
  return out;
}

interface StripState {
  layers: Layer[];
  labels: LabelsLayer[];
  customLayers: CustomLayer[];
}

/** Rebuild the three state arrays from a display list: layer order follows the
 *  list; every labels/custom position re-derives as the number of layer items
 *  before it. Objects are reused when their position is unchanged, so callers
 *  can detect no-ops by reference. */
function rebuild(
  display: StripItem[],
  layerById: Map<string, Layer>,
  labelById: Map<string, LabelsLayer>,
  customById: Map<string, CustomLayer>,
): StripState {
  const layers: Layer[] = [];
  const labels: LabelsLayer[] = [];
  const customLayers: CustomLayer[] = [];
  let layerCount = 0;
  for (const item of display) {
    if (item.kind === "layer") {
      layers.push(layerById.get(item.id)!);
      layerCount++;
    } else if (item.kind === "labels") {
      const l = labelById.get(item.id)!;
      labels.push(l.position === layerCount ? l : { ...l, position: layerCount });
    } else {
      const c = customById.get(item.id)!;
      customLayers.push(
        c.position === layerCount ? c : { ...c, position: layerCount },
      );
    }
  }
  return { layers, labels, customLayers };
}

const byId = <T extends { id: string }>(arr: T[]) =>
  new Map(arr.map((x) => [x.id, x]));

const sameItems = <T>(a: T[], b: T[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** Move the card `activeId` to the display index of `overId` (dnd-kit sortable
 *  semantics) and re-derive layer order + labels/custom positions. Returns the
 *  same array references when nothing changes (no-op move, unknown ids) so
 *  React state setters can bail. Note one normalization: a slot always renders
 *  labels before customs, so a drop that would interleave them inside one slot
 *  snaps back to that order. */
export function reorderStrip(
  layers: Layer[],
  labels: LabelsLayer[],
  customs: CustomLayer[],
  activeId: string,
  overId: string,
): StripState {
  const unchanged = { layers, labels, customLayers: customs };
  if (activeId === overId) return unchanged;
  const display = stripOrder(layers, labels, customs);
  const from = display.findIndex((d) => d.id === activeId);
  const to = display.findIndex((d) => d.id === overId);
  if (from < 0 || to < 0) return unchanged;
  const moved = display.slice();
  const [item] = moved.splice(from, 1);
  moved.splice(to, 0, item);
  const next = rebuild(moved, byId(layers), byId(labels), byId(customs));
  return {
    layers: sameItems(next.layers, layers) ? layers : next.layers,
    labels: sameItems(next.labels, labels) ? labels : next.labels,
    customLayers: sameItems(next.customLayers, customs)
      ? customs
      : next.customLayers,
  };
}

/** Replace chart layer `layerId` with a custom layer holding `clause`, in the
 *  same strip slot (labels/customs after it keep their relative places; their
 *  positions re-derive). Carries the layer's disabled flag over. Returns null
 *  when the layer id is unknown. */
export function convertLayerToCustom(
  layers: Layer[],
  labels: LabelsLayer[],
  customs: CustomLayer[],
  layerId: string,
  customId: string,
  clause: string,
): (StripState & { custom: CustomLayer }) | null {
  const src = layers.find((l) => l.id === layerId);
  if (!src) return null;
  const draft: CustomLayer = {
    id: customId,
    ggsql: clause,
    position: 0,
    ...(src.disabled ? { disabled: true } : {}),
  };
  const display = stripOrder(layers, labels, customs).map((item) =>
    item.kind === "layer" && item.id === layerId
      ? ({ kind: "custom", id: customId } as StripItem)
      : item,
  );
  const customById = byId(customs);
  customById.set(customId, draft);
  const next = rebuild(display, byId(layers), byId(labels), customById);
  const custom = next.customLayers.find((c) => c.id === customId)!;
  return { ...next, custom };
}
