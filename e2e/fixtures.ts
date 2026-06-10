import type { Page } from "@playwright/test";

// A known-good chart hash: penguins scatter (bill_dep × body_mass, coloured by
// species) + a smooth trend overlay. Navigating to `/${EXAMPLE_HASH}` rebuilds
// the whole chart from the URL, so tests don't need drag-and-drop. Uses the
// built-in `ggsql:penguins` table, which hydrates from the hash on its own.
export const EXAMPLE_HASH =
  "#s=H4sIAAAAAAAAE42PwU4DMQxE_2W4WqiqAFW-IXGDP0CoCo27jZpNQpxF3a7y7ygtixZxwTePnz2eCZ_gNeEF_DrBgRG9DfFhAMGCYYYSQejBE05gvDvvt1YSCGNrox23vVEFYe-8B0OT7JwoKkHbVgSvbjeEM_ieEBRc8iC10tXueHew68352077GMvhX4bz_SMYN6tLodY3QgGj6_TDc5LQDS605x5n1JtRMuhX1Ep4mue9ScmFDgTTiGR2royNeG7EHI6hJV8xp94Eu1QuL3sJYIShl-x2s9hyLMW9dylJ_gv_pFyqKqelzSgmL-a1fgFzBIVczAEAAA";

// Mark the first-run tutorial as already seen so its overlay can't intercept
// clicks. Runs before any page script on every navigation in the test.
export async function seedTutorialSeen(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("plotr.tutorialSeen", "1");
    } catch {
      /* private mode — ignore */
    }
  });
}

// Set a native <input type=range> value the way React's onChange expects
// (Playwright's fill() doesn't drive range inputs reliably).
export async function setRange(
  page: Page,
  selector: string,
  value: number,
): Promise<void> {
  await page.locator(selector).evaluate((el, v) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(el, String(v));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}
