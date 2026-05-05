import type { ReactNode } from "react";

interface Props {
  step1Done: boolean;
}

export function Tutorial({ step1Done }: Props) {
  return (
    <div>
      <h2 className="flex h-[52px] items-center font-mono text-sm font-semibold text-stone-800">
        Get started
      </h2>
      <ol className="mt-3 space-y-3">
        <Step done={step1Done} index={1}>
          Choose data
        </Step>
        <Step done={false} index={2}>
          Drag data to X, Y, etc. to render a chart
        </Step>
      </ol>
    </div>
  );
}

function Step({
  done,
  index,
  children,
}: {
  done: boolean;
  index: number;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 font-mono text-sm">
      <span
        className={[
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
          done
            ? "border-emerald-300 bg-emerald-100 text-emerald-700"
            : "border-stone-300 bg-white text-stone-500",
        ].join(" ")}
      >
        {done ? <CheckIcon /> : index}
      </span>
      <span className={done ? "text-stone-500 line-through" : "text-stone-800"}>
        {children}
      </span>
    </li>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
