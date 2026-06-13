import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import Select, {
  components as RSComponents,
  type GroupBase,
  type MenuListProps,
  type OptionProps,
  type SingleValueProps,
  type StylesConfig,
} from "react-select";
import type { Aes, LayerSettings, ScaleSettings } from "../lib/buildQuery";
import { colorKeys } from "../lib/buildQuery";
import { ClearButton } from "./ClearButton";
import { NumberField } from "./NumberField";
import { Switch } from "./Switch";
import { CloseIcon } from "./icons";
import { useDebouncedInput } from "../lib/useDebouncedInput";
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

type MappingKind = "fixed" | "discrete" | "continuous";

interface Props {
  aes: Aes;
  /** Resolved geom of the layer — picks the per-geom default for the fixed
   *  opacity / size number inputs (opacity defaults differ by geom). */
  resolvedDraw: string | null;
  settings: LayerSettings;
  /** Chart-level scale settings (axis format/breaks + fill/stroke palettes).
   *  Shared across every layer; the palette tabs + axis fields read/write here
   *  instead of per-layer `settings`. */
  scales: ScaleSettings;
  mappingKind: MappingKind;
  onChangeSettings: (next: LayerSettings) => void;
  onChangeScales: (next: ScaleSettings) => void;
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
  resolvedDraw,
  settings,
  scales,
  mappingKind,
  onChangeSettings,
  onChangeScales,
  onClose,
}: Props) {
  const geom = resolvedDraw ?? "";
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
  // The colour mode follows the mapped column's kind — no manual switch.
  const colorMode: MappingKind = mappingKind;
  const noKey = isColor ? colorKeys(aes).no : "noFill";
  const noValue = isColor && !!settings[noKey];

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
              mode={colorMode}
              settings={settings}
              scales={scales}
              onChangeSettings={onChangeSettings}
              onChangeScales={onChangeScales}
            />
          )}
          {aes === "opacity" && (
            <div className="space-y-3 p-3">
              <NumberField
                geom={geom}
                settingKey="opacity"
                label="Fixed opacity"
                value={settings.opacity ?? null}
                onChange={(v) =>
                  onChangeSettings({ ...settings, opacity: v ?? undefined })
                }
              />
            </div>
          )}
          {aes === "size" && (
            <div className="space-y-3 p-3">
              <NumberField
                geom={geom}
                settingKey="size"
                label="Fixed size"
                value={settings.size ?? null}
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
                value={(aes === "x" ? scales.xBreaks : scales.yBreaks) ?? ""}
                onChange={(v) => {
                  const next = { ...scales };
                  if (v) next[aes === "x" ? "xBreaks" : "yBreaks"] = v;
                  else delete next[aes === "x" ? "xBreaks" : "yBreaks"];
                  onChangeScales(next);
                }}
              />
              <AxisFormatField
                aes={aes}
                value={(aes === "x" ? scales.xFormat : scales.yFormat) ?? ""}
                onChange={(v) => {
                  const next = { ...scales };
                  if (v) next[aes === "x" ? "xFormat" : "yFormat"] = v;
                  else delete next[aes === "x" ? "xFormat" : "yFormat"];
                  onChangeScales(next);
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
          <NoColorFooter
            aes={aes}
            checked={noValue}
            onChange={(v) =>
              onChangeSettings({ ...settings, [noKey]: v || undefined })
            }
          />
        )}
      </div>
    </aside>
  );
}

// Pinned footer shared by all three colour modes: the No fill / No line switch
// (overrides the palette / fixed colour above).
function NoColorFooter({
  aes,
  checked,
  onChange,
}: {
  aes: "fill" | "stroke";
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const label = aes === "fill" ? "No fill color" : "No line color";
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-stone-200 bg-stone-50 px-3 py-2.5">
      <div className="min-w-0">
        <div className="font-mono text-sm font-semibold text-stone-800">
          {label}
        </div>
        <div className="font-mono text-[10px] text-stone-500">
          Overrides settings above
        </div>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Three-tab panel for `fill` / `stroke`
// ────────────────────────────────────────────────────────────────────────────

function ColorAestheticPanel({
  aes,
  mode,
  settings,
  scales,
  onChangeSettings,
  onChangeScales,
}: {
  aes: "fill" | "stroke";
  mode: MappingKind;
  settings: LayerSettings;
  scales: ScaleSettings;
  onChangeSettings: (next: LayerSettings) => void;
  onChangeScales: (next: ScaleSettings) => void;
}) {
  // Fixed colour is per-layer (settings); the palettes are chart-level scales.
  const {
    discrete: discreteKey,
    continuous: continuousKey,
    discreteRev: discreteRevKey,
    continuousRev: continuousRevKey,
  } = colorKeys(aes);
  const paletteKey = mode === "continuous" ? continuousKey : discreteKey;
  const reverseKey = mode === "continuous" ? continuousRevKey : discreteRevKey;
  const reverse = scales[reverseKey] ?? false;

  return (
    <div className="space-y-3 p-3">
      <ModeLabel mode={mode} />
      {mode === "fixed" && (
        <ConstantContent
          aes={aes}
          settings={settings}
          onChangeSettings={onChangeSettings}
        />
      )}
      {mode !== "fixed" && (
        <>
          <PaletteContent value={scales[paletteKey] ?? null} mode={mode} reverse={reverse}
            onChange={(v) =>
              onChangeScales({ ...scales, [paletteKey]: v ?? undefined })
            }
          />
          <div className="border-t border-stone-200 pt-3">
            <label className="flex items-center justify-between font-mono text-sm text-stone-800">
              <span>Reverse palette</span>
              <Switch
                checked={reverse}
                label="Reverse palette"
                onChange={(v) =>
                  onChangeScales({ ...scales, [reverseKey]: v || undefined })
                }
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}

function ModeLabel({ mode }: { mode: MappingKind }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-wide text-stone-500">
      {mode === "fixed" ? (
        "Constant color"
      ) : (
        <>
          Palette <span className="text-stone-400">·</span>{" "}
          {mode === "discrete" ? "Discrete" : "Continuous"}
        </>
      )}
    </div>
  );
}

function ConstantContent({
  aes,
  settings,
  onChangeSettings,
}: {
  aes: "fill" | "stroke";
  settings: LayerSettings;
  onChangeSettings: (next: LayerSettings) => void;
}) {
  const { fixed: fixedKey } = colorKeys(aes);
  const value = settings[fixedKey] ?? null;
  const setValue = (v: string | null) =>
    onChangeSettings({ ...settings, [fixedKey]: v ?? undefined });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {GGSQL10.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setValue(c)}
            aria-label={c}
            title={c}
            className={[
              "h-9 w-full rounded-md ring-offset-1 transition-shadow",
              value === c ? "ring-2 ring-sky-500" : "ring-1 ring-stone-200",
            ].join(" ")}
            style={{ background: c }}
          />
        ))}
      </div>
      <CustomColorField value={value} onChange={setValue} />
    </div>
  );
}

// Strip + status line + searchable palette dropdown for the discrete /
// continuous modes. Reverse + no-fill live outside this block.
function PaletteContent({
  value,
  mode,
  reverse,
  onChange,
}: {
  value: string | null;
  mode: "discrete" | "continuous";
  reverse: boolean;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <PaletteStatusLine
        value={value}
        defaultName={mode === "continuous" ? DEFAULT_CONTINUOUS : DEFAULT_DISCRETE}
        kind={mode}
        reverse={reverse}
      />
      {mode === "continuous" ? (
        <ContinuousSelect value={value} onChange={onChange} />
      ) : (
        <DiscreteSelect value={value} onChange={onChange} />
      )}
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
  reverse,
}: {
  value: string | null;
  defaultName: string;
  kind: "discrete" | "continuous";
  reverse: boolean;
}) {
  const effective = value ?? defaultName;
  const isDefault = value === null;
  let swatchCss = "transparent";
  if (kind === "discrete") {
    const p = DISCRETE_PALETTES.find((pp) => pp.name === effective);
    if (p) {
      const colors = reverse ? [...p.colors].reverse() : p.colors;
      swatchCss = discreteStripCss(colors);
    }
  } else {
    const p = CONTINUOUS_PALETTES.find((pp) => pp.name === effective);
    if (p) {
      // Reverse direction: keep the ascending offsets, swap the colour order.
      const stops = reverse
        ? p.stops.map((s, i) => ({
            offset: s.offset,
            color: p.stops[p.stops.length - 1 - i].color,
          }))
        : p.stops;
      swatchCss = gradientCss(stops);
    }
  }
  // Discrete: "<name> default · N colors". Continuous: "<name> <category>"
  // (category suppressed when it equals the name) + "default" for the default.
  const meta: string[] = [];
  if (kind === "discrete") {
    if (isDefault) meta.push("default");
    const colors = DISCRETE_PALETTES.find((p) => p.name === effective)?.colors;
    if (colors) meta.push(`· ${colors.length} colors`);
  } else {
    const cat = CONTINUOUS_PALETTES.find((p) => p.name === effective)?.category;
    if (cat && cat !== effective) meta.push(cat);
    if (isDefault) meta.push("default");
  }
  return (
    <div className="space-y-1">
      <div className="h-4 rounded" style={{ background: swatchCss }} />
      <div className="font-mono text-[11px]">
        <span className="font-semibold text-stone-800">{effective}</span>
        {meta.length > 0 && (
          <span className="text-stone-400"> {meta.join(" ")}</span>
        )}
      </div>
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
        className="h-11 w-12 shrink-0 cursor-pointer rounded-md border border-stone-300"
        aria-label="Pick a custom colour"
      />
      <input
        type="text"
        placeholder="#hex / name / rgb(…)"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="flex-1 rounded-md border border-stone-300 bg-white px-3 font-mono text-xs text-stone-800 focus:border-sky-400 focus:outline-none"
      />
    </div>
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
  const input = useDebouncedInput(value, onChange);
  return (
    <div>
      <label className="block">
        <span className="mb-1 flex items-center justify-between font-mono text-xs text-stone-700">
          <span>Breaks ({aes})</span>
          {input.value.trim() && <ClearButton onClick={input.clear} />}
        </span>
        <input
          type="text"
          value={input.value}
          onChange={input.onChange}
          onBlur={input.onBlur}
          onKeyDown={input.onKeyDown}
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
  const input = useDebouncedInput(value, onChange);
  return (
    <div>
      <label className="block">
        <span className="mb-1 flex items-center justify-between font-mono text-xs text-stone-700">
          <span>Format ({aes})</span>
          {input.value.trim() && <ClearButton onClick={input.clear} />}
        </span>
        <input
          type="text"
          value={input.value}
          onChange={input.onChange}
          onBlur={input.onBlur}
          onKeyDown={input.onKeyDown}
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
