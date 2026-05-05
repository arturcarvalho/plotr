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

        <div className="min-h-0 flex-1 overflow-y-auto py-3 pl-3">
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

