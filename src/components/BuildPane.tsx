import type { Aes, Layer } from "../lib/buildQuery";
import { LayerCard } from "./LayerCard";
import { LabelsCard } from "./LabelsCard";
import { DeleteBanner } from "./DeleteBanner";

interface Props {
  layers: Layer[];
  expandedId: string | null;
  labelsOpen: boolean;
  chartPanelLayerId: string | null;
  mappingPanel: { layerId: string; aes: Aes } | null;
  resolvedDrawByLayerId: Record<string, string | null>;
  onToggle: (id: string) => void;
  onToggleLabels: () => void;
  onToggleChartPanel: (id: string) => void;
  onToggleMappingPanel: (id: string, aes: Aes) => void;
  onMap: (id: string, aes: Aes, col: string | undefined) => void;
  onDrop: (
    id: string,
    aes: Aes,
    col: string,
    src?: { layerId: string; aes: Aes },
  ) => void;
  onAddLayer: () => void;
  onRemoveLayer: (id: string) => void;
  onReset: () => void;
}

export function BuildPane({
  layers,
  expandedId,
  labelsOpen,
  chartPanelLayerId,
  mappingPanel,
  resolvedDrawByLayerId,
  onToggle,
  onToggleLabels,
  onToggleChartPanel,
  onToggleMappingPanel,
  onMap,
  onDrop,
  onAddLayer,
  onRemoveLayer,
  onReset,
}: Props) {
  return (
    <aside className="relative flex h-full w-[300px] shrink-0 flex-col bg-slate-50 p-1">
      <DeleteBanner />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
            Layers
          </span>
          <button
            type="button"
            onClick={onReset}
            title="Reset chart config"
            aria-label="Reset chart config"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        {layers.map((layer) => (
          <LayerCard
            key={layer.id}
            layer={layer}
            expanded={expandedId === layer.id}
            resolvedDraw={resolvedDrawByLayerId[layer.id] ?? null}
            chartPanelOpen={chartPanelLayerId === layer.id}
            openMappingAes={
              mappingPanel?.layerId === layer.id ? mappingPanel.aes : null
            }
            onToggle={() => onToggle(layer.id)}
            onToggleChartPanel={() => onToggleChartPanel(layer.id)}
            onToggleMappingPanel={(aes) => onToggleMappingPanel(layer.id, aes)}
            onMap={(aes, col) => onMap(layer.id, aes, col)}
            onDrop={(aes, col, src) => onDrop(layer.id, aes, col, src)}
            onRemove={
              layers.length > 1 ? () => onRemoveLayer(layer.id) : undefined
            }
          />
        ))}

        <button
          type="button"
          onClick={onAddLayer}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-700 hover:bg-slate-100"
        >
          <span>＋</span>
          <span>Add chart</span>
        </button>

          <div className="mt-auto pt-3">
            <LabelsCard open={labelsOpen} onToggle={onToggleLabels} />
          </div>
        </div>
      </div>
    </aside>
  );
}
