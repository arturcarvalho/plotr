interface Props {
  errors: string[];
  warnings: string[];
}

export function Errors({ errors, warnings }: Props) {
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="flex h-full items-center px-4 text-xs text-slate-400">
        No problems.
      </div>
    );
  }
  return (
    <div className="h-full overflow-auto p-3 font-mono text-xs leading-relaxed">
      {errors.map((msg, i) => (
        <div
          key={`e-${i}`}
          className="mb-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-red-800"
        >
          {msg}
        </div>
      ))}
      {warnings.map((msg, i) => (
        <div
          key={`w-${i}`}
          className="mb-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800"
        >
          {msg}
        </div>
      ))}
    </div>
  );
}
