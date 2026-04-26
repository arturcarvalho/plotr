interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function Editor({ value, onChange }: Props) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      className="h-full w-full resize-none border-0 bg-slate-50 p-4 font-mono text-sm leading-relaxed text-slate-900 focus:outline-none"
      placeholder="VISUALISE FROM ggsql:penguins DRAW bar MAPPING species AS x"
    />
  );
}
