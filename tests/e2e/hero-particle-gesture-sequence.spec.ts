import { expect, test } from "@playwright/test";

const SCENE_DENSITIES = [0.82, 0.68, 0.55, 0.43, 0.33, 0.24, 0.16, 0.09];

test("opens block two on the first gesture and keeps fewer particles in every following block", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const hero = page.locator("#intro");
  const pitch = page.locator("#pitch");
  const portrait = page.locator(".hero-particle-portrait");
  const fallback = page.locator(".hero-particle-portrait__fallback");
  const canvas = page.locator<HTMLCanvasElement>("[data-hero-particle-canvas]");

  await expect(portrait).toHaveAttribute("data-renderer-status", "ready");
  await expect.poll(async () => Number.parseInt(
    await portrait.getAttribute("data-particle-count") ?? "0",
    10,
  )).toBeGreaterThan(300);

  await page.mouse.move(200, 400);
  await page.mouse.wheel(0, 900);

  await expect(hero).toHaveAttribute("data-state", "past");
  await expect(pitch).toHaveAttribute("data-state", "current");
  await expect(portrait).toHaveAttribute("data-phase", "pitch-particles");
  await expect(portrait).toHaveAttribute("data-particle-motion", "over-pitch");
  await expect(portrait).toHaveAttribute("data-render-source", "canvas2d");
  await expect(portrait).toHaveAttribute("data-particle-density-target", "0.820");
  await expect(canvas).toHaveCSS("opacity", "1");
  await expect.poll(async () => Number.parseFloat(await fallback.evaluate((element) =>
    getComputedStyle(element).opacity,
  ))).toBeLessThanOrEqual(0.05);

  const canvasChecksum = async () => canvas.evaluate((element) => {
    const context = element.getContext("2d");
    if (!context) return 0;
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    let checksum = 2166136261;
    const stride = Math.max(4, Math.floor(pixels.length / 1800 / 4) * 4);

    for (let index = 0; index < pixels.length; index += stride) {
      checksum ^= pixels[index] + pixels[index + 1] * 3 + pixels[index + 2] * 7 + pixels[index + 3] * 11;
      checksum = Math.imul(checksum, 16777619);
    }

    return checksum >>> 0;
  });

  const firstFrame = await canvasChecksum();
  await page.waitForTimeout(320);
  const secondFrame = await canvasChecksum();
  expect(secondFrame).not.toBe(firstFrame);

  let previousDensity = 1;
  let previousTargetCount = Number.POSITIVE_INFINITY;

  for (let sceneIndex = 1; sceneIndex <= 8; sceneIndex += 1) {
    if (sceneIndex > 1) {
      await page.locator(`[data-go="${sceneIndex}"]`).first().evaluate((element: HTMLElement) => element.click());
    }

    const expectedDensity = SCENE_DENSITIES[sceneIndex - 1];
    const density = Number.parseFloat(
      await portrait.getAttribute("data-particle-density-target") ?? "0",
    );
    const targetCount = Number.parseInt(
      await portrait.getAttribute("data-visible-particle-target") ?? "0",
      10,
    );

    expect(density).toBeCloseTo(expectedDensity, 3);
    expect(density).toBeLessThan(previousDensity);
    expect(targetCount).toBeGreaterThan(0);
    expect(targetCount).toBeLessThan(previousTargetCount);
    await expect(portrait).toHaveAttribute("data-render-source", "canvas2d");
    await expect(canvas).toHaveCSS("opacity", "1");

    previousDensity = density;
    previousTargetCount = targetCount;
  }

  await expect(portrait).toHaveAttribute("data-scene-index", "8");
  await expect(portrait).toHaveAttribute("data-particle-density-target", "0.090");
  await expect.poll(async () => Number.parseInt(
    await portrait.getAttribute("data-visible-particle-count") ?? "0",
    10,
  )).toBeGreaterThan(0);
});
