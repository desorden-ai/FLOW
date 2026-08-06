import { expect, test } from "@playwright/test";

test("runs particles 10 percent faster and keeps prism gestures inside block two", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const portrait = page.locator(".hero-particle-portrait");
  await expect(portrait).toHaveAttribute("data-renderer-status", "ready");
  await expect(portrait).toHaveAttribute("data-particle-speed", "1.10");

  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#pitch")).toHaveAttribute("data-state", "current");

  const prism = page.locator("[data-text-prism]");
  const prismButton = prism.locator("button");

  await expect(prism).toBeVisible();
  await expect(prismButton).toHaveAttribute("data-prism-step", "0");
  await expect(prismButton).toHaveAttribute("data-prism-active-word", "DESORDEN");

  await prismButton.click();
  await expect(prismButton).toHaveAttribute("data-prism-step", "1");
  await expect(prismButton).toHaveAttribute("data-prism-active-word", "DESCOBRIR");

  await page.waitForTimeout(380);
  await prismButton.hover();
  await page.mouse.wheel(0, 220);

  await expect(prismButton).toHaveAttribute("data-prism-step", "2");
  await expect(prismButton).toHaveAttribute("data-prism-active-word", "ORDENAR");
  await expect(page.locator("#pitch")).toHaveAttribute("data-state", "current");

  await page.waitForTimeout(380);
  await prismButton.press("ArrowUp");
  await expect(prismButton).toHaveAttribute("data-prism-step", "1");
  await expect(prismButton).toHaveAttribute("data-prism-active-word", "DESCOBRIR");
  await expect(page.locator("#pitch")).toHaveAttribute("data-state", "current");
});
