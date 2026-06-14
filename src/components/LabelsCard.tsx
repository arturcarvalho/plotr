import { CardButton } from "./CardButton";

interface Props {
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function LabelsCard({ open, disabled, onToggle }: Props) {
  return (
    <CardButton
      active={open}
      disabled={disabled}
      onClick={onToggle}
      title="Labels"
      className="font-mono text-base font-bold"
    >
      T
    </CardButton>
  );
}
