import { useEffect, useState } from "react";
import {
  clampNotice,
  normalizeSettingValue,
  settingConstraint,
  type NumericSettingKey,
} from "../lib/settingDefaults";
import { useDebouncedInput } from "../lib/useDebouncedInput";
import { ClearButton } from "./ClearButton";

interface Props {
  /** Resolved geom — picks the per-geom default + limits. */
  geom: string;
  settingKey: NumericSettingKey;
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}

/** A `<input type=number>` for a layer setting. When empty it shows the ggsql
 *  default as a placeholder; values clamp to ggsql's real limits; and a value
 *  equal to the default is stored as unset (so it never reaches the query).
 *  Typing is debounced (~400 ms, also commits on blur / Enter) so a number can
 *  pass through the default while you type it (e.g. 300 for a default of 30). */
export function NumberField({ geom, settingKey, label, value, onChange }: Props) {
  const c = settingConstraint(geom, settingKey);
  // Brief "Clamped to …" note when a typed value is adjusted to fit the limits.
  const [notice, setNotice] = useState<string | null>(null);
  const input = useDebouncedInput(
    value === null ? "" : String(value),
    (raw) => {
      const t = raw.trim();
      if (t === "") {
        onChange(null);
        return;
      }
      const n = Number(t);
      if (Number.isNaN(n)) {
        onChange(null);
        return;
      }
      setNotice(clampNotice(geom, settingKey, n));
      onChange(normalizeSettingValue(geom, settingKey, n));
    },
  );

  // Auto-dismiss the clamp note shortly after it appears.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  const placeholder = c.default !== undefined ? `default (${c.default})` : "auto";

  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between font-mono text-xs text-stone-700">
        <span>{label}</span>
        {value !== null && <ClearButton onClick={() => onChange(null)} />}
      </span>
      <input
        type="number"
        value={input.value}
        placeholder={placeholder}
        min={c.min}
        max={c.max}
        step={c.step}
        onChange={(e) => {
          if (notice) setNotice(null);
          input.onChange(e);
        }}
        onBlur={input.onBlur}
        onKeyDown={input.onKeyDown}
        className="w-full rounded border border-stone-300 px-2 py-0.5 font-mono text-xs text-stone-800 focus:border-sky-400 focus:outline-none"
      />
      {notice && (
        <span className="mt-1 block font-mono text-[10px] text-amber-700">
          {notice}
        </span>
      )}
    </label>
  );
}
