import { forwardRef } from "react";

interface Props {
  empty: boolean;
}

export const Viz = forwardRef<HTMLDivElement, Props>(({ empty }, ref) => {
  return (
    <div className="relative h-full w-full">
      <div
        ref={ref}
        className="flex h-full w-full items-center justify-center overflow-auto p-4"
      />
      {empty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-500">
          Enter a query to visualise.
        </div>
      )}
    </div>
  );
});
Viz.displayName = "Viz";
