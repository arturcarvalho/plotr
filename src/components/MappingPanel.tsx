import type { Aes, LayerSettings } from "../lib/buildQuery";

interface Props {
  aes: Aes;
  settings: LayerSettings;
  onChangeSettings: (next: LayerSettings) => void;
  onClose: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const SWATCHES = [
  "red",
  "blue",
  "green",
  "orange",
  "purple",
  "yellow",
  "black",
  "gray",
  "brown",
  "white",
];

export function MappingPanel({
  aes,
  settings,
  onChangeSettings,
  onClose,
}: Props) {
  const aesLabel =
    aes === "color"
      ? "Colour"
      : aes === "opacity"
        ? "Opacity"
        : aes === "facet_col"
          ? "Top axis"
          : aes === "facet_row"
            ? "Right axis"
            : cap(aes);

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col bg-slate-50 p-1">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
            {aesLabel}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${aesLabel}`}
            title="Close"
            className="rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {aes === "color" && (
            <ColorField
              value={settings.color ?? null}
              onChange={(v) =>
                onChangeSettings({ ...settings, color: v ?? undefined })
              }
            />
          )}
          {aes === "opacity" && (
            <NumberSlider
              label="Fixed opacity"
              value={settings.opacity ?? null}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) =>
                onChangeSettings({ ...settings, opacity: v ?? undefined })
              }
            />
          )}
          {aes === "size" && (
            <NumberSlider
              label="Fixed size"
              value={settings.size ?? null}
              min={1}
              max={10}
              step={0.5}
              onChange={(v) =>
                onChangeSettings({ ...settings, size: v ?? undefined })
              }
            />
          )}
          {(aes === "x" ||
            aes === "y" ||
            aes === "facet_col" ||
            aes === "facet_row") && (
            <p className="font-mono text-xs text-slate-500">
              No settings yet for this aesthetic.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

function ColorField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between font-mono text-xs text-slate-700">
        <span>Fixed colour</span>
        <span className="font-mono text-[10px] text-slate-500">
          {value ?? "default"}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={c}
            title={c}
            className={[
              "h-7 w-full rounded border-2 transition-shadow",
              value === c ? "border-slate-800" : "border-slate-200",
            ].join(" ")}
            style={{ background: c }}
          />
        ))}
      </div>
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono text-[11px] text-slate-600 hover:bg-slate-100"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function NumberSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  step: number;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between font-mono text-xs text-slate-700">
        <span>{label}</span>
        <span className="text-[10px] text-slate-500">
          {value === null ? "default" : value}
        </span>
      </span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          className="flex-1"
        />
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded px-1 font-mono text-[10px] text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            title="Reset to default"
          >
            ×
          </button>
        )}
      </div>
    </label>
  );
}
