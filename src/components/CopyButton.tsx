import { useCopyToClipboard } from "../lib/useCopyToClipboard";
import { CheckIcon, CopyIcon } from "./icons";

interface Props {
  /** Text copied to the clipboard. The button is disabled while empty/null. */
  text: string | null | undefined;
  /** Noun for the tooltip/aria-label, e.g. "ggsql" → "Copy ggsql". */
  label: string;
}

/** Panel-header copy-to-clipboard button: a copy glyph that flips to a check
 *  for 1.2s after a successful copy. */
export function CopyButton({ text, label }: Props) {
  const { copied, copy } = useCopyToClipboard(text);
  return (
    <button
      type="button"
      onClick={copy}
      disabled={!text}
      aria-label={copied ? "Copied" : `Copy ${label}`}
      title={copied ? "Copied" : `Copy ${label}`}
      className="rounded p-0.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}
