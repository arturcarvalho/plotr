import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  onAddChart: () => void;
  onAddCustom: () => void;
  onAddLabels: () => void;
}

export function AddMenu({ onAddChart, onAddCustom, onAddLabels }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<
    | { left: number; top: number }
    | { left: number; bottom: number }
    | null
  >(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        !btnRef.current?.contains(t) &&
        !menuRef.current?.contains(t)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const estDropdownHeight = 100;
      const fitsBelow =
        window.innerHeight - rect.bottom >= estDropdownHeight + 8;
      setPos(
        fitsBelow
          ? { left: rect.left, top: rect.bottom + 4 }
          : { left: rect.left, bottom: window.innerHeight - rect.top + 4 },
      );
    }
    setOpen(true);
  };

  const pick = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title="Add"
        aria-label="Add"
        className="flex h-10 w-10 items-center justify-center rounded font-mono text-lg leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-700"
      >
        ＋
      </button>
      {open && pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", ...pos }}
            className="z-[60] w-32 overflow-hidden rounded border border-stone-300 bg-white shadow-md"
          >
            <button
              type="button"
              onClick={pick(onAddChart)}
              className="block w-full px-3 py-1.5 text-left font-mono text-xs text-stone-700 hover:bg-stone-100"
            >
              Chart
            </button>
            <button
              type="button"
              onClick={pick(onAddCustom)}
              className="block w-full px-3 py-1.5 text-left font-mono text-xs text-stone-700 hover:bg-stone-100"
            >
              Custom
            </button>
            <button
              type="button"
              onClick={pick(onAddLabels)}
              className="block w-full px-3 py-1.5 text-left font-mono text-xs text-stone-700 hover:bg-stone-100"
            >
              Labels
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
