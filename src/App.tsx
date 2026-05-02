import { useEffect, useMemo, useRef, useState } from "react";
import vegaEmbed from "vega-embed";
import { Warn } from "vega";
import { ggsql, type ColumnInfo } from "./lib/ggsql";
import {
  AUTO,
  buildQuery,
  type Aes,
  type Labels,
  type Layer,
  type LayerSettings,
  type ProjectSettings,
} from "./lib/buildQuery";
import { columnAxisKind, compatibleDraws, resolveDraw } from "./lib/autoChart";
import { deserialize, serialize } from "./lib/persist";
import { Sidebar } from "./components/Sidebar";
import { BuildPane } from "./components/BuildPane";
import { CodePanel } from "./components/CodePanel";
import { LabelsPanel } from "./components/LabelsPanel";
import { ChartPanel } from "./components/ChartPanel";
import { MappingPanel } from "./components/MappingPanel";
import { Viz } from "./components/Viz";
import { Errors } from "./components/Errors";

const newId = () => Math.random().toString(36).slice(2, 9);

const initialLayer = (): Layer => ({
  id: newId(),
  draw: AUTO,
  mappings: {},
});

type ActivePanel =
  | null
  | { kind: "labels" }
  | { kind: "chart"; layerId: string }
  | { kind: "mapping"; layerId: string; aes: Aes };

export default function App() {
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [layers, setLayers] = useState<Layer[]>(() => [initialLayer()]);
  const [labels, setLabels] = useState<Labels>({});
  const [project, setProject] = useState<ProjectSettings>({});
  const [expandedId, setExpandedId] = useState<string | null>(() => null);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const vizRef = useRef<HTMLDivElement>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from URL hash on mount, then expand the first layer card.
  useEffect(() => {
    const data = deserialize(
      typeof window !== "undefined" ? window.location.hash : "",
    );
    if (data) {
      if (data.layers.length > 0) {
        setLayers(data.layers);
        setExpandedId(data.layers[0].id);
      } else {
        setExpandedId(layers[0]?.id ?? null);
      }
      setLabels(data.labels);
      setProject(data.project);
      if (data.activeTable) setActiveTable(data.activeTable);
    } else {
      setExpandedId(layers[0]?.id ?? null);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror persistable state into the URL hash whenever it changes.
  useEffect(() => {
    if (!hydrated) return;
    const payload = serialize({
      layers,
      labels,
      project,
      activeTable,
    });
    const next = "#" + payload;
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [hydrated, layers, labels, project, activeTable]);

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
        ? buildQuery(activeTable, layers, labels, columns, project)
        : null,
    [activeTable, layers, labels, columns, project],
  );

  const compatibleDrawsByLayerId = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const l of layers) {
      const xK = columnAxisKind(columns, l.mappings.x);
      const yK = columnAxisKind(columns, l.mappings.y);
      map[l.id] = compatibleDraws(xK, yK);
    }
    return map;
  }, [layers, columns]);

  const resolvedDrawByLayerId = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const l of layers) {
      map[l.id] = resolveDraw(l, columns);
    }
    return map;
  }, [layers, columns]);

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

  const toggle = (id: string) =>
    setExpandedId((cur) => (cur === id ? null : id));

  const onChangeDraw = (id: string, draw: string) =>
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, draw } : l)));

  const onChangeSettings = (id: string, settings: LayerSettings) =>
    setLayers((ls) => ls.map((l) => (l.id === id ? { ...l, settings } : l)));

  const onMap = (id: string, aes: Aes, col: string | undefined) =>
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

  const onDrop = (
    dstLayerId: string,
    dstAes: Aes,
    col: string,
    src?: { layerId: string; aes: Aes },
  ) => {
    setLayers((prev) =>
      prev.map((l) => {
        let mappings = l.mappings;
        if (src && l.id === src.layerId) {
          const next: Layer["mappings"] = { ...mappings };
          delete next[src.aes];
          mappings = next;
        }
        if (l.id === dstLayerId) {
          mappings = { ...mappings, [dstAes]: col };
        }
        const draw = Object.keys(mappings).length === 0 ? AUTO : l.draw;
        return mappings === l.mappings ? l : { ...l, draw, mappings };
      }),
    );
  };

  const onAddLayer = () => {
    const layer = initialLayer();
    setLayers((ls) => [...ls, layer]);
    setExpandedId(layer.id);
  };

  const onResetConfig = () => {
    const layer = initialLayer();
    setLayers([layer]);
    setLabels({});
    setProject({});
    setExpandedId(layer.id);
    setActivePanel(null);
  };

  const onRemoveLayer = (id: string) =>
    setLayers((ls) => ls.filter((l) => l.id !== id));

  // Panel toggles ---------------------------------------------------------
  const toggleLabelsPanel = () =>
    setActivePanel((p) =>
      p?.kind === "labels" ? null : { kind: "labels" },
    );
  const toggleChartPanel = (layerId: string) =>
    setActivePanel((p) =>
      p?.kind === "chart" && p.layerId === layerId
        ? null
        : { kind: "chart", layerId },
    );
  const toggleMappingPanel = (layerId: string, aes: Aes) =>
    setActivePanel((p) =>
      p?.kind === "mapping" && p.layerId === layerId && p.aes === aes
        ? null
        : { kind: "mapping", layerId, aes },
    );
  const closePanel = () => setActivePanel(null);

  const hasMappings = layers.some((l) =>
    (["x", "y", "color", "opacity", "size"] as const).some((a) => l.mappings[a]),
  );
  const isEmpty = !activeTable || !hasMappings;

  // Resolve which panel goes in the slot ----------------------------------
  const panelLayerId =
    activePanel?.kind === "chart" || activePanel?.kind === "mapping"
      ? activePanel.layerId
      : null;
  const panelLayer = panelLayerId
    ? layers.find((l) => l.id === panelLayerId) ?? null
    : null;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white">
      <main className="flex min-h-0 flex-1">
        <Sidebar
          ready={ready}
          activeTable={activeTable}
          columns={columns}
          onLoadCsv={onLoadCsv}
          onLoadPenguins={() => setActiveTable("ggsql:penguins")}
          onChangeFile={() => setActiveTable(null)}
        />
        <BuildPane
          layers={layers}
          expandedId={expandedId}
          labelsOpen={activePanel?.kind === "labels"}
          chartPanelLayerId={
            activePanel?.kind === "chart" ? activePanel.layerId : null
          }
          mappingPanel={
            activePanel?.kind === "mapping"
              ? { layerId: activePanel.layerId, aes: activePanel.aes }
              : null
          }
          resolvedDrawByLayerId={resolvedDrawByLayerId}
          onToggle={toggle}
          onToggleLabels={toggleLabelsPanel}
          onToggleChartPanel={toggleChartPanel}
          onToggleMappingPanel={toggleMappingPanel}
          onMap={onMap}
          onDrop={onDrop}
          onAddLayer={onAddLayer}
          onRemoveLayer={onRemoveLayer}
          onReset={onResetConfig}
        />
        {activePanel?.kind === "labels" ? (
          <LabelsPanel
            labels={labels}
            onChange={setLabels}
            onClose={closePanel}
          />
        ) : activePanel?.kind === "chart" && panelLayer ? (
          <ChartPanel
            draw={panelLayer.draw}
            resolvedDraw={resolvedDrawByLayerId[panelLayer.id] ?? null}
            compatibleDraws={compatibleDrawsByLayerId[panelLayer.id] ?? []}
            settings={panelLayer.settings ?? {}}
            project={project}
            onChangeDraw={(d) => onChangeDraw(panelLayer.id, d)}
            onChangeSettings={(s) => onChangeSettings(panelLayer.id, s)}
            onChangeProject={setProject}
            onClose={closePanel}
          />
        ) : activePanel?.kind === "mapping" && panelLayer ? (
          <MappingPanel
            aes={activePanel.aes}
            settings={panelLayer.settings ?? {}}
            onChangeSettings={(s) => onChangeSettings(panelLayer.id, s)}
            onClose={closePanel}
          />
        ) : (
          <CodePanel query={query} />
        )}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-slate-200 bg-white">
          <div className="min-h-0 flex-1 overflow-hidden">
            <Viz ref={vizRef} empty={isEmpty} />
          </div>
          <div className="h-40 shrink-0 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5">
              <span className="font-mono text-xs font-semibold text-slate-600">
                Problems
              </span>
              <span className="font-mono text-xs text-slate-400">
                {errors.length} error{errors.length === 1 ? "" : "s"} ·{" "}
                {warnings.length} warning{warnings.length === 1 ? "" : "s"}
              </span>
            </div>
            <Errors errors={errors} warnings={warnings} />
          </div>
        </section>
      </main>
    </div>
  );
}
