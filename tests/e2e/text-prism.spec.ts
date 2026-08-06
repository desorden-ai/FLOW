import { expect, test } from "@playwright/test";

test("keeps prism gestures inside block two after the direct hero transition", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#intro")).toHaveAttribute("data-state", "past");
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
