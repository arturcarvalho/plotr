import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Select, {
  components as RSComponents,
  type GroupBase,
  type MenuListProps,
  type OptionProps,
  type StylesConfig,
} from "react-select";
import {
  chartLabel,
  DRAW_TYPES,
  type HistogramClosed,
  type Kernel,
  type LayerSettings,
  type Orientation,
  type Position,
  type ProjectSettings,
  type SmoothMethod,
  type ViolinSide,
} from "../lib/buildQuery";
import { drawRequirements } from "../lib/autoChart";
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
const POINT_POSITIONS: Position[] = ["identity", "jitter"];
const ORIENTATIONS: Orientation[] = ["aligned", "transposed"];
const KERNELS: Kernel[] = [
  "gaussian",
  "epanechnikov",
  "triangular",
  "rectangular",
  "uniform",
  "biweight",
  "quartic",
  "cosine",
];
const VIOLIN_SIDES: ViolinSide[] = ["both", "left", "top", "right", "bottom"];
const HISTOGRAM_CLOSED: HistogramClosed[] = ["right", "left"];
const SMOOTH_METHODS: SmoothMethod[] = [
  "nw",
  "nadaraya-watson",
  "ols",
  "tls",
];

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
  const [hover, setHover] = useState<{ draw: string; rect: DOMRect } | null>(
    null,
  );

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col bg-app-chrome">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-r-lg border-y border-r border-stone-300 bg-white">
        <header className="flex h-[52px] items-center justify-end px-3">
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
                  aria-disabled={!enabled && !selected}
                  onClick={
                    enabled || selected
                      ? () => onChangeDraw(t)
                      : undefined
                  }
                  onMouseEnter={(e) =>
                    setHover({
                      draw: t,
                      rect: e.currentTarget.getBoundingClientRect(),
                    })
                  }
                  onMouseLeave={() =>
                    setHover((h) => (h?.draw === t ? null : h))
                  }
                  className={[
                    "flex h-12 w-12 items-center justify-center rounded transition-colors",
                    selected
                      ? "bg-stone-800 text-stone-100"
                      : enabled
                        ? "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
                        : "cursor-not-allowed border border-stone-200 bg-white text-stone-300",
                  ].join(" ")}
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
                  defaultLabel="0.9"
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
                  defaultLabel="stack"
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
            {effective === "point" && (
              <>
                <NumberSliderField
                  label="Linewidth"
                  value={settings.linewidth ?? null}
                  defaultLabel="1.0"
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, linewidth: v ?? undefined })
                  }
                />
                <RadioField
                  label="Position"
                  value={settings.position ?? null}
                  defaultLabel="identity"
                  options={POINT_POSITIONS}
                  onChange={(v) =>
                    onChangeSettings({
                      ...settings,
                      position: v ?? undefined,
                    })
                  }
                />
              </>
            )}
            {effective === "line" && (
              <>
                <NumberSliderField
                  label="Linewidth"
                  value={settings.linewidth ?? null}
                  defaultLabel="1.5"
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, linewidth: v ?? undefined })
                  }
                />
                <RadioField
                  label="Orientation"
                  value={settings.orientation ?? null}
                  defaultLabel="aligned"
                  options={ORIENTATIONS}
                  onChange={(v) =>
                    onChangeSettings({
                      ...settings,
                      orientation: v ?? undefined,
                    })
                  }
                />
              </>
            )}
            {effective === "tile" && (
              <>
                <NumberSliderField
                  label="Linewidth"
                  value={settings.linewidth ?? null}
                  defaultLabel="1.0"
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, linewidth: v ?? undefined })
                  }
                />
                <RadioField
                  label="Position"
                  value={settings.position ?? null}
                  defaultLabel="identity"
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
            {effective === "violin" && (
              <>
                <NumberSliderField
                  label="Linewidth"
                  value={settings.linewidth ?? null}
                  defaultLabel="1.0"
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, linewidth: v ?? undefined })
                  }
                />
                <RadioField
                  label="Position"
                  value={settings.position ?? null}
                  defaultLabel="dodge"
                  options={POSITIONS}
                  onChange={(v) =>
                    onChangeSettings({
                      ...settings,
                      position: v ?? undefined,
                    })
                  }
                />
                <NumberSliderField
                  label="Width"
                  value={settings.width ?? null}
                  defaultLabel="0.9"
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, width: v ?? undefined })
                  }
                />
                <NumberInputField
                  label="Bandwidth"
                  value={settings.bandwidth ?? null}
                  min={0}
                  step={0.05}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, bandwidth: v ?? undefined })
                  }
                />
                <NumberSliderField
                  label="Adjust"
                  value={settings.adjust ?? null}
                  defaultLabel="1.0"
                  min={0.1}
                  max={3}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, adjust: v ?? undefined })
                  }
                />
                <PreviewSelectField
                  label="Kernel"
                  value={settings.kernel ?? null}
                  defaultLabel="gaussian"
                  options={KERNELS}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, kernel: v ?? undefined })
                  }
                />
                <RadioField
                  label="Side"
                  value={settings.side ?? null}
                  defaultLabel="both"
                  options={VIOLIN_SIDES}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, side: v ?? undefined })
                  }
                />
                <NumberSliderField
                  label="Tails"
                  value={settings.tails ?? null}
                  defaultLabel="3.0"
                  min={0}
                  max={10}
                  step={0.5}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, tails: v ?? undefined })
                  }
                />
              </>
            )}
            {effective === "histogram" && (
              <HistogramBlock
                settings={settings}
                onChangeSettings={onChangeSettings}
              />
            )}
            {effective === "range" && (
              <>
                <NumberSliderField
                  label="Linewidth"
                  value={settings.linewidth ?? null}
                  defaultLabel="1.0"
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, linewidth: v ?? undefined })
                  }
                />
                <RadioField
                  label="Position"
                  value={settings.position ?? null}
                  defaultLabel="identity"
                  options={POSITIONS}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, position: v ?? undefined })
                  }
                />
                <NumberSliderField
                  label="Width"
                  value={settings.width ?? null}
                  defaultLabel="10.0"
                  min={0}
                  max={50}
                  step={0.5}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, width: v ?? undefined })
                  }
                />
              </>
            )}
            {effective === "ribbon" && (
              <>
                <NumberSliderField
                  label="Linewidth"
                  value={settings.linewidth ?? null}
                  defaultLabel="1.0"
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, linewidth: v ?? undefined })
                  }
                />
                <RadioField
                  label="Position"
                  value={settings.position ?? null}
                  defaultLabel="identity"
                  options={POSITIONS}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, position: v ?? undefined })
                  }
                />
              </>
            )}
            {effective === "smooth" && (
              <>
                <NumberSliderField
                  label="Linewidth"
                  value={settings.linewidth ?? null}
                  defaultLabel="2.0"
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, linewidth: v ?? undefined })
                  }
                />
                <RadioField
                  label="Position"
                  value={settings.position ?? null}
                  defaultLabel="identity"
                  options={POSITIONS}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, position: v ?? undefined })
                  }
                />
                <PreviewSelectField
                  label="Method"
                  value={settings.method ?? null}
                  defaultLabel="nw"
                  options={SMOOTH_METHODS}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, method: v ?? undefined })
                  }
                />
                <NumberInputField
                  label="Bandwidth"
                  value={settings.bandwidth ?? null}
                  min={0}
                  step={0.05}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, bandwidth: v ?? undefined })
                  }
                />
                <NumberSliderField
                  label="Adjust"
                  value={settings.adjust ?? null}
                  defaultLabel="1.0"
                  min={0.1}
                  max={3}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, adjust: v ?? undefined })
                  }
                />
                <PreviewSelectField
                  label="Kernel"
                  value={settings.kernel ?? null}
                  defaultLabel="gaussian"
                  options={KERNELS}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, kernel: v ?? undefined })
                  }
                />
              </>
            )}
            {effective === "area" && (
              <>
                <NumberSliderField
                  label="Linewidth"
                  value={settings.linewidth ?? null}
                  defaultLabel="1.0"
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, linewidth: v ?? undefined })
                  }
                />
                <RadioField
                  label="Position"
                  value={settings.position ?? null}
                  defaultLabel="stack"
                  options={POSITIONS}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, position: v ?? undefined })
                  }
                />
                <RadioField
                  label="Orientation"
                  value={settings.orientation ?? null}
                  defaultLabel="aligned"
                  options={ORIENTATIONS}
                  onChange={(v) =>
                    onChangeSettings({
                      ...settings,
                      orientation: v ?? undefined,
                    })
                  }
                />
              </>
            )}
            {effective === "density" && (
              <>
                <NumberSliderField
                  label="Linewidth"
                  value={settings.linewidth ?? null}
                  defaultLabel="1.0"
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, linewidth: v ?? undefined })
                  }
                />
                <RadioField
                  label="Position"
                  value={settings.position ?? null}
                  defaultLabel="identity"
                  options={POSITIONS}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, position: v ?? undefined })
                  }
                />
                <NumberInputField
                  label="Bandwidth"
                  value={settings.bandwidth ?? null}
                  min={0}
                  step={0.05}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, bandwidth: v ?? undefined })
                  }
                />
                <NumberSliderField
                  label="Adjust"
                  value={settings.adjust ?? null}
                  defaultLabel="1.0"
                  min={0.1}
                  max={3}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, adjust: v ?? undefined })
                  }
                />
                <PreviewSelectField
                  label="Kernel"
                  value={settings.kernel ?? null}
                  defaultLabel="gaussian"
                  options={KERNELS}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, kernel: v ?? undefined })
                  }
                />
              </>
            )}
            {effective === "boxplot" && (
              <>
                <NumberSliderField
                  label="Linewidth"
                  value={settings.linewidth ?? null}
                  defaultLabel="1.0"
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, linewidth: v ?? undefined })
                  }
                />
                <RadioField
                  label="Position"
                  value={settings.position ?? null}
                  defaultLabel="dodge"
                  options={POSITIONS}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, position: v ?? undefined })
                  }
                />
                <NumberSliderField
                  label="Width"
                  value={settings.width ?? null}
                  defaultLabel="0.9"
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, width: v ?? undefined })
                  }
                />
                <RadioField<"true" | "false">
                  label="Outliers"
                  value={
                    settings.outliers === undefined
                      ? null
                      : settings.outliers
                        ? "true"
                        : "false"
                  }
                  defaultLabel="true"
                  options={["true", "false"]}
                  onChange={(v) =>
                    onChangeSettings({
                      ...settings,
                      outliers: v === null ? undefined : v === "true",
                    })
                  }
                />
                <NumberSliderField
                  label="Coef"
                  value={settings.coef ?? null}
                  defaultLabel="1.5"
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, coef: v ?? undefined })
                  }
                />
              </>
            )}
            {effective === "rule" && (
              <>
                <NumberSliderField
                  label="Linewidth"
                  value={settings.linewidth ?? null}
                  defaultLabel="1.0"
                  min={0}
                  max={5}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, linewidth: v ?? undefined })
                  }
                />
                <NumberSliderField
                  label="Slope"
                  value={settings.slope ?? null}
                  defaultLabel="0"
                  min={-5}
                  max={5}
                  step={0.1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, slope: v ?? undefined })
                  }
                />
                <p className="font-mono text-[10px] text-stone-500">
                  Map exactly one of X / Y — ggsql validates the XOR.
                </p>
              </>
            )}
            {effective === "text" && (
              <>
                <RadioField
                  label="Position"
                  value={settings.position ?? null}
                  defaultLabel="identity"
                  options={POSITIONS}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, position: v ?? undefined })
                  }
                />
                <RadioField<"true" | "false">
                  label="Italic"
                  value={
                    settings.italic === undefined
                      ? null
                      : settings.italic
                        ? "true"
                        : "false"
                  }
                  defaultLabel="false"
                  options={["true", "false"]}
                  onChange={(v) =>
                    onChangeSettings({
                      ...settings,
                      italic: v === null ? undefined : v === "true",
                    })
                  }
                />
                <NumberSliderField
                  label="Hjust"
                  value={settings.hjust ?? null}
                  defaultLabel="0.5"
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, hjust: v ?? undefined })
                  }
                />
                <NumberSliderField
                  label="Vjust"
                  value={settings.vjust ?? null}
                  defaultLabel="0.5"
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, vjust: v ?? undefined })
                  }
                />
                <NumberSliderField
                  label="Rotation"
                  value={settings.rotation ?? null}
                  defaultLabel="0"
                  min={0}
                  max={360}
                  step={1}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, rotation: v ?? undefined })
                  }
                />
                <div className="space-y-1">
                  <TextInputField
                    label="Format"
                    value={settings.format ?? null}
                    placeholder="{:num %.2f}"
                    onChange={(v) =>
                      onChangeSettings({ ...settings, format: v ?? undefined })
                    }
                  />
                  <p className="font-mono text-[10px] text-stone-500">
                    Curly template: <code>{`{}`}</code>,{" "}
                    <code>{`{:UPPER}`}</code>, <code>{`{:num %.2f}`}</code>,{" "}
                    <code>{`{:time %Y-%m-%d}`}</code>.
                  </p>
                </div>
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
      {hover && <DrawTooltip draw={hover.draw} rect={hover.rect} />}
    </aside>
  );
}

const TOOLTIP_W = 360;

function DrawTooltip({ draw, rect }: { draw: string; rect: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>(() => ({
    left: rect.right + 8,
    top: rect.top,
  }));
  // After mount, measure and flip if it would overflow the right edge of the viewport.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth || TOOLTIP_W;
    const h = el.offsetHeight;
    let left = rect.right + 8;
    if (left + w > window.innerWidth - 4) {
      left = Math.max(4, rect.left - w - 8);
    }
    let top = rect.top;
    if (top + h > window.innerHeight - 4) {
      top = Math.max(4, window.innerHeight - h - 4);
    }
    setPos({ left, top });
  }, [rect, draw]);
  const reqs = drawRequirements(draw);
  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        maxWidth: TOOLTIP_W,
      }}
      className="pointer-events-none z-50 rounded-md bg-stone-900 px-3 py-2 text-xs text-stone-100 shadow-lg"
    >
      {reqs.length > 0 ? (
        <>
          <div className="mb-1 text-xs">
            For <span className="font-bold">{chartLabel(draw)}</span>, use:
          </div>
          <ul className="ml-4 list-disc space-y-0.5 font-mono text-[11px]">
            {reqs.map((r, i) => (
              <li key={i}>{r.parts.join(" + ")}</li>
            ))}
          </ul>
        </>
      ) : (
        <div>
          <span className="font-bold">{chartLabel(draw)}</span>
          <span className="text-stone-400"> — no mapping rules.</span>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PreviewSelectField — react-select dropdown that previews-on-keyboard.
// Same UX as the palette pickers: arrow-key navigation commits the focused
// option live; hover never commits. Hard-bagged refs keep effect deps stable
// so the option's useEffect doesn't loop.
// ────────────────────────────────────────────────────────────────────────────

interface PreviewOption {
  value: string;
  label: string;
  /** Marks the row that matches ggsql's default. Rendered with a "(default)"
   *  suffix so the user knows which choice will produce an explicit SETTING
   *  line in the query that mirrors ggsql's implicit fallback. */
  isDefault?: boolean;
}

interface PreviewBag {
  onPreview: (value: string) => void;
  isKeyboardRef: { current: boolean };
}

const PreviewContext = createContext<PreviewBag | undefined>(undefined);

const PreviewOptionRow = (props: OptionProps<PreviewOption>) => {
  const ctx = useContext(PreviewContext);
  useEffect(() => {
    if (props.isFocused && ctx?.isKeyboardRef.current) {
      ctx.onPreview(props.data.value);
    }
  }, [props.isFocused, props.data.value, ctx]);
  return (
    <RSComponents.Option {...props}>
      <span className="font-mono text-[11px] text-stone-700">
        {props.data.label}
        {props.data.isDefault ? (
          <span className="text-stone-400"> (default)</span>
        ) : null}
      </span>
    </RSComponents.Option>
  );
};

function makePreviewMenuList(isKeyboardRef: { current: boolean }) {
  return function MenuListWithMouseTrap(
    props: MenuListProps<PreviewOption>,
  ) {
    return (
      <RSComponents.MenuList
        {...props}
        innerProps={{
          ...props.innerProps,
          onMouseMove: () => {
            isKeyboardRef.current = false;
          },
        }}
      />
    );
  };
}

const previewSelectStyles: StylesConfig<
  PreviewOption,
  false,
  GroupBase<PreviewOption>
> = {
  control: (base, state) => ({
    ...base,
    minHeight: "32px",
    borderColor: state.isFocused ? "rgb(56 189 248)" : "rgb(214 211 209)",
    boxShadow: "none",
    borderRadius: "0.25rem",
    fontFamily: "ui-monospace, monospace",
    fontSize: "12px",
    "&:hover": { borderColor: "rgb(120 113 108)" },
  }),
  valueContainer: (base) => ({ ...base, padding: "2px 8px" }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: 4,
    color: "rgb(120 113 108)",
    "&:hover": { color: "rgb(68 64 60)" },
  }),
  menu: (base) => ({
    ...base,
    border: "1px solid rgb(214 211 209)",
    borderRadius: "0.25rem",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    fontFamily: "ui-monospace, monospace",
    fontSize: "11px",
    zIndex: 50,
  }),
  menuList: (base) => ({ ...base, padding: "4px" }),
  option: (base, state) => ({
    ...base,
    padding: "4px 8px",
    backgroundColor: state.isFocused
      ? "rgb(245 245 244)"
      : state.isSelected
        ? "rgb(231 229 228)"
        : "transparent",
    color: "rgb(41 37 36)",
    cursor: "pointer",
  }),
};

function PreviewSelectField<T extends string>({
  label,
  value,
  defaultLabel,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  defaultLabel?: string;
  options: readonly T[];
  onChange: (v: T | null) => void;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isKeyboardRef = useRef(false);
  const previewBag = useMemo<PreviewBag>(
    () => ({
      onPreview: (v: string) => onChangeRef.current(v as T),
      isKeyboardRef,
    }),
    [],
  );
  const MenuList = useMemo(
    () => makePreviewMenuList(isKeyboardRef),
    [],
  );
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      isKeyboardRef.current = true;
    }
  };
  const opts: PreviewOption[] = options.map((o) => ({
    value: o,
    label: o,
    isDefault: defaultLabel === o,
  }));
  // Plain <div> wrapper — a <label> here would forward clicks on Option rows
  // to react-select's hidden input, stealing the click before react-select's
  // own onChange handler fires (the menu would flicker without committing).
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-xs text-stone-700">
        <span>{label}</span>
        {value === null ? (
          defaultLabel ? (
            <span className="text-[10px] text-stone-500">
              default ({defaultLabel})
            </span>
          ) : null
        ) : (
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
      <PreviewContext.Provider value={previewBag}>
        <Select<PreviewOption, false, GroupBase<PreviewOption>>
          isClearable
          isSearchable
          placeholder="Pick a value…"
          options={opts}
          value={value ? (opts.find((o) => o.value === value) ?? null) : null}
          onChange={(opt) => onChange((opt?.value ?? null) as T | null)}
          onKeyDown={handleKeyDown}
          components={{
            Option: PreviewOptionRow,
            MenuList,
          }}
          styles={previewSelectStyles}
          classNamePrefix="preview-select"
        />
      </PreviewContext.Provider>
    </div>
  );
}

function NumberSliderField({
  label,
  value,
  defaultLabel,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number | null;
  /** ggsql's fallback for this setting (e.g. "1.5"). Shown next to "default"
   *  when the slider is unset. Omit when ggsql has no concrete fallback. */
  defaultLabel?: string;
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
          {value === null
            ? defaultLabel
              ? `default (${defaultLabel})`
              : "default"
            : value}
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

// Like NumberSliderField but a freeform number input — for data-dependent
// settings where ranges are unknowable up-front (e.g. histogram binwidth).
function NumberInputField({
  label,
  value,
  defaultLabel,
  step,
  min,
  onChange,
}: {
  label: string;
  value: number | null;
  defaultLabel?: string;
  step?: number;
  min?: number;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <span className="mb-1 flex items-center justify-between font-mono text-xs text-stone-700">
        <span>{label}</span>
        <span className="text-[10px] text-stone-500">
          {value === null
            ? defaultLabel
              ? `default (${defaultLabel})`
              : "default"
            : value}
        </span>
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value ?? ""}
          min={min}
          step={step}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? null : Number(v));
          }}
          className="flex-1 rounded border border-stone-300 px-2 py-0.5 font-mono text-xs text-stone-800 focus:border-sky-400 focus:outline-none"
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
    </div>
  );
}

// Freeform string input for settings whose value is data-shape-dependent
// (e.g. text.format = `%.2f`). Mirrors NumberInputField's chrome.
function TextInputField({
  label,
  value,
  defaultLabel,
  placeholder,
  onChange,
}: {
  label: string;
  value: string | null;
  defaultLabel?: string;
  placeholder?: string;
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <span className="mb-1 flex items-center justify-between font-mono text-xs text-stone-700">
        <span>{label}</span>
        <span className="text-[10px] text-stone-500">
          {value === null
            ? defaultLabel
              ? `default (${defaultLabel})`
              : "default"
            : "set"}
        </span>
      </span>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? null : v);
          }}
          className="flex-1 rounded border border-stone-300 px-2 py-0.5 font-mono text-xs text-stone-800 focus:border-sky-400 focus:outline-none"
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
    </div>
  );
}

function RadioField<T extends string>({
  label,
  value,
  defaultLabel,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  /** ggsql's fallback (e.g. "stack"). Shown next to "default" when unset. */
  defaultLabel?: string;
  options: T[];
  onChange: (v: T | null) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 flex w-full items-center justify-between font-mono text-xs text-stone-700">
        <span>{label}</span>
        {value === null ? (
          defaultLabel ? (
            <span className="text-[10px] text-stone-500">
              default ({defaultLabel})
            </span>
          ) : null
        ) : (
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

// Bin-by toggle: histogram's `bins` (count) and `binwidth` (width) are
// mutually exclusive in ggsql. UI surfaces a strategy radio above a single
// numeric input that drives whichever key is active; switching strategy
// clears the other key so only one ever emits.
function HistogramBlock({
  settings,
  onChangeSettings,
}: {
  settings: LayerSettings;
  onChangeSettings: (next: LayerSettings) => void;
}) {
  // Toggle state lives locally so picking "width" sticks even before the user
  // enters a binwidth value. Initial value derived from settings so URL-hash
  // hydration lands on the correct strategy on first paint.
  const [binStrategy, setBinStrategy] = useState<"count" | "width">(() =>
    settings.binwidth !== undefined ? "width" : "count",
  );
  const pickStrategy = (next: "count" | "width") => {
    if (next === binStrategy) return;
    setBinStrategy(next);
    if (next === "width") {
      onChangeSettings({ ...settings, bins: undefined });
    } else {
      onChangeSettings({ ...settings, binwidth: undefined });
    }
  };
  return (
    <>
      <RadioField
        label="Position"
        value={settings.position ?? null}
        defaultLabel="stack"
        options={POSITIONS}
        onChange={(v) =>
          onChangeSettings({ ...settings, position: v ?? undefined })
        }
      />
      <div>
        <div className="mb-1 font-mono text-xs text-stone-700">Bin by</div>
        <div className="flex flex-wrap gap-1">
          {(["count", "width"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => pickStrategy(opt)}
              className={[
                "cursor-pointer rounded border px-2 py-0.5 font-mono text-[11px] transition-colors",
                binStrategy === opt
                  ? "border-stone-800 bg-stone-800 text-stone-100"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100",
              ].join(" ")}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      {binStrategy === "count" ? (
        <NumberSliderField
          label="Bins"
          value={settings.bins ?? null}
          defaultLabel="30"
          min={1}
          max={200}
          step={1}
          onChange={(v) =>
            onChangeSettings({ ...settings, bins: v ?? undefined })
          }
        />
      ) : (
        <NumberInputField
          label="Binwidth"
          value={settings.binwidth ?? null}
          min={0}
          step={0.1}
          onChange={(v) =>
            onChangeSettings({ ...settings, binwidth: v ?? undefined })
          }
        />
      )}
      <RadioField
        label="Closed"
        value={settings.closed ?? null}
        defaultLabel="right"
        options={HISTOGRAM_CLOSED}
        onChange={(v) =>
          onChangeSettings({ ...settings, closed: v ?? undefined })
        }
      />
    </>
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
