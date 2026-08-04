import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("is a mobile-first semantic portfolio with minimal hydration", async () => {
  const [page, layout, controller, logoTunnel, logoAssets, logoCss, packageJson, pushNotifications, pushCss, picture, worker, wrangler, headers] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("components/PortfolioController.tsx", root), "utf8"),
    readFile(new URL("components/LogoTunnel.tsx", root), "utf8"),
    readFile(new URL("components/logoTunnelAssets.ts", root), "utf8"),
    readFile(new URL("app/logo-tunnel.css", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("components/SocialProofPushNotifications.tsx", root), "utf8"),
    readFile(new URL("app/push-notifications.css", root), "utf8"),
    readFile(new URL("components/ProjectPicture.tsx", root), "utf8"),
    readFile(new URL("worker/index.ts", root), "utf8"),
    readFile(new URL("wrangler.jsonc", root), "utf8"),
    readFile(new URL("public/_headers", root), "utf8"),
  ]);

  assert.doesNotMatch(page, /^"use client"/);
  assert.doesNotMatch(page, /ParticleTunnel|CosmicField|logoPositions|className="cosmic-star"/);
  assert.match(page, /LogoTunnel/);
  assert.match(page, /PortfolioController/);
  assert.doesNotMatch(page, /id="social-proof"|className="social-notification"/);
  assert.match(page, /media\/hero\/portada-chico-bn\.webp/);
  assert.match(page, /data-media-marquee/);
  assert.equal((page.match(/media-marquee__track/g) ?? []).length, 1);
  assert.match(page, /01 \/ 09/);
  assert.doesNotMatch(page, /media-3|media-4|media-5|media-6|name="manifesto"|label="inversió"/);
  assert.match(page, /<SceneFrame index=\{8\} name="contact"/);

  assert.match(controller, /^"use client"/);
  assert.match(controller, /addEventListener\("wheel"/);
  assert.match(controller, /dataset\.state/);
  assert.match(controller, /const MEDIA_START = 6/);
  assert.match(controller, /const MEDIA_END = 7/);
  assert.match(controller, /const LOGO_TUNNEL_INDEX = 2/);
  assert.match(controller, /desorden:block-3-progress/);
  assert.match(controller, /LOGO_TUNNEL_STEP/);

  assert.match(logoTunnel, /^"use client"/);
  assert.match(await readFile(new URL("hooks/useLogoTunnelAnimation.ts", root), "utf8"), /requestAnimationFrame/);
  assert.match(logoTunnel, /translate3d/);
  assert.match(logoTunnel, /data-logo-3d-item/);
  assert.match(logoTunnel, /Pugnator, Castell, The Club Padel/);
  assert.equal((logoAssets.match(/dark_optimized\.webp/g) ?? []).length, 7);
  assert.match(logoAssets, /VIU Sant Vicenç de Castellet/);
  assert.match(logoAssets, /Nutrikom/);

  assert.match(logoCss, /mask-image:\s*radial-gradient/);
  assert.match(logoCss, /will-change:\s*transform, opacity/);
  assert.match(logoCss, /background:\s*#000000/);
  assert.doesNotMatch(packageJson, /fetch-logo-tunnel-assets|"prebuild"/);

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

  assert.doesNotMatch(layout, /Immersive Editable Portfolio|particle-tunnel\.css/);
  assert.match(layout, /SocialProofPushNotifications/);
  assert.match(layout, /push-notifications\.css/);
  assert.match(layout, /logo-tunnel\.css/);
  assert.match(layout, /application\/ld\+json/);
  assert.match(layout, /<html lang="en">/);
});
