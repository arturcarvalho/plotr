// SVG chart primitives for the explainer widget (ported from the handoff's
// charts.jsx). Static illustrations only — no real data engine.
import { CK } from "./tokens";
import { BARS, PENG, SMOOTH, XD, YD } from "./data";

interface Pad {
  t: number;
  r: number;
  b: number;
  l: number;
}

function frame(w: number, h: number, pad?: Pad) {
  const P = pad || { t: 14, r: 14, b: 34, l: 46 };
  const iw = w - P.l - P.r;
  const ih = h - P.t - P.b;
  return { P, iw, ih };
}

// ── Data table ──────────────────────────────────────────────────────────────
export function DataGrid({
  rows = 6,
  highlight = null,
  w = 248,
  compact = false,
}: {
  rows?: number;
  highlight?: "x" | "y" | "s" | null;
  w?: number;
  compact?: boolean;
}) {
  const cols: { k: "x" | "y" | "s"; label: string; align: "left" | "right" }[] = [
    { k: "x", label: "flipper", align: "right" },
    { k: "y", label: "mass_g", align: "right" },
    { k: "s", label: "species", align: "left" },
  ];
  const data =
    rows >= PENG.length
      ? PENG
      : Array.from({ length: rows }, (_, i) => PENG[Math.floor((i * PENG.length) / rows)]);
  const cell = (
    txt: React.ReactNode,
    align: "left" | "right",
    color: string | null,
    bold: boolean,
  ) => (
    <td
      style={{
        padding: compact ? "3px 8px" : "5px 10px",
        textAlign: align,
        color: color || CK.ink,
        fontWeight: bold ? 600 : 400,
        whiteSpace: "nowrap",
        borderBottom: `1px solid ${CK.grid}`,
      }}
    >
      {txt}
    </td>
  );
  return (
    <table
      style={{
        width: w,
        borderCollapse: "collapse",
        fontFamily: CK.mono,
        fontSize: compact ? 11 : 12,
        background: CK.paper,
        tableLayout: "fixed",
      }}
    >
      <thead>
        <tr>
          {cols.map((c) => (
            <th
              key={c.k}
              style={{
                padding: compact ? "4px 8px" : "6px 10px",
                textAlign: c.align,
                color: highlight === c.k ? "#fff" : CK.faint,
                fontWeight: 600,
                fontSize: compact ? 10 : 11,
                letterSpacing: 0.2,
                textTransform: "lowercase",
                borderBottom: `1.5px solid ${CK.line}`,
                background: highlight === c.k ? CK.map : "transparent",
                borderRadius: highlight === c.k ? "3px 3px 0 0" : 0,
              }}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((d, i) => (
          <tr key={i} style={{ background: "transparent" }}>
            {cell(d.x, "right", highlight === "x" ? CK.map : null, highlight === "x")}
            {cell(d.y.toLocaleString(), "right", highlight === "y" ? CK.map : null, highlight === "y")}
            <td
              style={{
                padding: compact ? "3px 8px" : "5px 10px",
                textAlign: "left",
                whiteSpace: "nowrap",
                borderBottom: `1px solid ${CK.grid}`,
                color: highlight === "s" ? CK.map : CK.ink,
                fontWeight: highlight === "s" ? 600 : 400,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 7,
                  borderRadius: 2,
                  background: CK.sp[d.s],
                  marginRight: 6,
                  verticalAlign: "middle",
                }}
              />
              {CK.spName[d.s]}
            </td>
          </tr>
        ))}
        <tr>
          <td colSpan={3} style={{ padding: "4px 10px", color: CK.faint, fontSize: 11 }}>
            ⋮ {PENG.length} rows
          </td>
        </tr>
      </tbody>
    </table>
  );
}

// ── Scatter ───────────────────────────────────────────────────────────────────
export function ScatterPlot({
  w = 300,
  h = 230,
  ticks = true,
  grid = true,
  colored = true,
  axisTitles = true,
  points = true,
  smooth = false,
  frame: showFrame = true,
  pad,
}: {
  w?: number;
  h?: number;
  ticks?: boolean;
  grid?: boolean;
  colored?: boolean;
  axisTitles?: boolean;
  points?: boolean;
  smooth?: boolean;
  frame?: boolean;
  pad?: Pad;
  bars?: boolean; // accepted for a uniform Plot signature; ignored
}) {
  const { P, iw, ih } = frame(w, h, pad);
  const sx = (v: number) => P.l + ((v - XD[0]) / (XD[1] - XD[0])) * iw;
  const sy = (v: number) => P.t + ih - ((v - YD[0]) / (YD[1] - YD[0])) * ih;
  const xticks = [180, 200, 220];
  const yticks = [3000, 4000, 5000, 6000];
  const bandPath = smooth
    ? SMOOTH.band.map((d, i) => `${i ? "L" : "M"}${sx(d.x).toFixed(1)} ${sy(d.hi).toFixed(1)}`).join(" ") +
      " " +
      SMOOTH.band
        .slice()
        .reverse()
        .map((d) => `L${sx(d.x).toFixed(1)} ${sy(d.lo).toFixed(1)}`)
        .join(" ") +
      " Z"
    : "";
  const linePath = smooth
    ? SMOOTH.line.map((d, i) => `${i ? "L" : "M"}${sx(d.x).toFixed(1)} ${sy(d.y).toFixed(1)}`).join(" ")
    : "";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", fontFamily: CK.mono }}>
      {grid && xticks.map((t) => <line key={"gx" + t} x1={sx(t)} x2={sx(t)} y1={P.t} y2={P.t + ih} stroke={CK.grid} strokeWidth="1" />)}
      {grid && yticks.map((t) => <line key={"gy" + t} x1={P.l} x2={P.l + iw} y1={sy(t)} y2={sy(t)} stroke={CK.grid} strokeWidth="1" />)}
      {showFrame && <line x1={P.l} x2={P.l + iw} y1={P.t + ih} y2={P.t + ih} stroke={CK.line} strokeWidth="1.5" />}
      {showFrame && <line x1={P.l} x2={P.l} y1={P.t} y2={P.t + ih} stroke={CK.line} strokeWidth="1.5" />}
      {ticks &&
        xticks.map((t) => (
          <g key={"tx" + t}>
            <line x1={sx(t)} x2={sx(t)} y1={P.t + ih} y2={P.t + ih + 4} stroke={CK.line} strokeWidth="1.5" />
            <text x={sx(t)} y={P.t + ih + 16} textAnchor="middle" fontSize="10" fill={CK.faint}>
              {t}
            </text>
          </g>
        ))}
      {ticks &&
        yticks.map((t) => (
          <g key={"ty" + t}>
            <line x1={P.l - 4} x2={P.l} y1={sy(t)} y2={sy(t)} stroke={CK.line} strokeWidth="1.5" />
            <text x={P.l - 7} y={sy(t) + 3} textAnchor="end" fontSize="10" fill={CK.faint}>
              {t / 1000}k
            </text>
          </g>
        ))}
      {smooth && <path d={bandPath} fill={CK.geom} fillOpacity="0.14" stroke="none" />}
      {smooth && <path d={linePath} fill="none" stroke={CK.geom} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
      {points &&
        PENG.map((d, i) => (
          <circle
            key={i}
            cx={sx(d.x)}
            cy={sy(d.y)}
            r="4.2"
            fill={colored ? CK.sp[d.s] : CK.faint}
            fillOpacity={colored ? 0.85 : 0.5}
            stroke={CK.paper}
            strokeWidth="1"
          />
        ))}
      {axisTitles && (
        <>
          <text x={P.l + iw / 2} y={P.t + ih + P.b - 11} textAnchor="middle" fontSize="10.5" fill={CK.ink2} fontFamily={CK.sans} fontWeight="500">
            flipper length (mm)
          </text>
          <text x={16} y={P.t + ih / 2} textAnchor="middle" fontSize="10.5" fill={CK.ink2} fontFamily={CK.sans} fontWeight="500" transform={`rotate(-90 16 ${P.t + ih / 2})`}>
            body mass (g)
          </text>
        </>
      )}
    </svg>
  );
}

// ── Bars ──────────────────────────────────────────────────────────────────────
export function BarPlot({
  w = 300,
  h = 230,
  ticks = true,
  grid = true,
  colored = true,
  axisTitles = true,
  bars = true,
  frame: showFrame = true,
  pad,
}: {
  w?: number;
  h?: number;
  ticks?: boolean;
  grid?: boolean;
  colored?: boolean;
  axisTitles?: boolean;
  bars?: boolean;
  frame?: boolean;
  pad?: Pad;
  points?: boolean; // accepted for a uniform Plot signature; ignored
  smooth?: boolean;
}) {
  const { P, iw, ih } = frame(w, h, pad);
  const ymax = 6000;
  const sy = (v: number) => P.t + ih - (v / ymax) * ih;
  const bw = (iw / 3) * 0.56;
  const step = iw / 3;
  const yticks = [2000, 4000, 6000];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", fontFamily: CK.mono }}>
      {grid && yticks.map((t) => <line key={"g" + t} x1={P.l} x2={P.l + iw} y1={sy(t)} y2={sy(t)} stroke={CK.grid} strokeWidth="1" />)}
      {showFrame && <line x1={P.l} x2={P.l + iw} y1={P.t + ih} y2={P.t + ih} stroke={CK.line} strokeWidth="1.5" />}
      {showFrame && <line x1={P.l} x2={P.l} y1={P.t} y2={P.t + ih} stroke={CK.line} strokeWidth="1.5" />}
      {ticks &&
        yticks.map((t) => (
          <g key={"ty" + t}>
            <line x1={P.l - 4} x2={P.l} y1={sy(t)} y2={sy(t)} stroke={CK.line} strokeWidth="1.5" />
            <text x={P.l - 7} y={sy(t) + 3} textAnchor="end" fontSize="10" fill={CK.faint}>
              {t / 1000}k
            </text>
          </g>
        ))}
      {bars &&
        BARS.map((d, i) => {
          const x = P.l + i * step + (step - bw) / 2;
          return (
            <g key={i}>
              <rect x={x} y={sy(d.v)} width={bw} height={P.t + ih - sy(d.v)} fill={colored ? CK.sp[d.s] : CK.faint} fillOpacity={colored ? 0.85 : 0.5} rx="1.5" />
            </g>
          );
        })}
      {ticks &&
        BARS.map((d, i) => {
          const x = P.l + i * step + (step - bw) / 2;
          return (
            <text key={"lbl" + i} x={x + bw / 2} y={P.t + ih + 15} textAnchor="middle" fontSize="10" fill={CK.faint} fontFamily={CK.mono}>
              {CK.spName[d.s]}
            </text>
          );
        })}
      {axisTitles && (
        <>
          <text x={P.l + iw / 2} y={P.t + ih + P.b - 11} textAnchor="middle" fontSize="10.5" fill={CK.ink2} fontFamily={CK.sans} fontWeight="500">
            species
          </text>
          <text x={16} y={P.t + ih / 2} textAnchor="middle" fontSize="10.5" fill={CK.ink2} fontFamily={CK.sans} fontWeight="500" transform={`rotate(-90 16 ${P.t + ih / 2})`}>
            mean body mass (g)
          </text>
        </>
      )}
    </svg>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
export function Legend({ title = "species", dir = "column" }: { title?: string; dir?: "row" | "column" }) {
  return (
    <div style={{ fontFamily: CK.sans, fontSize: 11 }}>
      <div style={{ color: CK.faint, fontWeight: 600, marginBottom: 5, fontSize: 10, letterSpacing: 0.3, textTransform: "lowercase" }}>{title}</div>
      <div style={{ display: "flex", flexDirection: dir, gap: dir === "row" ? 12 : 5 }}>
        {CK.spName.map((n, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 5, background: CK.sp[i] }} />
            <span style={{ color: CK.ink2 }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Channel mapping diagram (column → aesthetic) ─────────────────────────────
export function ChannelMap({ rows }: { rows?: { col: string; ch: string }[] }) {
  const def = rows || [
    { col: "flipper_mm", ch: "x position" },
    { col: "body_mass_g", ch: "y position" },
    { col: "species", ch: "color" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {def.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: CK.mono, fontSize: 12 }}>
          <span style={{ padding: "3px 8px", borderRadius: 4, background: CK.dataBg, color: CK.data, fontWeight: 600 }}>{r.col}</span>
          <svg width="22" height="10" style={{ flexShrink: 0 }}>
            <line x1="0" y1="5" x2="16" y2="5" stroke={CK.faint} strokeWidth="1.5" />
            <path d="M16 1 l5 4 l-5 4 z" fill={CK.faint} />
          </svg>
          <span style={{ color: CK.ink2, fontWeight: 500 }}>{r.ch}</span>
        </div>
      ))}
    </div>
  );
}
