import { chartLabel } from "../lib/buildQuery";
import { CardButton } from "./CardButton";
import { ChartIcon } from "./ChartIcon";

interface Props {
  resolvedDraw: string | null;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function LayerCard({ resolvedDraw, selected, disabled, onToggle }: Props) {
  const title = resolvedDraw ? chartLabel(resolvedDraw) : "Chart";

  return (
    <CardButton
      active={selected}
      disabled={disabled}
      onClick={onToggle}
      title={title}
    >
      {resolvedDraw ? (
        <ChartIcon draw={resolvedDraw} className="h-6 w-6" />
      ) : (
        <PlayIcon />
      )}
    </CardButton>
  );
}

function PlayIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
