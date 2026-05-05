import type { FC } from "react";
import { shortChartLabel } from "../lib/buildQuery";

interface IconProps {
  className?: string;
}

const ScatterPlot: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="18.5" cy="5.5" r=".5" fill="currentColor" />
    <circle cx="11.5" cy="11.5" r=".5" fill="currentColor" />
    <circle cx="7.5" cy="16.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="14.5" r=".5" fill="currentColor" />
    <path d="M3 3v18h18" />
  </svg>
);

const BarChart: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <rect width="4" height="12" x="15" y="5" rx="1" />
    <rect width="4" height="9" x="7" y="8" rx="1" />
  </svg>
);

const Boxplot: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M22 6V4H12v2h4v2h-4v12h4v2h-4v2h10v-2h-4v-2h4V8h-4V6Zm-8 12v-3h6v3Zm6-5h-6v-3h6Z" />
    <path d="M30 30H4a2 2 0 0 1-2-2V2h2v26h26Z" />
  </svg>
);

const Histogram: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth={4}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M6 6v36h36M14 30v4m8-12v12m8-28v28m8-20v20" />
  </svg>
);

const Heatmap: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M27 3H5a2 2 0 0 0-2 2v22a2 2 0 0 0 2 2h22a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m-8 6h-6V5h6Zm0 2v4h-6v-4Zm-8 0v4H5v-4Zm0 6v4H5v-4Zm2 0h6v4h-6Zm8-2v-4h6v4ZM5 23h6v4H5Zm16 4v-4h6v4Z" />
  </svg>
);

const LineChart: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M3 3v18h18" />
    <path d="m19 9l-5 5l-4-4l-3 3" />
  </svg>
);

const AreaChart: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 2048 1536"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M2048 1408v128H0V0h128v1408zM1664 384l256 896H256V704l448-576l576 576z" />
  </svg>
);

const TrendLine: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M3 3v18h18" />
    <path d="m19 9l-5 5l-4-4l-3 3" />
    <circle cx="11" cy="7" r=".7" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9" r=".7" fill="currentColor" stroke="none" />
    <circle cx="12" cy="17" r=".7" fill="currentColor" stroke="none" />
    <circle cx="17" cy="15" r=".7" fill="currentColor" stroke="none" />
  </svg>
);

const Violin: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 32"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M30 30H4a2 2 0 0 1-2-2V2h2v26h26Z" />
    <path d="M14.86 7.823L13 4.723V2h-2v2.723l-1.86 3.1A8 8 0 0 0 8 11.94v.122a8 8 0 0 0 1.14 4.116l1.86 3.1V26h2v-6.723l1.86-3.1A8 8 0 0 0 16 12.06v-.122a8 8 0 0 0-1.14-4.116Z" />
    <path d="M27.86 11.823L26 8.723V2h-2v6.723l-1.86 3.1A8 8 0 0 0 21 15.94v.122a8 8 0 0 0 1.14 4.116l1.86 3.1V26h2v-2.723l1.86-3.1A8 8 0 0 0 29 16.06v-.122a8 8 0 0 0-1.14-4.116Z" />
  </svg>
);

const Density: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M1 15V0H0v16h16v-1z" />
    <path d="M10 7C8 7 7.92 6 6 6C3.66 6 2 9 2 9v5h14V2c-2 0-3.86 5-6 5" />
  </svg>
);

const TextLabels: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="m292.6 407.78l-120-320a22 22 0 0 0-41.2 0l-120 320a22 22 0 0 0 41.2 15.44l36.16-96.42a2 2 0 0 1 1.87-1.3h122.74a2 2 0 0 1 1.87 1.3l36.16 96.42a22 22 0 0 0 41.2-15.44m-185.84-129l43.37-115.65a2 2 0 0 1 3.74 0l43.37 115.67a2 2 0 0 1-1.87 2.7h-86.74a2 2 0 0 1-1.87-2.7ZM400.77 169.5c-41.72-.3-79.08 23.87-95 61.4a22 22 0 0 0 40.5 17.2c8.88-20.89 29.77-34.44 53.32-34.6c32.32-.22 58.41 26.5 58.41 58.85a1.5 1.5 0 0 1-1.45 1.5c-21.92.61-47.92 2.07-71.12 4.8c-54.75 6.44-87.43 36.29-87.43 79.85c0 23.19 8.76 44 24.67 58.68C337.6 430.93 358 438.5 380 438.5c31 0 57.69-8 77.94-23.22h.06a22 22 0 1 0 44 .19v-143c0-56.18-45-102.56-101.23-102.97M380 394.5c-17.53 0-38-9.43-38-36c0-10.67 3.83-18.14 12.43-24.23c8.37-5.93 21.2-10.16 36.14-11.92c21.12-2.49 44.82-3.86 65.14-4.47a2 2 0 0 1 2 2.1C455 370.1 429.46 394.5 380 394.5" />
  </svg>
);

const ErrorBar: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M277.333 85.333H384V42.667H128v42.666h106.667v110.309C209.809 204.428 192 228.134 192 256s17.809 51.573 42.667 60.358v110.309H128v42.666h256v-42.666H277.333V316.358C302.191 307.573 320 283.866 320 256s-17.809-51.572-42.667-60.358z"
    />
  </svg>
);

const Ribbon: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 2048 1536"
    fill="currentColor"
    className={className}
    aria-hidden
  >
    <path d="M2048 1408v128H0V0h128v1408z" />
    <path d="M256 704L704 128L1280 704L1664 384L1664 1056L1280 1376L704 800L256 1376Z" />
  </svg>
);

const ReferenceLine: FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M3 3v18h18" />
    <path d="M3 10h18" strokeWidth={1} />
  </svg>
);

const ICONS: Record<string, FC<IconProps>> = {
  point: ScatterPlot,
  bar: BarChart,
  boxplot: Boxplot,
  histogram: Histogram,
  tile: Heatmap,
  line: LineChart,
  area: AreaChart,
  smooth: TrendLine,
  violin: Violin,
  density: Density,
  text: TextLabels,
  range: ErrorBar,
  ribbon: Ribbon,
  rule: ReferenceLine,
};

interface Props {
  draw: string;
  className?: string;
}

export function ChartIcon({ draw, className }: Props) {
  const Icon = ICONS[draw];
  if (Icon) return <Icon className={className} />;
  return (
    <span className="font-mono text-[11px]">{shortChartLabel(draw)}</span>
  );
}
