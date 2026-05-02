// Shared signal for the chip drag-and-drop UX:
// - `hoverCount`  — how many <Dropzone /> elements currently have the cursor over them
// - `dragging`    — whether some chip is actively being dragged
// - `willDelete`  — convenience: a chip is being dragged and no dropzone is hovered
let hoverCount = 0;
let dragging = false;
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

export const dragSignal = {
  enter() {
    hoverCount++;
    emit();
  },
  leave() {
    hoverCount = Math.max(0, hoverCount - 1);
    emit();
  },
  startDrag() {
    dragging = true;
    emit();
    // Install a one-shot window-level fallback: when a drop succeeds and
    // the source chip is unmounted in the same render, its own `dragend`
    // never fires. `dragend`/`drop` bubble to window so we use those.
    if (typeof window !== "undefined") {
      const off = () => {
        window.removeEventListener("dragend", off);
        window.removeEventListener("drop", off);
        dragging = false;
        hoverCount = 0;
        emit();
      };
      window.addEventListener("dragend", off);
      window.addEventListener("drop", off);
    }
  },
  endDrag() {
    dragging = false;
    hoverCount = 0;
    emit();
  },
  isDragging() {
    return dragging;
  },
  hoverCount() {
    return hoverCount;
  },
  willDelete() {
    return dragging && hoverCount === 0;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
