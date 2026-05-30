import { useRef, useState } from "react";
import {
  chartLabel,
  computeMissingRequired,
  type Aes,
  type Layer,
  type LayerSettings,
} from "../lib/buildQuery";
import { crossesBoundary, useDragging } from "../lib/dragHelpers";
import { useDebouncedInput } from "../lib/useDebouncedInput";
import { DeleteBanner } from "./DeleteBanner";
import { MappingFields } from "./MappingFields";

interface Props {
  layer: Layer;
  resolvedDraw: string | null;
  openMappingAes: Aes | null;
  onMap: (aes: Aes, col: string | undefined) => void;
  onDrop: (
    aes: Aes,
    col: string,
    src?: { layerId: string; aes: Aes },
  ) => void;
  onToggleMappingSettings: (aes: Aes) => void;
  onOpenSettings: () => void;
  onChangeSettings: (settings: LayerSettings) => void;
  /** Append / remove a PARTITION BY column for this layer. */
  onAddPartition: (col: string) => void;
  onRemovePartition: (col: string) => void;
}

export function ChartPanel({
  layer,
  resolvedDraw,
  openMappingAes,
  onMap,
  onDrop,
  onToggleMappingSettings,
  onOpenSettings,
  onChangeSettings,
  onAddPartition,
  onRemovePartition,
}: Props) {
  const title = resolvedDraw ? chartLabel(resolvedDraw) : "Chart";
  const asideRef = useRef<HTMLElement>(null);
  const dragging = useDragging();
  const [hovered, setHovered] = useState(false);

  // Geom-specific aesthetics that ggsql needs but the layer hasn't mapped yet.
  // MappingFields uses this to render the matching dropzones with an amber-
  // dashed border so the user sees what's still required.
  const missingRequired = computeMissingRequired(resolvedDraw, layer.mappings);

  return (
    <aside
      ref={asideRef}
      className="relative flex h-full w-[280px] shrink-0 flex-col bg-app-chrome"
      onDragStart={() => setHovered(true)}
      onDragEnter={(e) => {
        if (crossesBoundary(asideRef.current, e)) setHovered(true);
      }}
      onDragLeave={(e) => {
        if (crossesBoundary(asideRef.current, e)) setHovered(false);
      }}
    >
      <DeleteBanner show={dragging && !hovered} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-y border-r border-stone-300 bg-white">
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open chart settings"
          title="Open chart settings"
          className="group flex h-[52px] w-full shrink-0 items-stretch border-b border-stone-200 transition-colors hover:bg-stone-100"
        >
          <span className="flex flex-1 items-center px-3 text-left font-mono text-sm font-semibold text-stone-800">
            {title}
          </span>
          <span className="flex w-10 shrink-0 items-center justify-center text-stone-400 group-hover:text-stone-700">
            <ChevronRightIcon />
          </span>
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-3 pl-3">
          <MappingFields
            mappings={layer.mappings}
            sourceId={layer.id}
            resolvedDraw={resolvedDraw}
            missingRequired={missingRequired}
            openMappingAes={openMappingAes}
            onMap={onMap}
            onDrop={onDrop}
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
      </div>
    </aside>
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
          <span className="text-[10px] text-stone-500">
            {input.value.trim() ? "set" : "off"}
          </span>
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

function ChevronRightIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

