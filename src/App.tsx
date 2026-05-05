import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import vegaEmbed from "vega-embed";
import { Warn } from "vega";
import { ggsql, type ColumnInfo } from "./lib/ggsql";
import {
  AESTHETICS,
  AUTO,
  buildQuery,
  type Aes,
  type LabelsLayer,
  type Layer,
  type LayerSettings,
  type ProjectSettings,
} from "./lib/buildQuery";
import { columnAxisKind, compatibleDraws, resolveDraw } from "./lib/autoChart";
import { deserialize, serialize } from "./lib/persist";
import { BuildPanel } from "./components/BuildPanel";
import { ChartPanel } from "./components/ChartPanel";
import { ChartTypePanel } from "./components/ChartTypePanel";
import { DataPanel } from "./components/DataPanel";
import { GGSQLPanel } from "./components/GGSQLPanel";
import { LabelsPanel } from "./components/LabelsPanel";
import { MappingPanel } from "./components/MappingPanel";
import {
  SHARED_MAPPINGS_KEY,
  SharedMappingsPanel,
} from "./components/SharedMappingsPanel";
import { Viz } from "./components/Viz";
import { ProblemsPanel } from "./components/ProblemsPanel";
import { Tutorial } from "./components/Tutorial";
import { BottomTabs, type Tab as BottomTab } from "./components/BottomTabs";

const newId = () => Math.random().toString(36).slice(2, 9);

const initialLayer = (): Layer => ({
  id: newId(),
  draw: AUTO,
  mappings: {},
});

type ActivePanel =
  | null
  | { kind: "labels"; labelsId: string }
  | { kind: "shared" }
  | { kind: "layer"; layerId: string };

type SecondaryPanel =
  | null
  | { kind: "settings" }
  | { kind: "mapping"; aes: Aes };

export default function App() {
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [layers, setLayers] = useState<Layer[]>(() => [initialLayer()]);
  const [labels, setLabels] = useState<LabelsLayer[]>([]);
  const [project, setProject] = useState<ProjectSettings>({});
  const [sharedMappings, setSharedMappings] = useState<
    Partial<Record<Aes, string>>
  >({});
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [secondaryPanel, setSecondaryPanel] = useState<SecondaryPanel>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>("ggsql");
  const vizRef = useRef<HTMLDivElement>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from URL hash on mount, then auto-open the first layer's panel.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await deserialize(
        typeof window !== "undefined" ? window.location.hash : "",
      );
      if (cancelled) return;
      let firstLayerId: string | null = layers[0]?.id ?? null;
      if (data) {
        if (data.layers.length > 0) {
          setLayers(data.layers);
          firstLayerId = data.layers[0].id;
        }
        setLabels(data.labels);
        setProject(data.project);
        setSharedMappings(data.sharedMappings);
        if (data.activeTable) setActiveTable(data.activeTable);
      }
      if (firstLayerId) {
        setActivePanel({ kind: "layer", layerId: firstLayerId });
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror persistable state into the URL hash whenever it changes.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      const payload = await serialize({
        layers,
        labels,
        project,
        sharedMappings,
        activeTable,
      });
      if (cancelled) return;
      const next = "#" + payload;
      if (window.location.hash !== next) {
        window.history.replaceState(null, "", next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, layers, labels, project, sharedMappings, activeTable]);

  useEffect(() => {
    ggsql
      .initialize()
      .then(() => setReady(true))
      .catch((e) => setErrors([`Failed to initialise ggsql-wasm: ${e}`]));
  }, []);

  useEffect(() => {
    if (!activeTable) {
      setColumns([]);
      return;
    }
    if (!ready) return; // wait for wasm before introspecting
    try {
      setColumns(ggsql.describeColumns(activeTable));
      setErrors((prev) => prev.filter((m) => !m.startsWith("Failed to inspect")));
    } catch (e) {
      setErrors((prev) => [`Failed to inspect "${activeTable}": ${e}`, ...prev]);
      setColumns([]);
    }
  }, [activeTable, ready]);

  const query = useMemo(
    () =>
      activeTable
        ? buildQuery(
            activeTable,
            layers,
            labels,
            columns,
            project,
            sharedMappings,
          )
        : null,
    [activeTable, layers, labels, columns, project, sharedMappings],
  );

  const compatibleDrawsByLayerId = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const l of layers) {
      const xK = columnAxisKind(columns, l.mappings.x ?? sharedMappings.x);
      const yK = columnAxisKind(columns, l.mappings.y ?? sharedMappings.y);
      map[l.id] = compatibleDraws(xK, yK);
    }
    return map;
  }, [layers, columns, sharedMappings]);

  const resolvedDrawByLayerId = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const l of layers) {
      map[l.id] = resolveDraw(l, columns, sharedMappings);
    }
    return map;
  }, [layers, columns, sharedMappings]);

  // Build + render chart whenever inputs change
  useEffect(() => {
    if (!ready || !vizRef.current) return;
    if (!query) {
      vizRef.current.innerHTML = "";
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (!ggsql.hasVisual(query)) {
          if (vizRef.current) vizRef.current.innerHTML = "";
          return;
        }
        const spec = JSON.parse(ggsql.execute(query));
        const collected: string[] = [];
        let level = Warn;
        const logger = {
          level(l?: number) {
            if (l !== undefined) {
              level = l;
              return this;
            }
            return level;
          },
          error: (...args: unknown[]) => {
            console.error(...args);
            return logger;
          },
          warn: (...args: unknown[]) => {
            collected.push(args.map(String).join(" "));
            return logger;
          },
          info: () => logger,
          debug: () => logger,
        };
        if (vizRef.current && !cancelled) {
          vizRef.current.innerHTML = "";
          await vegaEmbed(vizRef.current, spec, {
            actions: { export: true, source: false, compiled: false, editor: false },
            renderer: "svg",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            logger: logger as any,
          });
          const svg = vizRef.current.querySelector("svg");
          if (svg) {
            const w = svg.getAttribute("width");
            const h = svg.getAttribute("height");
            if (w && h && !svg.getAttribute("viewBox")) {
              svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
            }
            svg.setAttribute("width", "100%");
            svg.setAttribute("height", "100%");
            svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
            svg.style.maxWidth = "100%";
            svg.style.maxHeight = "100%";
          }
        }
        if (!cancelled) {
          setWarnings(collected);
          setErrors((prev) => prev.filter((m) => !m.startsWith("Chart error")));
        }
      } catch (e) {
        if (!cancelled) {
          setErrors((prev) => [
            `Chart error: ${String(e)}`,
            ...prev.filter((m) => !m.startsWith("Chart error")),
          ]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, query]);

  const onLoadCsv = (name: string, bytes: Uint8Array) => {
    try {
      ggsql.registerCsv(name, bytes);
      setActiveTable(name);
    } catch (e) {
      setErrors((prev) => [`Failed to load CSV "${name}": ${e}`, ...prev]);
    }
  };

  const onChangeDraw = (id: string, draw: string) =>
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, draw } : l)));

  const onChangeSettings = (id: string, settings: LayerSettings) =>
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, settings } : l)));

  const onMap = (id: string, aes: Aes, col: string | undefined) => {
    if (id === SHARED_MAPPINGS_KEY) {
      setSharedMappings((cur) => {
        if (col) return { ...cur, [aes]: col };
        const next = { ...cur };
        delete next[aes];
        return next;
      });
      return;
    }
    setLayers((ls) =>
      ls.map((l) => {
        if (l.id !== id) return l;
        const mappings = col
          ? { ...l.mappings, [aes]: col }
          : Object.fromEntries(
              Object.entries(l.mappings).filter(([k]) => k !== aes),
            );
        const draw = Object.keys(mappings).length === 0 ? AUTO : l.draw;
        return { ...l, draw, mappings };
      }),
    );
  };

  const onDrop = (
    dstLayerId: string,
    dstAes: Aes,
    col: string,
    src?: { layerId: string; aes: Aes },
  ) => {
    setLayers((prev) =>
      prev.map((l) => {
        let mappings = l.mappings;
        if (src && src.layerId !== SHARED_MAPPINGS_KEY && l.id === src.layerId) {
          const next: Layer["mappings"] = { ...mappings };
          delete next[src.aes];
          mappings = next;
        }
        if (dstLayerId !== SHARED_MAPPINGS_KEY && l.id === dstLayerId) {
          mappings = { ...mappings, [dstAes]: col };
        }
        const draw = Object.keys(mappings).length === 0 ? AUTO : l.draw;
        return mappings === l.mappings ? l : { ...l, draw, mappings };
      }),
    );
    setSharedMappings((cur) => {
      let next = cur;
      if (src && src.layerId === SHARED_MAPPINGS_KEY) {
        next = { ...next };
        delete next[src.aes];
      }
      if (dstLayerId === SHARED_MAPPINGS_KEY) {
        next = { ...next, [dstAes]: col };
      }
      return next;
    });
  };

  const onAddLayer = () => {
    const layer = initialLayer();
    setLayers((ls) => [...ls, layer]);
    setActivePanel({ kind: "layer", layerId: layer.id });
    setSecondaryPanel(null);
  };

  const onToggleLayerDisabled = (id: string) => {
    setLayers((ls) =>
      ls.map((l) => (l.id === id ? { ...l, disabled: !l.disabled } : l)),
    );
  };

  const onToggleLabelsDisabled = (id: string) => {
    setLabels((arr) =>
      arr.map((l) => (l.id === id ? { ...l, disabled: !l.disabled } : l)),
    );
  };

  const onResetConfig = () => {
    const layer = initialLayer();
    setLayers([layer]);
    setLabels([]);
    setProject({});
    setSharedMappings({});
    setActivePanel({ kind: "layer", layerId: layer.id });
    setSecondaryPanel(null);
  };

  const onRemoveLayer = (id: string) => {
    setLayers((ls) => {
      const idx = ls.findIndex((l) => l.id === id);
      if (idx < 0) return ls;
      setLabels((arr) =>
        arr.map((l) =>
          l.position > idx ? { ...l, position: l.position - 1 } : l,
        ),
      );
      return ls.filter((l) => l.id !== id);
    });
    setActivePanel((p) =>
      p?.kind === "layer" && p.layerId === id ? null : p,
    );
    setSecondaryPanel(null);
  };

  const onAddLabels = () => {
    const newLabels: LabelsLayer = { id: newId(), position: layers.length };
    setLabels((arr) => [...arr, newLabels]);
    setActivePanel({ kind: "labels", labelsId: newLabels.id });
    setSecondaryPanel(null);
  };

  const onUpdateLabels = (
    labelsId: string,
    patch: Partial<Pick<LabelsLayer, "title" | "subtitle" | "caption" | "x" | "y">>,
  ) => {
    setLabels((arr) =>
      arr.map((l) => (l.id === labelsId ? { ...l, ...patch } : l)),
    );
  };

  const onRemoveLabels = (labelsId: string) => {
    setLabels((arr) => arr.filter((l) => l.id !== labelsId));
    setActivePanel((p) =>
      p?.kind === "labels" && p.labelsId === labelsId ? null : p,
    );
  };

  const onChangeFile = () => {
    setActiveTable(null);
    onResetConfig();
  };

  // Panel toggles ---------------------------------------------------------
  const toggleLabelsPanel = (labelsId: string) => {
    setActivePanel((p) =>
      p?.kind === "labels" && p.labelsId === labelsId
        ? null
        : { kind: "labels", labelsId },
    );
    setSecondaryPanel(null);
  };
  const toggleSharedPanel = () => {
    setActivePanel((p) => (p?.kind === "shared" ? null : { kind: "shared" }));
    setSecondaryPanel(null);
  };
  const toggleLayerPanel = (layerId: string) => {
    setActivePanel((p) =>
      p?.kind === "layer" && p.layerId === layerId
        ? null
        : { kind: "layer", layerId },
    );
    setSecondaryPanel(null);
  };
  const toggleMappingPanel = (aes: Aes) =>
    setSecondaryPanel((s) =>
      s?.kind === "mapping" && s.aes === aes
        ? null
        : { kind: "mapping", aes },
    );
  const toggleSettingsPanel = () =>
    setSecondaryPanel((s) =>
      s?.kind === "settings" ? null : { kind: "settings" },
    );
  const closeSecondaryPanel = () => setSecondaryPanel(null);

  const hasMappings =
    AESTHETICS.some((a) => sharedMappings[a]) ||
    layers.some((l) => AESTHETICS.some((a) => l.mappings[a]));
  const isEmpty = !activeTable || !hasMappings;

  // Resolve which panel goes in the slot ----------------------------------
  const panelLayerId =
    activePanel?.kind === "layer" ? activePanel.layerId : null;
  const panelLayer = panelLayerId
    ? layers.find((l) => l.id === panelLayerId) ?? null
    : null;
  const activeLabels =
    activePanel?.kind === "labels"
      ? labels.find((l) => l.id === activePanel.labelsId) ?? null
      : null;
  const tutorialWrapperCls = "shrink-0 whitespace-nowrap pl-8 pt-px";

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-app-chrome">
      <main className="relative flex min-h-0 flex-1">
        <div className="flex min-h-0 flex-1 p-2">
            <DataPanel
              ready={ready}
              activeTable={activeTable}
              columns={columns}
              onLoadCsv={onLoadCsv}
              onLoadPenguins={() => setActiveTable("ggsql:penguins")}
              onChangeFile={onChangeFile}
            />
            {!activeTable && (
              <div className={tutorialWrapperCls}>
                <Tutorial step1Done={!!activeTable} />
              </div>
            )}
            {activeTable && (
              <div
                key={activeTable}
                className="flex animate-slide-in-left"
              >
                <div className="relative flex">
                <BuildPanel
                  layers={layers}
                  labels={labels}
                  activeLayerId={panelLayerId}
                  activeLabelsId={
                    activePanel?.kind === "labels"
                      ? activePanel.labelsId
                      : null
                  }
                  sharedOpen={activePanel?.kind === "shared"}
                  resolvedDrawByLayerId={resolvedDrawByLayerId}
                  onToggleLayer={toggleLayerPanel}
                  onToggleLabels={toggleLabelsPanel}
                  onToggleShared={toggleSharedPanel}
                  onAddLayer={onAddLayer}
                  onAddLabels={onAddLabels}
                  onRemoveLayer={onRemoveLayer}
                  onRemoveLabels={onRemoveLabels}
                  onToggleLayerDisabled={onToggleLayerDisabled}
                  onToggleLabelsDisabled={onToggleLabelsDisabled}
                />
                {activeLabels && activePanel?.kind === "labels" ? (
                  <LabelsPanel
                    labels={activeLabels}
                    onChange={(patch) =>
                      onUpdateLabels(activePanel.labelsId, patch)
                    }
                  />
                ) : activePanel?.kind === "shared" ? (
                  <SharedMappingsPanel
                    mappings={sharedMappings}
                    onMap={(aes, col) => onMap(SHARED_MAPPINGS_KEY, aes, col)}
                    onDrop={(aes, col, src) =>
                      onDrop(SHARED_MAPPINGS_KEY, aes, col, src)
                    }
                  />
                ) : activePanel?.kind === "layer" && panelLayer ? (
                  <ChartPanel
                    layer={panelLayer}
                    resolvedDraw={
                      resolvedDrawByLayerId[panelLayer.id] ?? null
                    }
                    openMappingAes={
                      secondaryPanel?.kind === "mapping"
                        ? secondaryPanel.aes
                        : null
                    }
                    onMap={(aes, col) => onMap(panelLayer.id, aes, col)}
                    onDrop={(aes, col, src) =>
                      onDrop(panelLayer.id, aes, col, src)
                    }
                    onToggleMappingSettings={toggleMappingPanel}
                    onOpenSettings={toggleSettingsPanel}
                  />
                ) : (
                  <div className="h-full w-[280px] shrink-0 bg-app-chrome" />
                )}
                {!hasMappings && (
                  <div className={`absolute left-full top-0 z-10 ${tutorialWrapperCls}`}>
                    <Tutorial step1Done={!!activeTable} />
                  </div>
                )}
                </div>
                {secondaryPanel?.kind === "settings" && panelLayer ? (
                  <ChartTypePanel
                    resolvedDraw={
                      resolvedDrawByLayerId[panelLayer.id] ?? null
                    }
                    compatibleDraws={
                      compatibleDrawsByLayerId[panelLayer.id] ?? []
                    }
                    settings={panelLayer.settings ?? {}}
                    project={project}
                    onChangeDraw={(d) => onChangeDraw(panelLayer.id, d)}
                    onChangeSettings={(s) => onChangeSettings(panelLayer.id, s)}
                    onChangeProject={setProject}
                    onRemove={
                      layers.length > 1
                        ? () => onRemoveLayer(panelLayer.id)
                        : undefined
                    }
                    onClose={closeSecondaryPanel}
                  />
                ) : secondaryPanel?.kind === "mapping" && panelLayer ? (
                  <MappingPanel
                    aes={secondaryPanel.aes}
                    settings={panelLayer.settings ?? {}}
                    onChangeSettings={(s) =>
                      onChangeSettings(panelLayer.id, s)
                    }
                    onClose={closeSecondaryPanel}
                  />
                ) : (
                  <div className="h-full w-[280px] shrink-0 bg-app-chrome" />
                )}
              </div>
            )}
          </div>
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-app-chrome py-2 pr-2">
          {isEmpty ? null : (
            <Group
              orientation="vertical"
              className="flex h-full w-full flex-col"
            >
              <Panel
                defaultSize={75}
                minSize={20}
                style={{ overflow: "hidden" }}
              >
                <div className="h-full overflow-hidden rounded-t-lg border border-stone-300 bg-white">
                  <Viz
                    ref={vizRef}
                    hasError={errors.length > 0}
                    onShowProblems={() => setBottomTab("problems")}
                  />
                </div>
              </Panel>
              <Separator className="!h-1 !flex-grow-0 !flex-shrink-0 bg-app-chrome transition-colors hover:bg-sky-400" />
              <Panel
                defaultSize={25}
                minSize={5}
                style={{ overflow: "hidden" }}
              >
                <div className="h-full overflow-hidden rounded-b-lg border border-stone-300 bg-app-chrome">
                  <BottomTabs
                    tab={bottomTab}
                    onTabChange={setBottomTab}
                    errorCount={errors.length}
                    warningCount={warnings.length}
                    problems={
                      <ProblemsPanel errors={errors} warnings={warnings} />
                    }
                    ggsql={<GGSQLPanel query={query} />}
                  />
                </div>
              </Panel>
            </Group>
          )}
        </section>
      </main>
    </div>
  );
}
