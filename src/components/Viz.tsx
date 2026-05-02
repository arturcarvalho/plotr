import { forwardRef } from "react";

interface Props {
  empty: boolean;
}

export const Viz = forwardRef<HTMLDivElement, Props>(({ empty }, ref) => {
  return (
    <div className="relative h-full w-full">
      <div
        ref={ref}
        className="h-full w-full overflow-hidden p-4"
      />
      {empty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-500">
          Drag variables onto the build pane to render a chart.
        </div>
      )}
    </div>
  );
});
Viz.displayName = "Viz";
