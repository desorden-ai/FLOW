import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("is a mobile-first semantic portfolio with controlled hydration", async () => {
  const [
    page,
    layout,
    controller,
    navigation,
    modal,
    logoTunnel,
    logoAnimation,
    logoAssets,
    logoCss,
    packageJson,
    picture,
    worker,
    wrangler,
    headers,
    deployWorkflow,
  ] = await Promise.all([
    source("app/PortfolioApp.tsx"),
    source("app/layout.tsx"),
    source("components/PortfolioController.tsx"),
    source("components/usePortfolioNavigation.ts"),
    source("components/usePortfolioModal.ts"),
    source("components/LogoTunnel.tsx"),
    source("hooks/useLogoTunnelAnimation.ts"),
    source("components/logoTunnelAssets.ts"),
    source("app/logo-tunnel.css"),
    source("package.json"),
    source("components/ProjectPicture.tsx"),
    source("worker/index.ts"),
    source("wrangler.jsonc"),
    source("public/_headers"),
    source(".github/workflows/cloudflare-deploy.yml"),
  ]);


  assert.match(page, /LogoTunnel/);
  assert.match(page, /PortfolioController/);
  assert.match(page, /media\/hero\/portada-chico-bn\.webp/);
  assert.match(page, /data-live-scene-label/);
  assert.match(page, /inert=\{!isInitialScene\}/);
  assert.match(page, /<div className="scene-deck">/);
  assert.doesNotMatch(page, /<div className="scene-deck"[^>]*aria-live=/);
  assert.doesNotMatch(page, /Risc Legal Zero|100% Subvencionat/);

  assert.match(layout, /<html lang="ca">/);
  assert.match(layout, /DESORDEN — Contingut, IA, web i dron/);
  assert.match(layout, /ProfessionalService/);
  assert.doesNotMatch(layout, /SocialProofPushNotifications|push-notifications\.css/);
  assert.doesNotMatch(layout, /Editable Portfolio Template/);

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
