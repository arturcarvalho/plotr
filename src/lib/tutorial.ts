// First-run tutorial "seen" flag. Stored in localStorage so it persists across
// reloads but doesn't pollute the URL hash (which is shareable app state) and
// doesn't bleed across devices. All access is wrapped — sandboxed envs that
// disable storage (private mode, hardened iframes) silently fall back to "not
// seen", which is the right default (cheap to re-show).

export const TUTORIAL_KEY = "plotr.tutorialSeen";

export function isSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, "1");
  } catch {
    // Storage unavailable; user will see the tutorial again next session.
  }
}
