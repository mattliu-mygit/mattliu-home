import { expect, test } from "@playwright/test";

const overlaps = (
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) =>
  first.x + first.width > second.x &&
  first.x < second.x + second.width &&
  first.y + first.height > second.y &&
  first.y < second.y + second.height;

test("project constellations stay outside the desktop quiet zone", async ({
  page,
}) => {
  await page.goto("/");
  const quiet = await page.locator(".quiet-zone").boundingBox();
  expect(quiet).not.toBeNull();
  await expect(page.locator(".quiet-zone")).toHaveCSS("position", "absolute");
  const collisions: string[] = [];
  const labelCollisions: string[] = [];

  for (const button of await page
    .getByRole("button", { name: /^Explore / })
    .all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    await expect(button).toHaveCSS("position", "absolute");
    if (overlaps(box!, quiet!)) {
      collisions.push((await button.getAttribute("aria-label")) ?? "unknown");
    }
    const primaryStar = await button
      .locator(".constellation__primary")
      .boundingBox();
    const label = await button.locator(".constellation__label").boundingBox();
    if (primaryStar && label && overlaps(primaryStar, label)) {
      labelCollisions.push(
        (await button.getAttribute("aria-label")) ?? "unknown",
      );
    }
  }
  expect(collisions).toEqual([]);
  expect(labelCollisions).toEqual([]);
});

test("mobile presents projects chronologically and opens a lens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByTestId("project-year")).toHaveText([
    "2020",
    "2021",
    "2022",
    "2026",
    "Now",
  ]);
  await expect(page.locator(".project-sky")).toHaveCSS("display", "grid");
  await expect(
    page.getByRole("button", { name: "Explore Voyage into Space" }),
  ).toHaveCSS("position", "relative");
  const mobileLabelCollisions: string[] = [];
  for (const button of await page
    .getByRole("button", { name: /^Explore / })
    .all()) {
    const primaryStar = await button
      .locator(".constellation__primary")
      .boundingBox();
    const label = await button.locator(".constellation__label").boundingBox();
    if (primaryStar && label && overlaps(primaryStar, label)) {
      mobileLabelCollisions.push(
        (await button.getAttribute("aria-label")) ?? "unknown",
      );
    }
  }
  expect(mobileLabelCollisions).toEqual([]);
  await page.getByRole("button", { name: "Explore Otter" }).click();
  await expect(page.getByRole("dialog", { name: "Otter" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
