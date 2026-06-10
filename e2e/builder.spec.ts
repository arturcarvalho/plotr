import { test, expect } from "@playwright/test";
import { EXAMPLE_HASH, seedTutorialSeen } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await seedTutorialSeen(page);
});

// A rendered chart = at least one Vega mark path in the chart pane.
const chartMark = (page: import("@playwright/test").Page) =>
  page.locator(".vega-embed svg path").first();

test.describe("chart builder", () => {
  test("cold start shows the data panel and a clean URL", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Choose data")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Demo Dataset" }),
    ).toBeVisible();
    expect(page.url()).not.toContain("#s=");
  });

  test("loading the demo dataset persists state to the URL", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Demo Dataset" }).click();
    await expect(
      page.getByText("ggsql:penguins", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("species", { exact: true }).first()).toBeVisible();
    await expect.poll(() => page.url()).toContain("#s=");
  });

  test("hydrates a chart from the URL hash and renders it with the right ggsql", async ({
    page,
  }) => {
    await page.goto(`/${EXAMPLE_HASH}`);
    await expect(
      page.getByText("ggsql:penguins", { exact: true }),
    ).toBeVisible();
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Chart error")).toHaveCount(0);

    const ggsql = page.locator("pre");
    await expect(ggsql).toContainText("FROM ggsql:penguins");
    await expect(ggsql).toContainText("DRAW point");
    await expect(ggsql).toContainText("bill_dep AS x");
  });

  test("the Copy button flips to “Copied” and writes the query to the clipboard", async ({
    page,
  }) => {
    await page.goto(`/${EXAMPLE_HASH}`);
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Copy ggsql").click();
    await expect(page.getByLabel("Copied")).toBeVisible();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain("FROM ggsql:penguins");
  });

  test("the Vega Lite tab shows the generated spec", async ({ page }) => {
    await page.goto(`/${EXAMPLE_HASH}`);
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Vega Lite" }).click();
    await expect(page.locator("pre")).toContainText(
      /"(mark|encoding|layer|data)"/,
    );
  });

  test("URL state survives reload; Back/Forward toggle the chart", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Demo Dataset" }).click();
    await expect.poll(() => page.url()).toContain("#s=");

    await page.reload();
    await expect(
      page.getByText("ggsql:penguins", { exact: true }),
    ).toBeVisible();

    await page.goBack();
    await expect.poll(() => page.url()).not.toContain("#s=");
    await expect(page.getByText("Choose data")).toBeVisible();

    await page.goForward();
    await expect(
      page.getByText("ggsql:penguins", { exact: true }),
    ).toBeVisible();
  });

  test("the ⋮ menu links to the About page", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Menu").click();
    await page.getByRole("menuitem", { name: /About plotr/ }).click();
    await page.waitForURL("**/about");
    await expect(
      page.getByRole("heading", { name: "A ggsql chart builder" }),
    ).toBeVisible();
  });

  test("Replace data drops the table and shows the no-data card", async ({
    page,
  }) => {
    await page.goto(`/${EXAMPLE_HASH}`);
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Menu").click();
    await page.getByRole("menuitem", { name: /Replace data/ }).click();
    await expect(page.getByText("No data selected")).toBeVisible();
  });

  test("Clear chart settings empties the chart", async ({ page }) => {
    await page.goto(`/${EXAMPLE_HASH}`);
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Menu").click();
    await page.getByRole("menuitem", { name: /Clear chart settings/ }).click();
    await expect(page.locator("pre")).not.toContainText("DRAW point");
  });
});
