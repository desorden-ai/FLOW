import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ContactWhatsAppForm } from "../components/ContactWhatsAppForm";
import "./globals.css";
import "./desorden-fixes.css";
import "./contact-form.css";
import "./logo-tunnel.css";
import "./social-proof-cards.css";
import "./video-layout-restore.css";

const SITE_URL = "https://www.desorden.cat";
const SITE_DESCRIPTION =
  "Estudi creatiu de Catalunya especialitzat en contingut audiovisual, intel·ligència artificial, desenvolupament web i producció amb dron.";

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
    default: "DESORDEN — Contingut, IA, web i dron",
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
    title: "DESORDEN — Contingut, IA, web i dron",
    description: SITE_DESCRIPTION,
    siteName: "DESORDEN",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ca">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body>
        {children}
        <ContactWhatsAppForm />
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
