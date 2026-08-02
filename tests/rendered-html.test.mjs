import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("is a mobile-first semantic portfolio with minimal hydration", async () => {
  const [page, layout, controller, pushNotifications, pushCss, picture, worker, wrangler, headers] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("components/PortfolioController.tsx", root), "utf8"),
    readFile(new URL("components/SocialProofPushNotifications.tsx", root), "utf8"),
    readFile(new URL("app/push-notifications.css", root), "utf8"),
    readFile(new URL("components/ProjectPicture.tsx", root), "utf8"),
    readFile(new URL("worker/index.ts", root), "utf8"),
    readFile(new URL("wrangler.jsonc", root), "utf8"),
    readFile(new URL("public/_headers", root), "utf8"),
  ]);

  assert.doesNotMatch(page, /^"use client"/);
  assert.doesNotMatch(page, /makeStars\(210\)|className="cosmic-star"/);
  assert.match(page, /PortfolioController/);
  assert.doesNotMatch(page, /id="social-proof"|className="social-notification"/);
  assert.match(page, /media\/hero\/portada-chico-bn\.webp/);
  assert.match(page, /data-media-marquee/);
  assert.equal((page.match(/media-marquee__track/g) ?? []).length, 1);
  assert.match(page, /01 \/ 14/);

  assert.match(controller, /^"use client"/);
  assert.match(controller, /addEventListener\("wheel"/);
  assert.match(controller, /dataset\.state/);
  assert.match(controller, /const MEDIA_START = 6/);
  assert.match(controller, /const MEDIA_END = 11/);

  assert.match(pushNotifications, /^"use client"/);
  assert.equal((pushNotifications.match(/id: "(?:rosalia-like|rozalen-comment)"/g) ?? []).length, 2);
  assert.match(pushNotifications, /createPortal/);
  assert.match(pushNotifications, /MutationObserver/);
  assert.match(pushNotifications, /IntersectionObserver/);
  assert.match(pushNotifications, /VISIBLE_DURATION_MS = 4_000/);
  assert.match(pushNotifications, /PAUSE_BETWEEN_TOASTS_MS = 1_000/);
  assert.match(pushNotifications, /href: "#"/);
  assert.match(pushNotifications, /\/media\/social-proof\/rosalia\.webp/);
  assert.match(pushNotifications, /\/media\/social-proof\/rozalen\.webp/);

  assert.match(pushCss, /position:fixed/);
  assert.match(pushCss, /z-index:9999/);
  assert.match(pushCss, /pointer-events:none/);
  assert.match(pushCss, /pointer-events:auto/);
  assert.match(pushCss, /translate3d\(0,-150%,0\)/);
  assert.match(pushCss, /backdrop-filter:blur/);

  assert.match(picture, /<picture/);
  assert.match(picture, /image\/avif/);
  assert.match(picture, /image\/webp/);
  assert.match(picture, /decoding="async"/);

  assert.match(worker, /env\.IMAGES/);
  assert.match(worker, /env\.ASSETS/);
  assert.match(wrangler, /"binding": "IMAGES"/);
  assert.match(wrangler, /"enabled": true/);
  assert.match(headers, /immutable/);

  assert.doesNotMatch(layout, /Immersive Editable Portfolio/);
  assert.match(layout, /SocialProofPushNotifications/);
  assert.match(layout, /push-notifications\.css/);
  assert.match(layout, /application\/ld\+json/);
  assert.match(layout, /<html lang="en">/);
});
