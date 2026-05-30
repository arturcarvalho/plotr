import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Select, {
  components as RSComponents,
  type GroupBase,
  type MenuListProps,
  type OptionProps,
  type SingleValueProps,
  type StylesConfig,
} from "react-select";
import type { Aes, LayerSettings } from "../lib/buildQuery";
import {
  CONTINUOUS_PALETTES,
  DEFAULT_CONTINUOUS,
  DEFAULT_DISCRETE,
  DISCRETE_PALETTES,
  gradientCss,
  type ContinuousCategory,
} from "../lib/palettes";

// Bag carries both the (stable, ref-backed) preview callback and a mutable
// flag that tells PaletteOptionRow whether the current focus change came from
// the keyboard. Without the flag, hovering rows would commit the palette; with
// it, only ArrowUp/ArrowDown nav previews.
interface PalettePreviewBag {
  onPreview: (value: string) => void;
  isKeyboardRef: { current: boolean };
}
const PalettePreviewContext = createContext<PalettePreviewBag | undefined>(
  undefined,
);

export type MappingKind = "fixed" | "discrete" | "continuous";

interface Props {
  aes: Aes;
  settings: LayerSettings;
  mappingKind: MappingKind;
  onChangeSettings: (next: LayerSettings) => void;
  onClose: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const GGSQL10 =
  DISCRETE_PALETTES.find((p) => p.name === "ggsql10")?.colors ?? [];

const CONT_CATEGORY_LABEL: Record<ContinuousCategory, string> = {
  sequential: "Sequential",
  diverging: "Diverging",
  multi: "Multi-sequential",
  cyclic: "Cyclic",
};

// ────────────────────────────────────────────────────────────────────────────
// react-select palette picker
// ────────────────────────────────────────────────────────────────────────────

interface PaletteOption {
  value: string;
  label: string;
  swatchCss: string;
  isDefault?: boolean;
}

function discreteStripCss(colors: string[]): string {
  if (colors.length === 0) return "transparent";
  return `linear-gradient(to right, ${colors
    .map(
      (c, i) =>
        `${c} ${(i * 100) / colors.length}% ${((i + 1) * 100) / colors.length}%`,
    )
    .join(", ")})`;
}

const DISCRETE_OPTIONS: PaletteOption[] = DISCRETE_PALETTES.map((p) => ({
  value: p.name,
  label: p.name,
  swatchCss: discreteStripCss(p.colors),
  isDefault: p.name === DEFAULT_DISCRETE,
}));

const CONTINUOUS_GROUPS: GroupBase<PaletteOption>[] = (
  ["sequential", "diverging", "multi", "cyclic"] as const
).map((cat) => ({
  label: CONT_CATEGORY_LABEL[cat],
  options: CONTINUOUS_PALETTES.filter((p) => p.category === cat).map((p) => ({
    value: p.name,
    label: p.name,
    swatchCss: gradientCss(p.stops),
    isDefault: p.name === DEFAULT_CONTINUOUS,
  })),
}));

const PaletteOptionRow = (props: OptionProps<PaletteOption>) => {
  const ctx = useContext(PalettePreviewContext);
  // ctx identity is stable (memoised in the Tab with empty deps), so
  // including it in deps does not retrigger this effect.
  useEffect(() => {
    if (props.isFocused && ctx?.isKeyboardRef.current) {
      ctx.onPreview(props.data.value);
    }
  }, [props.isFocused, props.data.value, ctx]);
  return (
    <RSComponents.Option {...props}>
      <div className="flex items-center gap-2">
        <div
          className="h-4 flex-1 rounded"
          style={{ background: props.data.swatchCss }}
        />
        <span className="font-mono text-[11px] text-stone-700">
          {props.data.label}
          {props.data.isDefault ? " (default)" : ""}
        </span>
      </div>
    </RSComponents.Option>
  );
};

// Resets the keyboard flag whenever the pointer moves inside the menu list.
// After a mouse-move, hovering rows no longer fire the preview effect.
function makeMenuList(isKeyboardRef: { current: boolean }) {
  return function MenuListWithMouseTrap(props: MenuListProps<PaletteOption>) {
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

// Provides a stable context bag + MenuList + onKeyDown so the consuming
// Select can preview-on-keyboard without leaking new function identities
// each render (which used to cause an infinite update loop in PaletteOptionRow).
function usePalettePreview(onChange: (v: string | null) => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isKeyboardRef = useRef(false);
  const previewBag = useMemo<PalettePreviewBag>(
    () => ({
      onPreview: (v: string) => onChangeRef.current(v),
      isKeyboardRef,
    }),
    [],
  );
  const MenuList = useMemo(() => makeMenuList(isKeyboardRef), []);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      isKeyboardRef.current = true;
    }
  };
  return { previewBag, MenuList, handleKeyDown };
}

// Name-only: the gradient is rendered above the dropdown by PaletteStatusLine,
// so the collapsed control stays text-first and the swatch shows on screen once.
const PaletteSingleValue = (props: SingleValueProps<PaletteOption>) => (
  <RSComponents.SingleValue {...props}>
    <span className="font-mono text-[11px] text-stone-700">
      {props.data.label}
    </span>
  </RSComponents.SingleValue>
);

const paletteSelectStyles: StylesConfig<
  PaletteOption,
  false,
  GroupBase<PaletteOption>
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
  groupHeading: (base) => ({
    ...base,
    fontFamily: "ui-monospace, monospace",
    fontSize: "10px",
    color: "rgb(120 113 108)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "8px 8px 4px",
  }),
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

export function MappingPanel({
  aes,
  settings,
  mappingKind,
  onChangeSettings,
  onClose,
}: Props) {
  const aesLabel =
    aes === "facet_col"
      ? "Top axis"
      : aes === "facet_row"
        ? "Right axis"
        : aes === "fill"
          ? "Fill color"
          : aes === "stroke"
            ? "Line color"
            : cap(aes);

  const isColor = aes === "fill" || aes === "stroke";

  // Tab state lives here so the TabStrip can be anchored at the bottom of the
  // card while the active tab body scrolls in the middle region.
  const [tab, setTab] = useState<MappingKind>(mappingKind);
  useEffect(() => {
    if (isColor) setTab(mappingKind);
  }, [mappingKind, isColor]);

  let fixedSet = false;
  let discreteSet = false;
  let continuousSet = false;
  if (isColor) {
    const fixedKey = aes === "fill" ? "fill" : "stroke";
    const noKey = aes === "fill" ? "noFill" : "noStroke";
    const discreteKey =
      aes === "fill" ? "fillPaletteDiscrete" : "strokePaletteDiscrete";
    const continuousKey =
      aes === "fill" ? "fillPaletteContinuous" : "strokePaletteContinuous";
    fixedSet = !!settings[fixedKey] || !!settings[noKey];
    discreteSet = !!settings[discreteKey];
    continuousSet = !!settings[continuousKey];
  }

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col bg-app-chrome">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-r-lg border-y border-r border-stone-300 bg-white">
        <header className="flex h-[52px] items-center justify-between border-b border-stone-200 px-3">
          <span className="font-mono text-[10px] uppercase tracking-wide text-stone-500">
            {aesLabel}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${aesLabel}`}
            title="Close"
            className="rounded p-0.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isColor && (
            <ColorAestheticPanel
              aes={aes}
              tab={tab}
              settings={settings}
              onChangeSettings={onChangeSettings}
            />
          )}
          {aes === "opacity" && (
            <div className="space-y-3 p-3">
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
            </div>
          )}
          {aes === "size" && (
            <div className="space-y-3 p-3">
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
            </div>
          )}
          {(aes === "x" || aes === "y") && (
            <div className="space-y-3 p-3">
              <AxisBreaksField
                aes={aes}
                value={
                  (aes === "x" ? settings.xBreaks : settings.yBreaks) ?? ""
                }
                onChange={(v) => {
                  const next = { ...settings };
                  if (v) next[aes === "x" ? "xBreaks" : "yBreaks"] = v;
                  else delete next[aes === "x" ? "xBreaks" : "yBreaks"];
                  onChangeSettings(next);
                }}
              />
              <AxisFormatField
                aes={aes}
                value={
                  (aes === "x" ? settings.xFormat : settings.yFormat) ?? ""
                }
                onChange={(v) => {
                  const next = { ...settings };
                  if (v) next[aes === "x" ? "xFormat" : "yFormat"] = v;
                  else delete next[aes === "x" ? "xFormat" : "yFormat"];
                  onChangeSettings(next);
                }}
              />
            </div>
          )}
          {(aes === "facet_col" || aes === "facet_row") && (
            <p className="p-3 font-mono text-xs text-stone-500">
              No settings yet for this aesthetic.
            </p>
          )}
        </div>

        {isColor && (
          <TabStrip
            tab={tab}
            onChange={setTab}
            modified={{
              fixed: fixedSet,
              discrete: discreteSet,
              continuous: continuousSet,
            }}
          />
        )}
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Three-tab panel for `fill` / `stroke`
// ────────────────────────────────────────────────────────────────────────────

function ColorAestheticPanel({
  aes,
  tab,
  settings,
  onChangeSettings,
}: {
  aes: "fill" | "stroke";
  tab: MappingKind;
  settings: LayerSettings;
  onChangeSettings: (next: LayerSettings) => void;
}) {
  const discreteKey =
    aes === "fill" ? "fillPaletteDiscrete" : "strokePaletteDiscrete";
  const continuousKey =
    aes === "fill" ? "fillPaletteContinuous" : "strokePaletteContinuous";

  return (
    <div className="flex flex-col">
      {tab === "fixed" && (
        <FixedTab
          aes={aes}
          settings={settings}
          onChangeSettings={onChangeSettings}
        />
      )}
      {tab === "discrete" && (
        <DiscreteTab
          value={settings[discreteKey] ?? null}
          onChange={(v) =>
            onChangeSettings({ ...settings, [discreteKey]: v ?? undefined })
          }
        />
      )}
      {tab === "continuous" && (
        <ContinuousTab
          value={settings[continuousKey] ?? null}
          onChange={(v) =>
            onChangeSettings({ ...settings, [continuousKey]: v ?? undefined })
          }
        />
      )}
    </div>
  );
}

function TabStrip({
  tab,
  onChange,
  modified,
}: {
  tab: MappingKind;
  onChange: (t: MappingKind) => void;
  modified: { fixed: boolean; discrete: boolean; continuous: boolean };
}) {
  const dot = (active: boolean, isModified: boolean) =>
    isModified
      ? "bg-sky-500 group-hover:bg-sky-700"
      : active
        ? "bg-stone-700 group-hover:bg-stone-900"
        : "bg-stone-300 group-hover:bg-stone-500";
  return (
    <div className="flex shrink-0 items-center justify-center border-t border-stone-200 bg-white">
      <TabDot
        title="Settings"
        align="end"
        active={tab === "fixed"}
        cls={dot(tab === "fixed", modified.fixed)}
        onClick={() => onChange("fixed")}
      />
      <TabDot
        title="Palette (discrete)"
        align="center"
        active={tab === "discrete"}
        cls={dot(tab === "discrete", modified.discrete)}
        onClick={() => onChange("discrete")}
      />
      <TabDot
        title="Palette (Continuous)"
        align="start"
        active={tab === "continuous"}
        cls={dot(tab === "continuous", modified.continuous)}
        onClick={() => onChange("continuous")}
      />
    </div>
  );
}

function TabDot({
  title,
  align,
  active,
  cls,
  onClick,
}: {
  title: string;
  align: "start" | "center" | "end";
  active: boolean;
  cls: string;
  onClick: () => void;
}) {
  const justify =
    align === "start"
      ? "justify-start pl-2"
      : align === "end"
        ? "justify-end pr-2"
        : "justify-center";
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={`group flex h-7 w-14 items-center ${justify}`}
    >
      <span
        className={[
          "h-3 w-3 rounded-full ring-offset-1 transition-colors",
          active ? "ring-1 ring-stone-700" : "",
          cls,
        ].join(" ")}
      />
    </button>
  );
}

function FixedTab({
  aes,
  settings,
  onChangeSettings,
}: {
  aes: "fill" | "stroke";
  settings: LayerSettings;
  onChangeSettings: (next: LayerSettings) => void;
}) {
  const fixedKey = aes === "fill" ? "fill" : "stroke";
  const noKey = aes === "fill" ? "noFill" : "noStroke";
  const value = settings[fixedKey] ?? null;
  const noValue = !!settings[noKey];
  const setValue = (v: string | null) =>
    onChangeSettings({ ...settings, [fixedKey]: v ?? undefined });
  const setNo = (v: boolean) =>
    onChangeSettings({ ...settings, [noKey]: v || undefined });
  const clearAll = () =>
    onChangeSettings({
      ...settings,
      [fixedKey]: undefined,
      [noKey]: undefined,
    });

  return (
    <div className="space-y-3 p-3">
      <div className="font-mono text-sm font-semibold text-stone-800">
        Settings
      </div>
      <p className="font-mono text-[11px] text-stone-500">
        Applied when no variable is mapped.
      </p>
      <div className="grid grid-cols-5 gap-1.5">
        {GGSQL10.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setValue(c)}
            aria-label={c}
            title={c}
            className={[
              "h-7 w-full rounded border-2 transition-shadow",
              value === c ? "border-stone-800" : "border-stone-200",
            ].join(" ")}
            style={{ background: c }}
          />
        ))}
      </div>
      <CustomColorField value={value} onChange={setValue} />
      <ToggleField
        label={aes === "fill" ? "No fill color" : "No line color"}
        checked={noValue}
        onChange={setNo}
      />
      {(value !== null || noValue) && <ClearButton onClick={clearAll} />}
    </div>
  );
}

// Shows the palette actually rendering above the dropdown: gradient swatch +
// name. Suffix "(default)" indicates ggsql's built-in fallback is active (no
// user pick); the chart will follow whatever ggsql's default is at runtime.
function PaletteStatusLine({
  value,
  defaultName,
  kind,
}: {
  value: string | null;
  defaultName: string;
  kind: "discrete" | "continuous";
}) {
  const effective = value ?? defaultName;
  const isDefault = value === null;
  let swatchCss = "transparent";
  if (kind === "discrete") {
    const p = DISCRETE_PALETTES.find((pp) => pp.name === effective);
    if (p) swatchCss = discreteStripCss(p.colors);
  } else {
    const p = CONTINUOUS_PALETTES.find((pp) => pp.name === effective);
    if (p) swatchCss = gradientCss(p.stops);
  }
  return (
    <div className="space-y-1">
      <div className="h-4 rounded" style={{ background: swatchCss }} />
      <div className="font-mono text-[11px] text-stone-700">
        {effective}
        {isDefault && <span className="text-stone-400"> (default)</span>}
      </div>
    </div>
  );
}

function DiscreteTab({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-3 p-3">
      <div className="font-mono text-sm font-semibold text-stone-800">
        Palette (discrete)
      </div>
      <PaletteStatusLine
        value={value}
        defaultName={DEFAULT_DISCRETE}
        kind="discrete"
      />
      <DiscreteSelect value={value} onChange={onChange} />
      {value !== null && <ClearButton onClick={() => onChange(null)} />}
    </div>
  );
}

function DiscreteSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const { previewBag, MenuList, handleKeyDown } = usePalettePreview(onChange);
  return (
    <PalettePreviewContext.Provider value={previewBag}>
      <Select<PaletteOption, false, GroupBase<PaletteOption>>
        isClearable
        isSearchable
        placeholder="Pick a palette…"
        options={DISCRETE_OPTIONS}
        value={value ? (DISCRETE_OPTIONS.find((o) => o.value === value) ?? null) : null}
        onChange={(opt) => onChange(opt?.value ?? null)}
        onKeyDown={handleKeyDown}
        components={{
          Option: PaletteOptionRow,
          MenuList,
          SingleValue: PaletteSingleValue,
        }}
        styles={paletteSelectStyles}
        classNamePrefix="palette-select"
      />
    </PalettePreviewContext.Provider>
  );
}

function ContinuousTab({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-3 p-3">
      <div className="font-mono text-sm font-semibold text-stone-800">
        Palette (Continuous)
      </div>
      <PaletteStatusLine
        value={value}
        defaultName={DEFAULT_CONTINUOUS}
        kind="continuous"
      />
      <ContinuousSelect value={value} onChange={onChange} />
      {value !== null && <ClearButton onClick={() => onChange(null)} />}
    </div>
  );
}

function ContinuousSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const { previewBag, MenuList, handleKeyDown } = usePalettePreview(onChange);
  const flat = CONTINUOUS_GROUPS.flatMap((g) => g.options);
  return (
    <PalettePreviewContext.Provider value={previewBag}>
      <Select<PaletteOption, false, GroupBase<PaletteOption>>
        isClearable
        isSearchable
        placeholder="Pick a palette…"
        options={CONTINUOUS_GROUPS}
        value={value ? (flat.find((o) => o.value === value) ?? null) : null}
        onChange={(opt) => onChange(opt?.value ?? null)}
        onKeyDown={handleKeyDown}
        components={{
          Option: PaletteOptionRow,
          MenuList,
          SingleValue: PaletteSingleValue,
        }}
        styles={paletteSelectStyles}
        classNamePrefix="palette-select"
      />
    </PalettePreviewContext.Provider>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ────────────────────────────────────────────────────────────────────────────

function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded border border-stone-300 bg-white px-2 py-1 font-mono text-[11px] text-stone-600 hover:bg-stone-100"
    >
      Clear
    </button>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 font-mono text-xs text-stone-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function CustomColorField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  // The native <input type="color"> only accepts #rrggbb. The text input
  // accepts any CSS-compatible string (named, hex, rgb(), oklab(), …).
  const isHex = !!value && /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="flex items-stretch gap-2">
      <input
        type="color"
        value={isHex ? (value as string) : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 cursor-pointer rounded border border-stone-300"
        aria-label="Pick a custom colour"
      />
      <input
        type="text"
        placeholder="#hex / name / rgb(…)"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="flex-1 rounded border border-stone-300 bg-white px-2 py-1 font-mono text-xs text-stone-800 focus:border-sky-400 focus:outline-none"
      />
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

/** Per-axis break values. Emits `SCALE x SETTING breaks => (<values>)` (or `y`)
 *  to limit the visible axis ticks. Free-form passthrough — the user types the
 *  comma-separated values, plotr wraps them in parens; ggsql validates. Empty
 *  input clears the field; the breaks subclause is then omitted. */
function AxisBreaksField({
  aes,
  value,
  onChange,
}: {
  aes: "x" | "y";
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block">
        <span className="mb-1 flex items-center justify-between font-mono text-xs text-stone-700">
          <span>Breaks ({aes})</span>
          <span className="text-[10px] text-stone-500">
            {value.trim() ? "set" : "off"}
          </span>
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="2000, 2010"
          spellCheck={false}
          className="w-full rounded border border-stone-300 bg-white px-2 py-1 font-mono text-xs text-stone-800 focus:border-sky-400 focus:outline-none"
        />
      </label>
      <p className="mt-1 font-mono text-[10px] leading-relaxed text-stone-500">
        Limit visible ticks to these values, comma-separated. Numbers bare;
        quote strings / dates as ggsql needs.
      </p>
    </div>
  );
}

/** Per-axis break-label formatter. Emits the `RENAMING * => '<template>'`
 *  subclause of the axis `SCALE x` (or `y`) clause. Templates use ggsql's
 *  break-format tokens — `{}` (bare echo), `{:UPPER}`, `{:lower}`, `{:Title}`,
 *  `{:num <printf>}`, `{:time <strftime>}`. See the docs link in the helper
 *  text for the full reference. Empty input clears the field; the RENAMING
 *  subclause is then omitted. */
function AxisFormatField({
  aes,
  value,
  onChange,
}: {
  aes: "x" | "y";
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block">
        <span className="mb-1 flex items-center justify-between font-mono text-xs text-stone-700">
          <span>Format ({aes})</span>
          <span className="text-[10px] text-stone-500">
            {value.trim() ? "set" : "off"}
          </span>
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="{:num %.2f}"
          spellCheck={false}
          className="w-full rounded border border-stone-300 bg-white px-2 py-1 font-mono text-xs text-stone-800 focus:border-sky-400 focus:outline-none"
        />
      </label>
      <p className="mt-1 font-mono text-[10px] leading-relaxed text-stone-500">
        Break-format template applied to tick labels. Tokens:{" "}
        <code className="text-stone-700">{`{}`}</code>,{" "}
        <code className="text-stone-700">{`{:UPPER}`}</code>,{" "}
        <code className="text-stone-700">{`{:lower}`}</code>,{" "}
        <code className="text-stone-700">{`{:Title}`}</code>,{" "}
        <code className="text-stone-700">{`{:num %.2f}`}</code>,{" "}
        <code className="text-stone-700">{`{:time %Y-%m-%d}`}</code>.{" "}
        <a
          href="https://ggsql.org/syntax/clause/scale.html#break-formatting"
          target="_blank"
          rel="noreferrer noopener"
          className="text-sky-600 underline hover:text-sky-800"
        >
          Docs ↗
        </a>
      </p>
    </div>
  );
}
