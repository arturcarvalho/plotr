const TUTORIAL_VIDEO_HREF = "https://www.youtube.com/watch?v=BpmTieT5xaY";

interface Props {
  // Closes the card for this session only (X button); it returns on reload.
  onClose?: () => void;
  // Hides the card permanently (persisted to localStorage).
  onDontShowAgain?: () => void;
  // Phone-width fallback shows the same card without dismissal controls.
  dismissible?: boolean;
  // Joined phone fallback provides the outer card frame.
  framed?: boolean;
  className?: string;
}

export function GettingStartedCard({
  onClose,
  onDontShowAgain,
  dismissible = true,
  framed = true,
  className = "",
}: Props) {
  const showDismissActions = dismissible && onClose && onDontShowAgain;
  const frameClass = framed
    ? "max-w-[300px] rounded-lg border border-stone-300 bg-white shadow-lg"
    : "";
  const headerClass = showDismissActions
    ? "flex items-start justify-between"
    : "flex items-start justify-center";

  return (
    <div className={`w-full p-4 font-mono ${frameClass} ${className}`}>
      <div className={headerClass}>
        <h3 className="text-sm font-semibold text-stone-800">Getting started</h3>
        {showDismissActions ? (
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mr-1 -mt-1 px-1 text-base leading-none text-stone-400 hover:text-stone-700"
          >
            ×
          </button>
        ) : null}
      </div>
      <a
        href={TUTORIAL_VIDEO_HREF}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-amber-300 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-400"
      >
        ▶ Watch a 3-minute tutorial
      </a>
      <p className="mt-2 text-[11px] text-center leading-snug text-stone-500">
        Runs entirely in your browser.<br/> Your data stays in your computer.
      </p>
      {showDismissActions ? (
        <div className="mt-3 border-t border-stone-200 pt-2">
          <button
            type="button"
            onClick={onDontShowAgain}
            className="text-[11px]  text-stone-500 underline hover:text-stone-700"
          >
            Don't show again
          </button>
        </div>
      ) : null}
    </div>
  );
}
