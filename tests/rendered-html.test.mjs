import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("is a mobile-first commercial portfolio with controlled hydration", async () => {
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
  ]);

  assert.match(homePage, /PortfolioApp/);
  assert.doesNotMatch(homePage, /ReelToastSequence/);

  assert.match(page, /LogoTunnel/);
  assert.doesNotMatch(page, /SocialProofCards/);
  assert.match(page, /PortfolioController/);
  assert.match(page, /media\/hero\/portada-chico-bn\.webp/);
  assert.match(page, /El teu únic/);
  assert.match(page, /partner tecnològic i creatiu/);
  assert.match(page, /Vull una auditoria gratuïta/);
  assert.match(page, /data-live-scene-label/);
  assert.match(page, /inert=\{!isInitialScene\}/);
  assert.match(page, /<div className="scene-deck">/);
  assert.match(page, /01 \/ 09/);
  assert.doesNotMatch(page, /social-proof-scene|validació social/);
  assert.doesNotMatch(page, /<div className="scene-deck"[^>]*aria-live=/);
  assert.doesNotMatch(page, /Risc Legal Zero|100% Subvencionat|cost ZERO/);

  assert.match(layout, /<html lang="ca">/);
  assert.match(layout, /DESORDEN — Agència creativa, IA, web i dron/);
  assert.match(layout, /ProfessionalService/);
  assert.match(layout, /SiteNavigation/);
  assert.match(layout, /commercial-pages\.css/);
  assert.match(layout, /push-notifications\.css/);
  assert.match(layout, /SocialProofPushNotifications/);
  assert.match(layout, /heroSelector="#intro"/);
  assert.doesNotMatch(layout, /social-proof-cards\.css/);
  assert.doesNotMatch(layout, /Editable Portfolio Template/);

  assert.match(pushNotifications, /^"use client"/);
  assert.match(pushNotifications, /createPortal/);
  assert.match(pushNotifications, /IntersectionObserver/);
  assert.match(pushNotifications, /@rosalia\.vt/);
  assert.match(pushNotifications, /@rozalenmusic/);
  assert.match(pushNotifications, /media\/social-proof\/rosalia\.webp/);
  assert.match(pushNotifications, /media\/social-proof\/rozalen\.webp/);
  assert.match(pushNotifications, /VISIBLE_DURATION_MS = 4_000/);
  assert.match(pushNotificationsCss, /\.push-toast-layer/);
  assert.match(pushNotificationsCss, /pointer-events: none/);
  assert.match(pushNotificationsCss, /prefers-reduced-motion/);

  assert.match(siteNavigation, /IA i Automatització/);
  assert.match(siteNavigation, /\/disseny-web/);
  assert.match(siteNavigation, /\/drons/);
  assert.match(siteNavigation, /Sol·licitar auditoria/);
  assert.match(commercialCss, /html:has\(\.commercial-page\)/);
  assert.match(commercialCss, /\.commercial-grid--three/);
  assert.match(commercialCss, /\.contact-chatbot/);

  assert.match(contactForm, /CHAT_MESSAGE/);
  assert.match(contactForm, /Parlar per WhatsApp/);
  assert.match(contactForm, /portalTarget && createPortal/);

  assert.match(dronePage, /planificació legal integral/i);
  assert.match(dronePage, /Reial decret 517\/2024/);
  assert.doesNotMatch(dronePage, /Risc Legal ZERO|100% Legal/);

  assert.match(grantsPage, /convocatòries publicades del Kit Digital consten com a tancades/);
  assert.match(grantsPage, /GrantCalculator/);
  assert.doesNotMatch(grantsPage, /cost ZERO|finançats fins al 100%/);
  assert.match(grantCalculator, /3\.000 €/);
  assert.match(grantCalculator, /6\.000 €/);
  assert.match(grantCalculator, /12\.000 €/);

  assert.match(pricingPage, /Impuls Digital/);
  assert.match(pricingPage, /Domini Absolut/);
  assert.match(pricingPage, /Desorden Total/);
  assert.match(aboutPage, /Benvinguts a Desorden/);
  assert.match(automationPage, /n8n/);
  assert.match(webPage, /orientada a conversió/);

  assert.match(sitemap, /\/ia-automatitzacio/);
  assert.match(sitemap, /\/disseny-web/);
  assert.match(sitemap, /\/drons/);
  assert.match(sitemap, /\/ajuts/);
  assert.match(sitemap, /\/preus/);
  assert.match(sitemap, /\/sobre-nosaltres/);

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
