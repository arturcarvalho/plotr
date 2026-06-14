import { CardButton } from "./CardButton";

interface Props {
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
}

export function CustomCard({ open, disabled, onToggle }: Props) {
  return (
    <CardButton
      active={open}
      disabled={disabled}
      onClick={onToggle}
      title="Custom ggsql"
    >
      <PencilIcon />
    </CardButton>
  );
}

// Filled single-color quill/pencil glyph for the Custom Layer.
function PencilIcon() {
  return (
    <svg
      width="18"
      height="21"
      viewBox="0 0 700 820"
      fill="currentColor"
      aria-hidden
    >
      <path d="M626 70q25 25 41 52t23 52t4 46t-17 36L389 544L288 646L0 696l51-287l101-102L440 19q14-14 36-17t47 4t52 23t51 41M259 602q-12-20-30-44t-43-48t-48-43t-44-30L76 542q21 15 42.5 36.5T154 621z" />
    </svg>
  );
}
