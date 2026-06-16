import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dismiss, GETTING_STARTED_KEY, isDismissed } from "./gettingStarted";

// Vitest runs in the node env here (no jsdom dependency); shim a minimal
// in-memory Storage so the dismiss helpers can be exercised end-to-end.
function makeMemStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      for (const k of Object.keys(store)) delete store[k];
    },
    getItem(k: string) {
      return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
    },
    setItem(k: string, v: string) {
      store[k] = v;
    },
    removeItem(k: string) {
      delete store[k];
    },
    key(i: number) {
      return Object.keys(store)[i] ?? null;
    },
  };
}

const originalLocalStorage = (globalThis as { localStorage?: Storage })
  .localStorage;

beforeEach(() => {
  (globalThis as { localStorage: Storage }).localStorage = makeMemStorage();
});

afterEach(() => {
  if (originalLocalStorage === undefined) {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  } else {
    (globalThis as { localStorage: Storage }).localStorage =
      originalLocalStorage;
  }
});

describe("getting-started dismissed flag", () => {
  it("isDismissed() returns false initially", () => {
    expect(isDismissed()).toBe(false);
  });

  it("isDismissed() returns true after dismiss()", () => {
    dismiss();
    expect(isDismissed()).toBe(true);
  });

  it("dismiss() writes the canonical value '1' under the key", () => {
    dismiss();
    expect(localStorage.getItem(GETTING_STARTED_KEY)).toBe("1");
  });

  it("isDismissed() returns false for any non-'1' value (forward-compat)", () => {
    localStorage.setItem(GETTING_STARTED_KEY, "true");
    expect(isDismissed()).toBe(false);
    localStorage.setItem(GETTING_STARTED_KEY, "0");
    expect(isDismissed()).toBe(false);
    localStorage.setItem(GETTING_STARTED_KEY, "");
    expect(isDismissed()).toBe(false);
  });

  it("isDismissed() returns false when getItem throws", () => {
    (globalThis as { localStorage: Storage }).localStorage = {
      ...makeMemStorage(),
      getItem() {
        throw new Error("storage disabled");
      },
    };
    expect(isDismissed()).toBe(false);
  });

  it("dismiss() doesn't throw when setItem throws", () => {
    (globalThis as { localStorage: Storage }).localStorage = {
      ...makeMemStorage(),
      setItem() {
        throw new Error("quota exceeded");
      },
    };
    expect(() => dismiss()).not.toThrow();
  });
});
