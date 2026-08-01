import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = "https://editable-portfolio-template.workers.dev";

const entityJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  name: "Editable Portfolio Template",
  url: siteUrl,
  description: "A mobile-first portfolio template prepared for Cloudflare Workers and semantic search.",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Editable Portfolio Template", template: "%s — Editable Portfolio" },
  description: "A mobile-first immersive portfolio template optimized for Cloudflare Workers, accessibility and semantic search.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Editable Portfolio Template",
    description: "Mobile-first immersive portfolio template for product, design and strategy professionals.",
    siteName: "Editable Portfolio Template",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(entityJsonLd).replace(/</g, "\\u003c") }} />
      </body>
    </html>
  );
}
