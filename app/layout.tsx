import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { ContactWhatsAppForm } from "../components/ContactWhatsAppForm";
import { HeroParticleSequenceFix } from "../components/HeroParticleSequenceFix";
import { SiteNavigation } from "../components/SiteNavigation";
import { SocialProofPushNotifications } from "../components/SocialProofPushNotifications";
import "./globals.css";
import "./desorden-fixes.css";
import "./contact-form.css";
import "./logo-tunnel.css";
import "./push-notifications.css";
import "./video-layout-restore.css";
import "./commercial-pages.css";
import "./commercial-a11y-fixes.css";
import "./hero-particles.css";
import "./hero-dom-webgl-alignment.css";
import "./hero-particle-sequence-fix.css";
import "./hero-particles-a11y.css";

const SITE_URL = "https://www.desorden.cat";
const SITE_DESCRIPTION =
  "Agència creativa i tecnològica de Catalunya especialitzada en intel·ligència artificial, automatització, disseny web, contingut vertical i producció audiovisual amb dron.";

const entityJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "DESORDEN",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  email: "hola@desorden.cat",
  telephone: "+34640925788",
  areaServed: {
    "@type": "AdministrativeArea",
    name: "Catalunya",
  },
  sameAs: ["https://www.instagram.com/desorden.cat/"],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DESORDEN — Agència creativa, IA, web i dron",
    template: "%s — DESORDEN",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: "/",
    locale: "ca_ES",
    title: "DESORDEN — Agència creativa, IA, web i dron",
    description: SITE_DESCRIPTION,
    siteName: "DESORDEN",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ca">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <Script id="three-vendor" src="/api/vendor?library=three" strategy="beforeInteractive" />
        <Script id="gsap-vendor" src="/api/vendor?library=gsap" strategy="beforeInteractive" />
        <Script id="scroll-trigger-vendor" src="/api/vendor?library=scroll-trigger" strategy="beforeInteractive" />
      </head>
      <body>
        <SiteNavigation />
        {children}
        <HeroParticleSequenceFix />
        <ContactWhatsAppForm />
        <SocialProofPushNotifications heroSelector="#intro" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(entityJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
