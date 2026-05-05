import type { ReactNode } from "react";
import type { Aes } from "../lib/buildQuery";
import { Dropzone } from "./Dropzone";

interface Props {
  mappings: Partial<Record<Aes, string>>;
  sourceId: string;
  openMappingAes?: Aes | null;
  onMap: (aes: Aes, col: string | undefined) => void;
  onDrop: (
    aes: Aes,
    col: string,
    src?: { layerId: string; aes: Aes },
  ) => void;
  onToggleSettings?: (aes: Aes) => void;
}

export function MappingFields({
  mappings,
  sourceId,
  openMappingAes,
  onMap,
  onDrop,
  onToggleSettings,
}: Props) {
  const dropzoneFor = (aes: Aes, placeholder?: string) => (
    <Dropzone
      placeholder={placeholder}
      value={mappings[aes]}
      source={{ layerId: sourceId, aes }}
      onDrop={(c, src) => onDrop(aes, c, src)}
      onClear={() => onMap(aes, undefined)}
    />
  );

  const row = (aes: Aes, placeholder?: string) => (
    <DropzoneRow
      open={openMappingAes === aes}
      onToggleSettings={
        onToggleSettings ? () => onToggleSettings(aes) : undefined
      }
    >
      {dropzoneFor(aes, placeholder)}
    </DropzoneRow>
  );

  return (
    <div className="space-y-3">
      <Field label="X">{row("x", "Bottom Axis")}</Field>
      <Field label="Y">{row("y", "Left Axis")}</Field>
      <Field label="Fill">{row("fill")}</Field>
      <Field label="Stroke">{row("stroke")}</Field>
      <Field label="Opacity">{row("opacity")}</Field>
      <Field label="Size">{row("size")}</Field>
      <Field label="Panels">
        <div className="space-y-1">
          {row("facet_row", "rows")}
          <div className="text-center font-mono text-[10px] text-stone-400">
            by
          </div>
          {row("facet_col", "columns")}
        </div>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 font-mono text-xs font-semibold text-stone-700">
        {label}
      </div>
      {children}
    </div>
  );
}

function DropzoneRow({
  open,
  onToggleSettings,
  children,
}: {
  open: boolean;
  onToggleSettings?: () => void;
  children: ReactNode;
}) {
  if (!onToggleSettings) return <>{children}</>;
  return (
    <div className="flex items-stretch">
      <div className="flex-1">{children}</div>
      <button
        type="button"
        onClick={onToggleSettings}
        aria-label={open ? "Close settings" : "Open settings"}
        title={open ? "Close settings" : "Open settings"}
        className={[
          "relative flex w-10 shrink-0 items-center justify-center rounded transition-colors",
          // Invisible pseudo-element extends the click target ~8 px on all
          // sides without changing layout dimensions of the row.
          "before:absolute before:-inset-2 before:content-['']",
          open
            ? "bg-stone-100 text-stone-800 hover:bg-stone-200"
            : "text-stone-400 hover:bg-stone-100 hover:text-stone-700",
        ].join(" ")}
      >
        <ChevronRightIcon />
      </button>
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
