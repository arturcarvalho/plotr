import { EyeIcon, EyeSlashIcon } from "./icons";

interface Props {
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onToggleDisabled: () => void;
}

export function CustomCard({
  open,
  disabled,
  onToggle,
  onRemove,
  onToggleDisabled,
}: Props) {
  return (
    <div className="group relative mb-1.5">
      <button
        type="button"
        onClick={onToggle}
        title="Custom ggsql"
        aria-label="Custom ggsql"
        className={[
          "flex h-10 w-10 items-center justify-center rounded transition-colors",
          open
            ? "bg-stone-300 text-stone-900 hover:bg-stone-400"
            : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100",
          disabled ? "opacity-50 grayscale" : "",
        ].join(" ")}
      >
        <PencilIcon />
      </button>
      <button
        type="button"
        onClick={onToggleDisabled}
        aria-label={disabled ? "Enable custom layer" : "Disable custom layer"}
        title={disabled ? "Enable custom layer" : "Disable custom layer"}
        className="pointer-events-none absolute -left-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-500 opacity-0 shadow-sm transition-opacity hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 group-hover:pointer-events-auto group-hover:opacity-100"
      >
        {disabled ? <EyeSlashIcon /> : <EyeIcon />}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove custom layer"
        title="Remove custom layer"
        className="pointer-events-none absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-stone-300 bg-white font-mono text-xs leading-none text-stone-500 opacity-0 shadow-sm transition-opacity hover:border-red-300 hover:bg-red-50 hover:text-red-700 group-hover:pointer-events-auto group-hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

// Filled single-color quill/pencil glyph for the Custom Layer.
function PencilIcon() {
  return (
    <svg
      width="18"
      height="21"
      viewBox="0 0 700 820"
      fill="currentColor"
      aria-hidden
    >
      <path d="M626 70q25 25 41 52t23 52t4 46t-17 36L389 544L288 646L0 696l51-287l101-102L440 19q14-14 36-17t47 4t52 23t51 41M259 602q-12-20-30-44t-43-48t-48-43t-44-30L76 542q21 15 42.5 36.5T154 621z" />
    </svg>
  );
}

