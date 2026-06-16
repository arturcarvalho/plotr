import { useCallback, useEffect, useRef, useState } from "react";

/** Pauses shorter than this don't commit the value upstream. Sits on top of
 *  App's ~200 ms render debounce. */
const DEBOUNCE_MS = 400;

/** Controlled-`<input>` helper that keeps typing instant but defers the
 *  upstream `onChange` until the user pauses for `delayMs` (or blurs / presses
 *  Enter). Stops half-written values — `species =`, `2000,`, `{:num %.2` —
 *  from reaching the query and erroring the chart mid-typing.
 *
 *  Spread the returned props onto an `<input>`; read `value` for the live
 *  (typed) value. */
export function useDebouncedInput(
  value: string,
  onChange: (v: string) => void,
  delayMs = DEBOUNCE_MS,
) {
  const [local, setLocal] = useState(value);
  // The last value we pushed upstream. Used to tell our own committed value
  // (echoing back through `value`) apart from a genuine external change.
  const lastCommitted = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef(0);

  const cancelPending = useCallback(() => {
    revision.current += 1;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // Adopt external changes (reset, layer switch, URL navigation) — but ignore
  // `value` re-arriving as the value we just committed, which would clobber
  // any typing the user has done since.
  useEffect(() => {
    if (value !== lastCommitted.current) {
      cancelPending();
      lastCommitted.current = value;
      setLocal(value);
    }
  }, [value, cancelPending]);

  useEffect(
    () => () => {
      cancelPending();
    },
    [cancelPending],
  );

  const commit = (v: string) => {
    cancelPending();
    if (v === lastCommitted.current) return;
    lastCommitted.current = v;
    onChange(v);
  };

  return {
    value: local,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setLocal(v);
      cancelPending();
      const scheduledRevision = revision.current;
      timer.current = setTimeout(() => {
        if (scheduledRevision !== revision.current) return;
        commit(v);
      }, delayMs);
    },
    onBlur: () => commit(local),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") commit(local);
    },
    // Clear immediately (cancels any pending debounce and pushes "" upstream).
    clear: () => {
      setLocal("");
      commit("");
    },
  };
}
