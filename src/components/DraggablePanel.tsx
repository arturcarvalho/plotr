import { useRef, useState, type ReactNode } from "react";
import { crossesBoundary, useDragging } from "../lib/dragHelpers";
import { DeleteBanner } from "./DeleteBanner";

interface Props {
  children: ReactNode;
}

/** Shared 280px side-panel chrome for the build pane's chart / labels / custom /
 *  shared-variable panels: the fixed-width column, the DeleteBanner that surfaces
 *  while a layer chip is dragged outside this panel, and the bordered white card
 *  the panel's header + body render into. Each panel passes its own header and
 *  body as children. */
export function DraggablePanel({ children }: Props) {
  const asideRef = useRef<HTMLElement>(null);
  const dragging = useDragging();
  const [hovered, setHovered] = useState(false);
  return (
    <aside
      ref={asideRef}
      className="relative flex h-full w-[280px] shrink-0 flex-col bg-app-chrome"
      onDragStart={() => setHovered(true)}
      onDragEnter={(e) => {
        if (crossesBoundary(asideRef.current, e)) setHovered(true);
      }}
      onDragLeave={(e) => {
        if (crossesBoundary(asideRef.current, e)) setHovered(false);
      }}
    >
      <DeleteBanner show={dragging && !hovered} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-y border-r border-stone-300 bg-white">
        {children}
      </div>
    </aside>
  );
}
