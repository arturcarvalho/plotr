import { AUTO, type Aes, type Layer } from "../lib/buildQuery";
import { Dropzone } from "./Dropzone";

interface Props {
  layer: Layer;
  expanded: boolean;
  resolvedDraw: string | null;
  chartPanelOpen: boolean;
  openMappingAes: Aes | null;
  onToggle: () => void;
  onToggleChartPanel: () => void;
  onToggleMappingPanel: (aes: Aes) => void;
  onMap: (aes: Aes, col: string | undefined) => void;
  onDrop: (
    aes: Aes,
    col: string,
    src?: { layerId: string; aes: Aes },
  ) => void;
  onRemove?: () => void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function LayerCard({
  layer,
  expanded,
  resolvedDraw,
  chartPanelOpen,
  openMappingAes,
  onToggle,
  onToggleChartPanel,
  onToggleMappingPanel,
  onMap,
  onDrop,
  onRemove,
}: Props) {
  const drawLabel =
    layer.draw === AUTO
      ? resolvedDraw
        ? `Auto: ${cap(resolvedDraw)}`
        : "Auto"
      : cap(layer.draw);

  return (
    <div className="mb-2 rounded border border-slate-300 bg-slate-50">
      {expanded ? (
        <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-200 px-2 py-1.5">
          <button
            type="button"
            onClick={onToggleChartPanel}
            className={[
              "flex flex-1 items-center justify-between rounded px-2 py-1 font-mono text-xs transition-colors",
              chartPanelOpen
                ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
            ].join(" ")}
          >
            <span>{drawLabel}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="rounded px-1 text-slate-600 hover:bg-slate-300"
            aria-label="collapse"
          >
            ▾
          </button>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded px-1 text-slate-600 hover:bg-red-100 hover:text-red-700"
              aria-label="remove layer"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-center px-2 py-2 font-mono text-xs hover:bg-slate-100"
        >
          {drawLabel}
        </button>
      )}

      {expanded && (
        <div className="space-y-3 p-3">
          <Field label="X">
            <Dropzone
              placeholder="Bottom Axis"
              value={layer.mappings.x}
              source={{ layerId: layer.id, aes: "x" }}
              settingsOpen={openMappingAes === "x"}
              onDrop={(c, src) => onDrop("x", c, src)}
              onClear={() => onMap("x", undefined)}
              onToggleSettings={() => onToggleMappingPanel("x")}
            />
          </Field>
          <Field label="Y">
            <Dropzone
              placeholder="Left Axis"
              value={layer.mappings.y}
              source={{ layerId: layer.id, aes: "y" }}
              settingsOpen={openMappingAes === "y"}
              onDrop={(c, src) => onDrop("y", c, src)}
              onClear={() => onMap("y", undefined)}
              onToggleSettings={() => onToggleMappingPanel("y")}
            />
          </Field>
          <Field label="Fill">
            <Dropzone
              value={layer.mappings.fill}
              source={{ layerId: layer.id, aes: "fill" }}
              settingsOpen={openMappingAes === "fill"}
              onDrop={(c, src) => onDrop("fill", c, src)}
              onClear={() => onMap("fill", undefined)}
              onToggleSettings={() => onToggleMappingPanel("fill")}
            />
          </Field>
          <Field label="Stroke">
            <Dropzone
              value={layer.mappings.stroke}
              source={{ layerId: layer.id, aes: "stroke" }}
              settingsOpen={openMappingAes === "stroke"}
              onDrop={(c, src) => onDrop("stroke", c, src)}
              onClear={() => onMap("stroke", undefined)}
              onToggleSettings={() => onToggleMappingPanel("stroke")}
            />
          </Field>
          <Field label="Opacity">
            <Dropzone
              value={layer.mappings.opacity}
              source={{ layerId: layer.id, aes: "opacity" }}
              settingsOpen={openMappingAes === "opacity"}
              onDrop={(c, src) => onDrop("opacity", c, src)}
              onClear={() => onMap("opacity", undefined)}
              onToggleSettings={() => onToggleMappingPanel("opacity")}
            />
          </Field>
          <Field label="Size">
            <Dropzone
              value={layer.mappings.size}
              source={{ layerId: layer.id, aes: "size" }}
              settingsOpen={openMappingAes === "size"}
              onDrop={(c, src) => onDrop("size", c, src)}
              onClear={() => onMap("size", undefined)}
              onToggleSettings={() => onToggleMappingPanel("size")}
            />
          </Field>
          <Field label="Panels">
            <div className="space-y-2">
              <Dropzone
                placeholder="Top Axis"
                value={layer.mappings.facet_col}
                source={{ layerId: layer.id, aes: "facet_col" }}
                settingsOpen={openMappingAes === "facet_col"}
                onDrop={(c, src) => onDrop("facet_col", c, src)}
                onClear={() => onMap("facet_col", undefined)}
                onToggleSettings={() => onToggleMappingPanel("facet_col")}
              />
              <Dropzone
                placeholder="Right Axis"
                value={layer.mappings.facet_row}
                source={{ layerId: layer.id, aes: "facet_row" }}
                settingsOpen={openMappingAes === "facet_row"}
                onDrop={(c, src) => onDrop("facet_row", c, src)}
                onClear={() => onMap("facet_row", undefined)}
                onToggleSettings={() => onToggleMappingPanel("facet_row")}
              />
            </div>
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 font-mono text-xs font-semibold text-slate-700">
        {label}
      </div>
      {children}
    </div>
  );
}
