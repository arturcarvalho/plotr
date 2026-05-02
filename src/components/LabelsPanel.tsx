import type { Labels } from "../lib/buildQuery";

interface Props {
  labels: Labels;
  onChange: (next: Labels) => void;
  onClose: () => void;
}

export function LabelsPanel({ labels, onChange, onClose }: Props) {
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col bg-slate-50 p-1">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <header className="flex items-center justify-between px-3 py-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
            Labels
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close labels"
            title="Close"
            className="rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>
        <div className="space-y-3 p-3">
          <Input
            label="Title"
            value={labels.title ?? ""}
            onChange={(v) => onChange({ ...labels, title: v || undefined })}
          />
          <Input
            label="Subtitle"
            value={labels.subtitle ?? ""}
            onChange={(v) => onChange({ ...labels, subtitle: v || undefined })}
          />
          <div>
            <span className="mb-1 block font-mono text-xs font-semibold text-slate-700">
              Caption
            </span>
            <p className="rounded border border-amber-300 bg-amber-50 px-2 py-1 font-mono text-xs text-amber-800">
              Caption not available yet
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-xs font-semibold text-slate-700">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs text-slate-800 focus:border-sky-400 focus:outline-none"
      />
    </label>
  );
}
