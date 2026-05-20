import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import vegaEmbed from "vega-embed";
import { Warn } from "vega";
import { ggsql, type ColumnInfo } from "./lib/ggsql";
import {
  AUTO,
  buildQuery,
  UNIVERSAL_AESTHETICS,
  type Aes,
  type CustomLayer,
  type LabelsLayer,
  type Layer,
  type LayerSettings,
  type ProjectSettings,
} from "./lib/buildQuery";
import {
  columnAxisKind,
  compatibleDraws,
  resolveDraw,
  resolveMappingKind,
} from "./lib/autoChart";
import { deserialize, serialize } from "./lib/persist";
import { clearLastCsv, loadLastCsv, saveLastCsv } from "./lib/csvStore";
import { normalizeCsvHeader } from "./lib/csvNormalize";
import { isChartError, isUnrecoverableError } from "./lib/errorClass";
import { BuildPanel } from "./components/BuildPanel";
import { ChartPanel } from "./components/ChartPanel";
import { ChartTypePanel } from "./components/ChartTypePanel";
import { DataPanel } from "./components/DataPanel";
import { GGSQLPanel } from "./components/GGSQLPanel";
import { VegaSpecPanel } from "./components/VegaSpecPanel";
import { CustomPanel } from "./components/CustomPanel";
import { LabelsPanel } from "./components/LabelsPanel";
import { MappingPanel } from "./components/MappingPanel";
import {
  SHARED_MAPPINGS_KEY,
  SharedMappingsPanel,
} from "./components/SharedMappingsPanel";
import { Viz } from "./components/Viz";
import { ProblemsPanel } from "./components/ProblemsPanel";
import { TutorialOverlay } from "./components/Tutorial";
import { isSeen, markSeen } from "./lib/tutorial";
import { BottomTabs, type Tab as BottomTab } from "./components/BottomTabs";

// Debounce window for chart re-renders. Rapid input (slider drags, text typing)
// resets the timer on every change; the chart only renders once the user pauses
// for this long. Live preview is sacrificed for zero ggsql.execute calls during
// active scrubbing — important because ggsql-wasm v0.3.1 OOBs on rapid execute,
// especially with multi-layer queries. Lower = quicker post-pause render, more
// renders; higher = slower preview but cheaper. Tune here when the feel is off.
const CHART_DEBOUNCE_MS = 200;

const newId = () => Math.random().toString(36).slice(2, 9);

const initialLayer = (): Layer => ({
  id: newId(),
  draw: AUTO,
  mappings: {},
});

const initialLabels = (position: number): LabelsLayer => ({
  id: newId(),
  position,
});

const initialCustom = (position: number): CustomLayer => ({
  id: newId(),
  ggsql: "",
  position,
});

type ActivePanel =
  | null
  | { kind: "labels"; labelsId: string }
  | { kind: "shared" }
  | { kind: "layer"; layerId: string }
  | { kind: "custom"; customId: string };

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
  const [labels, setLabels] = useState<LabelsLayer[]>(() => [initialLabels(1)]);
  const [customLayers, setCustomLayers] = useState<CustomLayer[]>([]);
  const [project, setProject] = useState<ProjectSettings>({});
  const [sharedMappings, setSharedMappings] = useState<
    Partial<Record<Aes, string>>
  >({});
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [tutorialStep, setTutorialStep] = useState<1 | 2 | 3 | null>(() =>
    isSeen() ? null : 1,
  );
  const [secondaryPanel, setSecondaryPanel] = useState<SecondaryPanel>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>("problems");
  // Latest Vega-Lite spec ggsql produced for the bottom-pane `vega-lite` tab.
  // Set on each successful render; cleared whenever the render path bails or
  // throws so the tab shows its placeholder rather than a stale spec.
  const [vegaSpec, setVegaSpec] = useState<unknown>(null);
  const vizRef = useRef<HTMLDivElement>(null);
  const [hydrated, setHydrated] = useState(false);

  // Captured from the URL hash during the mount-time hydration but applied
  // only after ggsql is ready AND any IndexedDB-stored CSV has been re-
  // registered — otherwise `describeColumns(activeTable)` would race the
  // re-registration and error.
  const pendingActiveTableRef = useRef<string | null>(null);

  // Render debounce: each `query` change clears the pending render and
  // reschedules it CHART_DEBOUNCE_MS in the future. While the user is
  // actively changing inputs the timer keeps resetting, so no renders fire
  // until they pause. Closure captures the latest `query` value at fire time.
  const pendingRenderRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ggsql-wasm v0.3.1 occasionally throws RuntimeError (memory access OOB /
  // unreachable / etc.) under rapid execute() calls, especially with multi-
  // layer queries. wasm-bindgen's init() can't cleanly reset the wasm linear
  // memory in-place, so true recovery requires a page reload. We try
  // reinitialize() once as a best effort; on second crash we tell the user.
  const wasmRecoveryAttemptedRef = useRef(false);

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
        if (data.labels.length > 0) setLabels(data.labels);
        if (data.customLayers && data.customLayers.length > 0) {
          setCustomLayers(data.customLayers);
        }
        setProject(data.project);
        setSharedMappings(data.sharedMappings);
        // Defer setActiveTable — a separate effect (watching `ready`) re-
        // registers the user's CSV from IndexedDB and THEN applies the name.
        if (data.activeTable) pendingActiveTableRef.current = data.activeTable;
      }
      // Don't auto-open the layer panel during the tutorial — step 2 needs the
      // user to click the layer card themselves.
      if (firstLayerId && tutorialStep !== 1) {
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
        customLayers: customLayers.length > 0 ? customLayers : undefined,
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
  }, [hydrated, layers, labels, customLayers, project, sharedMappings, activeTable]);

  useEffect(() => {
    ggsql
      .initialize()
      .then(() => setReady(true))
      .catch((e) => setErrors([`Failed to initialise ggsql-wasm: ${e}`]));
  }, []);

  // Once ggsql is ready, re-register the last uploaded CSV (if any) and then
  // resolve activeTable from the URL hash → IndexedDB record → null.
  // Runs again after wasm recovery (ready re-toggles), so the user's CSV
  // is re-registered on the fresh wasm instance automatically.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      let lastCsv: Awaited<ReturnType<typeof loadLastCsv>> = null;
      try {
        lastCsv = await loadLastCsv();
        if (!cancelled && lastCsv) {
          // Normalise headers on rehydration too — older entries stored
          // before this fix may still carry whitespace-padded column names.
          ggsql.registerCsv(lastCsv.name, normalizeCsvHeader(lastCsv.bytes));
        }
      } catch (e) {
        // Best-effort: log + drop a corrupt entry, continue without it.
        console.warn("Failed to rehydrate last CSV from IndexedDB:", e);
        try {
          await clearLastCsv();
        } catch {
          /* ignore */
        }
        lastCsv = null;
      }
      if (cancelled) return;
      const fromHash = pendingActiveTableRef.current;
      pendingActiveTableRef.current = null;
      const next = fromHash ?? lastCsv?.name ?? null;
      if (next) setActiveTable(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

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
            customLayers,
          )
        : null,
    [activeTable, layers, labels, customLayers, columns, project, sharedMappings],
  );

  const compatibleDrawsByLayerId = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const l of layers) {
      const xK = columnAxisKind(columns, l.mappings.x ?? sharedMappings.x);
      const yK = columnAxisKind(columns, l.mappings.y ?? sharedMappings.y);
      const fillK = columnAxisKind(
        columns,
        l.mappings.fill ?? sharedMappings.fill,
      );
      map[l.id] = compatibleDraws(xK, yK, fillK);
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

  // Auto-reset settings when a layer's resolved draw shifts under it
  // (e.g. scatter → bar after the user swaps the X column from continuous to
  // discrete). Mirrors the explicit `onChangeDraw` reset for the implicit
  // AUTO path. Only tracks non-null resolutions: briefly emptying mappings
  // then re-adding them must NOT lose settings if the resolved draw is the
  // same on both sides of the gap.
  //
  // IMPORTANT — two ordering invariants this hook depends on:
  //
  //   1. `prevResolvedRef.current = updated` MUST land BEFORE the `setLayers`
  //      call. The subsequent setLayers triggers a re-render whose
  //      `resolvedDrawByLayerId` memo recomputes; this effect re-fires;
  //      comparing the (just-updated) ref against the next snapshot sees no
  //      drift and bails. Swap the two and you get an infinite loop.
  //
  //   2. `resolvedDrawByLayerId` is a `useMemo` whose identity changes on
  //      every recompute (deps: layers / columns / sharedMappings). This
  //      effect's dep array relies on that referential-identity churn to
  //      fire on each mapping change. If anyone tightens the memo with a
  //      deep-equality wrapper, this hook will silently stop firing for
  //      same-value recomputes — re-route through a key/version counter
  //      instead.
  const prevResolvedRef = useRef<Record<string, string>>({});
  useEffect(() => {
    const prev = prevResolvedRef.current;
    const next = resolvedDrawByLayerId;
    const changedIds: string[] = [];
    const updated: Record<string, string> = { ...prev };
    for (const [id, draw] of Object.entries(next)) {
      if (draw === null) continue;
      if (prev[id] !== undefined && prev[id] !== draw) changedIds.push(id);
      updated[id] = draw;
    }
    prevResolvedRef.current = updated; // invariant #1 — keep above setLayers
    if (changedIds.length === 0) return;
    setLayers((ls) => {
      let mutated = false;
      const out = ls.map((l) => {
        if (changedIds.includes(l.id) && l.settings !== undefined) {
          mutated = true;
          return { ...l, settings: undefined };
        }
        return l;
      });
      return mutated ? out : ls;
    });
  }, [resolvedDrawByLayerId]);

  // Build + render chart whenever inputs change. Debounced by
  // CHART_DEBOUNCE_MS so rapid input doesn't queue vega-embed / ggsql.execute
  // calls — only the final value renders, once the user pauses.
  useEffect(() => {
    if (!ready || !vizRef.current) return;
    if (!query) {
      vizRef.current.innerHTML = "";
      setVegaSpec(null);
      return;
    }

    let cancelled = false;
    const runRender = async () => {
      if (cancelled) return;
      try {
        if (!ggsql.hasVisual(query)) {
          if (vizRef.current) vizRef.current.innerHTML = "";
          if (!cancelled) setVegaSpec(null);
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
          const result = await vegaEmbed(vizRef.current, spec, {
            actions: { export: true, source: false, compiled: false, editor: false },
            renderer: "svg",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            logger: logger as any,
          });
          // Resize via Vega view signals. For non-faceted: set width/height.
          // For faceted: set child_width/child_height (per-panel) divided by
          // the panel count read from column_domain / row_domain.
          const containerW = vizRef.current.clientWidth;
          const containerH = vizRef.current.clientHeight;
          const view = result.view;
          const trySignal = (name: string, value: number) => {
            try {
              view.signal(name, value);
            } catch {
              /* signal absent for this spec shape */
            }
          };
          // Vega-Lite's facet compiler emits "column_domain" / "row_domain"
          // as datasets (length = panel count), not signals.
          const tryReadDomainLen = (name: string): number => {
            try {
              const d = view.data(name);
              return Array.isArray(d) && d.length > 0 ? d.length : 1;
            } catch {
              return 1;
            }
          };
          const cols = tryReadDomainLen("column_domain");
          const rows = tryReadDomainLen("row_domain");
          const isFacet = cols > 1 || rows > 1;
          if (isFacet) {
            // Reserve space for outer axes + facet headers.
            const childW = Math.max(
              120,
              Math.floor((containerW - 80) / cols) - 16,
            );
            const childH = Math.max(
              120,
              Math.floor((containerH - 80) / rows) - 16,
            );
            trySignal("child_width", childW);
            trySignal("child_height", childH);
          } else {
            trySignal("width", containerW);
            trySignal("height", containerH);
          }
          try {
            await view.runAsync();
          } catch {
            /* ignore */
          }
          // Still cap the rendered SVG to fill the container; preserve aspect.
          const svg = vizRef.current.querySelector("svg");
          if (svg) {
            svg.setAttribute("width", "100%");
            svg.setAttribute("height", "100%");
            svg.style.maxWidth = "100%";
            svg.style.maxHeight = "100%";
          }
        }
        if (!cancelled) {
          setWarnings(collected);
          // Successful render clears any displayed chart errors and
          // unrecoverable messages — both are by definition stale once we've
          // drawn a frame against the (possibly re-initialised) wasm.
          setErrors((prev) =>
            prev.filter((m) => !isUnrecoverableError(m) && !isChartError(m)),
          );
          // Expose the just-rendered Vega-Lite spec to the bottom-pane tab.
          setVegaSpec(spec);
          // Future crashes get a fresh recovery attempt.
          wasmRecoveryAttemptedRef.current = false;
        }
      } catch (e) {
        if (cancelled) return;
        // Any failure invalidates the vega-lite tab — clear the previously
        // displayed spec back to the placeholder rather than leaving it
        // looking like the current chart.
        setVegaSpec(null);
        const msg = String(e);
        // ggsql-wasm v0.3.1 crashes in several distinct ways under rapid /
        // multi-layer execute() calls: OOB heap overrun, Rust panic via
        // `unreachable`, etc. All corrupt the runtime state.
        const isWasmCrash =
          msg.includes("memory access out of bounds") ||
          msg.includes("unreachable") ||
          (e instanceof Error && e.constructor.name === "RuntimeError");
        const reloadHint =
          "Please reload the page (Cmd/Ctrl+R) — your settings are preserved in the URL hash.";
        if (isWasmCrash && !wasmRecoveryAttemptedRef.current) {
          // First crash this session — best-effort recovery. wasm-bindgen
          // can't truly reset the wasm memory in-place, so this may itself
          // fail, but it works often enough to be worth trying once.
          //
          // Stash the current activeTable into the pending ref AND blank it.
          // Otherwise the columns useEffect would re-fire right after
          // setReady(true) and race the async rehydration: it'd call
          // describeColumns() on the fresh wasm context (only builtins
          // registered) and produce a spurious "no such table" error before
          // our IndexedDB rehydration registered the user's CSV.
          wasmRecoveryAttemptedRef.current = true;
          if (activeTable) {
            pendingActiveTableRef.current = activeTable;
            setActiveTable(null);
          }
          setReady(false);
          try {
            await ggsql.reinitialize();
            setReady(true);
          } catch (initErr) {
            setErrors((prev) => [
              `ggsql-wasm crashed and re-init failed: ${String(initErr)}. ${reloadHint}`,
              ...prev.filter(
                (m) => !isUnrecoverableError(m) && !isChartError(m),
              ),
            ]);
          }
          return;
        }
        if (isWasmCrash) {
          // Second crash — recovery already attempted. Tell the user.
          setErrors((prev) => [
            `ggsql-wasm crashed again after re-init. ${reloadHint}`,
            ...prev.filter(
              (m) => !isUnrecoverableError(m) && !isChartError(m),
            ),
          ]);
          return;
        }
        setErrors((prev) => [
          `Chart error: ${msg}`,
          ...prev.filter((m) => !isUnrecoverableError(m) && !isChartError(m)),
        ]);
      }
    };

    if (pendingRenderRef.current) clearTimeout(pendingRenderRef.current);
    pendingRenderRef.current = setTimeout(runRender, CHART_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (pendingRenderRef.current) {
        clearTimeout(pendingRenderRef.current);
        pendingRenderRef.current = null;
      }
    };
  }, [ready, query]);

  const onLoadCsv = (name: string, bytes: Uint8Array) => {
    try {
      // Trim whitespace from header cells before anything sees the bytes —
      // ggsql-wasm's CSV reader keeps leading spaces in column names while
      // its query parser strips them from identifier refs, so a header like
      // `country, activity, duration` would otherwise register columns the
      // user can never successfully map. Normalised bytes are what we
      // register, persist, and (on reload) re-register.
      const normalized = normalizeCsvHeader(bytes);
      ggsql.registerCsv(name, normalized);
      setActiveTable(name);
      // Best-effort: persist the bytes so a reload re-registers automatically.
      // Failure (private mode quota, browser without IDB, etc.) shouldn't
      // break the upload flow.
      void saveLastCsv(name, normalized).catch((e) => {
        console.warn("Failed to persist uploaded CSV to IndexedDB:", e);
      });
      if (tutorialStep === 1) setTutorialStep(2);
    } catch (e) {
      setErrors((prev) => [`Failed to load CSV "${name}": ${e}`, ...prev]);
    }
  };

  const onLoadPenguins = () => {
    setActiveTable("ggsql:penguins");
    if (tutorialStep === 1) setTutorialStep(2);
  };

  const onChangeDraw = (id: string, draw: string) =>
    // Clear settings on geom switch — old values (e.g. bar's width, histogram's
    // bins, smooth's method) rarely make sense for the new geom and would
    // otherwise leak into the next query.
    setLayers((ls) =>
      ls.map((l) =>
        l.id === id ? { ...l, draw, settings: undefined } : l,
      ),
    );

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
      if (col && tutorialStep === 3) {
        markSeen();
        setTutorialStep(null);
      }
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
    if (col && tutorialStep === 3) {
      markSeen();
      setTutorialStep(null);
    }
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
    if (tutorialStep === 3) {
      markSeen();
      setTutorialStep(null);
    }
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
    if (tutorialStep === 2) setTutorialStep(3);
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
    setCustomLayers([]);
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
      setCustomLayers((arr) =>
        arr.map((c) =>
          c.position > idx ? { ...c, position: c.position - 1 } : c,
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

  const onAddCustom = () => {
    const c = initialCustom(layers.length);
    setCustomLayers((arr) => [...arr, c]);
    setActivePanel({ kind: "custom", customId: c.id });
    setSecondaryPanel(null);
  };

  const onUpdateCustom = (
    customId: string,
    patch: Partial<Pick<CustomLayer, "ggsql">>,
  ) => {
    setCustomLayers((arr) =>
      arr.map((c) => (c.id === customId ? { ...c, ...patch } : c)),
    );
  };

  const onRemoveCustom = (customId: string) => {
    setCustomLayers((arr) => arr.filter((c) => c.id !== customId));
    setActivePanel((p) =>
      p?.kind === "custom" && p.customId === customId ? null : p,
    );
  };

  const onToggleCustomDisabled = (id: string) => {
    setCustomLayers((arr) =>
      arr.map((c) => (c.id === id ? { ...c, disabled: !c.disabled } : c)),
    );
  };

  // File-only reset: drops the loaded CSV from IndexedDB and clears the
  // active table. Chart config (layers / labels / settings) is preserved
  // so the user can re-upload a compatible CSV and keep their layout.
  const onResetFile = () => {
    setActiveTable(null);
    void clearLastCsv().catch((e) => {
      console.warn("Failed to clear IndexedDB CSV entry:", e);
    });
  };

  // Chart-only reset: clears layers / labels / custom / shared / project.
  // The loaded CSV stays — wired to a new button at the bottom of the rail.
  const onResetChart = () => {
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
  const toggleCustomPanel = (customId: string) => {
    setActivePanel((p) =>
      p?.kind === "custom" && p.customId === customId
        ? null
        : { kind: "custom", customId },
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
    if (tutorialStep === 2) setTutorialStep(3);
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
    UNIVERSAL_AESTHETICS.some((a) => sharedMappings[a]) ||
    layers.some((l) =>
      UNIVERSAL_AESTHETICS.some((a) => l.mappings[a]),
    ) ||
    customLayers.some((c) => !c.disabled && c.ggsql.trim().length > 0);
  const isEmpty = !activeTable || !hasMappings;
  // The chart-error banner swaps "View" → "Reload page" whenever any
  // displayed error matches the unrecoverable-error list (currently the
  // "Chart error:" + "ggsql-wasm crashed" prefixes). Derived rather than a
  // ref so it auto-clears the moment the next successful render filters
  // those messages out.
  const wasmUnrecoverable = errors.some(isUnrecoverableError);

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
  const activeCustom =
    activePanel?.kind === "custom"
      ? customLayers.find((c) => c.id === activePanel.customId) ?? null
      : null;
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-app-chrome">
      {tutorialStep !== null && <TutorialOverlay step={tutorialStep} />}
      <main className="relative flex min-h-0 flex-1">
        <div className="flex min-h-0 flex-1 p-2">
            <DataPanel
              ready={ready}
              activeTable={activeTable}
              columns={columns}
              onLoadCsv={onLoadCsv}
              onLoadPenguins={onLoadPenguins}
              onResetFile={onResetFile}
            />
            {activeTable && (
              <div
                key={activeTable}
                className="flex animate-slide-in-left"
              >
                <div className="relative isolate flex">
                <BuildPanel
                  layers={layers}
                  labels={labels}
                  customLayers={customLayers}
                  activeLayerId={panelLayerId}
                  activeLabelsId={
                    activePanel?.kind === "labels"
                      ? activePanel.labelsId
                      : null
                  }
                  activeCustomId={
                    activePanel?.kind === "custom"
                      ? activePanel.customId
                      : null
                  }
                  sharedOpen={activePanel?.kind === "shared"}
                  resolvedDrawByLayerId={resolvedDrawByLayerId}
                  onToggleLayer={toggleLayerPanel}
                  onToggleLabels={toggleLabelsPanel}
                  onToggleCustom={toggleCustomPanel}
                  onToggleShared={toggleSharedPanel}
                  onAddLayer={onAddLayer}
                  onAddLabels={onAddLabels}
                  onAddCustom={onAddCustom}
                  onRemoveLayer={onRemoveLayer}
                  onRemoveLabels={onRemoveLabels}
                  onRemoveCustom={onRemoveCustom}
                  onToggleLayerDisabled={onToggleLayerDisabled}
                  onToggleLabelsDisabled={onToggleLabelsDisabled}
                  onToggleCustomDisabled={onToggleCustomDisabled}
                  onResetChart={onResetChart}
                />
                {activeLabels && activePanel?.kind === "labels" ? (
                  <LabelsPanel
                    labels={activeLabels}
                    onChange={(patch) =>
                      onUpdateLabels(activePanel.labelsId, patch)
                    }
                  />
                ) : activeCustom && activePanel?.kind === "custom" ? (
                  <CustomPanel
                    custom={activeCustom}
                    onChange={(patch) =>
                      onUpdateCustom(activePanel.customId, patch)
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
                    mappingKind={resolveMappingKind(
                      panelLayer.mappings[secondaryPanel.aes] ??
                        sharedMappings[secondaryPanel.aes],
                      columns,
                    )}
                    onChangeSettings={(s) =>
                      onChangeSettings(panelLayer.id, s)
                    }
                    onClose={closeSecondaryPanel}
                  />
                ) : null}
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
                    unrecoverable={wasmUnrecoverable}
                    onShowProblems={() => setBottomTab("problems")}
                    onReload={() => window.location.reload()}
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
                    vegaLite={<VegaSpecPanel spec={vegaSpec} />}
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
