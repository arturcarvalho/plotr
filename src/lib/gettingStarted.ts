// "Don't show this again" flag for the Getting started card. Stored in
// localStorage so it persists across reloads but doesn't pollute the URL hash
// (which is shareable app state) and doesn't bleed across devices. All access
// is wrapped — sandboxed envs that disable storage (private mode, hardened
// iframes) silently fall back to "not dismissed", which is the right default
// (cheap to re-show).

export const GETTING_STARTED_KEY = "plotr.gettingStartedDismissed";

export function isDismissed(): boolean {
  try {
    return localStorage.getItem(GETTING_STARTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismiss(): void {
  try {
    localStorage.setItem(GETTING_STARTED_KEY, "1");
  } catch {
    // Storage unavailable; the card reappears next session.
  }
}
