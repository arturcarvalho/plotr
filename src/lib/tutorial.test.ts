import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isSeen, markSeen, TUTORIAL_KEY } from "./tutorial";

// Vitest runs in the node env here (no jsdom dependency); shim a minimal
// in-memory Storage so the tutorial helpers can be exercised end-to-end.
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

describe("tutorial seen flag", () => {
  it("isSeen() returns false initially", () => {
    expect(isSeen()).toBe(false);
  });

  it("isSeen() returns true after markSeen()", () => {
    markSeen();
    expect(isSeen()).toBe(true);
  });

  it("markSeen() writes the canonical value '1' under the key", () => {
    markSeen();
    expect(localStorage.getItem(TUTORIAL_KEY)).toBe("1");
  });

  it("isSeen() returns false for any non-'1' value (forward-compat)", () => {
    localStorage.setItem(TUTORIAL_KEY, "true");
    expect(isSeen()).toBe(false);
    localStorage.setItem(TUTORIAL_KEY, "0");
    expect(isSeen()).toBe(false);
    localStorage.setItem(TUTORIAL_KEY, "");
    expect(isSeen()).toBe(false);
  });

  it("isSeen() returns false when getItem throws", () => {
    (globalThis as { localStorage: Storage }).localStorage = {
      ...makeMemStorage(),
      getItem() {
        throw new Error("storage disabled");
      },
    };
    expect(isSeen()).toBe(false);
  });

  it("markSeen() doesn't throw when setItem throws", () => {
    (globalThis as { localStorage: Storage }).localStorage = {
      ...makeMemStorage(),
      setItem() {
        throw new Error("quota exceeded");
      },
    };
    expect(() => markSeen()).not.toThrow();
  });
});
