import { useEffect, useState } from "react";

const STEPS = {
  1: { target: "data", label: "Choose data" },
  2: { target: "layer", label: "Select top layer with ▶ icon" },
  3: { target: "mappings", label: "Drag variables to X, Y, etc." },
} as const;

interface Props {
  step: 1 | 2 | 3;
}

export function TutorialOverlay({ step }: Props) {
  const { target, label } = STEPS[step];
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      const el = document.querySelector(
        `[data-tutorial-target="${target}"]`,
      ) as HTMLElement | null;
      if (cancelled) return;
      setRect(el ? el.getBoundingClientRect() : null);
    };
    // Defer one frame so freshly-rendered targets (e.g. layer card after data
    // pick) have laid out before we measure.
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [target, step]);

  if (!rect) return null;

  // Per-step bubble layout. Arrow always reaches the same distance from the
  // target; the bubble can sit further left to overlap the arrow's tail.
  //   bubbleLeft   horizontal offset from target.right → bubble.left edge
  //   bubbleWidth  bubble width in px
  //   bubbleTop    extra Y-nudge applied to the bubble only
  //   top          extra Y-nudge applied to BOTH bubble and arrow (keeps them
  //                glued; use this to move the whole tutorial up/down)
  //   left         extra X-nudge applied to BOTH bubble and arrow (use this to
  //                slide the whole tutorial sideways; positive shifts right)
  const LAYOUT = {
    1: { bubbleLeft: 60, bubbleWidth: 120, bubbleTop: 16, top: 10, left: 8 },
    2: { bubbleLeft: 55, bubbleWidth: 180, bubbleTop: 18, top: 10, left: 16 },
    3: { bubbleLeft: 55, bubbleWidth: 240, bubbleTop: 10, top: 25, left: -5 },
  } as const;
  const layout = LAYOUT[step];
  const ARROW_REACH = 88;

  const bubbleLeftPx = rect.right + layout.bubbleLeft + layout.left;
  // Vertically centered on target (+22 ≈ half bubble height), plus per-step nudges.
  const bubbleTopPx =
    rect.top + rect.height / 2 - 22 + layout.bubbleTop + layout.top;

  const arrowSvgLeft = rect.right + layout.left;
  // Arrow follows `top` and `left` so the whole overlay shifts together.
  const arrowSvgTop = rect.top + rect.height / 2 - 8 + layout.top;
  const arrowSvgW = ARROW_REACH;
  const arrowSvgH = 64;

  const STROKE = "#0c4a6e"; // sky-900: same color as the tooltip bubble
  const STROKE_W = 4;

  return (
    <>
      {/* Curved arrow with open-V arrowhead */}
      <svg
        style={{
          position: "fixed",
          left: arrowSvgLeft,
          top: arrowSvgTop,
          width: arrowSvgW,
          height: arrowSvgH,
          pointerEvents: "none",
          zIndex: 60,
        }}
        viewBox={`0 0 ${arrowSvgW} ${arrowSvgH}`}
        aria-hidden
      >
        <defs>
          <marker
            id={`tut-arrow-${step}`}
            markerUnits="userSpaceOnUse"
            viewBox="0 0 24 24"
            refX="22"
            refY="12"
            markerWidth="24"
            markerHeight="24"
            orient="auto"
          >
            <path
              d="M3 3 L21 12 L3 21"
              fill="none"
              stroke={STROKE}
              strokeWidth={STROKE_W}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>
        <path
          d={`M ${arrowSvgW} 8 Q ${arrowSvgW / 2} ${arrowSvgH - 8}, 10 8`}
          fill="none"
          stroke={STROKE}
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          markerEnd={`url(#tut-arrow-${step})`}
        />
      </svg>

      {/* Bubble */}
      <div
        style={{
          position: "fixed",
          left: bubbleLeftPx,
          top: bubbleTopPx,
          width: layout.bubbleWidth,
          zIndex: 60,
        }}
        className="rounded-md bg-sky-900 px-3 py-2 font-mono text-xs text-sky-50 shadow-lg"
      >
        <div className="text-[10px] uppercase tracking-wide text-sky-300">
          {step}/3
        </div>
        <div className="text-sm font-semibold leading-tight">{label}</div>
      </div>
    </>
  );
}
