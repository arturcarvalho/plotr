import {
  chartLabel,
  DRAW_TYPES,
  type LayerSettings,
  type Position,
  type ProjectSettings,
} from "../lib/buildQuery";
import { ChartIcon } from "./ChartIcon";

interface Props {
  resolvedDraw: string | null;
  compatibleDraws: string[];
  settings: LayerSettings;
  project: ProjectSettings;
  onChangeDraw: (draw: string) => void;
  onChangeSettings: (next: LayerSettings) => void;
  onChangeProject: (next: ProjectSettings) => void;
  onRemove?: () => void;
  onClose: () => void;
}

const POSITIONS: Position[] = ["identity", "stack", "dodge", "jitter"];

export function ChartTypePanel({
  resolvedDraw,
  compatibleDraws,
  settings,
  project,
  onChangeDraw,
  onChangeSettings,
  onChangeProject,
  onRemove,
  onClose,
}: Props) {
  const compatible = new Set(compatibleDraws);
  const effective = resolvedDraw ?? null;
  const title = resolvedDraw ? chartLabel(resolvedDraw) : "Chart";

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col bg-app-chrome">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-r-lg border-y border-r border-stone-300 bg-white">
        <header className="flex items-center justify-end px-3 py-1.5">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chart settings"
            title="Close"
            className="rounded p-0.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <div className="mx-auto flex w-[210px] flex-wrap justify-start gap-1.5">
            {DRAW_TYPES.map((t) => {
              const enabled = compatible.has(t);
              const selected = effective === t;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!enabled && !selected}
                  onClick={() => onChangeDraw(t)}
                  className={[
                    "flex h-12 w-12 items-center justify-center rounded transition-colors",
                    selected
                      ? "bg-stone-800 text-stone-100"
                      : enabled
                        ? "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
                        : "border border-stone-200 bg-stone-100 text-stone-300",
                  ].join(" ")}
                  title={enabled ? chartLabel(t) : `${chartLabel(t)} — n/a`}
                >
                  <ChartIcon draw={t} className="h-8 w-8" />
                </button>
              );
            })}
          </div>

          <section className="-mx-3 space-y-2 border-t border-stone-200 px-3 pt-3">
            <div className="font-mono text-[10px] uppercase tracking-wide text-stone-500">
              {title}
            </div>
            {effective === "bar" && (
              <>
                <NumberSliderField
                  label="Width"
                  value={settings.width ?? null}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, width: v ?? undefined })
                  }
                />
                <RadioField
                  label="Position"
                  value={settings.position ?? null}
                  options={POSITIONS}
                  onChange={(v) =>
                    onChangeSettings({
                      ...settings,
                      position: v ?? undefined,
                    })
                  }
                />
              </>
            )}
            <div>
              <span className="mb-1 block font-mono text-xs text-stone-700">
                Aspect ratio
              </span>
              <p className="rounded border border-amber-300 bg-amber-50 px-2 py-1 font-mono text-xs text-amber-800">
                Aspect ratio not available yet
              </p>
            </div>
            <label className="flex items-center gap-2 font-mono text-xs text-stone-700">
              <input
                type="checkbox"
                checked={project.clip ?? true}
                onChange={(e) =>
                  onChangeProject({
                    ...project,
                    clip: e.target.checked ? undefined : false,
                  })
                }
              />
              Clip data outside axes
            </label>
          </section>

          {onRemove && (
            <section className="border-t border-stone-200 pt-3">
              <button
                type="button"
                onClick={onRemove}
                className="w-full rounded border border-stone-300 bg-white px-2 py-1 font-mono text-xs text-stone-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
              >
                Remove layer
              </button>
            </section>
          )}
        </div>
      </div>
    </aside>
  );
}

function NumberSliderField({
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
      <span className="mb-1 flex items-center justify-between font-mono text-xs text-stone-700">
        <span>{label}</span>
        <span className="text-[10px] text-stone-500">
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
            className="rounded px-1 font-mono text-[10px] text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            title="Reset to default"
          >
            ×
          </button>
        )}
      </div>
    </label>
  );
}

function RadioField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: T[];
  onChange: (v: T | null) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 flex w-full items-center justify-between font-mono text-xs text-stone-700">
        <span>{label}</span>
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded px-1 font-mono text-[10px] text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            title="Reset to default"
          >
            ×
          </button>
        )}
      </legend>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <label
            key={opt}
            className={[
              "cursor-pointer rounded border px-2 py-0.5 font-mono text-[11px] transition-colors",
              value === opt
                ? "border-stone-800 bg-stone-800 text-stone-100"
                : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100",
            ].join(" ")}
          >
            <input
              type="radio"
              name={label}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="sr-only"
            />
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CloseIcon() {
  return (
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
  );
}
