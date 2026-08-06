import { expect, test } from "@playwright/test";

test("shows real particle motion, overlays block two and disappears in block three", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const hero = page.locator("#intro");
  const pitch = page.locator("#pitch");
  const partners = page.locator("#partners");
  const portrait = page.locator(".hero-particle-portrait");
  const fallback = page.locator(".hero-particle-portrait__fallback");
  const canvas = page.locator("[data-hero-particle-canvas]");

  await expect(portrait).toHaveAttribute("data-webgl", "ready");
  await page.mouse.move(200, 400);

  await page.mouse.wheel(0, 900);
  await expect(hero).toHaveAttribute("data-state", "current");
  await expect(portrait).toHaveAttribute("data-phase", "hero-particles");
  await expect(portrait).toHaveAttribute("data-particle-motion", "dispersing");
  await expect(portrait).toHaveAttribute("data-render-source", "webgl");
  await expect(canvas).toHaveCSS("opacity", "1");
  await expect.poll(async () => Number.parseFloat(
    await portrait.getAttribute("data-disperse-target") ?? "0",
  )).toBeGreaterThan(0.6);
  await expect.poll(async () => Number.parseFloat(await fallback.evaluate((element) =>
    getComputedStyle(element).opacity,
  ))).toBeGreaterThan(0.1);

  await page.waitForTimeout(520);
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
