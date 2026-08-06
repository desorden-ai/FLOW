import { expect, test } from "@playwright/test";

test("shows moving Canvas 2D particles, overlays block two and disappears in block three", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const hero = page.locator("#intro");
  const pitch = page.locator("#pitch");
  const partners = page.locator("#partners");
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
  await expect(hero).toHaveAttribute("data-state", "current");
  await expect(portrait).toHaveAttribute("data-phase", "hero-particles");
  await expect(portrait).toHaveAttribute("data-particle-motion", "dispersing");
  await expect(portrait).toHaveAttribute("data-render-source", "canvas2d");
  await expect(canvas).toHaveCSS("opacity", "1");
  await expect.poll(async () => Number.parseFloat(
    await portrait.getAttribute("data-disperse-target") ?? "0",
  )).toBeGreaterThan(0.6);
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

  await page.waitForTimeout(220);
  await page.mouse.wheel(0, 900);
  await expect(hero).toHaveAttribute("data-state", "past");
  await expect(pitch).toHaveAttribute("data-state", "current");
  await expect(portrait).toHaveAttribute("data-overlay", "pitch");
  await expect(portrait).toHaveAttribute("data-phase", "pitch-particles");
  await expect(portrait).toHaveAttribute("data-particle-motion", "over-pitch");
  await expect(portrait).toHaveAttribute("data-fade-target", "0.000");
  await expect(canvas).toHaveCSS("opacity", "1");

  await page.waitForTimeout(620);
  await page.mouse.wheel(0, 900);
  await expect(pitch).toHaveAttribute("data-state", "past");
  await expect(partners).toHaveAttribute("data-state", "current");
  await expect(portrait).toHaveAttribute("data-phase", "block-3-fade");
  await expect(portrait).toHaveAttribute("data-particle-motion", "depth-fade");
  await expect(portrait).toHaveAttribute("data-depth-target", "1.000");
  await expect(portrait).toHaveAttribute("data-fade-target", "1.000");

  await expect(portrait).toHaveAttribute("data-phase", "hidden", { timeout: 2_500 });
  await expect(portrait).toHaveCSS("opacity", "0");
});
