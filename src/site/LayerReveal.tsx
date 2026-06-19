// LayerReveal — a finished penguin scatter that a "Reveal" slider explodes into
// its Grammar-of-Graphics layers (CSS-3D isometric stack). Ported from the
// handoff's layers-demo2.jsx (interaction adapted from Josh W. Comeau's
// elevation-reveal demo). On a tool page it's embedded locked to one model with
// header / model-switcher / footer hidden.
import { type ReactNode, useEffect, useRef, useState } from "react";
import { CK, ROW_BG } from "./tokens";
import { BarPlot, ScatterPlot } from "./charts";
import { MODELS, type ModelKey, PH, PW, renderContent, withSmoothLayers } from "./models";

const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const getLS = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const setLS = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode / unavailable — session-only */
  }
};

// ── Plane (one stacked layer sheet) ─────────────────────────────────────────
function Plane({
  h,
  cen,
  gap,
  r,
  opacity,
  children,
  fill,
  accent,
  frameOn,
  baseShadow,
  hovered,
  dim,
}: {
  h: number;
  cen: number;
  gap: number;
  r: number;
  opacity: number;
  children: ReactNode;
  fill?: string;
  accent: string;
  frameOn?: boolean;
  baseShadow?: string;
  hovered: boolean;
  dim: boolean;
}) {
  const hv = hovered;
  const z = (h - cen) * gap * r + (hv ? 40 : 0);
  const lift = h * r;
  const shBase = [
    `0 ${(1 + 4 * lift).toFixed(1)}px ${(2 + 5 * lift).toFixed(1)}px hsl(42 24% 22% / ${(0.04 + 0.05 * r).toFixed(3)})`,
    `0 ${(2 + 9 * lift).toFixed(1)}px ${(5 + 14 * lift).toFixed(1)}px hsl(42 24% 22% / ${(0.04 + 0.05 * r).toFixed(3)})`,
  ].join(", ");
  const shHover = "0 26px 60px -18px hsl(42 30% 20% / .5)";
  const shadow = (baseShadow ? baseShadow + ", " : "") + (hv ? shHover : r > 0.01 ? shBase : "none");
  const frameOpacity = hv ? 1 : frameOn ? cl((r - 0.03) / 0.28) : 0;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: PW,
        height: PH,
        borderRadius: 9,
        background: fill || "transparent",
        opacity: hv ? 1 : opacity * (dim ? 0.05 : 1),
        transform: `translateZ(${z}px)`,
        boxShadow: shadow,
        transition: "opacity .18s, box-shadow .18s",
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 9,
          pointerEvents: "none",
          border: `${hv ? 2 : 1.5}px ${hv ? "solid" : frameOn ? "dashed" : "solid"} ${accent}`,
          opacity: frameOpacity,
          transition: "opacity .15s",
        }}
      />
    </div>
  );
}

// ── Legend row ──────────────────────────────────────────────────────────────
function LegendRow({
  n,
  color,
  name,
  tag,
  line,
  hovered,
  hoverBg,
  faded,
  muted,
  toggle,
  onEnter,
  onLeave,
}: {
  n: number;
  color: string;
  name: string;
  tag: string;
  line: string;
  hovered: boolean;
  hoverBg: string;
  faded: boolean;
  muted?: boolean;
  toggle?: {
    on: boolean;
    onChange: () => void;
    label: string;
  };
  onEnter: () => void;
  onLeave: () => void;
}) {
  const opacity = muted ? 0.42 : faded ? 0.32 : 1;
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        cursor: muted ? "default" : "pointer",
        position: "relative",
        opacity,
        padding: toggle ? "11px 32px 11px 9px" : "11px 9px",
        margin: "0 -9px",
        borderRadius: 9,
        backgroundColor: hovered ? hoverBg : CK.paper,
        boxShadow: hovered ? `inset 3px 0 0 ${color}` : "inset 0 0 0 transparent",
        transition: "opacity .2s, background-color .15s, box-shadow .15s",
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: 24,
          background: color,
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: CK.mono,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {n}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: CK.disp, fontSize: 16, fontWeight: 600, color, whiteSpace: "nowrap" }}>{name}</span>
          <span style={{ fontFamily: CK.mono, fontSize: 10.5, color: CK.faint, whiteSpace: "nowrap", flexShrink: 0 }}>{tag}</span>
        </div>
        <div style={{ fontSize: 12.5, color: CK.ink2, lineHeight: 1.45, marginTop: 1 }}>{line}</div>
      </div>
      {toggle ? (
        <button
          type="button"
          aria-label={toggle.label}
          aria-pressed={toggle.on}
          onClick={(e) => {
            e.stopPropagation();
            toggle.onChange();
          }}
          style={{
            position: "absolute",
            top: 9,
            right: 5,
            width: 26,
            height: 26,
            border: "none",
            borderRadius: 8,
            background: hovered || !toggle.on ? hoverBg : "transparent",
            color,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: hovered || !toggle.on ? 1 : 0.52,
            transition: "opacity .15s, background-color .15s",
          }}
        >
          {toggle.on ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
        </button>
      ) : null}
    </div>
  );
}

function EyeIcon({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
      <path d="M9.88 4.24A10.5 10.5 0 0 1 12 4c7 0 11 8 11 8a18.6 18.6 0 0 1-2.5 3.47" />
      <path d="M6.61 6.61A17.1 17.1 0 0 0 1 12s4 8 11 8a10.5 10.5 0 0 0 5.39-1.61" />
    </svg>
  );
}

function Segmented({
  value,
  onChange,
  options,
  accent,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string; mono?: boolean }[];
  accent: string;
}) {
  return (
    <div style={{ display: "inline-flex", background: CK.paper, border: `1px solid ${CK.line}`, borderRadius: 9, padding: 3, gap: 3, flexWrap: "nowrap" }}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: 6,
              padding: "7px 12px",
              fontFamily: o.mono ? CK.mono : CK.sans,
              fontSize: 12.5,
              fontWeight: 600,
              whiteSpace: "nowrap",
              backgroundColor: on ? accent : CK.grid,
              color: on ? "#fff" : CK.ink2,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const MODEL_META = {
  all: { kicker: "Grammar of Graphics · four models", heading: "One chart, four ways to slice it." },
  tools: { kicker: "ggsql ⟷ plotr", heading: "Two tools, the same chart." },
};

interface LayerRevealProps {
  models?: ModelKey[];
  storageKey?: string;
  kicker?: string;
  heading?: string;
  defaultModel?: ModelKey;
  hideHeader?: boolean;
  hideModelSwitch?: boolean;
  hideFoot?: boolean;
}

export function LayerReveal({
  models,
  storageKey = "lr2",
  kicker,
  heading,
  defaultModel,
  hideHeader,
  hideModelSwitch,
  hideFoot,
}: LayerRevealProps) {
  const KEYS: ModelKey[] = models && models.length ? models.filter((k) => MODELS[k]) : ["gog", "ggplot", "ggsql", "plotr"];
  const SK = storageKey;
  const fallback = defaultModel && KEYS.includes(defaultModel) ? defaultModel : KEYS[0];
  const [reveal, setReveal] = useState(() => {
    const v = parseFloat(getLS(SK + "-reveal") || "");
    return Number.isFinite(v) ? v : 0.62;
  });
  const [smooth, setSmooth] = useState(() => {
    const v = getLS(SK + "-smooth");
    return v === null ? true : v === "1";
  });
  const [model, setModel] = useState<ModelKey>(() => {
    const m = getLS(SK + "-model") as ModelKey | null;
    return m && MODELS[m] && KEYS.includes(m) ? m : fallback;
  });
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => setLS(SK + "-reveal", String(reveal)), [SK, reveal]);
  useEffect(() => setLS(SK + "-smooth", smooth ? "1" : "0"), [SK, smooth]);
  useEffect(() => setLS(SK + "-model", model), [SK, model]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(1000);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => setW(es[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = W < 880;
  const stageW = narrow ? W : W - 312;
  const fit = cl(Math.min(1, (stageW - 44) / PW), 0.4, 1);

  const r = reveal;
  const isBar = false;
  const M = MODELS[model];
  const Plot = isBar ? BarPlot : ScatterPlot;
  const smoothAvail = !!M.smoothLayer && !isBar;
  const smoothOn = smoothAvail && smooth;
  const layers = withSmoothLayers(model, smoothOn);
  const legendLayers = smoothAvail ? withSmoothLayers(model, true) : layers;
  const N = layers.length;
  const CEN = (N - 1) / 2;
  const GAP = N >= 6 ? 84 : M.gap;
  const stageH = narrow ? 460 : 500;
  const legendOn = cl(r / 0.22);
  const hintOn = cl((0.1 - r) / 0.1);
  const ctx = { isBar, Plot };

  const dimOf = (key: string) => hover != null && hover !== key;
  const hov = (key: string) => () => setHover(key);
  const unhov = () => setHover(null);

  const legendList = [...legendLayers].sort((a, b) => a.n - b.n);

  const META = KEYS.length <= 2 ? MODEL_META.tools : MODEL_META.all;
  const kick = kicker || META.kicker;
  const head = heading || META.heading;

  return (
    <div ref={wrapRef} style={{ fontFamily: CK.sans, color: CK.ink, maxWidth: 1080, margin: "0 auto", padding: hideHeader ? 0 : "0 24px" }}>
      {!hideHeader && (
        <>
          <div style={{ fontFamily: CK.mono, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", color: CK.faint, fontWeight: 600 }}>{kick}</div>
          <h1 style={{ fontFamily: CK.disp, fontSize: 34, fontWeight: 600, letterSpacing: -0.6, margin: "8px 0 6px" }}>{head}</h1>
          <p style={{ margin: 0, color: CK.ink2, fontSize: 14.5, lineHeight: 1.5, maxWidth: 700, minHeight: 42 }}>
            <b style={{ color: CK.ink, fontWeight: 600 }}>{M.label}</b>
            {" — "}
            {M.desc}
          </p>
        </>
      )}

      {hideModelSwitch || KEYS.length <= 1 ? null : (
        <div style={{ marginTop: hideHeader ? 0 : 18 }}>
          <Segmented
            value={model}
            onChange={(v) => {
              setModel(v as ModelKey);
              setHover(null);
            }}
            accent={CK.scale}
            options={KEYS.map((k) => ({ v: k, label: MODELS[k].label, mono: k !== "gog" }))}
          />
        </div>
      )}

      <div
        style={{
          marginTop: hideHeader && (hideModelSwitch || KEYS.length <= 1) ? 0 : 22,
          background: CK.paper,
          border: `1px solid ${CK.line}`,
          borderRadius: 16,
          boxShadow: "0 1px 2px hsl(42 24% 20% / .04), 0 18px 50px -28px hsl(42 24% 20% / .35)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 312px" }}>
          {/* stage */}
          <div
            data-layer-reveal-stage="true"
            style={{
              display: "flex",
              flexDirection: "column",
              // minHeight (not height) so the stage stretches to match a taller
              // legend column — otherwise the gradient stops short and the white
              // card shows through below it.
              minHeight: stageH,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "relative",
                flex: 1,
                minHeight: 0,
                background: `linear-gradient(180deg, ${CK.raised}, ${CK.page})`,
                perspective: 1300,
                perspectiveOrigin: "50% 44%",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: PW,
                  height: PH,
                  transform: `translate(-50%,-50%) rotateX(${56 * r}deg) rotateZ(${-38 * r}deg) scale(${(fit * (1 - 0.06 * r)).toFixed(3)})`,
                  transformStyle: "preserve-3d",
                }}
              >
                {layers.map((L, i) => {
                  const op = L.transform ? cl((r - 0.04) / 0.4) : 1;
                  return (
                    <Plane
                      key={L.key}
                      h={i}
                      cen={CEN}
                      gap={GAP}
                      r={r}
                      opacity={op}
                      fill={L.fill}
                      accent={L.color}
                      frameOn={L.frameOn}
                      baseShadow={L.baseShadow ? "0 8px 26px -14px hsl(42 30% 22% / .3)" : undefined}
                      hovered={hover === L.key}
                      dim={dimOf(L.key)}
                    >
                      {renderContent(L.render, { ...ctx, panel: L.panel })}
                    </Plane>
                  );
                })}
              </div>

              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 16,
                  textAlign: "center",
                  fontFamily: CK.mono,
                  fontSize: 12,
                  color: CK.faint,
                  opacity: hintOn,
                  pointerEvents: "none",
                }}
              >
                ↓ drag Reveal to take it apart
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${CK.line}`, padding: "16px 24px", display: "flex", alignItems: "center", gap: 14, background: CK.raised }}>
              <span style={{ fontFamily: CK.sans, fontSize: 13.5, fontWeight: 600, color: CK.ink, width: 56 }}>Reveal</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={r}
                onChange={(e) => setReveal(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: CK.scale, height: 4, cursor: "pointer" }}
              />
              <span style={{ fontFamily: CK.mono, fontSize: 13, color: CK.ink2, width: 44, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Math.round(r * 100)}%</span>
            </div>
          </div>

          {/* legend */}
          <div
            data-layer-reveal-legend="true"
            style={{
              ...(narrow ? { borderTop: `1px solid ${CK.line}` } : { borderLeft: `1px solid ${CK.line}` }),
              padding: "18px 22px",
              display: "flex",
              flexDirection: narrow ? "row" : "column",
              flexWrap: narrow ? "wrap" : "nowrap",
              gap: narrow ? "0 26px" : 0,
            }}
          >
            <div style={{ flexBasis: narrow ? "100%" : "auto", marginBottom: 8, opacity: legendOn, transition: "opacity .25s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ fontFamily: CK.mono, fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", color: CK.faint }}>{M.section}</div>
                <span style={{ flex: 1 }} />
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: CK.sans, fontSize: 10.5, color: CK.faint, whiteSpace: "nowrap" }}>
                  <EyeIcon size={12} />
                  hover to isolate
                </span>
              </div>
            </div>
            {legendList.map((L) => {
              const isSmoothRow = L.key === "smooth";
              const smoothHidden = isSmoothRow && !smoothOn;
              const hoverBg = ROW_BG[L.key] || "#f2f0ec";
              return (
                <div key={L.key} style={{ flex: narrow ? "1 1 280px" : "none", minWidth: 0 }}>
                  <LegendRow
                    n={L.n}
                    color={L.color}
                    name={L.name}
                    tag={L.tag}
                    line={L.line(isBar)}
                    hovered={!smoothHidden && hover === L.key}
                    hoverBg={hoverBg}
                    faded={dimOf(L.key)}
                    muted={smoothHidden}
                    toggle={
                      isSmoothRow
                        ? {
                            on: smoothOn,
                            onChange: () => {
                              setHover(null);
                              setSmooth(!smoothOn);
                            },
                            label: smoothOn
                              ? "Hide smooth layer"
                              : "Show smooth layer",
                          }
                        : undefined
                    }
                    onEnter={smoothHidden ? () => {} : hov(L.key)}
                    onLeave={smoothHidden ? () => {} : unhov}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!hideFoot && (
        <p style={{ marginTop: 16, color: CK.faint, fontSize: 12.5, fontFamily: CK.sans, lineHeight: 1.5, maxWidth: 700, minHeight: 36 }}>{M.foot()}</p>
      )}
    </div>
  );
}
