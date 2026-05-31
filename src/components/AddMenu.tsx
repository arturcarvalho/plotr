import { useRef, useState } from "react";
import { AddLayerModal, type LayerKind } from "./AddLayerModal";

interface Props {
  onAddChart: () => void;
  onAddCustom: () => void;
  onAddLabels: () => void;
}

/** The `+` control at the bottom of the layer rail. Clicking it opens the
 *  centered Add-layer modal; confirming inserts a layer of the chosen kind. */
export function AddMenu({ onAddChart, onAddCustom, onAddLabels }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    btnRef.current?.focus();
  };

  const confirm = (kind: LayerKind) => {
    ({ chart: onAddChart, labels: onAddLabels, custom: onAddCustom })[kind]();
    close();
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(true)}
        title="Add layer"
        aria-label="Add layer"
        aria-haspopup="dialog"
        className="flex h-10 w-10 items-center justify-center rounded font-mono text-lg leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-700"
      >
        ＋
      </button>
      {open && <AddLayerModal onClose={close} onConfirm={confirm} />}
    </>
  );
}
