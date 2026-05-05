import { useRef, useState } from "react";
import type { Aes } from "../lib/buildQuery";
import { crossesBoundary, useDragging } from "../lib/dragHelpers";
import { DeleteBanner } from "./DeleteBanner";
import { MappingFields } from "./MappingFields";

export const SHARED_MAPPINGS_KEY = "__shared__";

interface Props {
  mappings: Partial<Record<Aes, string>>;
  onMap: (aes: Aes, col: string | undefined) => void;
  onDrop: (
    aes: Aes,
    col: string,
    src?: { layerId: string; aes: Aes },
  ) => void;
}

export function SharedMappingsPanel({
  mappings,
  onMap,
  onDrop,
}: Props) {
  const asideRef = useRef<HTMLElement>(null);
  const dragging = useDragging();
  const [hovered, setHovered] = useState(false);
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
        <header className="flex h-[52px] items-center border-b border-stone-200 px-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-sm font-semibold text-stone-800">
              Shared variables
            </div>
            <div className="truncate font-mono text-[10px] text-stone-500">
              Variable mappings shared by all layers
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <MappingFields
            mappings={mappings}
            sourceId={SHARED_MAPPINGS_KEY}
            onMap={onMap}
            onDrop={onDrop}
          />
        </div>
      </div>
    </aside>
  );
}
