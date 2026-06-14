import type { Aes } from "../lib/buildQuery";
import { DraggablePanel } from "./DraggablePanel";
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
  return (
    <DraggablePanel>
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
    </DraggablePanel>
  );
}
