// Placeholder until the real walkthrough is recorded; swap in the final URL.
const TUTORIAL_VIDEO_HREF = "https://plotr.org/tutorial";

interface Props {
  // Closes the card for this session only (X button); it returns on reload.
  onClose: () => void;
  // Hides the card permanently (persisted to localStorage).
  onDontShowAgain: () => void;
}

export function GettingStartedCard({ onClose, onDontShowAgain }: Props) {
  return (
    <div className="w-[300px] rounded-lg border border-stone-300 bg-white p-4 font-mono shadow-lg">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-stone-800">Getting started</h3>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mr-1 -mt-1 px-1 text-base leading-none text-stone-400 hover:text-stone-700"
        >
          ×
        </button>
      </div>
      <a
        href={TUTORIAL_VIDEO_HREF}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-amber-300 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-400"
      >
        ▶ Watch a 2-minute tutorial
      </a>
      <p className="mt-2 text-[11px] text-center leading-snug text-stone-500">
        Runs entirely in your browser.<br/> Your data stays in your computer.
      </p>
      <div className="mt-3 border-t border-stone-200 pt-2">
        <button
          type="button"
          onClick={onDontShowAgain}
          className="text-[11px]  text-stone-500 underline hover:text-stone-700"
        >
          Don't show again
        </button>
      </div>
    </div>
  );
}
