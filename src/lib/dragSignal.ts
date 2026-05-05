// Shared signal for the chip drag-and-drop UX:
// - `dragging`     — whether some chip is actively being dragged
// - `dropAccepted` — whether the drop landed on a Dropzone (true) or escaped (false)
// Each side panel tracks its own hovered state locally, so we don't need
// to maintain a global hover counter (which is racy with bubbled dragenter
// events fired around drag-start).
let dragging = false;
let dropAccepted = false;
let cleanupActive: (() => void) | null = null;
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

export const dragSignal = {
  startDrag() {
    // Defensive: if a previous drag's window listeners are still attached
    // (e.g., startDrag fired twice without an intervening drop/dragend),
    // tear them down before installing a fresh set.
    if (cleanupActive) cleanupActive();
    dragging = true;
    dropAccepted = false;
    emit();
    if (typeof window !== "undefined") {
      // Window-level dragover preventDefault + dropEffect="move" disables
      // Chrome's ~200ms drag-image snap-back animation when dropping outside
      // any dropzone, so `dragend` fires immediately on mouse release.
      const onDragOver = (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      };
      const off = () => {
        window.removeEventListener("dragover", onDragOver);
        window.removeEventListener("dragend", off);
        window.removeEventListener("drop", off);
        cleanupActive = null;
        if (dragging) {
          dragging = false;
          emit();
        }
      };
      cleanupActive = off;
      window.addEventListener("dragover", onDragOver);
      window.addEventListener("dragend", off);
      window.addEventListener("drop", off);
    }
  },
  endDrag() {
    if (!dragging) return;
    dragging = false;
    emit();
  },
  markDropAccepted() {
    dropAccepted = true;
  },
  wasDropAccepted() {
    return dropAccepted;
  },
  isDragging() {
    return dragging;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
