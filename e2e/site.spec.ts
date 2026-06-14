import { test, expect } from "@playwright/test";
import { setRange } from "./fixtures";

test.describe("explainer site", () => {
  test("About page renders and the example CTA points into the builder", async ({
    page,
  }) => {
    await page.goto("/about");
    await expect(
      page.getByRole("heading", { name: "A ggsql chart builder" }),
    ).toBeVisible();
    await expect(page.getByText("How does it work?")).toBeVisible();
    await expect(page.getByText("Variables", { exact: true })).toBeVisible();
    await expect(page.getByText("Chart", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Play with an example/ }),
    ).toHaveAttribute("href", /^\/#s=/);
  });

  test("lists the three tools and the external links", async ({ page }) => {
    await page.goto("/about");
    for (const id of ["ggsql", "plotr", "ggplot2"]) {
      await expect(page.locator(`a[href="/tool/${id}"]`)).toBeVisible();
    }
    await expect(
      page.getByRole("link", { name: /plotr on GitHub/ }),
    ).toHaveAttribute("href", /github\.com/);
    await expect(
      page.getByRole("link", { name: "ggsql.org" }),
    ).toHaveAttribute("href", "https://ggsql.org");
  });

  test("navigates to a tool page client-side (no full reload)", async ({
    page,
  }) => {
    await page.goto("/about");
    await page.evaluate(() => ((window as Window & { __spa?: boolean }).__spa = true));
    await page.locator('a[href="/tool/ggsql"]').first().click();
    await page.waitForURL("**/tool/ggsql");
    expect(
      await page.evaluate(
        () => (window as Window & { __spa?: boolean }).__spa,
      ),
    ).toBe(true);
    await expect(page.locator('input[type="range"]')).toBeVisible();
  });

  test("Layer-Reveal: slider drives the %, smooth toggle adds/removes the trend layer", async ({
    page,
  }) => {
    await page.goto("/tool/ggsql");
    const slider = 'input[type="range"]';
    await expect(page.locator(slider)).toBeVisible();

    await setRange(page, slider, 0);
    await expect(page.getByText("0%")).toBeVisible();
    await setRange(page, slider, 0.95);
    await expect(page.getByText("95%")).toBeVisible();
    await expect(
      page.locator("pre").getByText("SELECT", { exact: true }),
    ).toBeVisible();

    // smooth is on by default → the trend layer is in the legend; toggling removes it
    const toggle = page.locator("button[aria-pressed]");
    await expect(page.getByText("DRAW smooth", { exact: true })).toBeVisible();
    await toggle.click();
    await expect(page.getByText("DRAW smooth", { exact: true })).toHaveCount(0);
  });

  test("tool page footer steps to the previous / next tool; hides at the ends", async ({
    page,
  }) => {
    // Middle tool: both links present, Previous → plotr (not About).
    await page.goto("/tool/ggsql");
    await expect(
      page.getByRole("link", { name: /Previous/ }),
    ).toHaveAttribute("href", "/tool/plotr");
    await expect(page.getByRole("link", { name: /Next/ })).toHaveAttribute(
      "href",
      "/tool/ggplot2",
    );

    // First tool: no Previous; Next → ggsql.
    await page.goto("/tool/plotr");
    await expect(page.getByRole("link", { name: /Previous/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Next/ })).toHaveAttribute(
      "href",
      "/tool/ggsql",
    );

    // Last tool: no Next; Previous → ggsql.
    await page.goto("/tool/ggplot2");
    await expect(page.getByRole("link", { name: /Next/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Previous/ })).toHaveAttribute(
      "href",
      "/tool/ggsql",
    );
  });

  test("legacy /tools resolves to About; the brand returns to the builder", async ({
    page,
  }) => {
    await page.goto("/tools");
    await expect(
      page.getByRole("heading", { name: "A ggsql chart builder" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "plotr", exact: true }),
    ).toHaveAttribute("href", "/");
  });
});
