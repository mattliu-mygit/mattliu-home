import { expect, test } from "@playwright/test";

const overlaps = (
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) =>
  first.x + first.width > second.x &&
  first.x < second.x + second.width &&
  first.y + first.height > second.y &&
  first.y < second.y + second.height;

test("desktop tabs move between two intentional constellations", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("tab", { name: "Projects" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("button", { name: /^Explore / }),
  ).toHaveCount(5);

  const quietZone = await page.locator(".quiet-zone").boundingBox();
  expect(quietZone).not.toBeNull();
  const projectLabels = page.locator(
    "#panel-projects .constellation-star__copy",
  );
  const collisions: number[] = [];
  for (let index = 0; index < (await projectLabels.count()); index += 1) {
    const label = await projectLabels.nth(index).boundingBox();
    if (label && overlaps(label, quietZone!)) {
      collisions.push(index);
    }
  }
  expect(collisions).toEqual([]);

  await page.getByRole("tab", { name: "Quotes" }).click();
  await expect(page.getByRole("tabpanel", { name: "Quotes" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Read quote:/ }),
  ).toHaveCount(7);

  await page
    .getByRole("button", { name: "Read quote: Strong opinions, weakly held." })
    .click();
  await expect(page.locator(".quote-readout blockquote")).toHaveText(
    "Strong opinions, weakly held.",
  );
  await expect(page.locator(".quote-readout figcaption")).toHaveText(
    "Paul Saffo",
  );
});

test("scroll produces bounded constellation rotation and zoom", async ({
  page,
}) => {
  await page.goto("/");
  const stage = page.locator(".universe-stage");
  await expect(stage).toHaveAttribute("data-scroll-progress", "0.000");

  const initialTransform = await page
    .locator(".constellation-map__plane")
    .evaluate((element) => getComputedStyle(element).transform);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() => stage.getAttribute("data-scroll-progress"))
    .not.toBe("0.000");

  const finalTransform = await page
    .locator(".constellation-map__plane")
    .evaluate((element) => getComputedStyle(element).transform);
  expect(finalTransform).not.toBe(initialTransform);

  const rotation = await stage.evaluate((element) =>
    getComputedStyle(element)
      .getPropertyValue("--constellation-rotation")
      .trim(),
  );
  expect(Number.parseFloat(rotation)).toBeGreaterThanOrEqual(-7);
  expect(Number.parseFloat(rotation)).toBeLessThanOrEqual(7);
});

test("projects open truthful lenses and restore focus", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Explore LLM-as-a-Judge",
  });

  await trigger.click();
  await expect(
    page.getByRole("dialog", { name: "LLM-as-a-Judge" }),
  ).toBeVisible();
  await expect(page.locator('[data-artifact="judge"]')).toBeVisible();
  await expect(page.locator(".project-lens__link")).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("mobile keeps star labels within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const labels = page.locator("#panel-projects .constellation-star__copy");
  const escaped: number[] = [];
  for (let index = 0; index < (await labels.count()); index += 1) {
    const box = await labels.nth(index).boundingBox();
    if (box && (box.x < 0 || box.x + box.width > 390)) {
      escaped.push(index);
    }
  }
  expect(escaped).toEqual([]);

  await page.getByRole("button", { name: "Explore UCredit" }).click();
  await expect(page.getByRole("dialog", { name: "UCredit" })).toBeVisible();
});

test("reduced motion removes spatial transforms", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.locator(".constellation-map__plane")).toHaveCSS(
    "transform",
    "none",
  );
  await page.getByRole("tab", { name: "Quotes" }).click();
  await expect(page.getByRole("tabpanel", { name: "Quotes" })).toHaveCSS(
    "transform",
    "none",
  );
});
