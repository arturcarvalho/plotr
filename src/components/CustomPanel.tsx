import { useRef, useState } from "react";
import type { CustomLayer } from "../lib/buildQuery";
import { crossesBoundary, useDragging } from "../lib/dragHelpers";
import { DeleteBanner } from "./DeleteBanner";
import { PanelActions } from "./PanelActions";

type CustomPatch = Partial<Pick<CustomLayer, "ggsql">>;

interface Props {
  custom: CustomLayer;
  onChange: (patch: CustomPatch) => void;
  onRemove: () => void;
  onToggleDisabled: () => void;
}

export function CustomPanel({ custom, onChange, onRemove, onToggleDisabled }: Props) {
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
        <header className="group flex h-[52px] items-center border-b border-stone-200 pl-3 pr-2">
          <span className="min-w-0 flex-1 truncate font-mono text-sm font-semibold text-stone-800">
            Custom
          </span>
          <PanelActions
            kind="custom layer"
            disabled={custom.disabled === true}
            onRemove={onRemove}
            onToggleDisabled={onToggleDisabled}
          />
        </header>
        <div className="space-y-2 p-3">
          <label className="block">
            <span className="mb-1 block font-mono text-xs font-semibold text-stone-700">
              ggsql
            </span>
            <textarea
              value={custom.ggsql}
              onChange={(e) => onChange({ ggsql: e.target.value })}
              rows={12}
              spellCheck={false}
              placeholder="e.g. SCALE x TO log"
              className="w-full resize-y rounded border border-stone-300 bg-white px-2 py-1 font-mono text-xs text-stone-800 focus:border-sky-400 focus:outline-none"
            />
          </label>
          <p className="font-mono text-[10px] leading-relaxed text-stone-500">
            Inserted between layer DRAW lines at this card's position. Multiple
            lines are emitted verbatim; empty contents are skipped.
          </p>
        </div>
      </div>
    </aside>
  );
}
