import { expect, test } from "@playwright/test";

test("maps Canvas 2D particles to the rendered portrait and recalculates on resize", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const portrait = page.locator(".hero-particle-portrait");
  const fallbackLayer = page.locator(".hero-particle-portrait__fallback");
  const canvas = page.locator("[data-hero-particle-canvas]");

  await expect(portrait).toHaveAttribute("data-renderer", "canvas2d");
  await expect(portrait).toHaveAttribute("data-renderer-status", "ready");
  await expect(portrait).toHaveAttribute("data-render-source", "html");
  await expect(canvas).toHaveCSS("opacity", "0");
  await expect(fallbackLayer).toHaveCSS("opacity", "1");

  const readAlignment = async () => page.evaluate(() => {
    const wrapper = document.querySelector<HTMLElement>(".hero-particle-portrait");
    const image = document.querySelector<HTMLImageElement>(".hero-particle-portrait__fallback img");
    if (!wrapper || !image) throw new Error("Hero portrait elements are missing");

    const rect = image.getBoundingClientRect();
    return {
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      particles: {
        left: Number.parseFloat(wrapper.dataset.meshLeft ?? "NaN"),
        top: Number.parseFloat(wrapper.dataset.meshTop ?? "NaN"),
        width: Number.parseFloat(wrapper.dataset.meshWidth ?? "NaN"),
        height: Number.parseFloat(wrapper.dataset.meshHeight ?? "NaN"),
      },
      particleCount: Number.parseInt(wrapper.dataset.particleCount ?? "0", 10),
      step: Number.parseInt(wrapper.dataset.particleStep ?? "0", 10),
    };
  });

  const expectAligned = (alignment: Awaited<ReturnType<typeof readAlignment>>) => {
    expect(Math.abs(alignment.rect.left - alignment.particles.left)).toBeLessThan(0.75);
    expect(Math.abs(alignment.rect.top - alignment.particles.top)).toBeLessThan(0.75);
    expect(Math.abs(alignment.rect.width - alignment.particles.width)).toBeLessThan(0.75);
    expect(Math.abs(alignment.rect.height - alignment.particles.height)).toBeLessThan(0.75);
    expect(alignment.particleCount).toBeGreaterThan(300);
    expect(alignment.step).toBe(6);
  };

  expectAligned(await readAlignment());

  await page.keyboard.press("ArrowDown");
  await expect(portrait).toHaveAttribute("data-render-source", "canvas2d");
  await expect(portrait).toHaveAttribute("data-particle-motion", "dispersing");
  await expect(canvas).toHaveCSS("opacity", "1");
  await expect.poll(async () => Number.parseFloat(await fallbackLayer.evaluate((element) =>
    getComputedStyle(element).opacity,
  ))).toBeLessThanOrEqual(0.05);

  await page.setViewportSize({ width: 430, height: 932 });
  await expect.poll(async () => (await readAlignment()).particles.width).toBeGreaterThan(400);
  expectAligned(await readAlignment());
});
