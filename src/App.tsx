import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import vegaEmbed from "vega-embed";
import { Warn } from "vega";
import {
  ggsql,
  type ColumnInfo,
  type ColumnKind,
  type SqlResult,
} from "./lib/ggsql";
import {
  AESTHETICS,
  AUTO,
  buildQuery,
  FACETS,
  layerDrawClause,
  missingRequiredWarnings,
  UNIVERSAL_AESTHETICS,
  type Aes,
  type CustomLayer,
  type LabelsLayer,
  type Layer,
  type LayerSettings,
  type ProjectSettings,
  type ScaleSettings,
} from "./lib/buildQuery";
import {
  convertLayerToCustom,
  decrementPositionsAfter,
  reorderStrip,
} from "./lib/layerOrder";
import {
  columnAxisKind,
  compatibleDraws,
  resolveDraw,
  resolveMappingKind,
} from "./lib/autoChart";
import {
  deserialize,
  isEmptyState,
  serialize,
  type ActivePanel,
  type Persisted,
  type SecondaryPanel,
} from "./lib/persist";
import { clearLastCsv, loadLastCsv, saveLastCsv } from "./lib/csvStore";
import { normalizeCsvHeader } from "./lib/csvNormalize";
import { countConfiguredVariables } from "./lib/configSummary";
import {
  dropAllRenderErrors,
  dropStaleChartErrors,
  isUnrecoverableError,
  isWasmCrashError,
} from "./lib/errorClass";
import { BuildPanel } from "./components/BuildPanel";
import { ChartPanel } from "./components/ChartPanel";
import { ChartTypePanel } from "./components/ChartTypePanel";
import { DataPanel } from "./components/DataPanel";
import { DataTablePanel } from "./components/DataTablePanel";
import { GGSQLPanel } from "./components/GGSQLPanel";
import { VegaSpecPanel } from "./components/VegaSpecPanel";
import { CustomPanel } from "./components/CustomPanel";
import { LabelsPanel } from "./components/LabelsPanel";
import { MappingPanel } from "./components/MappingPanel";
import {
  SHARED_MAPPINGS_KEY,
  SharedMappingsPanel,
} from "./components/SharedMappingsPanel";
import { NoDataCard, Viz } from "./components/Viz";
import { ProblemsPanel } from "./components/ProblemsPanel";
import { TutorialOverlay } from "./components/Tutorial";
import { isSeen, markSeen } from "./lib/tutorial";
import { BottomTabs, type Tab as BottomTab } from "./components/BottomTabs";

// Debounce window for chart re-renders. Rapid input (slider drags, text typing)
// resets the timer on every change; the chart only renders once the user pauses
// for this long. Live preview is sacrificed for zero ggsql.execute calls during
// active scrubbing — important because ggsql-wasm OOBs on rapid execute,
// especially with multi-layer queries. Lower = quicker post-pause render, more
// renders; higher = slower preview but cheaper. Tune here when the feel is off.
const CHART_DEBOUNCE_MS = 200;

const newId = () => Math.random().toString(36).slice(2, 9);

const initialLayer = (): Layer => ({
  id: newId(),
  draw: AUTO,
  mappings: {},
});

const initialCustom = (position: number): CustomLayer => ({
  id: newId(),
  ggsql: "",
  position,
});

export default function App() {
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  // First 100 rows of the active table, for the bottom Data tab.
  const [dataPreview, setDataPreview] = useState<SqlResult | null>(null);
  // Additive in-memory cache of column name → kind. Seeded each time a table's
  // schema lands so the no-data card can still render type badges after the
  // user resets the file. Never pruned mid-session; lost only on full page
  // reload.
  const [columnKindsCache, setColumnKindsCache] = useState<
    Record<string, ColumnKind>
  >({});
  const [layers, setLayers] = useState<Layer[]>(() => [initialLayer()]);
  const [labels, setLabels] = useState<LabelsLayer[]>(() => []);
  const [customLayers, setCustomLayers] = useState<CustomLayer[]>([]);
  const [project, setProject] = useState<ProjectSettings>({});
  // Chart-level scale settings (axis format/breaks + fill/stroke palettes).
  // Single source of truth — shown in every layer's axis/colour panel.
  const [scales, setScales] = useState<ScaleSettings>({});
  const [sharedMappings, setSharedMappings] = useState<
    Partial<Record<Aes, string>>
  >({});
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [tutorialStep, setTutorialStep] = useState<1 | 2 | 3 | null>(() =>
    isSeen() ? null : 1,
  );
  const [secondaryPanel, setSecondaryPanel] = useState<SecondaryPanel>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>("ggsql");
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

  // Hydrate from URL hash on mount, then auto-open the first layer's panel.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await deserialize(
        typeof window !== "undefined" ? window.location.hash : "",
      );
      if (cancelled) return;
      let firstLayerId: string | null = layers[0]?.id ?? null;
      let restoredActivePanel: ActivePanel | undefined;
      let restoredSecondaryPanel: SecondaryPanel | undefined;
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
        setScales(data.scales ?? {});
        setSharedMappings(data.sharedMappings);
        // Defer setActiveTable — a separate effect (watching `ready`) re-
        // registers the user's CSV from IndexedDB and THEN applies the name.
        if (data.activeTable) pendingActiveTableRef.current = data.activeTable;
        restoredActivePanel = data.activePanel ?? undefined;
        restoredSecondaryPanel = data.secondaryPanel ?? undefined;
        if (data.columnKindsCache) {
          setColumnKindsCache(data.columnKindsCache);
        }
      }
      // If the hash had a valid panel selection, restore it. Otherwise fall
      // back to the first-layer auto-open default (skipped during tutorial
      // step 1 so step 2 needs the user to click the layer card themselves).
      if (restoredActivePanel) {
        setActivePanel(restoredActivePanel);
        if (
          restoredSecondaryPanel &&
          restoredActivePanel.kind === "layer"
        ) {
          setSecondaryPanel(restoredSecondaryPanel);
        }
      } else if (firstLayerId && tutorialStep !== 1) {
        setActivePanel({ kind: "layer", layerId: firstLayerId });
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror persistable state into the URL hash. The work is split across two
  // effects with different write strategies:
  //   - Chart-state changes (mappings, settings, dataset, …) push history
  //     entries — with a 600 ms debounce so a burst of keystrokes coalesces
  //     into one step — so the browser Back button steps through previous
  //     chart configurations.
  //   - Panel-selection changes (which side panel is open) just replaceState,
  //     so opening/closing panels doesn't pollute the back-button history.
  // Both close over the full state and serialise the same complete payload,
  // so the URL is always a single source of truth. When an action changes
  // chart *and* panel state in one commit, the panel effect defers to the
  // chart effect (it already serialises panel state too) so the history push
  // wins deterministically instead of racing the panel effect's replaceState.
  const getPersistedState = (): Persisted => ({
    layers,
    labels,
    customLayers: customLayers.length > 0 ? customLayers : undefined,
    project,
    scales,
    sharedMappings,
    activeTable,
    activePanel,
    secondaryPanel,
    columnKindsCache:
      Object.keys(columnKindsCache).length > 0 ? columnKindsCache : undefined,
  });

  // The next URL hash for the current state, or "" when there's nothing
  // meaningful to encode — App then writes a clean URL with no `#` at all.
  const buildNextHash = async (): Promise<string> => {
    const state = getPersistedState();
    return isEmptyState(state) ? "" : "#" + (await serialize(state));
  };

  const lastChartPushTsRef = useRef(0);
  const CHART_HISTORY_DEBOUNCE_MS = 600;
  // Set by the chart-state effect when it runs, read by the panel-state effect
  // (which runs later in the same commit), then cleared by a trailing effect.
  // Lets the panel effect tell "chart state also changed this commit" — in
  // which case it stands down and lets the chart effect own the URL write.
  const chartEffectRanRef = useRef(false);

  // Chart-state effect: push to history, debounced.
  useEffect(() => {
    if (!hydrated) return;
    // Skip while `activeTable` is still being hydrated by the [ready] effect.
    // Persisting now would write a URL with `activeTable: null`, then re-write
    // it once the deferred table resolves — polluting browser history (and
    // making Back land on a spurious "no data" entry right after a reload).
    if (pendingActiveTableRef.current !== null) return;
    chartEffectRanRef.current = true;
    let cancelled = false;
    (async () => {
      const next = await buildNextHash();
      if (cancelled) return;
      if (window.location.hash === next) return;
      const url = next || window.location.pathname + window.location.search;
      const now = Date.now();
      const inDebounceWindow =
        now - lastChartPushTsRef.current < CHART_HISTORY_DEBOUNCE_MS;
      if (inDebounceWindow) {
        window.history.replaceState(null, "", url);
      } else {
        window.history.pushState(null, "", url);
      }
      lastChartPushTsRef.current = now;
    })();
    return () => {
      cancelled = true;
    };
    // `buildPersistPayload` is recreated every render but only reads from
    // state captured at call time, so omitting it from deps is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hydrated,
    layers,
    labels,
    customLayers,
    project,
    scales,
    sharedMappings,
    activeTable,
    columnKindsCache,
  ]);

  // Panel-state effect: silent URL update, never adds a history entry.
  useEffect(() => {
    if (!hydrated) return;
    // Same defer guard as the chart-state effect — `activePanel` and
    // `secondaryPanel` are set synchronously during hydration, so this effect
    // can fire while `activeTable` is still pending. Skip until it lands.
    if (pendingActiveTableRef.current !== null) return;
    // If chart state changed in this same commit, the chart effect (already
    // running, and serialising panel state too) owns the write with a history
    // push. Standing down here avoids a racing replaceState whose async gzip
    // could resolve first and swallow that back-button entry.
    if (chartEffectRanRef.current) return;
    let cancelled = false;
    (async () => {
      const next = await buildNextHash();
      if (cancelled) return;
      if (window.location.hash === next) return;
      const url = next || window.location.pathname + window.location.search;
      window.history.replaceState(null, "", url);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, activePanel, secondaryPanel]);

  // Runs after both URL-sync effects every commit, clearing the per-commit flag
  // so a later panel-only commit isn't mistaken for a combined chart+panel one.
  useEffect(() => {
    chartEffectRanRef.current = false;
  });

  // Browser Back / Forward — re-deserialise the URL into state. Both persist
  // effects above re-run after the setStates flush; their hash-already-matches
  // guards short-circuit so the popstate itself never pushes a new entry.
  const popGenRef = useRef(0);
  useEffect(() => {
    if (!hydrated) return;
    const onPop = async () => {
      const gen = ++popGenRef.current;
      const hash = window.location.hash;
      const data = await deserialize(hash);
      if (gen !== popGenRef.current) return; // a newer popstate already landed
      if (!data) {
        // A hash-less entry (clean URL) is the empty state — reset to cold
        // start. A non-empty but undecodable `s=` is malformed: keep current.
        if (!/(?:^|[#&])s=/.test(hash)) {
          setLayers([initialLayer()]);
          setLabels([]);
          setCustomLayers([]);
          setProject({});
          setScales({});
          setSharedMappings({});
          setActiveTable(null);
          setActivePanel(null);
          setSecondaryPanel(null);
          setColumnKindsCache({});
        }
        return;
      }
      setLayers(data.layers.length > 0 ? data.layers : [initialLayer()]);
      setLabels(data.labels);
      setCustomLayers(data.customLayers ?? []);
      setProject(data.project);
      setScales(data.scales ?? {});
      setSharedMappings(data.sharedMappings);
      // ggsql is ready by now (we're well past mount) so set the table name
      // directly instead of routing through `pendingActiveTableRef`.
      setActiveTable(data.activeTable);
      setActivePanel(data.activePanel ?? null);
      setSecondaryPanel(data.secondaryPanel ?? null);
      setColumnKindsCache(data.columnKindsCache ?? {});
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [hydrated]);

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
      let lastCsv: Awaited<ReturnType<typeof loadLastCsv>>;
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
      // Only select a table ggsql actually has registered (built-ins + the
      // just-re-registered CSV). Otherwise the name would be a phantom — the
      // sidebar shows it "selected" but every `SELECT * FROM <name>` throws
      // "no such table" (CSV missing from this browser's IndexedDB, a shared /
      // old URL, or the re-register failed on load). Leaving it null surfaces
      // the "No data selected — drop a CSV" card instead.
      const candidate = fromHash ?? lastCsv?.name ?? null;
      const next =
        candidate && ggsql.listTables().includes(candidate) ? candidate : null;
      setActiveTable(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    if (!activeTable) {
      setColumns([]);
      setDataPreview(null);
      return;
    }
    if (!ready) return; // wait for wasm before introspecting
    try {
      const next = ggsql.describeColumns(activeTable);
      setColumns(next);
      // execute_sql caps results at 100 rows and reports the table's real
      // total via total_rows/truncated — exactly the Data-tab preview shape.
      setDataPreview(ggsql.executeSql(`SELECT * FROM ${activeTable}`));
      // Seed the additive kind cache so the no-data card can still render
      // type badges if the user later resets the file.
      setColumnKindsCache((prev) => {
        const out = { ...prev };
        for (const col of next) out[col.name] = col.kind;
        return out;
      });
      setErrors((prev) => prev.filter((m) => !m.startsWith("Failed to inspect")));
    } catch (e) {
      setErrors((prev) => [`Failed to inspect "${activeTable}": ${e}`, ...prev]);
      setColumns([]);
      setDataPreview(null);
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
            scales,
          )
        : null,
    [
      activeTable,
      layers,
      labels,
      customLayers,
      columns,
      project,
      sharedMappings,
      scales,
    ],
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

  // Build-time warnings for layers skipped from emission (missing geom-
  // required aesthetics). Derived synchronously — not gated by the chart
  // debounce — so the amber badge tracks the dropzones' (missing) hint.
  // Vega warnings stay in the render-coupled `warnings` state; the two merge
  // only at the consumption sites.
  const layerWarnings = useMemo(
    () => missingRequiredWarnings(layers, columns, sharedMappings),
    [layers, columns, sharedMappings],
  );
  const allWarnings = useMemo(
    () => [...layerWarnings, ...warnings],
    [layerWarnings, warnings],
  );

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
      // Nothing to render → any recoverable "Chart error:" is stale (it was
      // tied to an earlier query). Drop those, but keep unrecoverable wasm-
      // crash messages, which only a successful render (after a reload) clears.
      setErrors((prev) => prev.filter(dropStaleChartErrors));
      // Vega warnings are tied to the render that produced them; with no
      // query they'd linger next to layer-skip warnings.
      setWarnings([]);
      return;
    }

    let cancelled = false;
    const runRender = async () => {
      if (cancelled) return;
      try {
        if (!ggsql.hasVisual(query)) {
          if (vizRef.current) vizRef.current.innerHTML = "";
          if (!cancelled) {
            setVegaSpec(null);
            // The query parsed (hasVisual didn't throw) but has no visual to
            // draw — clear stale recoverable chart errors, same as above.
            setErrors((prev) => prev.filter(dropStaleChartErrors));
          }
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
          // drawn a frame (e.g. after the user reloaded past a wasm crash).
          setErrors((prev) => prev.filter(dropAllRenderErrors));
          // Expose the just-rendered Vega-Lite spec to the bottom-pane tab.
          setVegaSpec(spec);
        }
      } catch (e) {
        if (cancelled) return;
        // Any failure invalidates the vega-lite tab — clear the previously
        // displayed spec back to the placeholder rather than leaving it
        // looking like the current chart.
        setVegaSpec(null);
        // Drop the stale chart so the in-place error display takes its place.
        if (vizRef.current) vizRef.current.innerHTML = "";
        if (isWasmCrashError(e)) {
          // A wasm crash corrupts the runtime's linear memory. wasm-bindgen
          // can't reset it in place — rebuilding it in-app leaves table
          // selection broken — so the only reliable recovery is a full page
          // reload, which restores everything (settings from the URL hash, the
          // CSV from IndexedDB). Warn and let the user reload rather than
          // silently resetting. The "ggsql-wasm crashed" prefix marks this
          // unrecoverable, so the chart pane shows a "Reload page" action.
          setErrors((prev) => [
            "ggsql-wasm crashed. Reload the page to recover — your chart settings and data are preserved.",
            ...prev.filter(dropAllRenderErrors),
          ]);
          return;
        }
        setErrors((prev) => [
          `Chart error: ${String(e)}`,
          ...prev.filter(dropAllRenderErrors),
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

  // Per-layer PARTITION BY columns. Stored on the layer (not its settings) so
  // they survive a chart-type switch. Adds dedupe; removing the last column
  // drops the field so the layer / URL hash stays clean.
  const onAddPartition = (layerId: string, col: string) =>
    setLayers((ls) =>
      ls.map((l) => {
        if (l.id !== layerId) return l;
        const cur = l.partition ?? [];
        return cur.includes(col) ? l : { ...l, partition: [...cur, col] };
      }),
    );

  const onRemovePartition = (layerId: string, col: string) =>
    setLayers((ls) =>
      ls.map((l) => {
        if (l.id !== layerId || !l.partition) return l;
        const next = l.partition.filter((c) => c !== col);
        return { ...l, partition: next.length ? next : undefined };
      }),
    );

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
    setScales({});
    setSharedMappings({});
    setActivePanel({ kind: "layer", layerId: layer.id });
    setSecondaryPanel(null);
  };

  const onRemoveLayer = (id: string) => {
    // Each setter runs with its own pure updater. Nesting the sibling setters
    // inside setLayers would re-enqueue them on every StrictMode double-invoke,
    // decrementing positions twice and shifting strip/DRAW slots out of place.
    // Guard a missing id so a no-op removal doesn't reset the panels either.
    const idx = layers.findIndex((l) => l.id === id);
    if (idx < 0) return;
    setLayers((ls) => ls.filter((l) => l.id !== id));
    setLabels((arr) => decrementPositionsAfter(arr, idx));
    setCustomLayers((arr) => decrementPositionsAfter(arr, idx));
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

  // Drag-reorder of the build strip: move card `activeId` to `overId`'s slot.
  // Layer array order + labels/custom positions re-derive in the pure helper;
  // reference equality lets unchanged arrays skip their state set.
  const onReorderStrip = (activeId: string, overId: string) => {
    const next = reorderStrip(layers, labels, customLayers, activeId, overId);
    if (next.layers !== layers) setLayers(next.layers);
    if (next.labels !== labels) setLabels(next.labels);
    if (next.customLayers !== customLayers) setCustomLayers(next.customLayers);
  };

  // Replace a chart layer with a custom layer holding its emitted DRAW clause,
  // in the same strip slot, and open the new custom panel. A lone pie layer
  // converts to its literal `DRAW bar …` emission — the chart-level
  // `PROJECT TO polar` follows the remaining pie layers, so it goes cartesian.
  const onConvertLayerToCustom = (id: string) => {
    const src = layers.find((l) => l.id === id);
    if (!src) return;
    const r = layerDrawClause(src, columns, sharedMappings);
    if (!r) return;
    const next = convertLayerToCustom(
      layers,
      labels,
      customLayers,
      id,
      newId(),
      r.clause,
    );
    if (!next) return;
    setLayers(next.layers);
    setLabels(next.labels);
    setCustomLayers(next.customLayers);
    setActivePanel({ kind: "custom", customId: next.custom.id });
    setSecondaryPanel(null);
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
  // Cold-start (neither a CSV nor a chart configured) keeps the right pane
  // hidden so the tutorial overlay can call the user's attention to the data
  // panel. Once they've built up a chart, the pane stays visible even after a
  // file reset — the no-data card below explains what's missing.
  const isEmpty = !activeTable && !hasMappings;
  const noData = !activeTable && hasMappings;
  const noDataVariables = useMemo(() => {
    if (!noData) return [];
    const allAes: Aes[] = [...AESTHETICS, ...FACETS];
    const names = new Set<string>();
    for (const aes of allAes) {
      const v = sharedMappings[aes];
      if (v) names.add(v);
    }
    for (const l of layers) {
      if (l.disabled) continue;
      for (const aes of allAes) {
        const v = l.mappings[aes];
        if (v) names.add(v);
      }
    }
    return [...names].map((name) => ({
      name,
      kind: columnKindsCache[name] ?? null,
    }));
  }, [noData, sharedMappings, layers, columnKindsCache]);
  // The chart-error banner swaps "View" → "Reload page" whenever any
  // displayed error matches the unrecoverable-error list (currently the
  // "Chart error:" + "ggsql-wasm crashed" prefixes). Derived rather than a
  // ref so it auto-clears the moment the next successful render filters
  // those messages out.
  const wasmUnrecoverable = errors.some(isUnrecoverableError);
  // Error text shown in place of the chart. Strip the "Chart error:" prefix
  // since the in-place display already carries that heading.
  const chartErrorText = errors
    .map((m) => m.replace(/^Chart error:\s*/, ""))
    .join("\n");

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
        <div
          className={[
            "flex min-h-0 p-2",
            // When the chart is configured but no CSV is loaded, the build/
            // chart side panels are hidden — collapse this column to fit the
            // DataPanel only so the section to the right spans all remaining
            // width and the no-data card centers across that whole strip.
            noData ? "" : "flex-1",
          ].join(" ")}
        >
            <DataPanel
              ready={ready}
              activeTable={activeTable}
              columns={columns}
              variableCount={countConfiguredVariables(layers, sharedMappings)}
              onLoadCsv={onLoadCsv}
              onLoadPenguins={onLoadPenguins}
              onResetFile={onResetFile}
              onClearChart={onResetConfig}
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
                  onReorder={onReorderStrip}
                />
                {activeLabels && activePanel?.kind === "labels" ? (
                  <LabelsPanel
                    labels={activeLabels}
                    onChange={(patch) =>
                      onUpdateLabels(activePanel.labelsId, patch)
                    }
                    onRemove={() => onRemoveLabels(activePanel.labelsId)}
                    onToggleDisabled={() =>
                      onToggleLabelsDisabled(activePanel.labelsId)
                    }
                  />
                ) : activeCustom && activePanel?.kind === "custom" ? (
                  <CustomPanel
                    custom={activeCustom}
                    onChange={(patch) =>
                      onUpdateCustom(activePanel.customId, patch)
                    }
                    onRemove={() => onRemoveCustom(activePanel.customId)}
                    onToggleDisabled={() =>
                      onToggleCustomDisabled(activePanel.customId)
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
                    onChangeSettings={(s) =>
                      onChangeSettings(panelLayer.id, s)
                    }
                    onAddPartition={(col) =>
                      onAddPartition(panelLayer.id, col)
                    }
                    onRemovePartition={(col) =>
                      onRemovePartition(panelLayer.id, col)
                    }
                    onRemove={() => onRemoveLayer(panelLayer.id)}
                    onToggleDisabled={() =>
                      onToggleLayerDisabled(panelLayer.id)
                    }
                    canConvert={
                      layerDrawClause(panelLayer, columns, sharedMappings) !==
                      null
                    }
                    onConvert={() => onConvertLayerToCustom(panelLayer.id)}
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
                    onChangeDraw={(d) => onChangeDraw(panelLayer.id, d)}
                    onChangeSettings={(s) => onChangeSettings(panelLayer.id, s)}
                    onClose={closeSecondaryPanel}
                  />
                ) : secondaryPanel?.kind === "mapping" && panelLayer ? (
                  <MappingPanel
                    aes={secondaryPanel.aes}
                    resolvedDraw={resolvedDrawByLayerId[panelLayer.id] ?? null}
                    settings={panelLayer.settings ?? {}}
                    scales={scales}
                    mappingKind={resolveMappingKind(
                      panelLayer.mappings[secondaryPanel.aes] ??
                        sharedMappings[secondaryPanel.aes],
                      columns,
                    )}
                    onChangeSettings={(s) =>
                      onChangeSettings(panelLayer.id, s)
                    }
                    onChangeScales={setScales}
                    onClose={closeSecondaryPanel}
                  />
                ) : null}
              </div>
            )}
          </div>
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-app-chrome py-2 pr-2">
          {isEmpty ? null : noData ? (
            // `-mr-2` cancels the section's `pr-2` so the card centers between
            // the left column's right edge and the actual window right edge,
            // not between the column and the chrome-padded content area.
            <div className="-mr-2 flex h-full w-full items-center justify-center p-6">
              <NoDataCard variables={noDataVariables} />
            </div>
          ) : (
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
                    errorText={chartErrorText}
                    unrecoverable={wasmUnrecoverable}
                    warnings={layerWarnings}
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
                    warningCount={allWarnings.length}
                    problems={
                      <ProblemsPanel errors={errors} warnings={allWarnings} />
                    }
                    ggsql={<GGSQLPanel query={query} />}
                    data={
                      <DataTablePanel preview={dataPreview} columns={columns} />
                    }
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
