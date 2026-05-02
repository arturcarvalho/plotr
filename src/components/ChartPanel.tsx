import {
  AUTO,
  DRAW_TYPES,
  type LayerSettings,
  type Position,
  type ProjectSettings,
} from "../lib/buildQuery";

interface Props {
  draw: string;
  resolvedDraw: string | null;
  compatibleDraws: string[];
  settings: LayerSettings;
  project: ProjectSettings;
  onChangeDraw: (draw: string) => void;
  onChangeSettings: (next: LayerSettings) => void;
  onChangeProject: (next: ProjectSettings) => void;
  onClose: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const POSITIONS: Position[] = ["identity", "stack", "dodge", "jitter"];

export function ChartPanel({
  draw,
  resolvedDraw,
  compatibleDraws,
  settings,
  project,
  onChangeDraw,
  onChangeSettings,
  onChangeProject,
  onClose,
}: Props) {
  const compatible = new Set(compatibleDraws);
  const effective = resolvedDraw ?? null;

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col bg-slate-50 p-1">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
            Chart
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chart panel"
            title="Close"
            className="rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <button
            type="button"
            onClick={() => onChangeDraw(AUTO)}
            className={[
              "w-full rounded px-3 py-1.5 font-mono text-xs transition-colors",
              draw === AUTO
                ? "bg-slate-800 text-slate-100"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
            ].join(" ")}
          >
            Auto{effective && draw === AUTO ? `: ${cap(effective)}` : ""}
          </button>

          <div className="grid grid-cols-3 gap-1.5">
            {DRAW_TYPES.map((t) => {
              const enabled = compatible.has(t);
              const selected = draw === t;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!enabled && !selected}
                  onClick={() => onChangeDraw(t)}
                  className={[
                    "rounded px-1.5 py-1 font-mono text-[11px] transition-colors",
                    selected
                      ? "bg-slate-800 text-slate-100"
                      : enabled
                        ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        : "border border-slate-200 bg-slate-50 text-slate-300",
                  ].join(" ")}
                  title={enabled ? cap(t) : `${cap(t)} — n/a`}
                >
                  {cap(t)}
                </button>
              );
            })}
          </div>

          {effective === "bar" && (
            <section className="space-y-2 border-t border-slate-200 pt-3">
              <div className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
                Bar
              </div>
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
            </section>
          )}

          <section className="space-y-2 border-t border-slate-200 pt-3">
            <div className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
              Plot
            </div>
            <label className="block">
              <span className="mb-1 block font-mono text-xs text-slate-700">
                Aspect ratio
              </span>
              <input
                type="number"
                step="0.1"
                min={0}
                value={project.ratio ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onChangeProject({
                    ...project,
                    ratio:
                      v === "" || Number.isNaN(Number(v))
                        ? undefined
                        : Number(v),
                  });
                }}
                placeholder="default"
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-800 focus:border-sky-400 focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 font-mono text-xs text-slate-700">
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
      <legend className="mb-1 flex w-full items-center justify-between font-mono text-xs text-slate-700">
        <span>{label}</span>
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
      </legend>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <label
            key={opt}
            className={[
              "cursor-pointer rounded border px-2 py-0.5 font-mono text-[11px] transition-colors",
              value === opt
                ? "border-slate-800 bg-slate-800 text-slate-100"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
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
