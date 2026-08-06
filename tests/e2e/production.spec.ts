import { expect, test } from "@playwright/test";

const shouldRun = process.env.PRODUCTION_SMOKE === "1";

test.describe("production smoke", () => {
  test.skip(!shouldRun, "Production smoke only runs when PRODUCTION_SMOKE=1");

  test("serves the styled interactive home instead of unstyled HTML", async ({ page, request }) => {
    const browserErrors: string[] = [];
    const failedRequests: string[] = [];
    const badResponses: string[] = [];

    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("requestfailed", (failedRequest) => {
      failedRequests.push(`${failedRequest.method()} ${failedRequest.url()} — ${failedRequest.failure()?.errorText ?? "unknown"}`);
    });
    page.on("response", (response) => {
      if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
    });

    const response = await page.goto(`/?production-smoke=${Date.now()}`, {
      waitUntil: "networkidle",
    });

    expect(response, "Production navigation must return a response").not.toBeNull();
    expect(response?.status(), "Production HTML must return HTTP 200").toBe(200);

    await page.waitForTimeout(1_500);

    const stylesheetHrefs = await page.locator('link[rel="stylesheet"]').evaluateAll((links) =>
      links.map((link) => (link as HTMLLinkElement).href),
    );

    const stylesheetChecks: Array<{ url: string; status: number; contentType: string | null; bytes: number }> = [];
    for (const href of stylesheetHrefs) {
      const stylesheetResponse = await request.get(href, {
        headers: { "Cache-Control": "no-cache" },
      });
      stylesheetChecks.push({
        url: href,
        status: stylesheetResponse.status(),
        contentType: stylesheetResponse.headers()["content-type"] ?? null,
        bytes: (await stylesheetResponse.body()).byteLength,
      });
    }

    const state = await page.evaluate(() => {
      const body = document.body;
      const shell = document.querySelector<HTMLElement>(".site-shell");
      const hero = document.querySelector<HTMLElement>("#intro");
      const title = document.querySelector<HTMLElement>("#intro .display-name");
      const portrait = document.querySelector<HTMLElement>(".hero-particle-portrait");

      const style = (element: Element | null) => (element ? window.getComputedStyle(element) : null);
      const bodyStyle = style(body);
      const shellStyle = style(shell);
      const heroStyle = style(hero);
      const titleStyle = style(title);
      const portraitStyle = style(portrait);

      return {
        bodyBackground: bodyStyle?.backgroundColor ?? null,
        bodyColor: bodyStyle?.color ?? null,
        shellBackground: shellStyle?.backgroundColor ?? null,
        shellPosition: shellStyle?.position ?? null,
        shellHeight: shell?.getBoundingClientRect().height ?? 0,
        heroDisplay: heroStyle?.display ?? null,
        heroPosition: heroStyle?.position ?? null,
        heroHeight: hero?.getBoundingClientRect().height ?? 0,
        titleFontSize: titleStyle?.fontSize ?? null,
        titleColor: titleStyle?.color ?? null,
        titleWidth: title?.getBoundingClientRect().width ?? 0,
        portraitPosition: portraitStyle?.position ?? null,
        portraitOpacity: portraitStyle?.opacity ?? null,
        stylesheetCount: document.styleSheets.length,
        cssRuleCounts: Array.from(document.styleSheets).map((sheet) => {
          try {
            return sheet.cssRules.length;
          } catch {
            return -1;
          }
        }),
        particleCount: portrait?.dataset.particleCount ?? null,
        webglState: portrait?.dataset.webgl ?? null,
      };
    });

    console.log("PRODUCTION_STYLESHEETS", JSON.stringify(stylesheetChecks, null, 2));
    console.log("PRODUCTION_STATE", JSON.stringify(state, null, 2));
    console.log("PRODUCTION_PAGE_ERRORS", JSON.stringify(browserErrors, null, 2));
    console.log("PRODUCTION_FAILED_REQUESTS", JSON.stringify(failedRequests, null, 2));
    console.log("PRODUCTION_BAD_RESPONSES", JSON.stringify(badResponses, null, 2));

    await page.screenshot({
      path: "test-results/production-home.png",
      fullPage: true,
    });

    expect(stylesheetHrefs.length, "Production HTML must reference at least one stylesheet").toBeGreaterThan(0);
    expect(
      stylesheetChecks.every(
        (entry) => entry.status === 200 && entry.contentType?.includes("text/css") && entry.bytes > 1_000,
      ),
      `Every stylesheet must load as non-empty text/css: ${JSON.stringify(stylesheetChecks)}`,
    ).toBe(true);
    expect(browserErrors, `Browser errors: ${browserErrors.join(" | ")}`).toEqual([]);
    expect(failedRequests, `Failed requests: ${failedRequests.join(" | ")}`).toEqual([]);
    expect(state.stylesheetCount).toBeGreaterThan(0);
    expect(state.cssRuleCounts.some((count) => count > 20)).toBe(true);
    expect([state.bodyBackground, state.shellBackground]).toContain("rgb(0, 0, 0)");
    expect(state.shellHeight).toBeGreaterThan(600);
    expect(state.heroHeight).toBeGreaterThan(600);
    expect(state.heroPosition).not.toBe("static");
    expect(Number.parseFloat(state.titleFontSize ?? "0")).toBeGreaterThan(60);
    expect(state.titleWidth).toBeGreaterThan(250);
    expect(state.portraitPosition).toBe("fixed");
  });
});
