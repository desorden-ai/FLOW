import { expect, test, type Locator } from "@playwright/test";

async function dispatchSwipe(target: Locator, fromY: number, toY: number) {
  await target.evaluate((element, gesture) => {
    const dispatchTouch = (type: "touchstart" | "touchend", clientY: number, active: boolean) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      const point = { clientY };

      Object.defineProperty(event, "touches", {
        configurable: true,
        value: active ? [point] : [],
      });
      Object.defineProperty(event, "changedTouches", {
        configurable: true,
        value: [point],
      });

      element.dispatchEvent(event);
    };

    dispatchTouch("touchstart", gesture.fromY, true);
    dispatchTouch("touchend", gesture.toY, false);
  }, { fromY, toY });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
});

test("keeps the mobile hero sharp and navigates with one touch gesture", async ({ page }) => {
  const shell = page.locator(".site-shell");
  const hero = page.locator("#intro");
  const pitch = page.locator("#pitch");
  const image = page.locator("#intro .hero-picture img");

  await expect(hero).toHaveAttribute("data-state", "current");
  await expect(image).toBeVisible();
  await image.evaluate(async (element: HTMLImageElement) => element.decode());

  const imageState = await image.evaluate((element: HTMLImageElement) => ({
    currentSrc: element.currentSrc,
    renderedWidth: element.getBoundingClientRect().width,
    sizes: element.sizes,
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));

  expect(imageState.sizes).toContain("98vw");
  expect(imageState.renderedWidth).toBeGreaterThanOrEqual(imageState.viewportWidth * 0.9);
  expect(imageState.currentSrc).toMatch(/\/_image\/(1024|1440)\/(avif|webp|jpeg)\//);
  expect(imageState.documentWidth).toBeLessThanOrEqual(imageState.viewportWidth + 1);

  await dispatchSwipe(shell, 700, 180);
  await expect(hero).toHaveAttribute("data-state", "past");
  await expect(pitch).toHaveAttribute("data-state", "current");

  await dispatchSwipe(shell, 180, 700);
  await expect(hero).toHaveAttribute("data-state", "current");
  await expect(pitch).toHaveAttribute("data-state", "future");
});
