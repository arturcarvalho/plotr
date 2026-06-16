import { useState, type ReactNode } from "react";
import type { Aes } from "../lib/buildQuery";
import { Dropzone } from "./Dropzone";
import { MultiDropzone } from "./MultiDropzone";
import { ChevronRightIcon } from "./icons";

interface Props {
  mappings: Partial<Record<Aes, string>>;
  sourceId: string;
  /** Chart-wide facet mappings shown from a layer panel. */
  facetMappings?: Partial<Record<Aes, string>>;
  facetSourceId?: string;
  /** Resolved draw of the owning layer; when omitted (e.g. shared mappings),
   *  geom-conditional rows are hidden. */
  resolvedDraw?: string | null;
  /** Aesthetics that the resolved geom requires but the layer hasn't mapped.
   *  Those dropzones render with an amber-dashed border as a visual hint. */
  missingRequired?: readonly Aes[];
  openMappingAes?: Aes | null;
  onMap: (aes: Aes, col: string | undefined) => void;
  onDrop: (
    aes: Aes,
    col: string,
    src?: { layerId: string; aes: Aes },
  ) => void;
  onMapFacet?: (aes: Aes, col: string | undefined) => void;
  onDropFacet?: (
    aes: Aes,
    col: string,
    src?: { layerId: string; aes: Aes },
  ) => void;
  onToggleSettings?: (aes: Aes) => void;
  /** Per-layer PARTITION BY columns + handlers. Only supplied for a chart
   *  layer (not the shared-mappings panel), so the "Partition" field renders
   *  only there. */
  partition?: string[];
  onAddPartition?: (col: string) => void;
  onRemovePartition?: (col: string) => void;
}

export function MappingFields({
  mappings,
  sourceId,
  facetMappings,
  facetSourceId,
  resolvedDraw,
  missingRequired,
  openMappingAes,
  onMap,
  onDrop,
  onMapFacet,
  onDropFacet,
  onToggleSettings,
  partition,
  onAddPartition,
  onRemovePartition,
}: Props) {
  const isMissing = (aes: Aes) =>
    missingRequired ? missingRequired.includes(aes) : false;

  const dropzoneFor = (aes: Aes, placeholder?: string) => {
    const facet = aes === "facet_row" || aes === "facet_col";
    return (
      <Dropzone
        placeholder={placeholder}
        value={facet && facetMappings ? facetMappings[aes] : mappings[aes]}
        required={isMissing(aes)}
        source={{
          layerId: facet && facetSourceId ? facetSourceId : sourceId,
          aes,
        }}
        onDrop={(c, src) =>
          facet && onDropFacet ? onDropFacet(aes, c, src) : onDrop(aes, c, src)
        }
        onClear={() =>
          facet && onMapFacet
            ? onMapFacet(aes, undefined)
            : onMap(aes, undefined)
        }
      />
    );
  };

  // Standalone labelled mapping row — the whole Field (label + padding +
  // dropzone-row) is one click target. Used for every aesthetic except
  // facet_row / facet_col, which sit inside the shared "Panels" Field and
  // don't get their own outer label.
  const labeledField = (aes: Aes, label: string, placeholder?: string) => (
    <Field
      label={label}
      missing={isMissing(aes)}
      open={openMappingAes === aes}
      onToggleSettings={
        onToggleSettings ? () => onToggleSettings(aes) : undefined
      }
    >
      {dropzoneFor(aes, placeholder)}
    </Field>
  );

  // Inside the "Panels" group there are two click targets (rows + columns)
  // so the outer Field can't own a single click — each inner row needs its
  // own button + hover region.
  const facetRow = (aes: Aes, placeholder?: string) => (
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
      {labeledField("x", "X", "Bottom Axis")}
      {labeledField("y", "Y", "Left Axis")}
      {(resolvedDraw === "ribbon" || resolvedDraw === "range") && (
        <>
          {labeledField("ymin", "Y min", "Lower bound")}
          {labeledField("ymax", "Y max", "Upper bound")}
        </>
      )}
      {labeledField("fill", "Fill color")}
      {labeledField("stroke", "Line color")}
      {labeledField("opacity", "Opacity")}
      {labeledField("size", "Size")}
      {resolvedDraw === "text" &&
        labeledField("label", "Label", "Text content")}
      <Field label="Panels">
        <div className="space-y-1">
          {facetRow("facet_row")}
          <div className="text-center font-mono text-[10px] text-stone-400">
            by
          </div>
          {facetRow("facet_col")}
        </div>
      </Field>
      {onAddPartition && onRemovePartition && (
        <Field label="Partition">
          {/* Reserve the chevron-button gutter (w-10 + gap-1) so the dropzone
              box matches the width of the aesthetic dropzones, which sit beside
              a settings chevron. */}
          <div className="flex items-stretch gap-1">
            <div className="flex-1">
              <MultiDropzone
                value={partition ?? []}
                onAdd={onAddPartition}
                onRemove={onRemovePartition}
                placeholder="group by columns"
              />
            </div>
            <div className="w-10 shrink-0" aria-hidden />
          </div>
        </Field>
      )}
    </div>
  );
}

// Shared visual styling for the chevron toggle button. Drives both Field
// (label + dropzone-row) and DropzoneRow (dropzone-row only) so the four
// open × hot states stay in sync.
function chevronButtonClass(open: boolean, hot: boolean): string {
  return [
    "flex w-10 shrink-0 items-center justify-center rounded transition-colors",
    open
      ? hot
        ? "bg-stone-200 text-stone-800"
        : "bg-stone-100 text-stone-800"
      : hot
        ? "bg-stone-200 text-stone-700"
        : "text-stone-400",
  ].join(" ");
}

function Field({
  label,
  missing,
  open,
  onToggleSettings,
  children,
}: {
  label: string;
  /** Renders a muted `(missing)` suffix in amber when this dropzone's
   *  aesthetic is required by the geom but not mapped. */
  missing?: boolean;
  /** When provided, the entire Field (label + dropzone-row, minus the
   *  dropzone itself) becomes a click target that toggles the per-aesthetic
   *  settings panel. `open` controls the chevron-button highlight. */
  open?: boolean;
  onToggleSettings?: () => void;
  children: ReactNode;
}) {
  const [overField, setOverField] = useState(false);
  const [overDropzone, setOverDropzone] = useState(false);

  if (!onToggleSettings) {
    return (
      <div>
        <div className="mb-1 font-mono text-xs font-semibold text-stone-700">
          {label}
          {missing && (
            <span className="ml-1 font-normal text-amber-500">(missing)</span>
          )}
        </div>
        {children}
      </div>
    );
  }

  const hot = overField && !overDropzone;

  return (
    <div
      // Outdent 8 px on each side + 4 px vertically so the click target
      // extends past the label and past the dropzone gutter. No bg change on
      // hover — the row stays the panel's natural background and the
      // chevron button is the only hover affordance.
      className="-mx-2 cursor-pointer px-2 py-1"
      onMouseEnter={() => setOverField(true)}
      onMouseLeave={() => {
        setOverField(false);
        setOverDropzone(false);
      }}
      onClick={() => {
        if (!overDropzone) onToggleSettings();
      }}
    >
      <div className="mb-1 font-mono text-xs font-semibold text-stone-700">
        {label}
        {missing && (
          <span className="ml-1 font-normal text-amber-500">(missing)</span>
        )}
      </div>
      <div className="flex items-stretch gap-1">
        <div
          className="flex-1 cursor-auto"
          onMouseEnter={() => setOverDropzone(true)}
          onMouseLeave={() => setOverDropzone(false)}
        >
          {children}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSettings();
          }}
          aria-label={open ? "Close settings" : "Open settings"}
          title={open ? "Close settings" : "Open settings"}
          className={chevronButtonClass(open ?? false, hot)}
        >
          <ChevronRightIcon />
        </button>
      </div>
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
  // Used by facet rows inside the "Panels" group: same dropzone-vs-rest
  // hover split as Field, but without a label above to fold into the click
  // target. The hover bg is on this row only (no -mx-2 outdent — the parent
  // Field already wraps both facet rows).
  const [overRow, setOverRow] = useState(false);
  const [overDropzone, setOverDropzone] = useState(false);

  if (!onToggleSettings) return <>{children}</>;

  const hot = overRow && !overDropzone;

  return (
    <div
      className="flex cursor-pointer items-stretch gap-1"
      onMouseEnter={() => setOverRow(true)}
      onMouseLeave={() => {
        setOverRow(false);
        setOverDropzone(false);
      }}
      onClick={() => {
        if (!overDropzone) onToggleSettings();
      }}
    >
      <div
        className="flex-1 cursor-auto"
        onMouseEnter={() => setOverDropzone(true)}
        onMouseLeave={() => setOverDropzone(false)}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSettings();
        }}
        aria-label={open ? "Close settings" : "Open settings"}
        title={open ? "Close settings" : "Open settings"}
        className={chevronButtonClass(open, hot)}
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}
