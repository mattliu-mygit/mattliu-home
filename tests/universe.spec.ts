import { expect, test } from "@playwright/test";

const overlaps = (
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) =>
  first.x + first.width > second.x &&
  first.x < second.x + second.width &&
  first.y + first.height > second.y &&
  first.y < second.y + second.height;

test("the static fallback is styled before application JavaScript runs", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("/");

  await expect(page.locator(".seo-fallback")).toBeVisible();
  await expect(page.locator("html")).toHaveCSS(
    "background-color",
    "rgb(8, 10, 16)",
  );
  await expect(page.locator(".seo-fallback")).toHaveCSS(
    "color",
    "rgb(244, 241, 232)",
  );

  await context.close();
});

test("the static fallback does not paint while the application starts", async ({
  page,
}) => {
  await page.route("**/src/main.tsx", (route) => route.abort());

  await page.goto("/");

  await expect(page.locator(".seo-fallback")).toBeHidden();
});

test("the intro opens with a raised 4:5 portrait and a measured name gap", async ({ page }) => {
  await page.setViewportSize({ width: 1_280, height: 900 });
  await page.goto("/");

  const portrait = page.getByRole("img", { name: "Matthew Liu" });
  const name = page.getByRole("heading", { name: "Matthew Liu" });
  const box = await portrait.boundingBox();
  const nameBox = await name.boundingBox();
  const radius = await portrait.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element.parentElement!).borderTopLeftRadius),
  );

  expect(box).not.toBeNull();
  expect(nameBox).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(165);
  expect(box!.height / box!.width).toBeCloseTo(1.25, 1);
  expect(box!.y / 900).toBeLessThan(0.34);
  expect(nameBox!.y - (box!.y + box!.height)).toBeGreaterThanOrEqual(12);
  expect(radius / box!.width).toBeLessThan(0.15);
});

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

  const narrativeWheel = await page.locator(".narrative-wheel").boundingBox();
  const sequencePaddingTop = await page
    .locator(".narrative-wheel__sequence")
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingTop));
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const nextBeat = page.locator('[data-story-beat="intro/headline"]');
  const nextBeatBox = await nextBeat.boundingBox();
  expect(narrativeWheel).not.toBeNull();
  expect(nextBeatBox).not.toBeNull();
  expect(sequencePaddingTop / viewportHeight).toBeLessThan(0.32);
  await expect(nextBeat).toHaveCSS("opacity", "0.34");
  expect(nextBeatBox!.y).toBeLessThan(
    narrativeWheel!.y + narrativeWheel!.height,
  );
  expect(nextBeatBox!.y + nextBeatBox!.height).toBeGreaterThan(
    narrativeWheel!.y,
  );
  for (const destination of await page.locator(".universe-constellation").all()) {
    const box = await destination.boundingBox();
    expect(box).not.toBeNull();
    expect(overlaps(box!, narrativeWheel!)).toBe(false);
  }

  await page.getByRole("button", { name: "Explore Projects" }).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.locator(".narrative-wheel")).toHaveAttribute(
    "data-active-beat",
    "projects",
  );
  await expect(
    page.getByRole("region", { name: "Projects constellation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Explore (?!Projects$)/ }),
  ).toHaveCount(6);
  await page.locator(".constellation-view").evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const detailMap = await page
    .locator(".constellation-map--detail")
    .boundingBox();
  const expandedWheel = await page.locator(".narrative-wheel").boundingBox();
  expect(detailMap).not.toBeNull();
  expect(expandedWheel).not.toBeNull();
  expect(detailMap!.x).toBeGreaterThanOrEqual(
    expandedWheel!.x + expandedWheel!.width,
  );

  await page.getByRole("button", { name: "Go to Intro" }).click();
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

test("constellation connections stay solid across camera levels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 650, height: 650 });
  await page.goto("/");

  const overviewLines = page.locator(
    ".constellation-map--overview .constellation-connection__line",
  );
  await expect(overviewLines.first()).toHaveCSS("opacity", "0.25");
  for (const line of await overviewLines.all()) {
    await expect(line).toHaveCSS("stroke-dasharray", "none");
  }

  await page.getByRole("button", { name: "Explore Projects" }).click();
  await expect(
    page
      .locator(
        ".constellation-map--detail.constellation-map--projects .constellation-connection__line",
      )
      .first(),
  ).toHaveCSS("stroke-dasharray", "none");
});

test("only the hovered constellation connection brightens", async ({ page }) => {
  await page.goto("/#projects");

  const map = page.locator(
    ".constellation-map--detail.constellation-map--projects",
  );
  const visibleLines = map.locator(".constellation-connection__line");
  const hitLines = map.locator(".constellation-connection__hit");
  const firstVisible = visibleLines.first();
  const secondVisible = visibleLines.nth(1);
  const firstHit = hitLines.first();
  const [firstIdleOpacity, secondIdleOpacity, firstIdleFilter] =
    await Promise.all([
      firstVisible.evaluate((element) =>
        Number(getComputedStyle(element).opacity),
      ),
      secondVisible.evaluate((element) =>
        Number(getComputedStyle(element).opacity),
      ),
      firstVisible.evaluate((element) => getComputedStyle(element).filter),
    ]);

  expect(firstIdleOpacity).toBe(0.32);
  expect(firstIdleFilter).toContain("drop-shadow");
  await expect(firstHit).toHaveCSS("pointer-events", "stroke");
  await firstHit.hover();

  await expect(firstVisible).toHaveCSS("opacity", "0.7");
  await expect(secondVisible).toHaveCSS(
    "opacity",
    String(secondIdleOpacity),
  );
  expect(0.7).toBeGreaterThan(firstIdleOpacity);
});

test("selected star aura is stronger than its peers", async ({ page }) => {
  await page.goto("/#path/johns-hopkins");

  const map = page.locator(
    ".constellation-map--detail.constellation-map--path",
  );
  const selectedStar = map
    .locator('.constellation-star[data-active="true"]')
    .first();
  const inactiveStar = map
    .locator('.constellation-star:not([data-active="true"])')
    .first();
  const selectedPoint = selectedStar.locator(".constellation-star__point");
  const inactivePoint = inactiveStar.locator(".constellation-star__point");
  const inactiveShadow = await inactivePoint.evaluate(
    (element) => getComputedStyle(element).boxShadow,
  );
  const inactiveAura = await inactiveStar.evaluate(
    (element) => getComputedStyle(element, "::before").boxShadow,
  );
  const maxBlurRadius = (shadow: string) =>
    Math.max(
      ...Array.from(
        shadow.matchAll(/0px 0px ([\d.]+)px/g),
        (match) => Number(match[1]),
      ),
    );

  await inactiveStar.hover();
  await inactiveStar.evaluate((element) =>
    Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished),
    ),
  );

  const [
    selectedShadow,
    hoveredShadow,
    selectedLabelColor,
    hoveredLabelColor,
    hoveredTextShadow,
    selectedAura,
    hoveredAura,
  ] = await Promise.all([
    selectedPoint.evaluate((element) => getComputedStyle(element).boxShadow),
    inactivePoint.evaluate((element) => getComputedStyle(element).boxShadow),
    selectedStar
      .locator(".constellation-star__label")
      .evaluate((element) => getComputedStyle(element).color),
    inactiveStar
      .locator(".constellation-star__label")
      .evaluate((element) => getComputedStyle(element).color),
    inactiveStar
      .locator(".constellation-star__label")
      .evaluate((element) => getComputedStyle(element).textShadow),
    selectedStar.evaluate(
      (element) => getComputedStyle(element, "::before").boxShadow,
    ),
    inactiveStar.evaluate(
      (element) => getComputedStyle(element, "::before").boxShadow,
    ),
  ]);

  expect(maxBlurRadius(inactiveAura)).toBeGreaterThanOrEqual(28);
  expect(maxBlurRadius(hoveredAura)).toBeGreaterThanOrEqual(36);
  expect(maxBlurRadius(selectedAura)).toBeGreaterThanOrEqual(44);
  expect(maxBlurRadius(hoveredAura)).toBeGreaterThan(
    maxBlurRadius(inactiveAura),
  );
  expect(maxBlurRadius(selectedAura)).toBeGreaterThan(
    maxBlurRadius(hoveredAura),
  );
  expect(maxBlurRadius(inactiveShadow)).toBeGreaterThan(0);
  expect(maxBlurRadius(hoveredShadow)).toBeGreaterThan(
    maxBlurRadius(inactiveShadow),
  );
  expect(maxBlurRadius(selectedShadow)).toBeGreaterThan(
    maxBlurRadius(hoveredShadow),
  );
  expect(selectedShadow).not.toBe(inactiveShadow);
  expect(hoveredShadow).not.toBe(selectedShadow);
  expect(selectedShadow.match(/rgba?\(/g)?.length).toBe(3);
  expect(inactiveShadow.match(/rgba?\(/g)?.length).toBe(3);
  expect(hoveredShadow.match(/rgba?\(/g)?.length).toBe(3);
  expect(selectedLabelColor).not.toBe(hoveredLabelColor);
  expect(hoveredTextShadow).not.toBe("none");
});

test("selected quote metadata identifies its active star", async ({ page }) => {
  await page.goto("/#quotes");

  const map = page.locator(
    ".constellation-map--detail.constellation-map--quotes",
  );
  const [selectedColor, inactiveColor] = await Promise.all([
    map
      .locator('.constellation-star[data-active="true"]')
      .locator(".constellation-star__meta")
      .evaluate((element) => getComputedStyle(element).color),
    map
      .locator('.constellation-star:not([data-active="true"])')
      .first()
      .locator(".constellation-star__meta")
      .evaluate((element) => getComputedStyle(element).color),
  ]);

  expect(selectedColor).not.toBe(inactiveColor);
});

test("a visible star label activates its owning star", async ({ page }) => {
  await page.goto("/");

  const star = page
    .locator(".constellation-map--overview.constellation-map--path")
    .getByRole("button", {
      name: "Open Path with Johns Hopkins Whiting School of Engineering selected",
    });
  const copy = star.locator(".constellation-star__copy");
  const label = star.locator(".constellation-star__label");

  await star.hover();
  await expect(copy).toHaveCSS("pointer-events", "auto");
  await label.click();

  await expect(page).toHaveURL(/#path\/johns-hopkins$/);
  await expect(
    page
      .locator(".constellation-map--detail.constellation-map--path")
      .getByRole("button", {
        name: "Focus Johns Hopkins Whiting School of Engineering",
      }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("universe navigation labels remain legible at overview scale", async ({
  page,
}) => {
  await page.goto("/");

  const destination = page.getByRole("button", { name: "Explore Path" });
  const map = page.locator(
    ".constellation-map--overview.constellation-map--path",
  );
  const star = map
    .getByRole("button", {
      name: "Open Path with Johns Hopkins Whiting School of Engineering selected",
    });
  const label = star.locator(".constellation-star__label");
  const destinationBeat = page.locator(
    '[data-story-beat="path"] .narrative-card--destination',
  );

  await star.hover();

  const [destinationSize, labelSize, mapWidth, ambientField, destinationStyle] =
    await Promise.all([
      destination.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
      label.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
      map.evaluate((element) => element.getBoundingClientRect().width),
      map.evaluate((element) => {
        const styles = getComputedStyle(element, "::before");
        return {
          backgroundImage: styles.backgroundImage,
          boxShadow: styles.boxShadow,
          width: Number.parseFloat(styles.width),
        };
      }),
      destinationBeat.evaluate((element) => {
        const styles = getComputedStyle(element);
        return {
          backgroundColor: styles.backgroundColor,
          borderWidth: styles.borderTopWidth,
          boxShadow: styles.boxShadow,
        };
      }),
    ]);

  expect(destinationSize).toBeGreaterThanOrEqual(12.4);
  expect(labelSize).toBeGreaterThanOrEqual(11.5);
  expect(ambientField.backgroundImage).toContain("radial-gradient");
  expect(ambientField.boxShadow).toBe("none");
  expect(ambientField.width).toBeLessThan(mapWidth);
  expect(destinationStyle).toEqual({
    backgroundColor: "rgba(0, 0, 0, 0)",
    borderWidth: "0px",
    boxShadow: "none",
  });
});

test("constellation luminance stays consistent while point size scales", async ({
  page,
}) => {
  await page.goto("/");
  const overviewPoint = page
    .locator(".constellation-map--projects.constellation-map--overview")
    .getByRole("button", {
      name: "Open Projects with Monopole selected",
    })
    .locator(".constellation-star__point");
  const overviewButton = overviewPoint.locator("..");

  await expect(overviewPoint).toHaveCSS("border-top-width", "0px");
  await expect(overviewPoint).toHaveCSS("background-image", "none");
  const overviewBox = await overviewPoint.boundingBox();
  const buttonBox = await overviewButton.boundingBox();
  const overviewShadow = await overviewPoint.evaluate(
    (element) => getComputedStyle(element).boxShadow,
  );
  const overviewNucleus = await overviewButton.evaluate((element) => {
    const styles = getComputedStyle(element, "::before");
    return {
      backgroundColor: styles.backgroundColor,
      boxShadow: styles.boxShadow,
    };
  });
  const overviewBlurRadii = Array.from(
    overviewShadow.matchAll(/0px 0px ([\d.]+)px/g),
    (match) => Number(match[1]),
  );
  expect(overviewBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(overviewBox!.width).toBeGreaterThanOrEqual(4.4);
  expect(overviewBox!.width).toBeLessThanOrEqual(4.9);
  expect(buttonBox!.width).toBeGreaterThanOrEqual(44);
  expect(Math.max(...overviewBlurRadii)).toBeGreaterThan(18);

  await page.getByRole("button", { name: "Explore Projects" }).click();
  await page.locator(".constellation-world").evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const detailPoint = page
    .locator(".constellation-map--projects.constellation-map--detail")
    .getByRole("button", { name: "Explore Monopole" })
    .locator(".constellation-star__point");
  const detailButton = detailPoint.locator("..");
  const detailBox = await detailPoint.boundingBox();
  const detailNucleus = await detailButton.evaluate((element) => {
    const styles = getComputedStyle(element, "::before");
    return {
      backgroundColor: styles.backgroundColor,
      boxShadow: styles.boxShadow,
    };
  });
  expect(detailBox).not.toBeNull();
  expect(detailBox!.width).toBeGreaterThanOrEqual(5.8);
  expect(detailBox!.width).toBeLessThanOrEqual(6.8);
  expect(overviewBox!.width).toBeGreaterThanOrEqual(detailBox!.width * 0.68);
  expect(detailBox!.width).toBeGreaterThan(overviewBox!.width);
  expect(overviewNucleus.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(overviewNucleus).toEqual(detailNucleus);
});

test("header identity follows the story and external links open separately", async ({
  page,
}) => {
  await page.goto("/");
  const identity = page.locator(".site-nav__identity");

  await expect(identity).toHaveAttribute("aria-hidden", "true");
  await expect(identity).toHaveCSS("opacity", "0");
  await page.getByRole("button", { name: "Go to Context" }).click();
  await expect(identity).toHaveAttribute("aria-hidden", "true");
  await page.getByRole("button", { name: "Go to Path" }).click();
  await expect(identity).not.toHaveAttribute("aria-hidden");
  await expect(identity).toHaveCSS("opacity", "1");

  const github = page.locator('.site-nav__icon-link[aria-label="GitHub"]');
  await expect(github).toHaveAttribute("target", "_blank");
  await expect(github).toHaveAttribute("rel", "noopener noreferrer");

  await page.getByRole("button", { name: "Go to Quotes" }).click();
  const quoteSource = page.locator(".narrative-card--quote a").first();
  await expect(quoteSource).toHaveAttribute("target", "_blank");
  await expect(quoteSource).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );

  await page.getByRole("button", { name: "Go to Intro" }).click();
  await expect(identity).toHaveAttribute("aria-hidden", "true");
  await expect(identity).toHaveCSS("opacity", "0");
});

test("immersive view becomes a centered observational sky and restores context", async ({
  page,
}) => {
  const galaxyModuleLoaded = page.waitForResponse(
    (response) =>
      response.url().includes("/src/galaxy-renderer.ts") && response.ok(),
  );
  await page.goto("/");
  await galaxyModuleLoaded;
  const universe = page.locator(".universe");
  const story = page.locator(".narrative-wheel");
  const rail = page.locator(".route-rail");
  const world = page.locator(".constellation-world");
  const maps = page.locator(".universe-constellation");
  const github = page.locator('.site-nav__icon-link[aria-label="GitHub"]');
  const star = page.locator("#constellation-star-path-johns-hopkins");
  const storyId = await story.getAttribute("data-active-beat");

  const mapBoxes = () => maps.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return {
        height: box.height,
        width: box.width,
        x: box.x,
        y: box.y,
      };
    }),
  );
  const beforeBoxes = await mapBoxes();

  await page.getByRole("button", { name: "Enter immersive view" }).click();

  await expect(universe).toHaveAttribute("data-immersive", "true");
  await expect(story).toHaveCSS("opacity", "0");
  await expect(rail).toHaveCSS("opacity", "0");
  await expect(github).toHaveCSS("opacity", "0");
  await expect(universe).toHaveCSS("--camera-target-x", "50%");
  await expect(world).toHaveAttribute("inert", "");
  await expect(world).toHaveAttribute("aria-hidden", "true");
  await expect(world).toHaveCSS("opacity", "0");
  await expect(world).toHaveCSS("transition-duration", "0s");
  await expect(
    page.getByRole("button", {
      name: "Open Path with Johns Hopkins Whiting School of Engineering selected",
    }),
  ).toHaveCount(0);
  await expect(star).toHaveAttribute("aria-disabled", "true");
  await expect(star).toHaveAttribute("tabindex", "-1");
  await star.click({ force: true });
  await expect(page).toHaveURL(/\/$/);
  await world.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const immersedBoxes = await mapBoxes();
  expect(immersedBoxes).toHaveLength(beforeBoxes.length);
  for (const [index, box] of immersedBoxes.entries()) {
    expect(box.x).toBeCloseTo(beforeBoxes[index].x, 0);
    expect(box.y).toBeCloseTo(beforeBoxes[index].y, 0);
    expect(box.width).toBeCloseTo(beforeBoxes[index].width, 0);
    expect(box.height).toBeCloseTo(beforeBoxes[index].height, 0);
  }

  await page.keyboard.press("Escape");

  await expect(universe).not.toHaveAttribute("data-immersive");
  await expect(world).toHaveCSS("opacity", "1");
  await expect(story).toHaveCSS("opacity", "1");
  await expect(story).toHaveAttribute("data-active-beat", storyId!);
  await expect(
    page.getByRole("button", { name: "Enter immersive view" }),
  ).toBeFocused();

  await page.getByRole("button", { name: "Explore Path" }).click();
  await expect(universe).toHaveAttribute("data-camera-focused", "true");
  await page.getByRole("button", { name: "Enter immersive view" }).click();
  await expect(page).toHaveURL(/#path$/);
  await expect(universe).not.toHaveAttribute("data-camera-focused");
  await expect(page.locator(".constellation-map--overview")).toHaveCount(3);
  await expect(page.locator(".constellation-map--detail")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await world.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const mobileBoxes = await page.locator(".universe-constellation").evaluateAll(
    (elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return {
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          top: box.top,
        };
      }),
  );
  expect(mobileBoxes).toHaveLength(3);
  for (const box of mobileBoxes) {
    expect(box.left).toBeGreaterThanOrEqual(-8);
    expect(box.right).toBeLessThanOrEqual(398);
    expect(box.top).toBeGreaterThanOrEqual(80);
    expect(box.bottom).toBeLessThanOrEqual(780);
  }
});

test("route chapter labels align above their opening ticks at desktop and mobile widths", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const rail = page.getByRole("navigation", { name: "Story scrollbar" });
    const chapters = rail.locator(".route-rail__chapter");
    const majorTicks = rail.locator(
      'button[data-major="true"] .route-rail__tick',
    );
    const allTicks = rail.locator(".route-rail__tick");
    const introLabel = page
      .getByRole("button", { name: "Go to Intro" })
      .locator(".route-rail__label");

    await expect(chapters).toHaveCount((await majorTicks.count()) + 1);

    const [chapterBoxes, introHoverLabelBox] = await Promise.all([
      chapters.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().toJSON()),
      ),
      introLabel.boundingBox(),
    ]);

    expect(introHoverLabelBox).not.toBeNull();
    for (
      let chapterIndex = 0;
      chapterIndex < chapterBoxes.length;
      chapterIndex += 1
    ) {
      const chapterBox = chapterBoxes[chapterIndex]!;
      const tickBox = await (chapterIndex === chapterBoxes.length - 1
        ? allTicks.last()
        : majorTicks.nth(chapterIndex)
      ).boundingBox();

      expect(tickBox).not.toBeNull();
      expect(
        Math.abs(
          chapterBox.x +
            chapterBox.width / 2 -
            (tickBox!.x + tickBox!.width / 2),
        ),
      ).toBeLessThanOrEqual(0.5);
      expect(chapterBox.y + chapterBox.height).toBeLessThanOrEqual(tickBox!.y);
    }

    const introChapterBox = chapterBoxes[0]!;
    expect(overlaps(introHoverLabelBox!, introChapterBox)).toBe(false);
  }
});

test("a Path star zooms to its matching professional card", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("button", {
      name: "Open Path with AWS SageMaker selected",
    })
    .click();

  await expect(page).toHaveURL(/#path\/aws-sagemaker$/);
  await expect(page.locator(".narrative-wheel")).toHaveAttribute(
    "data-active-beat",
    "path/aws-sagemaker",
  );
  await expect(
    page
      .getByRole("region", { name: "Path constellation" })
      .getByRole("button", { name: "Focus AWS SageMaker" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(
      ".constellation-view--path .constellation-connection__line",
    ).first(),
  ).toHaveCSS("stroke-dasharray", "none");
});

test("scrolling the narrative wheel pans directly between constellations", async ({
  page,
}) => {
  await page.goto("/#projects");
  const world = page.locator(".constellation-world");
  await world.evaluate((element) => {
    element.dataset.identityProbe = "persistent";
  });
  await page.locator('[data-story-beat="quotes"]').evaluate((element) => {
    element
      .closest(".narrative-wheel__scroll")
      ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    element.scrollIntoView({ block: "center" });
    element.closest(".narrative-wheel__scroll")?.dispatchEvent(
      new Event("scroll", { bubbles: true }),
    );
  });

  await expect(page).toHaveURL(/#quotes$/);
  await expect(world).toHaveAttribute("data-identity-probe", "persistent");
  await expect(page.locator(".universe")).toHaveCSS(
    "--camera-origin-x",
    "63%",
  );
});

test("constellations keep one visible identity through camera travel", async ({
  page,
}) => {
  await page.goto("/");
  const pathStar = page.locator("#constellation-star-path-johns-hopkins");
  await pathStar.evaluate((element) => {
    element.dataset.identityProbe = "persistent";
  });

  await pathStar.click();
  await expect(page).toHaveURL(/#path\/johns-hopkins$/);
  await expect(pathStar).toHaveAttribute("data-identity-probe", "persistent");
  await expect(pathStar.locator(".constellation-star__point")).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(
    page
      .locator(
        '[data-testid="path-constellation"] .constellation-connection__line',
      )
      .first(),
  ).toHaveCSS("transition-property", "opacity, stroke");
  await expect(
    page.locator('[data-testid="projects-constellation"]'),
  ).not.toHaveCSS("display", "none");

  await page.getByRole("button", { name: "Go to Intro" }).click();
  await expect(pathStar).toHaveAttribute("data-identity-probe", "persistent");
});

test("story travel moves focus out of an inactive constellation", async ({
  page,
}) => {
  await page.goto("/#path/aws-sagemaker");
  const star = page
    .locator('[data-testid="path-constellation"]')
    .getByRole("button", { name: "Focus AWS SageMaker" });
  await star.click();
  await expect(star).toBeFocused();

  await page.locator('[data-story-beat="projects"]').evaluate((element) => {
    element
      .closest(".narrative-wheel__scroll")
      ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    element.scrollIntoView({ block: "center" });
    element.closest(".narrative-wheel__scroll")?.dispatchEvent(
      new Event("scroll", { bubbles: true }),
    );
  });

  await expect(page).toHaveURL(/#projects$/);
  await expect(
    page.getByRole("heading", { name: "Projects constellation" }),
  ).toBeFocused();
});

test("Quotes is a constellation with selectable stars", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Quotes" }).click();

  await expect(page).toHaveURL(/#quotes$/);
  await expect(
    page.getByRole("button", { name: /^Read quote:/ }),
  ).toHaveCount(4);
  await page
    .getByRole("button", { name: "Read quote: Strong opinions, weakly held." })
    .click();
  await expect(
    page.getByRole("button", { name: "Read quote: Strong opinions, weakly held." }),
  ).toHaveAttribute("aria-pressed", "true");

  await expect(
    page.getByRole("button", { name: /^(Show|Hide) story$/ }),
  ).toHaveCount(0);
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
  const wheelInputWasPrevented = await page
    .locator(".narrative-wheel__scroll")
    .evaluate((element) => {
      const event = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: 120,
      });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
  expect(wheelInputWasPrevented).toBe(true);
  await page.getByRole("button", { name: "Explore Projects" }).click();
  await expect(
    page.getByRole("region", { name: "Projects constellation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^(Show|Hide) story$/ }),
  ).toHaveCount(0);
  expect(await dispatchWheel()).toBe(true);

  await page.getByRole("button", { name: "Explore Monopole" }).click();
  await expect(page.getByRole("dialog", { name: "Monopole" })).toBeVisible();
  expect(await dispatchWheel()).toBe(false);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Go to Intro" }).click();
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

  const displaced = await page.locator(".universe").evaluate(async (element) => {
    window.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: 120,
      }),
    );
    await new Promise<void>((resolve) => window.setTimeout(resolve, 300));
    const styles = getComputedStyle(element);
    return Math.hypot(
      Number.parseFloat(styles.getPropertyValue("--constellation-pull-x")),
      Number.parseFloat(styles.getPropertyValue("--constellation-pull-y")),
    );
  });
  expect(displaced).toBeGreaterThan(0.25);
  const projection = await page
    .locator(".constellation-map--detail")
    .evaluate((element) => {
      const stars = Array.from(
        element.querySelectorAll<HTMLElement>(".constellation-star"),
      );
      const point = (star: HTMLElement) => [
        Number.parseFloat(star.style.getPropertyValue("--star-x")),
        Number.parseFloat(star.style.getPropertyValue("--star-y")),
      ];
      const first = point(stars[0]);
      const second = point(stars[1]);
      const line = element.querySelector("line")!;
      return {
        first,
        second,
        line: [
          Number(line.getAttribute("x1")),
          Number(line.getAttribute("y1")),
          Number(line.getAttribute("x2")),
          Number(line.getAttribute("y2")),
        ],
      };
    });
  const firstTravel = Math.hypot(
    projection.first[0] - 14,
    projection.first[1] - 58,
  );
  const secondTravel = Math.hypot(
    projection.second[0] - 29,
    projection.second[1] - 29,
  );
  expect(secondTravel).toBeGreaterThan(firstTravel);
  expect(projection.line).toEqual([
    projection.first[0],
    projection.first[1],
    projection.second[0],
    projection.second[1],
  ]);

  await page.waitForTimeout(1800);
  const stabilized = await page.locator(".universe").evaluate((element) => {
    const styles = getComputedStyle(element);
    return Math.hypot(
      Number.parseFloat(styles.getPropertyValue("--constellation-pull-x")),
      Number.parseFloat(styles.getPropertyValue("--constellation-pull-y")),
    );
  });
  expect(stabilized).toBeLessThan(displaced);
});

test("card and open-sky wheel input advance the story equally", async ({
  page,
}) => {
  await page.goto("/");

  const movement = await page.evaluate(() => {
    const scroll = document.querySelector<HTMLElement>(
      ".narrative-wheel__scroll",
    );
    if (!scroll) {
      throw new Error("Story scroll is missing");
    }
    scroll.scrollTop = 500;
    const start = scroll.scrollTop;
    scroll.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: 48,
      }),
    );
    const cardDelta = scroll.scrollTop - start;

    scroll.scrollTop = start;
    window.dispatchEvent(
      new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        deltaY: 48,
      }),
    );
    return {
      cardDelta,
      skyDelta: scroll.scrollTop - start,
    };
  });

  expect(movement).toEqual({ cardDelta: 48, skyDelta: 48 });
});

test("camera travel keeps the configured constellation origin", async ({
  page,
}) => {
  await page.goto("/");
  const overview = page.locator(".universe-overview");
  await overview.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const projects = page.locator(
    '[data-testid="projects-constellation"]',
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

  const world = page.locator(".constellation-world");
  await world.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const { size, transformOrigin, transitionProperty } = await world.evaluate(
    (element) => ({
      size: { width: element.clientWidth, height: element.clientHeight },
      transformOrigin: getComputedStyle(element)
        .transformOrigin.split(" ")
        .map((value) => Number.parseFloat(value)),
      transitionProperty: getComputedStyle(element).transitionProperty,
    }),
  );
  expect(transformOrigin[0]).toBeCloseTo(
    (expected.x / 100) * size.width,
    0,
  );
  expect(transformOrigin[1]).toBeCloseTo(
    (expected.y / 100) * size.height,
    0,
  );
  expect(transitionProperty).toContain("transform");
});

test("within-constellation scroll guides the same plane continuously", async ({
  page,
}) => {
  await page.goto("/#path/johns-hopkins");
  const samples = await page.locator(".narrative-wheel__scroll").evaluate(
    async (scroll) => {
      const from = scroll.querySelector<HTMLElement>(
        '[data-story-beat="path/johns-hopkins"]',
      );
      const to = scroll.querySelector<HTMLElement>(
        '[data-story-beat="path/aws-sagemaker"]',
      );
      const world = document.querySelector<HTMLElement>(".constellation-world");
      if (!from || !to || !world) {
        throw new Error("Path travel controls are missing");
      }
      const center = (element: HTMLElement) =>
        element.offsetTop + element.offsetHeight / 2;
      const fromCenter = center(from);
      const toCenter = center(to);
      const values: { x: number; y: number }[] = [];
      for (const progress of [0.15, 0.5, 0.85]) {
        scroll.scrollTop =
          fromCenter + (toCenter - fromCenter) * progress -
          scroll.clientHeight / 2;
        scroll.dispatchEvent(new Event("scroll", { bubbles: true }));
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        values.push({
          x: Number.parseFloat(world.style.getPropertyValue("--focus-offset-x")),
          y: Number.parseFloat(world.style.getPropertyValue("--focus-offset-y")),
        });
      }
      return values;
    },
  );

  expect(samples[0].x).toBeGreaterThan(samples[1].x);
  expect(samples[1].x).toBeGreaterThan(samples[2].x);
  expect(samples[0].y).toBeLessThan(samples[1].y);
  expect(samples[1].y).toBeLessThan(samples[2].y);
  expect(samples.every(({ x, y }) => Math.abs(x) <= 4 && Math.abs(y) <= 3)).toBe(
    true,
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
  const narrativeWheel = await page.locator(".narrative-wheel").boundingBox();
  expect(narrativeWheel).not.toBeNull();

  for (const destination of await page.locator(".universe-constellation").all()) {
    const box = await destination.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(200);
    expect(box!.x + box!.width / 2).toBeLessThanOrEqual(2048 * 0.78);
    expect(overlaps(box!, narrativeWheel!)).toBe(false);
  }
});

test("corrected story composition keeps cards measured and intro copy full width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.goto("/");

  const wheel = page.locator(".narrative-wheel");
  const wheelBox = await wheel.boundingBox();
  const cameraTarget = await page.locator(".universe").evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--camera-target-x").trim(),
  );
  const contextCard = page.locator(".narrative-card--context");
  const contextCardBox = await contextCard.boundingBox();
  const contextCopyBox = await contextCard.locator("p").boundingBox();
  const pathHeading = page.locator(".narrative-card--path h2").first();
  const pathSummary = page.locator(".narrative-card--path p").first();

  expect(wheelBox).not.toBeNull();
  expect(wheelBox!.width / 1_440).toBeCloseTo(0.36, 2);
  expect(cameraTarget).toBe("68%");
  expect(contextCardBox).not.toBeNull();
  expect(contextCopyBox).not.toBeNull();
  expect(contextCopyBox!.width / contextCardBox!.width).toBeGreaterThan(0.98);
  await expect(pathHeading).toHaveCSS("max-width", "352px");
  await expect(pathSummary).toHaveCSS("max-width", "368px");
});

test("mobile overview and project labels remain inside the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator(".universe-overview").evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const wheel = await page.locator(".narrative-wheel").boundingBox();
  expect(wheel).not.toBeNull();
  expect(wheel!.x).toBeGreaterThanOrEqual(0);
  expect(wheel!.x + wheel!.width).toBeLessThanOrEqual(390);
  expect(wheel!.y + wheel!.height).toBeLessThanOrEqual(844);

  for (const destination of await page.locator(".universe-constellation").all()) {
    const box = await destination.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    expect(overlaps(box!, wheel!)).toBe(false);
  }

  await page.getByRole("button", { name: "Explore Projects" }).click();
  const labels = page
    .locator('[data-testid="projects-constellation"]')
    .locator(".constellation-star__copy");
  await expect(labels).toHaveCount(6);
  const escaped: number[] = [];
  for (let index = 0; index < (await labels.count()); index += 1) {
    const box = await labels.nth(index).boundingBox();
    if (box && (box.x < 0 || box.x + box.width > 390)) {
      escaped.push(index);
    }
  }
  expect(escaped).toEqual([]);
});

test("reduced motion keeps a static sky and applies camera state immediately", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.locator(".celestial-field")).toHaveCSS("display", "block");
  await page.getByRole("button", { name: "Explore Projects" }).click();
  await expect(page.locator(".constellation-world")).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await expect(page.locator(".constellation-map__plane").first()).toHaveCSS(
    "transition-duration",
    "0s",
  );
  await page
    .locator('[data-story-beat="projects/model-customization-assistant"]')
    .evaluate((element) => {
      element.scrollIntoView({ block: "center" });
      element.closest(".narrative-wheel__scroll")?.dispatchEvent(
        new Event("scroll", { bubbles: true }),
      );
    });
  await expect(page.locator(".constellation-world")).toHaveCSS(
    "--focus-offset-x",
    "0%",
  );
  await expect(page.locator(".constellation-world")).toHaveCSS(
    "--focus-offset-y",
    "0%",
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
  expect(portfolio.path).toHaveLength(3);
  expect(portfolio.projects).toHaveLength(5);
  expect(portfolio.projects[0]).not.toHaveProperty("position");

  const llms = await (await request.get("/llms.txt")).text();
  const robots = await (await request.get("/robots.txt")).text();
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(llms).toContain("# Matthew Liu");
  expect(llms).toContain("## Path");
  expect(robots).toContain("User-agent: OAI-SearchBot");
  expect(sitemap).toContain(
    "<loc>https://mattliu-home.vercel.app/</loc>",
  );
});
