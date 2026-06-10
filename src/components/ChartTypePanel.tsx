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
  type Hjust,
  type HistogramClosed,
  type Kernel,
  type LayerSettings,
  type Orientation,
  type Position,
  type SmoothMethod,
  type ViolinSide,
  type Vjust,
} from "../lib/buildQuery";
import { drawRequirements } from "../lib/autoChart";
import { ChartIcon } from "./ChartIcon";
import { ClearButton } from "./ClearButton";
import { CloseIcon } from "./icons";

interface Props {
  resolvedDraw: string | null;
  compatibleDraws: string[];
  settings: LayerSettings;
  onChangeDraw: (draw: string) => void;
  onChangeSettings: (next: LayerSettings) => void;
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

// ────────────────────────────────────────────────────────────────────────────
// Per-geom defaults for cross-geom fields. Keep all defaultLabel values in one
// place so they're easy to audit against GGSQL_DEFAULTS.md.
// ────────────────────────────────────────────────────────────────────────────

const LINEWIDTH_DEFAULT_BY_GEOM: Record<string, string> = {
  point: "1.0",
  line: "1.5",
  tile: "1.0",
  violin: "1.0",
  boxplot: "1.0",
  density: "1.0",
  area: "1.0",
  smooth: "2.0",
  ribbon: "1.0",
  range: "1.0",
  rule: "1.0",
};

const POSITION_DEFAULT_BY_GEOM: Record<string, string> = {
  bar: "stack",
  point: "identity",
  tile: "identity",
  violin: "dodge",
  boxplot: "dodge",
  density: "identity",
  area: "stack",
  smooth: "identity",
  ribbon: "identity",
  range: "identity",
  text: "identity",
  histogram: "stack",
};

// Most geoms accept the full POSITIONS set; point is curated to the only two
// that make geometric sense.
const POSITION_OPTIONS_BY_GEOM: Record<string, Position[]> = {
  point: POINT_POSITIONS,
};

interface WidthConfig {
  defaultLabel: string;
  min: number;
  max: number;
  step: number;
}
const WIDTH_CONFIG_BY_GEOM: Record<string, WidthConfig> = {
  bar: { defaultLabel: "0.9", min: 0, max: 1, step: 0.05 },
  violin: { defaultLabel: "0.9", min: 0, max: 1, step: 0.05 },
  boxplot: { defaultLabel: "0.9", min: 0, max: 1, step: 0.05 },
  range: { defaultLabel: "10.0", min: 0, max: 50, step: 0.5 },
};

// ────────────────────────────────────────────────────────────────────────────
// Cross-geom field wrappers. Each one resolves per-geom defaults from the maps
// above so the per-geom blocks below stay one-liners.
// ────────────────────────────────────────────────────────────────────────────

interface FieldProps {
  geom: string;
  settings: LayerSettings;
  onChange: (next: LayerSettings) => void;
}

function LinewidthSlider({ geom, settings, onChange }: FieldProps) {
  return (
    <NumberSliderField
      label="Linewidth"
      value={settings.linewidth ?? null}
      defaultLabel={LINEWIDTH_DEFAULT_BY_GEOM[geom]}
      min={0}
      max={5}
      step={0.1}
      onChange={(v) => onChange({ ...settings, linewidth: v ?? undefined })}
    />
  );
}

function PositionRadio({ geom, settings, onChange }: FieldProps) {
  const options = POSITION_OPTIONS_BY_GEOM[geom] ?? POSITIONS;
  return (
    <RadioField
      label="Position"
      value={settings.position ?? null}
      defaultLabel={POSITION_DEFAULT_BY_GEOM[geom]}
      options={options}
      onChange={(v) => onChange({ ...settings, position: v ?? undefined })}
    />
  );
}

function WidthSlider({ geom, settings, onChange }: FieldProps) {
  const cfg = WIDTH_CONFIG_BY_GEOM[geom];
  if (!cfg) return null;
  return (
    <NumberSliderField
      label="Width"
      value={settings.width ?? null}
      defaultLabel={cfg.defaultLabel}
      min={cfg.min}
      max={cfg.max}
      step={cfg.step}
      onChange={(v) => onChange({ ...settings, width: v ?? undefined })}
    />
  );
}

function OrientationRadio({
  settings,
  onChange,
}: Omit<FieldProps, "geom">) {
  return (
    <RadioField
      label="Orientation"
      value={settings.orientation ?? null}
      defaultLabel="aligned"
      options={ORIENTATIONS}
      onChange={(v) => onChange({ ...settings, orientation: v ?? undefined })}
    />
  );
}

function BandwidthInput({
  settings,
  onChange,
}: Omit<FieldProps, "geom">) {
  return (
    <NumberInputField
      label="Bandwidth"
      value={settings.bandwidth ?? null}
      min={0}
      step={0.05}
      onChange={(v) => onChange({ ...settings, bandwidth: v ?? undefined })}
    />
  );
}

function AdjustSlider({
  settings,
  onChange,
}: Omit<FieldProps, "geom">) {
  return (
    <NumberSliderField
      label="Adjust"
      value={settings.adjust ?? null}
      defaultLabel="1.0"
      min={0.1}
      max={3}
      step={0.1}
      onChange={(v) => onChange({ ...settings, adjust: v ?? undefined })}
    />
  );
}

function KernelDropdown({
  settings,
  onChange,
}: Omit<FieldProps, "geom">) {
  return (
    <PreviewSelectField
      label="Kernel"
      value={settings.kernel ?? null}
      defaultLabel="gaussian"
      options={KERNELS}
      onChange={(v) => onChange({ ...settings, kernel: v ?? undefined })}
    />
  );
}

export function ChartTypePanel({
  resolvedDraw,
  compatibleDraws,
  settings,
  onChangeDraw,
  onChangeSettings,
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
                <WidthSlider geom="bar" settings={settings} onChange={onChangeSettings} />
                <PositionRadio geom="bar" settings={settings} onChange={onChangeSettings} />
              </>
            )}
            {effective === "point" && (
              <>
                <LinewidthSlider geom="point" settings={settings} onChange={onChangeSettings} />
                <PositionRadio geom="point" settings={settings} onChange={onChangeSettings} />
              </>
            )}
            {effective === "line" && (
              <>
                <LinewidthSlider geom="line" settings={settings} onChange={onChangeSettings} />
                <OrientationRadio settings={settings} onChange={onChangeSettings} />
              </>
            )}
            {effective === "tile" && (
              <>
                <LinewidthSlider geom="tile" settings={settings} onChange={onChangeSettings} />
                <PositionRadio geom="tile" settings={settings} onChange={onChangeSettings} />
              </>
            )}
            {effective === "violin" && (
              <>
                <LinewidthSlider geom="violin" settings={settings} onChange={onChangeSettings} />
                <PositionRadio geom="violin" settings={settings} onChange={onChangeSettings} />
                <WidthSlider geom="violin" settings={settings} onChange={onChangeSettings} />
                <BandwidthInput settings={settings} onChange={onChangeSettings} />
                <AdjustSlider settings={settings} onChange={onChangeSettings} />
                <KernelDropdown settings={settings} onChange={onChangeSettings} />
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
                <LinewidthSlider geom="range" settings={settings} onChange={onChangeSettings} />
                <PositionRadio geom="range" settings={settings} onChange={onChangeSettings} />
                <WidthSlider geom="range" settings={settings} onChange={onChangeSettings} />
              </>
            )}
            {effective === "ribbon" && (
              <>
                <LinewidthSlider geom="ribbon" settings={settings} onChange={onChangeSettings} />
                <PositionRadio geom="ribbon" settings={settings} onChange={onChangeSettings} />
              </>
            )}
            {effective === "smooth" && (
              <>
                <LinewidthSlider geom="smooth" settings={settings} onChange={onChangeSettings} />
                <PositionRadio geom="smooth" settings={settings} onChange={onChangeSettings} />
                <PreviewSelectField
                  label="Method"
                  value={settings.method ?? null}
                  defaultLabel="nw"
                  options={SMOOTH_METHODS}
                  onChange={(v) =>
                    onChangeSettings({ ...settings, method: v ?? undefined })
                  }
                />
                <BandwidthInput settings={settings} onChange={onChangeSettings} />
                <AdjustSlider settings={settings} onChange={onChangeSettings} />
                <KernelDropdown settings={settings} onChange={onChangeSettings} />
              </>
            )}
            {effective === "area" && (
              <>
                <LinewidthSlider geom="area" settings={settings} onChange={onChangeSettings} />
                <PositionRadio geom="area" settings={settings} onChange={onChangeSettings} />
                <OrientationRadio settings={settings} onChange={onChangeSettings} />
              </>
            )}
            {effective === "density" && (
              <>
                <LinewidthSlider geom="density" settings={settings} onChange={onChangeSettings} />
                <PositionRadio geom="density" settings={settings} onChange={onChangeSettings} />
                <BandwidthInput settings={settings} onChange={onChangeSettings} />
                <AdjustSlider settings={settings} onChange={onChangeSettings} />
                <KernelDropdown settings={settings} onChange={onChangeSettings} />
              </>
            )}
            {effective === "boxplot" && (
              <>
                <LinewidthSlider geom="boxplot" settings={settings} onChange={onChangeSettings} />
                <PositionRadio geom="boxplot" settings={settings} onChange={onChangeSettings} />
                <WidthSlider geom="boxplot" settings={settings} onChange={onChangeSettings} />
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
                <LinewidthSlider geom="rule" settings={settings} onChange={onChangeSettings} />
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
                <PositionRadio geom="text" settings={settings} onChange={onChangeSettings} />
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
                <div className="flex items-start gap-3">
                  <AnchorGrid
                    hjust={settings.hjust}
                    vjust={settings.vjust}
                    onChange={(h, v) =>
                      onChangeSettings({ ...settings, hjust: h, vjust: v })
                    }
                  />
                  <div className="flex-1">
                    <OffsetField
                      value={settings.offset ?? null}
                      onChange={(v) =>
                        onChangeSettings({ ...settings, offset: v ?? undefined })
                      }
                    />
                  </div>
                </div>
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
          </section>
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
          <ClearButton onClick={() => onChange(null)} />
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
          <ClearButton onClick={() => onChange(null)} />
        )}
      </div>
    </label>
  );
}

// Two number inputs binding independently to `{ x?, y? }`, stacked X-over-Y.
// A blank input stays blank — no phantom zero — and the ggsql emitter
// zero-fills only when one axis is set and the other isn't. × in the header
// clears both back to undefined (no `offset` setting emitted).
function OffsetField({
  value,
  onChange,
}: {
  value: { x?: number; y?: number } | null;
  onChange: (v: { x?: number; y?: number } | null) => void;
}) {
  const x = value?.x;
  const y = value?.y;
  const update = (nx: number | undefined, ny: number | undefined) => {
    if (nx === undefined && ny === undefined) {
      onChange(null);
      return;
    }
    const next: { x?: number; y?: number } = {};
    if (nx !== undefined) next.x = nx;
    if (ny !== undefined) next.y = ny;
    onChange(next);
  };
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-xs text-stone-700">
        <span>Offset</span>
        {value !== null ? (
          <ClearButton onClick={() => onChange(null)} />
        ) : (
          <span className="text-[10px] text-stone-500">default (none)</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label className="flex w-full items-center gap-1 font-mono text-[10px] text-stone-500">
          x
          <input
            type="number"
            value={x ?? ""}
            step={1}
            onChange={(e) => {
              const v = e.target.value;
              update(v === "" ? undefined : Number(v), y);
            }}
            className="w-full rounded border border-stone-300 px-2 py-0.5 font-mono text-xs text-stone-800 focus:border-sky-400 focus:outline-none"
          />
        </label>
        <label className="flex w-full items-center gap-1 font-mono text-[10px] text-stone-500">
          y
          <input
            type="number"
            value={y ?? ""}
            step={1}
            onChange={(e) => {
              const v = e.target.value;
              update(x, v === "" ? undefined : Number(v));
            }}
            className="w-full rounded border border-stone-300 px-2 py-0.5 font-mono text-xs text-stone-800 focus:border-sky-400 focus:outline-none"
          />
        </label>
      </div>
    </div>
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
          <ClearButton onClick={() => onChange(null)} />
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
          <ClearButton onClick={() => onChange(null)} />
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
          <ClearButton onClick={() => onChange(null)} />
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

// Single 3×3 dot-grid that writes both `hjust` and `vjust` from one click.
// Rows are vjust (top / middle / bottom); columns are hjust (left / centre /
// right). Selecting always sets both axes; × clears both back to undefined so
// ggsql falls back to its centre/middle defaults.
function AnchorGrid({
  hjust,
  vjust,
  onChange,
}: {
  hjust: Hjust | undefined;
  vjust: Vjust | undefined;
  onChange: (h: Hjust | undefined, v: Vjust | undefined) => void;
}) {
  const rows: Vjust[] = ["top", "middle", "bottom"];
  const cols: Hjust[] = ["left", "centre", "right"];
  const isSet = hjust !== undefined || vjust !== undefined;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-xs text-stone-700">
        <span>Anchor</span>
        {isSet ? (
          <ClearButton onClick={() => onChange(undefined, undefined)} />
        ) : (
          <span className="text-[10px] text-stone-500">
            default (centre, middle)
          </span>
        )}
      </div>
      <div className="inline-block rounded-md border border-stone-200 bg-stone-50 p-2">
        <div className="grid grid-cols-3 grid-rows-3 place-items-center gap-1">
          {rows.flatMap((v) =>
            cols.map((h) => {
              const selected = hjust === h && vjust === v;
              return (
                <button
                  key={`${h}-${v}`}
                  type="button"
                  onClick={() => onChange(h, v)}
                  className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-stone-100"
                  title={`hjust: ${h}, vjust: ${v}`}
                >
                  <span
                    className={
                      selected
                        ? "block h-2 w-2 rounded-full bg-stone-900"
                        : "block h-1.5 w-1.5 rounded-full bg-stone-300"
                    }
                  />
                </button>
              );
            }),
          )}
        </div>
      </div>
    </div>
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
  // When one of the bin keys is set, the strategy is unambiguous and tracks
  // settings every render — so switching to another histogram layer reflects
  // that layer's state. When both are unset the toggle would have no anchor,
  // so a sticky local choice keeps "width" picked even before a value is typed.
  const derived: "count" | "width" | null =
    settings.binwidth !== undefined
      ? "width"
      : settings.bins !== undefined
        ? "count"
        : null;
  const [stickyStrategy, setStickyStrategy] = useState<"count" | "width">(
    "count",
  );
  const binStrategy = derived ?? stickyStrategy;
  const pickStrategy = (next: "count" | "width") => {
    if (next === binStrategy) return;
    setStickyStrategy(next);
    if (next === "width") {
      onChangeSettings({ ...settings, bins: undefined });
    } else {
      onChangeSettings({ ...settings, binwidth: undefined });
    }
  };
  return (
    <>
      <PositionRadio geom="histogram" settings={settings} onChange={onChangeSettings} />
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

