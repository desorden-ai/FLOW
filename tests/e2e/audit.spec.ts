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

  const portrait = page.locator(".hero-particle-portrait");
  await expect(portrait).toHaveAttribute("data-renderer", "canvas2d");
  await expect(portrait).toHaveAttribute("data-renderer-status", "ready");
  await expect.poll(async () => Number.parseInt(
    await portrait.getAttribute("data-particle-count") ?? "0",
    10,
  )).toBeGreaterThan(1000);
});

test("uses two gestures for the particle phases and opens block two on the third", async ({ page }) => {
  const hero = page.locator("#intro");
  const pitch = page.locator("#pitch");
  const shell = page.locator(".site-shell");
  const portrait = page.locator(".hero-particle-portrait");

  await page.keyboard.press("ArrowDown");
  await expect(hero).toHaveAttribute("data-state", "current");
  await expect.poll(async () => shell.evaluate((element) =>
    Number.parseFloat((element as HTMLElement).style.getPropertyValue("--hero-particle-progress") || "0"),
  )).toBe(0.5);

  await page.keyboard.press("ArrowDown");
  await expect(hero).toHaveAttribute("data-state", "current");
  await expect.poll(async () => shell.evaluate((element) =>
    Number.parseFloat((element as HTMLElement).style.getPropertyValue("--hero-particle-progress") || "0"),
  )).toBe(0.72);

  await page.keyboard.press("ArrowDown");
  await expect(hero).toHaveAttribute("data-state", "past");
  await expect(pitch).toHaveAttribute("data-state", "current");
  await expect(portrait).toHaveAttribute("data-overlay", "pitch");
  await expect(portrait).toBeVisible();
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

test("shows the first social proof notification with the DESORDEN theme", async ({ page }) => {
  await goToScene(page, 1);

  const notification = page.locator('[data-push-notification="rosalia-like"]');
  const toast = notification.locator(".push-toast");

  await expect(toast).toHaveClass(/push-toast--visible/, { timeout: 2_500 });
  await expect(toast).toBeVisible();
  await expect(notification).toContainText("@rosalia.vt");
  await expect(notification).toContainText("li ha agradat el teu reel");
  await expect(toast).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(toast).toHaveCSS("border-top-color", "rgb(245, 158, 11)");
  await expect(toast).toHaveCSS("border-right-color", "rgb(245, 158, 11)");
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
