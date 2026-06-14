import { useRef, type ReactNode, type RefObject } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { CustomLayer, LabelsLayer, Layer } from "../lib/buildQuery";
import { stripOrder } from "../lib/layerOrder";
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
  /** Drag-reorder: move card `activeId` to the slot of card `overId`. */
  onReorder: (activeId: string, overId: string) => void;
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
  onReorder,
}: Props) {
  const order = stripOrder(layers, labels, customLayers);
  const layerById = new Map(layers.map((l) => [l.id, l]));
  const labelById = new Map(labels.map((l) => [l.id, l]));
  const customById = new Map(customLayers.map((c) => [c.id, c]));
  const firstLayerId = order.find((o) => o.kind === "layer")?.id;

  // A drop can leak a click on the source card, which would toggle its panel.
  // Set on drag start, consumed by the cards' capture handler; cleared on the
  // next tick after a drop (the leaked click, when it fires, comes first).
  const suppressClickRef = useRef(false);

  // The 5px activation distance keeps plain clicks opening panels — a drag
  // only starts (and only then suppresses the click) after real movement.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Body-level cursor so the closed hand persists while the pointer is
  // outside the dragged card (the transform lags the pointer).
  const endDragCursor = () => {
    document.body.style.cursor = "";
  };

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragStart={() => {
              suppressClickRef.current = true;
              document.body.style.cursor = "grabbing";
            }}
            onDragCancel={() => {
              suppressClickRef.current = false;
              endDragCursor();
            }}
            onDragEnd={({ active, over }: DragEndEvent) => {
              endDragCursor();
              setTimeout(() => {
                suppressClickRef.current = false;
              }, 0);
              if (over && active.id !== over.id) {
                onReorder(String(active.id), String(over.id));
              }
            }}
          >
            <SortableContext
              items={order.map((o) => o.id)}
              strategy={verticalListSortingStrategy}
            >
              {order.map((item) => (
                <SortableCard
                  key={item.id}
                  id={item.id}
                  tutorialTarget={item.id === firstLayerId}
                  suppressClickRef={suppressClickRef}
                >
                  {item.kind === "layer" ? (
                    <LayerCard
                      resolvedDraw={resolvedDrawByLayerId[item.id] ?? null}
                      selected={activeLayerId === item.id}
                      disabled={layerById.get(item.id)?.disabled === true}
                      onToggle={() => onToggleLayer(item.id)}
                    />
                  ) : item.kind === "labels" ? (
                    <LabelsCard
                      open={activeLabelsId === item.id}
                      disabled={labelById.get(item.id)?.disabled === true}
                      onToggle={() => onToggleLabels(item.id)}
                    />
                  ) : (
                    <CustomCard
                      open={activeCustomId === item.id}
                      disabled={customById.get(item.id)?.disabled === true}
                      onToggle={() => onToggleCustom(item.id)}
                    />
                  )}
                </SortableCard>
              ))}
            </SortableContext>
          </DndContext>
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

/** Sortable wrapper for one strip card. `attributes` is deliberately not
 *  spread: it would add role="button" + tabindex around the card's real
 *  <button> (nested interactive roles, broken name-based selectors); keyboard
 *  focus + Enter/Space stay with the card button, which opens its panel. */
function SortableCard({
  id,
  tutorialTarget,
  suppressClickRef,
  children,
}: {
  id: string;
  tutorialTarget: boolean;
  suppressClickRef: RefObject<boolean>;
  children: ReactNode;
}) {
  const { setNodeRef, transform, transition, listeners, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      onClickCapture={(e) => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
      }}
      className={["touch-none self-center", isDragging ? "relative z-10" : ""].join(" ")}
      {...(tutorialTarget ? { "data-tutorial-target": "layer" } : {})}
    >
      {children}
    </div>
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
