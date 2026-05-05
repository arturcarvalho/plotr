import { useEffect, useState, type DragEvent } from "react";
import { dragSignal } from "./dragSignal";

/**
 * True when the drag event crosses the boundary of `asideEl`. Used in
 * `onDragEnter` / `onDragLeave` handlers to ignore intra-element moves
 * between descendants (for which `relatedTarget` is also a descendant).
 */
export function crossesBoundary(
  asideEl: HTMLElement | null,
  e: DragEvent<HTMLElement>,
): boolean {
  const related = e.relatedTarget as Node | null;
  return !related || !asideEl || !asideEl.contains(related);
}

/**
 * Subscribes to `dragSignal.isDragging()` and re-renders on change.
 */
export function useDragging(): boolean {
  const [d, setD] = useState(dragSignal.isDragging());
  useEffect(
    () => dragSignal.subscribe(() => setD(dragSignal.isDragging())),
    [],
  );
  return d;
}
