import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SocialProofEnhancer } from "../components/SocialProofEnhancer";
import "./globals.css";
import "./desorden-fixes.css";
import "./social-proof-instagram.css";

const entityJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Editable Portfolio Template",
  description: "A mobile-first portfolio template prepared for Cloudflare Workers and semantic search.",
};

export const metadata: Metadata = {
  title: { default: "Editable Portfolio Template", template: "%s — Editable Portfolio" },
  description: "A mobile-first immersive portfolio template optimized for Cloudflare Workers, accessibility and semantic search.",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
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
        <SocialProofEnhancer />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(entityJsonLd).replace(/</g, "\\u003c") }} />
      </body>
    </html>
  );
}
