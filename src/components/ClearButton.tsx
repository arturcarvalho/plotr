/** Uniform inline "clear" button shown beside any settings control once it
 *  holds a value — clicking removes the value (resetting to ggsql's default
 *  where one exists). Replaces the assorted `×` / `set` / full-width `Clear`
 *  affordances so clearing is the same everywhere. */
export function ClearButton({
  onClick,
  title = "Clear",
}: {
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded px-1 font-mono text-[10px] text-stone-500 hover:bg-stone-100 hover:text-stone-700"
    >
      clear
    </button>
  );
}
