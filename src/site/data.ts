// Static sample data for the explainer charts (flipper length mm × body mass g,
// 3 penguin species). The widget is a fixed illustration — this never touches
// ggsql/vega or any real dataset.

interface Peng {
  s: number; // species index 0/1/2
  x: number; // flipper length (mm)
  y: number; // body mass (g)
}

export const PENG: Peng[] = [
  { s: 0, x: 181, y: 3750 }, { s: 0, x: 186, y: 3800 }, { s: 0, x: 190, y: 3650 },
  { s: 0, x: 193, y: 3450 }, { s: 0, x: 195, y: 4400 }, { s: 0, x: 189, y: 3625 }, { s: 0, x: 184, y: 3325 },
  { s: 1, x: 192, y: 3500 }, { s: 1, x: 196, y: 3900 }, { s: 1, x: 201, y: 4050 },
  { s: 1, x: 198, y: 3700 }, { s: 1, x: 205, y: 3800 }, { s: 1, x: 203, y: 4000 },
  { s: 2, x: 211, y: 4500 }, { s: 2, x: 217, y: 5200 }, { s: 2, x: 221, y: 5400 },
  { s: 2, x: 230, y: 5700 }, { s: 2, x: 214, y: 4800 }, { s: 2, x: 219, y: 5100 }, { s: 2, x: 225, y: 5500 },
];

// mean body mass per species (for the bar variant)
export const BARS = [0, 1, 2].map((s) => {
  const g = PENG.filter((p) => p.s === s);
  return { s, v: Math.round(g.reduce((a, b) => a + b.y, 0) / g.length) };
});

// design data domains
export const XD: [number, number] = [170, 235];
export const YD: [number, number] = [2700, 6300];

interface SmoothFit {
  line: { x: number; y: number }[];
  band: { x: number; lo: number; hi: number }[];
}

// Ordinary-least-squares fit of body_mass ~ flipper with a ~95% confidence band
// (narrow at the centre, flaring at the extremes — the classic geom_smooth
// shape). Pure: same input → same output.
export function linearSmoothFit(
  points: { x: number; y: number }[],
  steps = 40,
): SmoothFit {
  const n = points.length;
  const xbar = points.reduce((s, p) => s + p.x, 0) / n;
  const ybar = points.reduce((s, p) => s + p.y, 0) / n;
  let Sxx = 0,
    Sxy = 0;
  for (const p of points) {
    const dx = p.x - xbar;
    Sxx += dx * dx;
    Sxy += dx * (p.y - ybar);
  }
  const b = Sxy / Sxx; // slope
  let sse = 0;
  for (const p of points) {
    const yh = ybar + b * (p.x - xbar);
    sse += (p.y - yh) ** 2;
  }
  const s = Math.sqrt(sse / (n - 2)); // residual std error
  const tval = 2.0; // ≈95% band
  const xs = points.map((p) => p.x);
  const xmin = Math.min(...xs),
    xmax = Math.max(...xs);
  const line: SmoothFit["line"] = [];
  const band: SmoothFit["band"] = [];
  for (let i = 0; i <= steps; i++) {
    const x = xmin + ((xmax - xmin) * i) / steps;
    const y = ybar + b * (x - xbar);
    const seMean = s * Math.sqrt(1 / n + (x - xbar) ** 2 / Sxx);
    const half = tval * seMean;
    line.push({ x, y });
    band.push({ x, lo: y - half, hi: y + half });
  }
  return { line, band };
}

export const SMOOTH: SmoothFit = linearSmoothFit(
  PENG.map((d) => ({ x: d.x, y: d.y })),
);
