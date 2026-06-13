import { useRef, useState } from "react";
import type { LabelsLayer } from "../lib/buildQuery";
import { crossesBoundary, useDragging } from "../lib/dragHelpers";
import { ClearButton } from "./ClearButton";
import { DeleteBanner } from "./DeleteBanner";
import { PanelActions } from "./PanelActions";

type LabelsPatch = Partial<
  Pick<LabelsLayer, "title" | "subtitle" | "caption" | "x" | "y">
>;

interface Props {
  labels: LabelsLayer;
  onChange: (patch: LabelsPatch) => void;
  onRemove: () => void;
  onToggleDisabled: () => void;
}

export function LabelsPanel({ labels, onChange, onRemove, onToggleDisabled }: Props) {
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
            Labels
          </span>
          <PanelActions
            kind="labels"
            disabled={labels.disabled === true}
            onRemove={onRemove}
            onToggleDisabled={onToggleDisabled}
          />
        </header>
        <div className="space-y-3 p-3">
          <Input
            label="Title"
            value={labels.title ?? ""}
            onChange={(v) => onChange({ title: v || undefined })}
          />
          <Input
            label="Subtitle"
            description="Only shown when title is set"
            value={labels.subtitle ?? ""}
            onChange={(v) => onChange({ subtitle: v || undefined })}
          />
          <Input
            label="X axis"
            value={labels.x ?? ""}
            onChange={(v) => onChange({ x: v || undefined })}
          />
          <Input
            label="Y axis"
            value={labels.y ?? ""}
            onChange={(v) => onChange({ y: v || undefined })}
          />
        </div>
      </div>
    </aside>
  );
}

function Input({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between font-mono text-xs font-semibold text-stone-700">
        <span>{label}</span>
        {value.trim() && <ClearButton onClick={() => onChange("")} />}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-stone-300 bg-white px-2 py-1 font-mono text-xs text-stone-800 focus:border-sky-400 focus:outline-none"
      />
      {description && (
        <span className="mt-1 block font-mono text-[10px] text-stone-500">
          {description}
        </span>
      )}
    </label>
  );
}
