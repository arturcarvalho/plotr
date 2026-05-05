import { useRef, useState } from "react";
import {
  chartLabel,
  type Aes,
  type Layer,
} from "../lib/buildQuery";
import { crossesBoundary, useDragging } from "../lib/dragHelpers";
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
}

export function ChartPanel({
  layer,
  resolvedDraw,
  openMappingAes,
  onMap,
  onDrop,
  onToggleMappingSettings,
  onOpenSettings,
}: Props) {
  const title = resolvedDraw ? chartLabel(resolvedDraw) : "Chart";
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
        <header className="flex h-[52px] items-center border-b border-stone-200">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex h-full flex-1 items-center justify-between px-3 text-left font-mono text-sm font-semibold text-stone-800 hover:bg-stone-100"
            title="Open chart settings"
          >
            <span>{title}</span>
            <ChevronRightIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <MappingFields
            mappings={layer.mappings}
            sourceId={layer.id}
            openMappingAes={openMappingAes}
            onMap={onMap}
            onDrop={onDrop}
            onToggleSettings={onToggleMappingSettings}
          />
        </div>
      </div>
    </aside>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-stone-400"
      aria-hidden
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

