import { expect, test } from "@playwright/test";

const overlaps = (
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) =>
  first.x + first.width > second.x &&
  first.x < second.x + second.width &&
  first.y + first.height > second.y &&
  first.y < second.y + second.height;

test("universe overview enters and leaves the Projects constellation", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator(".universe-stage")).toHaveAttribute(
    "data-view",
    "universe",
  );
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Explore Projects" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Explore Quotes" }),
  ).toBeVisible();

  const quietZone = await page.locator(".quiet-zone").boundingBox();
  expect(quietZone).not.toBeNull();
  for (const destination of await page.locator(".universe-destination").all()) {
    const box = await destination.boundingBox();
    expect(box).not.toBeNull();
    expect(overlaps(box!, quietZone!)).toBe(false);
  }

  await page.getByRole("button", { name: "Explore Projects" }).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(
    page.getByRole("region", { name: "Projects constellation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Explore (?!Projects$)/ }),
  ).toHaveCount(5);

  await page.getByRole("button", { name: "Universe" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("button", { name: "Explore Projects" }),
  ).toBeFocused();
});

test("Quotes is a constellation with selectable stars", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Quotes" }).click();

  await expect(page).toHaveURL(/#quotes$/);
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

test("project lenses preserve URL hierarchy, truthfulness, and focus", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Projects" }).click();
  const trigger = page.getByRole("button", {
    name: "Explore LLM-as-a-Judge",
  });

  await trigger.click();
  await expect(page).toHaveURL(/#projects\/llm-as-a-judge$/);
  await expect(
    page.getByRole("dialog", { name: "LLM-as-a-Judge" }),
  ).toBeVisible();
  await expect(page.locator('[data-artifact="judge"]')).toBeVisible();
  await expect(page.locator(".project-lens__link")).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.goBack();
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the camera never captures wheel input", async ({ page }) => {
  await page.goto("/");

  const wasPrevented = await page.evaluate(() => {
    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });

  expect(wasPrevented).toBe(false);
  await expect(page.locator(".universe")).toHaveCSS("min-height", "720px");
});

test("mobile overview and project labels remain inside the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  for (const destination of await page.locator(".universe-destination").all()) {
    const box = await destination.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }

  await page.getByRole("button", { name: "Explore Projects" }).click();
  const labels = page.locator(
    ".constellation-view--projects .constellation-star__copy",
  );
  const escaped: number[] = [];
  for (let index = 0; index < (await labels.count()); index += 1) {
    const box = await labels.nth(index).boundingBox();
    if (box && (box.x < 0 || box.x + box.width > 390)) {
      escaped.push(index);
    }
  }
  expect(escaped).toEqual([]);
});

test("reduced motion removes camera transforms and shooting stars", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.locator(".shooting-stars")).toHaveCSS("display", "none");
  await page.getByRole("button", { name: "Explore Projects" }).click();
  await expect(page.locator(".constellation-view")).toHaveCSS(
    "transform",
    "none",
  );
  await expect(page.locator(".constellation-map__plane")).toHaveCSS(
    "transform",
    "none",
  );
});

test("discovery files expose the shared portfolio content", async ({
  request,
}) => {
  const portfolioResponse = await request.get("/portfolio.json");
  expect(portfolioResponse.ok()).toBe(true);
  expect(portfolioResponse.headers()["content-type"]).toContain(
    "application/json",
  );
  const portfolio = await portfolioResponse.json();
  expect(portfolio.schemaVersion).toBe(1);
  expect(portfolio.projects).toHaveLength(5);
  expect(portfolio.projects[0]).not.toHaveProperty("position");

  const llms = await (await request.get("/llms.txt")).text();
  const robots = await (await request.get("/robots.txt")).text();
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(llms).toContain("# Matthew Liu");
  expect(robots).toContain("User-agent: OAI-SearchBot");
  expect(sitemap).toContain(
    "<loc>https://mattliu-home.vercel.app/</loc>",
  );
});
