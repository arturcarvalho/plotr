import { expect, test } from "@playwright/test";
import {
  EXAMPLE_HASH,
  seedGettingStartedDismissed,
} from "./fixtures";

const warningText = /plotr only works on desktop/i;
const phoneCardWidth = 390;
const gettingStarted = (page: import("@playwright/test").Page) =>
  page.getByRole("heading", { name: "Getting started" });

test.describe("phone viewport gate", () => {
  test("hides the builder but still shows Getting started on phone widths", async ({
    page,
  }) => {
    await seedGettingStartedDismissed(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.getByText(warningText)).toBeVisible();
    await expect(gettingStarted(page)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Watch a 2-minute tutorial/ }),
    ).toBeVisible();
    const cardGeometry = await page.evaluate(() => {
      const warning = document.querySelector('[aria-label="Desktop required"]');
      const gettingStartedHeading = [...document.querySelectorAll("h3")].find(
        (heading) => heading.textContent === "Getting started",
      );
      const gettingStarted = gettingStartedHeading?.parentElement?.parentElement;
      const warningRect = warning?.getBoundingClientRect();
      const gettingStartedRect = gettingStarted?.getBoundingClientRect();
      const gettingStartedHeadingRect =
        gettingStartedHeading?.getBoundingClientRect();
      const outerCardRect = warning?.closest("main")?.getBoundingClientRect();
      return {
        outerCardWidth: outerCardRect?.width ?? 0,
        warningWidth: warningRect?.width ?? 0,
        gettingStartedWidth: gettingStartedRect?.width ?? 0,
        gettingStartedHeadingOffset:
          gettingStartedRect && gettingStartedHeadingRect
            ? Math.abs(
                gettingStartedHeadingRect.left +
                  gettingStartedHeadingRect.width / 2 -
                  (gettingStartedRect.left + gettingStartedRect.width / 2),
              )
            : Number.NaN,
        warningLineCounts: [...(warning?.querySelectorAll("p") ?? [])].map(
          (paragraph) => {
            const range = document.createRange();
            range.selectNodeContents(paragraph);
            const lineCount = range.getClientRects().length;
            range.detach();
            return lineCount;
          },
        ),
        sectionGap:
          warningRect && gettingStartedRect
            ? gettingStartedRect.top - warningRect.bottom
            : Number.NaN,
      };
    });
    expect(cardGeometry.warningWidth).toBeCloseTo(
      cardGeometry.gettingStartedWidth,
      0,
    );
    expect(cardGeometry.outerCardWidth).toBeCloseTo(phoneCardWidth, 0);
    expect(cardGeometry.warningLineCounts).toEqual([1, 1]);
    expect(cardGeometry.gettingStartedHeadingOffset).toBeLessThan(1);
    expect(cardGeometry.sectionGap).toBeCloseTo(0, 0);
    await expect(page.getByText("Choose data")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Demo Dataset" }),
    ).toHaveCount(0);
  });

  test("keeps chart state hidden on phone widths even when loaded from a URL", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${EXAMPLE_HASH}`);

    await expect(page.getByText(warningText)).toBeVisible();
    await expect(gettingStarted(page)).toBeVisible();
    await expect(
      page.getByText("ggsql:penguins", { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".vega-embed")).toHaveCount(0);
  });

  test("mounts the builder when resized out of phone width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByText(warningText)).toBeVisible();

    await page.setViewportSize({ width: 768, height: 844 });
    await expect(page.getByText(warningText)).toHaveCount(0);
    await expect(page.getByText("Choose data")).toBeVisible();
  });

  test("does not create horizontal overflow on a narrow phone viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/");

    await expect(page.getByText(warningText)).toBeVisible();
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasOverflow).toBe(false);
  });
});
