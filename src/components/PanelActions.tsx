import {
  ChevronRightIcon,
  CodeIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
} from "./icons";

interface Props {
  /** Noun used in the button labels/tooltips: "layer" / "labels" / "custom layer". */
  kind: string;
  /** Current hidden state — flips the Hide/Show button. */
  disabled: boolean;
  onRemove: () => void;
  onToggleDisabled: () => void;
  /** Chart layers only: convert this layer to a custom ggsql layer. Disabled
   *  while the layer wouldn't emit a DRAW clause (nothing mapped yet). */
  convert?: { enabled: boolean; onConvert: () => void };
  /** Chart layers only: the settings chevron at the row's end. */
  onOpenSettings?: () => void;
}

const buttonBase =
  "flex h-7 w-7 items-center justify-center rounded text-stone-500 transition-colors";

/** Icon-action row in a layer panel's header: hide/show, convert-to-custom,
 *  remove, and the chart-settings chevron. Revealed by hovering the header
 *  (the panel's `group` element) or by keyboard focus on any of the buttons. */
export function PanelActions({
  kind,
  disabled,
  onRemove,
  onToggleDisabled,
  convert,
  onOpenSettings,
}: Props) {
  const hideLabel = `${disabled ? "Show" : "Hide"} ${kind}`;
  const removeLabel = `Remove ${kind}`;
  return (
    <div className="pointer-events-none flex items-center gap-1 opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleDisabled();
        }}
        aria-label={hideLabel}
        title={hideLabel}
        className={`${buttonBase} hover:bg-stone-200 hover:text-stone-800`}
      >
        {disabled ? <EyeSlashIcon /> : <EyeIcon />}
      </button>
      {convert && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            convert.onConvert();
          }}
          disabled={!convert.enabled}
          aria-label="Convert to custom layer"
          title={
            convert.enabled
              ? "Convert to custom layer"
              : "Needs a mapped variable"
          }
          className={`${buttonBase} hover:bg-stone-200 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-stone-500`}
        >
          <CodeIcon />
        </button>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={removeLabel}
        title={removeLabel}
        className={`${buttonBase} hover:bg-red-50 hover:text-red-700`}
      >
        <TrashIcon />
      </button>
      {onOpenSettings && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings();
          }}
          aria-label="Open chart settings"
          title="Open chart settings"
          className={`${buttonBase} hover:bg-stone-200 hover:text-stone-800`}
        >
          <ChevronRightIcon />
        </button>
      )}
    </div>
  );
}
