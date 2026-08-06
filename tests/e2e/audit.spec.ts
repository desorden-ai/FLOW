import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function goToScene(page: Page, index: number) {
  await page.locator(`[data-go="${index}"]`).first().evaluate((element: HTMLElement) => element.click());
  await expect(page.locator(`[data-scene][data-state="current"]`)).toHaveAttribute("data-label", /.+/);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
});

test("renders the reference hero without a top menu or floating WhatsApp assistant", async ({ page }) => {
  await expect(page.locator(".site-nav")).toHaveCount(0);
  await expect(page.locator(".contact-chatbot")).toHaveCount(0);
  await expect(page.locator("#intro .outline-word")).toHaveText("EL TEU");
  await expect(page.locator("#intro .display-name")).toHaveText("PARTNER");
  await expect(page.locator("#intro .hero-services li")).toHaveCount(3);
  await expect(page.locator("[data-scene-counter]")).toHaveText("01 / 09");
  await expect(page.locator("[data-active-label]")).toHaveText("introducció");
  await expect(page.locator("[data-hero-particle-canvas]")).toHaveCount(1);
  await expect(page.locator(".hero-particle-portrait__fallback img")).toHaveCount(1);
});

test("uses the first scroll gestures to animate the portrait before changing scene", async ({ page }) => {
  const hero = page.locator("#intro");

  await page.keyboard.press("ArrowDown");
  await expect(hero).toHaveAttribute("data-state", "current");

  const progress = await page.locator(".site-shell").evaluate((element) =>
    Number.parseFloat((element as HTMLElement).style.getPropertyValue("--hero-particle-progress") || "0"),
  );

  expect(progress).toBeGreaterThan(0);
  expect(progress).toBeLessThan(1);
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

test("shows the first social proof notification after leaving the hero", async ({ page }) => {
  await goToScene(page, 1);

  const notification = page.locator('[data-push-notification="rosalia-like"]');
  await expect(notification).toBeVisible();
  await expect(notification).toContainText("@rosalia.vt");
  await expect(notification).toContainText("li ha agradat el teu reel");
  await expect(notification.locator(".push-toast")).toHaveClass(/push-toast--visible/);
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

test("opens a correctly encoded WhatsApp URL", async ({ page }) => {
  await page.evaluate(() => {
    const state = window as Window & { __flowOpenedUrl?: string };
    state.__flowOpenedUrl = "";
    window.open = ((url?: string | URL) => {
      state.__flowOpenedUrl = String(url ?? "");
      return { opener: null } as Window;
    }) as typeof window.open;
  });

  await goToScene(page, 8);
  await page.getByLabel("Nom").fill("David");
  await page.getByLabel("Ubicació").fill("Sant Vicenç de Castellet");
  await page.getByLabel("Missatge").fill("Prova automatitzada");
  await page.getByRole("button", { name: "Contactar per WhatsApp" }).click();

  const openedUrl = await page.evaluate(() => {
    const state = window as Window & { __flowOpenedUrl?: string };
    return state.__flowOpenedUrl ?? "";
  });

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
