import { expect, test } from "@playwright/test";

test.describe("Logo Tunnel Animation E2E", () => {
  test("updates logo properties based on block 3 progress", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // The logo tunnel is in block 3 (section id: bloque-3-clientes)
    // We'll directly dispatch the progress event on the site-shell or root
    const root = page.locator(".site-shell");

    // Force the element into view and set active dataset so the animation hook respects it
    await page.evaluate(() => {
      document.querySelector("#bloque-3-clientes")?.closest('[data-scene]')?.setAttribute('data-state', 'current');
      document.querySelector("#bloque-3-clientes")?.scrollIntoView();
    });

    // Wait for initial animation frame
    await page.waitForTimeout(100);

    const intro = page.locator("[data-logo-tunnel-intro]");
    const logoItems = page.locator("[data-logo-3d-item]");
    const section = page.locator("#bloque-3-clientes");

    // Fire progress event manually on the element to activate the animation loop and progress
    await root.evaluate((el) => {
      const event = new CustomEvent("desorden:block-3-progress", {
        detail: { progress: 0.1, active: true },
      });
      el.dispatchEvent(event);
    });

    await page.waitForTimeout(200);

    const opacity1 = await intro.evaluate((el) => window.getComputedStyle(el).opacity);
    expect(Number(opacity1)).toBeLessThan(1);
    expect(Number(opacity1)).toBeGreaterThan(0);

    await expect(section).toHaveAttribute("data-tunnel-active", "true");

    // Push progress past the intro phase
    await root.evaluate((el) => {
      const event = new CustomEvent("desorden:block-3-progress", {
        detail: { progress: 0.5, active: true },
      });
      el.dispatchEvent(event);
    });

    await page.waitForTimeout(200);

    // Intro opacity should now be 0 since progress > 0.15
    const opacity2 = await intro.evaluate((el) => window.getComputedStyle(el).opacity);
    expect(Number(opacity2)).toBeCloseTo(0);

    // Check transform string changes for the logos
    const firstLogo = logoItems.first();
    const transform = await firstLogo.evaluate((el) => el.style.transform);
    expect(transform).toContain("translate3d");
    expect(transform).toContain("rotateZ");

    // Test stopping the animation (active: false)
    await root.evaluate((el) => {
      const event = new CustomEvent("desorden:block-3-progress", {
        detail: { progress: 0.5, active: false },
      });
      el.dispatchEvent(event);
    });

    await page.waitForTimeout(100);
    await expect(section).toHaveAttribute("data-tunnel-active", "false");
  });
});
