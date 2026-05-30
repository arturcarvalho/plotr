import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  activeTable: string | null;
  variableCount: number;
  // Drops the loaded CSV (returns to the Choose-data state).
  onReplaceData: () => void;
  // Clears all layers / labels / custom / shared settings.
  onClearChart: () => void;
}

// Hover-activated ⋮ menu anchored to the header's top-right. Opens on hover,
// stays open while the pointer is over the trigger or the (portaled) panel,
// closes shortly after the pointer leaves both. Portaled to document.body so
// the wide panel never widens the fixed 252px sidebar.
export function HeaderMenu({
  activeTable,
  variableCount,
  onReplaceData,
  onClearChart,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 220);
  };
  const openNow = () => {
    cancelClose();
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const width = 300;
      // Fly out to the right of the trigger (the sidebar's top-right corner).
      // The panel's left edge sits flush against the
      // trigger's right edge — no gap for the pointer to fall into and trip
      // the close timer. Both axes clamped so it never spills past the viewport.
      const left = Math.min(rect.right, window.innerWidth - width - 8);
      // Flush to the top of the viewport.
      const top = 0;
      setPos({ left, top });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => cancelClose, []);

  const fileSubtitle = activeTable ? `Swap ${activeTable}.csv` : "No file loaded";
  const varSubtitle =
    variableCount === 0
      ? "No variables configured"
      : `${variableCount} variable${variableCount === 1 ? "" : "s"} configured`;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
        onClick={openNow}
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex shrink-0 items-center self-stretch px-4 text-stone-500 hover:bg-stone-200 hover:text-stone-800"
      >
        <KebabIcon />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            style={{ position: "fixed", left: pos.left, top: pos.top, width: 300 }}
            className="z-[60] overflow-hidden rounded-xl border border-stone-200 bg-white p-2 shadow-xl"
            role="menu"
          >
            <ActionRow
              icon={<SwapIcon />}
              title="Replace data"
              subtitle={fileSubtitle}
              disabled={!activeTable}
              onClick={onReplaceData}
            />
            <ActionRow
              icon={<EraserIcon />}
              title="Clear chart settings"
              subtitle={varSubtitle}
              disabled={variableCount === 0}
              onClick={onClearChart}
            />
            <div className="my-1.5 border-t border-stone-200" />
            <LinkRow
              icon={<GitHubIcon />}
              title="plotr on GitHub"
              subtitle="View source & report issues"
              href="https://github.com/arturcarvalho/plotr"
            />
            <LinkRow
              icon={<GlobeIcon />}
              title="ggsql.org"
              subtitle="The query language behind plotr"
              href="https://ggsql.org"
            />
            <div className="mt-2 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <span className="shrink-0 rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                Alpha
              </span>
              <span className="text-xs leading-snug text-amber-800">
                Things may change or break
              </span>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function IconTile({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
      {children}
    </span>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left enabled:hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <IconTile>{icon}</IconTile>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-stone-800">
          {title}
        </span>
        <span className="block truncate text-xs text-stone-400">{subtitle}</span>
      </span>
    </button>
  );
}

function LinkRow({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      role="menuitem"
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-stone-50"
    >
      <IconTile>{icon}</IconTile>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-sm font-semibold text-stone-800">
          <span className="truncate">{title}</span>
          <ExternalLinkIcon />
        </span>
        <span className="block truncate text-xs text-stone-400">{subtitle}</span>
      </span>
    </a>
  );
}

function KebabIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.49 12.49 12 21h7" />
      <path d="m18 7-9 9" />
      <path d="M5.5 14.5 14 6a2.83 2.83 0 0 1 4 0l1.5 1.5a2.83 2.83 0 0 1 0 4L11 20a2.83 2.83 0 0 1-4 0L5.5 18.5a2.83 2.83 0 0 1 0-4Z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-stone-400"
      aria-hidden
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
