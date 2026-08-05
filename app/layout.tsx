import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ContactWhatsAppForm } from "../components/ContactWhatsAppForm";
import "./globals.css";
import "./desorden-fixes.css";
import "./contact-form.css";
import "./logo-tunnel.css";

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Cinzel:wght@400;700&family=Fira+Code:wght@400;600&family=Inter:wght@300;400;600;800&family=Outfit:wght@400;600;800&family=Roboto:wght@400;500;700&family=Space+Grotesk:wght@400;600;700&family=Unbounded:wght@400;700;900&display=swap" rel="stylesheet" />
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
