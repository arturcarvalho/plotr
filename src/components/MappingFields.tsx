import { useState, type ReactNode } from "react";
import type { Aes } from "../lib/buildQuery";
import { Dropzone } from "./Dropzone";
import { Tooltip } from "./Tooltip";

interface Props {
  mappings: Partial<Record<Aes, string>>;
  sourceId: string;
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
  onToggleSettings?: (aes: Aes) => void;
  /** Color-row layout flag. When false / undefined → render a single joined
   *  Color row with an embedded Split button. When true → render Fill color +
   *  Line color rows with a Join control between them. */
  colorSplit?: boolean;
  /** Transition the Color rows joined → split. The parent atomically copies
   *  `mappings.color` to `mappings.fill` and `mappings.stroke`, clears
   *  `mappings.color`, and flips `colorSplit` to true. */
  onSplitColor?: () => void;
  /** Transition the Color rows split → joined. Per the join rule, fill wins
   *  (stroke is discarded). Parent moves `mappings.fill` into `mappings.color`,
   *  clears `mappings.fill` + `mappings.stroke`, and flips `colorSplit` to false. */
  onJoinColor?: () => void;
}

export function MappingFields({
  mappings,
  sourceId,
  resolvedDraw,
  missingRequired,
  openMappingAes,
  onMap,
  onDrop,
  onToggleSettings,
  colorSplit,
  onSplitColor,
  onJoinColor,
}: Props) {
  const isMissing = (aes: Aes) =>
    missingRequired ? missingRequired.includes(aes) : false;

  const dropzoneFor = (aes: Aes, placeholder?: string) => (
    <Dropzone
      placeholder={placeholder}
      value={mappings[aes]}
      required={isMissing(aes)}
      source={{ layerId: sourceId, aes }}
      onDrop={(c, src) => onDrop(aes, c, src)}
      onClear={() => onMap(aes, undefined)}
    />
  );

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
      <div data-tutorial-target="mappings">
        {labeledField("x", "X", "Bottom Axis")}
      </div>
      {labeledField("y", "Y", "Left Axis")}
      {(resolvedDraw === "ribbon" || resolvedDraw === "range") && (
        <>
          {labeledField("ymin", "Y min", "Lower bound")}
          {labeledField("ymax", "Y max", "Upper bound")}
        </>
      )}
      {colorSplit ? (
        <div>
          {labeledField("fill", "Fill color")}
          {onJoinColor && <JoinControl onJoin={onJoinColor} />}
          {labeledField("stroke", "Line color")}
        </div>
      ) : (
        <Field
          label="Color"
          open={openMappingAes === "color"}
          onToggleSettings={
            onToggleSettings ? () => onToggleSettings("color") : undefined
          }
        >
          <DropzoneWithSplit
            placeholder={undefined}
            value={mappings.color}
            required={false}
            source={{ layerId: sourceId, aes: "color" }}
            onDrop={(c, src) => onDrop("color", c, src)}
            onClear={() => onMap("color", undefined)}
            onSplit={onSplitColor}
          />
        </Field>
      )}
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

// Drag/drop source shape (mirrors the local interface in Dropzone.tsx so
// callers can pass through the existing onDrop signature).
interface DropSource {
  layerId: string;
  aes: Aes;
}

/** Wrapper around `Dropzone` that overlays a dimmed "Split" pill on the right
 *  edge of the dashed box. The pill brightens whenever the dropzone is
 *  hovered (drag-over OR mouse-over) and an instant-appear `<Tooltip>`
 *  explains the action. Drop semantics fall through to the inner `Dropzone`. */
function DropzoneWithSplit({
  placeholder,
  value,
  required,
  source,
  onDrop,
  onClear,
  onSplit,
}: {
  placeholder?: string;
  value?: string;
  required?: boolean;
  source: DropSource;
  onDrop: (col: string, src?: DropSource) => void;
  onClear: () => void;
  onSplit?: () => void;
}) {
  const [hot, setHot] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
    >
      <Dropzone
        placeholder={placeholder}
        value={value}
        required={required}
        source={source}
        onDrop={onDrop}
        onClear={onClear}
      />
      {onSplit && (
        <div
          className={[
            "pointer-events-none absolute inset-y-0 right-2 flex items-center transition-opacity",
            hot ? "opacity-100" : "opacity-40",
          ].join(" ")}
        >
          <Tooltip text="Split into separate Fill and Line colors">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSplit();
              }}
              className="pointer-events-auto rounded border border-stone-300 bg-white px-2 py-0.5 font-mono text-[11px] text-stone-600 hover:bg-stone-100 hover:text-stone-800"
            >
              Split
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

/** Centred "Join" pill flanked by two short vertical hairlines that visually
 *  link the Fill color and Line color rows when the Color view is split. The
 *  outer flex mirrors `Field`'s dropzone-row layout (flex-1 slot + w-10
 *  chevron-spacer) so the pill and hairlines sit centred on the dropzone
 *  column above/below, not on the wrapper centre. Clicking collapses the rows
 *  back into a single joined Color (fill wins; stroke is discarded). */
function JoinControl({ onJoin }: { onJoin: () => void }) {
  return (
    <div className="flex items-stretch gap-1">
      <div className="flex flex-1 flex-col items-center">
        <span aria-hidden className="h-2 w-px bg-stone-300" />
        <Tooltip text="Combine Fill and Line color (Line color reverts to Fill)">
          <button
            type="button"
            onClick={onJoin}
            className="rounded border border-stone-300 bg-white px-2 py-0.5 font-mono text-[11px] text-stone-600 hover:bg-stone-100 hover:text-stone-800"
          >
            Join
          </button>
        </Tooltip>
        <span aria-hidden className="h-2 w-px bg-stone-300" />
      </div>
      <div className="w-10" aria-hidden />
    </div>
  );
}
