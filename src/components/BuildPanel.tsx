import { Fragment } from "react";
import type {
  CustomLayer,
  LabelsLayer,
  Layer,
} from "../lib/buildQuery";
import { LayerCard } from "./LayerCard";
import { LabelsCard } from "./LabelsCard";
import { CustomCard } from "./CustomCard";
import { AddMenu } from "./AddMenu";

interface Props {
  layers: Layer[];
  labels: LabelsLayer[];
  customLayers: CustomLayer[];
  activeLayerId: string | null;
  activeLabelsId: string | null;
  activeCustomId: string | null;
  sharedOpen: boolean;
  resolvedDrawByLayerId: Record<string, string | null>;
  onToggleLayer: (id: string) => void;
  onToggleLabels: (id: string) => void;
  onToggleCustom: (id: string) => void;
  onToggleShared: () => void;
  onAddLayer: () => void;
  onAddLabels: () => void;
  onAddCustom: () => void;
  onRemoveLayer: (id: string) => void;
  onRemoveLabels: (id: string) => void;
  onRemoveCustom: (id: string) => void;
  onToggleLayerDisabled: (id: string) => void;
  onToggleLabelsDisabled: (id: string) => void;
  onToggleCustomDisabled: (id: string) => void;
}

export function BuildPanel({
  layers,
  labels,
  customLayers,
  activeLayerId,
  activeLabelsId,
  activeCustomId,
  sharedOpen,
  resolvedDrawByLayerId,
  onToggleLayer,
  onToggleLabels,
  onToggleCustom,
  onToggleShared,
  onAddLayer,
  onAddLabels,
  onAddCustom,
  onRemoveLayer,
  onRemoveLabels,
  onRemoveCustom,
  onToggleLayerDisabled,
  onToggleLabelsDisabled,
  onToggleCustomDisabled,
}: Props) {
  // Labels with position > layers.length (e.g. from a stale URL hash that
  // outlived a layer removal) are clamped to the final slot so they still
  // render rather than vanishing.
  const labelsAt = (i: number) =>
    labels.filter((l) =>
      i >= layers.length ? l.position >= i : l.position === i,
    );
  const customsAt = (i: number) =>
    customLayers.filter((c) =>
      i >= layers.length ? c.position >= i : c.position === i,
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

  const renderCustoms = (i: number) =>
    customsAt(i).map((c) => (
      <div key={c.id} className="self-center">
        <CustomCard
          open={activeCustomId === c.id}
          disabled={c.disabled === true}
          onToggle={() => onToggleCustom(c.id)}
          onRemove={() => onRemoveCustom(c.id)}
          onToggleDisabled={() => onToggleCustomDisabled(c.id)}
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
                ? "bg-stone-300 text-stone-900 hover:bg-stone-400"
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
              {renderCustoms(i)}
              <div
                className="self-center"
                {...(i === 0 ? { "data-tutorial-target": "layer" } : {})}
              >
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
          {renderCustoms(layers.length)}
          <div className="mt-1">
            <AddMenu
              onAddChart={onAddLayer}
              onAddCustom={onAddCustom}
              onAddLabels={onAddLabels}
            />
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
