import { useState } from "react";

/** Copy `text` to the clipboard and flash a `copied` flag for 1.2s. No-op when
 *  `text` is empty/null. Clipboard denial (insecure context, permissions) is
 *  swallowed so the UI never throws. */
export function useCopyToClipboard(text: string | null | undefined) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore — clipboard may be denied */
    }
  };

  return { copied, copy };
}
