import {
  chartLabel,
  computeMissingRequired,
  type Aes,
  type Layer,
  type LayerSettings,
} from "../lib/buildQuery";
import { useDebouncedInput } from "../lib/useDebouncedInput";
import { ClearButton } from "./ClearButton";
import { DraggablePanel } from "./DraggablePanel";
import { MappingFields } from "./MappingFields";
import { PanelActions } from "./PanelActions";

interface Props {
  layer: Layer;
  facetMappings: Partial<Record<Aes, string>>;
  resolvedDraw: string | null;
  openMappingAes: Aes | null;
  onMap: (aes: Aes, col: string | undefined) => void;
  onDrop: (
    aes: Aes,
    col: string,
    src?: { layerId: string; aes: Aes },
  ) => void;
  onMapFacet: (aes: Aes, col: string | undefined) => void;
  onDropFacet: (
    aes: Aes,
    col: string,
    src?: { layerId: string; aes: Aes },
  ) => void;
  facetSourceId: string;
  onToggleMappingSettings: (aes: Aes) => void;
  onOpenSettings: () => void;
  onChangeSettings: (settings: LayerSettings) => void;
  /** Append / remove a PARTITION BY column for this layer. */
  onAddPartition: (col: string) => void;
  onRemovePartition: (col: string) => void;
  onRemove: () => void;
  onToggleDisabled: () => void;
  /** False while the layer wouldn't emit a DRAW clause (nothing mapped). */
  canConvert: boolean;
  onConvert: () => void;
}

export function ChartPanel({
  layer,
  facetMappings,
  resolvedDraw,
  openMappingAes,
  onMap,
  onDrop,
  onMapFacet,
  onDropFacet,
  facetSourceId,
  onToggleMappingSettings,
  onOpenSettings,
  onChangeSettings,
  onAddPartition,
  onRemovePartition,
  onRemove,
  onToggleDisabled,
  canConvert,
  onConvert,
}: Props) {
  const title = resolvedDraw ? chartLabel(resolvedDraw) : "Chart";

  // Geom-specific aesthetics that ggsql needs but the layer hasn't mapped yet.
  // MappingFields uses this to render the matching dropzones with an amber-
  // dashed border so the user sees what's still required.
  const missingRequired = computeMissingRequired(resolvedDraw, layer.mappings);

  return (
    <DraggablePanel>
      {/* The whole header is the settings affordance; the action buttons
          stop propagation so only they don't bubble into it. */}
      <header
        onClick={onOpenSettings}
        title="Open chart settings"
        className="group flex h-[52px] w-full shrink-0 cursor-pointer items-center border-b border-stone-200 pl-3 pr-2 transition-colors hover:bg-stone-100"
      >
        <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-stone-800">
          {title}
        </span>
        <PanelActions
          kind="layer"
          disabled={layer.disabled === true}
          onRemove={onRemove}
          onToggleDisabled={onToggleDisabled}
          convert={{ enabled: canConvert, onConvert }}
          onOpenSettings={onOpenSettings}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-3 pl-3">
        <MappingFields
          mappings={layer.mappings}
          sourceId={layer.id}
          facetMappings={facetMappings}
          facetSourceId={facetSourceId}
          resolvedDraw={resolvedDraw}
          missingRequired={missingRequired}
          openMappingAes={openMappingAes}
          onMap={onMap}
          onDrop={onDrop}
          onMapFacet={onMapFacet}
          onDropFacet={onDropFacet}
          onToggleSettings={onToggleMappingSettings}
          partition={layer.partition}
          onAddPartition={onAddPartition}
          onRemovePartition={onRemovePartition}
        />
        <FilterField
          value={layer.settings?.filter ?? ""}
          onChange={(v) => {
            const next: LayerSettings = { ...layer.settings };
            if (v) next.filter = v;
            else delete next.filter;
            onChangeSettings(next);
          }}
        />
      </div>
    </DraggablePanel>
  );
}

/** Per-layer SQL WHERE-style predicate. Emitted as `FILTER <expr>` at the
 *  tail of the DRAW clause. Free-form passthrough — ggsql parses + validates
 *  it, errors surface in the Problems pane. Clears with other settings on
 *  geom switch (filter lives on `LayerSettings`). */
function FilterField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const input = useDebouncedInput(value, onChange);
  return (
    <div className="-ml-3 mt-8 border-t border-stone-200 pl-3 pr-3 pt-3">
      <label className="block">
        <span className="mb-1 flex items-center justify-between font-mono text-xs text-stone-700">
          <span>Filter</span>
          {input.value.trim() && <ClearButton onClick={input.clear} />}
        </span>
        <input
          type="text"
          value={input.value}
          onChange={input.onChange}
          onBlur={input.onBlur}
          onKeyDown={input.onKeyDown}
          placeholder="species = 'Adelie'"
          spellCheck={false}
          className="w-full rounded border border-stone-300 bg-white px-2 py-1 font-mono text-xs text-stone-800 focus:border-sky-400 focus:outline-none"
        />
      </label>
      <p className="mt-1 font-mono text-[10px] leading-relaxed text-stone-500">
        SQL WHERE-style predicate, applied to this layer only.
      </p>
    </div>
  );
}

