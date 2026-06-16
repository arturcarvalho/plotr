import { test, expect, type Page } from "@playwright/test";
import { EXAMPLE_HASH, seedGettingStartedDismissed } from "./fixtures";

// EXAMPLE_HASH hydrates a penguins chart with two layer cards:
// "Scatter plot" (DRAW point) and "Smooth line" (DRAW smooth).

test.beforeEach(async ({ page }) => {
  await seedGettingStartedDismissed(page);
});

const chartMark = (page: Page) => page.locator(".vega-embed svg path").first();
const ggsqlPre = (page: Page) => page.locator("pre");

// Drag one strip card onto another with raw mouse events. The first small
// move beats the 5px PointerSensor activation threshold; the stepped move
// keeps dnd-kit's collision detection fed with intermediate positions.
async function dragCard(page: Page, fromName: string, toName: string) {
  const from = await page
    .getByRole("button", { name: fromName })
    .boundingBox();
  const to = await page.getByRole("button", { name: toName }).boundingBox();
  if (!from || !to) throw new Error("card not visible");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 8);
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
}

test.describe("build strip", () => {
  test("drag-reorders two chart layers and persists across reload", async ({
    page,
  }) => {
    await page.goto(`/${EXAMPLE_HASH}`);
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
    await expect(ggsqlPre(page)).toContainText(/DRAW point[\s\S]*DRAW smooth/);

    await dragCard(page, "Scatter plot", "Smooth line");
    await expect(ggsqlPre(page)).toContainText(/DRAW smooth[\s\S]*DRAW point/);

    await page.reload();
    await expect(ggsqlPre(page)).toContainText(/DRAW smooth[\s\S]*DRAW point/);
  });

  test("a plain click still opens the layer panel", async ({ page }) => {
    await page.goto(`/${EXAMPLE_HASH}`);
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Smooth line" }).click();
    // The panel header shows the layer title next to the action icons.
    await expect(page.getByText("Smooth line", { exact: true })).toBeVisible();
    // Clicking anywhere on the header (here: the title) opens chart settings.
    await page.getByText("Smooth line", { exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Close chart settings" }),
    ).toBeVisible();
  });

  test("footer Hide/Show toggles the layer's DRAW emission", async ({
    page,
  }) => {
    await page.goto(`/${EXAMPLE_HASH}`);
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Smooth line" }).click();

    // The header action icons appear on hover of the header.
    await page.getByText("Smooth line", { exact: true }).hover();
    await page.getByRole("button", { name: "Hide layer" }).click();
    await expect(ggsqlPre(page)).not.toContainText("DRAW smooth");
    await page.getByRole("button", { name: "Show layer" }).click();
    await expect(ggsqlPre(page)).toContainText("DRAW smooth");
  });

  test("footer Remove deletes the layer and closes its panel", async ({
    page,
  }) => {
    await page.goto(`/${EXAMPLE_HASH}`);
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
    // The scatter panel auto-opens on hydrate; the smooth card starts closed,
    // so clicking it deterministically opens its panel.
    await page.getByRole("button", { name: "Smooth line" }).click();

    await page.getByText("Smooth line", { exact: true }).hover();
    await page.getByRole("button", { name: "Remove layer" }).click();
    await expect(ggsqlPre(page)).not.toContainText("DRAW smooth");
    await expect(
      page.getByRole("button", { name: "Smooth line" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Open chart settings" }),
    ).toHaveCount(0);
  });

  test("footer converts a chart layer to a custom layer in place", async ({
    page,
  }) => {
    await page.goto(`/${EXAMPLE_HASH}`);
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Smooth line" }).click();

    await page.getByText("Smooth line", { exact: true }).hover();
    await page
      .getByRole("button", { name: "Convert to custom layer" })
      .click();
    // The custom panel opens, pre-filled with the layer's DRAW clause.
    await expect(page.locator("textarea")).toHaveValue(/DRAW smooth/);
    // The card strip now shows a custom card instead of the smooth layer.
    await expect(
      page.getByRole("button", { name: "Custom ggsql" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Smooth line" }),
    ).toHaveCount(0);
    // The emitted query keeps the clause and the chart still renders.
    await expect(ggsqlPre(page)).toContainText("DRAW smooth");
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
  });
});
