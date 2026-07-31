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
  await expect(
    page.getByRole("button", {
      name: "Open Projects with Monopole selected",
    }),
  ).toBeVisible();

  const storyDrawer = await page.locator(".story-drawer").boundingBox();
  expect(storyDrawer).not.toBeNull();
  for (const destination of await page.locator(".universe-constellation").all()) {
    const box = await destination.boundingBox();
    expect(box).not.toBeNull();
    expect(overlaps(box!, storyDrawer!)).toBe(false);
  }

  await page.getByRole("button", { name: "Explore Projects" }).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.locator(".story-drawer")).toHaveAttribute(
    "data-active-beat",
    "projects",
  );
  await expect(
    page.getByRole("region", { name: "Projects constellation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Explore (?!Projects$)/ }),
  ).toHaveCount(5);
  await page.locator(".constellation-view").evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const detailMap = await page
    .locator(".constellation-map--detail")
    .boundingBox();
  const expandedDrawer = await page.locator(".story-drawer").boundingBox();
  expect(detailMap).not.toBeNull();
  expect(expandedDrawer).not.toBeNull();
  expect(detailMap!.x).toBeGreaterThanOrEqual(
    expandedDrawer!.x + expandedDrawer!.width,
  );

  await page.getByRole("button", { name: "Universe" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole("button", { name: "Explore Projects" }),
  ).toBeFocused();
});

test("a universe star zooms with its selection before opening a lens", async ({
  page,
}) => {
  await page.goto("/");

  await page
    .getByRole("button", {
      name: "Open Projects with Monopole selected",
    })
    .click();

  await expect(page).toHaveURL(/#projects\/monopole$/);
  await expect(page.getByRole("dialog", { name: "Monopole" })).toBeVisible();
});

test("the story drawer can hide and restore without changing navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Monopole" }).click();
  await expect(page).toHaveURL(/#projects\/monopole$/);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Hide story" }).click();
  await expect(page.locator(".story-drawer")).toHaveAttribute(
    "data-collapsed",
    "true",
  );
  await expect(page.locator(".story-drawer")).toHaveAttribute(
    "data-active-beat",
    "projects/monopole",
  );

  await page.getByRole("button", { name: "Show story" }).click();
  await expect(page.locator(".story-drawer")).not.toHaveAttribute(
    "data-collapsed",
    "true",
  );
  await expect(page).toHaveURL(/#projects$/);
});

test("scrolling the drawer pans directly between constellations", async ({
  page,
}) => {
  await page.goto("/#projects");
  await page.locator('[data-story-beat="quotes"]').evaluate((element) => {
    element
      .closest(".story-drawer__scroll")
      ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    element.scrollIntoView({ block: "center" });
    element.closest(".story-drawer__scroll")?.dispatchEvent(
      new Event("scroll", { bubbles: true }),
    );
  });

  await expect(page).toHaveURL(/#quotes$/);
  await expect(page.locator(".constellation-view")).toHaveAttribute(
    "data-camera-transition",
    "pan",
  );
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
  await expect(page.locator(".quote-readout")).toHaveCSS("opacity", "0");
  await expect(page.locator(".quote-readout blockquote")).toHaveText(
    "Strong opinions, weakly held.",
  );
  await expect(page.locator(".quote-readout figcaption")).toContainText(
    "Paul Saffo",
  );

  await page.getByRole("button", { name: "Hide story" }).click();
  await expect(page.locator(".quote-readout")).toHaveCSS("opacity", "1");
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
  const projectDialog = page.getByRole("dialog", {
    name: "LLM-as-a-Judge",
  });
  await expect(projectDialog).toBeVisible();
  await expect(
    projectDialog.locator('[data-artifact="judge"]'),
  ).toBeVisible();
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

test("wheel input drifts every sky view but yields to a project lens", async ({
  page,
}) => {
  await page.goto("/");

  const dispatchWheel = () =>
    page.evaluate(() => {
      const event = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: 120,
      });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });

  expect(await dispatchWheel()).toBe(true);
  const drawerWheelWasPrevented = await page
    .locator(".story-drawer__scroll")
    .evaluate((element) => {
      const event = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: 120,
      });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
  expect(drawerWheelWasPrevented).toBe(false);
  await page.getByRole("button", { name: "Explore Projects" }).click();
  expect(await dispatchWheel()).toBe(true);

  await page.getByRole("button", { name: "Explore Monopole" }).click();
  await expect(page.getByRole("dialog", { name: "Monopole" })).toBeVisible();
  expect(await dispatchWheel()).toBe(false);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Universe" }).click();
  await page.getByRole("button", { name: "Explore Quotes" }).click();
  expect(await dispatchWheel()).toBe(true);

  const browserZoomWasPrevented = await page.evaluate(() => {
    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: 120,
    });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(browserZoomWasPrevented).toBe(false);

  await page.waitForFunction(() => {
    const value = getComputedStyle(
      document.querySelector(".universe")!,
    ).getPropertyValue("--constellation-pull-x");
    return Math.abs(Number.parseFloat(value)) > 0.25;
  });
  const displaced = await page.locator(".universe").evaluate((element) =>
    Math.abs(
      Number.parseFloat(
        getComputedStyle(element).getPropertyValue("--constellation-pull-x"),
      ),
    ),
  );
  const detailDrift = await page
    .locator(".constellation-map--detail .constellation-map__plane")
    .evaluate((element) => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
      return { x: Math.abs(matrix.e), y: Math.abs(matrix.f) };
    });
  expect(detailDrift.x).toBeCloseTo(displaced, 1);
  expect(detailDrift.y).toBeGreaterThan(0);

  await page.waitForTimeout(1800);
  const stabilized = await page.locator(".universe").evaluate((element) =>
    Math.abs(
      Number.parseFloat(
        getComputedStyle(element).getPropertyValue("--constellation-pull-x"),
      ),
    ),
  );
  expect(stabilized).toBeLessThan(displaced);
});

test("camera arrival starts at the activated constellation origin", async ({
  page,
}) => {
  await page.goto("/");
  const overview = page.locator(".universe-overview");
  await overview.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const projects = page.locator(
    '[data-testid="projects-constellation-overview"]',
  );
  const overviewBox = await overview.boundingBox();
  const projectsBox = await projects.boundingBox();
  expect(overviewBox).not.toBeNull();
  expect(projectsBox).not.toBeNull();
  const expected = {
    x:
      ((projectsBox!.x + projectsBox!.width / 2 - overviewBox!.x) /
        overviewBox!.width) *
      100,
    y:
      ((projectsBox!.y + projectsBox!.height / 2 - overviewBox!.y) /
        overviewBox!.height) *
      100,
  };

  await page.getByRole("button", { name: "Explore Projects" }).click();

  const rootOrigin = await page.locator(".universe").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      x: Number.parseFloat(style.getPropertyValue("--camera-origin-x")),
      y: Number.parseFloat(style.getPropertyValue("--camera-origin-y")),
    };
  });
  expect(rootOrigin.x).toBeCloseTo(expected.x, 0);
  expect(rootOrigin.y).toBeCloseTo(expected.y, 0);

  const detail = page.locator(".constellation-view");
  const { size, transformOrigin } = await detail.evaluate((element) => ({
    size: { width: element.clientWidth, height: element.clientHeight },
    transformOrigin: getComputedStyle(element)
      .transformOrigin.split(" ")
      .map((value) => Number.parseFloat(value)),
  }));
  expect(transformOrigin[0]).toBeCloseTo(
    (expected.x / 100) * size.width,
    0,
  );
  expect(transformOrigin[1]).toBeCloseTo(
    (expected.y / 100) * size.height,
    0,
  );
});

test("wide overview keeps large constellations inside the composition", async ({
  page,
}) => {
  await page.setViewportSize({ width: 2048, height: 951 });
  await page.goto("/");
  await page.locator(".universe-overview").evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const storyDrawer = await page.locator(".story-drawer").boundingBox();
  expect(storyDrawer).not.toBeNull();

  for (const destination of await page.locator(".universe-constellation").all()) {
    const box = await destination.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(200);
    expect(box!.x + box!.width / 2).toBeLessThanOrEqual(2048 * 0.78);
    expect(overlaps(box!, storyDrawer!)).toBe(false);
  }
});

test("mobile overview and project labels remain inside the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator(".universe-overview").evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const drawer = await page.locator(".story-drawer").boundingBox();
  expect(drawer).not.toBeNull();
  expect(drawer!.x).toBeGreaterThanOrEqual(0);
  expect(drawer!.x + drawer!.width).toBeLessThanOrEqual(390);
  expect(drawer!.y + drawer!.height).toBeLessThanOrEqual(844);

  for (const destination of await page.locator(".universe-constellation").all()) {
    const box = await destination.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    expect(overlaps(box!, drawer!)).toBe(false);
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

  await expect(page.locator(".celestial-field")).toHaveCSS("display", "none");
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
