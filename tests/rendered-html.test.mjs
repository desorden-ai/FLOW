import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("is a mobile-first semantic portfolio with controlled hydration", async () => {
  const [
    homePage,
    page,
    layout,
    controller,
    navigation,
    modal,
    logoTunnel,
    logoAnimation,
    logoAssets,
    logoCss,
    socialProof,
    socialProofCss,
    packageJson,
    picture,
    worker,
    wrangler,
    headers,
    deployWorkflow,
  ] = await Promise.all([
    source("app/page.tsx"),
    source("app/PortfolioApp.tsx"),
    source("app/layout.tsx"),
    source("components/PortfolioController.tsx"),
    source("components/usePortfolioNavigation.ts"),
    source("components/usePortfolioModal.ts"),
    source("components/LogoTunnel.tsx"),
    source("hooks/useLogoTunnelAnimation.ts"),
    source("components/logoTunnelAssets.ts"),
    source("app/logo-tunnel.css"),
    source("components/SocialProofCards.tsx"),
    source("app/social-proof-cards.css"),
    source("package.json"),
    source("components/ProjectPicture.tsx"),
    source("worker/index.ts"),
    source("wrangler.jsonc"),
    source("public/_headers"),
    source(".github/workflows/cloudflare-deploy.yml"),
  ]);

  assert.match(homePage, /PortfolioApp/);
  assert.doesNotMatch(homePage, /ReelToastSequence/);

  assert.match(page, /LogoTunnel/);
  assert.match(page, /SocialProofCards/);
  assert.match(page, /PortfolioController/);
  assert.match(page, /media\/hero\/portada-chico-bn\.webp/);
  assert.match(page, />EL TEU</);
  assert.match(page, />PARTNER</);
  assert.match(page, /data-live-scene-label/);
  assert.match(page, /inert=\{!isInitialScene\}/);
  assert.match(page, /<div className="scene-deck">/);
  assert.match(page, /01 \/ 10/);
  assert.doesNotMatch(page, /<div className="scene-deck"[^>]*aria-live=/);
  assert.doesNotMatch(page, /Risc Legal Zero|100% Subvencionat/);

  assert.match(layout, /<html lang="ca">/);
  assert.match(layout, /DESORDEN — Contingut, IA, web i dron/);
  assert.match(layout, /ProfessionalService/);
  assert.match(layout, /social-proof-cards\.css/);
  assert.match(layout, /video-layout-restore\.css/);
  assert.doesNotMatch(layout, /SocialProofPushNotifications|push-notifications\.css/);
  assert.doesNotMatch(layout, /Editable Portfolio Template/);

  assert.match(socialProof, /@rosalia\.vt/);
  assert.match(socialProof, /@rozalenmusic/);
  assert.match(socialProof, /@leiremo_oficial/);
  assert.match(socialProof, /media\/social-proof\/rosalia\.webp/);
  assert.match(socialProof, /media\/social-proof\/rozalen\.webp/);
  assert.match(socialProof, /media\/social-proof\/leire\.webp/);
  assert.match(socialProofCss, /\.scene-social-proof\[data-state="current"\]/);
  assert.match(socialProofCss, /prefers-reduced-motion/);

  assert.match(controller, /^"use client"/);
  assert.match(navigation, /scene\.inert = !isCurrent/);
  assert.match(navigation, /data-live-scene-label/);
  assert.match(navigation, /desorden:block-3-progress/);
  assert.match(navigation, /Number\.isFinite/);

  assert.match(modal, /getFocusableElements/);
  assert.match(modal, /triggerRef/);
  assert.match(modal, /element\.inert = true/);
  assert.match(modal, /event\.key !== "Tab"/);

  assert.match(logoTunnel, /^"use client"/);
  assert.match(logoTunnel, /srcSet=/);
  assert.match(logoTunnel, /loading=\{index < 2 \? "eager" : "lazy"\}/);
  assert.match(logoAnimation, /interpolateProgress/);
  assert.match(logoAnimation, /Number\.parseFloat/);
  assert.match(logoAnimation, /requestAnimationFrame/);
  assert.equal((logoAssets.match(/dark_optimized\.webp/g) ?? []).length, 7);
  assert.match(logoCss, /perspective:\s*1200px/);
  assert.match(logoCss, /will-change:\s*transform, opacity/);

  assert.match(picture, /<picture/);
  assert.match(picture, /image\/avif/);
  assert.match(picture, /image\/webp/);
  assert.match(picture, /fetchPriority/);

  assert.match(worker, /Content-Security-Policy/);
  assert.match(worker, /X-Robots-Tag/);
  assert.match(worker, /hostname\.endsWith\("\.workers\.dev"\)/);
  assert.match(worker, /stale-while-revalidate/);
  assert.doesNotMatch(worker, /image_transform_failed", message/);
  assert.match(worker, /env\.IMAGES/);
  assert.match(worker, /env\.ASSETS/);
  assert.match(wrangler, /"binding": "IMAGES"/);

  assert.match(headers, /Content-Security-Policy/);
  assert.match(headers, /X-Frame-Options: DENY/);
  assert.match(headers, /max-age=604800/);

  assert.match(packageJson, /"audit:prod"/);
  assert.match(deployWorkflow, /Audit production dependencies/);
  assert.match(deployWorkflow, /name: Lint/);
});
