import { type ReactNode } from "react";

const base =
  "flex h-10 w-10 cursor-grab items-center justify-center rounded transition-colors active:cursor-grabbing";

interface Props {
  /** Highlighted state — the card's panel is open / selected. */
  active: boolean;
  /** Dimmed (layer hidden) without blocking the drag affordance. */
  disabled: boolean;
  onClick: () => void;
  /** Used for both `title` and `aria-label`. */
  title: string;
  /** Extra utility classes (e.g. the Labels card's bold mono glyph). */
  className?: string;
  children: ReactNode;
}

/** Draggable build-pane card button (chart / labels / custom): a 40×40 toggle
 *  that highlights when `active` and dims when `disabled`. */
export function CardButton({
  active,
  disabled,
  onClick,
  title,
  className,
  children,
}: Props) {
  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={onClick}
        title={title}
        aria-label={title}
        className={[
          base,
          active
            ? "bg-stone-300 text-stone-900 hover:bg-stone-400"
            : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100",
          disabled ? "opacity-50 grayscale" : "",
          className ?? "",
        ].join(" ")}
      >
        {children}
      </button>
    </div>
  );
}
