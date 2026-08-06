import { expect, test } from "@playwright/test";

test("uses a black background and the corporate amber border on social notifications", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator('[data-go="1"]').first().evaluate((element: HTMLElement) => element.click());

  const notification = page.locator('[data-push-notification="rosalia-like"] .push-toast');
  await expect(notification).toHaveClass(/push-toast--visible/, { timeout: 2_500 });
  await expect(notification).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(notification).toHaveCSS("border-top-color", "rgb(245, 158, 11)");
  await expect(notification).toHaveCSS("border-right-color", "rgb(245, 158, 11)");
});
