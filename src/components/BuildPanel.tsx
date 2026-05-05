import { Fragment } from "react";
import type { LabelsLayer, Layer } from "../lib/buildQuery";
import { LayerCard } from "./LayerCard";
import { LabelsCard } from "./LabelsCard";
import { AddMenu } from "./AddMenu";

interface Props {
  layers: Layer[];
  labels: LabelsLayer[];
  activeLayerId: string | null;
  activeLabelsId: string | null;
  sharedOpen: boolean;
  resolvedDrawByLayerId: Record<string, string | null>;
  onToggleLayer: (id: string) => void;
  onToggleLabels: (id: string) => void;
  onToggleShared: () => void;
  onAddLayer: () => void;
  onAddLabels: () => void;
  onRemoveLayer: (id: string) => void;
  onRemoveLabels: (id: string) => void;
  onToggleLayerDisabled: (id: string) => void;
  onToggleLabelsDisabled: (id: string) => void;
}

export function BuildPanel({
  layers,
  labels,
  activeLayerId,
  activeLabelsId,
  sharedOpen,
  resolvedDrawByLayerId,
  onToggleLayer,
  onToggleLabels,
  onToggleShared,
  onAddLayer,
  onAddLabels,
  onRemoveLayer,
  onRemoveLabels,
  onToggleLayerDisabled,
  onToggleLabelsDisabled,
}: Props) {
  // Labels with position > layers.length (e.g. from a stale URL hash that
  // outlived a layer removal) are clamped to the final slot so they still
  // render rather than vanishing.
  const labelsAt = (i: number) =>
    labels.filter((l) =>
      i >= layers.length ? l.position >= i : l.position === i,
    );

  const renderLabels = (i: number) =>
    labelsAt(i).map((l) => (
      <div key={l.id} className="self-center">
        <LabelsCard
          open={activeLabelsId === l.id}
          disabled={l.disabled === true}
          onToggle={() => onToggleLabels(l.id)}
          onRemove={() => onRemoveLabels(l.id)}
          onToggleDisabled={() => onToggleLabelsDisabled(l.id)}
        />
      </div>
    ));

  return (
    <aside className="relative z-30 flex h-full w-14 shrink-0 flex-col bg-app-chrome">
      <div className="flex min-h-0 flex-1 flex-col items-center border-y border-r border-stone-300 bg-white">
        <div className="flex h-[52px] w-full items-center justify-center border-b border-stone-200">
          <button
            type="button"
            onClick={onToggleShared}
            title="Shared variables"
            aria-label="Shared variables"
            className={[
              "flex h-9 w-9 items-center justify-center rounded transition-colors",
              sharedOpen
                ? "bg-stone-100 text-stone-800 hover:bg-stone-200"
                : "text-stone-500 hover:bg-stone-100 hover:text-stone-700",
            ].join(" ")}
          >
            <SharedLayersIcon />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center self-stretch overflow-y-auto overflow-x-hidden py-3">
          {layers.map((layer, i) => (
            <Fragment key={layer.id}>
              {renderLabels(i)}
              <div className="self-center">
                <LayerCard
                  resolvedDraw={resolvedDrawByLayerId[layer.id] ?? null}
                  selected={activeLayerId === layer.id}
                  disabled={layer.disabled === true}
                  onToggle={() => onToggleLayer(layer.id)}
                  onRemove={() => onRemoveLayer(layer.id)}
                  onToggleDisabled={() => onToggleLayerDisabled(layer.id)}
                />
              </div>
            </Fragment>
          ))}
          {renderLabels(layers.length)}
          <div className="mt-1">
            <AddMenu onAddChart={onAddLayer} onAddLabels={onAddLabels} />
          </div>
        </div>
      </div>
    </aside>
  );
}

function SharedLayersIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3 3 8l9 5 9-5-9-5z" />
      <path d="m3 13 9 5 9-5" />
      <path d="m3 18 9 5 9-5" />
    </svg>
  );
}
