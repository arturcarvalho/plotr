import { test, expect } from "@playwright/test";
import {
  EXAMPLE_HASH,
  TEXT_MISSING_LABEL_HASH,
  seedGettingStartedDismissed,
  stateHash,
} from "./fixtures";

test.beforeEach(async ({ page }) => {
  await seedGettingStartedDismissed(page);
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

  test("CSV import stays disabled until ggsql-wasm is ready", async ({
    page,
  }) => {
    await page.route("**/ggsql_wasm_bg.wasm", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await page.goto("/");

    const fileInput = page.locator('input[type="file"]');
    const demo = page.getByRole("button", { name: "Demo Dataset" });
    await expect(fileInput).toBeDisabled();
    await expect(demo).toBeDisabled();
    await expect(fileInput).toBeEnabled({ timeout: 10_000 });
    await expect(demo).toBeEnabled();
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

  test("Back restores settings when the resolved chart type changes", async ({
    page,
  }) => {
    const point = stateHash({
      L: [
        {
          i: "L",
          d: "auto",
          m: { x: "bill_dep", y: "body_mass" },
          s: { lw: 2 },
        },
      ],
      t: "ggsql:penguins",
      A: { k: "layer", i: "L" },
      D: { k: "settings" },
    });
    const bar = stateHash({
      L: [
        {
          i: "L",
          d: "auto",
          m: { x: "species", y: "body_mass" },
        },
      ],
      t: "ggsql:penguins",
      A: { k: "layer", i: "L" },
      D: { k: "settings" },
    });

    await page.goto(`/${point}`);
    await expect(page.locator("pre")).toContainText("linewidth => 2");
    await page.evaluate((hash) => {
      history.pushState(null, "", `/${hash}`);
      dispatchEvent(new PopStateEvent("popstate"));
    }, bar);
    await expect(page.locator("pre")).toContainText("species AS x");

    await page.goBack();
    await expect(page.locator("pre")).toContainText("bill_dep AS x");
    await expect(page.locator("pre")).toContainText("linewidth => 2");
  });

  test("URL restoration cancels a pending debounced filter commit", async ({
    page,
  }) => {
    const first = stateHash({
      L: [
        {
          i: "L",
          d: "point",
          m: { x: "bill_dep", y: "body_mass" },
          s: { flt: "species = 'Adelie'" },
        },
      ],
      t: "ggsql:penguins",
      A: { k: "layer", i: "L" },
    });
    const restored = stateHash({
      L: [
        {
          i: "L",
          d: "point",
          m: { x: "bill_dep", y: "body_mass" },
          s: { flt: "species = 'Chinstrap'" },
        },
      ],
      t: "ggsql:penguins",
      A: { k: "layer", i: "L" },
    });

    await page.goto(`/${first}`);
    const filter = page.getByPlaceholder("species = 'Adelie'");
    await filter.fill("species = 'Gentoo'");
    await page.evaluate((hash) => {
      history.pushState(null, "", `/${hash}`);
      dispatchEvent(new PopStateEvent("popstate"));
    }, restored);
    await page.waitForTimeout(700);
    await expect(page.locator("pre")).toContainText("species = 'Chinstrap'");
    await expect(page.locator("pre")).not.toContainText("species = 'Gentoo'");
  });

  test("switching layers cancels a pending debounced owner edit", async ({
    page,
  }) => {
    const first = stateHash({
      L: [
        { i: "L1", d: "point", m: { x: "bill_dep", y: "body_mass" } },
        { i: "L2", d: "point", m: { x: "bill_dep", y: "body_mass" } },
      ],
      t: "ggsql:penguins",
      A: { k: "layer", i: "L1" },
    });
    const second = stateHash({
      L: [
        { i: "L1", d: "point", m: { x: "bill_dep", y: "body_mass" } },
        { i: "L2", d: "point", m: { x: "bill_dep", y: "body_mass" } },
      ],
      t: "ggsql:penguins",
      A: { k: "layer", i: "L2" },
    });

    await page.goto(`/${first}`);
    await page.getByPlaceholder("species = 'Adelie'").fill("species = 'Gentoo'");
    await page.evaluate((hash) => {
      history.pushState(null, "", `/${hash}`);
      dispatchEvent(new PopStateEvent("popstate"));
    }, second);
    await page.waitForTimeout(700);
    await expect(page.locator("pre")).not.toContainText("FILTER");
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

test.describe("missing required aesthetics", () => {
  test("a layer missing a required aesthetic is skipped with a warning", async ({
    page,
  }) => {
    await page.goto(`/${TEXT_MISSING_LABEL_HASH}`);
    // The healthy scatter layer still renders — no chart-replacing error.
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Chart error")).toHaveCount(0);

    // The amber banner floats over the top of the (still rendering) chart.
    await expect(
      page.getByText("Layer not shown yet", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "You need to drag a variable to the Label to see the Text labels",
      ),
    ).toBeVisible();

    const ggsql = page.locator("pre");
    await expect(ggsql).toContainText("DRAW point");
    await expect(ggsql).not.toContainText("DRAW text");

    // Amber badge on the Problems tab; opening it shows the same warning
    // again (banner + problems row).
    const problemsTab = page.getByRole("button", { name: /Problems/ });
    await expect(problemsTab).toContainText("1");
    await problemsTab.click();
    await expect(
      page.getByText(
        "You need to drag a variable to the Label to see the Text labels",
      ),
    ).toHaveCount(2);
  });
});

test.describe("data tab", () => {
  test("shows the top 100 rows with working sort and search", async ({
    page,
  }) => {
    await page.goto(`/${EXAMPLE_HASH}`);
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Data", exact: true }).click();

    // 100-row preview of the 344-row penguins table.
    await expect(page.getByText("first 100 of 344 rows")).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "species", exact: true }),
    ).toBeVisible();

    // Sorting: asc then desc on the numeric bill_dep column flips the top value.
    const headers = page.locator("thead th");
    const idx = await headers.evaluateAll((ths) =>
      ths.findIndex((th) => th.textContent?.startsWith("bill_dep")),
    );
    const firstCell = page.locator("tbody tr").first().locator("td").nth(idx);
    await headers.nth(idx).click();
    const ascVal = Number(await firstCell.innerText());
    await headers.nth(idx).click();
    const descVal = Number(await firstCell.innerText());
    expect(ascVal).toBeLessThan(descVal);

    // Search filters rows; a no-match query shows the empty state.
    await page.getByLabel("Search rows").fill("zzz_no_match");
    await expect(page.getByText("0 of 100 rows")).toBeVisible();
    await expect(page.getByText("No matching rows.")).toBeVisible();
  });
});

test.describe("numeric setting defaults", () => {
  test("typing the default unsets it; a non-default emits and clamps", async ({
    page,
  }) => {
    await page.goto(`/${EXAMPLE_HASH}`);
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
    // The first (scatter/point) layer's panel auto-opens; the header actions
    // appear on hover, then the chevron opens the chart-type settings.
    await page.getByText("Scatter plot", { exact: true }).hover();
    await page
      .getByRole("button", { name: "Open chart settings" })
      .first()
      .click();

    // Empty field advertises the ggsql default as its placeholder; locate by
    // it since it stays stable as the value changes.
    const linewidth = page.getByPlaceholder("default (1)");
    await expect(linewidth).toBeVisible();

    const ggsql = page.locator("pre");
    // A non-default value is emitted after the debounce (no Enter needed).
    await linewidth.fill("2");
    await expect(ggsql).toContainText("linewidth => 2");

    // Typing point's default (1) removes it from the query and clears the field.
    await linewidth.fill("1");
    await expect(ggsql).not.toContainText("linewidth =>");
    await expect(linewidth).toHaveValue("");
  });
});

test.describe("clamp notice", () => {
  test("an out-of-range value clamps to the limit and says so", async ({
    page,
  }) => {
    await page.goto(`/${EXAMPLE_HASH}`);
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
    // The fixture restores the Opacity aesthetic panel; Fixed opacity is
    // bounded 0–1, so an over-range entry clamps with a notice.
    const opacity = page.getByPlaceholder("default (0.8)");
    await expect(opacity).toBeVisible();
    await opacity.fill("5");
    await expect(page.getByText("Limited to 1 (max 1)")).toBeVisible();
    await expect(opacity).toHaveValue("1");
  });
});

test.describe("fill color panel", () => {
  test("discrete mapping shows palette mode, reverse + no-fill switches", async ({
    page,
  }) => {
    await page.goto(`/${EXAMPLE_HASH}`);
    await expect(chartMark(page)).toBeVisible({ timeout: 15_000 });
    // Open the Fill color aesthetic panel (species is a discrete mapping).
    await page.getByText("Fill color", { exact: true }).click();

    await expect(page.getByText("Palette", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("ggsql10", { exact: false }).first()).toBeVisible();

    const ggsql = page.locator("pre");
    // Reverse palette switch → bare SCALE fill reverse.
    await page.getByRole("switch", { name: "Reverse palette" }).click();
    await expect(ggsql).toContainText("SCALE fill SETTING reverse => true");

    // No fill switch (footer, in every mode) → fill => null.
    await page.getByRole("switch", { name: "No fill color" }).click();
    await expect(ggsql).toContainText("fill => null");
  });
});
