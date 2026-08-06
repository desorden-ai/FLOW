import { expect, test } from "@playwright/test";

test("maps the WebGL mesh to the rendered portrait box and recalculates on resize", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const portrait = page.locator(".hero-particle-portrait");
  const fallbackLayer = page.locator(".hero-particle-portrait__fallback");
  const canvas = page.locator("[data-hero-particle-canvas]");

  await expect(portrait).toHaveAttribute("data-webgl", "ready");
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
      mesh: {
        left: Number.parseFloat(wrapper.dataset.meshLeft ?? "NaN"),
        top: Number.parseFloat(wrapper.dataset.meshTop ?? "NaN"),
        width: Number.parseFloat(wrapper.dataset.meshWidth ?? "NaN"),
        height: Number.parseFloat(wrapper.dataset.meshHeight ?? "NaN"),
      },
      textureAspect: Number.parseFloat(wrapper.dataset.textureAspect ?? "NaN"),
      renderedAspect: Number.parseFloat(wrapper.dataset.renderedAspect ?? "NaN"),
    };
  });

  const expectAligned = (alignment: Awaited<ReturnType<typeof readAlignment>>) => {
    expect(Math.abs(alignment.rect.left - alignment.mesh.left)).toBeLessThan(0.75);
    expect(Math.abs(alignment.rect.top - alignment.mesh.top)).toBeLessThan(0.75);
    expect(Math.abs(alignment.rect.width - alignment.mesh.width)).toBeLessThan(0.75);
    expect(Math.abs(alignment.rect.height - alignment.mesh.height)).toBeLessThan(0.75);
    expect(Math.abs(alignment.textureAspect - alignment.renderedAspect)).toBeLessThan(0.01);
  };

  expectAligned(await readAlignment());

  await page.keyboard.press("ArrowDown");
  await expect(portrait).toHaveAttribute("data-render-source", "webgl");
  await expect(canvas).toHaveCSS("opacity", "1");
  await expect(fallbackLayer).toHaveCSS("opacity", "0");

  await page.setViewportSize({ width: 430, height: 932 });
  await expect.poll(async () => (await readAlignment()).mesh.width).toBeGreaterThan(400);
  expectAligned(await readAlignment());
});
