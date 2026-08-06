import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("keeps the public portfolio lean, accessible and deployable", async () => {
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
    desordenCss,
    vendorRoute,
    pushNotifications,
    pushNotificationsCss,
    commercialCss,
    siteNavigation,
    contactForm,
    dronePage,
    grantsPage,
    pricingPage,
    aboutPage,
    automationPage,
    webPage,
    grantCalculator,
    sitemap,
    packageJson,
    picture,
    worker,
    wrangler,
    headers,
    deployWorkflow,
    qualityWorkflow,
    lighthouseBudget,
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
    source("app/desorden-fixes.css"),
    source("app/api/vendor/route.ts"),
    source("components/SocialProofPushNotifications.tsx"),
    source("app/push-notifications.css"),
    source("app/commercial-pages.css"),
    source("components/SiteNavigation.tsx"),
    source("components/ContactWhatsAppForm.tsx"),
    source("app/drons/page.tsx"),
    source("app/ajuts/page.tsx"),
    source("app/preus/page.tsx"),
    source("app/sobre-nosaltres/page.tsx"),
    source("app/ia-automatitzacio/page.tsx"),
    source("app/disseny-web/page.tsx"),
    source("components/GrantCalculator.tsx"),
    source("app/sitemap.ts"),
    source("package.json"),
    source("components/ProjectPicture.tsx"),
    source("worker/index.ts"),
    source("wrangler.jsonc"),
    source("public/_headers"),
    source(".github/workflows/cloudflare-deploy.yml"),
    source(".github/workflows/quality-audit.yml"),
    source("scripts/assert-lighthouse.mjs"),
  ]);

  assert.match(homePage, /PortfolioApp/);
  assert.doesNotMatch(homePage, /ReelToastSequence/);

  assert.match(page, /ProjectPicture/);
  assert.match(page, /className="hero-picture"/);
  assert.match(page, /portada-chico-bn\.webp/);
  assert.match(page, /sizes="\(max-width: 760px\) 98vw, 48vw"/);
  assert.match(page, />DESORDEN</);
  assert.match(page, /LazyVisualLayoutEditor/);
  assert.match(page, /requestIdleCallback/);
  assert.match(page, /import\("\.\.\/lib\/editor-model"\)/);
  assert.doesNotMatch(page, /HeroParticlePortrait/);
  assert.doesNotMatch(page, /data-hero-particle-canvas/);
  assert.doesNotMatch(page, /hero-particle-portrait/);
  assert.match(page, /TECNOLÒGIC I CREATIU/);
  assert.match(page, /Contingut visual per a xarxes socials/);
  assert.match(page, /data-live-scene-label/);
  assert.match(page, /inert=\{!isInitialScene\}/);
  assert.match(page, /className="scene-counter" data-scene-counter>01 \/ 09/);
  assert.doesNotMatch(page, /EL TEU|PARTNER/);

  assert.match(layout, /<html lang="ca">/);
  assert.match(layout, /DESORDEN — Agència creativa, IA, web i dron/);
  assert.match(layout, /ProfessionalService/);
  assert.match(layout, /SiteNavigation/);
  assert.match(layout, /desorden-fixes\.css/);
  assert.match(layout, /push-notifications\.css/);
  assert.match(layout, /SocialProofPushNotifications/);
  assert.doesNotMatch(layout, /hero-particles\.css/);
  assert.doesNotMatch(layout, /hero-dom-webgl-alignment\.css/);
  assert.doesNotMatch(layout, /hero-particles-a11y\.css/);
  assert.doesNotMatch(layout, /hero-canvas-particles\.css/);
  assert.doesNotMatch(layout, /brand-unification\.css/);

  assert.doesNotMatch(desordenCss, /@import/);
  assert.doesNotMatch(desordenCss, /fonts\.googleapis\.com/);
  assert.match(desordenCss, /Impact, Haettenschweiler/);
  assert.match(desordenCss, /--desorden-orange:\s*#f59e0b/);
  assert.match(desordenCss, /\.hero-picture/);
  assert.match(desordenCss, /transition:[\s\S]*opacity[\s\S]*transform/);
  assert.doesNotMatch(desordenCss, /transition:[^;]*filter/);
  assert.match(desordenCss, /\.progress-rail i[\s\S]*will-change:\s*transform/);
  assert.match(desordenCss, /text-align:\s*left/);

  assert.match(navigation, /scene\.inert = !isCurrent/);
  assert.match(navigation, /data-live-scene-label/);
  assert.match(navigation, /desorden:block-3-progress/);
  assert.match(navigation, /translate3d\(0, \$\{Math\.round\(progress \* travel\)\}px, 0\)/);
  assert.doesNotMatch(navigation, /desorden:hero-progress/);
  assert.doesNotMatch(navigation, /heroParticleProgress/);
  assert.doesNotMatch(navigation, /HERO_REBUILD/);

  assert.match(picture, /<picture/);
  assert.match(picture, /image\/avif/);
  assert.match(picture, /image\/webp/);
  assert.match(picture, /fetchPriority/);

  assert.match(controller, /^"use client"/);
  assert.match(modal, /getFocusableElements/);
  assert.match(modal, /triggerRef/);
  assert.match(modal, /element\.inert = true/);

  assert.match(logoTunnel, /^"use client"/);
  assert.match(logoTunnel, /srcSet=/);
  assert.match(logoAnimation, /requestAnimationFrame/);
  assert.equal((logoAssets.match(/dark_optimized\.webp/g) ?? []).length, 7);
  assert.match(logoCss, /perspective:\s*1200px/);

  assert.match(vendorRoute, /three@0\.152\.2/);
  assert.match(vendorRoute, /gsap@3\.12\.5/);
  assert.match(vendorRoute, /unsupported_vendor_library/);

  assert.match(pushNotifications, /^"use client"/);
  assert.match(pushNotifications, /createPortal/);
  assert.match(pushNotifications, /IntersectionObserver/);
  assert.match(pushNotifications, /@rosalia\.vt/);
  assert.match(pushNotificationsCss, /border:\s*1px solid #737373/);
  assert.doesNotMatch(pushNotificationsCss, /border:\s*1px solid #f59e0b/);

  assert.match(siteNavigation, /pathname === "\/"/);
  assert.match(siteNavigation, /IA i Automatització/);
  assert.match(commercialCss, /\.commercial-grid--three/);
  assert.match(contactForm, /createPortal/);
  assert.match(contactForm, /ENVIAR PER WHATSAPP/);

  assert.match(dronePage, /planificació legal integral/i);
  assert.match(dronePage, /Reial decret 517\/2024/);
  assert.match(grantsPage, /convocatòries publicades del Kit Digital consten com a tancades/);
  assert.match(grantCalculator, /3\.000 €/);
  assert.match(grantCalculator, /6\.000 €/);
  assert.match(grantCalculator, /12\.000 €/);
  assert.match(pricingPage, /Impuls Digital/);
  assert.match(aboutPage, /Benvinguts a Desorden/);
  assert.match(automationPage, /n8n/);
  assert.match(webPage, /orientada a conversió/);

  assert.match(sitemap, /\/ia-automatitzacio/);
  assert.match(sitemap, /\/disseny-web/);
  assert.match(sitemap, /\/drons/);
  assert.match(sitemap, /\/ajuts/);
  assert.match(sitemap, /\/preus/);
  assert.match(sitemap, /\/sobre-nosaltres/);

  assert.match(worker, /Content-Security-Policy/);
  assert.match(worker, /X-Robots-Tag/);
  assert.match(worker, /env\.IMAGES/);
  assert.match(worker, /env\.ASSETS/);
  assert.match(worker, /FALLBACK_CACHE_CONTROL = "no-store"/);
  assert.match(worker, /TRANSFORM_CACHE_CONTROL = "public, max-age=604800, stale-while-revalidate=2592000"/);
  assert.match(wrangler, /"binding": "IMAGES"/);

  assert.match(headers, /\/_next\/static\/\*[\s\S]*max-age=31536000, immutable/);
  assert.match(headers, /\/_image\/\*[\s\S]*max-age=604800, stale-while-revalidate=2592000/);
  assert.match(headers, /\/media\/\*[\s\S]*max-age=604800, stale-while-revalidate=2592000/);
  assert.match(headers, /font-src 'self'/);
  assert.doesNotMatch(headers, /fonts\.googleapis\.com|fonts\.gstatic\.com/);

  assert.match(packageJson, /"audit:prod"/);
  assert.match(deployWorkflow, /Audit production dependencies/);
  assert.match(deployWorkflow, /name: Lint/);
  assert.match(qualityWorkflow, /Run Android and accessibility tests/);
  assert.match(qualityWorkflow, /Enforce mobile Lighthouse budgets/);
  assert.match(qualityWorkflow, /node scripts\/assert-lighthouse\.mjs/);
  assert.match(lighthouseBudget, /LH_MIN_PERFORMANCE/);
  assert.match(lighthouseBudget, /LH_MAX_LCP_MS/);
  assert.match(lighthouseBudget, /LH_MAX_TBT_MS/);
});
