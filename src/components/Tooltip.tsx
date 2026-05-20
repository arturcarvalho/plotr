import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const TOOLTIP_W = 240;

/** Instant-appear tooltip wrapper. Wraps the trigger child + renders a
 *  positioned dark bubble on hover with no browser-throttled delay (native
 *  `title=""` waits ~500 ms before showing).
 *
 *  Position: flips horizontally near the viewport's right edge so the bubble
 *  always stays in view. Mirrors `DrawTooltip`'s pattern from
 *  `ChartTypePanel.tsx`. */
interface Props {
  text: string;
  children: ReactNode;
  /** Width cap of the bubble in px. Defaults to 240. */
  maxWidth?: number;
}

export function Tooltip({ text, children, maxWidth = TOOLTIP_W }: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  return (
    <>
      <span
        onMouseEnter={(e) => setRect(e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setRect(null)}
        className="inline-flex"
      >
        {children}
      </span>
      {rect && <TooltipBubble text={text} rect={rect} maxWidth={maxWidth} />}
    </>
  );
}

function TooltipBubble({
  text,
  rect,
  maxWidth,
}: {
  text: string;
  rect: DOMRect;
  maxWidth: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>(() => ({
    left: rect.right + 8,
    top: rect.top,
  }));
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth || maxWidth;
    const h = el.offsetHeight;
    let left = rect.right + 8;
    if (left + w > window.innerWidth - 4) {
      left = Math.max(4, rect.left - w - 8);
    }
    let top = rect.top;
    if (top + h > window.innerHeight - 4) {
      top = Math.max(4, window.innerHeight - h - 4);
    }
    setPos({ left, top });
  }, [rect, text, maxWidth]);
  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        maxWidth,
      }}
      className="pointer-events-none z-50 rounded-md bg-stone-900 px-3 py-2 font-mono text-[11px] text-stone-100 shadow-lg"
    >
      {text}
    </div>
  );
}
