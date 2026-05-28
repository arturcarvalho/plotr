import { useEffect, useRef, useState, type ReactNode } from "react";

export type Tab = "problems" | "ggsql" | "vega-lite";

interface Props {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  errorCount: number;
  warningCount: number;
  problems: ReactNode;
  ggsql: ReactNode;
  vegaLite: ReactNode;
}

export function BottomTabs({
  tab,
  onTabChange,
  errorCount,
  warningCount,
  problems,
  ggsql,
  vegaLite,
}: Props) {
  const prevErrorsRef = useRef(errorCount);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (errorCount > prevErrorsRef.current) {
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 1600);
      prevErrorsRef.current = errorCount;
      return () => window.clearTimeout(t);
    }
    prevErrorsRef.current = errorCount;
  }, [errorCount]);

  return (
    <div className="flex h-full flex-col bg-app-chrome">
      <div className="flex shrink-0 items-center gap-1 border-b border-stone-200 px-1">
        <TabButton active={tab === "ggsql"} onClick={() => onTabChange("ggsql")}>
          GGSQL
        </TabButton>
        <TabButton
          active={tab === "problems"}
          onClick={() => onTabChange("problems")}
        >
          Problems
          {errorCount > 0 && (
            <span
              className={[
                "ml-1.5 inline-flex items-center gap-0.5 rounded border border-red-200 bg-red-100 px-1 font-mono text-[10px] text-red-800",
                pulse ? "animate-pulse" : "",
              ].join(" ")}
            >
              <CrossIcon />
              {errorCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="ml-1 inline-flex items-center gap-0.5 rounded border border-amber-200 bg-amber-100 px-1 font-mono text-[10px] text-amber-800">
              <WarnIcon />
              {warningCount}
            </span>
          )}
        </TabButton>
        <TabButton
          active={tab === "vega-lite"}
          onClick={() => onTabChange("vega-lite")}
        >
          Vega Lite
        </TabButton>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "problems"
          ? problems
          : tab === "ggsql"
            ? ggsql
            : vegaLite}
      </div>
    </div>
  );
}

function CrossIcon() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3 2 21h20L12 3z" />
      <line x1="12" y1="10" x2="12" y2="14" />
      <line x1="12" y1="18" x2="12" y2="18" />
    </svg>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center rounded-t px-2.5 py-1 font-mono text-xs transition-colors",
        active
          ? "border-b-2 border-sky-500 text-stone-800"
          : "border-b-2 border-transparent text-stone-500 hover:text-stone-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
