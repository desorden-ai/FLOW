import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function goToScene(page: Page, index: number) {
  await page.locator(`[data-go="${index}"]`).first().evaluate((element: HTMLElement) => element.click());
  await expect(page.locator(`[data-scene][data-state="current"]`)).toHaveAttribute("data-label", /.+/);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
});

test("uses Catalan metadata and keeps keyboard focus inside the active scene", async ({ page }) => {
  await expect(page.locator("html")).toHaveAttribute("lang", "ca");

  for (let index = 0; index < 14; index += 1) {
    await page.keyboard.press("Tab");
    const state = await page.evaluate(() => {
      const focused = document.activeElement as HTMLElement | null;
      const scene = focused?.closest<HTMLElement>("[data-scene]");
      return scene?.dataset.state ?? null;
    });

    if (state !== null) expect(state).toBe("current");
  }
});

test("traps modal focus, closes with Escape and restores the trigger", async ({ page }) => {
  await goToScene(page, 5);

  const trigger = page.locator("[data-scene][data-state='current'] [data-modal-open]").first();
  await trigger.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press("Tab");
    const insideDialog = await page.evaluate(() => {
      const dialogElement = document.querySelector("[role='dialog']");
      return Boolean(dialogElement?.contains(document.activeElement));
    });
    expect(insideDialog).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("opens a correctly encoded WhatsApp URL", async ({ page, context }) => {
  await context.route("https://wa.me/**", async (route) => route.abort());
  await goToScene(page, 8);

  await page.getByLabel("Nom").fill("David");
  await page.getByLabel("Ubicació").fill("Sant Vicenç de Castellet");
  await page.getByLabel("Missatge").fill("Prova automatitzada");

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Contactar per WhatsApp" }).click();
  const popup = await popupPromise;
  const openedUrl = popup.url();

  expect(openedUrl).toContain("https://wa.me/34640925788?text=");
  expect(decodeURIComponent(openedUrl)).toContain("Nom: David");
  expect(decodeURIComponent(openedUrl)).toContain("Ubicació: Sant Vicenç de Castellet");
});

test("has no serious or critical accessibility violations in key scenes", async ({ page }) => {
  for (const sceneIndex of [0, 2, 5, 8]) {
    await goToScene(page, sceneIndex);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter((violation) =>
      violation.impact === "serious" || violation.impact === "critical",
    );

    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  }
});

test("reduced motion applies tunnel progress immediately", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await goToScene(page, 2);

  await page.evaluate(() => {
    document.querySelector(".site-shell")?.dispatchEvent(
      new CustomEvent("desorden:block-3-progress", {
        detail: { progress: 0.5, active: true },
      }),
    );
  });

  await expect(page.locator("#bloque-3-clientes")).toHaveAttribute("data-tunnel-active", "true");
  const progress = await page.locator("#bloque-3-clientes").evaluate((element) =>
    element.getAttribute("style") ?? "",
  );
  expect(progress).toContain("--logo-tunnel-progress: 0.5");
});
