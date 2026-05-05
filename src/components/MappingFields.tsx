import type { ReactNode } from "react";
import type { Aes } from "../lib/buildQuery";
import { Dropzone } from "./Dropzone";

interface Props {
  mappings: Partial<Record<Aes, string>>;
  sourceId: string;
  openMappingAes?: Aes | null;
  onMap: (aes: Aes, col: string | undefined) => void;
  onDrop: (
    aes: Aes,
    col: string,
    src?: { layerId: string; aes: Aes },
  ) => void;
  onToggleSettings?: (aes: Aes) => void;
}

export function MappingFields({
  mappings,
  sourceId,
  openMappingAes,
  onMap,
  onDrop,
  onToggleSettings,
}: Props) {
  const slot = (aes: Aes) => ({
    value: mappings[aes],
    source: { layerId: sourceId, aes },
    settingsOpen: openMappingAes === aes,
    onDrop: (c: string, src?: { layerId: string; aes: Aes }) =>
      onDrop(aes, c, src),
    onClear: () => onMap(aes, undefined),
    onToggleSettings: onToggleSettings
      ? () => onToggleSettings(aes)
      : undefined,
  });

  return (
    <div className="space-y-3">
      <Field label="X">
        <Dropzone placeholder="Bottom Axis" {...slot("x")} />
      </Field>
      <Field label="Y">
        <Dropzone placeholder="Left Axis" {...slot("y")} />
      </Field>
      <Field label="Fill">
        <Dropzone {...slot("fill")} />
      </Field>
      <Field label="Stroke">
        <Dropzone {...slot("stroke")} />
      </Field>
      <Field label="Opacity">
        <Dropzone {...slot("opacity")} />
      </Field>
      <Field label="Size">
        <Dropzone {...slot("size")} />
      </Field>
      <Field label="Panels">
        <div className="space-y-1">
          <Dropzone placeholder="rows" {...slot("facet_row")} />
          <div className="text-center font-mono text-[10px] text-stone-400">
            by
          </div>
          <Dropzone placeholder="columns" {...slot("facet_col")} />
        </div>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 font-mono text-xs font-semibold text-stone-700">
        {label}
      </div>
      {children}
    </div>
  );
}
